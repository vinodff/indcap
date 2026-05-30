/**
 * Motion Graphics Service — client-side Gemini call (mirrors geminiService.ts).
 *
 * We originally proxied through /api/motion/analyze-script, but Node fetch on
 * Windows kept hitting ConnectTimeoutError when reaching Google's API. The
 * browser doesn't have that problem (the captions feature already calls
 * Gemini directly), so we do the same here. The server route is kept as a
 * fallback for environments where direct browser → Google calls are blocked.
 */

import { GoogleGenAI } from '@google/genai';
import { getSubstitute, QUALITY_SCORES } from './motion/qualityScoring';

export type PrimitiveType =
  | 'big-text-reveal'
  | 'lower-third'
  | 'icon-burst'
  | 'counter'
  | 'highlight-box'
  | 'bar-reveal'
  | 'bg-gradient-pulse'
  | 'transition-wipe'
  | 'quote-card'
  | 'bullet-list-reveal'
  | 'callout-arrow'
  | 'word-emphasis-flash'
  | 'camera-zoom-3d'
  | 'animated-arrow'
  | 'particle-burst'
  | 'glitch-text'
  | 'light-sweep'
  // Phase 7 — Magic UI / 21st.dev / Aceternity / hover.dev inspired primitives
  | 'aurora-text'
  | 'shimmer-text'
  | 'hyper-text'
  | 'meteors'
  | 'ripple'
  | 'retro-grid'
  | 'border-beam'
  | 'spotlight'
  | 'morph-text'
  // Phase 8 — Bootstrap / Framer Motion / GSAP / Awwwards hyper-animated components
  | 'typewriter'
  | 'kinetic-text'
  | 'shockwave'
  | 'confetti'
  | 'wave-text'
  | 'fire-text'
  | 'countdown'
  | 'glitch-screen'
  | 'neon-sign'
  | 'liquid-bg'
  // Phase 9 — Hyper-Realistic 3D Engine
  | 'scene-3d'
  | 'text-3d'
  | 'camera-cinematic'
  // Phase 10 — High-Retention Creator Effects
  | 'paper-tear'
  | 'glass-panel'
  | 'cyber-hud'
  | 'marquee-text'
  | 'cursor-click-ui'
  | 'bento-grid'
  | 'device-tilt-3d'
  | 'liquid-morph'
  | 'card-carousel-3d'
  | 'search-rank-list'
  | 'map-route-tracker'
  | 'dynamic-callout'
  | 'versus-duel'
  | 'notification-stack'
  | 'code-terminal-ui'
  // Phase 11 — Competitor-Grade Templates (Jitter / Hera level)
  | 'animated-emoji-button'
  | 'glass-toggle'
  | 'circular-progress'
  | 'pricing-table'
  | 'testimonial-rotator'
  | 'ai-chat-message'
  | 'floating-product-card'
  | 'polaroid-stack'
  | 'morphing-shapes'
  | 'gradient-orbs'
  | 'before-after-reveal'
  | 'globe-3d'
  | 'device-mockup'
  | 'holo-projection'
  | 'liquid-loader'
  | 'magnetic-button'
  | 'spotlight-card'
  | 'neon-command-menu'
  | 'floating-dock'
  | 'holographic-card'
  | 'metrics-dashboard'
  | 'neural-intelligence-core'
  | 'cinematic-title-opener'
  | 'ai-search-bar'
  | 'mesh-gradient-bg'
  | 'scroll-reveal-stack'
  | 'dynamic-island'
  | 'floating-notification'
  | 'particle-trail-cursor'
  | 'infinite-logo-marquee'
  | 'elastic-slider'
  | 'ai-thinking-loader'
  | 'text-scramble'
  | 'network-graph'
  // Phase 13 — Creative Templates
  | 'stacked-notes'
  | 'voice-waveform'
  | 'shimmer-button'
  | 'pixel-transition'
  | 'flip-clock'
  | 'quantum-card-explosion'
  | 'split-text-reveal'
  | 'showcase-reel'
  | 'title-opener'
  | 'trailer-title';

export type Palette =
  | 'energetic'
  | 'corporate'
  | 'kids'
  | 'cinematic'
  | 'neon-bright'
  | 'pastel-pop'
  | 'gradient-blast'
  | 'custom';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export interface AspectInfo {
  label: string;
  width: number;
  height: number;
  hint: string;
}

export const ASPECTS: Record<AspectRatio, AspectInfo> = {
  '16:9': { label: '16:9 Landscape', width: 1920, height: 1080, hint: 'YouTube, web video' },
  '9:16': { label: '9:16 Portrait', width: 1080, height: 1920, hint: 'TikTok, Reels, Shorts' },
  '1:1':  { label: '1:1 Square',    width: 1080, height: 1080, hint: 'Instagram feed' },
  '4:5':  { label: '4:5 Portrait',  width: 1080, height: 1350, hint: 'Instagram portrait' },
};

export interface MotionBeatParams {
  text?: string;
  icon?: string;
  palette: Palette;
  customColors?: string[];
  anchor?: 'top' | 'center' | 'bottom' | 'left' | 'right';
  intensity: 1 | 2 | 3;
}

export interface MotionBeat {
  id: string;
  startTime: number;
  endTime: number;
  primitive: PrimitiveType;
  params: MotionBeatParams;
  rationale?: string;
}

export interface MotionPlan {
  beats: MotionBeat[];
  topicSlug: string;
  suggestedPalette: Palette;
  duration: number;
}

export interface AnalyzeScriptOptions {
  script: string;
  durationSec: number;
  palette?: Palette;
  intensity?: 1 | 2 | 3;
  aspectRatio?: AspectRatio;
}

