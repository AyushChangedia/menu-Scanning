# Forkcast — UI

Snap a restaurant menu, get every fancy dish explained in plain words (spice, ingredients, taste, "like X you already know"), and see the dishes that fit your taste first.

**This is the front-end only.** It runs on mock data: no database, no login backend, no AI calls. The design is a sibling of FluxFin (same tokens, cards, pill buttons and bottom tab bar).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000 — best viewed at phone width (390px)
npm run check      # typecheck + lint + tests
npm run preview:build   # one self-contained HTML file → preview/dist/forkcast.html
```

`preview:build` bundles the same screens into a single HTML fragment (inline CSS and JS, in-memory routing instead of URLs) so the UI can be shared as a link, e.g. as a Claude Artifact. The shims for `next/link` and `next/navigation` live in `preview/`.

## Screens

| Route | What it shows |
|---|---|
| `/login`, `/signup`, `/forgot-password` | Auth screens (any input works; sign-up leads into onboarding) |
| `/onboarding` | 5 steps: flavours → heat → how filling → diet → dislikes & allergies |
| `/` | Home: scan hero (camera / gallery), page thumbnails, your taste, recent scans |
| `/scan/[id]` | Results: stats, "Tonight I'm feeling…" re-ranking, For you / Full menu, filters, dish detail sheet |
| `/history` | Past scans with rename and delete (with undo) |
| `/taste` | Edit preferences (auto-saves), rated dishes |
| `/profile` | Name, password, scans left today, sign out, delete account |

Sample scans to open directly: `/scan/little-napoli`, `/scan/bamboo-lantern` (has a failed page with Retry), `/scan/weekend-brunch`.

## What's mocked

- **Scanning:** picking photos is real (thumbnails are made in the browser). "Decode" runs a simulated scanner that returns fixture pages on a timer, at most 3 at a time, so progressive loading, skeletons and page retry all behave like the real thing.
- **Data:** taste preferences and ratings are saved in `localStorage`. New scans live in memory until refresh; the three sample scans always exist.
- **Auth and account actions** only navigate or show a toast.

## Where things live

| Path | |
|---|---|
| `src/lib/brand.ts` | App name — rename it here |
| `src/lib/taste.ts` | Flavours, spice anchors, diets, dislikes, allergies, synonyms |
| `src/lib/match.ts` | Scoring and ranking (pure functions; all tuning numbers in `MATCH_TUNING`) |
| `src/lib/mock/fixtures.ts` | Two realistic menus (Italian, Pan-Asian) |
| `src/components/providers/app-state.tsx` | Mock state + simulated scanner — the seam to replace with real server actions |
| `src/components/food/*` | SpiceMeter, DietMark, MatchBadge, flag chips, dish cards, detail sheet |
| `tailwind.config.ts`, `src/app/globals.css` | FluxFin design tokens |
