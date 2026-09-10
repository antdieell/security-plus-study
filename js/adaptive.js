var Adaptive = (function () {
  function weights() {
    return (EXAM_CONFIG && EXAM_CONFIG.adaptiveWeights) || {
      weak: 3, unseen: 2.4, due: 3.2, miss: 2.8, lowConfidence: 2.2, misconception: 3.5
    };
  }

  function priorityScore(question, state) {
    const w = weights();
    const stat = state.questionStats[question.id];
    const domain = getDomainStats(state, question.domain);
    const domainAcc = percent(domain.correct, domain.attempted);
    let score = 1;
    if (domain.attempted >= 3 && domainAcc !== null) {
      score += ((100 - domainAcc) / 12) * (w.weak / 3);
    }
    if (!stat || !stat.attempts) {
      score += w.unseen;
      return score;
    }
    const objAcc = objectiveAccuracy(state, question.objective);
    if (objAcc !== null && objAcc < 70) {
      score += w.weak;
    }
    if (state.missedQuestions.indexOf(question.id) !== -1) {
      score += w.miss;
    }
    if (stat.confidence === "not-sure") {
      score += w.lowConfidence;
    }
    if (stat.misconceptionRisk) {
      score += w.misconception;
    }
    if (stat.nextReview && stat.nextReview <= todayISODate()) {
      score += w.due;
    }
    if (domainAcc !== null && domainAcc >= 80 && question.difficulty === "hard") {
      score += 1.5;
    }
    return score;
  }

  function objectiveAccuracy(state, objectiveId) {
    if (!objectiveId) {
      return null;
    }
    const items = (state.answerHistory || []).filter(function (item) {
      const q = getQuestionById(item.questionId);
      return q && q.objective === objectiveId;
    });
    if (items.length < 2) {
      return null;
    }
    return percent(items.filter(function (i) { return i.correct; }).length, items.length);
  }

  function pick(count, extra) {
    const state = getAppState();
    extra = extra || {};
    let pool = QUESTIONS.slice();
    if (extra.objective) {
      pool = pool.filter(function (q) { return q.objective === extra.objective; });
    }
    if (extra.topic) {
      const needle = String(extra.topic).toLowerCase();
      pool = pool.filter(function (q) {
        return String(q.topic || "").toLowerCase() === needle || (q.tags || []).indexOf(needle) !== -1;
      });
    }
    if (extra.domainId) {
      pool = pool.filter(function (q) { return q.domain === extra.domainId; });
    }
    const selected = [];
    const used = {};
    const n = Math.min(count, pool.length);
    const unseenTarget = Math.ceil(n * 0.35);
    const unseen = shuffleArray(pool.filter(function (q) {
      const st = state.questionStats[q.id];
      return !st || !st.attempts;
    }));
    unseen.slice(0, unseenTarget).forEach(function (q) {
      used[q.id] = true;
      selected.push(q);
    });
    for (let i = selected.length; i < n; i += 1) {
      const remaining = pool.filter(function (q) { return !used[q.id]; });
      if (!remaining.length) {
        break;
      }
      const choice = weightedRandom(remaining, function (q) {
        return priorityScore(q, state);
      });
      used[choice.id] = true;
      selected.push(choice);
    }
    return shuffleArray(selected);
  }

  function start(count, extra) {
    const ids = pick(count || 10, extra).map(function (q) { return q.id; });
    Quiz.start({
      count: ids.length,
      questionIds: ids,
      mode: extra && extra.mode ? extra.mode : "adaptive",
      type: "adaptive",
      reviewSession: false,
      objective: extra && extra.objective,
      timed: extra && extra.timed,
      durationMs: extra && extra.durationMs,
      planTaskId: extra && extra.planTaskId
    });
  }

  function startWeakArea(options) {
    options = options || {};
    const count = options.count || 10;
    start(count, {
      objective: options.objective,
      topic: options.topic,
      domainId: options.domainId,
      mode: "weak-area",
      timed: options.timed,
      durationMs: options.timed ? count * 60 * 1000 : null
    });
  }

  return {
    pick: pick,
    start: start,
    startWeakArea: startWeakArea
  };
})();
