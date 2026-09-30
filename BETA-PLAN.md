# Beta plan

Goal: get **Just a Baby** into the hands of a small group of real parents, learn whether the needs-bar approach keeps people tracking, and fix what gets in the way.

## Where it stands today

- The app works as one static page.
- Standalone, it saves to `localStorage`, so the data stays on one device in one browser. A partner can't see it, and clearing site data or switching phones loses it.
- Syncing between caregivers only works in the Claude-hosted version.

The beta needs three things the app doesn't have yet: **accounts, a synced database, and a way to install it**.

## Phase 0: Set up the project (this week)

- [ ] Repo on GitHub (Naomi's account). Add your sister as a **collaborator**, with PRs from her fork or branches.
- [ ] Decide public or private. Public makes it easy for interested developers to find and fork. Private keeps it quiet until launch.
- [ ] Add a license. MIT is simple if you want it open. Leave it unlicensed if you might commercialize.
- [ ] Turn on GitHub Pages (Settings → Pages → deploy from `main`) so there's a live demo URL. It's local-only storage for now.
- [ ] Do a name check on "Just a Baby": web search, app stores, a trademark search (CIPO in Canada, USPTO in the US), and domain availability.

## Phase 1: Make it beta-ready (engineering)

1. **Split the file.** Move `index.html` into `index.html` + `app.css` + `app.js`, or a small Vite project. That makes reviews and diffs manageable.
2. **Backend.** Pick a hosted Postgres/auth service, such as Supabase or Firebase.
   - Tables: `households`, `members` (user ↔ household, with role), `babies`, `events` (same shape as today, plus `baby_id` and `created_by`).
   - Row-level security, so people only ever read their own household.
   - Realtime subscription on `events`, so both caregivers see logs live. This replaces `db.collection('days').onSnapshot`.
   - The existing `putEvent` / `patchEvent` / `removeEvent` / `saveProfile` functions are the only places that need to change.
3. **Accounts and sharing.** Use email magic-link sign-in, which means no passwords at 3am. Add an "Invite a caregiver" link that joins someone to the household.
4. **Installable app (PWA).** Add a web manifest, icons and a service worker, so testers can add it to their home screen and log with no signal. Queue writes while offline.
5. **Import from localStorage.** On first sign-in, offer to upload anything already logged on that device.
6. **Export and delete.** Add a CSV/JSON export and a "delete my data" button. You'll want both before strangers use it.
7. **Multiple babies.** Twins and siblings will come up. The data model should allow it now, even if the UI waits.

## Phase 2: Trust and safety (before the first stranger signs up)

- **Privacy policy.** Say in plain language what's collected (care logs, baby name and birthday, caregiver emails), where it's stored, who can see it, and how to delete it. Private organizations in B.C. fall under PIPA, and Canada has PIPEDA. It's worth a short review by someone who knows them.
- **Keep it non-medical.** The bars are a log-based guide. Don't claim it detects problems or replaces a pediatrician. Keep the existing disclaimer visible.
- **Minimize data.** Don't ask for anything you don't use: no photos, location or health details in the beta.
- **Security basics.** Row-level security tested with two accounts, no secrets in the repo, and a dependency update check.
- **Analytics.** Use privacy-friendly analytics (for example Plausible or PostHog with autocapture off), counting events like "logged a feed". Never send log contents.

## Phase 3: Run the beta

- **Waitlist.** A simple form: name, email, baby's age range, current tracker (if any), phone type, and whether a partner will co-log.
- **Cohort.** Start with 15–30 households, mixed across newborn / 3–6 mo / 6–12 mo and single vs. two caregivers. Add more every couple of weeks.
- **Onboarding email.** Send the link, a 30-second "how to read the bars", how to invite a partner, and where to send feedback.
- **Feedback loop.**
  - An in-app "Send feedback" link.
  - A short check-in survey at day 3 and day 14.
  - Three or four 20-minute calls with engaged testers.
- **What to measure:**
  - **Retention:** the percentage of households still logging on day 7 and day 14. This is the whole thesis, compared with how testers used other trackers.
  - **Logs per day** per household.
  - **Co-logging:** the percentage of households with two active caregivers.
  - **Time to log:** taps and seconds for the common actions.
  - **Top-requested features.** Watch for pull toward Huckleberry-style complexity, which is the thing this app is avoiding.

## Phase 4: After the beta

- Decide open source vs. product, pricing (if any), and native app wrappers (Capacitor) vs. staying a PWA.
- Revisit the portrait. A higher-fidelity avatar system or per-mood illustrated portraits could come later.

## Suggested division of work

| Naomi | Sister |
|---|---|
| Waitlist, onboarding emails, feedback surveys, beta comms | Backend, auth, sync, PWA |
| Privacy policy draft, naming and trademark check | Security review and row-level security tests |
| Choosing testers and running interviews | Splitting the codebase and CI |
| Product calls on what stays simple | Analytics events |
