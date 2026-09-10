/**
 * Central localStorage helper — schema v3 with V1/V2 migration.
 * Key stays secplus-study-v1 so existing progress is found and upgraded, never wiped.
 */
var STORAGE_KEY = "secplus-study-v1";
var SCHEMA_VERSION = 3;
var HISTORY_CAP = 500;
var SESSION_HISTORY_CAP = 30;

function currentQuestionBankVersion() {
  return typeof QUESTION_BANK_VERSION === "string" ? QUESTION_BANK_VERSION : "source-bank-v2";
}

function createDefaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    questionBankVersion: currentQuestionBankVersion(),
    totalAnswered: 0,
    totalCorrect: 0,
    domainStats: {},
    missedQuestions: [],
    savedQuestions: [],
    flashcardStatus: {},
    flashcardProgress: {},
    quizHistory: [],
    sessionHistory: [],
    streak: {
      count: 0,
      best: 0,
      lastStudyDate: null
    },
    lastActivity: null,
    questionStats: {},
    answerHistory: [],
    activeSession: null,
    diagnostic: null,
    prefs: {
      dailyGoal: 10,
      studyMinutes: 25,
      showDifficulty: false,
      enableConfidence: true,
      showObjectiveIds: true,
      examAlerts: false,
      reducedMotion: false
    },
    today: {
      date: null,
      questionsAnswered: 0,
      flashcardsReviewed: 0,
      quizCompleted: false,
      pbqCompleted: false
    },
    pbqStats: { completed: 0, attempted: 0, correct: 0, byId: {} },
    portsStats: { attempted: 0, correct: 0 },
    acronymStats: { attempted: 0, correct: 0 },
    dailyPlans: [],
    activePlan: null,
    questionReports: [],
    questionNotes: {},
    errorJournal: [],
    readinessHistory: [],
    personalBests: { exam30: null, exam60: null, exam90: null },
    customFlashcards: {}
  };
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function migrateAppState(raw) {
  const state = createDefaultState();
  if (!isObject(raw)) {
    return state;
  }

  state.totalAnswered = Number.isFinite(raw.totalAnswered) ? Math.max(0, raw.totalAnswered) : 0;
  state.totalCorrect = Number.isFinite(raw.totalCorrect) ? Math.max(0, raw.totalCorrect) : 0;
  if (state.totalCorrect > state.totalAnswered) {
    state.totalCorrect = state.totalAnswered;
  }

  if (isObject(raw.domainStats)) {
    Object.keys(raw.domainStats).forEach(function (domainId) {
      const stats = raw.domainStats[domainId];
      if (!isObject(stats)) {
        return;
      }
      state.domainStats[domainId] = {
        attempted: Number.isFinite(stats.attempted) ? Math.max(0, stats.attempted) : 0,
        correct: Number.isFinite(stats.correct) ? Math.max(0, stats.correct) : 0
      };
      if (state.domainStats[domainId].correct > state.domainStats[domainId].attempted) {
        state.domainStats[domainId].correct = state.domainStats[domainId].attempted;
      }
    });
  }

  state.missedQuestions = Array.isArray(raw.missedQuestions)
    ? raw.missedQuestions.filter(function (id) { return typeof id === "string"; })
    : [];
  state.savedQuestions = Array.isArray(raw.savedQuestions)
    ? raw.savedQuestions.filter(function (id) { return typeof id === "string"; })
    : [];

  if (isObject(raw.flashcardStatus)) {
    Object.keys(raw.flashcardStatus).forEach(function (cardId) {
      const status = raw.flashcardStatus[cardId];
      if (status === "known" || status === "review") {
        state.flashcardStatus[cardId] = status;
      }
    });
  }

  if (isObject(raw.flashcardProgress)) {
    state.flashcardProgress = raw.flashcardProgress;
  } else {
    Object.keys(state.flashcardStatus).forEach(function (cardId) {
      const legacy = state.flashcardStatus[cardId];
      state.flashcardProgress[cardId] = {
        status: legacy === "known" ? "mastered" : "learning",
        intervalDays: legacy === "known" ? 14 : 1,
        nextReview: legacy === "known" ? addDaysISO(todayISODate(), 14) : todayISODate(),
        lastRating: legacy === "known" ? "easy" : "again"
      };
    });
  }

  state.quizHistory = Array.isArray(raw.quizHistory)
    ? raw.quizHistory.filter(isObject).slice(0, SESSION_HISTORY_CAP)
    : [];
  state.sessionHistory = Array.isArray(raw.sessionHistory)
    ? raw.sessionHistory.filter(isObject).slice(0, SESSION_HISTORY_CAP)
    : state.quizHistory.map(function (item) {
      return Object.assign({ type: item.mode || "quiz" }, item);
    });

  if (isObject(raw.streak)) {
    state.streak.count = Number.isFinite(raw.streak.count) ? Math.max(0, raw.streak.count) : 0;
    state.streak.lastStudyDate = typeof raw.streak.lastStudyDate === "string"
      ? raw.streak.lastStudyDate
      : null;
    state.streak.best = Number.isFinite(raw.streak.best)
      ? Math.max(raw.streak.best, state.streak.count)
      : state.streak.count;
  }

  state.lastActivity = typeof raw.lastActivity === "string" ? raw.lastActivity : null;

  if (isObject(raw.questionStats)) {
    state.questionStats = raw.questionStats;
  } else {
    state.missedQuestions.forEach(function (id) {
      state.questionStats[id] = {
        attempts: 1,
        correct: 0,
        incorrect: 1,
        lastAnswered: null,
        lastCorrect: false,
        confidence: null,
        nextReview: todayISODate(),
        intervalDays: 1,
        bookmarked: state.savedQuestions.indexOf(id) !== -1,
        misconceptionRisk: false
      };
    });
    state.savedQuestions.forEach(function (id) {
      if (!state.questionStats[id]) {
        state.questionStats[id] = {
          attempts: 0,
          correct: 0,
          incorrect: 0,
          lastAnswered: null,
          lastCorrect: null,
          confidence: null,
          nextReview: null,
          intervalDays: 0,
          bookmarked: true,
          misconceptionRisk: false
        };
      } else {
        state.questionStats[id].bookmarked = true;
      }
    });
  }

  state.answerHistory = Array.isArray(raw.answerHistory)
    ? raw.answerHistory.filter(isObject).slice(-HISTORY_CAP)
    : [];

  state.activeSession = isObject(raw.activeSession) ? raw.activeSession : null;
  state.diagnostic = isObject(raw.diagnostic) ? raw.diagnostic : null;

  if (isObject(raw.prefs)) {
    if ([5, 10, 20, 30, 50].indexOf(raw.prefs.dailyGoal) !== -1) {
      state.prefs.dailyGoal = raw.prefs.dailyGoal;
    }
    state.prefs.showDifficulty = !!raw.prefs.showDifficulty;
    state.prefs.enableConfidence = raw.prefs.enableConfidence !== false;
    if ([10, 20, 25, 30, 45, 60].indexOf(raw.prefs.studyMinutes) !== -1) {
      state.prefs.studyMinutes = raw.prefs.studyMinutes;
    }
    state.prefs.showObjectiveIds = raw.prefs.showObjectiveIds !== false;
    state.prefs.examAlerts = !!raw.prefs.examAlerts;
    state.prefs.reducedMotion = !!raw.prefs.reducedMotion;
  }

  if (isObject(raw.today)) {
    state.today.date = typeof raw.today.date === "string" ? raw.today.date : null;
    state.today.questionsAnswered = Number(raw.today.questionsAnswered) || 0;
    state.today.flashcardsReviewed = Number(raw.today.flashcardsReviewed) || 0;
    state.today.quizCompleted = !!raw.today.quizCompleted;
    state.today.pbqCompleted = !!raw.today.pbqCompleted;
  }

  ["pbqStats", "portsStats", "acronymStats"].forEach(function (key) {
    if (isObject(raw[key])) {
      state[key].attempted = Number(raw[key].attempted) || 0;
      state[key].correct = Number(raw[key].correct) || 0;
      if (key === "pbqStats") {
        state[key].completed = Number(raw[key].completed) || 0;
        state[key].byId = isObject(raw[key].byId) ? raw[key].byId : {};
      }
    }
  });

  state.dailyPlans = Array.isArray(raw.dailyPlans) ? raw.dailyPlans.filter(isObject).slice(-30) : [];
  state.activePlan = isObject(raw.activePlan) ? raw.activePlan : null;
  state.questionReports = Array.isArray(raw.questionReports) ? raw.questionReports.filter(isObject).slice(-200) : [];
  state.questionNotes = isObject(raw.questionNotes) ? raw.questionNotes : {};
  state.errorJournal = Array.isArray(raw.errorJournal) ? raw.errorJournal.filter(isObject).slice(-80) : [];
  state.readinessHistory = Array.isArray(raw.readinessHistory) ? raw.readinessHistory.filter(isObject).slice(-60) : [];
  if (isObject(raw.personalBests)) {
    state.personalBests = Object.assign(state.personalBests, raw.personalBests);
  }
  state.customFlashcards = isObject(raw.customFlashcards) ? raw.customFlashcards : {};

  rollToday(state);
  state.schemaVersion = SCHEMA_VERSION;
  state.questionBankVersion = typeof raw.questionBankVersion === "string" ? raw.questionBankVersion : null;
  return migrateQuestionBank(state);
}

