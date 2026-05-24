import gsap from 'gsap';
import { Caption, CaptionStyle, StyleConfig } from '../types';

export interface HyperRenderState {
  captions: Caption[];
  activeConfig: StyleConfig;
  currentStyle: CaptionStyle;
  fontScale: number;
  verticalPos: number;
  horizontalPos: number;
  isPlaying: boolean;
}

// Split text into individual character spans for per-character animation
function splitToChars(text: string, className: string): HTMLElement[] {
  return text.split('').map(ch => {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = ch === ' ' ? ' ' : ch;
    span.style.display = 'inline-block';
    return span;
  });
}

// Split text into word spans
function splitToWords(text: string, className: string): HTMLElement[] {
  return text.split(' ').filter(Boolean).map(word => {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = word;
    span.style.display = 'inline-block';
    span.style.marginRight = '0.25em';
    return span;
  });
}

export class HyperCaptionRenderer {
  private container: HTMLElement | null = null;
  private lastCaptionId: string | null = null;
  private activeTimeline: gsap.core.Timeline | null = null;
  private idleTimeline: gsap.core.Timeline | null = null;
  private wordTimers: ReturnType<typeof setInterval>[] = [];
  private videoEl: HTMLVideoElement | null = null;

  mount(container: HTMLElement, videoEl?: HTMLVideoElement) {
    this.container = container;
    this.videoEl = videoEl ?? null;
    this.container.style.cssText = `
      position: absolute; inset: 0;
      pointer-events: none;
      display: flex; align-items: flex-end; justify-content: center;
      overflow: hidden;
      z-index: 20;
    `;
  }

  unmount() {
    this.killAll();
    if (this.container) this.container.innerHTML = '';
    this.container = null;
    this.videoEl = null;
  }

  private killAll() {
    this.activeTimeline?.kill();
    this.idleTimeline?.kill();
    this.wordTimers.forEach(t => clearInterval(t));
    this.wordTimers = [];
    this.activeTimeline = null;
    this.idleTimeline = null;
  }

  render(state: HyperRenderState, currentTime: number) {
    if (!this.container) return;

    const { captions, activeConfig, currentStyle, fontScale, verticalPos, horizontalPos } = state;

    // Find active caption
    const active = captions.find(c => currentTime >= c.startTime && currentTime < c.endTime) ?? null;

    if (!active) {
      if (this.lastCaptionId !== null) {
        this.killAll();
        this.container.innerHTML = '';
        this.lastCaptionId = null;
      }
      return;
    }

    // Same caption — update active word highlighting only
    if (active.id === this.lastCaptionId) {
      this.updateActiveWord(active, currentTime, currentStyle);
      return;
    }

    // New caption — rebuild DOM
    this.killAll();
    this.container.innerHTML = '';
    this.lastCaptionId = active.id;

    // Scale font size the same way captionRenderer.ts does:
    // scaleFactor = (canvas.height / 1000) * fontScale
    // For HTML overlay we use the container's CSS height as the reference.
    const containerHeight = this.container.clientHeight || 600;
    const scaleFactor = (containerHeight / 1000) * fontScale;
    const fontSize = Math.round(activeConfig.fontSize * scaleFactor);
    const text = activeConfig.uppercase ? active.text.toUpperCase() : active.text;

    switch (currentStyle) {
      case CaptionStyle.HYPER_GLITCH:
        this.renderGlitch(text, fontSize, active, currentTime);
        break;
      case CaptionStyle.HYPER_NEON_TUBE:
        this.renderNeonTube(text, fontSize, activeConfig, active, currentTime);
        break;
      case CaptionStyle.HYPER_3D_EXTRUDE:
        this.renderExtrude(text, fontSize, active, currentTime);
        break;
      case CaptionStyle.HYPER_GLASS_FROST:
        this.renderGlassFrost(text, fontSize, activeConfig, active, currentTime);
        break;
      case CaptionStyle.HYPER_GRADIENT_WAVE:
        this.renderGradientWave(text, fontSize, active, currentTime);
        break;
    }

    this.positionContainer(verticalPos, horizontalPos);
  }

  // ─── HYPER_GLITCH ────────────────────────────────────────────────────────────

