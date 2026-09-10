"""Convert validated second-source PDF records into an additive question file."""
from __future__ import annotations

import json
import re
import subprocess
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARSED = ROOT / "scripts" / "second-source-import.json"
OUT_JS = ROOT / "data" / "questions-source-v2.js"
REPORT = ROOT / "scripts" / "second-source-build-report.json"

CHAPTER_DEFAULT = {
    1: "1.1",
    2: "2.1",
    3: "2.4",
    4: "2.2",
    5: "5.5",
    6: "4.1",
    7: "1.4",
    8: "4.6",
    9: "3.4",
    10: "3.1",
    11: "4.2",
    12: "4.4",
    13: "4.1",
    14: "4.8",
    15: "4.8",
    16: "5.1",
    17: "5.2",
}

OBJ_DOMAIN = {
    "1": "general",
    "2": "threats",
    "3": "architecture",
    "4": "operations",
    "5": "governance",
}

OBJECTIVE_RULES = [
    ("1.1", r"\b(managerial|technical control|operational control|preventive|detective|corrective|compensating|directive|deterrent|control categor|control type|beware of dogs)\b"),
    ("1.2", r"\b(cia triad|confidentiality|integrity|availability|zero trust|least privilege|gap analysis|aaa|authentication|authorization|accounting|non-?repudiation|defense in depth|access control vestibule|mantrap|faraday|bollard|air gap)\b"),
    ("1.3", r"\b(change management|backout|version control|cab |impact analysis|standard operating)\b"),
    ("1.4", r"\b(encrypt|hash|pki|certificate|tls|ssl|symmetric|asymmetric|digital signature|key escrow|ocsp|crl|wildcard|aes|rsa|salting|hsm|tpm|cipher|shared secret|downgrade|collision|public key|private key)\b"),
    ("2.1", r"\b(nation-?state|hacktivist|organized crime|shadow it|insider|unskilled|script kiddie|threat actor|apt|threat intelligence|timeliness|osint)\b"),
    ("2.2", r"\b(phish|smish|vish|pretext|impersonation|watering hole|bec|typosquat|usb drop|supply chain|threat vector|social engineer|osint source|port scan)\b"),
    ("2.3", r"\b(zero-?day|misconfigur|memory injection|race condition|toc/tou|resource reuse|legacy|end-of-life|end of life|firmware|vulnerable software)\b"),
    ("2.4", r"\b(malware|ransomware|trojan|worm|rootkit|keylogger|botnet|ddos|sql injection|xss|csrf|ssrf|brute.?force|password spray|on-path|replay|logic bomb|virus|spyware|indicator)\b"),
    ("2.5", r"\b(segment|isolat|patch management|harden|allow list|deny list|configuration enforcement|decommission)\b"),
    ("3.1", r"\b(iaas|saas|paas|serverless|container|virtualization|hybrid|sdn|iot|ics|scada|microservice|vertical scaling|horizontal scaling|elasticity)\b"),
    ("3.2", r"\b(firewall|waf|ids|ips|nac|vlan|vpn|proxy|load balanc|jump server|acl|router|switch|ztna|sase|port security)\b"),
    ("3.3", r"\b(data at rest|in transit|in use|classification|tokenization|masking|obfuscat|sovereignty|dlp|retention|data minimization)\b"),
    ("3.4", r"\b(high availability|hot site|warm site|cold site|backup|replication|rto|rpo|ups|generator|failover|redundan|offsite|nearline|clustering|geographic dispersion)\b"),
    ("4.1", r"\b(baseline|harden|wireless|mobile|mdm|ios|android|cis benchmark|secure configuration|static code|dynamic code|mutation testing|code review|application security)\b"),
    ("4.2", r"\b(asset management|inventory|acquisition|disposal|sanitiz|wipe|end-of-sales|end-of-life|hardware life cycle|ownership)\b"),
    ("4.3", r"\b(vulnerability|cve|cvss|scan|remediation|false positive|nessus|web application vulnerability)\b"),
    ("4.4", r"\b(siem|snmp|netflow|alert|monitoring|log aggregation|snmp trap)\b"),
    ("4.5", r"\b(firewall rule|ids|ips|waf|edr|xdr|data loss prevention|\bdlp\b|nac|group policy|allow list)\b"),
    ("4.6", r"\b(iam|sso|federation|saml|oauth|mfa|passwordless|pam|provision|identity provider|rbac|abac|relying party|service provider)\b"),
    ("4.7", r"\b(automat|orchestrat|soar|script|guardrail|playbook)\b"),
    ("4.8", r"\b(incident response|containment|eradication|lessons learned|forensic|threat hunt|root cause|preparation|dd command|incident-response)\b"),
    ("4.9", r"\b(packet capture|wireshark|log file|metadata|grep |dashboard|data source)\b"),
    ("5.1", r"\b(polic(y|ies)|standard|procedure|guideline|governance|role|responsibility)\b"),
    ("5.2", r"\b(risk|sle|ale|aro|exposure factor|qualitative|quantitative|risk register|risk acceptance|risk avoidance|risk mitigation|risk transference|asset value)\b"),
    ("5.3", r"\b(vendor|third-?party|supply chain|right to audit|sla|nda|bpa|msa|questionnaire)\b"),
    ("5.4", r"\b(compliance|privacy|gdpr|pci|hipaa|attestation|acknowledgement|pii|phi)\b"),
    ("5.5", r"\b(audit|assessment|penetration|internal audit|external audit|soc 2|security assessment)\b"),
    ("5.6", r"\b(awareness|phishing campaign|anomalous behavior|reporting|training|user guidance)\b"),
]

