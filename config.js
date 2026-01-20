import { Platform } from 'react-native';

// ============================================
// AWS BACKEND CONFIGURATION
// ============================================
// After deploying to AWS, replace this with your actual AWS URL
const AWS_BACKEND_URL = 'http://Authenticator-backend-env.eba-kjwzjbjf.eu-north-1.elasticbeanstalk.com';
// OR
// const AWS_BACKEND_URL = 'http://your-ec2-ip';
// OR
// const AWS_BACKEND_URL = 'https://your-api-id.execute-api.region.amazonaws.com/prod';

// ============================================
// DEVELOPMENT CONFIGURATION
// ============================================
const DEV_BACKEND_URLS = {
  web: 'http://localhost:3001',           // For web browsers
  mobile: 'http://192.168.1.5:3001',      // For mobile devices (your local IP)
};

/**
 * Get the appropriate API URL based on environment and platform
 */
function getApiUrl() {
  // Production mode - use AWS
  if (!__DEV__) {
    console.log('🌍 Production mode - Using AWS backend');
    return AWS_BACKEND_URL;
  }

  // Development mode
  console.log('🔧 Development mode');
  
  if (Platform.OS === 'web') {
    console.log('🌐 Platform: Web - Using localhost');
    return DEV_BACKEND_URLS.web;
  } else {
    console.log('📱 Platform: Mobile - Using local network IP');
    return DEV_BACKEND_URLS.mobile;
  }
}

export const CONFIG = {
  // ============================================
  // GOOGLE OAUTH CONFIGURATION
  // ============================================
  GOOGLE_WEB_CLIENT_ID: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  GOOGLE_IOS_CLIENT_ID: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  GOOGLE_ANDROID_CLIENT_ID: '356401180182-e9na9hppakcc40rlq72vg4jl59sut7iv.apps.googleusercontent.com',

  // ============================================
  // BACKEND API CONFIGURATION
  // ============================================
  API_URL: getApiUrl(),

  // AWS specific endpoints (once deployed)
  AWS_ENDPOINTS: {
    PRODUCTION: AWS_BACKEND_URL,
    // Add staging if you have it
    // STAGING: 'http://your-staging-app.elasticbeanstalk.com',
  },

  // ============================================
  // APP CONFIGURATION
  // ============================================
  APP_NAME: 'Secure Authenticator',
  APP_VERSION: '1.0.0',
  
  // API Timeouts
  API_TIMEOUT: 30000, // 30 seconds for scan operations
  HEALTH_CHECK_TIMEOUT: 5000, // 5 seconds for health checks
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Test if backend is reachable
 */
export async function testBackendConnection(url = CONFIG.API_URL) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.HEALTH_CHECK_TIMEOUT);
    
    const response = await fetch(`${url}/api/health`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        data: data,
        url: url,
      };
    }
    
    return {
      success: false,
      error: `Server responded with status ${response.status}`,
      url: url,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Connection failed',
      url: url,
    };
  }
}

/**
 * Switch to AWS backend (for testing)
 */
export function useAwsBackend() {
  console.log('🌍 Switching to AWS backend:', AWS_BACKEND_URL);
  return AWS_BACKEND_URL;
}

/**
 * Get all available backend URLs for debugging
 */
export function getAllBackendUrls() {
  return {
    current: CONFIG.API_URL,
    aws: AWS_BACKEND_URL,
    development: DEV_BACKEND_URLS,
  };
}

// ============================================
// DEBUG LOGGING
// ============================================
if (__DEV__) {
  console.log('='.repeat(60));
  console.log('🔧 Backend Configuration');
  console.log('='.repeat(60));
  console.log('📱 Platform:', Platform.OS);
  console.log('🔗 API URL:', CONFIG.API_URL);
  console.log('🌍 AWS URL:', AWS_BACKEND_URL);
  console.log('⏱️  Timeout:', CONFIG.API_TIMEOUT + 'ms');
  console.log('='.repeat(60));
}

// Export for use in other files
export default CONFIG;