function knownQuestionIdSet() {
  const ids = {};
  if (typeof QUESTIONS === "undefined" || !Array.isArray(QUESTIONS)) {
    return null;
  }
  QUESTIONS.forEach(function (question) {
    if (question && question.id) {
      ids[question.id] = true;
    }
  });
  return ids;
}

function isLiveQuestionId(id, liveIds) {
  return typeof id === "string" && liveIds && liveIds[id];
}

function migrateQuestionBank(state) {
  const version = currentQuestionBankVersion();
  const liveIds = knownQuestionIdSet();
  if (!liveIds) {
    state.questionBankVersion = version;
    return state;
  }

  state.missedQuestions = (state.missedQuestions || []).filter(function (id) {
    return isLiveQuestionId(id, liveIds);
  });
  state.savedQuestions = (state.savedQuestions || []).filter(function (id) {
    return isLiveQuestionId(id, liveIds);
  });

  const nextStats = {};
  Object.keys(state.questionStats || {}).forEach(function (id) {
    if (isLiveQuestionId(id, liveIds)) {
      nextStats[id] = state.questionStats[id];
    }
  });
  state.questionStats = nextStats;

  const nextNotes = {};
  Object.keys(state.questionNotes || {}).forEach(function (id) {
    if (isLiveQuestionId(id, liveIds)) {
      nextNotes[id] = state.questionNotes[id];
    }
  });
  state.questionNotes = nextNotes;

  state.questionReports = (state.questionReports || []).filter(function (item) {
    return isObject(item) && isLiveQuestionId(item.questionId || item.id, liveIds);
  });
  state.errorJournal = (state.errorJournal || []).filter(function (item) {
    return isObject(item) && (!item.questionId || isLiveQuestionId(item.questionId, liveIds));
  });
  state.answerHistory = (state.answerHistory || []).filter(function (item) {
    return isObject(item) && (!item.questionId || isLiveQuestionId(item.questionId, liveIds));
  });

  if (isObject(state.activeSession)) {
    const sessionIds = state.activeSession.questionIds || [];
    const sessionLive = sessionIds.length && sessionIds.every(function (id) { return isLiveQuestionId(id, liveIds); });
    if (!sessionLive) {
      state.activeSession = null;
    }
  }

  if (isObject(state.diagnostic)) {
    const diagIds = state.diagnostic.questionIds || [];
    const diagLive = !diagIds.length || diagIds.every(function (id) { return isLiveQuestionId(id, liveIds); });
    if (!diagLive) {
      state.diagnostic = null;
    }
  }

  if (isObject(state.activePlan) && Array.isArray(state.activePlan.items)) {
    state.activePlan.items = state.activePlan.items.filter(function (item) {
      return !item || !item.questionId || isLiveQuestionId(item.questionId, liveIds);
    });
  }

  state.questionBankVersion = version;
  return state;
}

