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
