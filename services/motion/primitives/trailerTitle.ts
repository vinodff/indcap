import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, remap, lerp, easeOutBack, easeInCubic, easeOutCubic, easeInOutCubic } from '../easing';

function frand(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  const v = s - Math.floor(s);
  return v < 0 ? v + 1 : v;
}

const drawAnamorphicFlare = (
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  progress: number,
  alpha: number,
  globalAlpha: number,
): void => {
  if (alpha < 0.005) return;
  const xPos = lerp(-W * 0.05, W * 1.05, easeInOutCubic(progress));
  const CY = H / 2;

  ctx.save();
  ctx.globalAlpha = alpha * globalAlpha;

  // Wide diffuse streak (anamorphic blue tint)
  for (let i = 0; i < 4; i++) {
    const hh = [12, 6, 2.5, 1][i];
    const baseAlpha = [0.08, 0.18, 0.45, 0.85][i];
    const streak = ctx.createLinearGradient(xPos - W * 0.6, CY, xPos + W * 0.6, CY);
    streak.addColorStop(0,   'rgba(100,160,255,0)');
    streak.addColorStop(0.25, `rgba(140,190,255,${baseAlpha * 0.25})`);
    streak.addColorStop(0.5,  `rgba(200,230,255,${baseAlpha})`);
    streak.addColorStop(0.75, `rgba(140,190,255,${baseAlpha * 0.25})`);
    streak.addColorStop(1,   'rgba(100,160,255,0)');
    ctx.fillStyle = streak;
    ctx.fillRect(0, CY - hh, W, hh * 2);
  }

  // Chromatic split streaks (film optic artifact)
  ctx.globalAlpha = alpha * globalAlpha * 0.3;
  const split = H * 0.008;
  for (const [cy2, r, g, b] of [[CY - split, 255, 60, 60], [CY + split, 60, 100, 255]] as const) {
    const sg = ctx.createLinearGradient(xPos - W * 0.45, cy2, xPos + W * 0.45, cy2);
    sg.addColorStop(0, `rgba(${r},${g},${b},0)`);
    sg.addColorStop(0.5, `rgba(${r},${g},${b},0.45)`);
    sg.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = sg;
    ctx.fillRect(0, cy2 - 0.8, W, 1.6);
  }

  // Core bright point
  ctx.globalAlpha = alpha * globalAlpha;
  const coreR = W * 0.09;
  const core = ctx.createRadialGradient(xPos, CY, 0, xPos, CY, coreR);
  core.addColorStop(0, 'rgba(255,255,255,0.95)');
  core.addColorStop(0.08, 'rgba(220,235,255,0.70)');
  core.addColorStop(0.35, 'rgba(160,200,255,0.18)');
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.fillRect(xPos - coreR, CY - coreR, coreR * 2, coreR * 2);

  ctx.restore();
};

