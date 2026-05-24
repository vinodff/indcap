/**
 * Safe-area + frame-fit helpers.
 *
 * Aspect ratios other than 16:9 frequently break text-heavy primitives because
 * the same font size that fits a 1920-wide canvas overflows a 1080-wide one.
 * These helpers give every primitive a consistent way to:
 *   - compute a padded "safe area" rect inside the canvas
 *   - wrap or auto-shrink text to a max line width
 *   - cap font size so labels never push past safe bounds
 */

export interface SafeArea {
  x: number;
  y: number;
  width: number;
  height: number;
  /** The minimum side length — useful for scaling primitives that look at one dimension only. */
  minSide: number;
}

/**
 * Returns a rectangle inside the canvas reserved for content.
 * Default padding is 6% on each side; bump it for portrait/square ratios
 * where edge crowding reads worse.
 */
export const getSafeArea = (width: number, height: number, padPct = 0.06): SafeArea => {
  const isPortrait = height > width;
  const pad = padPct + (isPortrait ? 0.02 : 0);
  const x = width * pad;
  const y = height * pad;
  const w = width * (1 - pad * 2);
  const h = height * (1 - pad * 2);
  return { x, y, width: w, height: h, minSide: Math.min(w, h) };
};

/**
 * Word-wrap `text` into lines that fit `maxWidth` at the given font.
 * Caller must set ctx.font before calling.
 */
export const wrapLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [text];
  const lines: string[] = [];
  let line = '';
  for (const w of tokens) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
};

/**
 * Pick a font-size that fits the given text into `maxWidth` (single line), shrinking
 * from `desiredPx` down to `minPx`. Caller passes the font *template* and the function
 * mutates ctx.font during measurement; on return ctx.font is restored.
 */
export const fitSingleLine = (
  ctx: CanvasRenderingContext2D,
  text: string,
  fontTemplate: (px: number) => string,
  maxWidth: number,
  desiredPx: number,
  minPx = 12,
): number => {
  const prev = ctx.font;
  let px = desiredPx;
  ctx.font = fontTemplate(px);
  while (px > minPx && ctx.measureText(text).width > maxWidth) {
    px = Math.max(minPx, px * 0.93);
    ctx.font = fontTemplate(px);
  }
  ctx.font = prev;
  return px;
};

/**
 * Pick a font-size such that wrapping `text` at `maxWidth` produces at most
 * `maxLines` lines AND a total height (lines * lineHeight) at most `maxHeight`.
 * Shrinks from `desiredPx`, never below `minPx`.
 *
 * Returns both the chosen px size and the wrapped lines for the caller to draw.
 */
export const fitMultiline = (
  ctx: CanvasRenderingContext2D,
  text: string,
  fontTemplate: (px: number) => string,
  maxWidth: number,
  maxHeight: number,
  desiredPx: number,
  maxLines = 4,
  lineHeightRatio = 1.18,
  minPx = 14,
): { px: number; lines: string[] } => {
  const prev = ctx.font;
  let px = desiredPx;
  let lines: string[] = [];
  for (let i = 0; i < 40; i++) {
    ctx.font = fontTemplate(px);
    lines = wrapLines(ctx, text, maxWidth);
    const heightOk = lines.length * px * lineHeightRatio <= maxHeight;
    const lineCountOk = lines.length <= maxLines;
    if (heightOk && lineCountOk) break;
    if (px <= minPx) break;
    px = Math.max(minPx, px * 0.92);
  }
  ctx.font = prev;
  return { px, lines };
};

/** Clamp x to [a, b]. */
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
