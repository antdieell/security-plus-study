/**
 * Question-source overlay on the existing QUESTIONS array.
 * Current Study Bank stays in-repo. Professor Messer rows load from
 * data/messer-questions.json after the client-side password gate.
 */
var QuestionBank = (function () {
  var extra = [];
  var extraById = {};
  var nativeGetById = typeof getQuestionById === "function" ? getQuestionById : null;

  const DOMAIN_ALIASES = {
    "1": "general", "1.0": "general", "general security concepts": "general",
    "2": "threats", "2.0": "threats", "threats vulnerabilities and mitigations": "threats",
    "3": "architecture", "3.0": "architecture", "security architecture": "architecture",
    "4": "operations", "4.0": "operations", "security operations": "operations",
    "5": "governance", "5.0": "governance", "security program management and oversight": "governance"
  };

  function mapDomain(value) {
    const raw = String(value || "").trim();
    if (typeof getDomainById === "function" && getDomainById(raw)) {
      return raw;
    }
    const compact = raw.toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim();
    if (DOMAIN_ALIASES[compact]) {
      return DOMAIN_ALIASES[compact];
    }
    const num = raw.match(/^(\d)/);
    return (num && DOMAIN_ALIASES[num[1]]) || "general";
  }

  function normalize(row, fallbackSource) {
    if (!row) {
      return null;
    }
    const options = Array.isArray(row.options) ? row.options : (row.choices || []);
    const type = row.questionType || row.type || "multiple-choice";
    const rawMulti = row.correctAnswers || row.correct_answers;
    const correctAnswers = Array.isArray(rawMulti) && rawMulti.length
      ? (typeof uniqueSortedInts === "function" ? uniqueSortedInts(rawMulti) : rawMulti.slice())
      : null;
    return {
      id: row.id,
      source: row.source || fallbackSource || "original",
      exam: row.exam || null,
      questionType: type,
      type: type,
      question: row.question,
      options: options,
      choices: options,
      correctAnswer: row.correctAnswer != null ? row.correctAnswer : row.correct_answer,
      correctAnswers: correctAnswers,
      correct_answers: correctAnswers,
      explanation: row.explanation || "",
      incorrectExplanations: row.incorrectExplanations || row.incorrect_explanations || {},
      objective: row.objective || "",
      domain: mapDomain(row.domain),
      topic: row.topic || "",
      difficulty: row.difficulty || "medium",
      tags: row.tags || [],
      private: !!row.private,
      pbq: normalizePbq(row.pbq || null),
      placeholder: !!(row.placeholder || /^PLACEHOLDER\b/i.test(String(row.question || "")))
    };
  }

  function isPlaceholder(question) {
    return !!(question && (question.placeholder || /^PLACEHOLDER\b/i.test(String(question.question || ""))));
  }

  var FAIL_MESSAGE = "Professor Messer question bank failed to load.";
  var bankStatus = {
    source: "demo",
    ready: false,
    message: FAIL_MESSAGE,
    issues: []
  };

  function status() {
    return {
      source: bankStatus.source,
      ready: !!bankStatus.ready,
      message: bankStatus.message,
      issues: (bankStatus.issues || []).slice()
    };
  }

  function setStatus(next) {
    bankStatus = Object.assign({}, bankStatus, next || {});
  }

  function addTextAlias(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      return;
    }
    if (obj.text == null && typeof obj.label === "string") {
      obj.text = obj.label;
    }
  }

  function normalizePbq(spec) {
    if (!spec || typeof spec !== "object") {
      return spec;
    }
    ["left", "right", "items", "choices", "buckets", "nodes"].forEach(function (key) {
      (spec[key] || []).forEach(addTextAlias);
    });
    (spec.stems || []).forEach(function (stem) {
      addTextAlias(stem);
      (stem.options || []).forEach(addTextAlias);
    });
    (spec.options || []).forEach(addTextAlias);
    (spec.prompts || []).forEach(function (prompt) {
      addTextAlias(prompt);
      (prompt.options || []).forEach(addTextAlias);
    });
    (spec.parts || []).forEach(normalizePbq);
    return spec;
  }

  function tagPublic() {
    if (!Array.isArray(QUESTIONS)) {
      return;
    }
    QUESTIONS.forEach(function (q) {
      if (!q.source) {
        q.source = "original";
      }
      if (q.exam === undefined) {
        q.exam = null;
      }
      if (q.private === undefined) {
        q.private = false;
      }
    });
  }

  function setExtra(rows) {
    extra = (rows || []).map(function (row) {
      return normalize(row, "messer");
    }).filter(function (q) {
      return q && q.id && q.question;
    });
    extraById = {};
    extra.forEach(function (q) {
      extraById[q.id] = q;
    });
    patchLookups();
  }

  function patchLookups() {
    window.getQuestionById = function (id) {
      if (extraById[id]) {
        return extraById[id];
      }
      return nativeGetById ? nativeGetById(id) : null;
    };
    window.getQuestionsByIds = function (ids) {
      return (ids || []).map(getQuestionById).filter(Boolean);
    };
  }

  function publicPool() {
    return Array.isArray(QUESTIONS) ? QUESTIONS.slice() : [];
  }

  function extraRows() {
    if (bankStatus.ready) {
      return extra.filter(function (q) { return !isPlaceholder(q); });
    }
    return extra;
  }

  function counts() {
    const messer = extraRows().filter(function (q) { return q.source === "messer"; });
    const live = messer.filter(function (q) { return !isPlaceholder(q); });
    function exam(letter, pool) {
      return (pool || messer).filter(function (q) { return q.exam === letter; }).length;
    }
    const info = status();
    return {
      original: publicPool().length,
      messer: messer.length,
      live: live.length,
      A: exam("A"),
      B: exam("B"),
      C: exam("C"),
      liveA: exam("A", live),
      liveB: exam("B", live),
      liveC: exam("C", live),
      ready: info.ready,
      source: info.source,
      message: info.message
    };
  }

  function examLine(letter) {
    const info = counts();
    if (info.ready && info["live" + letter] === 90) {
      return "Professor Messer Exam " + letter + " — 90 questions";
    }
    return "DEMO — not the real 90-question exam";
  }

  function statusBannerHtml() {
    const info = status();
    if (info.ready) {
      return "";
    }
    const extra = (info.issues && info.issues.length)
      ? "<p class=\"muted\">" + escapeHtml(info.issues.slice(0, 3).join(" · ")) + "</p>"
      : "";
    return "<div class=\"placeholder-banner\" role=\"status\"><strong>" + escapeHtml(FAIL_MESSAGE) + "</strong> Showing DEMO items only — not the real 90-question exams." + extra + "</div>";
  }

  function sourceLabel(question) {
    if (question && question.source === "messer") {
      return "Professor Messer" + (question.exam ? " — Exam " + question.exam : "");
    }
    return "Current Study Bank";
  }

  function getPool(filter) {
    filter = filter || {};
    if (filter.source === "messer" || filter.exam) {
      return extraRows().filter(function (q) {
        return q.source === "messer" && (!filter.exam || q.exam === filter.exam);
      });
    }
    if (filter.source === "mixed" || (filter.sources && filter.sources.length)) {
      const sources = filter.sources || ["original", "messer"];
      let pool = [];
      if (sources.indexOf("original") !== -1) {
        pool = pool.concat(publicPool());
      }
      if (sources.indexOf("messer") !== -1) {
        pool = pool.concat(extraRows().filter(function (q) { return q.source === "messer"; }));
      }
      return pool;
    }
    return publicPool();
  }

  function getMesserExam(letter) {
    return extraRows().filter(function (q) {
      return q.source === "messer" && q.exam === letter;
    }).sort(function (a, b) {
      return String(a.id).localeCompare(String(b.id));
    });
  }

  function rowsFromPayload(data) {
    if (!data) {
      return null;
    }
    const rows = data.questions || data;
    return Array.isArray(rows) ? rows : null;
  }

  function applyValidated(rows, source) {
    const check = validateMesserBank(rows);
    if (!check.ok) {
      setStatus({
        source: "demo",
        ready: false,
        message: FAIL_MESSAGE,
        issues: check.issues
      });
      return false;
    }
    setExtra(rows);
    setStatus({
      source: source,
      ready: true,
      message: "",
      issues: []
    });
    return true;
  }

  function loadDeployed() {
    return fetch("./data/messer-questions.json", {
      credentials: "same-origin",
      cache: "no-store"
    }).then(function (res) {
      if (!res.ok) {
        return null;
      }
      return res.json();
    }).then(function (data) {
      const rows = rowsFromPayload(data);
      if (!rows || !rows.length) {
        return false;
      }
      return applyValidated(rows, "static");
    }).catch(function () {
      return false;
    });
  }

  function init() {
    tagPublic();
    if (!nativeGetById && typeof getQuestionById === "function") {
      nativeGetById = getQuestionById;
    }
    patchLookups();
    if (typeof MESSER_PLACEHOLDERS !== "undefined") {
      setExtra(MESSER_PLACEHOLDERS);
    }
    setStatus({
      source: "demo",
      ready: false,
      message: FAIL_MESSAGE,
      issues: []
    });

    return loadDeployed().then(function (loaded) {
      if (loaded) {
        return status();
      }
      setStatus({
        source: "demo",
        ready: false,
        message: FAIL_MESSAGE,
        issues: bankStatus.issues || []
      });
      return status();
    });
  }

  function validateMesserBank(rows) {
    const issues = [];
    if (!Array.isArray(rows)) {
      return { ok: false, issues: ["payload is not a question array"] };
    }
    if (rows.length !== 270) {
      issues.push("expected 270 records, found " + rows.length);
    }
    const byExam = { A: 0, B: 0, C: 0 };
    const ids = {};
    rows.forEach(function (raw, index) {
      const row = normalize(raw, "messer");
      if (!row || !row.id || !row.question) {
        issues.push("row " + index + " missing id or question");
        return;
      }
      if (ids[row.id]) {
        issues.push("duplicate id " + row.id);
      }
      ids[row.id] = true;
      if (!/^messer-[abc]-\d{3}$/.test(row.id)) {
        issues.push(row.id + " does not match messer-a-001 format");
      }
      if (row.placeholder || /^PLACEHOLDER\b/i.test(row.question)) {
        issues.push(row.id + " looks like a placeholder");
      }
      if (row.exam === "A" || row.exam === "B" || row.exam === "C") {
        byExam[row.exam] += 1;
      } else {
        issues.push(row.id + " missing exam A/B/C");
      }
      const type = row.questionType || row.type || "multiple-choice";
      if (type === "multiple-choice") {
        const opts = row.options || [];
        if (opts.length < 2) {
          issues.push(row.id + " multiple-choice needs options");
        }
        if (!Number.isInteger(row.correctAnswer) || row.correctAnswer < 0 || row.correctAnswer >= opts.length) {
          issues.push(row.id + " bad correctAnswer");
        }
      } else if (type === "multiple-select" || type === "multi-select") {
        const opts = row.options || [];
        const answers = row.correctAnswers || [];
        if (!answers.length) {
          issues.push(row.id + " multiple-select needs correctAnswers");
        }
        answers.forEach(function (n) {
          if (!Number.isInteger(n) || n < 0 || n >= opts.length) {
            issues.push(row.id + " bad correctAnswers index " + n);
          }
        });
      } else if (type === "pbq" || row.pbq) {
        if (!row.pbq) {
          issues.push(row.id + " missing pbq spec");
        } else if (typeof PbqEngine !== "undefined" && PbqEngine.validateSpec) {
          PbqEngine.validateSpec(row.pbq, row.id).forEach(function (issue) {
            issues.push(issue);
          });
        }
      }
    });
    if (byExam.A !== 90) {
      issues.push("exam A expected 90, found " + byExam.A);
    }
    if (byExam.B !== 90) {
      issues.push("exam B expected 90, found " + byExam.B);
    }
    if (byExam.C !== 90) {
      issues.push("exam C expected 90, found " + byExam.C);
    }
    return { ok: issues.length === 0, issues: issues, counts: byExam };
  }

  return {
    init: init,
    setExtra: setExtra,
    getPool: getPool,
    getMesserExam: getMesserExam,
    counts: counts,
    status: status,
    sourceLabel: sourceLabel,
    examLine: examLine,
    statusBannerHtml: statusBannerHtml,
    isPlaceholder: isPlaceholder,
    validateMesserBank: validateMesserBank
  };
})();
