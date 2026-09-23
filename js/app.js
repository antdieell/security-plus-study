var App = (function () {
  const views = ["home", "study", "practice", "quiz", "exam", "flashcards", "progress", "review", "pbq", "ports", "acronyms", "settings", "rapid", "examday", "journal"];
  var DEV_MODE = false;

  function showView(name) {
    views.forEach(function (viewName) {
      const el = document.getElementById("view-" + viewName);
      if (el) {
        const active = viewName === name;
        el.classList.toggle("is-active", active);
        el.hidden = !active;
        el.setAttribute("aria-hidden", active ? "false" : "true");
        el.inert = !active;
      }
    });
    const navMap = {
      quiz: "practice",
      exam: "practice",
      pbq: "practice",
      ports: "practice",
      acronyms: "practice",
      flashcards: "practice",
      settings: "progress",
      rapid: "practice",
      examday: "practice",
      journal: "review"
    };
    const navName = navMap[name] || name;
    document.querySelectorAll(".nav-btn").forEach(function (button) {
      const isActive = button.getAttribute("data-route") === navName;
      button.classList.toggle("is-active", isActive);
      if (isActive) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }

  function refreshChrome() {
    const state = getAppState();
    const chip = document.getElementById("header-streak");
    if (chip) {
      chip.textContent = "🔥 " + state.streak.count;
      chip.setAttribute("aria-label", "Study streak " + state.streak.count + " days");
    }
    const badge = document.getElementById("nav-review-badge");
    if (badge) {
      const n = getReviewBadgeCount(state);
      badge.hidden = n < 1;
      badge.textContent = n > 99 ? "99+" : String(n);
    }
  }

  function toast(message) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("is-on");
    window.setTimeout(function () {
      el.classList.remove("is-on");
    }, 1800);
  }

  function ringSvg(pct) {
    return "<svg class=\"ring\" style=\"--pct:" + (pct || 0) + "\" viewBox=\"0 0 36 36\" aria-hidden=\"true\"><circle class=\"track\" cx=\"18\" cy=\"18\" r=\"16\"></circle><circle class=\"fill\" cx=\"18\" cy=\"18\" r=\"16\"></circle></svg>";
  }

  function renderHome() {
    const root = document.getElementById("view-home");
    const state = getAppState();
    const ready = Analytics.readiness(state);
    const rec = Analytics.recommendation(state);
    const due = getDueReviews(state).length;
    const plan = Plan.ensure(state);
    const done = Plan.completedCount(plan);
    const weakObj = ready.weakObjective;
    const miss = Coverage.recurringMisconceptions(state)[0];
    const cov = ready.coverage;
    root.innerHTML =
      "<p class=\"page-kicker\">SEC+ Study · " + escapeHtml(EXAM_CONFIG.displayName) + "</p>" +
      "<h1 class=\"page-title\">Ready for another session?</h1>" +
      "<div class=\"card progress-wrap\">" + ringSvg(ready.index) +
        "<div class=\"progress-copy\"><h2>Readiness</h2><p style=\"margin:0;font-size:1.6rem;font-weight:800\">" + ready.index + " / 100</p>" +
        "<p><strong>" + escapeHtml(ready.category) + "</strong> · Confidence " + escapeHtml(ready.confidence) + "</p>" +
        "<p class=\"muted\" style=\"margin:6px 0 0\">" + escapeHtml(ready.factor) + "</p>" +
        "<p class=\"muted\" style=\"margin:6px 0 0;font-size:0.8rem\">" + escapeHtml(EXAM_CONFIG.scoreNote) + "</p></div></div>" +
      "<h2 class=\"section-title\">Today's study plan</h2>" +
      "<div class=\"card\"><div class=\"row-between\"><strong>" + done + " / " + plan.tasks.length + " complete</strong><span class=\"muted\">~" + plan.minutesTarget + " min</span></div>" +
        "<ol style=\"margin:10px 0 0;padding-left:18px\">" + plan.tasks.map(function (t) {
          return "<li>" + (t.status === "done" ? "✓ " : "") + escapeHtml(t.title) + " <span class=\"muted\">" + t.estimate + " min</span></li>";
        }).join("") + "</ol>" +
        "<button class=\"btn btn-primary\" data-home=\"start-plan\" style=\"margin-top:12px\">" + (done ? "Continue plan" : "Start today's plan") + "</button></div>" +
      "<button class=\"card card-button rec-card\" data-home=\"" + rec.action + "\"" + (rec.objective ? " data-objective=\"" + rec.objective + "\"" : "") + (rec.topic ? " data-topic=\"" + escapeHtml(rec.topic) + "\"" : "") + ">" +
        "<p class=\"muted\" style=\"margin:0 0 4px\">Recommended next</p>" +
        "<strong>" + escapeHtml(rec.title) + "</strong>" +
        "<p class=\"muted\" style=\"margin:8px 0 0\">" + escapeHtml(rec.body) + "</p></button>" +
      "<div class=\"grid-2\" style=\"margin-top:12px\">" +
        "<button class=\"action-card\" data-home=\"quick\"><strong>10 Questions</strong><span>Current Study Bank</span></button>" +
        "<button class=\"action-card\" data-home=\"exam\"><strong>Exam Mode</strong><span>Timed simulation</span></button>" +
        "<button class=\"action-card\" data-home=\"pbq\"><strong>PBQ</strong><span>Hands-on style</span></button>" +
        "<button class=\"action-card\" data-home=\"rapid\"><strong>Rapid Review</strong><span>~5 minutes</span></button>" +
      "</div>" +
      "<h2 class=\"section-title\">Question sources</h2>" +
      "<div class=\"stack\">" +
        "<button class=\"card card-button\" data-home=\"messer-a\"><strong>Professor Messer Exam A</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">90-question practice exam (placeholders until private import)</span></button>" +
        "<button class=\"card card-button\" data-home=\"messer-b\"><strong>Professor Messer Exam B</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">90-question practice exam (placeholders until private import)</span></button>" +
        "<button class=\"card card-button\" data-home=\"messer-c\"><strong>Professor Messer Exam C</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">90-question practice exam (placeholders until private import)</span></button>" +
        "<button class=\"card card-button\" data-home=\"mixed\"><strong>Mixed Practice</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">Current Study Bank plus Messer overlay</span></button>" +
      "</div>" +
      "<h2 class=\"section-title\">Review due</h2>" +
      "<div class=\"card row-between\"><strong>" + due + " questions</strong>" + (due ? "<button class=\"btn btn-secondary\" data-home=\"review-due\">Review</button>" : "<span class=\"muted\">Caught up</span>") + "</div>" +
      "<h2 class=\"section-title\">Weakest area</h2>" +
      (weakObj
        ? "<button class=\"card card-button\" data-home=\"weak-objective\" data-objective=\"" + weakObj.id + "\"><strong>" + escapeHtml(weakObj.id) + "</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">" + escapeHtml(weakObj.title) + " · " + formatPercent(weakObj.recent || weakObj.accuracy) + "</span></button>"
        : "<div class=\"card empty\"><strong>Not enough objective data yet</strong></div>") +
      (miss ? "<h2 class=\"section-title\">Recurring misconception</h2><button class=\"card card-button\" data-home=\"fix-concept\" data-topic=\"" + escapeHtml(miss.topic) + "\"><strong>" + escapeHtml(miss.topic) + "</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">Seen " + miss.count + " times</span></button>" : "") +
      "<p class=\"muted\">Question coverage " + cov.seen + " / " + cov.total + " (" + formatPercent(cov.percent) + ")</p>" +
      "<p class=\"disclaimer\">SEC+ Study is an independent study tool and is not affiliated with or endorsed by CompTIA. Readiness is not an official exam score.</p>";
  }

  function renderPractice() {
    const root = document.getElementById("view-practice");
    const due = getDueReviews(getAppState()).length;
    root.innerHTML =
      "<p class=\"page-kicker\">" + escapeHtml(EXAM_CONFIG.displayName) + "</p>" +
      "<h1 class=\"page-title\">Practice</h1>" +
      "<div class=\"stack\">" +
        "<button class=\"card card-button\" data-prac=\"quiz\"><strong>Quick / Custom Quiz</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">Immediate explanations. 10, 25, or filters.</span></button>" +
        "<button class=\"card card-button\" data-prac=\"adaptive\"><strong>Adaptive Study</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">Weak domains, missed items, due reviews.</span></button>" +
        "<button class=\"card card-button\" data-prac=\"exam\"><strong>Exam Mode</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">Timed simulation. Study Bank, Messer A/B/C, or Mixed. Answers hidden until submit.</span></button>" +
        "<button class=\"card card-button\" data-prac=\"messer-a\"><strong>Professor Messer Exam A</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">Complete practice exam. Placeholders until private import.</span></button>" +
        "<button class=\"card card-button\" data-prac=\"mixed\"><strong>Mixed Practice</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">Study Bank + Messer overlay in the existing quiz engine.</span></button>" +
        "<button class=\"card card-button\" data-prac=\"pbq\"><strong>PBQ Practice</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">Ordering, matching, and scenario drills.</span></button>" +
        "<button class=\"card card-button\" data-prac=\"ports\"><strong>Ports & Protocols</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">Rapid recall. HTTPS → 443.</span></button>" +
        "<button class=\"card card-button\" data-prac=\"acronyms\"><strong>Acronym Drill</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">SIEM, SOAR, ZTNA, and more.</span></button>" +
        "<button class=\"card card-button\" data-prac=\"flash\"><strong>Flashcards</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">Spaced review with Again / Hard / Good / Easy.</span></button>" +
        "<button class=\"card card-button\" data-prac=\"review\"><strong>Review queue</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">" + (due ? due + " due today" : "Nothing overdue") + "</span></button>" +
        "<button class=\"card card-button\" data-prac=\"rapid\"><strong>Rapid Review</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">~5 minutes. Ports, acronyms, and cards.</span></button>" +
        "<button class=\"card card-button\" data-prac=\"examday\"><strong>Exam Day Review</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">~15–20 minutes. Weak concepts plus a short mixed set. Not a full exam.</span></button>" +
        "<button class=\"card card-button\" data-prac=\"timed\"><strong>Timed Drill</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">10 questions / 10 minutes. Feedback after the set.</span></button>" +
      "</div>";
  }

  function questionPreview(id, extra) {
    const question = getQuestionById(id);
    if (!question) {
      return "";
    }
    return (
      "<article class=\"card\">" +
        "<p class=\"muted\" style=\"margin:0 0 6px\">" + escapeHtml(getDomainShortName(question.domain)) +
        (question.objective ? " · " + question.objective : "") + (extra || "") + "</p>" +
        "<p style=\"margin:0;font-weight:700\">" + escapeHtml(question.question) + "</p>" +
      "</article>"
    );
  }

  function renderReview() {
    const root = document.getElementById("view-review");
    const state = getAppState();
    const due = getDueReviews(state);
    const low = getLowConfidenceIds(state);
    const cards = getReviewFlashcardIds(state);
    const missedHtml = state.missedQuestions.length
      ? state.missedQuestions.slice(0, 12).map(function (id) { return questionPreview(id); }).join("")
      : "<div class=\"card empty\"><strong>Nothing to review yet. Nice work.</strong></div>";
    const dueHtml = due.length
      ? due.slice(0, 12).map(function (id) { return questionPreview(id); }).join("")
      : "<div class=\"card empty\"><strong>You're caught up.</strong>No questions are due today.</div>";
    const lowHtml = low.length
      ? low.slice(0, 8).map(function (id) {
        const stat = state.questionStats[id] || {};
        return questionPreview(id, stat.misconceptionRisk ? " · Review carefully" : " · Low confidence");
      }).join("")
      : "<div class=\"card empty\"><strong>No low-confidence items</strong></div>";
    const savedHtml = state.savedQuestions.length
      ? state.savedQuestions.map(function (id) { return questionPreview(id); }).join("")
      : "<div class=\"card empty\"><strong>No saved questions</strong>Bookmark a quiz item to keep it here.</div>";

    root.innerHTML =
      "<p class=\"page-kicker\">Spaced review</p>" +
      "<h1 class=\"page-title\">Review</h1>" +
      "<div class=\"stack\" style=\"margin-bottom:14px\">" +
        (due.length ? "<button class=\"btn btn-primary\" data-review=\"due\">Review due (" + due.length + ")</button>" : "") +
        (state.missedQuestions.length ? "<button class=\"btn btn-secondary\" data-review=\"retry\">Retry missed questions</button>" : "") +
        (low.length ? "<button class=\"btn btn-secondary\" data-review=\"low\">Low confidence / review carefully</button>" : "") +
        (cards.length ? "<button class=\"btn btn-secondary\" data-review=\"cards\">Flashcards due (" + cards.length + ")</button>" : "") +
        "<button class=\"btn btn-secondary\" data-review=\"journal\">Error Journal</button>" +
      "</div>" +
      "<h2 class=\"section-title\">Due today</h2><div class=\"stack\">" + dueHtml + "</div>" +
      "<h2 class=\"section-title\">Missed questions</h2><div class=\"stack\">" + missedHtml + "</div>" +
      "<h2 class=\"section-title\">Low confidence</h2><div class=\"stack\">" + lowHtml + "</div>" +
      "<h2 class=\"section-title\">Bookmarked</h2>" +
      (state.savedQuestions.length ? "<button class=\"btn btn-secondary\" data-review=\"saved-quiz\" style=\"margin-bottom:10px\">Quiz saved questions</button>" : "") +
      "<div class=\"stack\">" + savedHtml + "</div>" +
      "<h2 class=\"section-title\">Flashcards due</h2>" +
      "<div class=\"card\">" + (cards.length ? cards.length + " cards waiting" : "You're caught up.") + "</div>";
  }

  function parseHash() {
    const raw = (location.hash || "#home").replace(/^#/, "");
    const parts = raw.split("/").filter(Boolean);
    return { name: parts[0] || "home", parts: parts };
  }

  function route() {
    const parsed = parseHash();
    refreshChrome();
    const routers = {
      study: function () {
        showView("study");
        if (parsed.parts[1] === "topic") {
          Study.setRoute(null, parsed.parts[2]);
        } else {
          Study.setRoute(parsed.parts[1] || null, null);
        }
      },
      practice: function () { showView("practice"); renderPractice(); },
      quiz: function () { showView("quiz"); Quiz.render(); },
      exam: function () { showView("exam"); Exam.render(); },
      flashcards: function () { showView("flashcards"); Cards.render(); },
      progress: function () { showView("progress"); Progress.render(); },
      review: function () { showView("review"); renderReview(); },
      pbq: function () { showView("pbq"); Pbq.render(); },
      ports: function () { showView("ports"); Drills.render(); },
      acronyms: function () { showView("acronyms"); Drills.render(); },
      settings: function () { showView("settings"); Settings.render(); },
      rapid: function () { showView("rapid"); Rapid.render(); },
      examday: function () { showView("examday"); Rapid.render(); },
      journal: function () { showView("journal"); renderJournal(); }
    };
    if (routers[parsed.name]) {
      routers[parsed.name]();
    } else {
      showView("home");
      renderHome();
    }
  }

  function showModal(options) {
    const root = document.getElementById("modal-root");
    root.hidden = false;
    root.innerHTML =
      "<div class=\"modal\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"modal-title\">" +
        "<h2 id=\"modal-title\" style=\"margin-top:0\">" + escapeHtml(options.title) + "</h2>" +
        "<p class=\"muted\">" + escapeHtml(options.body) + "</p>" +
        "<div class=\"stack\">" +
          "<button class=\"btn " + (options.danger ? "btn-danger" : "btn-primary") + "\" id=\"modal-confirm\">" + escapeHtml(options.confirmLabel || "Confirm") + "</button>" +
          "<button class=\"btn btn-secondary\" id=\"modal-cancel\">" + escapeHtml(options.cancelLabel || "Cancel") + "</button>" +
        "</div>" +
      "</div>";
    document.getElementById("modal-cancel").focus();
    document.getElementById("modal-cancel").addEventListener("click", hideModal);
    document.getElementById("modal-confirm").addEventListener("click", function () {
      hideModal();
      if (options.onConfirm) {
        options.onConfirm();
      }
    });
  }

  function hideModal() {
    const root = document.getElementById("modal-root");
    root.hidden = true;
    root.innerHTML = "";
  }

  function startDueReview() {
    const ids = getDueReviews(getAppState());
    if (!ids.length) {
      toast("Nothing is due.");
      return;
    }
    Quiz.start({
      count: Math.min(20, ids.length),
      questionIds: ids,
      reviewSession: true,
      mode: "review"
    });
  }

  function onHomeClick(event) {
    const actionEl = event.target.closest("[data-home]");
    if (!actionEl) {
      return;
    }
    const action = actionEl.getAttribute("data-home");
    if (action === "quick" || action === "continue") {
      Quiz.startQuick();
    } else if (action === "messer-a") {
      Exam.start("messerA");
    } else if (action === "messer-b") {
      Exam.start("messerB");
    } else if (action === "messer-c") {
      Exam.start("messerC");
    } else if (action === "mixed") {
      Quiz.startMixed(20);
    } else if (action === "lock") {
      if (typeof SiteLock !== "undefined") {
        SiteLock.lock();
      }
    } else if (action === "adaptive") {
      Adaptive.start(10);
    } else if (action === "review-due") {
      startDueReview();
    } else if (action === "exam") {
      location.hash = "exam";
    } else if (action === "diagnostic") {
      Quiz.startDiagnostic();
    } else if (action === "domain-architecture") {
      Quiz.start({ count: 10, domainIds: ["architecture"], mode: "custom" });
    } else if (action === "start-plan") {
      const plan = Plan.ensure(getAppState());
      const next = Plan.nextTask(plan);
      if (!next) {
        toast("Today's plan is complete.");
        return;
      }
      Plan.launch(next);
    } else if (action === "pbq") {
      location.hash = "pbq";
    } else if (action === "rapid") {
      location.hash = "rapid";
    } else if (action === "weak-objective") {
      Adaptive.startWeakArea({ objective: actionEl.getAttribute("data-objective"), count: 10 });
    } else if (action === "fix-concept") {
      startConceptDrill(actionEl.getAttribute("data-topic"));
    } else if (action === "unseen-topic") {
      Adaptive.startWeakArea({ topic: actionEl.getAttribute("data-topic"), count: 10 });
    }
  }

  function onPracticeClick(event) {
    const el = event.target.closest("[data-prac]");
    if (!el) {
      return;
    }
    const map = {
      quiz: "quiz",
      exam: "exam",
      pbq: "pbq",
      ports: "ports",
      acronyms: "acronyms",
      flash: "flashcards",
      review: "review",
      rapid: "rapid",
      examday: "examday"
    };
    const action = el.getAttribute("data-prac");
    if (action === "adaptive") {
      Adaptive.start(10);
    } else if (action === "messer-a") {
      Exam.start("messerA");
    } else if (action === "mixed") {
      Quiz.startMixed(20);
    } else if (action === "timed") {
      Adaptive.start(10, { mode: "timed", timed: true, durationMs: 10 * 60 * 1000 });
    } else if (map[action]) {
      location.hash = map[action];
    }
  }

  function onReviewClick(event) {
    const actionEl = event.target.closest("[data-review]");
    if (!actionEl) {
      return;
    }
    const action = actionEl.getAttribute("data-review");
    if (action === "due") {
      startDueReview();
    } else if (action === "retry") {
      Quiz.startMissedReview();
    } else if (action === "low") {
      Quiz.start({
        count: 15,
        questionIds: getLowConfidenceIds(getAppState()),
        reviewSession: true,
        mode: "review"
      });
    } else if (action === "cards") {
      location.hash = "flashcards/play";
    } else if (action === "saved-quiz") {
      Quiz.start({
        count: 25,
        savedOnly: true,
        mode: "saved",
        domainIds: DOMAINS.map(function (d) { return d.id; })
      });
    } else if (action === "journal") {
      location.hash = "journal";
    }
  }

  function startConceptDrill(topic) {
    if (!topic) {
      Adaptive.start(10);
      return;
    }
    const pool = QUESTIONS.filter(function (q) {
      return String(q.topic || "").toLowerCase() === String(topic).toLowerCase();
    });
    const sample = pool[0];
    const ids = takeRandom(pool, 5).map(function (q) { return q.id; });
    showModal({
      title: "Fix this concept: " + topic,
      body: (sample && sample.explanation ? sample.explanation : "Review this concept, then try a short related set.") + " Next you will answer a few related questions.",
      confirmLabel: ids.length ? "Practice related questions" : "Find related questions",
      onConfirm: function () {
        if (ids.length) {
          Quiz.start({ count: ids.length, questionIds: ids, reviewSession: true, mode: "concept", topic: topic });
        } else {
          Adaptive.startWeakArea({ topic: topic, count: 5 });
        }
      }
    });
  }

  function renderJournal() {
    const root = document.getElementById("view-journal");
    const state = getAppState();
    const rows = state.errorJournal || [];
    const html = rows.length
      ? rows.map(function (row) {
        const q = getQuestionById(row.questionId);
        return "<article class=\"card\">" +
          "<div class=\"row-between\"><strong>" + escapeHtml(row.topic) + "</strong><span class=\"muted\">" + (row.times > 1 ? row.times + " times" : formatDisplayDate(row.lastMissed || row.date)) + "</span></div>" +
          "<p class=\"muted\" style=\"margin:8px 0 0\">" + escapeHtml(row.concept || "") + "</p>" +
          (q ? "<p style=\"margin:8px 0 0;font-weight:700\">" + escapeHtml(q.question) + "</p>" : "") +
          (row.note ? "<p class=\"muted\">Note: " + escapeHtml(row.note) + "</p>" : "") +
          "<div class=\"chip-row\" style=\"margin-top:10px\">" +
            (row.reviewed ? "<span class=\"muted\">Reviewed</span>" : "<button class=\"chip\" data-journal=\"reviewed\" data-id=\"" + row.id + "\">Mark reviewed</button>") +
            "<button class=\"chip\" data-journal=\"practice\" data-topic=\"" + escapeHtml(row.topic) + "\">Practice concept</button>" +
            "<button class=\"chip\" data-journal=\"card\" data-qid=\"" + escapeHtml(row.questionId || "") + "\">Create review card</button>" +
          "</div></article>";
      }).join("")
      : "<div class=\"card empty\"><strong>No journal entries yet</strong>Missed questions appear here when they look like a pattern, not a one-off.</div>";
    root.innerHTML =
      "<p class=\"page-kicker\">Personal notebook</p>" +
      "<h1 class=\"page-title\">Error Journal</h1>" +
      "<p class=\"muted\">Repeated misses, grouped by concept. This is not a scorecard.</p>" +
      "<div class=\"stack\">" + html + "</div>" +
      "<button class=\"btn btn-secondary\" data-journal=\"review\" style=\"margin-top:12px\">Back to Review</button>";
  }

  function onJournalClick(event) {
    const el = event.target.closest("[data-journal]");
    if (!el) {
      return;
    }
    const action = el.getAttribute("data-journal");
    if (action === "reviewed") {
      markJournalReviewed(el.getAttribute("data-id"));
      renderJournal();
    } else if (action === "practice") {
      startConceptDrill(el.getAttribute("data-topic"));
    } else if (action === "card") {
      const card = createReviewCardFromQuestion(el.getAttribute("data-qid"));
      toast(card ? "Review card saved in Flashcards." : "Could not create a card.");
    } else if (action === "review") {
      location.hash = "review";
    }
  }

  function offerResume() {
    const saved = getAppState().activeSession;
    const hash = location.hash || "";
    if (!saved) {
      return;
    }
    if (hash.indexOf("quiz/play") !== -1 || hash.indexOf("exam/play") !== -1) {
      return;
    }
    const exam = saved.kind === "exam";
    showModal({
      title: exam ? "Resume your exam?" : "Continue your unfinished quiz?",
      body: exam
        ? "Your answers, flags, and remaining time were saved."
        : "Pick up where you left off, or discard the session.",
      confirmLabel: exam ? "Resume exam" : "Continue quiz",
      cancelLabel: "Not now",
      onConfirm: function () {
        location.hash = exam ? "exam/play" : "quiz/play";
      }
    });
  }

  function registerWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") {
      return;
    }
    navigator.serviceWorker.register("./service-worker.js?v=16", { scope: "./" }).catch(function () {});
  }

  function revealApp() {
    document.body.classList.remove("is-locked");
  }

  function init() {
    if (typeof SiteLock === "undefined" || !SiteLock.isUnlocked()) {
      document.body.classList.add("is-locked");
      if (typeof SiteLock !== "undefined") {
        SiteLock.bind(function () {
          revealApp();
          boot();
        });
      }
      return;
    }
    revealApp();
    boot();
  }

  function boot() {
    const bankReady = (typeof QuestionBank !== "undefined" && QuestionBank.init)
      ? QuestionBank.init()
      : Promise.resolve();
    Study.init();
    Quiz.init();
    Cards.init();
    Progress.init();
    Exam.init();
    Pbq.init();
    Drills.init();
    Rapid.init();
    Settings.init();
    applyMotionPref();
    const lockBtn = document.getElementById("lock-site");
    if (lockBtn) {
      lockBtn.addEventListener("click", function () {
        if (typeof SiteLock !== "undefined") {
          SiteLock.lock();
        }
      });
    }
    document.getElementById("view-home").addEventListener("click", onHomeClick);
    document.getElementById("view-practice").addEventListener("click", onPracticeClick);
    document.getElementById("view-review").addEventListener("click", onReviewClick);
    document.getElementById("view-journal").addEventListener("click", onJournalClick);
    document.querySelectorAll(".nav-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        location.hash = button.getAttribute("data-route");
      });
    });
    window.addEventListener("hashchange", route);
    if (!location.hash) {
      location.hash = "home";
    } else {
      route();
    }
    refreshChrome();
    registerWorker();
    window.setTimeout(offerResume, 400);
    Promise.resolve(bankReady).then(function () {
      route();
      refreshChrome();
    });
  }

  function applyMotionPref() {
    const prefs = getAppState().prefs || {};
    document.documentElement.classList.toggle("reduced-motion", !!prefs.reducedMotion);
  }

  return {
    init: init,
    route: route,
    renderHome: renderHome,
    refreshChrome: refreshChrome,
    showModal: showModal,
    hideModal: hideModal,
    toast: toast,
    startDueReview: startDueReview,
    startConceptDrill: startConceptDrill,
    applyMotionPref: applyMotionPref,
    DEV_MODE: DEV_MODE
  };
})();

document.addEventListener("DOMContentLoaded", App.init);
