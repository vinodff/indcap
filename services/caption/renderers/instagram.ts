import { Caption } from '../../../types';
import { RenderHelpers } from '../types';

const backEaseOut = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export function drawInstagramTemplate(
  helpers: RenderHelpers,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  caption: Caption,
  scaleFactor: number,
  anchorX: number,
  anchorY: number,
  renderTime: number
): void {
  if (!caption.text) return;
  const elapsed = renderTime - caption.startTime;
  const duration = caption.endTime - caption.startTime;
  const progress = Math.min(elapsed / duration, 1);

  const words = caption.text.trim().split(/\s+/);
  const totalWords = words.length;
  const activeWordIndex = Math.floor(progress * totalWords);

  let baseFontSize = 65 * scaleFactor;

  // Distribute words into up to 3 lines
  const lines: { words: string[]; lineIndex: number }[] = [];
  if (totalWords === 1) {
    lines.push({ words: [words[0]], lineIndex: 1 });
  } else if (totalWords === 2) {
    lines.push({ words: [words[0]], lineIndex: 0 });
    lines.push({ words: [words[1]], lineIndex: 1 });
  } else if (totalWords === 3) {
    lines.push({ words: [words[0]], lineIndex: 0 });
    lines.push({ words: [words[1]], lineIndex: 1 });
    lines.push({ words: [words[2]], lineIndex: 2 });
  } else if (totalWords === 4) {
    lines.push({ words: [words[0], words[1]], lineIndex: 0 });
    lines.push({ words: [words[2]], lineIndex: 1 });
    lines.push({ words: [words[3]], lineIndex: 2 });
  } else if (totalWords === 5) {
    lines.push({ words: [words[0], words[1]], lineIndex: 0 });
    lines.push({ words: [words[2], words[3]], lineIndex: 1 });
    lines.push({ words: [words[4]], lineIndex: 2 });
  } else {
    const l1Count = Math.ceil(totalWords / 3);
    const l2Count = Math.ceil((totalWords - l1Count) / 2);
    lines.push({ words: words.slice(0, l1Count), lineIndex: 0 });
    lines.push({ words: words.slice(l1Count, l1Count + l2Count), lineIndex: 1 });
    lines.push({ words: words.slice(l1Count + l2Count), lineIndex: 2 });
  }

  const lineStyles = [
    { sizeMult: 0.7, font: 'italic 800', defaultColor: '#FFDE00', stroke: '#000000', strokeWidth: 8, shadow: '#000000', shadowDepth: 6 },
    { sizeMult: 1.3, font: '900', defaultColor: '#1E4DFF', stroke: '#FFFFFF', strokeWidth: 10, shadow: '#000000', shadowDepth: 8 },
    { sizeMult: 0.8, font: 'italic 900', defaultColor: '#FF2B2B', stroke: '#FFFFFF', strokeWidth: 8, shadow: '#000000', shadowDepth: 6 }
  ];

  // Fit-scaling pass
  let maxLineWidth = 0;
  lines.forEach(line => {
    const ls = lineStyles[line.lineIndex];
    helpers.setFont(ctx, `${ls.font} ${baseFontSize * ls.sizeMult}px Montserrat, sans-serif`);
    let lineWidth = 0;
    line.words.forEach(w => { lineWidth += helpers.getMixedTextWidth(ctx, w.toUpperCase() + " ", baseFontSize * ls.sizeMult); });
    if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
  });

  const maxWidth = canvas.width * 0.85;
  if (maxLineWidth > maxWidth) baseFontSize *= maxWidth / maxLineWidth;

  // Metrics pass
  let totalHeight = 0;
  const lineMetrics = lines.map(line => {
    const ls = lineStyles[line.lineIndex];
    const fSize = baseFontSize * ls.sizeMult;
    helpers.setFont(ctx, `${ls.font} ${fSize}px Montserrat, sans-serif`);
    let lineWidth = 0;
    const wordWidths = line.words.map(w => {
      const ww = helpers.getMixedTextWidth(ctx, w.toUpperCase() + " ", fSize);
      lineWidth += ww;
      return ww;
    });
    const lineHeight = fSize * 1.1;
    totalHeight += lineHeight;
    return { width: lineWidth, height: lineHeight, wordWidths, fontSize: fSize };
  });

  let startY = anchorY - totalHeight / 2;
  let globalWordIndex = 0;

  lines.forEach((line, lIdx) => {
    const ls = lineStyles[line.lineIndex];
    const metrics = lineMetrics[lIdx];

    helpers.setFont(ctx, `${ls.font} ${metrics.fontSize}px Montserrat, sans-serif`);
    let startX = anchorX - metrics.width / 2;
    if (line.lineIndex === 0) startX -= baseFontSize * 0.4;
    if (line.lineIndex === 2) startX += baseFontSize * 0.4;

    let currentX = startX;
    const currentLineCenterY = startY + metrics.height / 2;

    line.words.forEach((word, wIdx) => {
      const wIndex = globalWordIndex++;
      const isActive = wIndex === activeWordIndex;

      if (wIndex > activeWordIndex) {
        currentX += metrics.wordWidths[wIdx];
        return;
      }

      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      let wordScale = 1;
      if (isActive) {
        const wordDuration = duration / totalWords;
        const wordElapsed = elapsed - wIndex * wordDuration;
        const t = Math.min(wordElapsed / 0.15, 1);
        wordScale = Math.max(1, Math.min(backEaseOut(t), 1.2));
      }

      ctx.translate(currentX + metrics.wordWidths[wIdx] / 2, currentLineCenterY);
      ctx.scale(wordScale, wordScale);
      ctx.translate(-(currentX + metrics.wordWidths[wIdx] / 2), -currentLineCenterY);

      const textToDraw = word.toUpperCase();

      // 3D extrusion shadow
      const shadowDepth = ls.shadowDepth * scaleFactor;
      ctx.fillStyle = ls.shadow;
      for (let i = shadowDepth; i > 0; i -= 1) {
        helpers.drawMixedText(ctx, textToDraw, metrics.fontSize, ls.shadow, currentX + i, currentLineCenterY + i, false);
        ctx.lineWidth = ls.strokeWidth * scaleFactor;
        ctx.strokeStyle = ls.shadow;
        helpers.drawMixedText(ctx, textToDraw, metrics.fontSize, ls.shadow, currentX + i, currentLineCenterY + i, true);
      }

      // Stroke
      ctx.lineWidth = ls.strokeWidth * scaleFactor;
      ctx.strokeStyle = ls.stroke;
      helpers.drawMixedText(ctx, textToDraw, metrics.fontSize, ls.stroke, currentX, currentLineCenterY, true);

      // Fill
      ctx.fillStyle = ls.defaultColor;
      helpers.drawMixedText(ctx, textToDraw, metrics.fontSize, ls.defaultColor, currentX, currentLineCenterY, false);

      ctx.restore();
      currentX += metrics.wordWidths[wIdx];
    });

    startY += metrics.height;
  });
}
