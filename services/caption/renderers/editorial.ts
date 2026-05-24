import { Caption, StyleConfig } from '../../../types';
import { RenderHelpers } from '../types';

const lerp = (start: number, end: number, t: number): number => start * (1 - t) + end * t;

const backEaseOut = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const easeOutQuint = (t: number): number => {
  return 1 - Math.pow(1 - t, 5);
};

export function drawTypograph(
  helpers: RenderHelpers,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  caption: Caption,
  style: StyleConfig,
  scaleFactor: number,
  anchorX: number,
  anchorY: number,
  renderTime: number
): void {
  if (!caption.text) return;

  const elapsed = renderTime - caption.startTime;
  const duration = caption.endTime - caption.startTime;
  const captionProgress = Math.max(0, Math.min(elapsed / duration, 1));

  // ── Font & measurement setup ──
  const fontSize = style.fontSize * scaleFactor;
  const tracking = 6 * scaleFactor; // extra letter-spacing between chars
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  // Base font strings
  const fontStr = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
  helpers.setFont(ctx, fontStr);
  const rawWords = (style.uppercase ? caption.text.toUpperCase() : caption.text).trim().split(/\s+/);
  const wordCount = rawWords.length;

  // ── Determine active word ──
  let activeWordIndex = -1;
  let wordProgress = 1;
  if (caption.words && caption.words.length === wordCount) {
    const BUFFER = 0.06;
    const found = caption.words.findIndex(w => renderTime >= w.start - BUFFER && renderTime <= w.end + BUFFER);
    if (found !== -1) {
      activeWordIndex = found;
      const w = caption.words[found];
      wordProgress = Math.max(0, Math.min((renderTime - w.start) / Math.max(w.end - w.start, 0.05), 1));
    } else {
      for (let i = wordCount - 1; i >= 0; i--) {
        if (renderTime > caption.words[i].end) { activeWordIndex = i; break; }
      }
      wordProgress = 1;
    }
  } else {
    activeWordIndex = Math.min(Math.floor(captionProgress * wordCount), wordCount - 1);
    const wd = duration / wordCount;
    const ws = caption.startTime + activeWordIndex * wd;
    wordProgress = Math.max(0, Math.min((renderTime - ws) / wd, 1));
  }

  // Helper: measure word with tracking
  const measureWord = (word: string): number => {
    const chars = Array.from(word);
    return chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + Math.max(0, chars.length - 1) * tracking;
  };

  // ── Measure all words to find the widest (strip width is max of all) ──
  const wordWidths = rawWords.map(w => measureWord(w));
  const maxWordWidth = Math.max(...wordWidths);
  const padH = (style.backgroundPadding || 26) * scaleFactor;
  const padV = padH * 0.55;
  const stripW = Math.min(maxWordWidth + padH * 2, canvas.width * 0.92);
  const stripH = fontSize + padV * 2;
  const accentBarW = 7 * scaleFactor; // left accent bar width
  const stripX = anchorX - stripW / 2;
  const stripY = anchorY - stripH / 2;

  // ── Entry animation: slide-up + fade ──
  const entryDur = Math.min(duration * 0.18, 0.25);
  const entryT = easeOutQuint(Math.min(elapsed / entryDur, 1));
  const entryOffsetY = (1 - entryT) * 30 * scaleFactor;
  const entryAlpha = Math.max(0.01, entryT);

  ctx.save();
  ctx.globalAlpha = entryAlpha;
  ctx.translate(0, entryOffsetY);

  // ── Draw full-width dark strip background ──
  ctx.fillStyle = style.backgroundColor || 'rgba(12,12,12,0.88)';
  ctx.beginPath();
  ctx.rect(stripX, stripY, stripW, stripH);
  ctx.fill();

  // ── Left accent bar (animated fill from bottom) ──
  const accentFill = easeOutQuint(Math.min(elapsed / Math.max(duration * 0.35, 0.001), 1));
  const accentBarH = stripH * accentFill;
  const accentGrad = ctx.createLinearGradient(0, stripY + stripH, 0, stripY);
  accentGrad.addColorStop(0, '#E8B84B'); // warm gold
  accentGrad.addColorStop(1, '#F5D78E');
  ctx.fillStyle = accentGrad;
  ctx.beginPath();
  ctx.rect(stripX, stripY + stripH - accentBarH, accentBarW, accentBarH);
  ctx.fill();

  // ── Draw active word with tracked characters ──
  const activeWord = activeWordIndex >= 0 && activeWordIndex < rawWords.length
    ? rawWords[activeWordIndex]
    : (rawWords[wordCount - 1] || '');
  const activeWordW = wordWidths[activeWordIndex >= 0 ? activeWordIndex : wordCount - 1] || 0;

  // Pop scale on word reveal
  const popScale = backEaseOut(Math.min(wordProgress / 0.4, 1));
  const wordCenterX = anchorX;
  const wordCenterY = anchorY;

  ctx.save();
  ctx.translate(wordCenterX, wordCenterY);
  ctx.scale(lerp(0.88, 1, popScale), lerp(0.88, 1, popScale));

  // Draw tracked characters (letter-spaced)
  const chars = Array.from(activeWord);
  let totalCharW = measureWord(activeWord);
  let charX = -totalCharW / 2;

  // Subtle shadow for depth
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 6 * scaleFactor;
  ctx.shadowOffsetY = 3 * scaleFactor;

  chars.forEach((c) => {
    const cw = ctx.measureText(c).width;
    ctx.fillStyle = style.activeTextColor || '#F5F0E8';
    ctx.fillText(c, charX, 0);
    charX += cw + tracking;
  });

  ctx.restore();

  // ── Animated underline bar on active word ──
  const underlineY = anchorY + fontSize * 0.58;
  const underlineMaxW = activeWordW;
  const underlineProgress = easeOutQuint(Math.min(wordProgress / 0.55, 1));
  const underlineW = underlineMaxW * underlineProgress;
  const underlineH = 3.5 * scaleFactor;

  ctx.save();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const ulGrad = ctx.createLinearGradient(anchorX - underlineW / 2, 0, anchorX + underlineW / 2, 0);
  ulGrad.addColorStop(0, '#E8B84B');
  ulGrad.addColorStop(1, '#F5D78E');
  ctx.fillStyle = ulGrad;
  ctx.beginPath();
  ctx.rect(anchorX - underlineW / 2, underlineY, underlineW, underlineH);
  ctx.fill();
  ctx.restore();

  // ── Word counter dots (tiny editorial page markers) ──
  const dotRadius = 2.5 * scaleFactor;
  const dotSpacing = 10 * scaleFactor;
  const dotsW = (wordCount - 1) * dotSpacing;
  const dotsStartX = anchorX - dotsW / 2;
  const dotsY = stripY - 10 * scaleFactor;

  for (let i = 0; i < wordCount; i++) {
    const dotX = dotsStartX + i * dotSpacing;
    ctx.beginPath();
    ctx.arc(dotX, dotsY, dotRadius, 0, Math.PI * 2);
    if (i < activeWordIndex) {
      ctx.fillStyle = '#E8B84B';
      ctx.globalAlpha = entryAlpha;
    } else if (i === activeWordIndex) {
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = entryAlpha;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.globalAlpha = entryAlpha * 0.6;
    }
    ctx.fill();
  }

  ctx.restore(); // restore entry animation translate
}
