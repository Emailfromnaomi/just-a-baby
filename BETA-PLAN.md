# Beta plan

Goal: get **Just a Baby** into the hands of a small group of real parents, learn whether the needs-bar approach keeps people tracking, and fix what gets in the way.

## Where it stands today

Accounts are built (see [SETUP.md](SETUP.md)): email sign-in, one or more babies per person, invite links for caregivers, live sync, an offline queue, add-to-home-screen, CSV and JSON export, and account deletion. What's left before testers is mostly setup and trust: the Supabase project, sending email, the privacy notice and a name check.

## Phase 0: Set up the project (this week)

- [ ] Repo on GitHub (Naomi's account). Add your sister as a **collaborator**, with PRs from her fork or branches.
- [ ] Decide public or private. Public makes it easy for interested developers to find and fork. Private keeps it quiet until launch.
- [ ] Add a license. MIT is simple if you want it open. Leave it unlicensed if you might commercialize.
- [ ] Turn on GitHub Pages (Settings → Pages → deploy from `main`) so there's a live demo URL. It's local-only storage for now.
- [ ] Do a name check on "Just a Baby": web search, app stores, a trademark search (CIPO in Canada, USPTO in the US), and domain availability.

## Phase 1: Make it beta-ready (engineering)

1. ~~**Split the file.**~~ Done: `index.html` + `app.css` + `app.js` + `config.js`.
2. ~~**Backend.**~~ Done with Supabase: `supabase/schema.sql`, with access-rule tests in `supabase/tests/`.
3. ~~**Accounts and sharing.**~~ Done: email sign-in link or 6-digit code, and single-use invite links for caregivers.
4. **Installable app (PWA).** Partly done: there's a manifest, icons and an offline write queue. Still to do: a service worker, so the app itself opens with no signal.
5. ~~**Import from localStorage.**~~ Done: offered when adding the first baby.
6. ~~**Export and delete.**~~ Done: CSV and JSON download, and account deletion in settings.
7. ~~**Multiple babies.**~~ Done: tap the baby's name to switch or add one.

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
