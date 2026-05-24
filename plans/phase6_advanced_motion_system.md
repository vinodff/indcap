# Phase 6 — Advanced Motion Graphics System

**Date:** 2026-05-15
**Status:** Plan + Step 1 partial implementation
**Goal:** Move from "good 2D canvas motion graphics" to a system that competes with After Effects–style content for short-form video, with frame-safe rendering, creative typography, real 3D-feel, premium icons, and per-animation export.

---

## 1. User-facing complaints driving this phase

From the user's exact words:

1. **"Text motion graphic is generated according to the frame ratio sometime the animation goes out of the frame"** — text overflow on 9:16 / 1:1 ratios.
2. **"Use the most advanced animation and color topography, keep bright and more creative, not simple like using the shape cards"** — current primitives lean on flat rectangles; want depth/lighting/dimensionality.
3. **"3D shapes and lighting and relevant icons not a normal icons use the creative unique color emojis"** — wants premium-looking icons, not flat lucide outlines.
4. **"User can also export the videos can also separate animation i mean separately each animation export at onces user download the folder of animation with timeline and context"** — per-beat export, bundled with manifest.
5. **"Build complete perfect product"** — production-quality, not demo-quality.

---

## 2. Research summary — tech stack survey

The motion-graphics-on-web landscape, narrowed to what we'd actually use:

### Animation engines (already have GSAP)
| Library | Verdict | Notes |
|---|---|---|
| **GSAP** | Keep. Already installed. | Industry standard. Free for non-commercial. We use it for timeline math implicitly. |
| **motion** (Framer Motion successor) | Skip. | React-flavored — overkill for a canvas pipeline. |
| **popmotion** | Skip for now. | Spring physics, ~5kB. Our `easeOutElastic` is close enough today. |

### 3D rendering on the web
| Library | Verdict | Notes |
|---|---|---|
| **Three.js** | Adopt for Phase 6 Step 3. | The only credible option for real 3D primitives. ~600kB but tree-shakable. |
| **react-three-fiber** | Skip. | Imperative Three.js calls keep us aligned with the existing canvas RAF loop. |
| **PixiJS** | Skip. | 2D-only, no real win over canvas-2d for our compositional style. |
| **Babylon.js** | Skip. | Game-engine-heavy. |

### Particle systems
| Library | Verdict | Notes |
|---|---|---|
| **tsparticles** | Skip. | Our hand-rolled particle physics in `particleBurst.ts` is faster and gives us shader-blend control. |
| **Three.js Points** | Adopt later (Step 3). | For true 3D particle clouds with lighting. |

### Icon systems
| Library | Verdict | Notes |
|---|---|---|
| **Lucide (already in app)** | Keep for UI chrome only. | Outline icons don't read on the canvas — too thin. |
| **System emoji glyphs** | Adopt as the default canvas icon path. | Apple Color Emoji / Segoe UI Emoji 14+ render 3D-ish. Already used for icons; we expand the alias map. |
| **Lordicon** | Skip for v6. | Animated SVG, but adds external network dependency per animation and licensing constraints. |
| **Noto Animated GIFs (already wired for captions)** | Adopt as an opt-in upgrade. | Already in this project's `emojiAutoMatcher.ts`. Adds true motion to icons. ImageBitmap caching needed. |

### Export
| Library | Verdict | Notes |
|---|---|---|
| **MediaRecorder (browser native)** | Keep. | What Phase 4 already uses. |
| **ffmpeg.wasm** | Skip. | 25MB+ download, slow first load. Offline render gains aren't worth it for short clips. |
| **JSZip** | Adopt for per-beat export bundle. | ~95kB, zero-config, only needed when user clicks "Export each separately". |
| **gifenc** | Skip. | GIF export niche — MP4/WebM is the universal currency. |

### Typography
- We already use `Space Grotesk` for kinetic type. Add `Bricolage Grotesque` (free, variable font weight for kinetic morphing) and `Caveat` (handwriting-style — used for callouts) via Google Fonts.
- Use **OKLCH** color space (built into modern CSS / canvas via `oklch()`) for perceptually uniform brightness across palettes — fixes the "muddy mid-tone" problem of HSL.

### Frame-safe text rendering
- No library — hand-roll a `getSafeArea(width, height, aspectRatio)` and a `fitText(ctx, text, maxWidth, maxFontSize)` helper. Standard canvas math.

---

## 3. Phased build plan

Each step is independently shippable. The order is by user-value-per-effort.

### Step 1 — Frame safety + creative palettes (THIS COMMIT)
Direct fix for the overflow complaint, plus three new vibrant palettes.

Sub-steps:
- 1a. Add `services/motion/safeArea.ts` with `getSafeArea(w, h, padding)` and `fitText(ctx, text, fontFamily, maxWidth, maxFontSize, minFontSize)` helpers.
- 1b. Apply safe-area clamping to text-heavy primitives: `big-text-reveal`, `quote-card`, `bullet-list-reveal`, `lower-third`, `glitch-text`.
- 1c. Add 3 new palettes to `palettes.ts`:
  - **neon-bright**: hot pink / electric cyan / lime over black. Vaporwave / cyberpunk.
  - **pastel-pop**: mint / lavender / peach. Kids-friendly but premium.
  - **gradient-blast**: animated multi-stop primary that morphs through a 4-color cycle. Used as base + accent in motion.