export const PRIMITIVE_TYPES: PrimitiveType[] = [
  'big-text-reveal',
  'lower-third',
  'icon-burst',
  'counter',
  'highlight-box',
  'bar-reveal',
  'bg-gradient-pulse',
  'transition-wipe',
  'quote-card',
  'bullet-list-reveal',
  'callout-arrow',
  'word-emphasis-flash',
  'camera-zoom-3d',
  'animated-arrow',
  'particle-burst',
  'glitch-text',
  'light-sweep',
  'aurora-text',
  'shimmer-text',
  'hyper-text',
  'meteors',
  'ripple',
  'retro-grid',
  'border-beam',
  'spotlight',
  'morph-text',
  // Phase 8
  'typewriter',
  'kinetic-text',
  'shockwave',
  'confetti',
  'wave-text',
  'fire-text',
  'countdown',
  'glitch-screen',
  'neon-sign',
  'liquid-bg',
  // Phase 9 — Hyper-Realistic 3D Engine
  'scene-3d',
  'text-3d',
  'camera-cinematic',
  // Phase 10 — High-Retention Creator Effects
  'paper-tear',
  'glass-panel',
  'cyber-hud',
  'marquee-text',
  'cursor-click-ui',
  'bento-grid',
  'device-tilt-3d',
  'liquid-morph',
  'card-carousel-3d',
  'search-rank-list',
  'map-route-tracker',
  'dynamic-callout',
  'versus-duel',
  'notification-stack',
  'code-terminal-ui',
  // Phase 11 — Competitor-Grade Templates
  'animated-emoji-button',
  'glass-toggle',
  'circular-progress',
  'pricing-table',
  'testimonial-rotator',
  'ai-chat-message',
  'floating-product-card',
  'polaroid-stack',
  'morphing-shapes',
  'gradient-orbs',
  'before-after-reveal',
  'globe-3d',
  'device-mockup',
  'holo-projection',
  'liquid-loader',
  'magnetic-button',
  'spotlight-card',
  'neon-command-menu',
  'floating-dock',
  'holographic-card',
  'metrics-dashboard',
  'neural-intelligence-core',
  'cinematic-title-opener',
  'ai-search-bar',
  'mesh-gradient-bg',
  'scroll-reveal-stack',
  'dynamic-island',
  // Phase 12 — AI Motion Graphic Generator
  'floating-notification',
  'particle-trail-cursor',
  'infinite-logo-marquee',
  'elastic-slider',
  'ai-thinking-loader',
  'text-scramble',
  'network-graph',
  // Phase 13 — Creative Templates
  'stacked-notes',
  'voice-waveform',
  'shimmer-button',
  'pixel-transition',
  'flip-clock',
  'quantum-card-explosion',
  'split-text-reveal',
  'showcase-reel',
  'title-opener',
  'trailer-title',
];

const PALETTES: Palette[] = ['energetic', 'corporate', 'kids', 'cinematic', 'neon-bright', 'pastel-pop', 'gradient-blast', 'custom'];

/**
 * QUALITY FILTERING CONFIGURATION
 * Templates marked for removal are filtered from the primary registry.
 * Deprecated templates are available separately for reference.
 */
const TEMPLATE_QUALITY_FILTER = {
  REMOVAL_CANDIDATES: [
    'paper-tear',              // Score 2.0 - Niche/outdated aesthetic
    'elastic-slider',          // Score 2.5 - Poor UX pattern
    'particle-trail-cursor',   // Score 2.0 - Not viable for video
    'flip-clock',              // Score 2.5 - Retro novelty effect
  ],
  DEPRECATED_TEMPLATES: [
    'infinite-logo-marquee',   // Score 3.0 - Extremely niche
    'polaroid-stack',          // Score 3.5 - Outdated trend
  ],
};

/**
 * PRODUCTION REGISTRY - Only high-quality templates (score >= 8.0)
 * These are safe to use in production and are actively maintained.
 */
export const PRODUCTION_PRIMITIVE_TYPES: PrimitiveType[] = PRIMITIVE_TYPES.filter(
  (t) =>
    !TEMPLATE_QUALITY_FILTER.REMOVAL_CANDIDATES.includes(t as string) &&
    !TEMPLATE_QUALITY_FILTER.DEPRECATED_TEMPLATES.includes(t as string)
);

/**
 * EXPERIMENTAL REGISTRY - Deprecated but maintained for reference
 */
export const EXPERIMENTAL_PRIMITIVE_TYPES: PrimitiveType[] = PRIMITIVE_TYPES.filter(
  (t) => TEMPLATE_QUALITY_FILTER.DEPRECATED_TEMPLATES.includes(t as string)
) as PrimitiveType[];

