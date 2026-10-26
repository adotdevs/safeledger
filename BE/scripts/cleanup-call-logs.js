/**
 * Database Cleanup Script - Remove unused fullPayload from call logs
 * 
 * This script removes the fullPayload field from call logs to optimize database size.
 * fullPayload is not used as fallback in frontend - logs are fetched from Vapi API in modal.
 * 
 * IMPORTANT: This keeps all essential fields used as fallbacks:
 * - endedReason (used as fallback in getResolvedEndedReason)
 * - startedAt (used as fallback in getResolvedStartedAt)
 * - endedAt (used as fallback in getResolvedEndedAt)
 * - duration (used as fallback in getResolvedDuration)
 * - status, error, phoneNumber (used for display)
 * 
 * REMOVES:
 * - fullPayload (not used, accessed via Vapi API in modal)
 * - transcript, summary, cost (already stored on root document, no need to duplicate)
 * 
 * Run: node BE/scripts/cleanup-call-logs.js
 */

const mongoose = require('mongoose');
// Load environment variables first
require('dotenv').config({ path: require('path').join(__dirname, '../config/config.env') });
const connectCRMDatabase = require('../config/crmDatabase');

// Retry helper with exponential backoff
async function retryOperation(operation, maxRetries = 2, initialDelay = 500) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            // Don't retry quota errors - they need manual intervention
            if (error.message && error.message.includes('space quota')) {
                console.log(`❌ QUOTA ERROR: Database is out of space. Cannot proceed without freeing space first.`);
                throw error;
            }
            
            if (attempt < maxRetries) {
                // Exponential backoff with shorter delays for fast execution
                const delay = initialDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}

