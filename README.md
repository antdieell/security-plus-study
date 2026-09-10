# SEC+ Study (SY0-701)

A mobile-first CompTIA Security+ **SY0-701** study application.

SEC+ Study is an independent study tool and is **not affiliated with or endorsed by CompTIA**. Practice scores and readiness estimates are study tools, not official exam scores. The question bank is original practice content, not exam dumps or CertMaster material.

## Features

- Practice questions from the combined SY0-701 study bank
- Adaptive Study
- Timed exam simulation (30 / 60 / 90 and weighted random)
- Diagnostic testing
- Spaced review, notes, bookmarks, and Error Journal
- PBQ-style exercises
- Flashcards
- Official objective tracking
- Readiness Index and domain/objective analytics
- Installable PWA with offline support after the first visit
- Local-only progress (export/import; no account)

## Hosted URL (GitHub Pages)

This is a static app. After you publish the repository, GitHub Pages will serve it from:

`https://YOUR-GITHUB-USERNAME.github.io/security-plus-study/`

Localhost progress and GitHub Pages progress are stored in **different browser origins**. Use **Settings → Export progress** on one device/origin and **Import progress** on the other if you want to copy history.

## V3 — personal exam coach

V3 keeps every working V2 study path and adds coaching:

- Official SY0-701 objective map (`data/objectives.js`) used by questions, PBQs, plans, and readiness
- Today's Study Plan sized to a preferred study time
- Readiness Index (0–100) with confidence (Low / Medium / High) and Strong safeguards
- Objective coverage dashboard and CSS coverage map
- Weak-area drills, misconception “Fix this concept”, Error Journal
- Exam 30 / 60 / 90 plus weighted random; exam review filters
- Rapid Review and Exam Day Review
- Question notes and local “Report question”
- Original SY0-701 practice questions (`source-bank-v2`) and 20 PBQ-style exercises

## How to run it locally (Windows + Cursor)

**Fastest:** in Cursor, right-click `index.html` and open it in a browser. Core studying works that way.

**Recommended (needed for PWA / offline install):** serve the folder over HTTP.

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`. On your phone (same Wi-Fi), use `http://YOUR-PC-IP:8080`.

To preview the GitHub Pages subdirectory locally, serve the **parent** folder so the app is under `/security-plus-study/`:

```powershell
cd ..
python -m http.server 8091
```

Then open `http://localhost:8091/security-plus-study/`.

```powershell
node scripts/validate.js
node scripts/content-report.js
node scripts/auditQuestions.js
```

## Project structure

```
security-plus-study/
├── index.html
├── manifest.json
├── service-worker.js          cache secplus-study-v9
├── css/styles.css
├── js/
│   ├── app.js                 Home, Practice, Review, journal, routing
│   ├── plan.js                Daily study plan
│   ├── coverage.js            Objective / concept coverage
│   ├── analytics.js           Readiness V3 + recommendations
│   ├── quiz.js / exam.js / adaptive.js
│   ├── progress.js            Accordion analytics
│   ├── pbq.js / rapid.js / flashcards.js / drills.js
│   ├── storage.js             schema v3 + V1/V2 migration
│   └── ...
├── data/
│   ├── objectives.js          Official SY0-701 hierarchy
│   ├── questions.js           sq0001+ replacement bank + enricher
│   ├── pbqs.js / pbqs-v3.js
│   └── ...
└── scripts/
    ├── validate.js
    ├── content-report.js
    └── auditQuestions.js
```

## Official objectives and V2 remap

`OBJECTIVE_MAP` is the source of truth. Domain IDs stay `general | threats | architecture | operations | governance`.

V2 used shortened Domain 4 IDs on **q001–q150 only**. `enrichQuestion()` remaps once (never chained):

| V2 tag | Official |
| --- | --- |
| 4.2 | 4.3 Vulnerability management |
| 4.3 | 4.4 Alerting and monitoring |
| 4.4 | 4.6 Identity and access management |
| 4.5 | 4.7 Automation |
| 4.6 | 4.8 Incident response |

New questions (`q151+`) must use official IDs (including 4.2 asset management, 4.5 modify capabilities, 4.9 investigation sources, 5.6 awareness).

