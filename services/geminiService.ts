import { GoogleGenAI, Type } from "@google/genai";
import {
  GEMINI_MODEL,
  SYSTEM_INSTRUCTION,
  AUTO_ADJUST_INSTRUCTION,
  SMART_COMPRESSION_INSTRUCTION,
  PURE_TELUGU_INSTRUCTION,
  TELGLISH_INSTRUCTION,
  ENGLISH_ONLY_INSTRUCTION,
  AUTO_LANGUAGE_INSTRUCTION,
  TRENDING_INSTRUCTION,
  HINDI_INSTRUCTION,
  TAMIL_INSTRUCTION,
  KANNADA_INSTRUCTION,
  MARATHI_INSTRUCTION,
  HINGLISH_INSTRUCTION
} from "../constants";
import { Caption, LanguageMode, ViralHookResponse, SeoResult, SocialPlatform, CaptionStyle } from "../types";

// Helper to retrieve API Key (Environment or LocalStorage for testing)
const getApiKey = (): string => {
  // Prioritize GEMINI_API_KEY as per baseline guidelines
  const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const key = envKey || localStorage.getItem('createrin_api_key');

  if (!key) {
    throw new Error("API Key not found. Please select a key.");
  }
  return key;
};

// Helper to parse time string "MM:SS.mmm" or "SS.mmm" to seconds
const parseTime = (timeStr: string): number => {
  try {
    if (!timeStr) return 0;
    const parts = timeStr.toString().split(':');
    if (parts.length === 2) {
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    } else if (parts.length === 1) {
      return parseFloat(parts[0]);
    } else if (parts.length === 3) {
      return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    }
    return 0;
  } catch (e) {
    console.warn("[parseTime] Failed to parse time:", timeStr, e);
    return 0;
  }
};

// Map AI categories to Hex colors
const COLOR_MAP: Record<string, string> = {
  'neutral': '#FFFFFF',   // White
  'emphasis': '#FACC15',  // Yellow
  'positive': '#4ADE80',  // Green
  'negative': '#EF4444',  // Red
  'tech': '#60A5FA',      // Blue
  'action': '#FB923C'     // Orange
};

