/* ==========================================================================
   الإعدادات
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;
  var UI = Nahw.ui;
  var Store = Nahw.store;
  var C = Nahw.constants;

  var teardown = null;

  function radioTheme(value, current, iconName, label) {
    return '<label class="segmented__option">' +
      '<input type="radio" name="theme" value="' + value + '"' + (current === value ? " checked" : "") + ">" +
      '<span class="segmented__label">' + UI.icon(iconName) + " " + Utils.escapeHTML(label) + "</span>" +
    "</label>";
  }

  function selected(value, current) {
    return String(value) === String(current) ? " selected" : "";
  }

  function versionLabel() {
    return Utils.toArabicDigits(C.version.replace(/\./g, "٫"));
  }

  function render() {
    var settings = Store.getSettings();
    var installed = UI.isInstalled();
    var canInstall = UI.canInstall();

    return '<div class="page container narrow">' +
      UI.pageHead({
        eyebrow: "التخصيص",
        eyebrowIcon: "settings",
        title: "الإعدادات",
        description: "اضبط المظهر وجلسة التدريب والاختبار. كل الإعدادات تُحفظ محليًا على جهازك."
      }) +

      (!Store.persistent
        ? '<div class="alert alert--warning settings-note">' + UI.icon("alert") +
          "<span>التخزين المحلي غير متاح في هذا المتصفح، لذلك لن تُحفظ الإعدادات أو التقدم بعد إغلاق الصفحة.</span></div>"
        : "") +

      '<div class="settings-stack">' +

        '<section class="setting-group" aria-labelledby="appearance-title">' +
          '<div class="setting-group__head">' +
            '<span class="icon-tile">' + UI.icon("palette") + "</span>" +
            "<div><h2 id=\"appearance-title\">المظهر</h2><p>اختر الوضع المريح لعينيك، أو اتبع إعداد النظام.</p></div>" +
          "</div>" +
          '<div class="setting-row">' +
            '<div class="setting-row__text">' +
              '<span class="setting-row__title" id="theme-label">' + UI.icon("sun") + " وضع العرض</span>" +
              '<p class="setting-row__desc">الوضع الليلي مثالي للمراجعة في الإضاءة المنخفضة، ويمكن اتباع إعداد جهازك تلقائيًا.</p>' +
            "</div>" +
            '<fieldset class="segmented setting-row__control" aria-labelledby="theme-label">' +
              radioTheme("light", settings.theme, "sun", "نهاري") +
              radioTheme("dark", settings.theme, "moon", "ليلي") +
              radioTheme("system", settings.theme, "monitor", "حسب النظام") +
            "</fieldset>" +
          "</div>" +
        "</section>" +

        '<section class="setting-group" aria-labelledby="learning-title">' +
          '<div class="setting-group__head">' +
            '<span class="icon-tile icon-tile--gold">' + UI.icon("book-open") + "</span>" +
            "<div><h2 id=\"learning-title\">التعلّم والتدريب</h2><p>خيارات تخص رحلة التدريب وفتح المستويات.</p></div>" +
          "</div>" +

          '<div class="setting-row">' +
            '<div class="setting-row__text">' +
              '<span class="setting-row__title">' + UI.icon("lock") + " فتح كل المستويات</span>" +
              '<p class="setting-row__desc">يتيح الدخول إلى أي مستوى للتدريب الحر. لا يمنح نجاحًا أو نجومًا، ولا يغيّر شروط الإتقان.</p>' +
            "</div>" +
            '<div class="setting-row__control">' +
              '<label class="switch">' +
                '<input type="checkbox" id="open-all-levels" aria-label="فتح كل المستويات"' + (settings.openAllLevels ? " checked" : "") + ">" +
              "</label>" +
            "</div>" +
          "</div>" +

          '<div class="setting-row">' +
            '<div class="setting-row__text">' +
              '<span class="setting-row__title">' + UI.icon("layers") + " حجم جلسة التدريب</span>" +
              '<p class="setting-row__desc">عدد القطع في الجلسة الواحدة. القيمة الافتراضية خمس قطع.</p>' +
            "</div>" +
            '<div class="setting-row__control">' +
              '<div class="select"><select id="session-size" aria-label="حجم جلسة التدريب">' +
                '<option value="3"' + selected(3, settings.sessionSize) + ">٣ قطع</option>" +
                '<option value="5"' + selected(5, settings.sessionSize) + ">٥ قطع</option>" +
                '<option value="10"' + selected(10, settings.sessionSize) + ">١٠ قطع</option>" +
              "</select><span class=\"select__icon\">" + UI.icon("chevron-down") + "</span></div>" +
            "</div>" +
          "</div>" +

          '<div class="setting-row">' +
            '<div class="setting-row__text">' +
              '<span class="setting-row__title">' + UI.icon("clock") + " مؤقت الاختبار الافتراضي</span>" +
              '<p class="setting-row__desc">المدة التي يبدأ بها الاختبار المختلط. يمكن تغييرها قبل كل اختبار.</p>' +
            "</div>" +
            '<div class="setting-row__control">' +
              '<div class="select"><select id="exam-timer" aria-label="مؤقت الاختبار الافتراضي">' +
                '<option value="none"' + selected("none", settings.examTimer) + ">بدون مؤقت</option>" +
                '<option value="10"' + selected("10", settings.examTimer) + ">١٠ دقائق</option>" +
                '<option value="20"' + selected("20", settings.examTimer) + ">٢٠ دقيقة</option>" +
                '<option value="30"' + selected("30", settings.examTimer) + ">٣٠ دقيقة</option>" +
              "</select><span class=\"select__icon\">" + UI.icon("chevron-down") + "</span></div>" +
            "</div>" +
          "</div>" +
        "</section>" +

        '<section class="setting-group" aria-labelledby="app-title-settings">' +
          '<div class="setting-group__head">' +
            '<span class="icon-tile">' + UI.icon("download") + "</span>" +
            "<div><h2 id=\"app-title-settings\">التطبيق</h2><p>ثبّت نَحْو على الشاشة الرئيسية للوصول السريع.</p></div>" +
          "</div>" +
          '<div class="setting-row">' +
            '<div class="setting-row__text">' +
              '<span class="setting-row__title">' + UI.icon("shield") + " تثبيت التطبيق</span>" +
              '<p class="setting-row__desc" data-install-hint>' + Utils.escapeHTML(UI.installHint()) + "</p>" +
            "</div>" +
            '<div class="setting-row__control">' +
              (installed
                ? '<span class="badge badge--success">' + UI.icon("check-circle") + " مثبّت</span>"
                : '<button class="btn btn--secondary btn--sm" type="button" data-install' + (canInstall ? "" : " disabled") + ">" + UI.icon("download") + " تثبيت التطبيق</button>") +
            "</div>" +
          "</div>" +
          '<div class="setting-row">' +
            '<div class="setting-row__text">' +
              '<span class="setting-row__title">' + UI.icon("wifi-off") + " العمل دون إنترنت</span>" +
              '<p class="setting-row__desc">بعد أول فتح عبر خادم محلي أو استضافة، يخزّن التطبيق ملفاته ليعمل دون اتصال.</p>' +
            "</div>" +
            '<div class="setting-row__control"><span class="badge badge--primary">يعمل دون اتصال</span></div>' +
          "</div>" +
        "</section>" +

        '<section class="setting-group" aria-labelledby="data-title">' +
          '<div class="setting-group__head">' +
            '<span class="icon-tile icon-tile--danger">' + UI.icon("shield") + "</span>" +
            "<div><h2 id=\"data-title\">البيانات والتقدم</h2><p>تقدمك محفوظ على هذا الجهاز فقط، ولا يُرسل إلى خادم.</p></div>" +
          "</div>" +
          '<div class="setting-row">' +
            '<div class="setting-row__text">' +
              '<span class="setting-row__title">' + UI.icon("check-circle") + " حالة التخزين</span>" +
              '<p class="setting-row__desc">' + (Store.persistent ? "التخزين المحلي متاح، وسيُحفظ تقدمك تلقائيًا." : "التخزين المحلي غير متاح في هذا السياق.") + "</p>" +
            "</div>" +
            '<div class="setting-row__control">' +
              '<span class="badge ' + (Store.persistent ? "badge--success" : "badge--warning") + '">' + (Store.persistent ? "محفوظ محليًا" : "غير متاح") + "</span>" +
            "</div>" +
          "</div>" +
          '<div class="setting-row">' +
            '<div class="setting-row__text">' +
              '<span class="setting-row__title">' + UI.icon("trash") + " مسح التقدم</span>" +
              '<p class="setting-row__desc">يحذف النتائج والنجوم والأخطاء والسلسلة والقطع المحلولة. تبقى إعدادات المظهر والجلسة.</p>' +
            "</div>" +
            '<div class="setting-row__control">' +
              '<button class="btn btn--danger btn--sm" type="button" id="reset-progress">' + UI.icon("trash") + " مسح التقدم</button>" +
            "</div>" +
          "</div>" +
        "</section>" +

        '<section class="setting-group" aria-labelledby="about-title">' +
          '<div class="setting-group__head">' +
            '<span class="icon-tile icon-tile--gold">' + UI.icon("graduation") + "</span>" +
            "<div><h2 id=\"about-title\">عن التطبيق</h2><p>منصة نحو لطلاب الصف الثالث الإعدادي.</p></div>" +
          "</div>" +
          '<div class="setting-row setting-row--stack">' +
            '<div class="about-list">' +
              '<div class="about-list__row"><span>الإصدار</span><span>' + versionLabel() + " · الحزمة الخامسة</span></div>" +
              '<div class="about-list__row"><span>الواجهة</span><span>عربية بالكامل · من اليمين إلى اليسار</span></div>' +
              '<div class="about-list__row"><span>الخطوط</span><span>Cairo للواجهة · Amiri للنصوص</span></div>' +
              '<div class="about-list__row"><span>التشغيل</span><span>صفحات وتنسيقات وسكربتات دون مكتبات خارجية</span></div>' +
              '<div class="about-list__row"><span>البيانات</span><span>٥٣ درسًا · ٥ دروس كاملة المحتوى · ١٥ قطعة تدريب</span></div>' +
            "</div>" +
            '<div class="font-license">' +
              "خطا Cairo وAmiri مرخّصان بموجب رخصة SIL Open Font License 1.1، وتُحمّل ملفاتهما محليًا. " +
              '<a href="assets/fonts/OFL.txt" target="_blank" rel="noopener">اقرأ نص الرخصة</a>.' +
            "</div>" +
          "</div>" +
        "</section>" +

      "</div>" +

      '<p class="settings-footer">صُنعت هذه المنصة بعناية لطلاب الصف الثالث الإعدادي. <span class="heart">♥</span></p>' +
    "</div>";
  }

  function mount(root) {
    var themeRadios = Array.prototype.slice.call(root.querySelectorAll('input[name="theme"]'));
    var openAll = root.querySelector("#open-all-levels");
    var sessionSize = root.querySelector("#session-size");
    var examTimer = root.querySelector("#exam-timer");
    var resetButton = root.querySelector("#reset-progress");
    var installButton = root.querySelector("[data-install]");
    var installHint = root.querySelector("[data-install-hint]");

    function syncTheme(event) {
      var theme = event && event.detail ? event.detail.theme : Store.getSettings().theme;
      themeRadios.forEach(function (radio) {
        radio.checked = radio.value === theme;
      });
    }

    function syncInstall() {
      if (installHint) {
        installHint.textContent = UI.installHint();
      }
      if (!installButton) {
        return;
      }
      if (UI.isInstalled()) {
        installButton.hidden = true;
        return;
      }
      installButton.hidden = false;
      installButton.disabled = !UI.canInstall();
    }

    function onThemeChange(event) {
      if (!event.target.matches('input[name="theme"]')) {
        return;
      }
      UI.setTheme(event.target.value);
      UI.toast("تم تحديث مظهر المنصة.", "success", 2200);
    }

    function onOpenAllChange() {
      Store.updateSettings({ openAllLevels: openAll.checked });
      UI.toast(openAll.checked ? "تم فتح كل المستويات للتدريب الحر." : "تم الرجوع إلى شروط الفتح المعتادة.", "success", 2600);
    }

    function onSessionChange() {
      Store.updateSettings({ sessionSize: Number(sessionSize.value) });
      UI.toast("حجم جلسة التدريب الآن " + Utils.formatNumber(sessionSize.value) + " " + Utils.passageWord(Number(sessionSize.value)) + ".", "success", 2400);
    }

    function onTimerChange() {
      Store.updateSettings({ examTimer: examTimer.value });
      UI.toast("تم تحديث المؤقت الافتراضي للاختبار.", "success", 2400);
    }

    function onReset() {
      UI.confirm({
        title: "مسح كل التقدم؟",
        message: "سيتم حذف النتائج والنجوم والأخطاء والسلسلة والقطع المحلولة من هذا الجهاز. لا يمكن التراجع عن هذه الخطوة، لكن إعدادات المظهر والجلسة ستبقى كما هي.",
        confirmLabel: "امسح التقدم",
        cancelLabel: "احتفظ بتقدمي",
        danger: true
      }).then(function (confirmed) {
        if (!confirmed) {
          return;
        }
        Store.resetProgress();
        UI.toast("تم مسح التقدم من هذا الجهاز.", "success");
      });
    }

    function onInstall() {
      UI.promptInstall().then(function (accepted) {
        if (accepted) {
          UI.toast("تم بدء تثبيت التطبيق.", "success");
        }
        syncInstall();
      });
    }

    if (themeRadios.length) {
      themeRadios.forEach(function (radio) {
        radio.addEventListener("change", onThemeChange);
      });
    }
    if (openAll) {
      openAll.addEventListener("change", onOpenAllChange);
    }
    if (sessionSize) {
      sessionSize.addEventListener("change", onSessionChange);
    }
    if (examTimer) {
      examTimer.addEventListener("change", onTimerChange);
    }
    if (resetButton) {
      resetButton.addEventListener("click", onReset);
    }
    if (installButton) {
      installButton.addEventListener("click", onInstall);
    }

    document.addEventListener("nahw:themechange", syncTheme);
    document.addEventListener("nahw:installchange", syncInstall);

    teardown = function () {
      themeRadios.forEach(function (radio) {
        radio.removeEventListener("change", onThemeChange);
      });
      if (openAll) {
        openAll.removeEventListener("change", onOpenAllChange);
      }
      if (sessionSize) {
        sessionSize.removeEventListener("change", onSessionChange);
      }
      if (examTimer) {
        examTimer.removeEventListener("change", onTimerChange);
      }
      if (resetButton) {
        resetButton.removeEventListener("click", onReset);
      }
      if (installButton) {
        installButton.removeEventListener("click", onInstall);
      }
      document.removeEventListener("nahw:themechange", syncTheme);
      document.removeEventListener("nahw:installchange", syncInstall);
    };
  }

  Nahw.screens = Nahw.screens || {};
  Nahw.screens.settings = {
    title: "الإعدادات",
    nav: "settings",
    render: render,
    mount: mount,
    destroy: function () {
      if (teardown) {
        teardown();
        teardown = null;
      }
    }
  };
})();
