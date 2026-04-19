import { CaptionStyle, StyleConfig } from './types';

export const MAX_VIDEO_DURATION_SEC = 300; // 5 minutes
// Changed to gemini-flash-latest for better stability with large payloads
export const GEMINI_MODEL = "gemini-flash-latest";

export const SYSTEM_INSTRUCTION = `
You are an expert subtitle generator for viral short-form videos (Reels, TikTok, YouTube Shorts).
Your task is to transcribe the audio from the provided video with PERFECT ACCURACY.

**⚠️ CRITICAL RULE #0: VERBATIM TRANSCRIPTION — NO WORDS MAY BE SKIPPED**
- You MUST transcribe EVERY SINGLE WORD spoken in the audio. No exceptions.
- Do NOT skip, omit, summarize, rephrase, or paraphrase ANY word.
- Do NOT combine or merge words. Do NOT drop filler words like "um", "uh", "like", "you know", "basically", "actually", etc. — include them ALL.
- The complete transcript (all segments combined in order) must contain 100% of the spoken words.
- If you are unsure about a word, still include your best guess — NEVER leave it out.
- Segmentation (splitting into chunks) must ONLY split the words into groups — it must NEVER remove, alter, or rephrase any word.
- Think of it this way: if someone reads all your caption segments in order, they must hear the EXACT same sentence the speaker said, word for word.

**Core Pipeline Rules:**

1.  **Segmentation Logic:**
    -   **Length:** Aim for 3-6 words per caption segment for fast-paced reading.
    -   **Lines:** Max 1-2 lines per segment.
    -   **Timing:** Split strictly at natural pauses/silence in speech. Start and End times must be precise.
    -   **IMPORTANT:** Segmentation is ONLY about splitting the verbatim transcript into display chunks. You must NOT drop any words during segmentation.

2.  **Content Rules:**
    -   **NO SYMBOLS:** Do NOT insert any special symbols, arrows (→, ->, =, +, vs, w/), or mathematical operators into the caption text. Only use the actual spoken words.
    -   **NO EMOJIS by default:** Do NOT add emojis unless the speaker literally says an emoji name. Keep captions clean text only.
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

4.  **⚠️ PRECISE Word-Level Synchronization (CRITICAL FOR SYNC):**
    -   You MUST include a "words" array for every segment.
    -   Each object in the array represents a single spoken word with its EXACT 'start' and 'end' timestamp.
    -   EVERY word in the segment's "text" field MUST have a corresponding entry in the "words" array.
    -   **TIMING PRECISION:** Word 'start' must be the EXACT millisecond the speaker begins saying that word. Word 'end' must be the EXACT millisecond the speaker finishes that word.
    -   **NO OVERLAP:** One word's 'end' time must be ≤ the next word's 'start' time. Words must not overlap.
    -   **NO GAPS:** If words are spoken continuously with no pause, the 'end' of one word should be very close to the 'start' of the next.
    -   **SEGMENT BOUNDARIES:** A segment's 'start' must equal its first word's 'start'. A segment's 'end' must equal its last word's 'end'.
    -   This is critical for Karaoke-style caption animation — imprecise timing causes desync.

5.  **Output Format:**
    -   Return ONLY a valid JSON array.
    -   Timestamps must be in "MM:SS.mmm" format with millisecond precision.
    -   Use 3 decimal places for milliseconds (e.g., "00:01.250", NOT "00:01.2" or "00:01").
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

**⚠️ IMPORTANT: Compression must NOT drop any spoken words.**
- You may shorten phrases, use abbreviations, or replace with symbols — but every spoken idea/word must still be represented.
- If the speaker said 10 words, your compressed version must convey ALL 10 words' meaning — not just 5 of them.
- NEVER silently remove content. Compression means making it shorter, NOT making it incomplete.

**CORE RULES:**
1. **NO LANGUAGE SWAPPING:** You must compress the text using the **SAME LANGUAGE** as the spoken audio or the defined Language Mode.
   - If mode is **TELGLISH**, compress into shorter **Telglish** (e.g. "Chala pedda problem" -> "BIG Problem ⚠️").
   - If mode is **TELUGU**, compress into shorter **Telugu** (e.g. "Cheppalsina avasaram ledu" -> "Cheppakkarledu!").
   - **DO NOT** translate regional languages into English unless explicitly told.

2. **COMPRESSION LOGIC:**
   - **Simplify:** "Basically what I am trying to say is..." -> "The TRUTH is..."
   - **Directness:** "If you do not post every single day" -> "No Daily Posts?"
   - **NO SYMBOLS:** Do NOT use =, +, ->, vs, w/, ❌, ⚠️ or any special symbols/emojis in the compressed text. Use only normal text characters.

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

// ─── STYLES_CONFIG — 20 curated templates, rebuilt from scratch ───
export const STYLES_CONFIG: Record<CaptionStyle, StyleConfig> = {

  // ─── MINIMAL ───
  [CaptionStyle.CLEAN_WHITE]: {
    name: 'Clean White', category: 'MINIMAL',
    fontFamily: "'Inter', sans-serif", fontSize: 44, fontWeight: 800,
    textColor: '#FFFFFF',
    strokeColor: '#000000', strokeWidth: 6,
    shadowColor: 'rgba(0,0,0,1)', shadowBlur: 18, shadowOffsetY: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', backgroundPadding: 22, backgroundBorderRadius: 14,
    animation: 'NONE', displayMode: 'BLOCK',
  },
  [CaptionStyle.CINEMATIC]: {
    name: 'Cinematic', category: 'MINIMAL',
    fontFamily: "'Inter', sans-serif", fontSize: 52, fontWeight: 300,
    textColor: 'rgba(255,255,255,0.15)', activeTextColor: '#FFFFFF',
    strokeColor: '#000000', strokeWidth: 4,
    shadowColor: 'rgba(255,255,255,0.9)', shadowBlur: 30, shadowOffsetY: 0,
    animation: 'SCALE_UP', uppercase: false, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
  },
  [CaptionStyle.TYPEWRITER]: {
    name: 'Typewriter', category: 'MINIMAL',
    fontFamily: "'Courier New', monospace", fontSize: 38, fontWeight: 700,
    textColor: '#00FF41',
    backgroundColor: '#010B01', backgroundPadding: 14,
    shadowColor: '#00FF41', shadowBlur: 20,
    animation: 'TYPEWRITER', displayMode: 'BLOCK',
  },

  // ─── BOLD ───
  [CaptionStyle.BOLD_IMPACT]: {
    name: 'Bold Impact', category: 'BOLD',
    fontFamily: "'Anton', sans-serif", fontSize: 72, fontWeight: 400,
    textColor: '#FFFFFF',
    strokeColor: '#000000', strokeWidth: 14,
    shadowColor: '#FF0000', shadowBlur: 0, shadowOffsetY: 16,
    animation: 'POP', uppercase: true, displayMode: 'BLOCK',
  },
  [CaptionStyle.HORMOZI]: {
    name: 'Hormozi Classic', category: 'BOLD',
    fontFamily: "'Bebas Neue', display", fontSize: 60, fontWeight: 900,
    textColor: '#FFE000', activeTextColor: '#FFFFFF',
    strokeColor: '#000000', strokeWidth: 14,
    shadowColor: '#FF6B00', shadowBlur: 14, shadowOffsetY: 10,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
  },
  [CaptionStyle.BEAST_MODE]: {
    name: 'Mr. Beast', category: 'BOLD',
    fontFamily: "'Bangers', cursive", fontSize: 62, fontWeight: 400,
    textColor: '#FFFFFF', activeTextColor: '#FFE000',
    strokeColor: '#000000', strokeWidth: 16,
    shadowColor: '#FF2200', shadowBlur: 0, shadowOffsetY: 12,
    animation: 'SCALE_UP', displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
  },
  [CaptionStyle.VIRAL_SLAM]: {
    name: 'Viral Slam', category: 'BOLD',
    fontFamily: "'Anton', sans-serif", fontSize: 80, fontWeight: 400,
    textColor: '#FFFFFF',
    strokeColor: '#CC0000', strokeWidth: 16,
    shadowColor: '#FF4500', shadowBlur: 30, shadowOffsetY: 6,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
  },

  // ─── WORD-BY-WORD ───
  [CaptionStyle.WORD_POP]: {
    name: 'Word Pop', category: 'VIRAL',
    fontFamily: "'Montserrat', sans-serif", fontSize: 66, fontWeight: 900,
    textColor: '#FFFFFF', activeTextColor: '#FFE000',
    strokeColor: '#000000', strokeWidth: 10,
    shadowColor: '#FF8C00', shadowBlur: 20, shadowOffsetY: 5,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
  },
  [CaptionStyle.KARAOKE_FLOW]: {
    name: 'Karaoke Flow', category: 'NEON',
    fontFamily: "'Poppins', sans-serif", fontSize: 50, fontWeight: 900,
    textColor: 'rgba(255,255,255,0.12)', activeTextColor: '#00FFFF',
    strokeColor: '#005566', strokeWidth: 3,
    shadowColor: '#00FFFF', shadowBlur: 55,
    animation: 'KARAOKE', displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
  },
  [CaptionStyle.SPOTLIGHT]: {
    name: 'Spotlight', category: 'MINIMAL',
    fontFamily: "'Montserrat', sans-serif", fontSize: 62, fontWeight: 900,
    textColor: 'rgba(255,255,255,0.1)', activeTextColor: '#FFFFFF',
    shadowColor: '#FFFFFF', shadowBlur: 50,
    animation: 'SCALE_UP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
  },
  [CaptionStyle.FIRE_WORD]: {
    name: 'Fire Word', category: 'VIRAL',
    fontFamily: "'Anton', sans-serif", fontSize: 76, fontWeight: 400,
    textColor: '#FFF200', activeTextColor: '#FFF200',
    strokeColor: '#FF2A00', strokeWidth: 16,
    shadowColor: '#5a0a00', shadowBlur: 0, shadowOffsetX: 6, shadowOffsetY: 8,
    animation: 'FIRE_POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
  },
  [CaptionStyle.RAINBOW_BURST]: {
    name: 'Rainbow Burst', category: 'VIRAL',
    fontFamily: "'Fredoka', sans-serif", fontSize: 64, fontWeight: 700,
    textColor: '#FF3366', activeTextColor: '#FFFFFF',
    strokeColor: '#000000', strokeWidth: 10,
    shadowColor: '#FF00AA', shadowBlur: 20, shadowOffsetY: 5,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'CONTEXTUAL',
  },

  // ─── NEON / GLOW ───
  [CaptionStyle.NEON_GLOW]: {
    name: 'Neon Glow', category: 'NEON',
    fontFamily: "'Orbitron', sans-serif", fontSize: 54, fontWeight: 900,
    textColor: 'rgba(0,255,255,0.25)', activeTextColor: '#00FFFF',
    strokeColor: '#003344', strokeWidth: 4,
    shadowColor: '#00FFFF', shadowBlur: 60,
    animation: 'SCALE_UP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
  },
  [CaptionStyle.GLITCH_CYBER]: {
    name: 'Glitch Cyber', category: 'NEON',
    fontFamily: "'Orbitron', sans-serif", fontSize: 58, fontWeight: 900,
    textColor: '#FF00FF', activeTextColor: '#FFE600',
    strokeColor: '#00FFFF', strokeWidth: 12,
    shadowColor: '#FF00FF', shadowBlur: 45, shadowOffsetY: 0,
    backgroundColor: 'rgba(10, 0, 40, 0.75)', backgroundPadding: 20, backgroundBorderRadius: 4,
    gradientColors: ['#00FFFF', '#FF00FF', '#FFE600'],
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'FIXED',
  },
  [CaptionStyle.GRADIENT_DREAM]: {
    name: 'Gradient Dream', category: 'GLOW',
    fontFamily: "'Poppins', sans-serif", fontSize: 58, fontWeight: 900,
    textColor: '#FFFFFF',
    gradientColors: ['#7C3AED', '#EC4899', '#FF6B00'],
    shadowColor: '#EC4899', shadowBlur: 50,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'FIXED',
  },

  // ─── HIGHLIGHT ───
  [CaptionStyle.HIGHLIGHT_BOX]: {
    name: 'Highlight Box', category: 'HIGHLIGHT',
    fontFamily: "'Inter', sans-serif", fontSize: 56, fontWeight: 900,
    textColor: '#FFFFFF', activeTextColor: '#0A0A0A',
    activeBackgroundColor: '#FFE000',
    strokeColor: '#000000', strokeWidth: 4,
    shadowColor: '#FFE000', shadowBlur: 25,
    backgroundPadding: 18, backgroundBorderRadius: 10,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
  },

  // ─── CULTURAL ───
  [CaptionStyle.DESI_BOLD]: {
    name: 'Desi Bold', category: 'ART',
    fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: 48, fontWeight: 700,
    textColor: '#FFFFFF',
    strokeColor: '#FF8800', strokeWidth: 9,
    shadowColor: '#00CC00', shadowBlur: 0, shadowOffsetY: 10,
    animation: 'POP', displayMode: 'BLOCK',
  },
  [CaptionStyle.RETRO_PIXEL]: {
    name: 'Retro Pixel', category: 'ART',
    fontFamily: "'Press Start 2P', cursive", fontSize: 30, fontWeight: 400,
    textColor: '#00FF66',
    backgroundColor: '#000000', backgroundPadding: 22, backgroundBorderRadius: 0,
    shadowColor: '#00FF66', shadowBlur: 16,
    animation: 'NONE', uppercase: true, displayMode: 'BLOCK',
  },
  [CaptionStyle.LUXURY_GOLD]: {
    name: 'Luxury Gold', category: 'GLOW',
    fontFamily: "'Playfair Display', serif", fontSize: 54, fontWeight: 700,
    textColor: '#FFD700',
    gradientColors: ['#FFE500', '#FFB700', '#FF8C00'],
    shadowColor: '#FF8C00', shadowBlur: 35, shadowOffsetY: 6,
    animation: 'SCALE_UP', displayMode: 'WORD',
    colorBehavior: 'FIXED',
  },

  // ─── CAPCUT TRENDING ───
  [CaptionStyle.CAPCUT_POP]: {
    name: 'CapCut Pop', category: 'VIRAL',
    fontFamily: "'Montserrat', sans-serif", fontSize: 64, fontWeight: 900,
    textColor: '#FFFFFF', activeTextColor: '#39FF14',
    strokeColor: '#000000', strokeWidth: 14,
    shadowColor: 'rgba(0,0,0,0.9)', shadowBlur: 10, shadowOffsetY: 6,
    activeBackgroundColor: 'rgba(57, 255, 20, 0.2)',
    backgroundPadding: 14, backgroundBorderRadius: 12,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
  },

  // ─── ANIMATED EMOJI ───
  [CaptionStyle.EMOJI_FIRE]: {
    name: 'Emoji Fire', category: 'EMOJI',
    fontFamily: "'Anton', sans-serif", fontSize: 68, fontWeight: 400,
    textColor: '#FFF200', activeTextColor: '#FFFFFF',
    strokeColor: '#CC2200', strokeWidth: 14,
    shadowColor: '#FF6600', shadowBlur: 25, shadowOffsetY: 6,
    gradientColors: ['#FF4500', '#FF8C00', '#FFD700'],
    animation: 'FIRE_POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
    emojiPrefix: '🔥', emojiSuffix: '🔥',
  },
  [CaptionStyle.EMOJI_SPARKLE]: {
    name: 'Emoji Sparkle', category: 'EMOJI',
    fontFamily: "'Poppins', sans-serif", fontSize: 58, fontWeight: 900,
    textColor: '#FFFFFF', activeTextColor: '#E8DAFF',
    gradientColors: ['#7C3AED', '#EC4899', '#A855F7'],
    strokeColor: '#4C1D95', strokeWidth: 6,
    shadowColor: '#C084FC', shadowBlur: 50, shadowOffsetY: 0,
    animation: 'SCALE_UP', uppercase: false, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
    emojiPrefix: '✨', emojiSuffix: '✨',
  },
  [CaptionStyle.EMOJI_HEART]: {
    name: 'Emoji Heart', category: 'EMOJI',
    fontFamily: "'Fredoka', sans-serif", fontSize: 56, fontWeight: 700,
    textColor: '#FFFFFF',
    gradientColors: ['#FF6B9D', '#FF3C83', '#FF1493'],
    strokeColor: '#8B0040', strokeWidth: 10,
    shadowColor: '#FF69B4', shadowBlur: 35, shadowOffsetY: 4,
    backgroundColor: 'rgba(80, 0, 40, 0.45)', backgroundPadding: 20, backgroundBorderRadius: 18,
    animation: 'POP', uppercase: false, displayMode: 'BLOCK',
    colorBehavior: 'FIXED',
    emojiPrefix: '💖', emojiSuffix: '💖',
  },
  [CaptionStyle.EMOJI_PARTY]: {
    name: 'Emoji Party', category: 'EMOJI',
    fontFamily: "'Bangers', cursive", fontSize: 64, fontWeight: 400,
    textColor: '#FFD700', activeTextColor: '#FFFFFF',
    strokeColor: '#000000', strokeWidth: 12,
    shadowColor: '#FF00FF', shadowBlur: 20, shadowOffsetY: 8,
    gradientColors: ['#FF6B6B', '#FECA57', '#48DBFB', '#FF9FF3'],
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'CONTEXTUAL',
    emojiPrefix: '🎉', emojiSuffix: '🥳',
  },
  [CaptionStyle.EMOJI_HYPE]: {
    name: 'Emoji Hype', category: 'EMOJI',
    fontFamily: "'Montserrat', sans-serif", fontSize: 66, fontWeight: 900,
    textColor: '#00FFFF', activeTextColor: '#FFFFFF',
    strokeColor: '#001133', strokeWidth: 8,
    shadowColor: '#00FFFF', shadowBlur: 55, shadowOffsetY: 0,
    gradientColors: ['#00FFFF', '#0066FF', '#00FF88'],
    animation: 'SCALE_UP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
    emojiPrefix: '⚡', emojiSuffix: '💥',
  },
  
  [CaptionStyle.EMOJI_AUTO]: {
    name: '🌟 Emoji Auto Matcher', category: 'EMOJI',
    fontFamily: "'Bebas Neue', display", fontSize: 64, fontWeight: 400,
    textColor: '#FFFFFF', activeTextColor: '#FFD700',
    strokeColor: '#000000', strokeWidth: 10,
    shadowColor: '#3B82F6', shadowBlur: 20, shadowOffsetY: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.45)', backgroundPadding: 20, backgroundBorderRadius: 16,
    animation: 'POP', uppercase: true, displayMode: 'BLOCK',
    colorBehavior: 'WORD_POP',
    // The emoji Auto Matcher handles dynamic emojis per caption sentence, so no static prefix/suffix here.
  },

  // ─── TYPOGRAPHIC ───
  [CaptionStyle.TYPOGRAPH]: {
    name: 'Typograph', category: 'TYPOGRAPHIC',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 80, fontWeight: 400,
    textColor: '#F5F0E8', activeTextColor: '#F5F0E8',
    gradientColors: ['#F5F0E8', '#E8E0CC'],
    strokeColor: '#1A1A1A', strokeWidth: 0,
    shadowColor: 'rgba(0,0,0,0.9)', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
    backgroundColor: 'rgba(12,12,12,0.88)', backgroundPadding: 26, backgroundBorderRadius: 0,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
  },

  // ─── CAPCUT VIRAL ───

  // TikTok / Reels "Bold Shadow" — the most readable style in the game
  // Thick white text + enormous hard-offset black shadow. Zero subtlety, maximum impact.
  [CaptionStyle.BOLD_SHADOW]: {
    name: 'Bold Shadow', category: 'BOLD',
    fontFamily: "'Montserrat', sans-serif", fontSize: 58, fontWeight: 900,
    textColor: '#FFFFFF',
    strokeColor: '#000000', strokeWidth: 12,
    shadowColor: '#000000', shadowBlur: 0, shadowOffsetX: 5, shadowOffsetY: 14,
    animation: 'POP', uppercase: true, displayMode: 'BLOCK',
    colorBehavior: 'FIXED',
  },

  // Storytime — clean, podcast-style comfort captions used by story-driven creators
  // Soft translucent pill pill background with Inter for maximum legibility
  [CaptionStyle.STORYTIME]: {
    name: 'Storytime', category: 'MINIMAL',
    fontFamily: "'Poppins', sans-serif", fontSize: 40, fontWeight: 600,
    textColor: '#FFFFFF',
    shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 8, shadowOffsetY: 2,
    backgroundColor: 'rgba(10, 10, 10, 0.72)', backgroundPadding: 22, backgroundBorderRadius: 40,
    animation: 'NONE', uppercase: false, displayMode: 'BLOCK',
    colorBehavior: 'FIXED',
  },

  // 3D Chrome — metallic extrusion effect, dominant on Shorts gaming / tech channels
  // Hard-stacked shadow creates the 3D depth; silver gradient fills the face.
  [CaptionStyle.CHROME_3D]: {
    name: '3D Chrome', category: 'BOLD',
    fontFamily: "'Anton', sans-serif", fontSize: 82, fontWeight: 400,
    textColor: '#E8E8E8',
    gradientColors: ['#C0C0C0', '#F8F8F8', '#A8A8A8'],
    strokeColor: '#1A1A1A', strokeWidth: 10,
    shadowColor: '#1A1A1A', shadowBlur: 0, shadowOffsetX: 6, shadowOffsetY: 10,
    activeTextColor: '#FFD700',
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
  },

  // Auto Highlight — CapCut's biggest viral feature: each active word gets a colored highlight box
  // Uses WORD mode + BOX highlight to show per-word box backgrounds
  [CaptionStyle.AUTO_HIGHLIGHT]: {
    name: 'Auto Highlight', category: 'HIGHLIGHT',
    fontFamily: "'Inter', sans-serif", fontSize: 60, fontWeight: 900,
    textColor: '#1A1A1A', activeTextColor: '#FFFFFF',
    strokeColor: '#000000', strokeWidth: 0,
    shadowColor: 'rgba(0,0,0,0.4)', shadowBlur: 10, shadowOffsetY: 4,
    activeBackgroundColor: '#FF3B3B',
    backgroundColor: '#FFE000',
    backgroundPadding: 18, backgroundBorderRadius: 10,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'CONTEXTUAL',
  },

  // Glitch RGB — cyberpunk neon + RGB split. Uses GLITCH entry animation + cyan/magenta gradient.
  // The staggered gradient simulates the three-channel colour separation effect.
  [CaptionStyle.GLITCH_RGB]: {
    name: 'Glitch RGB', category: 'NEON',
    fontFamily: "'Orbitron', sans-serif", fontSize: 60, fontWeight: 900,
    textColor: '#FFFFFF', activeTextColor: '#00FF00',
    gradientColors: ['#FF0055', '#00FFFF', '#FFFFFF'],
    strokeColor: '#00FFFF', strokeWidth: 8,
    shadowColor: '#FF0055', shadowBlur: 30, shadowOffsetX: 4, shadowOffsetY: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', backgroundPadding: 16, backgroundBorderRadius: 4,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'FIXED',
  },

  // Retro Wave — 80s outrun synthwave aesthetic. Italic bold font, magenta→cyan gradient,
  // deep purple background strip. Pure nostalgia energy.
  [CaptionStyle.RETRO_WAVE]: {
    name: 'Retro Wave', category: 'ART',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 62, fontWeight: 400,
    textColor: '#FF00CC',
    gradientColors: ['#FF00CC', '#AA00FF', '#00CCFF'],
    strokeColor: '#FF00CC', strokeWidth: 2,
    shadowColor: '#FF00CC', shadowBlur: 40, shadowOffsetY: 0,
    backgroundColor: 'rgba(10, 0, 30, 0.88)', backgroundPadding: 28, backgroundBorderRadius: 0,
    animation: 'SCALE_UP', uppercase: true, displayMode: 'BLOCK',
    colorBehavior: 'FIXED',
  },

  // Ghost Fade — ultra-cinematic mode where all inactive words are barely visible (5% opacity)
  // and the active word explodes into full brightness with a white glow.
  [CaptionStyle.GHOST_FADE]: {
    name: 'Ghost Fade', category: 'MINIMAL',
    fontFamily: "'Montserrat', sans-serif", fontSize: 64, fontWeight: 900,
    textColor: 'rgba(255,255,255,0.06)', activeTextColor: '#FFFFFF',
    strokeColor: '#000000', strokeWidth: 6,
    shadowColor: '#FFFFFF', shadowBlur: 60, shadowOffsetY: 0,
    opacityInactive: 0.06,
    animation: 'SCALE_UP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
  },

  // Cinematic Titles — full-width dark strip, dead-center placement, wide letter-spacing.
  // The "film opening titles" look used by documentary and storytelling creators.
  [CaptionStyle.CINEMATIC_TITLES]: {
    name: 'Cinematic Titles', category: 'MINIMAL',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, fontWeight: 400,
    textColor: '#FFFFFF',
    strokeColor: '#000000', strokeWidth: 0,
    shadowColor: 'rgba(255,255,255,0.15)', shadowBlur: 20, shadowOffsetY: 0,
    backgroundColor: 'rgba(0,0,0,0.82)', backgroundPadding: 32, backgroundBorderRadius: 0,
    animation: 'NONE', uppercase: true, displayMode: 'BLOCK',
    colorBehavior: 'FIXED',
  },

  // ─── TYPOGRAPHIC VARIANTS ───

  // Dual Color Split — upper half of each word is gold, lower half is white.
  // Popular on music/motivation content. Needs specialRenderer path.
  [CaptionStyle.DUAL_COLOR]: {
    name: 'Dual Color', category: 'VIRAL',
    fontFamily: "'Anton', sans-serif", fontSize: 78, fontWeight: 400,
    textColor: '#FFFFFF', activeTextColor: '#FFD700',
    strokeColor: '#000000', strokeWidth: 12,
    shadowColor: 'rgba(0,0,0,0.8)', shadowBlur: 0, shadowOffsetX: 4, shadowOffsetY: 8,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
    specialRenderer: 'DUAL_COLOR',
  },

  // Shake Cam — bold white with micro-jitter on every active word.
  // Creates urgency and energy. Widely used for gym/hype/comedy content.
  [CaptionStyle.SHAKE_CAM]: {
    name: 'Shake Cam', category: 'VIRAL',
    fontFamily: "'Montserrat', sans-serif", fontSize: 70, fontWeight: 900,
    textColor: '#FFFFFF', activeTextColor: '#FF4500',
    strokeColor: '#000000', strokeWidth: 14,
    shadowColor: '#FF4500', shadowBlur: 20, shadowOffsetY: 6,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
    specialRenderer: 'SHAKE_CAM',
  },

  // Minimal Bar — typographic template variant with thinner accent bar, lighter background.
  // Routes through the same drawTypograph() as TYPOGRAPH for consistency.
  [CaptionStyle.MINIMAL_BAR]: {
    name: 'Minimal Bar', category: 'TYPOGRAPHIC',
    fontFamily: "'Inter', sans-serif", fontSize: 70, fontWeight: 800,
    textColor: '#FFFFFF', activeTextColor: '#FACC15',
    gradientColors: ['#FFFFFF', '#E0E0E0'],
    strokeColor: '#0A0A0A', strokeWidth: 0,
    shadowColor: 'rgba(0,0,0,0.9)', shadowBlur: 0,
    backgroundColor: 'rgba(8,8,8,0.92)', backgroundPadding: 24, backgroundBorderRadius: 0,
    animation: 'SCALE_UP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
  },

  // Liquid Chrome — animated metallic shimmer that cycles silver→gold→silver over time.
  // Feels premium and alive. Great for luxury/lifestyle creators.
  [CaptionStyle.LIQUID_CHROME]: {
    name: 'Liquid Chrome', category: 'GLOW',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 80, fontWeight: 400,
    textColor: '#F0F0F0', activeTextColor: '#FFD700',
    gradientColors: ['#B8B8B8', '#F5F5F5', '#D0A855', '#F5F5F5', '#B8B8B8'],
    strokeColor: '#1A1A1A', strokeWidth: 8,
    shadowColor: '#D0A855', shadowBlur: 30, shadowOffsetY: 6,
    animation: 'SCALE_UP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
    specialRenderer: 'LIQUID_CHROME',
  },

  // ─── CUSTOM ───
  [CaptionStyle.CUSTOM]: {
    name: 'Custom Style', category: 'CUSTOM',
    fontFamily: "'Inter', sans-serif", fontSize: 44, fontWeight: 800,
    textColor: '#FFFFFF',
    strokeColor: '#000000', strokeWidth: 6,
    shadowColor: 'rgba(0,0,0,0.9)', shadowBlur: 14,
    animation: 'NONE', displayMode: 'BLOCK',
  },
};