export const generateCaptionsFromVideo = async (
  videoData: Blob | File,
  mimeType: string,
  autoAdjust: boolean,
  smartCompression: boolean,
  languageMode: LanguageMode = 'AUTO',
  captionStyle: CaptionStyle = CaptionStyle.CLEAN_WHITE
): Promise<{ captions: Caption[], language: string }> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // The prompt reinforces verbatim transcription — no word skipping
  const prompt = "Transcribe the audio VERBATIM — include EVERY single word spoken, do NOT skip or summarize any words. Split into caption segments but keep ALL words. Adhere strictly to the JSON schema.";

  // Combine base instruction with language mode
  let finalInstruction = SYSTEM_INSTRUCTION;

  if (captionStyle === CaptionStyle.VIRAL_SLAM) {
    finalInstruction += `\n\n${TRENDING_INSTRUCTION}`;
  }

  switch (languageMode) {
    case 'PURE_TELUGU':
      finalInstruction += `\n\n${PURE_TELUGU_INSTRUCTION}`;
      break;
    case 'TELGLISH':
      finalInstruction += `\n\n${TELGLISH_INSTRUCTION}`;
      break;
    case 'ENGLISH':
      finalInstruction += `\n\n${ENGLISH_ONLY_INSTRUCTION}`;
      break;
    case 'HINDI':
      finalInstruction += `\n\n${HINDI_INSTRUCTION}`;
      break;
    case 'TAMIL':
      finalInstruction += `\n\n${TAMIL_INSTRUCTION}`;
      break;
    case 'KANNADA':
      finalInstruction += `\n\n${KANNADA_INSTRUCTION}`;
      break;
    case 'MARATHI':
      finalInstruction += `\n\n${MARATHI_INSTRUCTION}`;
      break;
    case 'HINGLISH':
      finalInstruction += `\n\n${HINGLISH_INSTRUCTION}`;
      break;
    case 'AUTO':
      finalInstruction += `\n\n${AUTO_LANGUAGE_INSTRUCTION}`;
      break;
    default: {
      // Handle dynamic language modes: NATIVE_XX, MIX_XX
      const { LANGUAGES, generateLanguageInstruction } = await import('../components/InitialGenerationState');
      const nativeMatch = languageMode.match(/^NATIVE_(.+)$/);
      const mixMatch = languageMode.match(/^MIX_(.+)$/);
      if (nativeMatch) {
        const code = nativeMatch[1].toLowerCase();
        const instruction = generateLanguageInstruction({ primaryCode: code, outputMode: 'NATIVE' });
        if (instruction) finalInstruction += `\n\n${instruction}`;
        else finalInstruction += `\n\n${AUTO_LANGUAGE_INSTRUCTION}`;
      } else if (mixMatch) {
        const code = mixMatch[1].toLowerCase();
        const instruction = generateLanguageInstruction({ primaryCode: code, outputMode: 'ROMANIZED_MIX' });
        if (instruction) finalInstruction += `\n\n${instruction}`;
        else finalInstruction += `\n\n${AUTO_LANGUAGE_INSTRUCTION}`;
      } else {
        finalInstruction += `\n\n${AUTO_LANGUAGE_INSTRUCTION}`;
      }
      break;
    }
  }

  if (autoAdjust) {
    finalInstruction += `\n\n${AUTO_ADJUST_INSTRUCTION}`;
  }

  if (smartCompression) {
    finalInstruction += `\n\n${SMART_COMPRESSION_INSTRUCTION}`;

    // SAFETY REINFORCEMENT: Ensure Compression doesn't override Language Mode
    if (languageMode === 'TELGLISH') {
      finalInstruction += `\n\nIMPORTANT: You must rewrite content in TELGLISH (Telugu Grammar + English Script). Do NOT translate to pure English.`;
    } else if (languageMode === 'PURE_TELUGU') {
      finalInstruction += `\n\nIMPORTANT: You must rewrite content in TELUGU SCRIPT. Do NOT translate to English.`;
    }
  }

    const formData = new FormData();
    formData.append('video', videoData, 'upload.webm');
    
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    // 1. Upload to node backend proxy to bypass inline data limits
    console.log("[GEMINI] Uploading video via backend proxy...");
    const uploadRes = await fetch(`${API_BASE}/api/upload-video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      throw new Error(err.error || 'Failed to upload video to backend proxy');
    }

    const { fileUri, fileName } = await uploadRes.json();
    console.log(`[GEMINI] Upload successful. URI: ${fileUri}`);

    // 2. Generate Content using the File API URI
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: {
          parts: [
            {
              fileData: {
                fileUri: fileUri,
                mimeType: mimeType
              }
            },
            { text: prompt }
          ]
        },
      config: {
        systemInstruction: finalInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              start: { type: Type.STRING },
              end: { type: Type.STRING },
              text: { type: Type.STRING },
              language: { type: Type.STRING, description: "Language code" },
              confidence: { type: Type.INTEGER, description: "Confidence score 0-100" },
              highlight_indices: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "Indices of key words to emphasize" },
              position: { type: Type.STRING, description: "Position: TOP, MIDDLE, BOTTOM" },
              sentiment: { type: Type.STRING },
              // Auto Adjust Fields
              custom_scale: { type: Type.NUMBER, description: "Font scale multiplier (1.0 = normal)" },
              custom_position: { type: Type.STRING, description: "AI suggested position (TOP/MIDDLE/BOTTOM)" },
              // Smart Color Fields
              word_categories: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of categories strictly matching the number of words in 'text'. Categories: neutral, emphasis, positive, negative, tech, action"
              },
              // Trending Fields
              secondary_text: { type: Type.STRING },
              primary_text: { type: Type.STRING },
              accent_text: { type: Type.STRING },
              // Word-level timestamps
              words: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    start: { type: Type.STRING },
                    end: { type: Type.STRING }
                  },
                  required: ["text", "start", "end"]
                },
                description: "Precise word-level timestamps"
              }
            },
            required: ["start", "end", "text", "language", "confidence"]
          }
        }
      }
    });

    const jsonText = response.text || "[]";
    let rawData;
    try {
      rawData = JSON.parse(jsonText);
    } catch (e) {
      console.error("JSON Parse Error", jsonText);
      rawData = [];
    }

    // 3. Cleanup Video from Google Storage
    fetch(`${API_BASE}/api/delete-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ fileName })
    }).catch(err => console.error("Cleanup failed", err));

    // Map AI response to internal Caption type
    const captions: Caption[] = rawData.map((item: any, index: number) => {
      // Map Categories to Hex Colors
      let wordColors: string[] = [];
      if (item.word_categories && Array.isArray(item.word_categories)) {
        wordColors = item.word_categories.map((cat: string) => COLOR_MAP[cat] || COLOR_MAP['neutral']);
      }

      // Always use deterministic splitting for TRENDING style to prevent AI errors
      let secondaryText = item.secondary_text;
      let primaryText = item.primary_text;
      let accentText = item.accent_text;

      if (captionStyle === CaptionStyle.VIRAL_SLAM) {
        const words = item.text.trim().split(/\s+/);
        if (words.length === 1) {
          secondaryText = "";
          primaryText = words[0];
          accentText = "";
        } else if (words.length === 2) {
          secondaryText = words[0];
          primaryText = words[1];
          accentText = "";
        } else if (words.length === 3) {
          secondaryText = words[0];
          primaryText = words[1];
          accentText = words[2];
        } else if (words.length >= 4) {
          // E.g., "malli idi endhuku antava" -> "malli", "idi endhuku", "antava"
          secondaryText = words[0];
          accentText = words[words.length - 1];
          primaryText = words.slice(1, words.length - 1).join(" ");
        }
      }

      let parsedWords = undefined;
      if (item.words && Array.isArray(item.words)) {
        parsedWords = item.words.map((w: any) => ({
          text: w.text,
          start: parseTime(w.start),
          end: parseTime(w.end)
        }));
      }

      return {
        id: index,
        start: parseTime(item.start),
        end: parseTime(item.end),
        text: item.text,
        secondaryText,
        primaryText,
        accentText,
        language: item.language || languageMode,
        confidence: item.confidence || 90,
        highlightIndices: item.highlight_indices || [],
        position: item.position || 'MIDDLE',
        sentiment: item.sentiment || 'neutral',
        wordColors,
        words: parsedWords || []
      };
    });


    // Calculate dominant language from AI results
    const languageCounts: Record<string, number> = {};
    captions.forEach(c => {
      const lang = c.language || 'en';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });

    const dominantLanguage = Object.keys(languageCounts).length > 0 
      ? Object.keys(languageCounts).reduce((a, b) => languageCounts[a] > languageCounts[b] ? a : b)
      : "en";

    // Format display name
    const langMap: Record<string, string> = {
      'en': 'English', 'hi': 'Hindi', 'te': 'Telugu', 'ta': 'Tamil',
      'kn': 'Kannada', 'mr': 'Marathi', 'ml': 'Malayalam', 'bn': 'Bengali',
      'gu': 'Gujarati', 'pa': 'Punjabi', 'or': 'Odia', 'as': 'Assamese',
      'ur': 'Urdu', 'ne': 'Nepali', 'si': 'Sinhala',
      'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean',
      'th': 'Thai', 'vi': 'Vietnamese', 'id': 'Indonesian', 'ms': 'Malay', 'fil': 'Filipino',
      'ar': 'Arabic', 'fa': 'Persian', 'tr': 'Turkish', 'he': 'Hebrew',
      'es': 'Spanish', 'fr': 'French', 'de': 'German', 'pt': 'Portuguese',
      'it': 'Italian', 'ru': 'Russian', 'pl': 'Polish', 'uk': 'Ukrainian',
      'nl': 'Dutch', 'sv': 'Swedish', 'da': 'Danish', 'no': 'Norwegian',
      'fi': 'Finnish', 'el': 'Greek', 'ro': 'Romanian', 'cs': 'Czech',
      'hu': 'Hungarian', 'bg': 'Bulgarian', 'hr': 'Croatian', 'sr': 'Serbian',
      'sw': 'Swahili', 'am': 'Amharic', 'ha': 'Hausa', 'yo': 'Yoruba',
      'af': 'Afrikaans', 'ka': 'Georgian', 'hy': 'Armenian',
      'hinglish': 'Hinglish', 'tanglish': 'Tanglish', 'telglish': 'Telglish',
    };

    return {
      captions,
      language: langMap[dominantLanguage.toLowerCase()] || dominantLanguage
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateViralHooks = async (captions: Caption[]): Promise<ViralHookResponse> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // Combine full transcript for context
  const transcript = captions.map(c => c.text).join(" ");

  const systemInstruction = `
      You are a Viral Marketing Expert for YouTube Shorts, Reels, and TikTok.
      Analyze the provided video transcript.
      Generate 5 highly clickable, curiosity-inducing THUMBNAIL TEXT hooks.
      
      RULES:
      1. Max 3-4 words per hook.
      2. Must be punchy, shocking, or create a knowledge gap.
      3. Examples: "Don't Do This", "Big Mistake ❌", "Secret Revealed", "I Was Wrong", "Money Hack 💰".
      4. Return ONLY a JSON object.
    `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: {
      parts: [{ text: `TRANSCRIPT: ${transcript}` }]
    },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hooks: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });

  const text = response.text || '{"hooks": []}';
  return JSON.parse(text) as ViralHookResponse;
};

