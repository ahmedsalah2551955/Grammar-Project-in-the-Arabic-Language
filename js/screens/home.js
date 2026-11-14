/* ==========================================================================
   الشاشة الرئيسية
   ترحّب بالطالب، وتعرض أرقام المنصة، وخريطة المنهج الـ٥٣ درسًا مقروءة من
   ملف البيانات المولّد (data/lessons.js) عبر data-loader، بأقسام قابلة للطي.
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;
  var UI = Nahw.ui;
  var C = Nahw.constants;
  var Data = Nahw.dataLoader;
  var Store = Nahw.store;
  var Progress = Nahw.progress;

  /* حالة طيّ الأقسام تُحفظ في الجلسة الحالية فقط، ويبدأ القسم الأول مفتوحًا. */
  var collapsed = null;

  function ensureCollapseState(sections) {
    if (collapsed) {
      return;
    }
    collapsed = {};
    sections.forEach(function (section, index) {
      collapsed[section.id] = index > 0;
    });
  }

  /* قراءة تقدم المستويات من التخزين مباشرة دون إنشاء سجلات جديدة. */
  function storedLevels(lessonId) {
    var lesson = Store.getState().lessons[String(lessonId)];
    return lesson && lesson.levels ? lesson.levels : {};
  }

  function levelDotsFor(lessonId) {
    var levels = storedLevels(lessonId);
    var dots = [1, 2, 3, 4, 5].map(function (number) {
      var level = levels[String(number)];
      return { number: number, passed: Boolean(level && level.passed) };
    });
    return UI.levelDots(dots);
  }

  function lessonStatus(lesson) {
    if (!lesson.ready) {
      return { label: "قيد الإعداد", cls: "badge--outline badge--dot" };
    }
    var levels = storedLevels(lesson.id);
    var started = Object.keys(levels).some(function (key) {
      var level = levels[key];
      return level && (Number(level.attempts) > 0 || Boolean(level.passed));
    });
    var five = levels["5"];
    var mastered = Boolean(five && five.passed && Number(five.bestScore) >= 80);
    if (mastered) {
      return { label: "متقن", cls: "badge--success" };
    }
    if (started) {
      return { label: "قيد التقدم", cls: "badge--warning" };
    }
    return { label: "متاح", cls: "badge--primary" };
  }

  function lessonRow(lesson) {
    var status = lessonStatus(lesson);
    var inner =
      '<span class="curriculum-lesson__number">الدرس ' + Utils.formatNumber(lesson.id) + "</span>" +
      '<span class="curriculum-lesson__text"><strong>' + Utils.escapeHTML(lesson.title) + "</strong>" + levelDotsFor(lesson.id) + "</span>" +
      '<span class="badge ' + status.cls + '">' + status.label + "</span>";

    if (lesson.ready) {
      return '<a class="curriculum-lesson card-link" href="#/lesson/' + lesson.id + '" aria-label="افتح الدرس ' + Utils.formatNumber(lesson.id) + ": " + Utils.escapeHTML(lesson.title) + '">' + inner + "</a>";
    }
    return '<div class="curriculum-lesson is-pending">' + inner + "</div>";
  }

  function curriculumSection(section, lessons) {
    var items = lessons.filter(function (lesson) {
      return lesson.section === section.id;
    });
    var readyCount = items.filter(function (lesson) {
      return lesson.ready;
    }).length;
    var isOpen = !collapsed[section.id];
    var panelId = "curriculum-panel-" + section.id;
    var countBadge = readyCount
      ? '<span class="badge badge--primary">' + Utils.formatNumber(readyCount) + " من " + Utils.formatNumber(items.length) + " جاهزة</span>"
      : '<span class="badge badge--outline badge--dot">قيد الإعداد</span>';

    return '<section class="cur-section card" aria-labelledby="' + panelId + '-title">' +
      '<h3 class="cur-section__head" id="' + panelId + '-title">' +
        '<button class="cur-section__toggle" type="button" data-section-toggle="' + section.id + '"' +
          ' aria-expanded="' + (isOpen ? "true" : "false") + '" aria-controls="' + panelId + '"' +
          ' aria-label="قسم ' + Utils.escapeHTML(section.title) + " — الدروس " + section.range + '">' +
          '<span class="icon-tile icon-tile--sm" aria-hidden="true">' + UI.icon(section.icon) + "</span>" +
          '<span class="cur-section__title">' + Utils.escapeHTML(section.title) + "</span>" +
          '<span class="cur-section__range">الدروس ' + section.range + "</span>" +
          countBadge +
          '<span class="cur-section__chevron" aria-hidden="true">' + UI.icon("chevron-down") + "</span>" +
        "</button>" +
      "</h3>" +
      '<div class="cur-section__panel" id="' + panelId + '"' + (isOpen ? "" : " hidden") + ">" +
        '<div class="curriculum-lessons">' + items.map(lessonRow).join("") + "</div>" +
      "</div>" +
    "</section>";
  }

  function totalsFrom(lessons) {
    return lessons.reduce(function (totals, lesson) {
      totals.passages += Number(lesson.passageCount) || 0;
      totals.questions += Number(lesson.questionCount) || 0;
      return totals;
    }, { passages: 0, questions: 0 });
  }

  function updateStatNumbers(root, totals) {
    root.querySelectorAll("[data-stat]").forEach(function (element) {
      var key = element.getAttribute("data-stat");
      if (key === "passages" || key === "questions") {
        element.textContent = Utils.formatNumber(totals[key]);
      }
    });
  }

  function wireSectionToggles(scope) {
    scope.querySelectorAll("[data-section-toggle]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-section-toggle");
        var isOpen = button.getAttribute("aria-expanded") !== "false";
        collapsed[id] = isOpen;
        button.setAttribute("aria-expanded", isOpen ? "false" : "true");
        var panel = document.getElementById("curriculum-panel-" + id);
        if (panel) {
          if (isOpen) {
            panel.setAttribute("hidden", "");
          } else {
            panel.removeAttribute("hidden");
          }
        }
      });
    });
  }

  function showCurriculumMessage(container, options) {
    container.setAttribute("aria-busy", "false");
    container.innerHTML = UI.emptyState(options);
  }

  function fillCurriculum(root, container, lessons) {
    var sections = Data.getSections();
    ensureCollapseState(sections);
    container.setAttribute("aria-busy", "false");
    container.innerHTML = sections.map(function (section) {
      return curriculumSection(section, lessons);
    }).join("");
    wireSectionToggles(container);
    updateStatNumbers(root, totalsFrom(lessons));
  }

  function homeProgressHtml() {
    var ready = Data.getReadyLessons();
    var stats = Progress.getStats(ready);
    var target = Progress.getContinueTarget();
    var doneDays = Progress.getDoneDays();
    var days = Utils.getWeekDays(7);

    var daysHtml = days.map(function (day) {
      var isDone = Boolean(doneDays[day.key]);
      var inner = isDone ? UI.icon("check") : (day.isToday ? UI.icon("flame") : "");
      return '<div class="week-day ' + (day.isToday ? "is-today " : "") + (isDone ? "is-done" : "") + '">' +
        '<span class="week-day__dot">' + inner + "</span>" +
        "<span>" + Utils.escapeHTML(day.weekday) + "</span>" +
      "</div>";
    }).join("");

    var summary = stats.readyLessons
      ? Progress.lessonStatusPhrase(stats.readyLessons, "ready", "جاهزة") + "، و" +
        Progress.lessonStatusPhrase(stats.masteredLessons, "mastered") + "."
      : "تُضاف بيانات الدروس في الحزمة القادمة، فتبدأ النسبة من الصفر.";

    var continueLabel = target.lastAt
      ? "متابعة التدريب"
      : "ابدأ التدريب";

    return '<section class="home-progress" aria-label="تقدّمك">' +
      '<div class="card home-progress__streak">' +
        '<div class="home-progress__head">' +
          '<span class="icon-tile icon-tile--gold">' + UI.icon("flame") + "</span>" +
          "<div><h2>سلسلة الأيام</h2>" +
            "<p>" + Progress.streakPhrase(stats.streakCurrent) + " · " + Progress.bestStreakPhrase(stats.streakBest) + "</p></div>" +
          '<span class="badge badge--gold">' + Utils.formatNumber(stats.streakCurrent) + " يوم</span>" +
        "</div>" +
        '<div class="week-grid">' + daysHtml + "</div>" +
      "</div>" +

      '<div class="card home-progress__overall">' +
        "<h2>شريط التقدم العام</h2>" +
        "<p>" + summary + "</p>" +
        UI.progressBar(stats.overallPercent, { ariaLabel: "نسبة التقدم الإجمالية" }) +
        '<div class="home-progress__actions">' +
          '<a class="btn btn--primary" href="#/lesson/' + target.lessonId + "/levels/" + target.level + '">' +
            UI.icon("play") + " " + continueLabel + "</a>" +
          '<a class="btn btn--secondary" href="#/exam">' + UI.icon("clock") + " اختبار سريع</a>" +
          '<a class="btn btn--ghost" href="#/dashboard">' + UI.icon("chart") + " لوحة التقدم</a>" +
        "</div>" +
      "</div>" +
    "</section>";
  }

  function render() {
    var currentStreak = Store.getState().streak.current;

    return '<div class="page container">' +
      '<section class="hero" aria-labelledby="hero-title">' +
        '<div class="hero__content">' +
          '<span class="hero__eyebrow">' + UI.icon("sparkles") +
            " الحزمة الخامسة · لوحة التقدم والاختبار المختلط جاهزة" +
          "</span>" +
          '<h1 id="hero-title">تعلّم النحو العربي <span class="hero__accent">بخطواتٍ واضحة</span></h1>' +
          '<p class="hero__lead">' +
            "منصة عربية لطلاب الصف الثالث الإعدادي: خريطة منهج من ٥٣ درسًا في تسعة أقسام، وشرح موجز، وتدريب متدرّج من خمسة مستويات، مع متابعة دقيقة لتقدّمك وأخطائك." +
          "</p>" +
          '<div class="hero__actions">' +
            '<a class="btn btn--primary btn--lg" href="#/lesson/1/levels/1">' +
              UI.icon("play") + " ابدأ التدريب" +
            "</a>" +
            '<a class="btn btn--secondary btn--lg" href="#/exam">' +
              UI.icon("clock") + " اختبر نفسك" +
            "</a>" +
            '<a class="btn btn--ghost btn--lg" href="#/dashboard">' +
              UI.icon("chart") + " لوحة التقدم" +
            "</a>" +
          "</div>" +
          '<ul class="hero__chips" aria-label="مزايا المنصة">' +
            '<li class="chip">' + UI.icon("check") + " واجهة عربية من اليمين إلى اليسار</li>" +
            '<li class="chip">' + UI.icon("wifi-off") + " تعمل دون إنترنت</li>" +
            '<li class="chip">' + UI.icon("shield") + " تقدّمك محفوظ محليًا</li>" +
            '<li class="chip">' + UI.icon("book-open") + " خطوط عربية محلية</li>" +
          "</ul>" +
        "</div>" +

        '<div class="hero__visual" aria-hidden="true">' +
          '<div class="hero__halo"></div>' +
          '<div class="hero__monogram">ن</div>' +
          '<div class="sentence-card">' +
            '<div class="sentence-card__head">' +
              '<span class="badge badge--primary">' + UI.icon("pen") + " إعراب اليوم</span>" +
              UI.levelBadge(1, "مستوى ١") +
            "</div>" +
            '<p class="sentence-card__sentence">الْكِتَابُ جَدِيدٌ.</p>' +
            '<div class="sentence-card__parse">' +
              '<div class="parse-chip"><span class="parse-chip__word">الْكِتَابُ</span><span class="parse-chip__role">مبتدأ</span></div>' +
              '<div class="parse-chip"><span class="parse-chip__word">جَدِيدٌ</span><span class="parse-chip__role">خبر</span></div>' +
            "</div>" +
            '<div class="sentence-card__foot">' + UI.icon("sparkles") + " مثال من الدرس الثاني: علامات الاسم</div>" +
          "</div>" +
          '<span class="floating-chip floating-chip--levels">' + UI.icon("layers") + " خمسة مستويات</span>" +
          '<span class="floating-chip floating-chip--ready">' + UI.icon("flame") + " سلسلة اليوم: " + Utils.formatNumber(currentStreak) + "</span>" +
        "</div>" +
      "</section>" +

      homeProgressHtml() +

      '<section class="home-stats" aria-label="أرقام المنصة">' +
        '<div class="home-stat"><strong class="home-stat__value">' + Utils.formatNumber(C.totalLessons) + '</strong><span class="home-stat__label">درسًا في المنهج</span><span class="home-stat__note">موزعة على ٩ أقسام</span></div>' +
        '<div class="home-stat"><strong class="home-stat__value">' + Utils.formatNumber(C.sections.length) + '</strong><span class="home-stat__label">أقسام نحوية</span><span class="home-stat__note">من الأساسيات إلى المشتقات</span></div>' +
        '<div class="home-stat"><strong class="home-stat__value" data-stat="passages">' + Utils.formatNumber(0) + '</strong><span class="home-stat__label">قطع تدريب متاحة</span><span class="home-stat__note">من أصل ' + Utils.formatNumber(C.firstReleasePassages) + " في الخطة</span></div>" +
        '<div class="home-stat"><strong class="home-stat__value" data-stat="questions">' + Utils.formatNumber(0) + '</strong><span class="home-stat__label">سؤالًا مشكولًا</span><span class="home-stat__note">من أصل ' + Utils.formatNumber(C.firstReleaseQuestions) + " في الخطة</span></div>" +
      "</section>" +

      '<div class="alert alert--info mt-6">' + UI.icon("info") +
        "<span>خريطة المنهج تُقرأ من ملف بيانات مولّد آليًا بواسطة أدوات التحقق والبناء، ويرفض البناء أي محتوى ناقص. الدروس الخمسة الأولى كاملة بالشرح وجدول القاعدة وخمسة أمثلة معربة، ومحرّك التدريب يعمل على بنك قطع الدرس الأول، وبقية القطع تُضاف في الحزمة السادسة.</span>" +
      "</div>" +

      '<section class="section-block" aria-labelledby="sections-title">' +
        '<div class="section-head">' +
          "<div>" +
            '<h2 id="sections-title">خريطة المنهج</h2>' +
            "<p>الدروس الـ٥٣ كاملة بالترتيب مقسمة إلى تسعة أقسام قابلة للطي؛ اضغط عنوان القسم لفتحه أو طيّه.</p>" +
          "</div>" +
          '<span class="section-head__aside">' + Utils.formatNumber(C.totalLessons) + " درسًا · ٥ مستويات لكل درس</span>" +
        "</div>" +
        '<div id="curriculum" class="curriculum" aria-busy="true">' +
          '<div class="curriculum-loading"><span class="route-loading__dot" aria-hidden="true"></span> جارٍ تحميل خريطة المنهج…</div>' +
        "</div>" +
      "</section>" +

      '<section class="foundation-panel" aria-labelledby="pipeline-title">' +
        '<div class="foundation-panel__content">' +
          '<span class="badge badge--primary">' + UI.icon("check-circle") + " الحزمة الخامسة جاهزة</span>" +
          '<h2 id="pipeline-title">خط بيانات المحتوى</h2>' +
          "<p>يُكتب المحتوى في ملفات JSON داخل مجلد content، ثم يفحصه مدقّق صارم، ويبنيه مولّد البيانات إلى ملفات جافاسكربت تعمل دون خادم ودون إنترنت. يرفض البناء أي محتوى ناقص أو مخالف للمخطط.</p>" +
          '<ol class="pipeline">' +
            '<li class="pipeline-step"><span class="pipeline-step__num" aria-hidden="true">١</span><p><strong>التحرير</strong> — ملفات JSON: قائمة الدروس وبنوك القطع لكل مستوى.</p></li>' +
            '<li class="pipeline-step"><span class="pipeline-step__num" aria-hidden="true">٢</span><p><strong>التحقق</strong> — أدوات Python تفحص البنية والتشكيل والمعرفات وعدد القطع والأسئلة.</p></li>' +
            '<li class="pipeline-step"><span class="pipeline-step__num" aria-hidden="true">٣</span><p><strong>البناء</strong> — توليد ملفات data، مع رفض أي محتوى ناقص قبل الكتابة.</p></li>' +
            '<li class="pipeline-step"><span class="pipeline-step__num" aria-hidden="true">٤</span><p><strong>التشغيل</strong> — يحمّل التطبيق البيانات عبر سكربتات ديناميكية فيعمل عبر file:// ودون اتصال.</p></li>' +
          "</ol>" +
          '<div class="foundation-panel__actions">' +
            '<a class="btn btn--primary" href="#/dashboard">' + UI.icon("chart") + " لوحة التقدم</a>" +
            '<a class="btn btn--ghost" href="#/settings">' + UI.icon("palette") + " الإعدادات</a>" +
          "</div>" +
        "</div>" +
        '<ul class="foundation-list">' +
          "<li>" + UI.icon("check") + " مخطط بيانات موثّق للدروس والقطع</li>" +
          "<li>" + UI.icon("check") + " مدقّق يفصل الأخطاء عن التحذيرات بتقرير واضح</li>" +
          "<li>" + UI.icon("check") + " باني يرفض المحتوى الناقص ولا يكتب شيئًا حينها</li>" +
          "<li>" + UI.icon("check") + " الدروس الـ٥٣ معروضة في الرئيسية من البيانات</li>" +
          "<li>" + UI.icon("check") + " صفحات كاملة للدروس ١–٥: شرح وجدول وخمسة أمثلة معربة</li>" +
          "<li>" + UI.icon("check") + " محرّك تدريب: سؤال واحد في كل مرة مع تغذية راجعة فورية</li>" +
          "<li>" + UI.icon("check") + " نتيجة وفتح المستويات عند ٧٠٪ وإتقان الدرس عند ٨٠٪</li>" +
          "<li>" + UI.icon("check") + " مراجعة الأخطاء: أعد المحاولة وأُحذف ما تُتقنه</li>" +
          "<li>" + UI.icon("check") + " لوحة تقدم: نسبة عامة، سلسلة، شريط لكل درس من ٥ مقاطع</li>" +
          "<li>" + UI.icon("check") + " اختبار مختلط: اختيار الدروس والمستوى والمؤقت، بلا تغذية راجعة أثناء الحل</li>" +
          "<li>" + UI.icon("check") + " أدوات بمكتبة Python القياسية فقط</li>" +
        "</ul>" +
      "</section>" +

      '<section class="section-block" aria-labelledby="explore-title">' +
        '<div class="section-head">' +
          "<div>" +
            '<h2 id="explore-title">استكشف المنصة</h2>' +
            "<p>لوحة التقدم وسجل الاختبارات ومراجعة الأخطاء والإحصاءات كلها محفوظة، والاختبار المختلط يعمل كاملًا على بنك قطع الدرس الأول.</p>" +
          "</div>" +
        "</div>" +
        '<div class="quick-grid">' +
          '<a class="quick-card" href="#/dashboard">' +
            '<span class="icon-tile icon-tile--sm">' + UI.icon("chart") + "</span>" +
            '<span class="quick-card__text"><h3>لوحة التقدم</h3><p>السلسلة والإحصاءات وحالة المستويات</p></span>' +
            UI.icon("chevron-left") +
          "</a>" +
          '<a class="quick-card" href="#/exam">' +
            '<span class="icon-tile icon-tile--sm icon-tile--gold">' + UI.icon("clock") + "</span>" +
            '<span class="quick-card__text"><h3>الاختبار المختلط</h3><p>١٠ أو ٢٠ أو ٣٠ سؤالًا من دروس تختارها</p></span>' +
            UI.icon("chevron-left") +
          "</a>" +
          '<a class="quick-card" href="#/mistakes">' +
            '<span class="icon-tile icon-tile--sm icon-tile--danger">' + UI.icon("alert") + "</span>" +
            '<span class="quick-card__text"><h3>مراجعة الأخطاء</h3><p>سجل الأسئلة التي تحتاج تثبيتًا</p></span>' +
            UI.icon("chevron-left") +
          "</a>" +
        "</div>" +
      "</section>" +
    "</div>";
  }

  function mount(root, context) {
    var container = root.querySelector("#curriculum");
    if (!container) {
      return null;
    }

    return Data.loadLessons()
      .then(function (lessons) {
        if (!container.isConnected) {
          return;
        }
        if (!Array.isArray(lessons) || !lessons.length) {
          showCurriculumMessage(container, {
            icon: "book",
            title: "لا توجد بيانات دروس بعد",
            description: "ولّد ملف بيانات الدروس بتنفيذ الأمر: python3 tools/build_data.py ثم أعد تحميل الصفحة."
          });
          return;
        }
        fillCurriculum(root, container, lessons);
      })
      .catch(function () {
        if (container.isConnected) {
          showCurriculumMessage(container, {
            icon: "alert",
            title: "تعذّر تحميل خريطة المنهج",
            description: "لم يُعثر على ملف بيانات الدروس. ولّده بتنفيذ: python3 tools/build_data.py ثم أعد تحميل الصفحة."
          });
        }
      });
  }

  Nahw.screens = Nahw.screens || {};
  Nahw.screens.home = {
    title: "الرئيسية",
    nav: "home",
    render: render,
    mount: mount
  };
})();
