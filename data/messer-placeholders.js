/**
 * FAKE placeholder items so the Messer A/B/C UI can be exercised.
 * Not purchased Professor Messer content. Replace via private-data/messer-questions.json
 * after authentication on the deployed host.
 */
var MESSER_PLACEHOLDERS = [
  {
    id: "messer-a-001",
    source: "messer",
    exam: "A",
    placeholder: true,
    type: "multiple-choice",
    question: "PLACEHOLDER Exam A. A receptionist is asked for the building access code over the phone. Which control type is the BEST immediate response?",
    choices: ["Technical", "Operational", "Managerial", "Physical"],
    correctAnswer: 1,
    explanation: "Placeholder: verifying identity before sharing a code is an operational process control.",
    incorrectExplanations: {
      "0": "Placeholder: a technical control would be a system, not the staff process.",
      "2": "Placeholder: managerial controls are policies, not the live response.",
      "3": "Placeholder: a lock is physical; the scenario is about the phone process."
    },
    objective: "1.1",
    domain: "general"
  },
  {
    id: "messer-b-001",
    source: "messer",
    exam: "B",
    placeholder: true,
    type: "multiple-choice",
    question: "PLACEHOLDER Exam B. Which objective best matches restoring a service after ransomware?",
    choices: ["RPO", "RTO", "MTBF", "SLE"],
    correctAnswer: 1,
    explanation: "Placeholder: RTO is the allowed downtime until service is back.",
    objective: "5.2",
    domain: "governance"
  },
  {
    id: "messer-c-001",
    source: "messer",
    exam: "C",
    placeholder: true,
    type: "pbq",
    question: "PLACEHOLDER Exam C PBQ. Order the incident-response steps.",
    choices: [],
    correctAnswer: 0,
    explanation: "Placeholder: preparation comes first; lessons learned close the cycle.",
    objective: "4.8",
    domain: "operations",
    pbq: {
      kind: "ordering",
      items: [
        { id: "prep", text: "Preparation" },
        { id: "detect", text: "Detection and analysis" },
        { id: "contain", text: "Containment, eradication, and recovery" },
        { id: "lessons", text: "Post-incident activity" }
      ],
      correctOrder: ["prep", "detect", "contain", "lessons"]
    }
  }
];
