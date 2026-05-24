import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

type ColorMode = 'ai-blue' | 'quantum-purple' | 'bio-neural';

interface ColorScheme {
  core: string;
  coreGlow: string;
  electric: string;
  node: string;
  connection: string;
  pulse: string;
  bg: string;
  secondary: string;
}

const COLOR_SCHEMES: Record<ColorMode, ColorScheme> = {
  'ai-blue': {
    core: '#06b6d4',
    coreGlow: '#38bdf8',
    electric: '#ffffff',
    node: '#7dd3fc',
    connection: '#0ea5e9',
    pulse: '#38bdf8',
    bg: '#020617',
    secondary: '#1e3a5f',
  },
  'quantum-purple': {
    core: '#a855f7',
    coreGlow: '#c084fc',
    electric: '#f0abfc',
    node: '#d8b4fe',
    connection: '#9333ea',
    pulse: '#e879f9',
    bg: '#0a0015',
    secondary: '#3b0764',
  },
  'bio-neural': {
    core: '#22c55e',
    coreGlow: '#4ade80',
    electric: '#bbf7d0',
    node: '#86efac',
    connection: '#16a34a',
    pulse: '#4ade80',
    bg: '#020a04',
    secondary: '#14532d',
  },
};

interface Neuron {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  firing: boolean;
  fireTimer: number;
  connections: number[];
  energy: number;
  pulseProgress: number;
}

interface Pulse {
  from: number;
  to: number;
  progress: number;
  speed: number;
}

// ── Simplex-like noise using sin/cos combinations ──────────────────────────
function noise2D(x: number, y: number): number {
  return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1;
}

function fbm(x: number, y: number, octaves: number): number {
  let value = 0;
  let amp = 1;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * (noise2D(x * freq, y * freq));
    amp *= 0.5;
    freq *= 2;
  }
  return value;
}

