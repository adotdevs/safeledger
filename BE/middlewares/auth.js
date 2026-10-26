const jwt = require("jsonwebtoken");
const ErrorHandler = require("../utils/errorHandler");
const User = require("../models/userModel");
const UserRestriction = require("../models/usersRestrictions");

// 🔑 Check Auth (Supports Cookie OR Authorization Header for Electron)
exports.isAuthorizedUser = async (req, res, next) => {
  try {
    // Try to get token from cookie first (for web browsers)
    let token = req.cookies?.jwttoken;
    let tokenSource = 'cookie';

    // If no cookie token, check Authorization header (for Electron apps)
    // Electron apps can't use cookies with file:// protocol, so they send token in header
    // Express normalizes headers to lowercase, so check 'authorization' first
    if (!token) {
      // Express normalizes all headers to lowercase, so 'Authorization' becomes 'authorization'
      const authHeader = req.headers.authorization || req.headers.Authorization;
      
      // Also check all possible header name variations
      const allHeaderKeys = Object.keys(req.headers);
      const authHeaderKey = allHeaderKeys.find(key => key.toLowerCase() === 'authorization');
      const authHeaderValue = authHeaderKey ? req.headers[authHeaderKey] : authHeader;
      
      if (authHeaderValue) {
        // Extract token from "Bearer <token>" format (case-insensitive)
        const headerUpper = authHeaderValue.toUpperCase();
        if (headerUpper.startsWith('BEARER ')) {
          token = authHeaderValue.substring(7).trim(); // Remove "Bearer " prefix and trim whitespace
          tokenSource = 'Authorization header';
        } else {
          token = authHeaderValue.trim(); // Fallback: use entire header if no "Bearer " prefix
          tokenSource = 'Authorization header (no Bearer)';
        }
      }
    }

    // Always log token check for debugging (especially for localhost/Electron)
    // Check if this looks like a localhost request (no cookie but might have Authorization header)
    const origin = req.headers.origin || '';
    const isLocalhostRequest = origin.includes('localhost') || origin.includes('127.0.0.1') || 
                               req.headers['user-agent']?.includes('Electron') ||
                               (!req.cookies?.jwttoken && (req.headers.authorization || req.headers.Authorization));
    
    

    if (!token) {
      // More detailed logging to debug Electron auth issues
      const allHeaders = Object.keys(req.headers);
      const authHeaders = allHeaders.filter(h => h.toLowerCase().includes('auth'));
      console.log('❌ [AUTH] No token found:', {
        hasCookie: !!req.cookies?.jwttoken,
        hasAuthHeader: !!(req.headers.authorization || req.headers.Authorization),
        authHeaderLower: req.headers.authorization ? req.headers.authorization.substring(0, 50) : 'none',
        authHeaderUpper: req.headers.Authorization ? req.headers.Authorization.substring(0, 50) : 'none',
        allAuthHeaders: authHeaders,
        authHeaderKeys: authHeaders.map(h => ({ key: h, value: req.headers[h]?.substring(0, 50) + '...' })),
        userAgent: req.headers['user-agent']?.substring(0, 50),
        origin: req.headers.origin,
        referer: req.headers.referer,
        path: req.path,
        method: req.method,
        allHeaderKeys: allHeaders.slice(0, 20) // First 20 headers for debugging
      });
      return next(new ErrorHandler("Please login to access this resource", 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_JWT);
    } catch (err) {
      return next(new ErrorHandler("Session expired. Please login again.", 401));
    }

    // CRITICAL: Always select adminPermissions and permissions to ensure they're available for permission checks
    const user = await User.findById(decoded._id).select('+adminPermissions +permissions');

    if (!user) {
      return next(new ErrorHandler("User not found. Please login again.", 401));
    }

    req.user = user;
    await User.findByIdAndUpdate(req.user._id, {
      lastActivity: new Date(),
      online: true
    });

    next();
  } catch (err) {
    console.error("Auth Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ✅ Role-based Access Control
exports.authorizedRoles = (...roles) => {
  return (req, res, next) => {
    
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Role: ${req.user.role} is not allowed to access this resource`,
          403
        )
      );
    }
    next();
  };
};

exports.checkCrmAccess = async (req, res, next) => {
  try {
    // Get user from request (added by isAuthorizedUser middleware)
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Check CRM access based on user role
    let hasCrmAccess = false;

    if (user.role === "superadmin") {
      // Superadmin always has CRM access
      hasCrmAccess = true;
    } else if (user.role === "admin") {
      // Check admin permissions
      hasCrmAccess = user.adminPermissions?.accessCrm === true;
    } else if (user.role === "subadmin") {
      // Check subadmin permissions
      hasCrmAccess = user.permissions?.accessCrm === true;
    }

    if (!hasCrmAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No CRM permissions"
      });
    }

    // User has CRM access, proceed to next middleware/controller
    next();

  } catch (error) {
    console.error("Error in checkCrmAccess middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error in access check"
    });
  }
};
// ✅ Check specific CRM permission: canManageCrmLeads (for viewing/managing leads)
exports.checkCanManageCrmLeads = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Fetch fresh user data to get latest permissions
    let freshUser = await User.findById(user._id).lean();

    if (!freshUser) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // Check specific permission based on user role
    let hasPermission = false;

    if (freshUser.role === "superadmin") {
      // Superadmin always has permission
      hasPermission = true;
    } else if (freshUser.role === "manager" || freshUser.role === "admin") {
      // Check adminPermissions.canManageCrmLeads
      hasPermission = freshUser.adminPermissions?.canManageCrmLeads === true || freshUser.adminPermissions?.canManageCrmLeads === 'true';
    } else if (freshUser.role === "subadmin") {
      // Subadmins use permissions field
      hasPermission = freshUser.permissions?.canManageCrmLeads === true || freshUser.permissions?.canManageCrmLeads === 'true';
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No permission to manage CRM leads"
      });
    }

    // Update req.user with fresh permissions
    req.user = { ...req.user, ...freshUser };
    next();

  } catch (error) {
    console.error("Error in checkCanManageCrmLeads middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error in permission check"
    });
  }
};

// ✅ Check specific CRM permission: canUploadLeads (for uploading/creating/deleting/editing leads)
exports.checkCanUploadLeads = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Fetch fresh user data to get latest permissions
    let freshUser = await User.findById(user._id).lean();

    if (!freshUser) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // Check specific permission based on user role
    let hasPermission = false;

    if (freshUser.role === "superadmin") {
      // Superadmin always has permission
      hasPermission = true;
    } else if (freshUser.role === "manager" || freshUser.role === "admin") {
      // Check adminPermissions.canUploadLeads
      hasPermission = freshUser.adminPermissions?.canUploadLeads === true || freshUser.adminPermissions?.canUploadLeads === 'true';
    } else if (freshUser.role === "subadmin") {
      // Subadmins use permissions field
      hasPermission = freshUser.permissions?.canUploadLeads === true || freshUser.permissions?.canUploadLeads === 'true';
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No permission to upload/manage leads"
      });
    }

    // Update req.user with fresh permissions
    req.user = { ...req.user, ...freshUser };
    next();

  } catch (error) {
    console.error("Error in checkCanUploadLeads middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error in permission check"
    });
  }
};

// ✅ Check specific CRM permission: canAccessAiInstructions
exports.checkCanAccessAiInstructions = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Fetch fresh user data to get latest permissions
    let freshUser = await User.findById(user._id).lean();

    if (!freshUser) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // Check specific permission based on user role
    let hasPermission = false;

    if (freshUser.role === "superadmin") {
      // Superadmin always has permission
      hasPermission = true;
    } else if (freshUser.role === "manager" || freshUser.role === "admin") {
      // Check adminPermissions.canAccessAiInstructions
      hasPermission = freshUser.adminPermissions?.canAccessAiInstructions === true || freshUser.adminPermissions?.canAccessAiInstructions === 'true';
    } else if (freshUser.role === "subadmin") {
      // Subadmins use permissions field
      hasPermission = freshUser.permissions?.canAccessAiInstructions === true || freshUser.permissions?.canAccessAiInstructions === 'true';
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No permission to access AI instructions"
      });
    }

    // Update req.user with fresh permissions
    req.user = { ...req.user, ...freshUser };
    next();

  } catch (error) {
    console.error("Error in checkCanAccessAiInstructions middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error in permission check"
    });
  }
};

// ✅ Check specific CRM permission: canMakeCalls (for initiating/scheduling/managing calls)
exports.checkCanMakeCalls = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Fetch fresh user data to get latest permissions
    let freshUser = await User.findById(user._id).lean();

    if (!freshUser) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // Check specific permission based on user role
    let hasPermission = false;

    if (freshUser.role === "superadmin") {
      // Superadmin always has permission
      hasPermission = true;
    } else if (freshUser.role === "manager" || freshUser.role === "admin") {
      // Check adminPermissions.canMakeCalls
      hasPermission = freshUser.adminPermissions?.canMakeCalls === true || freshUser.adminPermissions?.canMakeCalls === 'true';
    } else if (freshUser.role === "subadmin") {
      // Subadmins use permissions field
      hasPermission = freshUser.permissions?.canMakeCalls === true || freshUser.permissions?.canMakeCalls === 'true';
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No permission to make calls"
      });
    }

    // Update req.user with fresh permissions
    req.user = { ...req.user, ...freshUser };
    next();

  } catch (error) {
    console.error("Error in checkCanMakeCalls middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error in permission check"
    });
  }
};

// ✅ Check specific CRM permission: canAccessCallDashboard (for viewing call dashboard/statistics)
exports.checkCanAccessCallDashboard = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Fetch fresh user data to get latest permissions
    let freshUser = await User.findById(user._id).lean();

    if (!freshUser) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // Check specific permission based on user role
    let hasPermission = false;

    if (freshUser.role === "superadmin") {
      // Superadmin always has permission
      hasPermission = true;
    } else if (freshUser.role === "manager" || freshUser.role === "admin") {
      // Check adminPermissions.canAccessCallDashboard
      hasPermission = freshUser.adminPermissions?.canAccessCallDashboard === true || freshUser.adminPermissions?.canAccessCallDashboard === 'true';
    } else if (freshUser.role === "subadmin") {
      // Subadmins use permissions field
      hasPermission = freshUser.permissions?.canAccessCallDashboard === true || freshUser.permissions?.canAccessCallDashboard === 'true';
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No permission to access call dashboard"
      });
    }

    // Update req.user with fresh permissions
    req.user = { ...req.user, ...freshUser };
    next();

  } catch (error) {
    console.error("Error in checkCanAccessCallDashboard middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error in permission check"
    });
  }
};

// ✅ Check specific CRM permission: canViewCallLogs (for viewing call logs)
exports.checkCanViewCallLogs = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Fetch fresh user data to get latest permissions
    let freshUser = await User.findById(user._id).lean();

    if (!freshUser) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // Check specific permission based on user role
    let hasPermission = false;

    if (freshUser.role === "superadmin") {
      // Superadmin always has permission
      hasPermission = true;
    } else if (freshUser.role === "manager" || freshUser.role === "admin") {
      // Check adminPermissions.canViewCallLogs
      hasPermission = freshUser.adminPermissions?.canViewCallLogs === true || freshUser.adminPermissions?.canViewCallLogs === 'true';
    } else if (freshUser.role === "subadmin") {
      // Subadmins use permissions field
      hasPermission = freshUser.permissions?.canViewCallLogs === true || freshUser.permissions?.canViewCallLogs === 'true';
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No permission to view call logs"
      });
    }

    // Update req.user with fresh permissions
    req.user = { ...req.user, ...freshUser };
    next();

  } catch (error) {
    console.error("Error in checkCanViewCallLogs middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error in permission check"
    });
  }
};

// ✅ Check specific CRM permission: canViewRecordings (for viewing call recordings)
exports.checkCanViewRecordings = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Fetch fresh user data to get latest permissions
    let freshUser = await User.findById(user._id).lean();

    if (!freshUser) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // Check specific permission based on user role
    let hasPermission = false;

    if (freshUser.role === "superadmin") {
      // Superadmin always has permission
      hasPermission = true;
    } else if (freshUser.role === "manager" || freshUser.role === "admin") {
      // Check adminPermissions.canViewRecordings
      hasPermission = freshUser.adminPermissions?.canViewRecordings === true || freshUser.adminPermissions?.canViewRecordings === 'true';
    } else if (freshUser.role === "subadmin") {
      // Subadmins use permissions field
      hasPermission = freshUser.permissions?.canViewRecordings === true || freshUser.permissions?.canViewRecordings === 'true';
    }

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No permission to view call recordings"
      });
    }

    // Update req.user with fresh permissions
    req.user = { ...req.user, ...freshUser };
    next();

  } catch (error) {
    console.error("Error in checkCanViewRecordings middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error in permission check"
    });
  }
};
exports.checkWalletAccess = async (req, res, next) => {
  try {
    // Get user from request (added by isAuthorizedUser middleware)
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Get global wallet setting
    let globalSettings = await UserRestriction.findOne();
    if (!globalSettings) {
      globalSettings = { walletEnabled: true }; // Default to enabled if not set
    }

    // Check wallet access based on user role
    let hasWalletAccess = false;

    // Global setting check (superadmin can still access settings even if disabled)
    if (!globalSettings.walletEnabled && user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Wallet access denied: Wallet platform is currently disabled"
      });
    }

    if (user.role === "superadmin") {
      // Superadmin always has wallet access
      hasWalletAccess = true;
    } else if (user.role === "admin") {
      // Check admin permissions - must be explicitly true (undefined or false = no access)
      // Need to fetch fresh user data to get latest permissions
      const freshUser = await User.findById(user._id).select('+adminPermissions');
      hasWalletAccess = freshUser?.adminPermissions?.accessWallet === true;
    } else if (user.role === "subadmin") {
      // Check subadmin permissions - must be explicitly true (undefined or false = no access)
      // Need to fetch fresh user data to get latest permissions
      const freshUser = await User.findById(user._id).select('+permissions');
      hasWalletAccess = freshUser?.permissions?.accessWallet === true;
    } else if (user.role === "user") {
      // Check user permissions - must be explicitly true (undefined or false = no access)
      // Need to fetch fresh user data to get latest permissions
      const freshUser = await User.findById(user._id).select('+permissions');
      hasWalletAccess = freshUser?.permissions?.accessWallet === true;
    }

    if (!hasWalletAccess) {
      return res.status(403).json({
        success: false,
        message: "Wallet access denied: No wallet permissions"
      });
    }

    // User has wallet access, proceed to next middleware/controller
    next();

  } catch (error) {
    console.error("Error in checkWalletAccess middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error in access check"
    });
  }
};

exports.checkReferralManagementAccess = async (req, res, next) => {
  try {
    // Get user from request (added by isAuthorizedUser middleware)
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Check referral management access based on user role
    let hasReferralAccess = false;

    if (user.role === "superadmin") {
      // Superadmin always has referral management access
      hasReferralAccess = true;
    } else if (user.role === "admin") {
      // Check admin permissions
      hasReferralAccess = user.adminPermissions?.canManageReferrals === true;
    }

    if (!hasReferralAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied: No referral management permissions"
      });
    }

    // User has referral management access, proceed to next middleware/controller
    next();

  } catch (error) {
    console.error("Error in checkReferralManagementAccess middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error in access check"
    });
  }
};
 