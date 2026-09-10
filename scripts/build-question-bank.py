"""Transform validated parsed TXT pairs into the app question schema."""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARSED = ROOT / "scripts" / "parsed-question-bank.json"
OUT_JS = ROOT / "data" / "questions.js"
REPORT = ROOT / "scripts" / "import-report.json"

DOMAIN_MAP = {
    "1": ("general", "1.2"),
    "2": ("threats", "2.4"),
    "3": ("architecture", "3.2"),
    "4": ("operations", "4.1"),
    "5": ("governance", "5.1"),
}

OBJECTIVE_RULES = [
    ("1.1", r"\b(managerial|technical control|operational control|preventive|detective|corrective|compensating control|physical control|directive|deterrent)\b"),
    ("1.2", r"\b(cia triad|confidentiality|integrity|availability|zero trust|least privilege|gap analysis|aaa|authentication|authorization|accounting|non-?repudiation|defense in depth|something you)\b"),
    ("1.3", r"\b(change management|backout|version control|cab|impact analysis|standard operating)\b"),
    ("1.4", r"\b(encrypt|hash|pki|certificate|tls|ssl|symmetric|asymmetric|digital signature|key escrow|bitlocker|openssl|ocsp|crl|wildcard|aes|rsa|key stretching|salting|hsm|tpm|cipher)\b"),
    ("2.1", r"\b(nation-?state|hacktivist|organized crime|shadow it|insider|unskilled|script kiddie|threat actor|motivation|apt)\b"),
    ("2.2", r"\b(phish|smish|vish|pretext|impersonation|watering hole|bec|business email|usb drop|supply chain|threat vector|social engineer)\b"),
    ("2.3", r"\b(zero-?day|misconfigur|memory injection|race condition|toc/tou|resource reuse|legacy|end of life|firmware|vulnerable software|cloud vulnerability)\b"),
    ("2.4", r"\b(malware|ransomware|trojan|worm|rootkit|keylogger|botnet|ddos|dos attack|sql injection|xss|csrf|ssrf|brute.?force|password spray|on-path|man-in-the-middle|replay|session hijack|directory traversal|indicator)\b"),
    ("2.5", r"\b(segment|isolat|patch|harden|allow list|deny list|monitoring|encryption|configuration enforcement|decommission)\b"),
    ("3.1", r"\b(iaas|saas|paas|serverless|container|virtualization|hybrid|on-prem|sdn|iot|ics|scada|microservice|responsibility matrix)\b"),
    ("3.2", r"\b(firewall|waf|ids|ips|nac|vlan|vpn|proxy|load balanc|port|protocol|jump server|jump box|acl|router|switch|ztna|sase)\b"),
    ("3.3", r"\b(data at rest|in transit|in use|classification|tokenization|masking|obfuscat|sovereignty|geographic restriction|dlp|retention)\b"),
    ("3.4", r"\b(high availability|hot site|warm site|cold site|backup|replication|rto|rpo|ups|generator|tabletop|resilien|failover|redundan)\b"),
    ("4.1", r"\b(baseline|harden|wireless|mobile|mdm|application allow|secure configuration|iot device)\b"),
    ("4.2", r"\b(asset management|inventory|acquisition|disposal|sanitiz|wipe|decommission|ownership)\b"),
    ("4.3", r"\b(vulnerability|cve|cvss|scan|remediation|compensating|exemption|false positive)\b"),
    ("4.4", r"\b(siem|snmp|netflow|alert|monitoring|log aggregation|agent)\b"),
    ("4.5", r"\b(firewall rule|ids|ips|waf|edr|xdr|dlp|nac|group policy|allow list)\b"),
    ("4.6", r"\b(iam|sso|federation|saml|oauth|mfa|passwordless|pam|provision|identity proof|rbac|abac|mac |dac )\b"),
    ("4.7", r"\b(automat|orchestrat|soar|script|api |guardrail|playbook)\b"),
    ("4.8", r"\b(incident response|containment|eradication|lessons learned|forensic|threat hunt|root cause|tabletop|ir process)\b"),
    ("4.9", r"\b(packet capture|wireshark|log file|auth\.log|vulnerability scan|dashboard|metadata|grep )\b"),
    ("5.1", r"\b(polic(y|ies)|standard|procedure|guideline|governance|role|responsibility|external consideration)\b"),
    ("5.2", r"\b(risk|sle|ale|aro|ef |exposure factor|qualitative|quantitative|risk register|treat|accept|transfer|avoid|mitigate)\b"),
    ("5.3", r"\b(vendor|third-?party|supply chain|right to audit|sla|nda|bpa|msa|msa\b|questionnaire)\b"),
    ("5.4", r"\b(compliance|privacy|gdpr|pci|hipaa|attestation|acknowledgement|pii|phi)\b"),
    ("5.5", r"\b(audit|assessment|penetration|internal audit|external audit|attestation report|soc 2)\b"),
    ("5.6", r"\b(awareness|phishing campaign|anomalous behavior|reporting|training|user guidance)\b"),
]

