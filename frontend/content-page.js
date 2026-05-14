(function () {
  "use strict";

  var auth = window.LMS_AUTH;
  var nav = window.LMS_NAV;
  var API_BASE = window.location.origin;
  var PAGE_KEY = document.body.dataset.pageKey || "home-final";
  var DYNAMIC_TITLE = document.body.dataset.dynamicTitle === "true";
  var allContent = [];

  function getIsAdmin() {
    var session = auth ? auth.getSession() : null;
    return !!session && session.role === "admin";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    try {
      return new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch (error) {
      return "";
    }
  }

  function formatArticleBody(body) {
    return String(body || "")
      .split(/\n{2,}/)
      .map(function (paragraph) {
        return paragraph.trim();
      })
      .filter(Boolean)
      .map(function (paragraph) {
        return "<p>" + escapeHtml(paragraph).replace(/\n/g, "<br>") + "</p>";
      })
      .join("");
  }

  function extractTextSnippet(item) {
    var source = item.description || item.detail_body || item.article_body || "";
    var normalized = String(source).replace(/\s+/g, " ").trim();
    if (!normalized) {
      return "Open this item to view the full material.";
    }
    return normalized.length > 180 ? normalized.slice(0, 177) + "..." : normalized;
  }

  function getPrimaryVisual(item) {
    if (item.image_url) {
      return {
        kind: "image",
        label: "Photo",
        html: '<img src="' + item.image_url + '" alt="' + escapeHtml(item.title) + '" loading="lazy">'
      };
    }

    if (item.video_url) {
      return {
        kind: "video",
        label: "Video",
        html:
          '<video muted playsinline preload="metadata">' +
            '<source src="' + item.video_url + '">' +
          "</video>" +
          '<div class="media-preview__overlay"><i class="fas fa-play-circle"></i></div>'
      };
    }

    if (item.youtube_id) {
      return {
        kind: "youtube",
        label: "YouTube",
        html:
          '<img src="https://img.youtube.com/vi/' + item.youtube_id + '/hqdefault.jpg" alt="' + escapeHtml(item.title) + '" loading="lazy">' +
          '<div class="media-preview__overlay media-preview__overlay--youtube"><span><i class="fab fa-youtube"></i> Watch</span></div>'
      };
    }

    if (item.audio_url) {
      return {
        kind: "audio",
        label: "Audio",
        html:
          '<div class="media-preview__placeholder media-preview__placeholder--audio">' +
            '<i class="fas fa-headphones-alt"></i>' +
            "<span>Audio discourse</span>" +
          "</div>"
      };
    }

    if (item.article_body) {
      return {
        kind: "article",
        label: "Article",
        html:
          '<div class="media-preview__placeholder media-preview__placeholder--article">' +
            '<i class="fas fa-book-open"></i>' +
            "<span>Read article</span>" +
          "</div>"
      };
    }

    return null;
  }

  function buildAssetChips(item) {
    var chips = [];

    if (item.image_url) {
      chips.push('<button type="button" class="asset-chip" data-open="image"><i class="far fa-image"></i> Photo</button>');
    }
    if (item.video_url) {
      chips.push('<button type="button" class="asset-chip" data-open="video"><i class="fas fa-video"></i> Video</button>');
    }
    if (item.audio_url) {
      chips.push('<button type="button" class="asset-chip" data-open="audio"><i class="fas fa-music"></i> Audio</button>');
    }
    if (item.youtube_id) {
      chips.push('<button type="button" class="asset-chip" data-open="youtube"><i class="fab fa-youtube"></i> YouTube</button>');
    }
    if (item.article_body) {
      chips.push('<button type="button" class="asset-chip" data-open="article"><i class="fas fa-align-left"></i> Article</button>');
    }

    return chips.join("");
  }

  function buildLightboxPayload(item, type) {
    if (type === "image" && item.image_url) {
      return '<img src="' + item.image_url + '" alt="' + escapeHtml(item.title) + '">';
    }

    if (type === "video" && item.video_url) {
      return '<video controls autoplay playsinline><source src="' + item.video_url + '"></video>';
    }

    if (type === "audio" && item.audio_url) {
      return '<audio controls autoplay><source src="' + item.audio_url + '"></audio>';
    }

    if (type === "youtube" && item.youtube_id) {
      return '<iframe src="https://www.youtube.com/embed/' + item.youtube_id + '?autoplay=1" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>';
    }

    if (type === "article" && item.article_body) {
      return '<div class="lightbox-article">' + formatArticleBody(item.article_body) + "</div>";
    }

    return "";
  }

  function renderMetaList(item) {
    var entries = [];

    if (item.author_name) {
      entries.push('<div class="detail-meta__item"><span>Publisher</span><strong>' + escapeHtml(item.author_name) + "</strong></div>");
    }
    if (item.speaker_name) {
      entries.push('<div class="detail-meta__item"><span>Speaker</span><strong>' + escapeHtml(item.speaker_name) + "</strong></div>");
    }
    if (item.location_name) {
      entries.push('<div class="detail-meta__item"><span>Location</span><strong>' + escapeHtml(item.location_name) + "</strong></div>");
    }
    if (item.event_date) {
      entries.push('<div class="detail-meta__item"><span>Date</span><strong>' + escapeHtml(formatDate(item.event_date)) + "</strong></div>");
    }
    if (item.duration_text) {
      entries.push('<div class="detail-meta__item"><span>Duration</span><strong>' + escapeHtml(item.duration_text) + "</strong></div>");
    }
    if (item.publish_status) {
      entries.push('<div class="detail-meta__item"><span>Status</span><strong>' + escapeHtml(item.publish_status) + "</strong></div>");
    }

    return entries.join("");
  }

  function buildDetailPayload(item) {
    var mediaBlocks = [];
    var tagHtml = Array.isArray(item.tags) && item.tags.length
      ? item.tags.map(function (tag) { return '<span class="detail-tag">' + escapeHtml(tag) + "</span>"; }).join("")
      : "";
    var primaryText = item.detail_body || item.article_body || item.description || "";

    if (item.image_url) {
      mediaBlocks.push('<div class="detail-media"><img src="' + item.image_url + '" alt="' + escapeHtml(item.title) + '"></div>');
    }
    if (item.video_url) {
      mediaBlocks.push('<div class="detail-media"><video controls playsinline><source src="' + item.video_url + '"></video></div>');
    }
    if (item.audio_url) {
      mediaBlocks.push('<div class="detail-media"><audio controls preload="none"><source src="' + item.audio_url + '"></audio></div>');
    }
    if (item.youtube_id) {
      mediaBlocks.push('<div class="detail-media"><iframe src="https://www.youtube.com/embed/' + item.youtube_id + '" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>');
    }
    if (item.external_link) {
      mediaBlocks.push('<p><a class="detail-link" href="' + escapeHtml(item.external_link) + '" target="_blank" rel="noreferrer">Open source link</a></p>');
    }

    return (
      '<div class="detail-view">' +
        '<div class="detail-view__header">' +
          '<div class="item-kicker">' + escapeHtml(item.nav_page || PAGE_KEY) + "</div>" +
          '<h2 class="detail-view__title">' + escapeHtml(item.title) + "</h2>" +
          '<p class="detail-view__summary">' + escapeHtml(item.description || "") + "</p>" +
        "</div>" +
        (renderMetaList(item) ? '<div class="detail-meta">' + renderMetaList(item) + "</div>" : "") +
        (tagHtml ? '<div class="detail-tags">' + tagHtml + "</div>" : "") +
        (primaryText ? '<div class="detail-copy">' + formatArticleBody(primaryText) + "</div>" : "") +
        (mediaBlocks.length ? '<div class="detail-media-grid">' + mediaBlocks.join("") + "</div>" : "") +
      "</div>"
    );
  }

  function openLightbox(title, contentHtml) {
    var lightbox = document.getElementById("lightbox");
    if (!lightbox || !contentHtml) {
      return;
    }

    document.getElementById("lbContent").innerHTML = contentHtml;
    document.getElementById("lbTitle").textContent = title || "";
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    var lightbox = document.getElementById("lightbox");
    if (!lightbox) {
      return;
    }

    lightbox.classList.remove("open");
    lightbox.querySelectorAll("video,audio").forEach(function (media) {
      if (typeof media.pause === "function") {
        media.pause();
      }
    });
    lightbox.querySelectorAll("iframe").forEach(function (frame) {
      frame.src = frame.src;
    });
    document.getElementById("lbContent").innerHTML = "";
    document.body.style.overflow = "";
  }

  async function loadContent() {
    try {
      var response = await fetch(API_BASE + "/public/contents?nav_page=" + encodeURIComponent(PAGE_KEY));
      allContent = response.ok ? await response.json() : [];
    } catch (error) {
      allContent = [];
    }

    renderContent(allContent);
  }

  function renderContent(items) {
    var list = document.getElementById("contentList");
    var emptyState = document.getElementById("noResults");
    if (!list || !emptyState) {
      return;
    }

    list.innerHTML = "";

    if (!items || !items.length) {
      list.classList.add("hidden-element");
      emptyState.classList.remove("hidden-element");
      return;
    }

    list.classList.remove("hidden-element");
    emptyState.classList.add("hidden-element");

    items.forEach(function (item) {
      var article = document.createElement("article");
      var visual = getPrimaryVisual(item);
      var createdAt = formatDate(item.created_at);
      var assetChips = buildAssetChips(item);
      article.className = "content-item";

      article.innerHTML =
        '<div class="content-item__layout">' +
          (visual
            ? '<button type="button" class="media-preview media-preview--' + visual.kind + '" data-open="' + visual.kind + '" aria-label="Open ' + escapeHtml(item.title) + ' ' + visual.label + '">' + visual.html + "</button>"
            : '<div class="media-preview media-preview--empty"><div class="media-preview__placeholder"><i class="fas fa-folder-open"></i><span>Content</span></div></div>') +
          '<div class="content-item__body">' +
            '<div class="item-title-row">' +
              '<div class="item-kicker">' + escapeHtml(item.nav_page || PAGE_KEY) + "</div>" +
              '<h2 class="item-title">' + escapeHtml(item.title) + "</h2>" +
            "</div>" +
            '<div class="item-topic-row">' +
              '<span class="item-topic-badge">' + escapeHtml(item.topic || "General") + "</span>" +
              (item.featured ? '<span class="item-topic-badge item-topic-badge--featured">Featured</span>' : "") +
              (createdAt ? '<span class="item-date"><i class="far fa-calendar-alt"></i> ' + createdAt + "</span>" : "") +
            "</div>" +
            '<p class="item-desc">' + escapeHtml(extractTextSnippet(item)) + "</p>" +
            (assetChips ? '<div class="asset-chip-row">' + assetChips + "</div>" : "") +
            '<div class="item-actions"><button type="button" class="btn-detail" data-open="detail">Read More</button></div>' +
            buildEmbeddedSections(item) +
            (getIsAdmin() ? '<button class="item-delete-btn" type="button" data-action="delete"><i class="fas fa-trash"></i> Delete content</button>' : "") +
          "</div>" +
        "</div>";

      list.appendChild(article);

      var bodyPanel = article.querySelector(".content-item__body");
      if (bodyPanel) {
        bodyPanel.addEventListener("click", function (event) {
          if (event.target.closest("button,audio,a,textarea,input,select")) {
            return;
          }
          openLightbox(item.title, buildDetailPayload(item));
        });
      }

      article.querySelectorAll("[data-open]").forEach(function (button) {
        button.addEventListener("click", function () {
          var type = button.getAttribute("data-open");
          openLightbox(item.title, type === "detail" ? buildDetailPayload(item) : buildLightboxPayload(item, type));
        });
      });

      if (getIsAdmin()) {
        var deleteButton = article.querySelector('[data-action="delete"]');
        if (deleteButton) {
          deleteButton.addEventListener("click", function () {
            deleteItem(item.id, article);
          });
        }
      }
    });
  }

  function buildEmbeddedSections(item) {
    var sections = [];

    if (item.audio_url) {
      sections.push(
        '<div class="embedded-block">' +
          '<div class="embedded-block__label"><i class="fas fa-music"></i> Audio</div>' +
          '<audio controls preload="none"><source src="' + item.audio_url + '"></audio>' +
        "</div>"
      );
    }

    if (item.article_body) {
      sections.push(
        '<div class="embedded-block embedded-block--article">' +
          '<div class="embedded-block__label"><i class="fas fa-align-left"></i> Article Preview</div>' +
          '<div class="embedded-article">' + formatArticleBody(item.article_body) + "</div>" +
        "</div>"
      );
    }

    return sections.join("");
  }

  function filterContent() {
    var searchInput = document.getElementById("searchInput");
    var query = searchInput ? searchInput.value.toLowerCase().trim() : "";

    if (!query) {
      renderContent(allContent);
      return;
    }

    renderContent(
      allContent.filter(function (item) {
        return (
          (item.title || "").toLowerCase().indexOf(query) !== -1 ||
          (item.topic || "").toLowerCase().indexOf(query) !== -1 ||
          (item.description || "").toLowerCase().indexOf(query) !== -1 ||
          (item.article_body || "").toLowerCase().indexOf(query) !== -1 ||
          (item.detail_body || "").toLowerCase().indexOf(query) !== -1 ||
          (item.author_name || "").toLowerCase().indexOf(query) !== -1 ||
          (item.speaker_name || "").toLowerCase().indexOf(query) !== -1 ||
          (Array.isArray(item.tags) ? item.tags.join(" ").toLowerCase() : "").indexOf(query) !== -1
        );
      })
    );
  }

  async function deleteItem(id, element) {
    if (!confirm("Delete this content? This cannot be undone.")) {
      return;
    }

    var token = auth ? auth.getAccessToken() : "";
    if (!token) {
      return;
    }

    try {
      var response = await fetch(API_BASE + "/delete-content/" + id, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + token
        }
      });

      if (!response.ok) {
        return;
      }

      allContent = allContent.filter(function (item) {
        return String(item.id) !== String(id);
      });

      element.remove();
      if (!allContent.length) {
        renderContent([]);
      }
    } catch (error) {
      return;
    }
  }

  function updateDynamicHero(items) {
    if (!DYNAMIC_TITLE) {
      return;
    }

    var navItem = items.find(function (item) {
      return item.page === PAGE_KEY;
    });
    if (!navItem) {
      return;
    }

    var title = document.getElementById("dynamicPageTitle");
    var subtitle = document.getElementById("dynamicPageSub");
    if (title) {
      title.textContent = navItem.name;
    }
    if (subtitle) {
      subtitle.textContent = "Browse articles, photos, videos, and audio from this collection.";
    }
    document.title = navItem.name + " | Yogi LMS";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var closeButton = document.getElementById("lbClose");
    if (closeButton) {
      closeButton.addEventListener("click", closeLightbox);
    }

    var lightbox = document.getElementById("lightbox");
    if (lightbox) {
      lightbox.addEventListener("click", function (event) {
        if (event.target === lightbox) {
          closeLightbox();
        }
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeLightbox();
      }
    });

    if (nav) {
      nav.initNav().then(updateDynamicHero);
    }

    loadContent().finally(function () {
      document.body.classList.add("ready");
    });
  });

  window.filterContent = filterContent;
})();
