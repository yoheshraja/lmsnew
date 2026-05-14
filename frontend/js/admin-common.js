(function () {
  "use strict";

  function getSession() {
    return window.LMS_AUTH && typeof window.LMS_AUTH.getSession === "function"
      ? window.LMS_AUTH.getSession()
      : null;
  }

  function requireAdmin() {
    if (!window.LMS_AUTH || typeof window.LMS_AUTH.requireRole !== "function") {
      return null;
    }
    return window.LMS_AUTH.requireRole("admin");
  }

  function populateAdminIdentity() {
    var session = getSession();
    if (!session || !session.email) {
      return;
    }

    document.querySelectorAll(".admin-name").forEach(function (element) {
      element.textContent = session.email.split("@")[0];
    });

    document.querySelectorAll(".admin-role").forEach(function (element) {
      element.textContent = session.role === "admin" ? "Administrator" : "User";
    });
  }

  function setActiveSidebarLink() {
    var currentPath = window.location.pathname;
    document.querySelectorAll(".menu-item").forEach(function (item) {
      var href = item.getAttribute("href") || "";
      item.classList.toggle("active", currentPath === href || currentPath.indexOf(href + "/") === 0);
    });
  }

  function initializeFileInputs() {
    document.querySelectorAll("input[type='file']").forEach(function (input) {
      if (input.dataset.bound === "true") {
        return;
      }

      input.dataset.bound = "true";
      input.addEventListener("change", function () {
        var label = this.nextElementSibling;
        if (!label) {
          return;
        }

        var textSpan = label.querySelector(".file-input-text");
        if (!textSpan) {
          return;
        }

        if (this.files && this.files.length) {
          textSpan.textContent = this.files[0].name;
          label.classList.add("file-selected");
        } else {
          textSpan.textContent = textSpan.dataset.default || "Choose file";
          label.classList.remove("file-selected");
        }
      });
    });

    document.querySelectorAll(".file-input-text").forEach(function (span) {
      if (!span.dataset.default) {
        span.dataset.default = span.textContent;
      }
    });
  }

  function showNotification(message, type) {
    var kind = type || "success";
    var element = document.createElement("div");
    element.className = "notification " + kind;
    element.textContent = message;
    element.style.cssText = [
      "position:fixed",
      "top:20px",
      "right:20px",
      "padding:12px 20px",
      "border-radius:8px",
      "background:" + (kind === "success" ? "#4caf50" : "#f44336"),
      "color:#fff",
      "z-index:9999",
      "opacity:0",
      "transition:opacity .3s",
      "box-shadow:0 4px 6px rgba(0,0,0,0.1)"
    ].join(";");

    document.body.appendChild(element);
    setTimeout(function () { element.style.opacity = "1"; }, 20);
    setTimeout(function () {
      element.style.opacity = "0";
      setTimeout(function () { element.remove(); }, 300);
    }, 2500);
  }

  function resetStandardFormFields() {
    document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="file"], textarea').forEach(function (input) {
      input.value = "";
    });

    document.querySelectorAll(".file-input-text").forEach(function (span) {
      span.textContent = span.dataset.default || "Choose file";
    });

    document.querySelectorAll(".file-input-label").forEach(function (label) {
      label.classList.remove("file-selected");
    });
  }

  function logout() {
    if (window.LMS_AUTH && typeof window.LMS_AUTH.logout === "function") {
      window.LMS_AUTH.logout();
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (window.location.pathname.indexOf("/admin") !== 0) {
      return;
    }

    requireAdmin();
    populateAdminIdentity();
    setActiveSidebarLink();
    initializeFileInputs();
  });

  window.LMS_ADMIN = {
    requireAdmin: requireAdmin,
    populateAdminIdentity: populateAdminIdentity,
    setActiveSidebarLink: setActiveSidebarLink,
    initializeFileInputs: initializeFileInputs,
    showNotification: showNotification,
    resetStandardFormFields: resetStandardFormFields,
    logout: logout
  };
})();