const SYSTEM_INSTRUCTION = `You are a senior motion graphics director planning kinetic typography and motion-graphic shots for a short-form video.

You receive a script (user-supplied) and a target duration in seconds. You return a MotionPlan: a list of timed BEATS, each beat triggers ONE motion-graphic PRIMITIVE that visualizes the corresponding moment of the script.

Rules:
1. Distribute beats across the FULL duration. Do not bunch everything at the start.
2. Aim for one beat every 1.5 to 4 seconds. Shorter scripts get fewer beats. A 30s video should have 8-15 beats. A 60s video, 15-25 beats.
3. Each beat must have startTime < endTime, in seconds, and both in [0, duration]. Beats can overlap if it serves the moment (e.g., bg-gradient-pulse running underneath a big-text-reveal).
4. Choose the PRIMITIVE that fits the meaning. Prefer the ADVANCED primitives (camera-zoom-3d, animated-arrow, particle-burst, glitch-text, light-sweep) at major beats — they read as cinematic.

CLASSIC primitives:
- big-text-reveal: hero phrases, key statements, hooks (1-3 per video at biggest moments).
- lower-third: introducing a person, place, or concept. Has a 3D card-flip entry.
- icon-burst: a single concrete noun ("phone", "rocket", "brain") - 80-150 physics particles.
- counter: when a NUMBER appears ("3 ways", "$1M", "97%"). Digit-roll odometer.
- highlight-box: emphasizing a region or callout. HUD corner brackets.
- bar-reveal: comparing magnitudes or progress.
- bg-gradient-pulse: emotional swells, transitions between sections. Longer beats (2-5s).
- transition-wipe: scene changes, hard breaks (under 0.5s each).
- quote-card: direct quotes or pull-out statements.
- bullet-list-reveal: enumerations ("First X, second Y, third Z").
- callout-arrow: pointing at something specific.
- word-emphasis-flash: a single charged word flashes (0.2-0.4s).

ADVANCED cinematic primitives:
- camera-zoom-3d: cinematic "push in" with letterbox bars, radial speed lines, center bloom. Use at the BIGGEST emotional beat. Lasts 1-3s. Pair with a big-text-reveal or counter at the same time.
- animated-arrow: hand-drawn arrow that strokes onto screen and points. Use when the script says "look at this", "right here", "see this number". Use anchor to set arrow direction.
- particle-burst: 100+ particles burst with gravity physics. Use for "explosion of insight", celebrations, "boom" moments.
- glitch-text: chromatic RGB aberration + scan lines. Use for "warning", "shocking truth", tech/cyber content.
- light-sweep: diagonal light beam wipes across the frame. Use as a transition between sections, or to spotlight a moment without a hard cut.

MAGIC-UI / ACETERNITY primitives (premium typography + atmosphere — prefer these for HERO and BACKGROUND beats):
- aurora-text: text filled with a SHIFTING multi-color aurora gradient. Use for the HERO statement, brand name, opener — anything that needs to feel premium and alive.
- shimmer-text: muted text with a SWEEPING light reflection across it. Subtle premium taglines, brand mentions, quiet emphasis. NOT for hooks (too understated).
- hyper-text: characters SCRAMBLE through random glyphs and LOCK left-to-right (decryption / hacker feel). Tech/cyber content, "decoded" moments, mystery reveals.
- meteors: 8-22 diagonal falling streaks with bright heads + colored tails. ATMOSPHERIC bg under a text beat. Long beats (2-5s). Reads as "epic / wonder / scale".
- ripple: concentric expanding RINGS from an anchor point. Use for "impact", "spreading idea", "viral moment". Pair with a hero text beat in same window.
- retro-grid: SYNTHWAVE perspective grid floor + horizon sun. BACKGROUND ONLY. Tech/futuristic/gaming/80s content. 2-4s beat at the start of a section.
- border-beam: card with chasing GLOW dot trailing around its border. Feature callouts, premium badges, product reveals. The card displays the text param.
- spotlight: directional STAGE LIGHT beam from a corner (anchor: top/bottom/left/right) lighting up the frame. Soft transition or focus pull. anchor=top is the classic "lamp from above" look.
- morph-text: cycles between SEVERAL strings, crossfading + scaling. Pass strings separated by " | " (e.g. "MORE | LESS | PERFECT"). Use when the script lists alternatives or progresses through stages.

PHASE 8 — HYPER-ANIMATED web component primitives (Bootstrap / Framer Motion / GSAP inspired):
- typewriter: characters appear ONE-BY-ONE in monospace font with a blinking cursor, then delete on exit. Terminal / dev / quote feel. 2-5s beats.
- kinetic-text: each LETTER FLIES IN from a random offscreen direction and SPRINGS into position with overshoot, then EXPLODES outward on exit. Max energy opener or big reveal. 2-4s.
- shockwave: IMPACT RINGS expand from an anchor point with a screen flash and debris particles. Use for "boom" moments, chapter starts, dramatic statistics. 0.5-2s.
- confetti: PHYSICS CONFETTI rains from the launch point in many colors. Celebration, success, completion moments. 2-4s.
- wave-text: letters RIDE A SINE WAVE continuously — very lively and energetic. Use for hype, party, upbeat moments. 2-5s. Great alongside a background beat.
- fire-text: text glows with a RED→YELLOW fire gradient and fire PARTICLES rise upward from the letters. Hot takes, urgent moments, passion topics. 2-4s.
- countdown: dramatic 3 → 2 → 1 → GO! Each number SMASHES in with spring overshoot and burst lines. Use at the very start of a hype reel or section opener. 3-6s.
- glitch-screen: FULL-SCREEN digital artifact — displacement bands, RGB splits, static blocks. Best as a 0.3-1.0s TRANSITION between sections or for cyber/hacker content.
- neon-sign: text rendered as GLOWING NEON TUBES with realistic flicker. Great for retro, gaming, nightlife, entertainment content. 2-5s.
- liquid-bg: ORGANIC BLOB / LAVA-LAMP animated background with screen-blended colors. Use as a premium background under typography beats. 3-8s.

PHASE 9 — HYPER-REALISTIC 3D ENGINE (prefer these for PREMIUM, CINEMATIC, and HERO moments):
- scene-3d: Full 3D ENVIRONMENT WORLD: animated perspective grid floor with vanishing point, floating depth-sorted 3D geometry (cubes, rings), 3D starfield, volumetric fog, diffuse lighting. Use as BACKGROUND for 3–8s under hero text. Best paired with text-3d or camera-cinematic. Long beats (3–8s).
- text-3d: TRUE 3D extruded BLOCK LETTERS with per-letter depth fly-in from Z-axis, side extrusion faces, bevel highlights, chromatic aberration on entry, spring-physics stagger. Use for the HERO statement, hook, or any big reveal where you previously used big-text-reveal. 2–5s.
- camera-cinematic: MULTI-AXIS cinematic camera move with shot types controlled by anchor — center=dolly push-in, top=crane reveal, bottom=orbital arc, left=dutch tilt, right=rack focus. Includes lens flare, letterbox bars, REC timecode, motion blur, and chromatic aberration vignette. 1.5–4s. Use at MAJOR transitions and biggest emotional beats.

PHASE 10 — HIGH-RETENTION CREATOR EFFECTS (Use these to match top YouTuber pacing and visual hook styles):
- paper-tear: Grungy, textured STOP-MOTION collage paper tear revealing bold text. Has a distinct 12fps jitter. Use for fast-paced, documentary/educational style hooks (like Vox or Ali Abdaal). 1.5-3s.
- glass-panel: Sleek, FROSTED GLASS panel floating in 3D with edge lighting and premium typography. Looks like an Apple product reveal. Use to introduce a premium feature, quote, or core concept. 2.5-5s.
- cyber-hud: Sci-Fi DATA OVERLAY with rotating targeting rings, crosshairs, and scrolling hex streams. Highly energetic and visually complex. Perfect for gaming, tech, or "hacker" style intensity. 2-4s.
- marquee-text: INFINITE SCROLLING ribbons of massive, brutalist text crossing the screen diagonally. Huge undeniable visual impact. Best for bold declarations or high-energy choruses. 2-5s.
- cursor-click-ui: INTERACTIVE CURSOR animation — a real mouse pointer glides across the screen, hovers over a styled CTA button (Subscribe, Buy Now, Click the Link), clicks it, triggering a radial ripple wave and a colorful particle burst, then the button transitions to a SUCCESS/ACTIVE state. Use at call-to-action moments: subscribe asks, link-in-bio, buying prompts, or any moment the creator wants the viewer to take an action. Looks like a Jitter.video or Hera.video pro template. 3–6s.
- bento-grid: APPLE-STYLE BENTO GRID of 3–4 staggered glass panels that spring-animate in from different directions. Each panel shows a different content type: a ticking metric counter (e.g. "3M Views"), a gradient shimmer label, an icon + descriptor, and an animated progress bar. Inspired by Apple WWDC slides, Linear.app, and Vercel feature grids. Use for product intros, stat reveals, feature breakdowns, and "what you'll learn" moments. Pass up to 4 pipe-separated labels in text: "3M Views | Creator Tool | AI-Powered | Try Free". 4–7s.
- device-tilt-3d: PHYSICALLY ACCURATE 3D DEVICE MOCKUP — a phone, browser window, or tablet frame projected in true 3D perspective that springs from a ~45° tilt to face-forward with elastic overshoot, then gently bobs and auto-rotates. The screen interior shows a live UI mockup (status bar, app headline, animated content cards, home indicator). A floating badge chip animates above the device. Use for app reveals, product launches, feature demos, "available now" moments, or any time the creator is promoting a tool, website, or app. Set icon to "phone", "browser", or "tablet". 4–8s.
- liquid-morph: ORGANIC METABALL LIQUID WIPE transition. Multiple overlapping liquid color blobs grow from an anchor point (center, top, bottom, etc.), merge organically using perlin-like noise, and then a central reveal hole cuts open using destination-out compositing to expose the underlying content, shooting out trailing ink-drop tendrils. Wet refractive edge highlights outline the shapes. Perfect for bold style changes, high-energy transitions, hero statement reveals, and creative clip wipes. 2.5–5s.
- card-carousel-3d: 3D CARD CAROUSEL FLIP STACK. Renders three feature/pricing cards stacked in 3D perspective with realistic glassmorphism, specular outlines, and custom icons. At 50% timeline progress, the front card rotates, slides up and out, while the second card slides forward to take the spotlight, and the third card shifts into the middle layer. Excellent for feature lists, pricing options, stat slideshows, or high-retention benefit reveals. Pass up to 3 pipe-separated titles in text: "Fast Rendering | Custom Templates | Easy Setup". 4.5–8s.
- search-rank-list: GOOGLE SEARCH TO RANKED LIST / LEADERBOARD. Renders a beautiful glassmorphic search input box. Types a query letter-by-letter with a flashing text cursor, hits Search (triggers a click ripple), slides the search bar to the top of the screen, and staggers in a ranked list of results below it. Rank #1 is highlighted with a gold frame, glowing checkmark, and particle sparkle spray. Perfect for comparison statements, competitive advantages, SEO/ranking discussions, tool comparisons, or showing top-rated stats. Pass pipe-separated string where item 0 is the search query, and items 1, 2, 3 are the rankings: "best motion tool | Createrin #1 | Competitor B | Competitor C". 4.5–8s.
- map-route-tracker: INTERACTIVE TRAVEL MAP & FLIGHT TRACKER. Renders a blueprint latitude grid and a dotted approximation of world continents. Drops a locator pin at Location A (origin) with concentric pings and label, draws a dashed Bezier arc connecting to Location B (destination) while an airplane icon flies along it, and then drops a details card at Location B. Excellent for digital nomads, travel vlogs, logistics, remote work, location changes, or geographical stories. Pass pipe-separated string: "Origin | Destination | Details Label" (e.g. "New York | London | Remote Work"). 5–8s.
- dynamic-callout: BLUEPRINT SPECIFICATION CALLOUT. Renders a coordinate target crosshair pulsing at a focal point, draws a two-segment pointer line (diagonal then horizontal) outwards from it, runs a glowing laser pulse along the path, and snaps open a glassmorphic details spec box at the end. Use for product details, tech specs, design blueprints, zoom-in highlights, or pointing at specific visual details. Pass pipe-separated string: "Category Badge | Title Spec | Description Detail" (e.g. "DISPLAY | Ultra Retina XDR | 120Hz ProMotion"). 4–6.5s.
- versus-duel: VERSUS SPLIT COMPARISON DUEL. Renders a bold, diagonal glowing electric slash dividing the screen into left and right sides. Slides in two sleek glassmorphic comparison cards with elastic spring overshoot. Staggers in comparative metric chip lists (split by commas). Stamps down a glowing "VS" circle badge in the center. Winner side gets highlighted with gold neon borders, a victory checkmark badge, and circular sparkling particle spray, while the loser side dims. Use for before-and-afters, competitor comparisons, choosing options, pros vs cons, or price/feature standoffs. Pass pipe-separated string: "Left Title | Right Title | Left Details (commas) | Right Details (commas) | Winner (left/right/none)" (e.g. "CapCut | Createrin | Manual Timelines, Hard 3D | AI Smart Beats, Pure Canvas 3D ⚡, Spring Physics | right"). 4.5–7.5s.
- code-terminal-ui: GLOSSY MACOS-STYLE COMMAND-LINE TERMINAL. Renders a frosted glass terminal window with macOS traffic light dots, a monospace code prompt with blinking cursor, and staggered command-line output lines that type in one by one. Perfect for developer tools, coding content, terminal demos, or tech-focused intros. 2.5-5s.
- notification-stack: INTERACTIVE NOTIFICATION STACK. iOS/macOS style frosted glass notification banners slide in from offscreen sequentially with organic spring bouncing. As new notifications arrive, they stack at the top and push previously active notifications downward. Features custom brand logos/icons (YouTube, Stripe, Discord, Twitter, alerts), blinking neon dot indicator badges, and a glowing laser beam that sweeps the border of each banner on arrival. Ideal for showcasing social proof, stripe payments/revenue, follower counts, incoming chat messages, or alerts. Pass pipe-separated list of triplets "Title | Body | Time" or pairs "Title | Body" (e.g., "Stripe | +$49.00 payment received | now | YouTube | New subscriber! | 2m ago"). 4–7.5s.

PHASE 11 — COMPETITOR-GRADE TEMPLATES (Jitter / Hera level — use these for PREMIUM, SOCIAL-PROOF, and CONVERSION moments):
- animated-emoji-button: LARGE ANIMATED EMOJI BUTTON with pulse, click interaction, and particle burst. A big circular glass button springs in with elastic overshoot — the emoji (set via icon param, default 🎉) pulses and wobbles during idle, then on "click" (mid-timeline) the button squishes, a radial shockwave expands, colorful particles burst outward, the emoji morphs to a checkmark/star, and a label animates below. Perfect for CTAs, "like & subscribe" moments, celebration beats, reaction prompts, or any interactive-feel engagement hook. 3–6s.
- glass-toggle: PREMIUM GLASSMORPHISM TOGGLE SWITCH. A sleek horizontal glass track fades in, then a circular knob springs from the left (OFF) with elastic overshoot. Mid-timeline the knob slides to the right (ON) with magnetic snap — the track glows with accent gradient, knob pulses an inner dot, and a pulse ring emanates on state change. The label ("Dark Mode" by default) animates next to the toggle with ON/OFF state text. Perfect for "settings" reveals, feature demos, before/after comparisons, or any UI interaction showcase. 3–5s.
- circular-progress: PREMIUM ANIMATED RING PROGRESS with percentage counter. A circular track ring fades in, then a gradient active arc fills clockwise to the target percentage while the center number ticks up with digit shake. On completion (100%), a checkmark draws with stroke-dashoffset animation and sparkle particles burst outward. The ring pulses with a glow aura in idle. Pass "Label | 87" in text to set label and target percent. Perfect for stat reveals, loading moments, skill metrics, fundraising progress, or any count-up/achievement beat. 3.5–6s.
- pricing-table: 3-TIER PRICING CARDS comparison with staggered entrance. Three glassmorphic pricing cards (Basic, Pro, Enterprise) spring in from below with elastic overshoot — the middle "Pro" card is elevated with a POPULAR badge, accent border glow, and higher opacity. Prices count up with digit animation, features scroll in with checkmark reveals per-card, and each card has a pulsing CTA button. Pass "Basic | $9 | Pro | $29 | Enterprise | $99" in text. Perfect for product launches, feature comparisons, subscription promos, or any "choose your plan" moment. 4.5–8s.
- ai-chat-message: AI CHAT INTERFACE with animated conversations. Renders a complete chat window with glassmorphic header showing an AI avatar, status indicator, and sparkle icon. User message bubbles spring in from the right with avatar, followed by a three-dot typing indicator with bounce animation, then the AI response slides in from the left with staggered word reveal. Multiple message pairs cycle sequentially with smooth timing. The chat includes a styled input bar at the bottom with send button. Pass pipe-separated message pairs in text: "User Q1 | AI A1 | User Q2 | AI A2". Perfect for AI tool demos, chatbot showcases, customer support testimonials, or any conversational UI reveal. 5–10s.
- gradient-orbs: APPLE/STRIPE-STYLE FLOATING GRADIENT ORBS background. Renders 4-8 perfectly circular gradient spheres that drift on Lissajous trajectories with independent scale pulses. Each orb has a smooth radial gradient (center color fading to transparent edge). Colors are palette-derived but softened with white for a pastel, premium aesthetic. Uses 'lighter' composite blending so overlapping orbs create beautiful color intersections. No extra decorations — pure, minimal, elegant. Perfect as a layer 0 background under text, UI, or any foreground primitive. 2-8s.
- morphing-shapes: ABSTRACT GEOMETRIC SHAPE MORPHING with gradient. Renders a sequence of geometric primitives (Circle → Triangle → Square → Pentagon → Hexagon → Diamond → Star) that smoothly interpolate vertex-by-vertex with a 12-point morphing system. Each shape has a linear gradient fill that shifts colors per shape across the palette. Glow bloom pulses on transition, orbit rings float around the shape, particle sparkles burst at morph midpoints, and a shape name label appears below. The shape gently rotates and floats with a bob animation. Pass optional text for a custom label below. Perfect for abstract backgrounds, logo reveals, section transitions, creative intros, meditation/wellness content, or any moment that needs an artistic, premium visual. 5-9s.
- polaroid-stack: VINTAGE POLAROID PHOTO STACK with fan layout. Polaroid-style photos drop in from above one by one with elastic bounce and staggered rotation offsets creating a fan spread. Each has a white border frame, dark inner "photo" area with gradient fill or tech grid pattern, decorative emoji icon, and a caption label at the bottom. Heavy drop shadows create depth between layers. A subtitle line appears below the stack after all photos settle. Pass pipe-separated labels in text: "Idea | Script | Render". Set icon to "gradient" (default, abstract fills) or "grid" (tech blueprint). Perfect for memory reels, travel content, "how it works" steps, before/after reveals, or nostalgic photo montages. 4–7s.
- testimonial-rotator: PREMIUM GLASSMORPHIC TESTIMONIAL CARD ROTATOR. A frosted glass card floats in with elastic spring, featuring a large decorative quote mark, staggered word-reveal of the testimonial text, an avatar circle (initials or icon) with name/title sliding in, and 5-star rating popping in one by one with bounce. Multiple testimonials cycle automatically with a smooth slide-transition overlap. Navigation dots appear at the bottom. Pass pipe-separated quote | name | title triplets in text (e.g. "Game changer | Sarah Chen | CEO, TechCo | Incredible results | Marcus Lee | Creator"). Perfect for social proof, reviews, customer stories, landing page reveals, or any trust-building moment in a product video. 5–9s.
- globe-3d: 3D WIREFRAME GLOBE with location pins. Uses true 3D perspective projection (math3d.ts) to render a rotating globe with latitude/longitude wireframe grid, gradient-filled continent landmass areas, glowing location marker pins with pulse rings, and floating background star particles. The globe auto-rotates smoothly with a subtle wobble, springs in with elastic entry, and has an atmospheric glow bloom behind it. Pass optional text for a label below with an underline accent stripe. Perfect for global/worldwide messaging, travel content, international business, SaaS products, metric reveals with a global scope, or any "worldwide" moment in a video. 4–8s.
- device-mockup: PREMIUM SMARTPHONE DEVICE MOCKUP with screen content. A realistic phone body with metallic gradient frame, rounded corners, side buttons, and notch/dynamic island springs in with elastic bounce and gentle floating animation. The screen shows a modern UI demo: staggered content rows (bars and sub-elements) with brand-colored opacity blocks slide in, plus a CTA pill button at the bottom. A subtle diagonal screen glare sweeps across on entry. The device gently bobs and rotates for a lifelike feel. Pass optional text for a label below the device with an underline accent. Perfect for app demos, website showcases, feature reveals, digital product launches, or any "mobile-first" moment in a video. 4–7s.
- liquid-loader: FLUID MORPHING LOADING BLOB with neon glow. A liquid-like blob morphs continuously using layered sine waves (3-4 harmonics) that deform a circular point array into organic shapes. The blob has a radial gradient fill, outer glow bloom with shadow-blur pulse, and orbiting accent-colored micro-orbs drifting on Lissajous paths. A spinning dashed ring orbits at the center as a progress indicator, and a percentage counter ticks up 0→100 with staggered ease. Perfect for loading screens, buffering moments, progress reveals, or any "waiting" moment that should feel premium instead of empty. 3–6s.
- magnetic-button: MAGNETIC PULL CTA BUTTON with cursor physics simulation. A pill-shaped button springs in with elastic overshoot inside a dark background. The button visually "reaches" toward an animated cursor that drifts in an elliptical path around it — simulating magnetic attraction. The button has a diagonal gradient fill (primary→accent), white label text, a glow shadow that pulses, and expansion rings that emanate outward from the button edge at staggered intervals. The button floats gently with a subtle bob. Pass text for the button label, and optional secondary text appears below after a delay. Perfect for end screens, "Get Started" CTAs, download prompts, subscribe buttons, or any conversion moment. 3–5s.
- spotlight-card: INTERACTIVE SPOTLIGHT CARD with dynamic light tracking. A dark glassmorphic card sits on a dim background with a moving spotlight (radial gradient) that sweeps across the card surface following a smooth Lissajous trajectory. The spotlight subtly reveals card content: title, staggered content skeleton lines with accent sub-elements, and a CTA pill at the bottom. A glowing border highlight follows the spotlight position around the card edge. The card enters with elastic spring and has a entry rim flash. Intensity controls the number of content skeleton lines. Pass text for the card title. Perfect for feature highlights, product showcases, pricing tiers, testimonial cards, or any "spotlight" moment. 4–7s.
- neon-command-menu: CMDK-STYLE SEARCH PALETTE with blur backdrop. A dark overlay fades in, then a sleek command palette drops in with scale+slide entry. The palette contains a search bar with magnifier icon, placeholder text, and a blinking neon cursor. Below are 4-6 command items with icon, label, and keyboard shortcut badge — one item highlights as "hovered" with glowing accent border. Items stagger in with slide-fade. The backdrop has a subtle blur via vertical gradient lines. Pass text for search placeholder. Perfect for power-user moments, productivity showcases, app demo features, editor walkthroughs, or any "tools" reveal. 4–6s.
- floating-dock: MACOS-INSPIRED DOCK with magnification bounce. A pill-shaped glass dock springs up from the bottom center with elastic overshoot. App icons (Finder, Edit, Player, Studio, Canvas, etc.) slide in with staggered entrance and bounce. One icon at a time magnifies and pops upward with a label tooltip, simulating hover interaction. Active icon has a colored glow aura. The dock has a subtle glass border and shadow. Intensity controls the number of visible apps (5-7). Pass optional text for a label above the dock. Perfect for software demos, app showcases, product launches, creator tool reveals, or any "workspace" moment. 4–7s.
- holographic-card: 3D HOLOGRAPHIC REFLECTIVE CARD with rainbow sheen. A dark card with a subtle 3D perspective tilt (animated via canvas transform) floats on a particle-dotted background. A rainbow iridescent sheen sweeps across the card surface following a circular trajectory with six gradient stops (red→yellow→green→blue→purple). Subtle horizontal scan lines add a futuristic feel. The rainbow border shimmers with a matching gradient. Content reveals with staggered fade: title, subtitle, a "HOLOGRAPHIC" badge, feature list items, and a CTA "Explore →" pill. The card has a pulsing purple glow aura. Intensity controls the number of features shown. Perfect for premium/SaaS product reveals, luxury brand showcases, tech demos, NFT or Web3 content, or any moment needing a futuristic, premium visual. 4–7s.
- metrics-dashboard: PREMIUM ANALYTICS KPI DASHBOARD with animated metrics and bar chart. A complete data dashboard reveals with staggered entrance on a dark background with subtle radial glow. Header title animates in first, then 2-4 glassmorphic metric cards slide in with accent-colored left borders, icons, labels, live number counters with "k" formatting, green/red delta percentages, filled progress bars, and mini sparkline trend lines. Below the cards, a bar chart grows with column-by-column ease animation with day labels. Intensity controls the number of metric cards (2-4). Pass text for the dashboard header title; optional secondary text appears at the bottom. Perfect for SaaS metrics, revenue reports, growth presentations, funding announcements, annual reviews, marketing analytics, or any data-driven moment that needs to look premium and insightful. 5–8s.
- neural-intelligence-core: LIVING AI BRAIN VISUALIZATION — a sentient neural network rendered in real time. A pulsating energy core with layered translucent shells, rotating magnetic field rings, and dynamic electric arcs sits at center. Thousands of particles float around while neural nodes connect via proximity-based organic curves; traveling pulse signals propagate through the network. Three distinct behavioral phases: IDLE (slow breathing core, random neuron activations), ACTIVE (cursor-attracted nodes reorganize connections, intelligence waves pulse), and EXTREME (massive sync pulse shockwave, full network flash, all nodes briefly connect). 7 visual layers: deep space background, floating dust, neural lines, intelligence core, electric arcs, glow bloom, cinematic grain. Three color modes via icon param: "ai-blue" (cyan/electric blue), "quantum-purple" (violet/magenta/neon pink), "bio-neural" (toxic green/emerald). Pass text for a label below. Perfect for AI startup landing pages, hero sections, loading experiences, assistant UIs, or any moment needing to communicate artificial intelligence, sentience, or advanced computing. 5–9s.
- cinematic-title-opener: PREMIUM CINEMATIC TITLE OPENER at After Effects template quality. A dark premium background with subtle grid texture and vignette sets the stage. Light streaks sweep across at staggered timing with linear gradient fade. Three-depth parallax particle system (foreground/mid/background) drifts with camera-like motion. Accent geometric shapes (circles + squares) fade in at corners. A glowing horizontal accent line draws in with elastic overshoot, flanked by a secondary thinner line. The main title text enters with letter-spacing expansion, scale-up, and a motion-blur trail shadow that fades as the text settles — finished with a gradient fill (white → primary-tinted white) and a subtle accent glow. Below, a tagline fades in with a pulsing accent dot. At high intensity, a bottom "SCROLL →" badge with outlined pill appears. A star-sparkle shine accent flashes on title settle. Intensity controls light streak count and particle density. Pass text for the main title. Perfect for video intros, channel openers, brand films, cinematic presentations, sizzle reels, or any moment that needs a premium, dramatic title reveal. 5–8s.

5. Each beat's params:
   - text: short phrase pulled from or paraphrased from the script (under 60 chars).
   - icon: for icon-burst, particle-burst, callout-arrow: a single lucide-react icon name (e.g., "Zap", "Brain", "Rocket", "TrendingUp", "Star", "Heart", "Fire") OR an emoji codepoint.
   - palette: prefer the user-requested palette.
   - intensity: 1-3 (loudness). Hooks and climaxes are 3.
   - anchor: top, center, bottom, left, right. Vary across beats.
6. rationale: ONE sentence explaining why you picked this primitive for this moment.
7. topicSlug: kebab-case slug of the script's topic, 2-5 words, no punctuation.
8. suggestedPalette: your overall palette pick (energetic, corporate, kids, or cinematic).

Output ONLY valid JSON matching the response schema. No prose. No markdown.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    topicSlug: { type: 'STRING' },
    suggestedPalette: { type: 'STRING', enum: ['energetic', 'corporate', 'kids', 'cinematic', 'neon-bright', 'pastel-pop', 'gradient-blast'] },
    duration: { type: 'NUMBER' },
    beats: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          startTime: { type: 'NUMBER' },
          endTime: { type: 'NUMBER' },
          primitive: { type: 'STRING' },
          rationale: { type: 'STRING' },
          params: {
            type: 'OBJECT',
            properties: {
              text: { type: 'STRING' },
              icon: { type: 'STRING' },
              palette: { type: 'STRING', enum: PALETTES },
              anchor: { type: 'STRING', enum: ['top', 'center', 'bottom', 'left', 'right'] },
              intensity: { type: 'INTEGER' },
            },
            required: ['palette', 'intensity'],
          },
        },
        required: ['id', 'startTime', 'endTime', 'primitive', 'params'],
      },
    },
  },
  required: ['topicSlug', 'suggestedPalette', 'duration', 'beats'],
} as const;

const getApiKey = (): string => {
  const key =
    localStorage.getItem('createrin_api_key') ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_API_KEY ||
    '';
  if (!key) throw new Error('API key not configured. Set it in the app settings.');
  return key;
};

interface RawPlan {
  topicSlug?: unknown;
  suggestedPalette?: unknown;
  duration?: unknown;
  beats?: unknown;
}

interface RawBeat {
  id?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  primitive?: unknown;
  rationale?: unknown;
  params?: {
    text?: unknown;
    icon?: unknown;
    palette?: unknown;
    anchor?: unknown;
    intensity?: unknown;
  };
}

const sanitizePlan = (raw: RawPlan, durationSec: number, requestedPalette: Palette): MotionPlan => {
  const duration = typeof raw?.duration === 'number' && Number.isFinite(raw.duration) ? raw.duration : durationSec;
  const suggested = typeof raw?.suggestedPalette === 'string' && (PALETTES as string[]).includes(raw.suggestedPalette)
    ? (raw.suggestedPalette as Palette)
    : ('energetic' as Palette);
  const slug =
    typeof raw?.topicSlug === 'string' && raw.topicSlug
      ? raw.topicSlug
          .toLowerCase()
          .replace(/[^a-z0-9-\s]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .slice(0, 60) || 'motion-graphics-video'
      : 'motion-graphics-video';

  const rawBeats = Array.isArray(raw?.beats) ? (raw.beats as RawBeat[]) : [];
  const beats: MotionBeat[] = rawBeats
    .filter((b) => b && typeof b.primitive === 'string' && (PRIMITIVE_TYPES as string[]).includes(b.primitive))
    .map((b, i) => {
      const startTime = Math.max(0, Math.min(durationSec, Number(b.startTime) || 0));
      const endTimeRaw = Number(b.endTime) || startTime + 1;
      const endTime = Math.max(startTime + 0.1, Math.min(durationSec, endTimeRaw));
      const pIn = b.params || {};
      const intensity = ([1, 2, 3].includes(Number(pIn.intensity)) ? Number(pIn.intensity) : 2) as 1 | 2 | 3;
      const palette = (typeof pIn.palette === 'string' && (PALETTES as string[]).includes(pIn.palette)
        ? (pIn.palette as Palette)
        : requestedPalette) as Palette;
      const anchor = (['top', 'center', 'bottom', 'left', 'right'].includes(String(pIn.anchor))
        ? (pIn.anchor as MotionBeatParams['anchor'])
        : 'center') as MotionBeatParams['anchor'];

      // QUALITY FILTER: Substitute removed templates with production-ready alternatives
      let primitiveType = b.primitive as PrimitiveType;
      const qualityCheck = QUALITY_SCORES[primitiveType];
      if (qualityCheck && qualityCheck.overallScore < 4) {
        // Template is marked for removal - use fallback
        primitiveType = getSubstitute(primitiveType) as PrimitiveType;
      }

      return {
        id: typeof b.id === 'string' && b.id ? b.id : `beat-${i}-${Math.random().toString(36).slice(2, 8)}`,
        startTime,
        endTime,
        primitive: primitiveType,
        rationale: typeof b.rationale === 'string' ? b.rationale : undefined,
        params: {
          text: typeof pIn.text === 'string' ? pIn.text.slice(0, 120) : undefined,
          icon: typeof pIn.icon === 'string' ? pIn.icon.slice(0, 40) : undefined,
          palette,
          anchor,
          intensity,
        },
      };
    })
    .sort((a, b) => a.startTime - b.startTime);

  return { topicSlug: slug, suggestedPalette: suggested, duration, beats };
};

const ASPECT_GUIDANCE: Record<AspectRatio, string> = {
  '16:9': 'Landscape 16:9 (YouTube). Plenty of horizontal room — use lower-thirds at bottom-left, callouts on either side, big-text-reveal can span full width.',
  '9:16': 'Vertical 9:16 (TikTok / Reels / Shorts). Vertical real estate — favor anchor=top and anchor=bottom; avoid wide horizontal compositions. Use anchor=center for hero shots. Lower-thirds will be small; prefer big-text-reveal at top/bottom.',
  '1:1':  'Square 1:1 (Instagram feed). Centered compositions read best. Avoid edge-anchored elements unless they have padding.',
  '4:5':  'Portrait 4:5 (Instagram portrait). Similar to 9:16 but less extreme — anchor=top/center/bottom all read well.',
};

export const analyzeScript = async (opts: AnalyzeScriptOptions): Promise<MotionPlan> => {
  const { script, durationSec, palette = 'energetic', intensity = 2, aspectRatio = '16:9' } = opts;

  if (!script || script.trim().length < 5) {
    throw new Error('Script is too short. Paste at least one sentence.');
  }
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error('Duration must be a positive number of seconds.');
  }

  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const userPrompt = `Target duration: ${durationSec.toFixed(1)} seconds.
