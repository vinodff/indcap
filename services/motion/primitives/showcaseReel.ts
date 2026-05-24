import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';
import { drawLucideIcon } from '../iconRenderer';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;

interface ReelPanel {
  label: string;
  value: string;
  icon: string;
  color: string;
}

const PANEL_ICONS = ['zap', 'star', 'sparkles', 'rocket', 'diamond', 'activity'];

const mulberry32 = (seed: number) => {
  let a = (seed ^ 0x6a09e667) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const showcaseReel = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;
  const rawText = p.text || '';

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.06)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const parts = rawText.split('|').map(s => s.trim()).filter(Boolean);

  const panelCount = Math.min(intensity === 3 ? 5 : intensity === 2 ? 4 : 3, Math.max(parts.length || 1, 3));

  const panels: ReelPanel[] = [];
  for (let i = 0; i < panelCount; i++) {
    const pi = i * 3;
    const colors = [palette.primary, palette.accent, palette.secondary, palette.primary, palette.accent];
    panels.push({
      label: parts[pi] || `Feature ${i + 1}`,
      value: parts[pi + 1] || '',
      icon: parts[pi + 2] ? parts[pi + 2].toLowerCase() : PANEL_ICONS[i % PANEL_ICONS.length],
      color: colors[i % colors.length],
    });
  }

  const cx = width / 2;
  const cy = height * 0.44;

  const isVertical = height > width;
  const cols = isVertical ? 1 : Math.min(panelCount, 3);
  const rows = Math.ceil(panelCount / cols);

  const gap = Math.min(width, height) * 0.025;
  const panelW = isVertical
    ? Math.min(width * 0.78, 340)
    : (Math.min(width * 0.88, 900) - gap * (cols - 1)) / cols;
  const panelH = panelW * 0.7;
  const totalW = cols * panelW + gap * (cols - 1);
  const totalH = rows * panelH + gap * (rows - 1);
  const startX = cx - totalW / 2;
  const startY = cy - totalH / 2;

  const rng = mulberry32(42);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  const bgR = Math.max(width, height) * 0.45;
  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bgR);
  bgGrad.addColorStop(0, hexA(mixHex(palette.bg || '#0a0a14', palette.primary, 0.06), 0.5));
  bgGrad.addColorStop(1, hexA(palette.bg || '#0a0a14', 0));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const staggerDuration = 0.40;
  const perPanelDelay = staggerDuration / panelCount;

  const activeIndex = Math.floor(clamp01(remap(t01, 0.25, 0.75)) * panelCount);

  const particleCount = intensity >= 3 ? 50 : intensity >= 2 ? 30 : 15;
  for (let i = 0; i < particleCount; i++) {
    const px = (i * 197.3 + t01 * 200) % width;
    const py = (i * 89.7 + t01 * 150 + rng() * 50) % height;
    const ps = 0.8 + rng() * 2;
    const pa = 0.08 + 0.12 * Math.sin(t01 * 0.8 + i * 0.5);

    ctx.save();
    ctx.globalAlpha = pa * globalAlpha;
    ctx.fillStyle = hexA(palette.accent, 0.3);
    ctx.beginPath();
    ctx.arc(px, py, ps, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= panelCount) continue;
      const panel = panels[idx];

      const entryStart = 0.06 + idx * perPanelDelay;
      const entryT = easeOutBack(clamp01(remap(t01, entryStart, entryStart + 0.30)), 1.25);
      const entrySlide = 1 - entryT;

      const dirAngle = (idx / panelCount) * Math.PI * 2;
      const slideDist = 60 + rng() * 40;
      const sx = Math.cos(dirAngle) * slideDist * entrySlide;
      const sy = Math.sin(dirAngle) * slideDist * entrySlide;

      const x = startX + c * (panelW + gap) + sx;
      const y = startY + r * (panelH + gap) + sy;
      const scale = 0.6 + 0.4 * entryT;
      const alpha = entryT;

      const isActive = idx === activeIndex;
      const activeGlow = isActive ? 0.5 + 0.3 * Math.sin(t01 * Math.PI * 2.5) : 0;

      ctx.save();
      ctx.globalAlpha = alpha * globalAlpha;
      ctx.translate(x + panelW / 2, y + panelH / 2);
      ctx.scale(scale, scale);
      ctx.translate(-panelW / 2, -panelH / 2);

      if (isActive) {
        ctx.save();
        ctx.shadowColor = hexA(palette.accent, activeGlow * 0.6);
        ctx.shadowBlur = 25 + 15 * Math.sin(t01 * Math.PI * 2.5);
        ctx.fillStyle = hexA(palette.accent, activeGlow * 0.05);
        roundRect(ctx, -4, -4, panelW + 8, panelH + 8, panelH * 0.1);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;

      const grad = ctx.createLinearGradient(0, 0, panelW, panelH);
      grad.addColorStop(0, hexA(mixHex(palette.bg || '#0a0a14', panel.color, 0.1), 0.12));
      grad.addColorStop(0.5, hexA(mixHex(palette.bg || '#0a0a14', palette.accent, 0.04), 0.08));
      grad.addColorStop(1, hexA(mixHex(palette.bg || '#0a0a14', panel.color, 0.1), 0.12));
      ctx.fillStyle = grad;
      roundRect(ctx, 0, 0, panelW, panelH, panelH * 0.08);
      ctx.fill();
      ctx.restore();

      ctx.save();
      const borderGrad = ctx.createLinearGradient(0, 0, panelW, panelH);
      borderGrad.addColorStop(0, hexA(panel.color, 0.3 + activeGlow * 0.5));
      borderGrad.addColorStop(0.5, hexA(palette.accent, 0.08 + activeGlow * 0.3));
      borderGrad.addColorStop(1, hexA(panel.color, 0.3 + activeGlow * 0.5));
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 1.2;
      roundRect(ctx, 0, 0, panelW, panelH, panelH * 0.08);
      ctx.stroke();
      ctx.restore();

      if (isActive && intensity >= 2) {
        ctx.save();
        ctx.globalAlpha = 0.15 * globalAlpha;
        const beamGrad = ctx.createLinearGradient(panelW * 0.1, panelH * 0.1, panelW * 0.9, panelH * 0.9);
        beamGrad.addColorStop(0, hexA(palette.accent, 0));
        const beamPos = (t01 * 0.5) % 1;
        beamGrad.addColorStop(beamPos * 0.9, hexA(palette.accent, 0.3));
        beamGrad.addColorStop(beamPos * 0.9 + 0.1, hexA(palette.accent, 0));
        ctx.fillStyle = beamGrad;
        roundRect(ctx, 0, 0, panelW, panelH, panelH * 0.08);
        ctx.fill();
        ctx.restore();
      }

      const iconCx = panelW * 0.15;
      const iconCy = panelH * 0.32;
      const iconSize = panelW * 0.12;

      ctx.save();
      ctx.fillStyle = hexA(panel.color, 0.12);
      ctx.beginPath();
      ctx.arc(iconCx, iconCy, iconSize * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hexA(panel.color, 0.2);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      drawLucideIcon(ctx, panel.icon, iconCx, iconCy, iconSize * 0.7, panel.color, { fill: false, strokeWidth: 1.5 });
      ctx.restore();

      ctx.save();
      ctx.font = `800 ${panelW * 0.07}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = hexA('#ffffff', 0.85);
      ctx.fillText(panel.label, panelW * 0.28, panelH * 0.3);
      ctx.restore();

      if (panel.value) {
        ctx.save();
        ctx.font = `700 ${panelW * 0.1}px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = hexA(panel.color, 0.95);
        ctx.shadowColor = hexA(panel.color, 0.2);
        ctx.shadowBlur = 4;
        ctx.fillText(panel.value, panelW * 0.28, panelH * 0.6);
        ctx.restore();
      } else {
        ctx.save();
        ctx.font = `500 ${panelW * 0.035}px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = hexA(palette.accent, 0.5);
        const tags = ['Innovative', 'Powerful', 'Premium'];
        ctx.fillText(tags[idx % tags.length], panelW * 0.28, panelH * 0.6);
        ctx.restore();
      }

      const dotY = panelH * 0.85;
      for (let di = 0; di < panelCount; di++) {
        const dotX = panelW * 0.28 + di * (panelW * 0.045);
        const isDotActive = di === idx;
        ctx.save();
        ctx.globalAlpha = alpha * globalAlpha;
        ctx.fillStyle = isDotActive ? hexA(palette.accent, 0.8) : hexA('#ffffff', 0.15);
        ctx.beginPath();
        ctx.arc(dotX, dotY, isDotActive ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (isActive && intensity >= 3) {
        const sparkleCount = 6;
        for (let si = 0; si < sparkleCount; si++) {
          const sa = (si / sparkleCount) * Math.PI * 2 + t01 * 2;
          const sr = panelW * 0.35 + Math.sin(t01 * 3 + si) * panelW * 0.05;
          const sx2 = panelW / 2 + Math.cos(sa) * sr;
          const sy2 = panelH / 2 + Math.sin(sa) * sr;
          const ss = 1.5 + 1.5 * Math.sin(t01 * 4 + si * 0.7);
          ctx.save();
          ctx.globalAlpha = (0.3 + 0.3 * Math.sin(t01 * 3 + si)) * globalAlpha;
          ctx.fillStyle = hexA(palette.accent, 0.6);
          ctx.shadowColor = hexA(palette.accent, 0.3);
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(sx2, sy2, ss, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.restore();
    }
  }

  ctx.restore();
};
