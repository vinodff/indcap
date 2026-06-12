/**
 * specialEffects.ts — Advanced per-letter caption effect engines.
 *
 * Implements the seven specialRenderer values that previously existed only as
 * template config (dead code): NEON_FLICKER, PERSPECTIVE_3D, MAGNETIC,
 * BRUSH_STROKE, SPLIT_REVEAL (per-word) and TICKER_SCROLL, MATRIX_RAIN
 * (caption-level).
 *
 * Design rules:
 *  - Every random value is seeded from (captionSeed, wordIdx, letterIdx) so a
 *    frame rendered at time T is identical in preview and export.
 *  - Per-letter engines fall back to whole-word rendering when a word contains
 *    emoji (splitting surrogate pairs corrupts them).
 *  - Each engine owns its full draw (background, stroke, glow, fill) and the
 *    caller skips the default pipeline when an engine reports it handled the word.
 */

import { Caption, StyleConfig } from '../../../types';
import { RenderHelpers } from '../types';

// ─── Math / easing ────────────────────────────────────────────────────────────

const lerp = (a: number, b: number, t: number): number => a * (1 - t) + b * t;

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));

const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);

const backEaseOut = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const elasticOut = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

/** Deterministic hash → [0,1). Same inputs always produce the same value. */
const seeded = (a: number, b = 0, c = 0): number => {
  let h = (a * 374761393 + b * 668265263 + c * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/** FNV-1a hash of a string → 32-bit int. Used to seed per-caption randomness. */
export const hashCaptionId = (id: string): number => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
};

const HAS_EMOJI = /[️\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

/** Split into renderable units (handles surrogate pairs via Array.from). */
const toLetters = (word: string): string[] => Array.from(word);

// ─── Per-word effect dispatcher ───────────────────────────────────────────────

export interface SpecialWordArgs {
  word: string;
  idx: number;            // word index within the caption
  active: boolean;        // is this the currently-spoken word
  wordProgress: number;   // 0→1 through the active word's timing window
  fontSize: number;       // already scaled px
  scaleFactor: number;
  renderTime: number;
  captionSeed: number;    // hashCaptionId(caption.id)
}

/**
 * Draws a word using its style's special effect engine.
 * The canvas is already translated so (0,0) is the word's center, with entry/exit
 * and kinetic transforms applied. Returns true when the word was fully drawn.
 */
export function drawSpecialWordEffect(
  helpers: RenderHelpers,
  ctx: CanvasRenderingContext2D,
  style: StyleConfig,
  args: SpecialWordArgs
): boolean {
  switch (style.specialRenderer) {
    case 'NEON_FLICKER':   return drawNeonFlicker(helpers, ctx, style, args);
    case 'PERSPECTIVE_3D': return drawPerspective3D(helpers, ctx, style, args);
    case 'MAGNETIC':       return drawMagnetic(helpers, ctx, style, args);
    case 'BRUSH_STROKE':   return drawBrushStroke(helpers, ctx, style, args);
    case 'SPLIT_REVEAL':   return drawSplitReveal(helpers, ctx, style, args);
    default: return false;
  }
}

/** Measure each letter and return offsets so the word stays center-anchored. */
function layoutLetters(
  ctx: CanvasRenderingContext2D,
  letters: string[]
): { widths: number[]; offsets: number[]; total: number } {
  const widths = letters.map(l => ctx.measureText(l).width);
  const total = widths.reduce((s, w) => s + w, 0);
  const offsets: number[] = [];
  let x = -total / 2;
  for (const w of widths) {
    offsets.push(x + w / 2); // center of each letter
    x += w;
  }
  return { widths, offsets, total };
}

// ─── 1. NEON_FLICKER — per-letter neon tube ignition ─────────────────────────
//
// The word ignites like a real neon sign: letters buzz on in a scrambled order,
// each with electrical instability. A steady letter gets a two-pass draw
// (wide magenta halo + hot white-pink core). A letter that drops out renders
// as a dim glass tube. The whole sign suffers a brief brown-out occasionally.

function drawNeonFlicker(
  helpers: RenderHelpers,
  ctx: CanvasRenderingContext2D,
  style: StyleConfig,
  a: SpecialWordArgs
): boolean {
  if (HAS_EMOJI.test(a.word)) return false;
  const letters = toLetters(a.word);
  const { offsets } = layoutLetters(ctx, letters);

  const neonColor = style.activeTextColor || '#FF00FF';
  const tubeOff = 'rgba(255,100,200,0.22)';      // unpowered glass tube
  const coreColor = '#FFE6FF';                   // hot center of a lit tube

  // Whole-sign brown-out: rare, short, deterministic.
  const brownPhase = seeded(a.captionSeed, a.idx, 99);
  const brownT = (a.renderTime * 0.7 + brownPhase) % 3.1;
  const brownOut = brownT < 0.07 ? 0.25 : 1;

  ctx.save();
  ctx.textAlign = 'center';

  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    const lx = offsets[i];

    // Ignition order is scrambled per letter; inactive words stay dim.
    const igniteAt = seeded(a.captionSeed, a.idx, i) * 0.45;
    const ignited = a.active && a.wordProgress >= igniteAt;

    // Per-letter electrical instability once lit.
    const flickNoise =
      Math.sin(a.renderTime * 31 + i * 7.3 + brownPhase * 17) *
      Math.sin(a.renderTime * 53 + i * 3.1);
    const dropout = ignited && flickNoise > 0.93 ? 0.3 : 1;
    const power = (ignited ? 1 : 0) * dropout * brownOut;

    // Buzz jitter: a freshly ignited letter trembles for a moment.
    const sinceIgnite = a.active ? clamp01((a.wordProgress - igniteAt) / 0.1) : 1;
    const buzz = (1 - sinceIgnite) * 1.5 * a.scaleFactor;
    const jx = (seeded(a.captionSeed, i, Math.floor(a.renderTime * 60)) - 0.5) * buzz;

    if (power < 0.4) {
      // Unpowered: dim glass tube with a thin outline.
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(60,10,60,0.8)';
      ctx.lineWidth = Math.max(1, 3 * a.scaleFactor);
      ctx.lineJoin = 'round';
      ctx.strokeText(letter, lx + jx, 0);
      ctx.fillStyle = tubeOff;
      ctx.fillText(letter, lx + jx, 0);
      ctx.restore();
      continue;
    }

    // Pass 1 — outer halo.
    ctx.save();
    ctx.globalAlpha = 0.85 * power;
    ctx.shadowColor = neonColor;
    ctx.shadowBlur = (style.shadowBlur || 40) * a.scaleFactor;
    ctx.fillStyle = neonColor;
    ctx.fillText(letter, lx + jx, 0);
    ctx.restore();

    // Pass 2 — hot core, tighter glow.
    ctx.save();
    ctx.globalAlpha = power;
    ctx.shadowColor = neonColor;
    ctx.shadowBlur = 10 * a.scaleFactor;
    ctx.fillStyle = coreColor;
    ctx.fillText(letter, lx + jx, 0);
    ctx.restore();
  }

  ctx.restore();
  return true;
}

// ─── 2. PERSPECTIVE_3D — real Y-axis door swing with extrusion ───────────────
//
// The word swings in around its left vertical edge like a door (true perspective
// foreshortening per letter, not a flat squash): each letter's X is projected,
// its width compressed by the projection derivative, and letters farther from
// the viewer are shaded darker. A dark extrusion is drawn behind the face.

function drawPerspective3D(
  helpers: RenderHelpers,
  ctx: CanvasRenderingContext2D,
  style: StyleConfig,
  a: SpecialWordArgs
): boolean {
  if (HAS_EMOJI.test(a.word)) return false;
  const letters = toLetters(a.word);
  const { offsets, total } = layoutLetters(ctx, letters);

  const maxDeg = style.perspectiveDegrees ?? 45;
  // Swing: maxDeg*2 → 0 during the first 40% of the word window, slight settle.
  const t = a.active ? clamp01(a.wordProgress / 0.4) : 1;
  const settle = a.active ? 1 + Math.sin(Math.min(1, (a.wordProgress - 0.4) / 0.2) * Math.PI) * 0.02 : 1;
  const angle = (1 - easeOutQuint(t)) * maxDeg * 2 * (Math.PI / 180);

  const sinA = Math.sin(angle);
  const cosA = Math.cos(angle);
  const focal = total * 1.6 + 1; // perspective strength scales with word width

  const fill = a.active
    ? (style.activeTextColor || '#FFD700')
    : (style.textColor || '#FFFFFF');

  ctx.save();
  ctx.textAlign = 'center';
  ctx.scale(settle, settle);

  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    // Rotate the letter's center around the word's left edge (x = -total/2).
    const rel = offsets[i] + total / 2;          // distance from hinge
    const z = rel * sinA;                        // depth away from viewer
    const persp = focal / (focal + z);           // perspective divide
    const px = (-total / 2 + rel * cosA) * persp;
    const squeezeX = Math.max(0.05, cosA * persp);
    const depthShade = clamp01(1 - (z / (total + 1)) * 0.9);

    ctx.save();
    ctx.translate(px, 0);
    ctx.scale(squeezeX, Math.max(0.6, persp));

    // Extrusion: stacked dark layers receding opposite the swing.
    const depth = Math.max(2, 7 * a.scaleFactor) * (0.4 + 0.6 * (1 - angle / Math.PI));
    const layers = 4;
    ctx.shadowBlur = 0;
    for (let d = layers; d >= 1; d--) {
      const dt = d / layers;
      ctx.fillStyle = `rgba(20,20,24,${0.85 * depthShade})`;
      ctx.fillText(letter, dt * depth * 0.5, dt * depth);
    }

    // Face with stroke + shadow from the template.
    if (style.strokeWidth && style.strokeColor) {
      ctx.strokeStyle = style.strokeColor;
      ctx.lineWidth = style.strokeWidth * a.scaleFactor;
      ctx.lineJoin = 'round';
      ctx.strokeText(letter, 0, 0);
    }
    helpers.applyShadow(ctx, style, a.scaleFactor);
    // Darken letters that sit deeper in the scene.
    if (depthShade < 0.999) {
      ctx.fillStyle = shadeColor(fill, depthShade);
    } else {
      ctx.fillStyle = fill;
    }
    ctx.fillText(letter, 0, 0);
    ctx.restore();
  }

  ctx.restore();
  return true;
}

