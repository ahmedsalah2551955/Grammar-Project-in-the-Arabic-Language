/* ==========================================================================
   نَحْو — شاشة التدريب
   تعرض القطعة مشكولة، والسؤال واحدًا في كل مرة، مع تغذية راجعة فورية
   وتفسير، ثم تنتقل إلى القطعة التالية أو إلى شاشة النتيجة.
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;
  var UI = Nahw.ui;
  var Store = Nahw.store;
  var Progress = Nahw.progress;
  var Engine = Nahw.engine;

  var root = null;
  var current = null;
  var context = null;

  function render(ctx) {
    var lessonId = Number(ctx.params.lessonId);
    var levelNumber = Number(ctx.params.level);
    var level = Utils.levelByNumber(levelNumber);

    if (!lessonId || lessonId < 1 || lessonId > Nahw.constants.totalLessons || !level) {
      return '<div class="page container">' + UI.placeholder({
        badge: "مسار غير صالح",
        icon: "compass",
        title: "لم نجد جلسة التدريب المطلوبة",
        description: "تأكد من رقم الدرس والمستوى، ثم أعد المحاولة.",
        actions: '<a class="btn btn--primary" href="#/">' + UI.icon("home") + " العودة للرئيسية</a>"
      }) + "</div>";
    }

    return '<div class="page container practice-shell">' +
      '<div id="practice-root" class="practice-root">' +
        '<div class="practice-loading" role="status">' +
          '<span class="route-loading__dot"></span>' +
          "<span>جارٍ تجهيز جلسة التدريب…</span>" +
        "</div>" +
      "</div>" +
    "</div>";
  }

  /* ------------------------------------------------------------------------
     التجهيز
     ------------------------------------------------------------------------ */

  function mount(main, ctx) {
    context = ctx;
    root = main.querySelector("#practice-root");
    if (!root) {
      return null;
    }

    root.addEventListener("click", handleClick);

    var lessonId = Number(ctx.params.lessonId);
    var levelNumber = Number(ctx.params.level);
    var restart = Boolean(ctx.query && ctx.query.restart === "1");

    return prepare(lessonId, levelNumber, restart);
  }

  function destroy() {
    root = null;
    current = null;
  }

  function prepare(lessonId, levelNumber, restart) {
    var owner = root;
    var lesson = Nahw.dataLoader.getLesson(lessonId);

    if (!lesson || !lesson.ready) {
      paintMessage({
        icon: "book-open",
        badge: "قيد الإعداد",
        title: "محتوى هذا الدرس قيد الإعداد",
        description: "لم يُنشر بعد محتوى القطع لهذا الدرس، فتُضاف في حزمة المحتوى القادمة.",
        actions: '<a class="btn btn--primary" href="#/lesson/' + lessonId + '">' + UI.icon("book-open") + " صفحة الدرس</a>"
      });
      return Promise.resolve();
    }

    if (!Progress.isLevelUnlocked(lessonId, levelNumber)) {
      paintMessage({
        icon: "lock",
        badge: "مستوى مقفل",
        title: "هذا المستوى مقفل",
        description: "أنجح بنسبة ٧٠٪ في المستوى السابق تفتح هذا المستوى. يمكنك تفعيل «فتح كل المستويات» من الإعدادات إن أردت التدريب الحر.",
        actions:
          '<a class="btn btn--primary" href="#/lesson/' + lessonId + '/levels">' + UI.icon("layers") + " العودة للمستويات</a>" +
          '<a class="btn btn--ghost" href="#/settings">' + UI.icon("settings") + " الإعدادات</a>"
      });
      return Promise.resolve();
    }

    return Nahw.dataLoader.loadPassages(lessonId).then(function () {
      /* إن غادر الطالب الصفحة أثناء التحميل فلا نرسم في صفحة أخرى. */
      if (!owner || root !== owner) {
        return;
      }

      var passages = Nahw.dataLoader.getPassages(lessonId, levelNumber);
      if (!passages.length) {
        paintMessage({
          icon: "file-text",
          badge: "قيد الإعداد",
          title: "بنك القطع غير جاهز بعد",
          description: "لم تُسلَّم قطع هذا المستوى بعد. تُضاف القطع في حزمة المحتوى القادمة، وستعمل الجلسة فور توفّرها.",
          actions:
            '<a class="btn btn--primary" href="#/lesson/' + lessonId + '/levels">' + UI.icon("layers") + " العودة للمستويات</a>" +
            '<a class="btn btn--ghost" href="#/lesson/' + lessonId + '">' + UI.icon("book-open") + " صفحة الدرس</a>"
        });
        return;
      }

      current = Engine.createSession(lessonId, levelNumber, { restart: restart });

      if (!current.passages.length) {
        paintMessage({
          icon: "file-text",
          badge: "قيد الإعداد",
          title: "لا توجد قطع متاحة",
          description: "استُهلكت قطع هذا البنك، وحجم الجلسة أكبر من المتاح. جرّب مستوى آخر أو انتظر تجديد البنك.",
          actions: '<a class="btn btn--primary" href="#/lesson/' + lessonId + '/levels">' + UI.icon("layers") + " العودة للمستويات</a>"
        });
        return;
      }

      paint();
    }).catch(function () {
      if (!owner || root !== owner) {
        return;
      }
      paintMessage({
        icon: "alert",
        badge: "تعذّر التحميل",
        title: "لم نتمكن من تحميل بنك القطع",
        description: "حدث خطأ أثناء تحميل بيانات هذا الدرس. أعد المحاولة، وتأكد من سلامة ملفات البيانات.",
        actions:
          '<a class="btn btn--primary" href="#/lesson/' + lessonId + '/levels">' + UI.icon("layers") + " العودة للمستويات</a>" +
          '<button class="btn btn--ghost" type="button" data-action="retry">' + UI.icon("refresh") + " إعادة المحاولة</button>"
      });
    });
  }

  /* ------------------------------------------------------------------------
     الرسم
     ------------------------------------------------------------------------ */

  function paintMessage(options) {
    if (!root) {
      return;
    }
    root.innerHTML = UI.placeholder({
      badge: options.badge,
      icon: options.icon,
      title: options.title,
      description: options.description,
      actions: options.actions
    });
  }

  function paint() {
    if (!root || !current) {
      return;
    }

    var group = current.passages[current.passageIndex];
    var item = group && group.items[current.stepIndex];

    if (!item) {
      paintMessage({
        icon: "check-circle",
        badge: "انتهت الجلسة",
        title: "انتهت قطع هذه الجلسة",
        description: "اضغط «عرض النتيجة» لتظهر نتيجتك ومراجعة أخطائك.",
        actions: '<a class="btn btn--primary" href="#/result/' + current.lessonId + "/" + current.level + '">' + UI.icon("trophy") + " عرض النتيجة</a>"
      });
      return;
    }

    root.innerHTML =
      topbarHtml() +
      progressHtml() +
      passageHtml(group, item) +
      questionHtml(item);
  }

  function topbarHtml() {
    var lesson = Nahw.dataLoader.getLesson(current.lessonId);
    var meta = Utils.levelByNumber(current.level);

    return '<div class="practice-topbar">' +
      '<a class="btn btn--ghost btn--sm" href="#/lesson/' + current.lessonId + '/levels">' +
        UI.icon("arrow-right") + " المستويات" +
      "</a>" +
      '<div class="practice-topbar__info">' +
        "<span>الدرس " + Utils.formatNumber(current.lessonId) +
          (lesson ? " · " + Utils.escapeHTML(lesson.title) : "") +
        "</span>" +
        UI.levelBadge(current.level, meta ? meta.name : "") +
      "</div>" +
    "</div>";
  }

  function progressHtml() {
    var total = current.totalQuestions || 1;
    var percent = Math.round((current.answeredCount / total) * 100);

    return '<div class="practice-progress">' +
      '<div class="practice-progress__meta">' +
        "<span>القطعة " + Utils.formatNumber(current.passageIndex + 1) +
          " من " + Utils.formatNumber(current.passages.length) + "</span>" +
        "<span>سؤال " + Utils.formatNumber(current.stepIndex + 1) +
          " من " + Utils.formatNumber(current.passages[current.passageIndex].items.length) + "</span>" +
        '<span class="practice-progress__score">' + UI.icon("check-circle") +
          " صحيح " + Utils.formatNumber(current.correctCount) + "</span>" +
      "</div>" +
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
        percent + '" aria-label="تقدّم الجلسة">' +
        '<div class="progress__bar" style="--value:' + percent + '%"></div>' +
      "</div>" +
    "</div>";
  }

  function passageHtml(group, item) {
    var passage = group.passage;
    var body = item.type === "tap"
      ? tapTextHtml(passage.text)
      : '<p class="passage-text">' + Utils.escapeHTML(passage.text) + "</p>";

    return '<article class="card passage-card">' +
      '<div class="passage-card__head">' +
        '<span class="badge badge--outline">' + UI.icon("file-text") + " " +
          Utils.escapeHTML(passage.source || "نص تدريبي") + "</span>" +
        '<span class="passage-card__id">' + Utils.escapeHTML(passage.id) + "</span>" +
      "</div>" +
      body +
    "</article>";
  }

  function tapTextHtml(text) {
    var parts = Utils.tokenizeArabic(text);
    var locked = Boolean(current && current.feedback);

    return '<p class="passage-text passage-text--tap">' + parts.map(function (part) {
      if (!part.isWord) {
        return '<span class="tap-sep">' + Utils.escapeHTML(part.text) + "</span>";
      }
      return '<button class="tap-word" type="button" data-action="tap" data-word="' +
        Utils.escapeAttr(part.text) + '"' + (locked ? " disabled" : "") + ">" +
        Utils.escapeHTML(part.text) + "</button>";
    }).join("") + "</p>";
  }

  function questionHtml(item) {
    var feedback = current.feedback;
    var options = item.type === "tap" ? "" : optionsHtml(item, feedback);

    return '<article class="card question-card">' +
      '<p class="question-card__prompt">' + Utils.escapeHTML(item.prompt) + "</p>" +
      options +
      (feedback ? feedbackHtml(feedback) : "") +
      (feedback ? '<div class="question-card__actions">' +
        '<button class="btn btn--primary" type="button" data-action="next">' +
          nextLabel() + UI.icon("arrow-left") +
        "</button>" +
      "</div>" : "") +
    "</article>";
  }

  function nextLabel() {
    var group = current.passages[current.passageIndex];
    var lastOfPassage = current.stepIndex >= group.items.length - 1;
    var lastOfSession = lastOfPassage && current.passageIndex >= current.passages.length - 1;
    if (lastOfSession) {
      return "عرض النتيجة";
    }
    if (lastOfPassage) {
      return "القطعة التالية";
    }
    return "السؤال التالي";
  }

  function optionsHtml(item, feedback) {
    return '<div class="options-list">' + item.display.map(function (option, index) {
      var classes = ["option-button"];
      if (feedback) {
        if (option.correct) {
          classes.push("is-correct");
        } else if (index === feedback.chosenIndex) {
          classes.push("is-wrong");
        }
      }
      return '<button class="' + classes.join(" ") + '" type="button" data-action="answer" data-index="' +
        index + '"' + (feedback ? " disabled" : "") + ">" +
        '<span class="option-letter">' + Engine.optionLetter(index) + "</span>" +
        "<span>" + Utils.escapeHTML(option.text) + "</span>" +
      "</button>";
    }).join("") + "</div>";
  }

  function feedbackHtml(record) {
    var ok = record.correct;
    return '<div class="answer-feedback answer-feedback--' + (ok ? "correct" : "wrong") +
      '" role="status" aria-live="polite">' +
      '<div class="answer-feedback__head">' +
        UI.icon(ok ? "check-circle" : "alert") +
        "<strong>" + (ok ? "أحسنت!" : "حاول مرة أخرى") + "</strong>" +
      "</div>" +
      (ok
        ? ""
        : '<p class="answer-feedback__correct">الإجابة الصحيحة: ' + Utils.escapeHTML(record.correctText) + "</p>") +
      (record.explain
        ? '<p class="answer-feedback__explain">' + Utils.escapeHTML(record.explain) + "</p>"
        : "") +
    "</div>";
  }

  /* ------------------------------------------------------------------------
     التفاعل
     ------------------------------------------------------------------------ */

  function handleClick(event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
    if (!target || !root || !root.contains(target)) {
      return;
    }

    var action = target.getAttribute("data-action");

    if (action === "retry") {
      var lessonId = Number(context.params.lessonId);
      var levelNumber = Number(context.params.level);
      prepare(lessonId, levelNumber, true);
      return;
    }

    if (action === "next") {
      var outcome = Engine.next(current);
      if (outcome && outcome.done) {
        Nahw.router.navigate("/result/" + current.lessonId + "/" + current.level);
      } else {
        paint();
      }
      return;
    }

    if (!current || current.feedback) {
      return;
    }

    if (action === "answer") {
      var record = Engine.answer(current, {
        kind: "option",
        index: Number(target.getAttribute("data-index"))
      });
      if (record) {
        paint();
      }
      return;
    }

    if (action === "tap") {
      var tapRecord = Engine.answer(current, {
        kind: "word",
        word: target.getAttribute("data-word")
      });
      if (tapRecord) {
        paint();
      }
    }
  }

  Nahw.screens = Nahw.screens || {};
  Nahw.screens.practice = {
    title: function (ctx) {
      return "تدريب الدرس " + Utils.formatNumber(ctx.params.lessonId);
    },
    nav: "home",
    render: render,
    mount: mount,
    destroy: destroy
  };
})();
