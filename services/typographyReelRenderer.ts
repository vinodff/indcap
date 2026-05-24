/**
 * TypographyReelRenderer
 *
 * Canvas renderer implementing Devon Jatho-inspired typography reel effects:
 *
 *  DEVON_JATHO  — dark gradient bg, 4-color gradient text, deep glow, light sweep, word-pop entry
 *  CAPCUT       — black bg, bold Montserrat, white + yellow accent, stamp-bounce entry
 *  MINIMAL      — charcoal bg, clean Inter, soft shadow, slide-up fade entry
 *  NEON         — near-black bg, Orbitron, cyan-purple gradient, electric glow, flicker entry
 *  CINEMATIC    — ultra-dark bg, Cinzel/Playfair, gold gradient, letterbox bars, fade entry
 *
 * Per-frame call:
 *   renderer.renderFrame(ctx, currentTime, captions, styleId, canvasWidth, canvasHeight)
 *
 * Fonts used (all already loaded in index.html via Google Fonts):
 *   Space Grotesk (Devon Jatho), Montserrat (CapCut), Inter (Minimal),
 *   Orbitron (Neon), Cinzel (Cinematic)
 */

import type { Caption } from '../types';

// ─── Public types ────────────────────────────────────────────────────────────

export type ReelStyleId = 'DEVON_JATHO' | 'CAPCUT' | 'MINIMAL' | 'NEON' | 'CINEMATIC';

export interface ReelStyleMeta {
  id: ReelStyleId;
  label: string;
  description: string;
  previewGradient: string;   // Tailwind gradient class string for UI preview
}

export const REEL_STYLE_META: ReelStyleMeta[] = [
  {
    id: 'DEVON_JATHO',
    label: 'Devon Jatho',
    description: 'Premium viral style — gradient text, deep glow, word-pop',
    previewGradient: 'from-violet-600 via-indigo-500 to-cyan-400',
  },
  {
    id: 'CAPCUT',
    label: 'CapCut Viral',
    description: 'Bold impact, white + yellow accent, stamp-bounce',
    previewGradient: 'from-yellow-400 via-orange-500 to-red-500',
  },
  {
    id: 'MINIMAL',
    label: 'Minimal Clean',
    description: 'Apple-style white on dark, soft shadow, slide-up',
    previewGradient: 'from-gray-400 via-gray-300 to-white',
  },
  {
    id: 'NEON',
    label: 'Neon Electric',
    description: 'Cyber cyan-purple glow, Orbitron, flicker reveal',
    previewGradient: 'from-cyan-400 via-teal-300 to-purple-500',
  },
  {
    id: 'CINEMATIC',
    label: 'Cinematic Gold',
    description: 'Movie-title gold, letterbox bars, majestic fade',
    previewGradient: 'from-yellow-600 via-amber-400 to-yellow-300',
  },
];

// ─── Internal style configuration ────────────────────────────────────────────

interface StyleCfg {
  // Background
  bg1: string;
  bg2: string;
  bgAngle: 'vertical' | 'diagonal' | 'radial';

  // Font
  fontFamily: string;
  fontWeight: number | string;
  fontSizeRatio: number;   // fontSize = canvasHeight * ratio
  lineHeightRatio: number; // lineHeight = fontSize * ratio
  letterSpacing: number;   // extra pixel spacing between chars (approximate)
  uppercase: boolean;

  // Text color & gradient
  textColor: string;
  gradientColors?: string[];

  // Shadow (hard shadow under text)
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;

  // Glow (soft bloom around text)
  glowColor?: string;
  glowSize?: number;
  glowOpacity?: number;

  // Accent (active / highlighted word)
  accentColors?: string[];
  accentGlow?: string;

  // Animation
  entryStyle: 'scale-back' | 'stamp' | 'slide-up' | 'flicker' | 'fade';
  entryDur: number;  // seconds
  exitStyle: 'fade' | 'scale-out' | 'none';
  exitDur: number;

  // Light sweep (Devon Jatho signature)
  sweepEnabled?: boolean;
  sweepWidth?: number;
  sweepOpacity?: number;
  sweepSpeed?: number; // canvases per second

