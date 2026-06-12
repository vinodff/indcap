import { Caption } from '../../types';

interface GradientConfig {
  colors: [string, string];
  opacity: number;
  angle: number; // degrees — 0 = top-to-bottom, 90 = left-to-right
}

const SENTIMENT_GRADIENTS: Record<NonNullable<Caption['sentiment']>, GradientConfig> = {
  energetic: { colors: ['#FF4500', '#FF8C00'], opacity: 0.22, angle: 45 },
  joyful:    { colors: ['#FFD700', '#FFA500'], opacity: 0.20, angle: 30 },
  calm:      { colors: ['#1a3a6e', '#3b82f6'], opacity: 0.18, angle: 90 },
  serious:   { colors: ['#0f0f1a', '#2d2d4e'], opacity: 0.25, angle: 90 },
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Draws a semi-transparent emotion-color gradient strip behind the caption area.
 * Called in captionRenderer.drawCaption() after positioning is computed,
 * before the style-specific renderer runs.
 *
 * @param anchorY  The vertical center of the caption block in canvas pixels.
 * @param lineH    Approximate one-line height (fontSize * scaleFactor).
 */
export function drawEmotionBackground(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  sentiment: Caption['sentiment'],
  anchorY: number,
  lineH: number
): void {
  if (!sentiment) return;
  const config = SENTIMENT_GRADIENTS[sentiment];
  if (!config) return;

  const stripH = lineH * 4;
  const topY = anchorY - stripH * 0.55;

  ctx.save();

  const rad = (config.angle * Math.PI) / 180;
  const halfW = canvas.width / 2;
  const dx = Math.sin(rad) * halfW;
  const dy = Math.cos(rad) * stripH * 0.5;

  const grad = ctx.createLinearGradient(
    halfW - dx, topY - dy,
    halfW + dx, topY + stripH + dy
  );
  grad.addColorStop(0,   hexToRgba(config.colors[0], 0));
  grad.addColorStop(0.3, hexToRgba(config.colors[0], config.opacity));
  grad.addColorStop(0.7, hexToRgba(config.colors[1], config.opacity * 0.85));
  grad.addColorStop(1,   hexToRgba(config.colors[1], 0));

  ctx.fillStyle = grad;
  ctx.fillRect(0, topY, canvas.width, stripH);

  ctx.restore();
}