TOPIC_RULES = [
    ("CIA Triad", r"\b(confidentiality|integrity|availability|cia)\b"),
    ("AAA", r"\b(aaa|authentication|authorization|accounting)\b"),
    ("Cryptography", r"\b(encrypt|hash|cipher|aes|rsa|tls|pki|certificate)\b"),
    ("PKI and Certificates", r"\b(certificate|pki|ocsp|crl|csr|wildcard)\b"),
    ("Threat Actors", r"\b(nation-?state|hacktivist|organized crime|shadow it|insider|threat actor)\b"),
    ("Social Engineering", r"\b(phish|pretext|vish|smish|impersonat|bec|watering)\b"),
    ("Malware", r"\b(malware|ransomware|trojan|worm|rootkit|botnet)\b"),
    ("Network Attacks", r"\b(ddos|on-path|replay|dns|arp|evil twin)\b"),
    ("Application Attacks", r"\b(sql injection|xss|csrf|ssrf|directory traversal|injection)\b"),
    ("Cloud Architecture", r"\b(iaas|saas|paas|serverless|cloud)\b"),
    ("Network Architecture", r"\b(firewall|vlan|vpn|proxy|sdn|load balanc|acl)\b"),
    ("Data Protection", r"\b(data at rest|tokenization|masking|classification|sovereignty)\b"),
    ("Resilience", r"\b(backup|rto|rpo|hot site|availability|failover)\b"),
    ("Vulnerability Management", r"\b(cve|cvss|vulnerability|scan|patch)\b"),
    ("Monitoring", r"\b(siem|log|netflow|alert|snmp)\b"),
    ("Identity and Access", r"\b(mfa|sso|federation|rbac|iam|pam|identity)\b"),
    ("Incident Response", r"\b(incident|containment|eradication|forensic|lessons learned)\b"),
    ("Risk Management", r"\b(sle|ale|aro|risk register|qualitative|quantitative)\b"),
    ("Governance", r"\b(policy|standard|guideline|procedure|playbook)\b"),
    ("Third-Party Risk", r"\b(vendor|sla|nda|bpa|third-?party)\b"),
    ("Privacy and Compliance", r"\b(gdpr|pci|hipaa|privacy|pii|phi|compliance)\b"),
    ("Physical Security", r"\b(badge|sensor|lock|guard|mantrap|bollard|pressure)\b"),
    ("Change Management", r"\b(change management|backout|version control)\b"),
    ("Hardening", r"\b(harden|baseline|unnecessary service|secure configuration)\b"),
]

NAMES = [
    "Avery", "Blake", "Cameron", "Drew", "Eden", "Finley", "Harper", "Indigo",
    "Jordan", "Kai", "Logan", "Morgan", "Noor", "Oakley", "Parker", "Quinn",
    "Reese", "Sage", "Tatum", "Uma", "Val", "Winter", "Yael", "Zion",
]

