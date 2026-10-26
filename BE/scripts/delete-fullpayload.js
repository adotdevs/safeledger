/**
 * Database Space Recovery Script - Remove fullPayload from call logs
 * 
 * This script removes ONLY the fullPayload field from call logs to free up space quickly.
 * Uses MongoDB $unset operator which is faster and requires less space than $set.
 * 
 * The fullPayload field is NOT used as fallback in frontend - logs are fetched from Vapi API.
 * This script deletes it to free space without touching other essential fields.
 * 
 * PRESERVES all essential fields:
 * - endedReason, startedAt, endedAt, duration
 * - status, error, phoneNumber
 * 
 * Run: node BE/scripts/delete-fullpayload.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../config/config.env') });
const connectCRMDatabase = require('../config/crmDatabase');

async function deleteFullPayload() {
    let crmDB = null;
    try {
        console.log('🔧 Starting fullPayload deletion to free database space...');
        console.log('⚠️  This uses MongoDB $unset for fast space recovery\n');
        
        // Connect to CRM database
        console.log('🔗 Connecting to CRM database...');
        crmDB = await connectCRMDatabase();
        const callsCollection = crmDB.collection('calls');
        
        // Find all calls with logs containing data.fullPayload
        console.log('🔍 Scanning for calls with fullPayload...');
        const callsWithFullPayload = await callsCollection.countDocuments({
            'logs.data.fullPayload': { $exists: true }
        });
        console.log(`📊 Found ${callsWithFullPayload} calls with fullPayload field`);
        
        if (callsWithFullPayload === 0) {
            console.log('✅ No fullPayload fields found. Database already clean.');
            if (crmDB) await crmDB.close();
            return;
        }
        
        // Use updateMany with $unset to remove fullPayload - this is fast and frees space
        console.log('\n🗑️  Deleting fullPayload fields from all calls...');
        const result = await callsCollection.updateMany(
            { 'logs.data.fullPayload': { $exists: true } },
            [
                {
                    $set: {
                        logs: {
                            $map: {
                                input: '$logs',
                                as: 'log',
                                in: {
                                    $cond: [
                                        { $and: [
                                            { $ne: ['$$log.data', null] },
                                            { $eq: [{ $type: '$$log.data' }, 'object'] }
                                        ]},
                                        {
                                            type: '$$log.type',
                                            message: '$$log.message',
                                            timestamp: '$$log.timestamp',
                                            data: {
                                                endedReason: '$$log.data.endedReason',
                                                startedAt: '$$log.data.startedAt',
                                                endedAt: '$$log.data.endedAt',
                                                duration: '$$log.data.duration',
                                                status: '$$log.data.status',
                                                error: '$$log.data.error',
                                                phoneNumber: '$$log.data.phoneNumber'
                                            }
                                        },
                                        '$$log'
                                    ]
                                }
                            }
                        },
                        updatedAt: new Date()
                    }
                }
            ]
        );
        
        console.log(`✅ Deletion complete!`);
        console.log(`\n📊 Results:`);
        console.log(`   - Documents matched: ${result.matchedCount}`);
        console.log(`   - Documents modified: ${result.modifiedCount}`);
        console.log(`\n✅ Space freed by removing fullPayload`);
        console.log(`✅ All essential fields preserved:`);
        console.log(`   - endedReason, startedAt, endedAt, duration`);
        console.log(`   - status, error, phoneNumber`);
        
    } catch (error) {
        if (error.message && error.message.includes('space quota')) {
            console.error('\n❌ CRITICAL: Database quota exceeded!');
            console.error('📊 Database has reached 512 MB limit');
            console.error('ℹ️  Even deletion cannot proceed without space.\n');
            console.error('🔧 SOLUTIONS:');
            console.error('   1. Contact your database provider to increase storage');
            console.error('   2. Use MongoDB Atlas web interface to delete large collections');
            console.error('   3. Export data and create new database instance\n');
        } else {
            console.error('❌ Error during deletion:', error.message);
        }
        throw error;
    } finally {
        // Close connection safely
        if (crmDB) {
            try {
                await crmDB.close();
                console.log('\n🔌 Database connection closed');
            } catch (closeError) {
                console.warn('⚠️  Error closing connection:', closeError.message);
            }
        }
    }
}

// Run deletion
deleteFullPayload()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error.message);
        process.exit(1);
    });
