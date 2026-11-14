/* ==========================================================================
   نَحْو — مراجعة الأخطاء
   تعرض الأسئلة المحفوظة وتتيح إعادة محاولة كل سؤال؛ فمن أجاب إجابة صحيحة
   في المراجعة أُزيل الخطأ من القائمة.
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;
  var UI = Nahw.ui;
  var Store = Nahw.store;
  var Progress = Nahw.progress;
  var Engine = Nahw.engine;

  var attempts = {};
  var resolved = {};
  var timers = [];
  var root = null;

  function renderMistake(mistake) {
    var key = Store.mistakeKey(mistake.passageId, mistake.questionId);
    var attempt = attempts[key];
    var lessonId = Number(mistake.lessonId) || null;
    var level = Number(mistake.level) || null;
    var prompt = mistake.prompt || "سؤال محفوظ للمراجعة";
    var type = mistake.type || "mcq";

    var head = '<div class="mistake-item__head">' +
      '<div class="cluster">' +
        (lessonId ? '<span class="badge badge--primary">الدرس ' + Utils.formatNumber(lessonId) + "</span>" : "") +
        (level ? UI.levelBadge(level, "المستوى " + Utils.formatNumber(level)) : "") +
        '<span class="badge badge--outline">' + Utils.escapeHTML(mistake.passageId || "") + "</span>" +
      "</div>" +
      (lessonId ? '<a class="btn btn--ghost btn--sm" href="#/lesson/' + lessonId + '/levels">' +
        "راجع الدرس " + UI.icon("arrow-left") + "</a>" : "") +
    "</div>";

    var promptBlock = '<p class="mistake-item__prompt">' + Utils.escapeHTML(prompt) + "</p>";

    var reviewBlock = "";
    if (type === "tap") {
      reviewBlock = '<div class="mistake-review">' +
        '<p class="mistake-review__label">' + UI.icon("target") +
          " اضغط على الكلمة الصحيحة في النص</p>" +
        tapTextHtml(mistake, attempt) +
      "</div>";
    } else if (Array.isArray(mistake.options) && mistake.options.length) {
      reviewBlock = '<div class="mistake-review">' +
        '<p class="mistake-review__label">' + UI.icon("refresh") +
          " أعد المحاولة: اختر الإجابة الصحيحة</p>" +
        '<div class="options-list options-list--compact">' +
        mistake.options.map(function (option, index) {
          var classes = ["option-button"];
          var isCorrect = index === Number(mistake.answerIndex);
          if (attempt) {
            if (isCorrect) {
              classes.push("is-correct");
            } else if (attempt.chosenIndex === index) {
              classes.push("is-wrong");
            }
          }
          return '<button class="' + classes.join(" ") + '" type="button" data-action="review" data-key="' +
            Utils.escapeAttr(key) + '" data-index="' + index + '"' +
            (attempt && attempt.status === "correct" ? " disabled" : "") + ">" +
            '<span class="option-letter">' + Engine.optionLetter(index) + "</span>" +
            "<span>" + Utils.escapeHTML(option) + "</span>" +
          "</button>";
        }).join("") +
      "</div></div>";
    }

    var feedback = "";
    if (attempt && attempt.status === "wrong") {
      feedback = '<div class="answer-feedback answer-feedback--wrong" role="status" aria-live="polite">' +
        '<div class="answer-feedback__head">' + UI.icon("alert") + "<strong>حاول مرة أخرى</strong></div>" +
        '<p class="answer-feedback__correct">الإجابة الصحيحة: ' +
          Utils.escapeHTML(mistake.correctText || "—") + "</p>" +
      "</div>";
    } else if (attempt && attempt.status === "correct") {
      feedback = '<div class="answer-feedback answer-feedback--correct" role="status" aria-live="polite">' +
        '<div class="answer-feedback__head">' + UI.icon("check-circle") + "<strong>أحسنت! أُزيل الخطأ.</strong></div>" +
      "</div>";
    }

    var answers = '<div class="mistake-item__answers">' +
      '<div class="mistake-answer mistake-answer--wrong">' + UI.icon("x") +
        "<span>إجابتك: " + Utils.escapeHTML(mistake.chosenText || "—") + "</span></div>" +
      '<div class="mistake-answer mistake-answer--right">' + UI.icon("check") +
        "<span>الصحيحة: " + Utils.escapeHTML(mistake.correctText || "—") + "</span></div>" +
    "</div>";

    var explain = mistake.explain
      ? '<div class="tip-box mt-4">' + UI.icon("lightbulb") +
        "<span>" + Utils.escapeHTML(mistake.explain) + "</span></div>"
      : "";

    return '<article class="card mistake-item" data-key="' + Utils.escapeAttr(key) + '">' +
      head +
      promptBlock +
      reviewBlock +
      feedback +
      answers +
      explain +
    "</article>";
  }

  function tapTextHtml(mistake, attempt) {
    var parts = Utils.tokenizeArabic(mistake.passageText || "");
    var locked = Boolean(attempt && attempt.status === "correct");

    return '<p class="passage-text passage-text--tap passage-text--review">' + parts.map(function (part) {
      if (!part.isWord) {
        return '<span class="tap-sep">' + Utils.escapeHTML(part.text) + "</span>";
      }
      var key = Utils.normalizeArabic(part.text);
      var answerKey = Utils.normalizeArabic(mistake.answerWord || "");
      var classes = ["tap-word"];
      if (locked && key === answerKey) {
        classes.push("is-correct");
      }
      if (attempt && attempt.status === "wrong" && attempt.chosenKey === key) {
        classes.push("is-wrong");
      }
      return '<button class="' + classes.join(" ") + '" type="button" data-action="review-tap" data-key="' +
        Utils.escapeAttr(Store.mistakeKey(mistake.passageId, mistake.questionId)) + '" data-word="' +
        Utils.escapeAttr(part.text) + '"' + (locked ? " disabled" : "") + ">" +
        Utils.escapeHTML(part.text) + "</button>";
    }).join("") + "</p>";
  }

  function render() {
    var mistakes = Progress.getMistakes();
    var empty = mistakes.length === 0;

    return '<div class="page container narrow" id="mistakes-root">' +
      UI.pageHead({
        eyebrow: "مراجعة مركّزة",
        eyebrowIcon: "alert",
        title: "أخطائي",
        description: "كل خطأ يُحفظ مع نص السؤال والإجابة الصحيحة والتفسير. أعد محاولة السؤال، ومن يجيب إجابة صحيحة يُزال الخطأ من القائمة."
      }) +

      '<div class="mistakes-summary">' +
        '<div class="mistakes-summary__count">' +
          '<span class="icon-tile icon-tile--danger">' + UI.icon("alert") + "</span>" +
          "<div><strong>" + Utils.formatNumber(mistakes.length) + " " + Utils.questionWord(mistakes.length) + "</strong>" +
          '<p class="text-muted">بانتظار المراجعة</p></div>' +
        "</div>" +
        (empty ? "" : '<a class="btn btn--soft btn--sm" href="#/dashboard">' + UI.icon("chart") + " لوحة التقدم</a>") +
      "</div>" +

      (empty
        ? UI.emptyState({
            icon: "check-circle",
            title: "لا توجد أخطاء محفوظة",
            description: "ستظهر هنا الأسئلة التي تحتاج إلى مراجعة بعد إكمال التدريبات. أحسنت حتى الآن!",
            action: '<a class="btn btn--primary" href="#/">' + UI.icon("home") + " العودة للرئيسية</a>"
          })
        : '<div class="mistake-list" id="mistake-list">' + mistakes.map(renderMistake).join("") + "</div>") +
    "</div>";
  }

  function mount(main) {
    root = main.querySelector("#mistakes-root");
    if (!root) {
      return null;
    }
    root.addEventListener("click", handleClick);
    return null;
  }

  function destroy() {
    root = null;
    attempts = {};
    resolved = {};
    timers.forEach(function (timer) {
      window.clearTimeout(timer);
    });
    timers = [];
  }

  function handleClick(event) {
    var target = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
    if (!target || !root || !root.contains(target)) {
      return;
    }

    var action = target.getAttribute("data-action");
    if (action !== "review" && action !== "review-tap") {
      return;
    }

    var key = target.getAttribute("data-key");
    var mistake = findMistake(key);
    if (!mistake) {
      return;
    }

    var choice = action === "review"
      ? { kind: "option", index: Number(target.getAttribute("data-index")) }
      : { kind: "word", word: target.getAttribute("data-word") };

    var outcome = Engine.reviewMistake(mistake, choice);

    if (outcome.correct) {
      attempts[key] = { status: "correct", chosenIndex: Number(target.getAttribute("data-index")) };
      resolved[key] = mistake;
      Store.removeMistake(mistake.passageId, mistake.questionId);
      UI.toast("أحسنت! أُزيل الخطأ من قائمة المراجعة.", "success");
      repaint();
      timers.push(window.setTimeout(function () {
        delete resolved[key];
        repaint();
      }, 2600));
      return;
    }

    attempts[key] = {
      status: "wrong",
      chosenIndex: Number(target.getAttribute("data-index")),
      chosenKey: Utils.normalizeArabic(choice.word || "")
    };
    Store.saveMistake(mistake.passageId, mistake.questionId, Object.assign({}, mistake, {
      chosenText: outcome.chosenText
    }));
    repaint();
  }

  function findMistake(key) {
    var mistakes = Progress.getMistakes();
    for (var index = 0; index < mistakes.length; index += 1) {
      if (Store.mistakeKey(mistakes[index].passageId, mistakes[index].questionId) === key) {
        return mistakes[index];
      }
    }
    return null;
  }

  function repaint() {
    if (!root) {
      return;
    }
    var list = root.querySelector("#mistake-list");
    var mistakes = Progress.getMistakes();

    if (!list) {
      return;
    }

    Object.keys(resolved).forEach(function (key) {
      var mistake = resolved[key];
      if (mistakes.every(function (item) {
        return Store.mistakeKey(item.passageId, item.questionId) !== key;
      })) {
        mistakes = mistakes.concat([mistake]);
      }
    });

    if (!mistakes.length) {
      root.innerHTML = render();
      return;
    }

    list.innerHTML = mistakes.map(renderMistake).join("");
  }

  Nahw.screens = Nahw.screens || {};
  Nahw.screens.mistakes = {
    title: "أخطائي",
    nav: "mistakes",
    render: render,
    mount: mount,
    destroy: destroy
  };
})();
