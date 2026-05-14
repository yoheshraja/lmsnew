const API = window.location.origin;

(function () {
  "use strict";

  function logout() {
    if (window.LMS_ADMIN && typeof window.LMS_ADMIN.logout === "function") {
      window.LMS_ADMIN.logout();
      return;
    }

    if (window.LMS_AUTH && typeof window.LMS_AUTH.logout === "function") {
      window.LMS_AUTH.logout();
    }
  }

  function showNotification(message, type) {
    if (window.LMS_ADMIN && typeof window.LMS_ADMIN.showNotification === "function") {
      window.LMS_ADMIN.showNotification(message, type);
    }
  }

  function clearForm() {
    if (window.LMS_ADMIN && typeof window.LMS_ADMIN.resetStandardFormFields === "function") {
      window.LMS_ADMIN.resetStandardFormFields();
    }
  }

  async function handleApiResponse(response) {
    if (response.status === 401 || response.status === 403) {
      if (window.LMS_AUTH && typeof window.LMS_AUTH.clearSession === "function") {
        window.LMS_AUTH.clearSession();
      }
      window.location.replace("/login");
      throw new Error("Unauthorized");
    }

    return response;
  }

  window.logout = logout;
  window.showNotification = showNotification;
  window.clearForm = clearForm;
  window.handleApiResponse = handleApiResponse;
})();