- 1d. Update the `Palette` union, panel picker, Gemini prompt.

### Step 2 — Creative icon system (NEXT COMMIT)
Move from generic emojis to a curated "premium" set with rich aliases.

Sub-steps:
- 2a. Expand `services/motion/icons.ts` with 150+ aliases mapping concepts to high-impact emojis: `'boom' → '💥'`, `'magic' → '✨'`, `'gem' → '💎'`, `'mind-blown' → '🤯'`, `'unicorn' → '🦄'`, `'crystal' → '🔮'`, `'shock' → '⚡'`, etc.
- 2b. Add **animated Noto GIF** fallback path: when `animatedIcons: true` flag is set on a beat, the renderer tries to load the Noto CDN GIF (already used for captions), caches as `ImageBitmap`, and draws via `drawImage`.
- 2c. Add `iconStyle: 'flat' | 'animated' | '3d-emoji'` per-beat param. UI toggle in beat editor.

### Step 3 — True 3D primitives (DEFERRED — separate plan)
This is the biggest lift. Two options:

**3a. Three.js side scene + canvas composite** (recommended)
- Headless `OffscreenCanvas` running Three.js scene
- Renders to a `WebGLRenderer` → reads texture → composites onto the main 2D canvas as an image
- Three new primitives:
  - `3d-text-extrude`: extruded text with PBR material, two-point lighting, shallow depth-of-field
  - `3d-cube-card`: rotating cube card revealing 6 faces of content
  - `3d-particle-cloud`: GPU particles with bloom

**3b. Faked 3D on canvas-2d** (cheaper, ships sooner)
- Multi-layer parallax depth illusion
- Perspective-skewed shapes (matrix transforms)
- Hand-painted soft shadows / specular highlights
- No new dependency

Decision deferred. After Step 2 lands, we choose.

### Step 4 — Per-beat export with manifest (THIS COMMIT)
The user's most concrete export request.

Sub-steps:
- 4a. Install `jszip` + `@types/jszip`.
- 4b. Build `services/motionGraphicsBatchExport.ts`:
  - For each beat in the plan, create an offscreen canvas at chosen aspect dimensions.
  - Set up an isolated `MotionRendererState` containing ONLY that beat.
  - Drive playback from 0 → beat duration via a wall clock.
  - Record via `canvas.captureStream(fps)` + `MediaRecorder`.
  - Add the blob to a ZIP entry named `{order:02d}-{primitive}-{slugSnippet}.{ext}`.
- 4c. Generate `manifest.json` — full plan as JSON for re-import.
- 4d. Generate `manifest.md` — human-readable timeline:
  ```
  # Motion graphics — {topicSlug}
  Duration: {N}s · Palette: {x} · Aspect: {y}

  ## Timeline
  | # | Time | Primitive | Text | Rationale |
  | 1 | 0.0–2.5 | icon-burst | "Energy" | Visualizes the opening hook |
  ...
  ```
- 4e. Bundle as `motion-graphics-{topicSlug}-{YYYYMMDD-HHmm}.zip`.
- 4f. Add "Export each animation separately (ZIP)" mode in `MotionExportDialog`.

### Step 5 — Final polish (LATER)
- Beat-to-caption snapping (existing plan)
- "Bright color mode" global toggle
- Spring physics dep if elastic feels weak
- 3 new aspect ratios: 21:9 cinematic, 2:3 ad portrait, 3:4 magazine

---

## 4. Honest limitations of the canvas-2d path

These are physics-of-the-platform, not bugs:

- **No real motion blur.** MediaRecorder captures frames at the requested fps; sub-frame interpolation would require offline rendering. The "motion-blur trails" we draw are visual fakes.
- **No real light bouncing / global illumination.** We use radial gradients + screen-blend to fake bloom.
- **Text outlines are pixel-sampled.** Above ~10% canvas height some kerning artifacts show. Mitigation: SDF text would solve this but requires WebGL.
- **CPU/GPU bound at high resolutions + many particles.** A 1920×1080 frame with 150 particles + glow + post-processing runs ~50-58fps on mid laptops. Phase 6 keeps the cap at 60fps and trades down gracefully.

If any of these become product-blocking, the answer is Three.js + WebGL — not more canvas math. That's Step 3.

---

## 5. What ships in THIS commit

- This document.
- **Step 1**: safe-area helper + 3 vibrant palettes + frame-safe big-text-reveal/quote-card/bullet-list-reveal/lower-third.
- **Step 4**: per-beat ZIP export (JSZip-based) with manifest.json + manifest.md, accessible from the existing export dialog via a new "Export each beat separately" toggle.

Step 2 (creative icons) and Step 3 (3D primitives) ship in follow-on commits.
