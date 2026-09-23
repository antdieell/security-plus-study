/**
 * Question-source overlay on the existing QUESTIONS array.
 * Current Study Bank stays public-in-repo (still behind the site password).
 * Professor Messer rows come from placeholders in-repo or /private-data after deploy.
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
      correctAnswers: row.correctAnswers || row.correct_answers || null,
      explanation: row.explanation || "",
      incorrectExplanations: row.incorrectExplanations || row.incorrect_explanations || {},
      objective: row.objective || "",
      domain: mapDomain(row.domain),
      topic: row.topic || "",
      difficulty: row.difficulty || "medium",
      tags: row.tags || [],
      private: !!row.private,
      pbq: row.pbq || null,
      placeholder: !!(row.placeholder || /^PLACEHOLDER\b/i.test(String(row.question || "")))
    };
  }

  function isPlaceholder(question) {
    return !!(question && (question.placeholder || /^PLACEHOLDER\b/i.test(String(question.question || ""))));
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

  function counts() {
    const messer = extra.filter(function (q) { return q.source === "messer"; });
    function exam(letter) {
      return messer.filter(function (q) { return q.exam === letter; }).length;
    }
    return { original: publicPool().length, messer: messer.length, A: exam("A"), B: exam("B"), C: exam("C") };
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
      return extra.filter(function (q) {
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
        pool = pool.concat(extra.filter(function (q) { return q.source === "messer"; }));
      }
      return pool;
    }
    return publicPool();
  }

  function getMesserExam(letter) {
    return extra.filter(function (q) {
      return q.source === "messer" && q.exam === letter;
    }).sort(function (a, b) {
      return String(a.id).localeCompare(String(b.id));
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
    return fetch("./private-data/messer-questions.json", { credentials: "same-origin" }).then(function (res) {
      if (!res.ok) {
        return null;
      }
      return res.json();
    }).then(function (data) {
      const rows = data && (data.questions || data);
      if (Array.isArray(rows) && rows.length) {
        setExtra(rows);
      }
    }).catch(function () {
      return null;
    });
  }

  return {
    init: init,
    setExtra: setExtra,
    getPool: getPool,
    getMesserExam: getMesserExam,
    counts: counts,
    sourceLabel: sourceLabel,
    isPlaceholder: isPlaceholder
  };
})();
