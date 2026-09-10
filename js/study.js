var Study = (function () {
  let searchQuery = "";
  let selectedDomainId = null;
  let selectedTopicId = null;
  let weakOnly = false;

  const TOPIC_OBJECTIVES = {
    "cia-triad": "1.2",
    "aaa": "1.2",
    "zero-trust": "1.2",
    "least-privilege": "1.2",
    "defense-in-depth": "1.1",
    "auth-factors": "4.6",
    "encryption-hashing": "1.4",
    "pki-certs": "1.4",
    "tls-vpns": "1.4",
    "access-models": "4.6",
    "firewalls-ids-ips": "3.2",
    "segmentation": "3.2",
    "phishing-family": "2.2",
    "password-attacks": "2.4",
    "network-attacks": "2.4",
    "app-attacks": "2.4",
    "ransomware": "2.4",
    "siem-soar-edr": "4.4",
    "dns-security": "4.1",
    "incident-response": "4.8",
    "backups-rto-rpo": "3.4",
    "risk-management": "5.2",
    "bcp-dr": "3.4",
    "oversight": "5.1"
  };

  function setRoute(domainId, topicId) {
    selectedDomainId = domainId || null;
    selectedTopicId = topicId || null;
    if (!topicId) {
      searchQuery = "";
    }
    render();
  }

  function topicStrength(topic) {
    const weak = Analytics.weakTopics(getAppState(), 3);
    const match = weak.filter(function (row) {
      const title = String(topic.title).toLowerCase();
      const name = String(row.topic).toLowerCase();
      return title.indexOf(name) !== -1 || name.indexOf(title) !== -1 ||
        (topic.searchTerms || []).some(function (term) { return name.indexOf(String(term).toLowerCase()) !== -1; });
    })[0];
    if (!match) {
      return null;
    }
    if (match.accuracy < 70) {
      return { label: "Needs review", kind: "weak", accuracy: match.accuracy };
    }
    if (match.accuracy >= 85) {
      return { label: "Strong", kind: "strong", accuracy: match.accuracy };
    }
    return null;
  }

  function getTopicProgress(domainId) {
    const topics = getTopicsByDomain(domainId);
    const state = getAppState();
    const stats = getDomainStats(state, domainId);
    if (!topics.length) {
      return { label: "No topics yet", pct: 0 };
    }
    if (!stats.attempted) {
      return { label: "Not started", pct: 0 };
    }
    const pct = percent(stats.correct, stats.attempted);
    return { label: formatPercent(pct) + " quiz accuracy", pct: pct || 0 };
  }

  function tagRow(topic) {
    const objective = TOPIC_OBJECTIVES[topic.id];
    const objName = objective ? getObjectiveName(objective) : "";
    const strength = topicStrength(topic);
    return (
      "<span class=\"pill\">" + escapeHtml(getDomainShortName(topic.domain)) + "</span>" +
      (objective ? "<span class=\"pill\">" + escapeHtml(objective) + "</span>" : "") +
      "<span class=\"pill\">" + escapeHtml(topic.title) + "</span>" +
      (strength ? "<span class=\"pill pill-" + strength.kind + "\">" + escapeHtml(strength.label) + "</span>" : "") +
      (objName && objective ? "" : "")
    );
  }

  function renderDomainList(root) {
    const matches = searchQuery ? searchTopics(searchQuery) : STUDY_TOPICS.slice();
    const filtered = weakOnly
      ? matches.filter(function (topic) {
        const s = topicStrength(topic);
        return s && s.kind === "weak";
      })
      : matches;

    root.innerHTML =
      "<p class=\"page-kicker\">Study notes · " + escapeHtml(EXAM_CONFIG.displayName) + "</p>" +
      "<h1 class=\"page-title\">Security+ domains</h1>" +
      "<label class=\"sr-only\" for=\"study-search\">Search study topics</label>" +
      "<input class=\"search\" id=\"study-search\" type=\"search\" placeholder=\"Search topics, like PKI or ransomware\" value=\"" + escapeHtml(searchQuery) + "\">" +
      "<div class=\"chip-row\" style=\"margin:12px 0\">" +
        "<button class=\"chip" + (weakOnly ? " is-selected" : "") + "\" data-action=\"toggle-weak\">Weak topics only</button>" +
      "</div>" +
      "<div id=\"study-results\" class=\"stack\"></div>";

    const results = root.querySelector("#study-results");
    if (searchQuery || weakOnly) {
      if (!filtered.length) {
        results.innerHTML = "<div class=\"card empty\"><strong>No matching topics</strong>Try another keyword, or clear the weak-topics filter.</div>";
      } else {
        results.innerHTML = filtered.map(topicCard).join("");
      }
      return;
    }

    results.innerHTML = DOMAINS.map(function (domain) {
      const count = getTopicsByDomain(domain.id).length;
      const progress = getTopicProgress(domain.id);
      return (
        "<button class=\"card card-button domain-row\" data-action=\"open-domain\" data-id=\"" + domain.id + "\">" +
          "<header><strong>" + escapeHtml(domain.number) + " " + escapeHtml(domain.name) + "</strong><span class=\"pill\">" + count + " topics</span></header>" +
          "<p class=\"muted\" style=\"margin:8px 0 12px\">" + escapeHtml(domain.description) + "</p>" +
          "<div class=\"bar\" aria-hidden=\"true\"><span style=\"width:" + progress.pct + "%\"></span></div>" +
          "<p class=\"muted\" style=\"margin:8px 0 0\">" + escapeHtml(progress.label) + " · " + domain.examWeight + " of exam</p>" +
        "</button>"
      );
    }).join("");
  }

  function topicCard(topic) {
    return (
      "<button class=\"card card-button\" data-action=\"open-topic\" data-id=\"" + topic.id + "\">" +
        "<strong>" + escapeHtml(topic.title) + "</strong>" +
        "<span class=\"chip-row\" style=\"margin-top:8px\">" + tagRow(topic) + "</span>" +
        "<span class=\"muted\" style=\"display:block;margin-top:6px\">" + escapeHtml(topic.summary) + "</span>" +
      "</button>"
    );
  }

  function renderTopicList(root, domainId) {
    const domain = getDomainById(domainId);
    const topics = getTopicsByDomain(domainId);
    if (!domain) {
      setRoute(null, null);
      return;
    }
    const list = weakOnly
      ? topics.filter(function (topic) {
        const s = topicStrength(topic);
        return s && s.kind === "weak";
      })
      : topics;
    root.innerHTML =
      "<button class=\"btn btn-ghost\" data-action=\"study-home\" style=\"padding-left:0\">← All domains</button>" +
      "<p class=\"page-kicker\">" + escapeHtml(domain.number) + " " + escapeHtml(domain.shortName) + "</p>" +
      "<h1 class=\"page-title\">" + escapeHtml(domain.name) + "</h1>" +
      "<p class=\"muted\" style=\"margin-top:-8px\">" + escapeHtml(domain.description) + "</p>" +
      "<div class=\"chip-row\" style=\"margin:0 0 12px\">" +
        "<button class=\"chip" + (weakOnly ? " is-selected" : "") + "\" data-action=\"toggle-weak\">Weak topics only</button>" +
      "</div>" +
      "<div class=\"stack\">" +
        (list.length ? list.map(topicCard).join("") : "<div class=\"card empty\"><strong>No topics in this filter</strong></div>") +
      "</div>";
  }

  function renderTopic(root, topicId) {
    const topic = getTopicById(topicId);
    if (!topic) {
      setRoute(selectedDomainId, null);
      return;
    }
    const concepts = (topic.concepts || []).map(function (item) {
      return "<li style=\"margin:0 0 8px\">" + escapeHtml(item) + "</li>";
    }).join("");
    const objective = TOPIC_OBJECTIVES[topic.id];
    const objName = objective ? getObjectiveName(objective) : "";
    const related = getQuestionsByTopic(topic.title);
    const strength = topicStrength(topic);

    root.innerHTML =
      "<button class=\"btn btn-ghost\" data-action=\"back-domain\" data-id=\"" + topic.domain + "\" style=\"padding-left:0\">← " + escapeHtml(getDomainShortName(topic.domain)) + "</button>" +
      "<p class=\"page-kicker\">" + escapeHtml(getDomainName(topic.domain)) + (objective ? " · " + objective : "") + "</p>" +
      "<h1 class=\"page-title\">" + escapeHtml(topic.title) + "</h1>" +
      "<div class=\"chip-row\" style=\"margin-bottom:12px\">" + tagRow(topic) + "</div>" +
      (objName ? "<p class=\"muted\">" + escapeHtml(objName) + "</p>" : "") +
      (strength ? "<p class=\"muted\">" + escapeHtml(strength.label) + " · " + strength.accuracy + "% on related questions</p>" : "") +
      "<div class=\"stack topic-block\">" +
        "<article class=\"card\"><h3>Overview</h3><p style=\"margin:0\">" + escapeHtml(topic.explanation) + "</p></article>" +
        "<details class=\"card accordion\" open><summary>Important concepts</summary><ul style=\"margin:0;padding-left:18px\">" + concepts + "</ul></details>" +
        "<details class=\"card accordion\" open><summary>Exam tip</summary><p style=\"margin:0\">" + escapeHtml(topic.examTip) + "</p></details>" +
        (topic.example
          ? "<details class=\"card accordion\"><summary>Example</summary><p style=\"margin:0\">" + escapeHtml(topic.example) + "</p></details>"
          : "") +
      "</div>" +
      "<div class=\"stack\" style=\"margin-top:16px\">" +
        "<button class=\"btn btn-primary\" data-action=\"practice-topic\" data-id=\"" + topic.id + "\">Practice this topic</button>" +
        "<p class=\"muted\">" + (related.length ? related.length + " tagged questions" : "If too few questions exist, the quiz uses this domain.") + "</p>" +
      "</div>";
  }

  function render() {
    const root = document.getElementById("view-study");
    if (!root) {
      return;
    }
    if (selectedTopicId) {
      renderTopic(root, selectedTopicId);
    } else if (selectedDomainId) {
      renderTopicList(root, selectedDomainId);
    } else {
      renderDomainList(root);
    }
  }

  function onClick(event) {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) {
      return;
    }
    const action = actionEl.getAttribute("data-action");
    if (action === "open-domain") {
      location.hash = "study/" + actionEl.getAttribute("data-id");
    } else if (action === "open-topic") {
      recordStudyActivity();
      if (typeof App !== "undefined") {
        App.refreshChrome();
      }
      location.hash = "study/topic/" + actionEl.getAttribute("data-id");
    } else if (action === "study-home") {
      location.hash = "study";
    } else if (action === "back-domain") {
      location.hash = "study/" + actionEl.getAttribute("data-id");
    } else if (action === "toggle-weak") {
      weakOnly = !weakOnly;
      render();
    } else if (action === "practice-topic") {
      const topic = getTopicById(actionEl.getAttribute("data-id"));
      if (topic) {
        Quiz.startTopic(topic.title, topic.domain, topic.searchTerms);
      }
    }
  }

  function onInput(event) {
    if (event.target.id !== "study-search") {
      return;
    }
    searchQuery = event.target.value;
    selectedDomainId = null;
    selectedTopicId = null;
    render();
    const input = document.getElementById("study-search");
    if (input) {
      input.focus();
      input.setSelectionRange(searchQuery.length, searchQuery.length);
    }
  }

  function init() {
    const root = document.getElementById("view-study");
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
  }

  return {
    init: init,
    render: render,
    setRoute: setRoute
  };
})();
