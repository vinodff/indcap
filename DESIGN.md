# Createrin Design System

Source of truth for all editor UI. If a change violates this file, the change is wrong.

## Color

Tokens live in `index.css` (`--cc-*`). Never hardcode hex in components when a token exists.

| Role | Token / class | Rule |
|---|---|---|
| Background | `--cc-bg` #0a0a0a | App shell |
| Surfaces | `--cc-surface` → `--cc-surface-3` | Panels, popovers (3 = floating) |
| Borders | `--cc-border` / `-mid` / `-hi` | Default / emphasis / hover |
| Text | `--cc-text-1..4` | 1 headings, 2 body, 3 labels, 4 disabled |
| **Accent (the only one)** | `--cc-blue` #3b82f6, `--cc-blue-light`, `--cc-blue-dim` | ALL active/selected/primary states |
| Destructive | `--cc-red` | Delete, errors, playhead. Nothing else. |

**One-accent rule:** active toggle = `bg-[var(--cc-blue-dim)] text-[var(--cc-blue-light)]`.
Primary CTA = `bg-[var(--cc-blue)] text-white hover:bg-blue-500`.
Inactive chrome = `text-[var(--cc-text-3)] hover:bg-white/5 hover:text-[var(--cc-text-2)]`.
NO per-feature accent colors (no purple studio, green SFX, pink highlight, orange AI). This was removed 2026-07-06 — do not reintroduce.

Timeline track hues are the exception: muted, desaturated identity colors defined ONLY in
`components/timeline/trackModel.ts` TRACK_META and the muted marker palettes in
EnhancedTimeline. Keep saturation low; never neon.

## Typography

Geist/Inter (body), mono for timecodes.
- Section headers (right panel): 12px semibold uppercase tracking-widest `--cc-text-3` icon `--cc-blue-light`
- Chrome labels/buttons: `font-semibold` **sentence case** — never `font-black uppercase`
- Timeline labels: 10px semibold `--cc-text-3`
- Timecodes/numbers: mono

## Spacing & shape

- 4px base grid. Panel padding 12-16px. Chip padding px-2.5 py-1.
- Radius: chips/buttons `rounded-lg`, panels/cards `rounded-xl`, phone frame `rounded-[2rem]`.
- Popovers: `bg-[var(--cc-surface-3)] border-[var(--cc-border-mid)] rounded-xl shadow-2xl`.

## Component recipes

- **Quiet chip (FX bar):** inactive ghost, active blue-dim. See App.tsx FX bar.
- **Tab:** active `text-[var(--cc-text-1)]` + blue underline/bg-dim; inactive `--cc-text-3`.
- **Template card:** neutral surface, selected `bg-blue-600/15 border-blue-500/50`, badges `bg-white/5 text-gray-400`.
- **Slider:** `accent-blue-500`.
- **Toggle:** on = `bg-[var(--cc-blue)]`.

## Layout (editor)

Preview is the hero. Order of visual weight: preview → timeline → right panel → collapsed sound design.
Right panel tabs: Style · Text · Motion · Assets. Timeline rows slim (captions 28px, resources ≤20px) with a left gutter label column.

## Voice in UI copy

Utility language: what it is, what it does ("Sound design", "Save as template").
No hype words, no ALL-CAPS shouting, no emoji in chrome (emoji allowed in content/labels users chose).
