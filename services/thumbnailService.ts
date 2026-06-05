import {
  ThumbnailInput,
  ThumbnailOutput,
  ThumbnailTemplateId,
  ThumbnailGenerationStatus,
  AIPromptPackage,
  HyperImpactLines,
  AspectRatio,
} from '../types';
import { getTemplate } from '../constants/thumbnailTemplates';
import { renderHyperImpactThumbnail } from './hyperImpactRenderer';

const API_BASE = '/api/thumbnail/v2';
const HISTORY_BASE = '/api';

function getApiKey(): string {
  const key =
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_API_KEY ||
    localStorage.getItem('createrin_api_key');
  if (!key) throw new Error('API Key not found. Set it in the caption editor first.');
  return key;
}

export function analyzeImage(imageDataUrl: string): Promise<{
  expression: string;
  faceDirection: string;
  background: string;
  composition: string;
  detectedObjects: string[];
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const brightness = analyzeBrightness(ctx, canvas.width, canvas.height);
      const dominantColors = extractDominantColors(ctx, canvas.width, canvas.height);
      const hasFace = detectFacePresence(ctx, canvas.width, canvas.height);

      resolve({
        expression: brightness > 60 ? 'well-lit' : 'low-light',
        faceDirection: hasFace ? 'forward-facing' : 'no clear face detected',
        background: brightness > 60 ? 'bright background' : 'dark background',
        composition: 'centered main subject',
        detectedObjects: dominantColors,
      });
    };
    img.src = imageDataUrl;
  });
}

function analyzeBrightness(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  const imageData = ctx.getImageData(0, 0, Math.min(w, 100), Math.min(h, 100));
  let totalLuminance = 0;
  for (let i = 0; i < imageData.data.length; i += 4) {
    totalLuminance += 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
  }
  return totalLuminance / (imageData.data.length / 4);
}

function extractDominantColors(ctx: CanvasRenderingContext2D, w: number, h: number): string[] {
  const imageData = ctx.getImageData(0, 0, Math.min(w, 50), Math.min(h, 50));
  const colorBuckets: Record<string, number> = {};
  for (let i = 0; i < imageData.data.length; i += 16) {
    const r = Math.round(imageData.data[i] / 32) * 32;
    const g = Math.round(imageData.data[i + 1] / 32) * 32;
    const b = Math.round(imageData.data[i + 2] / 32) * 32;
    const key = `${r},${g},${b}`;
    colorBuckets[key] = (colorBuckets[key] || 0) + 1;
  }
  return Object.entries(colorBuckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => {
      const [r, g, b] = k.split(',').map(Number);
      return `rgb(${r},${g},${b})`;
    });
}

function detectFacePresence(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const centerX = Math.floor(w / 2);
  const centerY = Math.floor(h / 3);
  const faceRegion = ctx.getImageData(
    Math.max(0, centerX - 40),
    Math.max(0, centerY - 40),
    Math.min(80, w),
    Math.min(80, h)
  );
  let skinPixels = 0;
  for (let i = 0; i < faceRegion.data.length; i += 4) {
    const r = faceRegion.data[i];
    const g = faceRegion.data[i + 1];
    const b = faceRegion.data[i + 2];
    if (r > 60 && g > 30 && b > 20 && r > g && r > b) {
      skinPixels++;
    }
  }
  return skinPixels > 100;
}

