(function () {
  "use strict";

  var auth = window.LMS_AUTH;
  if (!auth) {
    return;
  }

  auth.redirectAuthenticatedUser();

  var form = document.getElementById("loginForm");
  var emailInput = document.getElementById("email");
  var passwordInput = document.getElementById("password");
  var passwordToggle = document.getElementById("passwordToggle");
  var rememberInput = document.getElementById("rememberEmail");
  var submitButton = document.getElementById("submitButton");
  var submitText = document.getElementById("submitText");
  var message = document.getElementById("loginMessage");
  var leftDoor = document.querySelector(".left-door");
  var rightDoor = document.querySelector(".right-door");

  var rememberedEmail = auth.getRememberedEmail();
  if (rememberedEmail) {
    emailInput.value = rememberedEmail;
    rememberInput.checked = true;
  }

  passwordToggle.addEventListener("click", function () {
    var nextType = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = nextType;
    passwordToggle.textContent = nextType === "password" ? "Show" : "Hide";
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    var email = emailInput.value.trim();
    var password = passwordInput.value;
    if (!email || !password) {
      showMessage("Enter both email and password.", "error");
      return;
    }

    setLoading(true);
    showMessage("", "");

    try {
      var session = await auth.login(email, password);
      auth.rememberEmail(email, rememberInput.checked);
      showMessage("Login successful. Opening doors...", "success");
      leftDoor.classList.add("is-open");
      rightDoor.classList.add("is-open");

      window.setTimeout(function () {
        window.location.assign(session.redirect || auth.getRedirectForRole(session.role));
      }, 1000);
    } catch (error) {
      showMessage(error.message || "Login failed.", "error");
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitText.textContent = isLoading ? "Signing in..." : "Login";
  }

  function showMessage(text, type) {
    message.textContent = text;
    message.className = "login-message";
    if (type) {
      message.classList.add(type === "error" ? "is-error" : "is-success");
    }
  }
})();
