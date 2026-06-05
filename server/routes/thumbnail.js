/**
 * Createrin AI Thumbnail Generator v2 — Server Routes
 *
 * POST /api/thumbnail/v2/generate   — Generate thumbnail from image + prompt
 * POST /api/thumbnail/v2/hooks      — Auto-generate hook text from topic
 * POST /api/thumbnail/v2/analyze    — AI analysis of uploaded image
 */

import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are accepted'));
    }
  },
});

const PRASAD_TECH_INSTRUCTION = `You are a professional YouTube thumbnail designer creating ultra-realistic cinematic thumbnails.

Follow this EXACT template specification:

Template Name: "Prasad Tech in Telugu"
Style: Ultra-realistic cinematic YouTube thumbnail, vertical 9:16 portrait composition
Subject: Young Indian male tech reviewer in his late 20s with thick black wavy hair styled upward with volume, well-groomed full black beard and mustache, warm brown skin tone, expressive wide-open surprised eyes with raised eyebrows conveying excitement and urgency, slightly parted lips as if mid-sentence revealing exciting news

Attire: Oversized washed charcoal-grey crewneck t-shirt with small white chest logo, thin gold chain bracelet on left wrist

Pose: Both hands raised at chest level with fingers spread in an explanatory "look at this" gesture, palms facing inward, centered framing waist-up shot

Camera Specs: Shot on Sony A7IV with 50mm f/1.8 prime lens, eye-level camera angle, shallow depth of field with subject in sharp focus

Background Elements: Floating product showcase featuring premium tech gadgets arranged in dynamic scattered layout around the subject: large smart TV displaying cinematic content top-left, premium over-ear wireless headphones in matte black, ASUS gaming laptop with purple ROG screen mid-right, white split AC air conditioner unit top-right, silver Apple iPad with stylus on screen left side, true wireless earbuds case top-center, red price-tag badges scattered throughout with white text, products subtly motion-blurred to create floating energy

Background Design: Festive Indian celebration background with deep crimson red and burgundy gradient backdrop, golden marigold flower garlands draped at the top corners, hanging diya string lights and decorative bokeh dots creating warm ambient glow

Text Overlay: Top banner with bold Telugu typography in pure white sans-serif display font with thick black outline stroke and subtle drop shadow, slightly tilted dynamic angle, circular orange starburst badge top-left, rectangular blue tricolor badge top-right with Indian flag accent

Lighting: Cinematic three-point lighting setup with warm key light from front-left at 45 degrees, soft rim light separating subject from background, golden hour color temperature 3200K-3800K

Color Grade: Rich red and gold color grading with teal shadow accents, high contrast, vibrant saturation pushed to 115%, sharp clarity, HDR tone-mapping

Quality: Photorealistic, 8K resolution, hyper-detailed skin texture, sharp facial features, crisp product details, professional thumbnail design, viral YouTube aesthetic, clickbait composition, attention-grabbing visual hierarchy, trending Indian tech reviewer style, festive sale vibe, urgency and excitement, masterpiece quality, award-winning thumbnail design`;

function getClient(req) {
  const auth = req.headers.authorization || '';
  const apiKey = auth.startsWith('Bearer ')
    ? auth.split(' ')[1]
    : process.env.VITE_GEMINI_API_KEY || process.env.VITE_API_KEY;
  if (!apiKey) throw new Error('API key not provided');
  return new GoogleGenAI({ apiKey });
}

function sanitize(s) {
  return (s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[{}[\]]/g, '')
    .substring(0, 3000)
    .trim();
}

// ─── Server-side SVG thumbnail generator (fallback when AI fails) ───────