TOPIC_RULES = [
    ("CIA Triad", r"\b(confidentiality|integrity|availability|cia)\b"),
    ("Physical Security", r"\b(badge|sensor|lock|guard|vestibule|mantrap|bollard|faraday|beware of dogs|fence)\b"),
    ("AAA", r"\b(aaa|authentication|authorization|accounting)\b"),
    ("PKI and Certificates", r"\b(certificate|pki|ocsp|crl|csr|wildcard)\b"),
    ("Cryptography", r"\b(encrypt|hash|cipher|aes|rsa|tls|shared secret|digital signature|downgrade)\b"),
    ("Threat Actors", r"\b(nation-?state|hacktivist|organized crime|shadow it|insider|threat actor|apt)\b"),
    ("Social Engineering", r"\b(phish|pretext|vish|smish|impersonat|bec|watering|typosquat)\b"),
    ("Malware", r"\b(malware|ransomware|trojan|worm|rootkit|botnet|logic bomb|virus|spyware)\b"),
    ("Network Attacks", r"\b(ddos|on-path|replay|dns|arp|evil twin)\b"),
    ("Application Attacks", r"\b(sql injection|xss|csrf|ssrf|directory traversal|injection)\b"),
    ("Cloud Architecture", r"\b(iaas|saas|paas|serverless|cloud|vertical scaling|horizontal scaling|elasticity)\b"),
    ("Network Architecture", r"\b(firewall|vlan|vpn|proxy|sdn|load balanc|acl)\b"),
    ("Data Protection", r"\b(data at rest|tokenization|masking|classification|sovereignty|data minimization)\b"),
    ("Resilience", r"\b(backup|rto|rpo|hot site|availability|failover|offsite|clustering)\b"),
    ("Vulnerability Management", r"\b(cve|cvss|vulnerability|scan|patch)\b"),
    ("Monitoring", r"\b(siem|log|netflow|alert|snmp)\b"),
    ("Identity and Access", r"\b(mfa|sso|federation|rbac|iam|pam|identity provider)\b"),
    ("Incident Response", r"\b(incident|containment|eradication|forensic|lessons learned|threat hunt|preparation)\b"),
    ("Risk Management", r"\b(sle|ale|aro|risk register|qualitative|quantitative|asset value|risk mitigation|category of risk|compliance risk)\b"),
    ("Governance", r"\b(policy|standard|guideline|procedure)\b"),
    ("Third-Party Risk", r"\b(vendor|sla|nda|bpa|third-?party)\b"),
    ("Privacy and Compliance", r"\b(gdpr|pci|hipaa|privacy|pii|phi|compliance)\b"),
    ("Change Management", r"\b(change management|backout|version control)\b"),
    ("Hardening", r"\b(harden|baseline|cis benchmark|secure configuration)\b"),
    ("Asset Management", r"\b(end-of-life|end-of-sales|hardware life cycle|inventory|disposal)\b"),
]

NAMES = [
    "Avery", "Blake", "Cameron", "Drew", "Eden", "Finley", "Harper", "Indigo",
    "Jordan", "Kai", "Logan", "Morgan", "Noor", "Oakley", "Parker", "Quinn",
    "Reese", "Sage", "Tatum", "Uma", "Val", "Winter", "Yael", "Zion",
]

