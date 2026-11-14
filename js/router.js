/* ==========================================================================
   نَحْو — الراوتر
   التنقل عبر hash ليعمل مع file:// دون خادم.
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;
  var UI = Nahw.ui;

  var routes = [
    { pattern: /^\/$/, screen: "home", keys: [], nav: "home" },
    { pattern: /^\/lesson\/(\d+)\/?$/, screen: "lesson", keys: ["lessonId"], nav: "home" },
    { pattern: /^\/lesson\/(\d+)\/levels\/?$/, screen: "levels", keys: ["lessonId"], nav: "home" },
    { pattern: /^\/lesson\/(\d+)\/levels\/([1-5])\/?$/, screen: "practice", keys: ["lessonId", "level"], nav: "home" },
    { pattern: /^\/result\/(\d+)\/([1-5])\/?$/, screen: "result", keys: ["lessonId", "level"], nav: "home" },
    { pattern: /^\/dashboard\/?$/, screen: "dashboard", keys: [], nav: "dashboard" },
    { pattern: /^\/mistakes\/?$/, screen: "mistakes", keys: [], nav: "mistakes" },
    { pattern: /^\/exam\/?$/, screen: "exam", keys: [], nav: "exam" },
    { pattern: /^\/settings\/?$/, screen: "settings", keys: [], nav: "settings" }
  ];

  var current = null;
  var initialized = false;
  var renderToken = 0;

  function parseHash() {
    var raw = window.location.hash ? window.location.hash.slice(1) : "/";
    if (!raw) {
      raw = "/";
    }
    var queryIndex = raw.indexOf("?");
    var path = queryIndex === -1 ? raw : raw.slice(0, queryIndex);
    var search = queryIndex === -1 ? "" : raw.slice(queryIndex + 1);
    if (path.charAt(0) !== "/") {
      path = "/" + path;
    }
    if (path.length > 1) {
      path = path.replace(/\/+$/, "");
    }
    return {
      path: path,
      query: Utils.queryParams(search)
    };
  }

  function matchRoute(path) {
    for (var index = 0; index < routes.length; index += 1) {
      var route = routes[index];
      var match = route.pattern.exec(path);
      if (match) {
        var params = {};
        route.keys.forEach(function (key, position) {
          var value = match[position + 1];
          try {
            params[key] = decodeURIComponent(value);
          } catch (error) {
            params[key] = value;
          }
        });
        return { route: route, params: params };
      }
    }
    return null;
  }

  function updateNav(nav) {
    var activeNames = Array.isArray(nav) ? nav : [nav];
    document.querySelectorAll("[data-nav]").forEach(function (link) {
      var name = link.getAttribute("data-nav");
      var isActive = activeNames.indexOf(name) !== -1;
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function setTitle(title) {
    document.title = title ? title + " · " + Nahw.constants.appName : Nahw.constants.appTitle;
  }

  function announce(title) {
    var announcer = document.getElementById("route-announcer");
    if (announcer) {
      announcer.textContent = title || "";
    }
  }

  function showFallback(options) {
    var main = document.getElementById("main");
    if (!main) {
      return;
    }
    main.setAttribute("aria-busy", "false");
    main.innerHTML = '<div class="page container">' + UI.placeholder(options) + "</div>";
    var title = options.title || "تعذّر عرض الصفحة";
    setTitle(title);
    announce(title);
    updateNav(null);
    document.body.dataset.screen = "error";
    main.focus({ preventScroll: true });
  }

  function render() {
    var main = document.getElementById("main");
    if (!main) {
      return;
    }

    var parsed = parseHash();
    var matched = matchRoute(parsed.path);
    var token = ++renderToken;

    if (!matched) {
      current = null;
      showFallback({
        badge: "صفحة غير موجودة",
        icon: "compass",
        title: "لم نجد هذه الصفحة",
        description: "قد يكون الرابط قديمًا أو غير مكتمل. يمكنك العودة إلى الصفحة الرئيسية ومتابعة رحلتك.",
        note: "رمز المسار: " + parsed.path,
        actions:
          '<a class="btn btn--primary" href="#/">' + UI.icon("home") + " العودة للرئيسية</a>" +
          '<a class="btn btn--ghost" href="#/dashboard">' + UI.icon("chart") + " لوحة التقدم</a>"
      });
      return;
    }

    var screenName = matched.route.screen;
    var screen = Nahw.screens && Nahw.screens[screenName];
    if (!screen || typeof screen.render !== "function") {
      showFallback({
        badge: "خطأ في العرض",
        icon: "alert",
        title: "تعذّر تحميل هذه الشاشة",
        description: "لم تُسجّل شاشة «" + screenName + "» في التطبيق. أعد تحميل الصفحة، فإن استمرت المشكلة فراجع ملفات جافاسكربت.",
        note: "المسار: " + parsed.path
      });
      return;
    }

    if (current && current.screen && typeof current.screen.destroy === "function") {
      try {
        current.screen.destroy();
      } catch (error) {
        /* لا نُفشل الانتقال بسبب تنظيف شاشة سابقة */
      }
    }

    var context = {
      path: parsed.path,
      params: matched.params,
      query: parsed.query,
      route: matched.route
    };

    var html;
    try {
      html = screen.render(context);
    } catch (error) {
      showFallback({
        badge: "خطأ في العرض",
        icon: "alert",
        title: "حدث خطأ أثناء تجهيز الصفحة",
        description: "أعد تحميل الصفحة للمحاولة مرة أخرى.",
        note: "المسار: " + parsed.path
      });
      return;
    }

    main.innerHTML = html;
    main.setAttribute("aria-busy", "false");
    UI.hydrateIcons(main);

    var title = typeof screen.title === "function" ? screen.title(context) : screen.title;
    setTitle(title);
    announce(title);
    updateNav(screen.nav || matched.route.nav);
    document.body.dataset.screen = screenName;

    current = {
      screen: screen,
      screenName: screenName,
      params: matched.params,
      query: parsed.query,
      path: parsed.path
    };

    try {
      var mountResult = screen.mount ? screen.mount(main, context) : null;
      if (mountResult && typeof mountResult.then === "function") {
        mountResult.catch(function () {
          if (token === renderToken) {
            showFallback({
              badge: "خطأ في التشغيل",
              icon: "alert",
              title: "تعذّر تشغيل الصفحة",
              description: "أعد تحميل الصفحة للمحاولة مرة أخرى.",
              note: "المسار: " + parsed.path
            });
          }
        });
      }
    } catch (error) {
      showFallback({
        badge: "خطأ في التشغيل",
        icon: "alert",
        title: "تعذّر تشغيل الصفحة",
        description: "أعد تحميل الصفحة للمحاولة مرة أخرى.",
        note: "المسار: " + parsed.path
      });
      return;
    }

    if (token !== renderToken) {
      return;
    }

    Utils.scrollToTop();
    try {
      main.focus({ preventScroll: true });
    } catch (error) {
      main.focus();
    }
  }

  function navigate(path, replace) {
    var target = String(path || "/").replace(/^#/, "");
    if (target.charAt(0) !== "/") {
      target = "/" + target;
    }
    var hash = "#" + target;
    if (window.location.hash === hash) {
      render();
      return;
    }
    if (replace) {
      window.location.replace(hash);
    } else {
      window.location.hash = hash;
    }
  }

  function refresh() {
    render();
  }

  function init() {
    if (initialized) {
      render();
      return;
    }
    initialized = true;
    window.addEventListener("hashchange", render);
    render();
  }

  Nahw.router = {
    init: init,
    render: render,
    refresh: refresh,
    navigate: navigate,
    parseHash: parseHash,
    get current() {
      return current;
    }
  };
})();
