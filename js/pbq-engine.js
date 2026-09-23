/**
 * Reusable interactive PBQ renderer.
 * Supports matching, tap-to-match, dropdown, classification, ordering,
 * firewall/ACL slots, simple diagrams, and multi-part items.
 * Touch-first: tap-to-match is the default pairing method; HTML5 drag is optional.
 */
var PbqEngine = (function () {
  function displayText(value) {
    if (value == null) {
      return "";
    }
    if (typeof value === "object") {
      return "";
    }
    return String(value);
  }

  function itemLabel(item) {
    if (!item || typeof item !== "object") {
      return "";
    }
    return displayText(item.text || item.label || item.prompt || item.name);
  }

  function optionLabel(opt) {
    if (typeof opt === "string" || typeof opt === "number") {
      return String(opt);
    }
    return itemLabel(opt);
  }

  function optionId(opt) {
    if (typeof opt === "string" || typeof opt === "number") {
      return String(opt);
    }
    return opt && opt.id != null ? String(opt.id) : "";
  }

  function el(html) {
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    return wrap.firstElementChild;
  }

  function shuffle(list) {
    return typeof shuffleArray === "function" ? shuffleArray(list.slice()) : list.slice();
  }

  function scoreMap(correct, given) {
    const keys = Object.keys(correct || {});
    let earned = 0;
    keys.forEach(function (key) {
      if (String(given[key] || "") === String(correct[key])) {
        earned += 1;
      }
    });
    return { earned: earned, possible: keys.length || 1, correct: earned === keys.length && keys.length > 0 };
  }

  function renderMatching(root, spec, state) {
    const right = spec.right || spec.choices || [];
    const left = spec.left || spec.items || [];
    state.selectedLeft = state.selectedLeft || null;
    const pairs = state.answer || {};
    root.appendChild(el("<p class=\"muted\">Tap a term, then tap its match. Works on phones without dragging.</p>"));
    const grid = el("<div class=\"pbq-match-grid\"></div>");
    const leftCol = el("<div class=\"stack\"></div>");
    const rightCol = el("<div class=\"stack\"></div>");
    left.forEach(function (item) {
      const btn = el("<button type=\"button\" class=\"option\" data-pbq-left=\"" + escapeHtml(item.id) + "\"><span>" + escapeHtml(itemLabel(item)) + "</span><span class=\"muted\">" + escapeHtml(pairs[item.id] ? " → matched" : "") + "</span></button>");
      if (state.selectedLeft === item.id) {
        btn.classList.add("is-selected");
      }
      leftCol.appendChild(btn);
    });
    right.forEach(function (item) {
      const used = Object.keys(pairs).some(function (k) { return pairs[k] === item.id; });
      const btn = el("<button type=\"button\" class=\"option\" data-pbq-right=\"" + escapeHtml(item.id) + "\">" + escapeHtml(itemLabel(item)) + (used ? " ✓" : "") + "</button>");
      rightCol.appendChild(btn);
    });
    grid.appendChild(leftCol);
    grid.appendChild(rightCol);
    root.appendChild(grid);
    root.onclick = function (event) {
      if (state.disabled) {
        return;
      }
      const leftBtn = event.target.closest("[data-pbq-left]");
      const rightBtn = event.target.closest("[data-pbq-right]");
      if (leftBtn) {
        state.selectedLeft = leftBtn.getAttribute("data-pbq-left");
        render(root, spec, state);
      } else if (rightBtn && state.selectedLeft) {
        state.answer = state.answer || {};
        state.answer[state.selectedLeft] = rightBtn.getAttribute("data-pbq-right");
        state.selectedLeft = null;
        render(root, spec, state);
      }
    };
  }

  function renderDropdown(root, spec, state) {
    state.answer = state.answer || {};
    (spec.stems || []).forEach(function (stem) {
      const row = el("<label class=\"custom-field\">" + escapeHtml(itemLabel(stem)) + "<select data-pbq-stem=\"" + escapeHtml(stem.id) + "\"></select></label>");
      const select = row.querySelector("select");
      select.disabled = !!state.disabled;
      select.appendChild(el("<option value=\"\">Choose…</option>"));
      (stem.options || spec.options || []).forEach(function (opt) {
        const id = optionId(opt);
        const text = optionLabel(opt);
        const option = el("<option value=\"" + escapeHtml(id) + "\">" + escapeHtml(text) + "</option>");
        if (state.answer[stem.id] === id) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      select.addEventListener("change", function () {
        state.answer[stem.id] = select.value;
      });
      root.appendChild(row);
    });
  }

  function renderClassify(root, spec, state) {
    state.answer = state.answer || {};
    const buckets = spec.buckets || [];
    (spec.items || []).forEach(function (item) {
      const row = el("<label class=\"custom-field\">" + escapeHtml(itemLabel(item)) + "<select data-pbq-item=\"" + escapeHtml(item.id) + "\"></select></label>");
      const select = row.querySelector("select");
      select.disabled = !!state.disabled;
      select.appendChild(el("<option value=\"\">Classify…</option>"));
      buckets.forEach(function (bucket) {
        const option = el("<option value=\"" + escapeHtml(bucket.id) + "\">" + escapeHtml(itemLabel(bucket)) + "</option>");
        if (state.answer[item.id] === bucket.id) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      select.addEventListener("change", function () {
        state.answer[item.id] = select.value;
      });
      root.appendChild(row);
    });
  }

  function renderOrder(root, spec, state) {
    if (!state.answer || !state.answer.length) {
      state.answer = shuffle((spec.items || []).map(function (item) { return item.id; }));
    }
    const list = el("<div class=\"stack pbq-order\"></div>");
    state.answer.forEach(function (id, index) {
      const item = (spec.items || []).filter(function (row) { return row.id === id; })[0];
      const row = el("<div class=\"option\" style=\"align-items:center\"><span>" + (index + 1) + ". " + escapeHtml(item ? itemLabel(item) : id) + "</span></div>");
      if (!state.disabled) {
        const up = el("<button type=\"button\" class=\"chip\" data-pbq-move=\"-1\" data-index=\"" + index + "\">Up</button>");
        const down = el("<button type=\"button\" class=\"chip\" data-pbq-move=\"1\" data-index=\"" + index + "\">Down</button>");
        row.appendChild(up);
        row.appendChild(down);
      }
      list.appendChild(row);
    });
    list.onclick = function (event) {
      const btn = event.target.closest("[data-pbq-move]");
      if (!btn || state.disabled) {
        return;
      }
      const index = Number(btn.getAttribute("data-index"));
      const next = index + Number(btn.getAttribute("data-pbq-move"));
      if (next < 0 || next >= state.answer.length) {
        return;
      }
      const tmp = state.answer[index];
      state.answer[index] = state.answer[next];
      state.answer[next] = tmp;
      render(root, spec, state);
    };
    root.appendChild(list);
  }

  function renderFirewall(root, spec, state) {
    state.answer = state.answer || {};
    (spec.slots || []).forEach(function (slot) {
      const box = el("<div class=\"card stack\"><strong>" + escapeHtml(slot.label || slot.id) + "</strong></div>");
      (slot.fields || ["action", "protocol", "source", "destination", "port"]).forEach(function (field) {
        const choices = (spec.fieldOptions && spec.fieldOptions[field]) || [];
        const row = el("<label class=\"custom-field\">" + escapeHtml(field) + "<select data-pbq-fw=\"" + escapeHtml(slot.id) + "\" data-field=\"" + escapeHtml(field) + "\"></select></label>");
        const select = row.querySelector("select");
        select.disabled = !!state.disabled;
        select.appendChild(el("<option value=\"\">Select…</option>"));
        choices.forEach(function (choice) {
          const option = el("<option value=\"" + escapeHtml(choice) + "\">" + escapeHtml(choice) + "</option>");
          if (state.answer[slot.id] && state.answer[slot.id][field] === choice) {
            option.selected = true;
          }
          select.appendChild(option);
        });
        select.addEventListener("change", function () {
          state.answer[slot.id] = state.answer[slot.id] || {};
          state.answer[slot.id][field] = select.value;
        });
        box.appendChild(row);
      });
      root.appendChild(box);
    });
  }

  function renderDiagram(root, spec, state) {
    state.answer = state.answer || {};
    const board = el("<div class=\"pbq-diagram card\"></div>");
    (spec.nodes || []).forEach(function (node) {
      const btn = el("<button type=\"button\" class=\"chip\" data-pbq-node=\"" + escapeHtml(node.id) + "\">" + escapeHtml(itemLabel(node) || displayText(node.label)) + "</button>");
      if (state.selectedNode === node.id) {
        btn.classList.add("is-selected");
      }
      board.appendChild(btn);
    });
    root.appendChild(board);
    (spec.prompts || []).forEach(function (prompt) {
      const row = el("<label class=\"custom-field\">" + escapeHtml(itemLabel(prompt)) + "<select data-pbq-prompt=\"" + escapeHtml(prompt.id) + "\"></select></label>");
      const select = row.querySelector("select");
      select.disabled = !!state.disabled;
      select.appendChild(el("<option value=\"\">Choose…</option>"));
      (prompt.options || []).forEach(function (opt) {
        const option = el("<option value=\"" + escapeHtml(optionId(opt)) + "\">" + escapeHtml(optionLabel(opt)) + "</option>");
        if (state.answer[prompt.id] === opt.id) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      select.addEventListener("change", function () {
        state.answer[prompt.id] = select.value;
      });
      root.appendChild(row);
    });
  }

  function renderMultipart(root, spec, state) {
    state.parts = state.parts || [];
    (spec.parts || []).forEach(function (part, index) {
      const box = el("<section class=\"card stack\"><h3 style=\"margin:0\">Part " + (index + 1) + "</h3><div class=\"pbq-part\"></div></section>");
      const inner = box.querySelector(".pbq-part");
      state.parts[index] = state.parts[index] || { answer: part.kind === "ordering" ? null : {} };
      render(inner, part, state.parts[index]);
      root.appendChild(box);
    });
  }

  function render(host, spec, state) {
    state = state || {};
    if (state.saved && !state.answer) {
      state.answer = state.saved;
    }
    if (state.review) {
      state.disabled = true;
    }
    state.host = host;
    host.innerHTML = "";
    host.className = (host.className || "").replace(/\s*pbq-engine\s*/g, " ").trim() + " pbq-engine";
    const kind = spec.kind || spec.type;
    if (kind === "matching" || kind === "tap-match") {
      renderMatching(host, spec, state);
    } else if (kind === "dropdown" || kind === "select") {
      renderDropdown(host, spec, state);
    } else if (kind === "classification" || kind === "categorization") {
      renderClassify(host, spec, state);
    } else if (kind === "ordering") {
      renderOrder(host, spec, state);
    } else if (kind === "firewall" || kind === "acl") {
      renderFirewall(host, spec, state);
    } else if (kind === "diagram") {
      renderDiagram(host, spec, state);
    } else if (kind === "multipart") {
      renderMultipart(host, spec, state);
    } else {
      host.appendChild(el("<p class=\"muted\">Unsupported PBQ kind.</p>"));
    }
    host._pbqState = state;
    host._pbqSpec = spec;
    return state;
  }

  function getAnswer(host) {
    if (!host || !host._pbqState) {
      return null;
    }
    const spec = host._pbqSpec || {};
    if ((spec.kind || spec.type) === "multipart") {
      return {
        parts: (host._pbqState.parts || []).map(function (part) { return part.answer; })
      };
    }
    return host._pbqState.answer;
  }

  function score(spec, answer) {
    const kind = spec.kind || spec.type;
    if (kind === "ordering") {
      const expected = spec.correctOrder || [];
      const got = Array.isArray(answer) ? answer : [];
      let earned = 0;
      expected.forEach(function (id, index) {
        if (got[index] === id) {
          earned += 1;
        }
      });
      const possible = expected.length || 1;
      return {
        earned: earned,
        possible: possible,
        percent: percent(earned, possible),
        correct: earned === possible && expected.length > 0
      };
    }
    if (kind === "firewall" || kind === "acl") {
      const slots = spec.slots || [];
      let earned = 0;
      let possible = 0;
      slots.forEach(function (slot) {
        const expect = (spec.correct && spec.correct[slot.id]) || {};
        Object.keys(expect).forEach(function (field) {
          possible += 1;
          if (answer && answer[slot.id] && answer[slot.id][field] === expect[field]) {
            earned += 1;
          }
        });
      });
      return { earned: earned, possible: possible || 1, percent: percent(earned, possible || 1), correct: earned === possible && possible > 0 };
    }
    if (kind === "multipart") {
      let earned = 0;
      let possible = 0;
      (spec.parts || []).forEach(function (part, index) {
        const partAnswer = answer && answer.parts ? answer.parts[index] : (answer && answer[index]);
        const inner = score(part, partAnswer && partAnswer.answer ? partAnswer.answer : partAnswer);
        earned += inner.earned;
        possible += inner.possible;
      });
      return { earned: earned, possible: possible || 1, percent: percent(earned, possible || 1), correct: earned === possible && possible > 0 };
    }
    const mapped = scoreMap(spec.correct || {}, answer || {});
    mapped.percent = percent(mapped.earned, mapped.possible);
    return mapped;
  }

  function reviewHtml(spec, answer) {
    const result = score(spec, answer);
    const kind = spec.kind || spec.type;
    let config = "";
    if (kind === "ordering") {
      const labels = {};
      (spec.items || []).forEach(function (item) { labels[item.id] = itemLabel(item); });
      const expected = spec.correctOrder || [];
      const got = Array.isArray(answer) ? answer : [];
      config = "<p>Correct order: " + expected.map(function (id, i) {
        return (i + 1) + ". " + escapeHtml(labels[id] || id);
      }).join(" · ") + "</p>" +
        "<p>Your order: " + (got.length ? got.map(function (id, i) {
          return (i + 1) + ". " + escapeHtml(labels[id] || id);
        }).join(" · ") : "—") + "</p><ul>" +
        expected.map(function (id, i) {
          const ok = got[i] === id;
          return "<li>Position " + (i + 1) + ": " + (ok ? "correct" : "incorrect") +
            " (expected " + escapeHtml(labels[id] || id) + ")</li>";
        }).join("") + "</ul>";
    } else if (kind === "firewall" || kind === "acl") {
      config = "<p>Correct configuration:</p><ul>" + (spec.slots || []).map(function (slot) {
        const expect = (spec.correct && spec.correct[slot.id]) || {};
        return "<li>" + escapeHtml(slot.label || slot.id) + ": " + escapeHtml(JSON.stringify(expect)) + "</li>";
      }).join("") + "</ul>";
    } else if (spec.correct && typeof spec.correct === "object") {
      config = "<p>Correct matches:</p><ul>" + Object.keys(spec.correct).map(function (key) {
        return "<li>" + escapeHtml(key) + " → " + escapeHtml(String(spec.correct[key])) + "</li>";
      }).join("") + "</ul>";
    }
    return "<p><strong>PBQ-style practice score: " + result.percent + "%</strong> (" + result.earned + "/" + result.possible + ")</p>" + config;
  }

  function validateSpec(spec, path) {
    const issues = [];
    function fail(where, message) {
      issues.push((path || "pbq") + (where ? " " + where : "") + ": " + message);
    }
    function hasId(obj) {
      return !!(obj && obj.id != null && String(obj.id).trim() !== "");
    }
    function hasVisible(obj) {
      return !!(obj && itemLabel(obj).trim());
    }
    if (!spec || typeof spec !== "object") {
      fail("", "missing spec");
      return issues;
    }
    const kind = spec.kind || spec.type;
    if (!kind) {
      fail("", "missing kind");
      return issues;
    }
    if (kind === "matching" || kind === "tap-match") {
      const left = spec.left || spec.items || [];
      const right = spec.right || spec.choices || [];
      if (!left.length) {
        fail("", "needs left or items");
      }
      if (!right.length) {
        fail("", "needs right or choices");
      }
      left.forEach(function (item, i) {
        if (!hasId(item) || !hasVisible(item)) {
          fail("left[" + i + "]", "needs id and text/label");
        }
      });
      right.forEach(function (item, i) {
        if (!hasId(item) || !hasVisible(item)) {
          fail("right[" + i + "]", "needs id and text/label");
        }
      });
      const correct = spec.correct || {};
      if (!Object.keys(correct).length) {
        fail("", "needs correct map");
      }
      Object.keys(correct).forEach(function (key) {
        if (!left.some(function (item) { return item && item.id === key; })) {
          fail("correct." + key, "left id not found");
        }
        if (!right.some(function (item) { return item && item.id === correct[key]; })) {
          fail("correct." + key, "right id not found");
        }
      });
    } else if (kind === "dropdown" || kind === "select") {
      if (!(spec.stems || []).length) {
        fail("", "needs stems");
      }
      (spec.stems || []).forEach(function (stem, i) {
        if (!hasId(stem) || !hasVisible(stem)) {
          fail("stems[" + i + "]", "needs id and text/label");
        }
        const opts = stem.options || spec.options || [];
        if (!opts.length) {
          fail("stems[" + i + "]", "needs options");
        }
        opts.forEach(function (opt, j) {
          if (!optionId(opt) || !String(optionLabel(opt)).trim()) {
            fail("stems[" + i + "].options[" + j + "]", "needs id and text");
          }
        });
      });
      if (!spec.correct || !Object.keys(spec.correct).length) {
        fail("", "needs correct map");
      }
    } else if (kind === "classification" || kind === "categorization") {
      if (!(spec.items || []).length) {
        fail("", "needs items");
      }
      if (!(spec.buckets || []).length) {
        fail("", "needs buckets");
      }
      (spec.items || []).forEach(function (item, i) {
        if (!hasId(item) || !hasVisible(item)) {
          fail("items[" + i + "]", "needs id and text/label");
        }
      });
      (spec.buckets || []).forEach(function (bucket, i) {
        if (!hasId(bucket) || !hasVisible(bucket)) {
          fail("buckets[" + i + "]", "needs id and label/text");
        }
      });
      if (!spec.correct || !Object.keys(spec.correct).length) {
        fail("", "needs correct map");
      }
      Object.keys(spec.correct || {}).forEach(function (key) {
        if (!(spec.items || []).some(function (item) { return item && item.id === key; })) {
          fail("correct." + key, "item id not found");
        }
        if (!(spec.buckets || []).some(function (bucket) { return bucket && bucket.id === spec.correct[key]; })) {
          fail("correct." + key, "bucket id not found");
        }
      });
    } else if (kind === "ordering") {
      if (!(spec.items || []).length) {
        fail("", "needs items");
      }
      (spec.items || []).forEach(function (item, i) {
        if (!hasId(item) || !hasVisible(item)) {
          fail("items[" + i + "]", "needs id and text/label");
        }
      });
      if (!Array.isArray(spec.correctOrder) || !spec.correctOrder.length) {
        fail("", "needs correctOrder");
      } else {
        spec.correctOrder.forEach(function (id, i) {
          if (!(spec.items || []).some(function (item) { return item && item.id === id; })) {
            fail("correctOrder[" + i + "]", "item id not found");
          }
        });
      }
    } else if (kind === "firewall" || kind === "acl") {
      if (!(spec.slots || []).length) {
        fail("", "needs slots");
      }
      (spec.slots || []).forEach(function (slot, i) {
        if (!hasId(slot)) {
          fail("slots[" + i + "]", "needs id");
        }
      });
      if (!spec.fieldOptions || !Object.keys(spec.fieldOptions).length) {
        fail("", "needs fieldOptions");
      }
      Object.keys(spec.fieldOptions || {}).forEach(function (field) {
        (spec.fieldOptions[field] || []).forEach(function (choice, j) {
          if (!displayText(choice).trim() || typeof choice === "object") {
            fail("fieldOptions." + field + "[" + j + "]", "needs a string choice");
          }
        });
      });
      if (!spec.correct || !Object.keys(spec.correct).length) {
        fail("", "needs correct");
      }
    } else if (kind === "diagram") {
      (spec.nodes || []).forEach(function (node, i) {
        if (!hasId(node) || !hasVisible(node)) {
          fail("nodes[" + i + "]", "needs id and label/text");
        }
      });
      if (!(spec.prompts || []).length) {
        fail("", "needs prompts");
      }
      (spec.prompts || []).forEach(function (prompt, i) {
        if (!hasId(prompt) || !hasVisible(prompt)) {
          fail("prompts[" + i + "]", "needs id and text/label");
        }
        if (!(prompt.options || []).length) {
          fail("prompts[" + i + "]", "needs options");
        }
        (prompt.options || []).forEach(function (opt, j) {
          if (!optionId(opt) || !String(optionLabel(opt)).trim()) {
            fail("prompts[" + i + "].options[" + j + "]", "needs id and text");
          }
        });
      });
      if (!spec.correct || !Object.keys(spec.correct).length) {
        fail("", "needs correct map");
      }
    } else if (kind === "multipart") {
      if (!(spec.parts || []).length) {
        fail("", "needs parts");
      }
      (spec.parts || []).forEach(function (part, i) {
        validateSpec(part, (path || "pbq") + ".parts[" + i + "]").forEach(function (issue) {
          issues.push(issue);
        });
      });
    } else {
      fail("", "unsupported kind " + kind);
    }
    return issues;
  }

  return {
    render: render,
    getAnswer: getAnswer,
    score: score,
    reviewHtml: reviewHtml,
    validateSpec: validateSpec
  };
})();
