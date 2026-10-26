# Configuration Guide

## Centralized Domain and API Configuration

All domain and API URLs are now centralized in a single configuration file. This allows you to change the entire application's URLs by modifying values in one place.

## Configuration File

**Location:** `FE/src/config/appConfig.js`

This file contains all domain and API configurations:
- Frontend domain (safeledger.cloud)
- API base URL (2.24.128.170:4006)
- Cookie domain
- Support email

## How to Change Domains

### Option 1: Environment Variables (Recommended)

Create or update `.env` file in the `FE` directory:

```env
# Frontend domain (without protocol)
REACT_APP_FRONTEND_DOMAIN=yourdomain.com

# API base URL (protocol + hostname, no /api path)
REACT_APP_API_BASE_URL=https://api.yourdomain.com

# Support email
REACT_APP_SUPPORT_EMAIL=support@yourdomain.com

# Legacy: Full API URL with /api/v1 path (alternative to API_BASE_URL)
REACT_APP_API_URL=https://api.yourdomain.com/api/v1
```

### Option 2: Modify Config File Directly

Edit `FE/src/config/appConfig.js` and change the hardcoded values:

```javascript
// In getFrontendDomain() function
if (hostname.includes('safeledger.cloud')) {
  return 'safeledger.cloud';  // Change this
}

// In getApiBaseUrl() function
if (isProduction && hostname.includes('safeledger.cloud')) {
  return 'https://2.24.128.170:4006';  // Change this
}

// In getSupportEmail() function
if (domain.includes('safeledger.cloud')) {
  return 'support@safeledger.cloud';  // Change this
}
```

## Files Updated

All files now use the centralized configuration:

1. **`src/Api/axiosService.js`** - Axios base URL
2. **`src/utils/Constant.js`** - Legacy base URL (now uses config)
3. **`src/utils/socketConfig.js`** - Socket.io backend URL
4. **`src/config/router.js`** - Cookie domain
5. **`src/jsx/Admin/CRM/Sidebar.js`** - Socket.io connection
6. **`src/jsx/Admin/CRM/CallDashboard.jsx`** - SSE connection
7. **`src/jsx/Admin/CRM/leads.js`** - SSE connection
8. **`src/jsx/Admin/CRM/LeadStream.jsx`** - SSE connection
9. **`src/jsx/pages/user/Home/Home.js`** - Support email

## Usage Examples

### In React Components

```javascript
import { APP_CONFIG, getBackendUrl, getApiUrl } from '../config/appConfig';

// Use pre-configured values
const apiUrl = APP_CONFIG.API_URL;
const supportEmail = APP_CONFIG.SUPPORT_EMAIL;

// Or use helper functions
const backendUrl = getBackendUrl(); // For Socket.io/SSE
const fullApiUrl = getApiUrl(); // For API calls
```

### For Socket.io/SSE Connections

```javascript
import { getBackendUrl } from '../config/appConfig';

const backendUrl = getBackendUrl();
socket.connect(backendUrl);
```

## Priority Order

The configuration uses the following priority:

1. **Environment Variables** (highest priority)
   - `REACT_APP_API_BASE_URL`
   - `REACT_APP_FRONTEND_DOMAIN`
   - `REACT_APP_SUPPORT_EMAIL`

2. **Domain-based Detection** (production)
   - Automatically detects domain from `window.location.hostname`
   - Matches against known production domains

3. **Default Fallbacks** (development)
   - `localhost` for development
   - `http://localhost:4000` for API

## Testing

After changing configuration:

1. Restart the development server: `npm start`
2. Clear browser cache if needed
3. Verify API calls are using the new URLs
4. Check browser console for any connection errors

## Notes

- Environment variables must start with `REACT_APP_` to be accessible in React
- Changes to `.env` require restarting the dev server
- The config automatically handles protocol (http/https) based on environment
- Cookie domain is automatically set with leading dot for subdomain support
