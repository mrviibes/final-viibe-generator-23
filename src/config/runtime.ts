// Centralized runtime configuration
const PRODUCTION_API_URL = 'https://your-api-server.com';
const LOCAL_API_URL = 'http://localhost:3001';

export function getServerUrl(): string {
  // Check environment variable first
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  
  // Development mode detection
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return LOCAL_API_URL;
  }
  
  // Runtime warning for placeholder URL
  if (PRODUCTION_API_URL === 'https://your-api-server.com') {
    console.warn('🚨 Using placeholder API URL. Update PRODUCTION_API_URL in src/config/runtime.ts');
  }
  
  return PRODUCTION_API_URL;
}