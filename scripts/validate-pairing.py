"""Sanity-check question/answer pairing after parse."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

DATA = Path(__file__).resolve().parent / "parsed-question-bank.json"
data = json.loads(DATA.read_text(encoding="utf-8"))
paired = data["paired"]


def tokens(text: str) -> set[str]:
    words = re.findall(r"[A-Za-z][A-Za-z0-9'+-]{2,}", text.lower())
    stop = {
        "the", "and", "for", "that", "this", "with", "from", "are", "was", "were",
        "have", "has", "not", "but", "they", "their", "them", "his", "her", "she",
        "will", "can", "may", "than", "then", "into", "over", "also", "only",
        "most", "more", "such", "used", "use", "using", "because", "which",
        "what", "when", "while", "about", "after", "before", "other", "option",
        "options", "answer", "correct", "incorrect", "typically", "common",
        "organization", "organizations", "system", "systems", "would", "should",
        "does", "did", "been", "being", "each", "both", "between",
    }
    return {w for w in words if w not in stop and len(w) > 3}


def overlap_score(q: dict) -> float:
    letter = q["sourceCorrectLetter"]
    idx = "ABCD".index(letter) if letter in "ABCD" else -1
    chosen = q["options"][idx] if 0 <= idx < len(q["options"]) else ""
    exp = tokens(q["sourceExplanation"])
    stem = tokens(q["question"] + " " + chosen)
    if not exp or not stem:
        return 0.0
    return len(exp & stem) / max(1, min(len(exp), 25))


def show(rec: dict, tag: str) -> None:
    letter = rec["sourceCorrectLetter"]
    idx = "ABCD".index(letter) if letter in "ABCD" else -1
    print("=" * 72)
    print(f"{tag} D{rec['sourceDomain']} Q{rec['sourceIndex']} letter={letter} "
          f"opts={len(rec['options'])} score={overlap_score(rec):.2f} issues={rec.get('issues')}")
    print("Q:", rec["question"][:240].replace("\n", " "))
    if rec.get("diagram"):
        print("DIAG:", rec["diagram"][:180].replace("\n", " "))
    for i, o in enumerate(rec["options"]):
        mark = " <<<" if i == idx else ""
        print(f"  {chr(65+i)}{mark}: {o[:120].replace(chr(10), ' ')}")
    print("A:", rec["sourceExplanation"][:320].replace("\n", " "))


low = []
for d in "12345":
    recs = [r for r in paired if r["sourceDomain"] == d]
    n = len(recs)
    print(f"\n########## DOMAIN {d} n={n} ##########")
    picks = list(range(1, 6))
    picks += list(range(n // 2 - 2, n // 2 + 3))
    picks += list(range(n - 4, n + 1))
    picks += [max(1, n // 4), (3 * n) // 4]
    for i in sorted(set(picks)):
        rec = recs[i - 1]
        show(rec, "SAMPLE")
        if overlap_score(rec) < 0.08:
            low.append(rec)

print("\n\n##### LOW OVERLAP IN SAMPLE #####")
for rec in low:
    show(rec, "LOW")

print("\n\n##### DOMAIN OVERLAP STATS #####")
for d in "12345":
    recs = [r for r in paired if r["sourceDomain"] == d]
    scores = [overlap_score(r) for r in recs]
    bad = [r for r, s in zip(recs, scores) if s < 0.06]
    print(f"D{d} mean={sum(scores)/len(scores):.2f} min={min(scores):.2f} low<{0.06}={len(bad)}")
    for r in bad[:8]:
        print(f"  Q{r['sourceIndex']} {overlap_score(r):.2f} {r['question'][:90]}")

print("\n##### OPTION COUNT / LETTER ERRORS #####")
for r in paired:
    letter = r["sourceCorrectLetter"]
    if letter not in "ABCD":
        print("bad letter", r["sourceDomain"], r["sourceIndex"], letter)
    if letter in "ABCD" and "ABCD".index(letter) >= len(r["options"]):
        print("letter out of range", r["sourceDomain"], r["sourceIndex"], letter, len(r["options"]))
    if len(r["options"]) != 4:
        print(f"non-4 D{r['sourceDomain']} Q{r['sourceIndex']} n={len(r['options'])} {r['question'][:80]}")
