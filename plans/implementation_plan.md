# CreatorIn v1 - Remaining Phases Implementation Plan

## Overview
This document outlines the implementation plan for the remaining phases of the CreatorIn v1 application:
- Phase 5: Sticker & Emoji Overlay System Enhancement
- Phase 6: Caption Templates Gallery with live preview thumbnails
- Phase 7: Text Effects Panel (Glow, shadow, outline, gradient, 3D depth)
- Phase 8: Auto-Caption Split/Merge in transcript editor
- Phase 11: Caption Timing Fine-Tune (drag handles on timeline)
- Phase 12: Aspect Ratio Presets (9:16, 16:9, 1:1, 4:5)
- Phase 13: Batch Caption Style Apply
- Phase 14: Caption Search & Replace
- Phase 15: Keyboard Shortcut Panel

## Phase 5: Rebuild Sticker & Emoji Overlay System

### Current State
**NOTE (2026-04-19):** `StickerPanel.tsx` was deleted from the codebase. `services/emojiAutoMatcher.ts` (new) provides emoji auto-matching. The `StickerItem` interface still exists in `types.ts`. This phase requires rebuilding the sticker panel, not enhancing an existing one. The `ToolsPanel.tsx` was also deleted — verify where sticker controls previously lived before building.

### Enhancements Needed
1. **Add image sticker support** (upload, position, scale, rotation)
2. **Add sticker animation controls** (bounce, spin, pulse, shake) - already partially implemented
3. **Improve sticker duration editing UI**
4. **Add sticker layering/order controls**

### Implementation Approach
- Extend StickerItem interface to support image URLs
- Add image upload functionality to StickerPanel
- Enhance duration editing with better UI
- Add z-index or ordering controls for stickers

## Phase 6: Caption Templates Gallery with live preview thumbnails

### Current State
Styles are defined in constants.ts and accessed via STYLES_CONFIG. StyleCustomizer shows presets but without live preview.

### Features Needed
1. **Create template gallery component** with thumbnail previews
2. **Add live preview** of selected template on sample text
3. **Implement template categorization** (Trending, Bold, Neon, etc.)
4. **Add template search/filter functionality**
5. **Enable one-click template application**

### Implementation Approach
- Create new TemplateGallery component
- Generate thumbnail previews using canvas or SVG
- Integrate with StyleCustomizer PRESETS tab
- Add search/filter controls
- Connect to existing style selection mechanism

## Phase 7: Implement Text Effects Panel

### Current State
StyleCustomizer has basic controls for font, color, stroke, background, position.

### Features Needed
1. **Add controls for glow intensity and color**
2. **Add shadow offset, blur, and color controls**
3. **Add outline width and color controls**
4. **Add gradient color stops and direction controls**
5. **Add 3D depth controls** (extrusion, bevel, lighting)
6. **Integrate with StyleCustomizer DESIGN tab**

### Implementation Approach
- Add new sections to StyleCustomizer for each effect type
- Update activeConfig calculation in App.tsx to include effect properties
- Modify captionRenderer.ts to render the new effects
- Ensure backward compatibility with existing styles

## Phase 8: Integrate Auto-Caption Split/Merge in transcript editor

### Current State
TranscriptEditor shows captions and words with color cycling. Split functionality exists in App.tsx and EnhancedTimeline.

### Features Needed
1. **Add split caption button** to TranscriptEditor word interface
2. **Add merge captions functionality** (adjacent captions)
3. **Add visual indication** of split/merge points in transcript
4. **Update transcript editor** to show split/merge capabilities

### Implementation Approach
- Modify TranscriptEditor to show split/merge controls
- Add merge functionality to App.tsx
- Update UI to indicate split/merge points visually
- Ensure proper state updates and undo/redo support

## Phase 11: Caption Timing Fine-Tune (drag handles on timeline)

### Current State
EnhancedTimeline already has drag handles for moving and resizing captions.

### Enhancements Needed
1. **Verify existing drag handles work correctly**
2. **Add visual feedback** for drag operations
3. **Add snapping to grid/other captions option**
4. **Add timecode tooltip during drag**

### Implementation Approach
- Test current drag handle functionality
- Improve visual feedback during drag (highlight, tooltips)
- Add snapping logic to align with grid or other captions
- Add timecode display during drag operations

## Phase 12: Implement Aspect Ratio Presets ✓ COMPLETE