Requested palette: ${palette}.
Default intensity: ${intensity}.
Aspect ratio: ${aspectRatio} (${ASPECTS[aspectRatio].label}). ${ASPECT_GUIDANCE[aspectRatio]}

SCRIPT:
${script}`;

  let response;
  try {
    response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA as unknown as Record<string, unknown>,
        temperature: 0.8,
      } as Record<string, unknown>,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Gemini call failed: ${msg}`);
  }

  const text = response.text || '{}';
  let parsed: RawPlan;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Gemini returned invalid JSON. Try again or shorten the script.');
  }

  const plan = sanitizePlan(parsed, durationSec, palette);
  if (plan.beats.length === 0) {
    throw new Error('AI produced zero valid beats. Try a longer or more concrete script.');
  }
  return plan;
};

export const PRIMITIVE_LABELS: Record<PrimitiveType, string> = {
  'big-text-reveal': 'Big Text Reveal',
  'lower-third': 'Lower Third',
  'icon-burst': 'Icon Burst',
  'counter': 'Counter',
  'highlight-box': 'Highlight Box',
  'bar-reveal': 'Bar Reveal',
  'bg-gradient-pulse': 'Background Pulse',
  'transition-wipe': 'Transition Wipe',
  'quote-card': 'Quote Card',
  'bullet-list-reveal': 'Bullet List',
  'callout-arrow': 'Callout Arrow',
  'word-emphasis-flash': 'Word Flash',
  'camera-zoom-3d': '3D Camera Zoom',
  'animated-arrow': 'Animated Arrow',
  'particle-burst': 'Particle Burst',
  'glitch-text': 'Glitch Text',
  'light-sweep': 'Light Sweep',
  'aurora-text': 'Aurora Text',
  'shimmer-text': 'Shimmer Text',
  'hyper-text': 'Hyper Text',
  'meteors': 'Meteors',
  'ripple': 'Ripple',
  'retro-grid': 'Retro Grid',
  'border-beam': 'Border Beam',
  'spotlight': 'Spotlight',
  'morph-text': 'Morph Text',
  'typewriter': 'Typewriter',
  'kinetic-text': 'Kinetic Text',
  'shockwave': 'Shockwave',
  'confetti': 'Confetti',
  'wave-text': 'Wave Text',
  'fire-text': 'Fire Text',
  'countdown': 'Countdown',
  'glitch-screen': 'Glitch Screen',
  'neon-sign': 'Neon Sign',
  'liquid-bg': 'Liquid BG',
  // Phase 9
  'scene-3d': '3D World Scene',
  'text-3d': '3D Extruded Text',
  'camera-cinematic': 'Cinematic Camera',
  // Phase 10
  'paper-tear': 'Paper Tear',
  'glass-panel': 'Glassmorphism Panel',
  'cyber-hud': 'Cyber HUD',
  'marquee-text': 'Marquee Text',
  'cursor-click-ui': 'Cursor Click & UI Reveal',
  'bento-grid': 'Bento Grid Reveal',
  'device-tilt-3d': '3D Device Tilt',
  'liquid-morph': 'Liquid Morph Transition',
  'card-carousel-3d': '3D Card Flip Carousel',
  'search-rank-list': 'Google Search Rank List',
  'map-route-tracker': 'Interactive Map Tracker',
  'dynamic-callout': 'Blueprint Spec Callout',
  'versus-duel': 'Versus Split Duel',
  'notification-stack': 'Notification Stack',
  'code-terminal-ui': 'Code Terminal UI',
  // Phase 11
  'animated-emoji-button': 'Animated Emoji Button',
  'glass-toggle': 'Glass Toggle Switch',
  'circular-progress': 'Circular Progress Ring',
  'pricing-table': 'Pricing Table Cards',
  'testimonial-rotator': 'Testimonial Rotator',
  'ai-chat-message': 'AI Chat Message',
  'floating-product-card': 'Floating Product Card',
  'polaroid-stack': 'Polaroid Stack',
  'morphing-shapes': 'Morphing Shapes',
  'gradient-orbs': 'Gradient Orbs',
  'before-after-reveal': 'Before / After Reveal',
  'globe-3d': 'Globe 3D',
  'device-mockup': 'Device Mockup',
  'holo-projection': 'Holographic Projection',
  'liquid-loader': 'Liquid Loader',
  'magnetic-button': 'Magnetic Button',
  'spotlight-card': 'Spotlight Card',
  'neon-command-menu': 'Neon Command Menu',
  'floating-dock': 'Floating Dock',
  'holographic-card': 'Holographic Card',
  'metrics-dashboard': 'Metrics Dashboard',
  'neural-intelligence-core': 'Neural Intelligence Core',
  'cinematic-title-opener': 'Cinematic Title Opener',
  'ai-search-bar': 'AI Search Bar',
  'mesh-gradient-bg': 'Mesh Gradient BG',
  'scroll-reveal-stack': 'Scroll Reveal Stack',
  'dynamic-island': 'Dynamic Island',
  'floating-notification': 'Floating Notification',
  'particle-trail-cursor': 'Particle Trail Cursor',
  'infinite-logo-marquee': 'Infinite Logo Marquee',
  'elastic-slider': 'Elastic Slider',
  'ai-thinking-loader': 'AI Thinking Loader',
  'text-scramble': 'Text Scramble',
  'network-graph': 'Network Graph',
  // Phase 13
  'stacked-notes': 'Stacked Notes',
  'voice-waveform': 'Voice Waveform',
  'shimmer-button': 'Shimmer Button',
  'pixel-transition': 'Pixel Transition',
  'flip-clock': 'Flip Clock',
  'quantum-card-explosion': 'Quantum Card Explosion',
  'split-text-reveal': 'Split Text Reveal',
  'showcase-reel': 'Showcase Reel',
  'title-opener': 'Title Opener',
  'trailer-title': 'Trailer Title Slam',
};