function generateSvgThumbnail(imgB64, imgMime, textOverlay, promptData, ar) {
  const dims = { '1:1': [800,800], '3:4': [600,800], '4:3': [800,600], '9:16': [450,800], '16:9': [800,450], 'ORIGINAL': [800,450] };
  const [w, h] = dims[ar] || [800, 450];

  const title = sanitize(textOverlay || promptData.textOverlay || 'AMAZING!');
  const hook = '';
  const templateName = sanitize(promptData.template || 'viral');

  // ── Hyper-Impact Bold (Hormozi Gradient) — dedicated 3-line gradient layout ──
  if (templateName === 'hyper-impact-bold' || templateName === 'hyper_impact_bold') {
    return generateHyperImpactSvg(imgB64, imgMime, promptData.hyperLines || {}, ar);
  }

  const templateStyles = {
    'mrbeast': { gradient: ['#FFD700','#FF4500'], textColor: '#FFFFFF', stroke: '#000000', shadow: 'rgba(0,0,0,0.7)' },
    'viral-reaction': { gradient: ['#FF1493','#4B0082'], textColor: '#FFFFFF', stroke: '#000000', shadow: 'rgba(0,0,0,0.6)' },
    'gaming': { gradient: ['#00FF87','#60EFFF'], textColor: '#FFFFFF', stroke: '#1A1A2E', shadow: 'rgba(0,0,0,0.5)' },
    'finance': { gradient: ['#0F9B0F','#006400'], textColor: '#FFD700', stroke: '#000000', shadow: 'rgba(0,0,0,0.6)' },
    'tech-review': { gradient: ['#1E90FF','#000080'], textColor: '#FFFFFF', stroke: '#000000', shadow: 'rgba(0,0,0,0.5)' },
    'documentary': { gradient: ['#2F2F2F','#1A1A1A'], textColor: '#E0E0E0', stroke: '#000000', shadow: 'rgba(0,0,0,0.5)' },
    'anime': { gradient: ['#FF69B4','#8A2BE2'], textColor: '#FFFFFF', stroke: '#1A1A2E', shadow: 'rgba(0,0,0,0.5)' },
    'dark-cinematic': { gradient: ['#0D0D0D','#1A1A2E'], textColor: '#FFFFFF', stroke: '#000000', shadow: 'rgba(0,0,0,0.7)' },
  };
  const style = templateStyles[templateName] || templateStyles['viral-reaction'];

  const fontSize = Math.max(32, Math.floor(w / 14));
  const hookSize = Math.max(24, Math.floor(w / 18));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${style.gradient[0]}" />
      <stop offset="100%" stop-color="${style.gradient[1]}" />
    </linearGradient>
    <clipPath id="imgClip"><rect x="0" y="0" width="${w}" height="${h}" rx="12" /></clipPath>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)" rx="12" />
  <image href="data:${imgMime};base64,${imgB64}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#imgClip)" opacity="0.4" />
  <rect width="${w}" height="${h}" fill="${style.shadow}" rx="12" />
  <text x="${w/2}" y="${h*0.4}" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="${fontSize}"
    fill="${style.textColor}" stroke="${style.stroke}" stroke-width="${Math.max(2, fontSize/30)}"
    paint-order="stroke">${escapeXml(title)}</text>
  ${hook ? `<text x="${w/2}" y="${h*0.65}" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="${hookSize}"
    fill="${style.textColor}" stroke="${style.stroke}" stroke-width="${Math.max(1.5, hookSize/35)}"
    paint-order="stroke">${escapeXml(hook)}</text>` : ''}
  <rect x="${w-140}" y="${h-40}" width="130" height="30" rx="6" fill="rgba(0,0,0,0.5)" />
  <text x="${w-75}" y="${h-25}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif"
    font-size="12" fill="rgba(255,255,255,0.6)">createrin.ai</text>
