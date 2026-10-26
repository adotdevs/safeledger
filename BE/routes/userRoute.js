let express = require("express");
const {
  RegisterUser,
  loginUser,
  logoutUser,
  resetPassword,
  allUser, updateNotificationStatus,
  singleUser,
  updateSingleUser,
  verifySingleUser,
  getsignUser,
  verifyToken, deleteTicket,
  updateKyc,
  sendTicket, userCryptoCard,
  getHtmlData,
  setHtmlData, createLink,
  bypassSingleUser,
  sendEmailCode,
  createAccount,
  deletePayment,
  addCard,
  updateSingleUserStatus,
  createTicket,
  updateMessage,
  adminUpdateTicket,
  adminTickets,
  getUserTickets, getIndivTicket, RegisterSubAdmin, addUserByEmail,
  applyCreditCard,
  getNotifications,
  getStocks,
  addNewStock,
  deleteStock,
  updateStock, updateLinks
  , getLinks,
  deleteNotification,
  deleteAllNotifications,
  addMyTokens,
  getAllTokens, updateToken, deleteUserTokens,
  getMyTokens,
  getUsersRestrictions,
  updateUsersRestrictions, updateSubAdminPermissions, updateAdminPermissions,
  updateAdminVapiConfig,
  getMyVapiConfig,
  updateAdminSipConfig,
  getMySipConfig,
  getLogs,
  deleteLogs,
  restartServer
} = require("../controllers/userController");
const {
  verifyReferralCode,
  getMyReferralCode,
  getMyReferralTree,
  getMyReferrals,
  getMyEarnings,
  getAllReferrals,
  getSystemStatistics,
  getUserReferralDetails,
  activateUserAndSetCommission,
  updateUserAffiliateStatus,
  addCommissionManually
} = require("../controllers/referralController");
const { authorizedRoles, isAuthorizedUser, checkReferralManagementAccess, checkWalletAccess } = require("../middlewares/auth");
const singleUpload = require("../middlewares/multer");

let router = express.Router();
router.route("/register").post(RegisterUser);
router.route("/login").post(loginUser);
router.route("/logout").get(logoutUser);

router.route("/adminUserRegistration").post(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), RegisterUser);
router.route("/registerSubAdmin").post(isAuthorizedUser, authorizedRoles("superadmin", "admin"), RegisterSubAdmin);
router.route("/addUserByEmail").post(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), addUserByEmail);
router.route("/allUser").get(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), allUser);
router.route("/singleUser/:id").get(isAuthorizedUser, singleUser);
router.route("/updateSingleUser/:id").post(isAuthorizedUser, updateSingleUser);
router.route("/updateSingleUserStatus/:id").post(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), updateSingleUserStatus);
router.route("/bypassSingleUser/:id").patch(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), bypassSingleUser);
router.route("/verifySingleUser").patch(isAuthorizedUser, singleUpload, verifySingleUser);
router.route("/getHtmlData").get(isAuthorizedUser, getHtmlData);
router.route("/password/reset").post(resetPassword);
router.route("/getsignUser").patch(isAuthorizedUser, singleUpload, getsignUser);

// ===========================
// REFERRAL/AFFILIATE ROUTES (MLM SYSTEM) - Must be before /:id/verify/:token route!
// ===========================

// Public endpoint - verify referral code during registration
router.route("/referral/verify/:code").get(verifyReferralCode);

// User endpoints - authenticated users
router.route("/referral/my-code").get(isAuthorizedUser, checkWalletAccess, getMyReferralCode);
router.route("/referral/my-tree").get(isAuthorizedUser, checkWalletAccess, getMyReferralTree);
router.route("/referral/my-referrals").get(isAuthorizedUser, checkWalletAccess, getMyReferrals);
router.route("/referral/my-earnings").get(isAuthorizedUser, checkWalletAccess, getMyEarnings);

// Admin endpoints - superadmin and admin with canManageReferrals permission
router.route("/referral/admin/all").get(isAuthorizedUser, authorizedRoles("superadmin", "admin"), checkReferralManagementAccess, getAllReferrals);
router.route("/referral/admin/statistics").get(isAuthorizedUser, authorizedRoles("superadmin", "admin"), checkReferralManagementAccess, getSystemStatistics);
router.route("/referral/admin/user/:userId").get(isAuthorizedUser, authorizedRoles("superadmin", "admin"), checkReferralManagementAccess, getUserReferralDetails);
router.route("/referral/admin/activate/:userId").post(isAuthorizedUser, authorizedRoles("superadmin", "admin"), checkReferralManagementAccess, activateUserAndSetCommission);
router.route("/referral/admin/status/:userId").patch(isAuthorizedUser, authorizedRoles("superadmin", "admin"), checkReferralManagementAccess, updateUserAffiliateStatus);
router.route("/referral/admin/commission/:userId").post(isAuthorizedUser, authorizedRoles("superadmin", "admin"), checkReferralManagementAccess, addCommissionManually);

