(function () {
  "use strict";

  var API_BASE = window.location.origin;
  var STORAGE_KEY = "lms_auth";
  var REMEMBER_EMAIL_KEY = "lms_saved_email";

  function readSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.token || !parsed.role) {
        return null;
      }
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function syncLegacyStorage(session) {
    sessionStorage.clear();

    if (!session) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("userToken");
      return;
    }

    sessionStorage.setItem("token", session.token);
    sessionStorage.setItem("userEmail", session.email || "");
    sessionStorage.setItem("userRole", session.role || "user");

    if (session.role === "admin") {
      localStorage.setItem("adminToken", session.token);
      localStorage.removeItem("userToken");
    } else {
      localStorage.setItem("userToken", session.token);
      localStorage.removeItem("adminToken");
    }
  }

  function saveSession(session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    syncLegacyStorage(session);
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
    syncLegacyStorage(null);
  }

  function getRedirectForRole(role) {
    return role === "admin" ? "/adminpanel" : "/builder";
  }

  async function login(email, password) {
    var response = await fetch(API_BASE + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    });

    var data;
    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok) {
      var message = data.detail || data.error || "Login failed";
      throw new Error(message);
    }

    var session = {
      token: data.token,
      email: data.user && data.user.email ? data.user.email : email,
      role: data.role || (data.user && data.user.role) || "user",
      redirect: data.redirect || getRedirectForRole(data.role)
    };
    saveSession(session);
    return session;
  }

  function logout() {
    clearSession();
    window.location.replace("/login");
  }

  function redirectAuthenticatedUser() {
    var session = readSession();
    if (!session) {
      return;
    }
    syncLegacyStorage(session);
    window.location.replace(getRedirectForRole(session.role));
  }

  function requireRole(role) {
    var session = readSession();
    if (!session) {
      clearSession();
      window.location.replace("/login");
      return null;
    }

    syncLegacyStorage(session);

    if (role && session.role !== role) {
      window.location.replace(getRedirectForRole(session.role));
      return null;
    }

    return session;
  }

  function getAccessToken() {
    var session = readSession();
    return session ? session.token : "";
  }

  function getRememberedEmail() {
    return localStorage.getItem(REMEMBER_EMAIL_KEY) || "";
  }

  function rememberEmail(email, enabled) {
    if (enabled) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
  }

  window.LMS_AUTH = {
    apiBase: API_BASE,
    login: login,
    logout: logout,
    getSession: readSession,
    getAccessToken: getAccessToken,
    requireRole: requireRole,
    redirectAuthenticatedUser: redirectAuthenticatedUser,
    getRedirectForRole: getRedirectForRole,
    getRememberedEmail: getRememberedEmail,
    rememberEmail: rememberEmail,
    clearSession: clearSession
  };

  syncLegacyStorage(readSession());
})();