async function cleanupCallLogs() {
    let crmDB = null;
    try {
        console.log('🔧 Starting call logs cleanup...');
        console.log('⚠️  This will optimize call logs by removing unused fullPayload data');
        console.log('✅ All essential fallback fields will be preserved\n');
        
        // Connect to CRM database with retry
        console.log('🔗 Connecting to CRM database...');
        crmDB = await retryOperation(() => connectCRMDatabase(), 3, 2000);
        const callsCollection = crmDB.collection('calls');
        
        // Count documents with logs
        const totalCalls = await retryOperation(
            () => callsCollection.countDocuments({ logs: { $exists: true, $ne: [] } }),
            3,
            1000
        );
        console.log(`📊 Found ${totalCalls} calls with logs`);
        
        if (totalCalls === 0) {
            console.log('✅ No calls with logs found. Nothing to clean.');
            if (crmDB) await crmDB.close();
            return;
        }
        
        let processed = 0;
        let cleaned = 0;
        let totalLogsOptimized = 0;
        let totalSizeReduced = 0;
        let skippedDueToError = 0;
        
        // Process in larger batches for speed
        const batchSize = 500; // Much larger batch size for faster processing
        let skip = 0;
        let batchNumber = 0;
        const startTime = Date.now();
        
        while (skip < totalCalls) {
            batchNumber++;
            try {
                const calls = await retryOperation(
                    () => callsCollection.find({
                        logs: { $exists: true, $ne: [] }
                    })
                    .skip(skip)
                    .limit(batchSize)
                    .toArray(),
                    2,
                    500
                );
                
                if (calls.length === 0) break;
                
                // Use bulkWrite for much faster updates
                const bulkOps = [];
                let batchCleaned = 0;
                
                for (const call of calls) {
                    try {
                        if (!call.logs || !Array.isArray(call.logs) || call.logs.length === 0) {
                            continue;
                        }
                        
                        let hasChanges = false;
                        let callSizeReduced = 0;
                        const optimizedLogs = call.logs.map(log => {
                            if (!log || typeof log !== 'object') return log;
                            
                            if (log.data && typeof log.data === 'object') {
                                const originalData = log.data;
                                const optimizedData = {};
                                
                                if (originalData.endedReason !== undefined) optimizedData.endedReason = originalData.endedReason;
                                if (originalData.startedAt !== undefined) optimizedData.startedAt = originalData.startedAt;
                                if (originalData.endedAt !== undefined) optimizedData.endedAt = originalData.endedAt;
                                if (originalData.duration !== undefined) optimizedData.duration = originalData.duration;
                                if (originalData.status !== undefined) optimizedData.status = originalData.status;
                                if (originalData.error !== undefined) optimizedData.error = originalData.error;
                                if (originalData.phoneNumber !== undefined) optimizedData.phoneNumber = originalData.phoneNumber;
                                
                                const originalSize = JSON.stringify(originalData).length;
                                const optimizedSize = JSON.stringify(optimizedData).length;
                                const sizeReduction = originalSize - optimizedSize;
                                
                                if (sizeReduction > 0) {
                                    hasChanges = true;
                                    callSizeReduced += sizeReduction;
                                    totalLogsOptimized++;
                                }
                                
                                return {
                                    type: log.type,
                                    message: log.message,
                                    timestamp: log.timestamp,
                                    data: optimizedData
                                };
                            }
                            
                            return log;
                        });
                        
                        if (hasChanges) {
                            bulkOps.push({
                                updateOne: {
                                    filter: { _id: call._id },
                                    update: {
                                        $set: {
                                            logs: optimizedLogs,
                                            updatedAt: new Date()
                                        }
                                    }
                                }
                            });
                            cleaned++;
                            batchCleaned++;
                            totalSizeReduced += callSizeReduced;
                        }
                        
                        processed++;
                        
                    } catch (callError) {
                        if (!(callError.message && callError.message.includes('space quota'))) {
                            skippedDueToError++;
                        }
                    }
                }
                
                // Execute all bulk operations at once
                if (bulkOps.length > 0) {
                    await retryOperation(
                        () => callsCollection.bulkWrite(bulkOps),
                        2,
                        500
                    );
                }
                
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                const rate = (processed / (Date.now() - startTime) * 1000).toFixed(1);
                console.log(`📈 Batch ${batchNumber}: ${processed}/${totalCalls} (${Math.round(processed / totalCalls * 100)}%) | ${rate} calls/sec | ${elapsed}s elapsed | Size: ${(totalSizeReduced / 1024 / 1024).toFixed(2)} MB`);
                
                skip += batchSize;
                
            } catch (batchError) {
                if (batchError.message && batchError.message.includes('space quota')) {
                    console.error(`\n❌ CRITICAL: Database quota exceeded!`);
                    console.error(`📊 Database has reached 512 MB limit`);
                    console.error(`✅ Before hitting quota - Processed: ${processed}, Cleaned: ${cleaned}, Freed: ${(totalSizeReduced / 1024 / 1024).toFixed(2)} MB`);
                    throw batchError;
                }
                
                console.error(`❌ Batch error:`, batchError.message);
                skip += batchSize;
                skippedDueToError += Math.min(batchSize, totalCalls - skip);
            }
        }
        
        console.log('\n✅ Cleanup completed!');
        console.log(`📊 Summary:`);
        console.log(`   - Total calls processed: ${processed}`);
        console.log(`   - Calls cleaned: ${cleaned}`);
        console.log(`   - Logs optimized: ${totalLogsOptimized}`);
        console.log(`   - Estimated size reduction: ${(totalSizeReduced / 1024 / 1024).toFixed(2)} MB`);
        if (skippedDueToError > 0) {
            console.log(`   - Skipped due to errors: ${skippedDueToError}`);
        }
        console.log(`\n✅ Database optimized successfully!`);
        console.log(`✅ All essential fallback fields preserved:`);
        console.log(`   - endedReason, startedAt, endedAt, duration`);
        console.log(`   - status, error, phoneNumber`);
        
    } catch (error) {
        if (error.message && error.message.includes('space quota')) {
            console.error('\n❌ CRITICAL: Database quota exceeded!');
            console.error('📊 Database has reached 512 MB limit');
            console.error('ℹ️  The cleanup script cannot free space because there\'s no room for updates.\n');
        } else {
            console.error('❌ Error during cleanup:', error.message);
        }
        throw error;
    } finally {
        // Close connection safely
        if (crmDB) {
            try {
                await crmDB.close();
                console.log('🔌 Database connection closed');
            } catch (closeError) {
                console.warn('⚠️  Error closing database connection:', closeError.message);
            }
        }
    }
}

// Run cleanup
cleanupCallLogs()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });
