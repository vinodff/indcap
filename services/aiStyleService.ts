/**
 * AI Style Service — Uses Gemini to analyze video content and auto-select
 * the best caption style (font, color, animation) based on the content.
 */

import { GoogleGenAI, Type } from "@google/genai";
import { Caption, CaptionStyle, EntryAnimation, WordHighlightMode, ExitAnimation } from "../types";

const getApiKey = (): string => {
  const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const key = envKey || localStorage.getItem('createrin_api_key');
  if (!key) throw new Error("API Key not found.");
  return key;
};

// ─────────────────────────────────────────────────────────
// THEME PRESETS — Complete style bundles for quick apply
// ─────────────────────────────────────────────────────────

export interface ThemePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  captionStyle: CaptionStyle;
  fontFamily: string;
  fontWeight: string | number;
  textColor: string;
  bgEnabled: boolean;
  bgColor: string;
  bgPadding: number;
  bgRadius: number;
  strokeWidth: number;
  strokeColor: string;
  uppercase: boolean;
  entryAnimation: EntryAnimation;
  exitAnimation: ExitAnimation;
  wordHighlight: WordHighlightMode;
  animationSpeed: 'FAST' | 'MEDIUM' | 'SLOW';
  gradientColors?: string[];
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'podcast',
    name: 'Podcast',
    category: 'Professional',
    description: 'Clean, minimal, professional narration',
    icon: '🎙️',
    captionStyle: CaptionStyle.CINEMATIC,
    fontFamily: "'Playfair Display', serif",
    fontWeight: 700,
    textColor: '#FFFFFF',
    bgEnabled: false,
    bgColor: 'rgba(0,0,0,0.5)',
    bgPadding: 12,
    bgRadius: 8,
    strokeWidth: 0,
    strokeColor: '#000000',
    uppercase: false,
    entryAnimation: 'FADE_IN',
    exitAnimation: 'FADE_OUT',
    wordHighlight: 'SPOTLIGHT',
    animationSpeed: 'SLOW',
  },
  {
    id: 'motivation',
    name: 'Motivation',
    category: 'Dynamic',
    description: 'Bold, impactful, high-energy text',
    icon: '🔥',
    captionStyle: CaptionStyle.HORMOZI,
    fontFamily: "'Bebas Neue', display",
    fontWeight: 900,
    textColor: '#FACC15',
    bgEnabled: false,
    bgColor: 'rgba(0,0,0,0.5)',
    bgPadding: 12,
    bgRadius: 8,
    strokeWidth: 8,
    strokeColor: '#000000',
    uppercase: true,
    entryAnimation: 'BOUNCE',
    exitAnimation: 'FADE_OUT',
    wordHighlight: 'KARAOKE',
    animationSpeed: 'FAST',
  },
  {
    id: 'meme',
    name: 'Meme',
    category: 'Fun',
    description: 'Loud, comic, attention-grabbing text',
    icon: '😂',
    captionStyle: CaptionStyle.BEAST_MODE,
    fontFamily: "'Bangers', cursive",
    fontWeight: 400,
    textColor: '#FFD700',
    bgEnabled: false,
    bgColor: 'rgba(0,0,0,0.5)',
    bgPadding: 12,
    bgRadius: 8,
    strokeWidth: 8,
    strokeColor: '#000000',
    uppercase: true,
    entryAnimation: 'ZOOM_IN',
    exitAnimation: 'ZOOM_OUT',
    wordHighlight: 'COLOR_POP',
    animationSpeed: 'FAST',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    category: 'Professional',
    description: 'Elegant, dark tones, slow transitions',
    icon: '🎬',
    captionStyle: CaptionStyle.LUXURY_GOLD,
    fontFamily: "'Playfair Display', serif",
    fontWeight: 700,
    textColor: '#FCD34D',
    bgEnabled: false,
    bgColor: 'rgba(0,0,0,0.5)',
    bgPadding: 12,
    bgRadius: 8,
    strokeWidth: 0,
    strokeColor: '#000000',
    uppercase: false,
    entryAnimation: 'FADE_IN',
    exitAnimation: 'DISSOLVE',
    wordHighlight: 'NONE',
    animationSpeed: 'SLOW',
  },
  {
    id: 'gaming',
    name: 'Gaming',
    category: 'Dynamic',
    description: 'Neon glow, high-energy, streamer vibes',
    icon: '🎮',
    captionStyle: CaptionStyle.NEON_GLOW,
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 900,
    textColor: '#00FFFF',
    bgEnabled: false,
    bgColor: 'rgba(0,0,0,0.5)',
    bgPadding: 12,
    bgRadius: 8,
    strokeWidth: 3,
    strokeColor: '#003344',
    uppercase: true,
    entryAnimation: 'GLITCH',
    exitAnimation: 'GLITCH_OUT',
    wordHighlight: 'BOX',
    animationSpeed: 'FAST',
  },
  {
    id: 'tiktok_viral',
    name: 'TikTok Viral',
    category: 'Trending',
    description: 'The classic trending word-pop style',
    icon: '📱',
    captionStyle: CaptionStyle.WORD_POP,
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 900,
    textColor: '#FFFFFF',
    bgEnabled: false,
    bgColor: 'rgba(0,0,0,0.5)',
    bgPadding: 0,
    bgRadius: 0,
    strokeWidth: 6,
    strokeColor: '#000000',
    uppercase: true,
    entryAnimation: 'SHATTER',
    exitAnimation: 'ZOOM_OUT',
    wordHighlight: 'KARAOKE',
    animationSpeed: 'FAST',
  },
  {
    id: 'fire_pop',
    name: 'Fire Pop',
    category: 'Dynamic',
    description: 'Flaming word highlight for hype moments',
    icon: '🌋',
    captionStyle: CaptionStyle.FIRE_WORD,
    fontFamily: "'Anton', sans-serif",
    fontWeight: 900,
    textColor: '#FF9500',
    bgEnabled: false,
    bgColor: 'rgba(0,0,0,0)',
    bgPadding: 0,
    bgRadius: 0,
    strokeWidth: 4,
    strokeColor: '#8B1A00',
    uppercase: true,
    entryAnimation: 'BOUNCE',
    exitAnimation: 'FADE_OUT',
    wordHighlight: 'FIRE',
    animationSpeed: 'FAST',
  },
  {
    id: 'rainbow_wave',
    name: 'Rainbow Wave',
    category: 'Fun',
    description: 'Colorful cycling text',
    icon: '🌈',
    captionStyle: CaptionStyle.RAINBOW_BURST,
    fontFamily: "'Fredoka', sans-serif",
    fontWeight: 700,
    textColor: '#FF6B6B',
    bgEnabled: false,
    bgColor: 'rgba(0,0,0,0)',
    bgPadding: 0,
    bgRadius: 0,
    strokeWidth: 5,
    strokeColor: '#000000',
    uppercase: true,
    entryAnimation: 'WIPE_RIGHT',
    exitAnimation: 'FADE_OUT',
    wordHighlight: 'RAINBOW',
    animationSpeed: 'MEDIUM',
  },
  {
    id: 'vlog_minimal',
    name: 'Vlog Minimal',
    category: 'Professional',
    description: 'Clean fade for lifestyle and vlogs',
    icon: '☕',
    captionStyle: CaptionStyle.CLEAN_WHITE,
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    textColor: '#FFFFFF',
    bgEnabled: true,
    bgColor: 'rgba(0,0,0,0.55)',
    bgPadding: 22,
    bgRadius: 14,
    strokeWidth: 0,
    strokeColor: '#000000',
    uppercase: false,
    entryAnimation: 'FADE_IN',
    exitAnimation: 'DISSOLVE',
    wordHighlight: 'SPOTLIGHT',
    animationSpeed: 'MEDIUM',
  },
  {
    id: 'neon_nights',
    name: 'Neon Nights',
    category: 'Dynamic',
    description: 'Cyberpunk karaoke glow',
    icon: '🔮',
    captionStyle: CaptionStyle.KARAOKE_FLOW,
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 900,
    textColor: '#00F5FF',
    bgEnabled: false,
    bgColor: 'rgba(0,0,0,0)',
    bgPadding: 0,
    bgRadius: 0,
    strokeWidth: 0,
    strokeColor: '#004F60',
    uppercase: false,
    entryAnimation: 'GLITCH',
    exitAnimation: 'GLITCH_OUT',
    wordHighlight: 'WAVE',
    animationSpeed: 'FAST',
  },
  {
    id: 'highlight_slam',
    name: 'Highlight Slam',
    category: 'Trending',
    description: 'Bold yellow highlight box per word',
    icon: '✍️',
    captionStyle: CaptionStyle.HIGHLIGHT_BOX,
    fontFamily: "'Inter', sans-serif",
    fontWeight: 900,
    textColor: '#FFFFFF',
    bgEnabled: false,
    bgColor: 'rgba(0,0,0,0)',
    bgPadding: 0,
    bgRadius: 0,
    strokeWidth: 0,
    strokeColor: '#000',
    uppercase: true,
    entryAnimation: 'BOUNCE',
    exitAnimation: 'ZOOM_OUT',
    wordHighlight: 'BOX',
    animationSpeed: 'FAST',
  },
  {
    id: 'gradient_dream',
    name: 'Gradient Dream',
    category: 'Fun',
    description: 'Vivid multi-color gradient text',
    icon: '🌊',
    captionStyle: CaptionStyle.GRADIENT_DREAM,
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 900,
    textColor: '#FFFFFF',
    bgEnabled: false,
    bgColor: 'rgba(0,0,0,0)',
    bgPadding: 0,
    bgRadius: 0,
    strokeWidth: 0,
    strokeColor: '#000',
    uppercase: true,
    entryAnimation: 'FADE_IN',
    exitAnimation: 'DISSOLVE',
    wordHighlight: 'NONE',
    animationSpeed: 'MEDIUM',
    gradientColors: ['#6366F1', '#EC4899', '#F97316'],
  },
  {
    id: 'shatter_glass',
    name: 'Shatter Glass',
    category: 'Unique',
    description: 'Sci-fi ice-crystal text that cracks in like broken glass',
    icon: '🧊',
    captionStyle: CaptionStyle.GLITCH_CYBER,
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 900,
    textColor: '#FF00FF',
    bgEnabled: true,
    bgColor: 'rgba(10, 0, 40, 0.75)',
    bgPadding: 18,
    bgRadius: 4,
    strokeWidth: 4,
    strokeColor: '#00FFFF',
    uppercase: true,
    entryAnimation: 'SHATTER',
    exitAnimation: 'GLITCH_OUT',
    wordHighlight: 'SPARKLE',
    animationSpeed: 'FAST',
    gradientColors: ['#00FFFF', '#FF00FF', '#FFE600'],
  },
  {
    id: 'emoji_fire',
    name: 'Emoji Fire',
    category: 'Fun',
    description: 'Blazing animated fire emojis bracketing bold text',
    icon: '🔥',
    captionStyle: CaptionStyle.EMOJI_FIRE,
    fontFamily: "'Anton', sans-serif",
    fontWeight: 400,
    textColor: '#FFF200',
    bgEnabled: false,
    bgColor: 'rgba(0,0,0,0)',
    bgPadding: 0,
    bgRadius: 0,
    strokeWidth: 14,
    strokeColor: '#CC2200',
    uppercase: true,
    entryAnimation: 'BOUNCE',
    exitAnimation: 'FADE_OUT',
    wordHighlight: 'FIRE',
    animationSpeed: 'FAST',
    gradientColors: ['#FF4500', '#FF8C00', '#FFD700'],
  },
  {
    id: 'emoji_sparkle',
    name: 'Emoji Sparkle',
    category: 'Fun',
    description: 'Magical sparkle emojis with purple glow effect',
    icon: '✨',
    captionStyle: CaptionStyle.EMOJI_SPARKLE,
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 900,
    textColor: '#FFFFFF',
    bgEnabled: false,
    bgColor: 'rgba(0,0,0,0)',
    bgPadding: 0,
    bgRadius: 0,
    strokeWidth: 6,
    strokeColor: '#4C1D95',
    uppercase: false,
    entryAnimation: 'FADE_IN',
    exitAnimation: 'DISSOLVE',
    wordHighlight: 'SPARKLE',
    animationSpeed: 'MEDIUM',
    gradientColors: ['#7C3AED', '#EC4899', '#A855F7'],
  },
  {
    id: 'emoji_party',
    name: 'Emoji Party',
    category: 'Fun',
    description: 'Festive party emojis with rainbow pop energy',
    icon: '🎉',
    captionStyle: CaptionStyle.EMOJI_PARTY,
    fontFamily: "'Bangers', cursive",
    fontWeight: 400,
    textColor: '#FFD700',
    bgEnabled: false,
    bgColor: 'rgba(0,0,0,0)',
    bgPadding: 0,
    bgRadius: 0,
    strokeWidth: 12,
    strokeColor: '#000000',
    uppercase: true,
    entryAnimation: 'ZOOM_IN',
    exitAnimation: 'ZOOM_OUT',
    wordHighlight: 'RAINBOW',
    animationSpeed: 'FAST',
    gradientColors: ['#FF6B6B', '#FECA57', '#48DBFB', '#FF9FF3'],
  },
  {
    id: 'emoji_auto',
    name: '🌟 Emoji Auto Matcher',
    category: 'Fun',
    description: 'AI automatically picks the perfect animated emoji for each sentence',
    icon: '✨',
    captionStyle: CaptionStyle.EMOJI_AUTO,
    fontFamily: "'Bebas Neue', display",
    fontWeight: 400,
    textColor: '#FFFFFF',
    bgEnabled: true,
    bgColor: 'rgba(0,0,0,0.45)',
    bgPadding: 20,
    bgRadius: 16,
    strokeWidth: 10,
    strokeColor: '#000000',
    uppercase: true,
    entryAnimation: 'BOUNCE',
    exitAnimation: 'FADE_OUT',
    wordHighlight: 'COLOR_POP',
    animationSpeed: 'FAST',
    gradientColors: [],
  },
];

