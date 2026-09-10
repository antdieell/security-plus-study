/**
 * Concise Security+ study topics.
 * Add new objects here — the Study view renders whatever is in this array.
 */
var STUDY_TOPICS = [
  {
    id: "cia-triad",
    domain: "general",
    title: "CIA Triad",
    searchTerms: ["cia", "confidentiality", "integrity", "availability"],
    summary: "The three foundational security goals used to classify impact.",
    explanation: "Every control you study maps back to protecting one or more of these goals. Exam questions often describe an incident and ask which goal was harmed.",
    concepts: [
      "Confidentiality: only authorized people can read the data (encryption, access control).",
      "Integrity: data is not altered improperly (hashing, signing, change control).",
      "Availability: systems work when needed (redundancy, backups, DDoS defense)."
    ],
    examTip: "Match the story: stolen SSNs → confidentiality; altered payroll → integrity; crashed portal → availability.",
    example: "A ransomware event can hit integrity (files changed) and availability (you cannot open them)."
  },
  {
    id: "aaa",
    domain: "general",
    title: "AAA",
    searchTerms: ["aaa", "authentication", "authorization", "accounting"],
    summary: "Identity is prove, permit, and record.",
    explanation: "Do not mix up a failed login with a successful login that still cannot access a resource.",
    concepts: [
      "Authentication: prove identity (password, token, biometric).",
      "Authorization: decide permissions after identity is known.",
      "Accounting: log and audit activity (who did what, when)."
    ],
    examTip: "Help desk authenticates but cannot open HR files = authorization.",
    example: "VPN login succeeds (authn), group policy blocks finance shares (authz), SIEM records the denial (acct)."
  },
  {
    id: "zero-trust",
    domain: "general",
    title: "Zero Trust",
    searchTerms: ["zero trust", "never trust", "microsegmentation"],
    summary: "Do not trust location. Verify every request.",
    explanation: "Internal networks are not automatically safe. Identity, device health, and least privilege matter on every hop.",
    concepts: [
      "Assume breach.",
      "Authenticate and authorize continuously.",
      "Segment networks so one foothold is not the whole kingdom."
    ],
    examTip: "Skipping MFA because someone is “on LAN” is the opposite of Zero Trust.",
    example: "A contractor on-site still uses SSO + device compliance checks to reach an app."
  },
  {
    id: "least-privilege",
    domain: "general",
    title: "Least Privilege",
    searchTerms: ["least privilege", "jit", "just in time"],
    summary: "Minimum rights, minimum time.",
    explanation: "Standing admin rights turn every phishing click into a domain-wide incident.",
    concepts: [
      "Need-to-know for data.",
      "Just-in-time elevation instead of permanent admin.",
      "Service accounts with narrow scopes."
    ],
    examTip: "Interns should get time-bound read access, not Domain Admins.",
    example: "A developer gets prod SSH for a change window, then the grant expires."
  },
  {
    id: "defense-in-depth",
    domain: "general",
    title: "Defense in Depth",
    searchTerms: ["defense in depth", "layered", "layers"],
    summary: "Stack independent controls.",
    explanation: "Email filters miss some phishing. EDR, training, and segmentation catch what remains.",
    concepts: [
      "Preventive, detective, and corrective layers.",
      "People, process, and technology.",
      "No single “silver bullet.”"
    ],
    examTip: "A list of different control types working together is usually defense in depth.",
    example: "Spam filter + MFA + EDR + backups all address ransomware differently."
  },
  {
    id: "auth-factors",
    domain: "general",
    title: "Authentication Factors",
    searchTerms: ["mfa", "factors", "biometric", "totp", "smart card"],
    summary: "Know, have, are — plus context.",
    explanation: "MFA means two different factor types, not two passwords.",
    concepts: [
      "Knowledge: password, PIN.",
      "Possession: phone, hardware key, smart card.",
      "Inherence: fingerprint, face.",
      "Somewhere you are can be an extra signal, not always a full factor."
    ],
    examTip: "TOTP is something you have (the device), not something you are.",
    example: "Password + FIDO2 key is strong MFA; password + security question is still mostly knowledge."
  },
  {
    id: "encryption-hashing",
    domain: "general",
    title: "Encryption, Hashing, and Signatures",
    searchTerms: ["encryption", "hashing", "digital signature", "sha", "aes"],
    summary: "Confidentiality vs integrity vs authenticity.",
    explanation: "Pick the tool that matches the goal. Mixing them is a common wrong answer.",
    concepts: [
      "Encrypt to hide data (reversible with a key).",
      "Hash to detect change (one-way).",
      "Sign with a private key so others can verify with the public key."
    ],
    examTip: "“Confirm the ISO was not altered” = hash. “Prove the vendor approved it” = signature.",
    example: "TLS uses both crypto (keys) and certificates (PKI) to protect a session."
  },
  {
    id: "pki-certs",
    domain: "architecture",
    title: "PKI and Certificates",
    searchTerms: ["pki", "certificate", "ca", "crl", "ocsp"],
    summary: "How we bind keys to identities.",
    explanation: "A CA vouches that a public key belongs to a site or person. Revocation tells the world a cert is no longer trusted.",
    concepts: [
      "Certificate Authority issues and signs certificates.",
      "CRL and OCSP publish revocation status.",
      "Trust depends on the CA being in the trust store."
    ],
    examTip: "Unknown CA in the browser can mean intercept or mis-issuance — do not ignore it.",
    example: "Stolen laptop cert for VPN should be revoked immediately."
  },
  {
    id: "tls-vpns",
    domain: "architecture",
    title: "TLS and VPNs",
    searchTerms: ["tls", "https", "vpn", "ipsec", "remote access"],
    summary: "Protecting data as it crosses untrusted networks.",
    explanation: "TLS typically protects an application session (browser to site). VPNs often protect a tunnel for many applications.",
    concepts: [
      "TLS authenticates the server (usually) and encrypts the channel.",
      "Remote-access VPN: user to network.",
      "Site-to-site VPN: network to network."
    ],
    examTip: "Remote staff + internal file shares → remote-access VPN.",
    example: "HTTPS to a bank uses TLS; a road warrior connecting to AD file shares uses a VPN."
  },
  {
    id: "access-models",
    domain: "architecture",
    title: "RBAC, ABAC, DAC, MAC",
    searchTerms: ["rbac", "abac", "dac", "mac", "access control"],
    summary: "Four ways systems decide who gets in.",
    explanation: "Learn the decision-maker: roles, attributes, owner, or system labels.",
    concepts: [
      "RBAC: permissions on roles/groups.",
      "ABAC: policy on attributes (dept, time, device).",
      "DAC: owner sets ACLs.",
      "MAC: OS enforces labels/clearances."
    ],
    examTip: "If the owner can share a folder with anyone, that is DAC, not MAC.",
    example: "“Finance + compliant laptop + business hours” is ABAC language."
  },
  {
    id: "firewalls-ids-ips",
    domain: "architecture",
    title: "Firewalls, IDS, and IPS",
    searchTerms: ["firewall", "ids", "ips", "ngfw", "waf"],
    summary: "Policy enforcement vs detect vs block.",
    explanation: "Know where the box sits and whether it can drop traffic.",
    concepts: [
      "Firewall: allow/deny based on policy (NGFW can be app-aware).",
      "IDS: watch and alert (usually not inline blocking).",
      "IPS: inline, can prevent."
    ],
    examTip: "“Alerts but does not block” = IDS.",
    example: "A tap/span port feeding alerts is classic IDS placement."
  },
  {
    id: "segmentation",
    domain: "architecture",
    title: "VLANs, DMZ, NAC, Proxies",
    searchTerms: ["vlan", "dmz", "nac", "proxy", "screened subnet"],
    summary: "Architecture patterns that limit blast radius.",
    explanation: "Put internet-facing systems in a screened subnet. Segment users. Check device health at the door. Inspect outbound web if needed.",
    concepts: [
      "VLANs: logical LAN segments.",
      "DMZ: public services away from internal AD.",
      "NAC: posture check and quarantine.",
      "Forward proxy: outbound web control and logging."
    ],
    examTip: "Public web server next to domain controllers is a bad design.",
    example: "Guest Wi-Fi on its own VLAN cannot reach finance servers."
  },
  {
    id: "phishing-family",
    domain: "threats",
    title: "Phishing, Smishing, and Vishing",
    searchTerms: ["phishing", "smishing", "vishing", "bec", "social engineering"],
    summary: "Same trick, different channel.",
    explanation: "Social engineering exploits trust and urgency. Channel names are easy points if you memorize them.",
    concepts: [
      "Phishing: email.",
      "Smishing: SMS.",
      "Vishing: voice.",
      "Whaling: big-target (often exec) phishing."
    ],
    examTip: "Look at the delivery method first, then the goal (credentials, malware, wire fraud).",
    example: "Fake CFO phone call requesting a wire is vishing."
  },
  {
    id: "password-attacks",
    domain: "threats",
    title: "Password Spraying, Stuffing, Brute Force",
    searchTerms: ["password spraying", "credential stuffing", "brute force"],
    summary: "Three guessing strategies, three log signatures.",
    explanation: "Read the pattern: many users/few passwords vs stolen pairs vs one account hammered.",
    concepts: [
      "Spray: common password, many usernames, slow to dodge lockout.",
      "Stuffing: leaked pairs from elsewhere (reuse).",
      "Brute force: many guesses at one target."
    ],
    examTip: "MFA blunts all three for online apps.",
    example: "“Welcome123 against 2,000 accounts” is spraying."
  },
  {
    id: "network-attacks",
    domain: "threats",
    title: "DDoS, On-path, Replay",
    searchTerms: ["ddos", "mitm", "on-path", "replay"],
    summary: "Attacks against availability and the path between two hosts.",
    explanation: "DDoS knocks you down. On-path sits in the middle. Replay reuses a captured valid message.",
    concepts: [
      "DDoS: availability.",
      "On-path: intercept/modify.",
      "Replay: reuse tokens/messages."
    ],
    examTip: "Short-lived tokens and nonces are the replay answer.",
    example: "Coffee-shop Wi-Fi intercepting banking HTTP would be on-path."
  },
  {
    id: "app-attacks",
    domain: "threats",
    title: "SQL Injection and XSS",
    searchTerms: ["sql injection", "xss", "sqli", "cross site"],
    summary: "Untrusted input becomes code.",
    explanation: "SQLi attacks the database. XSS attacks other users’ browsers through your site.",
    concepts: [
      "SQLi: concatenate input into SQL — use parameterized queries.",
      "XSS: inject script — encode output, use CSP.",
      "Never trust the client."
    ],
    examTip: "`OR 1=1` in a search box is SQLi. Stored `<script>` is XSS.",
    example: "A comment field that pops an alert for every visitor is stored XSS."
  },
  {
    id: "ransomware",
    domain: "threats",
    title: "Ransomware",
    searchTerms: ["ransomware", "extortion", "encrypt"],
    summary: "Availability (and often confidentiality) hostage event.",
    explanation: "Modern crews steal data first, then encrypt. Paying is not a recovery plan.",
    concepts: [
      "Isolate infected systems.",
      "Restore from offline/immutable backups.",
      "Preserve evidence when possible."
    ],
    examTip: "Best recovery = known-good isolated backups, not “reboot once.”",
    example: "If backup shares were mounted with domain admin, they may be encrypted too — hence offline copies."
  },
  {
    id: "siem-soar-edr",
    domain: "operations",
    title: "SIEM, SOAR, and EDR",
    searchTerms: ["siem", "soar", "edr", "xdr"],
    summary: "See it, automate it, hunt it on the endpoint.",
    explanation: "These tools work together. Confusing the acronyms is an easy missed question.",
    concepts: [
      "SIEM: log correlation and alerting.",
      "SOAR: playbook automation.",
      "EDR: endpoint telemetry and response."
    ],
    examTip: "Auto-isolate after an alert = SOAR (or EDR action triggered by a playbook).",
    example: "Firewall + Okta + EDR logs land in the SIEM; a playbook then tickets and isolates."
  },
  {
    id: "dns-security",
    domain: "operations",
    title: "DNS Security",
    searchTerms: ["dns", "dnssec", "poisoning"],
    summary: "If name resolution lies, users go to the attacker.",
    explanation: "Protect recursive resolvers, consider DNS filtering, and use DNSSEC where practical.",
    concepts: [
      "DNS spoofing/poisoning feeds false answers.",
      "DNSSEC signs records.",
      "DoH/DoT can encrypt client DNS (know the tradeoffs for enterprise filtering)."
    ],
    examTip: "Integrity of DNS answers → DNSSEC.",
    example: "A poisoned record for bank.example sends users to a phishing IP."
  },
  {
    id: "incident-response",
    domain: "operations",
    title: "Incident Response",
    searchTerms: ["incident", "containment", "ir", "playbook"],
    summary: "Stop the bleeding, then clean up, then learn.",
    explanation: "Order matters. You cannot jump to lessons learned while the worm is still spreading.",
    concepts: [
      "Preparation before the incident.",
      "Detect and analyze.",
      "Contain, eradicate, recover.",
      "Lessons learned."
    ],
    examTip: "Still spreading → containment.",
    example: "Pull a host from the network, then image if needed, then rebuild."
  },
  {
    id: "backups-rto-rpo",
    domain: "operations",
    title: "Backups, RTO, and RPO",
    searchTerms: ["backup", "rto", "rpo", "3-2-1"],
    summary: "How fast you return, and how much data you can lose.",
    explanation: "RTO is a clock for downtime. RPO is a clock for data loss. Backups must survive the same attacker who hit production.",
    concepts: [
      "3-2-1 style thinking: copies, media types, one offsite/offline.",
      "Test restores or you do not have backups.",
      "Immutable or air-gapped copies vs ransomware."
    ],
    examTip: "Max downtime = RTO. Max data loss = RPO.",
    example: "Billing down ≤ 4 hours and ≤ 15 minutes of lost sales = RTO 4h, RPO 15m."
  },
  {
    id: "risk-management",
    domain: "governance",
    title: "Risk Management",
    searchTerms: ["risk", "residual", "inherent", "ale", "qualitative"],
    summary: "Identify, treat, and accept leftover risk.",
    explanation: "You mitigate, transfer, avoid, or accept. Residual risk is what remains after treatment.",
    concepts: [
      "Inherent vs residual.",
      "Qualitative: high/medium/low.",
      "Quantitative: numbers such as ALE."
    ],
    examTip: "After controls = residual risk.",
    example: "Insurance transfers some ransomware financial impact but not all operational pain."
  },
  {
    id: "bcp-dr",
    domain: "governance",
    title: "Business Continuity and Disaster Recovery",
    searchTerms: ["bcp", "dr", "hot site", "cold site", "warm site"],
    summary: "Keep the business alive; restore the tech.",
    explanation: "DR sites are a spectrum of cost vs recovery speed.",
    concepts: [
      "BCP: business functions.",
      "DR: IT recovery.",
      "Hot / warm / cold sites."
    ],
    examTip: "Hardware and data ready in hours → hot site.",
    example: "Paper process for invoicing during an outage is BCP; restoring the ERP is DR."
  },
  {
    id: "oversight",
    domain: "governance",
    title: "Vendors, Tests, and Exercises",
    searchTerms: ["vendor", "third party", "pentest", "vulnerability scan", "tabletop", "sla", "nda", "aup"],
    summary: "Oversight is how programs stay honest.",
    explanation: "Scans find potential issues. Pentests prove impact with permission. Tabletops practice decisions. Contracts set rules.",
    concepts: [
      "Due diligence on vendors who touch sensitive data.",
      "Vulnerability scan ≠ penetration test.",
      "SLA uptime vs NDA secrecy vs AUP user rules."
    ],
    examTip: "99.9% uptime credits = SLA.",
    example: "A paper ransomware walkthrough with executives is a tabletop, not a live failover."
  }
];

function getTopicById(topicId) {
  return STUDY_TOPICS.find(function (topic) {
    return topic.id === topicId;
  }) || null;
}

function getTopicsByDomain(domainId) {
  return STUDY_TOPICS.filter(function (topic) {
    return topic.domain === domainId;
  });
}

function searchTopics(query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) {
    return STUDY_TOPICS.slice();
  }
  return STUDY_TOPICS.filter(function (topic) {
    const haystack = [
      topic.title,
      topic.summary,
      topic.explanation,
      (topic.searchTerms || []).join(" "),
      (topic.concepts || []).join(" ")
    ].join(" ").toLowerCase();
    return haystack.indexOf(needle) !== -1;
  });
}