function sanitizeState(raw) {
  return migrateAppState(raw);
}

function rollToday(state) {
  const today = todayISODate();
  if (state.today.date !== today) {
    state.today = {
      date: today,
      questionsAnswered: 0,
      flashcardsReviewed: 0,
      quizCompleted: false,
      pbqCompleted: false
    };
  }
}

function loadState() {
  return getAppState();
}

function getAppState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }
    const parsed = JSON.parse(raw);
    const migrated = migrateAppState(parsed);
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION || parsed.questionBankVersion !== currentQuestionBankVersion()) {
      saveAppState(migrated);
    }
    return migrated;
  } catch (error) {
    return createDefaultState();
  }
}

function saveState(state) {
  return saveAppState(state);
}

function saveAppState(state) {
  try {
    state.schemaVersion = SCHEMA_VERSION;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    return false;
  }
}

function updateState(mutator) {
  const state = getAppState();
  mutator(state);
  saveAppState(state);
  return state;
}

function resetState() {
  return resetAppState();
}

function resetAppState() {
  const empty = createDefaultState();
  saveAppState(empty);
  return empty;
}

function getDomainStats(state, domainId) {
  const stats = state.domainStats[domainId];
  if (!stats) {
    return { attempted: 0, correct: 0 };
  }
  return {
    attempted: stats.attempted || 0,
    correct: stats.correct || 0
  };
}