### Current State
**DONE (2026-04-25):** All pieces implemented. `AspectRatio` type in `types.ts:163`. `App.tsx:148` has state. `App.tsx:955-984` has dropdown UI. `VideoPreviewArea.tsx` applies CSS classes. `captionRenderer.ts` now has `getVisibleArea()` helper that computes the visible crop region for each aspect ratio, and `drawCaption()` positions anchors within the visible area. `RendererState` includes `aspectRatio`. 7 tests in `tests/captionMath.test.ts` cover visible area calculations.

### Features Needed
1. **Add aspect ratio state** to App.tsx
2. **Add aspect ratio presets button** in UI (9:16, 16:9, 1:1, 4:5)
3. **Implement video canvas resizing** based on aspect ratio
4. **Update caption positioning calculations** for different ratios
5. **Add aspect ratio indicator** in preview area

### Implementation Approach
- Add aspectRatio state to App.tsx
- Create aspect ratio selector UI component
- Update video and canvas dimensions based on aspect ratio
- Adjust caption positioning calculations in captionRenderer.ts
- Add visual indicator in VideoPreviewArea

## Phase 13: Implement Batch Caption Style Apply

### Current State
No multi-select or batch operations exist.

### Features Needed
1. **Add multi-select capability** in transcript editor/timeline
2. **Add batch style apply button** when multiple captions selected
3. **Add option to apply style to all captions**
4. **Add preview of batch changes** before applying

### Implementation Approach
- Add selection state to TranscriptEditor and EnhancedTimeline
- Implement multi-select functionality (shift-click, drag-select)
- Add batch apply button in StyleCustomizer or toolbar
- Create preview mechanism for batch changes
- Update caption styles in batch

## Phase 14: Implement Caption Search & Replace

### Current State
TranscriptEditor shows captions but no search functionality.

### Features Needed
1. **Add search bar** to TranscriptEditor
2. **Add replace functionality** with replace all/replace one options
3. **Add case sensitivity and whole word options**
4. **Add search result highlighting** in transcript
5. **Add navigation between search results**

### Implementation Approach
- Add search controls to TranscriptEditor header
- Implement search/filter logic for captions and words
- Add highlighting of search results in word display
- Add replace functionality with options
- Add navigation controls (next/previous match)

## Phase 15: Keyboard Shortcut Panel ✓ COMPLETE

### Current State
**DONE (2026-04-19):** `components/KeyboardShortcutPanel.tsx` is fully implemented (293 lines). Features: localStorage persistence, conflict detection, all shortcuts (playback/editing/navigation/tools), customizable key bindings. No implementation needed.

### Features Needed
1. **Create keyboard shortcut reference panel**
2. **List all available shortcuts** (playback, editing, navigation)
3. **Add ability to customize shortcuts** (stored in localStorage)
4. **Add shortcut conflict detection**
5. **Add shortcut panel toggle button** in UI

### Implementation Approach
- Create KeyboardShortcutPanel component
- Define default shortcut map
- Add shortcut customization UI with conflict detection
- Store custom shortcuts in localStorage
- Add toggle button to UI (likely in header or tools panel)
- Implement keyboard event handling using custom shortcuts

## Implementation Order (Updated 2026-04-19 via /plan-eng-review)

Decisions from eng review incorporated:
- Phase 0 added: test setup + pre-flight fixes before any feature phase
- Phase 12 is ~80% done — only captionRenderer.ts position adjustments needed
- Phase 6 thumbnails: use CSS-based HTML div thumbnails (no canvas/video dependency)
- Phase 13 multi-select: extend App.tsx `selectedCaptionId` → `selectedCaptionIds: Set<string>`
- Phase 8 must build multi-select UI (not defer to Phase 13)
- captionRenderer.ts effect helpers extracted BEFORE Phase 7 adds new effects

**Phase 0 (NEW): Pre-flight fixes** — Run BEFORE any feature phase:
- Add `server/db/*.db*` to `.gitignore` + `git rm --cached` ✓ DONE
- Add `MAX_HISTORY = 50` to `useUndoableState` (prevents memory leak from Phases 8/11/13)
- Add LRU cache (200 entries) to `captionRenderer.ts` imageCache (prevents memory leak before Phase 5)
- Fix canvas resize for export resolution (resize canvas before MediaRecorder per chosen resolution)
- Extract `applyGradientFill()`, `applyShadow()`, `applyStroke()` helpers in `captionRenderer.ts`
- Set up vitest + pure function tests for style calculations and position math