## Coverage status

Status is **not** accuracy alone (`js/coverage.js` → `statusFor`):

| Status | Typical meaning |
| --- | --- |
| Not Started | No unique exposure |
| Low Exposure | Seen &lt; 25% of that objective’s bank |
| Learning | Started, not yet consistently accurate |
| Developing | Recent accuracy ≥ 70% and exposure ≥ 35% |
| Strong | Accuracy ≥ 82%, exposure ≥ 55%, few overdue, reasonable confidence |
| Needs Review | ≥ 3 overdue items and accuracy &lt; 80% |
| Low question coverage | Bank has no questions for that objective (content gap) |

## Readiness V3

Index 0–100 from recent accuracy, exam average, exam consistency, coverage, weakest domain/objective, overdue reviews, PBQ-style score, new-vs-seen gap, and recurring misconceptions.

Categories: Needs Work · Developing · Nearly Ready · Strong.

**Strong is blocked** unless roughly:

- ≥ 60% unique question-bank coverage
- enough answers (about 80+)
- at least one 60-question exam **or** two 30+ exams
- no major domain below ~65%

Readiness Confidence (Low / Medium / High) is how much evidence exists, not how high the score is.

**This is not an official CompTIA exam score.**

## Mastery

A question is mastered only if:

- at least 3 correct answers (4 if hard)
- at least 2 distinct correct dates
- most recent response correct
- confidence is not “Not sure”
- not overdue for review

## Daily plan

Built from overdue reviews, recurring misconceptions, weak/low-coverage objectives, weak PBQs, due flashcards, then mixed/rapid practice. Domain stacking is limited unless that domain is severely weak. Preferred time is 10 / 20 / 25 / 30 / 45 / 60 minutes (estimates only). Last 30 daily plans are kept.

## Recommendation scoring

One primary recommendation. Higher scores win when data exists:

- Overdue review (highest when several items are due)
- Recurring misconception
- Weak objective
- Possible memorization (familiar topic items much stronger than new ones)
- Exam inactivity

## How to add questions

Append to `data/questions.js` with a unique `sq` id and an **official** objective:

```js
{
  id: "q281",
  domain: "operations",
  objective: "4.8",
  topic: "Incident Response",
  difficulty: "medium",
  tags: ["incident-response"],
  question: "Which action should the administrator take FIRST?",
  options: ["A", "B", "C", "D"],
  correctAnswer: 1,
  explanation: "Why the correct option is right.",
  incorrectExplanations: { 0: "Why A is wrong." }
}
```

Use scenario wording (BEST / FIRST / MOST likely). Do not copy CompTIA, CertMaster, or dump banks.

## How to add PBQs

Append to `data/pbqs-v3.js`. Types: `ordering`, `matching`, `multiSelect`, `categorization`, `scenario`, `logs`, `rules`.

Displayed scores are **PBQ-style practice scores**, not CompTIA grading. Ordering uses up/down buttons (no drag required).

## Storage schema V3

Progress is saved under **`secplus-study-v1`** (the key never changes).

V1 and V2 migrate in place. V3 adds `dailyPlans`, `activePlan`, `questionReports`, `questionNotes`, `errorJournal`, `concept-ready fields on questionStats`, `readinessHistory`, `personalBests`, `customFlashcards`, and `pbqStats.byId`.

Export JSON includes `app`, `version`, `schemaVersion`, `exportedAt`, and both `data` and `state` so V2 backups still import. Newer-than-current schema versions and non–SEC+ Study files are rejected.

## Export / import

Settings → **Export progress** downloads `sec-plus-study-backup-YYYY-MM-DD.json`. Import validates JSON as data only (never executed).

## Offline PWA

`service-worker.js` cache name is `secplus-study-v9`. HTML and JS/CSS/`data/` use network-first so upgrades are not stuck on a stale shell; other assets stay cache-first. After the first HTTP visit, the question bank and core study features work offline. The service worker is scoped to this folder so a GitHub Pages project URL (`/security-plus-study/`) works.

Bump `CACHE_NAME` whenever HTML/JS/data files change.