export const neuralIntelligenceCore = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const label = p.text || '';
  const intensity = p.intensity ?? 2;
  const colorMode: ColorMode = (p.icon as ColorMode) || 'ai-blue';
  const C = COLOR_SCHEMES[colorMode];

  // ── Build deterministic seed from t01 ──────────────────────────────────
  const seed = Math.floor(t01 * 240) * 7919;

  // ── Fades ──────────────────────────────────────────────────────────────
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.12)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // ── Phases ─────────────────────────────────────────────────────────────
  const isIdle = t01 < 0.55;
  const activePhaseT = clamp01(remap(t01, 0.40, 0.70));
  const extremePhaseT = clamp01(remap(t01, 0.70, 0.85));
  const isExtreme = t01 >= 0.70 && t01 < 0.85;

  // ── Simulated cursor ──────────────────────────────────────────────────
  const cursorX = width / 2 + Math.sin(t01 * Math.PI * 1.7) * width * 0.15 * activePhaseT;
  const cursorY = height / 2 + Math.cos(t01 * Math.PI * 1.3) * height * 0.1 * activePhaseT;

  const cx = width / 2;
  const cy = height / 2;
  const maxDim = Math.max(width, height);

  // ── LAYER 1: Deep space background ─────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = globalAlpha;

  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim * 0.7);
  bgGrad.addColorStop(0, hexA(mixHex(C.bg, C.secondary, 0.3), 1));
  bgGrad.addColorStop(0.4, hexA(C.bg, 0.98));
  bgGrad.addColorStop(1, hexA(C.bg, 1));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle vignette
  const vigGrad = ctx.createRadialGradient(cx, cy, maxDim * 0.15, cx, cy, maxDim * 0.65);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(0.6, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, hexA(C.bg, 0.35));
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, width, height);

  // ── LAYER 2: Floating dust particles ───────────────────────────────────
  const dustCount = 120 + intensity * 40;
  for (let di = 0; di < dustCount; di++) {
    const dseed = (di * 73 + seed) * 1.1;
    const dx = ((Math.sin(dseed) * 0.5 + 0.5) % 1) * width;
    const dy = ((Math.cos(dseed * 1.3) * 0.5 + 0.5) % 1) * height;
    const dr = 0.3 + (Math.sin(dseed * 2.7) * 0.5 + 0.5) * 1.2;

    // Drift
    const drift = Math.sin(t01 * Math.PI * 0.3 + di) * 8;

    const da = (Math.sin(dseed * 3.1) * 0.5 + 0.5) * 0.15 * globalAlpha
      * (0.5 + 0.5 * Math.sin(t01 * Math.PI * 2 + dseed));

    ctx.save();
    ctx.globalAlpha = da;
    ctx.fillStyle = hexA('#ffffff', 0.5);
    ctx.beginPath();
    ctx.arc(dx + drift, dy + drift * 0.3, dr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Neural node system ────────────────────────────────────────────────
  const nodeCount = 24 + intensity * 8;
  const neurons: Neuron[] = [];
  const baseRadius = Math.min(width, height) * 0.22;
  const spreadRadius = Math.min(width, height) * 0.35;

  for (let ni = 0; ni < nodeCount; ni++) {
    const nseed = ni * 137.5;
    const angle = nseed;
    const dist = 0.15 + (Math.sin(nseed * 2.3) * 0.5 + 0.5) * 0.85;
    const nx = cx + Math.cos(angle) * spreadRadius * dist
      + (Math.sin(nseed * 5.7) * 0.5 + 0.5 - 0.5) * spreadRadius * 0.2;
    const ny = cy + Math.sin(angle) * spreadRadius * dist * 0.7
      + (Math.cos(nseed * 3.1) * 0.5 + 0.5 - 0.5) * spreadRadius * 0.2;
    const nr = 1.5 + (Math.sin(nseed * 1.7) * 0.5 + 0.5) * 2.5;
    const nphase = nseed * 0.1;

    neurons.push({
      x: nx, y: ny,
      vx: 0, vy: 0,
      radius: nr,
      phase: nphase,
      firing: false,
      fireTimer: 0,
      connections: [],
      energy: 0.3 + (Math.sin(nseed * 3.7) * 0.5 + 0.5) * 0.4,
      pulseProgress: 0,
    });
  }

  // ── Attraction to cursor (active state) ──────────────────────────────
  for (const n of neurons) {
    const dx = cursorX - n.x;
    const dy = cursorY - n.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0 && dist < spreadRadius * 0.8) {
      const force = (1 - dist / (spreadRadius * 0.8)) * 0.3 * activePhaseT;
      n.vx += (dx / dist) * force;
      n.vy += (dy / dist) * force;
    }
  }

  const nodeDamp = 0.85;
  for (const n of neurons) {
    n.x += n.vx;
    n.y += n.vy;
    n.vx *= nodeDamp;
    n.vy *= nodeDamp;

    // Boundary clamp
    const bound = spreadRadius * 1.2;
    n.x = clampRange(n.x, cx - bound, cx + bound);
    n.y = clampRange(n.y, cy - bound * 0.7, cy + bound * 0.7);
  }

  // ── Build connections (proximity-based) ──────────────────────────────
  const maxConnectDist = spreadRadius * 0.45;
  const connections: { from: number; to: number; dist: number }[] = [];

  for (let i = 0; i < neurons.length; i++) {
    for (let j = i + 1; j < neurons.length; j++) {
      const dx = neurons[i].x - neurons[j].x;
      const dy = neurons[i].y - neurons[j].y;
      const d = Math.hypot(dx, dy);
      if (d < maxConnectDist) {
        connections.push({ from: i, to: j, dist: d });
      }
    }
  }

  // Sort by distance, keep closest ones
  connections.sort((a, b) => a.dist - b.dist);
  const maxConnections = 40 + intensity * 15;
  const activeConnections = connections.slice(0, maxConnections);

  // ── Neuron firing simulation ──────────────────────────────────────────
  for (let ni = 0; ni < neurons.length; ni++) {
    const n = neurons[ni];
    // Random firing based on position, time, and cursor proximity
    const fireChance = 0.002 + 0.003 * intensity + 0.005 * activePhaseT * (1 - Math.hypot(n.x - cursorX, n.y - cursorY) / spreadRadius);
    if (Math.random() < fireChance) {
      n.firing = true;
      n.fireTimer = 1;
    }
    if (n.fireTimer > 0) {
      n.fireTimer -= 0.02;
      if (n.fireTimer <= 0) n.firing = false;
    }
  }

  // ── Pulse propagation system ──────────────────────────────────────────
  const pulses: Pulse[] = [];
  if (Math.random() < 0.05 + 0.08 * activePhaseT) {
    const srcIdx = Math.floor(Math.random() * neurons.length);
    const connected = activeConnections
      .filter(c => c.from === srcIdx || c.to === srcIdx);
    for (const c of connected) {
      const target = c.from === srcIdx ? c.to : c.from;
      pulses.push({ from: srcIdx, to: target, progress: 0, speed: 0.03 + Math.random() * 0.02 });
    }
  }

  for (const p of pulses) {
    p.progress += p.speed;
  }

  // ── LAYER 3: Neural network lines ─────────────────────────────────────
  ctx.save();
  for (const c of activeConnections) {
    const n1 = neurons[c.from];
    const n2 = neurons[c.to];

    const isFiring = n1.firing || n2.firing;
    const distRatio = 1 - c.dist / maxConnectDist;
    const lineAlpha = distRatio * 0.35 * (0.5 + 0.5 * Math.sin(t01 * 0.5 + c.from + c.to));

    // Check if a pulse is traveling this connection
    const hasPulse = pulses.some(p =>
      (p.from === c.from && p.to === c.to) || (p.from === c.to && p.to === c.from)
    );

    ctx.save();
    ctx.globalAlpha = lineAlpha * globalAlpha * (isFiring ? 1.5 : 1);
    ctx.strokeStyle = hexA(C.connection, isFiring ? 0.6 : 0.15);
    ctx.lineWidth = isFiring ? 1.5 : 0.5;

    ctx.beginPath();
    ctx.moveTo(n1.x, n1.y);

    // Slight curve for organic feel
    const midX = (n1.x + n2.x) / 2 + (Math.sin(t01 + c.from) * 8);
    const midY = (n1.y + n2.y) / 2 + (Math.cos(t01 + c.to) * 8);
    ctx.quadraticCurveTo(midX, midY, n2.x, n2.y);
    ctx.stroke();
    ctx.restore();

    // Pulse glow on active connections
    if (hasPulse || isFiring) {
      ctx.save();
      ctx.globalAlpha = (0.08 + 0.04 * Math.sin(t01 * 3 + c.from)) * globalAlpha;
      ctx.strokeStyle = hexA(C.pulse, 0.3);
      ctx.lineWidth = 3;
      ctx.shadowColor = hexA(C.pulse, 0.4);
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.quadraticCurveTo(midX, midY, n2.x, n2.y);
      ctx.stroke();
      ctx.restore();
    }

    // Traveling pulse dot
    for (const p of pulses) {
      if ((p.from === c.from && p.to === c.to) || (p.from === c.to && p.to === c.from)) {
        const px = lerp(n1.x, n2.x, p.progress);
        const py = lerp(n1.y, n2.y, p.progress);
        ctx.save();
        ctx.globalAlpha = (1 - p.progress) * 0.8 * globalAlpha;
        ctx.fillStyle = C.pulse;
        ctx.shadowColor = hexA(C.pulse, 0.6);
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  ctx.restore();

  // ── LAYER 4: Intelligence core ────────────────────────────────────────
  const coreT = easeOutBack(clamp01(remap(t01, 0.05, 0.35)), 1.8);
  const coreRadius = baseRadius * lerp(0.2, 1, coreT);
  const coreBreath = 1 + 0.03 * Math.sin(t01 * Math.PI * 1.5);

  // Outer glow shell
  const shellCount = 3;
  for (let si = shellCount - 1; si >= 0; si--) {
    const shellR = coreRadius * (1 + (si + 1) * 0.15) * coreBreath;
    const shellAlpha = 0.06 * (1 - si / shellCount) * globalAlpha;
    const shellPulse = 0.5 + 0.5 * Math.sin(t01 * Math.PI * (1.2 + si * 0.3));

    ctx.save();
    ctx.globalAlpha = shellAlpha * shellPulse;
    const shellGrad = ctx.createRadialGradient(cx, cy, shellR * 0.5, cx, cy, shellR);
    shellGrad.addColorStop(0, hexA(C.coreGlow, 0));
    shellGrad.addColorStop(0.6, hexA(C.core, 0.15));
    shellGrad.addColorStop(1, hexA(C.core, 0));
    ctx.fillStyle = shellGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, shellR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Core glow bloom
  ctx.save();
  const bloomR = coreRadius * 2.5 * coreBreath;
  const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, bloomR);
  bloom.addColorStop(0, hexA(C.coreGlow, 0.2 * globalAlpha));
  bloom.addColorStop(0.2, hexA(C.core, 0.1 * globalAlpha));
  bloom.addColorStop(0.5, hexA(C.core, 0.03 * globalAlpha));
  bloom.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(cx, cy, bloomR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Core body
  ctx.save();
  ctx.shadowColor = hexA(C.coreGlow, 0.5);
  ctx.shadowBlur = 25 + 10 * Math.sin(t01 * Math.PI * 2);
  const coreGrad = ctx.createRadialGradient(
    cx - coreRadius * 0.2, cy - coreRadius * 0.2, 0,
    cx, cy, coreRadius,
  );
  coreGrad.addColorStop(0, hexA('#ffffff', 0.9));
  coreGrad.addColorStop(0.15, hexA(C.coreGlow, 0.8));
  coreGrad.addColorStop(0.5, hexA(C.core, 0.7));
  coreGrad.addColorStop(1, hexA(C.core, 0.1));
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius * coreBreath, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Rotating neural rings (Layer 4.5) ────────────────────────────────
  const ringCount = 2 + intensity;
  for (let ri = 0; ri < ringCount; ri++) {
    const ringR = coreRadius * (1.4 + ri * 0.35);
    const ringSpeed = 0.4 + ri * 0.15;
    const rotation = t01 * Math.PI * 2 * ringSpeed + ri * 1.2;
    const ringTilt = 0.2 + ri * 0.1;

    ctx.save();
    ctx.transform(
      1, 0,
      0, Math.cos(ringTilt),
      cx, cy,
    );
    ctx.rotate(rotation);

    ctx.globalAlpha = (0.1 - ri * 0.02) * globalAlpha;
    ctx.strokeStyle = hexA(C.connection, 0.15);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6 + ri * 2]);
    ctx.lineDashOffset = -t01 * 20 * ringSpeed;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Ring node dots
    const dotCount = 8 - ri * 2;
    for (let di = 0; di < dotCount; di++) {
      const da = (di / dotCount) * Math.PI * 2 + rotation;
      const dx = cx + ringR * Math.cos(da) * 1;
      const dy = cy + ringR * Math.sin(da) * Math.cos(ringTilt);
      const dr = 1.5 + 0.5 * Math.sin(t01 * 2 + ri + di);

      ctx.save();
      ctx.globalAlpha = (0.2 - ri * 0.03) * globalAlpha
        * (0.5 + 0.5 * Math.sin(t01 * 3 + di));
      ctx.fillStyle = hexA(C.node, 0.6);
      ctx.shadowColor = hexA(C.pulse, 0.3);
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── LAYER 5: Electric energy arcs ──────────────────────────────────────
  const arcCount = 3 + intensity;
  for (let ai = 0; ai < arcCount; ai++) {
    const arcPhase = t01 * 2 + ai * 0.8;
    const arcActive = Math.sin(arcPhase * Math.PI) > 0.3;
    if (!arcActive) continue;

    const arcAngle = t01 * 1.5 + ai * 2.1;
    const arcRadius = coreRadius * (1.8 + 0.3 * Math.sin(t01 + ai));
    const startAngle = arcAngle - 0.4;
    const endAngle = arcAngle + 0.4 + 0.3 * Math.sin(t01 * 2 + ai);
    const arcDist = 1 + 0.3 * Math.sin(t01 * 3 + ai * 1.7);

    ctx.save();
    ctx.globalAlpha = (0.08 + 0.04 * Math.sin(t01 * 4 + ai)) * globalAlpha;

    const arcGrad = ctx.createConicGradient(startAngle, cx, cy);
    arcGrad.addColorStop(0, hexA(C.electric, 0));
    arcGrad.addColorStop(0.3, hexA(C.electric, 0.3));
    arcGrad.addColorStop(0.5, hexA(C.electric, 0.5));
    arcGrad.addColorStop(0.7, hexA(C.electric, 0.3));
    arcGrad.addColorStop(1, hexA(C.electric, 0));
    ctx.strokeStyle = arcGrad;
    ctx.lineWidth = 1.5 + 0.5 * Math.sin(t01 * 5 + ai);

    ctx.shadowColor = hexA(C.electric, 0.2);
    ctx.shadowBlur = 8;

    // Draw zigzag arc
    const segments = 12;
    ctx.beginPath();
    for (let si = 0; si <= segments; si++) {
      const t = si / segments;
      const angle = startAngle + (endAngle - startAngle) * t;
      const zigzag = Math.sin(t * 20 + t01 * 8 + ai * 3) * 4;
      const px = cx + (arcRadius + zigzag) * Math.cos(angle);
      const py = cy + (arcRadius + zigzag) * Math.sin(angle) * 0.7;
      if (si === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── LAYER 6: Glow bloom overlay ───────────────────────────────────────
  const bloomT = easeInOutCubic(clamp01(remap(t01, 0.15, 0.40)));
  if (bloomT > 0.01) {
    ctx.save();
    ctx.globalAlpha = 0.04 * bloomT * globalAlpha;
    ctx.fillStyle = hexA(C.coreGlow, 0.2);
    ctx.filter = 'blur(20px)';
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = 'none';
    ctx.restore();
  }

  // ── Extreme state: massive synchronization pulse ──────────────────────
  if (isExtreme) {
    const shockwaveT = easeOutCubic(clamp01(remap(t01, 0.70, 0.76)));
    if (shockwaveT > 0) {
      const shockR = maxDim * 0.7 * shockwaveT;
      ctx.save();
      ctx.globalAlpha = (1 - shockwaveT) * 0.5 * globalAlpha;
      ctx.strokeStyle = hexA(C.electric, 0.6);
      ctx.lineWidth = 2;
      ctx.shadowColor = hexA(C.pulse, 0.5);
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx, cy, shockR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Full connection flash
    const flashT = clamp01(remap(t01, 0.72, 0.78));
    if (flashT > 0 && flashT < 1) {
      ctx.save();
      ctx.globalAlpha = (1 - flashT) * 0.3;
      ctx.fillStyle = hexA(C.electric, 0.4);
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Mass connectivity
    if (t01 >= 0.74 && t01 < 0.82) {
      const massT = clamp01(remap(t01, 0.74, 0.82));
      ctx.save();
      ctx.globalAlpha = massT * globalAlpha * 0.5;
      for (let i = 0; i < neurons.length; i++) {
        for (let j = i + 1; j < neurons.length; j++) {
          if (j - i > 5) continue;
          const n1 = neurons[i];
          const n2 = neurons[j];
          ctx.strokeStyle = hexA(C.pulse, 0.3 * (1 - massT));
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  // ── Neural memory trails (temporal) ───────────────────────────────────
  const trailIntensity = 0.03 + 0.02 * intensity;
  ctx.save();
  ctx.globalAlpha = trailIntensity * globalAlpha;
  ctx.fillStyle = hexA(C.core, 0.03);
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // ── Noise distortion field ────────────────────────────────────────────
  const noiseField = fbm(t01 * 0.5, t01 * 0.3, 3);
  ctx.save();
  ctx.globalAlpha = 0.015 * noiseField * globalAlpha;
  ctx.fillStyle = hexA(C.pulse, 0.15);
  for (let ni = 0; ni < 30; ni++) {
    const nx = ((Math.sin(ni * 53 + seed) * 0.5 + 0.5) % 1) * width;
    const ny = ((Math.cos(ni * 37 + seed) * 0.5 + 0.5) % 1) * height;
    ctx.beginPath();
    ctx.arc(nx, ny, 2 + noiseField * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── LAYER 7: Cinematic grain ──────────────────────────────────────────
  const grainCount = Math.floor((width * height) / 4000);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  for (let gi = 0; gi < grainCount; gi++) {
    const gseed = (gi * 7919 + seed) % 233280;
    const gx = (gseed * 37) % width;
    const gy = ((gseed * 73) >> 1) % height;
    const ga = ((gseed * 11) % 100) / 2000;
    ctx.fillStyle = `rgba(255,255,255,${ga})`;
    ctx.fillRect(gx, gy, 1, 1);
  }
  ctx.restore();

  // ── Label ────────────────────────────────────────────────────────────
  if (label) {
    const labelT = easeOutCubic(clamp01(remap(t01, 0.50, 0.65)));
    if (labelT > 0.01) {
      ctx.save();
      ctx.globalAlpha = globalAlpha * labelT;
      ctx.translate(cx, 0);

      const labelSize = Math.min(width, height) * 0.025;
      ctx.font = `600 ${labelSize}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = hexA(C.coreGlow, 0.3);
      ctx.shadowBlur = 8;
      ctx.fillStyle = hexA('#ffffff', 0.5);
      ctx.fillText(label, 0, height * 0.92);

      ctx.shadowBlur = 0;

      // Subtitle accent line
      const w = ctx.measureText(label).width;
      ctx.strokeStyle = hexA(C.core, 0.2);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.3, height * 0.935);
      ctx.lineTo(cx + w * 0.3, height * 0.935);
      ctx.stroke();

      ctx.restore();
    }
  }

  ctx.restore(); // global
};

function clampRange(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
