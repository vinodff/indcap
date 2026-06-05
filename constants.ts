import { CaptionStyle, StyleConfig } from './types';

export const MAX_VIDEO_DURATION_SEC = 300; // 5 minutes
// Using gemini-flash-latest to avoid depleted free-tier quota on the older 2.0 endpoint
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

export const ROMAN_AUTO_INSTRUCTION = `
**STRICT LANGUAGE RULE: AUTO-DETECT → ROMAN/LATIN SCRIPT ONLY**
- Auto-detect the spoken language (Telugu, Hindi, Tamil, Kannada, Marathi, Bengali, Malayalam, Gujarati, Punjabi, English, etc.).
- ALWAYS output captions in Roman/Latin script transliteration — NEVER in native scripts.
- NO Devanagari (हिंदी), Telugu (తెలుగు), Tamil (தமிழ்), Kannada (ಕನ್ನಡ), Bengali (বাংলা), or any other Indic / non-Latin scripts allowed.
- Examples of correct output:
   • Telugu speech "నేను బాగున్నాను" → "Nenu bagunnanu"
   • Hindi speech "मैं ठीक हूं" → "Main theek hoon"
   • Tamil speech "நான் நன்றாக இருக்கிறேன்" → "Naan nandraga irukiren"
   • Kannada speech "ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ" → "Naanu chennagiddene"
   • Marathi speech "मी ठीक आहे" → "Mi theek aahe"
- Mix English words naturally when speaker uses them (e.g., "Success kosam hard work chala important").
- Keep romanization phonetically intuitive and trendy — Instagram/Reels caption style.
- If speech is already English, keep it as English.
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

export const REEL_ANALYZER_INSTRUCTION = `
You are a cinematic typography reel editor — a senior creator who has shipped thousands of Reels.

Beyond verbatim transcription with precise word-level timing, you must enrich every segment with the
editorial intent a human editor would bring:

For EACH segment, produce these fields IN ADDITION to text/start/end/words:

1. **emotion** — pick ONE: awe | shock | joy | anger | sadness | tension | inspiration | humor | authority | neutral.
2. **emotionIntensity** — 1 (mild) | 2 (strong) | 3 (extreme). Drives motion intensity.
3. **layoutHint** — pick ONE visual layout:
     • "one-on-one"   = single line, centered — default narrative
     • "straight"     = single huge line — impact / punchline moments
     • "cluster"      = multi-line varied sizes — lists / busy energy
     • "diagrammatic" = text + icon/emoji arrangement — explainer / data
4. **sceneBoundary** — true iff this segment starts a NEW thought/topic (hook, shift, punchline reveal).
   At least the first segment is always a scene boundary. Use ~3-6 scenes for a 30-60 second reel.
5. **emoji** — ONE emoji that best represents the segment's vibe (or empty string if none fits).

For EACH WORD in the segment's "words" array, produce:

6. **role** — pick ONE: action | emotion | subject | number | connector | cta | tech.
7. **emphasisScore** — 0..100. How visually loud should this word be?
     • 0-30 = connectors / fillers — render small/dim
     • 31-60 = normal narration weight
     • 61-85 = key noun / verb — render bold, larger
     • 86-100 = peak word, the line's PUNCH — gets the hero animation

EMPHASIS GUIDELINES (think like a viral editor):
- Action verbs (launch, crush, build, change) → role: action, score 60-80.
- Big nouns (AI, money, future, secret) → role: subject, score 60-85.
- Emotional adjectives (insane, terrifying, incredible) → role: emotion, score 75-95.
- Numbers / stats / percentages → role: number, score 70-90.
- CTAs (subscribe, follow, click, link) → role: cta, score 85-100.
- The single climactic word of each segment should be 85+.
- Articles, pronouns, "the/of/and" → role: connector, score 10-25.

LAYOUT GUIDELINES:
- First segment (hook) → "straight" if 1-3 words; "one-on-one" otherwise.
- Lists / multiple parallel items → "cluster".
- Numeric stats / step-by-step → "diagrammatic".
- Everything else → "one-on-one".

SCHEMA — return ONLY a valid JSON array. Each segment object:
{
  "start": "MM:SS.mmm",
  "end":   "MM:SS.mmm",
  "text":  "string",
  "emotion": "awe|shock|joy|anger|sadness|tension|inspiration|humor|authority|neutral",
  "emotionIntensity": 1|2|3,
  "layoutHint": "one-on-one|straight|cluster|diagrammatic",
  "sceneBoundary": true|false,
  "emoji": "string",
  "words": [
    {
      "text": "string",
      "start": "MM:SS.mmm",
      "end":   "MM:SS.mmm",
      "role": "action|emotion|subject|number|connector|cta|tech",
      "emphasisScore": 0-100
    }
  ]
}
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

