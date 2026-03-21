import { CaptionStyle, StyleConfig } from './types';

export const MAX_VIDEO_DURATION_SEC = 300; // 5 minutes
// Changed to gemini-flash-latest for better stability with large payloads
export const GEMINI_MODEL = "gemini-flash-latest";

export const SYSTEM_INSTRUCTION = `
You are an expert subtitle generator for viral short-form videos (Reels, TikTok, YouTube Shorts).
Your task is to transcribe the audio from the provided video accurately.

**Core Pipeline Rules:**

1.  **Segmentation Logic:**
    -   **Length:** Strictly 3-6 words per caption segment for fast-paced reading.
    -   **Lines:** Max 1-2 lines per segment.
    -   **Timing:** Split strictly at natural pauses/silence in speech. Start and End times must be precise.

2.  **Content Enhancement:**
    -   **Emojis:** Contextually insert 1 relevant emoji per segment if appropriate (e.g., "Hello 👋", "Fire 🔥").
    -   **Positioning:**
        - 'BOTTOM': Default standard narration.
        - 'MIDDLE': Short impactful phrases (1-2 words), "Wait for it", "Insane", or loud exclamations.
        - 'TOP': Only if bottom is clearly obstructed.

3.  **Smart Color Logic (Contextual Emphasis):**
    -   Analyze the sentence and decide which words deserve color emphasis.
    -   For **EVERY WORD** in the segment text, you must assign a category:
        -   **'neutral'**: Filler words, pronouns, connectors (white/gray).
        -   **'emphasis'**: Key nouns, important adjectives (Yellow).
        -   **'positive'**: Success, gain, good, yes (Green).
        -   **'negative'**: Fail, stop, bad, no, warning (Red).
        -   **'tech'**: Digital, numbers, stats, logic, future (Blue/Cyan).
        -   **'action'**: Verbs like run, jump, buy, click (Orange).

4.  **Word-Level Synchronization:**
    -   You MUST include a "words" array for every segment.
    -   Each object in the array represents a single spoken word with its EXACT 'start' and 'end' timestamp.
    -   This is critical for Karaoke-style caption animation.

5.  **Output Format:**
    -   Return ONLY a valid JSON array.
    -   Timestamps must be in "MM:SS.mmm" format.
`;

export const PURE_TELUGU_INSTRUCTION = `
**STRICT LANGUAGE RULE: PURE TELUGU**
- Generate captions fully in Telugu script (తెలుగు మాత్రమే).
- Translate any English words or phrases used in audio into natural, conversational Telugu.
- NO English characters or scripts allowed in the output text.
- Tone must feel natural, conversational, and culturally accurate for a Telugu audience.
`;

export const TELGLISH_INSTRUCTION = `
**STRICT LANGUAGE RULE: TELGLISH (Telugu + English)**
- Generate captions for Telugu speech using the English/Latin script.
- Mix Telugu words with simple, trendy English words (e.g., "Success kosam hard work chala important").
- Keep it relatible, energetic, and creator-friendly for Instagram/Reels.
- Use Hinglish-style romanization for Telugu words.
`;

export const ENGLISH_ONLY_INSTRUCTION = `
**STRICT LANGUAGE RULE: ENGLISH ONLY**
- Generate captions fully in simple, clear English.
- If the speaker is using other languages, translate them into punchy, reel-friendly English.
- Use short sentences and high-impact vocabulary.
`;

export const AUTO_LANGUAGE_INSTRUCTION = `
**LANGUAGE HANDLING:**
- Detect and support: English, Hindi, Telugu, Tamil, Kannada, Marathi, and Hinglish.
- Use the script appropriate for the spoken language.
`;

export const HINDI_INSTRUCTION = `
**STRICT LANGUAGE RULE: HINDI ONLY**
- Generate captions fully in Hindi (Devanagari script: हिंदी).
- Translate any English words into natural, conversational Hindi.
- Keep tone energetic and relatable for Indian Reels/Shorts audience.
`;

export const TAMIL_INSTRUCTION = `
**STRICT LANGUAGE RULE: TAMIL ONLY**
- Generate captions fully in Tamil script (தமிழ்).
- Translate any English or other language words into natural Tamil.
- Keep tone culturally accurate for Tamil-speaking audience.
`;

export const KANNADA_INSTRUCTION = `
**STRICT LANGUAGE RULE: KANNADA ONLY**
- Generate captions fully in Kannada script (ಕನ್ನಡ).
- Translate any English or other language words into natural Kannada.
- Keep tone culturally accurate for Kannada-speaking audience.
`;

export const MARATHI_INSTRUCTION = `
**STRICT LANGUAGE RULE: MARATHI ONLY**
- Generate captions fully in Marathi (Devanagari script: मराठी).
- Translate any English words into natural, conversational Marathi.
- Keep tone relatable for Marathi-speaking Reels audience.
`;