export const generateSeoMetadata = async (captions: Caption[], platform: SocialPlatform): Promise<SeoResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const transcript = captions.map(c => c.text).join(" ").substring(0, 15000);

  let platformRules = "";

  switch (platform) {
    case 'YOUTUBE':
      platformRules = `
            - TITLE: Searchable + Curiosity. 50-60 chars.
            - DESCRIPTION: Detailed, structured, timestamps potential. 
            - KEYWORDS: Mix of high volume and niche long-tail.
            - HASHTAGS: Minimal (3-5), highly relevant.
            - ALGO: Optimize for CTR and Session Time.
            `;
      break;
    case 'SHORTS':
      platformRules = `
            - TITLE: Short, punchy, loop-focused.
            - DESCRIPTION: Very short. First sentence is the hook.
            - KEYWORDS: Trend-based.
            - HASHTAGS: #Shorts plus niche tags.
            - ALGO: Optimize for Retention and Looping.
            `;
      break;
    case 'INSTAGRAM':
      platformRules = `
            - TITLE: (Caption Headline) Aesthetic, hook-based.
            - DESCRIPTION: Conversational, "Read Caption" prompts, use line breaks.
            - HASHTAGS: Mix of Reach (High vol) and Niche (Specific). 15-20 tags.
            - ALGO: Optimize for Saves and Shares.
            `;
      break;
    case 'TIKTOK':
      platformRules = `
            - TITLE: (Video Overlay Text logic).
            - DESCRIPTION: Extremely short, slang-friendly, question for engagement.
            - KEYWORDS: Spoken natural language queries.
            - HASHTAGS: #FYP + Trending + Niche.
            - ALGO: Optimize for First 3s Hook and Completion Rate.
            `;
      break;
    case 'FACEBOOK':
      platformRules = `
            - TITLE: Storytelling headline.
            - DESCRIPTION: Longer form, emotional connection, storytelling.
            - KEYWORDS: Broad interest groups.
            - ALGO: Optimize for Shares and Comments.
            `;
      break;
  }

  const systemInstruction = `
        Act as a senior growth strategist and platform algorithm specialist.
        Analyze the transcript and generate SEO metadata.
        
        PLATFORM TARGET: ${platform}
        
        PLATFORM RULES:
        ${platformRules}

        OUTPUT REQUIREMENTS:
        - Return a strictly valid JSON object matching the schema.
        - Ensure tone matches the platform culture.
        - Avoid spammy behavior.
    `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: {
      parts: [{ text: `TRANSCRIPT: ${transcript}` }]
    },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          audienceTargeting: { type: Type.STRING },
          algorithmNotes: { type: Type.STRING }
        },
        required: ["title", "description", "keywords", "hashtags", "audienceTargeting", "algorithmNotes"]
      }
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text) as SeoResult;
}