function ensureQuestionStat(state, questionId) {
  if (!state.questionStats[questionId]) {
    state.questionStats[questionId] = {
      attempts: 0,
      correct: 0,
      incorrect: 0,
      lastAnswered: null,
      lastCorrect: null,
      confidence: null,
      nextReview: null,
      intervalDays: 0,
      bookmarked: state.savedQuestions.indexOf(questionId) !== -1,
      misconceptionRisk: false
    };
  }
  return state.questionStats[questionId];
}

function scheduleReview(stat, isCorrect, confidence, isReview) {
  const today = todayISODate();
  if (!isCorrect) {
    stat.intervalDays = 1;
    stat.nextReview = addDaysISO(today, 1);
    if (confidence === "confident") {
      stat.misconceptionRisk = true;
    }
    return;
  }
  stat.misconceptionRisk = false;
  let interval = stat.intervalDays || 0;
  if (confidence === "not-sure") {
    interval = 1;
  } else if (confidence === "somewhat") {
    interval = Math.min(14, Math.max(1, interval * 2 || 3));
  } else if (isReview || interval) {
    interval = Math.min(30, Math.max(3, Math.round((interval || 1) * 2.5)));
  } else {
    interval = 3;
  }
  stat.intervalDays = interval;
  stat.nextReview = addDaysISO(today, interval);
}

function recordQuestionAnswer(options) {
  const domainId = options.domainId;
  const isCorrect = !!options.isCorrect;
  const questionId = options.questionId;
  const confidence = options.confidence || null;
  const sessionType = options.sessionType || "quiz";
  const isReview = !!options.isReview;

  return updateState(function (state) {
    rollToday(state);
    state.totalAnswered += 1;
    if (isCorrect) {
      state.totalCorrect += 1;
    }
    if (!state.domainStats[domainId]) {
      state.domainStats[domainId] = { attempted: 0, correct: 0 };
    }
    state.domainStats[domainId].attempted += 1;
    if (isCorrect) {
      state.domainStats[domainId].correct += 1;
    }

    const missedIndex = state.missedQuestions.indexOf(questionId);
    if (!isCorrect) {
      if (missedIndex === -1) {
        state.missedQuestions.push(questionId);
      }
    } else if (isReview && missedIndex !== -1) {
      state.missedQuestions.splice(missedIndex, 1);
    }

    const stat = ensureQuestionStat(state, questionId);
    stat.attempts += 1;
    if (isCorrect) {
      stat.correct += 1;
    } else {
      stat.incorrect += 1;
    }
    stat.lastAnswered = Date.now();
    stat.lastCorrect = isCorrect;
    if (confidence) {
      stat.confidence = confidence;
    }
    if (!Array.isArray(stat.correctDates)) {
      stat.correctDates = [];
    }
    if (isCorrect) {
      const day = todayISODate();
      if (stat.correctDates.indexOf(day) === -1) {
        stat.correctDates.push(day);
      }
    }
    scheduleReview(stat, isCorrect, confidence, isReview);
    if (!isCorrect) {
      appendErrorJournal(state, {
        questionId: questionId,
        domain: domainId,
        confidence: confidence,
        sessionType: sessionType
      });
    }

    state.answerHistory.push({
      questionId: questionId,
      domain: domainId,
      correct: isCorrect,
      timestamp: Date.now(),
      confidence: confidence,
      sessionType: sessionType
    });
    state.answerHistory = state.answerHistory.slice(-HISTORY_CAP);
    state.today.questionsAnswered += 1;
    maybeUpdateStreak(state);
  });
}

