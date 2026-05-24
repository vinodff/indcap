/**
 * Shared decoration primitives used by multiple motion primitives.
 *
 * The "shape vocabulary" that makes motion graphics read as designed
 * instead of templated: corner ticks, vertical connector lines, scattered
 * background dots, rounded chips with glow, gradient stripes, 3D-style
 * extruded text (stacked offset shadows).
 *
 * Pure draw helpers. No state, no animation timing — caller owns the t01.
 */

export const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export const hexA = (hex: string, a: number): string => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(255,255,255,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

/** Draw L-shaped corner brackets framing a rectangle. */
export const drawCornerBrackets = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  lineW: number,
  lenRatio = 0.18,
  drawT = 1,
): void => {
  const len = Math.min(w, h) * lenRatio * drawT;
  if (len < 1) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // TL
  ctx.beginPath();
  ctx.moveTo(x, y + len);
  ctx.lineTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.stroke();
  // TR
  ctx.beginPath();
  ctx.moveTo(x + w - len, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + len);
  ctx.stroke();
  // BL
  ctx.beginPath();
  ctx.moveTo(x, y + h - len);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + len, y + h);
  ctx.stroke();
  // BR
  ctx.beginPath();
  ctx.moveTo(x + w - len, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - len);
  ctx.stroke();
  ctx.restore();
};

/**
 * Stacked-shadow 3D extrusion of a single line of text.
 * Caller must have set ctx.font, textAlign, textBaseline before calling.
 * Draws back-to-front so the main face is on top.
 */
export const draw3dExtrudedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  faceColor: string,
  depthColor: string,
  fontPx: number,
  depthRatio = 0.06,
  layers = 6,
): void => {
  const depth = fontPx * depthRatio;
  ctx.save();
  for (let i = layers; i >= 1; i--) {
    const t = i / layers;
    // Blend layer color toward the depth color
    ctx.fillStyle = mixHex(faceColor, depthColor, t * 0.65);
    ctx.fillText(text, x + i * depth, y + i * depth);
  }
  ctx.fillStyle = faceColor;
  ctx.fillText(text, x, y);
  ctx.restore();
};

/**
 * Sparse background dot pattern — used to give empty canvas areas
 * "design fingerprint" without distracting from content.
 */
