import { Caption, StyleConfig, RendererState } from '../../../types';
import { RenderHelpers } from '../types';
import { isEmojiWord, emojiToNotoUrl } from '../emojiUtils';
import { KEYWORD_ICON_MAP } from '../../iconWordMapper';
import { speakerColor } from '../speakerColorMap';
import { evaluateKeyframe } from '../keyframeEngine';
import { drawSpecialCaptionEffect, drawSpecialWordEffect, hashCaptionId } from './specialEffects';

const lerp = (start: number, end: number, t: number): number => start * (1 - t) + end * t;

const backEaseOut = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const easeOutQuint = (t: number): number => {
  return 1 - Math.pow(1 - t, 5);
};

const elasticOut = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export function drawGeneric(
  helpers: RenderHelpers,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  caption: Caption,
  style: StyleConfig,
  scaleFactor: number,
  anchorX: number,
  anchorY: number,
  renderTime: number,
  state: RendererState
): void {
  let fontSize = style.fontSize * scaleFactor;
  const spaceWidth = fontSize * 0.3;

  // In WORD display mode, pre-shrink font if the active word overflows the canvas width.
  if (style.displayMode === 'WORD') {
    const rawT = style.uppercase ? caption.text.toUpperCase() : caption.text;
    const pfx = style.emojiPrefix ? style.emojiPrefix + ' ' : '';
    const sfx = style.emojiSuffix ? ' ' + style.emojiSuffix : '';
    const allWords = (pfx + rawT + sfx).split(' ');
    // Measure widest possible word in this caption
    helpers.setFont(ctx, `${style.fontWeight} ${fontSize}px ${style.fontFamily}`);
    let maxW = 0;
    allWords.forEach((w, idx) => {
      const cleanW = w.toLowerCase().replace(/[^a-z]/g, '');
      let isIcon = false;
      if (state?.iconCaptionsEnabled) {
        let match = KEYWORD_ICON_MAP[cleanW];
        if (!match && cleanW.endsWith('s')) {
          match = KEYWORD_ICON_MAP[cleanW.slice(0, -1)];
        }
        isIcon = !!match;
      }
      const wWidth = isIcon ? (fontSize * 1.35) : helpers.getMixedTextWidth(ctx, w, fontSize);
      maxW = Math.max(maxW, wWidth);
    });
    const strokeMargin = style.strokeWidth ? (style.strokeWidth * scaleFactor * 2) : 0;
    const allowed = canvas.width * 0.80 - strokeMargin;
    if (maxW > allowed) {
      fontSize = fontSize * (allowed / maxW);
    }
  }

  helpers.setFont(ctx, `${style.fontWeight} ${fontSize}px ${style.fontFamily}`);
  ctx.textAlign = style.textAlign || 'center';
  ctx.textBaseline = 'middle';

  let rawText = style.uppercase ? caption.text.toUpperCase() : caption.text;
  if (style.emojiPrefix) rawText = style.emojiPrefix + ' ' + rawText;
  if (style.emojiSuffix) rawText = rawText + ' ' + style.emojiSuffix;
  const words = rawText.split(' ');
  const wordCount = words.length;
  const captionProgress = Math.max(0, Math.min((renderTime - caption.startTime) / (caption.endTime - caption.startTime), 1));

  const emojiPrefixOffset = style.emojiPrefix ? 1 : 0;
  const originalWordCount = wordCount - emojiPrefixOffset - (style.emojiSuffix ? 1 : 0);
  let activeWordIndex = -1;
  let wordProgress = 1;

  if (caption.words && caption.words.length === originalWordCount) {
    const TIMING_BUFFER = 0.06;
    let timingIndex = caption.words.findIndex(
      w => renderTime >= w.start - TIMING_BUFFER && renderTime <= w.end + TIMING_BUFFER
    );
    if (timingIndex !== -1) {
      activeWordIndex = timingIndex + emojiPrefixOffset;
      const activeW = caption.words[timingIndex];
      wordProgress = Math.max(0, Math.min((renderTime - activeW.start) / Math.max(activeW.end - activeW.start, 0.05), 1));
    } else {
      for (let i = caption.words.length - 1; i >= 0; i--) {
        if (renderTime > caption.words[i].end) { activeWordIndex = i + emojiPrefixOffset; break; }
      }
      wordProgress = 1;
    }
  } else {
    activeWordIndex = Math.min(Math.floor(captionProgress * wordCount), wordCount - 1);
    const wordDuration = (caption.endTime - caption.startTime) / wordCount;
    const wordStartTime = caption.startTime + activeWordIndex * wordDuration;
    wordProgress = Math.max(0, Math.min((renderTime - wordStartTime) / wordDuration, 1));
  }

  const COLOR_POP_PALETTE = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6BFF', '#FF9F43', '#00D2D3', '#FF4757'];
  const colorBehavior = style.colorBehavior || 'WORD_POP';
  const captionSeed = hashCaptionId(caption.id);

  // ── Caption-level special effects own the entire draw (ticker, matrix) ──
  if (drawSpecialCaptionEffect(
    helpers, ctx, canvas, caption, style, scaleFactor,
    anchorX, anchorY, renderTime, words, activeWordIndex, fontSize
  )) {
    return;
  }

  const drawWord = (word: string, x: number, y: number, active: boolean, idx: number) => {
    ctx.save();

    // --- Staggered Entry/Exit Animations ---
    const entry = state.entryAnimation || 'NONE';
    const exit = state.exitAnimation || 'NONE';
    const hasEntryExit = entry !== 'NONE' || exit !== 'NONE';

    let animOffsetX = 0;
    let animOffsetY = 0;
    let animScale = 1;
    let animAlpha = 1;
    let animRot = 0;

    // Temporary storage for canvas filters to avoid clearing existing filters
    let filterString = '';
    let entryProgress = 1;
    let exitProgress = 1;

    if (hasEntryExit) {
      const totalWords = words.length;
      const staggerDelay = Math.min(0.06, (caption.endTime - caption.startTime) * 0.15 / totalWords);
      const wordAnimDur = 0.22;
      const elapsed = renderTime - caption.startTime;
      const exitElapsed = caption.endTime - renderTime;

      // Staggered Entry
      if (entry !== 'NONE') {
        const wordEntryDelay = idx * staggerDelay;
        entryProgress = Math.max(0, Math.min(1, (elapsed - wordEntryDelay) / wordAnimDur));
        const entryT = easeOutQuint(entryProgress);

        if (entryProgress < 1) {
          animAlpha = entryProgress;
          switch (entry) {
            case 'SLIDE_UP':
              animOffsetY = lerp(50 * scaleFactor, 0, entryT);
              break;
            case 'SLIDE_DOWN':
              animOffsetY = lerp(-50 * scaleFactor, 0, entryT);
              break;
            case 'FADE_IN':
              break;
            case 'ZOOM_IN':
              animScale = lerp(0.3, 1, entryT);
              break;
            case 'BOUNCE':
              animScale = backEaseOut(entryProgress);
              animAlpha = Math.min(1, entryProgress * 3);
              break;
            case 'ROTATE_IN':
              animRot = lerp(-Math.PI / 4, 0, entryT);
              animScale = lerp(0.5, 1, entryT);
              break;
            case 'BLUR_IN':
              break;
            case 'GLITCH':
              {
                const noise1 = Math.sin(renderTime * 67.3 + idx * 1.9) * 0.5 + 0.5;
                const noise2 = Math.sin(renderTime * 41.7 + idx * 2.3) * 0.5 + 0.5;
                animOffsetX = (noise1 - 0.5) * 15 * scaleFactor * (1 - entryProgress);
                animOffsetY = (noise2 - 0.5) * 8 * scaleFactor * (1 - entryProgress);
                animAlpha = entryProgress < 0.3 ? (noise1 > 0.5 ? 1 : 0.3) : entryProgress;
                animScale = lerp(1.15, 1, entryT);
              }
              break;
            case 'ELASTIC':
              animScale = elasticOut(entryProgress);
              animAlpha = Math.min(1, entryProgress * 2.5);
              break;
            case 'KINETIC':
              animScale = lerp(2.5, 1, entryT);
              animAlpha = Math.min(1, entryProgress * 4);
              animOffsetY = lerp(-15 * scaleFactor, 0, entryT);
              break;
            case 'SHATTER':
              {
                const seedX = Math.sin(idx * 79.3 + 1.1) * 200 * scaleFactor;
                const seedY = Math.cos(idx * 43.7 + 2.3) * 200 * scaleFactor;
                animOffsetX = lerp(seedX, 0, backEaseOut(entryProgress));
                animOffsetY = lerp(seedY, 0, backEaseOut(entryProgress));
                animAlpha = Math.min(1, entryProgress * 2.5);
                animScale = lerp(0.3, 1, entryT);
              }
              break;
            case 'SPOTLIGHT':
              animScale = lerp(0.1, 1, backEaseOut(entryProgress));
              animAlpha = Math.min(1, entryProgress * 5);
              break;
            case 'SPRING':
              {
                const springT = 1 - Math.exp(-6 * entryProgress) * (Math.cos(12 * entryProgress) + 0.5 * Math.sin(12 * entryProgress));
                animScale = lerp(0.3, 1, springT);
                animAlpha = Math.min(1, entryProgress * 3);
              }
              break;
            case 'FLIP_Y':
              {
                const flipAngle = lerp(Math.PI / 2, 0, entryT);
                animScale = Math.max(0.01, Math.cos(flipAngle));
              }
              break;
          }

          // Motion Blur
          if (entry === 'SLIDE_UP' || entry === 'SLIDE_DOWN' || entry === 'SHATTER' || entry === 'KINETIC') {
            const blurAmt = (1 - entryProgress) * 10 * scaleFactor;
            if (blurAmt > 0.5) {
              filterString = `blur(${blurAmt.toFixed(1)}px)`;
            }
          } else if (entry === 'BLUR_IN') {
            const blurAmt = lerp(15, 0, entryT) * scaleFactor;
            if (blurAmt > 0.5) {
              filterString = `blur(${blurAmt.toFixed(1)}px)`;
            }
          }
        }
      }

      // Staggered Exit
      if (exit !== 'NONE') {
        const wordExitDelay = (totalWords - 1 - idx) * staggerDelay;
        exitProgress = Math.max(0, Math.min(1, (exitElapsed - wordExitDelay) / wordAnimDur));
        const exitT = easeOutQuint(exitProgress);

        if (exitProgress < 1) {
          animAlpha = Math.min(animAlpha, exitProgress);
          switch (exit) {
            case 'SLIDE_DOWN':
              animOffsetY += lerp(45 * scaleFactor, 0, exitT);
              break;
            case 'SLIDE_UP':
              animOffsetY += lerp(-45 * scaleFactor, 0, exitT);
              break;
            case 'FADE_OUT':
              break;
            case 'ZOOM_OUT':
              animScale *= lerp(0.3, 1, exitT);
              break;
            case 'DISSOLVE':
              animAlpha = Math.min(animAlpha, exitProgress * exitProgress);
              break;
            case 'GLITCH_OUT':
              {
                const noiseX = Math.sin(renderTime * 83.1 + idx * 2.7) * 15 * scaleFactor * (1 - exitProgress);
                animOffsetX += noiseX;
              }
              break;
            case 'SHRINK':
              animScale *= exitProgress;
              break;
            case 'FLIP':
              {
                const flipAngle = lerp(Math.PI / 2, 0, exitT);
                animScale *= Math.max(0.01, Math.cos(flipAngle));
              }
              break;
          }
        }
      }
    }

    // Set initial alpha
    ctx.globalAlpha = animAlpha;
    if (filterString) {
      ctx.filter = filterString;
    }

    // SHAKE_CAM
    if (active && style.specialRenderer === 'SHAKE_CAM') {
      const shakeIntensity = 5 * scaleFactor;
      const shakeX = Math.sin(renderTime * 73.1 + idx * 4.3) * shakeIntensity;
      const shakeY = Math.cos(renderTime * 59.7 + idx * 2.9) * shakeIntensity * 0.5;
      ctx.translate(x + shakeX, y + shakeY);
      ctx.translate(-x, -y);
    }

    // Word-level Keyframes overrides
    const captionFrames = state.keyframeMap?.get(caption.id);
    let kfScale = 1;
    let kfOpacity = 1;
    let kfOffsetX = 0;
    let kfOffsetY = 0;
    let kfRot = 0;
    let kfColor: string | undefined = undefined;

    if (captionFrames && captionFrames.length > 0) {
      const wKf = evaluateKeyframe(captionFrames, renderTime, idx - emojiPrefixOffset);
      if (wKf) {
        if (wKf.scale !== undefined) kfScale = wKf.scale;
        if (wKf.opacity !== undefined) kfOpacity = wKf.opacity;
        if (wKf.offsetX !== undefined) kfOffsetX = wKf.offsetX;
        if (wKf.offsetY !== undefined) kfOffsetY = wKf.offsetY;
        if (wKf.rotation !== undefined) kfRot = wKf.rotation;
        if (wKf.color !== undefined) kfColor = wKf.color;
      }
    }

    // Apply keyframe opacity override
    ctx.globalAlpha *= kfOpacity;

    // Kinetic Mode Physics
    let kOffsetX = 0, kOffsetY = 0, kScaleX = 1, kScaleY = 1, kRot = 0;
    const kMode = state.kineticMode || 'NONE';
    if (kMode === 'WAVE') {
      kOffsetY = Math.sin(renderTime * 4 + idx * 0.9) * 12 * scaleFactor;
    } else if (kMode === 'BOUNCE_CHAIN') {
      const bounceT = (renderTime * 3 - idx * 0.2) % 2.0;
      if (bounceT > 0 && bounceT < 1) kOffsetY = -Math.abs(Math.sin(bounceT * Math.PI)) * 15 * scaleFactor;
    } else if (kMode === 'SHAKE') {
      kOffsetX = Math.sin(renderTime * 45 + idx * 3) * 4 * scaleFactor;
      kOffsetY = Math.cos(renderTime * 38 + idx * 2) * 2 * scaleFactor;
      kRot = Math.sin(renderTime * 50 + idx) * 0.05;
    } else if (kMode === 'STOMP') {
      const stompPhase = (renderTime * 2.5 - idx * 0.15) % 1.5;
      if (stompPhase >= 0 && stompPhase <= 0.3) {
        const t = stompPhase / 0.3;
        kScaleX = lerp(1.3, 1, backEaseOut(t));
        kScaleY = lerp(0.7, 1, backEaseOut(t));
        kOffsetY = lerp(-10 * scaleFactor, 0, t);
      }
    }

    const wHighlightCheck = state.wordHighlight || 'NONE';
    const waveOffsetY = wHighlightCheck === 'WAVE'
      ? Math.sin(renderTime * 4 + idx * 0.9) * 10 * scaleFactor
      : 0;

    // Translate to target position including all offsets
    ctx.translate(x + kOffsetX + animOffsetX + kfOffsetX, y + waveOffsetY + kOffsetY + animOffsetY + kfOffsetY);
    if (kRot !== 0) ctx.rotate(kRot);
    if (animRot !== 0) ctx.rotate(animRot);
    if (kfRot !== 0) ctx.rotate(kfRot);
    if (kScaleX !== 1 || kScaleY !== 1) ctx.scale(kScaleX, kScaleY);
    if (animScale !== 1) ctx.scale(animScale, animScale);
    if (kfScale !== 1) ctx.scale(kfScale, kfScale);

    // Apply 3D skew if FLIP_Y entry animation is active
    if (entry === 'FLIP_Y' && entryProgress < 1) {
      const flipAngle = lerp(Math.PI / 2, 0, easeOutQuint(entryProgress));
      const skewVal = Math.sin(flipAngle) * 0.18;
      ctx.transform(1, skewVal, 0, 1, 0, 0);
    } else if (exit === 'FLIP' && exitProgress < 1) {
      const flipAngle = lerp(Math.PI / 2, 0, easeOutQuint(exitProgress));
      const skewVal = Math.sin(flipAngle) * 0.18;
      ctx.transform(1, -skewVal, 0, 1, 0, 0);
    }

    if (style.rotationVariance && style.rotationVariance > 0) {
      const rot = (idx % 2 === 0 ? 1 : -1) * style.rotationVariance * (Math.PI / 180);
      ctx.rotate(rot);
    }

    // ── Per-letter special-effect engines (neon, 3D, magnetic, brush, split) ──
    // The engine owns the full word draw; entry/exit transforms above still apply.
    if (drawSpecialWordEffect(helpers, ctx, style, {
      word, idx, active, wordProgress, fontSize, scaleFactor, renderTime, captionSeed,
    })) {
      ctx.globalAlpha = 1;
      ctx.restore();
      return;
    }

    // Chromatic aberration glitch effect for active word in GLITCH mode
    if (active && entry === 'GLITCH' && entryProgress < 1) {
      ctx.save();
      ctx.globalAlpha = animAlpha * 0.6;
      ctx.translate(3 * scaleFactor, 0);
      helpers.drawMixedText(ctx, word, fontSize, 'rgba(255,0,0,0.75)', 0, 0, false);
      ctx.translate(-6 * scaleFactor, 0);
      helpers.drawMixedText(ctx, word, fontSize, 'rgba(0,255,255,0.75)', 0, 0, false);
      ctx.restore();
    }

    // Animation
    if (active && style.animation === 'FIRE_POP') {
      const slamT = Math.min(wordProgress / 0.35, 1);
      const slamScale = slamT < 1 ? lerp(3.0, 1.12, backEaseOut(slamT)) : lerp(1.12, 1.0, easeOutQuint((wordProgress - 0.35) / 0.65));
      ctx.scale(slamScale, slamScale);

      if (slamT < 1) {
        const shakeAmt = (1 - slamT) * 6;
        const shakeX = Math.sin(renderTime * 87.3 + idx * 3.7) * shakeAmt;
        const shakeY = Math.cos(renderTime * 63.1 + idx * 5.1) * shakeAmt * 0.5;
        ctx.translate(shakeX, shakeY);
      }
    } else if (active && style.animation === 'POP') {
      const scale = lerp(0.5, 1.15, backEaseOut(wordProgress));
      ctx.scale(scale, scale);
    } else if (active && style.animation === 'SCALE_UP') {
      const scale = lerp(0.8, 1.05, easeOutQuint(wordProgress));
      ctx.scale(scale, scale);
    } else if (active && style.animation === 'SPRING') {
      const freq = style.springStiffness || 15;
      const damp = style.springDamping || 0.4;
      const springScale = 1 - Math.cos(wordProgress * freq) * Math.exp(-wordProgress / damp) * 0.5;
      ctx.scale(springScale, springScale);
    } else if (active && style.animation === 'STAMP') {
      const slam = Math.min(wordProgress / 0.2, 1);
      const stampScale = lerp(3.0, 1.0, easeOutQuint(slam));
      ctx.scale(stampScale, stampScale);
      if (slam < 1) ctx.globalAlpha = animAlpha * kfOpacity * slam;
    } else if (active && style.animation === 'BLUR_IN') {
      const blurAmt = lerp(18, 0, easeOutQuint(wordProgress));
      ctx.filter = `blur(${blurAmt}px)`;
      ctx.globalAlpha = animAlpha * kfOpacity * Math.min(1, wordProgress * 2.5);
    } else if (active && style.animation === 'SPLIT_OPEN') {
      const t = easeOutQuint(wordProgress);
      ctx.scale(1, Math.max(0.01, t));
      ctx.globalAlpha = animAlpha * kfOpacity * Math.min(1, wordProgress * 4);
    } else if (active && style.animation === 'FLIP_Y') {
      const t = easeOutQuint(wordProgress);
      const flip = Math.max(0.01, Math.abs(Math.cos((1 - t) * Math.PI / 2)));
      ctx.scale(1, flip);
    } else if (active && style.animation === 'SCATTER_IN') {
      const t = easeOutQuint(wordProgress);
      const scatterX = (idx % 2 === 0 ? 50 : -50) * (1 - t) * scaleFactor;
      const scatterY = (idx % 3 === 0 ? -50 : 30) * (1 - t) * scaleFactor;
      const scatterRot = (idx % 2 === 0 ? 0.5 : -0.5) * (1 - t);
      ctx.translate(scatterX, scatterY);
      ctx.rotate(scatterRot);
      ctx.globalAlpha = animAlpha * kfOpacity * t;
    }

    const wHighlight = state.wordHighlight || 'NONE';
    if (wHighlight === 'SPOTLIGHT' && !active) {
      ctx.globalAlpha = animAlpha * kfOpacity * 0.3;
    }

    if (!active && style.opacityInactive !== undefined) {
      ctx.globalAlpha = animAlpha * kfOpacity * style.opacityInactive;
    }

    const wordTiming = caption.words?.[idx - emojiPrefixOffset];
    const iconUrl = wordTiming?.iconUrl;

    if (state?.iconCaptionsEnabled && iconUrl) {
      const img = helpers.getOrLoadImage(iconUrl);
      if (img && img.naturalWidth > 0) {
        const iconSize = fontSize * 1.35;
        const elapsed = renderTime - caption.startTime;
        const entryT = Math.min(elapsed / 0.3, 1);
        
        let popScale = 1;
        if (active) {
          popScale = 1 + elasticOut(Math.min(wordProgress / 0.35, 1)) * 0.25;
        }

        ctx.globalAlpha = animAlpha * kfOpacity * entryT;
        if (!active && style.opacityInactive !== undefined) {
          ctx.globalAlpha *= style.opacityInactive;
        } else if (!active) {
          ctx.globalAlpha *= 0.45;
        }

        ctx.save();
        ctx.translate(0, -iconSize * 0.05);
        
        // Premium shadow / glow
        if (active) {
          ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
          ctx.shadowBlur = 24 * scaleFactor;
        } else {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 6 * scaleFactor;
        }
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 3 * scaleFactor;

        ctx.scale(popScale, popScale);
        ctx.drawImage(img, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
        ctx.restore();
        
        ctx.globalAlpha = animAlpha;
        ctx.restore();
        return;
      }
    }

    // Background drawing
    const isWordMode = style.displayMode === 'WORD';
    if (isWordMode) {
      let bgColor = active && style.activeBackgroundColor
        ? style.activeBackgroundColor
        : style.backgroundColor;

      if (style.specialRenderer === 'PILL_BADGE') {
        const pillPalettes = ['#FFD700', '#FF6B6B', '#4D96FF', '#6BCB77', '#A855F7'];
        bgColor = pillPalettes[idx % pillPalettes.length];
      }

      if (bgColor && wHighlight !== 'BOX') {
        const wMeasure = helpers.getMixedTextWidth(ctx, word, fontSize);
        const p = (style.backgroundPadding || 12) * scaleFactor;
        const r = style.specialRenderer === 'PILL_BADGE' ? fontSize : ((style.backgroundBorderRadius || 0) * scaleFactor);
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(-wMeasure / 2 - p, -fontSize / 2 - p, wMeasure + p * 2, fontSize + p * 2, r);

        if (style.specialRenderer === 'SPEECH_BUBBLE') {
          const isLeft = style.bubbleTailPosition === 'BOTTOM_LEFT';
          const tailX = isLeft ? -wMeasure / 2 + p : wMeasure / 2 - p;
          const dirMultiplier = isLeft ? -1 : 1;
          ctx.moveTo(tailX - (p * 0.5) * dirMultiplier, fontSize / 2 + p);
          ctx.lineTo(tailX, fontSize / 2 + p + 12 * scaleFactor);
          ctx.lineTo(tailX + (p * 0.8) * dirMultiplier, fontSize / 2 + p);
        }

        ctx.fill();
      }
    }

    // FIRE_POP Particle Background
    if (active && style.animation === 'FIRE_POP') {
      const wMeasure = helpers.getMixedTextWidth(ctx, word, fontSize);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const flameCount = 35;

      for (let i = 0; i < flameCount; i++) {
        const isEmber = i > flameCount * 0.7;
        const seed1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
        const seed2 = Math.abs(Math.cos(i * 78.233) * 43758.5453) % 1;
        const seed3 = Math.abs(Math.sin(i * 39.816) * 43758.5453) % 1;

        const speed = isEmber ? 2.5 + seed1 : 1.5 + seed1 * 0.5;
        const phase = (renderTime * speed + i * 0.37) % 1.0;
        const spreadX = (seed2 * 2 - 1) * (wMeasure * 0.6);
        const startY = fontSize * 0.4;
        const endY = -fontSize * (isEmber ? 1.8 + seed3 : 1.1 + seed3 * 0.4);
        const currentY = lerp(startY, endY, Math.pow(phase, 0.8));
        const sway = Math.sin(renderTime * (3 + seed1) + i) * (15 + seed2 * 10) * scaleFactor;
        const currentX = spreadX + sway * phase;

        const baseSize = isEmber ? (fontSize * 0.08) : (fontSize * 0.35 + seed1 * fontSize * 0.15);
        const shrinkCurve = isEmber ? (1 - phase) : (1 - Math.pow(phase, 1.2));
        const currentSize = Math.max(0.1, baseSize * shrinkCurve);

        let r = 255;
        let g = Math.max(0, Math.floor(lerp(240, 0, phase * 1.5)));
        let b = Math.max(0, Math.floor(lerp(100, 0, Math.min(1, phase * 4))));
        let a = Math.max(0, 1 - Math.pow(phase, 1.5));

        ctx.beginPath();
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a * (isEmber ? 0.9 : 0.6)})`;
        ctx.shadowColor = `rgba(${r}, ${Math.max(0, g - 50)}, 0, ${a})`;
        ctx.shadowBlur = (isEmber ? 8 : 15) * scaleFactor;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        if (isEmber) {
          ctx.arc(currentX, currentY, currentSize, 0, Math.PI * 2);
        } else {
          ctx.ellipse(currentX, currentY, currentSize * 0.7, currentSize * 1.4, 0, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      ctx.restore();
    }

    helpers.applyShadow(ctx, style, scaleFactor);
    helpers.applyStroke(ctx, style, scaleFactor, word, fontSize);

    let fill: string | CanvasGradient;

    if (style.specialRenderer === 'PILL_BADGE') {
      fill = '#000000';
      ctx.shadowBlur = 0;
    } else if (style.specialRenderer === 'SPEECH_BUBBLE') {
      fill = active && style.activeTextColor ? style.activeTextColor : (style.textColor || '#1A1A2E');
      ctx.shadowBlur = 0;
    } else if (style.specialRenderer === 'LIQUID_CHROME') {
      const shimmerPhase = (renderTime * 0.6 + idx * 0.15) % 1.0;
      const wGrad = helpers.getMixedTextWidth(ctx, word, fontSize);
      const shimmerGrad = ctx.createLinearGradient(-wGrad / 2, 0, wGrad / 2, 0);
      const goldBright = `hsl(${42 + Math.sin(renderTime * 1.5 + idx) * 12}, 90%, ${active ? 72 : 55}%)`;
      const silver = `hsl(0, 0%, ${active ? 90 : 70}%)`;
      const goldDim = `hsl(${38 + Math.cos(renderTime + idx * 0.5) * 8}, 70%, ${active ? 60 : 45}%)`;
      const pivot = (shimmerPhase + idx * 0.2) % 1.0;
      shimmerGrad.addColorStop(0, silver);
      shimmerGrad.addColorStop(Math.max(0, pivot - 0.3), silver);
      shimmerGrad.addColorStop(pivot, goldBright);
      shimmerGrad.addColorStop(Math.min(1, pivot + 0.3), goldDim);
      shimmerGrad.addColorStop(1, silver);
      fill = shimmerGrad;
    } else if (colorBehavior === 'FIXED') {
      if (style.gradientColors && style.gradientColors.length >= 2) {
        fill = helpers.applyGradientFill(ctx, word, fontSize, style.gradientColors);
      } else {
        fill = style.textColor;
      }
    } else if (colorBehavior === 'ACTIVE_ONLY') {
      if (active && style.activeTextColor) {
        fill = style.activeTextColor;
      } else {
        fill = style.textColor;
        if (!active) ctx.globalAlpha = Math.min(ctx.globalAlpha, style.opacityInactive ?? 0.35);
      }
    } else if (colorBehavior === 'CONTEXTUAL') {
      if (caption.wordColors && caption.wordColors[idx] && caption.wordColors[idx] !== 'default') {
        fill = caption.wordColors[idx];
      } else {
        fill = COLOR_POP_PALETTE[idx % COLOR_POP_PALETTE.length];
      }
      if (active && style.activeTextColor) fill = style.activeTextColor;
    } else {
      if (active && style.activeGradientColors && style.activeGradientColors.length >= 2) {
        // Hyper-Impact Bold (Hormozi Gradient): emphasized word gets the orange→yellow gradient.
        fill = helpers.applyGradientFill(ctx, word, fontSize, style.activeGradientColors);
      } else if (active && style.activeTextColor) {
        fill = style.activeTextColor;
      } else if (style.gradientColors && style.gradientColors.length >= 2) {
        fill = helpers.applyGradientFill(ctx, word, fontSize, style.gradientColors);
      } else {
        fill = style.textColor;
      }
      // Per-word AI colors override the base fill — but never the active gradient keyword.
      if (
        !(active && style.activeGradientColors && style.activeGradientColors.length >= 2) &&
        caption.wordColors && caption.wordColors[idx] && caption.wordColors[idx] !== 'default'
      ) {
        fill = caption.wordColors[idx];
      }
    }

    // Speaker color — tints inactive words by detected speaker (non-destructive: only
    // applies when no other active color override is in effect, and only for SPEAKER_2+)
    if (!active && caption.words) {
      const timingWord = caption.words[idx - emojiPrefixOffset];
      if (timingWord?.speakerLabel && timingWord.speakerLabel !== 'SPEAKER_1') {
        fill = speakerColor(timingWord.speakerLabel);
      }
    }

    if (wHighlight === 'COLOR_POP') {
      fill = COLOR_POP_PALETTE[idx % COLOR_POP_PALETTE.length];
    }
    if (wHighlight === 'KARAOKE' && active) {
      fill = '#FACC15';
    } else if (wHighlight === 'KARAOKE' && !active) {
      ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.5);
    }

    if (kfColor !== undefined) {
      fill = kfColor;
    }

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    helpers.applyShadow(ctx, style, scaleFactor);

    if (wHighlight === 'BOX' && active) {
      const wMeasure = helpers.getMixedTextWidth(ctx, word, fontSize);
      const boxPad = 6 * scaleFactor;
      ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
      ctx.beginPath();
      ctx.roundRect(-wMeasure / 2 - boxPad, -fontSize / 2 - boxPad * 0.5, wMeasure + boxPad * 2, fontSize + boxPad, 4 * scaleFactor);
      ctx.fill();
      fill = '#000000';
    }

    // DUAL_COLOR
    if (style.specialRenderer === 'DUAL_COLOR') {
      const wMeasure = helpers.getMixedTextWidth(ctx, word, fontSize);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-wMeasure, -fontSize, wMeasure * 2, fontSize * 0.55);
      ctx.clip();
      const goldFill = active && style.activeTextColor ? style.activeTextColor : '#FFD700';
      helpers.drawMixedText(ctx, word, fontSize, goldFill, 0, 0, false);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(-wMeasure, -fontSize * 0.45, wMeasure * 2, fontSize * 1.5);
      ctx.clip();
      helpers.drawMixedText(ctx, word, fontSize, '#FFFFFF', 0, 0, false);
      ctx.restore();
    } else {
      helpers.drawMixedText(ctx, word, fontSize, fill as string | CanvasGradient, 0, 0, false);
    }

    // KARAOKE highlight filling
    if (active && style.animation === 'KARAOKE' && style.activeTextColor) {
      ctx.save();
      const wordWidth = helpers.getMixedTextWidth(ctx, word, fontSize);
      ctx.beginPath();
      ctx.rect(-wordWidth / 2 - 2, -fontSize, (wordWidth + 4) * wordProgress, fontSize * 2);
      ctx.clip();
      helpers.drawMixedText(ctx, word, fontSize, style.activeTextColor, 0, 0, false);
      ctx.restore();
    }

    // UNDERLINE
    if (wHighlight === 'UNDERLINE' && active) {
      const wMeasure = helpers.getMixedTextWidth(ctx, word, fontSize);
      const underlineY = fontSize * 0.65;
      const underlineWidth = wMeasure * wordProgress;
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 3 * scaleFactor;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-wMeasure / 2, underlineY);
      ctx.lineTo(-wMeasure / 2 + underlineWidth, underlineY);
      ctx.stroke();
      ctx.restore();
    }

    // FIRE
    if (wHighlight === 'FIRE' && active) {
      const fireFlicker = 0.85 + Math.sin(renderTime * 18.3 + idx * 2.1) * 0.15;
      ctx.save();
      ctx.shadowColor = '#FF6B00';
      ctx.shadowBlur = 20 * scaleFactor * fireFlicker;
      helpers.drawMixedText(ctx, word, fontSize, '#FFEE00', 0, 0, false);
      ctx.restore();
    }

    // RAINBOW
    if (wHighlight === 'RAINBOW') {
      const hue = (renderTime * 80 + idx * 45) % 360;
      if (active) {
        ctx.save();
        ctx.shadowColor = `hsl(${hue},100%,60%)`;
        ctx.shadowBlur = 18 * scaleFactor;
        helpers.drawMixedText(ctx, word, fontSize, `hsl(${hue},100%,65%)`, 0, 0, false);
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.6);
        helpers.drawMixedText(ctx, word, fontSize, `hsl(${(hue + 120) % 360},80%,60%)`, 0, 0, false);
        ctx.restore();
      }
    }

    // SPARKLE
    if (wHighlight === 'SPARKLE' && active) {
      const wMeasure = helpers.getMixedTextWidth(ctx, word, fontSize);
      ctx.save();
      ctx.shadowBlur = 0;
      const sparkleCount = 6;
      for (let s = 0; s < sparkleCount; s++) {
        const angle = (s / sparkleCount) * Math.PI * 2 + renderTime * 2.5;
        const radius = (wMeasure * 0.65) + Math.sin(renderTime * 4 + s * 1.3) * (wMeasure * 0.15);
        const sx = Math.cos(angle) * radius;
        const sy = Math.sin(angle) * radius * 0.5;
        const sparkAlpha = 0.6 + Math.sin(renderTime * 8 + s * 2.1) * 0.4;
        const sparkSize = (2 + Math.sin(renderTime * 6 + s) * 1.5) * scaleFactor;
        ctx.globalAlpha = sparkAlpha;
        ctx.fillStyle = ['#FFD700', '#FF69B4', '#00FFFF', '#A855F7', '#FF6B6B', '#7FFF00'][s % 6];
        ctx.beginPath();
        ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  };

  if (style.displayMode === 'WORD') {
    if (activeWordIndex >= 0 && activeWordIndex < words.length) {
      const currWord = words[activeWordIndex];
      const wordTiming = caption.words?.[activeWordIndex - emojiPrefixOffset];
      const iconUrl = wordTiming?.iconUrl || KEYWORD_ICON_MAP[currWord.toLowerCase()];
      let halfW;
      if (state?.iconCaptionsEnabled && iconUrl) {
        halfW = (fontSize * 1.35) / 2;
      } else {
        halfW = helpers.getMixedTextWidth(ctx, currWord, fontSize) / 2;
      }
      const safeLeft = halfW + canvas.width * 0.04;
      const safeRight = canvas.width - halfW - canvas.width * 0.04;
      const clampedX = Math.max(safeLeft, Math.min(safeRight, anchorX));
      const safeTopY = canvas.height * 0.06;
      const safeBottomY = canvas.height * 0.96;
      const clampedY = Math.max(safeTopY, Math.min(safeBottomY, anchorY));

      drawWord(currWord, clampedX, clampedY, true, activeWordIndex);
    }
  } else {
    // BLOCK mode
    const maxWidth = canvas.width * 0.8;
    const lines: { text: string; words: string[]; startIndex: number }[] = [];
    let currentLineWords: string[] = [];
    let currentLineWidth = 0;
    let currentLineStartIndex = 0;

    words.forEach((word, index) => {
      const wordTiming = caption.words?.[index - emojiPrefixOffset];
      const iconUrl = wordTiming?.iconUrl;
      let wWidth;
      if (state?.iconCaptionsEnabled && iconUrl) {
        wWidth = fontSize * 1.35;
      } else {
        wWidth = helpers.getMixedTextWidth(ctx, word, fontSize);
      }
      const newWidth = currentLineWidth + wWidth + (currentLineWords.length > 0 ? spaceWidth : 0);

      if (newWidth > maxWidth && currentLineWords.length > 0) {
        lines.push({ text: currentLineWords.join(' '), words: currentLineWords, startIndex: currentLineStartIndex });
        currentLineWords = [word];
        currentLineWidth = wWidth;
        currentLineStartIndex = index;
      } else {
        currentLineWords.push(word);
        currentLineWidth = newWidth;
      }
    });
    if (currentLineWords.length > 0) {
      lines.push({ text: currentLineWords.join(' '), words: currentLineWords, startIndex: currentLineStartIndex });
    }

    const lineHeight = fontSize * 1.3;
    const totalHeight = lines.length * lineHeight;
    const safeBottom = canvas.height * 0.92;
    const safeTop = canvas.height * 0.15;

    let effectiveY = anchorY;
    if (effectiveY + totalHeight / 2 > safeBottom) effectiveY = safeBottom - totalHeight / 2;
    else if (effectiveY - totalHeight / 2 < safeTop) effectiveY = safeTop + totalHeight / 2;

    let startY = effectiveY - totalHeight / 2 + lineHeight / 2;

    lines.forEach((line) => {
      let lineWidth = 0;
      line.words.forEach((w, i) => {
        const globalIndex = line.startIndex + i;
        const wordTiming = caption.words?.[globalIndex - emojiPrefixOffset];
        const iconUrl = wordTiming?.iconUrl;
        if (state?.iconCaptionsEnabled && iconUrl) {
          lineWidth += fontSize * 1.35;
        } else {
          lineWidth += helpers.getMixedTextWidth(ctx, w, fontSize);
        }
        if (i > 0) lineWidth += spaceWidth;
      });
      let curX = anchorX - (style.textAlign === 'center' ? lineWidth / 2 : style.textAlign === 'right' ? lineWidth : 0);

      if (style.backgroundColor) {
        const p = (style.backgroundPadding || 12) * scaleFactor;
        const r = (style.backgroundBorderRadius || 0) * scaleFactor;
        const bgX = curX - p;
        const bgY = startY - fontSize / 2 - p;
        const bgW = lineWidth + p * 2;
        const bgH = fontSize + p * 2;
        ctx.save();
        ctx.fillStyle = style.backgroundColor;

        if (style.specialRenderer === 'SPEECH_BUBBLE') {
          const tailH = 18 * scaleFactor;
          const tailW = 20 * scaleFactor;
          const tailCenterX = bgX + bgW / 2;

          ctx.beginPath();
          ctx.roundRect(bgX, bgY, bgW, bgH, r);
          ctx.fill();

          if (style.strokeColor && style.strokeWidth) {
            ctx.strokeStyle = style.strokeColor;
            ctx.lineWidth = (style.strokeWidth || 3) * scaleFactor;
            ctx.lineJoin = 'round';
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.moveTo(tailCenterX - tailW / 2, bgY + bgH - 1);
          ctx.lineTo(tailCenterX, bgY + bgH + tailH);
          ctx.lineTo(tailCenterX + tailW / 2, bgY + bgH - 1);
          ctx.closePath();
          ctx.fill();

          if (style.strokeColor && style.strokeWidth) {
            ctx.strokeStyle = style.strokeColor;
            ctx.lineWidth = (style.strokeWidth || 3) * scaleFactor;
            ctx.lineJoin = 'round';
            ctx.stroke();
          }
        } else {
          ctx.beginPath();
          ctx.roundRect(bgX, bgY, bgW, bgH, r);
          ctx.fill();
        }
        ctx.restore();
      }

      line.words.forEach((w, i) => {
        const globalIndex = line.startIndex + i;
        const wordTiming = caption.words?.[globalIndex - emojiPrefixOffset];
        const iconUrl = wordTiming?.iconUrl;
        let wWidth;
        if (state?.iconCaptionsEnabled && iconUrl) {
          wWidth = fontSize * 1.35;
        } else {
          wWidth = helpers.getMixedTextWidth(ctx, w, fontSize);
        }
        drawWord(w, curX + wWidth / 2, startY, globalIndex === activeWordIndex, globalIndex);
        curX += wWidth + spaceWidth;
      });
      startY += lineHeight;
    });
  }
}