export const HINGLISH_INSTRUCTION = `
**STRICT LANGUAGE RULE: HINGLISH (Hindi + English)**
- Generate captions mixing Hindi and English words naturally.
- Use Devanagari for Hindi words and Latin script for English words.
- Example: "Yaar, this is too good! Sach mein amazing hai."
- Keep it trendy, energetic, and creator-friendly for Instagram/Reels.
`;

export const AUTO_ADJUST_INSTRUCTION = `
You are a Viral Video Editor specializing in high-retention captions.
Your goal is not just accurate transcription, but OPTIMIZED VIEWING EXPERIENCE.

**AUTO-ADJUST MODE RULES (Strict Adherence Required):**

1.  **VIRAL FILTERING (Crucial):**
    -   **Remove Filler Words:** Delete "um", "uh", "like", "you know", "actually", "basically".
    -   **No Repeated Stutters:** "I I I went" -> "I went".

2.  **DYNAMIC SIZING (custom_scale):**
    -   Assign a 'custom_scale' number to every segment.
    -   **1-3 Words (Impact/Shock):** Return 1.5 (Big).
    -   **4-7 Words (Standard):** Return 1.0 (Normal).
    -   **8+ Words (Narrative):** Return 0.8 (Small).
    -   **Important/Emotional:** Boost scale by +0.2 (e.g., "SECRET", "DON'T", "MONEY").

3.  **DYNAMIC POSITIONING (custom_position):**
    -   Assign 'custom_position' to every segment.
    -   **Standard Narration:** "BOTTOM"
    -   **Short Hooks / Exclamations:** "MIDDLE" (e.g., "WAIT!", "LOOK AT THIS").
    -   **Contextual/Obstructed:** If the speaker says "Look at my eyes" or points down, move captions to "TOP".

**JSON Schema Update:**
Include 'custom_scale' (number) and 'custom_position' (string) in every item.
`;

export const SMART_COMPRESSION_INSTRUCTION = `
**SMART SENTENCE COMPRESSION (Language Preserving):**
You are a professional script doctor. Your goal is MAXIMAL RETENTION via brevity.

**CORE RULES:**
1. **NO LANGUAGE SWAPPING:** You must compress the text using the **SAME LANGUAGE** as the spoken audio or the defined Language Mode.
   - If mode is **TELGLISH**, compress into shorter **Telglish** (e.g. "Chala pedda problem" -> "BIG Problem ⚠️").
   - If mode is **TELUGU**, compress into shorter **Telugu** (e.g. "Cheppalsina avasaram ledu" -> "Cheppakkarledu!").
   - **DO NOT** translate regional languages into English unless explicitly told.

2. **COMPRESSION LOGIC:**
   - **Simplify:** "Basically what I am trying to say is..." -> "The TRUTH is..."
   - **Directness:** "If you do not post every single day" -> "No Daily Posts? ❌"
   - **Symbols:** Use =, +, ->, vs, w/ to save space.

3. **IMPACT REWRITING:**
   - Convert passive voice to active.
   - Use slang/short-forms appropriate for the specific language.
`;

export const VIRAL_REWRITE_INSTRUCTION = `
You are a Viral Content Script Doctor.
Task: Rewrite the provided transcript to be optimized for TikTok/Reels retention.

Rules:
1. Shorten sentences. Max 5 words.
2. Remove all fluff ("basically", "I think", "just").
3. Use active voice.
4. Add "Hooks" at the start.
5. Capitalize KEY words for impact.
`;

export const TRENDING_INSTRUCTION = `
You are a professional viral reels caption template generator.
Your job is to convert a short sentence into a structured caption template used in viral reels.
The caption style has THREE text roles:
1. Secondary Word (context)
2. Primary Word (main hook)
3. Accent Word (highlight)

CAPTION STRUCTURE:
Secondary
PRIMARY
ACCENT

STYLE RULES:
PRIMARY WORD
- Extra bold, Large text, Blue gradient (#1A5BFF → #3FA2FF), Center aligned, Glow effect, Animation: scale_pop
SECONDARY WORD
- White color (#FFFFFF), Italic, Smaller size, Positioned above main word, Animation: fade_in
ACCENT WORD
- Red color (#FF3B3B), Uppercase, Bold, Positioned below main word, Animation: slide_up

TEXT SPLITTING RULES:
- If the sentence has 3 words: word1 = secondary, word2 = primary, word3 = accent
- If the sentence has 2 words: word1 = secondary, word2 = primary, accent = ""
- If the sentence has 1 word: secondary = "", primary = word1, accent = ""
- If the sentence has more than 3 words: secondary = first word, primary = strongest keyword, accent = remaining words joined

OUTPUT FORMAT RULES:
- Output ONLY JSON. No explanations, no markdown, no extra text.
- Always return valid JSON.

JSON FORMAT:
{
 "secondary_text":"",
 "primary_text":"",
 "accent_text":"",
 "font_primary":"Montserrat ExtraBold",
 "font_secondary":"Montserrat SemiBold Italic",
 "primary_color_gradient":["#1A5BFF","#3FA2FF"],
 "secondary_color":"#FFFFFF",
 "accent_color":"#FF3B3B",
 "animations":{
   "secondary":"fade_in",
   "primary":"scale_pop",
   "accent":"slide_up"
 },
 "layout":"center_stacked"
}
`;