SOURCE_NAMES = re.compile(
    r"\b(Felicia|Valerie|Susan|Renee|Christina|Damian|Kent|Isaac|Yasmine|Brent|"
    r"Kathleen|Frank|Annie|Amanda|Jared|Mahmoud|Nick|Michelle|Jake|Jennifer|"
    r"Ramon|Fred|Tara|Geoff|Parvati|Mike|Olivia|Maria|Mark|Charles|Kim|Henry|"
    r"Theo|Gary|Alex|John|Jackson|Cynthia|Jean|Rick|Katie|Joe|Donna|Batu|"
    r"Jill|Pedro|Omar|Jeremy|Neil|Helen|Ben|Frankie|Kelly|Tristan|Megan|"
    r"Naomi|Nathan|Eric|Nelson|Lucca|Charlene|Isabelle|Giovanni|Greg|Chris|"
    r"Dan|Elizabeth|Sam|Ilya|Daryl|Angela|Ryan|Dana|Jack|Erica|Patrick|"
    r"Janice|Selah|Abigail|Tom|Dane|Devin|Kendra|Pedro|Hui|Tim|Ian|Bob|"
    r"Jason|Naomi|Nelson|Lucca|Valerie|Susan|Renee)\b",
    re.I,
)


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def clean(text: str) -> str:
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u00a0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def rewrite_stem(stem: str, index: int) -> str:
    text = clean(stem)
    text = re.sub(r"\bLarger View\b", "", text, flags=re.I)
    text = re.sub(r"\bthe following graphic shows\b", "in this scenario,", text, flags=re.I)
    text = re.sub(r"\bthe following figure shows\b", "consider this design:", text, flags=re.I)
    text = re.sub(r"\bas shown in the following image\b", "", text, flags=re.I)
    text = re.sub(r"\bshown here:\b", "shown in the log excerpt:", text, flags=re.I)

    def swap_name(match: re.Match) -> str:
        return NAMES[index % len(NAMES)]

    text = SOURCE_NAMES.sub(swap_name, text)
    text = text.replace("wants to", "needs to")
    text = text.replace("wants her", "needs her")
    text = text.replace("wants his", "needs his")
    if text.startswith("Which of the following"):
        text = "Which option" + text[len("Which of the following"):]
    text = re.sub(r"\s+", " ", text).strip()
    return text


def rewrite_option(option: str) -> str:
    return clean(option)


def paraphrase_sentence(sentence: str) -> str:
    s = clean(sentence)
    s = s.replace("typically", "usually")
    s = s.replace("organizations", "teams")
    s = s.replace("organization", "team")
    s = s.replace("is the process of", "means")
    s = s.replace("are used to", "help")
    s = s.replace("is used to", "helps")
    s = s.replace("In most production environments", "In live environments")
    s = s.replace("The safest and most secure answer is that", "")
    s = s.replace("best option is to", "strongest option is to")
    if s.startswith("While "):
        s = "Although " + s[6:]
    return s.strip()


CONCEPT_HINTS = [
    (r"\bfile encryption\b", "It can protect individual files both at rest and when they are copied, and it supports per-user access."),
    (r"\bwildcard\b", "One certificate can cover several hostnames under the same parent domain."),
    (r"\bgap analysis\b", "It compares intended control objectives with the controls that actually exist."),
    (r"\bversion control\b", "Repositories track revisions so changes can be compared and rolled back."),
    (r"\bzero trust\b", "Every request is verified instead of trusting a network location."),
    (r"\bleast privilege\b", "Grant only the minimum access needed, for only as long as it is needed."),
    (r"\bhash\b", "A hash supports integrity checking; it is not encryption and does not hide data."),
    (r"\bdigital signature\b", "A private-key signature binds an action to a signer and supports non-repudiation."),
    (r"\bnation-?state\b", "These actors are usually well resourced and often pursue espionage or disruption."),
    (r"\bhacktivist\b", "The usual driver is a political or ideological message, not quiet profit."),
    (r"\bddos\b|\bdenial-of-service\b", "The goal is to exhaust a resource so legitimate users cannot get service."),
    (r"\bsql injection\b", "Untrusted input is interpreted as database commands instead of plain data."),
    (r"\bxss\b|cross-site scripting", "The browser runs attacker-supplied script in another user's session."),
    (r"\biaas\b", "The customer manages the OS and apps; the provider manages the hardware fabric."),
    (r"\bsaas\b", "The provider operates the application; the customer mainly manages users and data."),
    (r"\bpaas\b", "The provider supplies the runtime; the customer deploys application code."),
    (r"\brto\b|recovery time", "RTO is the target time to restore a service after disruption."),
    (r"\brpo\b|recovery point", "RPO is how much data loss, measured in time, the business can accept."),
    (r"\bsle\b|single loss", "SLE equals asset value multiplied by exposure factor."),
    (r"\bale\b|annualized loss", "ALE equals SLE multiplied by the annual rate of occurrence."),
    (r"\bguideline\b", "Guidelines are recommended advice, not mandatory controls."),
    (r"\bpolicy\b", "Policies state high-level rules the organization expects people to follow."),
    (r"\bcontainment\b", "Containment limits spread before eradication and recovery begin."),
    (r"\bsegmentation\b", "Isolating systems limits how far an attacker or fault can travel."),
]