1. **Phase 15: Keyboard Shortcut Panel** - ✓ ALREADY COMPLETE (components/KeyboardShortcutPanel.tsx)
2. **Phase 12: Aspect Ratio Presets** - ✓ COMPLETE (caption positioning via getVisibleArea)
3. **Phase 7: Text Effects Panel** - Enhances core styling capabilities
4. **Phase 6: Caption Templates Gallery** - Builds on styling system
5. **Phase 5: Enhance Sticker & Emoji Overlay System** - Independent enhancement
6. **Phase 11: Caption Timing Fine-Tune** - Refines existing timeline functionality
7. **Phase 8: Integrate Auto-Caption Split/Merge in transcript editor** - Enhances editing
8. **Phase 13: Implement Batch Caption Style Apply** - Builds on selection systems
9. **Phase 14: Implement Caption Search & Replace** - Enhances transcript editor

## Cross-Cutting Considerations

- **State Management**: Ensure all new features properly integrate with useUndoableState hooks
- **Performance**: Monitor re-renders and optimize where necessary
- **Accessibility**: Ensure new controls are keyboard accessible and have proper labels
- **Responsiveness**: Ensure UI works on different screen sizes
- **Persistence**: Consider localStorage for user preferences where appropriate
- **Error Handling**: Add proper error boundaries and user feedback for operations

## Files to Modify/Create

### New Files to Create:
- `components/TemplateGallery.tsx`
- `components/TextEffectsPanel.tsx` (or integrate into StyleCustomizer)
- `components/KeyboardShortcutPanel.tsx`
- `components/AspectRatioSelector.tsx`
- `plans/implementation_plan.md` (this file)

### Existing Files to Modify:
- `App.tsx` - Add state for aspect ratio, shortcuts, etc.
- `components/StyleCustomizer.tsx` - Add text effects controls, template gallery integration
- `components/StickerPanel.tsx` - Add image support, improve controls
- `components/TranscriptEditor.tsx` - Add split/merge, search/replace functionality
- `components/EnhancedTimeline.tsx` - Enhance drag handles, add multi-select
- `components/VideoPreviewArea.tsx` - Add aspect ratio indicator
- `services/captionRenderer.ts` - Implement text effects rendering
- `constants.ts` - Add aspect ratio constants, effect configurations
- `types.ts` - Extend interfaces for new features (StickerItem, effect configs, etc.)

## Next Steps

Since I'm currently in architect mode, I should:
1. Create this implementation plan document
2. Switch to code mode to begin implementation
3. Start with Phase 15 (Keyboard Shortcut Panel) as it provides foundational utilities

---

## Phase X: Caption System Complete Rebuild (Design-reviewed 2026-05-07)

### Goal
Replace the current 12-template / ~15-property system with a 300-property-per-template caption studio. More advanced than CapCut on every axis: depth, animation physics, visual fidelity, and GIF support.

### Design Decisions (from /plan-design-review)

**Property Taxonomy — 300 props per template, 15 sections:**

| Section | Props | Default expanded |
|---|---|---|
| Typography | 30 | YES |
| Color System | 40 | No |
| Stroke & Border | 20 | No |
| Shadow Layers | 30 | No |
| Glow / Neon | 15 | No |
| Entry Animation | 20 | No |
| Exit Animation | 20 | No |
| Idle Animation | 15 | No |
| Word Highlight | 25 | No |
| Per-Character | 20 | No |
| Particles | 25 | No |
| Background | 20 | No |
| Layout | 15 | No |
| Audio Sync | 15 | No |
| Emoji / GIF | 10 | No |

**Panel IA:** Contextual accordion — one section open at a time. Each section header shows property count badge. No tabs.

