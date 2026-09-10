/**
 * Security+ domain configuration.
 * Update this file when CompTIA revises exam domains.
 * Questions, flashcards, and study topics reference domain IDs — not display names.
 */
var DOMAINS = [
  {
    id: "general",
    name: "General Security Concepts",
    shortName: "General Concepts",
    number: "1.0",
    description: "Security controls, fundamental principles, cryptographic basics, and change management.",
    examWeight: "12%",
    weight: 0.12
  },
  {
    id: "threats",
    name: "Threats, Vulnerabilities, and Mitigations",
    shortName: "Threats & Vulnerabilities",
    number: "2.0",
    description: "Attack types, vulnerability classes, social engineering, and practical mitigations.",
    examWeight: "22%",
    weight: 0.22
  },
  {
    id: "architecture",
    name: "Security Architecture",
    shortName: "Architecture",
    number: "3.0",
    description: "Secure network and system design, segmentation, cloud models, and infrastructure controls.",
    examWeight: "18%",
    weight: 0.18
  },
  {
    id: "operations",
    name: "Security Operations",
    shortName: "Operations",
    number: "4.0",
    description: "Monitoring, detection, incident response, identity, and day-to-day security processes.",
    examWeight: "28%",
    weight: 0.28
  },
  {
    id: "governance",
    name: "Security Program Management and Oversight",
    shortName: "Governance",
    number: "5.0",
    description: "Risk, governance, compliance, privacy, audits, and third-party oversight.",
    examWeight: "20%",
    weight: 0.20
  }
];

function getDomainById(domainId) {
  return DOMAINS.find(function (domain) {
    return domain.id === domainId;
  }) || null;
}

function getDomainName(domainId) {
  const domain = getDomainById(domainId);
  return domain ? domain.name : domainId;
}

function getDomainShortName(domainId) {
  const domain = getDomainById(domainId);
  return domain ? domain.shortName : domainId;
}
