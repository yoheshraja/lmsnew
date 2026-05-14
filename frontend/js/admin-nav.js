(function () {
  "use strict";

  var cache = null;

  function normalizePageKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\.html$/i, "")
      .replace(/_/g, "-")
      .replace(/\s+/g, "-");
  }

  async function fetchNavItems(forceRefresh) {
    if (!forceRefresh && cache) {
      return cache.slice();
    }

    var items = await window.LMS_API.requestJson("/api/nav-items");
    cache = items.map(function (item) {
      return Object.assign({}, item, { page: normalizePageKey(item.page) });
    });
    return cache.slice();
  }

  async function createNavItem(payload) {
    var item = await window.LMS_API.requestJson(
      "/api/nav-items",
      window.LMS_API.jsonOptions("POST", {
        name: payload.name,
        page: normalizePageKey(payload.page),
        icon: payload.icon,
        category: payload.category
      })
    );
    cache = null;
    return item;
  }

  async function updateNavItem(id, payload) {
    var item = await window.LMS_API.requestJson(
      "/api/nav-items/" + id,
      window.LMS_API.jsonOptions("PUT", {
        name: payload.name,
        page: normalizePageKey(payload.page),
        icon: payload.icon,
        category: payload.category,
        order: payload.order
      })
    );
    cache = null;
    return item;
  }

  async function deleteNavItem(id) {
    var result = await window.LMS_API.requestJson(
      "/api/nav-items/" + id,
      { method: "DELETE", headers: window.LMS_API.authHeaders() }
    );
    cache = null;
    return result;
  }

  async function resetNavItems() {
    var result = await window.LMS_API.requestJson(
      "/api/nav-items/reset",
      window.LMS_API.jsonOptions("POST", {})
    );
    cache = null;
    return result;
  }

  function findByPage(items, pageKey) {
    var normalized = normalizePageKey(pageKey);
    return items.find(function (item) {
      return normalizePageKey(item.page) === normalized;
    }) || null;
  }

  window.LMS_ADMIN_NAV = {
    normalizePageKey: normalizePageKey,
    fetchNavItems: fetchNavItems,
    createNavItem: createNavItem,
    updateNavItem: updateNavItem,
    deleteNavItem: deleteNavItem,
    resetNavItems: resetNavItems,
    findByPage: findByPage
  };
})();
