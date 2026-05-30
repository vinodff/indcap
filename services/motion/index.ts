/**
 * Motion primitives barrel.
 *
 * Phase 8 ships 36 primitives total:
 *   Classic (8):           big-text-reveal, lower-third, icon-burst, counter,
 *                          highlight-box, bg-gradient-pulse, transition-wipe,
 *                          word-emphasis-flash
 *   Cinematic (5):         camera-zoom-3d, animated-arrow, particle-burst,
 *                          glitch-text, light-sweep
 *   Polished (4):          quote-card, bullet-list-reveal, callout-arrow, bar-reveal
 *   Magic UI / Aceternity (9): aurora-text, shimmer-text, hyper-text, meteors,
 *                          ripple, retro-grid, border-beam, spotlight, morph-text
 *   Phase 8 / Bootstrap / Framer (10): typewriter, kinetic-text, shockwave,
 *                          confetti, wave-text, fire-text, countdown,
 *                          glitch-screen, neon-sign, liquid-bg
 *
 * Sources informing the Phase 7 set:
 *   - https://magicui.design/docs/components (Aurora Text, Shiny Text, Hyper Text,
 *     Meteors, Ripple, Retro Grid, Border Beam, Morphing Text)
 *   - https://ui.aceternity.com/components (Spotlight / Lamp Effect, Meteor Effect)
 *   - https://21st.dev (premium component aggregator) for design references
 *   - https://hover.dev/ for hover-effect inspiration on the chip styles
 */

import { bigTextReveal } from './primitives/bigTextReveal';
import { lowerThird } from './primitives/lowerThird';
import { iconBurst } from './primitives/iconBurst';
import { counter } from './primitives/counter';
import { highlightBox } from './primitives/highlightBox';
import { bgGradientPulse } from './primitives/bgGradientPulse';
import { transitionWipe } from './primitives/transitionWipe';
import { wordEmphasisFlash } from './primitives/wordEmphasisFlash';
import { cameraZoom3d } from './primitives/cameraZoom3d';
import { animatedArrow } from './primitives/animatedArrow';
import { particleBurst } from './primitives/particleBurst';
import { glitchText } from './primitives/glitchText';
import { lightSweep } from './primitives/lightSweep';
import { quoteCard } from './primitives/quoteCard';
import { bulletListReveal } from './primitives/bulletListReveal';
import { calloutArrow } from './primitives/calloutArrow';
import { barReveal } from './primitives/barReveal';

// Phase 7 — Magic UI / Aceternity inspired
import { auroraText } from './primitives/auroraText';
import { shimmerText } from './primitives/shimmerText';
import { hyperText } from './primitives/hyperText';
import { meteors } from './primitives/meteors';
import { ripple } from './primitives/ripple';
import { retroGrid } from './primitives/retroGrid';
import { borderBeam } from './primitives/borderBeam';
import { spotlight } from './primitives/spotlight';
import { morphText } from './primitives/morphText';

// Phase 8 — Bootstrap / Framer Motion / GSAP / Awwwards hyper-animated components
import { typewriter } from './primitives/typewriter';
import { kineticText } from './primitives/kineticText';
import { shockwave } from './primitives/shockwave';
import { confetti } from './primitives/confetti';
import { waveText } from './primitives/waveText';
import { fireText } from './primitives/fireText';
import { countdown } from './primitives/countdown';
import { glitchScreen } from './primitives/glitchScreen';
import { neonSign } from './primitives/neonSign';
import { liquidBg } from './primitives/liquidBg';

// Phase 9 — Hyper-Realistic 3D Engine
import { scene3d } from './primitives/scene3d';
import { text3d } from './primitives/text3d';
import { cinematicCamera } from './primitives/cinematicCamera';

// Phase 10 — High-Retention Creator Effects
import { paperTear } from './primitives/paperTear';
import { glassPanel } from './primitives/glassPanel';
import { cyberHud } from './primitives/cyberHud';
import { marqueeText } from './primitives/marqueeText';
import { cursorClickUi } from './primitives/cursorClickUi';
import { bentoGrid } from './primitives/bentoGrid';
import { deviceTilt3d } from './primitives/deviceTilt3d';
import { liquidMorph } from './primitives/liquidMorph';
import { cardCarousel3d } from './primitives/cardCarousel3d';
import { searchRankList } from './primitives/searchRankList';
import { mapRouteTracker } from './primitives/mapRouteTracker';
import { dynamicCallout } from './primitives/dynamicCallout';
import { versusDuel } from './primitives/versusDuel';
import { notificationStack } from './primitives/notificationStack';
import { codeTerminalUi } from './primitives/codeTerminalUi';

