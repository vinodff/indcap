import { Caption } from '../../../types';
import { RenderHelpers } from '../types';

const backEaseOut = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export function drawTrending(
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

  let activeWordIndex = -1;
  if (caption.words && caption.words.length === totalWords) {
    activeWordIndex = caption.words.findIndex(w => renderTime >= w.start && renderTime <= w.end);
    if (activeWordIndex === -1) {
      const passedWords = caption.words.filter(w => renderTime > w.end);
      if (passedWords.length > 0) activeWordIndex = passedWords.length - 1;
    }
  } else {
    activeWordIndex = Math.floor(progress * totalWords);
  }

  let baseFontSize = 70 * scaleFactor;
  helpers.setFont(ctx, `900 ${baseFontSize}px Montserrat, sans-serif`);

  // Measure and auto-scale
  let totalWidth = 0;
  words.forEach(word => {
    totalWidth += helpers.getMixedTextWidth(ctx, word.toUpperCase() + " ", baseFontSize);
  });

  const maxWidth = canvas.width * 0.90;
  let finalScaleFactor = 1.0;
  if (totalWidth > maxWidth) finalScaleFactor = maxWidth / totalWidth;

  const finalFontSize = baseFontSize * finalScaleFactor;
  helpers.setFont(ctx, `900 ${finalFontSize}px Montserrat, sans-serif`);

  totalWidth = 0;
  const finalWordWidths = words.map(word => {
    const w = helpers.getMixedTextWidth(ctx, word.toUpperCase() + " ", finalFontSize);
    totalWidth += w;
    return w;
  });

  let currentX = anchorX - totalWidth / 2;

  words.forEach((word, index) => {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const isPast = index < activeWordIndex;
    const isActive = index === activeWordIndex;

    let wordScale = 1;
    if (isActive) {
      let wordProgress = 1;
      if (caption.words && caption.words[index]) {
        const w = caption.words[index];
        wordProgress = Math.max(0, Math.min((renderTime - w.start) / (w.end - w.start), 1));
      } else {
        const wordDuration = duration / totalWords;
        const wordElapsed = elapsed - index * wordDuration;
        wordProgress = Math.max(0, Math.min(wordElapsed / wordDuration, 1));
      }
      const t = Math.min(wordProgress / 0.3, 1); // Only scale in the first 30% of the word
      wordScale = Math.max(1, Math.min(backEaseOut(t), 1.2));
    }

    ctx.translate(currentX + finalWordWidths[index] / 2, anchorY);
    ctx.scale(wordScale, wordScale);
    ctx.translate(-(currentX + finalWordWidths[index] / 2), -anchorY);

    const textToDraw = word.toUpperCase();

    if (isActive) {
      // 3D extrusion
      ctx.fillStyle = "#091E5E";
      const depth = 8 * scaleFactor * finalScaleFactor;
      for (let i = depth; i > 0; i -= 1) {
        helpers.drawMixedText(ctx, textToDraw, finalFontSize, "#091E5E", currentX + i, anchorY + i, false);
      }
      // Gradient fill
      const gradient = ctx.createLinearGradient(currentX, anchorY - finalFontSize / 2, currentX, anchorY + finalFontSize / 2);
      gradient.addColorStop(0, "#3FA2FF");
      gradient.addColorStop(1, "#1A5BFF");
      ctx.fillStyle = gradient;
      ctx.shadowColor = "rgba(26, 91, 255, 0.8)";
      ctx.shadowBlur = 20 * scaleFactor;
    } else if (isPast) {
      ctx.fillStyle = "#FF3B3B";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 6 * scaleFactor;
      ctx.shadowOffsetY = 2 * scaleFactor;
    } else {
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 6 * scaleFactor;
      ctx.shadowOffsetY = 2 * scaleFactor;
    }

    let fillStyle = ctx.fillStyle;
    if (caption.wordColors && caption.wordColors[index] && caption.wordColors[index] !== 'default') {
      fillStyle = caption.wordColors[index];
    }
    helpers.drawMixedText(ctx, textToDraw, finalFontSize, fillStyle, currentX, anchorY, false);
    ctx.restore();
    currentX += finalWordWidths[index];
  });
}