</svg>`;
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;','\'':'&apos;','"':'&quot;'})[c]);
}

// ─── Hyper-Impact Bold server-side SVG (3-line gradient layout) ─────────
// Mirrors components/HyperImpactPreview.tsx so the rasterized fallback matches
// the live client preview. Keyword line uses a vertical orange→yellow gradient
// with a heavy black stroke (paint-order: stroke) and drop shadow.

function generateHyperImpactSvg(imgB64, imgMime, lines, ar) {
  const dims = { '1:1': [800,800], '3:4': [600,800], '4:3': [800,600], '9:16': [450,800], '16:9': [800,450], 'ORIGINAL': [800,450] };
  const [w, h] = dims[ar] || [800, 450];

  const hook    = escapeXml(sanitize(lines.hook || 'UNLOCK').toUpperCase());
  const keyword = escapeXml(sanitize(lines.keyword || 'CLAUDE').toUpperCase());
  const benefit = escapeXml(sanitize(lines.benefit || '$200 PLAN FREE').toUpperCase());

  // Fit font sizes to width (rough heuristic — the client canvas renderer is exact).
  const widthFor = (text, base) => Math.min(base, Math.floor((w * 0.88) / (Math.max(text.length, 1) * 0.62)));
  const frameSize = widthFor(hook.length > benefit.length ? hook : benefit, Math.floor(w / 9));
  const keywordSize = widthFor(keyword, Math.floor(w / 3.2));

  const gap = h * 0.03;
  const total = frameSize + keywordSize + frameSize + gap * 2;
  let y = h * 0.92 - total; // lower-middle anchor
  const cx = w / 2;

  const yHook = (y += frameSize) - frameSize * 0.18;
  const yKeyword = (y += gap + keywordSize) - keywordSize * 0.2;
  const yBenefit = (y += gap + frameSize) - frameSize * 0.18;

  const skew = 'skewX(-7)';
  const frameStroke = Math.max(2, frameSize * 0.06);
  const keywordStroke = Math.max(3, keywordSize * 0.05);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="hiKeyword" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F97316" />
      <stop offset="50%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#FDE047" />
    </linearGradient>
    <linearGradient id="hiScrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.30)" />
      <stop offset="50%" stop-color="rgba(0,0,0,0.05)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.55)" />
    </linearGradient>
    <filter id="hiShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${Math.max(2, keywordSize*0.04)}" stdDeviation="${Math.max(2, keywordSize*0.03)}" flood-color="#000" flood-opacity="0.9" />
    </filter>
    <clipPath id="hiClip"><rect x="0" y="0" width="${w}" height="${h}" rx="12" /></clipPath>
  </defs>
  <rect width="${w}" height="${h}" fill="#08080a" rx="12" />
  ${imgB64 ? `<image href="data:${imgMime};base64,${imgB64}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#hiClip)" />` : ''}
  <rect width="${w}" height="${h}" fill="url(#hiScrim)" rx="12" />
  <g font-family="Anton, 'Arial Black', Impact, sans-serif" font-weight="900" text-anchor="middle" font-style="italic" paint-order="stroke" stroke-linejoin="round">
    <g transform="translate(${cx} ${yHook}) ${skew} translate(${-cx} ${-yHook})" filter="url(#hiShadow)">
      <text x="${cx}" y="${yHook}" font-size="${frameSize}" fill="#FFFFFF" stroke="#000" stroke-width="${frameStroke}">${hook}</text>
    </g>
    <g transform="translate(${cx} ${yKeyword}) ${skew} translate(${-cx} ${-yKeyword})" filter="url(#hiShadow)">
      <text x="${cx}" y="${yKeyword}" font-size="${keywordSize}" fill="url(#hiKeyword)" stroke="#000" stroke-width="${keywordStroke}">${keyword}</text>
    </g>
    <g transform="translate(${cx} ${yBenefit}) ${skew} translate(${-cx} ${-yBenefit})" filter="url(#hiShadow)">
      <text x="${cx}" y="${yBenefit}" font-size="${frameSize}" fill="#FFFFFF" stroke="#000" stroke-width="${frameStroke}">${benefit}</text>
    </g>
  </g>
</svg>`;
}

// ─── Generate thumbnail from image + text + template ────────────────────

