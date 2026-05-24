import { Caption, StyleConfig, TypographyLayer } from '../../../types';
import { RenderHelpers } from '../types';

export function drawTypographyCaption(
  helpers: RenderHelpers,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  caption: Caption,
  style: StyleConfig,
  scaleFactor: number,
  anchorX: number,
  anchorY: number,
  renderTime: number
): void {
  if (!caption.text || !style.typographyLayout) return;

  const layout = style.typographyLayout;
  const elapsed = renderTime - caption.startTime;
  const duration = caption.endTime - caption.startTime;

  // Split caption text into words
  const rawText = caption.text.trim();
  const allWords = rawText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = allWords.length;
  if (wordCount === 0) return;

  // Determine accent word index:
  // - If config has accentWordIndex AND caption has enough words → use it
  // - Otherwise → find the LONGEST word (most visually impactful)
  // - Edge cases: 1 word → 0; 2 words → 1
  let accentIdx: number;
  if (wordCount === 1) {
    accentIdx = 0;
  } else if (wordCount === 2) {
    accentIdx = 1;
  } else if (layout.accentWordIndex !== undefined && layout.accentWordIndex < wordCount) {
    accentIdx = layout.accentWordIndex;
  } else {
    // Auto-detect: pick the longest word (ignoring punctuation)
    let maxLen = 0;
    let maxIdx = Math.floor(wordCount / 2); // fallback to middle
    allWords.forEach((w, i) => {
      const clean = w.replace(/[^\w]/g, '');
      if (clean.length > maxLen) { maxLen = clean.length; maxIdx = i; }
    });
    accentIdx = maxIdx;
  }

  // Helper: get text for a layer based on textSource
  const getLayerText = (layer: TypographyLayer): string => {
    switch (layer.textSource) {
      case 'ALL':
        return style.uppercase ? rawText.toUpperCase() : rawText;
      case 'ACCENT_WORD':
        return layer.uppercase
          ? (allWords[accentIdx] || '').toUpperCase()
          : (allWords[accentIdx] || '');
      case 'FIRST_LINE': {
        // Words before the accent word
        const pre = allWords.slice(0, accentIdx).join(' ');
        return layer.uppercase ? pre.toUpperCase() : pre;
      }
      case 'LAST_LINE': {
        // Words after the accent word
        const post = allWords.slice(accentIdx + 1).join(' ');
        return layer.uppercase ? post.toUpperCase() : post;
      }
      case 'WORD_N': {
        const idx = layer.wordIndex ?? 0;
        const w = allWords[idx] || '';
        return layer.uppercase ? w.toUpperCase() : w;
      }
      case 'WORD_RANGE': {
        const start = layer.wordRangeStart ?? 0;
        const end = layer.wordRangeEnd ?? wordCount - 1;
        const slice = allWords.slice(start, end + 1).join(' ');
        return layer.uppercase ? slice.toUpperCase() : slice;
      }
      default:
        return rawText;
    }
  };

  // Helper: draw letter-spaced text at (x, y), returns total width drawn
  const drawTrackedText = (
    text: string,
    x: number,
    y: number,
    tracking: number,
    align: 'left' | 'center' | 'right'
  ): number => {
    const chars = Array.from(text);
    const charWidths = chars.map(c => ctx.measureText(c).width);
    const totalW = charWidths.reduce((s, w) => s + w, 0) + Math.max(0, chars.length - 1) * tracking;

    let startX = x;
    if (align === 'center') startX = x - totalW / 2;
    else if (align === 'right') startX = x - totalW;

    ctx.save();
    ctx.textAlign = 'left'; // Force left since we are manually calculating startX

    let cx = startX;
    chars.forEach((c, i) => {
      ctx.fillText(c, cx, y);
      cx += charWidths[i] + tracking;
    });
    ctx.restore();
    return totalW;
  };

  // Helper: draw gradient text (respects left/center/right alignment for gradient bounds)
  const drawGradientText = (
    text: string,
    x: number,
    y: number,
    tracking: number,
    align: 'left' | 'center' | 'right',
    gradColors: string[],
    approxW: number
  ): void => {
    // Compute the actual pixel start/end of the text based on alignment
    let gradStartX: number;
    let gradEndX: number;
    if (align === 'left') {
      gradStartX = x;
      gradEndX = x + approxW;
    } else if (align === 'right') {
      gradStartX = x - approxW;
      gradEndX = x;
    } else {
      // center
      gradStartX = x - approxW / 2;
      gradEndX = x + approxW / 2;
    }
    const grad = ctx.createLinearGradient(gradStartX, y, gradEndX, y);
    gradColors.forEach((c, i) => grad.addColorStop(i / (gradColors.length - 1), c));
    ctx.fillStyle = grad;
    drawTrackedText(text, x, y, tracking, align);
  };

  // Easing helpers (local copies for closure)
  const _easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
  const _backEaseOut = (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  // ── PRE-PASS: compute actual rendered font sizes for all layers (with auto-fit) ──
  // This lets us auto-stack Y positions based on real heights rather than fixed offsets.
  const maxTextW = canvas.width * 0.88;
  const spacing = (layout.verticalSpacing || 8) * scaleFactor;

  const layerMeta: Array<{ text: string; fontSize: number; lineH: number }> = layout.layers.map(layer => {
    const text = getLayerText(layer);
    let fs = layer.fontSize * scaleFactor;
    const minFS = 10 * scaleFactor;
    if (text) {
      // Probe font size
      const testFont = `${layer.italic ? 'italic ' : ''}${layer.fontWeight} ${fs}px ${layer.fontFamily}`;
      helpers.setFont(ctx, testFont);
      const tracking0 = (layer.letterSpacing || 0) * scaleFactor;
      let w = ctx.measureText(text).width + Math.max(0, text.length - 1) * tracking0;
      if (w > maxTextW && fs > minFS) {
        let lo = minFS, hi = fs;
        for (let i = 0; i < 12; i++) {
          const mid = (lo + hi) / 2;
          helpers.setFont(ctx, `${layer.italic ? 'italic ' : ''}${layer.fontWeight} ${mid}px ${layer.fontFamily}`);
          const tw = ctx.measureText(text).width + Math.max(0, text.length - 1) * ((layer.letterSpacing || 0) * (mid / layer.fontSize));
          if (tw <= maxTextW) lo = mid; else hi = mid;
        }
        fs = lo;
      }
    }
    return { text, fontSize: fs, lineH: fs * 1.15 };
  });

  // Compute total block height and auto-stack Y positions
  const totalBlockH = layerMeta.reduce((sum, m) => sum + m.lineH, 0) + spacing * (layout.layers.length - 1);
  const blockTopY = anchorY - totalBlockH / 2;
  const layerAutoY: number[] = [];
  let curY = blockTopY;
  for (let i = 0; i < layerMeta.length; i++) {
    const m = layerMeta[i];
    const layer = layout.layers[i];
    layerAutoY.push(curY + m.lineH / 2 + (layer.yOffset || 0) * scaleFactor); // center of this line with explicit offset override
    curY += m.lineH + spacing;
  }

  // Draw optional background panel (from style-level config)
  // Detect dominant alignment from layers to position the bg correctly
  const dominantAlign = layout.layers.length > 0
    ? (layout.layers.filter(l => (l.textAlign || 'center') === 'left').length > layout.layers.length / 2 ? 'left'
      : layout.layers.filter(l => (l.textAlign || 'center') === 'right').length > layout.layers.length / 2 ? 'right'
        : 'center')
    : 'center';

  if (style.backgroundColor && style.backgroundColor !== 'rgba(0,0,0,0.0)') {
    const pad = (style.backgroundPadding || 24) * scaleFactor;
    const totalH = totalBlockH + pad * 2;
    const totalW = dominantAlign === 'center' ? canvas.width * 0.88 : canvas.width * 0.92;
    const bgX = dominantAlign === 'left' ? canvas.width * 0.04
      : dominantAlign === 'right' ? canvas.width * 0.96 - totalW
        : anchorX - totalW / 2;
    const bgY = anchorY - totalH / 2;
    const rad = (style.backgroundBorderRadius || 0) * scaleFactor;
    ctx.save();
    ctx.fillStyle = style.backgroundColor;
    if (rad > 0) {
      ctx.beginPath();
      ctx.moveTo(bgX + rad, bgY);
      ctx.lineTo(bgX + totalW - rad, bgY);
      ctx.quadraticCurveTo(bgX + totalW, bgY, bgX + totalW, bgY + rad);
      ctx.lineTo(bgX + totalW, bgY + totalH - rad);
      ctx.quadraticCurveTo(bgX + totalW, bgY + totalH, bgX + totalW - rad, bgY + totalH);
      ctx.lineTo(bgX + rad, bgY + totalH);
      ctx.quadraticCurveTo(bgX, bgY + totalH, bgX, bgY + totalH - rad);
      ctx.lineTo(bgX, bgY + rad);
      ctx.quadraticCurveTo(bgX, bgY, bgX + rad, bgY);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(bgX, bgY, totalW, totalH);
    }
    ctx.restore();
  }

  // Render each layer — use pre-computed layerAutoY and layerMeta for correct sizing/positioning
  for (let li = 0; li < layout.layers.length; li++) {
    const layer = layout.layers[li];
    const meta = layerMeta[li];
    const text = meta.text;
    if (!text) continue;

    const layerElapsed = elapsed - (layer.entryDelay || 0);
    const layerDuration = layer.entryDuration || 0.3;
    const rawT = Math.max(0, Math.min(layerElapsed / layerDuration, 1));

    // Compute entry progress based on entryType
    let entryT = rawT;
    let offsetY = 0;
    let scaleX = 1, scaleY = 1;
    let wipeClip = false;
    let wipeProgress = 1;

    switch (layer.entryType) {
      case 'FADE':
        entryT = _easeOutQuint(rawT);
        break;
      case 'SLIDE_UP':
        entryT = _easeOutQuint(rawT);
        offsetY = (1 - entryT) * 28 * scaleFactor;
        break;
      case 'SCALE_POP': {
        const popT = _backEaseOut(Math.min(rawT / 0.7, 1));
        scaleX = 0.55 + 0.45 * popT;
        scaleY = 0.55 + 0.45 * popT;
        entryT = _easeOutQuint(rawT);
        break;
      }
      case 'WIPE_RIGHT':
      case 'WIPE_LEFT':
        wipeClip = true;
        wipeProgress = _easeOutQuint(rawT);
        entryT = rawT > 0 ? 1 : 0;
        break;
      case 'NONE':
      default:
        entryT = rawT >= 0 ? 1 : 0;
        break;
    }

    if (layerElapsed < 0) continue; // layer not yet started

    // Use pre-computed font size (already auto-fit to canvas width)
    const fontSize = meta.fontSize;
    const tracking = (layer.letterSpacing || 0) * scaleFactor;
    const align = layer.textAlign || 'center';

    // ── X position: left-aligned layers use left margin; centered use anchorX ──
    const leftMargin = canvas.width * 0.06;
    const rightMargin = canvas.width * 0.94;
    let layerX: number;
    if (align === 'left') {
      layerX = leftMargin + (layer.xOffset || 0) * scaleFactor;
    } else if (align === 'right') {
      layerX = rightMargin + (layer.xOffset || 0) * scaleFactor;
    } else {
      layerX = anchorX + (layer.xOffset || 0) * scaleFactor;
    }

    // Use auto-stacked Y position (ignores config yOffset for correct layout)
    const layerY = layerAutoY[li];

    // Set font
    const fontStr = `${layer.italic ? 'italic ' : ''}${layer.fontWeight} ${fontSize}px ${layer.fontFamily}`;
    helpers.setFont(ctx, fontStr);
    ctx.textBaseline = 'middle';
    ctx.textAlign = align;

    // Measure with final font
    let approxW = ctx.measureText(text).width + Math.max(0, text.length - 1) * tracking;

    ctx.save();

    // Apply wipe clip
    if (wipeClip) {
      ctx.save();
      // For left-aligned, clip starts at layerX; for centered, clip centered on layerX
      const clipStartX = align === 'left' ? layerX : layerX - approxW / 2;
      const clipW = approxW * 1.1 * wipeProgress;
      const clipX = layer.entryType === 'WIPE_LEFT'
        ? clipStartX + approxW - clipW
        : clipStartX;
      ctx.beginPath();
      ctx.rect(clipX, layerY - fontSize, clipW, fontSize * 2.2);
      ctx.clip();
    }

    // Apply entry alpha
    ctx.globalAlpha = Math.max(0, Math.min(layer.opacity ?? 1, entryT));

    // Apply scale transform (centered on layerX, layerY + offsetY)
    const drawY = layerY + offsetY;
    if (scaleX !== 1 || scaleY !== 1) {
      ctx.translate(layerX, drawY);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-layerX, -drawY);
    }

    // Draw per-layer background highlight box
    if (layer.backgroundFill) {
      const pad = (layer.backgroundPadding || 8) * scaleFactor;
      const bgW = approxW + pad * 2;
      const bgH = fontSize + pad * 1.4;
      const bgX = layerX - bgW / 2;
      const bgY = drawY - bgH / 2;
      const bRad = (layer.backgroundBorderRadius || 4) * scaleFactor;
      ctx.save();
      ctx.fillStyle = layer.backgroundFill;
      if (bRad > 0) {
        ctx.beginPath();
        ctx.moveTo(bgX + bRad, bgY);
        ctx.lineTo(bgX + bgW - bRad, bgY);
        ctx.quadraticCurveTo(bgX + bgW, bgY, bgX + bgW, bgY + bRad);
        ctx.lineTo(bgX + bgW, bgY + bgH - bRad);
        ctx.quadraticCurveTo(bgX + bgW, bgY + bgH, bgX + bgW - bRad, bgY + bgH);
        ctx.lineTo(bgX + bRad, bgY + bgH);
        ctx.quadraticCurveTo(bgX, bgY + bgH, bgX, bgY + bgH - bRad);
        ctx.lineTo(bgX, bgY + bRad);
        ctx.quadraticCurveTo(bgX, bgY, bgX + bRad, bgY);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(bgX, bgY, bgW, bgH);
      }
      ctx.restore();
    }

    // Apply shadow
    if (layer.shadowColor) {
      ctx.shadowColor = layer.shadowColor;
      ctx.shadowBlur = (layer.shadowBlur || 0) * scaleFactor;
      ctx.shadowOffsetX = (layer.shadowOffsetX || 0) * scaleFactor;
      ctx.shadowOffsetY = (layer.shadowOffsetY || 0) * scaleFactor;
    }

    // Draw stroke pass (if set)
    if (layer.strokeColor && layer.strokeWidth) {
      ctx.strokeStyle = layer.strokeColor;
      ctx.lineWidth = layer.strokeWidth * scaleFactor;
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      // Stroke each char individually for tracked text
      const chars = Array.from(text);
      const charWidths = chars.map(c => ctx.measureText(c).width);
      const totalW = charWidths.reduce((s, w) => s + w, 0) + Math.max(0, chars.length - 1) * tracking;
      let sx = align === 'center' ? layerX - totalW / 2
        : align === 'right' ? layerX - totalW : layerX;
      chars.forEach((c, i) => {
        ctx.strokeText(c, sx, drawY);
        sx += charWidths[i] + tracking;
      });
      // Re-apply shadow for fill pass
      if (layer.shadowColor) {
        ctx.shadowColor = layer.shadowColor;
        ctx.shadowBlur = (layer.shadowBlur || 0) * scaleFactor;
        ctx.shadowOffsetX = (layer.shadowOffsetX || 0) * scaleFactor;
        ctx.shadowOffsetY = (layer.shadowOffsetY || 0) * scaleFactor;
      }
    }

    // Draw fill (gradient or solid)
    if (layer.gradientColors && layer.gradientColors.length >= 2) {
      drawGradientText(text, layerX, drawY, tracking, align, layer.gradientColors, approxW);
    } else {
      ctx.fillStyle = layer.color;
      drawTrackedText(text, layerX, drawY, tracking, align);
    }

    // Draw underline decoration
    if (layer.underline) {
      const ulThickness = (layer.underlineThickness || 2) * scaleFactor;
      const ulOffset = (layer.underlineOffset || 6) * scaleFactor;
      const ulY = drawY + fontSize * 0.5 + ulOffset;
      const ulW = approxW;
      const ulX = align === 'center' ? layerX - ulW / 2
        : align === 'right' ? layerX - ulW : layerX;
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = layer.underlineColor || layer.color;
      ctx.fillRect(ulX, ulY, ulW, ulThickness);
    }

    ctx.restore();

    // Close wipe clip save
    if (wipeClip) {
      ctx.restore();
    }
  }
}