router.route("/:id/verify/:token").get(verifyToken);

router.route("/updateKyc/:id").patch(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), updateKyc);
router.route("/setHtmlData").patch(isAuthorizedUser, setHtmlData);
router.route("/sendTicket").post(isAuthorizedUser, checkWalletAccess, sendTicket);
router.route("/createAccount/:id").patch(createAccount);
router.route("/addCard/:id").patch(isAuthorizedUser, checkWalletAccess, addCard);
router.route("/sendEmail").post(isAuthorizedUser, checkWalletAccess, sendEmailCode);
router.route("/userCryptoCard").post(isAuthorizedUser, checkWalletAccess, userCryptoCard);
router.route("/deletePayment/:id/:pId").get(isAuthorizedUser, checkWalletAccess, deletePayment);
router.route("/createTicket").post(isAuthorizedUser, checkWalletAccess, createTicket);
router.route("/applyCreditCard").post(isAuthorizedUser, checkWalletAccess, applyCreditCard);
router.route("/updateMessage").patch(isAuthorizedUser, checkWalletAccess, updateMessage);
// router.route("/admin/tickets/:i/update-status").put(adminUpdateTicket);
router.route("/admin/tickets").get(isAuthorizedUser, adminTickets);
router.route("/getNotifications").get(isAuthorizedUser, checkWalletAccess, getNotifications);
router.route("/updateNotificationStatus/:id/:status").get(isAuthorizedUser, checkWalletAccess, updateNotificationStatus);
router.route("/getUserTickets/:id").get(isAuthorizedUser, checkWalletAccess, getUserTickets);
router.route("/getIndivTicket/:id/:ticketId").get(isAuthorizedUser, checkWalletAccess, getIndivTicket);
router.route("/stocks").get(isAuthorizedUser, checkWalletAccess, getStocks);
router.route("/stocks/:id").patch(isAuthorizedUser, checkWalletAccess, updateStock);
router.route("/tokens/:id").patch(isAuthorizedUser, checkWalletAccess, updateToken);
router.route("/stocks/:id").delete(isAuthorizedUser, checkWalletAccess, deleteStock);
router.route("/addNewStock").post(isAuthorizedUser, checkWalletAccess, addNewStock);
router.route("/getLinks").get(isAuthorizedUser, checkWalletAccess, getLinks);
router.route("/updateLinks/:id/:mode").put(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), checkWalletAccess, updateLinks);
router.route("/createLink").post(isAuthorizedUser, checkWalletAccess, createLink);
router.route("/deleteTicket/:id").delete(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), deleteTicket);
router.route("/deleteNotification/:id").delete(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), deleteNotification);
router.route("/deleteAllNotifications").delete(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), deleteAllNotifications);
router.route("/addMyTokens/:userId").patch(isAuthorizedUser, checkWalletAccess, singleUpload, addMyTokens);
router.route("/getAllTokens/:id").get(isAuthorizedUser, checkWalletAccess, getAllTokens);
router.route("/tokens/:id").get(isAuthorizedUser, checkWalletAccess, authorizedRoles("superadmin", "admin", "subadmin", "user"), getMyTokens);
router
  .route("/deleteUserTokens/:id/:coindId")
  .delete(isAuthorizedUser, checkWalletAccess, authorizedRoles("superadmin", "admin", "subadmin"), deleteUserTokens);

router.route("/restrictions").get(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin", "user"), getUsersRestrictions);

// PUT – only admin should access this
router.route("/restrictionsUpdate").patch(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), updateUsersRestrictions);
router.route("/users/:id/permissions").patch(isAuthorizedUser, authorizedRoles("superadmin", "admin"), updateSubAdminPermissions);
router.route("/admin/:id/permissions").patch(isAuthorizedUser, authorizedRoles("superadmin"), updateAdminPermissions);
router.route("/admin/:id/vapi-config").patch(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), updateAdminVapiConfig);
router.route("/my/vapi-config").get(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), getMyVapiConfig);
router.route("/admin/:id/sip-config").patch(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), updateAdminSipConfig);
router.route("/my/sip-config").get(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), getMySipConfig);
router.route("/getErrorLogs").get(isAuthorizedUser, authorizedRoles("superadmin"), getLogs);
router.route("/deleteErrorLogs").delete(isAuthorizedUser, authorizedRoles("superadmin"), deleteLogs);
router.route("/restartServer").post(isAuthorizedUser, authorizedRoles("superadmin", "admin", "subadmin"), restartServer);

module.exports = router;
