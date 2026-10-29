# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **App:** parents and caregivers of a newborn or infant who want to keep up with feeds, naps, diapers, play and baths without becoming a hover parent. Often using it one-handed, tired, and at odd hours.
- **Saving Sanity (newsletter):** parents of babies roughly 0–18 months, reading on a phone during a feed, a nap or a 3am wake-up. Subscribers come from the justababy.ca footer form or the app sign-up checkbox.
- **Sponsors (secondary):** baby brands (targets include Quark and Ourson) buying one labelled product placement per quarter.

## Product Purpose
Just a Baby is a mood and milestone baby tracker that reads like an early-2000s life-sim game: a few needs bars, a mood, little moods and milestones instead of 40 metrics. Saving Sanity is its fortnightly newsletter, "The newsletter for parents that need it.": a parent story, a baby product that has been good since the '90s, one sponsored spot, and one "parent pleaser" just for the parent. The newsletter is also the monetization path, through quarterly sponsor placements.

## Positioning
'90s-style parenting in a 2026 world. It refuses the fluffy, overly cautious tone of baby brands and the turn-your-baby-into-a-spreadsheet tracker. The newsletter is about the parent, not the baby's metrics.

## Operating Context
- Site: justababy.ca (static, GitHub Pages). App at /yourbaby. Supabase backend.
- Email: Customer.io Design Studio. Newsletter runs as an evergreen automation (issue every 14 days) with a reusable sponsor component swapped quarterly.

## Capabilities and Constraints
- Email constraints: images must be hosted PNG/JPG/GIF; web fonts don't load in many clients (Gmail), so type must survive fallbacks; dark mode must work.
- Newsletter and product emails are separate content tracks (separate subscription topic; From name "Saving Sanity from Just a Baby").

## Brand Commitments
- Voice and tone guide (Claude Doc "Just a Baby — Voice & Tone Guide"): unbothered, deadpan, a touch unserious, clarity first; Canadian spelling, sentence case, numerals, no emoji, no all caps, em dashes without spaces, one exclamation mark max.
- Just a Baby app identity: navy, sky blue, gold, Baloo 2 + Atkinson Hyperlegible, '90s PC-game feel.
- Saving Sanity: its own visual world ("Off air": black masthead, test-card colour bars, late-night TV listings), with only a small "from Just a Baby" tag in the From name and footer. Must not look like a soft pastel "mommy blog" (blush, sage, script fonts, florals).

## Evidence on Hand
- No subscriber counts, open or click rates, or testimonials exist yet. Never claim them.
- Baby illustration: images/baby.png (Just a Baby asset).

## Product Principles
1. Clarity first; the joke is the plain statement.
2. About the parent, not the baby's performance or the parent's.
3. Never guilt, compare or scare; point to a doctor or nurse line for health.
4. Sponsored content is always labelled.

## Accessibility & Inclusion
Readable when exhausted, one-handed, at night: large type, strong contrast in light and dark mode. Inclusive of all family structures and feeding methods ("parents", "caregivers", "feeds").
