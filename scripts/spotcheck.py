import json, sys
sys.stdout.reconfigure(encoding="utf-8")
paired = json.loads(open("scripts/parsed-question-bank.json", encoding="utf-8").read())["paired"]

def show(pred, limit=2):
    hits = [r for r in paired if pred(r)]
    for r in hits[:limit]:
        print(f"D{r['sourceDomain']} Q{r['sourceIndex']} {r['sourceCorrectLetter']} n={len(r['options'])}")
        print(r["question"][:320].replace("\n", " | "))
        for i, o in enumerate(r["options"]):
            print(f"  {chr(65+i)}: {o[:140].replace(chr(10),' ')}")
        print(r["sourceExplanation"][:200])
        print()

show(lambda r: "shared responsibility cloud" in r["question"].lower())
show(lambda r: "Ramon is building" in r["question"])
show(lambda r: "Geoff is considering" in r["question"])
show(lambda r: "viewarticle.php" in r["question"] or "viewarticle.php" in " ".join(r["options"]))
show(lambda r: r["sourceDomain"]=="2" and r["sourceIndex"]==1)
show(lambda r: r["sourceDomain"]=="2" and r["sourceIndex"]==127)
