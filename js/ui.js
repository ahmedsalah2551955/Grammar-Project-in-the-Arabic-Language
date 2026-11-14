/* ==========================================================================
   نَحْو — واجهة المستخدم المشتركة
   أيقونات، مظهر، تنبيهات، حوارات، وحالات فارغة.
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;
  var Store = Nahw.store;

  var ICONS = {
    home: '<path d="m3 10.5 9-7 9 7"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><path d="M12 17h.01"/>',
    settings: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/><path d="M8 7h8"/>',
    "book-open": '<path d="M2 4h7a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h7z"/>',
    "arrow-up": '<path d="M12 20V4"/><path d="m5 11 7-7 7 7"/>',
    "arrow-left": '<path d="M20 12H4"/><path d="m11 19-7-7 7-7"/>',
    "arrow-right": '<path d="M4 12h16"/><path d="m13 5 7 7-7 7"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
    branch: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="9" r="2"/><path d="M6 7v10"/><path d="M6 13c6 0 6-4 12-4"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    sparkles: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor" stroke="none"/><path d="M19 16v3"/><path d="M17.5 17.5h3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.9 4.9l1.4 1.4"/><path d="M17.7 17.7l1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.9 19.1l1.4-1.4"/><path d="M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    "check-circle": '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    x: '<path d="m6 6 12 12"/><path d="m18 6-12 12"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "chevron-left": '<path d="m15 6-6 6 6 6"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" fill="currentColor" stroke="none"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5H4v2a4 4 0 0 0 4 4"/><path d="M16 5h4v2a4 4 0 0 1-4 4"/><path d="M12 13v5"/><path d="M8 21h8"/><path d="M9 18h6"/>',
    flame: '<path d="M12 3c2.5 3 5 5.2 5 8.5A5 5 0 0 1 12 17a5 5 0 0 1-5-5.5C7 8.2 9.5 6 12 3z"/><path d="M12 21a6 6 0 0 0 6-6"/><path d="M12 21v-4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m6 7 1 14h10l1-14"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 6.7"/><path d="M20 4v7h-7"/>',
    play: '<path d="M16 5v14L5 12z" fill="currentColor" stroke="none"/>',
    list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 10h18"/>',
    lightbulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    shield: '<path d="M12 3 4 6v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/>',
    "wifi-off": '<path d="m2 2 20 20"/><path d="M8.5 8.5a10 10 0 0 1 11.5 2.5"/><path d="M5 12.5a10 10 0 0 1 3-2"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M12 20h.01"/>',
    graduation: '<path d="M22 9 12 4 2 9l10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>',
    medal: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-2 7 5.5-3 5.5 3-2-7"/>',
    "file-text": '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/>',
    palette: '<path d="M12 3a9 9 0 0 0 0 18h1.5a2.5 2.5 0 0 0 0-5H13a1 1 0 0 1 0-2h5a3 3 0 0 0 3-3 8.5 8.5 0 0 0-9-8z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="9.5" cy="6.5" r="1"/><circle cx="14.5" cy="6.5" r="1"/>',
    "rotate-ccw": '<path d="M4 11a8 8 0 1 1 2.3 6.7"/><path d="M4 4v7h7"/>'
  };

  var iconCache = {};

  function icon(name, className) {
    var inner = ICONS[name] || ICONS.info;
    var cls = "icon" + (className ? " " + className : "");
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  function hydrateIcons(root) {
    var scope = root || document;
    scope.querySelectorAll("[data-icon]").forEach(function (element) {
      var name = element.getAttribute("data-icon");
      if (!name) {
        return;
      }
      element.innerHTML = icon(name);
      element.removeAttribute("data-icon");
    });
  }

  function levelClass(number) {
    var n = Number(number);
    return n >= 1 && n <= 5 ? "level-" + n : "";
  }

  function levelBadge(number, label) {
    var meta = Utils.levelByNumber(number);
    return '<span class="level-badge ' + levelClass(number) + '">' +
      Utils.escapeHTML(label || (meta ? meta.name : "المستوى " + number)) +
      "</span>";
  }

  function sectionIcon(section) {
    return icon(section && section.icon ? section.icon : "book");
  }

  /* ------------------------------------------------------------------------
     المظهر
     ------------------------------------------------------------------------ */

  var themeMedia = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var themeInitialized = false;

  function resolveTheme(theme) {
    if (theme === "dark") {
      return "dark";
    }
    if (theme === "light") {
      return "light";
    }
    return themeMedia && themeMedia.matches ? "dark" : "light";
  }

  function applyTheme(theme, dispatch) {
    var resolved = resolveTheme(theme || "system");
    document.documentElement.setAttribute("data-theme", resolved);

    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute("content", resolved === "dark" ? "#0c1512" : "#0f766e");
    }

    var toggle = document.getElementById("theme-toggle");
    if (toggle) {
      var nextLabel = resolved === "dark" ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي";
      toggle.innerHTML = icon(resolved === "dark" ? "sun" : "moon");
      toggle.setAttribute("aria-label", nextLabel);
      toggle.setAttribute("title", nextLabel);
      toggle.setAttribute("aria-pressed", resolved === "dark" ? "true" : "false");
    }

    if (dispatch) {
      document.dispatchEvent(new CustomEvent("nahw:themechange", {
        detail: { theme: theme || "system", resolved: resolved }
      }));
    }
  }

  function setTheme(theme) {
    var next = ["light", "dark", "system"].indexOf(theme) !== -1 ? theme : "system";
    Store.updateSettings({ theme: next });
    applyTheme(next, true);
    return next;
  }

  function toggleTheme() {
    var current = resolveTheme(Store.getSettings().theme);
    setTheme(current === "dark" ? "light" : "dark");
  }

  function initTheme() {
    if (themeInitialized) {
      applyTheme(Store.getSettings().theme, false);
      return;
    }
    themeInitialized = true;
    applyTheme(Store.getSettings().theme, false);

    if (themeMedia) {
      var onChange = function () {
        if (Store.getSettings().theme === "system") {
          applyTheme("system", true);
        }
      };
      if (typeof themeMedia.addEventListener === "function") {
        themeMedia.addEventListener("change", onChange);
      } else if (typeof themeMedia.addListener === "function") {
        themeMedia.addListener(onChange);
      }
    }
  }

  /* ------------------------------------------------------------------------
     التنبيهات السريعة
     ------------------------------------------------------------------------ */

  function toast(message, type, duration) {
    var region = document.getElementById("toast-region");
    if (!region) {
      return;
    }
    var kind = type || "info";
    var item = document.createElement("div");
    item.className = "toast toast--" + kind;
    item.setAttribute("role", kind === "danger" ? "alert" : "status");
    var iconName = kind === "success" ? "check-circle" : kind === "danger" ? "alert" : "info";
    item.innerHTML = icon(iconName) + "<span>" + Utils.escapeHTML(message) + "</span>";
    region.appendChild(item);

    window.requestAnimationFrame(function () {
      item.classList.add("is-visible");
    });

    var timeout = typeof duration === "number" ? duration : 3200;
    window.setTimeout(function () {
      item.classList.remove("is-visible");
      window.setTimeout(function () {
        item.remove();
      }, 240);
    }, timeout);
  }

  /* ------------------------------------------------------------------------
     حوار التأكيد
     ------------------------------------------------------------------------ */

  function confirmDialog(options) {
    var opts = options || {};
    var title = opts.title || "هل أنت متأكد؟";
    var message = opts.message || "";
    var confirmLabel = opts.confirmLabel || "تأكيد";
    var cancelLabel = opts.cancelLabel || "إلغاء";
    var danger = Boolean(opts.danger);

    if (typeof HTMLDialogElement === "undefined") {
      return Promise.resolve(window.confirm(title + "\n\n" + String(message).replace(/<[^>]*>/g, "")));
    }

    return new Promise(function (resolve) {
      var dialog = document.createElement("dialog");
      dialog.className = "confirm-dialog";
      dialog.setAttribute("aria-labelledby", "confirm-dialog-title");
      dialog.innerHTML =
        '<div class="confirm-dialog__body">' +
          '<div class="confirm-dialog__icon ' + (danger ? "confirm-dialog__icon--danger" : "") + '">' +
            icon(danger ? "alert" : "info") +
          "</div>" +
          '<h2 class="confirm-dialog__title" id="confirm-dialog-title">' + Utils.escapeHTML(title) + "</h2>" +
          '<div class="confirm-dialog__message">' + message + "</div>" +
        "</div>" +
        '<div class="confirm-dialog__actions">' +
          '<button class="btn btn--ghost" type="button" data-cancel>' + Utils.escapeHTML(cancelLabel) + "</button>" +
          '<button class="btn ' + (danger ? "btn--danger" : "btn--primary") + '" type="button" data-confirm>' + Utils.escapeHTML(confirmLabel) + "</button>" +
        "</div>";

      var settled = false;

      function finish(value) {
        if (settled) {
          return;
        }
        settled = true;
        if (dialog.open) {
          dialog.close();
        }
        dialog.remove();
        resolve(value);
      }

      dialog.querySelector("[data-cancel]").addEventListener("click", function () {
        finish(false);
      });

      dialog.querySelector("[data-confirm]").addEventListener("click", function () {
        finish(true);
      });

      dialog.addEventListener("cancel", function (event) {
        event.preventDefault();
        finish(false);
      });

      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) {
          finish(false);
        }
      });

      document.body.appendChild(dialog);
      dialog.showModal();

      var focusTarget = dialog.querySelector(danger ? "[data-cancel]" : "[data-confirm]");
      if (focusTarget) {
        window.setTimeout(function () { focusTarget.focus(); }, 0);
      }
    });
  }

  /* ------------------------------------------------------------------------
     مكوّنات HTML مساعدة
     ------------------------------------------------------------------------ */

  function pageHead(options) {
    var opts = options || {};
    var eyebrow = opts.eyebrow
      ? '<span class="page-head__eyebrow">' + (opts.eyebrowIcon ? icon(opts.eyebrowIcon) : "") + Utils.escapeHTML(opts.eyebrow) + "</span>"
      : "";
    var desc = opts.description ? '<p class="page-head__desc">' + Utils.escapeHTML(opts.description) + "</p>" : "";
    var actions = opts.actions ? '<div class="page-head__actions">' + opts.actions + "</div>" : "";
    return '<header class="page-head">' +
      '<div class="page-head__text">' +
        eyebrow +
        "<h1>" + Utils.escapeHTML(opts.title || "") + "</h1>" +
        desc +
      "</div>" +
      actions +
    "</header>";
  }

  function emptyState(options) {
    var opts = options || {};
    return '<div class="empty-state">' +
      '<div class="empty-state__icon">' + icon(opts.icon || "info") + "</div>" +
      "<h2>" + Utils.escapeHTML(opts.title || "") + "</h2>" +
      "<p>" + Utils.escapeHTML(opts.description || "") + "</p>" +
      (opts.action || "") +
    "</div>";
  }

  function placeholder(options) {
    var opts = options || {};
    var actions = opts.actions || (
      '<a class="btn btn--primary" href="#/">' + icon("home") + " العودة للرئيسية</a>" +
      '<a class="btn btn--ghost" href="#/dashboard">' + icon("chart") + " لوحة التقدم</a>"
    );
    return '<div class="placeholder-page">' +
      '<div class="placeholder-card">' +
        '<span class="badge badge--gold">' + Utils.escapeHTML(opts.badge || "قيد الإعداد") + "</span>" +
        '<div class="placeholder-card__icon">' + icon(opts.icon || "sparkles") + "</div>" +
        "<h1>" + Utils.escapeHTML(opts.title || "هذه الصفحة قيد الإعداد") + "</h1>" +
        "<p>" + Utils.escapeHTML(opts.description || "ستُضاف هذه المرحلة في تسليم قادم من خطة المنصة.") + "</p>" +
        '<div class="placeholder-card__actions">' + actions + "</div>" +
        (opts.note ? '<p class="placeholder-card__meta">' + Utils.escapeHTML(opts.note) + "</p>" : "") +
      "</div>" +
    "</div>";
  }

  function progressBar(value, options) {
    var opts = options || {};
    var percent = Utils.clamp(value, 0, 100);
    var classes = "progress" + (opts.small ? " progress--sm" : "") + (opts.thick ? " progress--thick" : "");
    var label = opts.label
      ? '<div class="progress__meta"><span>' + Utils.escapeHTML(opts.label) + "</span><strong>" + Utils.formatPercent(percent) + "</strong></div>"
      : "";
    return label + '<div class="' + classes + '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(percent) + '" aria-label="' + Utils.escapeAttr(opts.ariaLabel || "نسبة التقدم") + '"><div class="progress__bar" style="--value:' + percent + '%"></div></div>';
  }

  function levelDots(levels) {
    var list = Array.isArray(levels) ? levels : [];
    return '<span class="level-dots" aria-label="تقدم المستويات">' +
      [1, 2, 3, 4, 5].map(function (number) {
        var item = list.find(function (level) { return Number(level.number) === number; });
        return '<span class="' + (item && item.passed ? "is-done" : "") + '"></span>';
      }).join("") +
    "</span>";
  }

  /* ------------------------------------------------------------------------
     تثبيت التطبيق
     ------------------------------------------------------------------------ */

  var installPrompt = null;

  function initInstall() {
    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      installPrompt = event;
      document.dispatchEvent(new CustomEvent("nahw:installchange"));
    });

    window.addEventListener("appinstalled", function () {
      installPrompt = null;
      document.dispatchEvent(new CustomEvent("nahw:installchange"));
      toast("تم تثبيت تطبيق نَحْو على جهازك.", "success");
    });
  }

  function canInstall() {
    return Boolean(installPrompt);
  }

  function isInstalled() {
    return Utils.isStandalone();
  }

  function promptInstall() {
    if (!installPrompt) {
      return Promise.resolve(false);
    }
    var prompt = installPrompt;
    installPrompt = null;
    return prompt.prompt().then(function () {
      return prompt.userChoice.then(function (choice) {
        document.dispatchEvent(new CustomEvent("nahw:installchange"));
        return choice && choice.outcome === "accepted";
      });
    }).catch(function () {
      document.dispatchEvent(new CustomEvent("nahw:installchange"));
      return false;
    });
  }

  function installHint() {
    if (isInstalled()) {
      return "التطبيق مثبت ويعمل من الشاشة الرئيسية.";
    }
    if (canInstall()) {
      return "ثبّت المنصة على جهازك للوصول السريع دون إنترنت.";
    }
    if (window.location.protocol === "file:") {
      return "لتثبيت التطبيق، افتح المنصة عبر serve.py أو استضافة ثابتة.";
    }
    if (!("serviceWorker" in navigator)) {
      return "متصفحك لا يدعم تثبيت تطبيقات الويب.";
    }
    return "قد يظهر خيار التثبيت بعد استخدام المنصة قليلًا في المتصفح.";
  }

  /* ------------------------------------------------------------------------
     التهيئة
     ------------------------------------------------------------------------ */

  function init() {
    hydrateIcons(document);
    initTheme();

    var toggle = document.getElementById("theme-toggle");
    if (toggle) {
      toggle.addEventListener("click", toggleTheme);
    }

    initInstall();
  }

  Nahw.ui = {
    icons: ICONS,
    icon: icon,
    hydrateIcons: hydrateIcons,
    levelClass: levelClass,
    levelBadge: levelBadge,
    sectionIcon: sectionIcon,
    resolveTheme: resolveTheme,
    applyTheme: applyTheme,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    initTheme: initTheme,
    toast: toast,
    confirm: confirmDialog,
    pageHead: pageHead,
    emptyState: emptyState,
    placeholder: placeholder,
    progressBar: progressBar,
    levelDots: levelDots,
    canInstall: canInstall,
    isInstalled: isInstalled,
    promptInstall: promptInstall,
    installHint: installHint,
    init: init
  };
})();