function recordAnswer(domainId, isCorrect, questionId) {
  return recordQuestionAnswer({
    domainId: domainId,
    isCorrect: isCorrect,
    questionId: questionId
  });
}

function removeMissedQuestion(questionId) {
  return updateState(function (state) {
    state.missedQuestions = state.missedQuestions.filter(function (id) {
      return id !== questionId;
    });
  });
}

function toggleSavedQuestion(questionId) {
  return updateState(function (state) {
    const index = state.savedQuestions.indexOf(questionId);
    const stat = ensureQuestionStat(state, questionId);
    if (index === -1) {
      state.savedQuestions.push(questionId);
      stat.bookmarked = true;
    } else {
      state.savedQuestions.splice(index, 1);
      stat.bookmarked = false;
    }
  });
}

function isQuestionSaved(questionId) {
  return getAppState().savedQuestions.indexOf(questionId) !== -1;
}

function setFlashcardStatus(cardId, status) {
  return updateState(function (state) {
    if (status === "known" || status === "review") {
      state.flashcardStatus[cardId] = status;
    } else {
      delete state.flashcardStatus[cardId];
    }
    const rating = status === "known" ? "easy" : "again";
    applyFlashcardRating(state, cardId, rating);
  });
}

function applyFlashcardRating(state, cardId, rating) {
  const today = todayISODate();
  const progress = state.flashcardProgress[cardId] || {
    status: "new",
    intervalDays: 0,
    nextReview: today,
    lastRating: null
  };
  let interval = progress.intervalDays || 0;
  let status = "learning";
  if (rating === "again") {
    interval = 0;
    status = "learning";
    state.flashcardStatus[cardId] = "review";
  } else if (rating === "hard") {
    interval = 1;
    status = "learning";
  } else if (rating === "good") {
    interval = Math.min(30, Math.max(3, Math.round((interval || 1) * 2.5)));
    status = interval >= 14 ? "mastered" : "review";
    if (status === "mastered") {
      state.flashcardStatus[cardId] = "known";
    }
  } else {
    interval = Math.min(30, Math.max(7, Math.round((interval || 3) * 3)));
    status = "mastered";
    state.flashcardStatus[cardId] = "known";
  }
  progress.status = status;
  progress.intervalDays = interval;
  progress.nextReview = addDaysISO(today, Math.max(interval, rating === "again" ? 0 : interval));
  progress.lastRating = rating;
  state.flashcardProgress[cardId] = progress;
  state.today.flashcardsReviewed += 1;
  maybeUpdateStreak(state);
}

function rateFlashcard(cardId, rating) {
  return updateState(function (state) {
    rollToday(state);
    applyFlashcardRating(state, cardId, rating);
  });
}

function recordQuizSession(session) {
  return recordSession(session);
}

function recordSession(session) {
  const record = Object.assign({
    date: Date.now(),
    type: session.type || session.mode || "quiz"
  }, session);
  return updateState(function (state) {
    rollToday(state);
    state.quizHistory.unshift(record);
    state.quizHistory = state.quizHistory.slice(0, SESSION_HISTORY_CAP);
    state.sessionHistory.unshift(record);
    state.sessionHistory = state.sessionHistory.slice(0, SESSION_HISTORY_CAP);
    state.lastActivity = record.type;
    if (record.type !== "pbq" && record.type !== "ports" && record.type !== "acronyms") {
      state.today.quizCompleted = true;
    }
    if (record.type === "diagnostic") {
      state.diagnostic = record;
    }
    maybeUpdateStreak(state);
  });
}

function maybeUpdateStreak(state) {
  rollToday(state);
  const meaningful = state.today.questionsAnswered >= 5 ||
    state.today.quizCompleted ||
    state.today.pbqCompleted ||
    state.today.flashcardsReviewed >= 5;
  if (!meaningful) {
    return;
  }
  const today = todayISODate();
  const last = state.streak.lastStudyDate;
  if (last === today) {
    return;
  }
  const gap = last ? daysBetweenISO(today, last) : null;
  if (gap === 1) {
    state.streak.count += 1;
  } else {
    state.streak.count = 1;
  }
  state.streak.lastStudyDate = today;
  if (state.streak.count > (state.streak.best || 0)) {
    state.streak.best = state.streak.count;
  }
}

function recordStudyActivity() {
  return updateState(function (state) {
    maybeUpdateStreak(state);
  });
}