// Enhanced STYLES_CONFIG â€” all templates upgraded with richer visuals
export const STYLES_CONFIG: Record<CaptionStyle, StyleConfig> = {

  // â”€â”€â”€ MINIMAL â”€â”€â”€
  [CaptionStyle.DEFAULT]: { name:"Clean White",category:"MINIMAL",fontFamily:"'Inter', sans-serif",fontSize:40,fontWeight:700,textColor:"#FFFFFF",shadowColor:"rgba(0,0,0,0.95)",shadowBlur:10,shadowOffsetY:3,backgroundColor:"rgba(0,0,0,0.6)",backgroundPadding:20,backgroundBorderRadius:14,animation:"NONE",displayMode:"BLOCK"},
  [CaptionStyle.MINIMAL_BOX]: { name:"Minimal Box",category:"MINIMAL",fontFamily:"'Inter', sans-serif",fontSize:38,fontWeight:600,textColor:"#111827",backgroundColor:"rgba(255,255,255,0.97)",backgroundPadding:28,backgroundBorderRadius:8,shadowColor:"rgba(0,0,0,0.4)",shadowBlur:20,shadowOffsetY:8,animation:"NONE",displayMode:"BLOCK"},
  [CaptionStyle.TYPEWRITER]: { name:"Typewriter",category:"MINIMAL",fontFamily:"'Courier New', monospace",fontSize:38,fontWeight:700,textColor:"#00FF41",backgroundColor:"#010B01",backgroundPadding:14,shadowColor:"#00FF41",shadowBlur:10,animation:"TYPEWRITER",displayMode:"BLOCK"},
  [CaptionStyle.BLOCK_CINEMATIC_FADE]: { name:"Cinematic Fade",category:"MINIMAL",fontFamily:"'Nunito', sans-serif",fontSize:42,fontWeight:800,textColor:"#FFFFFF",opacityInactive:0.2,shadowColor:"rgba(0,0,0,0.8)",shadowBlur:14,shadowOffsetY:4,animation:"NONE",displayMode:"BLOCK"},

  // â”€â”€â”€ BOLD â”€â”€â”€
  [CaptionStyle.HORMOZI_VAR1]: { name:"The Hormozi (Yel)",category:"BOLD",fontFamily:"'Bebas Neue', display",fontSize:54,fontWeight:900,textColor:"#FFE600",activeTextColor:"#FFFFFF",strokeColor:"#000000",strokeWidth:12,shadowColor:"#000000",shadowBlur:0,shadowOffsetY:12,animation:"POP",uppercase:true,displayMode:"BLOCK"},
  [CaptionStyle.HORMOZI_VAR2]: { name:"The Hormozi (Grn)",category:"BOLD",fontFamily:"'Bebas Neue', display",fontSize:54,fontWeight:900,textColor:"#00FF7F",activeTextColor:"#FFFFFF",strokeColor:"#000000",strokeWidth:12,shadowColor:"#000000",shadowBlur:0,shadowOffsetY:12,animation:"POP",uppercase:true,displayMode:"BLOCK"},
  [CaptionStyle.BEAST_MODE]: { name:"Mr. Beast",category:"BOLD",fontFamily:"Bangers, cursive",fontSize:56,fontWeight:400,textColor:"#FFFFFF",strokeColor:"#000000",strokeWidth:14,shadowColor:"#FF1A1A",shadowBlur:0,shadowOffsetY:10,animation:"SCALE_UP",displayMode:"BLOCK"},
  [CaptionStyle.RAPID_SPRINT]: { name:"Rapid Sprint",category:"BOLD",fontFamily:"'Montserrat', sans-serif",fontSize:58,fontWeight:900,textColor:"#FFFFFF",strokeColor:"#000000",strokeWidth:9,shadowColor:"#000000",shadowBlur:0,shadowOffsetY:10,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_HORMOZI_FOCUS]: { name:"Hormozi Focus",category:"BOLD",fontFamily:"'Bebas Neue', display",fontSize:62,fontWeight:900,textColor:"#FFE600",strokeColor:"#000000",strokeWidth:12,shadowColor:"#000000",shadowBlur:0,shadowOffsetY:12,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_BOLD_SPORTS]: { name:"Sports Impact",category:"BOLD",fontFamily:"'Koulen', sans-serif",fontSize:66,fontWeight:400,textColor:"#FFFFFF",strokeColor:"#000000",strokeWidth:7,shadowColor:"#DC2626",shadowBlur:0,shadowOffsetY:12,shadowOffsetX:6,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_INSTA_POP]: { name:"Insta Pop",category:"BOLD",fontFamily:"'Poppins', sans-serif",fontSize:54,fontWeight:900,textColor:"#FFFFFF",backgroundColor:"#000000",backgroundPadding:22,backgroundBorderRadius:22,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.COLOR_POP_VIRAL]: { name:"Standard Pop",category:"BOLD",fontFamily:"'Oswald', sans-serif",fontSize:60,fontWeight:900,textColor:"#FFFFFF",strokeColor:"#000000",strokeWidth:9,shadowColor:"#000000",shadowBlur:0,shadowOffsetY:9,animation:"POP",uppercase:true,displayMode:"WORD"},

  // â”€â”€â”€ NEON â”€â”€â”€
  [CaptionStyle.KARAOKE_NEON]: { name:"Neon Karaoke",category:"NEON",fontFamily:"'Poppins', sans-serif",fontSize:44,fontWeight:900,textColor:"rgba(255,255,255,0.2)",activeTextColor:"#00F5FF",shadowColor:"#00F5FF",shadowBlur:40,strokeColor:"#004F60",strokeWidth:2,animation:"KARAOKE",displayMode:"BLOCK"},
  [CaptionStyle.GLITCH_CYBER]: { name:"Cyberpunk",category:"NEON",fontFamily:"'Courier New', monospace",fontSize:40,fontWeight:700,textColor:"#FF0066",activeTextColor:"#00FF99",backgroundColor:"#000000",backgroundPadding:14,shadowColor:"#FF0066",shadowBlur:16,animation:"TYPEWRITER",uppercase:true,displayMode:"BLOCK"},
  [CaptionStyle.WORD_FUTURE_NEON]: { name:"Future Neon",category:"NEON",fontFamily:"'Orbitron', sans-serif",fontSize:50,fontWeight:900,textColor:"#FFFFFF",activeTextColor:"#00FFFF",shadowColor:"#00FFFF",shadowBlur:45,strokeColor:"#00AACC",strokeWidth:2,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_GLITCH_CHAOS]: { name:"Glitch Chaos",category:"NEON",fontFamily:"'Rubik Glitch', system-ui",fontSize:58,fontWeight:400,textColor:"#FF0055",strokeColor:"#FFFFFF",strokeWidth:3,shadowColor:"#00FF99",shadowOffsetX:6,shadowOffsetY:6,shadowBlur:0,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_NEON_STORM]: { name:"Neon Storm",category:"NEON",fontFamily:"'Orbitron', sans-serif",fontSize:54,fontWeight:900,textColor:"#FFFFFF",strokeColor:"#06B6D4",strokeWidth:5,shadowColor:"#D946EF",shadowBlur:40,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_LYRICIST_OUTLINE]: { name:"Lyricist Outline",category:"NEON",fontFamily:"'Titan One', cursive",fontSize:56,fontWeight:400,textColor:"#34D399",strokeColor:"#34D399",strokeWidth:3,shadowColor:"#34D399",shadowBlur:25,useOutlineForInactive:true,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},

  // â”€â”€â”€ GLOW â”€â”€â”€
  [CaptionStyle.WORD_SOFT_GLOW]: { name:"Soft Glow",category:"GLOW",fontFamily:"'Poppins', sans-serif",fontSize:54,fontWeight:800,textColor:"#FFFFFF",shadowColor:"rgba(255,255,255,1.0)",shadowBlur:40,animation:"SCALE_UP",displayMode:"WORD"},
  [CaptionStyle.WORD_GRADIENT_DREAM]: { name:"Gradient Dream",category:"GLOW",fontFamily:"'Poppins', sans-serif",fontSize:56,fontWeight:900,textColor:"#FFFFFF",gradientColors:["#6366F1","#EC4899","#F97316"],shadowColor:"rgba(236,72,153,0.7)",shadowBlur:35,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.GLOW_DREAMY]: { name:"Soft Dream",category:"GLOW",fontFamily:"'Poppins', sans-serif",fontSize:52,fontWeight:700,textColor:"#FFFFFF",shadowColor:"#F472B6",shadowBlur:50,animation:"SCALE_UP",displayMode:"WORD"},
  [CaptionStyle.GLOW_RADIOACTIVE]: { name:"Radioactive",category:"GLOW",fontFamily:"'Orbitron', sans-serif",fontSize:50,fontWeight:900,textColor:"#CCFF00",shadowColor:"#84CC16",shadowBlur:40,strokeColor:"#3D5F00",strokeWidth:2,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.GLOW_CYBER_BLUE]: { name:"Cyber Blue",category:"GLOW",fontFamily:"'Nunito', sans-serif",fontSize:56,fontWeight:900,textColor:"#E0F2FE",shadowColor:"#0EA5E9",shadowBlur:55,animation:"SCALE_UP",displayMode:"WORD"},
  [CaptionStyle.GLOW_GOLDEN_HOUR]: { name:"Golden Hour",category:"GLOW",fontFamily:"'Playfair Display', serif",fontSize:54,fontWeight:700,textColor:"#FEF3C7",shadowColor:"#F59E0B",shadowBlur:50,animation:"SCALE_UP",displayMode:"WORD"},
  [CaptionStyle.GLOW_DEEP_SPACE]: { name:"Deep Space",category:"GLOW",fontFamily:"'Montserrat', sans-serif",fontSize:54,fontWeight:900,textColor:"#FFFFFF",gradientColors:["#7C3AED","#3B82F6"],shadowColor:"#7C3AED",shadowBlur:40,animation:"POP",uppercase:true,displayMode:"WORD"},

  // â”€â”€â”€ HIGHLIGHT â”€â”€â”€
  [CaptionStyle.HIGHLIGHT_MARKER]: { name:"Yellow Marker",category:"HIGHLIGHT",fontFamily:"'Permanent Marker', cursive",fontSize:48,fontWeight:400,textColor:"#1A1A1A",backgroundColor:"#FDE047",backgroundPadding:16,backgroundBorderRadius:4,rotationVariance:3,shadowColor:"rgba(0,0,0,0.4)",shadowBlur:8,shadowOffsetY:5,animation:"POP",displayMode:"WORD"},
  [CaptionStyle.HIGHLIGHT_RED_TAPE]: { name:"Red Tape",category:"HIGHLIGHT",fontFamily:"'Anton', sans-serif",fontSize:56,fontWeight:400,textColor:"#FFFFFF",backgroundColor:"#DC2626",backgroundPadding:14,backgroundBorderRadius:4,rotationVariance:2,shadowColor:"rgba(0,0,0,0.6)",shadowBlur:10,shadowOffsetY:6,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.HIGHLIGHT_BLACK_BOX]: { name:"Bold Box",category:"HIGHLIGHT",fontFamily:"'Inter', sans-serif",fontSize:50,fontWeight:900,textColor:"#FFFFFF",backgroundColor:"#000000",backgroundPadding:22,backgroundBorderRadius:0,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.HIGHLIGHT_PAPER_CUT]: { name:"Paper Cut",category:"HIGHLIGHT",fontFamily:"'Fredoka', sans-serif",fontSize:52,fontWeight:700,textColor:"#111827",backgroundColor:"#FFFFFF",backgroundPadding:18,backgroundBorderRadius:10,shadowColor:"rgba(0,0,0,0.65)",shadowBlur:10,shadowOffsetY:8,animation:"SCALE_UP",displayMode:"WORD"},
  [CaptionStyle.HIGHLIGHT_SKETCH]: { name:"Sketchy",category:"HIGHLIGHT",fontFamily:"'Caveat', cursive",fontSize:58,fontWeight:700,textColor:"#FFFFFF",strokeColor:"#000000",strokeWidth:3,backgroundColor:"#1E293B",backgroundPadding:16,backgroundBorderRadius:26,shadowColor:"rgba(0,0,0,0.6)",shadowBlur:12,animation:"POP",displayMode:"WORD"},
  [CaptionStyle.WORD_TAPE_HIGHLIGHT]: { name:"Tape Highlight",category:"HIGHLIGHT",fontFamily:"'Permanent Marker', cursive",fontSize:50,fontWeight:400,textColor:"#0F172A",backgroundColor:"#FACC15",backgroundPadding:18,backgroundBorderRadius:3,rotationVariance:4,shadowColor:"rgba(0,0,0,0.5)",shadowBlur:10,shadowOffsetY:6,animation:"POP",displayMode:"WORD"},
  [CaptionStyle.BLOCK_CLEAN_FOCUS]: { name:"Clean Focus",category:"HIGHLIGHT",fontFamily:"'Nunito', sans-serif",fontSize:42,fontWeight:900,textColor:"#6B7280",activeTextColor:"#FFFFFF",activeBackgroundColor:"#1E293B",backgroundBorderRadius:12,backgroundPadding:12,animation:"SCALE_UP",displayMode:"BLOCK"},
  [CaptionStyle.WORD_ACTIVE_BOX]: { name:"Active Box",category:"HIGHLIGHT",fontFamily:"'Inter', sans-serif",fontSize:52,fontWeight:900,textColor:"#FFFFFF",activeTextColor:"#0F172A",activeBackgroundColor:"#FACC15",backgroundPadding:18,backgroundBorderRadius:10,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_GAME_STREAMER]: { name:"Game Streamer",category:"HIGHLIGHT",fontFamily:"'Fredoka', sans-serif",fontSize:56,fontWeight:700,textColor:"#FFFFFF",strokeColor:"#7C3AED",strokeWidth:12,shadowColor:"#4C1D95",shadowBlur:0,shadowOffsetY:10,animation:"POP",displayMode:"WORD"},

  // â”€â”€â”€ KINETIC â”€â”€â”€
  [CaptionStyle.KINETIC_IMPACT]: { name:"Impact Heavy",category:"KINETIC",fontFamily:"'Anton', sans-serif",fontSize:72,fontWeight:400,textColor:"#FFFFFF",strokeColor:"#000000",strokeWidth:12,shadowColor:"#000000",shadowBlur:0,shadowOffsetY:14,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.KINETIC_RAPID]: { name:"Rapid Fire",category:"KINETIC",fontFamily:"'Montserrat', sans-serif",fontSize:62,fontWeight:900,textColor:"#F97316",strokeColor:"#FFFFFF",strokeWidth:6,shadowColor:"#7C2D12",shadowBlur:0,shadowOffsetY:10,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.KINETIC_STOMP]: { name:"Stomp",category:"KINETIC",fontFamily:"'Titan One', cursive",fontSize:60,fontWeight:400,textColor:"#FFFFFF",strokeColor:"#000000",strokeWidth:7,shadowColor:"#000000",shadowBlur:0,shadowOffsetY:18,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.KINETIC_TILT]: { name:"Tilt Pop",category:"KINETIC",fontFamily:"'Luckiest Guy', cursive",fontSize:64,fontWeight:400,textColor:"#FACC15",strokeColor:"#000000",strokeWidth:9,rotationVariance:14,shadowColor:"#854D0E",shadowBlur:0,shadowOffsetY:10,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.KINETIC_ZOOMER]: { name:"Zoomer",category:"KINETIC",fontFamily:"'Inter', sans-serif",fontSize:74,fontWeight:900,textColor:"#FFFFFF",shadowColor:"rgba(255,255,255,0.3)",shadowBlur:25,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},

  // â”€â”€â”€ ART â”€â”€â”€
  [CaptionStyle.DESI_VLOG]: { name:"Desi Vlog",category:"ART",fontFamily:"'Noto Sans Devanagari', sans-serif",fontSize:44,fontWeight:700,textColor:"#FFFFFF",strokeColor:"#FF9933",strokeWidth:7,shadowColor:"#138808",shadowBlur:0,shadowOffsetY:8,animation:"POP",displayMode:"BLOCK"},
  [CaptionStyle.TAMIL_THALAIVA]: { name:"Thalaiva",category:"ART",fontFamily:"'Noto Sans Tamil', sans-serif",fontSize:46,fontWeight:700,textColor:"#FFD700",strokeColor:"#800000",strokeWidth:9,shadowColor:"#4B0000",shadowBlur:0,shadowOffsetY:10,animation:"SCALE_UP",displayMode:"BLOCK"},
  [CaptionStyle.WORD_RETRO_PIXEL]: { name:"Retro Pixel",category:"ART",fontFamily:"'Press Start 2P', cursive",fontSize:30,fontWeight:400,textColor:"#4ADE80",backgroundColor:"#000000",backgroundPadding:22,backgroundBorderRadius:0,shadowColor:"#166534",shadowBlur:8,animation:"NONE",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_LUXURY_SERIF]: { name:"Luxury Serif",category:"ART",fontFamily:"'Playfair Display', serif",fontSize:52,fontWeight:700,textColor:"#FCD34D",shadowColor:"#B45309",shadowBlur:25,shadowOffsetY:5,animation:"SCALE_UP",displayMode:"WORD"},
  [CaptionStyle.WORD_COMIC_IMPACT]: { name:"Comic Impact",category:"ART",fontFamily:"'Luckiest Guy', cursive",fontSize:58,fontWeight:400,textColor:"#FFFFFF",strokeColor:"#000000",strokeWidth:12,shadowColor:"#EF4444",shadowBlur:0,shadowOffsetY:12,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_VLOG_AESTHETIC]: { name:"Vlog Aesthetic",category:"ART",fontFamily:"'Caveat', cursive",fontSize:60,fontWeight:700,textColor:"#FFFFFF",shadowColor:"rgba(0,0,0,0.98)",shadowBlur:14,shadowOffsetY:6,animation:"SCALE_UP",displayMode:"WORD"},
  [CaptionStyle.WORD_NOIR_CRIME]: { name:"Noir Crime",category:"ART",fontFamily:"'Special Elite', cursive",fontSize:48,fontWeight:400,textColor:"#22C55E",backgroundColor:"#000000",backgroundPadding:18,shadowColor:"#15803D",shadowBlur:10,animation:"NONE",displayMode:"WORD"},
  [CaptionStyle.WORD_SUPER_3D]: { name:"Super 3D",category:"ART",fontFamily:"'Titan One', cursive",fontSize:62,fontWeight:400,textColor:"#FB923C",strokeColor:"#FFFFFF",strokeWidth:6,shadowColor:"#7C2D12",shadowBlur:0,shadowOffsetY:16,animation:"POP",uppercase:true,displayMode:"WORD"},

  // â”€â”€â”€ VIRAL â”€â”€â”€
  [CaptionStyle.VIRAL_COMIC]: { name:"Comic Loud",category:"VIRAL",fontFamily:"Bangers, cursive",fontSize:62,fontWeight:400,textColor:"#FFD700",strokeColor:"#000000",strokeWidth:12,shadowColor:"#7B3F00",shadowBlur:0,shadowOffsetY:12,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.VIRAL_PRO_CLEAN]: { name:"Pro Clean",category:"VIRAL",fontFamily:"'Inter', sans-serif",fontSize:56,fontWeight:900,textColor:"#FFFFFF",shadowColor:"#3B82F6",shadowBlur:30,shadowOffsetY:6,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.VIRAL_LOUD_NEON]: { name:"Loud Neon",category:"VIRAL",fontFamily:"'Orbitron', sans-serif",fontSize:52,fontWeight:900,textColor:"#FFFFFF",strokeColor:"#FF00FF",strokeWidth:6,shadowColor:"#00FFFF",shadowBlur:40,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.VIRAL_HYPER_BOLD]: { name:"Hyper Bold",category:"VIRAL",fontFamily:"'Anton', sans-serif",fontSize:68,fontWeight:400,textColor:"#FFFF00",strokeColor:"#000000",strokeWidth:10,shadowColor:"#FF0000",shadowBlur:0,shadowOffsetY:16,animation:"POP",uppercase:true,displayMode:"WORD"},

  // â”€â”€â”€ TRENDING â”€â”€â”€
  [CaptionStyle.TRENDING]: { name:"Trending",category:"TRENDING",fontFamily:"'Montserrat', sans-serif",fontSize:90,fontWeight:900,textColor:"#FFFFFF",gradientColors:["#1A5BFF","#00C6FF"],shadowColor:"rgba(26,91,255,0.6)",shadowBlur:35,animation:"POP",uppercase:true,displayMode:"BLOCK"},
  [CaptionStyle.NEON_IMPACT]: { name:"Neon Impact",category:"TRENDING",fontFamily:"'Anton', sans-serif",fontSize:100,fontWeight:900,textColor:"#FFFFFF",gradientColors:["#FF00C8","#FF6B00","#00E5FF"],shadowColor:"#FF00C8",shadowBlur:50,animation:"POP",uppercase:true,displayMode:"BLOCK"},
  [CaptionStyle.VIRAL_CREATOR]: { name:"Viral Creator",category:"TRENDING",fontFamily:"'Anton', sans-serif",fontSize:112,fontWeight:900,textColor:"#FFD400",strokeColor:"#000000",strokeWidth:10,shadowColor:"rgba(0,0,0,0.9)",shadowBlur:25,shadowOffsetY:10,animation:"POP",uppercase:true,displayMode:"BLOCK"},
  [CaptionStyle.INSTAGRAM_TEMPLATE]: { name:"Instagram Template",category:"TRENDING",fontFamily:"'Montserrat', sans-serif",fontSize:80,fontWeight:900,textColor:"#FFFFFF",gradientColors:["#F9A825","#E040FB","#1565C0"],shadowColor:"rgba(0,0,0,0.7)",shadowBlur:25,shadowOffsetY:8,animation:"POP",uppercase:false,displayMode:"BLOCK"},

  // â”€â”€â”€ CUSTOM â”€â”€â”€

  // --- CAPCUT-LEVEL WORD-BY-WORD STYLES (NEW) ---
  [CaptionStyle.CAPCUT_CLASSIC]: { name:"CapCut Classic",category:"VIRAL",fontFamily:"'Montserrat', sans-serif",fontSize:60,fontWeight:900,textColor:"#FFFFFF",activeTextColor:"#FFD700",strokeColor:"#000000",strokeWidth:8,shadowColor:"rgba(0,0,0,0.9)",shadowBlur:8,shadowOffsetY:4,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.CAPCUT_BOLD_YELLOW]: { name:"CapCut Bold Yellow",category:"VIRAL",fontFamily:"'Montserrat', sans-serif",fontSize:64,fontWeight:900,textColor:"#FFFFFFCC",activeTextColor:"#FFEE00",strokeColor:"#000000",strokeWidth:10,shadowColor:"rgba(0,0,0,1)",shadowBlur:0,shadowOffsetY:6,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_FIRE_POP]: { name:"Fire Pop",category:"VIRAL",fontFamily:"'Anton', sans-serif",fontSize:66,fontWeight:400,textColor:"#FF9500",activeTextColor:"#FFE100",gradientColors:["#FF4500","#FF8C00","#FFD700"],strokeColor:"#8B1A00",strokeWidth:8,shadowColor:"#FF4500",shadowBlur:30,shadowOffsetY:6,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.BOUNCE_WAVE]: { name:"Bounce Wave",category:"VIRAL",fontFamily:"'Poppins', sans-serif",fontSize:58,fontWeight:900,textColor:"#00D4FF",activeTextColor:"#FFFFFF",strokeColor:"#003366",strokeWidth:6,shadowColor:"#0077FF",shadowBlur:20,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.RAINBOW_BURST]: { name:"Rainbow Burst",category:"VIRAL",fontFamily:"'Fredoka', sans-serif",fontSize:62,fontWeight:700,textColor:"#FF6B6B",activeTextColor:"#FFFFFF",strokeColor:"#000000",strokeWidth:8,shadowColor:"rgba(0,0,0,0.7)",shadowBlur:10,shadowOffsetY:5,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.VIRAL_WORD_SLAM]: { name:"Word Slam",category:"KINETIC",fontFamily:"'Anton', sans-serif",fontSize:80,fontWeight:400,textColor:"#FFFFFF",strokeColor:"#000000",strokeWidth:14,shadowColor:"#FF0000",shadowBlur:20,shadowOffsetY:12,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.KARAOKE_FIRE]: { name:"Karaoke Fire",category:"NEON",fontFamily:"'Poppins', sans-serif",fontSize:50,fontWeight:900,textColor:"rgba(255,255,255,0.25)",activeTextColor:"#FF6B00",strokeColor:"#3D1A00",strokeWidth:2,shadowColor:"#FF4500",shadowBlur:35,animation:"KARAOKE",displayMode:"BLOCK"},
  [CaptionStyle.WORD_CINEMATIC]: { name:"Cinematic",category:"MINIMAL",fontFamily:"'Inter', sans-serif",fontSize:52,fontWeight:300,textColor:"rgba(255,255,255,0.35)",activeTextColor:"#FFFFFF",shadowColor:"rgba(0,0,0,0.95)",shadowBlur:20,shadowOffsetY:2,animation:"SCALE_UP",uppercase:false,displayMode:"WORD"},
  [CaptionStyle.MINIMAL_WORD_FADE]: { name:"Minimal Fade",category:"MINIMAL",fontFamily:"'Nunito', sans-serif",fontSize:56,fontWeight:800,textColor:"rgba(255,255,255,0.25)",activeTextColor:"#FFFFFF",shadowColor:"rgba(0,0,0,0.8)",shadowBlur:15,animation:"SCALE_UP",uppercase:false,displayMode:"WORD"},
  [CaptionStyle.GRADIENT_SHIFT]: { name:"Gradient Shift",category:"GLOW",fontFamily:"'Poppins', sans-serif",fontSize:58,fontWeight:900,textColor:"#FFFFFF",activeTextColor:"#00FFFF",gradientColors:["#7B2FBE","#00D4FF","#FF6BCB"],shadowColor:"rgba(123,47,190,0.6)",shadowBlur:30,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_GLITTER]: { name:"Glitter",category:"GLOW",fontFamily:"'Fredoka', sans-serif",fontSize:58,fontWeight:700,textColor:"#FFB6C1",activeTextColor:"#FFFFFF",gradientColors:["#FF6BCB","#FFADD2","#C084FC"],shadowColor:"rgba(255,107,203,0.7)",shadowBlur:30,animation:"POP",displayMode:"WORD"},
  [CaptionStyle.NEON_WORD_WAVE]: { name:"Neon Wave",category:"NEON",fontFamily:"'Orbitron', sans-serif",fontSize:52,fontWeight:900,textColor:"rgba(0,255,255,0.4)",activeTextColor:"#00FFFF",strokeColor:"#003344",strokeWidth:3,shadowColor:"#00FFFF",shadowBlur:40,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_SPOTLIGHT_REVEAL]: { name:"Spotlight Reveal",category:"ART",fontFamily:"'Montserrat', sans-serif",fontSize:60,fontWeight:900,textColor:"rgba(255,255,255,0.2)",activeTextColor:"#FFFFFF",shadowColor:"rgba(255,255,255,0.8)",shadowBlur:35,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_SHAKE_IMPACT]: { name:"Shake Impact",category:"KINETIC",fontFamily:"'Anton', sans-serif",fontSize:72,fontWeight:400,textColor:"#FFFFFF",activeTextColor:"#FF3B3B",strokeColor:"#000000",strokeWidth:10,shadowColor:"#FF0000",shadowBlur:15,shadowOffsetY:10,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_OUTLINED_POP]: { name:"Outlined Pop",category:"BOLD",fontFamily:"'Bebas Neue', display",fontSize:68,fontWeight:900,textColor:"#FFFFFF",activeTextColor:"#FFEE00",strokeColor:"#000000",strokeWidth:14,shadowColor:"#000000",shadowBlur:0,shadowOffsetY:10,animation:"POP",uppercase:true,displayMode:"WORD"},

  [CaptionStyle.CUSTOM]: { name:"Custom Style",category:"CUSTOM",fontFamily:"Inter, sans-serif",fontSize:44,fontWeight:800,textColor:"#FFFFFF",shadowColor:"rgba(0,0,0,0.8)",shadowBlur:10,animation:"NONE",displayMode:"BLOCK"}
};
