# Auto Motion Graphics — Implementation Plan

**Date:** 2026-05-15
**Owner:** vinodff
**Status:** Draft for review (no code yet)

---

## 1. What we're building (one paragraph)

A new mode in createrin where the user pastes a script (or uploads a video + script). The app parses the script into semantic **beats** — moments where a motion graphic should fire — and generates a fully composed motion-graphics video. Each beat becomes one or more animated visual primitives (icon bursts, kinetic typography, lower thirds, counters, highlight boxes, background pulses, transition wipes) playing in sync on a timeline. The user can edit the auto-generated plan on the timeline (drag, retime, swap primitive, change color/icon) and export an MP4 with a descriptive filename derived from the script topic. Optional toggle: animated GIF emojis embedded into the motion graphics for higher visual energy.

The bar isn't CapCut. The bar is After Effects–quality kinetic typography that a non-designer can ship in 90 seconds.

---

## 2. Research — what makes this "killer level"

### What the SOTA does well
- **CapCut auto-captions + auto-effects**: good audio sync, weak semantic understanding (decorates words, doesn't illustrate ideas).
- **VEED, Kapwing, Pictory**: stock-footage based, low custom control, generic.
- **After Effects + MOGRTs**: infinite control, 4-hour learning curve.
- **Veed.io "Magic Cut"**: jump-cut automation, no motion graphics generation.
- **Lottie + Bodymovin**: beautiful, but requires hand-designed JSON per scene.

### Where we win
1. **Semantic, not phonetic.** Gemini parses meaning ("here's the key insight" → big-text reveal + highlight box), not just word boundaries.
2. **Beat-locked.** Motion graphics snap to caption boundaries we already extract, so audio sync is free.
3. **Editable plan.** AI generates a starting plan; user drags on the timeline to fix anything. Not a black box.
4. **Crisp rendering.** Pure canvas + GSAP + SVG-rasterized icons. No stock footage, no Lottie file shipping, infinite scaling.
5. **Reuses our entire export pipeline.** Same canvas → MediaRecorder → MP4 we already ship.

### Reference visuals we want to match
- **Kurzgesagt-style icon flat illustration** (bright, geometric, bold).
- **Mr. Beast lower thirds** (bold sans, drop shadow, accent color blob).
- **Apple keynote kinetic typography** (single-word reveals, generous whitespace).
- **HypeAuditor / Notion bar chart reveals** (clean data viz that animates in).

---

## 3. How it fits the existing app

Discovered architecture (from codebase exploration, key references):

| Existing pieces | How motion graphics plugs in |
|---|---|
| `services/geminiService.ts` (audio → captions + word timings) | New sibling: `services/motionGraphicsService.ts` (script → beats[]). Same Gemini client. |
| `services/captionRenderer.ts` (canvas, binary search active caption, draw per frame) | New sibling: `services/motionGraphicsRenderer.ts`. Both compose onto the same canvas in App.tsx. Z-order: video → bg motion → captions → fg motion. |
| `components/EnhancedTimeline.tsx` (single Caption track) | Extend with a second track type: `MotionLayer[]`. Reuse drag/resize/split UX. |
| `App.tsx` MediaRecorder export (canvas.captureStream → MP4 blob) | Untouched. Motion graphics show up on the canvas, so export works automatically. |
| `components/FeatureSelector.tsx` | Add new feature panel: `MotionGraphicsPanel.tsx`. |
| `server/index.js` + `server/routes/` | New route `server/routes/motion.js`: `/api/motion/analyze-script`. |
| `services/aiStyleService.ts` THEME_PRESETS | Reuse color palettes; add motion-specific palette presets (energetic / corporate / kids / cinematic). |
| GSAP (already installed) | Drive primitive tweens. |
| Lucide icons (already installed) | Rasterize to canvas for icon primitives. |
| Noto emoji GIF CDN (already wired in `emojiAutoMatcher.ts`) | Optional animated-emoji toggle in motion graphics. |

**Net:** no new heavy dependencies. Possibly add `popmotion` (~5kB) for spring physics if GSAP easing isn't enough.

---

## 4. Data model

```ts
// services/motionGraphicsService.ts
export type PrimitiveType =
  | 'big-text-reveal'        // hero phrase, scale + stagger
  | 'lower-third'            // bottom-left name/title card
  | 'icon-burst'             // icon scales in with particles
  | 'counter'                // number ticks up
  | 'highlight-box'          // pulsing rectangle around region
  | 'bar-reveal'             // animated bar / progress
  | 'bg-gradient-pulse'      // full-screen gradient breathe
  | 'transition-wipe'        // scene cut wipe
  | 'quote-card'             // pull-quote on accent shape
  | 'bullet-list-reveal'     // stagger bullets in
  | 'callout-arrow'          // hand-drawn arrow + label
  | 'word-emphasis-flash';   // single word in caption flashes

export interface MotionBeat {
  id: string;
  startTime: number;          // seconds
  endTime: number;
  primitive: PrimitiveType;
  params: {
    text?: string;
    icon?: string;            // lucide icon name or emoji codepoint
    palette: 'energetic' | 'corporate' | 'kids' | 'cinematic' | 'custom';
    customColors?: string[];
    anchor?: 'top' | 'center' | 'bottom' | 'left' | 'right';
    intensity: 1 | 2 | 3;     // visual loudness
  };
  // Why Gemini picked this beat — shown in timeline tooltip, helps user trust output
  rationale?: string;
}

export interface MotionPlan {
  beats: MotionBeat[];
  topicSlug: string;           // for export filename
  suggestedPalette: string;
  duration: number;
}
```

The renderer side mirrors the caption renderer pattern: a `MotionRendererState` with binary search by current time, plus per-primitive `render(ctx, localT, params)` functions.

---

## 5. Phased delivery

Each phase is independently shippable and end-to-end testable. Don't move to N+1 until N's deliverable runs in the browser.

### Phase 0 — This plan (today)
- This document.
- One **throwaway spike**: a single `.html` file in `tests/` rendering one motion primitive (icon-burst) on a canvas, no React, no integration. Validates the rendering math + GSAP timing approach. Throw it out after Phase 2.
- **Deliverable:** plan approved by user. Spike confirms 60fps canvas + GSAP works on the target screen.

### Phase 1 — Script → MotionPlan AI parser
- `services/motionGraphicsService.ts` — Gemini call with system prompt that returns `MotionPlan` JSON.
- `server/routes/motion.js` — `POST /api/motion/analyze-script { script, durationSec }` returning the plan.
- New UI surface: a textarea + "Generate motion plan" button in a new sidebar panel.
- Render the returned plan as a **non-interactive read-only list** of beats (time → primitive → text → rationale). No timeline drawing yet, no canvas output.
- **Deliverable:** paste a script, see a sensible beat list. Validate that Gemini's plan quality is good before building any rendering.

### Phase 2 — Primitive library (8 of 12)
Build these in `services/motion/primitives/` as pure functions `(ctx, localT01, params) => void` where `localT01` is 0-1 progress within the beat:

1. `big-text-reveal` — word-by-word stagger, scale 0.6→1, opacity 0→1, spring overshoot.
2. `lower-third` — slide-in bar with accent shape, text stagger.
3. `icon-burst` — icon scales 0→1.1→1 with elastic, 8 radial particles fade.
4. `counter` — number ticks from 0 to target with ease-out-cubic.
5. `highlight-box` — pulsing rounded rect, 2 cycles of opacity 0.3↔0.8.
6. `bg-gradient-pulse` — full-screen radial gradient, slow breathe.
7. `transition-wipe` — diagonal wipe between two solid colors.
8. `word-emphasis-flash` — overlay accent color on one word, flash 200ms.

The other four (quote-card, bullet-list-reveal, callout-arrow, bar-reveal) ship in Phase 5.

**Standalone test page** at `tests/motion-primitives.html` to fire each primitive on demand with parameter sliders. This is the proof primitives work before integrating.

- **Deliverable:** open the test page, see all 8 primitives animate smoothly on canvas at 60fps.

### Phase 3 — Renderer + Timeline integration
- `services/motionGraphicsRenderer.ts` — same shape as `captionRenderer.ts`: state object, `updateTime(t)`, binary search active beats, dispatch to primitives.
- Wire into `App.tsx`'s render loop alongside the caption renderer. Z-order matters: background primitives draw first, captions in the middle, foreground primitives last.
- Extend `EnhancedTimeline.tsx`:
  - Add a second track row below captions: "Motion".
  - Each beat is a colored block (color = primitive type). Drag, resize, delete, right-click to swap primitive.
  - New `onUpdateBeat` / `onDeleteBeat` callbacks.
- Add `MotionGraphicsPanel.tsx` to FeatureSelector with: script textarea, "Generate plan" button, palette picker, intensity slider, list of beats with edit affordances.
- **Deliverable:** paste script → see beats appear on timeline → press play → motion graphics animate over the video in sync with captions.

### Phase 4 — Export with descriptive filename
- Reuse existing MediaRecorder pipeline; no rendering changes needed.
- Gemini one-liner: `generateExportSlug(script) → 'productivity-morning-routine'`.
- Filename schema: `createrin-motion-{topicSlug}-{primaryPrimitive}-{YYYYMMDD-HHmm}.mp4`.
- Example: `createrin-motion-productivity-morning-routine-icon-burst-20260515-1430.mp4`.
- Show a filename preview in the export dialog before download.
- **Deliverable:** export an MP4 with the descriptive name; verify file plays in QuickTime / VLC / Premiere.

### Phase 5 — Polish + toggles + the remaining 4 primitives
- Toggle: **Animated emojis in motion graphics** — when on, primitives that take an `icon` param try Noto GIF first (decoded once, cached as ImageBitmap), fall back to Lucide.
- Toggle: **Bright color mode** — overrides palette to use the high-saturation set.
- Beat snapping: dragging a beat near a caption boundary snaps to it (±100ms).
- Spring physics via popmotion for `icon-burst` and `big-text-reveal` (replace GSAP easing on those two).
- Ship remaining primitives: `quote-card`, `bullet-list-reveal`, `callout-arrow`, `bar-reveal`.
- **Deliverable:** record three sample videos (energetic / corporate / kids) using the same script to demo the system's range.

---

## 6. Open questions for you

Answer these before Phase 1 starts. Each one shifts scope materially.

1. **Audio source.** When the user uploads a video, do we extract audio + get word-level timestamps (existing `geminiService.generateCaptionsFromVideo`) to align motion graphics with speech? Or is the script-only path (no video) the MVP?
   *Default if you don't pick:* script-only MVP, audio sync as a Phase 4 add-on.

2. **Style range in MVP.** Do we ship 4 palette presets (energetic / corporate / kids / cinematic) or just one default + later expand?
   *Default:* 4 presets.

3. **Video length cap for MVP.** Cap at 60s to control AI cost and rendering complexity, or no cap?
   *Default:* 60s soft cap with a warning, no hard limit.

4. **TTS for script-only mode.** If user pastes a script with no video, do we generate voiceover (Gemini TTS / ElevenLabs), or output silent motion graphics they can pair with audio elsewhere?
   *Default:* silent for MVP, TTS later.

5. **Primitive count.** 12 primitives is ambitious. Cut to 6 for MVP and add more after user feedback?
   *Default:* ship 8 in Phase 2, the rest in Phase 5.

6. **Mobile preview.** Should the motion graphics panel render correctly on a 720p phone preview, or is desktop-first OK?
   *Default:* desktop-first, mobile preview after Phase 5.

---

## 7. Risks I'm tracking

- **Gemini plan quality.** If the model returns generic, repetitive beats ("icon-burst" for every line), the feature feels cheap. Mitigation: Phase 1 is read-only on purpose so we can iterate on the prompt before building anything else.
- **Canvas performance.** Compositing video + captions + 2-3 motion primitives at 60fps on weak laptops. Mitigation: throttle to 30fps if `performance.now` drift > 8ms; primitives use ImageBitmap caching for icons.
- **Timeline UX clutter.** Two tracks may feel cramped. Mitigation: collapsible motion track, default-collapsed if no beats.
- **Export sync drift.** MediaRecorder doesn't always hit target fps. Mitigation: existing pipeline already deals with this for captions, motion uses the same render loop so any drift is shared.

---

## 8. What I will NOT do unless you say so

- Add a server-side video encoder (ffmpeg.wasm / cloud render). Browser MediaRecorder stays.
- Add stock-footage library / third-party video assets.
- Add user accounts or saving plans to backend (uses existing SQLite only if you ask).
- Touch the existing caption rendering code (motion is additive).
- Build a separate page / route. This is a panel in the existing app.
