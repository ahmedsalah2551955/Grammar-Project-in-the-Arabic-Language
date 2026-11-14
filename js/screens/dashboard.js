/* ==========================================================================
   لوحة التقدم
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;
  var UI = Nahw.ui;
  var Store = Nahw.store;
  var Progress = Nahw.progress;
  var C = Nahw.constants;

  function getDoneDays() {
    return Progress.getDoneDays();
  }

  function lessonStatusPhrase(count, state, suffix) {
    return Progress.lessonStatusPhrase(count, state, suffix);
  }

  function lessonsFromTotal(count) {
    return Progress.lessonsFromTotal(count);
  }

  function streakPhrase(count) {
    return Progress.streakPhrase(count);
  }

  function bestStreakPhrase(count) {
    return Progress.bestStreakPhrase(count);
  }

  function questionPhrase(count) {
    return Progress.questionPhrase(count);
  }

  function renderWeekCard(stats) {
    var doneDays = getDoneDays();
    var days = Utils.getWeekDays(7);
    var streak = Store.getState().streak;

    var daysHtml = days.map(function (day) {
      var isDone = Boolean(doneDays[day.key]);
      var inner = isDone ? UI.icon("check") : day.isToday ? UI.icon("flame") : "";
      return '<div class="week-day ' + (day.isToday ? "is-today " : "") + (isDone ? "is-done" : "") + '">' +
        '<span class="week-day__dot">' + inner + "</span>" +
        "<span>" + Utils.escapeHTML(day.weekday) + "</span>" +
      "</div>";
    }).join("");

    return '<section class="card week-card" aria-labelledby="week-title">' +
      '<div class="week-card__head">' +
        "<div>" +
          '<h2 id="week-title">سلسلة الأيام</h2>' +
          "<p>" + streakPhrase(stats.streakCurrent) + " · " + bestStreakPhrase(streak.best || 0) + "</p>" +
        "</div>" +
        '<span class="badge badge--gold">' + UI.icon("flame") + " " + Utils.formatNumber(stats.streakCurrent) + "</span>" +
      "</div>" +
      '<div class="week-grid">' + daysHtml + "</div>" +
    "</section>";
  }

  function renderProgressCard(stats) {
    var ready = stats.readyLessons;
    var description = ready
      ? "تُحسب النسبة من المستويات الناجحة في الدروس الجاهزة. كل مستوى ناجح يقرّبك من إتقان الدرس."
      : "ستُحسب نسبتك من المستويات الناجحة بعد إضافة بيانات الدروس. كل مستوى ناجح سيمنحك نجمة، وإتمام المستوى الخامس بنسبة ٨٠٪ يمنحك إتقان الدرس.";

    return '<section class="card progress-overview" aria-labelledby="progress-title">' +
      '<div class="progress-ring" style="--progress:' + Math.round(stats.overallPercent) + '" role="img" aria-label="نسبة التقدم الإجمالية ' + Utils.formatPercent(stats.overallPercent) + '">' +
        '<div class="progress-ring__value"><strong>' + Utils.formatPercent(stats.overallPercent) + "</strong><span>إجمالي التقدم</span></div>" +
      "</div>" +
      '<div class="progress-overview__text">' +
        '<h2 id="progress-title">مسارك في المنهج</h2>' +
        "<p>" + Utils.escapeHTML(description) + "</p>" +
        '<div class="progress-overview__bar">' +
          UI.progressBar(stats.overallPercent, { ariaLabel: "نسبة التقدم الإجمالية" }) +
        "</div>" +
        '<div class="progress-overview__legend">' +
          "<span><i></i> " + lessonStatusPhrase(ready, "ready") + "</span>" +
          "<span><i style=\"background:var(--gold)\"></i> " + lessonStatusPhrase(stats.masteredLessons, "mastered") + "</span>" +
        "</div>" +
      "</div>" +
    "</section>";
  }

  function renderLessonAverages(readyLessons) {
    var breakdown = Progress.getStrongestWeakest(readyLessons, 3);
    function list(items) {
      if (!items.length) {
        return '<div class="dashboard-empty">ستظهر الدروس هنا بعد إكمال أول تدريب.</div>';
      }
      return '<div class="dashboard-list">' + items.map(function (item) {
        return '<div class="dashboard-list__item">' +
          '<span class="icon-tile icon-tile--sm">' + UI.icon("book") + "</span>" +
          '<div class="dashboard-list__text"><strong>الدرس ' + Utils.formatNumber(item.lesson.id) + " · " + Utils.escapeHTML(item.lesson.title || "") + "</strong><span>" + Utils.formatPercent(item.average) + " متوسط أفضل النتائج</span></div>" +
          '<span class="badge ' + (item.mastered ? "badge--success" : "badge--primary") + '">' + (item.mastered ? "متقن" : "قيد التقدم") + "</span>" +
        "</div>";
      }).join("") + "</div>";
    }

    return '<section class="card dashboard-card" aria-labelledby="strength-title">' +
      '<div class="dashboard-card__head"><h2 id="strength-title">أقوى الدروس</h2>' + UI.icon("trophy") + "</div>" +
      list(breakdown.strongest) +
    "</section>" +
    '<section class="card dashboard-card" aria-labelledby="weakness-title">' +
      '<div class="dashboard-card__head"><h2 id="weakness-title">تحتاج مراجعة</h2>' + UI.icon("target") + "</div>" +
      list(breakdown.weakest) +
    "</section>";
  }

  /* ------------------------------------------------------------------------
     شريط لكل درس: خمسة مقاطع بألوان المستويات
     ------------------------------------------------------------------------ */

  function segmentState(lessonId, level) {
    if (level.passed) {
      return "done";
    }
    if (level.attempts > 0) {
      return "attempted";
    }
    return Progress.isLevelUnlocked(lessonId, level.number) ? "open" : "locked";
  }

  function lessonBarRow(lesson) {
    var progress = Progress.getLessonProgress(lesson.id);
    var segments = progress.levels.map(function (level) {
      var state = segmentState(lesson.id, level);
      var label = "المستوى " + Utils.formatNumber(level.number) + " · " + level.name +
        " · " + (state === "done" ? "ناجح" : (state === "attempted" ? "قيد التدريب" : (state === "open" ? "متاح" : "مقفل")));
      return '<span class="lesson-bar__seg ' + UI.levelClass(level.number) + " is-" + state +
        '" title="' + Utils.escapeAttr(label) + '"></span>';
    }).join("");

    var aria = "الدرس " + Utils.formatNumber(lesson.id) + ": " +
      Utils.formatNumber(progress.passedLevels) + " من " + Utils.formatNumber(progress.levels.length) + " مستويات ناجحة";

    return '<div class="lesson-bar-row">' +
      '<div class="lesson-bar-row__text">' +
        "<strong>الدرس " + Utils.formatNumber(lesson.id) + " · " + Utils.escapeHTML(lesson.title || "") + "</strong>" +
        "<span>" + Utils.formatNumber(progress.passedLevels) + " من " + Utils.formatNumber(progress.levels.length) +
          " مستويات ناجحة" + (progress.mastered ? " · متقن" : "") + "</span>" +
      "</div>" +
      '<div class="lesson-bar" role="img" aria-label="' + Utils.escapeAttr(aria) + '">' + segments + "</div>" +
    "</div>";
  }

  function renderLessonBars(readyLessons) {
    var lessons = Array.isArray(readyLessons) ? readyLessons : [];

    if (!lessons.length) {
      return '<section class="card dashboard-card" aria-labelledby="bars-title">' +
        '<div class="dashboard-card__head"><h2 id="bars-title">تقدّمك في الدروس</h2>' + UI.icon("layers") + "</div>" +
        '<div class="dashboard-empty">ستُعرض الدروس هنا عند إضافة محتوىها.</div>' +
      "</section>";
    }

    var legend = '<div class="lesson-bar-legend">' + Nahw.constants.levels.map(function (level) {
      return '<span class="lesson-bar-legend__item ' + UI.levelClass(level.number) + '">' +
        "<i></i>" + Utils.escapeHTML(level.name) + "</span>";
    }).join("") + "</div>";

    return '<section class="card dashboard-card" aria-labelledby="bars-title">' +
      '<div class="dashboard-card__head"><h2 id="bars-title">تقدّمك في الدروس</h2>' + UI.icon("layers") + "</div>" +
      '<p class="dashboard-card__desc">كل شريط يعرض مستويات الدرس الخمسة بألوانها: الأخضر للناجح، والفاتح لقيد التدريب، والرمادي للمقفل.</p>' +
      '<div class="lesson-bars">' + lessons.map(lessonBarRow).join("") + "</div>" +
      legend +
    "</section>";
  }

  function renderExamHistory() {
    var exams = Progress.getRecentExams(3);
    if (!exams.length) {
      return '<div class="dashboard-empty">لم تُجرِ أي اختبار مختلط بعد.</div>';
    }
    return '<div class="dashboard-list">' + exams.map(function (exam) {
      return '<div class="dashboard-list__item">' +
        '<span class="icon-tile icon-tile--sm icon-tile--gold">' + UI.icon("clock") + "</span>" +
        '<div class="dashboard-list__text"><strong>اختبار من ' + Utils.formatNumber(exam.questionCount || 0) + " سؤالًا</strong><span>" + (exam.dateLabel || Utils.toArabicDigits(exam.date || "")) + "</span></div>" +
        '<span class="badge badge--gold">' + Utils.formatPercent(exam.percent || 0) + "</span>" +
      "</div>";
    }).join("") + "</div>";
  }

  function render() {
    var readyLessons = Nahw.dataLoader ? Nahw.dataLoader.getReadyLessons() : [];
    var stats = Progress.getStats(readyLessons);
    var mistakes = stats.mistakes;
    var persistent = Store.persistent;

    return '<div class="page container">' +
      UI.pageHead({
        eyebrow: "لوحة المتابعة",
        eyebrowIcon: "chart",
        title: "تقدّمي",
        description: "كل إجابة تُضاف إلى سجلك المحلي: النسبة، السلسلة، القطع المحلولة، والدروس المتقنة.",
        actions:
          '<a class="btn btn--secondary btn--sm" href="#/mistakes">' + UI.icon("alert") + " أخطائي" + (mistakes ? ' <span class="badge badge--danger">' + Utils.formatNumber(mistakes) + "</span>" : "") + "</a>" +
          '<a class="btn btn--primary btn--sm" href="#/exam">' + UI.icon("clock") + " اختبار مختلط</a>"
      }) +

      (!persistent
        ? '<div class="alert alert--warning mb-6">' + UI.icon("alert") +
          "<span>التخزين المحلي غير متاح في هذا المتصفح أو السياق، لذا لن يُحفظ تقدمك بعد إغلاق الصفحة.</span></div>"
        : "") +

      '<div class="grid grid--4">' +
        '<div class="stat-card stat-card--primary">' +
          '<div class="stat-card__top"><span class="stat-card__label">التقدم العام</span><span class="icon-tile icon-tile--sm">' + UI.icon("chart") + "</span></div>" +
          '<strong class="stat-card__value">' + Utils.formatPercent(stats.overallPercent) + "</strong>" +
          '<span class="stat-card__hint">' + lessonStatusPhrase(stats.readyLessons, "ready", "للمتابعة") + "</span>" +
        "</div>" +
        '<div class="stat-card">' +
          '<div class="stat-card__top"><span class="stat-card__label">سلسلة الأيام</span><span class="icon-tile icon-tile--sm icon-tile--gold">' + UI.icon("flame") + "</span></div>" +
          '<strong class="stat-card__value">' + Utils.formatNumber(stats.streakCurrent) + ' <small>يوم</small></strong>' +
          '<span class="stat-card__hint">' + bestStreakPhrase(stats.streakBest) + "</span>" +
        "</div>" +
        '<div class="stat-card">' +
          '<div class="stat-card__top"><span class="stat-card__label">القطع المحلولة</span><span class="icon-tile icon-tile--sm">' + UI.icon("book-open") + "</span></div>" +
          '<strong class="stat-card__value">' + Utils.formatNumber(stats.solvedPassages) + "</strong>" +
          '<span class="stat-card__hint">' + (stats.totalPassages ? "من أصل " + Utils.formatNumber(stats.totalPassages) + " قطعة متاحة" : "ستظهر القطع بعد إضافة المحتوى") + "</span>" +
        "</div>" +
        '<div class="stat-card">' +
          '<div class="stat-card__top"><span class="stat-card__label">دروس متقنة</span><span class="icon-tile icon-tile--sm icon-tile--gold">' + UI.icon("trophy") + "</span></div>" +
          '<strong class="stat-card__value">' + Utils.formatNumber(stats.masteredLessons) + "</strong>" +
          '<span class="stat-card__hint">' + (stats.readyLessons ? "من أصل " + lessonsFromTotal(stats.readyLessons) : "بانتظار إضافة الدروس") + "</span>" +
        "</div>" +
      "</div>" +

      '<div class="grid grid--2 mt-4">' +
        renderProgressCard(stats) +
        renderWeekCard(stats) +
      "</div>" +

      '<div class="mt-4">' +
        renderLessonBars(readyLessons) +
      "</div>" +

      '<div class="grid grid--2 mt-4">' +
        renderLessonAverages(readyLessons) +
      "</div>" +

      '<div class="grid grid--2 mt-4">' +
        '<section class="card dashboard-card" aria-labelledby="exams-title">' +
          '<div class="dashboard-card__head"><h2 id="exams-title">آخر الاختبارات</h2>' + UI.icon("clock") + "</div>" +
          renderExamHistory() +
        "</section>" +
        '<section class="card dashboard-card" aria-labelledby="mistakes-title">' +
          '<div class="dashboard-card__head"><h2 id="mistakes-title">مراجعة الأخطاء</h2>' + UI.icon("alert") + "</div>" +
          (mistakes
            ? '<p class="dashboard-card__desc">لديك ' + questionPhrase(mistakes) + " بحاجة إلى مراجعة.</p>" +
              '<a class="btn btn--soft btn--sm mt-4" href="#/mistakes">راجع أخطائي ' + UI.icon("arrow-left") + "</a>"
            : '<div class="dashboard-empty">لا توجد أخطاء محفوظة. أحسنت!</div>') +
        "</section>" +
      "</div>" +

      '<div class="settings-footer">' +
        '<p>التقدم يُحفظ على جهازك فقط، ولا يُرسل إلى أي خادم.</p>' +
      "</div>" +
    "</div>";
  }

  Nahw.screens = Nahw.screens || {};
  Nahw.screens.dashboard = {
    title: "تقدّمي",
    nav: "dashboard",
    render: render
  };
})();
