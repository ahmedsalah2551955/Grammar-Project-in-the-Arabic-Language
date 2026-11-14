/* ==========================================================================
   نَحْو — تشغيل التطبيق
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = window.Nahw;
  var UI = Nahw.ui;
  var Router = Nahw.router;

  var started = false;

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    if (window.location.protocol !== "http:" && window.location.protocol !== "https:") {
      return;
    }
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () {
        /* التطبيق يظل يعمل دون تسجيل عامل الخدمة */
      });
    }, { once: true });
  }

  function initScrollState() {
    var topbar = document.querySelector(".topbar");
    if (!topbar) {
      return;
    }
    var update = function () {
      topbar.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function boot() {
    if (started) {
      return;
    }
    started = true;

    document.documentElement.classList.add("js");
    UI.init();
    initScrollState();
    registerServiceWorker();

    /* تُحمَّل بيانات الدروس قبل بدء الراوتر، فتُعرَض صفحات الدروس كاملةً من أول فتح. */
    var lessonsReady = Nahw.dataLoader && typeof Nahw.dataLoader.loadLessons === "function"
      ? Nahw.dataLoader.loadLessons()
      : Promise.resolve();

    lessonsReady.then(startRouter, startRouter);
  }

  function startRouter() {
    Router.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