export const PRIMITIVE_COLORS: Record<PrimitiveType, string> = {
  'big-text-reveal': '#3b82f6',
  'lower-third': '#10b981',
  'icon-burst': '#f59e0b',
  'counter': '#8b5cf6',
  'highlight-box': '#ef4444',
  'bar-reveal': '#06b6d4',
  'bg-gradient-pulse': '#ec4899',
  'transition-wipe': '#64748b',
  'quote-card': '#a855f7',
  'bullet-list-reveal': '#22c55e',
  'callout-arrow': '#eab308',
  'word-emphasis-flash': '#fb7185',
  'camera-zoom-3d': '#f43f5e',
  'animated-arrow': '#fbbf24',
  'particle-burst': '#a855f7',
  'glitch-text': '#06b6d4',
  'light-sweep': '#fde047',
  'aurora-text': '#a855f7',
  'shimmer-text': '#facc15',
  'hyper-text': '#22d3ee',
  'meteors': '#60a5fa',
  'ripple': '#34d399',
  'retro-grid': '#f472b6',
  'border-beam': '#fb7185',
  'spotlight': '#fde68a',
  'morph-text': '#c084fc',
  'typewriter': '#4ade80',
  'kinetic-text': '#fb923c',
  'shockwave': '#f87171',
  'confetti': '#facc15',
  'wave-text': '#38bdf8',
  'fire-text': '#f97316',
  'countdown': '#ef4444',
  'glitch-screen': '#22d3ee',
  'neon-sign': '#e879f9',
  'liquid-bg': '#818cf8',
  // Phase 9
  'scene-3d': '#38bdf8',
  'text-3d': '#a78bfa',
  'camera-cinematic': '#f43f5e',
  // Phase 10
  'paper-tear': '#fcd34d',
  'glass-panel': '#93c5fd',
  'cyber-hud': '#34d399',
  'marquee-text': '#fbbf24',
  'cursor-click-ui': '#f472b6',
  'bento-grid': '#818cf8',
  'device-tilt-3d': '#38bdf8',
  'liquid-morph': '#ec4899',
  'card-carousel-3d': '#a78bfa',
  'search-rank-list': '#fbbf24',
  'map-route-tracker': '#10b981',
  'dynamic-callout': '#ec4899',
  'versus-duel': '#f59e0b',
  'notification-stack': '#a855f7',
  'code-terminal-ui': '#22d3ee',
  // Phase 11
  'animated-emoji-button': '#f472b6',
  'glass-toggle': '#06b6d4',
  'circular-progress': '#22c55e',
  'pricing-table': '#f59e0b',
  'testimonial-rotator': '#a855f7',
  'ai-chat-message': '#22d3ee',
  'floating-product-card': '#f472b6',
  'polaroid-stack': '#fbbf24',
  'morphing-shapes': '#a855f7',
  'gradient-orbs': '#ec4899',
  'before-after-reveal': '#6366f1',
  'globe-3d': '#06b6d4',
  'device-mockup': '#8b5cf6',
  'holo-projection': '#00e5ff',
  'liquid-loader': '#3b82f6',
  'magnetic-button': '#f43f5e',
  'spotlight-card': '#f59e0b',
  'neon-command-menu': '#a855f7',
  'floating-dock': '#10b981',
  'holographic-card': '#9b59b6',
  'ai-search-bar': '#8b5cf6',
  'mesh-gradient-bg': '#ec4899',
  'scroll-reveal-stack': '#3b82f6',
  'dynamic-island': '#06b6d4',
  'floating-notification': '#a855f7',
  'particle-trail-cursor': '#f472b6',
  'infinite-logo-marquee': '#fbbf24',
  'elastic-slider': '#22d3ee',
  'ai-thinking-loader': '#8b5cf6',
  'text-scramble': '#22d3ee',
  'metrics-dashboard': '#6366f1',
  'neural-intelligence-core': '#06b6d4',
  'cinematic-title-opener': '#f43f5e',
  'network-graph': '#a855f7',
  // Phase 13
  'stacked-notes': '#fef08a',
  'voice-waveform': '#34d399',
  'shimmer-button': '#f43f5e',
  'pixel-transition': '#8b5cf6',
  'flip-clock': '#1e293b',
  'quantum-card-explosion': '#a855f7',
  'split-text-reveal': '#f43f5e',
  'showcase-reel': '#f59e0b',
  'title-opener': '#ec4899',
  'trailer-title': '#c0c0ff',
};