// Phase 11 — Competitor-Grade Templates (Jitter / Hera level)
import { floatingProductCard } from './primitives/floatingProductCard';
import { animatedEmojiButton } from './primitives/animatedEmojiButton';
import { glassToggle } from './primitives/glassToggle';
import { circularProgress } from './primitives/circularProgress';
import { pricingTable } from './primitives/pricingTable';
import { testimonialRotator } from './primitives/testimonialRotator';
import { aiChatMessage } from './primitives/aiChatMessage';
import { polaroidStack } from './primitives/polaroidStack';
import { morphingShapes } from './primitives/morphingShapes';
import { gradientOrbs } from './primitives/gradientOrbs';
import { globe3d } from './primitives/globe3d';
import { deviceMockup } from './primitives/deviceMockup';
import { beforeAfterReveal } from './primitives/beforeAfterReveal';
import { holoProjection } from './primitives/holoProjection';

// Phase 12 — AI & UX Motion Primitives
import { aiSearchBar } from './primitives/aiSearchBar';
import { meshGradientBg } from './primitives/meshGradientBg';
import { scrollRevealStack } from './primitives/scrollRevealStack';
import { dynamicIsland } from './primitives/dynamicIsland';
import { liquidLoader } from './primitives/liquidLoader';
import { magneticButton } from './primitives/magneticButton';
import { spotlightCard } from './primitives/spotlightCard';
import { neonCommandMenu } from './primitives/neonCommandMenu';
import { floatingDock } from './primitives/floatingDock';
import { holographicCard } from './primitives/holographicCard';
import { metricsDashboard } from './primitives/metricsDashboard';
import { neuralIntelligenceCore } from './primitives/neuralIntelligenceCore';
import { cinematicTitleOpener } from './primitives/cinematicTitleOpener';

// Phase 12 — AI Motion Graphic Generator features
import { floatingNotification } from './primitives/floatingNotification';
import { particleTrailCursor } from './primitives/particleTrailCursor';
import { infiniteLogoMarquee } from './primitives/infiniteLogoMarquee';
import { elasticSlider } from './primitives/elasticSlider';
import { aiThinkingLoader } from './primitives/aiThinkingLoader';
import { networkGraph } from './primitives/networkGraph';
import { textScramble } from './primitives/textScramble';
import { splitTextReveal } from './primitives/splitTextReveal';
import { titleOpener } from './primitives/titleOpener';
import { trailerTitle } from './primitives/trailerTitle';

// Phase 13 — Creative Templates
import { stackedNotes } from './primitives/stackedNotes';
import { voiceWaveform } from './primitives/voiceWaveform';
import { shimmerButton } from './primitives/shimmerButton';
import { pixelTransition } from './primitives/pixelTransition';
import { flipClock } from './primitives/flipClock';
import { quantumCardExplosion } from './primitives/quantumCardExplosion';
import { showcaseReel } from './primitives/showcaseReel';

import type { PrimitivesRegistry } from './types';

