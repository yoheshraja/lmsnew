/**
 * API Configuration
 * Specify backend API URL based on environment
 */

window.API_CONFIG = {
  // ====== DEVELOPMENT ======
  // For local development, use these settings:
  // API_URL: "http://localhost:3000",  // Backend running on port 3000
  // Frontend running on: http://localhost:5000

  // ====== PRODUCTION ======
  // For production, use your actual domain:
   API_URL: window.location.origin,

  // Default: Use current location (same origin)
  // Change this based on your environment
  //API_URL: window.location.origin,

  API_KEY: "yogi-lms-api-key-2025-secure-key-abc123xyz",

  // Optional: Set these to override defaults
  // API_URL: "http://localhost:3000",
  // API_URL: "http://192.168.1.100:3000",
};

console.log("[LMS Config] API_URL set to:", window.API_CONFIG.API_URL);