export const trailerTitle = (
  { ctx, width: W, height: H, t01 }: PrimitiveContext,
  params: PrimitiveParams,
): void => {
  const rawText = (params.text || 'EPIC TITLE').toUpperCase();
  const words = rawText.split(/\s+/).filter(Boolean).slice(0, 4);
  const wordCount = words.length;

  const fadeIn  = easeOutCubic(clamp01(remap(t01, 0.00, 0.06)));
  const fadeOut = 1 - easeInCubic(clamp01(remap(t01, 0.88, 1.00)));
  const globalAlpha = fadeIn * fadeOut;
  if (globalAlpha < 0.005) return;

  const CX = W / 2;
  const CY = H / 2;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── 1. Background ────────────────────────────────────────────────────────
  ctx.fillStyle = '#040408';
  ctx.fillRect(0, 0, W, H);

  // Deep purple-tinted center glow
  const bgGlow = ctx.createRadialGradient(CX, CY * 0.85, 0, CX, CY * 0.85, Math.max(W, H) * 0.7);
  bgGlow.addColorStop(0, 'rgba(55,15,100,0.22)');
  bgGlow.addColorStop(0.5, 'rgba(20,8,45,0.10)');
  bgGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bgGlow;
  ctx.fillRect(0, 0, W, H);

  // ── 2. Bokeh particles ────────────────────────────────────────────────────
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const seed = i * 19 + 5;
    const px = frand(seed) * W;
    const py = frand(seed + 1) * H;
    const pr = 0.8 + frand(seed + 2) * 3.5;
    const drift = Math.sin(t01 * Math.PI * (0.3 + frand(seed + 3) * 0.6) + frand(seed + 4) * 6) * 10;
    const twinkle = 0.25 + 0.75 * Math.abs(Math.sin(t01 * Math.PI * 1.3 + i * 0.9));
    const pa = frand(seed + 5) * 0.11 * twinkle;
    if (pa < 0.004) continue;

    const bg = ctx.createRadialGradient(px + drift, py, 0, px + drift, py, pr);
    bg.addColorStop(0, `rgba(220,210,255,${pa})`);
    bg.addColorStop(0.5, `rgba(180,160,255,${pa * 0.4})`);
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(px + drift, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── 3. Lens flare — reveal ───────────────────────────────────────────────
  const flare1T = clamp01(remap(t01, 0.07, 0.22));
  drawAnamorphicFlare(ctx, W, H, flare1T, Math.sin(flare1T * Math.PI) * 0.9, globalAlpha);

  // ── 4. Word slams ─────────────────────────────────────────────────────────
  const fontSize = wordCount <= 1
    ? Math.min(W * 0.155, H * 0.18)
    : wordCount === 2
    ? Math.min(W * 0.125, H * 0.15)
    : wordCount === 3
    ? Math.min(W * 0.10, H * 0.125)
    : Math.min(W * 0.085, H * 0.105);

  const lineH   = fontSize * 1.3;
  const totalH  = wordCount * lineH;
  const baseY   = CY - totalH / 2 + lineH * 0.5;

  const FONT = `900 ${fontSize}px 'Segoe UI Black', 'Arial Black', 'Impact', sans-serif`;
  ctx.font = FONT;

  const wordInterval = Math.min(0.13, (0.60 - 0.14) / Math.max(wordCount, 1));

  for (let wi = 0; wi < wordCount; wi++) {
    const wStart = 0.14 + wi * wordInterval;
    const wEnd   = wStart + 0.12;
    const wt     = clamp01(remap(t01, wStart, wEnd));
    const outT   = clamp01(remap(t01, 0.88, 1.0));
    if (wt < 0.001) continue;

    const slam      = easeOutBack(wt, 2.5);
    const wordAlpha = easeOutCubic(wt) * (1 - easeInCubic(outT));
    const wy        = baseY + wi * lineH;

    // Impact flash (bright ring burst on word land)
    const impactPhase = clamp01((wt - 0.38) * 5);
    const flashA = Math.sin(impactPhase * Math.PI) * 0.35;
    if (flashA > 0.005) {
      ctx.save();
      ctx.globalAlpha = flashA * globalAlpha;
      const flashR = W * 0.45;
      const flash = ctx.createRadialGradient(CX, wy, 0, CX, wy, flashR);
      flash.addColorStop(0, 'rgba(255,255,255,0.25)');
      flash.addColorStop(0.2, 'rgba(200,180,255,0.08)');
      flash.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = flash;
      ctx.fillRect(CX - flashR, wy - flashR * 0.5, flashR * 2, flashR);
      ctx.restore();
    }

    // Horizontal shockwave ellipse ring
    const ringT = clamp01(remap(t01, wStart + 0.05, wStart + 0.22));
    if (ringT > 0.01 && ringT < 0.99) {
      ctx.save();
      const ringRx = W * 0.38 * easeOutCubic(ringT);
      const ringRy = ringRx * 0.12;
      const ringA  = (1 - ringT) * 0.3 * globalAlpha;
      ctx.strokeStyle = `rgba(210,200,255,${ringA})`;
      ctx.lineWidth = 2 * (1 - ringT);
      ctx.beginPath();
      ctx.ellipse(CX, wy, ringRx, ringRy, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Chromatic aberration — large on slam, zero by settle
    const aberr = (1 - slam) * W * 0.009;
    if (aberr > 0.8) {
      ctx.save();
      ctx.globalAlpha = wordAlpha * globalAlpha * 0.45;
      ctx.font = FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,50,90,0.65)';
      ctx.fillText(words[wi], CX - aberr, wy);
      ctx.fillStyle = 'rgba(50,100,255,0.65)';
      ctx.fillText(words[wi], CX + aberr, wy);
      ctx.restore();
    }

    // Main word
    ctx.save();
    const scale   = lerp(1.38, 1.0, slam);
    const ySquish = lerp(0.85, 1.0, slam); // vertical squeeze on slam
    const holdGlow = 0.4 + 0.6 * Math.abs(Math.sin(
      clamp01(remap(t01, wEnd, 0.85)) * Math.PI * 1.6 + wi * 1.4,
    ));

    ctx.translate(CX, wy);
    ctx.scale(scale, scale * ySquish);
    ctx.globalAlpha = wordAlpha * globalAlpha;
    ctx.font = FONT;
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = `rgba(180,150,255,${holdGlow * 0.5 * wordAlpha})`;
    ctx.shadowBlur  = fontSize * (0.2 + holdGlow * 0.12);

    // Gradient fill: pure white top → faint violet bottom
    const tg = ctx.createLinearGradient(0, -fontSize * 0.5, 0, fontSize * 0.5);
    tg.addColorStop(0,   '#ffffff');
    tg.addColorStop(0.45, '#f4f4ff');
    tg.addColorStop(1,   'rgba(215,205,255,0.88)');
    ctx.fillStyle = tg;
    ctx.fillText(words[wi], 0, 0);

    // Second pass — bright core on early slam
    if (slam < 0.7) {
      ctx.globalAlpha = wordAlpha * globalAlpha * (1 - slam / 0.7) * 0.3;
      ctx.shadowBlur  = 0;
      ctx.fillStyle   = '#ffffff';
      ctx.fillText(words[wi], 0, 0);
    }
    ctx.restore();

    // Accent lines extending outward once word lands
    if (slam > 0.72) {
      ctx.save();
      const settleAmt = (slam - 0.72) / 0.28;
      ctx.font = FONT;
      const tw = ctx.measureText(words[wi]).width * scale;
      const lineExt = W * 0.12 * settleAmt;
      const lineAlpha = settleAmt * wordAlpha * 0.35 * globalAlpha;

      for (const [dir, startX] of [[-1, CX - tw / 2], [1, CX + tw / 2]] as const) {
        const lg = ctx.createLinearGradient(startX, wy, startX + dir * lineExt, wy);
        lg.addColorStop(0, `rgba(200,185,255,${lineAlpha * 0.8})`);
        lg.addColorStop(0.6, `rgba(180,160,255,${lineAlpha * 0.4})`);
        lg.addColorStop(1, 'rgba(160,140,255,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(
          dir === -1 ? startX - lineExt : startX,
          wy - 1.2,
          lineExt,
          1.5,
        );
      }
      ctx.restore();
    }
  }

  // ── 5. Lens flare — exit ─────────────────────────────────────────────────
  const flare2T = clamp01(remap(t01, 0.83, 0.96));
  drawAnamorphicFlare(ctx, W, H, flare2T, Math.sin(flare2T * Math.PI) * 0.75, globalAlpha);

  // ── 6. Letterbox bars (cinematic 2.39:1 crop feel) ───────────────────────
  const barH = H * 0.055;
  const barAlpha = easeOutCubic(clamp01(remap(t01, 0, 0.12)));
  ctx.save();
  ctx.globalAlpha = barAlpha * globalAlpha * 0.92;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, barH);
  ctx.fillRect(0, H - barH, W, barH);
  ctx.restore();

  // ── 7. Vignette ──────────────────────────────────────────────────────────
  const vig = ctx.createRadialGradient(CX, CY, Math.min(W, H) * 0.2, CX, CY, Math.max(W, H) * 0.68);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.55, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  ctx.restore();
};