def original_explanation(source: str, correct: str, options: list[str], correct_idx: int) -> str:
    source = clean(source)
    blob = source.lower()
    hint = next((text for pat, text in CONCEPT_HINTS if re.search(pat, blob)), None)
    distractors = [clean(o).rstrip(".") for i, o in enumerate(options) if i != correct_idx]
    lead = f"{clean(correct).rstrip('.')} is the best choice for this scenario."
    if hint:
        mid = hint
    else:
        mid = "It matches the control, process, or outcome the question is actually testing."
    if len(distractors) >= 2:
        tail = f"{distractors[0]} and {distractors[1]} do not meet that requirement as well."
    elif distractors:
        tail = f"{distractors[0]} does not meet that requirement as well."
    else:
        tail = "The remaining options do not meet that requirement as well."
    return f"{lead} {mid} {tail}"


def incorrect_explanations(options: list[str], correct_idx: int, source: str, difficulty: str) -> dict:
    if difficulty == "easy":
        return {}
    out = {}
    source_l = source.lower()
    for i, option in enumerate(options):
        if i == correct_idx:
            continue
        opt = option.rstrip(".")
        mention = option.lower()[:24] in source_l
        if mention:
            out[str(i)] = f"{opt} is a distractor in this item and is not the best match for the required outcome."
        else:
            out[str(i)] = f"{opt} does not best satisfy the requirement described in the scenario."
    return out


def infer_difficulty(question: str, options: list[str]) -> str:
    q = question.lower()
    hard_hits = len(re.findall(r"\b(best|most|first|next|least|not|except|primarily|appropriate)\b", q))
    if hard_hits >= 2 or re.search(r"\b(not|least|except)\b", q):
        return "hard"
    if re.search(r"\b(best|most likely|first|next|most appropriate)\b", q) or len(question) > 220:
        return "hard" if len(question) > 320 else "medium"
    if re.search(r"\bwhat term|what type|which option is|which control\b", q) and len(question) < 140:
        return "easy"
    if max(len(o) for o in options) < 40 and len(question) < 160:
        return "easy"
    return "medium"


def map_objective(domain_num: str, question: str, options: list[str], explanation: str, default: str) -> tuple[str, str]:
    blob = f"{question} {' '.join(options)} {explanation}".lower()
    domain_prefix = domain_num + "."
    scored = []
    for obj_id, pattern in OBJECTIVE_RULES:
        if not obj_id.startswith(domain_prefix):
            continue
        if re.search(pattern, blob, re.I):
            scored.append(obj_id)
    if scored:
        return scored[0], "high" if len(scored) == 1 else "medium"
    # allow cross-domain only if the default is weak and a strong unique hit exists
    cross = []
    for obj_id, pattern in OBJECTIVE_RULES:
        if re.search(pattern, blob, re.I):
            cross.append(obj_id)
    if len(cross) == 1 and cross[0][0] == domain_num:
        return cross[0], "medium"
    return default, "low"


