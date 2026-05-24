/**
 * Playground entry script. Hosts the canvas render loop and wires the
 * controls to the PRIMITIVES registry. Self-contained — no React.
 */

import { PRIMITIVES, getPalette } from '../services/motion';
import type { PrimitiveContext, PrimitiveParams } from '../services/motion';
import type { PrimitiveType, Palette } from '../services/motionGraphicsService';
import { PRIMITIVE_LABELS } from '../services/motionGraphicsService';

const ALL: PrimitiveType[] = [
  // Magic UI / Aceternity — at the top so they're easy to demo
  'aurora-text',
  'shimmer-text',
  'hyper-text',
  'meteors',
  'ripple',
  'retro-grid',
  'border-beam',
  'spotlight',
  'morph-text',
  // Phase 3.5 cinematic
  'camera-zoom-3d',
  'animated-arrow',
  'particle-burst',
  'glitch-text',
  'light-sweep',
  // Classic
  'big-text-reveal',
  'lower-third',
  'icon-burst',
  'counter',
  'highlight-box',
  'bg-gradient-pulse',
  'transition-wipe',
  'word-emphasis-flash',
  'quote-card',
  'bullet-list-reveal',
  'callout-arrow',
  'bar-reveal',
];

const TEXT_PRESETS_PHASE7: Partial<Record<PrimitiveType, string>> = {
  'aurora-text': 'PRODUCTIVITY HACK',
  'shimmer-text': 'BUILT FOR CREATORS',
  'hyper-text': 'DECODED',
  'meteors': '',
  'ripple': '',
  'retro-grid': '',
  'border-beam': 'PREMIUM PLAN',
  'spotlight': '',
  'morph-text': 'MORE | LESS | PERFECT',
};
const TEXT_PRESETS: Partial<Record<PrimitiveType, string>> = {
  ...TEXT_PRESETS_PHASE7,
  'big-text-reveal': 'Stop Doing More',
  'lower-third': 'Vinod K · Founder',
  'icon-burst': 'Energy',
  'counter': '97% of people fail',
  'highlight-box': 'Watch this part',
  'bg-gradient-pulse': '',
  'transition-wipe': '',
  'word-emphasis-flash': 'NOW',
  'camera-zoom-3d': 'ZOOM IN',
  'animated-arrow': 'Right here',
  'particle-burst': '',
  'glitch-text': 'SYSTEM ERROR',
  'light-sweep': '',
  'quote-card': 'Less is more.',
  'bullet-list-reveal': 'Plan · Build · Ship',
  'callout-arrow': 'Look here',
  'bar-reveal': '78% growth',
};

