/* ==========================================================================
   نَحْو — شاشة النتيجة
   تعرض ما جبته من الأسئلة ونسبتك، وتعلن فتح المستوى التالي وإتقان الدرس،
   ثم تراجع كل خطأ مع إجابتك والإجابة الصحيحة والتفسير.
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;
  var UI = Nahw.ui;
  var Progress = Nahw.progress;
  var Engine = Nahw.engine;

  function messageFor(percent, passed) {
    if (passed && percent >= 90) {
      return "ممتاز! إتقانٌ واضحٌ لهذا المستوى.";
    }
    if (passed) {
      return "أحسنت! نجحت في هذا المستوى، وبقيت مراجعة الأخطاء لتُغلق ما تبقّى.";
    }
    if (percent >= 50) {
      return "نتيجةٌ قريبة، أعد المحاولة ومراجعة كل خطأ لتتقن المستوى.";
    }
    return "لم تنجح بعد في هذا المستوى؛ راجع صفحة الدرس ثم أعد المحاولة.";
  }

  function renderWrong(item) {
    return '<article class="card review-item review-item--wrong">' +
      '<div class="review-item__head">' +
        '<span class="badge badge--danger">' + UI.icon("x") + " خطأ</span>" +
        '<span class="badge badge--outline">' + Utils.escapeHTML(item.passageId || "") + "</span>" +
      "</div>" +
      '<p class="review-item__prompt">' + Utils.escapeHTML(item.prompt) + "</p>" +
      '<div class="mistake-item__answers">' +
        '<div class="mistake-answer mistake-answer--wrong">' + UI.icon("x") +
          "<span>إجابتك: " + Utils.escapeHTML(item.chosenText || "—") + "</span></div>" +
        '<div class="mistake-answer mistake-answer--right">' + UI.icon("check") +
          "<span>الصحيحة: " + Utils.escapeHTML(item.correctText || "—") + "</span></div>" +
      "</div>" +
      (item.explain
        ? '<div class="tip-box mt-4">' + UI.icon("lightbulb") +
          "<span>" + Utils.escapeHTML(item.explain) + "</span></div>"
        : "") +
    "</article>";
  }

  function render(context) {
    var lessonId = Number(context.params.lessonId);
    var levelNumber = Number(context.params.level);
    var level = Utils.levelByNumber(levelNumber);

    if (!lessonId || !level) {
      return '<div class="page container">' + UI.placeholder({
        badge: "مسار غير صالح",
        icon: "compass",
        title: "لم نجد نتيجة هذه الجلسة",
        description: "تأكد من رقم الدرس والمستوى، ثم أعد المحاولة.",
        actions: '<a class="btn btn--primary" href="#/">' + UI.icon("home") + " العودة للرئيسية</a>"
      }) + "</div>";
    }

    var summary = Engine.getResult(lessonId, levelNumber);

    if (!summary) {
      return '<div class="page container">' + UI.placeholder({
        badge: "لا توجد نتيجة",
        icon: "trophy",
        title: "لم تُسجَّل نتيجة في هذا المستوى بعد",
        description: "ابدأ جلسة تدريب، وستظهر هنا نتيجتك مع مراجعة كل خطأ وإجابة الصحيحة.",
        actions:
          '<a class="btn btn--primary" href="#/lesson/' + lessonId + '/levels/' + levelNumber + '">' +
            UI.icon("play") + " ابدأ التدريب</a>" +
          '<a class="btn btn--ghost" href="#/lesson/' + lessonId + '/levels">' + UI.icon("layers") + " المستويات</a>"
      }) + "</div>";
    }

    var lesson = Nahw.dataLoader.getLesson(lessonId);
    var nextLevel = summary.nextLevel;
    var nextUnlocked = nextLevel ? Progress.isLevelUnlocked(lessonId, nextLevel) : false;
    var wrong = summary.wrong || [];

    return '<div class="page container narrow result-shell">' +
      '<div class="card result-hero">' +
        '<div class="result-score">' +
          "<strong>" + Utils.formatPercent(summary.percent) + "</strong>" +
          "<span>جبت " + Utils.formatNumber(summary.correct) + " من " + Utils.formatNumber(summary.total) + "</span>" +
        "</div>" +
        '<p class="result-message">' + Utils.escapeHTML(messageFor(summary.percent, summary.passed)) + "</p>" +
        '<div class="result-tags">' +
          '<span class="badge badge--outline">' + UI.icon("book") + " الدرس " + Utils.formatNumber(lessonId) +
            (lesson ? " · " + Utils.escapeHTML(lesson.title) : "") + "</span>" +
          UI.levelBadge(levelNumber, level.name) +
          (summary.passed
            ? '<span class="badge badge--success">' + UI.icon("check-circle") + " ناجح</span>"
            : '<span class="badge badge--warning">' + UI.icon("alert") + " لم تنجح</span>") +
          (summary.stars > 0
            ? '<span class="badge badge--gold">' + UI.icon("star") + " نجمة</span>"
            : "") +
        "</div>" +
      "</div>" +

      (summary.passed
        ? '<div class="alert alert--success mt-5">' + UI.icon("check-circle") +
          "<span>نجحت بنسبة " + Utils.formatPercent(summary.percent) + " وهي " +
          Utils.formatNumber(summary.passScore) + "٪ فأكثر، فقد فُتح المستوى التالي.</span></div>"
        : '<div class="alert alert--warning mt-5">' + UI.icon("info") +
          "<span>تحتاج " + Utils.formatNumber(summary.passScore) + "٪ فأكثر لفتح المستوى التالي. راجع أخطاءك ثم أعد المحاولة.</span></div>") +

      (summary.mastery
        ? '<div class="alert alert--info mt-4">' + UI.icon("medal") +
          "<span>أتقنت هذا الدرس: أكملت المستوى الخامس بنسبة " +
          Utils.formatPercent(summary.bestScore) + ".</span></div>"
        : "") +

      (nextLevel && nextUnlocked
        ? '<div class="result-next mt-5">' +
          '<div class="result-next__text">' +
            "<strong>المستوى التالي: " + Utils.formatNumber(nextLevel) + " · " +
            Utils.escapeHTML((Utils.levelByNumber(nextLevel) || {}).name || "") + "</strong>" +
            "<p>فُتح لك بعد نجاحك في هذا المستوى.</p>" +
          "</div>" +
          '<a class="btn btn--primary" href="#/lesson/' + lessonId + "/levels/" + nextLevel + '">' +
            UI.icon("arrow-left") + " ابدأ المستوى التالي</a>" +
        "</div>"
        : "") +

      '<section class="result-review mt-6" aria-labelledby="review-title">' +
        "<h2 id=\"review-title\">" +
          (wrong.length
            ? "مراجعة الأخطاء (" + Utils.formatNumber(wrong.length) + ")"
            : "مراجعة الأخطاء") +
        "</h2>" +
        (wrong.length
          ? '<div class="review-list">' + wrong.map(renderWrong).join("") + "</div>"
          : '<div class="alert alert--success">' + UI.icon("check-circle") +
            "<span>لا أخطاء في هذه الجلسة، فقد أجبت عن كل الأسئلة إجابة صحيحة.</span></div>") +
      "</section>" +

      '<div class="result-actions">' +
        '<a class="btn btn--primary" href="#/lesson/' + lessonId + "/levels/" + levelNumber + "?restart=1\">" +
          UI.icon("refresh") + " إعادة المحاولة</a>" +
        (nextLevel && nextUnlocked
          ? '<a class="btn btn--secondary" href="#/lesson/' + lessonId + "/levels/" + nextLevel + '">' +
            UI.icon("arrow-left") + " المستوى التالي</a>"
          : "") +
        '<a class="btn btn--ghost" href="#/lesson/' + lessonId + '">' + UI.icon("book-open") + " العودة للدرس</a>" +
        '<a class="btn btn--ghost" href="#/dashboard">' + UI.icon("chart") + " لوحة التقدم</a>" +
      "</div>" +
    "</div>";
  }

  Nahw.screens = Nahw.screens || {};
  Nahw.screens.result = {
    title: "النتيجة",
    nav: "home",
    render: render
  };
})();
