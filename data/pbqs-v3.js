var PBQS_V3 = [
  {
    id: "pbq009",
    type: "logs",
    domain: "operations",
    objective: "4.9",
    title: "Spot the suspicious log",
    prompt: "Which event is MOST suspicious, and what should happen FIRST?",
    logs: [
      "08:01 auth: user jlee success from 10.2.8.14",
      "08:03 vpn: user jlee success from 10.2.8.14",
      "08:04 auth: user jlee success from 185.22.11.9 (impossible travel vs 10.2.8.14)",
      "08:05 dhcp: renewed lease 10.2.8.14"
    ],
    options: [
      "Treat the DHCP renew as malware and isolate DHCP",
      "The second login from a distant IP after a local success is MOST suspicious — lock the account and verify with the user",
      "Ignore it; users roam constantly",
      "Wipe the laptop immediately"
    ],
    correctAnswer: 1,
    explanation: "Impossible travel after a valid local login is a credential-abuse signal. Contain the identity first."
  },
  {
    id: "pbq010",
    type: "rules",
    domain: "architecture",
    objective: "4.5",
    title: "Firewall rule rows",
    prompt: "Choose Allow or Deny for each proposed rule. Public web in DMZ needs HTTPS from the internet and SQL to an internal DB. The DB must not be internet-reachable.",
    rows: [
      { id: "r1", text: "Internet → DMZ-Web TCP 443" },
      { id: "r2", text: "Internet → Internal-DB TCP 5432" },
      { id: "r3", text: "DMZ-Web → Internal-DB TCP 5432" },
      { id: "r4", text: "Internet → DMZ-Web TCP 22" }
    ],
    choices: [
      { id: "allow", text: "Allow" },
      { id: "deny", text: "Deny" }
    ],
    correct: { r1: "allow", r2: "deny", r3: "allow", r4: "deny" },
    explanation: "Publish HTTPS only. The web tier may reach the DB. Direct internet-to-DB and internet SSH are unsafe."
  },
  {
    id: "pbq011",
    type: "scenario",
    domain: "general",
    objective: "1.4",
    title: "Certificate troubleshooting",
    prompt: "Browser error: name mismatch. Cert CN=shop.internal.example, site URL=shop.example.com, issuer=private CA, not expired. What is the MOST likely cause?",
    zones: ["CN shop.internal.example", "URL shop.example.com", "Private CA", "Not expired"],
    options: [
      "The certificate expired last night",
      "The hostname on the certificate does not match the name users type",
      "TLS 1.3 is disabled",
      "The site is using HTTP/2"
    ],
    correctAnswer: 1,
    explanation: "Name mismatch is a hostname/SAN problem, not expiry or HTTP version."
  },
  {
    id: "pbq012",
    type: "matching",
    domain: "operations",
    objective: "4.6",
    title: "Access control models",
    prompt: "Match each requirement to the BEST model.",
    left: [
      { id: "a", text: "Clearance and compartment labels on files" },
      { id: "b", text: "Job role packages for HR vs Finance" },
      { id: "c", text: "Owner decides who can read a folder" },
      { id: "d", text: "Rules like 'deny contractors after 18:00'" }
    ],
    right: [
      { id: "mac", text: "MAC" },
      { id: "rbac", text: "RBAC" },
      { id: "dac", text: "DAC" },
      { id: "abac", text: "ABAC / rule-based" }
    ],
    correct: { a: "mac", b: "rbac", c: "dac", d: "abac" },
    explanation: "Labels are MAC, jobs are RBAC, owners are DAC, contextual rules are ABAC."
  },
  {
    id: "pbq013",
    type: "categorization",
    domain: "architecture",
    objective: "3.3",
    title: "Data classification",
    prompt: "Place each data item in the BEST class.",
    items: [
      { id: "ssn", text: "Employee SSNs" },
      { id: "menu", text: "Public cafeteria menu" },
      { id: "roadmap", text: "Internal product roadmap" },
      { id: "secret", text: "Unreleased merger terms" }
    ],
    categories: [
      { id: "restricted", text: "Restricted / confidential" },
      { id: "public", text: "Public" },
      { id: "internal", text: "Internal" },
      { id: "highly", text: "Highly confidential" }
    ],
    correct: { ssn: "restricted", menu: "public", roadmap: "internal", secret: "highly" },
    explanation: "PII is restricted, menus are public, roadmaps are internal, deal terms are highly confidential."
  },
  {
    id: "pbq014",
    type: "ordering",
    domain: "operations",
    objective: "4.3",
    title: "Vulnerability remediation order",
    prompt: "Put these vulnerability-management steps in a sensible order.",
    items: [
      { id: "id", text: "Identify (scan / inventory)" },
      { id: "an", text: "Analyze and prioritize" },
      { id: "re", text: "Remediate or mitigate" },
      { id: "va", text: "Validate the fix" },
      { id: "rp", text: "Report to stakeholders" }
    ],
    correctOrder: ["id", "an", "re", "va", "rp"],
    explanation: "Find, rank, fix, prove, then report."
  },
  {
    id: "pbq015",
    type: "matching",
    domain: "governance",
    objective: "5.2",
    title: "Risk treatment",
    prompt: "Match each decision to the treatment type.",
    left: [
      { id: "a", text: "Buy cyber insurance" },
      { id: "b", text: "Turn off an unused service" },
      { id: "c", text: "Accept a low residual after documenting it" },
      { id: "d", text: "Move payroll processing to a specialist vendor" }
    ],
    right: [
      { id: "trans", text: "Transfer" },
      { id: "avoid", text: "Avoid" },
      { id: "accept", text: "Accept" },
      { id: "share", text: "Transfer / share" }
    ],
    correct: { a: "trans", b: "avoid", c: "accept", d: "share" },
    explanation: "Insurance and outsourcing transfer/share; disabling avoids; documented residual is acceptance."
  },
  {
    id: "pbq016",
    type: "scenario",
    domain: "operations",
    objective: "4.1",
    title: "Wireless security choice",
    prompt: "Guest Wi-Fi must be isolated from corp, use unique per-user credentials, and support current phones. Which setup is MOST appropriate?",
    zones: ["Internet", "Guest SSID", "Corp SSID", "Firewall"],
    options: [
      "Open guest SSID bridged onto corp VLAN",
      "WPA3-Enterprise corp SSID plus a captive-portal guest SSID on an isolated VLAN",
      "WEP on both SSIDs for compatibility",
      "Same PSK on guest and corp"
    ],
    correctAnswer: 1,
    explanation: "Isolate guests and keep corp on modern enterprise Wi-Fi."
  },
  {
    id: "pbq017",
    type: "multiSelect",
    domain: "architecture",
    objective: "3.2",
    title: "Zero Trust placement",
    prompt: "A contractor laptop on-site needs an internal app. Select ALL controls that fit Zero Trust.",
    options: [
      { id: "a", text: "Skip MFA because the user is in the building" },
      { id: "b", text: "SSO + device posture before the app" },
      { id: "c", text: "Microsegmentation so one app grant is not the whole LAN" },
      { id: "d", text: "Flat trust of the corp VLAN" }
    ],
    correct: ["b", "c"],
    explanation: "Location is not trust. Verify identity/device and limit blast radius."
  },
  {
    id: "pbq018",
    type: "matching",
    domain: "architecture",
    objective: "3.4",
    title: "Backup and recovery",
    prompt: "Match each need to the BEST control.",
    left: [
      { id: "a", text: "Need copies attackers cannot alter" },
      { id: "b", text: "Need a second metro site" },
      { id: "c", text: "Need to know how much data loss is tolerable" },
      { id: "d", text: "Need to know how fast service must return" }
    ],
    right: [
      { id: "imm", text: "Immutable / offline backups" },
      { id: "warm", text: "Warm/hot site" },
      { id: "rpo", text: "RPO" },
      { id: "rto", text: "RTO" }
    ],
    correct: { a: "imm", b: "warm", c: "rpo", d: "rto" },
    explanation: "Immutability protects backups; sites support continuity; RPO is data, RTO is time."
  },
  {
    id: "pbq019",
    type: "scenario",
    domain: "operations",
    objective: "4.8",
    title: "Endpoint response",
    prompt: "EDR shows ransomware encrypting a finance share from one laptop. What should the analyst do FIRST?",
    options: [
      "Start a full forensic image of every server",
      "Isolate the laptop and revoke its tokens, then assess spread",
      "Pay the ransom immediately",
      "Announce on social media"
    ],
    correctAnswer: 1,
    explanation: "Contain the infected endpoint and identity first."
  },
  {
    id: "pbq020",
    type: "categorization",
    domain: "architecture",
    objective: "3.1",
    title: "Cloud shared responsibility",
    prompt: "In IaaS, who is typically responsible?",
    items: [
      { id: "hw", text: "Datacenter power and cages" },
      { id: "os", text: "Guest OS patching" },
      { id: "iam", text: "Tenant IAM and data classification" },
      { id: "hyp", text: "Hypervisor of the cloud fabric" }
    ],
    categories: [
      { id: "csp", text: "Cloud provider" },
      { id: "cust", text: "Customer" }
    ],
    correct: { hw: "csp", os: "cust", iam: "cust", hyp: "csp" },
    explanation: "Provider runs the facility and fabric. You still patch guests and own identity/data."
  }
];

PBQS_V3.forEach(function (p) { PBQS.push(p); });