/** Multiply a hex color's RGB by `k` (0..1). Non-hex input is returned as-is. */
function shadeColor(color: string, k: number): string {
  if (!color.startsWith('#') || (color.length !== 7 && color.length !== 4)) return color;
  const full = color.length === 4
    ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
    : color;
  const r = Math.round(parseInt(full.slice(1, 3), 16) * k);
  const g = Math.round(parseInt(full.slice(3, 5), 16) * k);
  const b = Math.round(parseInt(full.slice(5, 7), 16) * k);
  return `rgb(${r},${g},${b})`;
}

// ─── 3. MAGNETIC — per-letter scatter → spring snap with lock spark ──────────
//
// Letters fly in from deterministic scatter points with motion-blur streaks,
// overshoot on an elastic spring, and emit a cyan spark ring the instant they
// lock into place.

function drawMagnetic(
  helpers: RenderHelpers,
  ctx: CanvasRenderingContext2D,
  style: StyleConfig,
  a: SpecialWordArgs
): boolean {
  if (HAS_EMOJI.test(a.word)) return false;
  const letters = toLetters(a.word);
  const { offsets } = layoutLetters(ctx, letters);

  const accent = style.activeTextColor || '#00FFFF';
  const fill = a.active ? '#FFFFFF' : (style.textColor || '#FFFFFF');

  ctx.save();
  ctx.textAlign = 'center';

  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    const lx = offsets[i];

    // Stagger each letter's spring; whole flight fits in first 55% of the word.
    const delay = i * (0.35 / Math.max(1, letters.length));
    const t = a.active ? clamp01((a.wordProgress - delay) / 0.5) : 1;
    const springT = elasticOut(t);

    // Deterministic scatter origin.
    const ang = seeded(a.captionSeed, a.idx * 31 + i, 7) * Math.PI * 2;
    const dist = (90 + seeded(a.captionSeed, a.idx * 31 + i, 13) * 160) * a.scaleFactor;
    const fromX = Math.cos(ang) * dist;
    const fromY = Math.sin(ang) * dist * 0.7;
    const rot = (seeded(a.captionSeed, a.idx * 31 + i, 23) - 0.5) * 1.2 * (1 - springT);

    const curX = lerp(fromX, 0, springT);
    const curY = lerp(fromY, 0, springT);

    ctx.save();
    ctx.translate(lx + curX, curY);
    ctx.rotate(rot);
    ctx.globalAlpha = clamp01(t * 2.2);

    // Motion-blur streak while in flight.
    if (t > 0 && t < 0.75) {
      const trailN = 3;
      for (let s = 1; s <= trailN; s++) {
        const tt = clamp01(t - s * 0.05);
        const sx = lerp(fromX, 0, elasticOut(tt)) - curX;
        const sy = lerp(fromY, 0, elasticOut(tt)) - curY;
        ctx.save();
        ctx.globalAlpha = 0.12 * (1 - s / (trailN + 1)) * clamp01(t * 2);
        ctx.fillStyle = accent;
        ctx.fillText(letter, sx, sy);
        ctx.restore();
      }
    }

    // Stroke + glow + face.
    if (style.strokeWidth && style.strokeColor) {
      ctx.strokeStyle = style.strokeColor;
      ctx.lineWidth = style.strokeWidth * a.scaleFactor;
      ctx.lineJoin = 'round';
      ctx.strokeText(letter, 0, 0);
    }
    ctx.shadowColor = accent;
    ctx.shadowBlur = (style.shadowBlur || 20) * a.scaleFactor * (a.active ? 1 : 0.4);
    ctx.fillStyle = fill;
    ctx.fillText(letter, 0, 0);

    // Lock spark: an expanding ring right as the letter snaps home (t≈0.55-0.8).
    if (a.active && t > 0.55 && t < 0.8) {
      const sparkT = (t - 0.55) / 0.25;
      ctx.save();
      ctx.globalAlpha = (1 - sparkT) * 0.9;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2 * a.scaleFactor;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, 0, a.fontSize * (0.3 + sparkT * 0.55), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  ctx.restore();
  return true;
}

// ─── 4. BRUSH_STROKE — painted swash reveal ───────────────────────────────────
//
// A rough-edged brush swash paints itself behind the word (overlapping stamped
// circles along a curved path with deterministic jitter and splatter), and the
// text wipes in following the brush head.

function drawBrushStroke(
  helpers: RenderHelpers,
  ctx: CanvasRenderingContext2D,
  style: StyleConfig,
  a: SpecialWordArgs
): boolean {
  const w = helpers.getMixedTextWidth(ctx, a.word, a.fontSize);
  const padX = a.fontSize * 0.45;
  const halfW = w / 2 + padX;
  const brushH = a.fontSize * 0.72;
  const paint = style.backgroundColor || 'rgba(255,50,50,0.9)';

  // Paint progress: sweeps during first 45% of the word; inactive = fully painted.
  const t = a.active ? easeOutQuint(clamp01(a.wordProgress / 0.45)) : 1;
  const headX = -halfW + t * halfW * 2;

  ctx.save();

  // ── Swash: stamped circles along a slight S-curve ──
  const stamps = 26;
  ctx.fillStyle = paint;
  ctx.shadowBlur = 0;
  for (let i = 0; i < stamps; i++) {
    const st = i / (stamps - 1);
    const sx = -halfW + st * halfW * 2;
    if (sx > headX) break;
    const curve = Math.sin(st * Math.PI) * a.fontSize * 0.06
      + Math.sin(st * Math.PI * 2 + a.captionSeed % 7) * a.fontSize * 0.03;
    const rJitter = seeded(a.captionSeed, a.idx * 17 + i, 3);
    const r = (brushH / 2) * (0.82 + rJitter * 0.36) * (st < 0.06 ? 0.7 : 1);
    ctx.beginPath();
    ctx.ellipse(sx, curve, r * 1.15, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Brush head blob + splatter while painting.
  if (a.active && t < 1) {
    ctx.beginPath();
    ctx.ellipse(headX, 0, brushH * 0.62, brushH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let s = 0; s < 4; s++) {
      const sr = seeded(a.captionSeed, a.idx * 13 + s, Math.floor(t * 10));
      const dotR = (1.2 + sr * 2.2) * a.scaleFactor;
      const dx = headX + (sr - 0.3) * a.fontSize * 0.7;
      const dy = (seeded(a.captionSeed, s, a.idx) - 0.5) * brushH * 1.5;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ── Text wipes in behind the brush head ──
  ctx.beginPath();
  ctx.rect(-halfW, -a.fontSize, Math.max(0, headX + halfW * 0.1 + halfW), a.fontSize * 2);
  ctx.clip();

  const fill = a.active
    ? (style.activeTextColor || '#FFFFFF')
    : (style.textColor || '#FFFFFF');
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 4 * a.scaleFactor;
  ctx.shadowOffsetY = 2 * a.scaleFactor;
  helpers.drawMixedText(ctx, a.word, a.fontSize, fill, 0, 0, false);

  ctx.restore();
  return true;
}

// ─── 5. SPLIT_REVEAL — halves slide in and join with a flash ─────────────────
//
// The top half of the word slides in from the left, the bottom half from the
// right. When they meet, a thin light seam flashes across the joint and the
// word settles with a tiny bounce.

function drawSplitReveal(
  helpers: RenderHelpers,
  ctx: CanvasRenderingContext2D,
  style: StyleConfig,
  a: SpecialWordArgs
): boolean {
  const w = helpers.getMixedTextWidth(ctx, a.word, a.fontSize);
  const t = a.active ? clamp01(a.wordProgress / 0.35) : 1;
  const slideT = backEaseOut(t);
  const slideDist = (1 - slideT) * w * 1.1;

  const fill = a.active
    ? (style.activeTextColor || '#FFD700')
    : (style.textColor || '#FFFFFF');

  // Settle bounce after the join.
  const settleT = a.active ? clamp01((a.wordProgress - 0.35) / 0.25) : 1;
  const settle = 1 + (1 - settleT) * (settleT > 0 ? 0.05 * Math.sin(settleT * Math.PI) : 0);

  const drawHalf = (top: boolean, offsetX: number) => {
    ctx.save();
    ctx.beginPath();
    const clipH = a.fontSize * 1.4;
    if (top) ctx.rect(-w, -clipH, w * 2, clipH + 0.5); // +0.5 overlap kills the hairline gap
    else ctx.rect(-w, -0.5, w * 2, clipH + 0.5);
    ctx.clip();
    ctx.translate(offsetX, 0);
    if (style.strokeWidth && style.strokeColor) {
      helpers.applyStroke(ctx, style, a.scaleFactor, a.word, a.fontSize);
    }
    helpers.applyShadow(ctx, style, a.scaleFactor);
    helpers.drawMixedText(ctx, a.word, a.fontSize, fill, 0, 0, false);
    ctx.restore();
  };

  ctx.save();
  ctx.scale(settle, settle);
  ctx.globalAlpha *= clamp01(t * 2.5);
  drawHalf(true, -slideDist);
  drawHalf(false, slideDist);

  // Seam flash when the halves meet.
  if (a.active && t >= 0.92 && settleT < 0.5) {
    const flashA = (1 - settleT / 0.5) * 0.9;
    ctx.save();
    ctx.globalAlpha = flashA;
    ctx.strokeStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 12 * a.scaleFactor;
    ctx.lineWidth = 2 * a.scaleFactor;
    ctx.beginPath();
    ctx.moveTo(-w / 2 - a.fontSize * 0.2, 0);
    ctx.lineTo(w / 2 + a.fontSize * 0.2, 0);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
  return true;
}

// ─── Caption-level effects ────────────────────────────────────────────────────

/**
 * Caption-level engines that own the entire caption draw (layout included).
 * Called before the generic word loop; returns true when handled.
 */
export function drawSpecialCaptionEffect(
  helpers: RenderHelpers,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  caption: Caption,
  style: StyleConfig,
  scaleFactor: number,
  anchorX: number,
  anchorY: number,
  renderTime: number,
  words: string[],
  activeWordIndex: number,
  fontSize: number
): boolean {
  switch (style.specialRenderer) {
    case 'TICKER_SCROLL':
      drawTickerScroll(helpers, ctx, canvas, caption, style, scaleFactor, anchorY, renderTime, words, activeWordIndex, fontSize);
      return true;
    case 'MATRIX_RAIN':
      drawMatrixRain(helpers, ctx, canvas, caption, style, scaleFactor, anchorX, anchorY, renderTime, words, activeWordIndex, fontSize);
      return true;
    default:
      return false;
  }
}

// ─── 6. TICKER_SCROLL — broadcast news ticker ─────────────────────────────────
//
// A full-width broadcast bar: red BREAKING badge, white crawl region where the
// caption text scrolls right→left (looping), accent line above, live dot.

function drawTickerScroll(
  helpers: RenderHelpers,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  caption: Caption,
  style: StyleConfig,
  scaleFactor: number,
  anchorY: number,
  renderTime: number,
  words: string[],
  activeWordIndex: number,
  fontSize: number
): void {
  const pad = (style.backgroundPadding || 16) * scaleFactor;
  const barH = fontSize + pad * 2;
  const barY = anchorY - barH / 2;
  const speed = (style.tickerSpeed || 400) * scaleFactor * 0.35;

  ctx.save();
  ctx.textBaseline = 'middle';

  // ── Bar chrome ──
  // Accent strip above the bar.
  ctx.fillStyle = '#CC0000';
  ctx.fillRect(0, barY - 5 * scaleFactor, canvas.width, 5 * scaleFactor);
  // Main bar.
  ctx.fillStyle = style.backgroundColor || '#FFFFFF';
  ctx.fillRect(0, barY, canvas.width, barH);
  // Bottom hairline.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, barY + barH, canvas.width, 2 * scaleFactor);

  // ── BREAKING badge ──
  const badgeFont = fontSize * 0.62;
  helpers.setFont(ctx, `900 ${badgeFont}px 'Archivo Black', 'Inter', sans-serif`);
  const badgeText = 'BREAKING';
  const badgeTextW = ctx.measureText(badgeText).width;
  const badgePad = 14 * scaleFactor;
  const badgeW = badgeTextW + badgePad * 2 + 14 * scaleFactor;
  ctx.fillStyle = '#CC0000';
  ctx.fillRect(0, barY, badgeW, barH);
  // Pulsing live dot.
  const pulse = 0.55 + Math.abs(Math.sin(renderTime * 3.2)) * 0.45;
  ctx.fillStyle = `rgba(255,255,255,${pulse})`;
  ctx.beginPath();
  ctx.arc(badgePad * 0.85, anchorY, 4.2 * scaleFactor, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.fillText(badgeText, badgePad * 0.85 + 10 * scaleFactor, anchorY);

  // ── Crawl region ──
  const crawlX = badgeW + 10 * scaleFactor;
  const crawlW = canvas.width - crawlX;
  ctx.beginPath();
  ctx.rect(crawlX, barY, crawlW, barH);
  ctx.clip();

  helpers.setFont(ctx, `${style.fontWeight} ${fontSize}px ${style.fontFamily}`);
  const sep = '   •   ';
  const sepW = ctx.measureText(sep).width;
  const wordWidths = words.map(w => ctx.measureText(w + ' ').width);
  const textW = wordWidths.reduce((s, w) => s + w, 0);
  const loopW = textW + sepW;

  // Crawl: enters from the right edge at caption start, loops continuously.
  const elapsed = Math.max(0, renderTime - caption.startTime);
  const scrollOffset = (elapsed * speed) % loopW;
  let drawX = crawlX + crawlW - scrollOffset;

  // Draw two copies so the loop never shows a gap.
  for (let copy = 0; copy < 2; copy++) {
    let x = drawX + copy * loopW;
    for (let i = 0; i < words.length; i++) {
      if (x > crawlX + crawlW) break;
      const isActive = i === activeWordIndex;
      ctx.fillStyle = isActive
        ? (style.activeTextColor || '#FF0000')
        : (style.textColor || '#000000');
      if (isActive) {
        // Active word gets a subtle highlight wash behind it.
        const wWidth = ctx.measureText(words[i]).width;
        ctx.save();
        ctx.fillStyle = 'rgba(255,0,0,0.12)';
        ctx.fillRect(x - 4 * scaleFactor, barY + 4 * scaleFactor, wWidth + 8 * scaleFactor, barH - 8 * scaleFactor);
        ctx.restore();
        ctx.fillStyle = style.activeTextColor || '#FF0000';
      }
      ctx.fillText(words[i], x, anchorY);
      x += wordWidths[i];
    }
    // Separator between loops.
    ctx.fillStyle = '#999999';
    ctx.fillText(sep.trim(), drawX + copy * loopW + textW + sepW * 0.25, anchorY);
  }

  ctx.restore();
}

// ─── 7. MATRIX_RAIN — digital decode with phosphor rain ──────────────────────
//
// Each letter cycles through random matrix glyphs before locking into the real
// character (staggered, deterministic). Faint glyph rain falls in fixed columns
// behind the text, and the whole block sits on a dark scanline panel.

const MATRIX_GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01234567890101';

function matrixGlyph(seedA: number, seedB: number, time: number): string {
  const tick = Math.floor(time * 12.5); // glyph changes ~every 80ms
  const r = seeded(seedA, seedB, tick);
  return MATRIX_GLYPHS[Math.floor(r * MATRIX_GLYPHS.length)];
}

function drawMatrixRain(
  helpers: RenderHelpers,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  caption: Caption,
  style: StyleConfig,
  scaleFactor: number,
  anchorX: number,
  anchorY: number,
  renderTime: number,
  words: string[],
  activeWordIndex: number,
  fontSize: number
): void {
  const green = style.textColor || '#00FF41';
  const white = style.activeTextColor || '#FFFFFF';
  const seed = hashCaptionId(caption.id);
  const elapsed = Math.max(0, renderTime - caption.startTime);

  helpers.setFont(ctx, `${style.fontWeight} ${fontSize}px ${style.fontFamily}`);
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // ── Layout: wrap words into lines (≤80% canvas width) ──
  const spaceW = ctx.measureText(' ').width;
  const maxW = canvas.width * 0.8;
  type Line = { words: { text: string; idx: number; w: number }[]; w: number };
  const lines: Line[] = [];
  let cur: Line = { words: [], w: 0 };
  words.forEach((word, idx) => {
    const w = ctx.measureText(word).width;
    const next = cur.w + w + (cur.words.length ? spaceW : 0);
    if (next > maxW && cur.words.length) {
      lines.push(cur);
      cur = { words: [{ text: word, idx, w }], w };
    } else {
      cur.words.push({ text: word, idx, w });
      cur.w = next;
    }
  });
  if (cur.words.length) lines.push(cur);

  const lineH = fontSize * 1.35;
  const blockH = lines.length * lineH;
  const blockTop = anchorY - blockH / 2;

  // ── Backdrop panel with scanlines ──
  const panelPad = fontSize * 0.8;
  const panelW = Math.max(...lines.map(l => l.w)) + panelPad * 2;
  const panelX = anchorX - panelW / 2;
  const panelY = blockTop - panelPad;
  const panelH = blockH + panelPad * 2;
  ctx.fillStyle = 'rgba(0, 12, 2, 0.72)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 8 * scaleFactor);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 8 * scaleFactor);
  ctx.clip();
  // Scanlines.
  ctx.fillStyle = 'rgba(0,255,65,0.05)';
  const scanGap = 4 * scaleFactor;
  for (let sy = panelY; sy < panelY + panelH; sy += scanGap * 2) {
    ctx.fillRect(panelX, sy, panelW, scanGap);
  }

  // ── Phosphor rain columns inside the panel ──
  const rainFont = fontSize * 0.5;
  helpers.setFont(ctx, `${style.fontWeight} ${rainFont}px ${style.fontFamily}`);
  const cols = Math.floor(panelW / (rainFont * 1.4));
  for (let c = 0; c < cols; c++) {
    const colSpeed = 30 + seeded(seed, c, 1) * 60;
    const colPhase = seeded(seed, c, 2) * panelH;
    const headY = panelY + ((elapsed * colSpeed * scaleFactor + colPhase) % (panelH + 60 * scaleFactor));
    const colX = panelX + c * rainFont * 1.4 + rainFont * 0.4;
    for (let g = 0; g < 5; g++) {
      const gy = headY - g * rainFont * 1.15;
      if (gy < panelY || gy > panelY + panelH) continue;
      ctx.globalAlpha = (g === 0 ? 0.30 : 0.30 * (1 - g / 5)) ;
      ctx.fillStyle = g === 0 ? '#9FFFB0' : green;
      ctx.fillText(matrixGlyph(seed + c, g, renderTime), colX, gy);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore(); // un-clip panel

  // ── Decode text ──
  helpers.setFont(ctx, `${style.fontWeight} ${fontSize}px ${style.fontFamily}`);
  let globalLetterIdx = 0;
  lines.forEach((line, li) => {
    const lineY = blockTop + li * lineH + lineH / 2;
    let x = anchorX - line.w / 2;
    line.words.forEach(({ text, idx, w }) => {
      const letters = toLetters(text);
      const isActive = idx === activeWordIndex;
      let lx = x;
      letters.forEach((letter, ci) => {
        const cw = ctx.measureText(letter).width;
        // Decode schedule: staggered left→right with per-letter jitter.
        const decodeAt = globalLetterIdx * 0.045 + seeded(seed, idx, ci) * 0.25;
        const decoded = elapsed >= decodeAt;
        // Brief bright flash at the decode instant.
        const flash = decoded && elapsed - decodeAt < 0.12;

        if (!decoded) {
          ctx.globalAlpha = 0.85;
          ctx.shadowColor = green;
          ctx.shadowBlur = 8 * scaleFactor;
          ctx.fillStyle = green;
          ctx.fillText(matrixGlyph(seed + idx * 131, ci, renderTime), lx, lineY);
        } else {
          ctx.globalAlpha = 1;
          ctx.shadowColor = isActive ? white : green;
          ctx.shadowBlur = (flash ? 22 : isActive ? 16 : (style.shadowBlur || 15)) * scaleFactor;
          ctx.fillStyle = flash ? '#CCFFCC' : isActive ? white : green;
          ctx.fillText(letter, lx, lineY);
        }
        lx += cw;
        globalLetterIdx++;
      });
      x += w + spaceW;
    });
  });

  ctx.globalAlpha = 1;
  ctx.restore();
}
