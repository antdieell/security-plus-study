/**
 * Question-bank audit. Run: node scripts/auditQuestions.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const context = { console: console };
vm.createContext(context);
[
  "data/domains.js",
  "data/objectives.js",
  "data/examConfig.js",
  "data/questions.js",
  "data/questions-source-v2.js",
  "js/utils.js"
].forEach(function (file) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
});

const questions = context.QUESTIONS;
const official = new Set(context.getAllObjectiveIds());

function normalize(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(text) {
  return normalize(text).split(" ").filter(function (t) { return t.length > 2; });
}

function overlap(a, b) {
  const sa = new Set(tokens(a));
  const sb = new Set(tokens(b));
  if (!sa.size || !sb.size) {
    return 0;
  }
  let hit = 0;
  sa.forEach(function (t) {
    if (sb.has(t)) {
      hit += 1;
    }
  });
  return hit / Math.max(sa.size, sb.size);
}

const byDomain = {};
const byObjective = {};
const byDiff = { easy: 0, medium: 0, hard: 0 };
const byType = {};
const ids = {};
const dupIds = [];
const missing = { explanation: [], objective: [], difficulty: [], topic: [], tags: [], options: [], answer: [] };
const shortExpl = [];
const similar = [];

questions.forEach(function (q, i) {
  if (!q.id || ids[q.id]) {
    dupIds.push(q.id || ("index-" + i));
  }
  ids[q.id] = true;
  byDomain[q.domain] = (byDomain[q.domain] || 0) + 1;
  byObjective[q.objective || "(none)"] = (byObjective[q.objective || "(none)"] || 0) + 1;
  if (byDiff[q.difficulty] != null) {
    byDiff[q.difficulty] += 1;
  }
  const type = q.questionType || "multiple-choice";
  byType[type] = (byType[type] || 0) + 1;
  if (!q.explanation) {
    missing.explanation.push(q.id);
  } else if (q.explanation.length < 40) {
    shortExpl.push(q.id);
  }
  if (!q.objective || !official.has(q.objective)) {
    missing.objective.push(q.id);
  }
  if (["easy", "medium", "hard"].indexOf(q.difficulty) === -1) {
    missing.difficulty.push(q.id);
  }
  if (!q.topic) {
    missing.topic.push(q.id);
  }
  if (!q.tags || !q.tags.length) {
    missing.tags.push(q.id);
  }
  if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(function (o) { return !String(o).trim(); })) {
    missing.options.push(q.id);
  }
  if (!Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer > 3) {
    missing.answer.push(q.id);
  }
});

for (let i = 0; i < questions.length; i += 1) {
  for (let j = i + 1; j < questions.length; j += 1) {
    const score = overlap(questions[i].question, questions[j].question);
    if (score >= 0.72) {
      similar.push({ a: questions[i].id, b: questions[j].id, score: Math.round(score * 100) });
    }
  }
}

function list(arr) {
  return arr.length ? arr.join(", ") : "(none)";
}

console.log("SEC+ STUDY QUESTION AUDIT");
console.log("Total questions:", questions.length);
console.log("");
console.log("Per domain");
Object.keys(byDomain).sort().forEach(function (k) {
  console.log("  " + k + ": " + byDomain[k]);
});
console.log("");
console.log("Per objective");
Object.keys(byObjective).sort().forEach(function (k) {
  console.log("  " + k + ": " + byObjective[k]);
});
console.log("");
console.log("Difficulty", byDiff);
console.log("Question types", byType);
console.log("");
console.log("Duplicate IDs:", list(dupIds));
console.log("Missing explanations:", list(missing.explanation));
console.log("Missing/invalid objectives:", list(missing.objective));
console.log("Missing difficulty:", list(missing.difficulty));
console.log("Missing topic:", list(missing.topic));
console.log("Missing tags:", missing.tags.length);
console.log("Malformed options:", list(missing.options));
console.log("Invalid correctAnswer:", list(missing.answer));
console.log("Very short explanations:", list(shortExpl));
console.log("Possible near-duplicates:");
if (!similar.length) {
  console.log("  (none)");
} else {
  similar.slice(0, 20).forEach(function (row) {
    console.log("  " + row.a + " ~ " + row.b + " (" + row.score + "% token overlap)");
  });
}
