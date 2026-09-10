"""Parse the second-source PDF extract into intermediate JSON. Main section only."""
from __future__ import annotations

import json
import re
from pathlib import Path

SRC = Path(__file__).resolve().parent / "second-source-pdf.txt"
OUT = Path(__file__).resolve().parent / "second-source-import.json"

HEADER_RE = re.compile(r"Security\+ Additional Questions for Cursor\s+\|\s+Page\s+\d+", re.I)
CHAPTER_RE = re.compile(r"^Chapter\s+(\d+)\s*$", re.I)
APPENDIX_RE = re.compile(r"^Appendix\b", re.I)
QSTART_RE = re.compile(r"^(\d+)\.\s+(.*)$")
OPT_RE = re.compile(r"^([A-E])\.\s+(.*)$")
ANSWER_RE = re.compile(r"^Correct answer:\s*([A-E])(?:\s*-\s*(.*))?$", re.I)
MULTI_ANSWER_RE = re.compile(r"^Correct answer:\s*(.+)$", re.I)
SCENARIO_RE = re.compile(r"^Questions\s+(\d+)-(\d+)\s+refer to the following scenario:\s*(.*)$", re.I)


def clean_lines(raw: str) -> list[str]:
    raw = raw.replace("\r\n", "\n")
    raw = raw.replace("\u2018", "'").replace("\u2019", "'")
    raw = raw.replace("\u201c", '"').replace("\u201d", '"')
    raw = raw.replace("\u2013", "-").replace("\u2014", "-")
    lines = []
    for line in raw.split("\n"):
        line = line.strip()
        if not line:
            continue
        if line.startswith("===== PAGE"):
            continue
        if HEADER_RE.search(line):
            continue
        lines.append(line)
    return lines


def parse() -> dict:
    lines = clean_lines(SRC.read_text(encoding="utf-8"))
    questions: list[dict] = []
    appendix_notes: list[str] = []
    chapter = None
    i = 0
    current: dict | None = None
    mode = None  # stem | opt | answer
    current_opt = None
    scenario = None
    scenario_range = None

    def flush() -> None:
        nonlocal current, mode, current_opt
        if not current:
            return
        if current_opt and current.get("_opt_letter"):
            current["options"].append(
                {"letter": current["_opt_letter"], "text": current_opt.strip()}
            )
        current.pop("_opt_letter", None)
        questions.append(current)
        current = None
        mode = None
        current_opt = None

    while i < len(lines):
        line = lines[i]
        if APPENDIX_RE.match(line):
            flush()
            appendix_notes = lines[i:]
            break
        ch = CHAPTER_RE.match(line)
        if ch:
            flush()
            chapter = int(ch.group(1))
            i += 1
            continue
        qs = QSTART_RE.match(line)
        if qs and (current is None or int(qs.group(1)) == (current.get("sourceIndex") or 0) + 1 or int(qs.group(1)) > (current.get("sourceIndex") or 0)):
            flush()
            num = int(qs.group(1))
            rest = qs.group(2).strip()
            scen = SCENARIO_RE.match(rest)
            if scen:
                scenario_range = (int(scen.group(1)), int(scen.group(2)))
                scenario = scen.group(3).strip()
                rest = scenario
            elif scenario_range and scenario_range[0] <= num <= scenario_range[1] and scenario:
                rest = scenario + " " + rest
            elif scenario_range and num > scenario_range[1]:
                scenario = None
                scenario_range = None
            current = {
                "sourceIndex": num,
                "sourceChapter": chapter,
                "question": rest,
                "options": [],
                "correctLetter": None,
                "correctText": None,
                "importValidated": False,
                "issues": [],
            }
            mode = "stem"
            current_opt = None
            i += 1
            continue
        if current is None:
            i += 1
            continue
        opt = OPT_RE.match(line)
        if opt:
            if current_opt and current.get("_opt_letter"):
                current["options"].append(
                    {"letter": current["_opt_letter"], "text": current_opt.strip()}
                )
            current["_opt_letter"] = opt.group(1).upper()
            current_opt = opt.group(2).strip()
            mode = "opt"
            i += 1
            continue
        ans = ANSWER_RE.match(line)
        if ans and ";" not in line:
            if current_opt and current.get("_opt_letter"):
                current["options"].append(
                    {"letter": current["_opt_letter"], "text": current_opt.strip()}
                )
                current_opt = None
                current.pop("_opt_letter", None)
            current["correctLetter"] = ans.group(1).upper()
            current["correctText"] = (ans.group(2) or "").strip()
            mode = "answer"
            i += 1
            continue
        multi = MULTI_ANSWER_RE.match(line)
        if multi and "Correct answer:" in line:
            if current_opt and current.get("_opt_letter"):
                current["options"].append(
                    {"letter": current["_opt_letter"], "text": current_opt.strip()}
                )
                current_opt = None
                current.pop("_opt_letter", None)
            current["correctLetter"] = "MULTI"
            current["correctText"] = multi.group(1).strip()
            current["issues"].append("multi-answer")
            mode = "answer"
            i += 1
            continue
        if mode == "stem":
            current["question"] += " " + line
        elif mode == "opt":
            current_opt = (current_opt or "") + " " + line
        elif mode == "answer":
            if current.get("correctText"):
                current["correctText"] += " " + line
        i += 1
    flush()

    for rec in questions:
        letters = [o["letter"] for o in rec["options"]]
        if rec["correctLetter"] in "ABCDE" and rec["correctLetter"] in letters:
            rec["correctAnswer"] = letters.index(rec["correctLetter"])
            rec["importValidated"] = len(rec["options"]) >= 4 and bool(rec["question"])
        elif rec["correctLetter"] == "MULTI":
            rec["correctAnswer"] = None
            rec["importValidated"] = False
        else:
            rec["issues"].append("unmapped-answer")
            rec["importValidated"] = False
        if "Larger View" in rec["question"]:
            rec["issues"].append("diagram")
        if len(rec["options"]) != 4:
            rec["issues"].append(f"{len(rec['options'])}-options")

    appendix_items = len(re.findall(r"^Source #2 item", "\n".join(appendix_notes), re.M))
    report = {
        "mainCount": len(questions),
        "validated": sum(1 for q in questions if q["importValidated"]),
        "appendixItems": appendix_items,
        "chapters": {},
        "issues": [q for q in questions if q["issues"]],
        "questions": questions,
    }
    for q in questions:
        key = str(q["sourceChapter"])
        report["chapters"][key] = report["chapters"].get(key, 0) + 1
    OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"main={report['mainCount']} validated={report['validated']} appendix={appendix_items}")
    print("chapters", report["chapters"])
    print("issues", len(report["issues"]))
    for q in report["issues"]:
        print(f"  Q{q['sourceIndex']} ch{q['sourceChapter']} {q['issues']} letter={q['correctLetter']} opts={len(q['options'])}")
    return report


if __name__ == "__main__":
    parse()