SOURCE_NAMES = re.compile(
    r"\b(Matt|Gwen|Lou|Ryan|Randy|Elaine|Renee|Edward|Brian|Zian|Adam|Mike|David|"
    r"Shahla|Naomi|Kevin|Lin|Tony|Alyssa|Felix|Joe|Aziz|Grace|Scott|Gabby|Florian|"
    r"Gurvinder|Patrick|Angela|Joseph|Christina|Damian|Kent|Isaac|Yasmine|Brent|"
    r"Kathleen|Frank|Annie|Amanda|Jared|Mahmoud|Nick|Michelle|Jake|Jennifer|"
    r"Ramon|Fred|Tara|Geoff|Parvati|Olivia|Maria|Mark|Charles|Kim|Henry|Theo|"
    r"Gary|Alex|John|Jackson|Cynthia|Jean|Rick|Katie|Donna|Batu|Jill|Pedro|Omar|"
    r"Jeremy|Neil|Helen|Ben|Frankie|Kelly|Tristan|Megan|Nathan|Eric|Nelson|Lucca|"
    r"Charlene|Isabelle|Giovanni|Greg|Chris|Dan|Elizabeth|Sam|Ilya|Daryl|Dana|"
    r"Jack|Erica|Janice|Selah|Abigail|Tom|Dane|Devin|Kendra|Hui|Tim|Ian|Bob|"
    r"Jason|Susan|Valerie|Felicia|Nina|Tonya|Ric|Ricardo|Norm|Wayne|Carl|Lisa|"
    r"Sarah|Daniel|Michael|Robert|James|Mary|Patricia|Linda|Barbara|Elizabeth|"
    r"Thomas|Charles|Christopher|Matthew|Anthony|Donald|Paul|Mark|George|Kenneth|"
    r"Steven|Andrew|Joshua|Kevin|Brian|Edward|Ronald|Timothy|Jason|Jeffrey|"
    r"Ryan|Jacob|Gary|Nicholas|Eric|Jonathan|Stephen|Larry|Justin|Scott|Brandon|"
    r"Benjamin|Samuel|Raymond|Gregory|Frank|Alexander|Patrick|Jack|Dennis|Jerry|"
    r"Tyler|Aaron|Jose|Adam|Nathan|Henry|Douglas|Zachary|Peter|Kyle|Noah|Ethan|"
    r"Jeremy|Walter|Christian|Keith|Roger|Terry|Gerald|Harold|Sean|Austin|Arthur|"
    r"Lawrence|Jesse|Joe|Bryan|Billy|Bruce|Gabriel|Joe|Juan|Alan|Wayne|Roy|"
    r"Ralph|Randy|Eugene|Vincent|Russell|Louis|Philip|Bobby|Johnny|Bradley)\b",
    re.I,
)

SPECIFIC_OBJECTIVES = [
    (r"\bdata loss prevention\b|\bdlp\b", "4.5"),
    (r"\bpassword spray", "2.4"),
    (r"\bvoicemail\b|\bvish", "2.2"),
    (r"\bsmish", "2.2"),
    (r"\bcontrol objectives\b", "1.2"),
    (r"\bidentity theft\b", "5.4"),
    (r"\bpayment card industry\b|\bpci dss\b", "5.2"),
    (r"\ballocation\b", "2.1"),
    (r"\bdesired security state\b", "1.2"),
    (r"\bbuffer overflow\b|very long string", "2.3"),
    (r"\bimmediately p", "4.7"),
    (r"\bassure .* users that the code", "1.4"),
    (r"\bpicture password\b|\bpin is an example\b", "4.6"),
    (r"\bfile permissions", "4.6"),
    (r"\bbiometric\b", "4.6"),
    (r"\bwindows file share\b", "4.6"),
    (r"\bleft her organization\b", "4.6"),
    (r"\bjob title are all examples\b", "4.6"),
    (r"\bdisaster took\b", "3.4"),
    (r"\bseismic sensors\b", "3.1"),
    (r"\bcasb\b", "3.1"),
    (r"\bembedded system\b", "3.1"),
    (r"\bboot processes\b", "3.2"),
    (r"\bsecure erase\b|\bsanitiz", "4.2"),
    (r"\bhoneypot\b|honeynet\b", "4.8"),
    (r"\bsecure protocols for email", "3.2"),
    (r"\bload-balancing\b|load balancing", "3.2"),
    (r"\bgeolocation\b", "4.1"),
    (r"\bcellular hotspot\b", "4.1"),
    (r"\bsignal strength and coverage", "4.1"),
    (r"\bsflow\b", "4.4"),
    (r"\bmissing logs\b", "4.8"),
    (r"\bir team\b", "4.8"),
    (r"\bquick-formatted\b", "4.8"),
    (r"\bshare knowledge between organizations", "2.1"),
    (r"\bbloatware\b", "2.4"),
    (r"\btyposquat", "2.2"),
    (r"\bagent-based, preadmission", "4.5"),
    (r"\brto\b|recovery time", "3.4"),
    (r"\brpo\b|recovery point", "3.4"),
    (r"\bdata protection officer\b|\bdata controller\b|\bdata processor\b", "5.4"),
    (r"automating cybersecurity", "4.7"),
    (r"detect humans entering", "1.2"),
    (r"\bjournalctl\b|logon auditing|red hat linux", "4.9"),
    (r"\bpublic repo", "2.3"),
]

