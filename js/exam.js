var Exam = (function () {
  let session = null;
  let timerId = null;

  function persist() {
    if (!session || session.empty) {
      return;
    }
    persistActiveSession({
      kind: "exam",
      type: session.type,
      questionIds: session.questions.map(function (q) { return q.id; }),
      index: session.index,
      answers: session.answers,
      flags: session.flags,
      startedAt: session.startedAt,
      durationMs: session.durationMs,
      count: session.questions.length
    });
  }

  function restore(saved) {
    const questions = getQuestionsByIds(saved.questionIds || []);
    if (!questions.length) {
      return false;
    }
    session = {
      empty: false,
      type: saved.type || "exam30",
      questions: questions,
      index: saved.index || 0,
      answers: saved.answers || {},
      flags: saved.flags || [],
      startedAt: saved.startedAt,
      durationMs: saved.durationMs,
      results: null
    };
    return true;
  }

  function remainingMs() {
    if (!session) {
      return 0;
    }
    return Math.max(0, session.durationMs - (Date.now() - session.startedAt));
  }

  function startTimer() {
    stopTimer();
    timerId = window.setInterval(function () {
      if (!session) {
        return;
      }
      if (remainingMs() <= 0) {
        stopTimer();
        finish(true);
        return;
      }
      const label = document.getElementById("exam-timer");
      if (label) {
        label.textContent = formatDuration(remainingMs());
      }
      if (getAppState().prefs.examAlerts && remainingMs() <= 5 * 60 * 1000 && remainingMs() > 5 * 60 * 1000 - 1500 && !session.alerted) {
        session.alerted = true;
        if (App.toast) {
          App.toast("About 5 minutes remaining.");
        }
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function isPbqQuestion(q) {
    return !!(q && (q.questionType === "pbq" || q.type === "pbq" || q.pbq));
  }

  function captureCurrent() {
    const q = current();
    if (!q || !isPbqQuestion(q) || typeof PbqEngine === "undefined") {
      return;
    }
    const host = document.getElementById("exam-pbq-live");
    if (host) {
      session.answers[q.id] = PbqEngine.getAnswer(host);
    }
  }

  function start(modeKey) {
    const mode = EXAM_CONFIG.modes[modeKey] || EXAM_CONFIG.modes.exam30;
    let questions = [];
    if (mode.source === "messer" && mode.exam && typeof QuestionBank !== "undefined") {
      questions = QuestionBank.getMesserExam(mode.exam);
      if (questions.length > mode.count) {
        questions = questions.slice(0, mode.count);
      }
    } else if (mode.source === "mixed" && typeof QuestionBank !== "undefined") {
      const pool = QuestionBank.getPool({ source: "mixed" });
      questions = (typeof pickExamQuestions === "function" ? pickExamQuestions(mode.count, { pool: pool }) : pickWeightedQuestions(mode.count, pool));
    } else {
      let count = mode.count;
      if (count > QUESTIONS.length) {
        count = QUESTIONS.length;
      }
      questions = (typeof pickExamQuestions === "function" ? pickExamQuestions : pickWeightedQuestions)(count);
    }
    session = {
      empty: !questions.length,
      type: modeKey,
      questions: questions,
      index: 0,
      answers: {},
      flags: [],
      startedAt: Date.now(),
      durationMs: mode.minutes * 60 * 1000,
      results: null,
      requested: mode.count,
      used: questions.length
    };
    persist();
    location.hash = "exam/play";
    render();
  }

  function current() {
    return session && session.questions[session.index];
  }

  function counts() {
    const total = session.questions.length;
    let answered = 0;
    session.questions.forEach(function (q) {
      if (session.answers[q.id] !== undefined && session.answers[q.id] !== null) {
        answered += 1;
      }
    });
    return {
      total: total,
      answered: answered,
      unanswered: total - answered,
      flagged: session.flags.length
    };
  }

  function select(index) {
    const q = current();
    if (!q) {
      return;
    }
    session.answers[q.id] = index;
    persist();
    render();
  }

  function go(delta) {
    captureCurrent();
    session.index = clamp(session.index + delta, 0, session.questions.length - 1);
    persist();
    render();
  }

  function jump(i) {
    captureCurrent();
    session.index = i;
    persist();
    render();
  }

  function toggleFlag() {
    const q = current();
    if (!q) {
      return;
    }
    const i = session.flags.indexOf(q.id);
    if (i === -1) {
      session.flags.push(q.id);
    } else {
      session.flags.splice(i, 1);
    }
    persist();
    render();
  }

  function confirmSubmit() {
    captureCurrent();
    persist();
    const c = counts();
    App.showModal({
      title: "Submit exam?",
      body: "Answered " + c.answered + ", unanswered " + c.unanswered + ", flagged " + c.flagged + ". You cannot change answers after submit.",
      confirmLabel: "Submit exam",
      cancelLabel: "Return to exam",
      onConfirm: function () {
        finish(false);
      }
    });
  }

  function finish(auto) {
    stopTimer();
    const answers = [];
    const domainResults = {};
    const objectiveMap = {};
    const missedIds = [];
    session.questions.forEach(function (q) {
      const selected = session.answers[q.id];
      const unanswered = selected === undefined || selected === null;
      let correct = false;
      if (!unanswered) {
        if (isPbqQuestion(q) && q.pbq && typeof PbqEngine !== "undefined") {
          correct = !!PbqEngine.score(q.pbq, selected).correct;
        } else {
          correct = selected === q.correctAnswer;
        }
      }
      answers.push({
        questionId: q.id,
        domain: q.domain,
        objective: q.objective,
        selected: unanswered ? null : selected,
        correct: correct,
        unanswered: unanswered
      });
      if (!domainResults[q.domain]) {
        domainResults[q.domain] = { attempted: 0, correct: 0, unanswered: 0 };
      }
      domainResults[q.domain].attempted += 1;
      if (unanswered) {
        domainResults[q.domain].unanswered += 1;
      } else if (correct) {
        domainResults[q.domain].correct += 1;
      }
      if (q.objective) {
        if (!objectiveMap[q.objective]) {
          objectiveMap[q.objective] = { attempted: 0, correct: 0 };
        }
        objectiveMap[q.objective].attempted += 1;
        if (correct) {
          objectiveMap[q.objective].correct += 1;
        }
      }
      if (!unanswered) {
        recordQuestionAnswer({
          domainId: q.domain,
          isCorrect: correct,
          questionId: q.id,
          sessionType: session.type,
          source: q.source,
          exam: q.exam
        });
      }
      if (!correct) {
        missedIds.push(q.id);
      }
    });
    const correctCount = answers.filter(function (a) { return a.correct; }).length;
    const unanswered = answers.filter(function (a) { return a.unanswered; }).length;
    const results = {
      date: Date.now(),
      type: session.type,
      mode: session.type,
      score: correctCount,
      total: session.questions.length,
      percent: percent(correctCount, session.questions.length),
      unanswered: unanswered,
      missedCount: missedIds.length,
      missedIds: missedIds,
      flaggedIds: session.flags.slice(),
      domainResults: domainResults,
      objectiveResults: objectiveMap,
      durationMs: Math.min(session.durationMs, Date.now() - session.startedAt),
      timedOut: !!auto,
      responses: answers
    };
    session.results = results;
    session.reviewFilter = "all";
    session.reviewIndex = 0;
    results.questionIds = session.questions.map(function (q) { return q.id; });
    recordSession(results);
    updatePersonalBest(session.type === "examWeighted" ? "exam30" : session.type, results.percent);
    if (typeof Analytics !== "undefined") {
      maybeRecordReadiness(Analytics.readiness(getAppState()));
    }
    clearActiveSession();
    location.hash = "exam/results";
    render();
    if (typeof App !== "undefined") {
      App.refreshChrome();
    }
  }

  function renderSetup(root) {
    const avail = QUESTIONS.length;
    const fullCount = Math.min(EXAM_CONFIG.fullQuestionCount, avail);
    const counts = typeof QuestionBank !== "undefined" ? QuestionBank.counts() : { A: 0, B: 0, C: 0 };
    root.innerHTML =
      "<p class=\"page-kicker\">Exam Mode · " + escapeHtml(EXAM_CONFIG.displayName) + "</p>" +
      "<h1 class=\"page-title\">Practice exam</h1>" +
      "<div class=\"card\" style=\"margin-bottom:12px\"><p style=\"margin:0\"><strong>Exam Mode hides answers until you submit.</strong> You can move back and forth and flag items. The timer keeps running if you leave and return.</p></div>" +
      (avail < 90 ? "<p class=\"muted\">Full simulation will use " + fullCount + " questions (bank has " + avail + ").</p>" : "") +
      "<div class=\"stack\">" +
        "<button class=\"card card-button\" data-exam=\"start\" data-mode=\"exam30\"><strong>30-question exam</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">30 minutes · Current Study Bank</span></button>" +
        "<button class=\"card card-button\" data-exam=\"start\" data-mode=\"exam60\"><strong>60-question exam</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">60 minutes · Current Study Bank</span></button>" +
        "<button class=\"card card-button\" data-exam=\"start\" data-mode=\"exam90\"><strong>Full simulation</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">" + fullCount + " questions · " + EXAM_CONFIG.modes.exam90.minutes + " minutes · Current Study Bank</span></button>" +
        "<button class=\"card card-button\" data-exam=\"start\" data-mode=\"examWeighted\"><strong>Weighted random exam</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">30 questions using the SY0-701 domain blueprint. Prefers unseen and less-used items.</span></button>" +
        "<button class=\"card card-button\" data-exam=\"start\" data-mode=\"messerA\"><strong>Professor Messer Exam A</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">90 minutes · " + counts.A + " items" + (counts.A < 90 ? " (placeholders until private import)" : "") + "</span></button>" +
        "<button class=\"card card-button\" data-exam=\"start\" data-mode=\"messerB\"><strong>Professor Messer Exam B</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">90 minutes · " + counts.B + " items" + (counts.B < 90 ? " (placeholders until private import)" : "") + "</span></button>" +
        "<button class=\"card card-button\" data-exam=\"start\" data-mode=\"messerC\"><strong>Professor Messer Exam C</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">90 minutes · " + counts.C + " items" + (counts.C < 90 ? " (placeholders until private import)" : "") + "</span></button>" +
        "<button class=\"card card-button\" data-exam=\"start\" data-mode=\"examMixed\"><strong>Mixed Practice exam</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">90 questions · 90 minutes · Study Bank + Messer overlay</span></button>" +
        "<button class=\"btn btn-secondary\" data-exam=\"hub\">Back to Practice</button>" +
      "</div>";
  }

  function navigatorHtml() {
    return session.questions.map(function (q, i) {
      const answered = session.answers[q.id] !== undefined && session.answers[q.id] !== null;
      const flagged = session.flags.indexOf(q.id) !== -1;
      const classes = ["nav-dot"];
      if (i === session.index) {
        classes.push("is-current");
      }
      if (answered) {
        classes.push("is-answered");
      }
      if (flagged) {
        classes.push("is-flagged");
      }
      return "<button class=\"" + classes.join(" ") + "\" data-exam=\"jump\" data-index=\"" + i + "\" aria-label=\"Question " + (i + 1) + (answered ? " answered" : " unanswered") + (flagged ? " flagged" : "") + "\">" + (i + 1) + "</button>";
    }).join("");
  }

  function renderPlay(root) {
    const q = current();
    const c = counts();
    const selected = session.answers[q.id];
    const flagged = session.flags.indexOf(q.id) !== -1;
    const letters = ["A", "B", "C", "D", "E", "F"];
    const pbqMode = isPbqQuestion(q);
    const options = pbqMode ? "" : (q.options || []).map(function (opt, i) {
      return "<button class=\"option" + (selected === i ? " is-selected" : "") + "\" data-exam=\"select\" data-index=\"" + i + "\"><span class=\"letter\">" + letters[i] + "</span><span>" + escapeHtml(opt) + "</span></button>";
    }).join("");
    root.innerHTML =
      "<div class=\"quiz-top\">" +
        "<div class=\"row-between\"><span class=\"muted\">Question " + (session.index + 1) + " of " + session.questions.length + "</span>" +
        "<strong id=\"exam-timer\">" + formatDuration(remainingMs()) + "</strong></div>" +
        "<p class=\"muted\" style=\"margin:8px 0 0\">Answered " + c.answered + " · Unanswered " + c.unanswered + " · Flagged " + c.flagged + "</p>" +
        "<div class=\"bar\" style=\"margin-top:10px\"><span style=\"width:" + Math.round((c.answered / c.total) * 100) + "%\"></span></div>" +
      "</div>" +
      ((q.placeholder || /^PLACEHOLDER\b/i.test(q.question || ""))
        ? "<div class=\"placeholder-banner\" role=\"status\"><strong>DEVELOPMENT / PLACEHOLDER</strong> Fake item for architecture testing. Not purchased Professor Messer content.</div>"
        : "") +
      "<p class=\"question-text\">" + escapeHtml(q.question) + "</p>" +
      (pbqMode ? "<div id=\"exam-pbq-live\" class=\"stack\"></div>" : "<div class=\"stack\">" + options + "</div>") +
      "<div class=\"controls-row\" style=\"margin-top:14px\">" +
        "<button class=\"btn btn-secondary\" data-exam=\"prev\"" + (session.index === 0 ? " disabled" : "") + ">Previous</button>" +
        "<button class=\"btn btn-secondary\" data-exam=\"next\"" + (session.index === session.questions.length - 1 ? " disabled" : "") + ">Next</button>" +
      "</div>" +
      "<div class=\"stack\" style=\"margin-top:10px\">" +
        "<button class=\"btn btn-secondary\" data-exam=\"flag\">" + (flagged ? "Flagged ✓" : "Flag for review") + "</button>" +
        "<button class=\"btn btn-secondary\" data-exam=\"toggle-nav\">Question list</button>" +
        "<button class=\"btn btn-primary\" data-exam=\"confirm\">Submit exam</button>" +
      "</div>" +
      "<div id=\"exam-nav-panel\" hidden class=\"card\" style=\"margin-top:12px\"><div class=\"nav-grid\">" + navigatorHtml() + "</div></div>";
    if (pbqMode && q.pbq && typeof PbqEngine !== "undefined") {
      const host = document.getElementById("exam-pbq-live");
      if (host) {
        PbqEngine.render(host, q.pbq, { review: false, saved: selected });
      }
    }
    startTimer();
  }

  function readinessLabel(pct) {
    if (pct >= 85) {
      return "Strong";
    }
    if (pct >= 75) {
      return "Nearly Ready";
    }
    if (pct >= 60) {
      return "Developing";
    }
    return "Needs Work";
  }

  function renderResults(root) {
    if (!session || !session.results) {
      renderSetup(root);
      return;
    }
    const r = session.results;
    const domainHtml = Object.keys(r.domainResults).map(function (id) {
      const s = r.domainResults[id];
      const pct = percent(s.correct, s.attempted);
      return "<div class=\"card\"><div class=\"row-between\"><strong>" + escapeHtml(getDomainShortName(id)) + "</strong><span>" + formatPercent(pct) + "</span></div><div class=\"bar\" style=\"margin-top:8px\"><span style=\"width:" + (pct || 0) + "%\"></span></div></div>";
    }).join("");
    const objKeys = Object.keys(r.objectiveResults || {});
    const objHtml = objKeys.length
      ? objKeys.map(function (id) {
        const s = r.objectiveResults[id];
        return "<div class=\"row-between\"><span>" + escapeHtml(id) + " " + escapeHtml(getObjectiveName(id) || "") + "</span><span>" + formatPercent(percent(s.correct, s.attempted)) + "</span></div>";
      }).join("")
      : "";
    const weak = Analytics.weakTopics(getAppState(), 3).slice(0, 5).map(function (t) {
      return "<li>" + escapeHtml(t.topic) + " — " + t.accuracy + "%</li>";
    }).join("");
    root.innerHTML =
      "<div class=\"card results-hero\">" +
        "<p class=\"page-kicker\">" + (r.timedOut ? "Time expired — submitted" : "Exam submitted") + "</p>" +
        "<p class=\"results-score\">" + r.score + " / " + r.total + "</p>" +
        "<p style=\"font-size:1.35rem;font-weight:800;margin:0\">Practice score: " + r.percent + "%</p>" +
        "<p>Readiness estimate: <strong>" + readinessLabel(r.percent) + "</strong></p>" +
        "<p class=\"muted\">" + escapeHtml(EXAM_CONFIG.scoreNote) + "</p>" +
        "<p class=\"muted\">Correct " + r.score + " · Incorrect " + (r.total - r.score - r.unanswered) + " · Unanswered " + r.unanswered + " · Time " + formatDuration(r.durationMs) + "</p>" +
      "</div>" +
      "<h2 class=\"section-title\">Performance by domain</h2><div class=\"stack\">" + domainHtml + "</div>" +
      (objHtml ? "<h2 class=\"section-title\">Objectives</h2><div class=\"card stack\">" + objHtml + "</div>" : "") +
      (weak ? "<h2 class=\"section-title\">Weak topics</h2><div class=\"card\"><ul>" + weak + "</ul></div>" : "") +
      (r.flaggedIds && r.flaggedIds.length
        ? "<h2 class=\"section-title\">Flagged</h2><div class=\"stack\">" + r.flaggedIds.map(function (id) {
          const q = getQuestionById(id);
          return q ? "<article class=\"card\"><p class=\"muted\" style=\"margin:0 0 6px\">" + escapeHtml(getDomainShortName(q.domain)) + "</p><p style=\"margin:0;font-weight:700\">" + escapeHtml(q.question) + "</p></article>" : "";
        }).join("") + "</div>"
        : "") +
      "<h2 class=\"section-title\">Missed questions</h2>" +
      "<div class=\"stack\">" +
        (r.missedIds && r.missedIds.length
          ? r.missedIds.map(function (id) {
            const q = getQuestionById(id);
            return q ? "<article class=\"card\"><p class=\"muted\" style=\"margin:0 0 6px\">" + escapeHtml(getDomainShortName(q.domain)) + (q.objective ? " · " + q.objective : "") + "</p><p style=\"margin:0;font-weight:700\">" + escapeHtml(q.question) + "</p></article>" : "";
          }).join("")
          : "<div class=\"card empty\"><strong>No misses on this exam.</strong></div>") +
      "</div>" +
      "<div class=\"stack\" style=\"margin-top:16px\">" +
        "<button class=\"btn btn-primary\" data-exam=\"review-exam\">Review exam</button>" +
        "<button class=\"btn btn-secondary\" data-exam=\"weak\">Study weak areas</button>" +
        "<button class=\"btn btn-secondary\" data-exam=\"another\">Take another exam</button>" +
        "<button class=\"btn btn-secondary\" data-exam=\"home\">Home</button>" +
      "</div>";
  }

  function filteredReview() {
    const filter = session.reviewFilter || "all";
    return session.questions.filter(function (q) {
      const response = session.results.responses.filter(function (r) { return r.questionId === q.id; })[0];
      const flag = session.results.flaggedIds.indexOf(q.id) !== -1;
      const stat = getAppState().questionStats[q.id] || {};
      if (filter === "incorrect") {
        return response && !response.correct && !response.unanswered;
      }
      if (filter === "unanswered") {
        return !response || response.unanswered;
      }
      if (filter === "flagged") {
        return flag;
      }
      if (filter === "low") {
        return stat.confidence === "not-sure" || stat.misconceptionRisk;
      }
      if (filter === "correct") {
        return response && response.correct;
      }
      return true;
    });
  }

  function renderReview(root) {
    if (!session || !session.results) {
      renderSetup(root);
      return;
    }
    const list = filteredReview();
    if (session.reviewIndex >= list.length) {
      session.reviewIndex = 0;
    }
    const q = list[session.reviewIndex];
    const filters = ["all", "incorrect", "unanswered", "flagged", "low", "correct"].map(function (f) {
      const labels = { all: "All", incorrect: "Incorrect", unanswered: "Unanswered", flagged: "Flagged", low: "Low confidence", correct: "Correct" };
      return "<button class=\"chip" + ((session.reviewFilter || "all") === f ? " is-selected" : "") + "\" data-exam=\"filter\" data-filter=\"" + f + "\">" + labels[f] + "</button>";
    }).join("");
    let body = "<div class=\"card empty\"><strong>Nothing in this filter</strong></div>";
    if (q) {
      const response = session.results.responses.filter(function (r) { return r.questionId === q.id; })[0];
      const selected = response && response.selected;
      const flag = session.results.flaggedIds.indexOf(q.id) !== -1;
      const letters = ["A", "B", "C", "D"];
      let status = "Unanswered";
      if (response && response.correct) {
        status = "Correct ✓";
      } else if (response && !response.unanswered) {
        status = "Incorrect ✕";
      }
      const note = getAppState().questionNotes[q.id] || "";
      body = "<article class=\"card\"><p class=\"muted\">" + (session.reviewIndex + 1) + " / " + list.length + " · " + escapeHtml(getDomainShortName(q.domain)) +
        (q.objective && getAppState().prefs.showObjectiveIds !== false ? " · " + q.objective : "") +
        (getAppState().prefs.showDifficulty ? " · " + q.difficulty : "") +
        (flag ? " · Flagged" : "") + "</p><p style=\"font-weight:750\">" + escapeHtml(q.question) +
        "</p><p>" + status + "</p>" +
        ((isPbqQuestion(q) && q.pbq && typeof PbqEngine !== "undefined")
          ? PbqEngine.reviewHtml(q.pbq, selected) +
            "<p>" + escapeHtml(q.explanation || "") + "</p>" +
            (q.objective ? "<p class=\"muted\">Objective: SY0-701 " + escapeHtml(q.objective) + "</p>" : "") +
            "<p class=\"muted\">Source: " + escapeHtml(typeof QuestionBank !== "undefined" ? QuestionBank.sourceLabel(q) : "Current Study Bank") + "</p>"
          : typeof AnswerReview !== "undefined"
          ? AnswerReview.renderHtml(q, selected)
          : "<p>Your answer: " +
            (selected === null || selected === undefined ? "—" : escapeHtml(letters[selected] + ". " + q.options[selected])) +
            "</p><p>Correct: " + escapeHtml(letters[q.correctAnswer] + ". " + q.options[q.correctAnswer]) +
            "</p><p class=\"muted\">" + escapeHtml(q.explanation) + "</p>") +
        (note ? "<p>Your note: " + escapeHtml(note) + "</p>" : "") +
        (q.topic ? "<button class=\"btn btn-secondary\" data-exam=\"study-concept\" data-topic=\"" + escapeHtml(q.topic) + "\">Study this concept</button>" : "") +
        "</article>" +
        "<div class=\"controls-row\" style=\"margin-top:12px\">" +
          "<button class=\"btn btn-secondary\" data-exam=\"rev-prev\"" + (session.reviewIndex === 0 ? " disabled" : "") + ">Previous</button>" +
          "<button class=\"btn btn-secondary\" data-exam=\"rev-next\"" + (session.reviewIndex >= list.length - 1 ? " disabled" : "") + ">Next</button>" +
        "</div>";
    }
    root.innerHTML = "<button class=\"btn btn-ghost\" data-exam=\"results-back\" style=\"padding-left:0\">← Results</button><h1 class=\"page-title\">Review exam</h1><div class=\"chip-row\">" + filters + "</div><div class=\"stack\" style=\"margin-top:12px\">" + body + "</div>";
  }

  function render() {
    const root = document.getElementById("view-exam");
    if (!root) {
      return;
    }
    const hash = (location.hash || "#exam").slice(1);
    if (hash === "exam/play") {
      if (!session) {
        const saved = getAppState().activeSession;
        if (saved && saved.kind === "exam" && restore(saved)) {
          renderPlay(root);
          return;
        }
        renderSetup(root);
      } else if (session.empty) {
        root.innerHTML = "<div class=\"card empty\"><strong>Not enough questions</strong></div>";
      } else if (session.results) {
        renderResults(root);
      } else {
        renderPlay(root);
      }
    } else if (hash === "exam/results") {
      renderResults(root);
    } else if (hash === "exam/review") {
      renderReview(root);
    } else {
      stopTimer();
      renderSetup(root);
    }
  }

  function onClick(event) {
    const el = event.target.closest("[data-exam]");
    if (!el) {
      return;
    }
    const action = el.getAttribute("data-exam");
    if (action === "start") {
      start(el.getAttribute("data-mode"));
    } else if (action === "select") {
      select(Number(el.getAttribute("data-index")));
    } else if (action === "prev") {
      go(-1);
    } else if (action === "next") {
      go(1);
    } else if (action === "jump") {
      jump(Number(el.getAttribute("data-index")));
    } else if (action === "flag") {
      toggleFlag();
    } else if (action === "toggle-nav") {
      const panel = document.getElementById("exam-nav-panel");
      if (panel) {
        panel.hidden = !panel.hidden;
      }
    } else if (action === "confirm") {
      confirmSubmit();
    } else if (action === "review-exam") {
      location.hash = "exam/review";
    } else if (action === "results-back") {
      location.hash = "exam/results";
    } else if (action === "weak") {
      Adaptive.start(20);
    } else if (action === "another") {
      session = null;
      location.hash = "exam";
    } else if (action === "home") {
      location.hash = "home";
    } else if (action === "hub") {
      location.hash = "practice";
    } else if (action === "filter") {
      session.reviewFilter = el.getAttribute("data-filter");
      session.reviewIndex = 0;
      render();
    } else if (action === "rev-prev") {
      session.reviewIndex = Math.max(0, (session.reviewIndex || 0) - 1);
      render();
    } else if (action === "rev-next") {
      session.reviewIndex = (session.reviewIndex || 0) + 1;
      render();
    } else if (action === "study-concept") {
      App.startConceptDrill(el.getAttribute("data-topic"));
    }
  }

  function init() {
    document.getElementById("view-exam").addEventListener("click", onClick);
  }

  return {
    init: init,
    render: render,
    start: start,
    restore: restore,
    hasSession: function () { return !!session && !session.results; },
    abandon: function () {
      stopTimer();
      session = null;
      clearActiveSession();
    }
  };
})();
