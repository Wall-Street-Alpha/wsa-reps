# WSA Reps

Spaced-repetition interview prep for investment banking: LeetCode-style problem list and practice workspace, Duolingo-style streaks, XP and learning path, FSRS scheduling, and in-browser PDF/DOCX question import.

The app is built and hosted on Lovable (Lovable Cloud handles accounts and progress storage). This repo holds the core logic that the app uses verbatim, plus tests.

| Module | What it does |
|---|---|
| `src/lib/parser.js` | Turns extracted document text into question/answer cards (numbered lists, Q:/A: format, or question-mark fallback; section headers become categories and difficulty) |
| `src/lib/srs.js` | FSRS-4.5 scheduler with short learning steps, mastery and status helpers |
| `src/lib/scoring.js` | Key-concept coverage score for a typed or spoken answer versus the model answer |
| `src/lib/seed.js` | Original 41-question starter deck |

Test the parser against any file:

```bash
npm install
node scripts/test-parser.mjs path/to/questions.docx out.json
```

Copyrighted guides are never committed here or bundled into the app. Each user uploads their own files, which are parsed in their browser.
