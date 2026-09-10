var PBQS = [
  {
    id: "pbq001",
    type: "ordering",
    domain: "operations",
    objective: "4.6",
    title: "Incident response order",
    prompt: "Put these incident response activities in the typical order used on Security+.",
    items: [
      { id: "prep", text: "Preparation (playbooks, contacts, tooling)" },
      { id: "detect", text: "Detection and analysis" },
      { id: "contain", text: "Containment" },
      { id: "eradicate", text: "Eradication" },
      { id: "recover", text: "Recovery" },
      { id: "lessons", text: "Lessons learned" }
    ],
    correctOrder: ["prep", "detect", "contain", "eradicate", "recover", "lessons"],
    explanation: "You prepare before an incident, detect, contain spread, remove footholds, restore, then capture lessons."
  },
  {
    id: "pbq002",
    type: "matching",
    domain: "general",
    objective: "1.1",
    title: "Match controls to scenarios",
    prompt: "Match each scenario to the BEST control type.",
    left: [
      { id: "a", text: "Badge reader on the data-center door" },
      { id: "b", text: "SIEM alert on impossible travel" },
      { id: "c", text: "Restore from immutable backup after ransomware" },
      { id: "d", text: "Policy that forbids sharing passwords" }
    ],
    right: [
      { id: "preventive", text: "Preventive" },
      { id: "detective", text: "Detective" },
      { id: "corrective", text: "Corrective" },
      { id: "directive", text: "Directive" }
    ],
    correct: { a: "preventive", b: "detective", c: "corrective", d: "directive" },
    explanation: "Locks/badges prevent, SIEM detects, restores correct, policies direct behavior."
  },
  {
    id: "pbq003",
    type: "matching",
    domain: "operations",
    objective: "4.1",
    title: "Match ports and protocols",
    prompt: "Match each protocol to its default port.",
    left: [
      { id: "ssh", text: "SSH" },
      { id: "https", text: "HTTPS" },
      { id: "rdp", text: "RDP" },
      { id: "ldaps", text: "LDAPS" }
    ],
    right: [
      { id: "22", text: "22" },
      { id: "443", text: "443" },
      { id: "3389", text: "3389" },
      { id: "636", text: "636" }
    ],
    correct: { ssh: "22", https: "443", rdp: "3389", ldaps: "636" },
    explanation: "SSH 22, HTTPS 443, RDP 3389, LDAPS 636."
  },
  {
    id: "pbq004",
    type: "multiSelect",
    domain: "architecture",
    objective: "3.2",
    title: "Select firewall rules",
    prompt: "A public web server in a DMZ must serve HTTPS to the internet and reach an internal database on 5432. The database must NOT be reachable from the internet. Select ALL rules that should be allowed.",
    options: [
      { id: "a", text: "Internet → DMZ web :443" },
      { id: "b", text: "Internet → internal DB :5432" },
      { id: "c", text: "DMZ web → internal DB :5432" },
      { id: "d", text: "Internet → DMZ web :22" }
    ],
    correct: ["a", "c"],
    explanation: "HTTPS to the website is required. The web tier may talk to the database. Direct internet-to-database and exposing SSH to the world are unsafe."
  },
  {
    id: "pbq005",
    type: "scenario",
    domain: "architecture",
    objective: "3.2",
    title: "Identify the unsafe connection",
    prompt: "A simplified network: Internet — Firewall — DMZ (web) — Internal (app) — Database. Which connection is MOST unsafe if it exists?",
    zones: ["Internet", "Firewall", "DMZ / Web", "Internal app", "Database"],
    options: [
      "Internet users reach the web server on 443 through the firewall",
      "The web server reaches the app tier on a private port",
      "The app tier reaches the database on a private port",
      "The database has a public IP and accepts 5432 from the internet"
    ],
    correctAnswer: 3,
    explanation: "A publicly reachable database bypasses the screened-subnet design and is the unsafe link."
  },
  {
    id: "pbq006",
    type: "matching",
    domain: "operations",
    objective: "4.4",
    title: "Match authentication to requirements",
    prompt: "Match each requirement to the MOST appropriate method.",
    left: [
      { id: "a", text: "Phishing-resistant admin login" },
      { id: "b", text: "Workforce SSO to many SaaS apps" },
      { id: "c", text: "Something you are at a laptop" },
      { id: "d", text: "One-time code from an authenticator app" }
    ],
    right: [
      { id: "fido", text: "FIDO2 / security key" },
      { id: "fed", text: "Federation / SAML or OIDC" },
      { id: "bio", text: "Biometric (something you are)" },
      { id: "totp", text: "TOTP (something you have)" }
    ],
    correct: { a: "fido", b: "fed", c: "bio", d: "totp" },
    explanation: "FIDO2 resists phishing, federation enables SSO, biometrics are inherence, TOTP is a possession factor."
  },
  {
    id: "pbq007",
    type: "categorization",
    domain: "general",
    objective: "1.1",
    title: "Categorize security controls",
    prompt: "Place each control in the BEST category.",
    items: [
      { id: "cam", text: "CCTV covering the lobby" },
      { id: "lock", text: "Mantrap at the DC entrance" },
      { id: "aup", text: "Acceptable use policy" },
      { id: "restore", text: "Restore from backup" }
    ],
    categories: [
      { id: "detective", text: "Detective" },
      { id: "preventive", text: "Preventive" },
      { id: "directive", text: "Directive" },
      { id: "corrective", text: "Corrective" }
    ],
    correct: { cam: "detective", lock: "preventive", aup: "directive", restore: "corrective" },
    explanation: "Cameras detect, mantraps prevent, policies direct, restores correct."
  },
  {
    id: "pbq008",
    type: "matching",
    domain: "threats",
    objective: "2.5",
    title: "Choose mitigations for systems",
    prompt: "Match each problem to the BEST mitigation.",
    left: [
      { id: "a", text: "SQL injection in a search box" },
      { id: "b", text: "Laptop lost with customer lists" },
      { id: "c", text: "Password spraying against VPN" },
      { id: "d", text: "Phishing emails reaching inboxes" }
    ],
    right: [
      { id: "param", text: "Parameterized queries" },
      { id: "fde", text: "Full-disk encryption" },
      { id: "mfa", text: "MFA plus lockout/throttling" },
      { id: "gw", text: "Secure email gateway + user training" }
    ],
    correct: { a: "param", b: "fde", c: "mfa", d: "gw" },
    explanation: "Each mitigation maps to the failure mode: input handling, data-at-rest, online guessing, and email social engineering."
  }
];
