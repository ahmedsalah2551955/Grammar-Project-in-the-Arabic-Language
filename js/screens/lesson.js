/* ==========================================================================
   صفحة الدرس
   الدرس الجاهز: شرحٌ موجز، وجدول القاعدة، وخمسة أمثلة معربة، وصندوق «تذكّر».
   الدرس غير الجاهز: صفحة «قيد الإعداد» واضحة مع زر رجوع.
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;
  var UI = Nahw.ui;
  var Data = Nahw.dataLoader;
  var Store = Nahw.store;

  var EXAMPLE_HEADERS = ["الكلمة", "الإعراب", "العلامة"];

  /* ------------------------------------------------------------------------
     حالة الدرس من التخزين (قراءة فقط، دون إنشاء سجلات فارغة)
     ------------------------------------------------------------------------ */

  function storedLevels(lessonId) {
    var lessons = Store.getState().lessons || {};
    var lesson = lessons[String(lessonId)];
    return lesson && lesson.levels ? lesson.levels : {};
  }

  function statusBadge(lesson) {
    if (!lesson.ready) {
      return { label: "قيد الإعداد", cls: "badge--outline badge--dot" };
    }
    var levels = storedLevels(lesson.id);
    var started = Object.keys(levels).some(function (key) {
      var level = levels[key];
      return level && (Number(level.attempts) > 0 || Boolean(level.passed));
    });
    var five = levels["5"];
    if (five && five.passed && Number(five.bestScore) >= 80) {
      return { label: "متقن", cls: "badge--success" };
    }
    if (started) {
      return { label: "قيد التقدم", cls: "badge--warning" };
    }
    return { label: "متاح", cls: "badge--primary" };
  }

  /* ------------------------------------------------------------------------
     أجزاء الصفحة
     ------------------------------------------------------------------------ */

  function explanationBlock(explanation) {
    var lines = Array.isArray(explanation) ? explanation : [];
    if (!lines.length) {
      return "";
    }
    return '<section class="lesson-block card" aria-labelledby="lesson-explain-title">' +
      "<h2 id=\"lesson-explain-title\">" + UI.icon("lightbulb") + " الشرح</h2>" +
      '<div class="lesson-block__body">' +
        '<ol class="lesson-explain">' +
          lines.map(function (line) {
            return "<li>" + Utils.escapeHTML(line) + "</li>";
          }).join("") +
        "</ol>" +
      "</div>" +
    "</section>";
  }

  function ruleTableBlock(ruleTable) {
    var table = ruleTable || {};
    var headers = Array.isArray(table.headers) ? table.headers : [];
    var rows = Array.isArray(table.rows) ? table.rows : [];
    if (!headers.length || !rows.length) {
      return "";
    }
    return '<section class="lesson-block card" aria-labelledby="lesson-rule-title">' +
      "<h2 id=\"lesson-rule-title\">" + UI.icon("list") + " جدول القاعدة</h2>" +
      '<div class="lesson-block__body">' +
        '<div class="rule-table-wrap">' +
          '<table class="rule-table rule-table--rules">' +
            "<caption class=\"visually-hidden\">" + Utils.escapeHTML(table.title || "جدول القاعدة") + "</caption>" +
            "<thead>" +
              "<tr>" + headers.map(function (header) {
                return '<th scope="col">' + Utils.escapeHTML(header) + "</th>";
              }).join("") + "</tr>" +
            "</thead>" +
            "<tbody>" +
              rows.map(function (row) {
                var cells = Array.isArray(row) ? row : [];
                return "<tr>" + cells.map(function (cell, index) {
                  var cls = index === cells.length - 1 ? ' class="reading"' : "";
                  return "<td" + cls + ">" + Utils.escapeHTML(cell) + "</td>";
                }).join("") + "</tr>";
              }).join("") +
            "</tbody>" +
          "</table>" +
        "</div>" +
      "</div>" +
    "</section>";
  }

  function parseTable(parsing) {
    var items = Array.isArray(parsing) ? parsing : [];
    if (!items.length) {
      return "";
    }
    return '<div class="rule-table-wrap example-card__table">' +
      '<table class="rule-table rule-table--parse">' +
        "<thead>" +
          "<tr>" + EXAMPLE_HEADERS.map(function (header) {
            return '<th scope="col">' + Utils.escapeHTML(header) + "</th>";
          }).join("") + "</tr>" +
        "</thead>" +
        "<tbody>" +
          items.map(function (item) {
            return "<tr>" +
              '<td class="reading" data-label="' + EXAMPLE_HEADERS[0] + '">' + Utils.escapeHTML(item.word) + "</td>" +
              '<td data-label="' + EXAMPLE_HEADERS[1] + '">' + Utils.escapeHTML(item.role) + "</td>" +
              '<td data-label="' + EXAMPLE_HEADERS[2] + '">' + Utils.escapeHTML(item.sign) + "</td>" +
            "</tr>";
          }).join("") +
        "</tbody>" +
      "</table>" +
    "</div>";
  }

  function exampleCard(example, index) {
    var words = Utils.formatWhitespace(example.sentence || "").split(/\s+/).filter(Boolean).length;
    return '<article class="example-card card">' +
      '<header class="example-card__head">' +
        '<span class="badge badge--primary">المثال ' + Utils.formatNumber(index + 1) + "</span>" +
        '<span class="example-card__count">' + Utils.formatNumber(words) + " كلمات</span>" +
      "</header>" +
      '<p class="example-card__sentence">' + Utils.escapeHTML(example.sentence) + "</p>" +
      parseTable(example.parsing) +
    "</article>";
  }

  function examplesBlock(examples) {
    var list = Array.isArray(examples) ? examples : [];
    if (!list.length) {
      return "";
    }
    return '<section class="lesson-block card" aria-labelledby="lesson-examples-title">' +
      "<h2 id=\"lesson-examples-title\">" + UI.icon("pen") + " الأمثلة المعربة</h2>" +
      '<div class="lesson-block__body lesson-examples">' +
        list.map(exampleCard).join("") +
      "</div>" +
    "</section>";
  }

  function tipBlock(tip) {
    var notes = Array.isArray(tip) ? tip : [];
    if (!notes.length) {
      return "";
    }
    return '<section class="lesson-block card" aria-labelledby="lesson-tip-title">' +
      "<h2 id=\"lesson-tip-title\">" + UI.icon("lightbulb") + " تذكّر</h2>" +
      '<div class="lesson-block__body">' +
        '<div class="tip-box">' +
          UI.icon("sparkles") +
          "<div>" +
            '<ul class="lesson-tips">' +
              notes.map(function (note) {
                return "<li>" + Utils.escapeHTML(note) + "</li>";
              }).join("") +
            "</ul>" +
          "</div>" +
        "</div>" +
      "</div>" +
    "</section>";
  }

  function lessonNav(lessonId) {
    var previousId = lessonId - 1;
    var nextId = lessonId + 1;
    var previous = previousId >= 1 ? Data.getLesson(previousId) : null;
    var next = nextId <= Nahw.constants.totalLessons ? Data.getLesson(nextId) : null;

    var links = "";
    if (previous) {
      links += '<a class="lesson-nav__link lesson-nav__link--prev" href="#/lesson/' + previous.id + '">' +
        UI.icon("arrow-right") +
        '<span class="lesson-nav__text"><small>الدرس السابق</small><strong>' +
        Utils.escapeHTML(previous.title) + "</strong></span>" +
      "</a>";
    }
    if (next) {
      links += '<a class="lesson-nav__link lesson-nav__link--next" href="#/lesson/' + next.id + '">' +
        '<span class="lesson-nav__text"><small>الدرس التالي</small><strong>' +
        Utils.escapeHTML(next.title) + "</strong></span>" +
        UI.icon("arrow-left") +
      "</a>";
    }
    if (!links) {
      return "";
    }
    return '<nav class="lesson-nav" aria-label="التنقل بين الدروس">' + links + "</nav>";
  }

  /* ------------------------------------------------------------------------
     الدرس الجاهز
     ------------------------------------------------------------------------ */

  function readyLessonPage(lesson, section) {
    var status = statusBadge(lesson);
    var meta =
      '<span class="badge badge--primary">' + UI.icon("book-open") + " الدرس " + Utils.formatNumber(lesson.id) + "</span>" +
      (section
        ? '<span class="badge badge--outline">' + UI.icon(section.icon) + " " + Utils.escapeHTML(section.title) + " · " + Utils.escapeHTML(section.range) + "</span>"
        : "") +
      '<span class="badge ' + status.cls + '">' + status.label + "</span>";

    var actions =
      '<a class="btn btn--primary" href="#/lesson/' + lesson.id + '/levels">' + UI.icon("play") + " ابدأ التدريب</a>" +
      '<a class="btn btn--ghost" href="#/">' + UI.icon("home") + " الرئيسية</a>";

    return '<div class="page container">' +
      '<header class="lesson-header">' +
        '<div class="lesson-header__meta">' + meta + "</div>" +
        "<h1>" + Utils.escapeHTML(lesson.title) + "</h1>" +
        (section
          ? "<p>" + Utils.escapeHTML(section.description) + "</p>"
          : "") +
        '<div class="lesson-header__actions">' + actions + "</div>" +
      "</header>" +

      '<div class="lesson-content">' +
        explanationBlock(lesson.explanation) +
        ruleTableBlock(lesson.ruleTable) +
        examplesBlock(lesson.examples) +
        tipBlock(lesson.tip) +
      "</div>" +

      lessonNav(lesson.id) +
    "</div>";
  }

  /* ------------------------------------------------------------------------
     الدرس غير الجاهز
     ------------------------------------------------------------------------ */

  function pendingLessonPage(lesson, section) {
    var firstReady = Data.getReadyLessons()[0];
    var actions =
      '<a class="btn btn--primary" href="#/">' + UI.icon("home") + " العودة للرئيسية</a>" +
      (firstReady
        ? '<a class="btn btn--ghost" href="#/lesson/' + firstReady.id + '">' + UI.icon("book-open") + " الدرس الجاهز الأول</a>"
        : "");

    return '<div class="page container">' +
      '<header class="lesson-header">' +
        '<div class="lesson-header__meta">' +
          '<span class="badge badge--primary">' + UI.icon("book-open") + " الدرس " + Utils.formatNumber(lesson.id) + "</span>" +
          (section
            ? '<span class="badge badge--outline">' + UI.icon(section.icon) + " " + Utils.escapeHTML(section.title) + " · " + Utils.escapeHTML(section.range) + "</span>"
            : "") +
          '<span class="badge badge--outline badge--dot">قيد الإعداد</span>' +
        "</div>" +
        "<h1>" + Utils.escapeHTML(lesson.title) + "</h1>" +
        "<p>سيُكتب شرح هذا الدرس وجدول قاعدته وأمثلته المعربة في حزمةٍ لاحقة.</p>" +
        '<div class="lesson-header__actions">' + actions + "</div>" +
      "</header>" +

      '<div class="lesson-content">' +
        '<section class="lesson-block card">' +
          '<div class="lesson-block__body">' +
            '<div class="tip-box">' + UI.icon("info") +
              "<div><p>هذا الدرس لم يُنشر بعد. الدروس الجاهزة الآن: " +
              Utils.formatNumber(Data.getReadyLessons().length) +
              " من " + Utils.formatNumber(Nahw.constants.totalLessons) +
              " درسًا، وهي في خريطة المنهج بالصفحة الرئيسية.</p></div>" +
            "</div>" +
          "</div>" +
        "</section>" +
      "</div>" +

      lessonNav(lesson.id) +
    "</div>";
  }

  /* ------------------------------------------------------------------------
     العرض
     ------------------------------------------------------------------------ */

  function notFoundPage() {
    return '<div class="page container">' + UI.placeholder({
      badge: "درس غير موجود",
      icon: "book-open",
      title: "لم نجد هذا الدرس",
      description: "رقم الدرس المطلوب خارج نطاق المنهج. اختر درسًا بين ١ و٥٣.",
      actions: '<a class="btn btn--primary" href="#/">' + UI.icon("home") + " العودة للرئيسية</a>"
    }) + "</div>";
  }

  function render(context) {
    var lessonId = Number(context.params.lessonId);
    if (!lessonId || lessonId < 1 || lessonId > Nahw.constants.totalLessons) {
      return notFoundPage();
    }

    var section = Utils.sectionForLesson(lessonId);
    var lesson = Data.getLesson(lessonId);

    if (lesson) {
      return lesson.ready ? readyLessonPage(lesson, section) : pendingLessonPage(lesson, section);
    }

    /* البيانات لم تُحمّل بعد: نعرض هيكلًا مؤقتًا ونملؤه في mount. */
    return '<div class="page container" id="lesson-root">' +
      '<div class="route-loading" role="status">' +
        '<span class="route-loading__dot"></span>' +
        "<span>جارٍ تحميل الدرس…</span>" +
      "</div>" +
    "</div>";
  }

  function mount(root, context) {
    var lessonId = Number(context.params.lessonId);
    var target = root.querySelector("#lesson-root");
    if (!target) {
      return null;
    }

    return Data.loadLessons()
      .then(function () {
        if (!target.isConnected) {
          return;
        }
        var lesson = Data.getLesson(lessonId);
        if (!lesson) {
          target.innerHTML = notFoundPage();
          UI.hydrateIcons(target);
          return;
        }
        var section = Utils.sectionForLesson(lessonId);
        target.innerHTML = lesson.ready ? readyLessonPage(lesson, section) : pendingLessonPage(lesson, section);
        UI.hydrateIcons(target);
      })
      .catch(function () {
        if (!target.isConnected) {
          return;
        }
        target.innerHTML = UI.placeholder({
          badge: "تعذّر التحميل",
          icon: "alert",
          title: "لم نتمكن من تحميل بيانات الدرس",
          description: "ولّد ملف بيانات الدروس بتنفيذ الأمر: python3 tools/build_data.py ثم أعد تحميل الصفحة.",
          actions: '<a class="btn btn--primary" href="#/">' + UI.icon("home") + " العودة للرئيسية</a>"
        });
        UI.hydrateIcons(target);
      });
  }

  function title(context) {
    var lessonId = Number(context.params.lessonId);
    var lesson = Data.getLesson(lessonId);
    if (!lesson) {
      return "الدرس " + Utils.formatNumber(lessonId);
    }
    return "الدرس " + Utils.formatNumber(lesson.id) + " · " + lesson.title;
  }

  Nahw.screens = Nahw.screens || {};
  Nahw.screens.lesson = {
    title: title,
    nav: "home",
    render: render,
    mount: mount
  };
})();