const ICON_PRESETS: Partial<Record<PrimitiveType, string>> = {
  'icon-burst': 'zap',
  'particle-burst': 'fire',
  'callout-arrow': 'pointing-right',
};

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const buttonRow = document.getElementById('primitive-buttons')!;
const textInput = document.getElementById('text-input') as HTMLInputElement;
const iconInput = document.getElementById('icon-input') as HTMLInputElement;
const paletteSelect = document.getElementById('palette-select') as HTMLSelectElement;
const anchorSelect = document.getElementById('anchor-select') as HTMLSelectElement;
const intensityInput = document.getElementById('intensity-input') as HTMLInputElement;
const durationInput = document.getElementById('duration-input') as HTMLInputElement;
const durationReadout = document.getElementById('duration-readout')!;
const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
const loopBtn = document.getElementById('loop-btn') as HTMLButtonElement;
const playAllBtn = document.getElementById('play-all-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const tReadout = document.getElementById('t-readout')!;
const primReadout = document.getElementById('primitive-readout')!;
const fpsEl = document.getElementById('fps')!;
const progressEl = document.getElementById('progress')!;
const statusEl = document.getElementById('status')!;

let active: PrimitiveType = 'big-text-reveal';
let playing = true;
let looping = true;
let sequenceMode = false;
let sequenceIdx = 0;
let beatStartedAt = performance.now();

const setActive = (p: PrimitiveType, resetTime = true) => {
  active = p;
  textInput.value = TEXT_PRESETS[p] ?? textInput.value;
  if (ICON_PRESETS[p]) iconInput.value = ICON_PRESETS[p] as string;
  primReadout.textContent = PRIMITIVE_LABELS[p];
  document.querySelectorAll<HTMLButtonElement>('#primitive-buttons button.prim').forEach((b) => {
    b.classList.toggle('active', b.dataset.id === p);
  });
  if (resetTime) {
    beatStartedAt = performance.now();
    playing = true;
  }
};

// Build the primitive button row
ALL.forEach((p) => {
  const btn = document.createElement('button');
  btn.className = 'prim';
  btn.dataset.id = p;
  btn.textContent = PRIMITIVE_LABELS[p];
  btn.onclick = () => {
    sequenceMode = false;
    setActive(p);
  };
  buttonRow.appendChild(btn);
});
setActive(active);

durationInput.oninput = () => {
  durationReadout.textContent = `${parseFloat(durationInput.value).toFixed(1)}s`;
};

playBtn.onclick = () => {
  beatStartedAt = performance.now();
  playing = true;
  sequenceMode = false;
};

loopBtn.onclick = () => {
  looping = !looping;
  loopBtn.textContent = `Loop: ${looping ? 'on' : 'off'}`;
};

playAllBtn.onclick = () => {
  sequenceMode = true;
  sequenceIdx = 0;
  setActive(ALL[0]);
  statusEl.textContent = `sequence 1/${ALL.length}`;
};

resetBtn.onclick = () => {
  playing = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  statusEl.textContent = 'reset';
};

// ─── Render loop ─────────────────────────────────────────────────────────────
let lastT = performance.now();
let frameCount = 0;
let fpsAccum = 0;

const tick = (now: number) => {
  const dt = now - lastT;
  lastT = now;
  fpsAccum += dt;
  frameCount++;
  if (fpsAccum > 500) {
    const fps = Math.round((frameCount * 1000) / fpsAccum);
    fpsEl.textContent = `${fps} fps`;
    frameCount = 0;
    fpsAccum = 0;
  }

  const duration = Math.max(0.1, parseFloat(durationInput.value));
  const elapsed = (now - beatStartedAt) / 1000;
  let t01 = elapsed / duration;

  if (t01 > 1) {
    if (sequenceMode) {
      sequenceIdx++;
      if (sequenceIdx >= ALL.length) {
        if (looping) {
          sequenceIdx = 0;
        } else {
          sequenceMode = false;
          playing = false;
          statusEl.textContent = 'sequence done';
          requestAnimationFrame(tick);
          return;
        }
      }
      setActive(ALL[sequenceIdx]);
      statusEl.textContent = `sequence ${sequenceIdx + 1}/${ALL.length}`;
      t01 = 0;
    } else if (looping) {
      beatStartedAt = now;
      t01 = 0;
    } else {
      t01 = 1;
      playing = false;
    }
  }

  // Background
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle stage grid for reference
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += canvas.width / 12) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += canvas.height / 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  ctx.restore();

  // Primitive draw
  const palette = getPalette(paletteSelect.value as Palette);
  const pc: PrimitiveContext = {
    ctx,
    width: canvas.width,
    height: canvas.height,
    t01: Math.max(0, Math.min(1, t01)),
    durationSec: duration,
    palette,
  };
  const params: PrimitiveParams = {
    text: textInput.value,
    icon: iconInput.value,
    palette: paletteSelect.value as Palette,
    anchor: anchorSelect.value as PrimitiveParams['anchor'],
    intensity: Number(intensityInput.value) as 1 | 2 | 3,
  };

  try {
    PRIMITIVES[active](pc, params);
  } catch (e) {
    statusEl.textContent = 'render error: ' + (e as Error).message;
    console.error(e);
  }

  tReadout.textContent = `t=${pc.t01.toFixed(2)}`;
  progressEl.style.width = `${pc.t01 * 100}%`;

  requestAnimationFrame(tick);
};

void playing;
requestAnimationFrame(tick);