**Template Gallery:**
- Dark canvas cards (16:9, sample text rendered in that template's actual style)
- Virtualized + lazy-render: IntersectionObserver, canvas pauses after snapshot PNG captured
- On hover: canvas resumes, entry animation plays
- Gallery header: search bar + filter chips (Trending / Gaming / Cinematic / Neon / Minimal / Retro / All)
- GIF Toggle (`role="switch"`) prominently placed between gallery and properties panel

**Animated GIF Toggle:**
- Controls: emoji characters in captions → animated Noto GIFs (fonts.gstatic.com CDN)
- OFF: static system emoji rendering
- ON: `emojiToNotoUrl()` fetch, animated on canvas
- Error handling: silent fallback to system emoji on 404/timeout
- State: `emojiGifEnabled: boolean` in RendererState

**Undo/Redo:**
- History commits on pointer-up (mouseup/blur/Enter) only
- Mid-drag updates are live preview only — no history entry
- Debounce in all property input handlers
- Max 50 history entries (already in useUndoableState)

**Interaction States:**
- Template gallery: skeleton shimmer cards while fonts/styles load
- Gallery empty (search): "No templates match '[query]'" + clear button
- Noto GIF: silent fallback to system emoji on error
- Property input invalid value: red border + tooltip (e.g. strokeWidth < 0)
- Property reset: each section header has reset-to-default icon button

**Accessibility:**
- Accordion headers: `aria-expanded`, `aria-controls`
- GIF toggle: `role="switch"`, `aria-checked`
- All sliders: `<input type="range">` with `aria-label` + value readout
- Touch targets: minimum 44px on all interactive elements
- Color contrast: all text on dark surfaces passes WCAG AA (4.5:1 minimum)

**Mobile:**
- Panel slides up as bottom sheet
- Only 2 sections visible without scroll
- GIF toggle pinned above sheet

**Design Tokens (define in CSS variables, index.css):**
```css
--surface-base: #0A0A0A;
--surface-elevated: #141414;
--surface-interactive: #1E1E1E;
--surface-hover: #252525;
--border-subtle: rgba(255,255,255,0.08);
--border-visible: rgba(255,255,255,0.16);
--accent-primary: #7C3AED;
--accent-active: #A78BFA;
--text-primary: #F9FAFB;
--text-secondary: rgba(249,250,251,0.6);
--text-muted: rgba(249,250,251,0.35);
```

**Typography (UI chrome):** `Inter` or `DM Sans` — NOT `system-ui` or `-apple-system`.

**Anti-patterns to avoid (AI slop blacklist):**
- No colored left-border cards
- No 3-column icon + name card grid
- No purple gradient background
- No generic hero copy on any empty state
- UI font must be explicitly set (not system default)

### Templates to Remove (imperfect / replace)
Remove from THEME_PRESETS all entries where the visual output does not match the template's name/promise. Replace with 30+ fully-specced templates covering: Trending × 8, Gaming × 5, Cinematic × 5, Neon × 5, Minimal × 3, 3D × 3, Retro × 3, Luxury × 3, Futuristic × 3.

### New Files
- `components/CaptionStudio.tsx` — the full panel (gallery + properties)
- `components/TemplateCard.tsx` — lazy canvas card
- `components/PropertyAccordion.tsx` — collapsible section wrapper
- `services/captionStyleSchema.ts` — TypeScript interface for 300-property StyleConfig
- `DESIGN.md` — design tokens, component conventions (create after this phase)

### Existing Files to Modify
- `types.ts` — extend `StyleConfig` to 300 fields across 15 sections
- `captionRenderer.ts` — implement all 300 property renderers (particles, multi-shadow, per-char animation, spring physics)
- `hyperCaptionRenderer.ts` — sync with new StyleConfig shape
- `aiStyleService.ts` — replace THEME_PRESETS with 30+ fully-specced templates
- `index.css` — add CSS variable tokens above
- `App.tsx` — wire `emojiGifEnabled` state to RendererState

### Implementation Order within Phase X
1. Define `StyleConfig` 300-field TypeScript interface (captionStyleSchema.ts + types.ts)
2. Implement CSS variable tokens (index.css)
3. Build `PropertyAccordion` component
4. Build `TemplateCard` with lazy canvas render + hover animation
5. Build `CaptionStudio` panel (gallery + GIF toggle + properties)
6. Implement 30+ new templates in aiStyleService.ts
7. Extend captionRenderer.ts for all new property categories (particles, multi-shadow, per-char, spring physics)
8. Wire undo commit-on-pointer-up to all property inputs
9. Add aria attributes, keyboard nav, touch targets
10. Mobile bottom sheet layout
## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 1 | issues_found | 10 findings from outside voice |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR (PLAN) | 8 issues, 1 critical gap |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | issues_open | score: 2/10 → 7/10, 7 decisions made |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**UNRESOLVED:** 1 (template export format — deferred to v2)
**VERDICT:** ENG CLEARED for existing phases. Phase X (Caption Rebuild) added — run /plan-eng-review on Phase X before implementing.