export const generateInstagramDm = async (
  captions: Caption[],
  automationType: 'COMMENT' | 'STORY' | 'WELCOME',
  triggerType?: 'KEYWORDS' | 'AI_INTENT'
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const transcript = captions.map(c => c.text).join(" ").substring(0, 5000);

  let specificPrompt = "";

  if (automationType === 'COMMENT') {
    if (triggerType === 'KEYWORDS') {
      specificPrompt = `
      SCENARIO: Comment → DM (Keyword Trigger)
      CONTEXT: The user commented with a keyword like "link" or "price".
      TASK: Generate a friendly DM reply that acknowledges the comment and offers the info.
      `;
    } else {
      specificPrompt = `
       SCENARIO: Comment → DM (AI Intent Detection)
       CONTEXT: The user posted a comment showing interest or curiosity.
       TASK: Generate a short DM that naturally continues the conversation.
       `;
    }
  } else if (automationType === 'STORY') {
    specificPrompt = `
     SCENARIO: Story Reply → DM
     CONTEXT: The user replied to a story about this video topic.
     TASK: Generate a friendly follow-up DM that feels natural and welcoming.
     `;
  } else if (automationType === 'WELCOME') {
    specificPrompt = `
     SCENARIO: Welcome DM
     CONTEXT: A new follower just engaged with this content.
     TASK: Send a warm welcome DM. Keep it short, friendly, and non-salesy.
     `;
  }

  const systemInstruction = `
    Act as a friendly, human Instagram creator replying in DMs.
    Your job is to send short, natural, trust-building messages triggered by comments or interactions.
    
    TRANSCRIPT OF VIDEO: "${transcript}..."

    UNIVERSAL RULES:
    - Use simple, friendly language.
    - Be 1-2 lines only.
    - Avoid sales pressure.
    - Max 1-2 emojis.
    - Sound conversational, not professional.
    - NO hashtags.
    - Never mention "AI" or "Automation".
    
    ${specificPrompt}
    
    OUTPUT:
    Return ONLY the message text string. No quotes, no markdown, no JSON.
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: { parts: [{ text: "Generate the DM message." }] },
    config: {
      systemInstruction: systemInstruction,
    }
  });

  return response.text || "";
};

export const analyzeCommentIntent = async (comment: string, videoContext: string): Promise<{ intent: 'INTERESTED' | 'QUESTION' | 'SPAM' | 'NEUTRAL', confidence: number }> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
      Act as a Community Manager Bot.
      Analyze the incoming comment on an Instagram Post.
      Video Context: "${videoContext.substring(0, 500)}..."
      
      Classify the user intent into one of:
      - 'INTERESTED': Wants product, link, price, or more info.
      - 'QUESTION': Asking a specific question about content.
      - 'SPAM': Bot comments, self-promo, hate speech, or irrelevant.
      - 'NEUTRAL': Generic praise ("nice", "cool") or emojis only.

      Return JSON.
    `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: { parts: [{ text: `COMMENT: "${comment}"` }] },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: { type: Type.STRING, enum: ['INTERESTED', 'QUESTION', 'SPAM', 'NEUTRAL'] },
          confidence: { type: Type.INTEGER, description: "0-100" }
        }
      }
    }
  });

  const text = response.text || '{"intent": "NEUTRAL", "confidence": 0}';
  return JSON.parse(text);
};

