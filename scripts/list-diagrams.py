import json, sys
sys.stdout.reconfigure(encoding="utf-8")
paired = json.loads(open("scripts/parsed-question-bank.json", encoding="utf-8").read())["paired"]
for r in paired:
    blob = (r.get("diagram") or "") + " " + r["question"]
    if "Larger View" in blob or "graphic" in blob.lower() or "diagram" in blob.lower() or r.get("diagram"):
        print(f"D{r['sourceDomain']} Q{r['sourceIndex']} issues={r.get('issues')}")
        print(" Q:", r["question"][:180].replace("\n"," "))
        print(" D:", (r.get("diagram") or "")[:200].replace("\n"," "))
        print()
