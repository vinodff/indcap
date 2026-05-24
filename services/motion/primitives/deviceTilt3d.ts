/**
 * device-tilt-3d — 3D Device Tilt / Perspective Frame.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 *
 * Renders a physically accurate 3D device mockup (phone, browser, tablet)
 * projected onto the 2D canvas using the existing math3d.ts pipeline.
 *
 * Ultra-premium upgrades:
 *   — Profile block with avatar, verified badge, follower count
 *   — Neon bezier analytics chart that draws itself progressively
 *   — Circular donut metric with animated progress + glow
 *   — Dynamic specular glass sweep that travels across screen on tilt
 *   — 3D floating parallax chips at z-depth +0.38 for real depth separation
 *
 * params.icon selects device type: "phone" (default), "browser", "tablet"
 * params.text is shown on the screen as an app title / headline
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import {
  v3, v3RotateY, lookAtMatrix, perspectiveMatrix, projectPoint,
  type Vec3, type ScreenPoint,
} from '../math3d';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';
import { fitSingleLine } from '../safeArea';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;

// ── Project a world-space Vec3 given Y-rotation + camera ─────────────────────
function project(
  pt: Vec3,
  rotY: number,
  viewMat: ReturnType<typeof lookAtMatrix>,
  projMat: ReturnType<typeof perspectiveMatrix>,
  sw: number,
  sh: number,
): ScreenPoint | null {
  const rotated = v3RotateY(pt, rotY);
  return projectPoint(rotated, viewMat, projMat, sw, sh);
}

// ── Draw a filled quad from 4 projected points (painter's order) ──────────────
function fillQuad(
  ctx: CanvasRenderingContext2D,
  a: ScreenPoint, b: ScreenPoint, c: ScreenPoint, d: ScreenPoint,
  fillStyle: string | CanvasGradient,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

// ── Stroke a quad outline ─────────────────────────────────────────────────────
function strokeQuad(
  ctx: CanvasRenderingContext2D,
  a: ScreenPoint, b: ScreenPoint, c: ScreenPoint, d: ScreenPoint,
  color: string, lw: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.restore();
}

// ── Clip into a quad then execute a draw callback ─────────────────────────────
function clipQuad(
  ctx: CanvasRenderingContext2D,
  a: ScreenPoint, b: ScreenPoint, c: ScreenPoint, d: ScreenPoint,
  draw: () => void,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.clip();
  draw();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
export const deviceTilt3d = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;
  const deviceType = (p.icon ?? 'phone') as 'phone' | 'browser' | 'tablet';
  const label = p.text || 'Your App';

  // ── Global fade envelope ──────────────────────────────────────────────────
  const fadeIn  = easeInOutCubic(clamp01(remap(t01, 0.0, 0.12)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // ── Device geometry dimensions ───────────────────────────────────────────
  const deviceDims: Record<string, { hw: number; hh: number; depth: number; notch: boolean }> = {
    phone:   { hw: 0.55, hh: 1.20, depth: 0.055, notch: true  },
    browser: { hw: 1.20, hh: 0.75, depth: 0.040, notch: false },
    tablet:  { hw: 0.90, hh: 1.10, depth: 0.045, notch: false },
  };
  const dims = deviceDims[deviceType] ?? deviceDims.phone;
  const { hw, hh, depth } = dims;

  // ── Y-rotation animation ──────────────────────────────────────────────────
  const entryProgress = clamp01(remap(t01, 0.05, 0.55));
  const springY = easeOutBack(entryProgress, 1.3);
  const startAngleY = -Math.PI * 0.28;
  const entryAngleY = lerp(startAngleY, 0, springY);

  const holdProgress = clamp01(remap(t01, 0.55, 1.0));
  const bobAngleY = Math.sin(holdProgress * Math.PI * 3.0) * 0.06 * intensity;
  const bobOffsetY = Math.sin(holdProgress * Math.PI * 2.5) * 0.04;

  const rotY = entryProgress < 1 ? entryAngleY : bobAngleY;
  const rotX = -0.08;

  // ── Camera setup ──────────────────────────────────────────────────────────
  const camDist = 3.8;
  const eye: Vec3 = { x: 0, y: 0.15 + bobOffsetY, z: camDist };
  const target: Vec3 = { x: 0, y: 0, z: 0 };
  const upVec: Vec3 = { x: 0, y: 1, z: 0 };
  const fovRad = (55 * Math.PI) / 180;
  const aspect = width / height;
  const viewMat = lookAtMatrix(eye, target, upVec);
  const projMat = perspectiveMatrix(fovRad, aspect, 0.1, 100);

  // ── Device box corners ───────────────────────────────────────────────────
  const applyRotX = (pt: Vec3): Vec3 => {
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    return v3(pt.x, pt.y * cosX - pt.z * sinX, pt.y * sinX + pt.z * cosX);
  };

  const corners = {
    ftl: applyRotX(v3(-hw,  hh,  depth)),
    ftr: applyRotX(v3( hw,  hh,  depth)),
    fbr: applyRotX(v3( hw, -hh,  depth)),
    fbl: applyRotX(v3(-hw, -hh,  depth)),
    btl: applyRotX(v3(-hw,  hh, -depth)),
    btr: applyRotX(v3( hw,  hh, -depth)),
    bbr: applyRotX(v3( hw, -hh, -depth)),
    bbl: applyRotX(v3(-hw, -hh, -depth)),
  };

  const proj = (pt: Vec3) => project(pt, rotY, viewMat, projMat, width, height);

  const p_ftl = proj(corners.ftl);
  const p_ftr = proj(corners.ftr);
  const p_fbr = proj(corners.fbr);
  const p_fbl = proj(corners.fbl);
  const p_btl = proj(corners.btl);
  const p_btr = proj(corners.btr);
  const p_bbr = proj(corners.bbr);
  const p_bbl = proj(corners.bbl);

  if (!p_ftl || !p_ftr || !p_fbr || !p_fbl) return;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── 1. Ambient glow bloom ─────────────────────────────────────────────────
  {
    const cxS = (p_ftl.x + p_fbr.x) / 2;
    const cyS = (p_ftl.y + p_fbr.y) / 2;
    const bloomR = Math.hypot(p_ftr.x - p_fbl.x, p_ftr.y - p_fbl.y) * 0.65;
    const glow = ctx.createRadialGradient(cxS, cyS, 0, cxS, cyS, bloomR);
    glow.addColorStop(0, hexA(palette.primary, 0.18 * intensity));
    glow.addColorStop(0.5, hexA(palette.accent, 0.08 * intensity));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  // ── 2. Side faces ─────────────────────────────────────────────────────────
  const showRight = rotY < -0.01 && p_btr && p_bbr;
  const showLeft  = rotY > 0.01  && p_btl && p_bbl;
  const showTop   = p_btl && p_btr;

  const bezelColor = '#1a1a1f';
  const sideShadeR = mixHex(bezelColor, palette.primary, 0.15);
  const sideShadeL = mixHex(bezelColor, '#000000', 0.5);

  if (showRight && p_btr && p_bbr) {
    const sideGrad = ctx.createLinearGradient(p_ftr!.x, p_ftr!.y, p_btr.x, p_btr.y);
    sideGrad.addColorStop(0, hexA(sideShadeR, 0.95));
    sideGrad.addColorStop(1, hexA('#000000', 0.9));
    fillQuad(ctx, p_ftr!, p_btr, p_bbr, p_fbr!, sideGrad);
    strokeQuad(ctx, p_ftr!, p_btr, p_bbr, p_fbr!, hexA('#ffffff', 0.06), 0.8);
  }
  if (showLeft && p_btl && p_bbl) {
    fillQuad(ctx, p_btl, p_ftl!, p_fbl!, p_bbl, hexA(sideShadeL, 0.95));
  }
  if (showTop && p_btl && p_btr) {
    const topGrad = ctx.createLinearGradient(p_ftl!.x, p_ftl!.y, p_btl.x, p_btl.y);
    topGrad.addColorStop(0, hexA('#3a3a45', 0.95));
    topGrad.addColorStop(1, hexA('#111115', 0.9));
    fillQuad(ctx, p_ftl!, p_ftr!, p_btr, p_btl, topGrad);
  }

  // ── 3. Bezel front face ───────────────────────────────────────────────────
  const bezelGrad = ctx.createLinearGradient(p_ftl!.x, p_ftl!.y, p_fbr!.x, p_fbr!.y);
  bezelGrad.addColorStop(0, '#2a2a30');
  bezelGrad.addColorStop(1, '#111115');
  fillQuad(ctx, p_ftl!, p_ftr!, p_fbr!, p_fbl!, bezelGrad);

  // ── 4. Screen area ────────────────────────────────────────────────────────
  const bezelW = 0.055;
  const bezelT = deviceType === 'phone' ? bezelW * 1.8 : bezelW;

  const screenCorners = {
    tl: applyRotX(v3(-hw + bezelW,  hh - bezelT,  depth + 0.002)),
    tr: applyRotX(v3( hw - bezelW,  hh - bezelT,  depth + 0.002)),
    br: applyRotX(v3( hw - bezelW, -hh + bezelW,  depth + 0.002)),
    bl: applyRotX(v3(-hw + bezelW, -hh + bezelW,  depth + 0.002)),
  };

  const s_tl = proj(screenCorners.tl);
  const s_tr = proj(screenCorners.tr);
  const s_br = proj(screenCorners.br);
  const s_bl = proj(screenCorners.bl);

  if (s_tl && s_tr && s_br && s_bl) {
    // Screen background gradient
    const screenGrad = ctx.createLinearGradient(s_tl.x, s_tl.y, s_br.x, s_br.y);
    screenGrad.addColorStop(0, mixHex(palette.bg || '#0f0f1a', palette.primary, 0.18));
    screenGrad.addColorStop(0.5, palette.bg || '#0f0f1a');
    screenGrad.addColorStop(1, mixHex(palette.bg || '#0f0f1a', palette.secondary, 0.12));
    fillQuad(ctx, s_tl, s_tr, s_br, s_bl, screenGrad);

    // ── Screen UI content ─────────────────────────────────────────────────
    clipQuad(ctx, s_tl, s_tr, s_br, s_bl, () => {
      const sMinX = Math.min(s_tl.x, s_bl.x);
      const sMaxX = Math.max(s_tr.x, s_br.x);
      const sMinY = Math.min(s_tl.y, s_tr.y);
      const sMaxY = Math.max(s_bl.y, s_br.y);
      const sW = sMaxX - sMinX;
      const sH = sMaxY - sMinY;
      const sCx = (sMinX + sMaxX) / 2;

      const contentReveal = easeOutCubic(clamp01(remap(t01, 0.35, 0.65)));

      // Vertical offset for system chrome (status bar / browser bar)
      const sbOffset = deviceType === 'phone' ? sH * 0.055 : (deviceType === 'browser' ? sH * 0.11 : 0);

      // ── Status bar (phone) ─────────────────────────────────────────────
      if (deviceType === 'phone') {
        const sbH = sH * 0.05;
        ctx.fillStyle = hexA('#000000', 0.3);
        ctx.fillRect(sMinX, sMinY, sW, sbH);

        ctx.font = `500 ${sbH * 0.55}px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('9:41', sMinX + sW * 0.06, sMinY + sbH / 2);

        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(sMaxX - sW * 0.12 + i * sbH * 0.5, sMinY + sbH / 2, sbH * 0.15, 0, Math.PI * 2);
          ctx.fillStyle = i < 3 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)';
          ctx.fill();
        }
      }

      // ── Browser tab bar ────────────────────────────────────────────────
      if (deviceType === 'browser') {
        const tbH = sH * 0.10;
        ctx.fillStyle = hexA('#1e1e2e', 0.95);
        ctx.fillRect(sMinX, sMinY, sW, tbH);

        const urlBarW = sW * 0.6;
        const urlBarH = tbH * 0.55;
        const urlBarX = sCx - urlBarW / 2;
        const urlBarY = sMinY + (tbH - urlBarH) / 2;
        roundRect(ctx, urlBarX, urlBarY, urlBarW, urlBarH, urlBarH / 2);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fill();
        ctx.font = `400 ${urlBarH * 0.5}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('createrin.app', sCx, urlBarY + urlBarH / 2);
      }

      // ── Profile block ──────────────────────────────────────────────────
      {
        const profReveal = easeOutCubic(clamp01(remap(t01, 0.28, 0.48)));
        const profY = sMinY + sbOffset + sH * 0.075;
        const avatarR = sH * 0.038;

        ctx.save();
        ctx.globalAlpha = profReveal;

        // Gradient avatar circle
        ctx.beginPath();
        ctx.arc(sMinX + sW * 0.13, profY, avatarR, 0, Math.PI * 2);
        const avatarGrad = ctx.createRadialGradient(
          sMinX + sW * 0.13 - avatarR * 0.3, profY - avatarR * 0.3, 0,
          sMinX + sW * 0.13, profY, avatarR,
        );
        avatarGrad.addColorStop(0, hexA(palette.accent, 0.9));
        avatarGrad.addColorStop(1, hexA(palette.primary, 0.7));
        ctx.fillStyle = avatarGrad;
        ctx.fill();
        ctx.strokeStyle = hexA(palette.accent, 0.5);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Avatar initials
        ctx.font = `700 ${avatarR * 0.75}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('AY', sMinX + sW * 0.13, profY);

        // Display name
        const nameX = sMinX + sW * 0.24;
        ctx.font = `600 ${avatarR * 1.05}px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        const dispName = label.length > 14 ? label.slice(0, 14) : label;
        ctx.fillText(dispName, nameX, profY - avatarR * 0.32);

        // Verified badge
        const badgeR = avatarR * 0.55;
        const badgeX = nameX + ctx.measureText(dispName).width + badgeR * 1.5;
        ctx.beginPath();
        ctx.arc(badgeX, profY - avatarR * 0.32, badgeR, 0, Math.PI * 2);
        ctx.fillStyle = hexA(palette.accent, 0.9);
        ctx.shadowColor = hexA(palette.accent, 0.5);
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = `700 ${badgeR}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('✓', badgeX, profY - avatarR * 0.32);

        // Follower subtitle
        ctx.font = `400 ${avatarR * 0.78}px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillStyle = hexA('#ffffff', 0.45);
        ctx.fillText('@creator • 2.4k followers', nameX, profY + avatarR * 0.6);

        ctx.restore();
      }

      // ── App headline ───────────────────────────────────────────────────
      const headlineY = sMinY + sbOffset + sH * 0.205;
      const maxW = sW * 0.82;
      const desiredPx = sH * 0.082;
      const fontPx = fitSingleLine(ctx, label, px => `700 ${px}px ${FONT}`, maxW, desiredPx, 8);
      ctx.font = `700 ${fontPx}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = contentReveal;

      const hGrad = ctx.createLinearGradient(sCx - maxW / 2, headlineY, sCx + maxW / 2, headlineY);
      hGrad.addColorStop(0, '#ffffff');
      hGrad.addColorStop(0.5, hexA(palette.accent, 0.95));
      hGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = hGrad;
      ctx.shadowColor = hexA(palette.accent, 0.5);
      ctx.shadowBlur = 15;
      ctx.fillText(label, sCx, headlineY);
      ctx.shadowBlur = 0;

      // ── Neon analytics line chart ──────────────────────────────────────
      {
        const chartX = sMinX + sW * 0.05;
        const chartY = headlineY + fontPx * 1.35;
        const chartW = sW * 0.90;
        const chartH = sH * 0.195;
        const chartReveal = easeOutCubic(clamp01(remap(t01, 0.42, 0.66)));

        // Normalized [x, y] data points
        const pts = [0.0, 0.78, 0.12, 0.55, 0.25, 0.68, 0.38, 0.35,
                     0.52, 0.50, 0.65, 0.22, 0.80, 0.38, 1.0, 0.15];
        const toX = (nx: number) => chartX + nx * chartW;
        const toY = (ny: number) => chartY + chartH * 0.90 - ny * chartH * 0.80;

        ctx.save();
        ctx.globalAlpha = chartReveal;

        // Chart area background
        roundRect(ctx, chartX, chartY, chartW, chartH, 6);
        ctx.fillStyle = hexA('#ffffff', 0.03);
        ctx.fill();

        // Subtle grid lines
        ctx.strokeStyle = hexA('#ffffff', 0.05);
        ctx.lineWidth = 0.5;
        for (let g = 1; g < 4; g++) {
          const gy = chartY + (chartH / 4) * g;
          ctx.beginPath();
          ctx.moveTo(chartX, gy);
          ctx.lineTo(chartX + chartW, gy);
          ctx.stroke();
        }

        // Progressive reveal clip — chart "draws itself" from left to right
        ctx.save();
        ctx.beginPath();
        ctx.rect(chartX - 2, chartY - 4, chartW * chartReveal + 4, chartH + 8);
        ctx.clip();

        // Area fill under curve
        ctx.beginPath();
        ctx.moveTo(toX(pts[0]), toY(pts[1]));
        for (let i = 0; i < pts.length - 2; i += 2) {
          const cpX = (toX(pts[i]) + toX(pts[i + 2])) / 2;
          const cpY = (toY(pts[i + 1]) + toY(pts[i + 3])) / 2;
          ctx.quadraticCurveTo(toX(pts[i]), toY(pts[i + 1]), cpX, cpY);
        }
        ctx.lineTo(toX(pts[pts.length - 2]), toY(pts[pts.length - 1]));
        ctx.lineTo(toX(pts[pts.length - 2]), chartY + chartH);
        ctx.lineTo(toX(pts[0]), chartY + chartH);
        ctx.closePath();
        const areaGrad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
        areaGrad.addColorStop(0, hexA(palette.accent, 0.20));
        areaGrad.addColorStop(1, hexA(palette.accent, 0.01));
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // Neon line with glow
        ctx.beginPath();
        ctx.moveTo(toX(pts[0]), toY(pts[1]));
        for (let i = 0; i < pts.length - 2; i += 2) {
          const cpX = (toX(pts[i]) + toX(pts[i + 2])) / 2;
          const cpY = (toY(pts[i + 1]) + toY(pts[i + 3])) / 2;
          ctx.quadraticCurveTo(toX(pts[i]), toY(pts[i + 1]), cpX, cpY);
        }
        ctx.lineTo(toX(pts[pts.length - 2]), toY(pts[pts.length - 1]));
        ctx.shadowColor = hexA(palette.accent, 0.9);
        ctx.shadowBlur = 10;
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Glowing dot at line tip
        const tipX = toX(pts[pts.length - 2]);
        const tipY = toY(pts[pts.length - 1]);
        ctx.beginPath();
        ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
        ctx.fillStyle = palette.accent;
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore(); // progressive clip
        ctx.restore(); // chartReveal alpha
      }

      // ── Circular donut metric + stats chips ───────────────────────────
      {
        const metricTop = headlineY + fontPx * 1.35 + sH * 0.215;
        const donutReveal = easeOutCubic(clamp01(remap(t01, 0.54, 0.76)));
        const donutCx = sMinX + sW * 0.24;
        const donutCy = metricTop + sH * 0.085;
        const donutR  = Math.min(sW, sH) * 0.079;
        const arcEnd  = -Math.PI / 2 + donutReveal * 0.85 * Math.PI * 2;

        ctx.save();
        ctx.globalAlpha = donutReveal;

        // Background ring
        ctx.beginPath();
        ctx.arc(donutCx, donutCy, donutR, 0, Math.PI * 2);
        ctx.strokeStyle = hexA('#ffffff', 0.08);
        ctx.lineWidth = donutR * 0.24;
        ctx.stroke();

        // Glowing progress arc
        ctx.beginPath();
        ctx.arc(donutCx, donutCy, donutR, -Math.PI / 2, arcEnd);
        ctx.strokeStyle = palette.accent;
        ctx.shadowColor = hexA(palette.accent, 0.7);
        ctx.shadowBlur = 12;
        ctx.lineWidth = donutR * 0.24;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Center percentage text
        const pct = Math.round(donutReveal * 85);
        ctx.font = `700 ${donutR * 0.52}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${pct}%`, donutCx, donutCy);

        ctx.font = `500 ${donutR * 0.36}px ${FONT}`;
        ctx.fillStyle = hexA('#ffffff', 0.45);
        ctx.fillText('Growth', donutCx, donutCy + donutR * 1.42);

        ctx.restore();

        // Metric stat chips to the right of the donut
        const statsReveal = easeOutCubic(clamp01(remap(t01, 0.60, 0.80)));
        const statsX = sMinX + sW * 0.50;
        const chipFontPx = sH * 0.028;
        const chipH = chipFontPx * 1.7;
        const chipW = sW * 0.41;
        const stats = [
          { label: '▲ 12.4k', sub: 'Views',  color: palette.accent },
          { label: '❤ 3.2k',  sub: 'Likes',  color: '#f97316'      },
        ];
        stats.forEach((s, si) => {
          const indivReveal = clamp01((statsReveal - si * 0.25) / 0.75);
          const sy = metricTop + si * (chipH + sH * 0.025);
          ctx.save();
          ctx.globalAlpha = easeOutCubic(indivReveal);

          roundRect(ctx, statsX, sy, chipW, chipH, chipH * 0.3);
          ctx.fillStyle = hexA('#ffffff', 0.05);
          ctx.fill();
          roundRect(ctx, statsX, sy, chipW, chipH, chipH * 0.3);
          ctx.strokeStyle = hexA(s.color, 0.3);
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.font = `700 ${chipFontPx * 0.88}px ${FONT}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = s.color;
          ctx.fillText(s.label, statsX + chipH * 0.4, sy + chipH / 2);

          ctx.font = `400 ${chipFontPx * 0.70}px ${FONT}`;
          ctx.fillStyle = hexA('#ffffff', 0.38);
          ctx.textAlign = 'right';
          ctx.fillText(s.sub, statsX + chipW - chipH * 0.3, sy + chipH / 2);

          ctx.restore();
        });
      }

      // ── Bottom nav / home indicator (phone) ───────────────────────────
      if (deviceType === 'phone') {
        const navH = sH * 0.06;
        ctx.save();
        ctx.globalAlpha = contentReveal * 0.5;
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(sMinX, sMaxY - navH, sW, navH);

        const pillW = sW * 0.28;
        const pillH = navH * 0.25;
        roundRect(ctx, sCx - pillW / 2, sMaxY - navH / 2 - pillH / 2, pillW, pillH, pillH / 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fill();
        ctx.restore();
      }

      ctx.globalAlpha = 1;
    }); // end screen clipQuad

    // ── Dynamic specular glass sweep ──────────────────────────────────────
    // Glare travels left→right as device springs face-forward, then gently
    // oscillates in the hold phase — physically tied to Y-rotation angle.
    clipQuad(ctx, s_tl, s_tr, s_br, s_bl, () => {
      const sMinX2 = Math.min(s_tl.x, s_bl.x);
      const sMaxX2 = Math.max(s_tr.x, s_br.x);
      const sMinY2 = Math.min(s_tl.y, s_tr.y);
      const sH2    = Math.max(s_bl.y, s_br.y) - sMinY2;
      const sW2    = sMaxX2 - sMinX2;

      const sweepBase = easeOutCubic(entryProgress);
      const sweepOsc  = Math.sin(holdProgress * Math.PI * 4.2) * 0.055;
      const sweepPos  = lerp(0.06, 0.80, sweepBase) + sweepOsc;
      const sweepX2   = sMinX2 + sW2 * sweepPos;
      const sweepW2   = sW2 * 0.14;

      ctx.save();
      ctx.translate(sweepX2, sMinY2 + sH2 * 0.5);
      ctx.rotate(-0.44);
      const sg = ctx.createLinearGradient(-sweepW2, 0, sweepW2, 0);
      sg.addColorStop(0,   'rgba(255,255,255,0)');
      sg.addColorStop(0.5, 'rgba(255,255,255,0.18)');
      sg.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(-sweepW2, -sH2 * 0.8, sweepW2 * 2, sH2 * 1.6);
      ctx.restore();
    });
  }

  // ── 5. Bezel edge highlight ───────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = hexA('#ffffff', 0.3);
  ctx.shadowBlur = 6;
  ctx.strokeStyle = hexA('#ffffff', 0.12);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p_ftl!.x, p_ftl!.y);
  ctx.lineTo(p_ftr!.x, p_ftr!.y);
  ctx.stroke();
  ctx.restore();

  strokeQuad(ctx, p_ftl!, p_ftr!, p_fbr!, p_fbl!, hexA('#ffffff', 0.08), 1);

  // ── 6. Notch (phone) ─────────────────────────────────────────────────────
  if (dims.notch && p_ftl && p_ftr) {
    const notchW = (p_ftr.x - p_ftl.x) * 0.22;
    const notchH = (p_fbr!.y - p_ftl.y) * 0.025;
    const ncx = (p_ftl.x + p_ftr.x) / 2;
    const ncy = p_ftl.y + notchH * 0.3;
    roundRect(ctx, ncx - notchW / 2, ncy, notchW, notchH, notchH / 2);
    ctx.fillStyle = '#0a0a0f';
    ctx.fill();
  }

  // ── 7. Floating badge chip above device ──────────────────────────────────
  if (intensity >= 2) {
    const badgeReveal = easeOutBack(clamp01(remap(t01, 0.50, 0.72)), 1.4);
    const badgeText = deviceType === 'phone' ? '📱 Available Now' : '🌐 Live Preview';
    const badgeFontPx = Math.min(width, height) * 0.026;

    ctx.font = `600 ${badgeFontPx}px ${FONT}`;
    const badgeW = ctx.measureText(badgeText).width + badgeFontPx * 2;
    const badgeH = badgeFontPx * 1.9;
    const bdgX = width / 2 - badgeW / 2;
    const bdgY = p_ftl!.y - badgeH * 2.2 + (1 - badgeReveal) * badgeH * 3;

    ctx.save();
    ctx.globalAlpha = badgeReveal;
    roundRect(ctx, bdgX, bdgY, badgeW, badgeH, badgeH / 2);
    ctx.fillStyle = hexA(palette.accent, 0.18);
    ctx.fill();
    roundRect(ctx, bdgX, bdgY, badgeW, badgeH, badgeH / 2);
    ctx.strokeStyle = hexA(palette.accent, 0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, width / 2, bdgY + badgeH / 2);
    ctx.restore();
  }

  // ── 8. 3D Floating parallax chips ────────────────────────────────────────
  // Projected at z = depth + 0.38 — further from the screen surface.
  // As rotY changes the parallax separation is visibly larger than the screen edges.
  if (intensity >= 2) {
    const chipReveal = easeOutBack(clamp01(remap(t01, 0.60, 0.80)), 1.4);
    if (chipReveal > 0.01) {
      const floatDepth = depth + 0.38;
      const chip1World = applyRotX(v3(-hw * 0.52,  hh * 0.26, floatDepth));
      const chip2World = applyRotX(v3( hw * 0.58, -hh * 0.16, floatDepth));
      const cp1 = proj(chip1World);
      const cp2 = proj(chip2World);

      const bob1 = Math.sin(holdProgress * Math.PI * 4.0) * 5;
      const bob2 = Math.sin(holdProgress * Math.PI * 3.5 + 1.2) * 4;

      const drawParallaxChip = (
        cx2: number, cy2: number,
        text: string, bobY: number, alpha: number,
      ) => {
        ctx.save();
        ctx.globalAlpha = chipReveal * alpha;
        const chipFontPx = Math.min(width, height) * 0.023;
        ctx.font = `600 ${chipFontPx}px ${FONT}`;
        const tw = ctx.measureText(text).width;
        const cw2 = tw + chipFontPx * 2.2;
        const ch2 = chipFontPx * 1.85;

        ctx.translate(cx2, cy2 + bobY);

        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 6;
        roundRect(ctx, -cw2 / 2, -ch2 / 2, cw2, ch2, ch2 / 2);
        ctx.fillStyle = hexA('#ffffff', 0.14);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        roundRect(ctx, -cw2 / 2, -ch2 / 2, cw2, ch2, ch2 / 2);
        ctx.strokeStyle = hexA('#ffffff', 0.32);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, 0, 0);
        ctx.restore();
      };

      if (cp1) drawParallaxChip(cp1.x, cp1.y, '👍 Liked!',    bob1, 1.0);
      if (cp2) drawParallaxChip(cp2.x, cp2.y, '🔥 Trending',  bob2, 0.9);
    }
  }

  ctx.restore(); // globalAlpha
};