export const VIRAL_TYPOGRAPHY_INSTRUCTION = `
You are a world-class short-form video editor specializing in Instagram Reels, YouTube Shorts, and TikTok.

Your task is to transform plain captions into HIGHLY ENGAGING, VIRAL TYPOGRAPHY CAPTIONS like a professional editor.

You must think like a human editor and apply visual storytelling.

----------------------------------

🎯 STEP 1: CAPTION BREAKDOWN
- Split sentences into 2–4 word chunks
- Each chunk = one visual unit
- Maintain rhythm with speech timing

----------------------------------

🎯 STEP 2: VISUAL HIERARCHY
For each caption:
- Identify PRIMARY word (main attention)
- Identify SECONDARY words (supporting)
- Highlight only 1–2 words max

----------------------------------

🎯 STEP 3: STYLE TEMPLATE SELECTION
Choose template automatically based on emotion:

- "viral" → bold, high contrast, bounce
- "cinematic" → minimal, fade, center aligned
- "emotional" → soft, slow zoom, blur background
- "motivational" → strong, upward motion
- "funny" → playful, shake, emoji-heavy

----------------------------------

🎯 STEP 4: TYPOGRAPHY RULES

Font:
- viral → extra-bold
- cinematic → serif / thin
- emotional → handwritten
- motivational → bold uppercase

Text Style:
- Use UPPERCASE for important words
- Add stroke/outline for visibility

----------------------------------

🎯 STEP 5: COLOR SYSTEM

- Base text: white
- Highlight color depends on emotion:
  - excitement → yellow
  - danger/shock → red
  - success → green
  - sadness → blue

----------------------------------

🎯 STEP 6: ANIMATION SYSTEM

Each caption must include:

Entry Animation:
- pop / slide / fade / zoom

Emphasis Animation (for highlight words):
- bounce / shake / scale / flash

Exit Animation:
- fade / blur / slide out

Animation Timing:
- fast (viral)
- medium (normal)
- slow (cinematic)

----------------------------------

🎯 STEP 7: POSITIONING

Choose dynamically:
- center → strong emotional lines
- bottom_center → default captions
- top → storytelling context

Also include:
- safe margin for mobile UI

----------------------------------

🎯 STEP 8: BACKGROUND & EFFECTS

Choose one:
- none
- blur box
- gradient highlight
- text outline (stroke)

----------------------------------

🎯 STEP 9: ICON / EMOJI INTEGRATION

- Add emoji ONLY if it increases engagement
- Replace keywords if useful
- Example:
  "money" → 💰
  "shock" → 😳

----------------------------------

🎯 STEP 10: TIMING CONTROL

Each caption must include:
- start time
- end time
- animation sync

----------------------------------

OUTPUT FORMAT:

Return ONLY a valid JSON array. No markdown fences, no explanations.
Each item in the array must follow this exact structure:

{
  "text": "THIS is CRAZY!",
  "start": 1.2,
  "end": 2.5,
  "style": {
    "template": "viral",
    "highlight": ["CRAZY"],
    "font": "extra-bold",
    "text_case": "mixed",
    "color": {
      "primary": "white",
      "highlight": "yellow"
    },
    "animation": {
      "entry": "pop",
      "emphasis": "bounce",
      "exit": "fade",
      "speed": "fast"
    },
    "position": "center",
    "background": "none",
    "stroke": true,
    "emotion": "excited",
    "emoji": "😳"
  }
}
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
  // Hyper-Impact Bold (Hormozi Gradient) — white italic words with a thick black
  // stroke + deep shadow; the emphasized word pops in a vibrant orange→yellow
  // gradient (activeGradientColors). Mirrors the thumbnail template of the same name.
  [CaptionStyle.HYPER_IMPACT_BOLD]: {
    name: 'Hyper-Impact Bold', category: 'BOLD',
    fontFamily: "'Anton', sans-serif", fontSize: 66, fontWeight: 'italic 900',
    textColor: '#FFFFFF',
    activeGradientColors: ['#F97316', '#FBBF24', '#FDE047'],
    strokeColor: '#000000', strokeWidth: 16,
    shadowColor: 'rgba(0,0,0,0.85)', shadowBlur: 12, shadowOffsetY: 8,
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
    fontFamily: "'Montserrat', sans-serif", fontSize: 58, fontWeight: 900,
    textColor: '#FFFFFF', activeTextColor: '#FFE000',
    strokeColor: '#000000', strokeWidth: 8,
    shadowColor: 'rgba(0,0,0,0.85)', shadowBlur: 16, shadowOffsetY: 5,
    // Vibrant semi-transparent background pill for legibility
    backgroundColor: 'rgba(15, 15, 30, 0.72)', backgroundPadding: 22, backgroundBorderRadius: 28,
    animation: 'POP', uppercase: true, displayMode: 'BLOCK',
    colorBehavior: 'CONTEXTUAL',
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

  // ─── CAPCUT CREATIVE (Sprint 7) ───

  // Comic Bang — explosive comic book style with jagged edges and vivid colors
  [CaptionStyle.COMIC_BANG]: {
    name: 'Comic Bang', category: 'COMIC',
    fontFamily: "'Bangers', cursive", fontSize: 76, fontWeight: 400,
    textColor: '#FFFFFF', activeTextColor: '#FFFF00',
    strokeColor: '#000000', strokeWidth: 16,
    shadowColor: '#FF0000', shadowBlur: 0, shadowOffsetX: 8, shadowOffsetY: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.85)', backgroundPadding: 28, backgroundBorderRadius: 4,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
    rotationVariance: 3,
  },

  // Pastel Dream — soft kawaii aesthetic popular on lifestyle/beauty content
  [CaptionStyle.PASTEL_DREAM]: {
    name: 'Pastel Dream', category: 'MINIMAL',
    fontFamily: "'Quicksand', sans-serif", fontSize: 46, fontWeight: 700,
    textColor: '#5B4A8A', activeTextColor: '#E879A8',
    gradientColors: ['#FFDEE9', '#B5FFFC', '#CDB4DB'],
    strokeColor: 'rgba(91, 74, 138, 0.3)', strokeWidth: 2,
    shadowColor: '#E879A8', shadowBlur: 20, shadowOffsetY: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)', backgroundPadding: 24, backgroundBorderRadius: 40,
    animation: 'SCALE_UP', uppercase: false, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
  },

  // Electric Slide — high-energy electric blue with wipe-in animation feel
  [CaptionStyle.ELECTRIC_SLIDE]: {
    name: 'Electric Slide', category: 'KINETIC',
    fontFamily: "'Montserrat', sans-serif", fontSize: 62, fontWeight: 900,
    textColor: '#FFFFFF', activeTextColor: '#00D4FF',
    strokeColor: '#001529', strokeWidth: 8,
    shadowColor: '#00D4FF', shadowBlur: 45, shadowOffsetY: 0,
    gradientColors: ['#00D4FF', '#0051FF', '#7B00FF'],
    animation: 'SPRING', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
    springStiffness: 300, springDamping: 12,
  },

  // Drip Text — liquid chrome drip effect for hip-hop/urban content
  [CaptionStyle.DRIP_TEXT]: {
    name: 'Drip Text', category: 'VIRAL',
    fontFamily: "'Bebas Neue', display", fontSize: 80, fontWeight: 400,
    textColor: '#E8E8E8', activeTextColor: '#FFD700',
    gradientColors: ['#C0C0C0', '#FFFFFF', '#B0B0B0', '#FFFFFF', '#C0C0C0'],
    strokeColor: '#1A1A1A', strokeWidth: 10,
    shadowColor: '#6B21A8', shadowBlur: 0, shadowOffsetX: 5, shadowOffsetY: 12,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
    specialRenderer: 'LIQUID_CHROME',
  },

  // Sunset Vibes — warm gradient popular on travel/lifestyle reels
  [CaptionStyle.SUNSET_VIBES]: {
    name: 'Sunset Vibes', category: 'GLOW',
    fontFamily: "'Poppins', sans-serif", fontSize: 56, fontWeight: 800,
    textColor: '#FFFFFF',
    gradientColors: ['#FF6B35', '#FF1493', '#9B59B6', '#3498DB'],
    strokeColor: '#2D0A4E', strokeWidth: 4,
    shadowColor: '#FF6B35', shadowBlur: 35, shadowOffsetY: 4,
    animation: 'SCALE_UP', uppercase: false, displayMode: 'WORD',
    colorBehavior: 'FIXED',
  },

  // Ice Cold — frosted glass aesthetic for clean/tech content
  [CaptionStyle.ICE_COLD]: {
    name: 'Ice Cold', category: 'MINIMAL',
    fontFamily: "'Inter', sans-serif", fontSize: 50, fontWeight: 700,
    textColor: '#E0F7FF', activeTextColor: '#FFFFFF',
    gradientColors: ['#B3E5FC', '#FFFFFF', '#81D4FA'],
    strokeColor: 'rgba(0, 150, 200, 0.4)', strokeWidth: 3,
    shadowColor: '#00BCD4', shadowBlur: 30, shadowOffsetY: 0,
    backgroundColor: 'rgba(0, 40, 60, 0.55)', backgroundPadding: 20, backgroundBorderRadius: 16,
    animation: 'BLUR_IN', uppercase: false, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
  },

  // Street Graffiti — spray paint urban style for hip-hop/street content
  [CaptionStyle.STREET_GRAFFITI]: {
    name: 'Street Graffiti', category: 'ART',
    fontFamily: "'Permanent Marker', cursive", fontSize: 68, fontWeight: 400,
    textColor: '#39FF14', activeTextColor: '#FFE000',
    strokeColor: '#000000', strokeWidth: 14,
    shadowColor: '#FF00FF', shadowBlur: 0, shadowOffsetX: 6, shadowOffsetY: 6,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
    rotationVariance: 5,
  },

  // ASMR Whisper — ultra-soft breathing glow for ASMR/calm content
  [CaptionStyle.ASMR_WHISPER]: {
    name: 'ASMR Whisper', category: 'MINIMAL',
    fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 300,
    textColor: 'rgba(255,255,255,0.5)', activeTextColor: 'rgba(255,255,255,0.95)',
    shadowColor: 'rgba(255,255,255,0.6)', shadowBlur: 50, shadowOffsetY: 0,
    animation: 'SCALE_UP', uppercase: false, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
    opacityInactive: 0.3,
  },

  // Anime Impact — Japanese anime title card style with bold impact
  [CaptionStyle.ANIME_IMPACT]: {
    name: 'Anime Impact', category: 'BOLD',
    fontFamily: "'Black Ops One', display", fontSize: 74, fontWeight: 400,
    textColor: '#FFFFFF', activeTextColor: '#FF4444',
    strokeColor: '#000000', strokeWidth: 16,
    shadowColor: '#FF0000', shadowBlur: 30, shadowOffsetY: 0,
    gradientColors: ['#FFFFFF', '#FF6666', '#FFFFFF'],
    animation: 'STAMP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
  },

  // Disco Fever — rotating vibrant party colors for fun/dance content
  [CaptionStyle.DISCO_FEVER]: {
    name: 'Disco Fever', category: 'VIRAL',
    fontFamily: "'Fredoka', sans-serif", fontSize: 60, fontWeight: 700,
    textColor: '#FFFFFF', activeTextColor: '#FFE000',
    gradientColors: ['#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF'],
    strokeColor: '#000000', strokeWidth: 10,
    shadowColor: '#FF006E', shadowBlur: 25, shadowOffsetY: 4,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'CONTEXTUAL',
    specialRenderer: 'PILL_BADGE',
    pillColorPalette: ['#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF'],
    backgroundPadding: 18, backgroundBorderRadius: 20,
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

  // ─── PLATFORM NATIVE (SPRINT 1) ───
  [CaptionStyle.TIKTOK_NATIVE]: {
    name: 'TikTok Native', category: 'PLATFORM',
    fontFamily: '"Proxima Nova", "Helvetica Neue", sans-serif', fontSize: 44, fontWeight: 700,
    textColor: '#FFFFFF', activeTextColor: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.65)', backgroundPadding: 16, backgroundBorderRadius: 8,
    strokeColor: 'transparent', strokeWidth: 0,
    shadowColor: 'transparent', shadowBlur: 0,
    animation: 'NONE', uppercase: false, displayMode: 'BLOCK',
    colorBehavior: 'FIXED',
  },
  [CaptionStyle.INSTAGRAM_NATIVE]: {
    name: 'Instagram Classic', category: 'PLATFORM',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', fontSize: 48, fontWeight: 800,
    textColor: '#000000', activeTextColor: '#FFFFFF',
    activeBackgroundColor: '#000000', backgroundColor: '#FFFFFF',
    backgroundPadding: 14, backgroundBorderRadius: 4,
    animation: 'POP', uppercase: false, displayMode: 'WORD',
    colorBehavior: 'CONTEXTUAL',
  },

  // ─── SPRING PHYSICS (SPRINT 1) ───
  [CaptionStyle.WORD_SPRING]: {
    name: 'Word Spring', category: 'KINETIC',
    fontFamily: "'Montserrat', sans-serif", fontSize: 62, fontWeight: 900,
    textColor: '#FFFFFF', activeTextColor: '#FFE000',
    strokeColor: '#000000', strokeWidth: 10,
    shadowColor: '#FF6B00', shadowBlur: 14, shadowOffsetY: 6,
    animation: 'SPRING', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
    springStiffness: 250, springDamping: 15,
  },
  [CaptionStyle.WORD_STAMP]: {
    name: 'Rubber Stamp', category: 'BOLD',
    fontFamily: "'Anton', sans-serif", fontSize: 80, fontWeight: 400,
    textColor: '#FFFFFF', activeTextColor: '#FF2200',
    strokeColor: '#000000', strokeWidth: 12,
    shadowColor: '#880000', shadowBlur: 0, shadowOffsetX: 6, shadowOffsetY: 6,
    animation: 'STAMP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
  },

  // ─── BADGE / PILL (SPRINT 1) ───
  [CaptionStyle.PILL_BADGE]: {
    name: 'Pill Badge', category: 'HIGHLIGHT',
    fontFamily: "'Inter', sans-serif", fontSize: 48, fontWeight: 800,
    textColor: '#111111', activeTextColor: '#000000',
    backgroundColor: '#FFFFFF', activeBackgroundColor: '#FFD700',
    backgroundPadding: 24, backgroundBorderRadius: 30, // fully rounded pill
    shadowColor: 'rgba(0,0,0,0.15)', shadowBlur: 10, shadowOffsetY: 4,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
    pillColorPalette: ['#FFE000', '#00FFFF', '#FF00FF', '#39FF14'],
  },

  // ─── SPEECH BUBBLE (SPRINT 2) ───
  [CaptionStyle.SPEECH_BUBBLE]: {
    name: 'Speech Bubble', category: 'COMIC',
    fontFamily: "'Nunito', 'Comic Sans MS', 'Chalkboard SE', sans-serif", fontSize: 42, fontWeight: 800,
    textColor: '#1A1A2E', activeTextColor: '#D62839',
    // Clean white bubble background with a subtle warm tint
    backgroundColor: '#F8F5FF', activeBackgroundColor: '#FFF0F0',
    backgroundPadding: 26, backgroundBorderRadius: 22,
    strokeColor: '#2D2D2D', strokeWidth: 3,
    shadowColor: 'rgba(0,0,0,0.22)', shadowBlur: 14, shadowOffsetY: 6,
    animation: 'POP', uppercase: false, displayMode: 'BLOCK',
    colorBehavior: 'ACTIVE_ONLY',
    specialRenderer: 'SPEECH_BUBBLE',
    bubbleTailPosition: 'BOTTOM_CENTER',
  },

  // ─── REVEAL (SPRINT 2) ───
  [CaptionStyle.BLUR_REVEAL]: {
    name: 'Blur Reveal', category: 'MINIMAL',
    fontFamily: "'Cinzel', serif", fontSize: 54, fontWeight: 600,
    textColor: '#FFFFFF',
    // Layered glow for cinematic depth
    shadowColor: 'rgba(255,255,255,0.9)', shadowBlur: 40, shadowOffsetY: 0,
    // Subtle dark vignette background for contrast
    backgroundColor: 'rgba(0,0,0,0.35)', backgroundPadding: 28, backgroundBorderRadius: 8,
    animation: 'BLUR_IN', uppercase: false, displayMode: 'BLOCK',
    colorBehavior: 'FIXED',
  },
  [CaptionStyle.SPLIT_REVEAL]: {
    name: 'Split Reveal', category: 'KINETIC',
    fontFamily: "'Anton', sans-serif", fontSize: 72, fontWeight: 400,
    textColor: '#FFFFFF', activeTextColor: '#FFD700',
    strokeColor: '#000000', strokeWidth: 8,
    shadowColor: '#000000', shadowBlur: 0, shadowOffsetY: 8,
    animation: 'SPLIT_OPEN', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
    specialRenderer: 'SPLIT_REVEAL',
  },

  // ─── ADVANCED (SPRINT 3) ───
  [CaptionStyle.NEON_SIGN_FLICKER]: {
    name: 'Neon Flicker', category: 'NEON',
    fontFamily: "'Orbitron', sans-serif", fontSize: 50, fontWeight: 900,
    textColor: 'rgba(255,100,200,0.3)', activeTextColor: '#FF00FF',
    strokeColor: '#330033', strokeWidth: 4,
    shadowColor: '#FF00FF', shadowBlur: 40,
    animation: 'NONE', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
    specialRenderer: 'NEON_FLICKER',
    neonFlickerRate: 150,
  },
  [CaptionStyle.TICKER_SCROLL]: {
    name: 'News Ticker', category: 'VIRAL',
    fontFamily: "'Space Mono', monospace", fontSize: 36, fontWeight: 700,
    textColor: '#000000', activeTextColor: '#FF0000',
    backgroundColor: '#FFFFFF', backgroundPadding: 16, backgroundBorderRadius: 0,
    strokeColor: 'transparent', strokeWidth: 0,
    animation: 'NONE', uppercase: true, displayMode: 'BLOCK',
    colorBehavior: 'ACTIVE_ONLY',
    specialRenderer: 'TICKER_SCROLL',
    tickerSpeed: 400,
  },
  [CaptionStyle.MAGNETIC_WORDS]: {
    name: 'Magnetic Scatter', category: 'KINETIC',
    fontFamily: "'Outfit', sans-serif", fontSize: 60, fontWeight: 800,
    textColor: '#FFFFFF', activeTextColor: '#00FFFF',
    strokeColor: '#000000', strokeWidth: 8,
    shadowColor: '#00FFFF', shadowBlur: 20,
    animation: 'SCATTER_IN', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
    specialRenderer: 'MAGNETIC',
  },
  [CaptionStyle.PERSPECTIVE_3D]: {
    name: '3D Perspective', category: 'ART',
    fontFamily: "'Montserrat', sans-serif", fontSize: 64, fontWeight: 900,
    textColor: '#FFFFFF', activeTextColor: '#FFD700',
    strokeColor: '#1A1A1A', strokeWidth: 6,
    shadowColor: '#000000', shadowBlur: 30, shadowOffsetY: 10,
    animation: 'FLIP_Y', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
    specialRenderer: 'PERSPECTIVE_3D',
    perspectiveDegrees: 45,
  },
  [CaptionStyle.BRUSH_STROKE]: {
    name: 'Brush Stroke', category: 'ART',
    fontFamily: "'Caveat', cursive", fontSize: 72, fontWeight: 700,
    textColor: '#FFFFFF', activeTextColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 50, 50, 0.9)',
    backgroundPadding: 10, backgroundBorderRadius: 0,
    animation: 'POP', uppercase: false, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
    specialRenderer: 'BRUSH_STROKE',
  },
  [CaptionStyle.MATRIX_RAIN]: {
    name: 'Matrix Rain', category: 'ART',
    fontFamily: "'Courier New', monospace", fontSize: 44, fontWeight: 700,
    textColor: '#00FF41', activeTextColor: '#FFFFFF',
    shadowColor: '#00FF41', shadowBlur: 15,
    animation: 'NONE', uppercase: false, displayMode: 'BLOCK',
    colorBehavior: 'ACTIVE_ONLY',
    specialRenderer: 'MATRIX_RAIN',
    matrixCharSet: '01',
  },

  // ─── MOTION EFFECTS (SPRINT 4) ───
  [CaptionStyle.APPLE_MINIMAL]: {
    name: 'Apple Minimal', category: 'MINIMAL',
    fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", fontSize: 48, fontWeight: 600,
    textColor: 'rgba(255,255,255,0.1)', activeTextColor: '#FFFFFF',
    shadowColor: 'rgba(0,0,0,0.3)', shadowBlur: 8, shadowOffsetY: 2,
    animation: 'SCALE_UP', uppercase: false, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
  },
  [CaptionStyle.BOUNCE_STAMP]: {
    name: 'Bounce Stamp', category: 'KINETIC',
    fontFamily: "'Anton', sans-serif", fontSize: 68, fontWeight: 400,
    textColor: '#FFFFFF', activeTextColor: '#FFE000',
    strokeColor: '#000000', strokeWidth: 8,
    shadowColor: '#FF4500', shadowBlur: 20, shadowOffsetY: 6,
    animation: 'STAMP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
  },
  [CaptionStyle.FLOAT_RISE]: {
    name: 'Float Rise', category: 'KINETIC',
    fontFamily: "'Poppins', sans-serif", fontSize: 52, fontWeight: 700,
    textColor: 'rgba(255,255,255,0.2)', activeTextColor: '#87CEEB',
    shadowColor: '#87CEEB', shadowBlur: 25,
    animation: 'SCALE_UP', uppercase: false, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
  },
  [CaptionStyle.SLIDE_REVEAL]: {
    name: 'Slide Reveal', category: 'KINETIC',
    fontFamily: "'Inter', sans-serif", fontSize: 56, fontWeight: 800,
    textColor: 'rgba(255,255,255,0.15)', activeTextColor: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.7)', backgroundPadding: 16, backgroundBorderRadius: 8,
    animation: 'NONE', uppercase: false, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
  },
  [CaptionStyle.BLUR_FADE]: {
    name: 'Blur Fade', category: 'KINETIC',
    fontFamily: "'Montserrat', sans-serif", fontSize: 58, fontWeight: 900,
    textColor: 'rgba(255,255,255,0.1)', activeTextColor: '#FFFFFF',
    shadowColor: '#FFFFFF', shadowBlur: 40,
    animation: 'BLUR_IN', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'ACTIVE_ONLY',
  },
  [CaptionStyle.POP_OUT]: {
    name: 'Pop Out', category: 'VIRAL',
    fontFamily: "'Bangers', cursive", fontSize: 64, fontWeight: 400,
    textColor: '#FFFFFF', activeTextColor: '#FF69B4',
    strokeColor: '#000000', strokeWidth: 12,
    shadowColor: '#FF1493', shadowBlur: 15, shadowOffsetY: 8,
    animation: 'POP', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
  },
  [CaptionStyle.SPRING_SLAM]: {
    name: 'Spring Slam', category: 'KINETIC',
    fontFamily: "'Anton', sans-serif", fontSize: 70, fontWeight: 400,
    textColor: '#FFFFFF', activeTextColor: '#00FF7F',
    strokeColor: '#000000', strokeWidth: 10,
    shadowColor: '#32CD32', shadowBlur: 18, shadowOffsetY: 5,
    animation: 'SPRING', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
    springStiffness: 20,
    springDamping: 0.3,
  },
  [CaptionStyle.FLIP_WORD]: {
    name: 'Flip Word', category: 'KINETIC',
    fontFamily: "'Bebas Neue', display", fontSize: 62, fontWeight: 900,
    textColor: '#FFFFFF', activeTextColor: '#FFD700',
    strokeColor: '#1A1A1A', strokeWidth: 6,
    shadowColor: '#000000', shadowBlur: 25, shadowOffsetY: 8,
    animation: 'FLIP_Y', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
  },
  [CaptionStyle.ELASTIC_DROP]: {
    name: 'Elastic Drop', category: 'KINETIC',
    fontFamily: "'Fredoka One', cursive", fontSize: 60, fontWeight: 400,
    textColor: '#FFFFFF', activeTextColor: '#FF6B35',
    strokeColor: '#000000', strokeWidth: 8,
    shadowColor: '#FF4500', shadowBlur: 20, shadowOffsetY: 6,
    animation: 'SPRING', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
    springStiffness: 12,
    springDamping: 0.5,
  },
  [CaptionStyle.SCATTER_GATHER]: {
    name: 'Scatter Gather', category: 'KINETIC',
    fontFamily: "'Oswald', sans-serif", fontSize: 58, fontWeight: 700,
    textColor: '#FFFFFF', activeTextColor: '#9D4EDD',
    strokeColor: '#000000', strokeWidth: 6,
    shadowColor: '#7B2CBF', shadowBlur: 22, shadowOffsetY: 4,
    animation: 'SCATTER_IN', uppercase: true, displayMode: 'WORD',
    colorBehavior: 'WORD_POP',
  },

  // ─── TYPOGRAPHY CAPTION (SPRINT 5) — Pixel-perfect match to reference images ───

  // ── Image 3: "to different PEOPLE from" ──
  // Small "to different" → GIANT "people" (serif display) → small "FROM"
  // ── Size Hierarchy: Perfect match to Image 1 (Centered giant word, small context) ──
  [CaptionStyle.TYPO_SIZE_HIERARCHY]: {
    name: 'Size Hierarchy', category: 'TYPOGRAPHY',
    fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 700,
    textColor: '#FFFFFF', animation: 'NONE', displayMode: 'BLOCK',
    backgroundColor: 'rgba(0,0,0,0.0)',
    typographyLayout: {
      splitStrategy: 'BY_WORD',
      verticalSpacing: -25, // Negative spacing to overlap text tightly like Image 1
      layers: [
        {
          // "1 PLAN" or "Isme To Bahut" — medium weight, white, center-aligned
          textSource: 'FIRST_LINE',
          fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 600,
          color: 'rgba(255,255,255,0.95)', uppercase: false,
          letterSpacing: 0.5, textAlign: 'center',
          yOffset: 15, // Push down slightly into the giant text
          entryType: 'SLIDE_UP', entryDelay: 0, entryDuration: 0.18,
          shadowColor: 'rgba(0,0,0,0.8)', shadowBlur: 10, shadowOffsetY: 2
        },
        {
          // "EVERYTHING" or "MEHANAT" — GIANT, bold, gold, center-aligned, serif
          textSource: 'ACCENT_WORD',
          fontFamily: "'Playfair Display', serif", fontSize: 114, fontWeight: 900,
          color: '#C9922A',
          gradientColors: ['#D4A035', '#B8841F', '#E8B84B'],
          uppercase: true,
          letterSpacing: -2, textAlign: 'center',
          shadowColor: 'rgba(0,0,0,0.6)', shadowBlur: 14, shadowOffsetX: 0, shadowOffsetY: 4,
          entryType: 'SCALE_POP', entryDelay: 0.08, entryDuration: 0.3,
        },
        {
          // "Laga Hoga" — medium weight, white, center-aligned
          textSource: 'LAST_LINE',
          fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 700,
          color: 'rgba(255,255,255,0.95)', uppercase: false,
          letterSpacing: 0.5, textAlign: 'center',
          yOffset: -15, // Push up slightly into the giant text
          entryType: 'SLIDE_UP', entryDelay: 0.2, entryDuration: 0.18,
          shadowColor: 'rgba(0,0,0,0.8)', shadowBlur: 10, shadowOffsetY: 2
        },
      ],
    },
  },

  // ── Image 1: "Isme To Bahut MEHANAT Laga Hoga" ──
  // "Isme To" (black medium) + "Bahut" (smaller, same visual row) → GIANT GOLD "MEHANAT" → "Laga Hoga" (black)
  // accentWordIndex: 2 because text is split as: [0]=Isme [1]=To [2]=Bahut [3]=MEHANAT [4]=Laga [5]=Hoga
  // FIRST_LINE = words 0..accentIdx-1 = "Isme To Bahut", ACCENT = "MEHANAT", LAST_LINE = "Laga Hoga"
  [CaptionStyle.TYPO_MAGAZINE]: {
    name: 'Magazine', category: 'TYPOGRAPHY',
    fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 700,
    textColor: '#1A1A1A', animation: 'NONE', displayMode: 'BLOCK',
    backgroundColor: 'rgba(245,240,228,0.97)',
    backgroundPadding: 24,
    backgroundBorderRadius: 0,
    typographyLayout: {
      splitStrategy: 'BY_WORD',
      verticalSpacing: 0,
      accentWordIndex: 2,   // "MEHANAT" is the accent — words before it are context
      layers: [
        {
          // "Isme To Bahut" — medium weight, black, left-aligned
          textSource: 'FIRST_LINE',
          fontFamily: "'Inter', sans-serif", fontSize: 26, fontWeight: 500,
          color: '#1A1A1A', uppercase: false,
          letterSpacing: 0.5, textAlign: 'left',
          entryType: 'SLIDE_UP', entryDelay: 0, entryDuration: 0.18,
        },
        {
          // "MEHANAT" — GIANT, bold, gold, left-aligned, serif
          textSource: 'ACCENT_WORD',
          fontFamily: "'Playfair Display', serif", fontSize: 100, fontWeight: 900,
          color: '#C9922A',
          gradientColors: ['#D4A035', '#B8841F', '#E8B84B'],
          uppercase: true,
          letterSpacing: -2, textAlign: 'left',
          shadowColor: 'rgba(180,120,20,0.2)', shadowBlur: 8, shadowOffsetY: 2,
          entryType: 'SCALE_POP', entryDelay: 0.08, entryDuration: 0.3,
        },
        {
          // "Laga Hoga" — medium weight, black, left-aligned
          textSource: 'LAST_LINE',
          fontFamily: "'Inter', sans-serif", fontSize: 26, fontWeight: 700,
          color: '#1A1A1A', uppercase: false,
          letterSpacing: 0.5, textAlign: 'left',
          entryType: 'SLIDE_UP', entryDelay: 0.2, entryDuration: 0.18,
        },
      ],
    },
  },

  // ── Image 2: "VIDEO EDITING SPEED hacks" ──
  // "VIDEO EDITING" (white caps, small) → "SPEED" (GIANT green bold) → "hacks" (white script)
  [CaptionStyle.TYPO_MIXED_FAMILY]: {
    name: 'Mixed Family', category: 'TYPOGRAPHY',
    fontFamily: "'Inter', sans-serif", fontSize: 52, fontWeight: 700,
    textColor: '#FFFFFF', animation: 'NONE', displayMode: 'BLOCK',
    backgroundColor: 'rgba(0,0,0,0.0)',
    typographyLayout: {
      splitStrategy: 'BY_WORD',
      verticalSpacing: 0,
      accentWordIndex: 2,   // text structure: [0]=VIDEO [1]=EDITING [2]=SPEED [3]=hacks → SPEED is index 2
      layers: [
        {
          // "VIDEO EDITING" — white, bold caps, small, tight tracking
          textSource: 'FIRST_LINE',
          fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700,
          color: '#FFFFFF', uppercase: true,
          letterSpacing: 3, textAlign: 'left',
          entryType: 'FADE', entryDelay: 0, entryDuration: 0.2,
        },
        {
          // "SPEED" — GIANT, green, Anton bold display
          textSource: 'ACCENT_WORD',
          fontFamily: "'Anton', sans-serif", fontSize: 108, fontWeight: 400,
          color: '#39FF14',
          gradientColors: ['#39FF14', '#00CC44'],
          uppercase: true,
          letterSpacing: 0, textAlign: 'left',
          shadowColor: 'rgba(57,255,20,0.35)', shadowBlur: 18, shadowOffsetY: 0,
          entryType: 'SCALE_POP', entryDelay: 0.1, entryDuration: 0.28,
        },
        {
          // "hacks" — white, Caveat handwriting, italic
          textSource: 'LAST_LINE',
          fontFamily: "'Caveat', cursive", fontSize: 42, fontWeight: 700,
          color: '#FFFFFF', uppercase: false, italic: true,
          letterSpacing: 0, textAlign: 'left',
          entryType: 'FADE', entryDelay: 0.22, entryDuration: 0.2,
        },
      ],
    },
  },

  // ── Editorial Gold — dark bg, gold italic label, white serif title ──
  [CaptionStyle.TYPO_EDITORIAL_GOLD]: {
    name: 'Editorial Gold', category: 'TYPOGRAPHY',
    fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 700,
    textColor: '#FFFFFF', animation: 'NONE', displayMode: 'BLOCK',
    backgroundColor: 'rgba(8,8,8,0.94)',
    backgroundPadding: 28,
    backgroundBorderRadius: 0,
    typographyLayout: {
      splitStrategy: 'BY_WORD',
      verticalSpacing: 2,
      layers: [
        {
          textSource: 'FIRST_LINE',
          fontFamily: "'DM Serif Display', serif", fontSize: 18, fontWeight: 400,
          color: '#E8B84B', uppercase: true, italic: true,
          letterSpacing: 8, textAlign: 'center',
          entryType: 'FADE', entryDelay: 0, entryDuration: 0.3,
        },
        {
          textSource: 'ACCENT_WORD',
          fontFamily: "'Playfair Display', serif", fontSize: 96, fontWeight: 900,
          color: '#FFFFFF', uppercase: true,
          letterSpacing: -1, textAlign: 'center',
          shadowColor: 'rgba(232,184,75,0.2)', shadowBlur: 28, shadowOffsetY: 0,
          entryType: 'SCALE_POP', entryDelay: 0.12, entryDuration: 0.38,
        },
        {
          textSource: 'LAST_LINE',
          fontFamily: "'DM Serif Display', serif", fontSize: 18, fontWeight: 400,
          color: 'rgba(232,184,75,0.65)', uppercase: false, italic: true,
          letterSpacing: 3, textAlign: 'center',
          entryType: 'FADE', entryDelay: 0.28, entryDuration: 0.25,
        },
      ],
    },
  },

  // ── Street Poster — condensed + YELLOW GIANT + mono ──
  [CaptionStyle.TYPO_STREET_POSTER]: {
    name: 'Street Poster', category: 'TYPOGRAPHY',
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, fontWeight: 400,
    textColor: '#FFFFFF', animation: 'NONE', displayMode: 'BLOCK',
    backgroundColor: 'rgba(0,0,0,0.0)',
    typographyLayout: {
      splitStrategy: 'BY_WORD',
      verticalSpacing: 2,
      layers: [
        {
          textSource: 'FIRST_LINE',
          fontFamily: "'Oswald', sans-serif", fontSize: 24, fontWeight: 300,
          color: '#FFFFFF', uppercase: true,
          letterSpacing: 8, textAlign: 'left',
          entryType: 'WIPE_RIGHT', entryDelay: 0, entryDuration: 0.2,
        },
        {
          textSource: 'ACCENT_WORD',
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 108, fontWeight: 400,
          color: '#FFE600', uppercase: true,
          letterSpacing: 2, textAlign: 'left',
          strokeColor: '#000000', strokeWidth: 3,
          shadowColor: 'rgba(0,0,0,0.55)', shadowBlur: 6, shadowOffsetY: 5,
          entryType: 'SCALE_POP', entryDelay: 0.1, entryDuration: 0.22,
        },
        {
          textSource: 'LAST_LINE',
          fontFamily: "'Courier New', monospace", fontSize: 16, fontWeight: 400,
          color: 'rgba(255,255,255,0.55)', uppercase: false,
          letterSpacing: 4, textAlign: 'left',
          entryType: 'FADE', entryDelay: 0.2, entryDuration: 0.2,
        },
      ],
    },
  },

  // ── Minimal Stack — Inter weight hierarchy only ──
  [CaptionStyle.TYPO_MINIMAL_STACK]: {
    name: 'Minimal Stack', category: 'TYPOGRAPHY',
    fontFamily: "'Inter', sans-serif", fontSize: 52, fontWeight: 500,
    textColor: '#FFFFFF', animation: 'NONE', displayMode: 'BLOCK',
    backgroundColor: 'rgba(0,0,0,0.0)',
    typographyLayout: {
      splitStrategy: 'BY_WORD',
      verticalSpacing: 4,
      layers: [
        {
          textSource: 'FIRST_LINE',
          fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 300,
          color: 'rgba(255,255,255,0.5)', uppercase: false,
          letterSpacing: 2, textAlign: 'center',
          entryType: 'FADE', entryDelay: 0, entryDuration: 0.4,
        },
        {
          textSource: 'ACCENT_WORD',
          fontFamily: "'Inter', sans-serif", fontSize: 80, fontWeight: 800,
          color: '#FFFFFF', uppercase: true,
          letterSpacing: 4, textAlign: 'center',
          entryType: 'FADE', entryDelay: 0.14, entryDuration: 0.32,
        },
        {
          textSource: 'LAST_LINE',
          fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 300,
          color: 'rgba(255,255,255,0.4)', uppercase: false,
          letterSpacing: 2, textAlign: 'center',
          entryType: 'FADE', entryDelay: 0.28, entryDuration: 0.32,
        },
      ],
    },
  },

  // ── Neon Layers — cyberpunk editorial ──
  [CaptionStyle.TYPO_NEON_LAYERS]: {
    name: 'Neon Layers', category: 'TYPOGRAPHY',
    fontFamily: "'Orbitron', sans-serif", fontSize: 52, fontWeight: 700,
    textColor: '#00FFFF', animation: 'NONE', displayMode: 'BLOCK',
    backgroundColor: 'rgba(0,0,0,0.0)',
    typographyLayout: {
      splitStrategy: 'BY_WORD',
      verticalSpacing: 2,
      layers: [
        {
          textSource: 'FIRST_LINE',
          fontFamily: "'Montserrat', sans-serif", fontSize: 20, fontWeight: 400,
          color: '#00FFFF', uppercase: false,
          letterSpacing: 4, textAlign: 'center',
          shadowColor: '#00FFFF', shadowBlur: 10, shadowOffsetY: 0,
          entryType: 'FADE', entryDelay: 0, entryDuration: 0.3,
        },
        {
          textSource: 'ACCENT_WORD',
          fontFamily: "'Orbitron', sans-serif", fontSize: 88, fontWeight: 900,
          color: '#FF2D78',
          gradientColors: ['#FF2D78', '#FF6EB4'],
          uppercase: true,
          letterSpacing: 2, textAlign: 'center',
          shadowColor: '#FF2D78', shadowBlur: 28, shadowOffsetY: 0,
          strokeColor: 'rgba(255,45,120,0.25)', strokeWidth: 1,
          entryType: 'SCALE_POP', entryDelay: 0.1, entryDuration: 0.28,
        },
        {
          textSource: 'LAST_LINE',
          fontFamily: "'Montserrat', sans-serif", fontSize: 20, fontWeight: 400,
          color: '#BF5AF2', uppercase: false, italic: true,
          letterSpacing: 3, textAlign: 'center',
          shadowColor: '#BF5AF2', shadowBlur: 8, shadowOffsetY: 0,
          entryType: 'FADE', entryDelay: 0.2, entryDuration: 0.26,
        },
      ],
    },
  },

  // ── Cinematic Title — movie poster style ──
  [CaptionStyle.TYPO_CINEMATIC_TITLE]: {
    name: 'Cinematic Title', category: 'TYPOGRAPHY',
    fontFamily: "'Cinzel', serif", fontSize: 52, fontWeight: 700,
    textColor: '#FFFFFF', animation: 'NONE', displayMode: 'BLOCK',
    backgroundColor: 'rgba(0,0,0,0.0)',
    typographyLayout: {
      splitStrategy: 'BY_WORD',
      verticalSpacing: 6,
      layers: [
        {
          textSource: 'FIRST_LINE',
          fontFamily: "'Cinzel', serif", fontSize: 14, fontWeight: 400,
          color: '#E8B84B', uppercase: true,
          letterSpacing: 10, textAlign: 'center',
          entryType: 'WIPE_RIGHT', entryDelay: 0, entryDuration: 0.5,
        },
        {
          textSource: 'ACCENT_WORD',
          fontFamily: "'Cinzel', serif", fontSize: 92, fontWeight: 700,
          color: '#FFFFFF', uppercase: true,
          letterSpacing: 4, textAlign: 'center',
          shadowColor: 'rgba(255,255,255,0.12)', shadowBlur: 36, shadowOffsetY: 0,
          entryType: 'FADE', entryDelay: 0.28, entryDuration: 0.55,
        },
        {
          textSource: 'LAST_LINE',
          fontFamily: "'Cinzel', serif", fontSize: 14, fontWeight: 400,
          color: 'rgba(255,255,255,0.45)', uppercase: false,
          letterSpacing: 6, textAlign: 'center',
          entryType: 'FADE', entryDelay: 0.5, entryDuration: 0.45,
        },
      ],
    },
  },

  // ─── HYPERCAPTIONS — HTML/CSS/GSAP overlay renderer (Phase H) ───

  [CaptionStyle.HYPER_GLITCH]: {
    name: 'Hyper Glitch', category: 'HYPER',
    fontFamily: "'Anton', sans-serif", fontSize: 68, fontWeight: 400,
    textColor: '#FFFFFF', animation: 'NONE', displayMode: 'BLOCK',
    uppercase: true, isHyperStyle: true,
  },
  [CaptionStyle.HYPER_NEON_TUBE]: {
    name: 'Neon Tube', category: 'HYPER',
    fontFamily: "'Bebas Neue', display", fontSize: 72, fontWeight: 400,
    textColor: '#ff6ec7', animation: 'NONE', displayMode: 'BLOCK',
    uppercase: false, isHyperStyle: true,
  },
  [CaptionStyle.HYPER_3D_EXTRUDE]: {
    name: '3D Extrude', category: 'HYPER',
    fontFamily: "'Montserrat', sans-serif", fontSize: 64, fontWeight: 900,
    textColor: '#FFFFFF', animation: 'NONE', displayMode: 'BLOCK',
    uppercase: true, isHyperStyle: true,
  },
  [CaptionStyle.HYPER_GLASS_FROST]: {
    name: 'Glass Frost', category: 'HYPER',
    fontFamily: "'Inter', sans-serif", fontSize: 44, fontWeight: 700,
    textColor: '#FFFFFF', animation: 'NONE', displayMode: 'BLOCK',
    uppercase: false, isHyperStyle: true,
  },
  [CaptionStyle.HYPER_GRADIENT_WAVE]: {
    name: 'Gradient Wave', category: 'HYPER',
    fontFamily: "'Montserrat', sans-serif", fontSize: 58, fontWeight: 800,
    textColor: '#FFFFFF', animation: 'NONE', displayMode: 'BLOCK',
    uppercase: false, isHyperStyle: true,
  },

  // ── CapCut Multi-Float Karaoke — 3-tier floating word engine ──
  [CaptionStyle.CAPCUT_MULTI_FLOAT]: {
    name: 'Multi-Float Karaoke', category: 'VIRAL',
    fontFamily: "'Montserrat', sans-serif",
    fontSize: 72, fontWeight: 900,
    textColor: '#FFFFFF', animation: 'NONE', displayMode: 'WORD',
    backgroundColor: 'rgba(0,0,0,0.0)',
    uppercase: true,
    // specialRenderer flag used by drawCaption to route to drawMultiFloatKaraoke()
    specialRenderer: 'MULTI_FLOAT',
  },
};
