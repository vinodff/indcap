import React from 'react';
import { HyperImpactLines } from '../types';

/**
 * HyperImpactPreview — live, pixel-faithful DOM preview of the "Hyper-Impact Bold"
 * (Hormozi Gradient) template. Renders three stacked ALL-CAPS lines:
 *   1. hook    — white, italic, heavy stroke (framing line)
 *   2. keyword — oversized orange→yellow gradient hero with stroke + drop shadow
 *   3. benefit — white, italic, heavy stroke (framing line)
 *
 * Because the type is composited in the DOM (not baked into an AI image) the
 * gradient, stroke and shadow are deterministic and exact — matching the
 * reference visual every time. The same geometry is mirrored on a <canvas> by
 * services/hyperImpactRenderer.ts for the downloadable PNG.
 */

export interface HyperImpactPreviewProps {
  lines: HyperImpactLines;
  /** Optional background image to render the type over (the uploaded subject). */
  backgroundUrl?: string | null;
  /** Replay the entrance micro-animation when this key changes. */
  animationKey?: string | number;
  /** Disable the entrance animation (e.g. for static result thumbnails). */
  animate?: boolean;
  className?: string;
}

// Heavy condensed display sans, matching the Hormozi/viral caption convention.
// Anton + Montserrat Black are preloaded in index.html.
const HYPER_FONT_STACK = "'Anton', 'Montserrat', 'Archivo Black', system-ui, sans-serif";

// Deep, layered black shadow that separates the type from any background image.
const FRAME_SHADOW = '0 4px 6px rgba(0,0,0,0.85), 0 2px 2px rgba(0,0,0,0.9)';
const KEYWORD_SHADOW = '0 6px 10px rgba(0,0,0,0.9), 0 3px 4px rgba(0,0,0,0.95)';

export const HyperImpactPreview: React.FC<HyperImpactPreviewProps> = ({
  lines,
  backgroundUrl,
  animationKey,
  animate = true,
  className = '',
}) => {
  const hook = (lines.hook || 'UNLOCK').toUpperCase();
  const keyword = (lines.keyword || 'CLAUDE').toUpperCase();
  const benefit = (lines.benefit || '$200 PLAN FREE').toUpperCase();

  return (
    <div
      key={animationKey}
      className={`relative w-full h-full overflow-hidden bg-black select-none ${className}`}
      style={{ containerType: 'inline-size' }}
    >
      {/* Subject / background image */}
      {backgroundUrl && (
        <img
          src={backgroundUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      )}
      {/* Contrast scrim — keeps white framing lines readable over bright photos */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/55" />

      {/* Stacked type, lower-middle weighted */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-[8%] px-[6%] gap-[0.4em] text-center leading-[0.92]">
        {/* Line 1 — hook (white italic, heavy stroke) */}
        <span
          className={`font-black uppercase italic text-white tracking-tight drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] ${
            animate ? 'animate-in fade-in slide-in-from-bottom-3 duration-300' : ''
          }`}
          style={{
            fontFamily: HYPER_FONT_STACK,
            fontSize: 'clamp(1.25rem, 7cqw, 5rem)',
            WebkitTextStroke: '0.06em #000',
            paintOrder: 'stroke fill',
            textShadow: FRAME_SHADOW,
          }}
        >
          {hook}
        </span>

        {/* Line 2 — keyword (orange→yellow gradient hero) */}
        <span
          className={`block font-black uppercase italic tracking-tight bg-gradient-to-b from-orange-500 via-amber-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-[0_6px_10px_rgba(0,0,0,0.85)] ${
            animate ? 'animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500' : ''
          }`}
          style={{
            fontFamily: HYPER_FONT_STACK,
            fontSize: 'clamp(2.5rem, 16cqw, 11rem)',
            // Black outline drawn behind the gradient fill for the glossy 3D pop.
            WebkitTextStroke: '0.045em #000',
            paintOrder: 'stroke fill',
            filter: `drop-shadow(${KEYWORD_SHADOW})`,
          }}
        >
          {keyword}
        </span>

        {/* Line 3 — benefit (white italic, heavy stroke) */}
        <span
          className={`font-black uppercase italic text-white tracking-tight drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] ${
            animate ? 'animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100' : ''
          }`}
          style={{
            fontFamily: HYPER_FONT_STACK,
            fontSize: 'clamp(1.25rem, 7cqw, 5rem)',
            WebkitTextStroke: '0.06em #000',
            paintOrder: 'stroke fill',
            textShadow: FRAME_SHADOW,
          }}
        >
          {benefit}
        </span>
      </div>
    </div>
  );
};

export default HyperImpactPreview;