// ─────────────────────────────────────────────────────────
// EMOTION → STYLE MAPPING
// ─────────────────────────────────────────────────────────

export interface EmotionStyleMapping {
  entryAnimation: EntryAnimation;
  animationSpeed: 'FAST' | 'MEDIUM' | 'SLOW';
  wordHighlight: WordHighlightMode;
  textColorOverride?: string;
}

export const EMOTION_STYLE_MAP: Record<string, EmotionStyleMapping> = {
  energetic: {
    entryAnimation: 'BOUNCE',
    animationSpeed: 'FAST',
    wordHighlight: 'COLOR_POP',
    textColorOverride: '#FF6B6B',
  },
  calm: {
    entryAnimation: 'FADE_IN',
    animationSpeed: 'SLOW',
    wordHighlight: 'SPOTLIGHT',
  },
  serious: {
    entryAnimation: 'SLIDE_UP',
    animationSpeed: 'MEDIUM',
    wordHighlight: 'UNDERLINE',
  },
  joyful: {
    entryAnimation: 'ZOOM_IN',
    animationSpeed: 'FAST',
    wordHighlight: 'KARAOKE',
    textColorOverride: '#FACC15',
  },
};

// ─────────────────────────────────────────────────────────
// AI AUTO-STYLE SUGGESTION
// ─────────────────────────────────────────────────────────