CONCEPT_HINTS = [
    (r"\bthreat assessment process\b", "Managerial controls are administrative processes such as assessments, policies, and risk reviews rather than devices or daily hands-on tasks."),
    (r"beware of dogs|posted sign", "A warning sign is meant to discourage an action before it happens; it does not detect or physically block the event by itself."),
    (r"\bdiscourage the attacker\b", "A deterrent control reduces the chance an attacker even tries; preventive controls block the attempt, and detective controls notice it later."),
    (r"\bmasking\b", "Masking hides part of a sensitive value while leaving a usable remnant for operations or support."),
    (r"\binsider\b.*hacktivist|hacktivist\b.*insider", "The person already had authorized access, and the disclosure was driven by ideology rather than quiet profit or espionage."),
    (r"\blogic bomb\b", "A code-review process can catch unauthorized logic before it is deployed; antivirus and EDR react after malicious code is already present."),
    (r"\bransomware\b", "A payment demand plus encrypted files is the classic ransomware pattern."),
    (r"\bvirus\b", "A virus typically needs a user to open or execute a host file before it infects the system."),
    (r"\bthreat hunt", "Threat hunting starts from the assumption that a compromise may already exist and looks for evidence of it."),
    (r"\bpatch management\b", "A finding that already has a published patch is the problem patch management is designed to prevent."),
    (r"\bstatic code\b", "Static analysis reviews source without executing the program."),
    (r"\bshared secret\b", "Symmetric encryption uses one shared key for both encryption and decryption, not a public/private pair."),
    (r"\bdigital signature\b", "A signature is created with the sender's private key and verified with that sender's public key."),
    (r"\bdowngrade\b", "A downgrade attack forces a weaker protocol or cipher so captured traffic becomes easier to break."),
    (r"\bidentity provider\b", "The identity provider authenticates users and asserts their identity to other members of a federation."),
    (r"\bvertical scaling\b", "Adding CPU, RAM, or disk to the same instance is vertical scaling; adding more instances is horizontal scaling."),
    (r"\boffsite\b", "Sending backups to a separate facility provides geographic separation from the primary site."),
    (r"\btabletop\b", "A tabletop walkthrough discusses the plan without failing over production systems."),
    (r"\baccess control vestibule\b|\bmantrap\b", "Two sequential doors before a secure area form an access control vestibule."),
    (r"\bend-of-life\b", "End-of-life means the vendor has stopped selling the product and no longer issues security updates."),
    (r"\bsnmp trap\b", "An SNMP trap is an unsolicited alert that something on the device needs attention."),
    (r"\bcis benchmark\b", "CIS benchmarks are widely used configuration baselines for operating systems and devices."),
    (r"\bpreparation\b", "Incident response begins with preparation so detection, analysis, and containment have tools and authority ready."),
    (r"\bdd\b", "The Linux dd utility can create a bit-for-bit forensic image of a drive."),
    (r"\bguideline\b", "A guideline recommends one acceptable way to meet a requirement; it is not a mandatory standard or a step-by-step procedure."),
    (r"\bphishing\b", "A deceptive message that tries to harvest credentials is phishing, even when the lure uses a look-alike domain."),
    (r"defaced|unauthorized modification", "Integrity is violated when data or a system is changed without authorization."),
    (r"pci|payment card industry", "PCI DSS sanctions are a compliance risk, not a purely financial, operational, or strategic loss."),
    (r"\ballocation\b", "Attackers commonly pursue disclosure, alteration, or denial; allocation is not one of those goals."),
    (r"\bdlp\b|guests on his wireless", "Guest wireless traffic never reaches a host agent on a corporate laptop, so the inspection has to happen on the network path."),
    (r"\bair gap\b", "An air gap physically isolates a system so network attackers cannot reach the data at all."),
    (r"\bresidual risk\b", "Residual risk is what remains after controls are applied."),
    (r"\brto\b", "RTO is the maximum time a service can be down before the business suffers unacceptable harm."),
    (r"\bsql injection\b", "Untrusted input is interpreted as a database command instead of plain data."),
    (r"\basset value\b|\b\bav\b", "Asset value is the worth of the asset being protected, not the daily revenue or the annualized loss."),
    (r"\brisk mitigation\b", "Adding a control that reduces likelihood or impact is risk mitigation."),
    (r"\bport scan", "Active port scanning is interaction with the target, so it is not open-source intelligence."),
    (r"\bmetasploit\b", "Metasploit is an exploitation framework, not a reconnaissance-only tool."),
    (r"\blateral movement\b", "Moving from a compromised host to other systems on the same network is lateral movement."),
    (r"\bsemi-authorized\b", "Reporting a discovered flaw after accessing data without permission is semi-authorized or bug-bounty-style activity, not fully authorized testing."),
    (r"\bcode review\b", "Human or peer review of source can stop an insider from planting unauthorized logic."),
    (r"\bxss\b|cross-site scripting", "A web application scanner is the tool most likely to find XSS in a running site."),
    (r"\bnmap\b|\bnessus\b", "Reconnaissance favors discovery and scanning tools rather than exploit frameworks."),
]


def clean(text: str) -> str:
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u00a0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def option_texts(rec: dict) -> list[str]:
    return [clean(o["text"] if isinstance(o, dict) else o) for o in rec["options"]]


