var Quiz = (function () {
  let session = null;

  function defaultConfig() {
    return {
      count: 10,
      domainIds: DOMAINS.map(function (domain) { return domain.id; }),
      missedOnly: false,
      reviewSession: false,
      mode: "quick"
    };
  }

  function buildQuestionSet(config) {
    let pool = (typeof QuestionBank !== "undefined" ? QuestionBank.getPool(config) : QUESTIONS.slice());
    if (config.questionIds && config.questionIds.length) {
      pool = getQuestionsByIds(config.questionIds);
    } else if (config.savedOnly) {
      pool = getQuestionsByIds(loadState().savedQuestions);
    } else if (config.missedOnly) {
      pool = getQuestionsByIds(loadState().missedQuestions);
    }
    if (config.domainIds && config.domainIds.length && config.domainIds.length < DOMAINS.length) {
      pool = pool.filter(function (question) {
        return config.domainIds.indexOf(question.domain) !== -1;
      });
    }
    pool = shuffleArray(pool);
    if (config.difficulty && config.difficulty !== "all") {
      pool = pool.filter(function (q) { return q.difficulty === config.difficulty; });
    }
    if (config.objective) {
      pool = pool.filter(function (q) { return q.objective === config.objective; });
    }
    if (config.topic) {
      const needle = String(config.topic).toLowerCase();
      pool = pool.filter(function (q) {
        return String(q.topic || "").toLowerCase() === needle;
      });
    }
    if (config.status && config.status !== "all") {
      const state = loadState();
      pool = pool.filter(function (q) {
        const stat = state.questionStats[q.id];
        if (config.status === "unseen") {
          return !stat || !stat.attempts;
        }
        if (config.status === "missed") {
          return state.missedQuestions.indexOf(q.id) !== -1;
        }
        if (config.status === "due") {
          return stat && stat.nextReview && stat.nextReview <= todayISODate();
        }
        if (config.status === "bookmarked") {
          return state.savedQuestions.indexOf(q.id) !== -1;
        }
        return true;
      });
    }
    const count = Math.min(Math.max(1, config.count || 10), pool.length);
    return pool.slice(0, count);
  }

  function start(config) {
    const settings = Object.assign(defaultConfig(), config || {});
    const questions = buildQuestionSet(settings);
    if (!questions.length) {
      session = {
        empty: true,
        settings: settings
      };
      location.hash = "quiz/play";
      render();
      return;
    }
    session = {
      empty: false,
      settings: settings,
      questions: questions,
      index: 0,
      selected: null,
      checked: false,
      answers: [],
      startTime: Date.now(),
      confidence: null
    };
    persistQuiz();
    location.hash = "quiz/play";
    render();
  }

  function persistQuiz() {
    if (!session || session.empty || session.results) {
      return;
    }
    persistActiveSession({
      kind: "quiz",
      type: session.settings.mode || "quiz",
      settings: session.settings,
      questionIds: session.questions.map(function (q) { return q.id; }),
      index: session.index,
      selected: session.selected,
      checked: session.checked,
      answers: session.answers,
      startTime: session.startTime,
      confidence: session.confidence
    });
  }

  function restoreQuiz(saved) {
    const questions = getQuestionsByIds(saved.questionIds || []);
    if (!questions.length) {
      return false;
    }
    session = {
      empty: false,
      settings: saved.settings || { mode: saved.type || "quiz" },
      questions: questions,
      index: saved.index || 0,
      selected: saved.selected === undefined ? null : saved.selected,
      checked: !!saved.checked,
      answers: saved.answers || [],
      startTime: saved.startTime || Date.now(),
      confidence: saved.confidence || null
    };
    return true;
  }

  function startQuick() {
    start({ count: 10, mode: "quick", source: "original", domainIds: DOMAINS.map(function (d) { return d.id; }) });
  }

  function startMesserExam(letter) {
    start({ count: 90, mode: "messer", source: "messer", exam: letter, domainIds: DOMAINS.map(function (d) { return d.id; }) });
  }

  function startMixed(count, sources) {
    start({ count: count || 20, mode: "mixed", source: "mixed", sources: sources || ["original", "messer"], domainIds: DOMAINS.map(function (d) { return d.id; }) });
  }

  function startStandard() {
    start({ count: 25, mode: "standard", domainIds: DOMAINS.map(function (d) { return d.id; }) });
  }

  function startMissedReview() {
    start({
      count: 25,
      mode: "review",
      missedOnly: true,
      reviewSession: true,
      domainIds: DOMAINS.map(function (d) { return d.id; })
    });
  }

  function currentQuestion() {
    if (!session || session.empty) {
      return null;
    }
    return session.questions[session.index];
  }

  function selectAnswer(index) {
    if (!session || session.checked || session.empty) {
      return;
    }
    const question = currentQuestion();
    if (isMultiSelectQuestion(question)) {
      session.selected = toggleSelectedIndex(session.selected, index);
    } else {
      session.selected = index;
    }
    persistQuiz();
    render();
  }

  function checkAnswer() {
    const question = currentQuestion();
    if (!session || session.checked || !question) {
      return;
    }
    if (isPbqQuestion(question) && typeof PbqEngine !== "undefined") {
      const host = document.getElementById("pbq-live");
      if (host) {
        session.selected = PbqEngine.getAnswer(host);
      }
    }
    if (!hasAnswerSelection(question, session.selected)) {
      return;
    }
    const isCorrect = isQuestionAnswerCorrect(question, session.selected);
    session.checked = true;
    session.confidence = null;
    session.answers.push({
      questionId: question.id,
      domain: question.domain,
      selected: session.selected,
      correct: isCorrect
    });
    recordQuestionAnswer({
      domainId: question.domain,
      isCorrect: isCorrect,
      questionId: question.id,
      sessionType: session.settings.mode || "quiz",
      isReview: !!session.settings.reviewSession
    });
    persistQuiz();
    render();
    if (typeof App !== "undefined") {
      App.refreshChrome();
    }
  }

  function nextQuestion() {
    if (!session || !session.checked) {
      return;
    }
    if (session.index >= session.questions.length - 1) {
      finish();
      return;
    }
    session.index += 1;
    session.selected = null;
    session.checked = false;
    session.confidence = null;
    persistQuiz();
    render();
  }

  function domainResultsFromAnswers(answers) {
    const map = {};
    answers.forEach(function (answer) {
      if (!map[answer.domain]) {
        map[answer.domain] = { attempted: 0, correct: 0 };
      }
      map[answer.domain].attempted += 1;
      if (answer.correct) {
        map[answer.domain].correct += 1;
      }
    });
    return map;
  }

  function finish() {
    const correctCount = session.answers.filter(function (item) { return item.correct; }).length;
    const total = session.questions.length;
    const missedIds = session.answers.filter(function (item) { return !item.correct; }).map(function (item) { return item.questionId; });
    const results = {
      date: Date.now(),
      score: correctCount,
      total: total,
      percent: percent(correctCount, total),
      missedCount: missedIds.length,
      missedIds: missedIds,
      domainResults: domainResultsFromAnswers(session.answers),
      durationMs: Date.now() - session.startTime,
      mode: session.settings.mode,
      type: session.settings.mode || "quiz",
      responses: session.answers.slice()
    };
    if (results.type === "diagnostic") {
      const ranked = Object.keys(results.domainResults).map(function (id) {
        const s = results.domainResults[id];
        return { id: id, accuracy: percent(s.correct, s.attempted), attempted: s.attempted };
      }).filter(function (row) { return row.attempted; }).sort(function (a, b) { return b.accuracy - a.accuracy; });
      results.strongest = ranked[0] || null;
      results.weakest = ranked[ranked.length - 1] || null;
    }
    session.results = results;
    recordSession(results);
    clearActiveSession();
    if (session.settings && session.settings.planTaskId && typeof Plan !== "undefined") {
      Plan.completeTask(session.settings.planTaskId);
    } else if (typeof Plan !== "undefined") {
      Plan.maybeCompleteFromSession(results.type);
    }
    if (typeof Analytics !== "undefined") {
      maybeRecordReadiness(Analytics.readiness(getAppState()));
    }
    location.hash = "quiz/results";
    render();
    if (typeof App !== "undefined") {
      App.refreshChrome();
    }
  }

  function toggleBookmark() {
    const question = currentQuestion();
    if (!question) {
      return;
    }
    toggleSavedQuestion(question.id);
    render();
  }

  function optionClass(question, index) {
    const classes = ["option"];
    const multi = isMultiSelectQuestion(question);
    if (multi) {
      classes.push("option-multi");
    }
    if (isIndexSelected(session.selected, index)) {
      classes.push("is-selected");
    }
    if (session.checked && session.settings.mode !== "diagnostic" && !session.settings.timed && session.settings.mode !== "timed") {
      const correctSet = getCorrectAnswerIndexes(question);
      if (correctSet.indexOf(index) !== -1) {
        classes.push("is-correct");
      } else if (isIndexSelected(session.selected, index)) {
        classes.push("is-incorrect");
      }
    }
    return classes.join(" ");
  }

  function renderConfig(root) {
    const state = loadState();
    const missedCount = state.missedQuestions.length;
    const canMissed = missedCount >= 3;
    root.innerHTML =
      "<p class=\"page-kicker\">Practice</p>" +
      "<h1 class=\"page-title\">Choose a quiz</h1>" +
      "<div class=\"stack\">" +
        sourceChooserHtml() +
        "<button class=\"card card-button\" data-action=\"quick\"><strong>Quick Quiz</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">10 mixed questions from the Current Study Bank.</span></button>" +
        "<button class=\"card card-button\" data-action=\"standard\"><strong>Standard Quiz</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">25 questions across Security+ domains.</span></button>" +
        "<button class=\"card card-button\" data-action=\"diagnostic\"><strong>Diagnostic Quiz</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">25 weighted questions. Feedback after you finish.</span></button>" +
        "<button class=\"card card-button\" data-action=\"adaptive\" data-count=\"10\"><strong>Adaptive Study</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">Biases toward weak domains, misses, and due reviews. Default 10 questions.</span></button>" +
        "<div class=\"chip-row\" style=\"margin-top:-4px\">" +
          "<button class=\"chip\" data-action=\"adaptive\" data-count=\"10\">10</button>" +
          "<button class=\"chip\" data-action=\"adaptive\" data-count=\"20\">20</button>" +
          "<button class=\"chip\" data-action=\"adaptive\" data-count=\"30\">30</button>" +
        "</div>" +
        "<button class=\"card card-button\" data-action=\"exam\"><strong>Exam Mode</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">Timed. Answers hidden until you submit.</span></button>" +
        "<button class=\"card card-button\" data-action=\"timed-10\"><strong>Timed drill</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">10 questions / 10 minutes. Feedback after the set.</span></button>" +
        "<button class=\"card card-button\" data-action=\"toggle-custom\"><strong>Custom Quiz</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">Filters for domain, objective, topic, difficulty, and status.</span></button>" +
        "<div id=\"custom-panel\" hidden class=\"card stack\">" +
          "<label class=\"custom-field\">Number of questions" +
            "<input id=\"custom-count\" type=\"number\" min=\"1\" max=\"50\" value=\"15\">" +
          "</label>" +
          "<p style=\"margin:0;font-weight:700\">Domains</p>" +
          DOMAINS.map(function (domain) {
            return "<label class=\"check\"><input type=\"checkbox\" class=\"domain-box\" value=\"" + domain.id + "\" checked> " + escapeHtml(domain.shortName) + "</label>";
          }).join("") +
          "<p style=\"margin:0;font-weight:700\">More filters</p>" +
          "<label class=\"custom-field\">Difficulty" +
            "<select id=\"custom-diff\"><option value=\"all\">All</option><option value=\"easy\">Easy</option><option value=\"medium\">Medium</option><option value=\"hard\">Hard</option></select>" +
          "</label>" +
          "<label class=\"custom-field\">Question status" +
            "<select id=\"custom-status\"><option value=\"all\">All</option><option value=\"unseen\">Unseen</option><option value=\"missed\">Missed</option><option value=\"due\">Due for review</option><option value=\"bookmarked\">Bookmarked</option></select>" +
          "</label>" +
          "<label class=\"custom-field\">Objective" +
            "<select id=\"custom-objective\"><option value=\"\">All objectives</option>" +
              getAllObjectives().map(function (id) {
                return "<option value=\"" + id + "\">" + id + " " + escapeHtml(getObjectiveName(id) || "") + "</option>";
              }).join("") +
            "</select>" +
          "</label>" +
          "<label class=\"custom-field\">Topic" +
            "<select id=\"custom-topic\"><option value=\"\">All topics</option>" +
              getAllTopics().map(function (topic) {
                return "<option value=\"" + escapeHtml(topic) + "\">" + escapeHtml(topic) + "</option>";
              }).join("") +
            "</select>" +
          "</label>" +
          "<label class=\"check\"" + (canMissed ? "" : " style=\"opacity:.55\"") + ">" +
            "<input type=\"checkbox\" id=\"missed-only\"" + (canMissed ? "" : " disabled") + "> Missed questions only" +
            (canMissed ? " (" + missedCount + " available)" : " (need at least 3 missed)") +
          "</label>" +
          "<button class=\"btn btn-primary\" data-action=\"start-custom\">Start custom quiz</button>" +
        "</div>" +
        (canMissed
          ? "<button class=\"card card-button\" data-action=\"missed-review\"><strong>Missed Questions Only</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">Review " + missedCount + " saved misses.</span></button>"
          : "") +
      "</div>";
  }

  function sourceChooserHtml() {
    const counts = typeof QuestionBank !== "undefined" ? QuestionBank.counts() : { original: QUESTIONS.length, messer: 0, A: 0, B: 0, C: 0 };
    const placeholder = counts.messer > 0 && counts.A < 90;
    return "<div class=\"card stack\" style=\"margin-bottom:4px\">" +
      "<strong>Question source</strong>" +
      "<p class=\"muted\" style=\"margin:0\">Current Study Bank stays the default. Professor Messer exams use placeholder items until private data is deployed.</p>" +
      "<button class=\"card card-button\" data-action=\"messer-a\"><strong>Professor Messer · Exam A</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">" + counts.A + " questions" + (placeholder ? " (placeholders)" : "") + "</span></button>" +
      "<button class=\"card card-button\" data-action=\"messer-b\"><strong>Professor Messer · Exam B</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">" + counts.B + " questions" + (placeholder ? " (placeholders)" : "") + "</span></button>" +
      "<button class=\"card card-button\" data-action=\"messer-c\"><strong>Professor Messer · Exam C</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">" + counts.C + " questions" + (placeholder ? " (placeholders)" : "") + "</span></button>" +
      "<button class=\"card card-button\" data-action=\"mixed\"><strong>Mixed Practice</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">Study Bank + Messer overlay</span></button>" +
    "</div>";
  }

  function renderEmpty(root) {
    root.innerHTML =
      "<p class=\"page-kicker\">Quiz</p>" +
      "<h1 class=\"page-title\">Not enough questions</h1>" +
      "<div class=\"card empty\"><strong>Nothing in this pool</strong>Try another domain mix, or miss a few questions first if you chose review mode.</div>" +
      "<div class=\"stack\" style=\"margin-top:12px\">" +
        "<button class=\"btn btn-primary\" data-action=\"back-config\">Choose another quiz</button>" +
      "</div>";
  }

  function renderPlay(root) {
    const question = currentQuestion();
    const total = session.questions.length;
    const number = session.index + 1;
    const progressPct = Math.round((session.index / total) * 100);
    const saved = isQuestionSaved(question.id);
    const letters = ["A", "B", "C", "D", "E", "F"];
    const showMarks = session.checked && session.settings.mode !== "diagnostic" && !session.settings.timed && session.settings.mode !== "timed";
    const pbqMode = isPbqQuestion(question);
    const multiMode = isMultiSelectQuestion(question);
    const correctSet = getCorrectAnswerIndexes(question);
    const optionsHtml = pbqMode ? "" : (question.options || []).map(function (option, index) {
      const tags = [];
      const chosen = isIndexSelected(session.selected, index);
      if (showMarks && chosen) {
        tags.push("<span class=\"option-tag option-tag-yours\">Your answer</span>");
      }
      if (showMarks && correctSet.indexOf(index) !== -1) {
        tags.push("<span class=\"option-tag option-tag-correct\">Correct answer</span>");
      }
      return (
        "<button type=\"button\" class=\"" + optionClass(question, index) + "\" data-action=\"select\" data-index=\"" + index + "\" role=\"" + (multiMode ? "checkbox" : "radio") + "\" aria-checked=\"" + chosen + "\"" + (session.checked ? " disabled" : "") + ">" +
          (multiMode ? "<span class=\"option-check\" aria-hidden=\"true\"></span>" : "") +
          "<span class=\"letter\">" + letters[index] + "</span>" +
          "<span class=\"option-copy\">" +
            "<span>" + escapeHtml(option) + "</span>" +
            (tags.length ? "<span class=\"option-tags\">" + tags.join("") + "</span>" : "") +
          "</span>" +
        "</button>"
      );
    }).join("");
    const hint = selectCountHint(question);

    let feedback = "";
    if (session.checked) {
      if (session.settings.mode === "diagnostic" || session.settings.timed || session.settings.mode === "timed") {
        feedback = "<div class=\"feedback\" role=\"status\"><strong>Answer saved</strong><p class=\"muted\">Explanations appear after you finish the diagnostic.</p></div>";
      } else {
        const conf = getAppState().prefs.enableConfidence
          ? "<div class=\"chip-row\" style=\"margin-top:10px\"><span class=\"muted\">Confidence (optional)</span>" +
            ["not-sure|Not sure", "somewhat|Somewhat", "confident|Confident"].map(function (pair) {
              const parts = pair.split("|");
              return "<button class=\"chip" + (session.confidence === parts[0] ? " is-selected" : "") + "\" data-action=\"confidence\" data-level=\"" + parts[0] + "\">" + parts[1] + "</button>";
            }).join("") + "</div>"
          : "";
        const reviewHtml = (pbqMode && question.pbq && typeof PbqEngine !== "undefined")
          ? "<div class=\"answer-review\"><p>" + (session.answers[session.answers.length - 1] && session.answers[session.answers.length - 1].correct ? "Correct ✓" : "Incorrect ✕") + "</p>" +
            PbqEngine.reviewHtml(question.pbq, session.selected) +
            "<p>" + escapeHtml(question.explanation || "") + "</p>" +
            (question.objective ? "<p class=\"muted\">Objective: SY0-701 " + escapeHtml(question.objective) + "</p>" : "") +
            "<p class=\"muted\">Source: " + escapeHtml(typeof QuestionBank !== "undefined" ? QuestionBank.sourceLabel(question) : "Current Study Bank") + "</p></div>"
          : (typeof AnswerReview !== "undefined"
          ? AnswerReview.renderHtml(question, session.selected)
          : "");
        feedback = reviewHtml + conf;
      }
    }

    root.innerHTML =
      "<div class=\"quiz-top\">" +
        "<div class=\"row-between\"><span class=\"muted\">Question " + number + " of " + total + "</span>" +
          "<button class=\"icon-btn" + (saved ? " is-on" : "") + "\" data-action=\"bookmark\" aria-pressed=\"" + saved + "\" aria-label=\"" + (saved ? "Remove bookmark" : "Bookmark question") + "\">" + (saved ? "★" : "☆") + "</button>" +
        "</div>" +
        "<div class=\"bar\" style=\"margin-top:10px\" aria-hidden=\"true\"><span style=\"width:" + progressPct + "%\"></span></div>" +
      "</div>" +
      (session.settings.fallbackNote ? "<p class=\"muted\">" + escapeHtml(session.settings.fallbackNote) + "</p>" : "") +
      "<p class=\"muted\" style=\"margin:0 0 8px\">" + escapeHtml(getDomainShortName(question.domain)) +
        (question.objective && getAppState().prefs.showObjectiveIds !== false ? " · " + question.objective : "") +
        (getAppState().prefs.showDifficulty ? " · " + escapeHtml(question.difficulty) : "") + "</p>" +
      ((question.placeholder || /^PLACEHOLDER\b/i.test(question.question || ""))
        ? "<div class=\"placeholder-banner\" role=\"status\"><strong>DEVELOPMENT / PLACEHOLDER</strong> Fake item for architecture testing. Not purchased Professor Messer content.</div>"
        : "") +
      "<p class=\"question-text\">" + escapeHtml(question.question) + "</p>" +
      (hint ? "<p class=\"question-hint\">" + escapeHtml(hint) + "</p>" : "") +
      (pbqMode ? "<div id=\"pbq-live\" class=\"stack\"></div>" : "<div class=\"stack\">" + optionsHtml + "</div>") +
      (session.checked ? "<p class=\"muted\">Source: " + escapeHtml(typeof QuestionBank !== "undefined" ? QuestionBank.sourceLabel(question) : "Current Study Bank") + "</p>" : "") +
      "<div class=\"stack\" style=\"margin-top:14px\">" +
        feedback +
        (session.checked
          ? "<button class=\"btn btn-primary\" data-action=\"next\">" + (session.index === total - 1 ? "See results" : "Next question") + "</button>"
          : "<button class=\"btn btn-primary\" data-action=\"check\"" + (!pbqMode && !hasAnswerSelection(question, session.selected) ? " disabled" : "") + ">" + ((session.settings.timed || session.settings.mode === "timed" || session.settings.mode === "diagnostic") ? "Save and continue" : "Check answer") + "</button>") +
        (session.checked && session.settings.mode !== "diagnostic" && !session.settings.timed
          ? toolsHtml(question)
          : "") +
      "</div>";
    if (pbqMode && question.pbq && typeof PbqEngine !== "undefined") {
      const host = document.getElementById("pbq-live");
      if (host) {
        PbqEngine.render(host, question.pbq, {
          review: session.checked && session.settings.mode !== "diagnostic" && !session.settings.timed,
          saved: session.selected
        });
      }
    }
  }

  function toolsHtml(question) {
    const note = getAppState().questionNotes[question.id] || "";
    return "<details class=\"card accordion\" style=\"margin-top:8px\"><summary>Note / report</summary>" +
      "<label class=\"custom-field\">Private note<textarea id=\"q-note\" rows=\"2\">" + escapeHtml(note) + "</textarea></label>" +
      "<button class=\"btn btn-secondary\" data-action=\"save-note\" style=\"margin-top:8px\">Save note</button>" +
      "<p class=\"muted\">Report question</p><div class=\"chip-row\">" +
      ["unclear", "possible-wrong", "too-easy", "duplicate", "explanation-unclear", "other"].map(function (r) {
        return "<button class=\"chip\" data-action=\"report\" data-reason=\"" + r + "\">" + r.replace(/-/g, " ") + "</button>";
      }).join("") + "</div></details>" +
      (question.topic ? "<button class=\"btn btn-secondary\" data-action=\"study-concept\" style=\"margin-top:8px\">Study this concept</button>" : "");
  }

  function encouragement(pct) {
    if (pct >= 90) {
      return "Excellent work.";
    }
    if (pct >= 75) {
      return "Nice work.";
    }
    if (pct >= 50) {
      return "Solid start. Review the misses.";
    }
    return "Keep going. Review mode will help.";
  }

  function renderResults(root) {
    if (!session || !session.results) {
      renderConfig(root);
      return;
    }
    const results = session.results;
    const domainHtml = Object.keys(results.domainResults).map(function (domainId) {
      const stats = results.domainResults[domainId];
      const pct = percent(stats.correct, stats.attempted);
      return (
        "<div class=\"card\">" +
          "<div class=\"row-between\"><strong>" + escapeHtml(getDomainShortName(domainId)) + "</strong><span>" + formatPercent(pct) + "</span></div>" +
          "<div class=\"bar\" style=\"margin-top:10px\"><span style=\"width:" + (pct || 0) + "%\"></span></div>" +
        "</div>"
      );
    }).join("");

    root.innerHTML =
      "<div class=\"card results-hero\">" +
        "<p class=\"page-kicker\">Quiz complete</p>" +
        "<p class=\"results-score\">" + results.score + " / " + results.total + "</p>" +
        "<p style=\"font-size:1.4rem;font-weight:800;margin:0\">" + results.percent + "%</p>" +
        "<p>" + encouragement(results.percent) + "</p>" +
        "<p class=\"muted\">Time " + formatDuration(results.durationMs) + " · " + results.score + " correct · " + (results.total - results.score) + " incorrect</p>" +
        (results.type === "diagnostic" && results.weakest
          ? "<p>Strongest: " + escapeHtml(getDomainShortName(results.strongest.id)) + " · Suggested start: " + escapeHtml(getDomainShortName(results.weakest.id)) + "</p>"
          : "") +
      "</div>" +
      "<h2 class=\"section-title\">Domain performance</h2>" +
      "<div class=\"stack\">" + domainHtml + "</div>" +
      "<div class=\"stack\" style=\"margin-top:16px\">" +
        (function () {
          const plan = typeof Plan !== "undefined" ? Plan.todayPlan(getAppState()) : null;
          const done = plan ? Plan.completedCount(plan) : 0;
          const next = plan ? Plan.nextTask(plan) : null;
          if (!plan) {
            return "";
          }
          return "<div class=\"card\"><strong>Task complete ✓</strong><p class=\"muted\" style=\"margin:8px 0 0\">" + done + " of " + plan.tasks.length + " completed</p>" +
            (next ? "<button class=\"btn btn-primary\" data-action=\"next-plan\" style=\"margin-top:10px\">Next: " + escapeHtml(next.title) + "</button>" : "<p>Today's plan is done.</p>") +
            "</div>";
        })() +
        (results.missedCount
          ? "<button class=\"btn btn-primary\" data-action=\"review-missed\">Review " + results.missedCount + " missed question" + (results.missedCount === 1 ? "" : "s") + "</button>"
          : "") +
        "<button class=\"btn btn-secondary\" data-action=\"another\">Take another quiz</button>" +
        "<button class=\"btn btn-secondary\" data-action=\"home\">Home</button>" +
      "</div>";
  }

  function render() {
    const root = document.getElementById("view-quiz");
    if (!root) {
      return;
    }
    const hash = (location.hash || "#quiz").slice(1);
    if (hash === "quiz/results") {
      renderResults(root);
    } else if (hash === "quiz/play") {
      if (!session) {
        const saved = getAppState().activeSession;
        if (saved && saved.kind === "quiz" && restoreQuiz(saved)) {
          renderPlay(root);
          return;
        }
        renderConfig(root);
      } else if (session.empty) {
        renderEmpty(root);
      } else {
        renderPlay(root);
      }
    } else {
      renderConfig(root);
    }
  }

  function startCustom() {
    const countInput = document.getElementById("custom-count");
    const boxes = document.querySelectorAll(".domain-box:checked");
    const missedOnly = document.getElementById("missed-only");
    const domainIds = Array.prototype.map.call(boxes, function (box) { return box.value; });
    start({
      count: clamp(Number(countInput && countInput.value) || 10, 1, QUESTIONS.length),
      domainIds: domainIds.length ? domainIds : DOMAINS.map(function (d) { return d.id; }),
      missedOnly: !!(missedOnly && missedOnly.checked),
      reviewSession: !!(missedOnly && missedOnly.checked),
      difficulty: (document.getElementById("custom-diff") || {}).value || "all",
      status: (document.getElementById("custom-status") || {}).value || "all",
      objective: (document.getElementById("custom-objective") || {}).value || "",
      topic: (document.getElementById("custom-topic") || {}).value || "",
      mode: "custom"
    });
  }

  function onClick(event) {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) {
      return;
    }
    const action = actionEl.getAttribute("data-action");
    if (action === "quick") {
      startQuick();
    } else if (action === "messer-a") {
      startMesserExam("A");
    } else if (action === "messer-b") {
      startMesserExam("B");
    } else if (action === "messer-c") {
      startMesserExam("C");
    } else if (action === "mixed") {
      startMixed(20);
    } else if (action === "standard") {
      startStandard();
    } else if (action === "diagnostic") {
      startDiagnostic();
    } else if (action === "adaptive") {
      Adaptive.start(Number(actionEl.getAttribute("data-count")) || 10);
    } else if (action === "exam") {
      location.hash = "exam";
    } else if (action === "confidence") {
      const level = actionEl.getAttribute("data-level");
      session.confidence = level;
      const q = currentQuestion();
      updateState(function (state) {
        const stat = ensureQuestionStat(state, q.id);
        stat.confidence = level;
        const lastCorrect = session.answers.length && session.answers[session.answers.length - 1].correct;
        scheduleReview(stat, lastCorrect, level, !!session.settings.reviewSession);
        if (!lastCorrect && level === "confident") {
          stat.misconceptionRisk = true;
        }
      });
      persistQuiz();
      render();
    } else if (action === "toggle-custom") {
      const panel = document.getElementById("custom-panel");
      if (panel) {
        panel.hidden = !panel.hidden;
      }
    } else if (action === "start-custom") {
      startCustom();
    } else if (action === "missed-review") {
      startMissedReview();
    } else if (action === "review-missed") {
      const ids = session && session.results ? session.results.missedIds : loadState().missedQuestions;
      start({
        count: ids.length || 10,
        questionIds: ids,
        reviewSession: true,
        mode: "review"
      });
    } else if (action === "select") {
      selectAnswer(Number(actionEl.getAttribute("data-index")));
    } else if (action === "check") {
      checkAnswer();
    } else if (action === "next") {
      nextQuestion();
    } else if (action === "bookmark") {
      toggleBookmark();
      if (typeof App !== "undefined" && App.toast) {
        App.toast(isQuestionSaved(currentQuestion().id) ? "Question saved." : "Bookmark removed.");
      }
    } else if (action === "another" || action === "back-config") {
      session = null;
      clearActiveSession();
      location.hash = "quiz";
    } else if (action === "save-note") {
      const box = document.getElementById("q-note");
      saveQuestionNote(currentQuestion().id, box ? box.value : "");
      if (App.toast) {
        App.toast("Note saved.");
      }
    } else if (action === "report") {
      reportQuestion(currentQuestion().id, actionEl.getAttribute("data-reason"), "");
      if (App.toast) {
        App.toast("Report saved on this device.");
      }
    } else if (action === "study-concept") {
      const q = currentQuestion();
      Adaptive.startWeakArea({ topic: q.topic, count: 8 });
    } else if (action === "timed-10") {
      Adaptive.start(10, { mode: "timed", timed: true, durationMs: 10 * 60 * 1000 });
    } else if (action === "home") {
      location.hash = "home";
    } else if (action === "next-plan") {
      const next = Plan.nextTask(Plan.todayPlan(getAppState()) || { tasks: [] });
      if (next) {
        Plan.launch(next);
      } else {
        location.hash = "home";
      }
    }
  }

  function init() {
    document.getElementById("view-quiz").addEventListener("click", onClick);
  }

  function startDiagnostic() {
    const picked = pickWeightedQuestions(25);
    start({
      count: picked.length,
      questionIds: picked.map(function (q) { return q.id; }),
      mode: "diagnostic",
      type: "diagnostic"
    });
  }

  function startTopic(topic, domainId, searchTerms) {
    let pool = getQuestionsByTopic(topic);
    let note = "";
    if (pool.length < 4 && searchTerms && searchTerms.length) {
      const extra = QUESTIONS.filter(function (q) {
        const hay = ((q.topic || "") + " " + (q.tags || []).join(" ")).toLowerCase();
        return searchTerms.some(function (term) {
          return hay.indexOf(String(term).toLowerCase()) !== -1;
        });
      });
      const seen = {};
      pool = pool.concat(extra).filter(function (q) {
        if (seen[q.id]) {
          return false;
        }
        seen[q.id] = true;
        return true;
      });
    }
    if (pool.length < 4) {
      pool = getQuestionsByDomain(domainId);
      note = "Not enough topic questions; using related domain questions.";
    }
    start({
      count: Math.min(10, pool.length),
      questionIds: takeRandom(pool, 10).map(function (q) { return q.id; }),
      mode: "topic",
      fallbackNote: note
    });
  }

  return {
    init: init,
    render: render,
    start: start,
    startQuick: startQuick,
    startMesserExam: startMesserExam,
    startMixed: startMixed,
    startStandard: startStandard,
    startMissedReview: startMissedReview,
    startDiagnostic: startDiagnostic,
    startTopic: startTopic,
    restoreQuiz: restoreQuiz,
    hasSession: function () { return !!session && !session.results; }
  };
})();
