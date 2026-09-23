/**
 * FAKE placeholder items so the Messer A/B/C UI can be exercised.
 * Not purchased Professor Messer content. Used only if data/messer-questions.json
 * fails to load. Never mixed into a successful 270-question bank.
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
  },
  {
    id: "messer-a-002",
    source: "messer",
    exam: "A",
    placeholder: true,
    type: "multiple-select",
    question: "PLACEHOLDER Exam A. A stolen laptop contains an unencrypted HR export. Which TWO controls would have BEST limited exposure of that file after theft? Select TWO.",
    choices: [
      "Full-disk encryption",
      "A cable lock on the desk",
      "A privacy screen filter",
      "File encryption on the HR export"
    ],
    correctAnswers: [0, 3],
    explanation: "Placeholder: after theft, encryption on the disk and on the file limits disclosure. A cable lock and a privacy filter do not protect the copy once the laptop is gone.",
    incorrectExplanations: {
      "1": "Placeholder: a cable lock may slow theft, but it does not protect the file after the laptop is taken.",
      "2": "Placeholder: a privacy filter reduces shoulder surfing, not access to a stolen disk."
    },
    objective: "1.4",
    domain: "general"
  },
  {
    id: "messer-b-002",
    source: "messer",
    exam: "B",
    placeholder: true,
    type: "multiple-select",
    question: "PLACEHOLDER Exam B. A clinic wants THREE technical controls on the registration PCs. Select THREE.",
    choices: [
      "Host-based firewall",
      "Disk encryption",
      "EDR agent",
      "Acceptable use policy"
    ],
    correct_answers: [0, 1, 2],
    explanation: "Placeholder: firewall, disk encryption, and EDR are technical. An acceptable use policy is managerial/directive, not a technical control on the PC.",
    incorrectExplanations: {
      "3": "Placeholder: an acceptable use policy is a written rule, not a technical control installed on the PC."
    },
    objective: "1.1",
    domain: "general"
  },
  {
    id: "messer-c-002",
    source: "messer",
    exam: "C",
    placeholder: true,
    type: "pbq",
    question: "PLACEHOLDER Exam C multipart. Confirm the log source, then put the first response steps in order.",
    choices: [],
    explanation: "Placeholder: failed smart-card logons belong in the authentication log. Disable the account first, then record the timeline, then brief the lead.",
    objective: "4.8",
    domain: "operations",
    pbq: {
      kind: "multipart",
      parts: [
        {
          kind: "dropdown",
          stems: [
            {
              id: "log",
              text: "Which log is the BEST first place to confirm failed smart-card logons?",
              options: [
                { id: "auth", text: "Authentication / identity log" },
                { id: "print", text: "Print-spooler log" }
              ]
            }
          ],
          correct: { log: "auth" }
        },
        {
          kind: "ordering",
          items: [
            { id: "contain", text: "Disable the affected account" },
            { id: "note", text: "Record the timeline" },
            { id: "brief", text: "Brief the incident lead" }
          ],
          correctOrder: ["contain", "note", "brief"]
        }
      ]
    }
  }
];
