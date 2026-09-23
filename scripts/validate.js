/**
 * Offline data/logic checks. Run: node scripts/validate.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const context = {
  console: console
};
vm.createContext(context);

[
  "data/domains.js",
  "data/objectives.js",
  "data/examConfig.js",
  "data/questions.js",
  "data/questions-source-v2.js",
  "data/flashcards.js",
  "data/studyTopics.js",
  "data/pbqs.js",
  "data/pbqs-v3.js",
  "data/ports.js",
  "data/acronyms.js",
  "js/utils.js"
].forEach(function (file) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
});

let failed = 0;
let warnings = 0;
function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error("FAIL:", message);
  }
}
function warn(condition, message) {
  if (!condition) {
    warnings += 1;
    console.warn("WARN:", message);
  }
}

const domains = context.DOMAINS;
const questions = context.QUESTIONS;
const flashcards = context.FLASHCARDS;
const topics = context.STUDY_TOPICS;
const pbqs = context.PBQS;
const ports = context.PORTS;
const acronyms = context.ACRONYMS;
const domainIds = new Set(domains.map(function (d) { return d.id; }));
const officialObjectives = new Set(context.getAllObjectiveIds());
const allowedPbq = { ordering: 1, matching: 1, multiSelect: 1, categorization: 1, scenario: 1, logs: 1, rules: 1 };

assert(domains.length >= 5, "Need at least 5 domains");
assert(questions.length >= 900, "Need at least 900 replacement questions, found " + questions.length);
assert(questions.length <= 1500, "Question bank unexpectedly large: " + questions.length);
assert(context.QUESTION_BANK_VERSION === "source-bank-v2", "QUESTION_BANK_VERSION");
assert(flashcards.length >= 40, "Need at least 40 flashcards, found " + flashcards.length);
assert(pbqs.length >= 18, "Need at least 18 PBQs, found " + pbqs.length);
assert(ports.length >= 15, "Need common ports");
assert(acronyms.length >= 10, "Need acronyms");
assert(context.EXAM_CONFIG.version === "SY0-701", "Exam version");
assert(Math.abs(domains.reduce(function (sum, d) { return sum + d.weight; }, 0) - 1) < 0.001, "Domain weights should sum to 1");
assert(officialObjectives.size >= 20, "Objective map too small");

const qIds = new Set();
const difficultyCount = { easy: 0, medium: 0, hard: 0 };
const byDomain = {};
const byObjective = {};
questions.forEach(function (q) {
  assert(q.id && !qIds.has(q.id), "Duplicate or missing question id " + q.id);
  assert(/^sq\d{4}$/.test(q.id) || /^sq2-\d{3}$/.test(q.id), q.id + " should use sq#### or sq2-### namespace");
  qIds.add(q.id);
  assert(domainIds.has(q.domain), q.id + " has unknown domain " + q.domain);
  assert(Array.isArray(q.options) && q.options.length === 4, q.id + " needs 4 options");
  assert(Number.isInteger(q.correctAnswer) && q.correctAnswer >= 0 && q.correctAnswer < 4, q.id + " bad correctAnswer");
  assert(q.explanation && q.question, q.id + " missing question/explanation");
  assert(["easy", "medium", "hard"].indexOf(q.difficulty) !== -1, q.id + " bad difficulty");
  difficultyCount[q.difficulty] += 1;
  byDomain[q.domain] = (byDomain[q.domain] || 0) + 1;
  if (q.objective) {
    byObjective[q.objective] = (byObjective[q.objective] || 0) + 1;
    assert(officialObjectives.has(q.objective), q.id + " unknown objective " + q.objective);
    const expectedDomain = context.getObjectiveDomainId(q.objective);
    const isLegacyQ = /^q\d+$/i.test(String(q.id || ""));
    const numericId = Number(String(q.id).replace(/\D/g, ""));
    if (expectedDomain && expectedDomain !== q.domain) {
      if (isLegacyQ && numericId <= 150) {
        warn(false, q.id + " V2 domain/objective mix: " + q.domain + " / " + q.objective);
      } else {
        assert(false, q.id + " objective " + q.objective + " belongs to " + expectedDomain);
      }
    }
  } else {
    failed += 1;
    console.error("FAIL:", q.id + " missing objective");
  }
  warn(q.topic, q.id + " missing topic");
  warn(q.explanation && q.explanation.length >= 40, q.id + " very short explanation");
});

const fcIds = new Set();
flashcards.forEach(function (card) {
  assert(card.id && !fcIds.has(card.id), "Duplicate flashcard id " + card.id);
  fcIds.add(card.id);
  assert(domainIds.has(card.domain), card.id + " unknown domain");
  assert(card.term && card.definition && card.examTip, card.id + " missing fields");
});

const topicIds = new Set();
topics.forEach(function (topic) {
  assert(topic.id && !topicIds.has(topic.id), "Duplicate topic id " + topic.id);
  topicIds.add(topic.id);
  assert(domainIds.has(topic.domain), topic.id + " unknown domain");
});

const pbqIds = new Set();
pbqs.forEach(function (pbq) {
  assert(pbq.id && !pbqIds.has(pbq.id), "Duplicate or missing PBQ id " + pbq.id);
  pbqIds.add(pbq.id);
  assert(pbq.type && pbq.prompt, pbq.id + " incomplete PBQ");
  assert(allowedPbq[pbq.type], pbq.id + " unknown PBQ type " + pbq.type);
  assert(domainIds.has(pbq.domain), pbq.id + " unknown domain");
  if (pbq.objective) {
    assert(officialObjectives.has(pbq.objective), pbq.id + " unknown objective " + pbq.objective);
  }
});

const https = ports.filter(function (p) { return p.protocol === "HTTPS"; })[0];
assert(https && String(https.port) === "443", "HTTPS should be 443");
const ssh = ports.filter(function (p) { return p.protocol === "SSH"; })[0];
assert(ssh && String(ssh.port) === "22", "SSH should be 22");

const shuffled = context.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert(shuffled.length === 10, "shuffle length");
assert(context.takeRandom(questions, 10).length === 10, "takeRandom 10");
assert(context.takeRandom(questions, questions.length + 50).length === questions.length, "takeRandom does not exceed pool");
assert(context.percent(8, 10) === 80, "percent 8/10");
assert(context.percent(0, 0) === null, "percent empty is null");
assert(context.daysBetweenISO("2026-09-08", "2026-09-07") === 1, "streak consecutive day");
assert(context.daysBetweenISO("2026-09-08", "2026-09-06") === 2, "streak broken gap");

const weighted = context.pickWeightedQuestions(30);
assert(weighted.length === 30, "weighted exam pick 30");

domains.forEach(function (d) {
  assert(byDomain[d.id] > 0, "No questions for " + d.id);
});
officialObjectives.forEach(function (id) {
  warn((byObjective[id] || 0) >= 4, "Low question coverage for " + id + " (" + (byObjective[id] || 0) + ")");
});

const memory = {};
context.window = {
  localStorage: {
    getItem: function (key) { return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null; },
    setItem: function (key, value) { memory[key] = String(value); },
    removeItem: function (key) { delete memory[key]; }
  }
};
vm.runInContext(fs.readFileSync(path.join(root, "js/storage.js"), "utf8"), context);

assert(context.SCHEMA_VERSION === 4, "SCHEMA_VERSION should be 4");

const v1 = {
  totalAnswered: 10,
  totalCorrect: 5,
  domainStats: { threats: { attempted: 6, correct: 3 } },
  missedQuestions: ["q012"],
  savedQuestions: ["q013"],
  flashcardStatus: { fc001: "review" },
  quizHistory: [{ date: 1, score: 4, total: 10, percent: 40, mode: "quick" }],
  streak: { count: 2, lastStudyDate: "2026-09-07" }
};
memory[context.STORAGE_KEY] = JSON.stringify(v1);
const migrated = context.getAppState();
assert(migrated.schemaVersion === 4, "V1 migrates to schema 4");
assert(migrated.totalAnswered === 10 && migrated.totalCorrect === 5, "V1 totals preserved");
assert(migrated.missedQuestions.indexOf("q012") === -1, "obsolete question IDs removed from missed");
assert(!migrated.questionStats.q012, "obsolete question stats removed");
assert(migrated.questionBankVersion === "source-bank-v2", "bank version stamped");
const preserved = JSON.parse(JSON.stringify(migrated));
preserved.questionBankVersion = "source-bank-v1";
preserved.questionStats.sq0001 = { attempts: 3, correct: 2, nextReview: "2026-09-20", intervalDays: 7 };
preserved.missedQuestions = ["sq0001"];
preserved.savedQuestions = ["sq0001"];
preserved.questionNotes.sq0001 = "keep me";
memory[context.STORAGE_KEY] = JSON.stringify(preserved);
const additive = context.getAppState();
assert(additive.questionBankVersion === "source-bank-v2", "additive bank version stamp");
assert(additive.questionStats.sq0001 && additive.questionStats.sq0001.attempts === 3, "existing question stats preserved");
assert(additive.questionStats.sq0001.nextReview === "2026-09-20", "existing review schedule preserved");
assert(additive.missedQuestions.indexOf("sq0001") !== -1, "existing missed ID preserved");
assert(additive.savedQuestions.indexOf("sq0001") !== -1, "existing bookmark preserved");
assert(additive.questionNotes.sq0001 === "keep me", "existing note preserved");
assert(!additive.questionStats["sq2-001"], "new questions start without history");
assert(migrated.streak.count === 2, "streak preserved");
assert(migrated.quizHistory.length === 1, "quiz history preserved");
assert(Array.isArray(migrated.dailyPlans), "V3 dailyPlans present");
assert(migrated.questionNotes && migrated.errorJournal, "V3 journal/notes present");
assert(migrated.sourceStats && migrated.sourceStats.original, "V4 sourceStats present");
assert(migrated.messerExamStats && migrated.messerExamStats.A, "V4 messerExamStats present");

[
  "data/messer-placeholders.js",
  "data/pbq-lab.js",
  "js/pbq-engine.js",
  "js/question-bank.js"
].forEach(function (file) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
});

assert(questions.length === 1335, "Current Study Bank must remain 1335 questions, found " + questions.length);
assert(questions.every(function (q) {
  return (q.questionType || q.type || "multiple-choice") === "multiple-choice";
}), "public bank must stay single-answer multiple-choice");

assert(context.isMultiSelectQuestion({ type: "multiple-select" }), "multiple-select type detected");
assert(!context.isMultiSelectQuestion({ type: "multiple-choice" }), "multiple-choice is not multiple-select");
assert(context.isQuestionAnswerCorrect({ type: "multiple-select", correctAnswers: [0, 2] }, [2, 0]), "MS exact set is correct regardless of order");
assert(!context.isQuestionAnswerCorrect({ type: "multiple-select", correctAnswers: [0, 2] }, [0]), "MS missing choice is incorrect");
assert(!context.isQuestionAnswerCorrect({ type: "multiple-select", correctAnswers: [0, 2] }, [0, 2, 3]), "MS extra choice is incorrect");
assert(context.isQuestionAnswerCorrect({ type: "multiple-select", correct_answers: [0, 1, 2] }, [2, 1, 0]), "MS snake_case correct_answers");
assert(context.isQuestionAnswerCorrect({ type: "multiple-choice", correctAnswer: 1 }, 1), "single-answer still uses correctAnswer");
assert(!context.isQuestionAnswerCorrect({ type: "multiple-choice", correctAnswer: 1 }, 0), "single-answer miss still fails");
assert(context.toggleSelectedIndex([0, 2], 2).join() === "0", "toggle removes a duplicate-safe selection");
assert(context.toggleSelectedIndex([0], 2).join() === "0,2", "toggle adds a new index");
assert(context.selectCountHint({ type: "multiple-select", correctAnswers: [0, 2] }) === "Select 2 answers", "Select 2 hint");
assert(context.selectCountHint({ type: "multiple-select", correctAnswers: [0, 1, 2] }) === "Select 3 answers", "Select 3 hint");
assert(!context.hasAnswerSelection({ type: "multiple-select", correctAnswers: [0, 2] }, []), "empty MS array is unanswered");
assert(context.hasAnswerSelection({ type: "multiple-choice", correctAnswer: 0 }, 0), "index 0 remains a valid single answer");

context.QuestionBank.setExtra(context.MESSER_PLACEHOLDERS);
const examA = context.QuestionBank.getMesserExam("A");
const examB = context.QuestionBank.getMesserExam("B");
const examC = context.QuestionBank.getMesserExam("C");
const two = examA.filter(function (q) { return q.id === "messer-a-002"; })[0];
const three = examB.filter(function (q) { return q.id === "messer-b-002"; })[0];
assert(two && two.type === "multiple-select" && two.correctAnswers.join() === "0,3", "fake Select TWO imported");
assert(three && three.correctAnswers.join() === "0,1,2", "fake Select THREE normalizes correct_answers");
assert(examA.length >= 2, "Exam A includes MS development item");
assert(examC.filter(function (q) { return q.id === "messer-c-002"; }).length === 1, "Exam C includes multipart ordering");

const orderSpec = {
  kind: "ordering",
  items: [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
    { id: "c", text: "C" },
    { id: "d", text: "D" }
  ],
  correctOrder: ["a", "b", "c", "d"]
};
const orderFull = context.PbqEngine.score(orderSpec, ["a", "b", "c", "d"]);
assert(orderFull.correct && orderFull.earned === 4 && orderFull.possible === 4 && orderFull.percent === 100, "ordering 100% is 4/4");
const orderPart = context.PbqEngine.score(orderSpec, ["a", "b", "d", "c"]);
assert(!orderPart.correct && orderPart.earned === 2 && orderPart.possible === 4 && orderPart.percent === 50, "ordering partial A,B,D,C is 2/4");
const orderNone = context.PbqEngine.score(orderSpec, ["d", "c", "b", "a"]);
assert(!orderNone.correct && orderNone.earned === 0 && orderNone.possible === 4, "ordering all wrong is 0/4");

const multiPart = {
  kind: "multipart",
  parts: [
    { kind: "dropdown", correct: { s: "x" } },
    { kind: "ordering", correctOrder: ["a", "b", "c"] }
  ]
};
const multiScore = context.PbqEngine.score(multiPart, { parts: [{ s: "x" }, ["a", "c", "b"]] });
assert(multiScore.earned === 2 && multiScore.possible === 4 && !multiScore.correct, "multipart keeps ordering partial credit (1+1 of 1+3)");
const multiFull = context.PbqEngine.score(multiPart, { parts: [{ s: "x" }, ["a", "b", "c"]] });
assert(multiFull.correct && multiFull.earned === 4 && multiFull.possible === 4, "multipart full credit still works");

const brokenClassify = context.PbqEngine.validateSpec({
  kind: "classification",
  items: [{ id: "x" }],
  buckets: [{ id: "ok", label: "OK" }],
  correct: { x: "ok" }
});
assert(brokenClassify.length > 0 && brokenClassify.join(" ").indexOf("items[0]") !== -1, "validateSpec flags classification items missing text/label");

(context.PBQ_LAB || []).forEach(function (spec) {
  const issues = context.PbqEngine.validateSpec(spec, spec.id || "lab");
  issues.forEach(function (issue) {
    assert(false, "lab PBQ " + issue);
  });
});
(context.MESSER_PLACEHOLDERS || []).forEach(function (row) {
  if (!row.pbq) {
    return;
  }
  const issues = context.PbqEngine.validateSpec(row.pbq, row.id);
  issues.forEach(function (issue) {
    assert(false, "placeholder PBQ " + issue);
  });
});

const brokenBank = context.QuestionBank.validateMesserBank([{ id: "bad", question: "PLACEHOLDER x", exam: "A" }]);
assert(!brokenBank.ok, "validateMesserBank rejects placeholder/short banks");

const deployedPath = path.join(root, "data", "messer-questions.json");
assert(fs.existsSync(deployedPath), "data/messer-questions.json must exist for GitHub Pages");
const deployedData = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
const deployedRows = deployedData.questions || deployedData || [];
const bankCheck = context.QuestionBank.validateMesserBank(deployedRows);
assert(bankCheck.ok, "deployed Messer bank invalid: " + bankCheck.issues.slice(0, 8).join(" | "));
assert(deployedRows.length === 270, "deployed Messer bank must have 270 records");

const typeCounts = { mc: 0, ms: 0, pbq: 0 };
const deployedPbqs = [];
deployedRows.forEach(function (q) {
  const type = q.questionType || q.type || "multiple-choice";
  if (q.placeholder || /^PLACEHOLDER\b/i.test(String(q.question || ""))) {
    assert(false, (q.id || "row") + " is a placeholder in the deployed bank");
  }
  if (type === "pbq" || q.pbq) {
    typeCounts.pbq += 1;
    deployedPbqs.push(q);
  } else if (type === "multiple-select" || type === "multi-select") {
    typeCounts.ms += 1;
  } else {
    typeCounts.mc += 1;
  }
});
assert(typeCounts.mc === 246, "expected 246 single-answer Messer items, found " + typeCounts.mc);
assert(typeCounts.ms === 9, "expected 9 multiple-select Messer items, found " + typeCounts.ms);
assert(typeCounts.pbq === 15, "expected 15 Messer PBQs, found " + typeCounts.pbq);

["a", "b", "c"].forEach(function (exam) {
  for (let n = 1; n <= 5; n += 1) {
    const id = "messer-" + exam + "-00" + n;
    const row = deployedPbqs.filter(function (q) { return q.id === id; })[0];
    assert(!!row, "missing Messer PBQ " + id);
    if (row && row.pbq) {
      const issues = context.PbqEngine.validateSpec(row.pbq, id);
      issues.forEach(function (issue) {
        assert(false, issue);
      });
      const items = row.pbq.items || row.pbq.left || row.pbq.stems || [];
      items.forEach(function (item, index) {
        const label = item && (item.text || item.label || item.prompt || item.name);
        assert(typeof label === "string" && label.trim() && label !== "undefined", id + " items[" + index + "] missing usable text");
      });
    }
  }
});
const c1 = deployedPbqs.filter(function (q) { return q.id === "messer-c-001"; })[0];
const c1Texts = ((c1 && c1.pbq && c1.pbq.items) || []).map(function (item) {
  return String((item && (item.text || item.label)) || "");
});
[
  "Use a secure terminal to connect to 10.1.10.88",
  "Share the desktop on server 10.1.10.120",
  "Perform a DNS query from 10.1.10.88 to 9.9.9.9",
  "View web pages on 10.1.10.120",
  "Authenticate to an LDAP server at 10.1.10.61",
  "Synchronize the clock on a server at 10.1.10.17"
].forEach(function (label) {
  assert(c1Texts.indexOf(label) !== -1, "messer-c-001 missing traffic-flow label");
});
assert(c1 && c1.pbq && c1.pbq.rulesTable && Array.isArray(c1.pbq.rulesTable.rows) && c1.pbq.rulesTable.rows.length >= 6, "messer-c-001 must include a firewall rules table");

context.QuestionBank.setExtra(context.MESSER_PLACEHOLDERS);

const v2 = JSON.parse(JSON.stringify(migrated));
v2.schemaVersion = 2;
v2.questionStats.q013 = { attempts: 4, correct: 3, confidence: "somewhat" };
v2.sessionHistory = [{ type: "exam30", score: 20, total: 30, percent: 67, questionIds: ["q001"] }];
memory[context.STORAGE_KEY] = JSON.stringify(v2);
const fromV2 = context.getAppState();
assert(fromV2.schemaVersion === 4, "V2 migrates to schema 4");
assert(!fromV2.questionStats.q013, "obsolete V2 question stats removed");
assert(fromV2.sessionHistory.length === 1, "V2 exam history preserved");

const sample = questions[0];
context.resetState();
const state1 = context.recordAnswer(sample.domain, false, sample.id);
assert(state1.totalAnswered === 1 && state1.totalCorrect === 0, "incorrect answer counted");
assert(state1.missedQuestions.indexOf(sample.id) !== -1, "missed question saved");
assert(state1.domainStats[sample.domain].attempted === 1 && state1.domainStats[sample.domain].correct === 0, "domain stats after miss");

const sample2 = questions[1];
const state2 = context.recordAnswer(sample2.domain, true, sample2.id);
assert(state2.totalCorrect === 1, "correct answer counted");
assert(state2.missedQuestions.indexOf(sample.id) !== -1, "miss stays until review");
context.removeMissedQuestion(sample.id);
assert(context.loadState().missedQuestions.indexOf(sample.id) === -1, "review remove works");

context.resetState();
const empty = context.loadState();
assert(empty.totalAnswered === 0 && empty.quizHistory.length === 0, "reset clears progress");

const exported = JSON.parse(context.exportProgressJson());
assert(exported.state && exported.data && exported.app === "SEC+ Study", "export envelope");
assert(exported.schemaVersion === 4, "export schemaVersion 4");
const imported = context.importProgressJson(JSON.stringify(exported));
assert(imported.ok, "import valid backup");
assert(context.importProgressJson("{nope").ok === false, "invalid JSON import rejected");
assert(context.importProgressJson("{\"foo\":1}").ok === false, "non-progress JSON rejected");
assert(context.importProgressJson(JSON.stringify({ app: "Other", schemaVersion: 3, data: { totalAnswered: 1 } })).ok === false, "foreign app rejected");

memory[context.STORAGE_KEY] = "{not-json";
const recovered = context.loadState();
assert(recovered.totalAnswered === 0, "corrupt storage falls back to defaults");

if (failed) {
  console.error(failed + " check(s) failed");
  process.exit(1);
}
console.log("OK", questions.length, "questions,", flashcards.length, "flashcards,", topics.length, "topics,", pbqs.length, "PBQs");
console.log("Difficulty mix", difficultyCount);
if (warnings) {
  console.log(warnings + " warning(s)");
}