// ─── CONTENT REMIX ENGINE ────────────────────────────────────────────────────
import type { RemixResult, ViralScore, ContentIdea, BrandKit } from '../types';

export const remixContentForPlatforms = async (
  captions: Caption[],
  brandKit?: BrandKit | null
): Promise<RemixResult> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const transcript = captions.map(c => c.text).join(' ').substring(0, 12000);

  const brandContext = brandKit
    ? `\nBRAND CONTEXT: Name="${brandKit.name}", Niche="${brandKit.niche}", Target Audience="${brandKit.audience}", Tone="${brandKit.tone}"${brandKit.ctaLink ? `, CTA Link="${brandKit.ctaLink}"` : ''}.`
    : '';

  const systemInstruction = `
You are an expert multi-platform content strategist. Convert a video transcript into platform-native content.
${brandContext}

PLATFORM RULES:
- INSTAGRAM: 2-3 punchy lines with hook + emojis + CTA (max 150 chars visible). End with 5 hashtags.
- TWITTER/X: 5-7 tweet thread. Start with a hook tweet. Each tweet max 280 chars. Numbered 1/, 2/, etc.
- LINKEDIN: Professional insight post. 3-4 paragraphs. Start with a bold insight. End with a question to drive comments.
- YOUTUBE: Full description with hook first sentence, summary, timestamps placeholder, and 5 keywords.
- BLOG: 150-word intro paragraph. Compelling, SEO-friendly opening that hooks the reader.

Ensure each piece is native to that platform's culture and format. Use the brand tone if provided.
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: { parts: [{ text: `VIDEO TRANSCRIPT:\n${transcript}` }] },
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          instagram: { type: Type.STRING },
          twitter:   { type: Type.STRING },
          linkedin:  { type: Type.STRING },
          youtube:   { type: Type.STRING },
          blog:      { type: Type.STRING },
        },
        required: ['instagram', 'twitter', 'linkedin', 'youtube', 'blog']
      }
    }
  });

  return JSON.parse(response.text || '{}') as RemixResult;
};

// ─── VIRAL AI COACH ──────────────────────────────────────────────────────────
export const analyzeViralPotential = async (
  captions: Caption[],
  brandKit?: BrandKit | null
): Promise<ViralScore> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const transcript = captions.map(c => c.text).join(' ').substring(0, 8000);

  const brandContext = brandKit
    ? `Target audience: ${brandKit.audience}. Niche: ${brandKit.niche}.`
    : 'General social media audience.';

  const systemInstruction = `
