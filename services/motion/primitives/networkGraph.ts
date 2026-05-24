import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;

interface NetNode {
  x: number;
  y: number;
  r: number;
  label: string;
  connections: number[];
  phase: number;
  color: string;
}

interface DataPacket {
  from: number;
  to: number;
  progress: number;
  speed: number;
  delay: number;
}

const mulberry32 = (seed: number) => {
  let a = (seed ^ 0xabcdefff) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const networkGraph = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;
  const label = p.text || '';

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.1)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.85, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const rng = mulberry32(42);
  const cx = width / 2;
  const cy = height * 0.44;
  const spread = Math.min(width, height) * 0.32;

  const nodeCount = intensity === 3 ? 10 : intensity === 2 ? 7 : 5;
  const packetCount = intensity === 3 ? 8 : intensity === 2 ? 5 : 3;

  const nodes: NetNode[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2 + rng() * 0.5;
    const dist = spread * (0.3 + rng() * 0.7);
    const colorIdx = i % 3;
    const colors = [palette.primary, palette.accent, palette.secondary];
    nodes.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      r: 6 + rng() * 14 * (intensity / 3),
      label: '',
      connections: [],
      phase: rng(),
      color: colors[colorIdx],
    });
  }

  nodes[0].r = 18;
  nodes[0].color = palette.accent;
  nodes[0].label = label ? label.split('|')[0] || '' : '';

  for (let i = 0; i < nodeCount; i++) {
    const connCount = 1 + Math.floor(rng() * (intensity === 3 ? 3 : 2));
    for (let c = 0; c < connCount; c++) {
      let target = Math.floor(rng() * nodeCount);
      if (target === i) target = (target + 1) % nodeCount;
      if (!nodes[i].connections.includes(target)) {
        nodes[i].connections.push(target);
      }
    }
  }

  const packets: DataPacket[] = [];
  for (let i = 0; i < packetCount; i++) {
    const from = Math.floor(rng() * nodeCount);
    const conns = nodes[from].connections;
    if (conns.length === 0) continue;
    const to = conns[Math.floor(rng() * conns.length)];
    packets.push({
      from,
      to,
      progress: rng(),
      speed: 0.4 + rng() * 0.6,
      delay: rng() * 0.3,
    });
  }

  const entrySpring = easeOutBack(clamp01(remap(t01, 0, 0.35)), 1.3);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  const bgR = Math.max(width, height) * 0.45;
  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bgR);
  bgGrad.addColorStop(0, hexA(mixHex(palette.bg || '#0a0a14', palette.primary, 0.05), 0.6));
  bgGrad.addColorStop(1, hexA(palette.bg || '#0a0a14', 0));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  for (const node of nodes) {
    ctx.save();
    ctx.shadowColor = hexA(node.color, 0.15);
    ctx.shadowBlur = 20;
    ctx.fillStyle = hexA(node.color, 0.03);
    const haloR = node.r * (3 + Math.sin(t01 * Math.PI + node.phase) * 0.5);
    ctx.beginPath();
    ctx.arc(node.x, node.y, haloR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const node of nodes) {
    const nx = lerp(cx, node.x, entrySpring);
    const ny = lerp(cy, node.y, entrySpring);
    const nr = node.r * entrySpring;

    for (const connIdx of node.connections) {
      const target = nodes[connIdx];
      if (!target) continue;
      const tx = lerp(cx, target.x, entrySpring);
      const ty = lerp(cy, target.y, entrySpring);

      const dist = Math.sqrt((tx - nx) ** 2 + (ty - ny) ** 2);
      const maxDist = spread * 1.5;
      const lineAlpha = 0.15 * (1 - Math.min(dist / maxDist, 1)) + 0.05;

      ctx.save();
      ctx.globalAlpha = lineAlpha * globalAlpha;
      ctx.strokeStyle = hexA(palette.accent, 0.3);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.restore();

      const glowAlpha = 0.04 * (1 - Math.min(dist / maxDist, 1));
      ctx.save();
      ctx.globalAlpha = glowAlpha * globalAlpha;
      ctx.strokeStyle = hexA(palette.accent, 0.5);
      ctx.lineWidth = 4;
      ctx.shadowColor = hexA(palette.accent, 0.3);
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.restore();
    }
  }

  for (const pkt of packets) {
    const fromNode = nodes[pkt.from];
    const toNode = nodes[pkt.to];
    if (!fromNode || !toNode) continue;

    const rawProgress = (t01 * pkt.speed + pkt.delay) % 1;
    const fx = lerp(cx, fromNode.x, entrySpring);
    const fy = lerp(cy, fromNode.y, entrySpring);
    const tx = lerp(cx, toNode.x, entrySpring);
    const ty = lerp(cy, toNode.y, entrySpring);

    const px = lerp(fx, tx, rawProgress);
    const py = lerp(fy, ty, rawProgress);

    const packetAlpha = Math.sin(rawProgress * Math.PI) * 0.8;
    ctx.save();
    ctx.globalAlpha = packetAlpha * globalAlpha;
    ctx.fillStyle = hexA(palette.accent, 0.9);
    ctx.shadowColor = hexA(palette.accent, 0.6);
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = packetAlpha * 0.3 * globalAlpha;
    ctx.fillStyle = hexA(palette.accent, 0.5);
    ctx.shadowColor = hexA(palette.accent, 0.3);
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const nx = lerp(cx, node.x, entrySpring);
    const ny = lerp(cy, node.y, entrySpring);
    const nr = node.r * entrySpring;
    if (nr < 1) continue;

    const pulse = 1 + 0.2 * Math.sin(t01 * Math.PI * 2.5 + node.phase * Math.PI * 2);
    const bobY = Math.sin(t01 * Math.PI * 1.2 + node.phase * 3) * 3;

    ctx.save();
    ctx.shadowColor = hexA(node.color, 0.4);
    ctx.shadowBlur = 12 * pulse;

    const nodeGrad = ctx.createRadialGradient(
      nx - nr * 0.2, ny + bobY - nr * 0.2, 0,
      nx, ny + bobY, nr,
    );
    nodeGrad.addColorStop(0, hexA('#ffffff', 0.3));
    nodeGrad.addColorStop(0.5, hexA(node.color, 0.8));
    nodeGrad.addColorStop(1, hexA(node.color, 0.3));
    ctx.fillStyle = nodeGrad;
    ctx.beginPath();
    ctx.arc(nx, ny + bobY, nr * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = hexA(node.color, 0.2);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(nx, ny + bobY, nr * pulse * 1.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (i === 0 && label) {
      ctx.save();
      ctx.globalAlpha = globalAlpha * 0.7;
      ctx.font = `700 ${Math.min(width, height) * 0.016}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = hexA('#ffffff', 0.6);
      ctx.fillText(label, nx, ny + bobY + nr * pulse + 10);
      ctx.restore();
    }

    const orbitCount = intensity >= 3 ? 2 : 1;
    for (let oi = 0; oi < orbitCount; oi++) {
      const orbitAngle = t01 * Math.PI * 2 * (1 + oi * 0.5) + node.phase * Math.PI * 2;
      const orbitR = nr * (1.8 + oi * 0.8);
      const ox = nx + Math.cos(orbitAngle) * orbitR;
      const oy = ny + bobY + Math.sin(orbitAngle) * orbitR;
      ctx.save();
      ctx.globalAlpha = 0.4 * globalAlpha;
      ctx.fillStyle = hexA(node.color, 0.5);
      ctx.shadowColor = hexA(node.color, 0.3);
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(ox, oy, 1 + (1 - oi) * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  if (intensity >= 2) {
    const ambientCount = intensity >= 3 ? 30 : 15;
    for (let i = 0; i < ambientCount; i++) {
      const r = rng() * spread * 1.4;
      const angle = rng() * Math.PI * 2;
      const ax = cx + Math.cos(angle) * r;
      const ay = cy + Math.sin(angle) * r;
      const as = 0.5 + rng() * 2;
      const aa = 0.2 + 0.3 * Math.sin(t01 * Math.PI * 0.7 + i);

      ctx.save();
      ctx.globalAlpha = aa * globalAlpha;
      ctx.fillStyle = hexA(palette.accent, 0.3);
      ctx.beginPath();
      ctx.arc(ax, ay, as, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
};
