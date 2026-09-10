/**
 * Content coverage report. Run: node scripts/content-report.js
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
  "data/flashcards.js",
  "data/pbqs.js",
  "data/pbqs-v3.js",
  "js/utils.js"
].forEach(function (file) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
});

const questions = context.QUESTIONS;
const byDomain = {};
const byObjective = {};
const byDiff = { easy: 0, medium: 0, hard: 0 };
let missingIncorrect = 0;
questions.forEach(function (q) {
  byDomain[q.domain] = (byDomain[q.domain] || 0) + 1;
  byObjective[q.objective || "(none)"] = (byObjective[q.objective || "(none)"] || 0) + 1;
  if (byDiff[q.difficulty] != null) {
    byDiff[q.difficulty] += 1;
  }
  if (!q.incorrectExplanations) {
    missingIncorrect += 1;
  }
});

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
let dups = 0;
for (let i = 0; i < questions.length; i += 1) {
  for (let j = i + 1; j < questions.length; j += 1) {
    if (overlap(questions[i].question, questions[j].question) >= 0.72) {
      dups += 1;
    }
  }
}

const domainOrder = ["general", "threats", "architecture", "operations", "governance"];
const numbers = { general: "1", threats: "2", architecture: "3", operations: "4", governance: "5" };

console.log("SEC+ STUDY CONTENT REPORT");
console.log("Questions:", questions.length);
console.log("PBQs:", context.PBQS.length);
console.log("Flashcards:", context.FLASHCARDS.length);
console.log("");
console.log("Domain Distribution");
domainOrder.forEach(function (id) {
  const n = byDomain[id] || 0;
  const pct = Math.round((n / questions.length) * 100);
  const target = Math.round((context.getDomainById(id).weight || 0) * 100);
  console.log("  " + numbers[id] + ": " + n + " (" + pct + "%, target ~" + target + "%)");
});
console.log("");
console.log("Objectives with lowest question coverage:");
context.getAllObjectiveIds().map(function (id) {
  return { id: id, n: byObjective[id] || 0, title: context.getObjectiveTitle(id) };
}).sort(function (a, b) {
  return a.n - b.n;
}).slice(0, 8).forEach(function (row) {
  console.log("  " + row.id + " — " + row.n + " questions · " + row.title);
});
console.log("");
console.log("Difficulty:");
console.log("  Easy:", byDiff.easy);
console.log("  Medium:", byDiff.medium);
console.log("  Hard:", byDiff.hard);
console.log("Missing incorrect explanations:", missingIncorrect);
console.log("Possible duplicates:", dups);