function persistActiveSession(session) {
  return updateState(function (state) {
    state.activeSession = session;
  });
}

function clearActiveSession() {
  return updateState(function (state) {
    state.activeSession = null;
  });
}

function getReviewFlashcardIds(state) {
  const today = todayISODate();
  const due = Object.keys(state.flashcardProgress || {}).filter(function (id) {
    const card = state.flashcardProgress[id];
    return card && card.status !== "mastered" && (!card.nextReview || card.nextReview <= today);
  });
  if (due.length) {
    return due;
  }
  return Object.keys(state.flashcardStatus).filter(function (id) {
    return state.flashcardStatus[id] === "review";
  });
}

function getDueReviews(state) {
  const today = todayISODate();
  return Object.keys(state.questionStats || {}).filter(function (id) {
    const stat = state.questionStats[id];
    return stat && stat.nextReview && stat.nextReview <= today;
  });
}

function getLowConfidenceIds(state) {
  return Object.keys(state.questionStats || {}).filter(function (id) {
    const stat = state.questionStats[id];
    return stat && (stat.confidence === "not-sure" || stat.misconceptionRisk);
  });
}

function isQuestionMastered(stat, question) {
  if (!stat) {
    return false;
  }
  const today = todayISODate();
  const hard = question && question.difficulty === "hard";
  const needCorrect = hard ? 4 : 3;
  const dates = Array.isArray(stat.correctDates) ? unique(stat.correctDates) : [];
  return stat.correct >= needCorrect &&
    dates.length >= 2 &&
    stat.lastCorrect === true &&
    stat.confidence !== "not-sure" &&
    (!stat.nextReview || stat.nextReview > today);
}

function appendErrorJournal(state, info) {
  const question = typeof getQuestionById === "function" ? getQuestionById(info.questionId) : null;
  const topic = question && question.topic ? question.topic : "General";
  const existing = state.errorJournal.filter(function (row) {
    return row.topic === topic && !row.reviewed;
  })[0];
  if (existing) {
    existing.times += 1;
    existing.lastMissed = Date.now();
    existing.questionId = info.questionId;
    existing.confidence = info.confidence || existing.confidence;
    return;
  }
  state.errorJournal.unshift({
    id: "ej-" + Date.now() + "-" + Math.random().toString(16).slice(2, 6),
    topic: topic,
    objective: question && question.objective || null,
    questionId: info.questionId,
    concept: question && question.explanation ? String(question.explanation).slice(0, 180) : topic,
    confidence: info.confidence || null,
    date: Date.now(),
    lastMissed: Date.now(),
    times: 1,
    reviewed: false,
    note: (state.questionNotes && state.questionNotes[info.questionId]) || ""
  });
  state.errorJournal = state.errorJournal.slice(0, 80);
}

function getMasteredCount(state) {
  return Object.keys(state.questionStats || {}).filter(function (id) {
    const q = typeof getQuestionById === "function" ? getQuestionById(id) : null;
    return isQuestionMastered(state.questionStats[id], q);
  }).length;
}

function getReviewBadgeCount(state) {
  const due = getDueReviews(state).length;
  const cards = getReviewFlashcardIds(state).length;
  return due + cards;
}

function getOverallAccuracy(state) {
  return percent(state.totalCorrect, state.totalAnswered);
}

function getRecentAccuracy(state, windowSize) {
  const slice = (state.answerHistory || []).slice(-(windowSize || 50));
  if (!slice.length) {
    return null;
  }
  const correct = slice.filter(function (item) { return item.correct; }).length;
  return percent(correct, slice.length);
}

function getTodayProgress(state) {
  rollToday(state);
  return state.today;
}

function calculateDomainStats(state, domainId) {
  const base = getDomainStats(state, domainId);
  const recent = (state.answerHistory || []).filter(function (item) {
    return item.domain === domainId;
  }).slice(-20);
  const uniqueSeen = Object.keys(state.questionStats || {}).filter(function (id) {
    const q = typeof getQuestionById === "function" ? getQuestionById(id) : null;
    return q && q.domain === domainId && state.questionStats[id].attempts > 0;
  }).length;
  const missed = state.missedQuestions.filter(function (id) {
    const q = typeof getQuestionById === "function" ? getQuestionById(id) : null;
    return q && q.domain === domainId;
  }).length;
  const due = getDueReviews(state).filter(function (id) {
    const q = typeof getQuestionById === "function" ? getQuestionById(id) : null;
    return q && q.domain === domainId;
  }).length;
  const recentCorrect = recent.filter(function (item) { return item.correct; }).length;
  return {
    attempted: base.attempted,
    correct: base.correct,
    lifetime: percent(base.correct, base.attempted),
    recent: percent(recentCorrect, recent.length),
    uniqueSeen: uniqueSeen,
    missed: missed,
    due: due
  };
}