export function buildPrompt(
  input: ThumbnailInput,
  analysis: {
    expression: string;
    faceDirection: string;
    background: string;
    composition: string;
    detectedObjects: string[];
  }
): AIPromptPackage {
  const template = getTemplate(input.templateId);
  const titleSafe = input.titleText.replace(/[<>"']/g, '').substring(0, 100);
  const hookSafe = input.hookText.replace(/[<>"']/g, '').substring(0, 60);

  // Step C — when Hyper-Impact Bold is selected, dynamically adjust the AI payload
  // to demand the exact 3-line structure (white hook / gradient keyword / white benefit).
  if (input.templateId === 'hyper-impact-bold' && input.hyperLines) {
    const clean = (s: string) => s.replace(/[<>"']/g, '').substring(0, 40).toUpperCase();
    const hl = {
      hook: clean(input.hyperLines.hook),
      keyword: clean(input.hyperLines.keyword),
      benefit: clean(input.hyperLines.benefit),
    };
    const hyperPrompt = [
      `Create a professional high-CTR "Hyper-Impact Bold" (Hormozi Gradient) thumbnail.`,
      template.promptInstructions,
      ``,
      `Subject image analysis:`,
      `- Expression: ${analysis.expression}`,
      `- Background: ${analysis.background}`,
      `- Composition: ${analysis.composition}`,
      ``,
      `Render the on-image text as THREE stacked ALL-CAPS lines in this exact order:`,
      `- Line 1 (hook, pure white, italic, thick black outline): "${hl.hook}"`,
      `- Line 2 (keyword, OVERSIZED, vibrant orange→yellow vertical gradient #F97316→#FDE047, glossy 3D, thick black stroke + drop shadow): "${hl.keyword}"`,
      `- Line 3 (benefit, pure white, italic, thick black outline): "${hl.benefit}"`,
      ``,
      `Heavy condensed sans-serif (Montserrat Black / Anton), tightly tracked, lower-middle placement.`,
      `Dark high-contrast background so the type pops. 16:9, 8K detail, masterpiece quality.`,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      fullPrompt: hyperPrompt,
      template: input.templateId,
      textOverlay: hl.keyword,
      positivePrompt: hyperPrompt,
      aspectRatio: input.aspectRatio || '16:9',
      hyperLines: hl,
    };
  }

  const fullPrompt = [
    `Create a professional high-CTR YouTube thumbnail.`,
    `Template style: ${template.name}. ${template.promptInstructions}`,
    ``,
    `Subject image analysis:`,
    `- Expression: ${analysis.expression}`,
    `- Face direction: ${analysis.faceDirection}`,
    `- Background: ${analysis.background}`,
    `- Composition: ${analysis.composition}`,
    ``,
    `Thumbnail text to include:`,
    titleSafe ? `- Title text: "${titleSafe}"` : '',
    hookSafe ? `- Hook text: "${hookSafe}" (make this the primary text overlay)` : '',
    ``,
    `Visual requirements:`,
    `- Aspect ratio: 16:9`,
    `- Resolution: 1280x720 minimum, 8K detail`,
    `- Color palette: ${template.colorPalette.join(', ')}`,
    `- Text position: ${template.textPosition} of frame`,
    `- Text style: ${template.textStyle}`,
    `- Background treatment: ${template.bgTreatment}`,
    `- Composition: ${template.composition}`,
    `- Niche: ${template.niche}`,
    ``,
    `Quality requirements:`,
    `- Photorealistic, hyper-detailed, sharp focus`,
    `- Professional lighting with key, fill, and rim lights`,
    `- High contrast, vibrant colors, HDR tone-mapping`,
    `- Text must be bold, readable at small sizes (150px wide)`,
    `- Text must have thick stroke/outline for visibility`,
    `- YouTube thumbnail optimized, clickbait composition`,
    `- No watermarks, no logos, no text in subject area`,
    `- Masterpiece quality, viral aesthetic, award-winning design`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    fullPrompt,
    template: input.templateId,
    textOverlay: hookSafe || titleSafe,
    positivePrompt: fullPrompt,
    aspectRatio: '16:9',
  };
}

export async function generateThumbnail(input: ThumbnailInput): Promise<ThumbnailOutput> {
  // ── Hyper-Impact Bold: deterministic client-side compositing ──────────────
  // The 3-line typography is drawn on a canvas (gradient + stroke + shadow) so the
  // text is pixel-exact rather than baked into an unreliable AI image. This is the
  // path that guarantees the "exact caption quality" the template promises.
  if (input.templateId === 'hyper-impact-bold') {
    const lines: HyperImpactLines = input.hyperLines ?? {
      hook: input.hookText || 'UNLOCK',
      keyword: input.titleText || 'CLAUDE',
      benefit: '',
    };
    const ar = (input.aspectRatio ?? '16:9') as AspectRatio;
    const imageDataUrl = await renderHyperImpactThumbnail(lines, input.imageDataUrl, {
      width: ar === '9:16' || ar === '4:5' ? 1080 : 1280,
      aspectRatio: ar === 'ORIGINAL' ? '16:9' : (ar as '16:9' | '9:16' | '1:1' | '4:5'),
    });
    const promptUsed = buildPrompt(input, await analyzeImage(input.imageDataUrl)).fullPrompt;
    const output: ThumbnailOutput = {
      imageDataUrl,
      promptUsed,
      templateId: input.templateId,
      createdAt: new Date().toISOString(),
    };
    // Persist to SQLite history (best-effort — never block the result on it).
    saveThumbnailHistory({
      hookText: [lines.hook, lines.keyword, lines.benefit].filter(Boolean).join(' '),
      template: 'hyper_impact_bold',
      imageUrl: null,
    }).catch(() => {});
    return output;
  }

  const analysis = await analyzeImage(input.imageDataUrl);
  const promptPackage = buildPrompt(input, analysis);

  const formData = new FormData();
  formData.append('image', dataUrlToBlob(input.imageDataUrl), 'subject.jpg');
  formData.append('prompt', JSON.stringify(promptPackage));
  if (input.aspectRatio) formData.append('aspectRatio', input.aspectRatio);

  let res;
  try {
    res = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getApiKey()}` },
      body: formData,
    });
  } catch (fetchErr) {
    throw new Error('Backend server is unreachable. Make sure the server is running on port 3001.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Generation failed' }));
    throw new Error(err.error || 'Thumbnail generation failed');
  }

  const data = await res.json();
  return {
    imageDataUrl: data.imageDataUrl,
    promptUsed: promptPackage.fullPrompt,
    templateId: input.templateId,
    createdAt: new Date().toISOString(),
  };
}

export async function generateVariations(
  input: ThumbnailInput,
  count: number = 3
): Promise<ThumbnailOutput[]> {
  const results: ThumbnailOutput[] = [];
  for (let i = 0; i < count; i++) {
    const result = await generateThumbnail(input);
    results.push(result);
  }
  return results;
}

export async function generateHooks(videoTopic: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/hooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({ videoTopic }),
  });
  if (!res.ok) throw new Error('Hook generation failed');
  const data = await res.json();
  return data.hooks || [];
}

/**
 * Step C — ask Gemini to structure a topic into the exact 3-line Hyper-Impact
 * Bold layout: { hook, keyword, benefit }, ALL CAPS.
 */
export async function generateHyperImpactLines(videoTopic: string): Promise<HyperImpactLines> {
  const res = await fetch(`${API_BASE}/hyper-lines`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({ videoTopic }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Line generation failed' }));
    throw new Error(err.error || 'Line generation failed');
  }
  const data = await res.json();
  if (!data.lines) throw new Error('No lines returned');
  return data.lines as HyperImpactLines;
}

/** Persist a generated thumbnail to SQLite history (POST /api/thumbnails). */
export async function saveThumbnailHistory(entry: {
  hookText: string;
  template: string;
  ctrScore?: number;
  imageUrl?: string | null;
}): Promise<{ id: number } | null> {
  try {
    const res = await fetch(`${HISTORY_BASE}/thumbnails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data ?? null;
  } catch {
    return null;
  }
}

/** Read back thumbnail history (GET /api/thumbnails). */
export async function getThumbnailHistory(): Promise<
  Array<{ id: number; hook_text: string; template: string; ctr_score: number; image_url: string | null; created_at: string }>
> {
  try {
    const res = await fetch(`${HISTORY_BASE}/thumbnails`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}

export function downloadThumbnail(dataUrl: string, filename: string = 'thumbnail.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function simulateGeneration(input: ThumbnailInput): Promise<ThumbnailOutput> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 1280, 720);

    const grd = ctx.createLinearGradient(0, 0, 1280, 720);
    const template = getTemplate(input.templateId);
    grd.addColorStop(0, template.colorPalette[0] || '#FFD700');
    grd.addColorStop(0.5, template.colorPalette[1] || '#FF0000');
    grd.addColorStop(1, template.colorPalette[2] || '#FFFFFF');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 1280, 720);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, 1280, 720);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (input.hookText) {
      ctx.font = 'bold 72px Inter, sans-serif';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;
      ctx.strokeText(input.hookText, 640, 480);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(input.hookText, 640, 480);
    }

    if (input.titleText) {
      ctx.font = '48px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(input.titleText, 640, 560);
    }

    ctx.font = '24px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`${template.name} — AI Generated`, 640, 660);

    const dataUrl = canvas.toDataURL('image/png');
    setTimeout(() => {
      resolve({
        imageDataUrl: dataUrl,
        promptUsed: `Simulated: ${template.name}`,
        templateId: input.templateId,
        createdAt: new Date().toISOString(),
      });
    }, 1500);
  });
}
