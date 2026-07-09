# Typography Reel Studio — Pro Visual Upgrade

Date: 2026-07-07 · Status: implemented · Research: 3 parallel agents (motion spec, asset APIs, layout patterns) — findings verified live before use.

## Problem

User verdict on the previous output: "very basic". Three concrete gaps:

1. **Icons** — only ~8 emotion-keyed generic icons existed; no relationship to the words being spoken.
2. **Motion** — entry pop slammed 0.30→1.14 scale (research: pro entries overshoot 4–8%, never 15%+), holds breathed per-word-duration (short words jittered), and phrases ended in a freeze + hard blank wipe (the #1 amateur tell).
3. **Arrangement** — templates lacked rotation, kicker contrast, and the tilt/tuck patterns used by CapCut/AE trend templates.

## Research findings used (condensed)

**Motion** (sources: ContentEngineAI subtitle best-practices, motiondivision spring source, GSAP SplitText docs):
- Entry: 120–400ms, spring ζ≈0.7–0.8, overshoot 4–8%, opacity resolves in first ~40%.
- Hold: breathing ≤2% on a 2–3s cycle, rotation wobble ≤±1° at ≤0.5Hz.
- Exit: block slide-up 20–40px + fade, 150–250ms, ease-in (power2.in); exits never overlap next entry.
- Karaoke timing: words fire on their own audio timestamps — no artificial stagger (already correct).

**Assets** (all endpoints verified live with CORS `*`):
- Iconify API: keyword search `api.iconify.design/search?query={kw}&prefixes=...` + SVG fetch, no auth, Cloudflare-cached. Full-color sets (fluent-emoji, noto, twemoji) + recolorable bold monotone (solar, ph).
- Noto animated emoji on gstatic: already integrated (animatedEmojiService) — kept as-is.

**Layout** (editorial/caption-system sources): hero:support contrast ≥2.5×, one hero per phrase; support words rotated −8°…+12° when tucked; stair-steps lean −3…−5°; tight stacks use 0.1–0.25 cap-height gaps; max 2 accent colors per phrase.

## What was built

| Change | File | Detail |
|---|---|---|
| Dynamic keyword icons | `services/typography/keywordIconService.ts` (new) | Per hero/secondary word: Iconify search → prefer glossy fluent-emoji/noto/twemoji, else bold monotone recolored to theme; rasterized to 256px canvas at generation time; sync deterministic `getIcon()` at render; silent fallback to the existing emotion Lottie icon. Prefetch capped: 24 keywords, 4-way concurrency, 4s/fetch, 5s soft pipeline cap. |
| Pro entry spring | `typographyRenderer.ts` | 0.80→~1.06→1.00 (c1=3.4 ⇒ +6% overshoot), directional travel 130→90px. |
| Live hold | `typographyRenderer.ts` | Shared playback clock (`nowSec`): 1.2% breathing @2.8s cycle + ±0.6° wobble @0.35Hz, per-word phase — whole collage alive, still export-reproducible. |
| Block exit | `typographyRenderer.ts` | Phrase leaves as one unit: −34px lift + fade over 200ms, power2.in. Replaces freeze-then-blank. Slate-wipe kept (prevents exit/entry overlap). |
| Arrangement | `typographyRenderer.ts` `composePhrase` | Per-slot `rotation` support; new templates: TILTED_KNOCKOUT (2w), HERO_KICKER (3w, 0.55 kickers vs 1.35 hero), STAIR_STEP (−3.5° flight); connectives get deterministic ±1.4° hand-placed tilt. |
| Pipeline wiring | `TypographyReelStudio.tsx` | Icon prefetch after choreography, colored by theme luminance, 5s soft cap. |

## Tuning knobs (all named constants)

- Overshoot: `punchEaseOut(t, c1)` — c1 3.4 ≈ +6% scale; raise toward 4.5 for punchier.
- Exit window: `LINGER_HOLD_SEC` (0.2s) and the −34px lift in the linger branch.
- Hold life: 0.012 breathe amplitude / 2.8s cycle / 0.35Hz wobble in the hold branch.
- Icon sets & order: `ICON_PREFIXES` in keywordIconService.

## Deliberate limits (ponytail)

- Keyword extraction is stopword-filter + lowercase — no NLP lemmatizer; upgrade only if icon relevance disappoints on real scripts.
- LottieFiles keyword search (works keyless today, undocumented) intentionally skipped — Iconify + Noto covers it with guaranteed endpoints.
- Letter-level stagger reveal skipped: karaoke timing fires words on audio timestamps; per-letter effects fight word sync at reel pace.