  private renderGlitch(text: string, fontSize: number, caption: Caption, currentTime: number) {
    if (!this.container) return;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative; text-align: center;
      max-width: 88%; word-break: break-word;
    `;

    const makeLayer = (color: string, dx: number, dy: number, blend: string) => {
      const el = document.createElement('div');
      el.textContent = text;
      el.style.cssText = `
        position: absolute; inset: 0;
        font-family: 'Anton', sans-serif;
        font-size: ${fontSize}px; font-weight: 400;
        color: ${color}; text-transform: uppercase;
        text-shadow: none; white-space: pre-wrap; word-break: break-word;
        transform: translate(${dx}px, ${dy}px);
        mix-blend-mode: ${blend};
        pointer-events: none;
      `;
      return el;
    };

    // Base white layer
    const base = document.createElement('div');
    base.textContent = text;
    base.style.cssText = `
      font-family: 'Anton', sans-serif;
      font-size: ${fontSize}px; font-weight: 400;
      color: #FFFFFF; text-transform: uppercase;
      white-space: pre-wrap; word-break: break-word;
      position: relative; z-index: 2;
      text-shadow: 0 0 8px rgba(255,255,255,0.3);
    `;

    const redLayer = makeLayer('rgba(255,0,80,0.85)', 3, -1, 'screen');
    const cyanLayer = makeLayer('rgba(0,255,220,0.85)', -3, 1, 'screen');
    const greenLayer = makeLayer('rgba(0,255,80,0.5)', 1, 2, 'screen');

    // Scan lines overlay
    const scanLines = document.createElement('div');
    scanLines.style.cssText = `
      position: absolute; inset: 0; pointer-events: none; z-index: 10;
      background: repeating-linear-gradient(
        0deg, transparent, transparent 2px,
        rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px
      );
    `;

    wrapper.appendChild(redLayer);
    wrapper.appendChild(cyanLayer);
    wrapper.appendChild(greenLayer);
    wrapper.appendChild(base);
    wrapper.appendChild(scanLines);
    this.container.appendChild(wrapper);

    // Entry: glitch jitter
    this.activeTimeline = gsap.timeline();
    gsap.set(wrapper, { opacity: 0, x: 0 });

    this.activeTimeline
      .to(wrapper, { opacity: 1, duration: 0.05 })
      .to([redLayer, cyanLayer], { x: (i) => (i === 0 ? 8 : -8), duration: 0.05 })
      .to([redLayer, cyanLayer], { x: (i) => (i === 0 ? -5 : 5), duration: 0.04 })
      .to([redLayer, cyanLayer], { x: (i) => (i === 0 ? 3 : -3), duration: 0.08 })
      .to([redLayer, cyanLayer], { x: (i) => (i === 0 ? 3 : -3), duration: 0 }); // settle

    // Periodic jitter idle
    this.idleTimeline = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
    this.idleTimeline
      .to([redLayer, cyanLayer], { x: (i) => (i === 0 ? 12 : -12), duration: 0.04 })
      .to([redLayer, cyanLayer], { x: (i) => (i === 0 ? -6 : 6), duration: 0.03 })
      .to(wrapper, { skewX: 3, duration: 0.03 })
      .to(wrapper, { skewX: 0, duration: 0.04 })
      .to([redLayer, cyanLayer], { x: (i) => (i === 0 ? 3 : -3), duration: 0.08 });
  }

  // ─── HYPER_NEON_TUBE ─────────────────────────────────────────────────────────

  private renderNeonTube(text: string, fontSize: number, config: StyleConfig, caption: Caption, currentTime: number) {
    if (!this.container) return;

    const color = config.textColor || '#ff6ec7';
    const words = splitToWords(text, 'hyper-neon-word');

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      text-align: center; display: flex; flex-wrap: wrap;
      justify-content: center; gap: 0.15em;
      max-width: 88%;
    `;

    words.forEach(word => {
      word.style.cssText += `
        font-family: 'Bebas Neue', 'Anton', display;
        font-size: ${fontSize}px;
        color: ${color};
        -webkit-text-stroke: 1px ${color};
        text-shadow:
          0 0 4px ${color},
          0 0 10px ${color},
          0 0 20px ${color},
          0 0 40px ${color},
          0 0 80px ${color}80,
          0 0 120px ${color}40;
        transition: text-shadow 0.15s ease;
      `;
      wrapper.appendChild(word);
    });

    this.container.appendChild(wrapper);

    // Entry: flicker warm-up
    this.activeTimeline = gsap.timeline();
    gsap.set(words, { opacity: 0 });
    this.activeTimeline
      .to(words, { opacity: 0.3, duration: 0.06, stagger: 0.04 })
      .to(words, { opacity: 1, duration: 0.05, stagger: 0.03 })
      .to(words, { opacity: 0.6, duration: 0.04, stagger: 0.02 })
      .to(words, { opacity: 1, duration: 0.12, stagger: 0.02 });

    // Idle flicker
    this.idleTimeline = gsap.timeline({ repeat: -1, repeatDelay: 2.5 });
    this.idleTimeline
      .to(wrapper, { opacity: 0.7, duration: 0.08 })
      .to(wrapper, { opacity: 1, duration: 0.05 })
      .to(wrapper, { opacity: 0.85, duration: 0.06 })
      .to(wrapper, { opacity: 1, duration: 0.1 });

    // Animate active word brightness
    this.trackActiveWord(caption, currentTime, words, (wordEl) => {
      gsap.to(wordEl, {
        filter: 'brightness(1.6)',
        textShadow: `0 0 6px ${color}, 0 0 15px ${color}, 0 0 30px ${color}, 0 0 60px ${color}`,
        duration: 0.12,
      });
    }, (wordEl) => {
      gsap.to(wordEl, { filter: 'brightness(1)', duration: 0.2 });
    });
  }

