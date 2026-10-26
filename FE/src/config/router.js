import React, { useEffect, useState, useRef } from "react";
import { BrowserRouter, HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { APP_CONFIG } from "./appConfig";
import Login from "../jsx/pages/authentication/Login";
import SignUp from "../jsx/pages/authentication/Registration";
// import Login from "../jsx/pages/authentication/Test";
import { AuthProvider, RequireAuth, useSignOut, useAuthUser } from "react-auth-kit";
import { hasWalletAccess } from "../utils/walletAccess";
import { getRestrictionsApi, allUsersApi } from "../Api/Service";
// import AuthenticatingLoader from "../components/WalletAccess/AuthenticatingLoader";
import AccessDenied from "../components/WalletAccess/AccessDenied";
import { toast } from "react-toastify";
import Home from "../jsx/pages/user/Home/Home.js";
import ProfileEdit from "../jsx/pages/user/editProfile";
import Stocks from "../jsx/pages/user/Stocks";
import Exchange from "../jsx/pages/user/Exchange";
import Account from "../jsx/pages/user/Account";
import Dashboard from "../jsx/pages/user/Dashboard";
import Market from "../jsx/pages/user/Market";
import Error404 from "../jsx/pages/error/Error404";
import Documents from "../jsx/pages/user/Documents";
import Assets from "../jsx/pages/user/Asssets";
import StakingPg from "../jsx/pages/user/Staking";
import Swappg from "../jsx/pages/user/Swap";
import Transactions from "../jsx/pages/user/Transactions";
import Supportpg from "../jsx/pages/user/Support";
import Kyc from "../jsx/pages/user/Kyc";
import EmailVerify from "../jsx/pages/EmailVerify";
import UserVerifications from "../jsx/Admin/SingleUser/UserVerificatons";
import UserStocks from "../jsx/Admin/SingleUser/userStocks";
import AdminDashboard from "../jsx/Admin/Dashboard";
import PendingTransactions from "../jsx/Admin/pendingTransactions";
import AdminTickets from "../jsx/Admin/AdminTicktes";
import AdminUsers from "../jsx/Admin/AdminUsers.js";
import General from "../jsx/Admin/SingleUser/Generalmain.js";
import UserAssets from "../jsx/Admin/SingleUser/UserAssets";
import UserTransactions from "../jsx/Admin/SingleUser/UserTransactions";
import AdminProfile from "../jsx/Admin/adminProfile";
import TicketDetails from "../jsx/Admin/TicketDetails";
import SupportTickets from "../jsx/Admin/SupportTickets";
import FileUpload from "../jsx/Admin/fileUpload";
import AddUser from "../jsx/Admin/AddUser";
import UserDocs from "../jsx/Admin/SingleUser/UserDocs";
// import UseApplyBodyStyles from "./hookUpdate.js";
import CreateTicketpg from "../jsx/pages/user/createTicketpg.js";
import AllTicket from "../jsx/pages/user/AllTicket.js";
import ScrollToTop from "./top.js";
import Supportpage from "../jsx/Admin/createTicketMain.js";
import AddSubAdmin from "../jsx/Admin/AddsubAdmin.js";
import AdminSubAdmin from "../jsx/Admin/AdminSubAdmin.js";
import LetterPg from "../jsx/pages/user/Letter.js";
import CardPg from "../jsx/pages/user/creditCard.js";
import SubAdminUsers from "../jsx/Admin/SubAdminUsers.js";

import AiTradingBot from "../jsx/pages/user/AiTradingBot.js";
import UserLinks from "../jsx/Admin/UserLinks.js";
import UserStaking from "../jsx/Admin/SingleUser/userStaking.js";
import AddAdmin from "../jsx/Admin/AddAdmin.js";
import AdminManagement from "../jsx/Admin/AdminManagement.js";
import AdminErrorLogs from "../jsx/Admin/errorLogs.js";
import AdminPermissions from "../jsx/Admin/SingleUser/AdminPermissions.js";
import UserTokens from "../jsx/Admin/SingleUser/userTokens.js";
import Tokens from "../jsx/pages/user/Tokens.js";
import axiosService from "../Api/axiosService.js";
// import UserOnlineStatus from "./userOnlineStatus.js";
import LoginPage from "../jsx/Admin/CRM/Login.js";
import LeadsPage from "../jsx/Admin/CRM/leads.js";
import RecycleBin from "../jsx/Admin/CRM/RecycleBin.jsx";
import EmailQueue from "../jsx/Admin/CRM/EmailQueue.jsx";
import LeadStream from "../jsx/Admin/CRM/LeadStream.jsx";
import CallDashboard from "../jsx/Admin/CRM/CallDashboard.jsx";
import PendingCallsQueue from "../jsx/Admin/CRM/PendingCallsQueue.jsx";
import FailedCalls from "../jsx/Admin/CRM/FailedCalls.jsx";
import NoAnswerCalls from "../jsx/Admin/CRM/NoAnswerCalls.jsx";
import CancelledCalls from "../jsx/Admin/CRM/CancelledCalls.jsx";
import CrmProfile from "../jsx/Admin/CRM/Profile.jsx";
import AdminManagementCRM from "../jsx/Admin/CRM/AdminManagement.jsx";
import AIInstructions from "../jsx/Admin/CRM/AIInstructions.jsx";
// MLM: Referral System

import DarkModeProvider from "../context/DarkModeContext";
import ReferralPromo from "../jsx/pages/user/ReferralPromo.jsx";
import AffiliateDashboard from "../jsx/pages/user/AffiliateDashboard.jsx";
import ReferralManagement from "../jsx/Admin/ReferralManagement.jsx";

// Detect if running in Electron
const isElectron = () => {
  return (
    typeof window !== 'undefined' &&
    (window.electron?.isElectron === true || 
     window.navigator?.userAgent?.includes('Electron') ||
     (window.process && window.process.type === 'renderer') ||
     window.location.protocol === 'file:')
  );
};

// RequireWalletAccess component to protect wallet routes
const RequireWalletAccess = ({ children }) => {
  const authUser = useAuthUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const hasCheckedRef = useRef(false);
  const checkIntervalRef = useRef(null);

  // Define checkAccess function outside useEffect so it can be referenced
  const checkAccess = async () => {
    // Only show authenticating UI on initial check
    if (!hasCheckedRef.current) {
      setIsChecking(true);
    }

    try {
      const cachedUser = authUser()?.user;
      if (!cachedUser) {
        setHasAccess(false);
        setIsChecking(false);
        navigate('/auth/login');
        return;
      }

      // ✅ SUPERADMIN BYPASS: Superadmin is the "god father" and always has access
      // Superadmin can never be restricted from wallet access
      if (cachedUser.role === 'superadmin') {
        console.log('👑 [Wallet Access] Superadmin - always granted (unrestricted access)');
        setHasAccess(true);
        hasCheckedRef.current = true;
        setIsChecking(false);
        return;
      }

      // ✅ For all other users: Fetch fresh user data from API to verify current permissions
      // This ensures we detect real-time access changes for admin/subadmin/user roles
      console.log('🔍 [Wallet Access] Fetching fresh user data from database for permission check...');
      
      const currentUserResponse = await allUsersApi({ 
        search: cachedUser._id,  // Search by ID to get fresh data
        limit: 1 
      });

      let user = cachedUser; // Fallback to cached user if API fails
      if (currentUserResponse.success && currentUserResponse.allUsers.length > 0) {
        user = currentUserResponse.allUsers[0]; // Use fresh user data with latest permissions
        console.log('✅ [Wallet Access] Fetched fresh user data from database');
      } else {
        console.warn('⚠️ [Wallet Access] Failed to fetch fresh user data, using cached data');
      }

      // Fetch global settings from backend (real-time check)
      const globalSettingsResponse = await getRestrictionsApi();
      const globalSettings = globalSettingsResponse.success 
        ? globalSettingsResponse.data 
        : { walletEnabled: true };

      // Check wallet access using fresh user data (frontend + backend verification)
      const frontendAccess = hasWalletAccess(user, globalSettings);
      
      if (!frontendAccess) {
        console.log('❌ [Wallet Access] Access denied');
        setHasAccess(false);
        setIsChecking(false);
        // Stop periodic checks when access is denied
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        
        // For admins/subadmins: redirect to home page with message (using fresh user data)
        if (user.role === 'admin' || user.role === 'subadmin') {
          console.log('❌ [Wallet Access] Admin/Subadmin wallet access denied - redirecting to home');
          console.log('   Admin permissions:', user.adminPermissions);
          console.log('   Subadmin permissions:', user.permissions);
          toast.error('You do not have access to the wallet platform');
          navigate('/', { replace: true });
          return;
        }
        
        // For users: show access denied UI
        console.log('❌ [Wallet Access] Showing AccessDenied UI');
        // AccessDenied component will handle logout after showing UI
        return;
      }
      
      if (hasCheckedRef.current) {
        console.log('✅ [Wallet Access] Periodic check passed - access still granted');
      }
      
      setHasAccess(true);
      hasCheckedRef.current = true;
      setIsChecking(false);
    } catch (error) {
      console.error('Error checking wallet access:', error);
      // If API call fails with 403, access is denied
      if (error.response?.status === 403 || error.response?.status === 401) {
        console.log('❌ [Wallet Access] Backend returned 403/401 - access denied');
        setHasAccess(false);
        setIsChecking(false);
        // Stop periodic checks when access is denied
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        
        // For admins/subadmins: fetch fresh data and redirect to home page with message
        const cachedUser = authUser()?.user;
        if (cachedUser && (cachedUser.role === 'admin' || cachedUser.role === 'subadmin')) {
          try {
            // Fetch fresh user data to check latest permissions
            const currentUserResponse = await allUsersApi({ 
              search: cachedUser._id,
              limit: 1 
            });
            
            let user = cachedUser;
            if (currentUserResponse.success && currentUserResponse.allUsers.length > 0) {
              user = currentUserResponse.allUsers[0];
            }
            
            // Double-check with fresh data
            const globalSettingsResponse = await getRestrictionsApi();
            const globalSettings = globalSettingsResponse.success 
              ? globalSettingsResponse.data 
              : { walletEnabled: true };
            const freshAccess = hasWalletAccess(user, globalSettings);
            
            if (!freshAccess) {
              console.log('❌ [Wallet Access] Admin/Subadmin wallet access denied (from error handler)');
              toast.error('You do not have access to the wallet platform');
              navigate('/', { replace: true });
              return;
            }
          } catch (fetchError) {
            console.error('Error fetching fresh user data in error handler:', fetchError);
            // Fallback: redirect anyway if we can't verify
            toast.error('You do not have access to the wallet platform');
            navigate('/', { replace: true });
            return;
          }
        }
        
        // For users: show access denied UI
        return;
      }
      // For network errors, we should still check frontend access
      // But if frontend check fails, deny access
      const user = authUser()?.user;
      if (user) {
        // Superadmin always has access - cannot be restricted
        if (user.role === 'superadmin') {
          setHasAccess(true);
          setIsChecking(false);
          return;
        }
        const frontendAccess = hasWalletAccess(user, { walletEnabled: true }); // Assume enabled for network error
        if (!frontendAccess) {
          console.log('❌ [Wallet Access] Frontend check failed - access denied');
          setHasAccess(false);
          setIsChecking(false);
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
          return;
        }
      }
      // For network errors, allow access but log
      console.warn('⚠️ [Wallet Access] Network error during check, allowing access');
      setHasAccess(true);
      setIsChecking(false);
    }
  };

  // Initial access check
  useEffect(() => {
    checkAccess();

    // Periodic backend check (every 30 seconds) to detect access revocation
    // FIXED: Only set up interval, check hasAccess state inside the callback
    checkIntervalRef.current = setInterval(() => {
      // Check current access state directly in the interval
      // This will be called regardless, but only proceed if conditions are met
      console.log('🔄 [Wallet Access] Periodic check running...');
      // The checkAccess function will read current state through its closure
      checkAccess();
    }, 30000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  // FIXED: Separate effect to stop periodic checks when access is denied
  useEffect(() => {
    if (hasAccess === false && checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
      console.log('🛑 [Wallet Access] Periodic checks stopped - access denied');
    }
  }, [hasAccess]);

  // Check on route changes (but avoid loops - don't check if we're already on a CRM page)
  useEffect(() => {
    // FIXED: Skip all checks if access is already denied
    if (hasAccess === false) {
      console.log('🛑 [Wallet Access] Skipping route change check - access already denied');
      return;
    }

    // Skip check if we're on a CRM page (to avoid redirect loops)
    if (location.pathname.startsWith('/admin/crm') || location.pathname.startsWith('/admin/dashboard/crm')) {
      return;
    }
    
    // Only re-check if we've already done initial check and have access
    if (hasCheckedRef.current && hasAccess === true && location.pathname) {
      console.log('🔄 [Wallet Access] Route changed, re-checking access...');
      // Re-check access on route change
      const user = authUser()?.user;
      if (user && user.role === 'superadmin') {
        // Superadmin always has access - no need to re-check
        return;
      }
      if (!user) {
        return;
      }
      // For non-superadmin, trigger a re-check to verify access is still valid
      const reCheck = async () => {
        try {
          // Fetch fresh user data to check latest permissions
          const currentUserResponse = await allUsersApi({ 
            search: user._id,
            limit: 1 
          });
          
          let freshUser = user;
          if (currentUserResponse.success && currentUserResponse.allUsers.length > 0) {
            freshUser = currentUserResponse.allUsers[0];
          }

          const globalSettingsResponse = await getRestrictionsApi();
          const globalSettings = globalSettingsResponse.success 
            ? globalSettingsResponse.data 
            : { walletEnabled: true };
          const frontendAccess = hasWalletAccess(freshUser, globalSettings);
          if (!frontendAccess) {
            setHasAccess(false);
            setIsChecking(false);
            if (checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current);
              checkIntervalRef.current = null;
            }
            // For admins/subadmins: redirect to home page with message
            if (freshUser.role === 'admin' || freshUser.role === 'subadmin') {
              toast.error('You do not have access to the wallet platform');
              navigate('/', { replace: true });
              return;
            }
          }
        } catch (error) {
          console.error('Error re-checking wallet access on route change:', error);
        }
      };
      reCheck();
    }
  }, [location.pathname, authUser, navigate, hasAccess]);

  // Show authenticating loader only during initial check
  // Do not uncomment the below one
  // if (isChecking && hasAccess === null) {
  //   return <AuthenticatingLoader />;
  // }

  // Show access denied page if access is revoked
  if (hasAccess === false) {
    return <AccessDenied />;
  }

  // Show children if access is granted
  if (hasAccess === true) {
    return children;
  }

  // Fallback: show loading if state is unclear
  // // Do not uncomment the below one
  // return <AuthenticatingLoader />;
};

function AppRouter() {
  const signOut = useSignOut();

  useEffect(() => {
    const interceptor = axiosService.interceptors.response.use(

      (response) => {
        return response
      },
      (error) => {
        // Handle 403 wallet access denied separately - don't redirect immediately
        // Let RequireWalletAccess component handle it and show AccessDenied UI
        if (error.response?.status === 403 && error.config?.url?.includes('/restrictions')) {
          // This is a wallet access check - let the component handle it
          return Promise.reject(error);
        }
        
        // Handle 401/405 for other cases (session expired, etc.)
        // Note: This is in AppRouter, we can't use navigate here directly
        // For wallet access 403, RequireWalletAccess handles it smoothly
        if (error.response?.status === 401 || error.response?.status === 405) {
          signOut();                    // clear react-auth-kit session
          localStorage.removeItem("token");
          localStorage.removeItem("authToken");
          localStorage.removeItem("authUser");
          localStorage.removeItem("auth_state");
          
          // Clear Electron token on 401 (backend validated and rejected it)
          // For Electron: token is in localStorage and sent via Authorization header
          // If backend returns 401, it means token is invalid/expired, so clear it
          localStorage.removeItem("jwttoken");
          
          // Use window.location only as last resort for 401 (session expired)
          // This is different from wallet access revocation which uses smooth navigation
          window.location.href = "/auth/login";
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosService.interceptors.response.eject(interceptor);
    };
  }, [signOut]);
  return null;
}
export default function Router() {
  // Use HashRouter for Electron, BrowserRouter for web
  const RouterComponent = isElectron() ? HashRouter : BrowserRouter;

  // Compute cookie settings
  // For Electron: cookies come from, so we need to match that domain
  const isElectronEnv = isElectron();
  let cookieDomain = 'localhost'; // Default fallback
  let cookieSecure = false;
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || 'localhost';
    const isLocalhost = !hostname || hostname === 'localhost' || hostname.includes('localhost') || hostname === '127.0.0.1';
    const isHttps = window.location.protocol === "https:";
    const isFileProtocol = window.location.protocol === "file:";
    
    // For Electron (file:// protocol): Use API domain for cookies
    // Cookies are set by  , so domain should match
    if (isElectronEnv || isFileProtocol) {
      // Electron app - cookies come from  
      // Use the API domain for cookie domain
      cookieDomain = '.safeledger.cloud'; // Match the API server domain
      cookieSecure = true; // API is HTTPS, so cookies must be secure
    } else if (isLocalhost) {
      // Web localhost - use hostname
      cookieDomain = hostname || 'localhost';
      cookieSecure = false; // HTTP localhost
    } else if (APP_CONFIG?.COOKIE_DOMAIN) {
      // Web production - use config
      cookieDomain = APP_CONFIG.COOKIE_DOMAIN;
      cookieSecure = isHttps;
    } else {
      cookieDomain = hostname;
      cookieSecure = isHttps;
    }
  }
  
  // Ensure cookieSecure is always a boolean and cookieDomain is always a non-empty string
  cookieSecure = Boolean(cookieSecure);
  cookieDomain = cookieDomain || 'localhost'; // Ensure it's never empty

  return (
    <AuthProvider 
      authType="cookie"
      authName="_auth"
      cookieDomain={cookieDomain}
      cookieSecure={cookieSecure} >
        
      <DarkModeProvider>
      <RouterComponent >
        {/* <UseApplyBodyStyles /> */}
        <ScrollToTop />
        {/* <UserOnlineStatus /> */}
        <AppRouter />
        <Routes>
          <Route index path="/" element={<Home />} />{" "}
          <Route path="/auth/login" element={<Login />} />{" "}
          <Route path="/auth/signup" element={<SignUp />} />
          <Route path="/auth/login/crm" element={<LoginPage />} />

          <Route path="/users/:id/verify/:token" element={<EmailVerify />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <Dashboard />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/dashboard/crm"
            element={
              <RequireAuth loginPath={"/auth/login/crm"}>
                <LeadsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/dashboard/crm/recycle-bin"
            element={
              <RequireAuth loginPath={"/auth/login/crm"}>
                <RecycleBin />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/crm/failed-emails"
            element={
              <RequireAuth loginPath={"/auth/login/crm"}>
                <EmailQueue />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/crm/email-queue"
            element={
              <RequireAuth loginPath={"/auth/login/crm"}>
                <EmailQueue />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/crm/lead/:leadId/stream"
            element={
              <RequireAuth loginPath={"/auth/login/crm"}>
                <LeadStream />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/crm/call-dashboard"
            element={
              <RequireAuth loginPath={"/auth/login/crm"}>
                <CallDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/crm/pending-calls"
            element={
              <RequireAuth loginPath={"/auth/login/crm"}>
                <PendingCallsQueue />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/crm/failed-calls"
            element={
              <RequireAuth loginPath={"/auth/login/crm"}>
                <FailedCalls />
              </RequireAuth>
            }
          />
            <Route
            path="/admin/crm/no-answer-calls"
            element={
              <RequireAuth loginPath={"/auth/login/crm"}>
                <NoAnswerCalls />
              </RequireAuth>
            }
          />
           <Route
            path="/admin/crm/cancelled-calls"
            element={
              <RequireAuth loginPath={"/auth/login/crm"}>
                <CancelledCalls />
              </RequireAuth>
            }
          />
           <Route
            path="/admin/crm/ai-instructions"
            element={
              <RequireAuth loginPath={"/auth/login/crm"}>
                <AIInstructions />
              </RequireAuth>
            }
          />
           <Route
            path="/admin/crm/profile"
            element={
              <RequireAuth loginPath={"/auth/login/crm"}>
                <CrmProfile />
              </RequireAuth>
            }
          />
           <Route
            path="/admin/crm/admin-management"
            element={
              <RequireAuth loginPath={"/auth/login/crm"}>
                <AdminManagementCRM />
              </RequireAuth>
            }
          />
          <Route
            path="/market"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <Market />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/edit-profile"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <ProfileEdit />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/stocks/:id"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <Stocks />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/all-files"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <Documents />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/crypto-card"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <CardPg />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/assets"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <Assets />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/tokens"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <Tokens />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/legal"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <LetterPg />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/exchanges"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <Exchange />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <Account />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/staking"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <StakingPg />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/swap"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <Swappg />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/trading"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <AiTradingBot />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/Transactions/:id"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <Transactions />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          {/* MLM: Referral System Routes */}
          <Route
            path="/user/referral-promo"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <ReferralPromo />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/user/affiliate"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <AffiliateDashboard />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/support"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <Supportpg />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/create-ticket"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <CreateTicketpg />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/tickets/:ticketId"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <AllTicket />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/flows/kyc"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <Kyc />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <AdminDashboard />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          {/* <Route
            path="/admin/upload-files"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <FileUpload />
              </RequireAuth>
            }
          /> */}
          <Route
            path="/admin/transactions/pending"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <PendingTransactions />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/tickets"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <AdminTickets />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <AdminProfile />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/support"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <SupportTickets />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/ticket/user/:id/:ticketId"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <TicketDetails />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/add-new-member"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <AddUser />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          {/* <Route
            path="/admin/add-subadmin"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <AddSubAdmin />
              </RequireAuth>
            }
          /> */}

          <Route
            path="/admin/users"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <AdminUsers />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <AdminErrorLogs />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          {/* MLM: Admin Referral Management */}
          <Route
            path="/admin/referrals"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <ReferralManagement />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/user/links"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <UserLinks />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/subadmin"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <AdminSubAdmin />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/superadmin/admins"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <AdminManagement />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/subadmin/users/:id"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <SubAdminUsers />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/permissions/:id"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <AdminPermissions />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/user/:id/general"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <General />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users/:id/documents"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <UserDocs />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users/:id/assets"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <UserAssets />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users/:id/transactions"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <UserTransactions />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users/:id/verifications"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <UserVerifications />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users/:id/stocks"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <UserStocks />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users/:id/tokens"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <UserTokens />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users/:id/staking"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <UserStaking />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/createTicket/:id/:email"
            element={
              <RequireAuth loginPath={"/auth/login"}>
                <RequireWalletAccess>
                  <Supportpage />
                </RequireWalletAccess>
              </RequireAuth>
            }
          />
          <Route path="*" element={<Error404 />} />
        </Routes>
      </RouterComponent>
      </DarkModeProvider>
    </AuthProvider>
  );
}
