/**
 * code-terminal-ui — Glossy, frosted macOS-style command-line terminal.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 * Renders an animated command console window that:
 *   1. Pops in with a smooth spring scale-up and fade.
 *   2. Types terminal commands character-by-character with a blinking cursor block.
 *   3. Instantly reveals success/return output lines with organic slide-up offsets.
 *   4. Highlights standard bash/npm/node syntax on the fly (commands, flags, strings, etc.).
 *   5. Renders high-fidelity graphical components like console loading bars.
 *   6. Displays macOS-style window controls (Red, Yellow, Green glossy dots) and gutters.
 *   7. Floats on top of a breathing, neon halo backlight glow backdrop.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const MONO_FONT = `'Fira Code', 'JetBrains Mono', 'Source Code Pro', 'Courier New', Courier, monospace`;
const HEADER_FONT = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;

interface TextToken {
  text: string;
  color: string;
}

// ── Software Syntax Highlighter ──────────────────────────────────────────────
const highlightCommand = (text: string, primaryColor: string, accentColor: string): TextToken[] => {
  // Command Prompt (starts with > or $)
  if (text.startsWith('>') || text.startsWith('$')) {
    const symbol = text.substring(0, 1);
    const body = text.substring(1);
    const tokens: TextToken[] = [
      { text: symbol + ' ', color: '#38bdf8' } // Cyan prompt indicator
    ];

    const words = body.trim().split(' ');
    words.forEach((word, idx) => {
      let color = '#f1f5f9'; // standard text gray-white

      if (['npm', 'node', 'git', 'python', 'npx', 'yarn', 'bun', 'cargo', 'pip'].includes(word)) {
        color = '#f43f5e'; // Rose pink command utility
      } else if (word.startsWith('--') || word.startsWith('-')) {
        color = '#c084fc'; // Purple command options/flags
      } else if ((word.startsWith('"') && word.endsWith('"')) || (word.startsWith("'") && word.endsWith("'"))) {
        color = '#34d399'; // Mint green strings
      } else if (word.includes('/') || word.includes('\\') || word.includes('.')) {
        color = '#60a5fa'; // Light blue files/paths
      } else if (idx === 1 && !word.startsWith('-')) {
        color = '#fbbf24'; // Amber sub-action (e.g., install, run, commit)
      }

      tokens.push({ text: word + (idx < words.length - 1 ? ' ' : ''), color });
    });
    return tokens;
  }

  // Success / Action completed lines
  if (text.includes('✔') || text.includes('🚀') || text.includes('success') || text.includes('complete')) {
    const tokens: TextToken[] = [];
    const words = text.split(' ');
    words.forEach((word, idx) => {
      let color = '#94a3b8'; // soft slate
      const lower = word.toLowerCase();

      if (word.includes('✔') || lower.includes('success') || lower.includes('complete') || lower.includes('finished')) {
        color = '#4ade80'; // Emerald neon success
      } else if (word.includes('🚀')) {
        color = '#fbbf24'; // Rocket flame amber
      } else if (word.startsWith('@') || word.startsWith('http')) {
        color = '#38bdf8'; // Cyan link/tag
      } else if (word.match(/^\d+(\.\d+)?s$/)) {
        color = '#c084fc'; // Purple duration (e.g., 1.2s)
      }

      tokens.push({ text: word + (idx < words.length - 1 ? ' ' : ''), color });
    });
    return tokens;
  }

  // Bracketed progress loading bar line (e.g., "[██████░░░░] 60%")
  if (text.includes('[') && text.includes(']')) {
    const startIdx = text.indexOf('[');
    const endIdx = text.indexOf(']');
    if (startIdx !== -1 && endIdx > startIdx) {
      const tokens: TextToken[] = [];
      if (startIdx > 0) {
        tokens.push({ text: text.substring(0, startIdx), color: '#94a3b8' });
      }
      tokens.push({ text: '[', color: '#475569' });
      const fillVal = text.substring(startIdx + 1, endIdx);
      tokens.push({ text: fillVal, color: accentColor });
      tokens.push({ text: ']', color: '#475569' });

      if (endIdx < text.length - 1) {
        const rest = text.substring(endIdx + 1);
        tokens.push({ text: rest, color: '#34d399' }); // green percentage indicator
      }
      return tokens;
    }
  }

  // Normal Output Line
  return [{ text, color: '#cbd5e1' }];
};

// ── Core Primitive ────────────────────────────────────────────────────────────
export const codeTerminalUi = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;

  // ── Global Fades ───────────────────────────────────────────────────────────
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // ── Parse Lines of Terminal script ─────────────────────────────────────────
  const rawText = p.text || '> npm install @createrin/motion|✔ Added 42 premium motion primitives in 1.4s|> node app.js --optimize|🚀 Createrin Engine: 60FPS fluid active|[████████████████] 100% complete';
  const rawLines = rawText.split('|').map(s => s.trim());
  const maxLines = Math.min(rawLines.length, 6);
  const activeLines = rawLines.slice(0, maxLines);

  // ── Layout Dimensions ──────────────────────────────────────────────────────
  const terminalW = Math.min(width * 0.85, 460);
  const terminalH = 220;
  const cx = width / 2;
  // Handle optional anchors
  let cy = height * 0.5;
  if (p.anchor === 'top') cy = height * 0.28;
  else if (p.anchor === 'bottom') cy = height * 0.72;

  const headerH = 28;
  const startX = cx - terminalW / 2;
  const startY = cy - terminalH / 2;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── 1. Breathing Studio Neon Backdrop Glow ─────────────────────────────────
  const breatheFreq = 5.0;
  const breatheScale = 1.0 + 0.08 * Math.sin(t01 * Math.PI * breatheFreq);
  const glowRadius = Math.max(width * 0.45, 200) * breatheScale;
  const backGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, glowRadius);
  backGlow.addColorStop(0, hexA(palette.primary, 0.16 * intensity));
  backGlow.addColorStop(0.5, hexA(palette.accent, 0.08 * intensity));
  backGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = backGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // ── 2. Terminal Window pop-scale ───────────────────────────────────────────
  const popScale = easeOutBack(clamp01(remap(t01, 0, 0.14)), 1.12);
  ctx.translate(cx, cy);
  ctx.scale(popScale, popScale);
  ctx.translate(-cx, -cy);

  // ── 3. Outer Shadow & Glass Backdrop Panel ─────────────────────────────────
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;

  const glassBg = ctx.createLinearGradient(startX, startY, startX, startY + terminalH);
  glassBg.addColorStop(0, 'rgba(13, 16, 23, 0.90)'); // Deep high-contrast obsidian slate
  glassBg.addColorStop(1, 'rgba(6, 8, 12, 0.96)');
  ctx.fillStyle = glassBg;
  roundRect(ctx, startX, startY, terminalW, terminalH, 12);
  ctx.fill();
  ctx.restore(); // restores shadow state

  // ── 4. Frosted Window Border outline ───────────────────────────────────────
  const borderGrad = ctx.createLinearGradient(startX, startY, startX, startY + terminalH);
  borderGrad.addColorStop(0, hexA('#ffffff', 0.20));
  borderGrad.addColorStop(0.4, hexA(palette.primary, 0.12));
  borderGrad.addColorStop(1, hexA('#000000', 0.50));
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 1.2;
  roundRect(ctx, startX, startY, terminalW, terminalH, 12);
  ctx.stroke();

  // ── 5. Draw Window Title Header ────────────────────────────────────────────
  const headerGrad = ctx.createLinearGradient(startX, startY, startX, startY + headerH);
  headerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  headerGrad.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
  ctx.fillStyle = headerGrad;
  ctx.beginPath();
  // Round top left and top right corners of the header only
  roundRect(ctx, startX, startY, terminalW, headerH, 12);
  ctx.fill();

  // Divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(startX, startY + headerH);
  ctx.lineTo(startX + terminalW, startY + headerH);
  ctx.stroke();

  // ── macOS Red, Yellow, Green glossy actions dots ───────────────────────────
  const dotR = 4.8;
  const dotY = startY + headerH / 2;
  const dotSpacing = 13;
  const startDotX = startX + 15;

  const dots = [
    { x: startDotX, y: dotY, color: '#ff5f56', border: '#e0443e' }, // Close
    { x: startDotX + dotSpacing, y: dotY, color: '#ffbd2e', border: '#dfa123' }, // Minimize
    { x: startDotX + dotSpacing * 2, y: dotY, color: '#27c93f', border: '#1aab29' }, // Maximize
  ];

  dots.forEach(dot => {
    ctx.save();
    ctx.fillStyle = dot.color;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dot.border;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();
  });

  // Center Monospace Title
  ctx.font = `600 11px ${MONO_FONT}`;
  ctx.fillStyle = hexA('#ffffff', 0.45);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('bash — createrin@core', cx, startY + headerH / 2 + 0.5);

  // Gutter/Status panel right side
  ctx.font = `700 9px ${HEADER_FONT}`;
  ctx.fillStyle = hexA(palette.accent, 0.7);
  ctx.textAlign = 'right';
  ctx.fillText('🟢 active', startX + terminalW - 15, startY + headerH / 2 + 0.5);

  // ── 6. Rendering script lines timeline staggered ───────────────────────────
  const sequenceStart = 0.12;
  const sequenceEnd = 0.82;
  const totalSeqDuration = sequenceEnd - sequenceStart;
  const durationPerLine = totalSeqDuration / activeLines.length;

  const codeAreaY = startY + headerH + 16;
  const lineSpacing = 24;
  const textX = startX + 54;

  ctx.save();
  // Clip output text so it fits exactly in terminal body
  ctx.beginPath();
  ctx.rect(startX + 1, startY + headerH + 1, terminalW - 2, terminalH - headerH - 2);
  ctx.clip();

  activeLines.forEach((lineText, i) => {
    const lineStart = sequenceStart + i * durationPerLine;
    const lineEnd = lineStart + durationPerLine;

    // Check if line animation has started
    if (t01 < lineStart) return;

    const lineY = codeAreaY + i * lineSpacing;

    // Left line numbers gutter
    ctx.font = `500 11px ${MONO_FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const rowNum = String(i + 1).padStart(2, '0');
    ctx.fillText(rowNum, startX + 34, lineY + 1.5);

    // Is it a prompt typing line?
    const isCommand = lineText.startsWith('>') || lineText.startsWith('$');

    if (isCommand) {
      // Command Typing Timeline
      const typingRange = durationPerLine * 0.82;
      const typeT = clamp01(remap(t01, lineStart, lineStart + typingRange));
      const charCount = Math.floor(typeT * lineText.length);
      const visibleText = lineText.substring(0, charCount);

      // Render tokens side-by-side
      const tokens = highlightCommand(visibleText, palette.primary, palette.accent);
      ctx.font = `700 12.5px ${MONO_FONT}`;
      ctx.textAlign = 'left';

      let currentX = textX;
      tokens.forEach(tok => {
        ctx.fillStyle = tok.color;
        ctx.fillText(tok.text, currentX, lineY);
        currentX += ctx.measureText(tok.text).width;
      });

      // Blinking Cursor logic (blink speed proportional to frame time)
      const curPulse = Math.floor(t01 * 22) % 2 === 0;
      if (curPulse && typeT < 0.999) {
        ctx.fillStyle = palette.accent;
        ctx.fillRect(currentX + 1, lineY + 1, 7.5, 13);
      }
    } else {
      // Output Reveal timeline (slides up and fades in instantly on command end)
      const revealT = easeOutCubic(clamp01(remap(t01, lineStart, lineStart + durationPerLine * 0.2)));
      const revealYOffset = lerp(8, 0, revealT);
      const revealAlpha = revealT;

      ctx.save();
      ctx.globalAlpha = globalAlpha * revealAlpha;

      const tokens = highlightCommand(lineText, palette.primary, palette.accent);
      ctx.font = `600 12.5px ${MONO_FONT}`;
      ctx.textAlign = 'left';

      let currentX = textX;
      tokens.forEach(tok => {
        ctx.fillStyle = tok.color;
        ctx.fillText(tok.text, currentX, lineY + revealYOffset);
        currentX += ctx.measureText(tok.text).width;
      });

      ctx.restore();
    }
  });

  ctx.restore(); // restore clipping context

  // ── 7. Glass Highlight Specular Sheen Sweep ────────────────────────────────
  const sweepT = clamp01(remap(t01, 0.14, 0.92));
  if (sweepT > 0 && sweepT < 0.98) {
    ctx.save();
    // Clip highlight to the rounded rectangle area
    ctx.beginPath();
    roundRect(ctx, startX, startY, terminalW, terminalH, 12);
    ctx.clip();

    const sweepX = startX - terminalW + sweepT * terminalW * 2.2;
    const sheenGrad = ctx.createLinearGradient(sweepX, startY, sweepX + terminalW * 0.3, startY + terminalH);
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheenGrad;
    ctx.fill();
    ctx.restore();
  }

  // ── 8. CRT Scanning Line overlays ──────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, startX, startY, terminalW, terminalH, 12);
  ctx.clip();

  ctx.strokeStyle = 'rgba(255,255,255,0.015)';
  ctx.lineWidth = 0.65;
  for (let scanY = startY + headerH + 2; scanY < startY + terminalH; scanY += 5) {
    ctx.beginPath();
    ctx.moveTo(startX, scanY);
    ctx.lineTo(startX + terminalW, scanY);
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore(); // restore scaling & initial global opacity
};
