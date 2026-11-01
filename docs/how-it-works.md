# How WSA Reps works

**Short version:** the app is one web page hosted free on GitHub Pages. Accounts and progress live in your Supabase project, a hosted database with sign-in built in. When you push code to `main` on GitHub, it rebuilds and redeploys itself in about a minute. To see how students are doing, use the Admin page in the app, or Supabase for the raw data.

## The three pieces

| Piece | What it does | Where you look |
|---|---|---|
| **GitHub** (`Wall-Street-Alpha/wsa-reps`) | Holds the code. Every push to `main` runs a build and publishes the site. | github.com/Wall-Street-Alpha/wsa-reps, **Actions** tab for deploys |
| **GitHub Pages** | Serves the website at https://wall-street-alpha.github.io/wsa-reps/ | Repo **Settings > Pages** |
| **Supabase** (your personal account, project `aaphstteuujdgmyiztet`) | Sign-in (email, and Google once you switch it on) plus the database that stores every student's progress | supabase.com/dashboard |

How a page view works:

1. A student opens the site. GitHub Pages sends them the app, a single HTML file.
2. The app asks Supabase "is this person signed in?" If not, it shows the sign-in screen.
3. After sign-in, the app downloads that student's saved progress from Supabase.
4. Every rating, note or import is saved back to Supabase within a second or two.

## Supabase from scratch

Supabase is a hosted Postgres database with a few extras switched on: user accounts, an automatic API, and security rules. You never run a server; the app talks to Supabase directly from the browser.

**Authentication > Users** lists everyone who has signed up, with their email, sign-up date and last sign-in. Confirm email is off, so sign-up is instant.

**Table Editor > user_docs** is the only table the app uses. Each row is one saved item for one student:

| key | What it holds |
|---|---|
| `profile` | Name, XP, streak, best streak, daily goal, settings, achievements, deck list |
| `dk-<deck>-<n>` | The questions and answers in a deck (big decks are split into parts) |
| `st-<deck>` | Spaced-repetition state for every card in that deck (when it's due, how well it's known) |
| `nt-<deck>` | The student's personal notes on cards |
| `lg-<YYYYMM>` | Review history for that month: one entry per answered card with time, rating and time spent |

**Row-level security (RLS)** is what keeps students apart. The rules from `supabase/setup.sql` say a signed-in person can only read and write rows where `user_id` is their own id. The publishable key in the app is safe to be public because of these rules.

**Admins.** `supabase/admin-setup.sql` adds:
- an `app_admins` table
- the `question_tags`, `app_events` and `app_errors` tables
- the admin-only functions behind the Admin page

Only people listed in `app_admins` can call those functions. Students still can't see each other, and can't read events or errors. The file is safe to run again after updates.

**SQL Editor** lets you ask the database questions directly. `supabase/admin-queries.sql` has ready-made queries: sign-ups, activity per student, reviews per day, imported decks and mock interviews.

**Logs** (left sidebar) shows sign-in attempts and API calls if something looks wrong.

## Bank tags

- **Shared tags:** each question can be tagged with the banks that ask it, like LeetCode's company tags. Tags you add as an admin are shared with every student and stored in the `question_tags` table.
- **Private tags:** a student can tag a question with a bank that asked them, which only they see.
- **Imports:** CSV files can include a `banks` column, for example `Goldman Sachs; Evercore`.
- **Filters:** the Problems page filters by topic, bank, difficulty, status and deck.

## Logging and monitoring

Standard practice for an app this size is three layers. All three are in place except the uptime ping.

| Layer | What it answers | Where |
|---|---|---|
| **Product events** | Who is using it and what they do | Admin > Activity. Raw rows in Supabase table `app_events`. |
| **Error reports** | Is anything breaking for students, and on which device | Admin > Errors. Raw rows in `app_errors`. |
| **Platform logs** | Sign-in failures, API errors, deploy failures | Supabase > Logs; GitHub > Actions |

