(function () {
  "use strict";

  // Get configuration from window.API_CONFIG (loaded from config.js)
  // Fallback to defaults if config not loaded
  var API_BASE = (window.API_CONFIG && window.API_CONFIG.API_URL) || window.location.origin || "https://lmsnew-6za2.onrender.com";
  var API_KEY = (window.API_CONFIG && window.API_CONFIG.API_KEY) || "yogi-lms-api-key-2025-secure-key-abc123xyz";

  async function request(path, options) {
    var config = options || {};
    var response = await fetch(API_BASE + path, config);

    if (response.status === 401 || response.status === 403) {
      if (window.LMS_AUTH && typeof window.LMS_AUTH.clearSession === "function") {
        window.LMS_AUTH.clearSession();
      }

      if (window.location.pathname.indexOf("/admin") === 0 || window.location.pathname === "/debug") {
        window.location.replace("/login");
      }

      throw new Error("Unauthorized");
    }

    return response;
  }

  async function requestJson(path, options) {
    var response = await request(path, options);
    var data = null;

    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      var message = data && (data.detail || data.error || data.message) ? (data.detail || data.error || data.message) : "Request failed";
      throw new Error(message);
    }

    return data;
  }

  function getToken() {
    return window.LMS_AUTH && typeof window.LMS_AUTH.getAccessToken === "function"
      ? window.LMS_AUTH.getAccessToken()
      : "";
  }

  function authHeaders(extraHeaders) {
    var headers = Object.assign({}, extraHeaders || {});
    var token = getToken();
    if (token) {
      headers.Authorization = "Bearer " + token;
    }
    headers["X-API-Key"] = API_KEY;
    return headers;
  }

  function jsonOptions(method, payload) {
    return {
      method: method,
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload)
    };
  }

  function formOptions(method, formData) {
    return {
      method: method,
      headers: authHeaders(),
      body: formData
    };
  }

  window.LMS_API = {
    baseUrl: API_BASE,
    request: request,
    requestJson: requestJson,
    authHeaders: authHeaders,
    jsonOptions: jsonOptions,
    formOptions: formOptions
  };

  window.API = API_BASE;
})();
