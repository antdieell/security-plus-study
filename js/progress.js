var Progress = (function () {
  let openSection = "overview";
  let selectedObjective = null;

  function trendLabel(kind) {
    if (kind === "improving") {
      return "↑ improving";
    }
    if (kind === "declining") {
      return "↓ declining";
    }
    if (kind === "steady") {
      return "→ steady";
    }
    return "";
  }

  function sourceStatsHtml(state) {
    const src = state.sourceStats || {};
    const orig = src.original || { attempted: 0, correct: 0 };
    const messer = src.messer || { attempted: 0, correct: 0 };
    const exams = state.messerExamStats || {};
    const bests = state.personalBests || {};
    function row(label, pair) {
      return "<div class=\"row-between\"><span>" + escapeHtml(label) + "</span><span>" +
        formatPercent(percent(pair.correct, pair.attempted)) + " · " + (pair.attempted || 0) + " answered</span></div>";
    }
    return row("Current Study Bank", orig) +
      row("Professor Messer", messer) +
      row("Messer Exam A", exams.A || { attempted: 0, correct: 0 }) +
      row("Messer Exam B", exams.B || { attempted: 0, correct: 0 }) +
      row("Messer Exam C", exams.C || { attempted: 0, correct: 0 }) +
      "<p class=\"muted\">Best Messer exams — A: " + (bests.messerA != null ? bests.messerA + "%" : "—") +
      " · B: " + (bests.messerB != null ? bests.messerB + "%" : "—") +
      " · C: " + (bests.messerC != null ? bests.messerC + "%" : "—") + "</p>";
  }

  function covBar(pct) {
    const n = Math.max(0, Math.min(10, Math.round((pct || 0) / 10)));
    return "<span class=\"cov-bar\" aria-hidden=\"true\">" + "█".repeat(n) + "░".repeat(10 - n) + "</span>";
  }

  function section(id, title, body, open) {
    return "<details class=\"card accordion progress-section\"" + (open ? " open" : "") + " data-section=\"" + id + "\">" +
      "<summary>" + title + "</summary><div class=\"stack\" style=\"margin-top:12px\">" + body + "</div></details>";
  }

  function domainCard(domain, state) {
    const stats = calculateDomainStats(state, domain.id);
    const lifetime = stats.lifetime;
    const recent = stats.recent;
    const dir = Analytics.trend(state, domain.id);
    const cov = Analytics.domainCoverage(state, domain.id);
    return (
      "<article class=\"card\">" +
        "<div class=\"row-between\"><strong>" + escapeHtml(domain.number) + " " + escapeHtml(domain.shortName) + "</strong><span>" + (lifetime === null ? "Not started" : formatPercent(lifetime)) + "</span></div>" +
        "<p class=\"muted\" style=\"margin:8px 0 10px\">" + stats.attempted + " attempted · " + stats.uniqueSeen + " unique · " + stats.missed + " missed · " + stats.due + " due" +
        (dir ? " · " + trendLabel(dir) : "") + "</p>" +
        "<div class=\"bar\"><span style=\"width:" + (lifetime || 0) + "%\"></span></div>" +
        (recent !== null ? "<p class=\"muted\" style=\"margin:8px 0 0\">Recent " + formatPercent(recent) + " · Coverage " + cov.seen + "/" + cov.total + "</p>" : "") +
        "<button class=\"btn btn-secondary\" data-action=\"weak-domain\" data-domain=\"" + domain.id + "\" style=\"margin-top:10px\">Practice weak area</button>" +
      "</article>"
    );
  }

  function objectiveMap(state) {
    return OBJECTIVE_MAP.map(function (group) {
      const rows = group.objectives.map(function (obj) {
        const cov = Coverage.objectiveCoverage(state, obj.id);
        const pct = cov.coverage || 0;
        return "<button class=\"card card-button\" data-action=\"open-obj\" data-objective=\"" + obj.id + "\">" +
          "<div class=\"row-between\"><strong>" + obj.id + "</strong><span>" + (pct || 0) + "%</span></div>" +
          "<p class=\"muted\" style=\"margin:6px 0\">" + covBar(pct) + " " + escapeHtml(cov.status) + "</p>" +
          "<p class=\"muted\" style=\"margin:0;font-size:0.88rem\">" + escapeHtml(obj.title) + "</p></button>";
      }).join("");
      return "<details class=\"accordion\" open><summary>DOMAIN " + group.number + " — " + group.weight * 100 + "%</summary><div class=\"stack\" style=\"margin-top:10px\">" + rows + "</div></details>";
    }).join("");
  }

  function objectiveDetail(state, id) {
    const cov = Coverage.objectiveCoverage(state, id);
    return "<article class=\"card\">" +
      "<div class=\"row-between\"><strong>" + escapeHtml(cov.id) + "</strong><span>" + escapeHtml(cov.status) + "</span></div>" +
      "<p style=\"margin:8px 0 0;font-weight:700\">" + escapeHtml(cov.title) + "</p>" +
      "<p class=\"muted\">Questions: " + cov.seen + " / " + cov.available + " seen</p>" +
      "<p class=\"muted\">Accuracy: " + formatPercent(cov.accuracy) + " · Recent: " + formatPercent(cov.recent) + "</p>" +
      "<p class=\"muted\">Mastery: " + cov.mastered + " / " + cov.available + " · Coverage: " + formatPercent(cov.coverage) + "</p>" +
      "<p class=\"muted\">Due reviews: " + cov.due + (cov.confidence != null ? " · Confidence " + cov.confidence + "%" : "") + "</p>" +
      "<div class=\"chip-row\" style=\"margin-top:10px\">" +
        "<button class=\"chip\" data-action=\"drill\" data-objective=\"" + id + "\" data-count=\"5\">5</button>" +
        "<button class=\"chip\" data-action=\"drill\" data-objective=\"" + id + "\" data-count=\"10\">10</button>" +
        "<button class=\"chip\" data-action=\"drill\" data-objective=\"" + id + "\" data-count=\"20\">20</button>" +
        "<button class=\"chip\" data-action=\"timed-obj\" data-objective=\"" + id + "\">Timed 10</button>" +
      "</div></article>";
  }

  function examHistory(state) {
    const exams = Analytics.examSessions(state);
    if (!exams.length) {
      return "<div class=\"card empty\"><strong>No exam sessions yet</strong>Take a timed exam to start a trend.</div>";
    }
    const last = exams.slice(0, 6).reverse();
    const max = 100;
    const bars = last.map(function (e, i) {
      return "<div class=\"trend-col\"><span class=\"trend-bar\" style=\"height:" + Math.max(8, Math.round(((e.percent || 0) / max) * 80)) + "px\"></span><span class=\"muted\">" + (e.percent || 0) + "%</span><span class=\"muted\">E" + (i + 1) + "</span></div>";
    }).join("");
    const rows = exams.slice(0, 8).map(function (e) {
      return "<div class=\"row-between\"><span>" + escapeHtml(formatDisplayDate(e.date)) + " · " + (e.total || 0) + "q</span><span>" + formatPercent(e.percent) + (e.durationMs ? " · " + formatDuration(e.durationMs) : "") + "</span></div>";
    }).join("");
    return "<div class=\"trend-row\">" + bars + "</div><div class=\"stack\" style=\"margin-top:12px\">" + rows + "</div>";
  }

  function historyItem(item) {
    const label = item.type || item.mode || "quiz";
    const when = formatDisplayDate(item.date);
    const score = (item.score != null && item.total) ? (item.score + "/" + item.total) : "—";
    const pct = item.percent != null ? formatPercent(item.percent) : "";
    const time = item.durationMs ? formatDuration(item.durationMs) : "";
    return (
      "<details class=\"card accordion\">" +
        "<summary><span class=\"row-between\" style=\"width:100%\"><strong>" + escapeHtml(label) + "</strong><span>" + score + "</span></span></summary>" +
        "<p class=\"muted\" style=\"margin:10px 0 0\">" + escapeHtml(when) + (pct ? " · " + pct : "") + (time ? " · " + time : "") + "</p>" +
      "</details>"
    );
  }

  function journalPreview(state) {
    const rows = (state.errorJournal || []).slice(0, 8);
    if (!rows.length) {
      return "<div class=\"card empty\"><strong>No recurring errors yet</strong></div>";
    }
    return rows.map(function (row) {
      return "<div class=\"row-between\"><span>" + escapeHtml(row.topic) + (row.times > 1 ? " · " + row.times + "x" : "") + "</span><button class=\"chip\" data-action=\"practice-topic\" data-topic=\"" + escapeHtml(row.topic) + "\">Practice</button></div>";
    }).join("") + "<button class=\"btn btn-secondary\" data-action=\"journal\" style=\"margin-top:8px\">Open Error Journal</button>";
  }

  function contentAudit() {
    const gaps = Coverage.contentGaps(6);
    const missing = QUESTIONS.filter(function (q) { return !q.explanation || q.explanation.length < 40; });
    const noObj = QUESTIONS.filter(function (q) { return !q.objective; });
    return "<p>Questions: " + QUESTIONS.length + " · PBQs: " + PBQS.length + " · Flashcards: " + FLASHCARDS.length + "</p>" +
      "<p class=\"muted\">Low question coverage: " + (gaps.length ? gaps.map(function (g) { return g.id + " (" + g.available + ")"; }).join(", ") : "none") + "</p>" +
      "<p class=\"muted\">Short explanations: " + missing.length + " · Missing objectives: " + noObj.length + "</p>";
  }

  function render() {
    const root = document.getElementById("view-progress");
    const state = getAppState();
    const accuracy = getOverallAccuracy(state);
    const recent = getRecentAccuracy(state, 50);
    const reviewDue = getDueReviews(state).length;
    const mastered = getMasteredCount(state);
    const cov = Analytics.coverage(state);
    const ready = Analytics.readiness(state);
    const weakTopics = Analytics.weakTopics(state, 3).slice(0, 8);
    const concepts = Coverage.conceptStats(state, 3).slice(0, 8);
    const nv = Coverage.newVsSeen(state);
    const mem = Coverage.memorizationHints(state);
    const examCount = Analytics.examSessions(state).length;
    const historySource = (state.sessionHistory && state.sessionHistory.length) ? state.sessionHistory : state.quizHistory;
    const history = historySource.length
      ? historySource.slice(0, 8).map(historyItem).join("")
      : "<div class=\"card empty\"><strong>No study history yet</strong></div>";
    const weakHtml = weakTopics.length
      ? weakTopics.map(function (t) {
        return "<div class=\"row-between\"><span>" + escapeHtml(t.topic) + " — " + t.accuracy + "%</span><button class=\"chip\" data-action=\"practice-topic\" data-topic=\"" + escapeHtml(t.topic) + "\">Drill</button></div>";
      }).join("")
      : "<p class=\"muted\" style=\"margin:0\">Need at least 3 attempts on a topic before ranking it.</p>";
    const objHtml = selectedObjective ? objectiveDetail(state, selectedObjective) : "<p class=\"muted\">Tap an objective on the map for coverage detail and drills.</p>";
    const pbqBy = Object.keys((state.pbqStats && state.pbqStats.byId) || {});
    const pbqHtml = "<p>Attempted " + (state.pbqStats.attempted || 0) + " · PBQ-style practice score " + formatPercent(percent(state.pbqStats.correct, state.pbqStats.attempted)) + "</p>" +
      (pbqBy.length ? pbqBy.map(function (id) {
        const row = state.pbqStats.byId[id];
        const p = PBQS.filter(function (x) { return x.id === id; })[0];
        return "<div class=\"row-between\"><span>" + escapeHtml(p ? p.title : id) + "</span><span>" + formatPercent(percent(row.correct, row.attempted)) + "</span></div>";
      }).join("") : "<p class=\"muted\">No PBQ attempts yet.</p>");
    const readyHist = (state.readinessHistory || []).slice(0, 8).reverse();
    const readyTrend = readyHist.length
      ? "<p>" + readyHist.map(function (r) { return r.index; }).join(" → ") + "</p>"
      : "<p class=\"muted\">Readiness snapshots appear after a meaningful study day.</p>";
    const bests = state.personalBests || {};

    root.innerHTML =
      "<p class=\"page-kicker\">Tracking · " + escapeHtml(EXAM_CONFIG.displayName) + "</p>" +
      "<h1 class=\"page-title\">Progress</h1>" +
      section("overview", "Overview",
        "<div class=\"card progress-wrap\">" +
          "<svg class=\"ring\" style=\"--pct:" + (ready.index || 0) + "\" viewBox=\"0 0 36 36\" aria-hidden=\"true\"><circle class=\"track\" cx=\"18\" cy=\"18\" r=\"16\"></circle><circle class=\"fill\" cx=\"18\" cy=\"18\" r=\"16\"></circle></svg>" +
          "<div class=\"progress-copy\"><h2>Readiness Index</h2><p style=\"margin:0;font-size:1.6rem;font-weight:800\">" + ready.index + " / 100</p>" +
          "<p><strong>" + escapeHtml(ready.category) + "</strong> · Confidence " + escapeHtml(ready.confidence) + "</p>" +
          "<p class=\"muted\" style=\"margin:6px 0 0\">Practice score " + formatPercent(accuracy) + " · Recent " + formatPercent(recent) + "</p></div></div>" +
        "<div class=\"stat-grid\">" +
          "<div class=\"stat\"><span class=\"label\">Answered</span><span class=\"value\">" + state.totalAnswered + "</span></div>" +
          "<div class=\"stat\"><span class=\"label\">Mastered</span><span class=\"value\">" + mastered + "</span></div>" +
          "<div class=\"stat\"><span class=\"label\">Review due</span><span class=\"value\">" + reviewDue + "</span></div>" +
          "<div class=\"stat\"><span class=\"label\">Streak</span><span class=\"value\">" + state.streak.count + "</span></div>" +
          "<div class=\"stat\"><span class=\"label\">Best streak</span><span class=\"value\">" + (state.streak.best || state.streak.count) + "</span></div>" +
          "<div class=\"stat\"><span class=\"label\">Exams</span><span class=\"value\">" + examCount + "</span></div>" +
          "<div class=\"stat\"><span class=\"label\">PBQs</span><span class=\"value\">" + (state.pbqStats.completed || 0) + "</span></div>" +
          "<div class=\"stat\"><span class=\"label\">Coverage</span><span class=\"value\" style=\"font-size:1rem\">" + cov.seen + "/" + cov.total + "</span></div>" +
        "</div>" +
        "<p class=\"muted\">New questions " + formatPercent(nv.newAccuracy) + " · Seen questions " + formatPercent(nv.seenAccuracy) + "</p>" +
        (mem[0] ? "<p>You know several familiar " + escapeHtml(mem[0].topic) + " questions, but performance on new ones is lower. Try a mixed drill.</p>" : "") +
        "<p class=\"muted\">Best exams — 30: " + (bests.exam30 != null ? bests.exam30 + "%" : "—") + " · 60: " + (bests.exam60 != null ? bests.exam60 + "%" : "—") + " · 90: " + (bests.exam90 != null ? bests.exam90 + "%" : "—") + "</p>",
        openSection === "overview") +
      section("readiness", "Readiness",
        "<p><strong>" + ready.index + " / 100 · " + escapeHtml(ready.category) + "</strong></p>" +
        "<p>Confidence: " + escapeHtml(ready.confidence) + "</p>" +
        "<p>What's holding you back</p><ul>" + (ready.blockers || []).map(function (b) { return "<li>" + escapeHtml(b) + "</li>"; }).join("") + "</ul>" +
        "<p>What would improve readiness most: " + escapeHtml(ready.improve) + "</p>" +
        "<h3 style=\"margin:8px 0 0\">Readiness trend</h3>" + readyTrend +
        "<p class=\"muted\" style=\"font-size:0.8rem\">" + escapeHtml(EXAM_CONFIG.scoreNote) + "</p>",
        openSection === "readiness") +
      section("domains", "Domains", DOMAINS.map(function (domain) { return domainCard(domain, state); }).join(""), openSection === "domains") +
      section("objectives", "Objectives", objectiveMap(state) + "<h3 style=\"margin:8px 0 0\">Coverage dashboard</h3>" + objHtml, openSection === "objectives") +
      section("topics", "Weak topics",
        weakHtml + "<h3 style=\"margin:8px 0 0\">Concept mastery</h3>" +
        (concepts.length ? concepts.map(function (c) {
          return "<div class=\"row-between\"><span>" + escapeHtml(c.topic) + " · " + formatPercent(c.accuracy) + " · " + escapeHtml(c.mastery) + "</span><button class=\"chip\" data-action=\"practice-topic\" data-topic=\"" + escapeHtml(c.topic) + "\">Practice</button></div>";
        }).join("") : "<p class=\"muted\">Answer more questions to build concept stats.</p>"),
        openSection === "topics") +
      section("sources", "Question sources", sourceStatsHtml(state), openSection === "sources") +
      section("exams", "Exam history", examHistory(state), openSection === "exams") +
      section("pbq", "PBQ performance", pbqHtml, openSection === "pbq") +
      section("journal", "Error Journal", journalPreview(state), openSection === "journal") +
      section("coverage", "Coverage",
        "<p>Question coverage " + cov.seen + " / " + cov.total + " (" + formatPercent(cov.percent) + ")</p>" +
        "<p class=\"muted\">Open Objectives for the visual map and drills.</p>" +
        DOMAINS.map(function (d) {
          const row = Analytics.domainCoverage(state, d.id);
          return "<div class=\"row-between\"><span>" + escapeHtml(d.number) + " " + escapeHtml(d.shortName) + "</span><span>" + row.seen + "/" + row.total + "</span></div>";
        }).join(""),
        openSection === "coverage") +
      section("history", "Session history", history, openSection === "history") +
      (App.DEV_MODE ? section("audit", "Content audit (DEV)", contentAudit(), openSection === "audit") : "") +
      "<div class=\"stack\" style=\"margin-top:18px\">" +
        "<button class=\"btn btn-secondary\" data-action=\"settings\">Settings &amp; backup</button>" +
      "</div>" +
      "<p class=\"disclaimer\">SEC+ Study is an independent study tool and is not affiliated with or endorsed by CompTIA. Readiness estimates are not official exam scores.</p>";
  }

  function onClick(event) {
    const sectionEl = event.target.closest("[data-section]");
    if (sectionEl && event.target.tagName === "SUMMARY") {
      openSection = sectionEl.getAttribute("data-section");
    }
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) {
      return;
    }
    const action = actionEl.getAttribute("data-action");
    if (action === "settings") {
      location.hash = "settings";
    } else if (action === "journal") {
      location.hash = "journal";
    } else if (action === "weak-domain") {
      Adaptive.startWeakArea({ domainId: actionEl.getAttribute("data-domain"), count: 10 });
    } else if (action === "drill") {
      Adaptive.startWeakArea({
        objective: actionEl.getAttribute("data-objective"),
        count: Number(actionEl.getAttribute("data-count")) || 10
      });
    } else if (action === "timed-obj") {
      Adaptive.startWeakArea({
        objective: actionEl.getAttribute("data-objective"),
        count: 10,
        timed: true
      });
    } else if (action === "practice-topic") {
      App.startConceptDrill(actionEl.getAttribute("data-topic"));
    } else if (action === "open-obj") {
      selectedObjective = actionEl.getAttribute("data-objective");
      openSection = "objectives";
      render();
    }
  }

  function init() {
    document.getElementById("view-progress").addEventListener("click", onClick);
  }

  return {
    init: init,
    render: render
  };
})();
