/* ==========================================================================
   نَحْو — محرّك التدريب
   يبني جلسة التدريب، ويقدّم الأسئلة واحدًا في كل مرة مع تغذية راجعة فورية،
   ثم يحتسب النسبة ويفتح المستويات ويحفظ الأخطاء وأفضل نتيجة.
   ========================================================================== */

(function () {
  "use strict";

  var Nahw = (window.Nahw = window.Nahw || {});
  var Utils = Nahw.utils;
  var Store = Nahw.store;
  var Progress = Nahw.progress;
  var Data = Nahw.dataLoader;

  var QUESTION_TYPES = ["mcq", "tap", "fill", "transform"];
  var OPTION_LETTERS = ["أ", "ب", "ج", "د", "هـ"];
  var MASTERY_SCORE = 80;

  var sessions = {};
  var results = {};

  function nowIso() {
    return new Date().toISOString();
  }

  function sessionKey(lessonId, level) {
    return String(lessonId) + ":" + String(level);
  }

  function optionLetter(index) {
    return OPTION_LETTERS[index] || Utils.formatNumber(Number(index) + 1);
  }

  function shuffle(list) {
    var array = Array.isArray(list) ? list.slice() : [];
    for (var index = array.length - 1; index > 0; index -= 1) {
      var swap = Math.floor(Math.random() * (index + 1));
      var temp = array[index];
      array[index] = array[swap];
      array[swap] = temp;
    }
    return array;
  }

  /* ------------------------------------------------------------------------
     اختيار القطع: لا تتكرر القطعة داخل الجلسة، ولا يُعاد استعمالها
     حتى تنتهي دورة البنك.
     ------------------------------------------------------------------------ */

  function resetBankCycle(passages) {
    var seen = Store.getState().seenPassages;
    if (!seen) {
      return;
    }
    passages.forEach(function (passage) {
      delete seen[passage.id];
    });
  }

  function selectPassages(lessonId, level, size) {
    var all = Data.getPassages(lessonId, level);
    if (!all.length) {
      return [];
    }

    var seen = Store.getState().seenPassages || {};
    var unseen = shuffle(all.filter(function (passage) {
      return !seen[passage.id];
    }));

    var picked = unseen.slice(0, size);

    if (picked.length < size) {
      /* انتهت بقية الدورة: نبدأ دورة جديدة ونكمل الاختيار من أول البنك. */
      resetBankCycle(all);
      var pickedIds = picked.map(function (passage) {
        return passage.id;
      });
      var rest = shuffle(all.filter(function (passage) {
        return pickedIds.indexOf(passage.id) === -1;
      }));
      picked = picked.concat(rest.slice(0, size - picked.length));
    }

    return picked;
  }

  /* ------------------------------------------------------------------------
     تجهيز الأسئلة
     ------------------------------------------------------------------------ */

  function normalizeQuestion(question, passage) {
    var type = QUESTION_TYPES.indexOf(question.type) !== -1 ? question.type : "mcq";
    var options = Array.isArray(question.options) ? question.options.map(String) : [];
    var answerIndex = type === "tap" ? -1 : (typeof question.answer === "number" ? question.answer : -1);

    var display = options.map(function (text, index) {
      return { text: text, correct: index === answerIndex };
    });
    if (type !== "tap") {
      display = shuffle(display);
    }

    var correctIndex = -1;
    display.forEach(function (option, index) {
      if (option.correct) {
        correctIndex = index;
      }
    });

    return {
      id: question.id,
      type: type,
      prompt: String(question.prompt || ""),
      explain: String(question.explain || ""),
      options: options,
      display: display,
      answerIndex: answerIndex,
      correctIndex: correctIndex,
      answerWord: type === "tap" ? String(question.answer || "") : "",
      passageId: passage.id,
      passageText: String(passage.text || ""),
      source: String(passage.source || ""),
      lessonId: Number(passage.lesson) || 0,
      level: Number(passage.level) || 0
    };
  }

  function buildSession(lessonId, levelNumber, size) {
    var passages = selectPassages(lessonId, levelNumber, size);
    var groups = passages.map(function (passage) {
      var questions = Array.isArray(passage.questions) ? passage.questions : [];
      return {
        passage: passage,
        items: questions.map(function (question) {
          return normalizeQuestion(question, passage);
        })
      };
    });

    var total = groups.reduce(function (sum, group) {
      return sum + group.items.length;
    }, 0);

    return {
      id: Utils.uid("session"),
      key: sessionKey(lessonId, levelNumber),
      lessonId: lessonId,
      level: levelNumber,
      passages: groups,
      passageIndex: 0,
      stepIndex: 0,
      totalQuestions: total,
      answeredCount: 0,
      correctCount: 0,
      records: [],
      feedback: null,
      startedAt: nowIso(),
      finished: false,
      summary: null
    };
  }

  /* ------------------------------------------------------------------------
     دورة حياة الجلسة
     ------------------------------------------------------------------------ */

  function createSession(lessonId, levelNumber, options) {
    var opts = options || {};
    var key = sessionKey(lessonId, levelNumber);
    var existing = sessions[key];

    if (!opts.restart && existing && !existing.finished) {
      return existing;
    }

    var size = Number(opts.size) || Number(Store.getSettings().sessionSize) || 5;
    var session = buildSession(lessonId, levelNumber, size);
    sessions[key] = session;

    if (session.passages.length) {
      Store.markPassageSeen(session.passages[0].passage.id);
    }

    return session;
  }

  function getSession(lessonId, levelNumber) {
    return sessions[sessionKey(lessonId, levelNumber)] || null;
  }

  function currentItem(session) {
    if (!session || session.finished) {
      return null;
    }
    var group = session.passages[session.passageIndex];
    if (!group) {
      return null;
    }
    var item = group.items[session.stepIndex];
    return item ? { group: group, item: item } : null;
  }

  function answer(session, choice) {
    var current = currentItem(session);
    if (!current || session.feedback) {
      return null;
    }

    var item = current.item;
    var chosenText = "";
    var chosenIndex = -1;
    var correct = false;

    if (item.type === "tap") {
      chosenText = choice && choice.word ? String(choice.word) : "";
      correct = Boolean(item.answerWord) &&
        Utils.normalizeArabic(chosenText) === Utils.normalizeArabic(item.answerWord);
    } else {
      chosenIndex = choice && typeof choice.index === "number" ? choice.index : -1;
      var option = item.display[chosenIndex];
      chosenText = option ? option.text : "";
      correct = Boolean(option && option.correct);
    }

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
      passageText: item.type === "tap" ? item.passageText : "",
      chosenText: chosenText,
      chosenIndex: chosenIndex,
      correctText: correctText,
      explain: item.explain,
      correct: correct,
      lessonId: session.lessonId,
      level: session.level
    };

    session.records.push(record);
    session.answeredCount += 1;
    if (correct) {
      session.correctCount += 1;
    }
    session.feedback = record;

    Progress.recordAnswer(correct);

    if (correct) {
      Store.removeMistake(record.passageId, record.questionId);
    } else {
      Store.saveMistake(record.passageId, record.questionId, record);
    }

    return record;
  }

  function next(session) {
    if (!session || session.finished || !session.feedback) {
      return null;
    }

    var group = session.passages[session.passageIndex];
    session.feedback = null;
    session.stepIndex += 1;

    if (session.stepIndex >= group.items.length) {
      var answeredHere = session.records.filter(function (record) {
        return record.passageId === group.passage.id;
      });
      Store.markPassageSolved(group.passage.id, {
        lessonId: session.lessonId,
        level: session.level,
        correct: answeredHere.filter(function (record) {
          return record.correct;
        }).length,
        total: answeredHere.length
      });
      session.passageIndex += 1;
      session.stepIndex = 0;
    }

    if (session.passageIndex >= session.passages.length) {
      return { done: true, summary: finish(session) };
    }

    Store.markPassageSeen(session.passages[session.passageIndex].passage.id);
    return { done: false, session: session };
  }

  /* ------------------------------------------------------------------------
     النتيجة والحفظ
     ------------------------------------------------------------------------ */

  function buildReview(session, percent, passed) {
    return {
      total: session.answeredCount,
      correct: session.correctCount,
      percent: percent,
      passed: passed,
      finishedAt: nowIso(),
      items: session.records.map(function (record) {
        return {
          passageId: record.passageId,
          questionId: record.questionId,
          type: record.type,
          prompt: record.prompt,
          chosenText: record.chosenText,
          correctText: record.correctText,
          explain: record.explain,
          correct: record.correct,
          options: record.options,
          answerIndex: record.answerIndex,
          answerWord: record.answerWord,
          passageText: record.passageText
        };
      })
    };
  }

  function finish(session) {
    if (session.finished && session.summary) {
      return session.summary;
    }

    var total = session.answeredCount;
    var correct = session.correctCount;
    var percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    var meta = Utils.levelByNumber(session.level);
    var passScore = meta ? meta.passScore : 70;
    var passed = total > 0 && percent >= passScore;

    var previous = Store.getLevelState(session.lessonId, session.level);
    var best = Math.max(Number(previous.bestScore) || 0, percent);
    var stars = Math.max(Number(previous.stars) || 0, passed ? 1 : 0);

    Store.updateLevelState(session.lessonId, session.level, {
      attempts: (Number(previous.attempts) || 0) + 1,
      lastScore: percent,
      bestScore: best,
      passed: Boolean(previous.passed || passed),
      stars: stars,
      completedAt: previous.completedAt || (passed ? nowIso() : null),
      lastAt: nowIso(),
      lastReview: buildReview(session, percent, passed)
    });

    Progress.registerSessionCompleted();

    var summary = {
      lessonId: session.lessonId,
      level: session.level,
      total: total,
      correct: correct,
      percent: percent,
      passed: passed,
      passScore: passScore,
      bestScore: best,
      stars: stars,
      mastery: session.level === 5 && best >= MASTERY_SCORE,
      nextLevel: session.level < 5 ? session.level + 1 : null,
      records: session.records.slice(),
      wrong: session.records.filter(function (record) {
        return !record.correct;
      }),
      finishedAt: nowIso()
    };

    session.finished = true;
    session.summary = summary;
    results[session.key] = summary;
    return summary;
  }

  function getResult(lessonId, levelNumber) {
    var key = sessionKey(lessonId, levelNumber);
    if (results[key]) {
      return results[key];
    }

    var state = Store.getLevelState(lessonId, levelNumber);
    var review = state.lastReview;
    if (!review || !Array.isArray(review.items)) {
      return null;
    }

    var meta = Utils.levelByNumber(levelNumber);
    var passScore = meta ? meta.passScore : 70;
    var summary = {
      lessonId: Number(lessonId),
      level: Number(levelNumber),
      total: review.total || review.items.length,
      correct: review.correct || 0,
      percent: Number(review.percent) || 0,
      passed: Boolean(review.passed),
      passScore: passScore,
      bestScore: Number(state.bestScore) || 0,
      stars: Number(state.stars) || 0,
      mastery: Number(levelNumber) === 5 && (Number(state.bestScore) || 0) >= MASTERY_SCORE,
      nextLevel: Number(levelNumber) < 5 ? Number(levelNumber) + 1 : null,
      records: review.items.slice(),
      wrong: review.items.filter(function (item) {
        return !item.correct;
      }),
      finishedAt: review.finishedAt || null
    };
    results[key] = summary;
    return summary;
  }

  /* ------------------------------------------------------------------------
     مراجعة الأخطاء: إعادة محاولة سؤال محفوظ
     ------------------------------------------------------------------------ */

  function reviewMistake(mistake, choice) {
    var type = mistake && mistake.type ? mistake.type : "mcq";
    var chosenText = "";
    var correct = false;

    if (type === "tap") {
      chosenText = choice && choice.word ? String(choice.word) : "";
      correct = Boolean(mistake.answerWord) &&
        Utils.normalizeArabic(chosenText) === Utils.normalizeArabic(mistake.answerWord);
    } else {
      var options = Array.isArray(mistake.options) ? mistake.options : [];
      var index = choice && typeof choice.index === "number" ? choice.index : -1;
      chosenText = options[index] || "";
      correct = index === Number(mistake.answerIndex);
    }

    return {
      correct: correct,
      chosenText: chosenText,
      correctText: mistake ? (mistake.correctText || "") : ""
    };
  }

  function clearResults() {
    sessions = {};
    results = {};
  }

  Nahw.engine = {
    QUESTION_TYPES: QUESTION_TYPES,
    MASTERY_SCORE: MASTERY_SCORE,
    optionLetter: optionLetter,
    shuffle: shuffle,
    normalizeQuestion: normalizeQuestion,
    createSession: createSession,
    getSession: getSession,
    currentItem: currentItem,
    answer: answer,
    next: next,
    finish: finish,
    getResult: getResult,
    reviewMistake: reviewMistake,
    clearResults: clearResults
  };
})();