export const PRIMITIVES: PrimitivesRegistry = {
  'big-text-reveal': bigTextReveal,
  'lower-third': lowerThird,
  'icon-burst': iconBurst,
  'counter': counter,
  'highlight-box': highlightBox,
  'bg-gradient-pulse': bgGradientPulse,
  'transition-wipe': transitionWipe,
  'word-emphasis-flash': wordEmphasisFlash,
  'camera-zoom-3d': cameraZoom3d,
  'animated-arrow': animatedArrow,
  'particle-burst': particleBurst,
  'glitch-text': glitchText,
  'light-sweep': lightSweep,
  'quote-card': quoteCard,
  'bullet-list-reveal': bulletListReveal,
  'callout-arrow': calloutArrow,
  'bar-reveal': barReveal,
  'aurora-text': auroraText,
  'shimmer-text': shimmerText,
  'hyper-text': hyperText,
  'meteors': meteors,
  'ripple': ripple,
  'retro-grid': retroGrid,
  'border-beam': borderBeam,
  'spotlight': spotlight,
  'morph-text': morphText,
  // Phase 8
  'typewriter': typewriter,
  'kinetic-text': kineticText,
  'shockwave': shockwave,
  'confetti': confetti,
  'wave-text': waveText,
  'fire-text': fireText,
  'countdown': countdown,
  'glitch-screen': glitchScreen,
  'neon-sign': neonSign,
  'liquid-bg': liquidBg,
  // Phase 9 — Hyper-Realistic 3D Engine
  'scene-3d': scene3d,
  'text-3d': text3d,
  'camera-cinematic': cinematicCamera,
  // Phase 10
  'paper-tear': paperTear,
  'glass-panel': glassPanel,
  'cyber-hud': cyberHud,
  'marquee-text': marqueeText,
  'cursor-click-ui': cursorClickUi,
  'bento-grid': bentoGrid,
  'device-tilt-3d': deviceTilt3d,
  'liquid-morph': liquidMorph,
  'card-carousel-3d': cardCarousel3d,
  'search-rank-list': searchRankList,
  'map-route-tracker': mapRouteTracker,
  'dynamic-callout': dynamicCallout,
  'versus-duel': versusDuel,
  'notification-stack': notificationStack,
  'code-terminal-ui': codeTerminalUi,
  // Phase 11
  'floating-product-card': floatingProductCard,
  'animated-emoji-button': animatedEmojiButton,
  'glass-toggle': glassToggle,
  'circular-progress': circularProgress,
  'pricing-table': pricingTable,
  'testimonial-rotator': testimonialRotator,
  'ai-chat-message': aiChatMessage,
  'polaroid-stack': polaroidStack,
  'morphing-shapes': morphingShapes,
  'gradient-orbs': gradientOrbs,
  'globe-3d': globe3d,
  'device-mockup': deviceMockup,
  'before-after-reveal': beforeAfterReveal,
  'holo-projection': holoProjection,
  // Phase 12 — AI & UX Motion Primitives
  'ai-search-bar': aiSearchBar,
  'mesh-gradient-bg': meshGradientBg,
  'scroll-reveal-stack': scrollRevealStack,
  'dynamic-island': dynamicIsland,
  'liquid-loader': liquidLoader,
  'magnetic-button': magneticButton,
  'spotlight-card': spotlightCard,
  'neon-command-menu': neonCommandMenu,
  'floating-dock': floatingDock,
  'holographic-card': holographicCard,
  'metrics-dashboard': metricsDashboard,
  'neural-intelligence-core': neuralIntelligenceCore,
  'cinematic-title-opener': cinematicTitleOpener,

  // Phase 12 — AI Motion Graphic Generator
  'floating-notification': floatingNotification,
  'particle-trail-cursor': particleTrailCursor,
  'infinite-logo-marquee': infiniteLogoMarquee,
  'elastic-slider': elasticSlider,
  'ai-thinking-loader': aiThinkingLoader,
  'text-scramble': textScramble,
  'network-graph': networkGraph,
  // Phase 13 — Creative Templates
  'stacked-notes': stackedNotes,
  'voice-waveform': voiceWaveform,
  'shimmer-button': shimmerButton,
  'pixel-transition': pixelTransition,
  'flip-clock': flipClock,
  'quantum-card-explosion': quantumCardExplosion,
  'split-text-reveal': splitTextReveal,
  'showcase-reel': showcaseReel,
  'title-opener': titleOpener,
  'trailer-title': trailerTitle,
};

export { PALETTES, getPalette } from './palettes';
export type { PaletteColors } from './palettes';
export type { PrimitiveContext, PrimitiveParams, PrimitiveRenderer, PrimitivesRegistry } from './types';

// Professional Color & Text System
export {
  PROFESSIONAL_PALETTES,
  selectPaletteForContent,
  validatePaletteContrast,
  getProfessionalPalette,
} from './professionalPalettes';
export type { ProfessionalPalette } from './professionalPalettes';

export {
  SIZING_STANDARDS,
  getResponsiveSize,
  getSizeCategory,
  getTierSize,
  validateSizingTier,
  getLineHeightMultiplier,
  getLetterSpacing,
} from './sizingStandards';
export type { SizingTier } from './sizingStandards';

export {
  PREMIUM_TEXT_STYLES,
  applyPremiumTextStyle,
  drawPremiumText,
  validateTextStyle,
  scaleTextStyle,
} from './premiumTextStyle';
export type { PremiumTextStyle } from './premiumTextStyle';

export {
  getContrastRatio,
  getWCAGLevel,
  validateTextRendering,
  validatePaletteForText,
  validateFontSizeForContext,
  getReadabilityScore,
} from './textValidation';
export type { TextValidationResult, ValidationIssue, ValidationWarning } from './textValidation';

export {
  runRenderingPipeline,
  filterTemplatesByQuality,
  getRecommendedTemplates,
  getRecommendedTextStyle,
  generateQualityReport,
} from './renderingPipeline';
export type { RenderingPipelineConfig, PipelineValidation, ValidationError } from './renderingPipeline';
