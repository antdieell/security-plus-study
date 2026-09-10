"""Inspect questions near leftover/orphan parse blocks."""
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")
data = json.loads(open("scripts/parsed-question-bank.json", encoding="utf-8").read())
paired = data["paired"]

needles = [
    ("2", "Kathleen"),
    ("2", "hacktiv"),
    ("2", "Frank"),
    ("2", "Giovanni"),
    ("2", "UPS"),
    ("2", "impossible"),
    ("2", "userID"),
    ("2", "Greg"),
    ("2", "passwd"),
    ("2", "Chris sees"),
    ("2", "Elizabeth"),
    ("2", "Saa"),
    ("2", "path traversal"),
    ("2", "directory"),
    ("3", "Ramon"),
    ("3", "TLS"),
    ("3", "payment form"),
    ("3", "Fred sets"),
    ("3", "Tara"),
    ("3", "Geoff"),
    ("3", "scalability"),
    ("3", "comments"),
    ("5", "RTO"),
    ("5", "guidelines"),
    ("2", "Organize the following"),
    ("2", "Blackmail"),
    ("1", "Damian"),
    ("4", "Rick is reviewing"),
    ("4", "Katie"),
    ("4", "Joe has configured"),
]

for d, needle in needles:
    recs = [r for r in paired if r["sourceDomain"] == d and needle.lower() in (r["question"] + " " + " ".join(r["options"])).lower()]
    print(f"\n#### D{d} contains {needle!r}: {len(recs)}")
    for r in recs[:3]:
        print(f"  Q{r['sourceIndex']} letter={r['sourceCorrectLetter']} nopt={len(r['options'])} issues={r['issues']}")
        print("   Q:", r["question"][:180].replace("\n", " "))
        for i, o in enumerate(r["options"]):
            print(f"    {chr(65+i)}: {o[:100].replace(chr(10),' ')}")
        print("   A:", r["sourceExplanation"][:180].replace("\n", " "))