router.post('/v2/generate', upload.single('image'), async (req, res) => {
  try {
    const promptData = req.body.prompt ? JSON.parse(req.body.prompt) : {};
    const templateOverride = req.body.template;
    const textOverlay = sanitize(promptData.textOverlay || req.body.text || '');
    const aspectRatio = req.body.aspectRatio || '16:9';
    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9', 'ORIGINAL'];
    const ar = validRatios.includes(aspectRatio) ? aspectRatio : '16:9';

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Image file is required' });
    }

    const { buffer, mimetype } = req.file;
    const b64 = buffer.toString('base64');
    const positivePrompt = sanitize(promptData.positivePrompt || promptData.fullPrompt || '');
    const fullPrompt = templateOverride === 'prasad-tech'
      ? `Using the uploaded subject photo as reference, generate a YouTube thumbnail following this exact specification:\n\n${PRASAD_TECH_INSTRUCTION}${textOverlay ? `\n\nText overlay to include: "${textOverlay}"` : ''}${positivePrompt ? `\n\nAdditional instructions: ${positivePrompt}` : ''}`
      : `You are a professional YouTube thumbnail designer. Using this uploaded image as the main subject reference, generate a highly creative, eye-catching YouTube thumbnail.\n\n${positivePrompt || 'Create a viral YouTube thumbnail with the subject from this image. Bold text overlay, vibrant colors, high contrast, dramatic lighting, 16:9 aspect ratio, optimized for maximum click-through rate.'}${textOverlay ? `\n\nInclude this text prominently: "${textOverlay}"` : ''}`;

    let resultDataUrl = null;

    // Try AI image generation (Imagen + Gemini)
    try {
      const ai = getClient(req);

      let imageDescription = 'A person in front of a background.';
      try {
        console.log('[Thumbnail v2] Analyzing image with Gemini 2.5 Flash...');
        const analysisRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ parts: [
            { inlineData: { mimeType, data: b64 } },
            { text: 'Describe this image in extreme detail for a thumbnail generation AI. Include: subject appearance, facial expression, clothing, pose, background, lighting, colors, camera angle, and any objects.' },
          ]}],
        });
        imageDescription = analysisRes.text || imageDescription;
        console.log('[Thumbnail v2] Image analyzed');
      } catch (analysisErr) {
        console.log('[Thumbnail v2] Analysis skipped:', analysisErr.message);
      }

      const aspectLabel = ar === 'ORIGINAL' ? '16:9' : ar;
      const genPrompt = `YouTube thumbnail (${aspectLabel}): ${imageDescription}\n\n${fullPrompt}`;

      for (const model of ['imagen-3.0-generate-001', 'imagen-4.0-generate-001']) {
        if (resultDataUrl) break;
        try {
          console.log(`[Thumbnail v2] Trying ${model}...`);
          const imgRes = await ai.models.generateImages({
            model, prompt: genPrompt,
            config: { numberOfImages: 1, aspectRatio: ar === 'ORIGINAL' ? '16:9' : ar },
          });
          const img = imgRes.generatedImages?.[0]?.image;
          if (img?.imageBytes) {
            resultDataUrl = `data:${img.mimeType || 'image/png'};base64,${img.imageBytes}`;
            console.log(`[Thumbnail v2] ${model} succeeded`);
          }
        } catch (e) { console.log(`[Thumbnail v2] ${model} failed:`, e.message); }
      }

      if (!resultDataUrl) {
        try {
          console.log('[Thumbnail v2] Trying Gemini image gen...');
          const geminiRes = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp-image-generation',
            contents: [{ parts: [{ text: genPrompt }] }],
            config: { responseModalities: ['IMAGE'] },
          });
          const parts = geminiRes.candidates?.[0]?.content?.parts || [];
          const imgPart = parts.find((p) => p.inlineData?.data);
          if (imgPart) {
            resultDataUrl = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
            console.log('[Thumbnail v2] Gemini image gen succeeded');
          } else {
            const textPart = parts.find((p) => p.text);
            console.log('[Thumbnail v2] Gemini returned text:', textPart?.text?.substring(0, 200) || 'empty');
          }
        } catch (e) { console.log('[Thumbnail v2] Gemini image gen failed:', e.message); }
      }
    } catch (aiErr) {
      console.log('[Thumbnail v2] AI init failed, using SVG fallback:', aiErr.message);
    }

    // Generate SVG thumbnail (always works, no AI needed)
    const svg = generateSvgThumbnail(b64, mimetype, textOverlay, promptData, ar);
    const svgB64 = Buffer.from(svg).toString('base64');

    return res.json({
      success: true,
      imageDataUrl: resultDataUrl || `data:image/svg+xml;base64,${svgB64}`,
      promptUsed: fullPrompt,
    });
  } catch (err) {
    console.error('[Thumbnail v2] Unexpected error:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Generation failed' });
  }
});

// ─── Debug: test SVG thumbnail generator (no auth needed) ──────────────

router.get('/v2/test', (req, res) => {
  const svg = generateSvgThumbnail('', 'image/jpeg', 'TEST THUMBNAIL', { textOverlay: 'TEST', template: 'mrbeast' }, '16:9');
  const b64 = Buffer.from(svg).toString('base64');
  res.json({ success: true, imageDataUrl: `data:image/svg+xml;base64,${b64}` });
});

// ─── Generate hooks from topic ─────────────────────────────────────────

