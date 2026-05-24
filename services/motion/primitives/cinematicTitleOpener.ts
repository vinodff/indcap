import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

export const cinematicTitleOpener = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const label = p.text || 'Create Something';
  const intensity = p.intensity ?? 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.06)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const cx = width / 2;
  const cy = height * 0.42;
  const maxDim = Math.max(width, height);

  // ── Layer 0: Dark premium background ─────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = globalAlpha;

  const bgGrad = ctx.createRadialGradient(cx, cy * 0.6, 0, cx, cy * 0.6, maxDim * 0.7);
  bgGrad.addColorStop(0, hexA(mixHex(palette.bg || '#050510', palette.primary, 0.06), 1));
  bgGrad.addColorStop(0.5, hexA(palette.bg || '#050510', 0.98));
  bgGrad.addColorStop(1, hexA(palette.bg || '#050510', 1));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle grid texture
  ctx.save();
  ctx.globalAlpha = 0.015 * globalAlpha;
  ctx.strokeStyle = hexA(palette.primary, 0.2);
  ctx.lineWidth = 0.5;
  const gridSize = 40;
  for (let gx = 0; gx < width; gx += gridSize) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, height);
    ctx.stroke();
  }
  for (let gy = 0; gy < height; gy += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
  }
  ctx.restore();

  // ── Layer 1: Light streaks / rays ────────────────────────────────────────
  const streakCount = 3 + intensity;
  for (let si = 0; si < streakCount; si++) {
    const streakT = clamp01(remap(t01, si * 0.03, 0.15 + si * 0.04));
    const streakAlpha = easeInOutCubic(streakT) * (1 - streakT) * 0.12 * globalAlpha;

    if (streakAlpha < 0.001) continue;

    const angle = -0.3 + si * 0.5 + 0.1 * Math.sin(t01 * 0.5 + si);
    const len = maxDim * 1.2;
    const sx = cx + Math.cos(angle) * len * -0.5 + Math.sin(t01 * 2 + si) * 20;
    const sy = height * 0.2 + si * height * 0.3;

    ctx.save();
    ctx.globalAlpha = streakAlpha;
    const streakGrad = ctx.createLinearGradient(
      sx - Math.cos(angle) * len * 0.5,
      sy - Math.sin(angle) * len * 0.5,
      sx + Math.cos(angle) * len * 0.5,
      sy + Math.sin(angle) * len * 0.5,
    );
    streakGrad.addColorStop(0, 'rgba(255,255,255,0)');
    streakGrad.addColorStop(0.3, hexA(palette.primary, 0.08));
    streakGrad.addColorStop(0.5, hexA(mixHex(palette.primary, '#ffffff', 0.3), 0.15));
    streakGrad.addColorStop(0.7, hexA(palette.primary, 0.08));
    streakGrad.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = streakGrad;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);
    ctx.fillRect(-len / 2, -2, len, 4 + Math.sin(t01 * 3 + si) * 2);
    ctx.restore();
    ctx.restore();
  }

  // ── Layer 2: Floating particles (foreground + background) ────────────────
  const particleCount = 60 + intensity * 20;
  const seed = Math.floor(t01 * 60) * 7919;

  for (let pi = 0; pi < particleCount; pi++) {
    const pseed = (pi * 73 + seed) * 1.1;
    const px = ((Math.sin(pseed) * 0.5 + 0.5) % 1) * width;
    const py = ((Math.cos(pseed * 1.3) * 0.5 + 0.5) % 1) * height;
    const pr = 0.5 + (Math.sin(pseed * 2.7) * 0.5 + 0.5) * (pi % 3 === 0 ? 2.5 : 1);
    const depth = pi % 3; // 0=far, 1=mid, 2=near
    const depthScale = [0.4, 1, 1.8][depth];

    // Parallax drift
    const driftX = Math.sin(t01 * 0.2 + pi * 0.7) * 15 * depthScale;
    const driftY = Math.cos(t01 * 0.15 + pi * 0.5) * 8 * depthScale;

    const pa = (Math.sin(pseed * 3.1) * 0.5 + 0.5) * [0.15, 0.3, 0.5][depth] * globalAlpha
      * (0.6 + 0.4 * Math.sin(t01 * 1.5 + pseed));

    if (pa < 0.001) continue;

    ctx.save();
    ctx.globalAlpha = pa;
    ctx.fillStyle = hexA(
      depth === 2 ? mixHex(palette.primary, '#ffffff', 0.5) :
      depth === 1 ? palette.accent : '#ffffff',
      [0.3, 0.5, 0.7][depth],
    );
    ctx.shadowColor = hexA(palette.primary, depth === 2 ? 0.15 : 0);
    ctx.shadowBlur = depth === 2 ? 6 : 0;
    ctx.beginPath();
    ctx.arc(px + driftX, py + driftY, pr * depthScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Layer 3: Accent geometric shapes ────────────────────────────────────
  const accentCount = 4;
  for (let ai = 0; ai < accentCount; ai++) {
    const aT = easeOutCubic(clamp01(remap(t01, 0.05 + ai * 0.06, 0.20 + ai * 0.06)));
    if (aT < 0.005) continue;

    const ax = width * [0.08, 0.92, 0.92, 0.08][ai];
    const ay = height * [0.1, 0.1, 0.9, 0.9][ai];
    const size = 20 + ai * 8;

    ctx.save();
    ctx.globalAlpha = aT * 0.12 * globalAlpha;
    ctx.strokeStyle = hexA(palette.accent, 0.5);
    ctx.lineWidth = 1;

    if (ai % 2 === 0) {
      // Circle
      ctx.beginPath();
      ctx.arc(ax, ay, size * aT, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Square
      ctx.beginPath();
      ctx.roundRect(ax - size * aT / 2, ay - size * aT / 2, size * aT, size * aT, 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Main accent line (horizontal) ────────────────────────────────────────
  const lineT = easeOutBack(clamp01(remap(t01, 0.08, 0.25)), 1.8);
  if (lineT > 0.01) {
    ctx.save();
    ctx.globalAlpha = lineT * 0.25 * globalAlpha;
    const lineW = width * 0.12 * lerp(0, 1, lineT);
    const lineY = cy - height * 0.08;

    const lineGrad = ctx.createLinearGradient(cx - lineW / 2, 0, cx + lineW / 2, 0);
    lineGrad.addColorStop(0, 'rgba(255,255,255,0)');
    lineGrad.addColorStop(0.3, hexA(palette.accent, 0.6));
    lineGrad.addColorStop(0.5, hexA(mixHex(palette.accent, '#ffffff', 0.5), 0.8));
    lineGrad.addColorStop(0.7, hexA(palette.accent, 0.6));
    lineGrad.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = lineGrad;
    ctx.shadowColor = hexA(palette.accent, 0.2);
    ctx.shadowBlur = 8;
    ctx.fillRect(cx - lineW / 2, lineY, lineW, 2);
    ctx.restore();

    // Secondary thinner line below
    ctx.save();
    ctx.globalAlpha = lineT * 0.12 * globalAlpha;
    ctx.fillStyle = hexA(palette.primary, 0.3);
    ctx.fillRect(cx - lineW * 0.6, lineY + 6, lineW * 1.2, 0.5);
    ctx.restore();
  }

  // ── Layer 4: Main title text ────────────────────────────────────────────
  const mainTitleT = easeOutBack(clamp01(remap(t01, 0.12, 0.35)), 1.6);
  const mainTitleAlpha = easeOutCubic(clamp01(remap(t01, 0.10, 0.28)));

  if (mainTitleAlpha > 0.01) {
    const titleSize = Math.min(width, height) * 0.075;
    const titleY = cy - titleSize * 0.3;

    // Title shadow / motion blur trail
    if (mainTitleT < 1) {
      ctx.save();
      ctx.globalAlpha = (1 - mainTitleT) * 0.08 * globalAlpha;
      const blurOffset = (1 - mainTitleT) * 15;
      ctx.font = `800 ${titleSize}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = hexA(palette.accent, 0.2);
      ctx.fillText(label, cx + blurOffset * 1.5, titleY + blurOffset * 0.5);
      ctx.fillText(label, cx - blurOffset * 0.5, titleY + blurOffset);
      ctx.restore();
    }

    // Main title
    ctx.save();
    ctx.globalAlpha = mainTitleAlpha * globalAlpha * (0.3 + 0.7 * mainTitleT);

    // Scale-up entry
    const scale = lerp(1.05, 1, easeOutCubic(clamp01(remap(t01, 0.12, 0.30))));
    ctx.translate(cx, titleY);
    ctx.scale(scale, scale);

    // Gradient fill
    const grad = ctx.createLinearGradient(-width * 0.15, -titleSize, width * 0.15, titleSize);
    grad.addColorStop(0, hexA('#ffffff', 0.7));
    grad.addColorStop(0.3, '#ffffff');
    grad.addColorStop(0.6, hexA(mixHex('#ffffff', palette.primary, 0.2), 0.95));
    grad.addColorStop(1, hexA('#ffffff', 0.5));

    ctx.font = `800 ${titleSize}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text glow
    ctx.shadowColor = hexA(palette.accent, 0.15 * mainTitleT);
    ctx.shadowBlur = 15 * mainTitleT;

    // Letter spacing expansion
    const letterSpacing = lerp(0.06, -0.01, mainTitleT);
    if (letterSpacing > 0.002) {
      const letters = label.split('');
      const totalW = ctx.measureText(label).width;
      const letterW = totalW / letters.length;
      const spacedW = totalW + letterW * letterSpacing * (letters.length - 1);
      let lx = -spacedW / 2;

      for (let li = 0; li < letters.length; li++) {
        ctx.save();
        ctx.fillStyle = grad;
        ctx.fillText(letters[li], lx + letterW * letterSpacing * li * 0, 0);
        ctx.restore();
        lx += ctx.measureText(letters[li]).width + letterW * letterSpacing;
      }
    } else {
      ctx.fillStyle = grad;
      ctx.fillText(label, 0, 0);
    }

    ctx.restore();
  }

  // ── Layer 5: Subtitle / tagline ─────────────────────────────────────────
  const subT = easeOutCubic(clamp01(remap(t01, 0.38, 0.52)));
  if (subT > 0.01) {
    const subSize = Math.min(width, height) * 0.022;
    ctx.save();
    ctx.globalAlpha = subT * globalAlpha * 0.6;
    ctx.translate(cx, 0);
    ctx.translate(0, lerp(8, 0, subT));

    ctx.font = `400 ${subSize}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const subLabel = 'Premium Motion Design';
    ctx.fillStyle = hexA('#ffffff', 0.4);
    ctx.shadowColor = hexA(palette.accent, 0.1);
    ctx.shadowBlur = 4;
    ctx.fillText(subLabel, 0, cy + height * 0.01);

    // Accent dot
    const dotPulse = 0.5 + 0.5 * Math.sin(t01 * 3);
    ctx.shadowBlur = 0;
    ctx.fillStyle = hexA(palette.accent, 0.3 * dotPulse);
    ctx.beginPath();
    ctx.arc(ctx.measureText(subLabel).width / 2 + 12, cy + height * 0.01 + subSize * 0.4, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ── Layer 6: Bottom CTA / badge ─────────────────────────────────────────
  if (intensity >= 2) {
    const badgeT = easeOutCubic(clamp01(remap(t01, 0.55, 0.68)));
    if (badgeT > 0.01) {
      ctx.save();
      ctx.globalAlpha = badgeT * 0.4 * globalAlpha;
      ctx.translate(cx, 0);

      const badgeY = height * 0.82;
      const badgeFS = Math.min(width, height) * 0.016;

      ctx.strokeStyle = hexA('#ffffff', 0.15);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.roundRect(-width * 0.08, badgeY, width * 0.16, badgeFS * 2.4, badgeFS * 0.8);
      ctx.stroke();

      ctx.font = `500 ${badgeFS}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = hexA('#ffffff', 0.3);
      ctx.fillText('SCROLL →', 0, badgeY + badgeFS * 1.2);
      ctx.restore();
    }
  }

  // ── Layer 7: Sparkle / shine accent on title settle ─────────────────────
  const sparkleT = clamp01(remap(t01, 0.28, 0.34));
  if (sparkleT > 0 && sparkleT < 1) {
    const sparkleAlpha = Math.sin(sparkleT * Math.PI) * 0.3 * globalAlpha;
    ctx.save();
    ctx.globalAlpha = sparkleAlpha;
    ctx.fillStyle = hexA('#ffffff', 0.6);
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 20;

    const sparkX = cx + width * 0.15;
    const sparkY = cy - height * 0.05;
    const sparkR = 2;

    // Star sparkle
    for (let spi = 0; spi < 4; spi++) {
      const sa = (spi / 4) * Math.PI * 2 + t01 * 1;
      ctx.beginPath();
      ctx.arc(
        sparkX + Math.cos(sa) * 6 * (1 - sparkleT),
        sparkY + Math.sin(sa) * 6 * (1 - sparkleT),
        sparkR * (1 - sparkleT),
        0, Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Vignette ────────────────────────────────────────────────────────────
  const vigGrad = ctx.createRadialGradient(cx, cy, maxDim * 0.15, cx, cy, maxDim * 0.6);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, hexA(palette.bg || '#050510', 0.35));
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
};
