var Coverage = (function () {
  function questionsForObjective(objectiveId) {
    return QUESTIONS.filter(function (q) { return q.objective === objectiveId; });
  }

  function objectiveCoverage(state, objectiveId) {
    const bank = questionsForObjective(objectiveId);
    const stats = state.questionStats || {};
    let seen = 0;
    let uniqueAnswered = 0;
    let mastered = 0;
    let due = 0;
    let confScore = 0;
    let confN = 0;
    bank.forEach(function (q) {
      const st = stats[q.id];
      if (st && st.attempts > 0) {
        seen += 1;
        uniqueAnswered += 1;
        if (isQuestionMastered(st, q)) {
          mastered += 1;
        }
        if (st.nextReview && st.nextReview <= todayISODate()) {
          due += 1;
        }
        if (st.confidence === "confident") {
          confScore += 2;
          confN += 1;
        } else if (st.confidence === "somewhat") {
          confScore += 1;
          confN += 1;
        } else if (st.confidence === "not-sure") {
          confN += 1;
        }
      }
    });
    const history = (state.answerHistory || []).filter(function (item) {
      const q = getQuestionById(item.questionId);
      if (typeof QuestionBank !== "undefined" && QuestionBank.isPlaceholder && QuestionBank.isPlaceholder(q)) {
        return false;
      }
      return q && q.objective === objectiveId;
    });
    const recent = history.slice(-20);
    const accuracy = percent(history.filter(function (i) { return i.correct; }).length, history.length);
    const recentAcc = percent(recent.filter(function (i) { return i.correct; }).length, recent.length);
    const coveragePct = percent(seen, bank.length);
    return {
      id: objectiveId,
      title: getObjectiveName(objectiveId),
      available: bank.length,
      seen: seen,
      uniqueAnswered: uniqueAnswered,
      accuracy: accuracy,
      recent: recentAcc,
      mastered: mastered,
      due: due,
      coverage: coveragePct,
      confidence: confN ? Math.round((confScore / (confN * 2)) * 100) : null,
      status: statusFor(bank.length, seen, accuracy, recentAcc, due, confN ? confScore / (confN * 2) : null)
    };
  }

  function statusFor(available, seen, accuracy, recent, due, confRatio) {
    if (!available) {
      return "Low question coverage";
    }
    if (!seen) {
      return "Not Started";
    }
    const exposure = seen / available;
    if (due >= 3 && (accuracy || 0) < 80) {
      return "Needs Review";
    }
    if (exposure < 0.25) {
      return "Low Exposure";
    }
    if ((accuracy || 0) >= 82 && exposure >= 0.55 && due < 2 && (confRatio == null || confRatio >= 0.5)) {
      return "Strong";
    }
    if ((recent || accuracy || 0) >= 70 && exposure >= 0.35) {
      return "Developing";
    }
    return "Learning";
  }

  function allObjectives(state) {
    return getAllObjectiveIds().map(function (id) {
      return objectiveCoverage(state, id);
    });
  }

  function contentGaps(minQuestions) {
    const floor = minQuestions || 6;
    return getAllObjectiveIds().map(function (id) {
      const n = questionsForObjective(id).length;
      return { id: id, title: getObjectiveName(id), available: n, low: n < floor };
    }).filter(function (row) { return row.low; }).sort(function (a, b) { return a.available - b.available; });
  }

  function conceptStats(state, minAttempts) {
    const floor = minAttempts || 3;
    const map = {};
    QUESTIONS.forEach(function (q) {
      const topic = q.topic || "Untagged";
      if (!map[topic]) {
        map[topic] = { topic: topic, domain: q.domain, related: 0, seen: 0, attempted: 0, correct: 0, newCorrect: 0, newTotal: 0, seenCorrect: 0, seenTotal: 0 };
      }
      map[topic].related += 1;
    });
    (state.answerHistory || []).forEach(function (item) {
      const q = getQuestionById(item.questionId);
      if (!q) {
        return;
      }
      const topic = q.topic || "Untagged";
      if (!map[topic]) {
        return;
      }
      const row = map[topic];
      row.attempted += 1;
      if (item.correct) {
        row.correct += 1;
      }
      const prior = (state.questionStats[item.questionId] || {}).attempts || 0;
      if (prior <= 1) {
        row.newTotal += 1;
        if (item.correct) {
          row.newCorrect += 1;
        }
      } else {
        row.seenTotal += 1;
        if (item.correct) {
          row.seenCorrect += 1;
        }
      }
    });
    Object.keys(state.questionStats || {}).forEach(function (id) {
      const q = getQuestionById(id);
      if (q && q.topic && state.questionStats[id].attempts > 0 && map[q.topic]) {
        map[q.topic].seen += 1;
      }
    });
    return Object.keys(map).map(function (key) {
      const row = map[key];
      row.accuracy = percent(row.correct, row.attempted);
      row.newAccuracy = percent(row.newCorrect, row.newTotal);
      row.seenAccuracy = percent(row.seenCorrect, row.seenTotal);
      row.mastery = statusFor(row.related, row.seen, row.accuracy, row.newAccuracy, 0, null);
      return row;
    }).filter(function (row) {
      return row.attempted >= floor;
    }).sort(function (a, b) {
      return (a.accuracy || 0) - (b.accuracy || 0);
    });
  }

  function memorizationHints(state) {
    return conceptStats(state, 4).filter(function (row) {
      return row.seenAccuracy !== null && row.newAccuracy !== null &&
        row.seenTotal >= 3 && row.newTotal >= 3 &&
        row.seenAccuracy - row.newAccuracy >= 18;
    }).slice(0, 4);
  }

  function newVsSeen(state) {
    const items = state.answerHistory || [];
    let newT = 0;
    let newC = 0;
    let seenT = 0;
    let seenC = 0;
    items.forEach(function (item) {
      const attempts = (state.questionStats[item.questionId] || {}).attempts || 0;
      if (attempts <= 1) {
        newT += 1;
        if (item.correct) {
          newC += 1;
        }
      } else {
        seenT += 1;
        if (item.correct) {
          seenC += 1;
        }
      }
    });
    return {
      newAccuracy: percent(newC, newT),
      seenAccuracy: percent(seenC, seenT),
      newTotal: newT,
      seenTotal: seenT
    };
  }

  function recurringMisconceptions(state) {
    const map = {};
    Object.keys(state.questionStats || {}).forEach(function (id) {
      const st = state.questionStats[id];
      if (!st || !st.misconceptionRisk) {
        return;
      }
      const q = getQuestionById(id);
      if (!q) {
        return;
      }
      const key = q.topic || q.objective || id;
      if (!map[key]) {
        map[key] = { topic: key, objective: q.objective, count: 0, questionIds: [] };
      }
      map[key].count += 1;
      map[key].questionIds.push(id);
    });
    (state.errorJournal || []).forEach(function (row) {
      if (row.times >= 2 && row.confidence === "confident") {
        const key = row.topic;
        if (!map[key]) {
          map[key] = { topic: key, objective: row.objective, count: row.times, questionIds: [row.questionId] };
        }
      }
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .filter(function (row) { return row.count >= 2; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  function weakObjectives(state, minSeen) {
    return allObjectives(state).filter(function (row) {
      return row.seen >= (minSeen || 3) && row.accuracy !== null && row.accuracy < 72;
    }).sort(function (a, b) { return (a.recent || a.accuracy) - (b.recent || b.accuracy); });
  }

  function lowExposureObjectives(state) {
    return allObjectives(state).filter(function (row) {
      return row.available >= 4 && (row.seen / row.available) < 0.25;
    });
  }

  return {
    questionsForObjective: questionsForObjective,
    objectiveCoverage: objectiveCoverage,
    allObjectives: allObjectives,
    contentGaps: contentGaps,
    conceptStats: conceptStats,
    memorizationHints: memorizationHints,
    newVsSeen: newVsSeen,
    recurringMisconceptions: recurringMisconceptions,
    weakObjectives: weakObjectives,
    lowExposureObjectives: lowExposureObjectives,
    statusFor: statusFor
  };
})();
