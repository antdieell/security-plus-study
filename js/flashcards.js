var Cards = (function () {
  let deck = [];
  let index = 0;
  let flipped = false;
  let filter = "all";

  function progressOf(cardId) {
    const state = getAppState();
    return (state.flashcardProgress && state.flashcardProgress[cardId]) || null;
  }

  function statusLabel(cardId) {
    const progress = progressOf(cardId);
    if (!progress) {
      const legacy = getAppState().flashcardStatus[cardId];
      if (legacy === "known") {
        return "Mastered";
      }
      if (legacy === "review") {
        return "Review";
      }
      return "New";
    }
    if (progress.status === "mastered") {
      return "Mastered";
    }
    if (progress.status === "review") {
      return "Review";
    }
    if (progress.status === "learning") {
      return "Learning";
    }
    return "New";
  }

  function buildDeck(selectedFilter) {
    filter = selectedFilter || "all";
    let cards;
    if (filter === "review" || filter === "due") {
      const ids = getReviewFlashcardIds(getAppState());
      cards = ids.map(getFlashcardById).filter(Boolean);
    } else if (filter === "all") {
      cards = FLASHCARDS.slice();
    } else {
      cards = getFlashcardsByDomain(filter);
    }
    deck = shuffleArray(cards);
    index = 0;
    flipped = false;
  }

  function current() {
    return deck[index] || null;
  }

  function deckStats() {
    const state = getAppState();
    const all = getFlashcardsByDomain("all");
    let due = 0;
    let learning = 0;
    let mastered = 0;
    all.forEach(function (card) {
      const label = statusLabel(card.id);
      if (label === "Mastered") {
        mastered += 1;
      } else if (label === "Learning" || label === "Review") {
        learning += 1;
      }
    });
    due = getReviewFlashcardIds(state).length;
    return { due: due, learning: learning, mastered: mastered, total: all.length };
  }

  function renderSelect(root) {
    const stats = deckStats();
    const dueCount = stats.due;
    root.innerHTML =
      "<p class=\"page-kicker\">Spaced cards</p>" +
      "<h1 class=\"page-title\">Flashcards</h1>" +
      "<div class=\"card\" style=\"margin-bottom:12px\"><strong>" + stats.due + " due · " + stats.learning + " learning · " + stats.mastered + " mastered</strong><p class=\"muted\" style=\"margin:6px 0 0\">Again / Hard / Good / Easy schedules the next review. Ratings are optional — you can still flip and browse.</p></div>" +
      "<div class=\"stack\">" +
        "<button class=\"card card-button\" data-action=\"start\" data-filter=\"due\"><strong>Due cards</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">" + (dueCount ? dueCount + " waiting" : "You're caught up.") + "</span></button>" +
        "<button class=\"card card-button\" data-action=\"start\" data-filter=\"all\"><strong>All domains</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">" + FLASHCARDS.length + " cards</span></button>" +
        DOMAINS.map(function (domain) {
          const count = getFlashcardsByDomain(domain.id).length;
          return "<button class=\"card card-button\" data-action=\"start\" data-filter=\"" + domain.id + "\"><strong>" + escapeHtml(domain.shortName) + "</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">" + count + " cards</span></button>";
        }).join("") +
        "<button class=\"card card-button\" data-action=\"start\" data-filter=\"review\"><strong>Needs review</strong><span class=\"muted\" style=\"display:block;margin-top:6px\">" + (dueCount ? dueCount + " marked or due" : "You're caught up.") + "</span></button>" +
      "</div>";
  }

  function renderPlay(root) {
    const card = current();
    if (!card) {
      root.innerHTML =
        "<button class=\"btn btn-ghost\" data-action=\"back\" style=\"padding-left:0\">← Decks</button>" +
        "<div class=\"card empty\"><strong>You're caught up.</strong>No flashcards in this deck yet.</div>";
      return;
    }
    root.innerHTML =
      "<div class=\"row-between\">" +
        "<button class=\"btn btn-ghost\" data-action=\"back\" style=\"padding-left:0\">← Decks</button>" +
        "<span class=\"muted\">" + (index + 1) + " / " + deck.length + " · " + escapeHtml(statusLabel(card.id)) + "</span>" +
      "</div>" +
      "<button class=\"flip-scene\" data-action=\"flip\" aria-label=\"Flip flashcard\" style=\"width:100%;margin:12px 0;padding:0\">" +
        "<div class=\"flip-card" + (flipped ? " is-flipped" : "") + "\" id=\"active-card\">" +
          "<div class=\"flip-card-inner\">" +
            "<div class=\"face face-front\"" + (flipped ? " aria-hidden=\"true\"" : "") + "><p class=\"muted\" style=\"margin:0 0 12px\">" + escapeHtml(getDomainShortName(card.domain)) + "</p><h2 style=\"margin:0;font-size:1.45rem\">" + escapeHtml(card.term) + "</h2><p class=\"muted\" style=\"margin-top:18px\">Tap card to show answer</p></div>" +
            "<div class=\"face face-back\"" + (flipped ? "" : " aria-hidden=\"true\"") + ">" +
              "<p class=\"muted\" style=\"margin:0 0 8px\">" + escapeHtml(card.term) + "</p>" +
              "<p><strong>Definition.</strong> " + escapeHtml(card.definition) + "</p>" +
              "<p><strong>Why it matters.</strong> " + escapeHtml(card.whyItMatters) + "</p>" +
              "<p><strong>Exam tip.</strong> " + escapeHtml(card.examTip) + "</p>" +
            "</div>" +
          "</div>" +
        "</div>" +
      "</button>" +
      "<div class=\"stack\">" +
        "<button class=\"btn btn-secondary\" data-action=\"flip\">" + (flipped ? "Show term" : "Show answer") + "</button>" +
        "<div class=\"controls-row\">" +
          "<button class=\"btn btn-secondary\" data-action=\"prev\">Previous</button>" +
          "<button class=\"btn btn-secondary\" data-action=\"next\">Next</button>" +
        "</div>" +
        "<button class=\"btn btn-secondary\" data-action=\"shuffle\">Shuffle</button>" +
        "<p class=\"muted\" style=\"margin:0\">Rate after you see the answer</p>" +
        "<div class=\"controls-row wrap-4\">" +
          "<button class=\"btn btn-secondary\" data-action=\"rate\" data-rating=\"again\">Again</button>" +
          "<button class=\"btn btn-secondary\" data-action=\"rate\" data-rating=\"hard\">Hard</button>" +
          "<button class=\"btn btn-secondary\" data-action=\"rate\" data-rating=\"good\">Good</button>" +
          "<button class=\"btn btn-secondary\" data-action=\"rate\" data-rating=\"easy\">Easy</button>" +
        "</div>" +
      "</div>";
  }

  function render() {
    const root = document.getElementById("view-flashcards");
    const hash = (location.hash || "#flashcards").slice(1);
    if (hash.indexOf("flashcards/play") === 0) {
      if (!deck.length) {
        buildDeck(filter === "all" ? "due" : filter);
      }
      renderPlay(root);
    } else {
      renderSelect(root);
    }
  }

  function goPlay(selectedFilter) {
    buildDeck(selectedFilter);
    recordStudyActivity();
    location.hash = "flashcards/play";
    render();
    if (typeof App !== "undefined") {
      App.refreshChrome();
    }
  }

  function advance() {
    if (!deck.length) {
      return;
    }
    index = (index + 1) % deck.length;
    flipped = false;
    render();
  }

  function onClick(event) {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) {
      return;
    }
    const action = actionEl.getAttribute("data-action");
    if (action === "start") {
      goPlay(actionEl.getAttribute("data-filter"));
    } else if (action === "back") {
      if (typeof Plan !== "undefined") {
        Plan.maybeCompleteFromSession("flashcards");
      }
      location.hash = "flashcards";
    } else if (action === "flip") {
      flipped = !flipped;
      render();
    } else if (action === "next") {
      advance();
    } else if (action === "prev") {
      index = (index - 1 + deck.length) % deck.length;
      flipped = false;
      render();
    } else if (action === "shuffle") {
      const currentId = current() && current().id;
      deck = shuffleArray(deck);
      index = Math.max(0, deck.findIndex(function (card) { return card.id === currentId; }));
      flipped = false;
      render();
    } else if (action === "rate") {
      const card = current();
      if (card) {
        rateFlashcard(card.id, actionEl.getAttribute("data-rating"));
        if (typeof App !== "undefined" && App.toast) {
          App.toast("Scheduled.");
        }
        if (typeof App !== "undefined") {
          App.refreshChrome();
        }
        advance();
      }
    }
  }

  function init() {
    document.getElementById("view-flashcards").addEventListener("click", onClick);
  }

  return {
    init: init,
    render: render
  };
})();
