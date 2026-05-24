import type { PrimitiveContext, PrimitiveParams } from '../types';
import {
  clamp01, remap, lerp, easeOutCubic, easeInCubic, easeInOutCubic, easeOutBack,
} from '../easing';

// Deterministic per-frame pseudo-random (no seeding required, no state)
function frand(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  const v = s - Math.floor(s);
  return v < 0 ? v + 1 : v;
}

export const holoProjection = (
  { ctx, width: W, height: H, t01 }: PrimitiveContext,
  params: PrimitiveParams,
): void => {
  const label = (params.text || 'HOLOGRAM').toUpperCase();
  const subtitle = params.icon ? params.icon.toUpperCase() : null;

  // ── Phases ──────────────────────────────────────────────────────────────────
  const gridIn  = remap(t01, 0.00, 0.22);
  const textIn  = remap(t01, 0.16, 0.42);
  const holdT   = remap(t01, 0.42, 0.76);
  const surgeT  = remap(t01, 0.73, 0.83);
  const exitT   = remap(t01, 0.85, 1.00);

  const fade     = 1 - easeInCubic(exitT);
  const gridA    = easeOutCubic(gridIn) * fade;
  const textA    = easeOutCubic(textIn) * fade;
  const surgeAmt = Math.sin(surgeT * Math.PI);          // 0→1→0 brightness pulse

  // RGB split: large at text-in start, zero during hold, large at exit
  const splitAmt = W * 0.014 * (
    (1 - easeOutCubic(textIn)) * 3.5 + easeOutCubic(exitT) * 5
  );

  const CY = H * 0.42;   // hologram center Y (slightly above mid — room for grid)

  ctx.save();

  // ── 1. Background ──────────────────────────────────────────────────────────
  ctx.fillStyle = '#030810';
  ctx.fillRect(0, 0, W, H);

  // ── 2. Perspective floor grid ──────────────────────────────────────────────
  if (gridA > 0.01) {
    const horizon = H * 0.54;
    const vp = { x: W / 2, y: horizon };

    ctx.save();
    ctx.globalAlpha = gridA;

    // Horizontal receding lines — quadratic spacing so they bunch near horizon
    const hLines = 16;
    for (let i = 1; i <= hLines; i++) {
      const norm = i / hLines;
      const y = lerp(horizon, H * 1.05, norm * norm);
      const rowAlpha = 0.12 + norm * 0.42;
      ctx.globalAlpha = gridA * rowAlpha;
      ctx.strokeStyle = '#00c8ff';
      ctx.lineWidth = 0.4 + norm * 0.6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Vertical converging lines — vanish at vp
    const vLines = 22;
    for (let i = 0; i <= vLines; i++) {
      const t = i / vLines;
      const xBottom = lerp(-W * 0.25, W * 1.25, t);
      ctx.globalAlpha = gridA * 0.22;
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = '#00c8ff';
      ctx.beginPath();
      ctx.moveTo(vp.x, vp.y);
      ctx.lineTo(xBottom, H * 1.05);
      ctx.stroke();
    }

    ctx.restore();

    // Horizon glow strip
    const hGrad = ctx.createLinearGradient(0, horizon - H * 0.04, 0, horizon + H * 0.04);
    hGrad.addColorStop(0, 'rgba(0,200,255,0)');
    hGrad.addColorStop(0.5, `rgba(0,200,255,${gridA * 0.30})`);
    hGrad.addColorStop(1, 'rgba(0,200,255,0)');
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, horizon - H * 0.04, W, H * 0.08);
  }

  // ── 3. Emitter platform (bottom center) ────────────────────────────────────
  if (gridA > 0.01) {
    const emY = H * 0.90;
    const emR = ctx.createRadialGradient(W / 2, emY, 0, W / 2, emY, W * 0.28);
    emR.addColorStop(0, `rgba(0,180,255,${gridA * 0.55})`);
    emR.addColorStop(0.25, `rgba(0,100,255,${gridA * 0.18})`);
    emR.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = emR;
    ctx.fillRect(0, emY - W * 0.28, W, W * 0.56);

    // Vertical projection beam
    if (textA > 0.01) {
      const beamTop = CY + H * 0.17;
      const beamGrad = ctx.createLinearGradient(0, beamTop, 0, emY);
      beamGrad.addColorStop(0, `rgba(0,210,255,${textA * 0.35})`);
      beamGrad.addColorStop(1, 'rgba(0,210,255,0)');
      const bw = W * 0.003;
      ctx.fillStyle = beamGrad;
      ctx.fillRect(W / 2 - bw, beamTop, bw * 2, emY - beamTop);
    }
  }

  // ── 4. Scan-line sweep across text region ───────────────────────────────────
  if (textA > 0.01) {
    const tAreaTop = CY - H * 0.20;
    const tAreaH   = H * 0.40;

    ctx.save();
    ctx.beginPath();
    ctx.rect(W * 0.04, tAreaTop, W * 0.92, tAreaH);
    ctx.clip();

    // Two overlapping sweeps at different speeds for organic feel
    for (let s = 0; s < 2; s++) {
      const speed = s === 0 ? 0.55 : 0.38;
      const pos = (t01 * speed * 1.8 + s * 0.47) % 1;
      const sy = tAreaTop + pos * tAreaH;
      const sg = ctx.createLinearGradient(0, sy - 14, 0, sy + 5);
      sg.addColorStop(0, 'rgba(0,220,255,0)');
      sg.addColorStop(0.65, `rgba(0,220,255,${textA * (s === 0 ? 0.22 : 0.12)})`);
      sg.addColorStop(1, 'rgba(0,220,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(W * 0.04, sy - 14, W * 0.92, 19);
    }

    // Static fine scan lines (CRT texture)
    ctx.globalAlpha = textA * 0.07;
    ctx.fillStyle = '#000';
    for (let ry = tAreaTop; ry < tAreaTop + tAreaH; ry += 3) {
      ctx.fillRect(W * 0.04, ry, W * 0.92, 1.2);
    }

    ctx.restore();
  }

  // ── 5. Holographic text with RGB chromatic aberration ──────────────────────
  if (textA > 0.01) {
    const fontSize = Math.min(W * 0.09, H * 0.11, 110);
    ctx.font = `900 ${fontSize}px 'Segoe UI', 'Arial Black', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Subtle oscillating 3D tilt during hold
    const tiltOsc = holdT > 0 ? Math.sin(holdT * Math.PI * 2.8) * 0.013 : 0;

    ctx.save();
    // Simulate mild perspective tilt via skew
    ctx.transform(1, 0, tiltOsc * 0.4, 1 + tiltOsc * 0.01, 0, 0);

    const surgeBright = surgeAmt * 0.5;

    // R channel — left
    ctx.save();
    ctx.shadowColor = '#ff1050';
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgba(255,30,80,${textA * 0.50})`;
    ctx.fillText(label, W / 2 - splitAmt, CY);
    ctx.restore();

    // B channel — right
    ctx.save();
    ctx.shadowColor = '#1e50ff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgba(30,80,255,${textA * 0.50})`;
    ctx.fillText(label, W / 2 + splitAmt, CY);
    ctx.restore();

    // G/Cyan channel — center (primary, double-drawn for glow depth)
    ctx.save();
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 28 + surgeAmt * 22;
    ctx.fillStyle = `rgba(0,230,255,${textA * (0.92 + surgeBright)})`;
    ctx.fillText(label, W / 2, CY);
    // second pass for stronger core glow
    ctx.shadowBlur = 50 + surgeAmt * 30;
    ctx.globalAlpha = textA * (0.38 + surgeBright * 0.3);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(label, W / 2, CY);
    ctx.restore();

    ctx.restore();

    // Subtitle / tagline
    if (subtitle) {
      const subFS = fontSize * 0.26;
      ctx.save();
      ctx.font = `500 ${subFS}px 'Segoe UI', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = `rgba(0,200,255,${textA * 0.60})`;
      ctx.fillText(subtitle, W / 2, CY + fontSize * 0.75);
      ctx.restore();
    }
  }

  // ── 6. HUD corner brackets ─────────────────────────────────────────────────
  if (textA > 0.01) {
    const bx = W * 0.07;
    const by = CY - H * 0.18;
    const bw = W * 0.86;
    const bh = H * 0.36;
    const arm = Math.min(bw, bh) * 0.09;

    // Brackets slide inward from canvas edges as text reveals
    const slide = easeOutBack(textIn, 1.25);
    const inX   = lerp(bw * 0.08, 0, slide);
    const inY   = lerp(bh * 0.08, 0, slide);

    ctx.save();
    ctx.globalAlpha = textA * 0.85;
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.lineCap = 'square';

    const corners = [
      { cx: bx + inX,       cy: by + inY,       sx: 1,  sy: 1  },
      { cx: bx + bw - inX,  cy: by + inY,       sx: -1, sy: 1  },
      { cx: bx + inX,       cy: by + bh - inY,  sx: 1,  sy: -1 },
      { cx: bx + bw - inX,  cy: by + bh - inY,  sx: -1, sy: -1 },
    ];

    for (const c of corners) {
      ctx.beginPath();
      ctx.moveTo(c.cx + c.sx * arm, c.cy);
      ctx.lineTo(c.cx, c.cy);
      ctx.lineTo(c.cx, c.cy + c.sy * arm);
      ctx.stroke();
    }

    // Corner accent dots
    ctx.fillStyle = '#00e5ff';
    for (const c of corners) {
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Top center label tab
    const tabW = Math.min(bw * 0.3, 140);
    const tabH = H * 0.028;
    const tabX = W / 2 - tabW / 2;
    const tabY = by - tabH * 0.5;
    ctx.beginPath();
    ctx.moveTo(tabX + tabH * 0.6, tabY);
    ctx.lineTo(tabX + tabW - tabH * 0.6, tabY);
    ctx.lineTo(tabX + tabW, tabY + tabH);
    ctx.lineTo(tabX, tabY + tabH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,200,255,0.15)';
    ctx.fill();
    ctx.stroke();

    // "HOLO // SYS" text inside tab
    ctx.globalAlpha = textA * 0.7;
    ctx.fillStyle = '#00e5ff';
    ctx.font = `600 ${tabH * 0.55}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 4;
    ctx.fillText('HOLO ∕∕ SYS', W / 2, tabY + tabH * 0.52);

    ctx.restore();
  }

  // ── 7. Deterministic glitch flicker artifacts ──────────────────────────────
  if (textA > 0.35) {
    ctx.save();
    const frame = Math.floor(t01 * 55); // ~55 discrete frames across t01 range
    for (let i = 0; i < 5; i++) {
      const prob = frand(frame * 17 + i * 11);
      if (prob > 0.82) {
        const gy  = CY + (frand(i * 31 + frame) - 0.5) * H * 0.30;
        const gx  = frand(i * 19 + frame + 2) > 0.5 ? W * 0.07 : W * 0.60;
        const gw  = frand(i * 43 + frame + 1) * W * 0.18 + W * 0.04;
        const ga  = textA * (0.35 + frand(i * 7 + frame + 5) * 0.45);
        ctx.fillStyle = `rgba(0,220,255,${ga})`;
        ctx.fillRect(gx, gy - 1, gw, 2);
      }
    }
    ctx.restore();
  }

  // ── 8. Status readout ──────────────────────────────────────────────────────
  if (textA > 0.01) {
    const sfS = Math.min(W, H) * 0.017;
    ctx.save();
    ctx.font = `400 ${sfS}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00c8ff';
    ctx.shadowBlur = 6;
    ctx.fillStyle = `rgba(0,200,255,${textA * 0.40})`;

    // Dots pulse with holdT
    const dotN = holdT > 0 ? (Math.floor(holdT * 6) % 4) + 1 : 1;
    const statusY = CY + H * 0.20;
    ctx.fillText(`SYS.HOLO ► v4.2.1  ${'·'.repeat(dotN)}`, W * 0.07, statusY);

    // Right side: coordinate readout
    ctx.textAlign = 'right';
    const rx = Math.floor(lerp(0, 360, holdT > 0 ? holdT : textIn));
    ctx.fillText(`X:${rx.toString().padStart(3, '0')} Y:042 Z:180`, W * 0.93, statusY);

    ctx.restore();
  }

  ctx.restore();
};