- **Events logged:** app opened (and whether it's the installed phone app), signed up, signed in, session completed, mock interview completed, deck imported, bank tagged, install clicked. No answer text is recorded.
- **How events are sent:** in batches, and kept on the phone until there's a connection.
- **Error reports:** capped at five per visit, so one bad bug can't flood the table. Each one records the message, page, device and app version, so you can tell which deploy caused it.
- **Recommended next step:** set up a free uptime check at uptimerobot.com that loads the site and calls Supabase every few minutes. It emails you if either goes down, and the regular calls also stop Supabase from pausing the free project.
- **For more detailed crash reports later:** add Sentry (free tier). The `app_errors` table covers the basics for now.

## Offline use on phones

- **Opening offline:** the app keeps a copy of the student's last synced progress on the phone. Without a connection it opens from that copy, and the top bar says "Offline".
- **Changes made offline** are queued on the phone, even if the app is closed.
- **When the connection returns,** the queued changes upload and are merged with anything saved from another device:
  - review history is combined
  - for each card, the most recent review wins
  - XP and best streak keep the higher number

## Deployment

- **Code** lives on the `main` branch. `.github/workflows/pages.yml` runs on every push to `main`: it builds `site/index.html` from the source and publishes it to GitHub Pages.
- **Deploy status** shows in the repo's **Actions** tab. Green means live; red means the build failed and the old version is still up.
- **Supabase settings** for the build come from `app/config.json`: the project URL and publishable key, both public by design. The secret key is never in the code.
- **The claude.ai version** (https://claude.ai/artifact/5d3FrceE8d3u25eKw6fd8J) is the same app published inside claude.ai. It uses claude.ai sign-in and stores progress there instead of Supabase. Students on the website and on claude.ai do not share progress.

## Where to check things

| Question | Where |
|---|---|
| Who signed up? | Supabase > Authentication > Users, or the Admin page |
| How is each student doing? | Admin page in the app (sign in with your admin account) |
| Raw progress for one student | Supabase > Table Editor > user_docs, filter by `user_id` |
| Activity trends | Supabase > SQL Editor, `admin-queries.sql` query 4 |
| Is anything breaking? | Admin page > Errors |
| What are people doing? | Admin page > Activity |
| Did my change deploy? | GitHub > Actions |
| Is the site up? | Open the site; GitHub > Settings > Pages shows the URL |

## One-time setup still to do

**Make yourself an admin**
1. Sign up in the app with your own email.
2. In Supabase, open SQL Editor > New query, paste `supabase/admin-setup.sql`, replace `YOUR_EMAIL_HERE` with that email, and click Run.
3. Reload the app. An **Admin** link appears in the top bar.

**Google sign-in (optional).** The button appears on its own once Google is switched on.
1. Go to console.cloud.google.com and create a project called "WSA Reps".
2. Under APIs & Services > OAuth consent screen, choose External. Fill in the app name and your email, and publish the app.
3. Under Credentials, create an OAuth client ID of type Web application. Set:
   - Authorized JavaScript origin: `https://wall-street-alpha.github.io`
   - Authorized redirect URI: `https://aaphstteuujdgmyiztet.supabase.co/auth/v1/callback`
4. In Supabase > Authentication > Sign In / Providers > Google, switch it on and paste the Client ID and Client Secret. Keep the secret out of chat and email.
5. In Supabase > Authentication > URL Configuration, add `https://wall-street-alpha.github.io/wsa-reps/` under Redirect URLs.

## Free-plan limits to know

- **Inactivity pause:** Supabase pauses free projects after about a week with no activity. Restart it from the dashboard if that happens. Regular student use keeps it awake; upgrading to Pro ($25 a month) removes the pause.
- **Capacity:** the free database holds 500 MB, which is plenty for thousands of students at this data size.
- **GitHub Pages** is free for public repositories.
