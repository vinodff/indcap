import { Caption } from '../../../types';
import { RenderHelpers } from '../types';
import { emojiToNotoUrl } from '../emojiUtils';

export function drawMultiFloatKaraoke(
  helpers: RenderHelpers,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  caption: Caption,
  scaleFactor: number,
  anchorX: number,
  anchorY: number,
  renderTime: number,
  allCaptions: Caption[]
): void {
  if (!caption.text) return;

  // ── Gather all words across captions (flat list) ──
  interface FlatWord {
    word: string;
    captionIdx: number;
    wordIdx: number;
    start: number;
    end: number;
  }

  const sortedCaptions = [...allCaptions].sort((a, b) => a.startTime - b.startTime);
  const flatWords: FlatWord[] = [];

  for (let ci = 0; ci < sortedCaptions.length; ci++) {
    const cap = sortedCaptions[ci];
    const capWords = (cap.text || '').trim().toUpperCase().split(/\s+/).filter(w => w.length > 0);
    const capDur = cap.endTime - cap.startTime;
    for (let wi = 0; wi < capWords.length; wi++) {
      let wStart: number, wEnd: number;
      if (cap.words && cap.words.length === capWords.length) {
        wStart = cap.words[wi].start;
        wEnd = cap.words[wi].end;
      } else {
        const wDur = capDur / capWords.length;
        wStart = cap.startTime + wi * wDur;
        wEnd = wStart + wDur;
      }
      flatWords.push({ word: capWords[wi], captionIdx: ci, wordIdx: wi, start: wStart, end: wEnd });
    }
  }

  // ── Find current active word in flatWords ──
  const BUFFER = 0.08;
  let activeIdx = flatWords.findIndex(
    fw => renderTime >= fw.start - BUFFER && renderTime <= fw.end + BUFFER
  );
  if (activeIdx === -1) {
    for (let i = flatWords.length - 1; i >= 0; i--) {
      if (renderTime > flatWords[i].end) { activeIdx = i; break; }
    }
  }
  if (activeIdx < 0) return; // nothing to draw yet

  const activeWord = flatWords[activeIdx];
  const redWord = activeIdx > 0 ? flatWords[activeIdx - 1] : null;
  const whiteWord = activeIdx > 1 ? flatWords[activeIdx - 2] : null;

  // ── Positional layout ──
  const cW = canvas.width;
  const cH = canvas.height;

  const activePos = { x: anchorX, y: anchorY };
  const redPos = { x: anchorX - cW * 0.07, y: anchorY - cH * 0.14 };
  const whitePos = { x: anchorX + cW * 0.06, y: anchorY - cH * 0.26 };

  // ── Font sizes ──
  const activeFontSize = 78 * scaleFactor;
  const redFontSize = 46 * scaleFactor;
  const whiteFontSize = 32 * scaleFactor;

  const popEase = (t: number): number => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  const easeOut5 = (t: number): number => 1 - Math.pow(1 - t, 5);

  const drawFloatWord = (
    text: string,
    cx: number,
    cy: number,
    fontSize: number,
    fillColor: string,
    strokeColor: string,
    strokeW: number,
    italic: boolean,
    wordElapsed: number,
    globalAlpha: number,
    letterStagger: number = 0.045
  ) => {
    if (!text || globalAlpha <= 0) return;

    const fontStr = `${italic ? 'italic ' : ''}900 ${fontSize}px 'Montserrat', sans-serif`;
    helpers.setFont(ctx, fontStr);
    ctx.textBaseline = 'middle';

    const chars = Array.from(text);
    const charWidths = chars.map(c => ctx.measureText(c).width);
    const totalW = charWidths.reduce((s, w) => s + w, 0);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, globalAlpha));

    let startX = cx - totalW / 2;

    chars.forEach((ch, i) => {
      const charElapsed = wordElapsed - i * letterStagger;
      const charT = charElapsed > 0 ? Math.min(charElapsed / 0.18, 1) : 0;
      const charPop = charT > 0 ? popEase(charT) : 0;
      const charScale = charPop;
      const charAlpha = charT > 0 ? Math.min(1, charT * 3) : 0;
      const cw = charWidths[i];
      const charCX = startX + cw / 2;

      if (charScale <= 0) { startX += cw; return; }

      ctx.save();
      ctx.translate(charCX, cy);
      ctx.scale(charScale, charScale);
      ctx.globalAlpha = Math.max(0, Math.min(1, globalAlpha * charAlpha));

      // Stroke pass
      if (strokeW > 0) {
        helpers.setFont(ctx, fontStr);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeW * scaleFactor;
        ctx.lineJoin = 'round';
        ctx.strokeText(ch, 0, 0);
      }

      // Fill pass
      helpers.setFont(ctx, fontStr);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = fillColor;
      ctx.fillText(ch, 0, 0);

      ctx.restore();
      startX += cw;
    });

    ctx.restore();
  };

  // ── TIER 3 — WHITE CONTEXT ──
  if (whiteWord) {
    const wElapsed = renderTime - whiteWord.start;
    const age = renderTime - whiteWord.end;
    const fadeT = Math.max(0, 1 - age / 1.5);
    const floatOffY = -easeOut5(Math.min((renderTime - whiteWord.start) / 0.5, 1)) * 8 * scaleFactor;

    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.25)';
    ctx.shadowBlur = 8 * scaleFactor;
    drawFloatWord(
      whiteWord.word,
      whitePos.x,
      whitePos.y + floatOffY,
      whiteFontSize,
      'rgba(255,255,255,0.82)',
      '#000000',
      5,
      true,
      wElapsed,
      fadeT * 0.72
    );
    ctx.restore();
  }

  // ── TIER 2 — RED CONTEXT ──
  if (redWord) {
    const rElapsed = renderTime - redWord.start;
    const age = renderTime - redWord.end;
    const fadeT = Math.max(0, 1 - age / 1.2);
    const floatOffY = -easeOut5(Math.min((renderTime - redWord.start) / 0.4, 1)) * 6 * scaleFactor;

    ctx.save();
    ctx.shadowColor = 'rgba(229,57,53,0.45)';
    ctx.shadowBlur = 14 * scaleFactor;
    drawFloatWord(
      redWord.word,
      redPos.x,
      redPos.y + floatOffY,
      redFontSize,
      '#E53935',
      '#000000',
      6,
      true,
      rElapsed,
      fadeT * 0.88
    );
    ctx.restore();
  }

  // ── TIER 1 — ACTIVE WORD ──
  {
    const aElapsed = renderTime - activeWord.start;

    ctx.save();
    ctx.shadowColor = 'rgba(79,195,247,0.65)';
    ctx.shadowBlur = 28 * scaleFactor;

    drawFloatWord(
      activeWord.word,
      activePos.x,
      activePos.y,
      activeFontSize,
      '#4FC3F7',
      '#003366',
      9,
      false,
      aElapsed,
      1.0
    );
    ctx.restore();

    // Underline accent
    helpers.setFont(ctx, `900 ${activeFontSize}px 'Montserrat', sans-serif`);
    const wordW = ctx.measureText(activeWord.word).width;
    const ulW = wordW * Math.min(aElapsed / 0.25, 1);
    const ulH = 3.5 * scaleFactor;
    const ulY = activePos.y + activeFontSize * 0.62;
    if (ulW > 0) {
      ctx.save();
      const ulGrad = ctx.createLinearGradient(activePos.x - ulW / 2, 0, activePos.x + ulW / 2, 0);
      ulGrad.addColorStop(0, '#4FC3F7');
      ulGrad.addColorStop(1, '#0288D1');
      ctx.fillStyle = ulGrad;
      ctx.shadowColor = 'rgba(79,195,247,0.8)';
      ctx.shadowBlur = 10 * scaleFactor;
      ctx.fillRect(activePos.x - ulW / 2, ulY, ulW, ulH);
      ctx.restore();
    }
  }
}
