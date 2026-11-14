/* ==========================================================================
   نَحْو — تحميل بيانات الدروس والقطع
   يعتمد على ملفات JavaScript مولّدة حتى يعمل التطبيق عبر file://.
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;

  var lessons = null;
  var sections = null;
  var lessonsPromise = null;
  var passagePromises = {};
  var passageCache = {};

  function globalData() {
    return window.NahwData && typeof window.NahwData === "object" ? window.NahwData : null;
  }

  function lessonKey(lessonId) {
    return "L" + Utils.pad2(Number(lessonId));
  }

  function normalizeLesson(lesson) {
    if (!lesson || typeof lesson !== "object") {
      return null;
    }
    return Object.assign({}, lesson, {
      id: Number(lesson.id),
      ready: Boolean(lesson.ready),
      examples: Array.isArray(lesson.examples) ? lesson.examples : [],
      explanation: Array.isArray(lesson.explanation) ? lesson.explanation : [],
      tip: Array.isArray(lesson.tip) ? lesson.tip : (lesson.tip ? [lesson.tip] : []),
      passageCount: Number(lesson.passageCount) || 0,
      questionCount: Number(lesson.questionCount) || 0
    });
  }

  function syncFromGlobal() {
    var data = globalData();
    if (!data) {
      return false;
    }
    if (Array.isArray(data.lessons) && data.lessons.length) {
      lessons = data.lessons.map(normalizeLesson).filter(Boolean);
    }
    if (Array.isArray(data.sections) && data.sections.length) {
      sections = data.sections;
    }
    if (data.passages && typeof data.passages === "object") {
      Object.keys(data.passages).forEach(function (key) {
        passageCache[key] = data.passages[key];
      });
    }
    return true;
  }

  function loadLessons() {
    if (Array.isArray(lessons)) {
      return Promise.resolve(lessons);
    }
    if (lessonsPromise) {
      return lessonsPromise;
    }
    if (syncFromGlobal() && Array.isArray(lessons)) {
      return Promise.resolve(lessons);
    }

    lessonsPromise = Utils.loadScript("data/lessons.js")
      .then(function () {
        syncFromGlobal();
        if (!Array.isArray(lessons)) {
          lessons = [];
        }
        return lessons;
      })
      .catch(function (error) {
        lessonsPromise = null;
        throw error;
      });

    return lessonsPromise;
  }

  function loadPassages(lessonId) {
    var id = Number(lessonId);
    var key = lessonKey(id);

    if (passageCache[key]) {
      return Promise.resolve(passageCache[key]);
    }
    if (passagePromises[key]) {
      return passagePromises[key];
    }

    syncFromGlobal();
    if (passageCache[key]) {
      return Promise.resolve(passageCache[key]);
    }

    /* درس بلا بنك قطع (لم يُسلَّم بعد) لا نحاول تحميل ملفه، تفاديًا لطلب فاشل. */
    if (Array.isArray(lessons)) {
      var lesson = lessons.find(function (item) {
        return Number(item.id) === id;
      });
      if (lesson && Number(lesson.passageCount) === 0) {
        passageCache[key] = { lesson: id, passageCount: 0, questionCount: 0, levels: {} };
        return Promise.resolve(passageCache[key]);
      }
    }

    passagePromises[key] = Utils.loadScript("data/" + key + ".js")
      .then(function () {
        syncFromGlobal();
        if (!passageCache[key]) {
          throw new Error("لم تُعثر على بيانات قطع " + key);
        }
        return passageCache[key];
      })
      .catch(function (error) {
        delete passagePromises[key];
        throw error;
      });

    return passagePromises[key];
  }

  function getLessons() {
    return Array.isArray(lessons) ? lessons.slice() : [];
  }

  function getSections() {
    if (Array.isArray(sections) && sections.length) {
      return sections.slice();
    }
    return Nahw.constants.sections.slice();
  }

  function getLesson(lessonId) {
    var id = Number(lessonId);
    if (!Array.isArray(lessons)) {
      return null;
    }
    return lessons.find(function (lesson) {
      return Number(lesson.id) === id;
    }) || null;
  }

  function getReadyLessons() {
    return getLessons().filter(function (lesson) {
      return lesson.ready;
    });
  }

  function getPassageFile(lessonId) {
    return passageCache[lessonKey(lessonId)] || null;
  }

  function getPassages(lessonId, levelNumber) {
    var file = getPassageFile(lessonId);
    if (!file) {
      return [];
    }
    if (levelNumber && file.levels && Array.isArray(file.levels[String(levelNumber)])) {
      return file.levels[String(levelNumber)].slice();
    }
    if (Array.isArray(file.passages)) {
      return file.passages.filter(function (passage) {
        return !levelNumber || Number(passage.level) === Number(levelNumber);
      });
    }
    if (file.levels && typeof file.levels === "object") {
      return Object.keys(file.levels).reduce(function (all, level) {
        if (levelNumber && Number(level) !== Number(levelNumber)) {
          return all;
        }
        return all.concat(file.levels[level]);
      }, []);
    }
    return [];
  }

  function isLoaded(lessonId) {
    if (!lessonId) {
      return Array.isArray(lessons);
    }
    return Boolean(passageCache[lessonKey(lessonId)]);
  }

  Nahw.dataLoader = {
    loadLessons: loadLessons,
    loadPassages: loadPassages,
    getLessons: getLessons,
    getSections: getSections,
    getLesson: getLesson,
    getReadyLessons: getReadyLessons,
    getPassages: getPassages,
    getPassageFile: getPassageFile,
    lessonKey: lessonKey,
    isLoaded: isLoaded
  };
})();