def infer_topic(question: str, options: list[str]) -> str:
    blob = f"{question} {' '.join(options)}".lower()
    for topic, pattern in TOPIC_RULES:
        if re.search(pattern, blob, re.I):
            return topic
    return "Security Concepts"


def infer_tags(topic: str, question: str) -> list[str]:
    tags = [re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-")]
    extras = {
        "encryption": r"\bencrypt",
        "phishing": r"\bphish",
        "cloud": r"\b(iaas|saas|paas|cloud)\b",
        "identity": r"\b(mfa|sso|iam|identity)\b",
        "logging": r"\b(log|siem)\b",
        "risk": r"\b(sle|ale|aro|risk)\b",
    }
    for tag, pat in extras.items():
        if re.search(pat, question, re.I) and tag not in tags:
            tags.append(tag)
    return tags[:5]


def convert_diagram(rec: dict) -> tuple[str | None, str]:
    """Return (converted_stem_or_None_if_exclude, action)."""
    diagram = clean(rec.get("diagram") or "")
    q = rec["question"]
    blob = (diagram + " " + q).lower()
    if "two diagrams" in blob and "attacker-controlled" in blob:
        return (
            "An attacker places a system between a client and a server and forwards traffic so both sides believe they are talking directly. What type of attack is this?",
            "converted",
        )
    if "border firewall" in blob and "core router" in blob:
        return (
            "Internet traffic reaches a border firewall, then a core router, then a datacenter firewall, then a datacenter router. An IPS must stop attack traffic before it hits the datacenter while inspecting as little extra traffic as possible. Where should the IPS be placed?",
            "converted",
        )
    if "model 2" in blob and "not connected" in blob:
        return (
            "One design connects a web server to a private network through a firewall. A second design keeps the web server and the private network fully disconnected. What architecture does the disconnected design represent?",
            "converted",
        )
    if "conceals internal" in blob and "content control" in blob:
        return (
            "Web browsing is sent through a device that hides internal IP addresses, blocks ads, and applies website content controls. What type of network device is this?",
            "converted",
        )
    if "php" in blob and "cgi" in blob and "vulnerability" in blob:
        return (
            "A vulnerability scan reports a PHP-CGI issue when parsing query-string parameters and lists CVE identifiers. What should an administrator do FIRST to choose the best fix?",
            "converted",
        )
    if "point x" in blob and "eradication" in blob:
        return (
            "An incident-response cycle lists preparation, detection, analysis, an unknown step, eradication, recovery, and lessons learned. Which step is missing?",
            "converted",
        )
    if "preparation, detection, analysis, containment, and eradication" in blob and "point a" in blob:
        return (
            "A circular incident-response diagram labels preparation, detection, analysis, containment, and eradication, and leaves the first node unmarked. Which phase belongs at the start of that cycle?",
            "converted",
        )
    if "audit account logon" in blob and "failure is selected" in blob:
        return (
            "A Windows audit policy for account logon events has only the Failure checkbox enabled. What concern should an administrator raise?",
            "converted",
        )
    if rec.get("diagram") and ("screenshot of a window listing" in blob or "architectural diagram includes" in blob and "point a" in blob):
        return None, "excluded"
    return q, "none"


def apply_quality_fixes(rec: dict) -> tuple[dict, list[str]]:
    notes = []
    rec = dict(rec)
    rec["options"] = [clean(o) for o in rec["options"]]
    rec["question"] = clean(rec["question"])
    letter = rec["sourceCorrectLetter"]

    if rec["sourceDomain"] == "2" and rec["sourceIndex"] == 1:
        if rec["options"][1].lower() == rec["options"][3].lower():
            rec["options"][3] = "Personal curiosity"
            notes.append("D2 Q1 duplicate Blackmail replaced with Personal curiosity")

    if rec["sourceDomain"] == "2" and rec["sourceIndex"] == 127:
        # Source letter B contradicts the explanation, which describes option C.
        rec["options"] = rec["options"][:4]
        rec["sourceCorrectLetter"] = "C"
        notes.append("D2 Q127 dropped fifth option; corrected letter B->C from explanation content")
        letter = "C"

    if letter not in "ABCD" or "ABCD".index(letter) >= len(rec["options"]):
        rec["_exclude"] = "invalid-letter"
    if len(rec["options"]) != 4:
        rec["_exclude"] = rec.get("_exclude") or "option-count"
    if len(set(o.lower() for o in rec["options"])) < 4:
        rec["_exclude"] = rec.get("_exclude") or "duplicate-options"
    return rec, notes


def build() -> None:
    data = json.loads(PARSED.read_text(encoding="utf-8"))
    paired = data["paired"]
    report = {
        "corrections": [],
        "excluded": [],
        "diagramConverted": 0,
        "diagramExcluded": 0,
        "lowConfidence": [],
        "domains": Counter(),
        "difficulty": Counter(),
        "objectives": Counter(),
    }
    questions = []
    seen_norm = set()

    for rec in paired:
        rec, notes = apply_quality_fixes(rec)
        report["corrections"].extend(notes)
        if rec.get("_exclude"):
            report["excluded"].append(
                {
                    "domain": rec["sourceDomain"],
                    "index": rec["sourceIndex"],
                    "reason": rec["_exclude"],
                    "question": rec["question"][:120],
                }
            )
            continue

        stem, diagram_action = convert_diagram(rec)
        if diagram_action == "converted":
            report["diagramConverted"] += 1
        if diagram_action == "excluded" or stem is None:
            report["diagramExcluded"] += 1
            report["excluded"].append(
                {
                    "domain": rec["sourceDomain"],
                    "index": rec["sourceIndex"],
                    "reason": "unreliable-diagram",
                    "question": rec["question"][:120],
                }
            )
            continue

        letter = rec["sourceCorrectLetter"]
        correct_idx = "ABCD".index(letter)
        options = [rewrite_option(o) for o in rec["options"]]
        question = rewrite_stem(stem, rec["sourceIndex"] + int(rec["sourceDomain"]) * 20)
        domain_id, default_obj = DOMAIN_MAP[rec["sourceDomain"]]
        objective, confidence = map_objective(
            rec["sourceDomain"], question, options, rec["sourceExplanation"], default_obj
        )
        # keep official domain of the chosen objective if it still matches the source domain
        if not objective.startswith(rec["sourceDomain"] + "."):
            objective, confidence = default_obj, "low"
        difficulty = infer_difficulty(question, options)
        topic = infer_topic(question, options)
        explanation = original_explanation(rec["sourceExplanation"], options[correct_idx], options, correct_idx)
        if confidence == "low":
            report["lowConfidence"].append(
                {"domain": rec["sourceDomain"], "index": rec["sourceIndex"], "objective": objective, "topic": topic}
            )

        norm = re.sub(r"[^a-z0-9]+", " ", question.lower())
        norm = re.sub(r"\b(" + "|".join(n.lower() for n in NAMES) + r")\b", "name", norm)
        if norm in seen_norm:
            report["excluded"].append(
                {
                    "domain": rec["sourceDomain"],
                    "index": rec["sourceIndex"],
                    "reason": "near-duplicate",
                    "question": question[:120],
                }
            )
            continue
        seen_norm.add(norm)

        questions.append(
            {
                "id": "",  # assigned after exclusions
                "domain": domain_id,
                "objective": objective,
                "topic": topic,
                "questionType": "multiple-choice",
                "difficulty": difficulty,
                "tags": infer_tags(topic, question),
                "question": question,
                "options": options,
                "correctAnswer": correct_idx,
                "explanation": explanation,
                "incorrectExplanations": incorrect_explanations(
                    options, correct_idx, rec["sourceExplanation"], difficulty
                ),
                "_src": {"d": rec["sourceDomain"], "i": rec["sourceIndex"], "letter": letter, "conf": confidence},
            }
        )
        report["domains"][domain_id] += 1
        report["difficulty"][difficulty] += 1
        report["objectives"][objective] += 1

    width = 4 if len(questions) >= 1000 else 3
    for i, q in enumerate(questions, start=1):
        q["id"] = f"sq{i:0{width}d}"

    REPORT.write_text(json.dumps(report, indent=2, default=int), encoding="utf-8")
    write_js(questions)
    print(f"Wrote {len(questions)} questions to {OUT_JS}")
    print("Excluded", len(report["excluded"]))
    print("Corrections", report["corrections"])
    print("Diagrams converted", report["diagramConverted"], "excluded", report["diagramExcluded"])
    print("Difficulty", dict(report["difficulty"]))
    print("Domains", dict(report["domains"]))


def write_js(questions: list[dict]) -> None:
    lines = [
        "/**",
        " * SY0-701 original study bank generated from a domain-organized source file.",
        " * IDs use the sq namespace. This replaces the previous q001–q280 bank.",
        " */",
        'var QUESTION_BANK_VERSION = "source-bank-v1";',
        "",
        "var QUESTIONS = [",
    ]
    for q in questions:
        ie = q["incorrectExplanations"]
        ie_js = "{}"
        if ie:
            parts = [f"{k}: {js_string(v)}" for k, v in ie.items()]
            ie_js = "{ " + ", ".join(parts) + " }"
        lines.append("  {")
        lines.append(f"    id: {js_string(q['id'])},")
        lines.append(f"    domain: {js_string(q['domain'])},")
        lines.append(f"    objective: {js_string(q['objective'])},")
        lines.append(f"    topic: {js_string(q['topic'])},")
        lines.append(f"    questionType: {js_string(q['questionType'])},")
        lines.append(f"    difficulty: {js_string(q['difficulty'])},")
        lines.append(f"    tags: {json.dumps(q['tags'])},")
        lines.append(f"    question: {js_string(q['question'])},")
        lines.append("    options: [")
        for opt in q["options"]:
            lines.append(f"      {js_string(opt)},")
        lines.append("    ],")
        lines.append(f"    correctAnswer: {q['correctAnswer']},")
        lines.append(f"    explanation: {js_string(q['explanation'])},")
        lines.append(f"    incorrectExplanations: {ie_js}")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    lines.append(
        """
function enrichQuestion(question) {
  if (!question.questionType) {
    question.questionType = "multiple-choice";
  }
  if (!question.tags) {
    question.tags = question.topic ? [String(question.topic).toLowerCase()] : [];
  }
  if (!question.incorrectExplanations) {
    question.incorrectExplanations = {};
  }
  const numericId = parseInt(String(question.id || "").replace(/^q/i, ""), 10);
  if (String(question.id || "").charAt(0) === "q" && numericId >= 1 && numericId <= 150 && question.objective && typeof remapLegacyObjective === "function") {
    question.objective = remapLegacyObjective(question.objective);
  }
  return question;
}

QUESTIONS.forEach(enrichQuestion);

function getQuestionById(questionId) {
  return QUESTIONS.find(function (question) {
    return question.id === questionId;
  }) || null;
}

function getQuestionsByDomain(domainId) {
  return QUESTIONS.filter(function (question) {
    return question.domain === domainId;
  });
}

function getQuestionsByIds(ids) {
  return ids.map(getQuestionById).filter(Boolean);
}

function getQuestionsByTopic(topic) {
  const needle = String(topic || "").toLowerCase();
  return QUESTIONS.filter(function (question) {
    return String(question.topic || "").toLowerCase() === needle ||
      (question.tags || []).indexOf(needle) !== -1;
  });
}

function getQuestionsByObjective(objectiveId) {
  return QUESTIONS.filter(function (question) {
    return question.objective === objectiveId;
  });
}

function getAllTopics() {
  const map = {};
  QUESTIONS.forEach(function (question) {
    if (question.topic) {
      map[question.topic] = true;
    }
  });
  return Object.keys(map).sort();
}

function getAllObjectives() {
  const map = {};
  QUESTIONS.forEach(function (question) {
    if (question.objective) {
      map[question.objective] = true;
    }
  });
  return Object.keys(map).sort();
}
""".strip()
    )
    lines.append("")
    OUT_JS.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    build()
