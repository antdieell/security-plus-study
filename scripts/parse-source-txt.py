"""Parse the Security+ TXT into questions vs answers, by domain. Read-only."""
from __future__ import annotations

import json
import re
from pathlib import Path

SRC = Path(r"C:\Users\fredd\OneDrive\Desktop\security plus questions and answers.txt")
OUT = Path(__file__).resolve().parent / "parsed-question-bank.json"

DOMAIN_Q = [
    ("1", re.compile(r"^Domain\s+1\.0:", re.I)),
    ("2", re.compile(r"^Domain\s+2\.0:", re.I)),
    ("3", re.compile(r"^Domain\s+3\.0:", re.I)),
    ("4", re.compile(r"^Domain\s+4\.0:", re.I)),
    ("5", re.compile(r"^Domain\s+5\.0:", re.I)),
]
DOMAIN_A = [
    ("1", re.compile(r"^Chapter\s+1:", re.I)),
    ("2", re.compile(r"^Chapter\s+2:", re.I)),
    ("3", re.compile(r"^Chapter\s+3:", re.I)),
    ("4", re.compile(r"^Chapter\s+4:", re.I)),
    ("5", re.compile(r"^Chapter\s+5:", re.I)),
]
ANSWER_RE = re.compile(r"^([A-D])\.\s+", re.I)


