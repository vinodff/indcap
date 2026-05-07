import express from 'express';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();

// Helper to build FAL prompts based on selected template
const buildThumbnailPrompt = (templateId, hookText) => {
  const basePrompt = `A high-quality YouTube thumbnail. Bold, engaging, highly attractive.`;
  const textPrompt = hookText ? ` Featuring the bold 3D text: "${hookText}".` : '';
  
  switch (templateId) {
    case 'beast-mode':
    case 'mr-beast-style':
      return `${basePrompt} MrBeast style thumbnail, hyper-energetic, high contrast, extremely saturated colors, glowing edges, dramatic lighting, wide-angle lens effect, expressive facial expressions.${textPrompt}`;
    case 'hormozi-clean':
      return `${basePrompt} Alex Hormozi style, clean minimal background, professional lighting, centered subject, highly legible bold yellow and white text, business podcast vibe.${textPrompt}`;
    case 'vlog-cinematic':
      return `${basePrompt} Cinematic vlog style, depth of field, natural beautiful lighting, authentic lifestyle moment, slight color grading, aesthetic film look.${textPrompt}`;
    case 'viral-meme':
      return `${basePrompt} Viral meme style, funny, relatable, high internet culture aesthetic, chaotic but readable, dramatic zoom.${textPrompt}`;
    default:
      return `${basePrompt} Highly clickable, bright and colorful, optimized for high click-through rate.${textPrompt}`;
  }
};

router.post('/generate-hook', async (req, res) => {
  try {
    console.log('[Thumbnail] Generating hooks...');
    const { videoTopic } = req.body;
    
    // Support passing key in auth header like other routes
    const authHeader = req.headers.authorization;
    const apiKey = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.split(' ')[1] 
      : (process.env.VITE_GEMINI_API_KEY || process.env.VITE_API_KEY);

    if (!apiKey) {
      return res.status(401).json({ success: false, error: 'API key not provided' });
    }

    if (!videoTopic) {
      return res.status(400).json({ success: false, error: 'videoTopic is required' });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const systemInstruction = `
      You are a viral content strategist. 
      Generate exactly 3 short, punchy thumbnail hooks based on this topic: "${videoTopic}".
      Return ONLY a JSON object with a "hooks" array containing string values.
      Keep hooks under 5 words each, highly clickable and curiosity-inducing.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: "Generate the hooks." }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            hooks: { type: "ARRAY", items: { type: "STRING" } }
          },
          required: ["hooks"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{"hooks": []}');
    return res.json({ success: true, hooks: parsed.hooks || [] });

  } catch (error) {
    console.error('[Thumbnail] Hook generation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    console.log('[Thumbnail] Generating thumbnail image...');
    const { frameBase64, templateId, hookText } = req.body;
    
    // Check for FAL API Key
    const falApiKey = process.env.VITE_FAL_API_KEY || process.env.FAL_API_KEY || process.env.FAL_KEY;
    
    if (!falApiKey) {
      return res.status(500).json({ success: false, error: 'FAL_API_KEY backend environment variable is missing.' });
    }

    if (!frameBase64) {
      return res.status(400).json({ success: false, error: 'frameBase64 is required for img2img reference.' });
    }

    const prompt = buildThumbnailPrompt(templateId, hookText);
    
    // Fal.ai Flux Schnell Img2Img endpoint
    // Using simple native fetch to fal api
    console.log('[Thumbnail] Hitting FAL Img2img API...');
    const falRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        image_url: frameBase64,
        image_size: 'landscape_16_9',
        num_inference_steps: 4,
        strength: 0.85 // how much to respect the original image structure
      })
    });

    if (!falRes.ok) {
      const errText = await falRes.text();
      console.error('[Thumbnail] FAL API returned an error:', errText);
      return res.status(falRes.status).json({ success: false, error: 'FAL API Error: ' + errText });
    }

    const falData = await falRes.json();
    
    if (!falData.images || !falData.images.length) {
      throw new Error("No images returned from FAL");
    }

    const resultImageUrl = falData.images[0].url;
    console.log('[Thumbnail] Generation complete. Image URL:', resultImageUrl);
    
    return res.json({
      success: true,
      imageUrl: resultImageUrl
    });

  } catch (error) {
    console.error('[Thumbnail] Image generation error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Image generation failed' });
  }
});

export default router;
