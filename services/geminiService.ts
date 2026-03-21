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
  base64Video: string,
  mimeType: string,
  autoAdjust: boolean,
  smartCompression: boolean,
  languageMode: LanguageMode = 'AUTO',
  captionStyle: CaptionStyle = CaptionStyle.DEFAULT
): Promise<{ captions: Caption[], language: string }> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  // The prompt is minimal because the heavy lifting is done in SYSTEM_INSTRUCTION
  const prompt = "Transcribe audio. Adhere strictly to the JSON schema.";

  // Combine base instruction with language mode
  let finalInstruction = SYSTEM_INSTRUCTION;

  if (captionStyle === CaptionStyle.TRENDING) {
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
    default:
      finalInstruction += `\n\n${AUTO_LANGUAGE_INSTRUCTION}`;
      break;
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

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Video
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

      if (captionStyle === CaptionStyle.TRENDING) {
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
        id: `cap-${index}`,
        startTime: parseTime(item.start),
        endTime: parseTime(item.end),
        text: item.text,
        language: item.language || 'en',
        confidence: item.confidence || 0,
        highlightIndices: item.highlight_indices,
        position: item.position || 'BOTTOM',
        sentiment: item.sentiment,
        customScale: item.custom_scale,
        customPosition: item.custom_position,
        wordColors: wordColors,
        secondaryText,
        primaryText,
        accentText,
        words: parsedWords
      };
    });

    // Calculate dominant language from AI results
    const languageCounts: Record<string, number> = {};
    captions.forEach(c => {
      const lang = c.language || 'en';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });

    const dominantLanguage = Object.keys(languageCounts).reduce((a, b) =>
      languageCounts[a] > languageCounts[b] ? a : b
      , "en");

    // Format display name
    const langMap: Record<string, string> = {
      'en': 'English',
      'hi': 'Hindi',
      'te': 'Telugu',
      'ta': 'Tamil',
      'hinglish': 'Hinglish',
      'tanglish': 'Tanglish'
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
