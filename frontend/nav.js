(function () {
  "use strict";

  var auth = window.LMS_AUTH;
  var API_BASE = window.location.origin;
  var navCache = null;

  var FALLBACK_NAV = [
    { nav_id: "home", name: "முகப்பு (Home)", page: "home-final", icon: "🏠", category: "main", order: 0 },
    { nav_id: "purvasramam", name: "பூர்வாஸ்ரமம்", page: "purvasramam-main", icon: "📜", category: "purvasramam", order: 1 },
    { nav_id: "childhood", name: "குழந்தைப் பருவம்", page: "bhagavan-childhood", icon: "👶", category: "purvasramam", order: 2 },
    { nav_id: "youth", name: "இளம் வயது", page: "isam-vayathu", icon: "🌱", category: "purvasramam", order: 3 },
    { nav_id: "marriage", name: "திருமணம்", page: "thirumanam", icon: "💍", category: "purvasramam", order: 4 },
    { nav_id: "quest", name: "ஞானத்தேடல்", page: "gnanathedal", icon: "🔍", category: "purvasramam", order: 5 },
    { nav_id: "prayer", name: "யோகி பிரார்த்தனை கூடல்", page: "yogi-prayer-hall", icon: "🙏", category: "main", order: 6 },
    { nav_id: "trichy", name: "திருச்சி", page: "trichy-gnanayagya", icon: "🏛️", category: "gnanayagya", order: 7 },
    { nav_id: "karur", name: "கரூர்", page: "karur-gnanayagya", icon: "🏙️", category: "gnanayagya", order: 8 },
    { nav_id: "hosur", name: "ஓசூர்", page: "hosur-gnanayagya", icon: "🌆", category: "gnanayagya", order: 9 },
    { nav_id: "iyalpunilai", name: "இயல்புநிலை", page: "iyalpunilai", icon: "🌿", category: "anandashram", order: 10 },
    { nav_id: "library", name: "நூலகம் (Library)", page: "noolagam", icon: "📚", category: "anandashram", order: 11 }
  ];

  var CATEGORY_META = {
    purvasramam: { label: "பூர்வாஸ்ரமம்", page: "purvasramam-main" },
    gnanayagya: { label: "ஞானயக்யம்", page: "gnanayagya-main" },
    anandashram: { label: "ஆனந்தாஸ்ரமம்", page: "anandashram-main" }
  };

  function currentPageKey() {
    if (document.body && document.body.dataset.pageKey) {
      return document.body.dataset.pageKey;
    }
    var path = window.location.pathname.replace(/^\/+/, "").replace(/\.html$/, "");
    return path || "home-final";
  }

  function fetchNavItems() {
    if (navCache) {
      return Promise.resolve(navCache);
    }

    return fetch(API_BASE + "/api/nav-items")
      .then(function (response) {
        if (!response.ok) {
          throw new Error("nav fetch failed");
        }
        return response.json();
      })
      .then(function (items) {
        navCache = items;
        return items;
      })
      .catch(function () {
        navCache = FALLBACK_NAV;
        return FALLBACK_NAV;
      });
  }

  function initNav() {
    bindHeaderShell();
    applySiteSettings();
    updateAuthActions();

    return fetchNavItems().then(function (items) {
      buildHeader(items);
      return items;
    });
  }

  function invalidateNavCache() {
    navCache = null;
  }

  function bindHeaderShell() {
    var header = document.querySelector("[data-navbar]");
    var toggle = document.getElementById("siteNavToggle");
    var panel = document.getElementById("siteNavPanel");

    if (!header || !toggle || !panel || toggle.dataset.bound === "true") {
      return;
    }

    toggle.dataset.bound = "true";

    toggle.addEventListener("click", function () {
      var isOpen = header.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    panel.addEventListener("click", function (event) {
      var actionLink = event.target.closest("a");
      if (actionLink && window.innerWidth <= 1024) {
        header.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }

      var groupToggle = event.target.closest("[data-group-toggle]");
      if (!groupToggle) {
        return;
      }

      var item = groupToggle.closest(".site-nav__item");
      if (!item) {
        return;
      }

      event.preventDefault();

      if (window.innerWidth <= 1024) {
        item.classList.toggle("is-open");
        return;
      }

      item.classList.toggle("is-open");
    });

    document.addEventListener("click", function (event) {
      if (!header.contains(event.target)) {
        header.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        closeAllDropdowns();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 1024) {
        header.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  function buildHeader(items) {
    var list = document.getElementById("mainNavList");
    if (!list) {
      return;
    }

    list.innerHTML = "";

    var pageKey = currentPageKey();
    var mainItems = items.filter(function (item) { return item.category === "main"; });
    var grouped = {};

    items
      .filter(function (item) { return item.category !== "main"; })
      .forEach(function (item) {
        var category = item.category || "other";
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(item);
      });

    var homeItem = mainItems.find(function (item) {
      return item.page === "home-final";
    });

    if (homeItem) {
      list.appendChild(createSimpleItem(homeItem, pageKey));
    }

    Object.keys(CATEGORY_META).forEach(function (category) {
      if (!grouped[category] || !grouped[category].length) {
        return;
      }
      list.appendChild(createGroupedItem(category, grouped[category], pageKey));
    });

    mainItems
      .filter(function (item) { return item.page !== "home-final"; })
      .forEach(function (item) {
        list.appendChild(createSimpleItem(item, pageKey));
      });
  }

  function createSimpleItem(item, pageKey) {
    var li = document.createElement("li");
    li.className = "site-nav__item";

    var link = document.createElement("a");
    link.className = "site-nav__link";
    link.href = "/" + item.page + ".html";
    link.textContent = item.name;
    if (item.page === pageKey) {
      link.classList.add("is-active");
    }

    li.appendChild(link);
    return li;
  }

  function createGroupedItem(category, items, pageKey) {
    var meta = CATEGORY_META[category];
    var li = document.createElement("li");
    li.className = "site-nav__item";
    if (pageKey === meta.page || items.some(function (item) { return item.page === pageKey; })) {
      li.classList.add("is-open");
    }

    var trigger = document.createElement("div");
    trigger.className = "site-nav__group-trigger";

    var categoryLink = document.createElement("a");
    categoryLink.className = "site-nav__group-link";
    categoryLink.href = "/" + meta.page + ".html";
    categoryLink.textContent = meta.label;
    if (pageKey === meta.page) {
      categoryLink.classList.add("is-active");
    }

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "site-nav__group-toggle";
    toggle.setAttribute("data-group-toggle", category);
    toggle.setAttribute("aria-label", "Toggle " + meta.label + " links");
    toggle.textContent = "▾";

    var menu = document.createElement("ul");
    menu.className = "site-nav__submenu";

    items.forEach(function (item) {
      var childItem = document.createElement("li");
      var childLink = document.createElement("a");
      childLink.href = "/" + item.page + ".html";
      childLink.textContent = item.name;
      if (item.page === pageKey) {
        childLink.classList.add("is-active");
      }
      childItem.appendChild(childLink);
      menu.appendChild(childItem);
    });

    trigger.appendChild(categoryLink);
    trigger.appendChild(toggle);
    li.appendChild(trigger);
    li.appendChild(menu);

    return li;
  }

  function updateAuthActions() {
    var authButton = document.getElementById("navAuthButton");
    var dashboardLink = document.getElementById("navDashboardLink");
    var session = auth ? auth.getSession() : null;

    if (!authButton || !dashboardLink) {
      return;
    }

    if (!session) {
      dashboardLink.classList.add("hidden-element");
      authButton.textContent = "Login";
      authButton.href = "/login";
      authButton.onclick = null;
      return;
    }

    dashboardLink.classList.remove("hidden-element");
    dashboardLink.href = session.role === "admin" ? "/adminpanel" : "/builder";
    dashboardLink.textContent = session.role === "admin" ? "Admin Panel" : "Builder";

    authButton.textContent = "Logout";
    authButton.href = "#logout";
    authButton.onclick = function (event) {
      event.preventDefault();
      auth.logout();
    };
  }

  function applySiteSettings() {
    try {
      var settings = JSON.parse(localStorage.getItem("lms_site_settings") || "{}");
      if (settings.siteName) {
        var title = document.getElementById("siteTitle");
        if (title) {
          title.textContent = settings.siteName;
        }
      }
      if (settings.siteSub) {
        var subtitle = document.getElementById("siteSubtitle");
        if (subtitle) {
          subtitle.textContent = settings.siteSub;
        }
      }
    } catch (error) {
      return;
    }
  }

  function closeAllDropdowns() {
    document.querySelectorAll(".site-nav__item.is-open").forEach(function (item) {
      item.classList.remove("is-open");
    });
  }

  window.LMS_NAV = {
    apiBase: API_BASE,
    pageKey: currentPageKey(),
    fetchNavItems: fetchNavItems,
    initNav: initNav,
    invalidateNavCache: invalidateNavCache,
    updateAuthActions: updateAuthActions
  };
})();
