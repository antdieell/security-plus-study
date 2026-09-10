/**
 * SY0-701 exam configuration.
 * Domain weights live here — quiz/exam generation should read this object.
 */
var EXAM_CONFIG = {
  version: "SY0-701",
  displayName: "SY0-701",
  fullName: "CompTIA Security+ SY0-701",
  fullQuestionCount: 90,
  minutesPerQuestion: 1,
  modes: {
    exam30: { count: 30, minutes: 30, label: "30-question practice exam" },
    exam60: { count: 60, minutes: 60, label: "60-question practice exam" },
    exam90: { count: 90, minutes: 90, label: "Full simulation" },
    examWeighted: { count: 30, minutes: 30, label: "Weighted random exam" }
  },
  scoreNote: "This is a study estimate, not an official CompTIA exam score.",
  adaptiveWeights: {
    weak: 3,
    unseen: 2.4,
    due: 3.2,
    miss: 2.8,
    lowConfidence: 2.2,
    misconception: 3.5
  }
};

if (typeof OBJECTIVE_MAP !== "undefined") {
  EXAM_CONFIG.objectives = {};
  OBJECTIVE_MAP.forEach(function (group) {
    EXAM_CONFIG.objectives[group.domain] = group.objectives.map(function (obj) {
      return { id: obj.id, name: obj.title, subtopics: obj.subtopics };
    });
  });
}

EXAM_CONFIG.domains = DOMAINS.map(function (domain) {
  return {
    id: domain.id,
    number: domain.number,
    name: domain.name,
    shortName: domain.shortName,
    weight: domain.weight,
    examWeight: domain.examWeight
  };
});

function getExamDomainWeight(domainId) {
  const domain = getDomainById(domainId);
  if (domain && typeof domain.weight === "number") {
    return domain.weight;
  }
  return 0.2;
}

function getObjectiveName(objectiveId) {
  if (!objectiveId) {
    return null;
  }
  if (typeof getObjectiveTitle === "function") {
    const title = getObjectiveTitle(objectiveId);
    if (title && title !== objectiveId) {
      return title;
    }
  }
  const groups = EXAM_CONFIG.objectives || {};
  const keys = Object.keys(groups);
  for (let i = 0; i < keys.length; i += 1) {
    const found = groups[keys[i]].find(function (item) { return item.id === objectiveId; });
    if (found) {
      return found.name;
    }
  }
  return objectiveId;
}

function allocateByDomainWeight(total) {
  const raw = DOMAINS.map(function (domain) {
    return {
      id: domain.id,
      n: Math.round(total * getExamDomainWeight(domain.id))
    };
  });
  let sum = raw.reduce(function (acc, item) { return acc + item.n; }, 0);
  while (sum > total) {
    raw.sort(function (a, b) { return b.n - a.n; });
    if (raw[0].n > 1) {
      raw[0].n -= 1;
      sum -= 1;
    } else {
      break;
    }
  }
  while (sum < total) {
    raw.sort(function (a, b) { return getExamDomainWeight(b.id) - getExamDomainWeight(a.id); });
    raw[0].n += 1;
    sum += 1;
  }
  return raw;
}

function pickWeightedQuestions(total, pool) {
  const source = (pool || QUESTIONS).slice();
  const allocation = allocateByDomainWeight(total);
  const picked = [];
  const used = {};

  allocation.forEach(function (slot) {
    const domainPool = shuffleArray(source.filter(function (q) {
      return q.domain === slot.id && !used[q.id];
    }));
    domainPool.slice(0, slot.n).forEach(function (q) {
      used[q.id] = true;
      picked.push(q);
    });
  });

  if (picked.length < total) {
    shuffleArray(source).forEach(function (q) {
      if (picked.length >= total || used[q.id]) {
        return;
      }
      used[q.id] = true;
      picked.push(q);
    });
  }

  return shuffleArray(picked).slice(0, total);
}

function pickExamQuestions(total, options) {
  options = options || {};
  const state = typeof getAppState === "function" ? getAppState() : { questionStats: {}, sessionHistory: [] };
  const recentIds = {};
  (state.sessionHistory || []).filter(function (s) {
    return String(s.type || "").indexOf("exam") === 0;
  }).slice(0, 2).forEach(function (s) {
    (s.questionIds || (s.responses || []).map(function (r) { return r.questionId; })).forEach(function (id) {
      recentIds[id] = true;
    });
  });
  const source = (options.pool || QUESTIONS).slice();
  const allocation = allocateByDomainWeight(total);
  const picked = [];
  const used = {};

  function score(q) {
    const st = state.questionStats[q.id];
    let s = 4;
    if (!st || !st.attempts) {
      s += 5;
    } else {
      s += Math.max(0, 3 - st.attempts);
    }
    if (recentIds[q.id]) {
      s -= 8;
    }
    if (q.difficulty === "hard") {
      s += 1.5;
    } else if (q.difficulty === "medium") {
      s += 1;
    }
    if (typeof isQuestionMastered === "function" && isQuestionMastered(st, q)) {
      s -= 2;
    }
    return Math.max(0.05, s);
  }

  allocation.forEach(function (slot) {
    const domainPool = source.filter(function (q) { return q.domain === slot.id && !used[q.id]; });
    const take = [];
    const copy = domainPool.slice();
    for (let i = 0; i < slot.n && copy.length; i += 1) {
      const choice = weightedRandom(copy, score);
      take.push(choice);
      copy.splice(copy.indexOf(choice), 1);
    }
    take.forEach(function (q) {
      used[q.id] = true;
      picked.push(q);
    });
  });

  if (picked.length < total) {
    source.forEach(function (q) {
      if (picked.length >= total || used[q.id]) {
        return;
      }
      used[q.id] = true;
      picked.push(q);
    });
  }
  return shuffleArray(picked).slice(0, total);
}