def normalize(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u2010", "-").replace("\u2011", "-").replace("\u2012", "-")
    text = text.replace("\u2013", "-").replace("\u2014", "-").replace("\u2212", "-")
    text = text.replace("\ufeff", "")
    return text


def explode_larger_view(text: str) -> str:
    """Isolate Larger View, its caption, and the first option onto separate paragraphs."""
    lines = text.split("\n")
    out = []
    i = 0
    while i < len(lines):
        if lines[i].strip().lower() == "larger view":
            out.append("")
            out.append("Larger View")
            out.append("")
            i += 1
            while i < len(lines) and not lines[i].strip():
                i += 1
            if i < len(lines):
                out.append(lines[i].strip())
                out.append("")
                i += 1
            continue
        out.append(lines[i])
        i += 1
    return "\n".join(out)


WRAP_PAIRS = (
    ("io", "t"),
    ("ddo", "s"),
    ("do", "s"),
    ("iaa", "s"),
    ("saa", "s"),
    ("paa", "s"),
    ("ia", "c"),
    ("red", "hat"),
    ("java", "script"),
    ("vo", "ip"),
    ("bit", "locker"),
    ("open", "vas"),
    ("true", "crypt"),
    ("power", "shell"),
)


def _join_wrap(prev: str, nxt: str) -> str | None:
    prev_l = prev.rstrip()
    nxt_l = nxt.lstrip()
    if not prev_l or not nxt_l:
        return None
    # Known acronym wraps: "... Io" + "T devices..."
    last = re.split(r"[^A-Za-z0-9]+", prev_l)[-1]
    m = re.match(r"^([A-Za-z0-9]+)(.*)$", nxt_l)
    if last and m:
        first, rest = m.group(1), m.group(2)
        pair = (last.lower(), first.lower())
        known = {(a, b) for a, b in WRAP_PAIRS}
        if pair in known:
            joiner = "" if first[:1].isupper() or last[-1:].islower() else ""
            # Preserve original casing by concatenation
            return prev_l + first + rest
    # Sentence wrap only when the previous line is clearly unfinished
    incomplete = re.search(
        r"\b(a|an|the|to|for|of|and|or|with|from|into|than|that|this|their|its|as|by|on|in|via|using|including|following|command:|here:|follows:|Io|DDo|Do|Iaa|Saa|Paa|Ia|Red|Java|Vo|Bit|Open)\s*$",
        prev_l,
        re.I,
    )
    if incomplete and nxt_l[:1].islower() and not nxt_l.startswith(("iOS", "iPhone", "iPad", "macOS")):
        return prev_l + " " + nxt_l
    return None


def paragraphs(text: str) -> list[str]:
    text = explode_larger_view(text)
    chunks = re.split(r"\n\s*\n", text.strip())
    raw = []
    for chunk in chunks:
        lines = [ln.strip() for ln in chunk.split("\n") if ln.strip()]
        if not lines:
            continue
        raw.append("\n".join(lines))
    out = []
    for block in raw:
        if out:
            joined = _join_wrap(out[-1], block)
            if joined:
                out[-1] = joined
                continue
        out.append(block)
    return out


def split_by_headers(text: str, headers: list[tuple[str, re.Pattern]]) -> dict[str, str]:
    lines = text.split("\n")
    hits = []
    for i, line in enumerate(lines):
        stripped = line.strip()
        for key, pat in headers:
            if pat.search(stripped):
                hits.append((i, key))
                break
    sections = {}
    for idx, (start, key) in enumerate(hits):
        end = hits[idx + 1][0] if idx + 1 < len(hits) else len(lines)
        body = "\n".join(lines[start + 1 : end])
        sections[key] = body
    return sections


def parse_answers(body: str) -> list[dict]:
    paras = paragraphs(body)
    answers = []
    pending = None
    for para in paras:
        m = ANSWER_RE.match(para)
        if m:
            if pending:
                answers.append(pending)
            pending = {
                "letter": m.group(1).upper(),
                "explanation": ANSWER_RE.sub("", para, count=1).strip(),
            }
        elif pending:
            pending["explanation"] += " " + para
    if pending:
        answers.append(pending)
    return answers


def is_larger_view(block: str) -> bool:
    first = block.split("\n", 1)[0].strip()
    return first.lower() == "larger view" or first.lower().startswith("larger view")


CAPTION_RE = re.compile(
    r"^(Two (diagrams|model)|A (diagram|screenshot|cycle|laptop|window|webserver)|An architectural)",
    re.I,
)
CODE_RE = re.compile(
    r"^(openssl|sudo nmap|chmod |chown |iptables |allow from |deny from )",
    re.I,
)
JAM_RE = re.compile(r"([a-z])([A-Z])")


JAM_SAFE = re.compile(
    r"(BitLocker|OpenVAS|JavaScript|TrueCrypt|LastPass|PowerShell|ActiveDirectory|"
    r"iPhone|iPad|iOS|eCommerce|eDiscovery|macOS|IPsec|WiFi|OAuth|OpenID|"
    r"NetFlow|FileZilla|WinZip|OneDrive|GitHub|LinkedIn|YouTube|"
    r"DoS|DDoS|IaaS|SaaS|PaaS|IoT|IoC|SoC|PoC|MFA|PKI|TLS|VPN|SQL|"
    r"XSS|CSRF|SSRF|SAML|LDAP|RADIUS|TACACS|OCSP|HSM|TPM|EDR|XDR|SIEM|SOAR)",
    re.I,
)


def split_jammed(block: str) -> list[str]:
    """Split 'A resource reuse issueImproper legal hold' into two options."""
    if "\n" in block or "?" in block or len(block) > 90:
        return [block]
    tmp = JAM_SAFE.sub(lambda m: m.group(0).lower(), block)
    m = JAM_RE.search(tmp)
    if not m:
        return [block]
    idx = m.start() + 1
    if idx < 12:
        return [block]
    left, right = block[:idx].strip(), block[idx:].strip()
    left_word = re.split(r"\s+", left)[-1]
    right_word = re.split(r"\s+", right)[0]
    # DoS, IaaS, SaaS, IoT and similar camelCase acronyms
    if len(left_word) <= 4 and len(re.sub(r"[^A-Za-z0-9]", "", right_word)) <= 4:
        return [block]
    if left.count(" ") >= 5:
        return [block]
    if len(left) >= 12 and len(right) >= 8 and " " in left:
        return [left, right]
    return [block]


def is_code_choice(block: str) -> bool:
    return bool(
        re.match(
            r"^(iptables|grep|chmod|chown|openssl|allow from|deny from|access-list)\b",
            block.strip(),
            re.I,
        )
    )


def is_script_or_code(block: str) -> bool:
    t = block.strip()
    if CODE_RE.match(t) or is_code_choice(t):
        return True
    if re.match(r"^\$[A-Za-z_]", t) or "get-service" in t.lower() or "Where-Object" in t:
        return True
    if re.match(r"^interface\s+\w+", t, re.I) or t.startswith("access-list"):
        return True
    return False


def is_continuation(block: str) -> bool:
    if is_larger_view(block):
        return True
    if CAPTION_RE.match(block):
        return True
    if re.match(r"^[-d][rwx-]{9}\b", block.strip()):
        return True
    if re.match(r"^[0-9a-f]{32,}\b", block.strip(), re.I):
        return True
    if is_script_or_code(block):
        return True
    if block.endswith("?"):
        return False
    return False


def is_code_series(blocks: list[str], i: int) -> bool:
    similar = sum(1 for j in range(i, min(i + 4, len(blocks))) if is_code_choice(blocks[j]))
    return similar >= 3


COLON_STEM_RE = re.compile(
    r"^(Organize|Rank|Order|Match|Arrange|Identify|Select|List|Place)\b",
    re.I,
)


def is_stem(block: str) -> bool:
    t = block.rstrip()
    if t.endswith("?"):
        return True
    if t.endswith(":") and COLON_STEM_RE.search(t):
        return True
    return False


def parse_questions(body: str, domain: str) -> tuple[list[dict], list[str]]:
    raw_blocks = [b for b in paragraphs(body) if not is_larger_view(b)]
    blocks = []
    for b in raw_blocks:
        blocks.extend(split_jammed(b))
    flags = []
    questions = []
    i = 0
    n = 0
    pending = []
    while i < len(blocks):
        if not is_stem(blocks[i]):
            pending.append(blocks[i])
            i += 1
            continue
        prefix = pending
        pending = []
        lead = []
        keep_list = False
        for p in prefix:
            artifact = bool(
                re.match(
                    r"^(GET|POST|PUT|HEAD|Source IP|https?://|ALLOW FROM|DENY FROM)\b",
                    p.strip(),
                    re.I,
                )
            )
            lead_in = (
                is_continuation(p)
                or p.rstrip().endswith(":")
                or len(p) > 90
                or re.search(
                    r"\b(wants to|is reviewing|issues the|discovers|configured|following command|as shown|has acquired|components of|requirements in order)\b",
                    p,
                    re.I,
                )
            )
            if lead_in or keep_list or artifact:
                lead.append(p)
                if p.rstrip().endswith(":") or re.search(r"\b(include|are|following|here):\s*$", p, re.I):
                    keep_list = True
            else:
                flags.append(f"D{domain} orphan-block before stem: {p[:80]!r}")
        if lead:
            flags.append(f"D{domain} prefix-merge {len(lead)} block(s): {lead[0][:70]!r} + {blocks[i][:50]!r}")
        stem = " ".join(lead + [blocks[i]]).strip()
        i += 1
        extras = []
        while i < len(blocks) and not is_stem(blocks[i]):
            if is_code_series(blocks, i):
                break
            if not is_continuation(blocks[i]):
                break
            extras.append(blocks[i])
            i += 1
        options = []
        while i < len(blocks) and len(options) < 4:
            if (
                is_continuation(blocks[i])
                and not options
                and not is_code_choice(blocks[i])
                and not is_code_series(blocks, i)
            ):
                extras.append(blocks[i])
                i += 1
                continue
            options.append(blocks[i])
            i += 1
        # Ranking/order items sometimes have a fifth listed choice
        if (
            COLON_STEM_RE.search(stem)
            and i < len(blocks)
            and not is_stem(blocks[i])
            and not is_continuation(blocks[i])
        ):
            options.append(blocks[i])
            i += 1
            flags.append(f"D{domain} Q{n+1}: extra option {options[-1][:60]!r}")
        if len(options) < 4:
            flags.append(f"D{domain} Q{n+1}: only {len(options)} options for {stem[:70]!r}")
            if len(options) < 3:
                pending = options
                continue
        if len(options) > 4:
            flags.append(f"D{domain} Q{n+1}: {len(options)} options for {stem[:70]!r}")
        n += 1
        issues = []
        if len(set(o.lower() for o in options[:4])) < min(4, len(options)):
            issues.append("duplicate-options")
        if len(options) != 4:
            issues.append(f"{len(options)}-options")
        diagram = " ".join(extras) if extras else None
        if diagram:
            issues.append("diagram-or-extra")
        questions.append(
            {
                "sourceIndex": n,
                "sourceDomain": domain,
                "question": stem,
                "options": options,
                "diagram": diagram,
                "issues": issues,
            }
        )
    if pending:
        flags.append(f"D{domain} unused prefix at end: {pending[0][:80]!r}")
    return questions, flags


def looks_like_next_stem(blocks: list[str], i: int) -> bool:
    """Heuristic: a stem is usually longer and often ends with ?"""
    if i >= len(blocks):
        return False
    b = blocks[i]
    return b.endswith("?") and len(b) > 80


def main() -> None:
    raw = normalize(SRC.read_text(encoding="utf-8", errors="replace"))
    chapter_pos = raw.find("Chapter 1: Domain 1.0")
    if chapter_pos < 0:
        raise SystemExit("Could not find answer section start")
    q_text = raw[:chapter_pos]
    a_text = raw[chapter_pos:]

    q_secs = split_by_headers(q_text, DOMAIN_Q)
    a_secs = split_by_headers(a_text, DOMAIN_A)

    report = {"domains": {}, "flags": [], "paired": []}
    all_ok = True
    for d in ("1", "2", "3", "4", "5"):
        qs, flags = parse_questions(q_secs.get(d, ""), d)
        ans = parse_answers(a_secs.get(d, ""))
        report["flags"].extend(flags)
        match = len(qs) == len(ans)
        if not match:
            all_ok = False
        print(f"DOMAIN {d}  questions:{len(qs):4d}  answers:{len(ans):4d}  paired:{'YES' if match else 'NO'}")
        if flags:
            for f in flags:
                print("  FLAG", f)
        if qs:
            last = qs[-1]
            print("  last Q:", last["question"][:90].replace("\n", " "))
            print("  last opts:", " | ".join(o[:40].replace("\n", " ") for o in last["options"]))
            suspects = []
            for q in qs:
                stem_opt = (not q["question"].rstrip().endswith("?")) and len(q["question"]) < 90
                stolen = any(o.rstrip().endswith("?") and len(o) > 70 for o in q["options"])
                if stem_opt or stolen:
                    suspects.append((q["sourceIndex"], q["question"][:70].replace("\n", " "), [o[:40] for o in q["options"] if o.rstrip().endswith("?")]))
            print("  shift-suspects:", len(suspects))
            for s in suspects[:12]:
                print("   ", s[0], s[1], "stolen=", s[2])
        if ans:
            print("  last A:", ans[-1]["letter"] + ".", ans[-1]["explanation"][:90])
        report["domains"][d] = {
            "questions": len(qs),
            "answers": len(ans),
            "paired": match,
            "issues": sum(1 for q in qs if q["issues"]),
            "diagrams": sum(1 for q in qs if q["diagram"]),
        }
        if match:
            for q, a in zip(qs, ans):
                rec = dict(q)
                rec["sourceCorrectLetter"] = a["letter"]
                rec["sourceExplanation"] = a["explanation"]
                rec["pairingValidated"] = False
                report["paired"].append(rec)
        else:
            # still dump for debugging
            report["domains"][d]["sample_q_tails"] = [x["question"][:90] for x in qs[-3:]]
            report["domains"][d]["sample_a_tails"] = [x["explanation"][:90] for x in ans[-3:]]
            report["domains"][d]["sample_q_heads"] = [x["question"][:90] for x in qs[:3]]
            report["domains"][d]["sample_a_heads"] = [x["explanation"][:90] for x in ans[:3]]

    tq = sum(v["questions"] for v in report["domains"].values())
    ta = sum(v["answers"] for v in report["domains"].values())
    print(f"TOTAL     questions:{tq:4d}  answers:{ta:4d}  paired:{'YES' if all_ok and tq == ta else 'NO'}")
    report["totals"] = {"questions": tq, "answers": ta, "paired": len(report["paired"]), "ok": all_ok and tq == ta}
    OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
