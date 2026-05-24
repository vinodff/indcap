import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, remap, lerp, easeOutBack, easeOutCubic, easeInCubic } from '../easing';
import { roundRect, hexA } from '../decorations';

// Classic sticky-note yellows + extras
const NOTE_COLORS = ['#fef08a', '#fde68a', '#fcd34d', '#bfdbfe', '#bbf7d0', '#fecaca'];
const NOTE_ROTATE = [-8, 5, -3, 9, -6];

interface Note {
  color: string;
  angle: number;
  lines: string[];
  cornerFold: boolean;
}

function buildNotes(label: string): Note[] {
  const parts = label.split('|').map(s => s.trim()).filter(Boolean);
  const defaults = ['Great idea!', 'Remember this', 'Key insight', 'Don\'t forget', 'Action item'];
  const texts = parts.length > 0 ? parts : defaults;
  return texts.slice(0, 5).map((t, i) => ({
    color: NOTE_COLORS[i % NOTE_COLORS.length],
    angle: (NOTE_ROTATE[i % NOTE_ROTATE.length] * Math.PI) / 180,
    lines: t.split('/').map(s => s.trim()),
    cornerFold: i % 2 === 1,
  }));
}

function drawNote(
  ctx: CanvasRenderingContext2D,
  note: Note,
  cx: number,
  cy: number,
  nw: number,
  nh: number,
  alpha: number,
  hoverScale: number,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(note.angle);
  ctx.scale(hoverScale, hoverScale);

  const x = -nw / 2, y = -nh / 2;

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = nw * 0.08;
  ctx.shadowOffsetX = nw * 0.025;
  ctx.shadowOffsetY = nw * 0.03;

  // Note body
  ctx.fillStyle = note.color;
  roundRect(ctx, x, y, nw, nh, nw * 0.03);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Ruled lines
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 0.8;
  const lineSpacing = nh * 0.14;
  const firstLine = y + nh * 0.24;
  for (let l = 0; l < 5; l++) {
    const ly = firstLine + l * lineSpacing;
    if (ly < y + nh - nh * 0.1) {
      ctx.beginPath();
      ctx.moveTo(x + nw * 0.08, ly);
      ctx.lineTo(x + nw * 0.92, ly);
      ctx.stroke();
    }
  }

  // Top tape strip
  const tapeW = nw * 0.28;
  const tapeH = nh * 0.06;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.rect(x + (nw - tapeW) / 2, y - tapeH / 2, tapeW, tapeH);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,180,120,0.25)';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Corner fold
  if (note.cornerFold) {
    const fSize = nw * 0.1;
    const fx = x + nw - fSize;
    const fy = y + nh - fSize;
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.moveTo(fx, y + nh);
    ctx.lineTo(x + nw, fy);
    ctx.lineTo(x + nw, y + nh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hexA(note.color, 0.7);
    ctx.beginPath();
    ctx.moveTo(fx, y + nh);
    ctx.lineTo(x + nw, fy);
    ctx.lineTo(fx, fy);
    ctx.closePath();
    ctx.fill();
  }

  // Text lines
  ctx.fillStyle = 'rgba(30,20,10,0.80)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = nw * 0.095;
  ctx.font = `600 ${fontSize}px 'Segoe UI', sans-serif`;
  const totalTextH = note.lines.length * fontSize * 1.4;
  const textStartY = y + nh * 0.5 - totalTextH / 2 + nh * 0.04;
  note.lines.forEach((line, li) => {
    ctx.fillText(line, 0, textStartY + li * fontSize * 1.4, nw * 0.82);
  });

  ctx.restore();
}

export const stackedNotes = (
  { ctx, width: W, height: H, t01 }: PrimitiveContext,
  params: PrimitiveParams,
): void => {
  const notes = buildNotes(params.text ?? '');
  const count = notes.length;

  // Note dimensions relative to canvas
  const nw = Math.min(W * 0.38, H * 0.28, 220);
  const nh = nw * 1.05;

  // Stack centre
  const cx = W * 0.5;
  const cy = H * 0.5;

  // Spread offsets so notes fan out when fully revealed
  const spreadX = nw * 0.18;
  const spreadY = nh * 0.12;

  for (let i = 0; i < count; i++) {
    // Each note reveals with a staggered delay
    const staggerStart = i * 0.12;
    const staggerEnd   = staggerStart + 0.22;
    const entryP = clamp01(remap(t01, staggerStart, staggerEnd));
    const exitP  = clamp01(remap(t01, 0.80 + i * 0.02, 0.96 + i * 0.01));

    const scale   = easeOutBack(entryP, 1.35) * (1 - easeInCubic(exitP));
    const alpha   = easeOutCubic(entryP) * (1 - easeInCubic(exitP));

    // Fan spread: older notes drift to edges, newest stays centred
    const stackLayer = count - 1 - i; // 0 = topmost
    const fanT = easeOutCubic(clamp01(remap(t01, 0.30, 0.55)));
    const offsetX = lerp(0, stackLayer * spreadX * (i % 2 === 0 ? 1 : -1), fanT);
    const offsetY = lerp(0, stackLayer * -spreadY, fanT);

    // Topmost note gets a subtle float bob
    const bobY = stackLayer === 0
      ? Math.sin(t01 * Math.PI * 3.5) * H * 0.008
      : 0;

    drawNote(
      ctx,
      notes[i],
      cx + offsetX,
      cy + offsetY + bobY,
      nw,
      nh,
      alpha,
      scale,
    );
  }
};