def rewrite_item(stem: str, options: list[str], index: int) -> tuple[str, list[str]]:
    text = clean(stem)
    text = re.sub(r"\bLarger View\b", "", text, flags=re.I)
    text = re.sub(r"\bSource:.*$", "", text)
    text = re.sub(r"\bshown here\.?", "", text, flags=re.I)
    text = re.sub(r"\bthe following figure shows\b", "this process shows", text, flags=re.I)
    text = re.sub(r"\bthe sign below\b", "a posted sign", text, flags=re.I)
    text = re.sub(r"Edward Snowden was a government contractor who disclosed sensitive government documents to journalists to uncover what he believed were unethical activities\.",
                  "A government contractor disclosed sensitive government documents to journalists to expose activities the contractor considered unethical.",
                  text, flags=re.I)
    text = re.sub(r"\bSnowden's\b", "the contractor's", text, flags=re.I)
    text = re.sub(r"\b\(Choose two\.\)\s*", "", text, flags=re.I)

    mapping = {}

    def swap_name(match: re.Match) -> str:
        key = match.group(0).lower()
        if key not in mapping:
            mapping[key] = NAMES[(index + len(mapping)) % len(NAMES)]
        return mapping[key]

    text = SOURCE_NAMES.sub(swap_name, text)
    options = [SOURCE_NAMES.sub(swap_name, clean(opt)) for opt in options]
    text = text.replace("wants to", "needs to")
    text = text.replace("wants her", "needs her")
    text = text.replace("wants his", "needs his")
    text = re.sub(r"\bWhich one of the following\b", "Which of these", text)
    text = re.sub(r"\bWhich of the following\b", "Which of these", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text, options


def convert_special(rec: dict) -> tuple[dict | None, str, str]:
    """Return (record or None, action, note)."""
    rec = dict(rec)
    idx = rec["sourceIndex"]
    q = clean(rec["question"])
    opts = option_texts(rec)

    if idx == 4:
        return None, "excluded-image", "Credit-card table does not describe how PAN values are displayed; masking cannot be justified from the text alone."

    if idx == 12:
        rec["question"] = "A datacenter fence displays a posted sign that reads \"Beware of dogs.\" Which control type BEST describes this sign?"
        rec["options"] = [{"letter": l, "text": t} for l, t in zip("ABCD", opts)]
        return rec, "converted-image", "Converted dog-warning sign to text."

    if idx == 38:
        rec["question"] = "A government contractor disclosed sensitive documents to journalists to expose activities the contractor considered unethical. Which pairing BEST describes that activity?"
        rec["options"] = [
            {"letter": "A", "text": "Insider and hacktivist"},
            {"letter": "B", "text": "Nation-state actor and APT"},
            {"letter": "C", "text": "Organized crime and nation-state actor"},
            {"letter": "D", "text": "APT and organized crime"},
        ]
        rec["correctLetter"] = "A"
        rec["correctAnswer"] = 0
        rec["correctText"] = "Insider and hacktivist"
        rec["issues"] = []
        return rec, "rewritten-multi", "Rewrote choose-two / five-option item into a single four-option BEST pairing."

    if idx == 231:
        rec["question"] = q
        rec["options"] = [
            {"letter": "A", "text": "Agent-based, preadmission NAC"},
            {"letter": "B", "text": "Agentless, postadmission NAC"},
            {"letter": "C", "text": "Agent-based, postadmission NAC"},
            {"letter": "D", "text": "Agentless, preadmission NAC"},
        ]
        rec["correctLetter"] = "A"
        rec["correctAnswer"] = 0
        rec["correctText"] = "Agent-based, preadmission NAC"
        return rec, "repaired-options", "Restored the missing agentless/preadmission NAC option; B and D were identical in the PDF extract."

    if idx == 86:
        rec["question"] = "A vulnerability report lists the threat, the impact, a recommended solution, and download links for vendor patches. Which security control, if already deployed, would MOST likely have prevented this finding?"
        rec["options"] = [{"letter": l, "text": t} for l, t in zip("ABCD", opts)]
        return rec, "converted-image", "Converted patch-finding screenshot to text."

    if idx == 176:
        rec["question"] = "A physical security design uses two sequential doors, Door 1 and Door 2, before a labeled secure area, so a person must pass through both doors to enter. What type of physical control is this?"
        rec["options"] = [{"letter": l, "text": t} for l, t in zip("ABCD", opts)]
        return rec, "converted-image", "Converted vestibule diagram to text."

    if idx == 257:
        rec["question"] = "An incident-response process lists detection, analysis, containment, eradication, and recovery, with the first step unmarked. Which item is missing from the start of that cycle?"
        rec["options"] = [{"letter": l, "text": t} for l, t in zip("ABCD", opts)]
        return rec, "converted-image", "Converted IR-cycle diagram to text."

    if "Larger View" in q:
        return None, "excluded-image", "Image-dependent item lacked enough text to reconstruct the scenario."

    return rec, "ok", ""


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


def map_objective(chapter: int, question: str, options: list[str]) -> tuple[str, str]:
    blob = f"{question} {' '.join(options)}".lower()
    opt_l = {o.lower() for o in options}
    if {"confidentiality", "integrity", "availability"} <= opt_l or (
        "confidentiality" in opt_l and "integrity" in opt_l and "availability" in opt_l
    ):
        return "1.2", "high"
    for pattern, obj_id in SPECIFIC_OBJECTIVES:
        if re.search(pattern, blob, re.I):
            return obj_id, "high"
    scored: list[tuple[float, str]] = []
    for obj_id, pattern in OBJECTIVE_RULES:
        matches = re.findall(pattern, blob, re.I)
        if matches:
            scored.append((len(matches) * 50 + min(len(pattern), 80), obj_id))
    default = CHAPTER_DEFAULT.get(chapter, "1.2")
    if not scored:
        return default, "low"
    scored.sort(reverse=True)
    best = scored[0][1]
    unique_objs = {obj for _, obj in scored}
    if len(unique_objs) == 1:
        return best, "high"
    chapter_prefix = default.split(".")[0]
    same_domain = [obj for _, obj in scored if obj.startswith(chapter_prefix + ".")]
    if same_domain:
        return same_domain[0], "medium"
    return best, "medium"


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
        "logging": r"\b(log|siem|snmp)\b",
        "risk": r"\b(sle|ale|aro|risk)\b",
        "malware": r"\b(malware|ransomware|virus|worm|trojan)\b",
        "forensics": r"\b(forensic|dd )\b",
    }
    for tag, pat in extras.items():
        if re.search(pat, question, re.I) and tag not in tags:
            tags.append(tag)
    return tags[:5]


