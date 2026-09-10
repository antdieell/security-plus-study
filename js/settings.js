var Settings = (function () {
  function render() {
    const root = document.getElementById("view-settings");
    const state = getAppState();
    const goals = [5, 10, 20, 30, 50].map(function (n) {
      return "<button class=\"chip" + (state.prefs.dailyGoal === n ? " is-selected" : "") + "\" data-set=\"goal\" data-n=\"" + n + "\">" + n + "</button>";
    }).join("");
    const minutes = [10, 20, 25, 30, 45, 60].map(function (n) {
      return "<button class=\"chip" + (Number(state.prefs.studyMinutes) === n ? " is-selected" : "") + "\" data-set=\"minutes\" data-n=\"" + n + "\">" + n + " min</button>";
    }).join("");
    root.innerHTML =
      "<p class=\"page-kicker\">Device</p>" +
      "<h1 class=\"page-title\">Settings</h1>" +
      "<div class=\"card stack\">" +
        "<strong>Daily question goal</strong>" +
        "<div class=\"chip-row\">" + goals + "</div>" +
        "<strong>Preferred study time</strong>" +
        "<div class=\"chip-row\">" + minutes + "</div>" +
        "<p class=\"muted\">Used for Today's Study Plan. Times are estimates, not a stopwatch.</p>" +
        "<label class=\"check\"><input type=\"checkbox\" id=\"pref-diff\"" + (state.prefs.showDifficulty ? " checked" : "") + "> Show difficulty labels in quizzes</label>" +
        "<label class=\"check\"><input type=\"checkbox\" id=\"pref-conf\"" + (state.prefs.enableConfidence ? " checked" : "") + "> Ask for confidence after answers</label>" +
        "<label class=\"check\"><input type=\"checkbox\" id=\"pref-obj\"" + (state.prefs.showObjectiveIds !== false ? " checked" : "") + "> Show objective IDs on questions</label>" +
        "<label class=\"check\"><input type=\"checkbox\" id=\"pref-alert\"" + (state.prefs.examAlerts ? " checked" : "") + "> Exam timer reminder at 5 minutes remaining</label>" +
        "<label class=\"check\"><input type=\"checkbox\" id=\"pref-motion\"" + (state.prefs.reducedMotion ? " checked" : "") + "> Reduce animation</label>" +
      "</div>" +
      "<div class=\"stack\" style=\"margin-top:14px\">" +
        "<button class=\"btn btn-secondary\" data-set=\"export\">Export progress (JSON)</button>" +
        "<label class=\"btn btn-secondary\" style=\"cursor:pointer\">Import progress<input id=\"import-file\" type=\"file\" accept=\"application/json\" hidden></label>" +
        "<button class=\"btn btn-danger\" data-set=\"reset\">Reset progress</button>" +
      "</div>" +
      "<p class=\"muted\">Your study progress is stored on this device. No account, no cloud sync, no analytics service. Localhost and the hosted site are different origins — use Export/Import if you want to copy progress between them.</p>" +
      "<p class=\"disclaimer\">SEC+ Study is an independent study tool and is not affiliated with or endorsed by CompTIA. Readiness estimates are not official exam scores.</p>";
  }

  function exportFile() {
    const blob = new Blob([exportProgressJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sec-plus-study-backup-" + todayISODate() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    App.toast("Backup downloaded.");
  }

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = function () {
      const result = importProgressJson(String(reader.result || ""));
      if (!result.ok) {
        App.showModal({ title: "Import failed", body: result.error, confirmLabel: "OK", onConfirm: function () {} });
        return;
      }
      App.toast("Progress restored.");
      App.refreshChrome();
      App.applyMotionPref();
      render();
    };
    reader.readAsText(file);
  }

  function onClick(event) {
    const el = event.target.closest("[data-set]");
    if (!el) {
      return;
    }
    const action = el.getAttribute("data-set");
    if (action === "goal") {
      const n = Number(el.getAttribute("data-n"));
      updateState(function (state) { state.prefs.dailyGoal = n; });
      render();
    } else if (action === "minutes") {
      const n = Number(el.getAttribute("data-n"));
      updateState(function (state) {
        state.prefs.studyMinutes = n;
        state.activePlan = null;
        const today = todayISODate();
        state.dailyPlans = (state.dailyPlans || []).filter(function (p) { return p.date !== today; });
      });
      render();
    } else if (action === "export") {
      exportFile();
    } else if (action === "reset") {
      App.showModal({
        title: "Reset all progress?",
        body: "This clears quizzes, reviews, flashcards, plans, notes, and your streak on this device.",
        confirmLabel: "Reset everything",
        danger: true,
        onConfirm: function () {
          resetAppState();
          App.refreshChrome();
          render();
        }
      });
    }
  }

  function onChange(event) {
    if (event.target.id === "pref-diff") {
      updateState(function (state) { state.prefs.showDifficulty = event.target.checked; });
    } else if (event.target.id === "pref-conf") {
      updateState(function (state) { state.prefs.enableConfidence = event.target.checked; });
    } else if (event.target.id === "pref-obj") {
      updateState(function (state) { state.prefs.showObjectiveIds = event.target.checked; });
    } else if (event.target.id === "pref-alert") {
      updateState(function (state) { state.prefs.examAlerts = event.target.checked; });
    } else if (event.target.id === "pref-motion") {
      updateState(function (state) { state.prefs.reducedMotion = event.target.checked; });
      App.applyMotionPref();
    } else if (event.target.id === "import-file" && event.target.files[0]) {
      const file = event.target.files[0];
      App.showModal({
        title: "Replace progress with this backup?",
        body: "Current data on this device will be overwritten.",
        confirmLabel: "Import",
        onConfirm: function () { importFile(file); }
      });
    }
  }

  function init() {
    const root = document.getElementById("view-settings");
    root.addEventListener("click", onClick);
    root.addEventListener("change", onChange);
  }

  return { init: init, render: render };
})();
