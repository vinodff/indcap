import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeOutCubic, easeInCubic, easeInOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Segoe UI', sans-serif`;

interface Fragment {
  id: number;
  ox: number; oy: number;
  ow: number; oh: number;
  tx: number; ty: number;
  rot: number;
  scale: number;
  phase: number;
}

interface EdgeParticle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  life: number;
  maxLife: number;
  hue: number;
}

interface GravityParticle {
  x: number; y: number;
  baseX: number; baseY: number;
  size: number;
  phase: number;
}

const mulberry32 = (seed: number) => {
  let a = (seed ^ 0x6a09e667) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const quantumCardExplosion = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;
  const label = p.text || 'QUANTUM CARD';

  const globalAlpha = 1;
  if (globalAlpha < 0.005) return;

  const cx = width / 2;
  const cy = height * 0.45;

  const cardW = Math.min(width * 0.6, 420);
  const cardH = cardW * 1.4;
  const cardX = cx - cardW / 2;
  const cardY = cy - cardH / 2;
  const cornerR = cardW * 0.06;

  const rng = mulberry32(137);

  const timeline = clamp01(remap(t01, 0, 0.92));
  const exitT = clamp01(remap(t01, 0.92, 1.0));
  const exitFade = 1 - easeOutCubic(exitT);

  const idleT = clamp01(remap(timeline, 0, 0.15));
  const hoverT = clamp01(remap(timeline, 0.15, 0.35));
  const quantumT = clamp01(remap(timeline, 0.35, 0.55));
  const burstT = clamp01(remap(timeline, 0.55, 0.72));
  const reassembleT = clamp01(remap(timeline, 0.72, 0.88));
  const settleT = clamp01(remap(timeline, 0.88, 1.0));

  const hoverAmt = easeInOutCubic(hoverT);
  const quantumAmt = easeInOutCubic(quantumT);
  const burstAmt = easeInCubic(burstT);
  const reassembleAmt = easeOutBack(reassembleT, 1.3);

  const tiltX = Math.sin(t01 * Math.PI * 1.8) * 0.08 * intensity * hoverAmt;
  const tiltY = Math.cos(t01 * Math.PI * 2.2) * 0.05 * intensity * hoverAmt;
  const bobY = Math.sin(t01 * Math.PI * 2.5) * 4 * (1 + hoverAmt);

  const glowIntensity = 0.4 + 0.6 * hoverAmt + 0.8 * quantumAmt
    + 0.3 * Math.sin(t01 * Math.PI * 0.5);

  const reactorPulse = 0.7 + 0.3 * Math.sin(t01 * Math.PI * 2.8);

  const sheetScaleX = 1 + tiltX;
  const sheetScaleY = 1 + tiltY * 0.5;

  const fragmentCount = intensity === 3 ? 24 : intensity === 2 ? 16 : 10;
  const edgeParticleCount = intensity === 3 ? 40 : intensity === 2 ? 25 : 12;
  const gravityParticleCount = intensity >= 2 ? 20 : 10;

  const fragments: Fragment[] = [];
  for (let i = 0; i < fragmentCount; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const fw = cardW / 4;
    const fh = cardH / Math.ceil(fragmentCount / 4);
    const angle = rng() * Math.PI * 2;
    const dist = 80 + rng() * 250 * (intensity / 3);
    fragments.push({
      id: i,
      ox: cardX + col * fw,
      oy: cardY + row * fh,
      ow: fw + 1,
      oh: fh + 1,
      tx: cx + Math.cos(angle) * dist,
      ty: cy + Math.sin(angle) * dist,
      rot: (rng() - 0.5) * Math.PI * 1.5,
      scale: 0.6 + rng() * 0.8,
      phase: rng(),
    });
  }

  const edgeParticles: EdgeParticle[] = [];
  for (let i = 0; i < edgeParticleCount; i++) {
    const side = Math.floor(rng() * 4);
    const t = rng();
    edgeParticles.push({
      x: side === 0 ? cardX + t * cardW : side === 2 ? cardX + t * cardW : side === 1 ? cardX + cardW : cardX,
      y: side === 1 ? cardY + t * cardH : side === 3 ? cardY + t * cardH : side === 0 ? cardY : cardY + cardH,
      vx: (rng() - 0.5) * 2,
      vy: -1 - rng() * 3,
      size: 1.5 + rng() * 3,
      life: rng(),
      maxLife: 0.5 + rng() * 0.8,
      hue: rng(),
    });
  }

  const gravityParticles: GravityParticle[] = [];
  for (let i = 0; i < gravityParticleCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = 30 + rng() * 120;
    gravityParticles.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      baseX: cx + Math.cos(angle) * dist,
      baseY: cy + Math.sin(angle) * dist,
      size: 0.8 + rng() * 1.5,
      phase: rng(),
    });
  }

  ctx.save();
  ctx.globalAlpha = exitFade;

  const bgColor = palette.bg || '#0a0a14';

  const gridDistort = quantumAmt * 0.5 + burstAmt * 0.8;
  ctx.save();
  ctx.globalAlpha = (0.06 + 0.04 * glowIntensity) * exitFade;
  for (let gx = 0; gx < width; gx += 28) {
    for (let gy = 0; gy < height; gy += 28) {
      const dx = gx - cx;
      const dy = gy - cy;
      const distToCard = Math.sqrt(dx * dx + dy * dy);
      const warp = gridDistort * 20 / (distToCard + 1);
      const ax = gx + Math.sin(gy * 0.05 + t01 * 2) * warp;
      const ay = gy + Math.cos(gx * 0.05 + t01 * 1.5) * warp;

      ctx.fillStyle = hexA(palette.accent, 0.3);
      ctx.beginPath();
      ctx.arc(ax, ay, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  const showCard = 1;
  const explodeProgress = burstAmt;
  const reassembleProgress = reassembleAmt;

  const drawCardFace = (x: number, y: number, w: number, h: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha * exitFade;

    const shadowGlow = reactorPulse * (8 + 6 * glowIntensity);
    ctx.shadowColor = hexA(palette.accent, 0.3 * glowIntensity);
    ctx.shadowBlur = shadowGlow;

    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    const edgeGlow = 0.06 + 0.08 * glowIntensity;
    grad.addColorStop(0, hexA(mixHex(bgColor, palette.primary, 0.08), edgeGlow * 2));
    grad.addColorStop(0.3, hexA(mixHex(bgColor, palette.accent, 0.04), edgeGlow));
    grad.addColorStop(0.7, hexA(mixHex(bgColor, palette.secondary, 0.04), edgeGlow));
    grad.addColorStop(1, hexA(mixHex(bgColor, palette.primary, 0.08), edgeGlow * 2));
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, w, h, cornerR);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha * exitFade;
    const borderGrad = ctx.createLinearGradient(x, y, x, y + h);
    borderGrad.addColorStop(0, hexA(palette.accent, 0.2 + 0.3 * glowIntensity));
    borderGrad.addColorStop(0.5, hexA(palette.accent, 0.05));
    borderGrad.addColorStop(1, hexA(palette.accent, 0.2 + 0.3 * glowIntensity));
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, cornerR);
    ctx.stroke();
    ctx.restore();

    const beamCount = intensity >= 2 ? 3 : 2;
    for (let bi = 0; bi < beamCount; bi++) {
      const beamT = (t01 * 0.4 + bi * 0.33) % 1;
      const beamX = x + beamT * w;
      ctx.save();
      ctx.globalAlpha = alpha * 0.12 * glowIntensity * exitFade;
      const beamGrad = ctx.createLinearGradient(beamX - 30, y, beamX + 30, y + h);
      beamGrad.addColorStop(0, hexA(palette.accent, 0));
      beamGrad.addColorStop(0.4, hexA(palette.accent, 0.6));
      beamGrad.addColorStop(1, hexA(palette.accent, 0));
      ctx.fillStyle = beamGrad;
      roundRect(ctx, x, y, w, h, cornerR);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = alpha * (0.15 * reactorPulse) * exitFade;
    ctx.shadowColor = hexA(palette.accent, 0.2);
    ctx.shadowBlur = 15;
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cardW * 0.4);
    coreGrad.addColorStop(0, hexA(palette.accent, 0.2 * glowIntensity));
    coreGrad.addColorStop(0.5, hexA(palette.accent, 0.05 * glowIntensity));
    coreGrad.addColorStop(1, hexA(palette.accent, 0));
    ctx.fillStyle = coreGrad;
    roundRect(ctx, x, y, w, h, cornerR);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha * exitFade;
    ctx.font = `800 ${cardW * 0.07}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = hexA(palette.accent, 0.2);
    ctx.shadowBlur = 6;
    ctx.fillStyle = hexA('#ffffff', 0.85);
    ctx.fillText(label, cx, cy);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha * exitFade;
    ctx.font = `500 ${cardW * 0.025}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = hexA(palette.accent, 0.5);
    ctx.fillText('◈ INTERACTIVE ◈', cx, cy + cardH * 0.15);
    ctx.restore();
  };

  const chromaShift = (hoverAmt * 1.5 + quantumAmt * 2 + burstAmt * 4) * 0.2;

  if (explodeProgress > 0 && explodeProgress < 1 && reassembleProgress < 0.1) {
    const ep = easeOutCubic(explodeProgress);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = exitFade;

    const shockwaveR = ep * Math.max(width, height) * 0.6;
    ctx.save();
    ctx.globalAlpha = (1 - ep) * 0.2 * exitFade;
    ctx.strokeStyle = hexA(palette.accent, 0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, shockwaveR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = (1 - ep) * 0.08 * exitFade;
    ctx.strokeStyle = hexA(palette.primary, 0.3);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, shockwaveR * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    for (const frag of fragments) {
      const fEp = clamp01(remap(ep, frag.phase * 0.2, 1));
      const fx = lerp(frag.ox - cx, frag.tx, easeOutCubic(fEp));
      const fy = lerp(frag.oy - cy, frag.ty, easeOutCubic(fEp));
      const fRot = frag.rot * fEp;
      const fS = frag.scale * (1 - fEp * 0.3);

      ctx.save();
      ctx.translate(cx + fx, cy + fy);
      ctx.rotate(fRot);
      ctx.globalAlpha = (1 - fEp * 0.6) * exitFade;
      ctx.fillStyle = hexA(mixHex(bgColor, palette.accent, 0.06), 0.5);
      ctx.fillRect(-frag.ow / 2, -frag.oh / 2, frag.ow, frag.oh);

      ctx.strokeStyle = hexA(palette.accent, 0.1 * (1 - fEp));
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-frag.ow / 2, -frag.oh / 2, frag.ow, frag.oh);
      ctx.restore();
    }
  } else {
    const cardAlpha = 1 - (1 - reassembleProgress) * 0.05;
    const reassembleScale = reassembleAmt > 0
      ? easeOutBack(reassembleAmt, 1.2)
      : 1;
    const settleSettle = 1 + (1 - settleT) * 0.02;

    ctx.save();
    const totalScale = reassembleScale * settleSettle;
    ctx.translate(cx, cy);
    ctx.scale(sheetScaleX * totalScale, sheetScaleY * totalScale);
    ctx.translate(-cx, -cy + bobY);

    if (chromaShift > 0.01) {
      const cs = chromaShift * 3;
      drawCardFace(cardX - cs, cardY, cardW, cardH, cardAlpha * 0.3);
      ctx.translate(0, 0);
      const orig = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter';
      drawCardFace(cardX + cs * 0.5, cardY - cs * 0.3, cardW, cardH, cardAlpha * 0.15);
      ctx.globalCompositeOperation = orig;
    }

    drawCardFace(cardX, cardY, cardW, cardH, cardAlpha);

    ctx.restore();
  }

  const emitRate = hoverAmt * 0.5 + quantumAmt * 0.8 + burstAmt * 1.2;
  for (const p of edgeParticles) {
    p.life += 0.016;

    if (p.life >= p.maxLife) {
      const side = Math.floor(rng() * 4);
      const t = rng();
      p.x = side === 0 ? cardX + t * cardW : side === 2 ? cardX + t * cardW : side === 1 ? cardX + cardW : cardX;
      p.y = side === 1 ? cardY + t * cardH : side === 3 ? cardY + t * cardH : side === 0 ? cardY : cardY + cardH;
      p.vx = (rng() - 0.5) * (2 + emitRate * 3);
      p.vy = -1 - rng() * (2 + emitRate * 4);
      p.life = 0;
      p.hue = rng();
    }

    p.x += p.vx * (1 + emitRate * 0.5);
    p.y += p.vy * (1 + emitRate * 0.5);
    p.vy += 0.02;

    const pLife = 1 - p.life / p.maxLife;
    const pAlpha = pLife * (0.4 + 0.6 * emitRate);

    ctx.save();
    ctx.globalAlpha = pAlpha * exitFade;
    const pColor = mixHex(palette.accent, palette.primary, p.hue);
    ctx.fillStyle = hexA(pColor, 0.7);
    ctx.shadowColor = hexA(pColor, 0.4);
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.5 + pLife * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const gravityStrength = (hoverAmt * 0.3 + quantumAmt * 0.6 + burstAmt * 0.9);
  for (const gp of gravityParticles) {
    const dx = cx - gp.baseX;
    const dy = cy - gp.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy) + 1;
    const pull = gravityStrength * 30 / (dist * 0.5);

    gp.x = gp.baseX + Math.cos(t01 * 0.5 + gp.phase) * pull;
    gp.y = gp.baseY + Math.sin(t01 * 0.7 + gp.phase * 1.3) * pull;

    ctx.save();
    ctx.globalAlpha = (0.2 + 0.3 * gravityStrength) * exitFade;
    ctx.fillStyle = hexA(palette.accent, 0.4);
    ctx.beginPath();
    ctx.arc(gp.x, gp.y, gp.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (intensity >= 2) {
    const noiseCount = 120;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    for (let i = 0; i < noiseCount; i++) {
      const rx = (i * 137.5 + t01 * 5000) % width;
      const ry = (i * 97.3 + t01 * 3000) % height;
      const nAlpha = 0.015 + 0.01 * Math.sin(t01 * 3 + i);
      ctx.fillStyle = `rgba(255,255,255,${nAlpha})`;
      ctx.fillRect(rx, ry, 1.5, 1.5);
    }
    ctx.restore();
  }

  ctx.restore();
};