def original_explanation(correct: str, options: list[str], correct_idx: int, question: str) -> str:
    blob = f"{question} {correct}".lower()
    hint = next((text for pat, text in CONCEPT_HINTS if re.search(pat, blob)), None)
    distractors = [clean(o).rstrip(".") for i, o in enumerate(options) if i != correct_idx]
    lead = f"{clean(correct).rstrip('.')} is correct."
    mid = hint or "It matches the Security+ concept the scenario is actually testing."
    if len(distractors) >= 2:
        tail = f"{distractors[0]} and {distractors[1]} miss that requirement, and the remaining distractor is weaker for the same reason."
    elif distractors:
        tail = f"{distractors[0]} does not meet that requirement."
    else:
        tail = "The remaining options do not meet that requirement."
    return f"{lead} {mid} {tail}"


def incorrect_explanations(options: list[str], correct_idx: int, difficulty: str, question: str) -> dict:
    if difficulty == "easy":
        return {}
    out = {}
    q = question.lower()
    for i, option in enumerate(options):
        if i == correct_idx:
            continue
        opt = option.rstrip(".")
        low = option.lower()
        if "hash" in low and "mask" in q:
            msg = f"{opt} changes the value irreversibly and would not leave a recognizable remnant in a report table."
        elif "token" in low and "mask" in q:
            msg = f"{opt} replaces the value with an unrelated stand-in rather than hiding part of the original."
        elif "destruction" in low:
            msg = f"{opt} would remove the data entirely instead of minimizing what remains visible."
        elif "detective" in low and "deterrent" in q:
            msg = f"{opt} would record or notice an event; a warning sign is meant to discourage the event first."
        elif "physical" in low and "deterrent" in q:
            msg = f"{opt} describes the fence or dogs themselves more than the warning message on the sign."
        elif "antivirus" in low or "edr" in low:
            msg = f"{opt} may detect malware later, but it does not stop an insider from inserting unauthorized logic during development."
        elif "worm" in low:
            msg = f"{opt} can spread on its own and does not require a user to open a file first."
        elif "trojan" in low:
            msg = f"{opt} is malware disguised as useful software, which this scenario does not describe."
        elif "public key" in low and "symmetric" in q:
            msg = f"{opt} belongs to asymmetric cryptography, not a shared symmetric key."
        elif "private key" in low and "symmetric" in q:
            msg = f"{opt} is used in public-key operations, not shared-secret encryption."
        elif "horizontal" in low and "cpu" in q:
            msg = f"{opt} adds more instances rather than more resources on the same server."
        elif "elasticity" in low and "cpu" in q:
            msg = f"{opt} is the broader cloud capability; the specific action described is adding capacity to one host."
        elif "policy" in low and "guideline" in q + " ".join(options).lower():
            msg = f"{opt} states a mandatory rule rather than one recommended way to comply."
        elif "procedure" in low and "guideline" in q:
            msg = f"{opt} would give mandatory step-by-step instructions, not optional advice."
        elif "standard" in low and "guideline" in q:
            msg = f"{opt} sets a required baseline, not a suggested approach."
        elif "faraday" in low or "bollard" in low or "air gap" in low:
            msg = f"{opt} does not match two sequential doors controlling entry to a secure area."
        elif "planning" in low or "reporting" in low or "monitoring" in low:
            msg = f"{opt} is useful work, but it is not the missing first phase of the standard incident-response cycle."
        else:
            msg = f"{opt} does not best satisfy the requirement described in the scenario."
        out[str(i)] = msg
    return out


