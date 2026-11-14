/* ==========================================================================
   نَحْو — التخزين المحلي
   حالة واحدة بإصدار، مع دمج آمن للبيانات القديمة وحفظ فوري.
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;
  var KEY = Nahw.constants.storageKey;
  var VERSION = 1;
  var CORRUPT_KEY = KEY + ".corrupt";

  var storageAvailable = detectStorage();
  var listeners = [];

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function defaultState() {
    return {
      version: VERSION,
      settings: {
        theme: "system",
        openAllLevels: false,
        sessionSize: 5,
        examTimer: "none"
      },
      lessons: {},
      mistakes: {},
      seenPassages: {},
      solvedPassages: {},
      streak: {
        current: 0,
        best: 0,
        lastDay: null
      },
      examHistory: [],
      totals: {
        answered: 0,
        correct: 0,
        sessions: 0,
        passagesSolved: 0,
        studyDays: 0
      }
    };
  }

  function detectStorage() {
    try {
      var testKey = KEY + ".test";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function mergeDefaults(defaults, source) {
    if (Array.isArray(defaults)) {
      return Array.isArray(source) ? source.slice() : defaults.slice();
    }
    if (isPlainObject(defaults)) {
      var result = {};
      Object.keys(defaults).forEach(function (key) {
        result[key] = mergeDefaults(defaults[key], isPlainObject(source) ? source[key] : undefined);
      });
      if (isPlainObject(source)) {
        Object.keys(source).forEach(function (key) {
          if (!Object.prototype.hasOwnProperty.call(result, key)) {
            result[key] = source[key];
          }
        });
      }
      return result;
    }
    return source === undefined || source === null ? defaults : source;
  }

  function sanitize(raw) {
    var state = mergeDefaults(defaultState(), raw);
    state.version = VERSION;

    var themes = ["light", "dark", "system"];
    if (themes.indexOf(state.settings.theme) === -1) {
      state.settings.theme = "system";
    }

    state.settings.openAllLevels = Boolean(state.settings.openAllLevels);

    var sessionSize = Number(state.settings.sessionSize);
    state.settings.sessionSize = [3, 5, 10].indexOf(sessionSize) !== -1 ? sessionSize : 5;

    state.settings.examTimer = ["none", "10", "20", "30"].indexOf(String(state.settings.examTimer)) !== -1
      ? String(state.settings.examTimer)
      : "none";

    ["lessons", "mistakes", "seenPassages", "solvedPassages"].forEach(function (key) {
      if (!isPlainObject(state[key])) {
        state[key] = {};
      }
    });

    ["current", "best"].forEach(function (key) {
      var value = Number(state.streak[key]);
      state.streak[key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    });

    if (state.streak.lastDay !== null && typeof state.streak.lastDay !== "string") {
      state.streak.lastDay = null;
    }

    if (!Array.isArray(state.examHistory)) {
      state.examHistory = [];
    }

    ["answered", "correct", "sessions", "passagesSolved", "studyDays"].forEach(function (key) {
      var value = Number(state.totals[key]);
      state.totals[key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    });

    return state;
  }

  function readState() {
    if (!storageAvailable) {
      return defaultState();
    }
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) {
        return defaultState();
      }
      var parsed = JSON.parse(raw);
      if (!isPlainObject(parsed)) {
        throw new Error("صيغة التخزين غير صالحة");
      }
      return sanitize(parsed);
    } catch (error) {
      try {
        var corrupt = window.localStorage.getItem(KEY);
        if (corrupt) {
          window.localStorage.setItem(CORRUPT_KEY, corrupt);
        }
      } catch (copyError) {
        /* لا نعطّل التطبيق إن تعذّر الاحتفاظ بنسخة من البيانات التالفة */
      }
      return defaultState();
    }
  }

  var state = readState();

  function persist() {
    if (!storageAvailable) {
      return false;
    }
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      storageAvailable = false;
      return false;
    }
  }

  function notify(reason) {
    listeners.slice().forEach(function (listener) {
      try {
        listener(state, reason || { type: "change" });
      } catch (error) {
        /* لا تسمح لخطأ في مستمع واحد بإيقاف بقية الواجهة */
      }
    });
  }

  function commit(reason) {
    persist();
    notify(reason);
  }

  function getPath(path) {
    if (!path) {
      return state;
    }
    return String(path).split(".").reduce(function (current, part) {
      if (current == null) {
        return undefined;
      }
      return current[part];
    }, state);
  }

  function setPath(path, value) {
    var parts = String(path).split(".");
    var current = state;
    for (var index = 0; index < parts.length - 1; index += 1) {
      var part = parts[index];
      if (!isPlainObject(current[part]) && !Array.isArray(current[part])) {
        current[part] = {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
    commit({ type: "set", path: path });
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      return function () {};
    }
    listeners.push(listener);
    return function () {
      listeners = listeners.filter(function (item) {
        return item !== listener;
      });
    };
  }

  function updateSettings(patch) {
    Object.assign(state.settings, patch || {});
    state = sanitize(state);
    commit({ type: "settings" });
    return state.settings;
  }

  function getSettings() {
    return Object.assign({}, state.settings);
  }

  function getLessonState(lessonId) {
    var id = String(lessonId);
    if (!isPlainObject(state.lessons[id])) {
      state.lessons[id] = {};
    }
    if (!isPlainObject(state.lessons[id].levels)) {
      state.lessons[id].levels = {};
    }
    return state.lessons[id];
  }

  function getLevelState(lessonId, levelNumber) {
    var lesson = getLessonState(lessonId);
    var key = String(levelNumber);
    var existing = lesson.levels[key];
    var base = {
      bestScore: 0,
      lastScore: 0,
      attempts: 0,
      passed: false,
      stars: 0,
      completedAt: null,
      lastAt: null,
      lastReview: null
    };
    if (!isPlainObject(existing)) {
      lesson.levels[key] = base;
      return lesson.levels[key];
    }
    Object.keys(base).forEach(function (property) {
      if (existing[property] === undefined) {
        existing[property] = base[property];
      }
    });
    return existing;
  }

  function updateLevelState(lessonId, levelNumber, patch, reason) {
    var level = getLevelState(lessonId, levelNumber);
    Object.assign(level, patch || {});
    commit(reason || { type: "level", lessonId: Number(lessonId), level: Number(levelNumber) });
    return level;
  }

  function mistakeKey(passageId, questionId) {
    return String(passageId) + ":" + String(questionId);
  }

  function saveMistake(passageId, questionId, data) {
    var key = mistakeKey(passageId, questionId);
    state.mistakes[key] = Object.assign({}, data, {
      passageId: String(passageId),
      questionId: String(questionId),
      savedAt: (data && data.savedAt) || new Date().toISOString()
    });
    commit({ type: "mistake", key: key });
    return state.mistakes[key];
  }

  function removeMistake(passageId, questionId) {
    var key = mistakeKey(passageId, questionId);
    if (state.mistakes[key]) {
      delete state.mistakes[key];
      commit({ type: "mistake-removed", key: key });
      return true;
    }
    return false;
  }

  function markPassageSeen(passageId) {
    var id = String(passageId);
    if (!state.seenPassages[id]) {
      state.seenPassages[id] = new Date().toISOString();
      persist();
    }
  }

  /* سجل الاختبارات المختلطة: الأحدث أولًا، وبسقفٍ يحفظ الحجم معقولًا. */
  function addExamHistory(entry) {
    var history = Array.isArray(state.examHistory) ? state.examHistory : [];
    var record = Object.assign({}, entry || {});
    if (!record.date) {
      record.date = new Date().toISOString();
    }
    history.unshift(record);
    state.examHistory = history.slice(0, 30);
    commit({ type: "exam", id: record.id });
    return record;
  }

  function clearExamHistory() {
    state.examHistory = [];
    commit({ type: "exam-cleared" });
    return [];
  }

  function markPassageSolved(passageId, data) {
    var id = String(passageId);
    var now = new Date().toISOString();
    state.solvedPassages[id] = Object.assign({}, state.solvedPassages[id], data, { solvedAt: now });
    state.totals.passagesSolved = Object.keys(state.solvedPassages).length;
    commit({ type: "passage-solved", passageId: id });
    return state.solvedPassages[id];
  }

  function resetProgress() {
    var settings = state.settings;
    state = defaultState();
    state.settings = settings;
    commit({ type: "reset" });
  }

  function resetAll() {
    state = defaultState();
    try {
      if (storageAvailable) {
        window.localStorage.removeItem(KEY);
        window.localStorage.removeItem(CORRUPT_KEY);
      }
    } catch (error) {
      /* تجاهل تعذّر الحذف */
    }
    commit({ type: "reset-all" });
  }

  function exportState() {
    return JSON.parse(JSON.stringify(state));
  }

  window.addEventListener("storage", function (event) {
    if (event.key !== KEY) {
      return;
    }
    state = readState();
    notify({ type: "external-sync" });
  });

  Nahw.store = {
    version: VERSION,
    get persistent() {
      return storageAvailable;
    },
    getState: function () { return state; },
    snapshot: exportState,
    subscribe: subscribe,
    get: getPath,
    set: setPath,
    persist: persist,
    getSettings: getSettings,
    updateSettings: updateSettings,
    getLessonState: getLessonState,
    getLevelState: getLevelState,
    updateLevelState: updateLevelState,
    mistakeKey: mistakeKey,
    saveMistake: saveMistake,
    removeMistake: removeMistake,
    markPassageSeen: markPassageSeen,
    markPassageSolved: markPassageSolved,
    addExamHistory: addExamHistory,
    clearExamHistory: clearExamHistory,
    resetProgress: resetProgress,
    resetAll: resetAll,
    exportState: exportState
  };
})();
