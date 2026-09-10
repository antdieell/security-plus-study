/**
 * Original Security+ flashcards for quick review.
 */
var FLASHCARDS = [
  {
    id: "fc001",
    domain: "general",
    term: "CIA Triad",
    definition: "Confidentiality, Integrity, and Availability — the three core security goals. Confidentiality keeps data private, integrity keeps it accurate, and availability keeps it usable when needed.",
    whyItMatters: "Most exam scenarios map an incident to one of these three impacts.",
    examTip: "If a system is encrypted but down, the primary hit is availability."
  },
  {
    id: "fc002",
    domain: "general",
    term: "AAA",
    definition: "Authentication (who you are), Authorization (what you can do), and Accounting (what you did).",
    whyItMatters: "Identity systems fail in different AAA layers; mixing them up is a common exam trap.",
    examTip: "A valid login that cannot open payroll is an authorization issue."
  },
  {
    id: "fc003",
    domain: "general",
    term: "Zero Trust",
    definition: "A model that assumes breach and never trusts a user or device based on network location alone. Every request should be verified.",
    whyItMatters: "Perimeter-only thinking is no longer enough for cloud and remote work.",
    examTip: "“Never trust, always verify” and microsegmentation are classic Zero Trust cues."
  },
  {
    id: "fc004",
    domain: "general",
    term: "Least Privilege",
    definition: "Users and systems receive only the minimum rights needed, for the minimum time needed.",
    whyItMatters: "Limits blast radius when an account or process is compromised.",
    examTip: "Temporary, just-in-time admin is more aligned with least privilege than standing Domain Admin."
  },
  {
    id: "fc005",
    domain: "general",
    term: "Defense in Depth",
    definition: "Layering independent controls (people, process, technology) so one failure does not cause a full breach.",
    whyItMatters: "No single control is perfect; overlapping layers catch what others miss.",
    examTip: "Look for combinations like filtering + EDR + training + segmentation."
  },
  {
    id: "fc006",
    domain: "general",
    term: "Authentication Factors",
    definition: "Something you know (password), have (token/phone), are (biometric), plus extras like somewhere you are or something you do.",
    whyItMatters: "MFA combines factors so stealing one secret is not enough.",
    examTip: "A fingerprint is “something you are,” not “something you have.”"
  },
  {
    id: "fc007",
    domain: "general",
    term: "Non-repudiation",
    definition: "Evidence that a party cannot credibly deny an action, often provided by digital signatures.",
    whyItMatters: "Important for contracts, logs, and forensic accountability.",
    examTip: "Encryption alone is confidentiality, not non-repudiation."
  },
  {
    id: "fc008",
    domain: "general",
    term: "Hashing",
    definition: "A one-way function that produces a fixed-size digest used to verify integrity or store passwords.",
    whyItMatters: "Detects unauthorized changes and supports password storage when combined with salt.",
    examTip: "If the task is “make sure it was not altered,” think hash, not encrypt."
  },
  {
    id: "fc009",
    domain: "general",
    term: "Encryption",
    definition: "Transforming data with a key so unauthorized parties cannot read it. Symmetric uses one shared key; asymmetric uses a public/private pair.",
    whyItMatters: "Primary control for confidentiality of data at rest and in transit.",
    examTip: "Encryption is reversible with a key; hashing is not."
  },
  {
    id: "fc010",
    domain: "threats",
    term: "Phishing",
    definition: "Social engineering via email that tricks users into revealing secrets or running malware.",
    whyItMatters: "Still one of the most common initial access methods.",
    examTip: "Email + fake login page = phishing. SMS = smishing. Voice = vishing."
  },
  {
    id: "fc011",
    domain: "threats",
    term: "Smishing",
    definition: "Phishing delivered through SMS or similar text messaging.",
    whyItMatters: "Mobile users often trust texts more than email.",
    examTip: "Package-delivery texts with login links are classic smishing."
  },
  {
    id: "fc012",
    domain: "threats",
    term: "Vishing",
    definition: "Voice-based social engineering, often impersonating executives, banks, or IT support.",
    whyItMatters: "Urgency over the phone bypasses many email filters.",
    examTip: "CFO wire-transfer calls are vishing / BEC-style fraud."
  },
  {
    id: "fc013",
    domain: "threats",
    term: "Password Spraying",
    definition: "Trying a few common passwords across many accounts to avoid lockouts.",
    whyItMatters: "Defeats “lock after 5 tries on one user” if attackers rotate usernames.",
    examTip: "One password, many users = spray. Many passwords, one user = brute force."
  },
  {
    id: "fc014",
    domain: "threats",
    term: "Credential Stuffing",
    definition: "Replaying leaked username/password pairs from other breaches against your apps.",
    whyItMatters: "Password reuse turns someone else’s breach into your incident.",
    examTip: "MFA and blocking known-breached passwords mitigate stuffing."
  },
  {
    id: "fc015",
    domain: "threats",
    term: "Brute Force",
    definition: "Systematically guessing secrets, often against one account or a captured hash.",
    whyItMatters: "Weak passwords and missing throttling make this practical.",
    examTip: "Lockout, MFA, and long unique passwords are the usual countermeasures."
  },
  {
    id: "fc016",
    domain: "threats",
    term: "DDoS",
    definition: "Many systems flood a target so legitimate users cannot reach it.",
    whyItMatters: "Primary impact is availability, not usually data theft.",
    examTip: "If the site is down but data is not stolen, think availability / DDoS."
  },
  {
    id: "fc017",
    domain: "threats",
    term: "On-path (MITM) Attack",
    definition: "An attacker intercepts and possibly alters communications between two parties.",
    whyItMatters: "Untrusted networks and missing TLS make this easier.",
    examTip: "TLS with valid certificates is a primary defense."
  },
  {
    id: "fc018",
    domain: "threats",
    term: "Replay Attack",
    definition: "Capturing a valid message or token and resending it later to impersonate someone.",
    whyItMatters: "Authentication that never expires is reusable stolen proof.",
    examTip: "Nonces, timestamps, and short-lived tokens stop replays."
  },
  {
    id: "fc019",
    domain: "threats",
    term: "SQL Injection",
    definition: "Untrusted input is interpreted as SQL commands, often exposing or changing database data.",
    whyItMatters: "Can dump tables, bypass login, or destroy data.",
    examTip: "Parameterized queries are the standard fix — not CSS hiding."
  },
  {
    id: "fc020",
    domain: "threats",
    term: "Cross-site Scripting (XSS)",
    definition: "Injected script runs in another user’s browser, often stealing cookies or rewriting pages.",
    whyItMatters: "Turns a trusted site into a malware delivery channel.",
    examTip: "Output encoding and a strict Content Security Policy help."
  },
  {
    id: "fc021",
    domain: "threats",
    term: "Ransomware",
    definition: "Malware that encrypts data and demands payment, often after stealing copies first (double extortion).",
    whyItMatters: "Can halt operations even if you never pay.",
    examTip: "Isolated/immutable backups beat hoping the decryptor works."
  },
  {
    id: "fc022",
    domain: "architecture",
    term: "RBAC",
    definition: "Role-based access control assigns permissions to roles, then users to roles.",
    whyItMatters: "Scales better than per-user ACLs in most enterprises.",
    examTip: "HR-Read and Finance-Approve groups are RBAC."
  },
  {
    id: "fc023",
    domain: "architecture",
    term: "ABAC",
    definition: "Attribute-based access control evaluates attributes such as department, device health, and time.",
    whyItMatters: "Supports finer, context-aware policies than static roles alone.",
    examTip: "If the policy lists multiple conditions, think ABAC."
  },
  {
    id: "fc024",
    domain: "architecture",
    term: "DAC",
    definition: "Discretionary access control lets the resource owner decide who can access it, often via ACLs.",
    whyItMatters: "Flexible but easy to misconfigure in large orgs.",
    examTip: "“The file owner shares it with whoever they want” = DAC."
  },
  {
    id: "fc025",
    domain: "architecture",
    term: "MAC",
    definition: "Mandatory access control is enforced by the system using labels and clearances; owners cannot freely override it.",
    whyItMatters: "Common in high-security and government systems.",
    examTip: "Labels + OS enforcement = MAC, not the file owner."
  },
  {
    id: "fc026",
    domain: "architecture",
    term: "PKI",
    definition: "Public Key Infrastructure: CAs, certificates, CRLs/OCSP, and processes to issue and revoke keys.",
    whyItMatters: "Underpins TLS, code signing, and many smart-card logons.",
    examTip: "Compromised certs get revoked, not extended."
  },
  {
    id: "fc027",
    domain: "architecture",
    term: "Digital Certificate",
    definition: "A CA-signed document binding a public key to an identity, with validity dates and intended uses.",
    whyItMatters: "Browsers and devices use certificates to decide what to trust.",
    examTip: "Unknown CA warnings can indicate an on-path attacker."
  },
  {
    id: "fc028",
    domain: "architecture",
    term: "TLS",
    definition: "Transport Layer Security encrypts and authenticates network sessions, commonly HTTPS.",
    whyItMatters: "Protects data in transit from eavesdropping and tampering.",
    examTip: "TLS does not replace user passwords or backups."
  },
  {
    id: "fc029",
    domain: "architecture",
    term: "VPN",
    definition: "A virtual private network encrypts traffic across an untrusted network. Remote-access VPNs serve users; site-to-site VPNs connect networks.",
    whyItMatters: "Lets remote staff reach internal resources more safely.",
    examTip: "Match remote users to remote-access VPN, not an open firewall."
  },
  {
    id: "fc030",
    domain: "architecture",
    term: "Firewall vs IDS vs IPS",
    definition: "Firewalls enforce allow/deny policy. IDS detects and alerts. IPS sits inline and can block.",
    whyItMatters: "Choosing detect-only vs block-inline is a frequent exam decision.",
    examTip: "Alerts but does not block = IDS."
  },
  {
    id: "fc031",
    domain: "architecture",
    term: "NAC",
    definition: "Network access control checks device posture before or as it joins, and can quarantine noncompliant endpoints.",
    whyItMatters: "Stops unmanaged or infected devices from freely entering the LAN.",
    examTip: "Missing patches → remediation VLAN is a NAC story."
  },
  {
    id: "fc032",
    domain: "architecture",
    term: "VLAN",
    definition: "A virtual LAN logically segments a switch network without extra physical cabling.",
    whyItMatters: "Limits broadcast domains and contains attackers or malware.",
    examTip: "VLANs segment; they do not encrypt by themselves."
  },
  {
    id: "fc033",
    domain: "architecture",
    term: "DMZ / Screened Subnet",
    definition: "A network zone for internet-facing systems, isolated from the trusted internal network.",
    whyItMatters: "A compromised web server should not equal a compromised domain controller.",
    examTip: "Public web servers belong in the DMZ, not on the DC VLAN."
  },
  {
    id: "fc034",
    domain: "operations",
    term: "SIEM",
    definition: "Security Information and Event Management: collect, store, and correlate logs into detections.",
    whyItMatters: "Gives analysts a central place to hunt and alert.",
    examTip: "Correlation across firewall + endpoint + identity = SIEM."
  },
  {
    id: "fc035",
    domain: "operations",
    term: "SOAR",
    definition: "Security Orchestration, Automation, and Response: playbooks that automatically execute response steps.",
    whyItMatters: "Speeds repetitive containment like isolating a host or opening a ticket.",
    examTip: "SIEM detects; SOAR automates the next actions."
  },
  {
    id: "fc036",
    domain: "operations",
    term: "EDR",
    definition: "Endpoint Detection and Response: continuous endpoint telemetry, behavioral detection, and remote response.",
    whyItMatters: "Signature-only antivirus misses many modern attacks.",
    examTip: "Investigate and isolate a laptop from a console = EDR."
  },
  {
    id: "fc037",
    domain: "operations",
    term: "DNSSEC",
    definition: "Cryptographic signatures for DNS records so resolvers can verify authenticity.",
    whyItMatters: "Helps detect forged DNS answers used in hijacking.",
    examTip: "DNS integrity → DNSSEC, not “use MAC addresses.”"
  },
  {
    id: "fc038",
    domain: "operations",
    term: "Incident Response Phases",
    definition: "Typical flow: preparation, detection/analysis, containment, eradication, recovery, lessons learned.",
    whyItMatters: "Doing forensics forever while malware spreads skips containment.",
    examTip: "Active spread = contain first."
  },
  {
    id: "fc039",
    domain: "governance",
    term: "RTO",
    definition: "Recovery Time Objective: how quickly a process or system must be restored after disruption.",
    whyItMatters: "Drives how expensive your recovery architecture must be.",
    examTip: "“Down no more than 4 hours” = RTO."
  },
  {
    id: "fc040",
    domain: "governance",
    term: "RPO",
    definition: "Recovery Point Objective: the maximum acceptable amount of data loss, measured in time.",
    whyItMatters: "Drives backup frequency and replication design.",
    examTip: "“Lose at most 15 minutes of transactions” = RPO."
  },
  {
    id: "fc041",
    domain: "governance",
    term: "Residual Risk",
    definition: "Risk remaining after you apply controls or other treatment.",
    whyItMatters: "Leadership accepts, transfers, avoids, or mitigates further — they rarely get to zero.",
    examTip: "After controls = residual. Before controls = inherent."
  },
  {
    id: "fc042",
    domain: "governance",
    term: "BCP vs DR",
    definition: "Business continuity keeps the business running. Disaster recovery restores IT systems and data.",
    whyItMatters: "You can restore servers and still fail if people have no process.",
    examTip: "People/process continuity = BCP. Restore systems = DR."
  },
  {
    id: "fc043",
    domain: "governance",
    term: "SLA",
    definition: "Service Level Agreement: measurable service targets such as uptime, and often credits if missed.",
    whyItMatters: "Sets expectations with vendors and internal IT.",
    examTip: "99.9% uptime and service credits = SLA, not NDA."
  },
  {
    id: "fc044",
    domain: "governance",
    term: "NDA",
    definition: "Nondisclosure agreement: a legal promise not to share confidential information.",
    whyItMatters: "Used with employees, partners, and vendors handling sensitive data.",
    examTip: "Protects secrets; it does not define uptime."
  },
  {
    id: "fc045",
    domain: "governance",
    term: "AUP",
    definition: "Acceptable Use Policy: rules for how people may use company systems and data.",
    whyItMatters: "Gives a basis to discipline misuse and set expectations.",
    examTip: "User behavior rules = AUP."
  }
];

function getUserFlashcardList() {
  if (typeof getUserFlashcards === "function") {
    return getUserFlashcards();
  }
  return [];
}

function getFlashcardById(cardId) {
  return FLASHCARDS.find(function (card) {
    return card.id === cardId;
  }) || getUserFlashcardList().filter(function (card) {
    return card.id === cardId;
  })[0] || null;
}

function getFlashcardsByDomain(domainId) {
  const extra = getUserFlashcardList();
  const all = FLASHCARDS.concat(extra);
  if (!domainId || domainId === "all") {
    return all.slice();
  }
  return all.filter(function (card) {
    return card.domain === domainId;
  });
}
