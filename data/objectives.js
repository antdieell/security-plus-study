/**
 * SY0-701 objective map — central reference for questions, study, PBQs, analytics.
 * Domain IDs stay: general | threats | architecture | operations | governance
 */
var OBJECTIVE_MAP = [
  {
    domain: "general",
    number: "1",
    name: "General Security Concepts",
    weight: 0.12,
    objectives: [
      { id: "1.1", title: "Compare and contrast various types of security controls", subtopics: ["control categories", "control types", "preventive detective corrective", "physical technical managerial"] },
      { id: "1.2", title: "Summarize fundamental security concepts", subtopics: ["CIA", "AAA", "Zero Trust", "least privilege", "gap analysis", "physical security"] },
      { id: "1.3", title: "Explain the importance of change management processes", subtopics: ["approvals", "impact analysis", "backout", "documentation", "version control"] },
      { id: "1.4", title: "Explain the importance of using appropriate cryptographic solutions", subtopics: ["symmetric asymmetric", "hashing", "PKI", "certificates", "encryption tools"] }
    ]
  },
  {
    domain: "threats",
    number: "2",
    name: "Threats, Vulnerabilities, and Mitigations",
    weight: 0.22,
    objectives: [
      { id: "2.1", title: "Compare and contrast common threat actors and motivations", subtopics: ["nation-state", "insider", "hacktivist", "organized crime", "shadow IT"] },
      { id: "2.2", title: "Explain common threat vectors and attack surfaces", subtopics: ["phishing", "unsecured networks", "vulnerable software", "supply chain", "social engineering"] },
      { id: "2.3", title: "Explain various types of vulnerabilities", subtopics: ["application", "OS", "hardware", "cloud", "misconfiguration", "zero-day"] },
      { id: "2.4", title: "Given a scenario, analyze indicators of malicious activity", subtopics: ["malware", "password attacks", "network attacks", "application attacks", "physical attacks"] },
      { id: "2.5", title: "Explain the purpose of mitigation techniques", subtopics: ["segmentation", "isolation", "patching", "encryption", "hardening", "monitoring"] }
    ]
  },
  {
    domain: "architecture",
    number: "3",
    name: "Security Architecture",
    weight: 0.18,
    objectives: [
      { id: "3.1", title: "Compare and contrast security implications of different architecture models", subtopics: ["cloud", "on-prem", "hybrid", "IoT ICS", "virtualization", "serverless"] },
      { id: "3.2", title: "Given a scenario, apply security principles to secure enterprise infrastructure", subtopics: ["network appliances", "ports protocols", "secure access", "selection of controls"] },
      { id: "3.3", title: "Compare and contrast concepts and strategies to protect data", subtopics: ["data types", "states", "classification", "methods", "geographic restrictions"] },
      { id: "3.4", title: "Explain the importance of resilience and recovery in security architecture", subtopics: ["high availability", "site considerations", "backups", "power", "testing"] }
    ]
  },
  {
    domain: "operations",
    number: "4",
    name: "Security Operations",
    weight: 0.28,
    objectives: [
      { id: "4.1", title: "Given a scenario, apply common security techniques to computing resources", subtopics: ["secure baselines", "hardening", "wireless", "mobile", "application security"] },
      { id: "4.2", title: "Explain the security implications of proper hardware, software, and data asset management", subtopics: ["acquisition", "assignment", "monitoring", "disposal", "sanitization"] },
      { id: "4.3", title: "Explain various activities associated with vulnerability management", subtopics: ["identification", "analysis", "remediation", "validation", "reporting"] },
      { id: "4.4", title: "Explain security alerting and monitoring concepts and tools", subtopics: ["monitoring", "SIEM", "SNMP", "NetFlow", "alert response"] },
      { id: "4.5", title: "Given a scenario, modify enterprise capabilities to enhance security", subtopics: ["firewall", "IDS IPS", "WAF", "EDR", "DLP", "NAC"] },
      { id: "4.6", title: "Given a scenario, implement and maintain identity and access management", subtopics: ["provisioning", "SSO", "federation", "MFA", "passwordless", "PAM"] },
      { id: "4.7", title: "Explain the importance of automation and orchestration related to secure operations", subtopics: ["scripting", "APIs", "SOAR", "guardrails", "use cases"] },
      { id: "4.8", title: "Explain appropriate incident response activities", subtopics: ["process", "training", "root cause", "threat hunting", "digital forensics"] },
      { id: "4.9", title: "Given a scenario, use data sources to support an investigation", subtopics: ["logs", "packet captures", "vulnerability scans", "dashboards"] }
    ]
  },
  {
    domain: "governance",
    number: "5",
    name: "Security Program Management and Oversight",
    weight: 0.20,
    objectives: [
      { id: "5.1", title: "Summarize elements of effective security governance", subtopics: ["policies", "standards", "procedures", "external considerations", "roles"] },
      { id: "5.2", title: "Explain elements of the risk management process", subtopics: ["risk identification", "assessment", "analysis", "register", "treatment"] },
      { id: "5.3", title: "Explain the processes associated with third-party risk assessment and management", subtopics: ["vendor assessment", "agreements", "right to audit", "supply chain"] },
      { id: "5.4", title: "Summarize elements of effective security compliance", subtopics: ["compliance", "privacy", "attestation", "acknowledgement"] },
      { id: "5.5", title: "Explain types and purposes of audits and assessments", subtopics: ["internal", "external", "penetration test", "internal audit", "attestation"] },
      { id: "5.6", title: "Given a scenario, implement security awareness practices", subtopics: ["phishing campaigns", "anomalous behavior", "user guidance", "reporting"] }
    ]
  }
];

function getObjectiveMapEntry(objectiveId) {
  for (let i = 0; i < OBJECTIVE_MAP.length; i += 1) {
    const found = OBJECTIVE_MAP[i].objectives.filter(function (obj) { return obj.id === objectiveId; })[0];
    if (found) {
      return { domain: OBJECTIVE_MAP[i].domain, domainNumber: OBJECTIVE_MAP[i].number, objective: found };
    }
  }
  return null;
}

function getObjectiveTitle(objectiveId) {
  const entry = getObjectiveMapEntry(objectiveId);
  return entry ? entry.objective.title : objectiveId;
}

function getObjectivesForDomain(domainId) {
  const group = OBJECTIVE_MAP.filter(function (row) { return row.domain === domainId; })[0];
  return group ? group.objectives.slice() : [];
}

function getAllObjectiveIds() {
  const ids = [];
  OBJECTIVE_MAP.forEach(function (group) {
    group.objectives.forEach(function (obj) { ids.push(obj.id); });
  });
  return ids;
}

function getObjectiveDomainId(objectiveId) {
  const entry = getObjectiveMapEntry(objectiveId);
  return entry ? entry.domain : null;
}

/**
 * V2 used a shortened Domain 4 numbering. Remap once from the original tag.
 * Do not chain remaps.
 */
var LEGACY_OBJECTIVE_REMAP = {
  "4.2": "4.3",
  "4.3": "4.4",
  "4.4": "4.6",
  "4.5": "4.7",
  "4.6": "4.8"
};

function remapLegacyObjective(objectiveId) {
  if (!objectiveId) {
    return objectiveId;
  }
  return LEGACY_OBJECTIVE_REMAP[objectiveId] || objectiveId;
}
