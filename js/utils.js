/* ==========================================================================
   نَحْو — أدوات مساعدة عامة
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});

  var ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
  var ARABIC_MONTHS = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];
  var ARABIC_WEEKDAYS = [
    "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"
  ];
  var SHORT_WEEKDAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

  function toArabicDigits(value) {
    return String(value == null ? "" : value).replace(/[0-9]/g, function (digit) {
      return ARABIC_DIGITS.charAt(Number(digit));
    });
  }

  function toLatinDigits(value) {
    return String(value == null ? "" : value).replace(/[٠-٩]/g, function (digit) {
      return String(ARABIC_DIGITS.indexOf(digit));
    });
  }

  function formatNumber(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) {
      return toArabicDigits(0);
    }
    var rounded = Math.round(number);
    var grouped = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
    return (rounded < 0 ? "−" : "") + toArabicDigits(grouped);
  }

  function formatPercent(value, digits) {
    var number = Number(value);
    if (!Number.isFinite(number)) {
      number = 0;
    }
    var rounded = digits ? Number(number.toFixed(digits)) : Math.round(number);
    return toArabicDigits(rounded) + "٪";
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHTML(value).replace(/`/g, "&#96;");
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(Number(value) || 0, min), max);
  }

  function todayKey(date) {
    var d = date instanceof Date ? date : new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function addDays(date, days) {
    var d = new Date(date instanceof Date ? date.getTime() : Date.now());
    d.setDate(d.getDate() + days);
    return d;
  }

  function daysBetween(fromKey, toKeyValue) {
    var from = new Date(fromKey + "T12:00:00");
    var to = new Date(toKeyValue + "T12:00:00");
    return Math.round((to.getTime() - from.getTime()) / 86400000);
  }

  function formatDateArabic(date) {
    var d = date instanceof Date ? date : new Date();
    return ARABIC_WEEKDAYS[d.getDay()] + " " + toArabicDigits(d.getDate()) + " " + ARABIC_MONTHS[d.getMonth()];
  }

  function formatShortDateArabic(date) {
    var d = date instanceof Date ? date : new Date();
    return toArabicDigits(d.getDate()) + " " + ARABIC_MONTHS[d.getMonth()];
  }

  function shortWeekday(date) {
    var d = date instanceof Date ? date : new Date();
    return SHORT_WEEKDAYS[d.getDay()];
  }

  function greeting(date) {
    var hour = (date instanceof Date ? date : new Date()).getHours();
    if (hour < 12) {
      return "صباح الخير";
    }
    if (hour < 17) {
      return "نهارك سعيد";
    }
    return "مساء الخير";
  }

  function arabicPlural(count, forms) {
    var n = Math.abs(Number(count) || 0);
    var mod100 = n % 100;
    if (n === 1) {
      return forms.one;
    }
    if (n === 2) {
      return forms.two;
    }
    if (mod100 >= 3 && mod100 <= 10) {
      return forms.few;
    }
    return forms.many;
  }

  function passageWord(count) {
    return arabicPlural(count, {
      one: "قطعة واحدة",
      two: "قطعتان",
      few: "قطع",
      many: "قطعة"
    });
  }

  function questionWord(count) {
    return arabicPlural(count, {
      one: "سؤال واحد",
      two: "سؤالين",
      few: "أسئلة",
      many: "سؤالًا"
    });
  }

  function lessonWord(count) {
    return arabicPlural(count, {
      one: "درس واحد",
      two: "درسان",
      few: "دروس",
      many: "درسًا"
    });
  }

  function dayWord(count) {
    return arabicPlural(count, {
      one: "يوم واحد",
      two: "يومان",
      few: "أيام",
      many: "يومًا"
    });
  }

  function getWeekDays(count, endDate) {
    var total = count || 7;
    var end = endDate instanceof Date ? endDate : new Date();
    var days = [];
    for (var index = total - 1; index >= 0; index -= 1) {
      var date = addDays(end, -index);
      days.push({
        date: date,
        key: todayKey(date),
        weekday: shortWeekday(date),
        day: toArabicDigits(date.getDate()),
        isToday: index === 0
      });
    }
    return days;
  }

  function uid(prefix) {
    var base = prefix ? String(prefix) + "-" : "";
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return base + window.crypto.randomUUID();
    }
    return base + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-nahw-src="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }
        existing.addEventListener("load", function () { resolve(); }, { once: true });
        existing.addEventListener("error", function () { reject(new Error("تعذّر تحميل " + src)); }, { once: true });
        return;
      }

      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.nahwSrc = src;
      script.addEventListener("load", function () {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", function () {
        script.remove();
        reject(new Error("تعذّر تحميل " + src));
      }, { once: true });
      document.head.appendChild(script);
    });
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var self = this;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        fn.apply(self, args);
      }, wait);
    };
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isStandalone() {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true;
  }

  function scrollToTop() {
    if (prefersReducedMotion()) {
      window.scrollTo(0, 0);
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function queryParams(search) {
    var params = {};
    if (!search) {
      return params;
    }
    try {
      new URLSearchParams(search).forEach(function (value, key) {
        params[key] = value;
      });
    } catch (error) {
      /* تجاهل عنوان استعلام غير صالح */
    }
    return params;
  }

  var SECTIONS = [
    {
      id: "basics",
      title: "الأساسيات",
      range: "١–١٠",
      from: 1,
      to: 10,
      icon: "book",
      description: "الكلمة وأقسامها، والاسم، والفعل، والحرف، وعلامات الإعراب الأولى."
    },
    {
      id: "marfoo",
      title: "المرفوعات",
      range: "١١–١٤",
      from: 11,
      to: 14,
      icon: "arrow-up",
      description: "الفاعل ونائب الفاعل، والمبتدأ والخبر، وما يرفع من الأسماء."
    },
    {
      id: "nawasikh",
      title: "النواسخ",
      range: "١٥–١٩",
      from: 15,
      to: 19,
      icon: "layers",
      description: "كان وأخواتها، وإنّ وأخواتها، وظنّ وأخواتها، وأثرها في الجملة."
    },
    {
      id: "mansoob",
      title: "المنصوبات",
      range: "٢٠–٢٨",
      from: 20,
      to: 28,
      icon: "pen",
      description: "المفعول به والمطلق، والحال والتمييز، والمنصوبات الأخرى."
    },
    {
      id: "majroor",
      title: "المجرورات",
      range: "٢٩–٣٠",
      from: 29,
      to: 30,
      icon: "link",
      description: "حروف الجر، والإضافة، وعلامات الجر في الاسم."
    },
    {
      id: "far3i",
      title: "العلامات الفرعية",
      range: "٣١–٣٦",
      from: 31,
      to: 36,
      icon: "branch",
      description: "الألف والواو والياء، وجمع المؤنث السالم، والمثنى، وجمع المذكر."
    },
    {
      id: "tawabi",
      title: "التوابع",
      range: "٣٧–٤٠",
      from: 37,
      to: 40,
      icon: "copy",
      description: "النعت والعطف والبدل والتوكيد، واتباعها لما قبلها في الإعراب."
    },
    {
      id: "af3al",
      title: "إعراب الفعل والأساليب",
      range: "٤١–٤٨",
      from: 41,
      to: 48,
      icon: "compass",
      description: "رفع الفعل ونصبه وجزمه، والأساليب النحوية والنداء والاستفهام."
    },
    {
      id: "mushtaqqat",
      title: "المشتقات",
      range: "٤٩–٥٣",
      from: 49,
      to: 53,
      icon: "sparkles",
      description: "اسم الفاعل واسم المفعول، والصفة المشبهة، وصيغ المبالغة."
    }
  ];

  var LEVELS = [
    {
      number: 1,
      name: "سهل",
      family: "سهل",
      length: "٣–٦ كلمات",
      questions: "سؤال واحد",
      description: "سؤال مباشر بإجابة واضحة.",
      passScore: 70
    },
    {
      number: 2,
      name: "سهل متوسط",
      family: "سهل",
      length: "٦–١٠ كلمات",
      questions: "سؤالان",
      description: "تحديد العلامة مع إعراب مبسّط.",
      passScore: 70
    },
    {
      number: 3,
      name: "متوسط",
      family: "متوسط",
      length: "جملتان",
      questions: "ثلاثة أسئلة",
      description: "تحديد وإعراب وعلامة الإعراب.",
      passScore: 70
    },
    {
      number: 4,
      name: "صعب متوسط",
      family: "متقدم",
      length: "٢–٣ جمل",
      questions: "٣–٤ أسئلة",
      description: "فراغ وتحويل مع مراجعة الدروس السابقة.",
      passScore: 70
    },
    {
      number: 5,
      name: "صعب",
      family: "متقدم",
      length: "٣–٤ جمل",
      questions: "٤–٥ أسئلة",
      description: "إعراب كامل، وتصحيح خطأ، وتعليل.",
      passScore: 70
    }
  ];

  function sectionById(id) {
    return SECTIONS.find(function (section) { return section.id === id; }) || null;
  }

  function levelByNumber(number) {
    return LEVELS.find(function (level) { return level.number === Number(number); }) || null;
  }

  function sectionForLesson(lessonId) {
    var id = Number(lessonId);
    return SECTIONS.find(function (section) {
      return id >= section.from && id <= section.to;
    }) || null;
  }

  function formatWhitespace(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  /* ------------------------------------------------------------------------
     معالجة النص العربي: تجريد التشكيل، والتطبيع، وتقطيع النص إلى كلمات.
     تُستعمل في مقارنة إجابات سؤال «الضغط على كلمة» مع نص القطعة.
     ------------------------------------------------------------------------ */

  var TASHKEEL_PATTERN = /[\u064B-\u0655\u0670\u0640]/g;
  var ARABIC_PUNCTUATION = "\u060C\u061B\u061F\u066A\u066B\u066C\u066D\u06D4\u00AB\u00BB";
  var PUNCTUATION_PATTERN = new RegExp("[" + ARABIC_PUNCTUATION + "\\.,;:?!()\\[\\]{}\"'\\u201C\\u201D\\u2018\\u2019\u2026\u2013\u2014\\\\|\\/+=<>_-]+", "g");
  var WORD_PATTERN = /[\u0621-\u064A\u0640\u064B-\u0655\u0670]+/g;

  function stripTashkeel(value) {
    return String(value == null ? "" : value).replace(TASHKEEL_PATTERN, "");
  }

  function normalizeArabic(value) {
    return stripTashkeel(value)
      .replace(PUNCTUATION_PATTERN, " ")
      .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
      .replace(/\u0649/g, "\u064A")
      .replace(/\u0629/g, "\u0647")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenizeArabic(value) {
    var text = String(value == null ? "" : value);
    var parts = [];
    var index = 0;
    var match;

    WORD_PATTERN.lastIndex = 0;
    while ((match = WORD_PATTERN.exec(text)) !== null) {
      if (match.index > index) {
        parts.push({ isWord: false, text: text.slice(index, match.index) });
      }
      parts.push({ isWord: true, text: match[0] });
      index = match.index + match[0].length;
    }
    if (index < text.length) {
      parts.push({ isWord: false, text: text.slice(index) });
    }
    return parts;
  }

  Nahw.utils = {
    toArabicDigits: toArabicDigits,
    toLatinDigits: toLatinDigits,
    formatNumber: formatNumber,
    formatPercent: formatPercent,
    pad2: pad2,
    escapeHTML: escapeHTML,
    escapeAttr: escapeAttr,
    clamp: clamp,
    todayKey: todayKey,
    addDays: addDays,
    daysBetween: daysBetween,
    formatDateArabic: formatDateArabic,
    formatShortDateArabic: formatShortDateArabic,
    shortWeekday: shortWeekday,
    greeting: greeting,
    arabicPlural: arabicPlural,
    passageWord: passageWord,
    questionWord: questionWord,
    lessonWord: lessonWord,
    dayWord: dayWord,
    getWeekDays: getWeekDays,
    uid: uid,
    loadScript: loadScript,
    debounce: debounce,
    prefersReducedMotion: prefersReducedMotion,
    isStandalone: isStandalone,
    scrollToTop: scrollToTop,
    queryParams: queryParams,
    sectionById: sectionById,
    levelByNumber: levelByNumber,
    sectionForLesson: sectionForLesson,
    formatWhitespace: formatWhitespace,
    stripTashkeel: stripTashkeel,
    normalizeArabic: normalizeArabic,
    tokenizeArabic: tokenizeArabic
  };

  Nahw.constants = {
    appName: "نَحْو",
    appTitle: "نَحْو — منصة النحو العربي",
    version: "0.5.0",
    storageKey: "nahw.v1",
    totalLessons: 53,
    firstReleasePassages: 250,
    firstReleaseQuestions: 650,
    sections: SECTIONS,
    levels: LEVELS
  };
})();
