/* ==========================================================================
   شاشة الاختبار المختلط
   ثلاث حالات: الإعداد، ثم الحل بلا تغذية راجعة، ثم النتيجة والمراجعة.
   الاختبار لا يفتح المستويات، لكنه يسجّل أخطاءه في قائمة المراجعة.
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;
  var UI = Nahw.ui;
  var Store = Nahw.store;
  var Exam = Nahw.exam;

  var root = null;
  var timerId = null;
  var warned = false;

  var view = "setup";
  var loading = false;
  var errorMessage = "";
  var banksReady = false;
  var setupReady = false;

  var setup = {
    lessonIds: [],
    level: "all",
    timer: "none",
    count: 10
  };

  /* ------------------------------------------------------------------------
     أدوات مساعدة
     ------------------------------------------------------------------------ */

  function availableLessons() {
    return Nahw.dataLoader.getReadyLessons().filter(function (lesson) {
      return Number(lesson.passageCount) > 0;
    });
  }

  function questionPhrase(count) {
    var n = Math.abs(Number(count) || 0);
    if (n === 1) {
      return "سؤال واحد";
    }
    if (n === 2) {
      return "سؤالان";
    }
    if (n % 100 >= 3 && n % 100 <= 10) {
      return Utils.formatNumber(n) + " أسئلة";
    }
    return Utils.formatNumber(n) + " سؤالًا";
  }

  function timerLabel(value) {
    if (value === "none") {
      return "بدون مؤقت";
    }
    return Utils.formatNumber(value) + " دقيقة";
  }

  function announce(message) {
    var region = document.getElementById("route-announcer");
    if (region) {
      region.textContent = message;
    }
  }

  function stopTimer() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
    warned = false;
  }

  /* ------------------------------------------------------------------------
     شاشة الإعداد
     ------------------------------------------------------------------------ */

  function levelOptionsHtml() {
    var levels = [
      { value: "all", label: "كل المستويات" },
      { value: 1, label: "المستوى ١" },
      { value: 2, label: "المستوى ٢" },
      { value: 3, label: "المستوى ٣" },
      { value: 4, label: "المستوى ٤" },
      { value: 5, label: "المستوى ٥" }
    ];

    return levels.map(function (option) {
      var checked = String(setup.level) === String(option.value);
      return '<label class="segmented__option">' +
        '<input type="radio" name="exam-level" value="' + option.value + '"' + (checked ? " checked" : "") + ">" +
        '<span class="segmented__label">' + option.label + "</span>" +
      "</label>";
    }).join("");
  }

  function timerOptionsHtml() {
    var options = [
      { value: "none", label: "بدون" },
      { value: "10", label: "١٠ دقائق" },
      { value: "20", label: "٢٠ دقيقة" },
      { value: "30", label: "٣٠ دقيقة" }
    ];

    return options.map(function (option) {
      var checked = String(setup.timer) === String(option.value);
      return '<label class="segmented__option">' +
        '<input type="radio" name="exam-timer" value="' + option.value + '"' + (checked ? " checked" : "") + ">" +
        '<span class="segmented__label">' + option.label + "</span>" +
      "</label>";
    }).join("");
  }

  function countOptionsHtml() {
    return Exam.QUESTION_COUNTS.map(function (value) {
      var checked = Number(setup.count) === value;
      return '<label class="segmented__option">' +
        '<input type="radio" name="exam-count" value="' + value + '"' + (checked ? " checked" : "") + ">" +
        '<span class="segmented__label">' + Utils.formatNumber(value) + " أسئلة</span>" +
      "</label>";
    }).join("");
  }

  function lessonsHtml(lessons) {
    if (!lessons.length) {
      return '<div class="dashboard-empty">لا توجد بنوك قطع جاهزة بعد، فتُضاف القطع في حزمة المحتوى القادمة.</div>';
    }

    return '<ul class="exam-lessons">' + lessons.map(function (lesson) {
      var checked = setup.lessonIds.indexOf(lesson.id) !== -1;
      return "<li>" +
        '<label class="exam-lesson">' +
          '<input type="checkbox" name="exam-lesson" value="' + lesson.id + '"' + (checked ? " checked" : "") + ">" +
          '<span class="exam-lesson__number">' + Utils.formatNumber(lesson.id) + "</span>" +
          '<span class="exam-lesson__text">' +
            "<strong>" + Utils.escapeHTML(lesson.title) + "</strong>" +
            "<span>" + Utils.formatNumber(lesson.passageCount) + " قطعة · " +
              Utils.formatNumber(lesson.questionCount) + " سؤالًا</span>" +
          "</span>" +
        "</label>" +
      "</li>";
    }).join("") + "</ul>";
  }

  function setupHtml() {
    var lessons = availableLessons();
    var available = banksReady
      ? Exam.countAvailable(setup.lessonIds, setup.level)
      : null;

    var availability = available === null
      ? "جارٍ حساب الأسئلة المتاحة…"
      : (available
        ? "المتاح في هذا النطاق: " + questionPhrase(available)
        : "لا يوجد سؤال متاح في هذا النطاق، فاختر دروسًا أخرى أو غيّر المستوى.");

    var ready = !loading && available !== null && available > 0 && setup.lessonIds.length > 0;

    return UI.pageHead({
      eyebrow: "تحدٍّ شامل",
      eyebrowIcon: "clock",
      title: "الاختبار المختلط",
      description: "اختر الدروس والمستوى والمؤقت وعدد الأسئلة، ثم اختبر نفسك دون تغذية راجعة أثناء الحل. الاختبارات لا تفتح المستويات، لكنها تسجّل نتائجها وأخطائها."
    }) +

      (errorMessage
        ? '<div class="alert alert--danger mb-5" role="alert">' + UI.icon("alert") +
          "<span>" + Utils.escapeHTML(errorMessage) + "</span></div>"
        : "") +

      '<div class="exam-setup">' +

        '<section class="card exam-config" aria-labelledby="exam-lessons-title">' +
          '<div class="exam-config__head">' +
            '<span class="icon-tile">' + UI.icon("book-open") + "</span>" +
            "<div><h2 id=\"exam-lessons-title\">١ · الدروس</h2>" +
            "<p>اختر درسًا واحدًا أو أكثر، وكل ما درسته متاح للاختبار.</p></div>" +
          "</div>" +
          '<div class="exam-config__toolbar">' +
            '<button class="btn btn--soft btn--sm" type="button" data-action="select-all">' +
              UI.icon("check") + " كل الدروس</button>" +
            '<button class="btn btn--ghost btn--sm" type="button" data-action="clear-all">' +
              UI.icon("x") + " إلغاء التحديد</button>" +
            '<span class="exam-config__count">' + availability + "</span>" +
          "</div>" +
          lessonsHtml(lessons) +
        "</section>" +

        '<section class="card exam-config" aria-labelledby="exam-level-title">' +
          '<div class="exam-config__head">' +
            '<span class="icon-tile icon-tile--gold">' + UI.icon("layers") + "</span>" +
            "<div><h2 id=\"exam-level-title\">٢ · المستوى</h2>" +
            "<p>امتحن مستوىً واحدًا أو كل المستويات بلا تمييز.</p></div>" +
          "</div>" +
          '<fieldset class="segmented exam-config__segmented">' + levelOptionsHtml() + "</fieldset>" +
        "</section>" +

        '<section class="card exam-config" aria-labelledby="exam-time-title">' +
          '<div class="exam-config__head">' +
            '<span class="icon-tile icon-tile--danger">' + UI.icon("clock") + "</span>" +
            "<div><h2 id=\"exam-time-title\">٣ · المؤقت وعدد الأسئلة</h2>" +
            "<p>ينتهي الاختبار تلقائيًا عند انتهاء الوقت، وتُحتسب الإجابات التي أجبت بها فقط.</p></div>" +
          "</div>" +
          '<div class="exam-config__grid">' +
            '<div><p class="field__label">مدة الاختبار</p>' +
              '<fieldset class="segmented exam-config__segmented">' + timerOptionsHtml() + "</fieldset></div>" +
            '<div><p class="field__label">عدد الأسئلة</p>' +
              '<fieldset class="segmented exam-config__segmented">' + countOptionsHtml() + "</fieldset></div>" +
          "</div>" +
          '<p class="exam-config__note">' + UI.icon("info") +
            " إن قلّ المتاح عن العدد المطلوب أُخذ المتاح كله، فلا يبقى سؤال بلا إجابة.</p>" +
        "</section>" +

        '<div class="exam-setup__footer">' +
          '<p class="text-muted">التقدّم في الاختبار: ' +
            "<strong>" + Utils.formatNumber(setup.count) + "</strong> أسئلة · " +
            "<strong>" + timerLabel(setup.timer) + "</strong> · " +
            "<strong>" + Utils.formatNumber(setup.lessonIds.length) + "</strong> دروس</p>" +
          '<button class="btn btn--primary btn--lg" type="button" data-action="start"' +
            (ready ? "" : " disabled") + ">" +
            (loading
              ? UI.icon("refresh") + " جارٍ التحضير…"
              : UI.icon("play") + " ابدأ الاختبار") +
          "</button>" +
        "</div>" +

      "</div>";
  }

  /* ------------------------------------------------------------------------
     شاشة الحل
     ------------------------------------------------------------------------ */

  function passageHtml(item) {
    var body = item.type === "tap"
      ? tapTextHtml(item)
      : '<p class="passage-text">' + Utils.escapeHTML(item.passageText) + "</p>";

    return '<article class="card passage-card">' +
      '<div class="passage-card__head">' +
        '<span class="badge badge--outline">' + UI.icon("file-text") + " " +
          Utils.escapeHTML(item.source || "نص تدريبي") + "</span>" +
        '<span class="passage-card__id">' + Utils.escapeHTML(item.passageId || "") + "</span>" +
      "</div>" +
      body +
    "</article>";
  }

  function tapTextHtml(item) {
    var selection = currentSelection();
    var parts = Utils.tokenizeArabic(item.passageText || "");
    var wordIndex = 0;

    return '<p class="passage-text passage-text--tap">' + parts.map(function (part) {
      if (!part.isWord) {
        return '<span class="tap-sep">' + Utils.escapeHTML(part.text) + "</span>";
      }
      var index = wordIndex;
      wordIndex += 1;
      var selected = selection && typeof selection.index === "number" && selection.index === index;
      return '<button class="tap-word' + (selected ? " is-selected" : "") + '" type="button" data-action="choose-word" data-index="' +
        index + '" data-word="' + Utils.escapeAttr(part.text) + '">' + Utils.escapeHTML(part.text) + "</button>";
    }).join("") + "</p>";
  }

  function optionsHtml(item) {
    var selection = currentSelection();

    return '<div class="options-list">' + item.display.map(function (option, index) {
      var selected = Boolean(selection && selection.index === index);
      return '<button class="option-button' + (selected ? " is-selected" : "") + '" type="button" data-action="choose" data-index="' +
        index + '">' +
        '<span class="option-letter">' + Nahw.engine.optionLetter(index) + "</span>" +
        "<span>" + Utils.escapeHTML(option.text) + "</span>" +
      "</button>";
    }).join("") + "</div>";
  }

  function currentSelection() {
    var session = Exam.getSession();
    if (!session) {
      return null;
    }
    return session.selections[session.index] || null;
  }

  function runningHtml() {
    var session = Exam.getSession();
    if (!session) {
      return setupHtml();
    }

    var item = Exam.currentItem(session);
    if (!item) {
      return setupHtml();
    }

    var total = session.items.length;
    var done = session.index;
    var percent = total > 0 ? Math.round((done / total) * 100) : 0;
    var remaining = Exam.remainingSeconds(session);
    var timerBox = session.deadline
      ? '<div class="exam-timer' + (remaining !== null && remaining <= 60 ? " is-warning" : "") + '" id="exam-timer" role="timer" aria-live="off">' +
          '<span class="exam-timer__label">الوقت المتبقي</span>' +
          '<strong class="exam-timer__value" id="exam-timer-value">' + Exam.formatClock(remaining) + "</strong>" +
        "</div>"
      : '<div class="exam-timer is-off"><span class="exam-timer__label">المدة</span>' +
          '<strong class="exam-timer__value">بدون مؤقت</strong></div>';

    return '<div class="exam-run">' +
      '<div class="exam-run__bar card">' +
        '<button class="btn btn--ghost btn--sm" type="button" data-action="quit">' +
          UI.icon("x") + " إنهاء الاختبار</button>" +
        '<div class="exam-run__meta">' +
          "<strong>السؤال " + Utils.formatNumber(session.index + 1) + " من " + Utils.formatNumber(total) + "</strong>" +
          "<span>" + Utils.escapeHTML(session.lessonTitles.join("، ")) + " · " +
            Utils.escapeHTML(session.levelLabel) + "</span>" +
        "</div>" +
        timerBox +
      "</div>" +

      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
        percent + '" aria-label="تقدّم الاختبار">' +
        '<div class="progress__bar" style="--value:' + percent + '%"></div>' +
      "</div>" +

      '<div class="exam-run__body">' +
        passageHtml(item) +
        '<article class="card question-card">' +
          '<p class="question-card__prompt">' + Utils.escapeHTML(item.prompt) + "</p>" +
          (item.type === "tap" ? "" : optionsHtml(item)) +
          '<p class="exam-run__hint">' + UI.icon("info") +
            " لا تُعرض الإجابة الصحيحة أثناء الاختبار، ويمكنك تغيير اختيارك حتى قبل التالي.</p>" +
        "</article>" +
      "</div>" +

      '<div class="exam-run__actions">' +
        '<button class="btn btn--primary" type="button" data-action="next">' +
          (session.index + 1 >= total ? UI.icon("trophy") + " إنهاء الاختبار وعرض النتيجة" : UI.icon("arrow-left") + " السؤال التالي") +
        "</button>" +
      "</div>" +
    "</div>";
  }

  /* ------------------------------------------------------------------------
     شاشة النتيجة
     ------------------------------------------------------------------------ */

  function reviewItemHtml(record, index) {
    var state = !record.answered ? "skipped" : (record.correct ? "correct" : "wrong");
    var label = state === "skipped" ? "بلا إجابة" : (state === "correct" ? "صحيحة" : "خاطئة");

    return '<article class="card exam-review__item exam-review__item--' + state + '">' +
      '<div class="exam-review__head">' +
        '<span class="badge ' + (state === "correct" ? "badge--success" : (state === "wrong" ? "badge--danger" : "badge--outline")) + '">' +
          UI.icon(state === "correct" ? "check" : (state === "wrong" ? "x" : "info")) + " " + label + "</span>" +
        '<span class="badge badge--outline">سؤال ' + Utils.formatNumber(index + 1) + "</span>" +
        (record.lessonId
          ? '<span class="badge badge--primary">الدرس ' + Utils.formatNumber(record.lessonId) + "</span>"
          : "") +
        (record.level ? Nahw.ui.levelBadge(record.level, "المستوى " + Utils.formatNumber(record.level)) : "") +
      "</div>" +
      '<p class="exam-review__prompt">' + Utils.escapeHTML(record.prompt) + "</p>" +
      '<div class="mistake-item__answers">' +
        '<div class="mistake-answer mistake-answer--wrong">' + UI.icon("x") +
          "<span>إجابتك: " + Utils.escapeHTML(record.chosenText || "—") + "</span></div>" +
        '<div class="mistake-answer mistake-answer--right">' + UI.icon("check") +
          "<span>الصحيحة: " + Utils.escapeHTML(record.correctText || "—") + "</span></div>" +
      "</div>" +
      (record.explain
        ? '<div class="tip-box mt-4">' + UI.icon("lightbulb") +
          "<span>" + Utils.escapeHTML(record.explain) + "</span></div>"
        : "") +
    "</article>";
  }

  function resultMessage(summary) {
    if (summary.total === 0) {
      return "انتهى الاختبار دون إجابات. ابدأ اختبارًا جديدًا لتحصل على نتيجة.";
    }
    if (summary.percent >= 90) {
      return "أداءٌ ممتاز! إتقانٌ واضحٌ لما درسته.";
    }
    if (summary.percent >= 70) {
      return "نتيجةٌ جيدة جدًا. راجع الأخطاء أدناه لتُغلق ما تبقّى.";
    }
    if (summary.percent >= 50) {
      return "نتيجةٌ قريبة. راجع أخطاءك، ثم أعد الاختبار لتتحسّن.";
    }
    return "ابدأ من مراجعة الدروس الضعيفة، ثم أعد الاختبار.";
  }

  function resultHtml() {
    var summary = Exam.getLastResult();
    if (!summary) {
      return setupHtml();
    }

    var minutes = Math.floor(summary.elapsedSeconds / 60);
    var seconds = summary.elapsedSeconds % 60;

    return '<div class="exam-result">' +
      '<section class="card exam-result__hero">' +
        '<div class="progress-ring" style="--progress:' + summary.percent + '" role="img" aria-label="نتيجة الاختبار ' + Utils.formatPercent(summary.percent) + '">' +
          '<div class="progress-ring__value"><strong>' + Utils.formatPercent(summary.percent) + "</strong><span>نتيجة الاختبار</span></div>" +
        "</div>" +
        '<div class="exam-result__text">' +
          "<h2>جبت " + Utils.formatNumber(summary.correct) + " من " + Utils.formatNumber(summary.total) + "</h2>" +
          "<p>" + resultMessage(summary) + "</p>" +
          '<div class="result-tags">' +
            '<span class="badge badge--outline">' + UI.icon("book") + " " +
              Utils.escapeHTML(summary.lessonTitles.join("، ")) + "</span>" +
            '<span class="badge badge--outline">' + UI.icon("layers") + " " + Utils.escapeHTML(summary.levelLabel) + "</span>" +
            '<span class="badge badge--outline">' + UI.icon("clock") + " " +
              Utils.formatNumber(minutes) + ":" + Utils.toArabicDigits(String(seconds).padStart(2, "0")) + " دقيقة</span>" +
            (summary.expired
              ? '<span class="badge badge--warning">' + UI.icon("alert") + " انتهى الوقت</span>"
              : '<span class="badge badge--success">' + UI.icon("check-circle") + " مكتمل</span>") +
          "</div>" +
          '<p class="exam-result__note">' + UI.icon("info") +
            " الاختبارات لا تفتح المستويات ولا تمنح نجومًا، لكنها أضافت أخطاءك إلى قائمة المراجعة.</p>" +
        "</div>" +
      "</section>" +

      '<div class="grid grid--3 mt-4">' +
        '<div class="stat-card"><div class="stat-card__top"><span class="stat-card__label">الأسئلة المُجابة</span>' +
          '<span class="icon-tile icon-tile--sm">' + UI.icon("list") + "</span></div>" +
          '<strong class="stat-card__value">' + Utils.formatNumber(summary.answeredCount) + "</strong>" +
          '<span class="stat-card__hint">من ' + Utils.formatNumber(summary.total) + " سؤالًا</span></div>" +
        '<div class="stat-card"><div class="stat-card__top"><span class="stat-card__label">أخطاء بانتظار المراجعة</span>' +
          '<span class="icon-tile icon-tile--sm icon-tile--danger">' + UI.icon("alert") + "</span></div>" +
          '<strong class="stat-card__value">' + Utils.formatNumber(summary.wrong.length) + "</strong>" +
          '<span class="stat-card__hint">أُضيفت إلى قائمة المراجعة</span></div>' +
        '<div class="stat-card"><div class="stat-card__top"><span class="stat-card__label">أسئلة بلا إجابة</span>' +
          '<span class="icon-tile icon-tile--sm icon-tile--gold">' + UI.icon("clock") + "</span></div>" +
          '<strong class="stat-card__value">' + Utils.formatNumber(summary.skipped.length) + "</strong>" +
          '<span class="stat-card__hint">لم تُحتسب ضمن النسبة</span></div>' +
      "</div>" +

      '<section class="mt-6" aria-labelledby="exam-review-title">' +
        "<h2 id=\"exam-review-title\">مراجعة الأسئلة (" + Utils.formatNumber(summary.records.length) + ")</h2>" +
        '<div class="exam-review__list">' + summary.records.map(reviewItemHtml).join("") + "</div>" +
      "</section>" +

      '<div class="result-actions">' +
        '<button class="btn btn--primary" type="button" data-action="restart">' + UI.icon("refresh") + " اختبار جديد</button>" +
        (summary.wrong.length
          ? '<a class="btn btn--secondary" href="#/mistakes">' + UI.icon("alert") + " راجع أخطائي (" + Utils.formatNumber(summary.wrong.length) + ")</a>"
          : "") +
        '<a class="btn btn--ghost" href="#/dashboard">' + UI.icon("chart") + " لوحة التقدم</a>" +
        '<a class="btn btn--ghost" href="#/">' + UI.icon("home") + " الرئيسية</a>" +
      "</div>" +
    "</div>";
  }

  /* ------------------------------------------------------------------------
     الرسم والتفاعل
     ------------------------------------------------------------------------ */

  function paint() {
    if (!root) {
      return;
    }

    if (view === "running") {
      root.innerHTML = runningHtml();
      return;
    }
    if (view === "result") {
      root.innerHTML = resultHtml();
      return;
    }
    root.innerHTML = setupHtml();
  }

  function render() {
    return '<div class="page container" id="exam-page"><div id="exam-root"></div></div>';
  }

  function mount(main) {
    root = main.querySelector("#exam-root");
    if (!root) {
      return null;
    }

    if (!setupReady) {
      setupReady = true;
      setup.lessonIds = availableLessons().map(function (lesson) { return lesson.id; });
    }

    /* عند فتح الشاشة ولا يوجد اختبار جارٍ: يُقرأ المؤقت الافتراضي من الإعدادات دائمًا. */
    var runningNow = Exam.getSession();
    if (!(view === "running" && runningNow && !runningNow.finished)) {
      setup.timer = Store.getSettings().examTimer || "none";
    }

    /* عند العودة إلى الشاشة: اختبارٌ منتهٍ يبدأ من جديد، واختبارٌ جارٍ يستأنف. */
    if (view === "result") {
      view = "setup";
      Exam.clear();
      errorMessage = "";
    } else if (view === "running") {
      var current = Exam.getSession();
      if (!current || current.finished) {
        view = "setup";
        Exam.clear();
      }
    }

    root.addEventListener("click", handleClick);
    root.addEventListener("change", handleChange);
    paint();

    if (view === "running") {
      startTimer();
    }

    return loadBanks().then(function () {
      banksReady = true;
      paint();
    });
  }

  function loadBanks() {
    var lessons = availableLessons();
    if (!lessons.length) {
      return Promise.resolve();
    }
    return Promise.all(lessons.map(function (lesson) {
      return Nahw.dataLoader.loadPassages(lesson.id).catch(function () {
        return null;
      });
    }));
  }

  function destroy() {
    stopTimer();
    root = null;
  }

  function handleChange(event) {
    var target = event.target;
    if (!target || !root || !root.contains(target)) {
      return;
    }

    if (target.name === "exam-lesson") {
      var id = Number(target.value);
      if (target.checked) {
        if (setup.lessonIds.indexOf(id) === -1) {
          setup.lessonIds.push(id);
        }
      } else {
        setup.lessonIds = setup.lessonIds.filter(function (item) {
          return item !== id;
        });
      }
      paint();
      return;
    }

    if (target.name === "exam-level") {
      setup.level = target.value;
      paint();
      return;
    }

    if (target.name === "exam-timer") {
      setup.timer = target.value;
      paint();
      return;
    }

    if (target.name === "exam-count") {
      setup.count = Number(target.value);
      paint();
    }
  }

  function handleClick(event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
    if (!target || !root || !root.contains(target)) {
      return;
    }

    var action = target.getAttribute("data-action");

    if (action === "select-all") {
      setup.lessonIds = availableLessons().map(function (lesson) { return lesson.id; });
      paint();
      return;
    }

    if (action === "clear-all") {
      setup.lessonIds = [];
      paint();
      return;
    }

    if (action === "start") {
      startExam();
      return;
    }

    if (action === "choose") {
      var session = Exam.getSession();
      if (!session) {
        return;
      }
      Exam.select(session, { kind: "option", index: Number(target.getAttribute("data-index")) });
      paint();
      return;
    }

    if (action === "choose-word") {
      var current = Exam.getSession();
      if (!current) {
        return;
      }
      Exam.select(current, {
        kind: "word",
        word: target.getAttribute("data-word"),
        index: Number(target.getAttribute("data-index"))
      });
      paint();
      return;
    }

    if (action === "next") {
      var outcome = Exam.next(Exam.getSession());
      if (outcome && outcome.done) {
        finishExam("complete");
      } else {
        paint();
      }
      return;
    }

    if (action === "quit") {
      UI.confirm({
        title: "إنهاء الاختبار الآن؟",
        message: "ستُحتسب الإجابات التي أجبت بها حتى الآن، وتُضاف أخطاؤك إلى قائمة المراجعة.",
        confirmLabel: "إنهاء الاختبار",
        cancelLabel: "متابعة الحل"
      }).then(function (confirmed) {
        if (confirmed) {
          finishExam("quit");
        }
      });
      return;
    }

    if (action === "restart") {
      stopTimer();
      Exam.clear();
      view = "setup";
      errorMessage = "";
      paint();
    }
  }

  /* ------------------------------------------------------------------------
     التشغيل والمؤقت
     ------------------------------------------------------------------------ */

  function startExam() {
    if (loading) {
      return;
    }

    loading = true;
    errorMessage = "";
    paint();

    Exam.buildSession({
      lessonIds: setup.lessonIds,
      level: setup.level,
      questionCount: setup.count,
      timerMinutes: setup.timer
    }).then(function () {
      loading = false;
      view = "running";
      paint();
      startTimer();
      Utils.scrollToTop();
    }).catch(function (error) {
      loading = false;
      errorMessage = error && error.message
        ? error.message
        : "تعذّر بدء الاختبار، حاول مرة أخرى.";
      view = "setup";
      paint();
    });
  }

  function startTimer() {
    stopTimer();
    var session = Exam.getSession();
    if (!session || !session.deadline) {
      return;
    }

    timerId = window.setInterval(function () {
      var current = Exam.getSession();
      if (!current || current.finished) {
        stopTimer();
        return;
      }

      var status = Exam.tick(current);
      updateTimer(status.remaining);

      if (status.expired) {
        stopTimer();
        announce("انتهى وقت الاختبار، وعُرضت النتيجة.");
        finishExam("time");
      }
    }, 1000);
  }

  function updateTimer(remaining) {
    if (!root || remaining === null) {
      return;
    }

    var node = root.querySelector("#exam-timer-value");
    if (!node) {
      return;
    }

    node.textContent = Exam.formatClock(remaining);

    var box = node.parentElement;
    if (box) {
      box.classList.toggle("is-warning", remaining <= 60);
    }

    if (remaining === 60 && !warned) {
      warned = true;
      announce("بقيت دقيقة واحدة على انتهاء الاختبار.");
    }
  }

  function finishExam(reason) {
    var session = Exam.getSession();
    if (!session) {
      return;
    }

    Exam.finish(session, reason);
    stopTimer();
    view = "result";
    paint();
    Utils.scrollToTop();
  }

  Nahw.screens = Nahw.screens || {};
  Nahw.screens.exam = {
    title: "الاختبار المختلط",
    nav: "exam",
    render: render,
    mount: mount,
    destroy: destroy
  };
})();