function exportProgressJson() {
  const state = getAppState();
  const payload = {
    app: "SEC+ Study",
    version: EXAM_CONFIG && EXAM_CONFIG.version,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: state,
    state: state
  };
  return JSON.stringify(payload, null, 2);
}

function importProgressJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, error: "That file is not valid JSON." };
  }
  if (parsed && parsed.app && parsed.app !== "SEC+ Study") {
    return { ok: false, error: "That file is not a SEC+ Study backup." };
  }
  if (parsed && typeof parsed.schemaVersion === "number" && parsed.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: "This backup is from a newer SEC+ Study version." };
  }
  const candidate = parsed && (parsed.data || parsed.state) ? (parsed.data || parsed.state) : parsed;
  if (!isObject(candidate) || typeof candidate.totalAnswered !== "number") {
    return { ok: false, error: "That backup is missing study progress fields." };
  }
  const migrated = migrateAppState(candidate);
  saveAppState(migrated);
  return { ok: true, state: migrated };
}

function saveQuestionNote(questionId, text) {
  return updateState(function (state) {
    if (!text) {
      delete state.questionNotes[questionId];
    } else {
      state.questionNotes[questionId] = String(text).slice(0, 400);
    }
  });
}

function reportQuestion(questionId, reason, detail) {
  return updateState(function (state) {
    state.questionReports.push({
      questionId: questionId,
      reason: reason || "other",
      detail: String(detail || "").slice(0, 300),
      date: Date.now()
    });
    state.questionReports = state.questionReports.slice(-200);
  });
}

function markJournalReviewed(entryId) {
  return updateState(function (state) {
    state.errorJournal.forEach(function (row) {
      if (row.id === entryId) {
        row.reviewed = true;
      }
    });
  });
}

function maybeRecordReadiness(snapshot) {
  if (!snapshot || typeof snapshot.index !== "number") {
    return;
  }
  return updateState(function (state) {
    const today = todayISODate();
    const last = state.readinessHistory[0];
    if (last && last.date === today) {
      last.index = snapshot.index;
      last.category = snapshot.category;
      last.confidence = snapshot.confidence;
      return;
    }
    if (state.today.questionsAnswered < 3 && !state.today.quizCompleted && !state.today.pbqCompleted) {
      return;
    }
    state.readinessHistory.unshift({
      date: today,
      index: snapshot.index,
      category: snapshot.category,
      confidence: snapshot.confidence
    });
    state.readinessHistory = state.readinessHistory.slice(0, 60);
  });
}

function createReviewCardFromQuestion(questionId) {
  const question = typeof getQuestionById === "function" ? getQuestionById(questionId) : null;
  if (!question) {
    return null;
  }
  const id = "uc-" + question.id;
  const card = {
    id: id,
    domain: question.domain,
    term: question.topic ? ("Why does this matter: " + question.topic) : String(question.question).slice(0, 90),
    definition: String(question.explanation || question.topic || "").slice(0, 280),
    whyItMatters: question.topic || "Missed practice item",
    examTip: question.objective ? ("Objective " + question.objective) : "Review the explanation, not just the wording.",
    sourceQuestionId: question.id
  };
  updateState(function (state) {
    state.customFlashcards = state.customFlashcards || {};
    state.customFlashcards[id] = card;
  });
  return card;
}

function getUserFlashcards() {
  const map = (typeof getAppState === "function" ? getAppState().customFlashcards : null) || {};
  return Object.keys(map).map(function (key) { return map[key]; });
}

function updatePersonalBest(modeKey, scorePercent) {
  if (["exam30", "exam60", "exam90"].indexOf(modeKey) === -1 || scorePercent == null) {
    return;
  }
  return updateState(function (state) {
    const current = state.personalBests[modeKey];
    if (current == null || scorePercent > current) {
      state.personalBests[modeKey] = scorePercent;
    }
  });
}
