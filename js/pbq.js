var Pbq = (function () {
  let current = null;
  let order = [];
  let matches = {};
  let selected = {};
  let scenarioChoice = null;
  let checked = false;

  function start(id) {
    const lab = (typeof PBQ_LAB !== "undefined" ? PBQ_LAB : []).filter(function (p) { return p.id === id; })[0];
    if (lab) {
      current = { id: lab.id, title: lab.title, prompt: lab.prompt || lab.title, explanation: lab.explanation, engine: true, spec: lab, domain: lab.domain || "general" };
      checked = false;
      scenarioChoice = null;
      matches = {};
      selected = {};
      order = [];
      render();
      return;
    }
    current = PBQS.filter(function (p) { return p.id === id; })[0] || null;
    checked = false;
    scenarioChoice = null;
    matches = {};
    selected = {};
    if (current && current.type === "ordering") {
      order = shuffleArray(current.items.map(function (item) { return item.id; }));
    }
    render();
  }

  function itemText(list, id) {
    const found = list.filter(function (item) { return item.id === id; })[0];
    return found ? found.text : id;
  }

  function move(index, dir) {
    const next = index + dir;
    if (next < 0 || next >= order.length) {
      return;
    }
    const tmp = order[index];
    order[index] = order[next];
    order[next] = tmp;
    render();
  }

  function scoreCurrent() {
    if (!current) {
      return { correct: false, earned: 0, possible: 1, percent: 0 };
    }
    if (current.engine && current.spec && typeof PbqEngine !== "undefined") {
      return PbqEngine.score(current.spec, current.saved || {});
    }
    if (current.type === "ordering") {
      const ok = order.join() === current.correctOrder.join();
      return { correct: ok, earned: ok ? 1 : 0, possible: 1, percent: ok ? 100 : 0 };
    }
    if (current.type === "matching" || current.type === "categorization" || current.type === "rules") {
      const keys = Object.keys(current.correct);
      let earned = 0;
      keys.forEach(function (key) {
        if (matches[key] === current.correct[key]) {
          earned += 1;
        }
      });
      return { correct: earned === keys.length, earned: earned, possible: keys.length, percent: percent(earned, keys.length) };
    }
    if (current.type === "multiSelect") {
      const chosen = Object.keys(selected).filter(function (id) { return selected[id]; }).sort();
      const expect = current.correct.slice().sort();
      let earned = 0;
      expect.forEach(function (id) {
        if (chosen.indexOf(id) !== -1) {
          earned += 1;
        }
      });
      const extra = chosen.filter(function (id) { return expect.indexOf(id) === -1; }).length;
      earned = Math.max(0, earned - extra);
      return { correct: chosen.join() === expect.join(), earned: earned, possible: expect.length, percent: percent(earned, expect.length) };
    }
    if (current.type === "scenario" || current.type === "logs") {
      const ok = scenarioChoice === current.correctAnswer;
      return { correct: ok, earned: ok ? 1 : 0, possible: 1, percent: ok ? 100 : 0 };
    }
    return { correct: false, earned: 0, possible: 1, percent: 0 };
  }

  function check() {
    checked = true;
    const result = scoreCurrent();
    updateState(function (state) {
      state.pbqStats.attempted += 1;
      if (result.correct) {
        state.pbqStats.correct += 1;
      }
      state.pbqStats.completed += 1;
      if (!state.pbqStats.byId[current.id]) {
        state.pbqStats.byId[current.id] = { attempted: 0, correct: 0 };
      }
      state.pbqStats.byId[current.id].attempted += 1;
      if (result.correct) {
        state.pbqStats.byId[current.id].correct += 1;
      }
      state.today.pbqCompleted = true;
      maybeUpdateStreak(state);
    });
    recordSession({
      type: "pbq",
      score: result.earned,
      total: result.possible,
      percent: result.percent,
      pbqId: current.id
    });
    if (typeof Plan !== "undefined") {
      Plan.maybeCompleteFromSession("pbq");
    }
    render();
    App.refreshChrome();
  }

  function renderList(root) {
    root.innerHTML =
      "<p class=\"page-kicker\">PBQ-style practice</p>" +
      "<h1 class=\"page-title\">Performance exercises</h1>" +
      "<p class=\"muted\">These are study simulations, not actual CompTIA PBQs. Designed for one-handed mobile use.</p>" +
      "<div class=\"stack\">" +
        PBQS.map(function (p) {
          return "<button class=\"card card-button\" data-pbq=\"open\" data-id=\"" + p.id + "\"><strong>" + escapeHtml(p.title) + "</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">" + escapeHtml(p.type) + " · " + escapeHtml(getDomainShortName(p.domain)) + "</span></button>";
        }).join("") +
        ((typeof PBQ_LAB !== "undefined" && PBQ_LAB.length)
          ? "<h2 class=\"section-title\">Interactive lab (original fakes)</h2>" + PBQ_LAB.map(function (p) {
            return "<button class=\"card card-button\" data-pbq=\"open\" data-id=\"" + p.id + "\"><strong>" + escapeHtml(p.title) + "</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">" + escapeHtml(p.kind) + " · reusable engine</span></button>";
          }).join("")
          : "") +
        "<button class=\"btn btn-secondary\" data-pbq=\"hub\">Back to Practice</button>" +
      "</div>";
  }

  function renderOrdering() {
    return order.map(function (id, i) {
      return "<div class=\"card row-between\"><span>" + (i + 1) + ". " + escapeHtml(itemText(current.items, id)) + "</span>" +
        "<span><button class=\"icon-btn\" data-pbq=\"up\" data-index=\"" + i + "\" aria-label=\"Move up\">↑</button>" +
        "<button class=\"icon-btn\" data-pbq=\"down\" data-index=\"" + i + "\" aria-label=\"Move down\">↓</button></span></div>";
    }).join("");
  }

  function renderMatching(left, right) {
    return left.map(function (item) {
      const opts = "<option value=\"\">Select…</option>" + right.map(function (r) {
        return "<option value=\"" + r.id + "\"" + (matches[item.id] === r.id ? " selected" : "") + ">" + escapeHtml(r.text) + "</option>";
      }).join("");
      return "<label class=\"custom-field\">" + escapeHtml(item.text) + "<select data-pbq=\"match\" data-id=\"" + item.id + "\">" + opts + "</select></label>";
    }).join("");
  }

  function renderMulti() {
    return current.options.map(function (opt) {
      return "<label class=\"check\"><input type=\"checkbox\" data-pbq=\"toggle\" data-id=\"" + opt.id + "\"" + (selected[opt.id] ? " checked" : "") + "> " + escapeHtml(opt.text) + "</label>";
    }).join("");
  }

  function renderScenario() {
    const zones = (current.zones || []).map(function (z) {
      return "<div class=\"pill\" style=\"margin:4px\">" + escapeHtml(z) + "</div>";
    }).join("");
    const opts = current.options.map(function (opt, i) {
      return "<button class=\"option" + (scenarioChoice === i ? " is-selected" : "") + "\" data-pbq=\"scenario\" data-index=\"" + i + "\"><span class=\"letter\">" + (i + 1) + "</span><span>" + escapeHtml(opt) + "</span></button>";
    }).join("");
    return "<div class=\"chip-row\" style=\"margin-bottom:12px\">" + zones + "</div><div class=\"stack\">" + opts + "</div>";
  }

  function renderPlay(root) {
    if (current.engine && current.spec && typeof PbqEngine !== "undefined") {
      const result = checked ? scoreCurrent() : null;
      root.innerHTML =
        "<button class=\"btn btn-ghost\" data-pbq=\"list\" style=\"padding-left:0\">← All PBQs</button>" +
        "<p class=\"page-kicker\">Interactive PBQ</p>" +
        "<h1 class=\"page-title\">" + escapeHtml(current.title) + "</h1>" +
        "<p>" + escapeHtml(current.prompt) + "</p>" +
        "<div id=\"pbq-lab-live\" class=\"stack\"></div>" +
        (result ? "<div class=\"feedback " + (result.correct ? "ok" : "bad") + "\" role=\"status\"><strong>PBQ-style practice score: " + result.percent + "%" + (result.possible > 1 ? " (" + result.earned + "/" + result.possible + ")" : "") + "</strong>" +
          PbqEngine.reviewHtml(current.spec, current.saved) +
          "<p>" + escapeHtml(current.explanation || "") + "</p>" +
          (current.spec.objective ? "<p class=\"muted\">Objective: SY0-701 " + escapeHtml(current.spec.objective) + "</p>" : "") +
          "<p class=\"muted\">Source: " + escapeHtml(current.spec.source || "Original lab") + "</p></div>" : "") +
        "<div class=\"stack\" style=\"margin-top:12px\">" +
          (checked ? "<button class=\"btn btn-primary\" data-pbq=\"list\">Back to list</button>" : "<button class=\"btn btn-primary\" data-pbq=\"check\">Check answers</button>") +
        "</div>";
      const host = document.getElementById("pbq-lab-live");
      if (host) {
        PbqEngine.render(host, current.spec, { review: checked, saved: current.saved });
      }
      return;
    }
    let body = "";
    if (current.type === "ordering") {
      body = renderOrdering();
    } else if (current.type === "matching") {
      body = "<div class=\"stack\">" + renderMatching(current.left, current.right) + "</div>";
    } else if (current.type === "categorization") {
      body = "<div class=\"stack\">" + renderMatching(current.items, current.categories) + "</div>";
    } else if (current.type === "rules") {
      body = "<div class=\"stack\">" + renderMatching(current.rows, current.choices) + "</div>";
    } else if (current.type === "logs") {
      body = "<div class=\"card\" style=\"font-family:var(--mono);font-size:0.82rem;white-space:pre-wrap\">" + escapeHtml((current.logs || []).join("\n")) + "</div>" + renderScenario();
    } else if (current.type === "multiSelect") {
      body = "<div class=\"stack\">" + renderMulti() + "</div>";
    } else {
      body = renderScenario();
    }
    const result = checked ? scoreCurrent() : null;
    root.innerHTML =
      "<button class=\"btn btn-ghost\" data-pbq=\"list\" style=\"padding-left:0\">← All PBQs</button>" +
      "<p class=\"page-kicker\">PBQ-style</p>" +
      "<h1 class=\"page-title\">" + escapeHtml(current.title) + "</h1>" +
      "<p>" + escapeHtml(current.prompt) + "</p>" +
      body +
      (result ? "<div class=\"feedback " + (result.correct ? "ok" : "bad") + "\" role=\"status\"><strong>PBQ-style practice score: " + (result.percent == null ? (result.correct ? "100%" : "0%") : result.percent + "%") + (result.possible > 1 ? " (" + result.earned + "/" + result.possible + ")" : "") + "</strong><p>" + escapeHtml(current.explanation) + "</p></div>" : "") +
      "<div class=\"stack\" style=\"margin-top:12px\">" +
        (checked ? "<button class=\"btn btn-primary\" data-pbq=\"list\">Back to list</button>" : "<button class=\"btn btn-primary\" data-pbq=\"check\">Check answers</button>") +
      "</div>";
  }

  function render() {
    const root = document.getElementById("view-pbq");
    if (!current) {
      renderList(root);
    } else {
      renderPlay(root);
    }
  }

  function onClick(event) {
    const el = event.target.closest("[data-pbq]");
    if (!el) {
      return;
    }
    const action = el.getAttribute("data-pbq");
    if (action === "open") {
      start(el.getAttribute("data-id"));
    } else if (action === "hub") {
      location.hash = "practice";
    } else if (action === "list") {
      current = null;
      render();
    } else if (action === "up") {
      move(Number(el.getAttribute("data-index")), -1);
    } else if (action === "down") {
      move(Number(el.getAttribute("data-index")), 1);
    } else if (action === "toggle") {
      const id = el.getAttribute("data-id");
      selected[id] = !selected[id];
    } else if (action === "scenario") {
      scenarioChoice = Number(el.getAttribute("data-index"));
      render();
    } else if (action === "check") {
      if (current && current.engine && typeof PbqEngine !== "undefined") {
        const host = document.getElementById("pbq-lab-live");
        if (host) {
          current.saved = PbqEngine.getAnswer(host);
        }
      }
      check();
    }
  }

  function onChange(event) {
    const el = event.target.closest("[data-pbq=match]");
    if (!el) {
      return;
    }
    matches[el.getAttribute("data-id")] = el.value;
  }

  function init() {
    const root = document.getElementById("view-pbq");
    root.addEventListener("click", onClick);
    root.addEventListener("change", onChange);
  }

  return { init: init, render: render, start: start };
})();