  // ─── HYPER_3D_EXTRUDE ────────────────────────────────────────────────────────

  private renderExtrude(text: string, fontSize: number, caption: Caption, currentTime: number) {
    if (!this.container) return;

    const words = splitToWords(text, 'hyper-3d-word');

    const perspective = document.createElement('div');
    perspective.style.cssText = `perspective: 900px; text-align: center; max-width: 88%;`;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex; flex-wrap: wrap; justify-content: center;
      transform-style: preserve-3d; gap: 0.15em;
    `;

    const extrusionLayers = 8;
    const depthColor = 'rgba(0,0,0,0.5)';

    words.forEach(word => {
      const wordContainer = document.createElement('div');
      wordContainer.style.cssText = `position: relative; display: inline-block; transform-style: preserve-3d;`;

      // Depth shadow layers (3D extrusion effect)
      const shadows = Array.from({ length: extrusionLayers }, (_, i) => {
        const layer = document.createElement('span');
        layer.textContent = word.textContent;
        layer.style.cssText = `
          position: absolute; inset: 0;
          font-family: 'Montserrat', sans-serif;
          font-size: ${fontSize}px; font-weight: 900;
          color: ${depthColor}; text-transform: uppercase;
          transform: translate3d(${i + 1}px, ${i + 1}px, ${-(i + 1) * 2}px);
          pointer-events: none;
        `;
        return layer;
      });

      word.style.cssText += `
        font-family: 'Montserrat', sans-serif;
        font-size: ${fontSize}px; font-weight: 900;
        color: #FFFFFF; text-transform: uppercase;
        position: relative; z-index: 10;
        text-shadow: 0 2px 4px rgba(0,0,0,0.6);
      `;

      shadows.forEach(s => wordContainer.appendChild(s));
      wordContainer.appendChild(word);
      wrapper.appendChild(wordContainer);
    });

    perspective.appendChild(wrapper);
    this.container.appendChild(perspective);

    // Entry: rotate X flip-in per word
    gsap.set(words, { rotationX: -90, opacity: 0, transformOrigin: '50% 100%' });
    this.activeTimeline = gsap.timeline();
    this.activeTimeline.to(words, {
      rotationX: 0, opacity: 1,
      duration: 0.4,
      stagger: 0.06,
      ease: 'back.out(1.4)',
    });

    // Subtle sway idle
    this.idleTimeline = gsap.timeline({ repeat: -1, yoyo: true, ease: 'sine.inOut' });
    this.idleTimeline.to(wrapper, { rotationY: 1.5, duration: 2.5 });

    // Active word: translateZ pop-forward
    this.trackActiveWord(caption, currentTime, words, (wordEl) => {
      gsap.to(wordEl.parentElement, { z: 30, scale: 1.1, duration: 0.15, ease: 'back.out(2)' });
    }, (wordEl) => {
      gsap.to(wordEl.parentElement, { z: 0, scale: 1, duration: 0.2 });
    });
  }

  // ─── HYPER_GLASS_FROST ───────────────────────────────────────────────────────

  private renderGlassFrost(text: string, fontSize: number, config: StyleConfig, caption: Caption, currentTime: number) {
    if (!this.container) return;

    const words = splitToWords(text, 'hyper-glass-word');

    const pill = document.createElement('div');
    pill.style.cssText = `
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(16px) saturate(1.5);
      -webkit-backdrop-filter: blur(16px) saturate(1.5);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 16px;
      padding: 12px 20px;
      display: flex; flex-wrap: wrap; justify-content: center; gap: 0.2em;
      max-width: 88%;
    `;

    words.forEach(word => {
      word.style.cssText += `
        font-family: 'Inter', sans-serif;
        font-size: ${fontSize}px; font-weight: 700;
        color: #FFFFFF;
        text-shadow: 0 1px 3px rgba(0,0,0,0.4);
      `;
      pill.appendChild(word);
    });

    this.container.appendChild(pill);

    // Entry: scale up from slightly small + fade
    gsap.set(pill, { scale: 0.88, opacity: 0 });
    this.activeTimeline = gsap.timeline();
    this.activeTimeline.to(pill, {
      scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)',
    });

    // Active word: brightness boost
    this.trackActiveWord(caption, currentTime, words, (wordEl) => {
      gsap.to(wordEl, { filter: 'brightness(1.4)', scale: 1.06, duration: 0.12 });
    }, (wordEl) => {
      gsap.to(wordEl, { filter: 'brightness(1)', scale: 1, duration: 0.18 });
    });
  }

  // ─── HYPER_GRADIENT_WAVE ─────────────────────────────────────────────────────

  private renderGradientWave(text: string, fontSize: number, caption: Caption, currentTime: number) {
    if (!this.container) return;

    const chars = splitToChars(text, 'hyper-grad-char');

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      text-align: center; display: flex; flex-wrap: wrap; justify-content: center;
      max-width: 88%;
    `;

    // Gradient container — background-clip trick for gradient text
    const gradEl = document.createElement('div');
    gradEl.style.cssText = `
      font-family: 'Montserrat', sans-serif;
      font-size: ${fontSize}px; font-weight: 800;
      background: linear-gradient(90deg, #00f5ff, #ff00e4, #ffcc00, #00f5ff);
      background-size: 300% 100%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      white-space: pre-wrap; text-align: center;
      word-break: break-word;
    `;

    // Build text with spans for stagger animation
    chars.forEach(ch => {
      ch.style.cssText += `
        display: inline-block;
        background: inherit;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      `;
      gradEl.appendChild(ch);
    });

    wrapper.appendChild(gradEl);
    this.container.appendChild(wrapper);

    // Animate gradient sweep
    this.idleTimeline = gsap.timeline({ repeat: -1 });
    this.idleTimeline.to(gradEl, {
      backgroundPosition: '300% 0',
      duration: 3,
      ease: 'none',
    });

    // Entry: characters stagger fade in
    gsap.set(chars, { opacity: 0, y: 12 });
    this.activeTimeline = gsap.timeline();
    this.activeTimeline.to(chars, {
      opacity: 1, y: 0,
      duration: 0.35,
      stagger: 0.025,
      ease: 'power2.out',
    });
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  private positionContainer(vPos: number, hPos: number) {
    if (!this.container) return;
    this.container.style.alignItems = vPos < 40 ? 'flex-start' : vPos > 65 ? 'flex-end' : 'center';
    this.container.style.justifyContent = hPos < 40 ? 'flex-start' : hPos > 65 ? 'flex-end' : 'center';
    const vPad = 32;
    this.container.style.paddingBottom = vPos > 65 ? `${vPad}px` : '0';
    this.container.style.paddingTop = vPos < 40 ? `${vPad}px` : '0';
  }

  private updateActiveWord(caption: Caption, currentTime: number, _style: CaptionStyle) {
    // Word tracking is handled by trackActiveWord timers
  }

  private trackActiveWord(
    caption: Caption,
    _captionStartTime: number,
    wordEls: HTMLElement[],
    onActivate: (el: HTMLElement) => void,
    onDeactivate: (el: HTMLElement) => void
  ) {
    if (!caption.words?.length || !wordEls.length) return;

    let lastActiveIdx = -1;
    const words = caption.words;

    const timer = setInterval(() => {
      // Read live time from the video element so word highlight tracks playback
      const liveTime = this.videoEl?.currentTime ?? _captionStartTime;
      let activeIdx = -1;

      for (let i = 0; i < words.length; i++) {
        if (liveTime >= words[i].start && liveTime < words[i].end) {
          activeIdx = Math.min(i, wordEls.length - 1);
          break;
        }
      }

      if (activeIdx !== lastActiveIdx) {
        if (lastActiveIdx >= 0 && wordEls[lastActiveIdx]) onDeactivate(wordEls[lastActiveIdx]);
        if (activeIdx >= 0 && wordEls[activeIdx]) onActivate(wordEls[activeIdx]);
        lastActiveIdx = activeIdx;
      }
    }, 50);

    this.wordTimers.push(timer);
  }
}
