# Just a Baby

A baby tracker that reads like a life-sim game. Instead of charts and forms, you get four needs bars, a mood, a few moodlets, and five big buttons you can hit at 3am.

<p>
  <img src="docs/images/home.jpg" alt="Home screen: baby portrait, needs bars and action buttons" width="260">
  <img src="docs/images/moods.jpg" alt="The same baby in four moods with their moodlets" width="260">
  <img src="docs/images/looks.jpg" alt="Nine baby looks built from the avatar options" width="260">
</p>

## What it does

- **Needs bars.** Hunger, Energy, Hygiene and Social drain from green to amber based on the time since the last feed, nap, diaper change or play session.
- **Mood and moodlets.** The bars roll up into one mood (Happy, Content, Fussy, Needs you, Sleeping). Moodlets such as *Full Tummy*, *Well Rested* and *Diaper Check* call out what's going on right now.
- **Quick logging.** Feed, Nap, Diaper, Play and Bath are one or two taps each. It remembers which breast side is next and your usual bottle amount. Every log has Undo, and you can backdate it.
- **A portrait of your baby.** You build a shoulders-up portrait from skin tone, hair, eye and outfit options. The face reacts to the mood.
- **History.** Today's totals (feeds, ml, sleep, diapers) and the last 48 hours of entries.

![Logging a feed in two taps](docs/images/log-a-feed.jpg)

## Running it

It's a single static file with no build step and no dependencies.

```sh
git clone https://github.com/<you>/just-a-baby.git
cd just-a-baby
python3 -m http.server 8000   # or any static server
# open http://localhost:8000
```

Opening `index.html` straight from disk also works.

## How it works

Everything lives in `index.html`: markup, CSS and one script.

### Data model

The app stores **events**, not bar values. Each bar is recomputed from timestamps every 30 seconds, so the bars stay correct after the app has been closed overnight.

```js
// one event
{ id: "lq3x9ab12", type: "feed" | "sleep" | "diaper" | "play" | "bath",
  t: 1790000000000,        // start time, ms since epoch
  sub: "left",             // feed: bottle|left|right|solids, diaper: wet|dirty|both,
                           // play: tummy|play|read|cuddle|outside
  amount: 120,             // bottle feeds only, stored in ml
  end: 1790003600000 }     // sleep only; null while asleep
```

The profile holds the name, birthday, units, drain intervals, and the avatar `look` (skin, hair, hairColor, eyes, outfit, style, paci).

### Need math

`decay(elapsed, intervalHours) = clamp(100 − elapsed / interval × 70, 0, 100)`

A bar reaches about 30 when its interval is up (for example, 3 hours after a feed) and bottoms out at about 1.4× the interval. Each need has its own quirk:

- **Energy** counts up from the last wake time. While the baby is asleep, it refills instead.
- **Social** only drains while the baby is awake, because sleep time is subtracted.

Mood is `0.5 × average + 0.5 × lowest`, so one very low bar pulls the mood down.

Intervals are per-baby settings. The birthday suggests typical values by age.

### Storage

There are two backends behind the same functions (`putEvent`, `patchEvent`, `removeEvent`, `saveProfile`):

| Where it runs | Storage |
|---|---|
| Standalone (this repo, GitHub Pages, localhost) | `localStorage` on that device only (`ln-events`, `ln-profile`) |
| As a Claude artifact | A shared document store (`window.claude.use("db")`), synced between caregivers |

In the shared store, events are grouped into one document per day (`days/YYYY-MM-DD`, with events keyed by id). Grouping by day keeps the document count low, and nested merges mean two caregivers logging at the same moment don't overwrite each other.

**For the beta, the main piece of work is replacing that shared store with a real backend.** See [BETA-PLAN.md](BETA-PLAN.md).

## Design notes

- Built for sleep-deprived use: big targets, bottom action bar, no required fields.
- The amber and red zones are deliberately soft. The bars are a guide built from your log, not medical advice.
- Fonts: Baloo 2 (display) and Atkinson Hyperlegible (body), loaded from Google Fonts.
- Light and dark themes follow the system setting.
- The visual language is inspired by life-sim games but is original. Please keep third-party game names, logos and icons out of the app and its marketing.

## Contributing

Open an issue or a pull request. Small, focused PRs are easiest to review.
