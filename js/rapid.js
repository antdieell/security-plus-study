var Rapid = (function () {
  let items = [];
  let index = 0;
  let flipped = false;
  let mode = "rapid";

  function buildRapid() {
    const mix = [];
    takeRandom(ACRONYMS, 5).forEach(function (a) {
      mix.push({ kind: "acronym", front: a.term, back: a.meaning });
    });
    takeRandom(PORTS, 5).forEach(function (p) {
      mix.push({ kind: "port", front: p.protocol, back: p.port + " — " + p.notes });
    });
    takeRandom(FLASHCARDS, 5).forEach(function (c) {
      mix.push({ kind: "card", front: c.term, back: c.definition });
    });
    items = shuffleArray(mix).slice(0, 15);
    index = 0;
    flipped = false;
    mode = "rapid";
  }

  function buildExamDay() {
    const state = getAppState();
    const mix = [];
    Coverage.recurringMisconceptions(state).slice(0, 3).forEach(function (m) {
      mix.push({ kind: "mis", front: m.topic, back: "Review this concept. It has come up as a confident miss." });
    });
    Coverage.weakObjectives(state, 2).slice(0, 3).forEach(function (o) {
      mix.push({ kind: "weak", front: o.id + " " + o.title, back: "Recent " + formatPercent(o.recent || o.accuracy) + ". Do a short drill after this review." });
    });
    takeRandom(PORTS, 4).forEach(function (p) {
      mix.push({ kind: "port", front: p.protocol, back: String(p.port) });
    });
    takeRandom(ACRONYMS, 4).forEach(function (a) {
      mix.push({ kind: "acronym", front: a.term, back: a.meaning });
    });
    items = shuffleArray(mix).slice(0, 16);
    index = 0;
    flipped = false;
    mode = "examday";
  }

  function current() {
    return items[index] || null;
  }

  function render() {
    const root = document.getElementById(mode === "examday" ? "view-examday" : "view-rapid");
    if (!root) {
      return;
    }
    if (!items.length) {
      if (mode === "examday") {
        buildExamDay();
      } else {
        buildRapid();
      }
    }
    const item = current();
    if (!item) {
      root.innerHTML = "<div class=\"card empty\"><strong>Nothing to review.</strong></div>";
      return;
    }
    root.innerHTML =
      "<p class=\"page-kicker\">" + (mode === "examday" ? "Exam-day review — not a full test" : "Rapid review") + "</p>" +
      "<h1 class=\"page-title\">" + (index + 1) + " / " + items.length + "</h1>" +
      "<button class=\"card card-button\" data-rapid=\"flip\" style=\"min-height:160px\"><strong style=\"font-size:1.3rem\">" +
        escapeHtml(flipped ? item.back : item.front) + "</strong><span class=\"muted\" style=\"display:block;margin-top:10px\">Tap to flip</span></button>" +
      "<div class=\"controls-row\" style=\"margin-top:12px\">" +
        "<button class=\"btn btn-secondary\" data-rapid=\"prev\">Previous</button>" +
        "<button class=\"btn btn-primary\" data-rapid=\"next\">" + (index === items.length - 1 ? "Finish" : "Next") + "</button>" +
      "</div>" +
      "<button class=\"btn btn-secondary\" data-rapid=\"hub\" style=\"margin-top:10px\">Practice hub</button>";
  }

  function finish() {
    const wasExamDay = mode === "examday";
    updateState(function (state) {
      state.today.flashcardsReviewed += items.length;
      maybeUpdateStreak(state);
    });
    if (typeof Plan !== "undefined") {
      Plan.maybeCompleteFromSession("rapid");
    }
    items = [];
    if (wasExamDay) {
      const due = getDueReviews(getAppState()).slice(0, 4);
      const extra = Adaptive.pick(8).map(function (q) { return q.id; });
      const ids = unique(due.concat(extra)).slice(0, 8);
      if (App.toast) {
        App.toast("Now 8 high-value questions.");
      }
      Quiz.start({ count: ids.length, questionIds: ids, mode: "examday", reviewSession: false });
      return;
    }
    location.hash = "practice";
    if (App.toast) {
      App.toast("Rapid review complete.");
    }
  }

  function onClick(event) {
    const el = event.target.closest("[data-rapid]");
    if (!el) {
      return;
    }
    const action = el.getAttribute("data-rapid");
    if (action === "flip") {
      flipped = !flipped;
      render();
    } else if (action === "next") {
      if (index >= items.length - 1) {
        finish();
        return;
      }
      index += 1;
      flipped = false;
      render();
    } else if (action === "prev") {
      index = Math.max(0, index - 1);
      flipped = false;
      render();
    } else if (action === "hub") {
      location.hash = "practice";
    }
  }

  function init() {
    ["view-rapid", "view-examday"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("click", onClick);
      }
    });
  }

  return {
    init: init,
    render: function () {
      const hash = (location.hash || "").slice(1);
      mode = hash.indexOf("examday") === 0 ? "examday" : "rapid";
      if (!items.length || (mode === "examday" && items[0] && items[0].kind === "port" && hash.indexOf("examday") === 0)) {
        if (mode === "examday") {
          buildExamDay();
        } else {
          buildRapid();
        }
      }
      render();
    }
  };
})();