export interface AIStyleSuggestion {
  theme: string;
  fontFamily: string;
  textColor: string;
  entryAnimation: string;
  wordHighlight: string;
  reasoning: string;
}

export const generateAIStyleSuggestion = async (
  captions: Caption[]
): Promise<AIStyleSuggestion> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const transcript = captions.map(c => c.text).join(" ").substring(0, 5000);
  const sentiments = captions
    .filter(c => c.sentiment)
    .map(c => c.sentiment)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const systemInstruction = `
    You are an expert video caption stylist for viral short-form content.
    Analyze the transcript and suggest the optimal caption styling.
    
    Available themes: podcast, motivation, meme, cinematic, gaming
    Available fonts: Inter, Montserrat, Bebas Neue, Bangers, Orbitron, Playfair Display, Fredoka, Anton, Poppins
    Available entry animations: NONE, SLIDE_UP, SLIDE_DOWN, FADE_IN, ZOOM_IN, BOUNCE, FLIP, ROTATE_IN, BLUR_IN, GLITCH, ELASTIC
    Available word highlights: NONE, KARAOKE, SPOTLIGHT, COLOR_POP, UNDERLINE, BOX
    
    Detected sentiments: ${sentiments.join(', ') || 'neutral'}
    
    Rules:
    - Match the energy and tone of the content
    - If motivational → bold, uppercase, heavy stroke
    - If casual/conversational → clean, modern, subtle
    - If funny/meme → loud, comic, colorful
    - If educational → professional, clean serif, minimal animation
    - If gaming/tech → neon, futuristic font
    
    Return ONLY valid JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: {
        parts: [{ text: `TRANSCRIPT: ${transcript}` }]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            theme: { type: Type.STRING, description: "Best matching theme ID" },
            fontFamily: { type: Type.STRING, description: "Recommended font family" },
            textColor: { type: Type.STRING, description: "Hex color for text" },
            entryAnimation: { type: Type.STRING, description: "Recommended entry animation" },
            wordHighlight: { type: Type.STRING, description: "Recommended word highlight mode" },
            reasoning: { type: Type.STRING, description: "Brief explanation why this style fits" },
          },
          required: ["theme", "fontFamily", "textColor", "entryAnimation", "wordHighlight", "reasoning"]
        }
      }
    });

    const text = response.text || '{}';
    return JSON.parse(text) as AIStyleSuggestion;
  } catch (error) {
    console.error("AI Style Suggestion Error:", error);
    // Fallback to motivation theme
    return {
      theme: 'motivation',
      fontFamily: "'Bebas Neue', display",
      textColor: '#FACC15',
      entryAnimation: 'BOUNCE',
      wordHighlight: 'KARAOKE',
      reasoning: 'Default fallback — motivational style applied.'
    };
  }
};

// ─────────────────────────────────────────────────────────
// HOOK TEXT SUGGESTIONS
// ─────────────────────────────────────────────────────────

export const generateHookSuggestions = async (
  captions: Caption[]
): Promise<string[]> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const transcript = captions.map(c => c.text).join(" ").substring(0, 5000);

  const systemInstruction = `
    You are a viral short-form content strategist.
    Generate 5 attention-grabbing hook texts for the first 3 seconds of a video.
    
    Rules:
    - Each hook must be 2-5 words
    - Create curiosity or shock value
    - Use action verbs and power words
    - Mix question hooks, statement hooks, and challenge hooks
    
    Return ONLY a JSON array of strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: {
        parts: [{ text: `VIDEO TRANSCRIPT: ${transcript}` }]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text || '[]';
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Hook Suggestion Error:", error);
    return ["Watch This 🔥", "You Won't Believe...", "STOP Scrolling ✋", "Here's The Truth", "This Changes Everything"];
  }
};
