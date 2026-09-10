var Drills = (function () {
  let portItem = null;
  let portMode = "protocol";
  let acronymIndex = 0;
  let acronymFlipped = false;

  function nextPort() {
    portItem = takeRandom(PORTS, 1)[0];
  }

  function renderPorts(root) {
    if (!portItem) {
      nextPort();
    }
    const prompt = portMode === "protocol"
      ? "What is the default port for " + portItem.protocol + "?"
      : "Which protocol uses port " + portItem.port + "?";
    const state = getAppState();
    root.innerHTML =
      "<p class=\"page-kicker\">Rapid drill</p>" +
      "<h1 class=\"page-title\">Ports & Protocols</h1>" +
      "<div class=\"chip-row\" style=\"margin-bottom:12px\">" +
        "<button class=\"chip" + (portMode === "protocol" ? " is-selected" : "") + "\" data-drill=\"mode\" data-mode=\"protocol\">Protocol → Port</button>" +
        "<button class=\"chip" + (portMode === "port" ? " is-selected" : "") + "\" data-drill=\"mode\" data-mode=\"port\">Port → Protocol</button>" +
      "</div>" +
      "<div class=\"card\"><p class=\"question-text\">" + escapeHtml(prompt) + "</p>" +
        "<label class=\"custom-field\">Answer<input id=\"port-answer\" autocomplete=\"off\"></label>" +
        "<button class=\"btn btn-primary\" data-drill=\"check-port\" style=\"margin-top:12px\">Check</button>" +
        "<div id=\"port-feedback\"></div></div>" +
      "<p class=\"muted\">Lifetime " + state.portsStats.correct + " / " + state.portsStats.attempted + "</p>" +
      "<button class=\"btn btn-secondary\" data-drill=\"hub\">Practice hub</button>";
  }

  function checkPort() {
    const input = document.getElementById("port-answer");
    const raw = String(input && input.value || "").trim().toLowerCase().replace(/\s/g, "");
    const expected = portMode === "protocol"
      ? String(portItem.port).toLowerCase().replace(/\s/g, "")
      : String(portItem.protocol).toLowerCase().replace(/\s/g, "");
    const aliases = expected.split("/").concat([expected]);
    const ok = aliases.indexOf(raw) !== -1 || (portMode === "protocol" && expected.indexOf(raw) !== -1 && raw.length >= 2);
    updateState(function (state) {
      state.portsStats.attempted += 1;
      if (ok) {
        state.portsStats.correct += 1;
      }
    });
    const box = document.getElementById("port-feedback");
    if (box) {
      box.innerHTML = "<div class=\"feedback " + (ok ? "ok" : "bad") + "\" role=\"status\"><strong>" +
        (ok ? "Correct ✓" : "Incorrect ✕") + "</strong><p>" + escapeHtml(portItem.protocol) + " → " +
        escapeHtml(portItem.port) + ". " + escapeHtml(portItem.notes) + "</p></div>" +
        "<button class=\"btn btn-primary\" data-drill=\"next-port\" style=\"margin-top:10px\">Next</button>";
    }
    const life = document.querySelector("#view-ports > p.muted");
    if (life) {
      const stats = getAppState().portsStats;
      life.textContent = "Lifetime " + stats.correct + " / " + stats.attempted;
    }
  }

  function renderAcronyms(root) {
    const card = ACRONYMS[acronymIndex];
    root.innerHTML =
      "<p class=\"page-kicker\">Rapid drill</p>" +
      "<h1 class=\"page-title\">Acronym drill</h1>" +
      "<p class=\"muted\">" + (acronymIndex + 1) + " / " + ACRONYMS.length + "</p>" +
      "<button class=\"card card-button\" data-drill=\"flip\" style=\"min-height:160px\">" +
        "<strong style=\"font-size:1.6rem\">" + escapeHtml(acronymFlipped ? card.meaning : card.term) + "</strong>" +
        "<span class=\"muted\" style=\"display:block;margin-top:10px\">Tap to " + (acronymFlipped ? "show acronym" : "show meaning") + "</span></button>" +
      "<div class=\"controls-row\" style=\"margin-top:12px\">" +
        "<button class=\"btn btn-secondary\" data-drill=\"prev-ac\">Previous</button>" +
        "<button class=\"btn btn-secondary\" data-drill=\"next-ac\">Next</button>" +
      "</div>" +
      "<div class=\"controls-row\" style=\"margin-top:10px\">" +
        "<button class=\"btn btn-secondary\" data-drill=\"ac-wrong\">Missed</button>" +
        "<button class=\"btn btn-secondary\" data-drill=\"ac-right\">Got it</button>" +
      "</div>" +
      "<button class=\"btn btn-secondary\" data-drill=\"hub\" style=\"margin-top:10px\">Practice hub</button>";
  }

  function markAcronym(correct) {
    updateState(function (state) {
      state.acronymStats.attempted += 1;
      if (correct) {
        state.acronymStats.correct += 1;
      }
    });
    acronymIndex = (acronymIndex + 1) % ACRONYMS.length;
    acronymFlipped = false;
    render();
  }

  function render() {
    const hash = (location.hash || "").slice(1);
    if (hash.indexOf("ports") === 0) {
      renderPorts(document.getElementById("view-ports"));
    } else {
      renderAcronyms(document.getElementById("view-acronyms"));
    }
  }

  function onClick(event) {
    const el = event.target.closest("[data-drill]");
    if (!el) {
      return;
    }
    const action = el.getAttribute("data-drill");
    if (action === "mode") {
      portMode = el.getAttribute("data-mode");
      nextPort();
      render();
    } else if (action === "check-port") {
      checkPort();
    } else if (action === "next-port") {
      nextPort();
      render();
    } else if (action === "flip") {
      acronymFlipped = !acronymFlipped;
      render();
    } else if (action === "next-ac") {
      acronymIndex = (acronymIndex + 1) % ACRONYMS.length;
      acronymFlipped = false;
      render();
    } else if (action === "prev-ac") {
      acronymIndex = (acronymIndex - 1 + ACRONYMS.length) % ACRONYMS.length;
      acronymFlipped = false;
      render();
    } else if (action === "ac-right") {
      markAcronym(true);
    } else if (action === "ac-wrong") {
      markAcronym(false);
    } else if (action === "hub") {
      location.hash = "practice";
    }
  }

  function init() {
    document.getElementById("view-ports").addEventListener("click", onClick);
    document.getElementById("view-acronyms").addEventListener("click", onClick);
  }

  return { init: init, render: render };
})();
