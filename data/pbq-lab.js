/**
 * ORIGINAL fake PBQs for renderer development. Not purchased exam content.
 */
var PBQ_LAB = [
  {
    id: "lab-match-001",
    title: "Control types (fake)",
    kind: "matching",
    objective: "1.1",
    source: "Original lab",
    explanation: "Match the example to the control type.",
    left: [
      { id: "cam", text: "Security camera" },
      { id: "policy", text: "Acceptable use policy" },
      { id: "av", text: "Antivirus" }
    ],
    right: [
      { id: "det", text: "Detective" },
      { id: "dir", text: "Directive" },
      { id: "prev", text: "Preventive" }
    ],
    correct: { cam: "det", policy: "dir", av: "prev" }
  },
  {
    id: "lab-order-001",
    title: "IR order (fake)",
    kind: "ordering",
    objective: "4.8",
    source: "Original lab",
    explanation: "Use the SY0-701 incident-response order.",
    items: [
      { id: "a", text: "Preparation" },
      { id: "b", text: "Detection and analysis" },
      { id: "c", text: "Containment, eradication, and recovery" },
      { id: "d", text: "Post-incident activity" }
    ],
    correctOrder: ["a", "b", "c", "d"]
  },
  {
    id: "lab-fw-001",
    title: "Allow HTTPS inbound (fake)",
    kind: "firewall",
    objective: "3.2",
    source: "Original lab",
    explanation: "Permit inbound TCP 443 from any to the web server.",
    slots: [{ id: "r1", label: "Rule 1" }],
    fieldOptions: {
      action: ["allow", "deny"],
      protocol: ["tcp", "udp", "any"],
      source: ["any", "10.0.0.0/8"],
      destination: ["web-server", "any"],
      port: ["22", "80", "443"]
    },
    correct: { r1: { action: "allow", protocol: "tcp", source: "any", destination: "web-server", port: "443" } }
  },
  {
    id: "lab-drop-001",
    title: "Select the control (fake)",
    kind: "dropdown",
    objective: "1.2",
    source: "Original lab",
    explanation: "MFA is something you have plus something you know.",
    stems: [
      { id: "s1", text: "Password + hardware token", options: [
        { id: "mfa", text: "MFA" },
        { id: "sso", text: "SSO" },
        { id: "pam", text: "PAM" }
      ] }
    ],
    correct: { s1: "mfa" }
  },
  {
    id: "lab-class-001",
    title: "Classify the data (fake)",
    kind: "classification",
    objective: "5.1",
    source: "Original lab",
    explanation: "SSN is sensitive personal data; a public brochure is public.",
    items: [
      { id: "ssn", text: "Social Security number" },
      { id: "brochure", text: "Marketing brochure" }
    ],
    buckets: [
      { id: "restricted", label: "Restricted" },
      { id: "public", label: "Public" }
    ],
    correct: { ssn: "restricted", brochure: "public" }
  },
  {
    id: "lab-diagram-001",
    title: "Place the firewall (fake)",
    kind: "diagram",
    objective: "3.1",
    source: "Original lab",
    explanation: "The firewall sits between the internet and the LAN.",
    nodes: [
      { id: "inet", label: "Internet" },
      { id: "fw", label: "Firewall" },
      { id: "lan", label: "LAN" }
    ],
    prompts: [
      {
        id: "edge",
        text: "Which device is the network edge control?",
        options: [
          { id: "fw", text: "Firewall" },
          { id: "lan", text: "LAN switch" }
        ]
      }
    ],
    correct: { edge: "fw" }
  },
  {
    id: "lab-multi-001",
    title: "Two-part lab (fake)",
    kind: "multipart",
    objective: "4.4",
    source: "Original lab",
    explanation: "Identify the log source, then pick the first response.",
    parts: [
      {
        kind: "dropdown",
        stems: [{ id: "src", text: "Which log shows failed VPN logons?", options: [
          { id: "auth", text: "Authentication log" },
          { id: "dhcp", text: "DHCP log" }
        ] }],
        correct: { src: "auth" }
      },
      {
        kind: "ordering",
        items: [
          { id: "a", text: "Isolate the account" },
          { id: "b", text: "Document the incident" }
        ],
        correctOrder: ["a", "b"]
      }
    ]
  }
];