def normalize(text: str) -> str:
    text = clean(text).lower()
    text = SOURCE_NAMES.sub("name", text)
    for name in NAMES:
        text = re.sub(rf"\b{name.lower()}\b", "name", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def option_signature(options: list[str]) -> str:
    return " | ".join(sorted(normalize(o) for o in options))


def load_existing() -> list[dict]:
    code = r"""
const fs = require("fs");
const vm = require("vm");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("data/questions.js", "utf8"), ctx);
const slim = ctx.QUESTIONS.map(function (q) {
  return { id: q.id, q: q.question, o: q.options, c: q.correctAnswer, t: q.topic, obj: q.objective };
});
process.stdout.write(JSON.stringify(slim));
"""
    raw = subprocess.check_output(["node", "-e", code], cwd=ROOT, encoding="utf-8")
    return json.loads(raw)


def token_set(text: str) -> set[str]:
    return {t for t in normalize(text).split() if len(t) > 2}


def is_duplicate(question: str, options: list[str], existing: list[dict]) -> dict | None:
    norm_q = normalize(question)
    q_tokens = token_set(question)
    sig = option_signature(options)
    best = None
    best_ratio = 0.0
    for item in existing:
        item_tokens = token_set(item["q"])
        if not q_tokens or not item_tokens:
            continue
        overlap = len(q_tokens & item_tokens) / max(len(q_tokens | item_tokens), 1)
        same_opts = option_signature(item["o"]) == sig
        if overlap < 0.45 and not same_opts:
            continue
        ratio = SequenceMatcher(None, norm_q, normalize(item["q"])).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best = item
        if ratio >= 0.88 or (same_opts and ratio >= 0.72):
            return {"id": item["id"], "ratio": round(ratio, 3), "sameOptions": same_opts, "existing": item["q"][:160]}
    if best and best_ratio >= 0.84:
        return {"id": best["id"], "ratio": round(best_ratio, 3), "sameOptions": False, "existing": best["q"][:160]}
    return None


def emit_js(questions: list[dict]) -> str:
    lines = [
        "/**",
        " * Additive second-source SY0-701 questions.",
        " * Appended to the current source-bank-v1 QUESTIONS array.",
        " * IDs use the sq2-### namespace so existing sq#### progress stays valid.",
        " */",
        'var QUESTION_BANK_VERSION = "source-bank-v2";',
        "",
        "var SECOND_SOURCE_QUESTIONS = [",
    ]
    for q in questions:
        lines.append("  {")
        lines.append(f'    id: {json.dumps(q["id"])},')
        lines.append(f'    domain: {json.dumps(q["domain"])},')
        lines.append(f'    objective: {json.dumps(q["objective"])},')
        lines.append(f'    topic: {json.dumps(q["topic"])},')
        lines.append('    questionType: "multiple-choice",')
        lines.append(f'    difficulty: {json.dumps(q["difficulty"])},')
        lines.append(f'    tags: {json.dumps(q["tags"])},')
        lines.append(f'    question: {json.dumps(q["question"], ensure_ascii=False)},')
        lines.append("    options: [")
        for opt in q["options"]:
            lines.append(f"      {json.dumps(opt, ensure_ascii=False)},")
        lines.append("    ],")
        lines.append(f'    correctAnswer: {q["correctAnswer"]},')
        lines.append(f'    explanation: {json.dumps(q["explanation"], ensure_ascii=False)},')
        incs = q.get("incorrectExplanations") or {}
        if incs:
            packed = ", ".join(f'{k}: {json.dumps(v, ensure_ascii=False)}' for k, v in incs.items())
            lines.append(f"    incorrectExplanations: {{ {packed} }}")
        else:
            lines.append("    incorrectExplanations: {}")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    lines.append("if (typeof QUESTIONS !== \"undefined\" && Array.isArray(QUESTIONS)) {")
    lines.append("  QUESTIONS = QUESTIONS.concat(SECOND_SOURCE_QUESTIONS);")
    lines.append("  if (typeof enrichQuestion === \"function\") {")
    lines.append("    SECOND_SOURCE_QUESTIONS.forEach(enrichQuestion);")
    lines.append("  }")
    lines.append("}")
    lines.append("")
    return "\n".join(lines)


def build() -> None:
    parsed = json.loads(PARSED.read_text(encoding="utf-8"))
    records = parsed["questions"]
    existing = load_existing()
    existing_ids = {item["id"] for item in existing}

    report = {
        "pdfMainDetected": parsed["mainCount"],
        "pdfAppendixIgnored": parsed["appendixItems"],
        "pdfSuccessfullyParsed": parsed["validated"],
        "currentBankBefore": len(existing),
        "excludedMalformed": [],
        "excludedImage": [],
        "convertedImage": [],
        "repaired": [],
        "excludedDuplicates": [],
        "technicalCorrections": [],
        "lowConfidence": [],
        "imported": 0,
        "domains": Counter(),
        "difficulty": Counter(),
        "objectives": Counter(),
        "rewrites": [],
    }

    if parsed["mainCount"] < 320 or parsed["mainCount"] > 350:
        raise SystemExit(f"STOP: parsed main count {parsed['mainCount']} is not ~334")

    built: list[dict] = []
    for rec in records:
        special, action, note = convert_special(rec)
        if action == "excluded-image":
            report["excludedImage"].append({"sourceIndex": rec["sourceIndex"], "reason": note, "question": rec["question"][:160]})
            continue
        if special is None:
            report["excludedMalformed"].append({"sourceIndex": rec["sourceIndex"], "reason": "unusable after conversion"})
            continue
        if action == "converted-image":
            report["convertedImage"].append({"sourceIndex": rec["sourceIndex"], "note": note})
        if action == "rewritten-multi":
            report["rewrites"].append({"sourceIndex": rec["sourceIndex"], "note": note})
        if action == "repaired-options":
            report["repaired"].append({"sourceIndex": rec["sourceIndex"], "note": note})
            report["technicalCorrections"].append({"sourceIndex": rec["sourceIndex"], "note": note})

        opts = option_texts(special)
        letter = special.get("correctLetter")
        if letter not in "ABCD" or "ABCD".index(letter) >= len(opts):
            report["excludedMalformed"].append({"sourceIndex": rec["sourceIndex"], "reason": f"bad letter {letter}"})
            continue
        if len(opts) != 4:
            report["excludedMalformed"].append({"sourceIndex": rec["sourceIndex"], "reason": f"{len(opts)} options"})
            continue
        if len({o.lower() for o in opts}) < 4:
            report["excludedMalformed"].append({"sourceIndex": rec["sourceIndex"], "reason": "duplicate options"})
            continue

        correct_idx = special.get("correctAnswer")
        if correct_idx is None:
            correct_idx = "ABCD".index(letter)
        question, opts = rewrite_item(special["question"], opts, rec["sourceIndex"])
        if "Larger View" in question or "Appendix" in question:
            report["excludedMalformed"].append({"sourceIndex": rec["sourceIndex"], "reason": "parser artifact"})
            continue

        dup = is_duplicate(question, opts, existing)
        if dup:
            report["excludedDuplicates"].append({
                "sourceIndex": rec["sourceIndex"],
                "keptExistingId": dup["id"],
                "ratio": dup["ratio"],
                "incoming": question[:160],
                "existing": dup["existing"],
            })
            continue

        objective, confidence = map_objective(rec["sourceChapter"], question, opts)
        domain = OBJ_DOMAIN[objective.split(".")[0]]
        difficulty = infer_difficulty(question, opts)
        topic = infer_topic(question, opts)
        explanation = original_explanation(opts[correct_idx], opts, correct_idx, question)
        if confidence == "low":
            report["lowConfidence"].append({
                "sourceIndex": rec["sourceIndex"],
                "chapter": rec["sourceChapter"],
                "objective": objective,
                "question": question[:140],
            })

        built.append({
            "sourceIndex": rec["sourceIndex"],
            "sourceChapter": rec["sourceChapter"],
            "domain": domain,
            "objective": objective,
            "topic": topic,
            "difficulty": difficulty,
            "tags": infer_tags(topic, question),
            "question": question,
            "options": opts,
            "correctAnswer": correct_idx,
            "explanation": explanation,
            "incorrectExplanations": incorrect_explanations(opts, correct_idx, difficulty, question),
            "confidence": confidence,
        })

    for i, item in enumerate(built, start=1):
        qid = f"sq2-{i:03d}"
        if qid in existing_ids:
            raise SystemExit(f"ID collision on {qid}")
        item["id"] = qid
        report["domains"][item["domain"]] += 1
        report["difficulty"][item["difficulty"]] += 1
        report["objectives"][item["objective"]] += 1

    report["imported"] = len(built)
    report["finalActiveExpected"] = report["currentBankBefore"] + report["imported"]
    report["domains"] = dict(report["domains"])
    report["difficulty"] = dict(report["difficulty"])
    report["objectives"] = dict(sorted(report["objectives"].items()))

    OUT_JS.write_text(emit_js(built), encoding="utf-8")
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"imported={report['imported']} excluded_image={len(report['excludedImage'])} "
          f"excluded_dup={len(report['excludedDuplicates'])} malformed={len(report['excludedMalformed'])} "
          f"low_conf={len(report['lowConfidence'])}")
    print("expected final", report["finalActiveExpected"])
    print("domains", report["domains"])
    print("difficulty", report["difficulty"])
    if report["excludedDuplicates"]:
        print("duplicates skipped:")
        for row in report["excludedDuplicates"]:
            print(f"  Q{row['sourceIndex']} ~ {row['keptExistingId']} r={row['ratio']}")
    if report["excludedImage"]:
        print("image exclusions:")
        for row in report["excludedImage"]:
            print(f"  Q{row['sourceIndex']}: {row['reason']}")


if __name__ == "__main__":
    build()
