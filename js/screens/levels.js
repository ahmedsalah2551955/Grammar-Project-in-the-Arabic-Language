/* ==========================================================================
   نَحْو — شاشة المستويات
   تعرض البطاقات الخمس بألوانها، وقفلها، ونجومها، وأفضل نتيجة فيها،
   وعدد القطع المحلولة، مع شرط الفتح عند ٧٠٪.
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;
  var UI = Nahw.ui;
  var Store = Nahw.store;
  var Progress = Nahw.progress;

  function solvedCount(lessonId, levelNumber) {
    var solved = Store.getState().solvedPassages || {};
    return Object.keys(solved).filter(function (key) {
      var entry = solved[key];
      if (!entry) {
        return false;
      }
      var entryLesson = Number(entry.lessonId);
      var entryLevel = Number(entry.level);
      if (!entryLesson) {
        var prefix = "L" + Utils.pad2(lessonId) + "-L" + levelNumber + "-";
        return key.indexOf(prefix) === 0;
      }
      return entryLesson === Number(lessonId) && entryLevel === Number(levelNumber);
    }).length;
  }

  function statusBadge(level, state, unlocked) {
    if (state.passed) {
      return '<span class="badge badge--success">' + UI.icon("check-circle") + " ناجح</span>";
    }
    if (!unlocked) {
      return '<span class="badge badge--outline">' + UI.icon("lock") + " مقفل</span>";
    }
    if (state.attempts > 0) {
      return '<span class="badge badge--warning">' + UI.icon("clock") + " قيد التدريب</span>";
    }
    return '<span class="badge badge--primary">' + UI.icon("play") + " متاح</span>";
  }

  function renderLevel(lessonId, level) {
    var state = Store.getLevelState(lessonId, level.number);
    var unlocked = Progress.isLevelUnlocked(lessonId, level.number);
    var lesson = Nahw.dataLoader.getLesson(lessonId);
    var hasBank = Boolean(lesson && Number(lesson.passageCount) > 0);
    var loaded = Nahw.dataLoader.isLoaded(lessonId);
    var passages = loaded ? Nahw.dataLoader.getPassages(lessonId, level.number) : [];
    var solved = solvedCount(lessonId, level.number);
    var previous = level.number > 1 ? Utils.levelByNumber(level.number - 1) : null;

    var countLabel = !hasBank
      ? "٠ قطعة"
      : (loaded ? Utils.formatNumber(passages.length) + " قطعة" : "جارٍ التحميل");

    var meta = [
      "<span>" + UI.icon("book") + " " + countLabel + "</span>",
      "<span>" + UI.icon("list") + " " + Utils.escapeHTML(level.questions) + "</span>"
    ];
    if (state.bestScore > 0) {
      meta.push("<span>" + UI.icon("target") + " أفضل نتيجة " + Utils.formatPercent(state.bestScore) + "</span>");
    }
    if (solved > 0) {
      meta.push("<span>" + UI.icon("check") + " حُلّت " + Utils.formatNumber(solved) + " قطعة</span>");
    }

    var foot = state.passed
      ? '<span class="level-card__stars" aria-label="نجمة الإنجاز">' + UI.icon("star", "is-earned") + "</span>"
      : '<span class="level-card__stars" aria-label="لم تكتمل بعد">' + UI.icon("star") + "</span>";

    if (unlocked) {
      foot += '<a class="btn btn--primary btn--sm" href="#/lesson/' + lessonId + "/levels/" + level.number + '">' +
        UI.icon("play") + (state.attempts > 0 ? " تدرّب" : " ابدأ") + "</a>";
    } else {
      foot += '<span class="badge badge--outline">' + UI.icon("lock") + " مقفل</span>";
    }

    var note = unlocked
      ? ""
      : '<p class="level-card__note">' + UI.icon("info") + " يُفتح بعد نجاح " +
        (previous ? "المستوى " + Utils.formatNumber(level.number - 1) : "المستوى السابق") +
        " بنسبة " + Utils.formatNumber(level.passScore) + "٪.</p>";

    return '<article class="level-card ' + UI.levelClass(level.number) +
      (unlocked ? "" : " level-card--locked") + '">' +
      '<div class="level-card__head">' +
        '<span class="level-card__number">المستوى ' + Utils.formatNumber(level.number) + "</span>" +
        statusBadge(level, state, unlocked) +
      "</div>" +
      "<h2>" + Utils.escapeHTML(level.name) + "</h2>" +
      '<p class="level-card__desc">' + Utils.escapeHTML(level.description) + "</p>" +
      '<div class="level-card__meta">' + meta.join("") + "</div>" +
      note +
      '<div class="level-card__foot">' + foot + "</div>" +
    "</article>";
  }

  function render(context) {
    var lessonId = Number(context.params.lessonId);
    var section = Utils.sectionForLesson(lessonId);
    var lesson = Nahw.dataLoader.getLesson(lessonId);

    if (!lessonId || lessonId < 1 || lessonId > Nahw.constants.totalLessons) {
      return '<div class="page container">' + UI.placeholder({
        badge: "درس غير موجود",
        icon: "book-open",
        title: "لم نجد هذا الدرس",
        description: "رقم الدرس المطلوب خارج نطاق المنهج.",
        actions: '<a class="btn btn--primary" href="#/">' + UI.icon("home") + " العودة للرئيسية</a>"
      }) + "</div>";
    }

    if (!lesson || !lesson.ready) {
      return '<div class="page container">' + UI.placeholder({
        badge: "قيد الإعداد",
        icon: "book-open",
        title: "محتوى هذا الدرس قيد الإعداد",
        description: "الدرس معروض بعنوانه في خريطة المنهج، ويظهر بصفحته كاملةً عند نشر محتواه.",
        actions:
          '<a class="btn btn--primary" href="#/">' + UI.icon("home") + " الرئيسية</a>" +
          '<a class="btn btn--ghost" href="#/lesson/1">افتح درسًا جاهزًا</a>'
      }) + "</div>";
    }

    var progress = Progress.getLessonProgress(lessonId);
    var settings = Store.getSettings();
    var levels = Nahw.constants.levels;

    var head = UI.pageHead({
      eyebrow: section ? section.title : "مستويات التدريب",
      eyebrowIcon: "layers",
      title: "مستويات " + lesson.title,
      description: "خمسة مستويات متدرّجة في الطول والصعوبة ونوع الأسئلة. يُفتح المستوى التالي بعد النجاح بنسبة ٧٠٪ في المستوى الحالي.",
      actions:
        '<a class="btn btn--ghost" href="#/lesson/' + lessonId + '">' + UI.icon("arrow-right") + " صفحة الدرس</a>"
    });

    var summary = '<div class="levels-summary">' +
      '<div class="levels-summary__item">' +
        "<span>المستويات الناجحة</span><strong>" +
        Utils.formatNumber(progress.passedLevels) + " من " + Utils.formatNumber(levels.length) + "</strong>" +
      "</div>" +
      '<div class="levels-summary__item">' +
        "<span>نجوم الإنجاز</span><strong>" + Utils.formatNumber(progress.stars) + "</strong>" +
      "</div>" +
      '<div class="levels-summary__item">' +
        "<span>حالة الدرس</span><strong>" +
        (progress.mastered ? "متقن" : progress.started ? "قيد التدريب" : "متاح") + "</strong>" +
      "</div>" +
    "</div>";

    var openAllNote = settings.openAllLevels
      ? '<div class="alert alert--info mb-5">' + UI.icon("info") +
        "<span>«فتح كل المستويات» مفعّل: الدخول متاح إلى كل المستويات، وهو يتيح الدخول فقط ولا يمنح نجاحًا أو نجمة.</span></div>"
      : '<div class="alert alert--info mb-5">' + UI.icon("info") +
        "<span>المستوى الأول مفتوح دائمًا، ولكل مستوى بعده شرط: النجاح في المستوى السابق بنسبة ٧٠٪.</span></div>";

    return '<div class="page container">' +
      head +
      summary +
      openAllNote +
      '<div class="levels-grid" id="levels-grid">' + levels.map(function (level) {
        return renderLevel(lessonId, level);
      }).join("") + "</div>" +
    "</div>";
  }

  function mount(main, context) {
    var lessonId = Number(context.params.lessonId);
    var lesson = Nahw.dataLoader.getLesson(lessonId);
    if (!lesson || !lesson.ready || !Number(lesson.passageCount)) {
      return null;
    }

    return Nahw.dataLoader.loadPassages(lessonId).then(function () {
      var grid = main.querySelector("#levels-grid");
      if (!grid) {
        return;
      }
      grid.innerHTML = Nahw.constants.levels.map(function (level) {
        return renderLevel(lessonId, level);
      }).join("");
    }).catch(function () {
      /* تبقى البطاقات المعروضة كما هي إن تعذّر تحميل البنك */
    });
  }

  Nahw.screens = Nahw.screens || {};
  Nahw.screens.levels = {
    title: function (context) {
      return "مستويات الدرس " + Utils.formatNumber(context.params.lessonId);
    },
    nav: "home",
    render: render,
    mount: mount
  };
})();