You are a viral content strategist for TikTok, YouTube Shorts, and Instagram Reels.
Analyze the video transcript and score it on 5 viral dimensions (0-100 each).

Context: ${brandContext}

SCORING CRITERIA:
- hook (0-100): How compelling are the first words? Does it create curiosity or stop the scroll?
- engagement (0-100): Does it invite likes, comments, saves, shares?
- emotion (0-100): Does it trigger a strong emotional response (laugh, surprise, inspiration, FOMO)?
- shareability (0-100): Would someone forward this to a friend?
- cta (0-100): Is there a clear call-to-action driving conversion?

Also provide:
- overallScore: weighted average (hook 30%, emotion 25%, engagement 20%, shareability 15%, cta 10%)
- suggestions: 3-4 specific, actionable improvements
- alternativeHooks: 5 alternative opening lines that would score higher
- verdict: 1 sentence overall summary verdict
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: { parts: [{ text: `TRANSCRIPT:\n${transcript}` }] },
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hook:             { type: Type.INTEGER },
          engagement:       { type: Type.INTEGER },
          emotion:          { type: Type.INTEGER },
          shareability:     { type: Type.INTEGER },
          cta:              { type: Type.INTEGER },
          overallScore:     { type: Type.INTEGER },
          suggestions:      { type: Type.ARRAY, items: { type: Type.STRING } },
          alternativeHooks: { type: Type.ARRAY, items: { type: Type.STRING } },
          verdict:          { type: Type.STRING },
        },
        required: ['hook','engagement','emotion','shareability','cta','overallScore','suggestions','alternativeHooks','verdict']
      }
    }
  });

  return JSON.parse(response.text || '{}') as ViralScore;
};

// ─── TREND & INSPIRATION FINDER ──────────────────────────────────────────────
export const generateContentIdeas = async (
  niche: string,
  brandKit?: BrandKit | null
): Promise<ContentIdea[]> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const audience = brandKit?.audience || 'General social media users';
  const tone = brandKit?.tone || 'EDUCATIONAL';

  const systemInstruction = `
You are a viral content strategist specializing in short-form video content ideas.
Generate exactly 10 high-potential video ideas for the niche: "${niche}".

Audience: ${audience}
Tone: ${tone}

For EACH idea:
- title: Clickbait-style title (max 8 words, punchy)
- hook: The exact first line to say on camera (1-2 sentences, scroll-stopper)
- outline: 3 bullet points describing the video structure
- hashtags: 5 relevant hashtags (include #)
- platform: Best platform — one of: YOUTUBE, SHORTS, INSTAGRAM, TIKTOK, FACEBOOK
- estimatedViralScore: Predicted viral potential 0-100

Sort by estimated viral score descending.
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: { parts: [{ text: `Generate 10 viral content ideas for niche: ${niche}` }] },
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title:               { type: Type.STRING },
            hook:                { type: Type.STRING },
            outline:             { type: Type.ARRAY, items: { type: Type.STRING } },
            hashtags:            { type: Type.ARRAY, items: { type: Type.STRING } },
            platform:            { type: Type.STRING },
            estimatedViralScore: { type: Type.INTEGER },
          },
          required: ['title','hook','outline','hashtags','platform','estimatedViralScore']
        }
      }
    }
  });

  return JSON.parse(response.text || '[]') as ContentIdea[];
};