  // Letterbox (Cinematic)
  letterboxEnabled?: boolean;
  letterboxColor?: string;

  // Word-by-word mode
  wordByWord: boolean;
  wordEntryDur: number;
  wordStagger: number;  // seconds between successive word entries

  // Misc
  capsLockWords?: boolean; // uppercase only for word-by-word
}

const STYLE_CFGS: Record<ReelStyleId, StyleCfg> = {
  DEVON_JATHO: {
    bg1: '#07060f',
    bg2: '#0e0521',
    bgAngle: 'diagonal',
    fontFamily: '"Space Grotesk", "Montserrat", sans-serif',
    fontWeight: 700,
    fontSizeRatio: 0.063,
    lineHeightRatio: 1.35,
    letterSpacing: 1,
    uppercase: false,
    textColor: '#FFFFFF',
    gradientColors: ['#C084FC', '#818CF8', '#38BDF8', '#E879F9'],
    glowColor: '#7C3AED',
    glowSize: 28,
    glowOpacity: 0.55,
    accentColors: ['#F0ABFC', '#FFFFFF'],
    accentGlow: '#E879F9',
    entryStyle: 'scale-back',
    entryDur: 0.14,
    exitStyle: 'fade',
    exitDur: 0.09,
    sweepEnabled: true,
    sweepWidth: 0.06,   // fraction of canvas width
    sweepOpacity: 0.18,
    sweepSpeed: 0.55,
    wordByWord: true,
    wordEntryDur: 0.11,
    wordStagger: 0.04,
  },

  CAPCUT: {
    bg1: '#000000',
    bg2: '#060606',
    bgAngle: 'vertical',
    fontFamily: '"Montserrat", "Arial Black", sans-serif',
    fontWeight: 900,
    fontSizeRatio: 0.072,
    lineHeightRatio: 1.25,
    letterSpacing: 0,
    uppercase: true,
    textColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowBlur: 6,
    shadowOffsetX: 0,
    shadowOffsetY: 5,
    accentColors: ['#FACC15', '#FDE68A'],
    entryStyle: 'stamp',
    entryDur: 0.09,
    exitStyle: 'fade',
    exitDur: 0.06,
    wordByWord: true,
    wordEntryDur: 0.08,
    wordStagger: 0.03,
  },

  MINIMAL: {
    bg1: '#111111',
    bg2: '#1c1c1c',
    bgAngle: 'vertical',
    fontFamily: '"Inter", "Helvetica Neue", sans-serif',
    fontWeight: 600,
    fontSizeRatio: 0.052,
    lineHeightRatio: 1.45,
    letterSpacing: 0,
    uppercase: false,
    textColor: '#F8FAFC',
    shadowColor: 'rgba(0,0,0,0.7)',
    shadowBlur: 14,
    shadowOffsetX: 0,
    shadowOffsetY: 4,
    accentColors: ['#94A3B8', '#CBD5E1'],
    entryStyle: 'slide-up',
    entryDur: 0.22,
    exitStyle: 'fade',
    exitDur: 0.14,
    wordByWord: false,
    wordEntryDur: 0.18,
    wordStagger: 0.05,
  },

  NEON: {
    bg1: '#000000',
    bg2: '#04040e',
    bgAngle: 'radial',
    fontFamily: '"Orbitron", "Courier New", monospace',
    fontWeight: 700,
    fontSizeRatio: 0.050,
    lineHeightRatio: 1.5,
    letterSpacing: 2,
    uppercase: true,
    textColor: '#00F5D4',
    gradientColors: ['#00F5D4', '#67E8F9', '#A78BFA'],
    glowColor: '#00F5D4',
    glowSize: 32,
    glowOpacity: 0.6,
    accentColors: ['#F0ABFC', '#E879F9'],
    accentGlow: '#C026D3',
    entryStyle: 'flicker',
    entryDur: 0.18,
    exitStyle: 'fade',
    exitDur: 0.10,
    wordByWord: true,
    wordEntryDur: 0.12,
    wordStagger: 0.06,
  },

  CINEMATIC: {
    bg1: '#000000',
    bg2: '#08070a',
    bgAngle: 'vertical',
    fontFamily: '"Cinzel", "Playfair Display", serif',
    fontWeight: 700,
    fontSizeRatio: 0.055,
    lineHeightRatio: 1.5,
    letterSpacing: 4,
    uppercase: true,
    textColor: '#FDE68A',
    gradientColors: ['#B45309', '#F59E0B', '#FDE68A', '#F59E0B'],
    glowColor: '#F59E0B',
    glowSize: 20,
    glowOpacity: 0.35,
    accentColors: ['#FFFBEB', '#FEF3C7'],
    entryStyle: 'fade',
    entryDur: 0.4,
    exitStyle: 'fade',
    exitDur: 0.35,
    letterboxEnabled: true,
    letterboxColor: '#000000',
    wordByWord: false,
    wordEntryDur: 0.3,
    wordStagger: 0.08,
  },
};

