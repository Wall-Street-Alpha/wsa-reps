# WSA Reps

LeetCode plus Duolingo for investment banking interviews. Import PDF, DOCX, TXT, CSV or JSON question banks, drill them with FSRS spaced repetition, and track streaks, XP, levels and mastery under your own login.

**Live app:** https://claude.ai/artifact/5d3FrceE8d3u25eKw6fd8J (claude.ai sign-in; each person's progress is stored privately under their account)

## Features
- **Today:** daily queue (due reviews first, then new cards up to your daily limit), XP goal ring, level, streak with freezes, weak spots, activity heatmap.
- **Path:** Duolingo-style units per topic, 8-question lessons, check marks and crowns.
- **Problems:** LeetCode-style table with search, deck, topic, difficulty, status and starred filters; sortable by number, mastery and due date.
- **Workspace:** answer like you would in the room, with a timer and read-aloud; then concept-coverage scoring against the model answer, an optional AI interviewer grade with a follow-up question, and Again/Hard/Good/Easy ratings that show the next interval.
- **Mock interview:** timed questions back to back, reviewed and scheduled at the end.
- **Import:** parsing runs in the browser; the file is never uploaded.
- **Progress:** stats, 26-week heatmap, reviews per day, 14-day forecast, mastery by topic and difficulty, achievements.
- **Prefs:** daily goal, new cards per day, target recall, theme, deck rename/reset/delete, JSON export.

## Layout
| Path | What it is |
|---|---|
| `src/lib/` | Core modules: parser, FSRS scheduler, answer scoring, original 41-question starter deck |
| `app/` | UI: styles, storage adapter, PDF/DOCX extraction, pages |
| `scripts/build.mjs` | Assembles everything into `dist/index.html` (one file, no bundler) |
| `scripts/test-parser.mjs` | Runs the parser on any file |

```bash
npm install
npm run build
node scripts/test-parser.mjs path/to/questions.docx out.json
```

Outside claude.ai the page runs in local mode and saves progress in the browser.

Copyrighted guides are never committed here or bundled into the app. Each user uploads their own files.