router.post('/v2/hooks', async (req, res) => {
  try {
    const videoTopic = sanitize(req.body.videoTopic);
    if (!videoTopic) {
      return res.status(400).json({ success: false, error: 'videoTopic is required' });
    }

    const ai = getClient(req);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: `Generate hooks for this topic: ${videoTopic}` }] }],
      config: {
        systemInstruction:
          'You are a viral content strategist. Generate exactly 5 short, punchy thumbnail hook texts. Each hook must be under 5 words, highly clickable and curiosity-inducing. Return ONLY a JSON object with a "hooks" array containing string values.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            hooks: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['hooks'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"hooks":[]}');
    return res.json({ success: true, hooks: parsed.hooks || [] });
  } catch (err) {
    console.error('[Thumbnail v2] Hook generation error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Hyper-Impact Bold: 3-line structured text (Hormozi Gradient) ──────

router.post('/v2/hyper-lines', async (req, res) => {
  try {
    const videoTopic = sanitize(req.body.videoTopic);
    if (!videoTopic) {
      return res.status(400).json({ success: false, error: 'videoTopic is required' });
    }

    const ai = getClient(req);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: `Video / offer topic: ${videoTopic}` }] }],
      config: {
        // Step C — instruct the model to split copy into the exact 3-line layout
        // the "Hyper-Impact Bold" template renders.
        systemInstruction: `You write text for "Hyper-Impact Bold" (Hormozi Gradient) thumbnails.
The thumbnail stacks EXACTLY three ALL-CAPS lines:
  • Line 1 (hook): a punchy action verb / curiosity hook — rendered WHITE + italic.
  • Line 2 (keyword): the single core subject / keyword — rendered as a vibrant ORANGE→YELLOW gradient hero. This is the oversized focal word.
  • Line 3 (benefit): the high-value benefit / outcome — rendered WHITE + italic.

Rules:
- Each line is 1–3 words. Line 2 (keyword) is ideally a SINGLE word or a tight 2-word phrase — it must be short because it is the largest.
- ALL CAPS. No emojis. No trailing punctuation except a leading $ for money values.
- The three lines must read as one cohesive, high-impact message top-to-bottom.
- Make it concrete and desirable (money, speed, access, transformation).
Return ONLY valid JSON: { "hook": string, "keyword": string, "benefit": string }.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            hook: { type: 'STRING' },
            keyword: { type: 'STRING' },
            benefit: { type: 'STRING' },
          },
          required: ['hook', 'keyword', 'benefit'],
        },
      },
    });

    const parsed = JSON.parse(response.text || 'null');
    if (!parsed || !parsed.keyword) {
      return res.status(502).json({ success: false, error: 'Model returned no usable lines' });
    }
    // Normalize to ALL CAPS so the client preview/render is consistent.
    const upper = (s) => String(s || '').toUpperCase().trim();
    return res.json({
      success: true,
      lines: { hook: upper(parsed.hook), keyword: upper(parsed.keyword), benefit: upper(parsed.benefit) },
    });
  } catch (err) {
    console.error('[Thumbnail v2] Hyper-lines error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── AI analysis of uploaded image ─────────────────────────────────────

router.post('/v2/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Image file is required' });
    }

    const { buffer, mimetype } = req.file;
    const b64 = buffer.toString('base64');
    const ai = getClient(req);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: b64 } },
            {
              text: 'Analyze this image for use as a YouTube thumbnail subject.',
            },
          ],
        },
      ],
      config: {
        systemInstruction: `Analyze the uploaded image and return a JSON analysis object with these fields:
- expression: describe the facial expression (e.g., "shocked with raised eyebrows", "smiling confidently", "serious focused")
- faceDirection: where the subject is looking relative to camera ("forward", "slightly left", "slightly right", "profile")
- background: describe the background ("solid dark", "room with bookshelf", "outdoor daylight")
- composition: describe the framing ("head and shoulders close-up", "waist-up shot", "full body")
- detectedObjects: array of prominent objects detected (e.g., ["smartphone", "laptop", "headphones"])
- lightingQuality: "good" | "low" | "harsh"
- recommendedTemplate: suggest the best template from: mrbeast, gaming, finance, tech-review, documentary, anime, dark-cinematic, viral-reaction
- enhancementNotes: array of suggestions to improve the image for thumbnail use

Return ONLY valid JSON.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            expression: { type: 'STRING' },
            faceDirection: { type: 'STRING' },
            background: { type: 'STRING' },
            composition: { type: 'STRING' },
            detectedObjects: { type: 'ARRAY', items: { type: 'STRING' } },
            lightingQuality: { type: 'STRING' },
            recommendedTemplate: { type: 'STRING' },
            enhancementNotes: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['expression', 'faceDirection', 'background', 'composition', 'detectedObjects', 'lightingQuality', 'recommendedTemplate', 'enhancementNotes'],
        },
      },
    });

    const parsed = JSON.parse(response.text || 'null');
    return res.json({ success: true, analysis: parsed });
  } catch (err) {
    console.error('[Thumbnail v2] Analyze error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Legacy: title+hooks co-generation ─────────────────────────────────

router.post('/generate-title-hooks', async (req, res) => {
  try {
    const videoTitle = sanitize(req.body.videoTitle);
    if (!videoTitle) return res.status(400).json({ success: false, error: 'videoTitle is required' });

    const ai = getClient(req);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: `Original title: ${videoTitle}` }] }],
      config: {
        systemInstruction: `You are a YouTube growth expert. Given a video title, generate 5 optimized title+hook pairs.
Each pair has: an optimizedTitle (compelling rewrite ≤60 chars), a hookText (thumbnail overlay text ≤5 words, ALL CAPS), and a curiosityType (one of: "shock","question","promise","secret","warning").
The hookText and optimizedTitle must work together to create a curiosity gap.
Return ONLY valid JSON matching the schema.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            pairs: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  optimizedTitle: { type: 'STRING' },
                  hookText: { type: 'STRING' },
                  curiosityType: { type: 'STRING' },
                },
                required: ['optimizedTitle', 'hookText', 'curiosityType'],
              },
            },
          },
          required: ['pairs'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"pairs":[]}');
    return res.json({ success: true, pairs: parsed.pairs || [] });
  } catch (err) {
    console.error('[Thumbnail] Title-hook error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Legacy: frame scoring ─────────────────────────────────────────────

router.post('/score-frames', async (req, res) => {
  try {
    const { frames } = req.body;
    if (!Array.isArray(frames) || frames.length === 0) {
      return res.status(400).json({ success: false, error: 'frames array is required' });
    }
    if (frames.length > 12) {
      return res.status(400).json({ success: false, error: 'Max 12 frames per request' });
    }

    const ai = getClient(req);
    const scoreFrame = async (frame) => {
      const { dataUrl, index } = frame;
      if (!dataUrl?.startsWith('data:image/')) {
        return { index, score: null, error: 'Invalid frame data' };
      }
      const [header, b64] = dataUrl.split(',');
      const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              parts: [
                { inlineData: { mimeType, data: b64 } },
                { text: 'You are a YouTube thumbnail expert. Score this video frame as a thumbnail base.' },
              ],
            },
          ],
          config: {
            systemInstruction: `Score this frame on 4 dimensions (0-10 each):
- expressiveness: strong facial emotion or dramatic body language
- visualClarity: main subject immediately obvious, low clutter
- contrast: subject stands out from background
- composition: room for text overlay, good framing
Compute totalScore = (expressiveness*0.3 + visualClarity*0.3 + contrast*0.2 + composition*0.2).
Return ONLY valid JSON.`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                expressiveness: { type: 'NUMBER' },
                visualClarity: { type: 'NUMBER' },
                contrast: { type: 'NUMBER' },
                composition: { type: 'NUMBER' },
                totalScore: { type: 'NUMBER' },
                verdict: { type: 'STRING' },
              },
              required: ['expressiveness', 'visualClarity', 'contrast', 'composition', 'totalScore', 'verdict'],
            },
          },
        });
        const score = JSON.parse(response.text || 'null');
        return { index, score };
      } catch (err) {
        return { index, score: null, error: err.message };
      }
    };

    const results = [];
    for (let i = 0; i < frames.length; i += 3) {
      const batch = frames.slice(i, i + 3);
      const batchResults = await Promise.all(batch.map(scoreFrame));
      results.push(...batchResults);
    }

    return res.json({ success: true, results });
  } catch (err) {
    console.error('[Thumbnail] Frame scoring error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