// ─── Easing library ───────────────────────────────────────────────────────────

const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);
const easeInQuart = (t: number): number => t * t * t * t;

const easeOutElastic = (t: number): number => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  const c4 = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

// ─── Renderer ────────────────────────────────────────────────────────────────

export class TypographyReelRenderer {
  // Track light sweep position per style
  private sweepPhase = 0;
  private lastTime = -1;

  /** Call once per animation frame from the panel's rAF loop. */
  renderFrame(
    ctx: CanvasRenderingContext2D,
    currentTime: number,
    captions: Caption[],
    styleId: ReelStyleId,
    W: number,
    H: number
  ): void {
    const dt = this.lastTime < 0 ? 0 : currentTime - this.lastTime;
    this.lastTime = currentTime;

    const cfg = STYLE_CFGS[styleId];
    ctx.clearRect(0, 0, W, H);

    this.drawBackground(ctx, W, H, cfg, currentTime);

    // Letterbox bars (Cinematic style)
    if (cfg.letterboxEnabled) {
      const barH = H * 0.07;
      ctx.fillStyle = cfg.letterboxColor ?? '#000';
      ctx.fillRect(0, 0, W, barH);
      ctx.fillRect(0, H - barH, W, barH);
    }

    // Find active caption
    const caption = captions.find(c => currentTime >= c.startTime && currentTime < c.endTime);
    if (!caption) return;

    const elapsed = currentTime - caption.startTime;
    const totalDur = Math.max(0.01, caption.endTime - caption.startTime);

    // Global entry animation values
    let globalScale = 1.0;
    let globalOpacity = 1.0;
    let globalOffsetY = 0;

    if (elapsed < cfg.entryDur) {
      const t = Math.min(1, elapsed / cfg.entryDur);
      switch (cfg.entryStyle) {
        case 'scale-back':
          globalScale = 0.86 + 0.14 * easeOutBack(t);
          globalOpacity = easeOutQuart(t);
          break;
        case 'stamp':
          globalScale = 1.22 - 0.22 * easeOutElastic(t);
          globalOpacity = Math.min(1, t * 4);
          break;
        case 'slide-up':
          globalOffsetY = 48 * (1 - easeOutQuart(t));
          globalOpacity = easeOutQuart(t);
          break;
        case 'flicker':
          globalOpacity = Math.random() > 0.25 ? easeOutQuart(t) : easeOutQuart(t) * 0.3;
          break;
        case 'fade':
          globalOpacity = easeOutQuart(t);
          break;
      }
    }

    // Global exit animation values
    const timeToEnd = caption.endTime - currentTime;
    if (timeToEnd < cfg.exitDur) {
      const t = Math.min(1, 1 - timeToEnd / cfg.exitDur);
      switch (cfg.exitStyle) {
        case 'fade':
          globalOpacity *= 1 - easeInQuart(t);
          break;
        case 'scale-out':
          globalScale *= 1 + 0.06 * t;
          globalOpacity *= 1 - t;
          break;
        default:
          break;
      }
    }

    // Apply global transform
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, globalOpacity));
    ctx.translate(W / 2, H / 2 + globalOffsetY);
    ctx.scale(globalScale, globalScale);
    ctx.translate(-W / 2, -H / 2);

    this.drawCaption(ctx, caption, currentTime, elapsed, cfg, styleId, W, H);

    ctx.restore();

    // Advance light sweep (Devon Jatho)
    if (cfg.sweepEnabled) {
      this.sweepPhase = (this.sweepPhase + dt * (cfg.sweepSpeed ?? 0.6)) % 1.6;
    }
  }

  // ─── Background ────────────────────────────────────────────────────────────

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    cfg: StyleCfg,
    _time: number
  ): void {
    let grad: CanvasGradient;

    if (cfg.bgAngle === 'radial') {
      grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
      grad.addColorStop(0, cfg.bg2);
      grad.addColorStop(1, cfg.bg1);
    } else if (cfg.bgAngle === 'diagonal') {
      grad = ctx.createLinearGradient(0, 0, W * 0.6, H);
      grad.addColorStop(0, cfg.bg1);
      grad.addColorStop(1, cfg.bg2);
    } else {
      grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, cfg.bg1);
      grad.addColorStop(1, cfg.bg2);
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ─── Caption dispatch ───────────────────────────────────────────────────────

  private drawCaption(
    ctx: CanvasRenderingContext2D,
    caption: Caption,
    currentTime: number,
    elapsed: number,
    cfg: StyleCfg,
    styleId: ReelStyleId,
    W: number,
    H: number
  ): void {
    const fontSize = Math.round(cfg.fontSizeRatio * H);
    ctx.font = `${cfg.fontWeight} ${fontSize}px ${cfg.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const rawText = caption.text ?? '';
    const text = cfg.uppercase ? rawText.toUpperCase() : rawText;
    const words = caption.words ?? [];

    if (cfg.wordByWord && words.length > 0) {
      this.drawWordByWord(ctx, text, words, currentTime, elapsed, cfg, styleId, W, H, fontSize);
    } else {
      this.drawPhraseBlock(ctx, text, elapsed, cfg, styleId, W, H, fontSize);
    }
  }

  // ─── Word-by-word rendering (Devon Jatho / CapCut / Neon) ─────────────────

  private drawWordByWord(
    ctx: CanvasRenderingContext2D,
    text: string,
    words: NonNullable<Caption['words']>,
    currentTime: number,
    elapsed: number,
    cfg: StyleCfg,
    styleId: ReelStyleId,
    W: number,
    H: number,
    fontSize: number
  ): void {
    const lineHeight = fontSize * cfg.lineHeightRatio;
    const maxLineW = W * 0.86;

    // --- Build lines from words ---
    const wordTokens = text.split(/\s+/).filter(Boolean);
    const lines: { token: string; wordIdx: number | null }[][] = [];
    let curLine: { token: string; wordIdx: number | null }[] = [];
    let curW = 0;

    wordTokens.forEach((token, i) => {
      const w = ctx.measureText(token + ' ').width;
      if (curW + w > maxLineW && curLine.length > 0) {
        lines.push(curLine);
        curLine = [];
        curW = 0;
      }
      curLine.push({ token, wordIdx: i < words.length ? i : null });
      curW += w;
    });
    if (curLine.length > 0) lines.push(curLine);

    const totalLines = lines.length;
    const startY = H / 2 - ((totalLines - 1) * lineHeight) / 2;

    lines.forEach((line, lineIdx) => {
      const lineText = line.map(l => l.token).join(' ');
      const totalLineW = ctx.measureText(lineText).width;
      const lineY = startY + lineIdx * lineHeight;
      let xCursor = W / 2 - totalLineW / 2;

      line.forEach(({ token, wordIdx }) => {
        const tokenW = ctx.measureText(token).width;
        const tokenCenterX = xCursor + tokenW / 2;
        const spaceW = ctx.measureText(' ').width;

        // Determine if this word has timing data
        const wordTiming = wordIdx !== null ? words[wordIdx] : null;

        // Has this word appeared yet?
        const appeared = wordTiming ? currentTime >= wordTiming.start : true;
        const isActive = wordTiming
          ? currentTime >= wordTiming.start && currentTime <= wordTiming.end
          : false;

        if (!appeared) {
          // Dim placeholder — shows future words faintly
          ctx.save();
          ctx.globalAlpha = 0.12;
          ctx.fillStyle = cfg.textColor;
          ctx.fillText(token, tokenCenterX, lineY);
          ctx.restore();
          xCursor += tokenW + spaceW;
          return;
        }

        // Word entry animation
        const wordElapsed = wordTiming ? Math.max(0, currentTime - wordTiming.start) : elapsed;
        const wEntryT = Math.min(1, wordElapsed / cfg.wordEntryDur);
        let wScale = 1.0;
        let wOpacity = 1.0;

        switch (cfg.entryStyle) {
          case 'scale-back':
            wScale = 0.82 + 0.18 * easeOutBack(wEntryT);
            wOpacity = easeOutQuart(wEntryT);
            break;
          case 'stamp':
            wScale = 1.28 - 0.28 * easeOutElastic(wEntryT);
            wOpacity = Math.min(1, wEntryT * 5);
            break;
          case 'flicker':
            wOpacity = Math.random() > 0.2 ? easeOutQuart(wEntryT) : easeOutQuart(wEntryT) * 0.2;
            break;
          default:
            wOpacity = easeOutQuart(wEntryT);
            break;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, wOpacity));
        ctx.translate(tokenCenterX, lineY);
        ctx.scale(wScale, wScale);
        ctx.translate(-tokenCenterX, -lineY);

        if (isActive && cfg.accentColors) {
          // Active word: accent gradient + stronger glow
          if (cfg.glowColor) {
            this.drawGlow(ctx, token, tokenCenterX, lineY, cfg.accentGlow ?? cfg.glowColor, (cfg.glowSize ?? 20) * 1.6, (cfg.glowOpacity ?? 0.5) * 1.4);
          }
          this.drawGradientText(ctx, token, tokenCenterX, lineY, tokenW, fontSize, cfg.accentColors);
        } else {
          // Regular word
          if (cfg.glowColor) {
            this.drawGlow(ctx, token, tokenCenterX, lineY, cfg.glowColor, cfg.glowSize ?? 20, cfg.glowOpacity ?? 0.5);
          }
          if (cfg.gradientColors) {
            this.drawGradientText(ctx, token, tokenCenterX, lineY, tokenW, fontSize, cfg.gradientColors);
          } else {
            if (cfg.shadowBlur) {
              ctx.shadowBlur = cfg.shadowBlur;
              ctx.shadowColor = cfg.shadowColor ?? 'rgba(0,0,0,0.8)';
              ctx.shadowOffsetX = cfg.shadowOffsetX ?? 0;
              ctx.shadowOffsetY = cfg.shadowOffsetY ?? 0;
            }
            ctx.fillStyle = cfg.textColor;
            ctx.fillText(token, tokenCenterX, lineY);
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
          }

          // Light sweep overlay (Devon Jatho)
          if (cfg.sweepEnabled && appeared) {
            this.drawLightSweep(ctx, token, tokenCenterX, lineY, tokenW, fontSize, cfg);
          }
        }

        ctx.restore();
        xCursor += tokenW + spaceW;
      });
    });
  }

  // ─── Phrase block rendering (Minimal / Cinematic) ─────────────────────────

  private drawPhraseBlock(
    ctx: CanvasRenderingContext2D,
    text: string,
    elapsed: number,
    cfg: StyleCfg,
    styleId: ReelStyleId,
    W: number,
    H: number,
    fontSize: number
  ): void {
    const lineHeight = fontSize * cfg.lineHeightRatio;
    const maxLineW = W * 0.86;
    const lines = this.wrapText(ctx, text, maxLineW);

    const totalLines = lines.length;
    const startY = H / 2 - ((totalLines - 1) * lineHeight) / 2;

    lines.forEach((line, i) => {
      const y = startY + i * lineHeight;
      const lw = ctx.measureText(line).width;

      // Glow pass
      if (cfg.glowColor) {
        this.drawGlow(ctx, line, W / 2, y, cfg.glowColor, cfg.glowSize ?? 20, cfg.glowOpacity ?? 0.4);
      }

      // Shadow
      if (cfg.shadowBlur) {
        ctx.shadowBlur = cfg.shadowBlur;
        ctx.shadowColor = cfg.shadowColor ?? 'rgba(0,0,0,0.8)';
        ctx.shadowOffsetX = cfg.shadowOffsetX ?? 0;
        ctx.shadowOffsetY = cfg.shadowOffsetY ?? 0;
      }

      // Main text
      if (cfg.gradientColors) {
        this.drawGradientText(ctx, line, W / 2, y, lw, fontSize, cfg.gradientColors);
      } else {
        ctx.fillStyle = cfg.textColor;
        ctx.fillText(line, W / 2, y);
      }

      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      if (cfg.sweepEnabled) {
        this.drawLightSweep(ctx, line, W / 2, y, lw, fontSize, cfg);
      }
    });
  }

  // ─── Effect helpers ─────────────────────────────────────────────────────────

  /**
   * Draws gradient-filled text.
   * Gradient runs diagonally over the text bounding box.
   */
  private drawGradientText(
    ctx: CanvasRenderingContext2D,
    text: string,
    cx: number,
    cy: number,
    textW: number,
    fontSize: number,
    colors: string[]
  ): void {
    const x0 = cx - textW / 2;
    const y0 = cy - fontSize * 0.75;
    const x1 = cx + textW / 2;
    const y1 = cy + fontSize * 0.35;

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    const n = colors.length;
    colors.forEach((c, i) => {
      grad.addColorStop(i / Math.max(1, n - 1), c);
    });
    ctx.fillStyle = grad;
    ctx.fillText(text, cx, cy);
  }

  /**
   * Soft glow effect — draw text multiple times with canvas shadow to create bloom.
   */
  private drawGlow(
    ctx: CanvasRenderingContext2D,
    text: string,
    cx: number,
    cy: number,
    color: string,
    size: number,
    opacity: number
  ): void {
    ctx.save();
    // Three passes with increasing blur for natural bloom
    for (let pass = 1; pass <= 3; pass++) {
      ctx.shadowBlur = size * pass * 0.45;
      ctx.shadowColor = color;
      ctx.globalAlpha = opacity * (0.5 / pass);
      ctx.fillStyle = color;
      ctx.fillText(text, cx, cy);
    }
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.restore();
  }

  /**
   * Animated vertical band of light sweeping across the text (Devon Jatho signature).
   * sweepPhase drives the band from left to right and loops.
   */
  private drawLightSweep(
    ctx: CanvasRenderingContext2D,
    text: string,
    cx: number,
    cy: number,
    textW: number,
    fontSize: number,
    cfg: StyleCfg
  ): void {
    const sweepW = (cfg.sweepWidth ?? 0.06) * textW * 5;
    const range = textW + sweepW * 2;
    const sweepX = cx - textW / 2 - sweepW + this.sweepPhase * range;

    ctx.save();
    // Restrict to text bounding box
    ctx.beginPath();
    ctx.rect(cx - textW / 2 - 2, cy - fontSize * 0.9, textW + 4, fontSize * 1.3);
    ctx.clip();

    const sg = ctx.createLinearGradient(sweepX - sweepW, cy, sweepX + sweepW, cy);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.45, `rgba(255,255,255,${(cfg.sweepOpacity ?? 0.15).toFixed(2)})`);
    sg.addColorStop(0.55, `rgba(255,255,255,${(cfg.sweepOpacity ?? 0.15).toFixed(2)})`);
    sg.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = sg;
    ctx.fillRect(sweepX - sweepW, cy - fontSize * 0.9, sweepW * 2, fontSize * 1.3);
    ctx.restore();
  }

  // ─── Text utilities ─────────────────────────────────────────────────────────

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /** Reset sweep phase (call when scrubbing back to 0). */
  reset(): void {
    this.sweepPhase = 0;
    this.lastTime = -1;
  }
}

export { STYLE_CFGS as REEL_STYLE_CFGS };
