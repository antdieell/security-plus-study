/**
 * Shared helpers used across quiz, flashcards, study, and progress views.
 */

function shuffleArray(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function takeRandom(items, count) {
  const shuffled = shuffleArray(items);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function percent(correct, attempted) {
  if (!attempted) {
    return null;
  }
  return Math.round((correct / attempted) * 100);
}

function formatPercent(value) {
  return value === null || value === undefined ? "—" : value + "%";
}

function pad(number) {
  return String(number).padStart(2, "0");
}

function todayISODate() {
  const now = new Date();
  return now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
}

function parseISODate(value) {
  if (!value || typeof value !== "string") {
    return null;
  }
  const parts = value.split("-");
  if (parts.length !== 3) {
    return null;
  }
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetweenISO(later, earlier) {
  const a = parseISODate(later);
  const b = parseISODate(earlier);
  if (!a || !b) {
    return null;
  }
  const ms = a.setHours(0, 0, 0, 0) - b.setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

function formatDisplayDate(isoOrTimestamp) {
  const date = typeof isoOrTimestamp === "number"
    ? new Date(isoOrTimestamp)
    : parseISODate(isoOrTimestamp) || new Date(isoOrTimestamp);
  if (!date || Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return seconds + "s";
  }
  return minutes + "m " + pad(seconds) + "s";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) {
    el.className = className;
  }
  if (text !== undefined && text !== null) {
    el.textContent = text;
  }
  return el;
}

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

function addDaysISO(iso, days) {
  const date = parseISODate(iso) || new Date();
  date.setDate(date.getDate() + days);
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

function weightedRandom(items, scoreFn) {
  const scored = items.map(function (item) {
    return { item: item, score: Math.max(0.01, scoreFn(item)) };
  });
  const total = scored.reduce(function (acc, row) { return acc + row.score; }, 0);
  let dart = Math.random() * total;
  for (let i = 0; i < scored.length; i += 1) {
    dart -= scored[i].score;
    if (dart <= 0) {
      return scored[i].item;
    }
  }
  return scored[scored.length - 1].item;
}

function unique(list) {
  const seen = {};
  return list.filter(function (item) {
    if (seen[item]) {
      return false;
    }
    seen[item] = true;
    return true;
  });
}

function questionTypeOf(question) {
  return (question && (question.questionType || question.type)) || "multiple-choice";
}

function isPbqQuestion(question) {
  return !!(question && (questionTypeOf(question) === "pbq" || question.pbq));
}

function isMultiSelectQuestion(question) {
  const type = questionTypeOf(question);
  return type === "multiple-select" || type === "multi-select";
}

function uniqueSortedInts(values) {
  const seen = {};
  const out = [];
  (values || []).forEach(function (value) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || seen[n]) {
      return;
    }
    seen[n] = true;
    out.push(n);
  });
  out.sort(function (a, b) { return a - b; });
  return out;
}

function getCorrectAnswerIndexes(question) {
  if (!question) {
    return [];
  }
  if (isMultiSelectQuestion(question)) {
    return uniqueSortedInts(question.correctAnswers || question.correct_answers || []);
  }
  if (question.correctAnswer != null && Number.isInteger(Number(question.correctAnswer))) {
    return [Number(question.correctAnswer)];
  }
  if (question.correct_answer != null && Number.isInteger(Number(question.correct_answer))) {
    return [Number(question.correct_answer)];
  }
  return [];
}

function normalizeSelectedIndexes(selected) {
  if (selected == null) {
    return [];
  }
  if (Array.isArray(selected)) {
    return uniqueSortedInts(selected);
  }
  if (Number.isInteger(selected)) {
    return [selected];
  }
  if (typeof selected === "string" && selected !== "" && Number.isInteger(Number(selected))) {
    return [Number(selected)];
  }
  return [];
}

function isIndexSelected(selected, index) {
  if (Array.isArray(selected)) {
    return selected.indexOf(index) !== -1;
  }
  return selected === index;
}

function hasAnswerSelection(question, selected) {
  if (isPbqQuestion(question)) {
    return selected != null;
  }
  if (isMultiSelectQuestion(question)) {
    return normalizeSelectedIndexes(selected).length > 0;
  }
  return selected !== null && selected !== undefined;
}

function toggleSelectedIndex(selected, index) {
  const list = normalizeSelectedIndexes(selected);
  const pos = list.indexOf(index);
  if (pos === -1) {
    list.push(index);
    list.sort(function (a, b) { return a - b; });
  } else {
    list.splice(pos, 1);
  }
  return list;
}

function arraysEqualSorted(left, right) {
  if (!left || !right || left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      return false;
    }
  }
  return true;
}

function isQuestionAnswerCorrect(question, selected) {
  if (!question) {
    return false;
  }
  if (isPbqQuestion(question) && question.pbq && typeof PbqEngine !== "undefined") {
    return !!PbqEngine.score(question.pbq, selected).correct;
  }
  if (isMultiSelectQuestion(question)) {
    const want = uniqueSortedInts(question.correctAnswers || question.correct_answers || []);
    const got = normalizeSelectedIndexes(selected);
    return want.length > 0 && arraysEqualSorted(want, got);
  }
  return selected === question.correctAnswer;
}

function selectCountHint(question) {
  if (!isMultiSelectQuestion(question)) {
    return "";
  }
  const n = uniqueSortedInts(question.correctAnswers || question.correct_answers || []).length;
  if (!n) {
    return "Select all answers that apply.";
  }
  return "Select " + n + " answer" + (n === 1 ? "" : "s");
}
