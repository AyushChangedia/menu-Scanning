# Forkcast

Snap a restaurant menu, get every fancy dish explained in plain words (spice, ingredients, taste, "like X you already know"), and see the dishes that fit your taste first.

Menus are read by free AI models on [OpenRouter](https://openrouter.ai) through `/api/scan` (nothing is billed). Claude can be used instead with an Anthropic key. Accounts, taste profiles, ratings and scans are stored on the device (there's no database yet). The design is a sibling of FluxFin (same tokens, cards, pill buttons and bottom tab bar).

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
| `/login`, `/signup`, `/forgot-password` | Email + password accounts; sign-up leads into onboarding |
| `/onboarding` | 5 steps: flavours → heat → how filling → diet → dislikes & allergies |
| `/` | Home: scan hero (camera / gallery), page thumbnails, your taste, recent scans |
| `/scan/[id]` | Results: stats, "Tonight I'm feeling…" re-ranking, For you / Full menu, filters, dish detail sheet |
| `/history` | Past scans with rename and delete (with undo) |
| `/taste` | Edit preferences (auto-saves), rated dishes |
| `/profile` | Name, password, scans left today, sign out, delete account |

## Menu reading (AI)

| Variable | Needed | What it does |
|---|---|---|
| `OPENROUTER_API_KEY` | for real scans | Free key from [openrouter.ai/keys](https://openrouter.ai/keys). Free models read each photo; nothing is billed. Without a key, scans show a labelled sample menu. |
| `OPENROUTER_MODEL` | no | Default `openrouter/free` (any free model that can read photos). To pin one, use an ID ending in `:free`. |
| `INVITE_CODE` | recommended | Friends enter it once before scanning, so strangers can't use up the daily free reads. |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | no | Paid alternative: Claude reads the menus. Used only when `OPENROUTER_API_KEY` is empty. |
| `AI_MOCK` | no | `true` = the server returns fixture menus, no API calls. |

On Vercel: Project → Settings → Environment Variables → add them → Deployments → ⋯ → Redeploy.

**Free limits.** OpenRouter's free models allow about 50 requests a day per account (1,000 once you've ever bought $10 of credits) and 20 a minute. One menu page is one request, two if the first answer was unusable. The limit is shared by everyone using your deployment. Free models are also less accurate than Claude, and the one that answers can change from day to day.

How a scan works: each photo is shrunk to 1568 px and re-encoded as JPEG in the browser (this also strips location data), then sent one page per request, three at a time. The server asks the model for the menu as JSON matching `src/lib/ai/schema.ts`, cleans up common slips (`src/lib/ai/coerce.ts`: "Non-Veg", "₹450", JSON in code fences), repairs small ones (an over-long sentence, a spice rating of 6), validates, and retries once with the errors if needed. Photos are never stored. The same photo scanned again is answered from a cache on the device, with no API call. The prompt lives in `src/lib/ai/prompt.ts`.

## What's simulated

- **Accounts** are email + password, stored on the device (salted PBKDF2 hashes). An account exists only on the phone or browser where it was created.
- **Without an AI key**, "Decode" returns sample menus on a timer and says so on screen.
- **The single-file preview** (`npm run preview:build`) always uses sample menus.

## Where things live

| Path | |
|---|---|
| `src/lib/brand.ts` | App name — rename it here |
| `src/lib/taste.ts` | Flavours, spice anchors, diets, dislikes, allergies, synonyms |
| `src/lib/match.ts` | Scoring and ranking (pure functions; all tuning numbers in `MATCH_TUNING`) |
| `src/lib/mock/fixtures.ts` | Two realistic menus (Italian, Pan-Asian) |
| `src/components/providers/app-state.tsx` | Accounts, per-account data, and the scan pipeline (AI or sample) |
| `src/app/api/scan/route.ts`, `src/lib/ai/*` | The AI menu reader: route, prompt, schema, OpenRouter and Claude calls |
| `src/components/food/*` | SpiceMeter, DietMark, MatchBadge, flag chips, dish cards, detail sheet |
| `tailwind.config.ts`, `src/app/globals.css` | FluxFin design tokens |
