var Analytics = (function () {
  function isStudyBankId(id) {
    if (typeof getQuestionById !== "function") {
      return true;
    }
    const q = getQuestionById(id);
    if (!q) {
      return false;
    }
    if (typeof QuestionBank !== "undefined" && QuestionBank.isPlaceholder(q)) {
      return false;
    }
    return !q.source || q.source === "original";
  }

  function coverage(state) {
    const seen = Object.keys(state.questionStats || {}).filter(function (id) {
      return isStudyBankId(id) && state.questionStats[id] && state.questionStats[id].attempts > 0;
    }).length;
    const total = QUESTIONS.length;
    return {
      seen: seen,
      total: total,
      percent: percent(seen, total)
    };
  }

  function domainCoverage(state, domainId) {
    const total = getQuestionsByDomain(domainId).length;
    const seen = Object.keys(state.questionStats || {}).filter(function (id) {
      const q = getQuestionById(id);
      return isStudyBankId(id) && q && q.domain === domainId && state.questionStats[id].attempts > 0;
    }).length;
    return { seen: seen, total: total, percent: percent(seen, total) };
  }

  function weakDomains(state, minAttempts) {
    const floor = minAttempts || 3;
    return DOMAINS.map(function (domain) {
      const stats = getDomainStats(state, domain.id);
      return {
        id: domain.id,
        name: domain.shortName,
        attempted: stats.attempted,
        accuracy: percent(stats.correct, stats.attempted)
      };
    }).filter(function (row) {
      return row.attempted >= floor && row.accuracy !== null;
    }).sort(function (a, b) {
      return a.accuracy - b.accuracy;
    });
  }

  function weakTopics(state, minAttempts) {
    const floor = minAttempts || 3;
    const map = {};
    (state.answerHistory || []).forEach(function (item) {
      const q = getQuestionById(item.questionId);
      if (!q || !q.topic) {
        return;
      }
      if (!map[q.topic]) {
        map[q.topic] = { topic: q.topic, domain: q.domain, attempted: 0, correct: 0 };
      }
      map[q.topic].attempted += 1;
      if (item.correct) {
        map[q.topic].correct += 1;
      }
    });
    return Object.keys(map).map(function (key) {
      const row = map[key];
      row.accuracy = percent(row.correct, row.attempted);
      return row;
    }).filter(function (row) {
      return row.attempted >= floor;
    }).sort(function (a, b) {
      return a.accuracy - b.accuracy;
    });
  }

  function objectiveStats(state, domainId) {
    const list = (EXAM_CONFIG.objectives[domainId] || []).map(function (obj) {
      const answers = (state.answerHistory || []).filter(function (item) {
        const q = getQuestionById(item.questionId);
        return q && q.objective === obj.id;
      });
      const correct = answers.filter(function (item) { return item.correct; }).length;
      return {
        id: obj.id,
        name: obj.name,
        attempted: answers.length,
        correct: correct,
        accuracy: percent(correct, answers.length)
      };
    }).filter(function (row) {
      return row.attempted > 0;
    });
    return list;
  }

  function trend(state, domainId) {
    const items = (state.answerHistory || []).filter(function (item) {
      return !domainId || item.domain === domainId;
    });
    if (items.length < 8) {
      return null;
    }
    const mid = Math.floor(items.length / 2);
    const older = items.slice(0, mid);
    const newer = items.slice(mid);
    const oldPct = percent(older.filter(function (i) { return i.correct; }).length, older.length);
    const newPct = percent(newer.filter(function (i) { return i.correct; }).length, newer.length);
    if (oldPct === null || newPct === null) {
      return null;
    }
    if (newPct >= oldPct + 8) {
      return "improving";
    }
    if (newPct <= oldPct - 8) {
      return "declining";
    }
    return "steady";
  }

  function examSessions(state) {
    return (state.sessionHistory || []).filter(function (s) {
      return String(s.type || "").indexOf("exam") === 0;
    });
  }

  function examConsistency(exams) {
    const last = exams.slice(0, 4).map(function (e) { return e.percent; }).filter(function (n) { return typeof n === "number"; });
    if (last.length < 2) {
      return null;
    }
    const mean = last.reduce(function (a, b) { return a + b; }, 0) / last.length;
    const variance = last.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / last.length;
    return { mean: Math.round(mean), spread: Math.round(Math.sqrt(variance)), count: last.length };
  }

  function readiness(state) {
    const recent = getRecentAccuracy(state, 50);
    const cov = coverage(state);
    const due = getDueReviews(state).length;
    const weak = weakDomains(state, 5);
    const weakest = weak[0];
    const exams = examSessions(state);
    const examAvg = exams.length ? percent(exams.slice(0, 3).reduce(function (a, e) { return a + (e.score || 0); }, 0), exams.slice(0, 3).reduce(function (a, e) { return a + (e.total || 0); }, 0)) : null;
    const consist = examConsistency(exams);
    const pbqAcc = percent(state.pbqStats.correct, state.pbqStats.attempted);
    const nv = typeof Coverage !== "undefined" ? Coverage.newVsSeen(state) : { newAccuracy: null, seenAccuracy: null };
    const weakObj = typeof Coverage !== "undefined" ? Coverage.weakObjectives(state, 3)[0] : null;
    const lowExp = typeof Coverage !== "undefined" ? Coverage.lowExposureObjectives(state) : [];
    const miss = typeof Coverage !== "undefined" ? Coverage.recurringMisconceptions(state) : [];
    const domainsCovered = DOMAINS.filter(function (d) {
      return (Coverage ? Coverage.allObjectives(state) : []).filter(function (o) {
        return getObjectiveDomainId(o.id) === d.id && o.seen > 0;
      }).length >= 2;
    }).length;

    let index = 0;
    if (recent != null) {
      index += recent * 0.28;
    }
    if (examAvg != null) {
      index += examAvg * 0.22;
    } else {
      index += (recent || 0) * 0.08;
    }
    index += Math.min(25, (cov.percent || 0) * 0.22);
    if (consist && consist.spread <= 6) {
      index += 6;
    } else if (consist && consist.spread >= 14) {
      index -= 6;
    }
    if (weakest && weakest.accuracy < 60) {
      index -= 10;
    } else if (weakest && weakest.accuracy < 70) {
      index -= 5;
    }
    if (due >= 12) {
      index -= 6;
    }
    if (pbqAcc != null && pbqAcc < 65 && state.pbqStats.attempted >= 3) {
      index -= 5;
    } else if (pbqAcc != null && pbqAcc >= 80) {
      index += 3;
    }
    if (nv.newAccuracy != null && nv.seenAccuracy != null && nv.seenAccuracy - nv.newAccuracy >= 20) {
      index -= 5;
    }
    if (miss.length >= 2) {
      index -= 4;
    }
    index = clamp(Math.round(index), 0, 100);

    let evidence = 0;
    if (state.totalAnswered >= 80) { evidence += 1; }
    if (state.totalAnswered >= 20) { evidence += 1; }
    if ((cov.percent || 0) >= 35) { evidence += 1; }
    if (exams.length >= 1) { evidence += 1; }
    if (exams.some(function (e) { return (e.total || 0) >= 60; }) || exams.filter(function (e) { return (e.total || 0) >= 30; }).length >= 2) { evidence += 1; }
    const confidence = evidence >= 4 ? "High" : evidence >= 2 ? "Medium" : "Low";

    let category = "Needs Work";
    if (state.totalAnswered < 10 || (cov.percent || 0) < 12) {
      category = "Needs Work";
    } else if (index >= 82) {
      category = "Strong";
    } else if (index >= 68) {
      category = "Nearly Ready";
    } else if (state.totalAnswered >= 10) {
      category = "Developing";
    }

    const blockers = [];
    const longExam = exams.some(function (e) { return (e.total || 0) >= 60; }) ||
      exams.filter(function (e) { return (e.total || 0) >= 30; }).length >= 2;
    if ((cov.percent || 0) < 60) {
      blockers.push("Question-bank coverage is " + (cov.percent || 0) + "%.");
    }
    if (weakest && weakest.accuracy < 65) {
      blockers.push(weakest.name + " accuracy is " + weakest.accuracy + "%.");
    }
    if (lowExp.length >= 3) {
      blockers.push(lowExp.length + " objectives have low exposure.");
    }
    if (due >= 8) {
      blockers.push(due + " review questions are overdue.");
    }
    if (pbqAcc != null && pbqAcc < 70 && state.pbqStats.attempted >= 2) {
      blockers.push("PBQ-style practice score is " + pbqAcc + "%.");
    }
    if (!longExam) {
      blockers.push("No 60-question exam (or two 30-question exams) yet.");
    }
    if (domainsCovered < 4) {
      blockers.push("Fewer than four domains have meaningful objective coverage.");
    }

    if (category === "Strong") {
      if ((cov.percent || 0) < 60 || !longExam || (weakest && weakest.accuracy < 65) || state.totalAnswered < 80) {
        category = "Nearly Ready";
        index = Math.min(index, 79);
      }
    }

    let improve = "Take a mixed quiz to start measuring readiness.";
    if (due >= 8) {
      improve = "Clear overdue reviews first.";
    } else if (weakObj) {
      improve = "Complete a weak-area drill for " + weakObj.id + ".";
    } else if (!longExam && state.totalAnswered >= 20) {
      improve = "Take a 60-question exam to raise readiness confidence.";
    } else if (lowExp[0]) {
      improve = "Practice unseen questions in " + lowExp[0].id + ".";
    } else if (miss[0]) {
      improve = "Review recurring mistakes on " + miss[0].topic + ".";
    } else if (category === "Strong") {
      improve = "Keep a full simulation in the mix so readiness stays evidence-based.";
    }

    return {
      category: category,
      index: index,
      confidence: confidence,
      recent: recent,
      coverage: cov,
      factor: blockers[0] || improve,
      blockers: blockers,
      improve: improve,
      weakest: weakest || null,
      weakObjective: weakObj || null,
      examAvg: examAvg,
      consistency: consist,
      newVsSeen: nv
    };
  }

  function recommendation(state) {
    if (state.totalAnswered < 8) {
      return {
        title: "Take your first diagnostic quiz",
        body: "25 mixed SY0-701 questions to find a starting domain.",
        action: "diagnostic",
        label: "Start diagnostic"
      };
    }
    const ready = readiness(state);
    const due = getDueReviews(state);
    const miss = typeof Coverage !== "undefined" ? Coverage.recurringMisconceptions(state)[0] : null;
    const weakObj = ready.weakObjective;
    const mem = typeof Coverage !== "undefined" ? Coverage.memorizationHints(state)[0] : null;
    const scores = [];
    if (due.length >= 4) {
      scores.push({ score: 90 + due.length, title: due.length + " questions are due for review", body: "Spaced review protects yesterday's work.", action: "review-due", label: "Start review" });
    }
    if (miss) {
      scores.push({ score: 86, title: "Recurring misconception: " + miss.topic, body: "You have missed this concept more than once while confident.", action: "fix-concept", label: "Fix this concept", topic: miss.topic });
    }
    if (weakObj) {
      scores.push({ score: 80, title: "Practice " + weakObj.id + " — " + (weakObj.recent || weakObj.accuracy) + "%", body: weakObj.title, action: "weak-objective", label: "Weak-area drill", objective: weakObj.id });
    }
    if (mem) {
      scores.push({ score: 74, title: "You know familiar " + mem.topic + " items better than new ones", body: "Try a mixed drill with unseen questions.", action: "unseen-topic", label: "Unseen drill", topic: mem.topic });
    }
    const exams = examSessions(state);
    if (state.totalAnswered >= 40 && exams.length < 1) {
      scores.push({ score: 70, title: "Take a 30-question exam to improve readiness confidence", body: "Readiness confidence is " + ready.confidence + " until you sit a timed set.", action: "exam", label: "Exam Mode" });
    }
    if (!scores.length) {
      scores.push({ score: 50, title: "Run Adaptive Study", body: ready.improve, action: "adaptive", label: "Start adaptive study" });
    }
    scores.sort(function (a, b) { return b.score - a.score; });
    return scores[0];
  }

  return {
    coverage: coverage,
    domainCoverage: domainCoverage,
    weakDomains: weakDomains,
    weakTopics: weakTopics,
    objectiveStats: objectiveStats,
    trend: trend,
    readiness: readiness,
    recommendation: recommendation,
    examSessions: examSessions
  };
})();
