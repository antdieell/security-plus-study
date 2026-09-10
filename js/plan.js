var Plan = (function () {
  const EST = {
    question: 1,
    review: 1,
    flashcard: 0.25,
    pbq: 4,
    rapid: 5
  };

  function todayPlan(state) {
    const today = todayISODate();
    const existing = (state.dailyPlans || []).filter(function (p) { return p.date === today; })[0];
    if (existing && existing.tasks && existing.tasks.length) {
      return existing;
    }
    return null;
  }

  function estimateLabel(minutes) {
    return "~" + minutes + " min";
  }

  function build(state, minutesTarget) {
    const minutes = minutesTarget || state.prefs.studyMinutes || 25;
    const tasks = [];
    let used = 0;
    const due = getDueReviews(state);
    const cards = getReviewFlashcardIds(state);
    const weakObj = Coverage.weakObjectives(state, 3)[0];
    const lowExp = Coverage.lowExposureObjectives(state)[0];
    const misconceptions = Coverage.recurringMisconceptions(state)[0];
    const pbqWeak = weakestPbq(state);
    const usedDomains = {};

    function add(task, cost) {
      if (used + cost > minutes + 4) {
        return false;
      }
      if (task.domain && usedDomains[task.domain] >= 2) {
        return false;
      }
      tasks.push(task);
      used += cost;
      if (task.domain) {
        usedDomains[task.domain] = (usedDomains[task.domain] || 0) + 1;
      }
      return true;
    }

    if (due.length) {
      const n = Math.min(due.length, minutes <= 10 ? 4 : 8);
      add({
        id: "review-due",
        type: "review",
        title: "Review " + n + " due questions",
        estimate: Math.max(3, Math.round(n * EST.review)),
        payload: { questionIds: due.slice(0, n) },
        status: "pending"
      }, Math.max(3, Math.round(n * EST.review)));
    }

    if (misconceptions && minutes >= 20) {
      add({
        id: "fix-concept",
        type: "concept",
        title: "Fix this concept: " + misconceptions.topic,
        estimate: 6,
        domain: getObjectiveDomainId(misconceptions.objective),
        payload: { topic: misconceptions.topic, questionIds: misconceptions.questionIds.slice(0, 5) },
        status: "pending"
      }, 6);
    }

    if (weakObj && minutes >= 15) {
      const n = minutes >= 45 ? 15 : 10;
      add({
        id: "weak-obj",
        type: "quiz",
        title: "Practice " + weakObj.id + " — " + (weakObj.recent || weakObj.accuracy) + "% recent",
        estimate: n,
        domain: getObjectiveDomainId(weakObj.id),
        payload: { objective: weakObj.id, count: n, mode: "weak-area" },
        status: "pending"
      }, n);
    } else if (lowExp && minutes >= 15) {
      add({
        id: "low-exp",
        type: "quiz",
        title: "Cover unseen " + lowExp.id,
        estimate: 8,
        domain: getObjectiveDomainId(lowExp.id),
        payload: { objective: lowExp.id, count: 8, status: "unseen", mode: "weak-area" },
        status: "pending"
      }, 8);
    }

    if (pbqWeak && minutes >= 20 && used < minutes - 3) {
      add({
        id: "pbq",
        type: "pbq",
        title: "PBQ: " + pbqWeak.title,
        estimate: EST.pbq,
        domain: pbqWeak.domain,
        payload: { pbqId: pbqWeak.id },
        status: "pending"
      }, EST.pbq);
    }

    if (cards.length && used < minutes - 2) {
      const n = Math.min(cards.length, minutes <= 15 ? 6 : 10);
      add({
        id: "cards",
        type: "flashcards",
        title: "Review " + n + " flashcards",
        estimate: Math.max(2, Math.round(n * EST.flashcard)),
        payload: { filter: "due" },
        status: "pending"
      }, 3);
    }

    if (!tasks.length) {
      add({
        id: "mixed",
        type: "quiz",
        title: "Mixed 10-question quiz",
        estimate: 8,
        payload: { count: 10, mode: "quick" },
        status: "pending"
      }, 8);
    }

    if (minutes >= 30 && used < minutes - 5) {
      add({
        id: "rapid",
        type: "rapid",
        title: "Rapid review (ports, acronyms, concepts)",
        estimate: EST.rapid,
        payload: {},
        status: "pending"
      }, EST.rapid);
    }

    return {
      date: todayISODate(),
      minutesTarget: minutes,
      tasks: tasks,
      generatedAt: Date.now()
    };
  }

  function weakestPbq(state) {
    const byId = (state.pbqStats && state.pbqStats.byId) || {};
    let worst = null;
    PBQS.forEach(function (p) {
      const row = byId[p.id];
      if (!row || !row.attempted) {
        if (!worst) {
          worst = p;
        }
        return;
      }
      const acc = percent(row.correct, row.attempted);
      if (acc !== null && acc < 70 && (!worst || acc < 70)) {
        worst = p;
      }
    });
    return worst;
  }

  function persist(plan) {
    return updateState(function (state) {
      state.activePlan = plan;
      const today = todayISODate();
      state.dailyPlans = (state.dailyPlans || []).filter(function (p) { return p.date !== today; });
      state.dailyPlans.unshift(plan);
      state.dailyPlans = state.dailyPlans.slice(0, 30);
    });
  }

  function ensure(state) {
    let plan = todayPlan(state);
    if (!plan) {
      plan = build(state, state.prefs.studyMinutes || 25);
      persist(plan);
    }
    return plan;
  }

  function completedCount(plan) {
    return (plan.tasks || []).filter(function (t) { return t.status === "done"; }).length;
  }

  function nextTask(plan) {
    return (plan.tasks || []).filter(function (t) { return t.status !== "done"; })[0] || null;
  }

  function completeTask(taskId) {
    return updateState(function (state) {
      const plan = todayPlan(state) || state.activePlan;
      if (!plan) {
        return;
      }
      plan.tasks.forEach(function (t) {
        if (t.id === taskId) {
          t.status = "done";
        }
      });
      state.activePlan = plan;
      const today = todayISODate();
      state.dailyPlans = (state.dailyPlans || []).filter(function (p) { return p.date !== today; });
      state.dailyPlans.unshift(plan);
    });
  }

  function launch(task) {
    if (!task) {
      return;
    }
    updateState(function (state) {
      state.activePlan = state.activePlan || todayPlan(state);
      if (state.activePlan) {
        state.activePlan.currentTaskId = task.id;
      }
    });
    if (task.type === "review" || task.type === "quiz" || task.type === "concept") {
      const payload = task.payload || {};
      if (payload.mode === "weak-area" && typeof Adaptive !== "undefined") {
        Adaptive.start(payload.count || 10, {
          objective: payload.objective,
          topic: payload.topic,
          domainId: payload.domainId,
          mode: "weak-area",
          planTaskId: task.id
        });
        return;
      }
      Quiz.start({
        count: payload.count || (payload.questionIds ? payload.questionIds.length : 10),
        questionIds: payload.questionIds,
        objective: payload.objective,
        status: payload.status,
        mode: payload.mode || task.type,
        reviewSession: task.type === "review" || task.type === "concept",
        planTaskId: task.id
      });
    } else if (task.type === "pbq") {
      location.hash = "pbq";
      window.setTimeout(function () {
        if (task.payload && task.payload.pbqId) {
          Pbq.start(task.payload.pbqId);
        }
      }, 0);
    } else if (task.type === "flashcards") {
      location.hash = "flashcards/play";
    } else if (task.type === "rapid") {
      location.hash = "rapid";
    }
  }

  function maybeCompleteFromSession(sessionType) {
    const state = getAppState();
    const plan = todayPlan(state);
    if (!plan || !plan.currentTaskId) {
      return null;
    }
    const task = plan.tasks.filter(function (t) { return t.id === plan.currentTaskId; })[0];
    if (!task || task.status === "done") {
      return null;
    }
    completeTask(task.id);
    return nextTask(todayPlan(getAppState()) || plan);
  }

  return {
    EST: EST,
    build: build,
    ensure: ensure,
    persist: persist,
    todayPlan: todayPlan,
    completedCount: completedCount,
    nextTask: nextTask,
    completeTask: completeTask,
    launch: launch,
    maybeCompleteFromSession: maybeCompleteFromSession,
    estimateLabel: estimateLabel
  };
})();
