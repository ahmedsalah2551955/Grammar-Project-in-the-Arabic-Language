/* ==========================================================================
   نَحْو — قواعد التقدم والحسابات المشتقة
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;
  var Store = Nahw.store;

  var LEVEL_NUMBERS = [1, 2, 3, 4, 5];

  function touchStreak(date) {
    var now = date instanceof Date ? date : new Date();
    var today = Utils.todayKey(now);
    var current = Store.getState().streak;

    if (current.lastDay === today) {
      return { changed: false, current: current.current, best: current.best };
    }

    var yesterday = Utils.todayKey(Utils.addDays(now, -1));
    var nextCurrent = current.lastDay === yesterday ? current.current + 1 : 1;
    var nextBest = Math.max(current.best || 0, nextCurrent);

    Store.set("streak", {
      current: nextCurrent,
      best: nextBest,
      lastDay: today
    });

    var totals = Store.getState().totals;
    Store.set("totals.studyDays", (totals.studyDays || 0) + 1);

    return { changed: true, current: nextCurrent, best: nextBest };
  }

  function recordAnswer(isCorrect) {
    var totals = Store.getState().totals;
    Store.set("totals.answered", (totals.answered || 0) + 1);
    if (isCorrect) {
      Store.set("totals.correct", (totals.correct || 0) + 1);
    }
    touchStreak();
  }

  function getLevels(lessonId) {
    return LEVEL_NUMBERS.map(function (number) {
      var level = Store.getLevelState(lessonId, number);
      var meta = Utils.levelByNumber(number);
      return Object.assign({}, level, {
        number: number,
        name: meta ? meta.name : "المستوى " + number,
        passScore: meta ? meta.passScore : 70
      });
    });
  }

  function getLessonProgress(lessonId) {
    var levels = getLevels(lessonId);
    var attempted = levels.filter(function (level) { return level.attempts > 0; });
    var passedLevels = levels.filter(function (level) { return level.passed; });
    var stars = levels.reduce(function (total, level) { return total + (level.stars || 0); }, 0);
    var averageBest = attempted.length
      ? attempted.reduce(function (total, level) { return total + level.bestScore; }, 0) / attempted.length
      : 0;
    var levelFive = levels[4];
    var mastered = Boolean(levelFive && levelFive.passed && levelFive.bestScore >= 80);

    return {
      lessonId: Number(lessonId),
      levels: levels,
      passedLevels: passedLevels.length,
      stars: stars,
      averageBest: averageBest,
      attemptedLevels: attempted.length,
      started: attempted.length > 0,
      mastered: mastered,
      status: mastered ? "mastered" : attempted.length ? "in-progress" : "available"
    };
  }

  function isLevelUnlocked(lessonId, levelNumber) {
    var level = Number(levelNumber);
    if (level === 1) {
      return true;
    }
    if (Store.getSettings().openAllLevels) {
      return true;
    }
    var previous = Store.getLevelState(lessonId, level - 1);
    return Boolean(previous.passed);
  }

  function getOverallPercent(readyLessonIds) {
    var ids = Array.isArray(readyLessonIds) ? readyLessonIds : [];
    if (!ids.length) {
      return 0;
    }
    var passed = ids.reduce(function (total, lessonId) {
      return total + getLessonProgress(lessonId).passedLevels;
    }, 0);
    return (passed / (ids.length * LEVEL_NUMBERS.length)) * 100;
  }

  function getMasteredCount(readyLessonIds) {
    var ids = Array.isArray(readyLessonIds) ? readyLessonIds : [];
    return ids.reduce(function (total, lessonId) {
      return total + (getLessonProgress(lessonId).mastered ? 1 : 0);
    }, 0);
  }

  function getLessonAverages(lessons) {
    var list = Array.isArray(lessons) ? lessons : [];
    return list.map(function (lesson) {
      var progress = getLessonProgress(lesson.id);
      return {
        lesson: lesson,
        average: progress.averageBest,
        attemptedLevels: progress.attemptedLevels,
        mastered: progress.mastered,
        status: progress.status
      };
    }).filter(function (item) {
      return item.attemptedLevels > 0;
    });
  }

  function getStrongestWeakest(lessons, limit) {
    var attempted = getLessonAverages(lessons);
    var count = limit || 3;
    var strongest = attempted.slice().sort(function (a, b) {
      return b.average - a.average;
    }).slice(0, count);
    var weakest = attempted.slice().sort(function (a, b) {
      return a.average - b.average;
    }).slice(0, count);
    return { strongest: strongest, weakest: weakest };
  }

  function getMistakes() {
    var mistakes = Store.getState().mistakes;
    return Object.keys(mistakes).map(function (key) {
      return mistakes[key];
    }).sort(function (a, b) {
      return String(b.savedAt || "").localeCompare(String(a.savedAt || ""));
    });
  }

  function getMistakesCount() {
    return Object.keys(Store.getState().mistakes).length;
  }

  function getStats(readyLessons) {
    var ids = (Array.isArray(readyLessons) ? readyLessons : []).map(function (lesson) {
      return typeof lesson === "object" ? lesson.id : lesson;
    });
    var state = Store.getState();
    var solved = Object.keys(state.solvedPassages).length;
    var totalPassages = (Array.isArray(readyLessons) ? readyLessons : []).reduce(function (total, lesson) {
      return total + (Number(lesson.passageCount) || 0);
    }, 0);

    return {
      overallPercent: getOverallPercent(ids),
      streakCurrent: state.streak.current,
      streakBest: state.streak.best,
      solvedPassages: solved,
      totalPassages: totalPassages,
      masteredLessons: getMasteredCount(ids),
      readyLessons: ids.length,
      answered: state.totals.answered,
      correct: state.totals.correct,
      sessions: state.totals.sessions,
      mistakes: getMistakesCount(),
      accuracy: state.totals.answered ? (state.totals.correct / state.totals.answered) * 100 : 0
    };
  }

  function getRecentExams(limit) {
    var history = Store.getState().examHistory;
    return history.slice(0, limit || 5);
  }

  function registerSessionCompleted() {
    var totals = Store.getState().totals;
    Store.set("totals.sessions", (totals.sessions || 0) + 1);
  }

  /* ------------------------------------------------------------------------
     أدوات العبارات العربية المشتركة بين الرئيسية ولوحة التقدم
     ------------------------------------------------------------------------ */

  function pluralRemainder(count) {
    return Math.abs(Number(count) || 0) % 100;
  }

  function dayUnitPhrase(count) {
    var n = Math.abs(Number(count) || 0);
    var number = Utils.formatNumber(n);

    if (n === 1) {
      return "يوم واحد";
    }
    if (n === 2) {
      return "يومان";
    }
    if (pluralRemainder(n) >= 3 && pluralRemainder(n) <= 10) {
      return number + " أيام";
    }
    return number + " يومًا";
  }

  function streakPhrase(count) {
    var n = Math.abs(Number(count) || 0);
    var number = Utils.formatNumber(n);

    if (n === 0) {
      return "لم تبدأ سلسلة الأيام بعد";
    }
    if (n === 1) {
      return "يوم واحد متتالٍ";
    }
    if (n === 2) {
      return "يومان متتاليان";
    }
    if (pluralRemainder(n) >= 3 && pluralRemainder(n) <= 10) {
      return number + " أيام متتالية";
    }
    return number + " يومًا متتاليًا";
  }

  function bestStreakPhrase(count) {
    var n = Math.abs(Number(count) || 0);
    return n === 0 ? "أفضل سلسلة: لم تبدأ بعد" : "أفضل سلسلة: " + dayUnitPhrase(n);
  }

  function lessonStatusPhrase(count, state, suffix) {
    var n = Math.abs(Number(count) || 0);
    var number = Utils.formatNumber(n);
    var base;

    if (n === 0) {
      base = state === "mastered" ? "لا دروس متقنة بعد" : "لا دروس جاهزة بعد";
    } else if (n === 1) {
      base = state === "mastered" ? "درس واحد متقن" : "درس واحد جاهز";
    } else if (n === 2) {
      base = state === "mastered" ? "درسان متقنان" : "درسان جاهزان";
    } else if (pluralRemainder(n) >= 3 && pluralRemainder(n) <= 10) {
      base = number + (state === "mastered" ? " دروس متقنة" : " دروس جاهزة");
    } else {
      base = number + (state === "mastered" ? " درسًا متقنًا" : " درسًا جاهزًا");
    }

    return suffix && n > 0 ? base + " " + suffix : base;
  }

  function lessonsFromTotal(count) {
    var n = Math.abs(Number(count) || 0);
    var number = Utils.formatNumber(n);

    if (n === 1) {
      return "درس واحد";
    }
    if (n === 2) {
      return "درسين";
    }
    if (pluralRemainder(n) >= 3 && pluralRemainder(n) <= 10) {
      return number + " دروس";
    }
    return number + " درسًا";
  }

  function questionPhrase(count) {
    var n = Math.abs(Number(count) || 0);
    var number = Utils.formatNumber(n);

    if (n === 1) {
      return "سؤال واحد";
    }
    if (n === 2) {
      return "سؤالان";
    }
    if (pluralRemainder(n) >= 3 && pluralRemainder(n) <= 10) {
      return number + " أسئلة";
    }
    return number + " سؤالًا";
  }

  /* ------------------------------------------------------------------------
     السلسلة اليومية ومتابعة آخر تدريب
     ------------------------------------------------------------------------ */

  function getDoneDays() {
    var streak = Store.getState().streak;
    var done = {};

    if (!streak.current || !streak.lastDay) {
      return done;
    }

    var last = new Date(streak.lastDay + "T12:00:00");
    if (Number.isNaN(last.getTime())) {
      return done;
    }

    for (var index = 0; index < streak.current; index += 1) {
      done[Utils.todayKey(Utils.addDays(last, -index))] = true;
    }

    return done;
  }

  function getContinueTarget() {
    var loader = Nahw.dataLoader;
    var lessons = loader && typeof loader.getReadyLessons === "function"
      ? loader.getReadyLessons()
      : [];
    var latest = null;

    lessons.forEach(function (lesson) {
      if (Number(lesson.passageCount) <= 0) {
        return;
      }
      getLevels(lesson.id).forEach(function (level) {
        if (!level.lastAt) {
          return;
        }
        if (!latest || String(level.lastAt) > String(latest.lastAt)) {
          latest = {
            lessonId: lesson.id,
            level: level.number,
            title: lesson.title,
            lastAt: level.lastAt
          };
        }
      });
    });

    if (latest) {
      var state = Store.getLevelState(latest.lessonId, latest.level);
      if (state.passed && latest.level < 5 && isLevelUnlocked(latest.lessonId, latest.level + 1)) {
        latest.level += 1;
      }
      return latest;
    }

    var first = lessons.filter(function (lesson) {
      return Number(lesson.passageCount) > 0;
    })[0];

    return first
      ? { lessonId: first.id, level: 1, title: first.title, lastAt: null }
      : { lessonId: 1, level: 1, title: "", lastAt: null };
  }

  Nahw.progress = {
    touchStreak: touchStreak,
    recordAnswer: recordAnswer,
    getLevels: getLevels,
    getLessonProgress: getLessonProgress,
    isLevelUnlocked: isLevelUnlocked,
    getOverallPercent: getOverallPercent,
    getMasteredCount: getMasteredCount,
    getLessonAverages: getLessonAverages,
    getStrongestWeakest: getStrongestWeakest,
    getMistakes: getMistakes,
    getMistakesCount: getMistakesCount,
    getStats: getStats,
    getRecentExams: getRecentExams,
    registerSessionCompleted: registerSessionCompleted,
    getDoneDays: getDoneDays,
    getContinueTarget: getContinueTarget,
    dayUnitPhrase: dayUnitPhrase,
    streakPhrase: streakPhrase,
    bestStreakPhrase: bestStreakPhrase,
    lessonStatusPhrase: lessonStatusPhrase,
    lessonsFromTotal: lessonsFromTotal,
    questionPhrase: questionPhrase
  };
})();
