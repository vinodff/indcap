import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

const COMMANDS = [
  { label: 'Quick Export', icon: '⬡', shortcut: '⌘E' },
  { label: 'Add Beat', icon: '⊕', shortcut: '⌘B' },
  { label: 'Switch Theme', icon: '✦', shortcut: '⌘T' },
  { label: 'Render Preview', icon: '▶', shortcut: '⌘P' },
  { label: 'Save Project', icon: '☐', shortcut: '⌘S' },
  { label: 'Share', icon: '↗', shortcut: '⌘⇧S' },
];

export const neonCommandMenu = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const label = p.text || '';
  const intensity = p.intensity ?? 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const cx = width / 2;
  const cy = height * 0.38;

  const entryT = easeOutBack(clamp01(remap(t01, 0.05, 0.30)), 1.3);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  ctx.fillStyle = hexA(palette.bg || '#0a0a14', 0.85 * (1 - easeOutCubic(clamp01(remap(t01, 0, 0.15)))));
  ctx.fillRect(0, 0, width, height);

  const menuW = Math.min(width, height) * 0.42;
  const menuR = menuW * 0.05;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(lerp(0.7, 1, entryT), lerp(0.7, 1, entryT));
  ctx.translate(0, lerp(20, 0, entryT));

  ctx.save();
  ctx.shadowColor = hexA(palette.accent, 0.15);
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 6;

  ctx.beginPath();
  ctx.roundRect(-menuW / 2, 0, menuW, height * 0.65, menuR);
  ctx.fillStyle = '#16161a';
  ctx.fill();
  ctx.restore();

  ctx.shadowBlur = 0;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-menuW / 2, 0, menuW, height * 0.65, menuR);
  ctx.clip();

  ctx.strokeStyle = hexA(palette.accent, 0.08);
  ctx.lineWidth = 0.5;
  ctx.strokeRect(-menuW / 2, 0, menuW, height * 0.65);

  const searchH = menuW * 0.12;
  const searchGap = menuW * 0.04;

  ctx.save();
  ctx.fillStyle = hexA(palette.bg || '#0a0a14', 0.6);
  ctx.beginPath();
  ctx.roundRect(-menuW / 2 + searchGap, searchGap, menuW - searchGap * 2, searchH, 6);
  ctx.fill();

  ctx.strokeStyle = hexA(palette.accent, 0.25);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-menuW / 2 + searchGap, searchGap, menuW - searchGap * 2, searchH, 6);
  ctx.stroke();

  const searchFs = searchH * 0.38;
  ctx.font = `400 ${searchFs}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = hexA('#ffffff', 0.5);
  ctx.fillText('🔍', -menuW / 2 + searchGap + searchH * 0.3, searchGap + searchH / 2);

  ctx.fillStyle = hexA('#ffffff', 0.35);
  ctx.fillText(
    label || 'Search commands...',
    -menuW / 2 + searchGap + searchH * 0.85,
    searchGap + searchH / 2,
  );

  const cursorBlink = Math.sin(t01 * Math.PI * 4) > 0;
  if (cursorBlink && (label || t01 < 0.6)) {
    const cursorX = -menuW / 2 + searchGap + searchH * 0.85 + (
      label ? ctx.measureText(label).width + 4 : ctx.measureText('Search commands...').width + 4
    );
    ctx.fillStyle = hexA(palette.accent, 0.8);
    ctx.fillRect(cursorX, searchGap + searchH * 0.25, 1.5, searchH * 0.5);
  }

  ctx.restore();

  const visibleCommands = intensity >= 3 ? COMMANDS : COMMANDS.slice(0, 4);
  const itemH = menuW * 0.085;
  const itemGap = 2;
  const itemStartY = searchGap + searchH + searchGap;
  const hoverIdx = Math.floor((t01 * visibleCommands.length * 0.8) % visibleCommands.length);

  for (let ci = 0; ci < visibleCommands.length; ci++) {
    const cmd = visibleCommands[ci];
    const itemT = easeOutCubic(clamp01(remap(t01, 0.15 + ci * 0.04, 0.25 + ci * 0.04)));
    if (itemT < 0.005) continue;

    const yi = itemStartY + ci * (itemH + itemGap);
    const isHover = ci === hoverIdx;

    ctx.save();
    ctx.globalAlpha = itemT;
    ctx.translate(lerp(-8, 0, itemT), 0);

    if (isHover) {
      ctx.save();
      ctx.fillStyle = hexA(palette.primary, 0.1);
      ctx.beginPath();
      ctx.roundRect(-menuW / 2 + searchGap, yi, menuW - searchGap * 2, itemH, 4);
      ctx.fill();
      ctx.restore();

      ctx.shadowColor = hexA(palette.accent, 0.15);
      ctx.shadowBlur = 4;
      ctx.strokeStyle = hexA(palette.accent, 0.15);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-menuW / 2 + searchGap, yi, menuW - searchGap * 2, itemH, 4);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    const iconFs = itemH * 0.45;
    ctx.font = `${iconFs}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isHover ? hexA(palette.accent, 0.8) : hexA('#ffffff', 0.4);
    ctx.fillText(cmd.icon, -menuW / 2 + searchGap + itemH * 0.5, yi + itemH / 2);

    const labelFs = itemH * 0.38;
    ctx.font = `500 ${labelFs}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = isHover ? hexA('#ffffff', 0.85) : hexA('#ffffff', 0.5);
    ctx.fillText(cmd.label, -menuW / 2 + searchGap + itemH * 0.9, yi + itemH / 2);

    const shortcutFs = itemH * 0.3;
    ctx.font = `400 ${shortcutFs}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = hexA('#ffffff', 0.25);
    ctx.fillText(cmd.shortcut, menuW / 2 - searchGap - itemH * 0.15, yi + itemH / 2);

    ctx.restore();
  }

  ctx.restore();

  ctx.restore();

  ctx.restore();
};
