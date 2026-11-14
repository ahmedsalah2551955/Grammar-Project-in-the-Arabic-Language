/* ==========================================================================
   نَحْو — محرّك الاختبار المختلط
   يجمع أسئلة عدة دروس ومستويات في اختبار واحد عشوائي، مع مؤقت اختياري،
   ودون تغذية راجعة أثناء الحل، ودون فتح أي مستوى أو نجمة.
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;
  var Store = Nahw.store;
  var Progress = Nahw.progress;

  var QUESTION_COUNTS = [10, 20, 30];
  var TIMER_OPTIONS = ["none", "10", "20", "30"];
  var MAX_HISTORY = 30;

  var session = null;
  var lastResult = null;

  function nowIso() {
    return new Date().toISOString();
  }

  /* ------------------------------------------------------------------------
     تطبيع المدخلات
     ------------------------------------------------------------------------ */

  function normalizeLessonIds(list) {
    var ids = [];
    (Array.isArray(list) ? list : []).forEach(function (value) {
      var id = Number(value);
      if (!Number.isFinite(id)) {
        return;
      }
      if (id < 1 || id > Nahw.constants.totalLessons) {
        return;
      }
      if (ids.indexOf(id) === -1) {
        ids.push(id);
      }
    });
    return ids.sort(function (a, b) { return a - b; });
  }

  function normalizeLevel(level) {
    if (level === "all" || level === null || level === undefined || level === "") {
      return "all";
    }
    var value = Number(level);
    return value >= 1 && value <= 5 ? value : "all";
  }

  function normalizeTimer(value) {
    var timer = String(value == null ? "none" : value);
    return TIMER_OPTIONS.indexOf(timer) === -1 ? "none" : timer;
  }

  function normalizeCount(value) {
    var count = Number(value);
    return QUESTION_COUNTS.indexOf(count) === -1 ? 10 : count;
  }

  function levelLabel(level) {
    return level === "all"
      ? "كل المستويات"
      : "المستوى " + Utils.formatNumber(level);
  }

  function lessonTitles(ids) {
    return ids.map(function (id) {
      var lesson = Nahw.dataLoader.getLesson(id);
      return lesson ? lesson.title : "الدرس " + Utils.formatNumber(id);
    });
  }

  /* ------------------------------------------------------------------------
     جمع الأسئلة من بنوك القطع
     ------------------------------------------------------------------------ */

  function collectItems(lessonId, level) {
    var passages = level === "all"
      ? Nahw.dataLoader.getPassages(lessonId)
      : Nahw.dataLoader.getPassages(lessonId, level);
    var items = [];

    passages.forEach(function (passage) {
      var questions = Array.isArray(passage.questions) ? passage.questions : [];
      questions.forEach(function (question) {
        items.push(Nahw.engine.normalizeQuestion(question, passage));
      });
    });

    return items;
  }

  function countAvailable(lessonIds, level) {
    var ids = normalizeLessonIds(lessonIds);
    var scope = normalizeLevel(level);
    var total = 0;
    ids.forEach(function (id) {
      total += collectItems(id, scope).length;
    });
    return total;
  }

  /* ------------------------------------------------------------------------
     بناء الجلسة
     ------------------------------------------------------------------------ */

  function buildSession(options) {
    var opts = options || {};
    var lessonIds = normalizeLessonIds(opts.lessonIds);
    var level = normalizeLevel(opts.level);
    var requested = normalizeCount(opts.questionCount);
    var timer = normalizeTimer(opts.timerMinutes);

    if (!lessonIds.length) {
      return Promise.reject(new Error("اختر درسًا واحدًا على الأقل قبل بدء الاختبار."));
    }

    var loads = lessonIds.map(function (id) {
      return Nahw.dataLoader.loadPassages(id).catch(function () {
        return null;
      });
    });

    return Promise.all(loads).then(function () {
      var pool = [];
      lessonIds.forEach(function (id) {
        pool = pool.concat(collectItems(id, level));
      });

      if (!pool.length) {
        return Promise.reject(new Error("لا توجد أسئلة متاحة في النطاق المختار."));
      }

      /* اقتصاص تلقائي: إن قلّ المتاح عن المطلوب أُخذ المتاح كله. */
      var items = Nahw.engine.shuffle(pool).slice(0, requested);

      session = {
        id: Utils.uid("exam"),
        lessonIds: lessonIds,
        lessonTitles: lessonTitles(lessonIds),
        level: level,
        levelLabel: levelLabel(level),
        requestedCount: requested,
        availableCount: pool.length,
        items: items,
        index: 0,
        selections: {},
        records: [],
        timerMinutes: timer,
        deadline: timer === "none" ? null : Date.now() + (Number(timer) * 60 * 1000),
        startedAt: nowIso(),
        startedAtMs: Date.now(),
        finished: false,
        summary: null
      };

      return session;
    });
  }

  function getSession() {
    return session;
  }

  function currentItem(current) {
    if (!current || current.finished) {
      return null;
    }
    return current.items[current.index] || null;
  }

  function hasSelection(current) {
    if (!current) {
      return false;
    }
    return Boolean(current.selections[current.index]);
  }

  /* ------------------------------------------------------------------------
     الاختيار والتثبيت
     ------------------------------------------------------------------------ */

  function select(current, choice) {
    var item = currentItem(current);
    if (!item) {
      return null;
    }

    var selection = { type: item.type, index: -1, text: "" };

    if (item.type === "tap") {
      selection.text = choice && choice.word ? String(choice.word) : "";
      selection.index = choice && typeof choice.index === "number" ? Number(choice.index) : -1;
    } else {
      var index = choice && typeof choice.index === "number" ? Number(choice.index) : -1;
      selection.index = index;
      selection.text = item.display[index] ? item.display[index].text : "";
    }

    current.selections[current.index] = selection;
    return selection;
  }

  function commit(current) {
    var item = currentItem(current);
    if (!item) {
      return null;
    }

    var selection = current.selections[current.index];
    var correctText = item.type === "tap"
      ? item.answerWord
      : (item.answerIndex !== -1 ? item.options[item.answerIndex] : "");

    var record = {
      passageId: item.passageId,
      questionId: item.id,
      type: item.type,
      prompt: item.prompt,
      options: item.options,
      answerIndex: item.answerIndex,
      answerWord: item.answerWord,
      passageText: item.passageText,
      source: item.source,
      lessonId: item.lessonId,
      level: item.level,
      chosenIndex: -1,
      chosenText: "",
      correctText: correctText,
      explain: item.explain,
      correct: false,
      answered: false
    };

    if (selection) {
      record.answered = true;
      record.chosenIndex = selection.index;
      record.chosenText = selection.text;

      if (item.type === "tap") {
        record.correct = Boolean(item.answerWord) &&
          Utils.normalizeArabic(selection.text) === Utils.normalizeArabic(item.answerWord);
      } else {
        var option = item.display[selection.index];
        record.correct = Boolean(option && option.correct);
      }
    }

    current.records.push(record);

    if (record.answered) {
      Progress.recordAnswer(record.correct);

      if (record.correct) {
        Store.removeMistake(record.passageId, record.questionId);
      } else {
        Store.saveMistake(record.passageId, record.questionId, record);
      }
    }

    return record;
  }

  function next(current) {
    if (!current || current.finished) {
      return null;
    }

    var record = commit(current);

    if (current.index + 1 >= current.items.length) {
      return { done: true, record: record, summary: finish(current, "complete") };
    }

    current.index += 1;
    return { done: false, record: record, session: current };
  }

  /* ------------------------------------------------------------------------
     الإنهاء والنتيجة
     ------------------------------------------------------------------------ */

  function finish(current, reason) {
    if (!current) {
      return lastResult;
    }
    if (current.finished && current.summary) {
      return current.summary;
    }

    var why = reason || "complete";

    /* السؤال الجاري: نثبّته إن كان قد أُجيب عنه، ولا نُثبّته إن أُنهيت بلا إجابة. */
    if (current.records.length === current.index && current.index < current.items.length) {
      if (why !== "quit" || hasSelection(current)) {
        commit(current);
      }
    }

    var records = current.records.slice();
    var total = records.length;
    var answered = records.filter(function (record) { return record.answered; });
    var correct = records.filter(function (record) { return record.correct; }).length;
    var percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    var elapsed = Math.max(0, Math.round((Date.now() - current.startedAtMs) / 1000));

    var summary = {
      id: current.id,
      lessonIds: current.lessonIds,
      lessonTitles: current.lessonTitles,
      level: current.level,
      levelLabel: current.levelLabel,
      requestedCount: current.requestedCount,
      availableCount: current.availableCount,
      total: total,
      answeredCount: answered.length,
      correct: correct,
      percent: percent,
      timerMinutes: current.timerMinutes,
      expired: why === "time",
      reason: why,
      elapsedSeconds: elapsed,
      records: records,
      wrong: records.filter(function (record) { return record.answered && !record.correct; }),
      skipped: records.filter(function (record) { return !record.answered; }),
      finishedAt: nowIso()
    };

    current.finished = true;
    current.summary = summary;
    lastResult = summary;

    Store.addExamHistory({
      id: summary.id,
      date: summary.finishedAt,
      dateLabel: Utils.formatDateArabic(new Date(summary.finishedAt)),
      questionCount: summary.total,
      answeredCount: summary.answeredCount,
      correct: summary.correct,
      percent: summary.percent,
      lessonIds: summary.lessonIds,
      lessonTitles: summary.lessonTitles,
      level: summary.level,
      levelLabel: summary.levelLabel,
      timerMinutes: summary.timerMinutes,
      expired: summary.expired
    });

    return summary;
  }

  function getLastResult() {
    return lastResult;
  }

  /* ------------------------------------------------------------------------
     المؤقت
     ------------------------------------------------------------------------ */

  function remainingSeconds(current) {
    if (!current || !current.deadline) {
      return null;
    }
    return Math.max(0, Math.ceil((current.deadline - Date.now()) / 1000));
  }

  function tick(current) {
    var left = remainingSeconds(current);
    return {
      remaining: left,
      expired: left !== null && left <= 0
    };
  }

  function formatClock(seconds) {
    var total = Math.max(0, Math.floor(Number(seconds) || 0));
    var minutes = Math.floor(total / 60);
    var rest = total % 60;
    return Utils.toArabicDigits(String(minutes)) + ":" + Utils.toArabicDigits(String(rest).padStart(2, "0"));
  }

  function clear() {
    session = null;
    lastResult = null;
  }

  Nahw.exam = {
    QUESTION_COUNTS: QUESTION_COUNTS,
    TIMER_OPTIONS: TIMER_OPTIONS,
    normalizeLessonIds: normalizeLessonIds,
    normalizeLevel: normalizeLevel,
    normalizeTimer: normalizeTimer,
    normalizeCount: normalizeCount,
    levelLabel: levelLabel,
    countAvailable: countAvailable,
    collectItems: collectItems,
    buildSession: buildSession,
    getSession: getSession,
    currentItem: currentItem,
    hasSelection: hasSelection,
    select: select,
    commit: commit,
    next: next,
    finish: finish,
    getLastResult: getLastResult,
    remainingSeconds: remainingSeconds,
    tick: tick,
    formatClock: formatClock,
    clear: clear
  };
})();