export const drawDotGrid = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  alpha = 0.08,
  spacing = 22,
): void => {
  ctx.save();
  ctx.fillStyle = hexA(color, alpha);
  for (let cx = x; cx <= x + w; cx += spacing) {
    for (let cy = y; cy <= y + h; cy += spacing) {
      ctx.beginPath();
      ctx.arc(cx, cy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
};

/**
 * Floating geometric accents drawn in negative space — small circles,
 * triangles, plus signs in palette accent colors. Seeded so they're
 * stable across frames.
 */
export const drawFloatingAccents = (
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; width: number; height: number },
  colors: string[],
  t01: number,
  count = 6,
  seed = 11,
): void => {
  const rand = mulberry32(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const r = rand();
    const cx = bounds.x + r * bounds.width;
    const cy = bounds.y + rand() * bounds.height;
    const size = 4 + rand() * 10;
    const color = colors[i % colors.length];
    const bob = Math.sin(t01 * Math.PI * 2 + i) * 4;
    const op = 0.4 + 0.4 * Math.sin(t01 * Math.PI * 2 + i * 1.5);
    ctx.fillStyle = hexA(color, op);
    ctx.strokeStyle = hexA(color, op);
    ctx.lineWidth = 1.5;
    const kind = i % 4;
    ctx.beginPath();
    if (kind === 0) {
      // circle
      ctx.arc(cx, cy + bob, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 1) {
      // triangle outline
      const s = size * 0.6;
      ctx.moveTo(cx, cy - s + bob);
      ctx.lineTo(cx + s * 0.866, cy + s * 0.5 + bob);
      ctx.lineTo(cx - s * 0.866, cy + s * 0.5 + bob);
      ctx.closePath();
      ctx.stroke();
    } else if (kind === 2) {
      // plus sign
      const s = size * 0.4;
      ctx.moveTo(cx - s, cy + bob);
      ctx.lineTo(cx + s, cy + bob);
      ctx.moveTo(cx, cy - s + bob);
      ctx.lineTo(cx, cy + s + bob);
      ctx.stroke();
    } else {
      // square outline
      const s = size * 0.45;
      ctx.strokeRect(cx - s, cy - s + bob, s * 2, s * 2);
    }
  }
  ctx.restore();
};

/**
 * Vertical connector line between two y-positions, with optional draw-on
 * progress (0..1).
 */
export const drawConnector = (
  ctx: CanvasRenderingContext2D,
  x: number,
  yStart: number,
  yEnd: number,
  color: string,
  lineW: number,
  drawT = 1,
  dashed = false,
): void => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineW;
  ctx.lineCap = 'round';
  if (dashed) ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(x, yStart);
  ctx.lineTo(x, yStart + (yEnd - yStart) * drawT);
  ctx.stroke();
  ctx.restore();
};

// ─── color helpers ────────────────────────────────────────────────────

const parseHex = (hex: string): { r: number; g: number; b: number } => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

const toHex = (n: number): string => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

export const mixHex = (a: string, b: string, t: number): string => {
  const ac = parseHex(a);
  const bc = parseHex(b);
  return `#${toHex(ac.r + (bc.r - ac.r) * t)}${toHex(ac.g + (bc.g - ac.g) * t)}${toHex(ac.b + (bc.b - ac.b) * t)}`;
};

// ─── prng ─────────────────────────────────────────────────────────────

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Try to apply canvas letter-spacing if browser supports it. Safe no-op otherwise. */
export const setLetterSpacing = (ctx: CanvasRenderingContext2D, px: number): void => {
  try {
    type LSCtx = CanvasRenderingContext2D & { letterSpacing?: string };
    (ctx as LSCtx).letterSpacing = `${px}px`;
  } catch (e) { void e; }
};

// ─── Procedural shape vocabulary ─────────────────────────────────────
// Call ctx.fill() or ctx.stroke() after each draw* that builds a path.

/**
 * n-pointed star polygon. Builds path; caller strokes or fills.
 * rotation=0 → top point upward.
 */
export const drawStar = (
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  outerR: number, innerR: number,
  points: number,
  rotation = -Math.PI / 2,
): void => {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 + rotation;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
};

/**
 * 4-pointed sparkle glyph with curved diamond arms.
 * Caller must ctx.fill() after.
 */
export const drawSparkle = (
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number,
  rotation = 0,
): void => {
  const l = size, s = size * 0.18;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.beginPath();
  // North arm
  ctx.moveTo(0, -l); ctx.quadraticCurveTo(s, -l * 0.38, 0, 0);
  ctx.quadraticCurveTo(-s, -l * 0.38, 0, -l);
  // South arm
  ctx.moveTo(0, l); ctx.quadraticCurveTo(s, l * 0.38, 0, 0);
  ctx.quadraticCurveTo(-s, l * 0.38, 0, l);
  // East arm
  ctx.moveTo(l, 0); ctx.quadraticCurveTo(l * 0.38, s, 0, 0);
  ctx.quadraticCurveTo(l * 0.38, -s, l, 0);
  // West arm
  ctx.moveTo(-l, 0); ctx.quadraticCurveTo(-l * 0.38, s, 0, 0);
  ctx.quadraticCurveTo(-l * 0.38, -s, -l, 0);
  ctx.restore();
};

/**
 * Regular hexagon. Builds path; caller strokes or fills.
 */
export const drawHexagon = (
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  r: number,
  rotation = 0,
): void => {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rotation;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
};

/**
 * Diamond (axis-aligned rotated square). Builds path; caller strokes or fills.
 */
export const drawDiamond = (
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number, h: number,
): void => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
};

/**
 * Plus / cross shape. Uses ctx.fillRect — call directly (no separate fill needed).
 */
export const drawCross = (
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number,
  thickness: number,
): void => {
  ctx.fillRect(cx - thickness / 2, cy - size / 2, thickness, size);
  ctx.fillRect(cx - size / 2, cy - thickness / 2, size, thickness);
};
