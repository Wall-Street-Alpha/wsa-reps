# WSA Reps stress test, 2026-11-01

**Result:** the app holds up well beyond expected class sizes. The test found three problems and all three are fixed. No security holes turned up.

## Results

| Area | Test | Result |
|---|---|---|
| Database (Supabase) | 1,000 mixed requests, 25 at a time, 60% load / 40% save | 333 requests per second, no errors. Typical response 54 ms; slowest 5% under 120 ms |
| Database (Supabase) | 600 requests, 60 at a time | 473 requests per second, no errors. Typical response 84 ms; slowest 5% under 340 ms |
| Website (GitHub Pages) | 600 requests, 50 at a time | 354 requests per second, no errors. Typical response 60 ms; page sent compressed (about 60 KB) |
| Parser | Your guide (174 questions) | 38 ms |
| Parser | 1,740 questions (guide text x10) | 0.1 seconds |
| Parser | 5,000 synthetic questions | 0.16 seconds |
| Big deck in the browser | Import 2,000 questions | Preview 1.5 seconds; save under 1 second |
| Big deck in the browser | Search 2,041 questions | 70 ms |
| Big deck in the browser | Full reload | 0.6 seconds |
| Big deck in the browser | Load on a phone-sized screen | 0.2 seconds |
| Heavy user | 6,000 reviews in one month on a 4,500-card deck | All saved and restored after reload. Largest saved record 31 KB |
| Offline | Answer while offline, close the app, reopen online | Changes kept on the device and synced |
| Abuse | Double-click and key-spam the rating buttons | Exactly one review logged |
| Abuse | 60,000-character answer | Graded in 95 ms |
| Abuse | Empty, corrupt and question-free files | Clear message each time, no crash |
| Security | Malicious code planted in question text, answers, topics, bank names and display names | Nothing ran and nothing was injected, on every page tested |

The database figures use the five test accounts from a single machine; all test data was deleted afterwards. Each answered card makes about three saves, so 333 per second covers well over a hundred students answering at the same moment.

## Problems found and fixed

1. **claude.ai version could stop saving for heavy users.**
   - *Cause:* records there are capped at 256 KB. A month with about 4,900 reviews, or a deck of more than about 4,000 cards, would hit the cap.
   - *Fix:* review history and card progress are now split into blocks of 500, so the largest record is about 31 KB.
2. **The website's offline copy could overflow.**
   - *Cause:* it lived in the browser's 5 MB storage area, and a few large decks would quietly exceed it and break offline use.
   - *Fix:* it moved to the browser's database storage, which holds hundreds of megabytes. Existing offline data is carried over automatically.
3. **Each answer re-uploaded a lot of data for heavy users,** up to about 260 KB.
   - *Fix:* the smaller blocks bring that to about 30 KB. A migration test confirmed old-style saved progress survives the change.

Also improved: unreadable files now say what's wrong in plain English ("may be damaged, password-protected, or a scanned PDF"), and import failures are logged to the admin Errors tab.

## Watch-outs

- **Sign-in limits on shared Wi-Fi.** Supabase limits how many sign-ins and sign-ups can come from one internet address in a short window. If you run a workshop where everyone signs up at once on the same Wi-Fi, raise the limits first in Supabase > Authentication > Rate Limits.
- **Free-plan pause.** Supabase pauses free projects after about a week with no activity. A free uptime check at uptimerobot.com, pinging the site every few minutes, prevents this and warns you of outages.
- **Very heavy single users** (thousands of reviews a month) see each answer take a few milliseconds longer. They won't notice it.
