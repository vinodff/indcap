/**
 * ai-chat-message — Animated AI Chat Interface with Typing & Response.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 * Inspired by Jitter's "The Prompt" collection and AI chat UIs.
 *
 * Renders a full chat interface that:
 *   1. Chat window frame fades in with glassmorphic header
 *   2. User message bubbles spring in from right with avatar circle
 *   3. AI typing indicator (three bouncing dots with subtle glow)
 *   4. AI response bubbles spring in from left with sparkle avatar
 *   5. Multiple message pairs cycle with staggered timing
 *   6. Subtle gradient ambient background matching palette
 *
 * params.text accepts pipe-separated message pairs:
 *   "User message 1 | AI response 1 | User message 2 | AI response 2"
 *   e.g. "How do I make a viral video? | Great question! Let me walk you through it step by step. | What's the best length? | Research shows 30-60 seconds performs best on most platforms."
 *
 * params.icon: "minimal" (default) or "detailed" for richer UI
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;
const CHAT_FONT = `'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

interface ChatMessage {
  text: string;
  isUser: boolean;
}

export const aiChatMessage = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const rawText = p.text || 'How do I make a viral video? | Great question! Let me walk you through it step by step. First, you need a strong hook in the first 3 seconds. | What about thumbnails? | Thumbnails are critical — use high contrast, close-up faces, and curiosity gaps. Aim for at least 3 text words.';
  const intensity = p.intensity ?? 2;

  // ── Parse conversation ────────────────────────────────────────────────────
  const parts = rawText.split('|').map(s => s.trim());
  const messages: ChatMessage[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (!parts[i]) continue;
    messages.push({ text: parts[i], isUser: i % 2 === 0 });
  }
  const msgCount = Math.min(messages.length, 6);
  const activeMessages = messages.slice(0, msgCount);

  // ── Global fades ──────────────────────────────────────────────────────────
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.06)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.90, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // ── Layout ────────────────────────────────────────────────────────────────
  const chatW = Math.min(width * 0.82, 380);
  const headerH = Math.min(chatW * 0.12, 44);
  const padding = chatW * 0.05;
  const bubbleMaxW = chatW * 0.70;
  const avatarR = chatW * 0.04;
  const msgGap = 10;

  let cx = width / 2;
  let cy = height * 0.08;
  if (p.anchor === 'top') cy = height * 0.04;
  else if (p.anchor === 'bottom') cy = height * 0.50;

  const chatX = cx - chatW / 2;
  let chatContentY = cy + headerH + padding;

  // Calculate total content height to know if we need to scroll
  const lineHeights: number[] = [];
  let totalContentH = 0;
  for (const msg of activeMessages) {
    const lineH = msg.isUser ? 18 : 18;
    const lines = Math.ceil(msg.text.length / (msg.isUser ? 35 : 30)) || 1;
    const msgH = msg.isUser ? lines * lineH + 24 : lines * lineH + 24;
    lineHeights.push(msgH);
    totalContentH += msgH + msgGap;
  }
  // Add typing indicator height
  totalContentH += 32 + msgGap;

  const contentAreaH = Math.min(totalContentH, height - (cy + headerH + padding * 3) - 20);
  const availableH = height - cy - 30;
  const chatH = Math.min(headerH + padding * 2 + contentAreaH, availableH);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── Background gradient glow ──────────────────────────────────────────────
  const bgGlow = ctx.createRadialGradient(cx, cy + chatH / 2, 0, cx, cy + chatH / 2, chatW * 0.9);
  bgGlow.addColorStop(0, hexA(palette.primary, 0.08 * intensity));
  bgGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bgGlow;
  ctx.fillRect(cx - chatW, cy, chatW * 2, chatH);

  // ── Chat window background ────────────────────────────────────────────────
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;

  roundRect(ctx, chatX, cy, chatW, chatH, 16);
  const windowGrad = ctx.createLinearGradient(chatX, cy, chatX, cy + chatH);
  windowGrad.addColorStop(0, hexA('#1a1a2e', 0.85));
  windowGrad.addColorStop(1, hexA('#0f0f1a', 0.92));
  ctx.fillStyle = windowGrad;
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // Window border
  roundRect(ctx, chatX, cy, chatW, chatH, 16);
  ctx.strokeStyle = hexA('#ffffff', 0.08);
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── Chat header ───────────────────────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, chatX, cy, chatW, headerH, 16);
  ctx.clip();

  // Header background
  const headerGrad = ctx.createLinearGradient(chatX, cy, chatX, cy + headerH);
  headerGrad.addColorStop(0, hexA(mixHex(palette.primary, '#ffffff', 0.15), 0.3));
  headerGrad.addColorStop(1, hexA('#000000', 0.15));
  ctx.fillStyle = headerGrad;
  ctx.fillRect(chatX, cy, chatW, headerH);

  // Header bottom border
  ctx.fillStyle = hexA('#ffffff', 0.06);
  ctx.fillRect(chatX, cy + headerH - 1, chatW, 1);

  // Round top corners only for header area
  ctx.restore();

  // Header content
  const headerCx = chatX + chatW / 2;
  const headerCy = cy + headerH / 2;

  // AI avatar in header
  const headerAvatarR = headerH * 0.28;
  ctx.save();
  ctx.beginPath();
  ctx.arc(chatX + chatW * 0.06 + headerAvatarR, headerCy, headerAvatarR, 0, Math.PI * 2);
  const haGrad = ctx.createRadialGradient(
    chatX + chatW * 0.06 + headerAvatarR - headerAvatarR * 0.3,
    headerCy - headerAvatarR * 0.3, 0,
    chatX + chatW * 0.06 + headerAvatarR, headerCy, headerAvatarR,
  );
  haGrad.addColorStop(0, hexA(palette.accent, 0.7));
  haGrad.addColorStop(1, hexA(mixHex(palette.accent, '#000', 0.3), 0.9));
  ctx.fillStyle = haGrad;
  ctx.fill();
  ctx.restore();

  // Online indicator dot
  ctx.beginPath();
  ctx.arc(chatX + chatW * 0.06 + headerAvatarR + headerAvatarR * 0.5, headerCy - headerAvatarR * 0.5, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#22c55e';
  ctx.shadowColor = '#22c55e';
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Title
  ctx.font = `700 ${headerH * 0.28}px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('AI Assistant', chatX + chatW * 0.06 + headerAvatarR * 2 + 10, headerCy - headerH * 0.08);

  // Subtitle
  ctx.font = `500 ${headerH * 0.18}px ${FONT}`;
  ctx.fillStyle = hexA('#ffffff', 0.45);
  ctx.fillText('Online · Responding...', chatX + chatW * 0.06 + headerAvatarR * 2 + 10, headerCy + headerH * 0.18);

  // Header right icon (sparkles)
  ctx.save();
  ctx.translate(chatX + chatW - chatW * 0.06, headerCy);
  ctx.beginPath();
  // Draw a simple sparkle icon
  for (let s = 0; s < 4; s++) {
    const sa = (s / 4) * Math.PI * 2 - Math.PI / 2;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(sa) * 6, Math.sin(sa) * 6);
  }
  ctx.strokeStyle = hexA(palette.accent, 0.6);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // ── Render each message ──────────────────────────────────────────────────
  const totalMsgs = activeMessages.length;
  // Stagger: each message pair takes about 0.55 / ceil(n/2) of the timeline
  const pairCount = Math.ceil(totalMsgs / 2);
  const segmentDuration = 0.55 / pairCount;
  const typingDuration = 0.08;

  let currentY = chatContentY;

  for (let mi = 0; mi < totalMsgs; mi++) {
    const msg = activeMessages[mi];

    // Calculate stagger timing for this message
    const msgOrder = Math.floor(mi / 2); // which pair
    const isFirstInPair = mi % 2 === 0;

    let msgStart: number;
    let msgEntry: number;

    if (isFirstInPair) {
      // User message
      msgStart = 0.08 + msgOrder * segmentDuration * 2;
      msgEntry = easeOutBack(clamp01(remap(t01, msgStart, msgStart + 0.12)), 1.2);
    } else {
      // AI response (after typing indicator)
      const userStart = 0.08 + msgOrder * segmentDuration * 2;
      const typingStart = userStart + 0.12;
      const typingEnd = typingStart + typingDuration;
      msgStart = typingEnd;
      msgEntry = easeOutBack(clamp01(remap(t01, msgStart, msgStart + 0.18)), 1.15);
    }

    // Show typing indicator before AI response
    if (!isFirstInPair) {
      const userStart2 = 0.08 + msgOrder * segmentDuration * 2;
      const typingStart2 = userStart2 + 0.12;
      const typingT = clamp01(remap(t01, typingStart2, typingStart2 + typingDuration));

      if (typingT > 0 && typingT < 1 && currentY + 32 < cy + chatH - padding) {
        const typingX = chatX + padding + avatarR * 2.5;
        const typingAlpha = easeInOutCubic(typingT < 0.5 ? typingT * 2 : (1 - typingT) * 2);

        ctx.save();
        ctx.globalAlpha = typingAlpha;

        // Typing bubble
        roundRect(ctx, typingX, currentY, 56, 28, 14);
        ctx.fillStyle = hexA('#ffffff', 0.06);
        ctx.fill();

        // Three bouncing dots
        const dotSpeed = 8;
        for (let di = 0; di < 3; di++) {
          const dotPhase = (t01 * dotSpeed + di * 1.2) % 3;
          const dotScale = dotPhase < 1 ? 0.5 + 0.5 * Math.sin(dotPhase * Math.PI) : 0.5;
          const dotX = typingX + 14 + di * 14;
          ctx.beginPath();
          ctx.arc(dotX, currentY + 14, 3 * dotScale, 0, Math.PI * 2);
          ctx.fillStyle = hexA(palette.accent, 0.5 + 0.5 * dotScale);
          ctx.fill();
        }

        ctx.restore();
      }
    }

    if (msgEntry <= 0.001) {
      // Calculate height anyway to advance Y
      const lines2 = Math.ceil(msg.text.length / (msg.isUser ? 35 : 30)) || 1;
      const msgH2 = msg.isUser ? lines2 * 18 + 24 : lines2 * 18 + 24;
      if (mi + 1 < totalMsgs) currentY += msgH2 + msgGap;
      continue;
    }

    // Message bubble positioning
    let bubbleX: number;
    let bubbleAlign: 'left' | 'right';

    if (msg.isUser) {
      bubbleX = chatX + chatW - padding - bubbleMaxW;
      bubbleAlign = 'right';
    } else {
      bubbleX = chatX + padding + avatarR * 2.5;
      bubbleAlign = 'left';
    }

    // Avatar for this message
    const avatarX = msg.isUser
      ? chatX + chatW - padding - avatarR
      : chatX + padding;

    // Calculate text dimensions
    const fontSize = 13;
    ctx.font = `500 ${fontSize}px ${CHAT_FONT}`;
    const maxTextW = bubbleMaxW - 20;
    const words = msg.text.split(' ');
    const wrapped: string[] = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxTextW && line) {
        wrapped.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) wrapped.push(line);

    const lineH = 20;
    const bubbleH = wrapped.length * lineH + 16;

    // Check if we are overflowing
    if (currentY + bubbleH + 8 > cy + chatH - padding * 2) break;

    // ── Draw avatar ───────────────────────────────────────────────────────
    ctx.save();
    ctx.globalAlpha = msgEntry;
    ctx.translate(0, lerp(10, 0, msgEntry));

    ctx.beginPath();
    ctx.arc(avatarX, currentY + bubbleH * 0.35, avatarR, 0, Math.PI * 2);
    const avGrad = ctx.createRadialGradient(avatarX - avatarR * 0.3, currentY + bubbleH * 0.35 - avatarR * 0.3, 0, avatarX, currentY + bubbleH * 0.35, avatarR);
    if (msg.isUser) {
      avGrad.addColorStop(0, hexA(palette.secondary, 0.7));
      avGrad.addColorStop(1, hexA(mixHex(palette.secondary, '#000', 0.3), 0.9));
    } else {
      avGrad.addColorStop(0, hexA(palette.accent, 0.7));
      avGrad.addColorStop(1, hexA(mixHex(palette.accent, '#000', 0.3), 0.9));
    }
    ctx.fillStyle = avGrad;
    ctx.fill();

    // Initial inside avatar
    ctx.font = `700 ${avatarR * 0.8}px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg.isUser ? 'U' : 'AI', avatarX, currentY + bubbleH * 0.35 + 1);

    ctx.restore();

    // ── Draw bubble ──────────────────────────────────────────────────────
    ctx.save();
    ctx.globalAlpha = msgEntry;
    ctx.translate(lerp(msg.isUser ? 10 : -10, 0, msgEntry), lerp(10, 0, msgEntry));

    // Message bubble background
    const bubbleGrad = ctx.createLinearGradient(bubbleX, currentY, bubbleX, currentY + bubbleH);
    if (msg.isUser) {
      bubbleGrad.addColorStop(0, hexA(palette.accent, 0.85));
      bubbleGrad.addColorStop(1, hexA(mixHex(palette.accent, '#000', 0.2), 0.9));
    } else {
      bubbleGrad.addColorStop(0, hexA('#ffffff', 0.09));
      bubbleGrad.addColorStop(1, hexA('#ffffff', 0.04));
    }

    roundRect(ctx, bubbleX, currentY, bubbleMaxW, bubbleH, 14);
    ctx.fillStyle = bubbleGrad;
    ctx.shadowColor = msg.isUser ? hexA(palette.accent, 0.2) : 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = msg.isUser ? 8 : 4;
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Bubble border (AI only)
    if (!msg.isUser) {
      roundRect(ctx, bubbleX, currentY, bubbleMaxW, bubbleH, 14);
      ctx.strokeStyle = hexA('#ffffff', 0.08);
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // ── Draw text ────────────────────────────────────────────────────────
    ctx.font = `500 ${fontSize}px ${CHAT_FONT}`;
    ctx.fillStyle = msg.isUser ? '#ffffff' : hexA('#ffffff', 0.88);

    // Staggered word reveal for AI messages
    const isAI = !msg.isUser;
    const textStartY = currentY + 8;
    const textStartX = bubbleX + 10;

    for (let li = 0; li < wrapped.length; li++) {
      const lineAlpha = isAI
        ? clamp01((msgEntry - li * 0.08) / (1 - li * 0.08))
        : 1.0;

      if (lineAlpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = lineAlpha;
      ctx.fillText(wrapped[li], textStartX, textStartY + li * lineH);
      ctx.restore();
    }

    ctx.restore(); // bubble transform

    // Advance Y position
    currentY += bubbleH + msgGap;

    // Add typing indicator slot if next is AI
    if (mi + 1 < totalMsgs && !activeMessages[mi + 1].isUser) {
      currentY += 32 + msgGap;
    }
  }

  // ── Chat input bar at bottom ────────────────────────────────────────────
  const inputH = 36;
  const inputY = cy + chatH - inputH - 8;

  ctx.save();
  roundRect(ctx, chatX + padding, inputY, chatW - padding * 2, inputH, inputH / 2);
  ctx.fillStyle = hexA('#ffffff', 0.05);
  ctx.fill();
  ctx.strokeStyle = hexA('#ffffff', 0.06);
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Placeholder text
  ctx.font = `500 ${inputH * 0.35}px ${CHAT_FONT}`;
  ctx.fillStyle = hexA('#ffffff', 0.25);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Type a message...', chatX + padding * 1.6, inputY + inputH / 2);

  // Send button circle
  const btnR = inputH * 0.35;
  const btnX = chatX + chatW - padding - btnR - 6;
  ctx.beginPath();
  ctx.arc(btnX, inputY + inputH / 2, btnR, 0, Math.PI * 2);
  ctx.fillStyle = hexA(palette.accent, 0.6);
  ctx.fill();

  // Arrow
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(btnX + 3, inputY + inputH / 2);
  ctx.lineTo(btnX + btnR - 2, inputY + inputH / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(btnX + btnR - 4, inputY + inputH / 2 - 3);
  ctx.lineTo(btnX + btnR + 1, inputY + inputH / 2);
  ctx.lineTo(btnX + btnR - 4, inputY + inputH / 2 + 3);
  ctx.stroke();

  ctx.restore();

  ctx.restore(); // global
};
