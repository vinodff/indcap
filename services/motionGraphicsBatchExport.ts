/**
 * Per-beat export — renders each beat as its own short video clip and bundles
 * the lot into a single ZIP download with `manifest.json` + `manifest.md`.
 *
 * Each beat is rendered ON ITS OWN offscreen canvas with only that beat
 * active in the RendererState, so the output is the isolated motion graphic.
 * No source video, no other beats — that makes the clips usable as drop-in
 * overlays in any video editor.
 *
 * Real-time recording, same as the single-clip exporter. A plan with 12 beats
 * × 2s each = ~24s of recording time. We surface per-beat + overall progress
 * so the user knows it's working.
 */

import JSZip from 'jszip';
import type { MotionBeat, MotionPlan, AspectRatio } from './motionGraphicsService';
import { PRIMITIVE_LABELS } from './motionGraphicsService';
import { ASPECTS } from './motionGraphicsService';
import { createMotionRendererState, renderMotion } from './motionGraphicsRenderer';
import { pickSupportedMime, pickPrimaryPrimitive } from './motionGraphicsExport';

export interface BatchExportOptions {
  plan: MotionPlan;
  aspect: AspectRatio;
  fps: number;
  videoBitsPerSecond?: number;
  /** Called between beats with overall progress 0..1. */
  onProgress?: (info: { overall: number; current: number; beatIndex: number; beatCount: number; beatLabel: string }) => void;
  signal?: AbortSignal;
}

export interface BatchExportResult {
  blob: Blob;
  filename: string;
  beatCount: number;
}

const pad2 = (n: number): string => n.toString().padStart(2, '0');

const timestamp = (): string => {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
};

const safeSlug = (s: string): string =>
  (s || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const fmtTime = (s: number): string => {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(2).padStart(5, '0')}`;
};

/** Render a single beat to an offscreen canvas and record it via MediaRecorder. */
const recordOneBeat = async (
  beat: MotionBeat,
  aspect: AspectRatio,
  fps: number,
  videoBitsPerSecond: number,
  mimeType: string,
  signal?: AbortSignal,
  onProgress?: (t01: number) => void,
): Promise<{ blob: Blob }> => {
  const { width, height } = ASPECTS[aspect];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable on offscreen canvas');

  // Local state with only this beat — rebased to start at 0.
  const localBeat: MotionBeat = {
    ...beat,
    startTime: 0,
    endTime: Math.max(0.2, beat.endTime - beat.startTime),
  };
  const state = createMotionRendererState([localBeat]);
  const durationSec = localBeat.endTime;

  if (typeof (canvas as HTMLCanvasElement & { captureStream?: unknown }).captureStream !== 'function') {
    throw new Error('Canvas.captureStream is not supported in this browser.');
  }
  const stream = (canvas as HTMLCanvasElement & {
    captureStream: (fr?: number) => MediaStream;
  }).captureStream(fps);
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond } : { videoBitsPerSecond });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  let settled = false;
  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      if (settled) return;
      settled = true;
      resolve(new Blob(chunks, { type: mimeType || 'video/webm' }));
    };
    recorder.onerror = (e) => {
      if (settled) return;
      settled = true;
      reject((e as ErrorEvent).error || new Error('MediaRecorder error'));
    };
  });

  // Paint the first frame BEFORE starting the recorder so the clip never
  // begins with a blank/garbage frame.
  const paintFrame = (t: number) => {
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, '#0f172a');
    g.addColorStop(1, '#050505');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    renderMotion(state, ctx, width, height, t);
  };
  paintFrame(0);
  // Wait one rAF so the canvas paint is captured before MediaRecorder starts.
  await new Promise<void>((r) => requestAnimationFrame(() => r()));

  recorder.start();

  // Frame-counted time keeps render + recording in lockstep even when rAF stalls.
  let frame = 0;
  const totalFrames = Math.ceil(durationSec * fps);
  return new Promise<{ blob: Blob }>((resolve, reject) => {
    const tick = () => {
      if (signal?.aborted) {
        try { recorder.stop(); } catch (e) { void e; }
        if (!settled) {
          settled = true;
          reject(new Error('Batch export aborted.'));
        }
        return;
      }
      const t = frame / fps;
      onProgress?.(Math.max(0, Math.min(1, t / durationSec)));
      paintFrame(t);
      frame++;
      if (frame >= totalFrames) {
        try { recorder.stop(); } catch (e) { void e; }
        stopped.then((blob) => resolve({ blob }), reject);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
};

const buildManifestJson = (plan: MotionPlan, aspect: AspectRatio, files: { beatId: string; filename: string }[]) => {
  return {
    createrinVersion: '0.0.0',
    exportedAt: new Date().toISOString(),
    aspect,
    aspectDimensions: ASPECTS[aspect],
    topicSlug: plan.topicSlug,
    suggestedPalette: plan.suggestedPalette,
    duration: plan.duration,
    beatCount: plan.beats.length,
    beats: plan.beats.map((b) => {
      const f = files.find((x) => x.beatId === b.id);
      return {
        id: b.id,
        filename: f?.filename ?? null,
        primitive: b.primitive,
        startTime: b.startTime,
        endTime: b.endTime,
        params: b.params,
        rationale: b.rationale ?? null,
      };
    }),
  };
};

const buildManifestMd = (plan: MotionPlan, aspect: AspectRatio, files: { beatId: string; filename: string }[]): string => {
  const rows = plan.beats
    .map((b, i) => {
      const f = files.find((x) => x.beatId === b.id);
      return `| ${i + 1} | ${fmtTime(b.startTime)} → ${fmtTime(b.endTime)} | \`${b.primitive}\` (${PRIMITIVE_LABELS[b.primitive]}) | ${(b.params.text || '').replace(/\|/g, '\\|') || '—'} | ${(b.rationale || '').replace(/\|/g, '\\|') || '—'} | ${f?.filename || '—'} |`;
    })
    .join('\n');
  return `# Motion Graphics — ${plan.topicSlug}

**Exported:** ${new Date().toLocaleString()}
**Aspect:** ${aspect} (${ASPECTS[aspect].width}×${ASPECTS[aspect].height})
**Duration:** ${plan.duration.toFixed(1)}s
**Palette:** ${plan.suggestedPalette}
**Beats:** ${plan.beats.length}

## Timeline

| # | Time | Primitive | Text | Rationale | File |
|---|------|-----------|------|-----------|------|
${rows}

## Notes
- Each clip is the **isolated motion graphic only** (no source video). Drop them onto your video editor's timeline as overlay tracks at the times listed above.
- Backgrounds are a dark gradient so the motion graphic reads cleanly. If you need transparent clips, re-export with a future "Transparent background" toggle once that ships.
- \`manifest.json\` is machine-readable and can be re-imported later.
`;
};

export const exportEachBeat = async (opts: BatchExportOptions): Promise<BatchExportResult> => {
  const { plan, aspect, fps, videoBitsPerSecond = 6_000_000, onProgress, signal } = opts;
  if (plan.beats.length === 0) throw new Error('Plan has no beats to export.');

  const { mimeType, extension } = pickSupportedMime();
  const zip = new JSZip();
  const filesFolder = zip.folder('clips');
  if (!filesFolder) throw new Error('Failed to create ZIP folder');

  const filesForManifest: { beatId: string; filename: string }[] = [];
  const totalDuration = plan.beats.reduce((s, b) => s + Math.max(0.2, b.endTime - b.startTime), 0);
  let elapsed = 0;

  for (let i = 0; i < plan.beats.length; i++) {
    if (signal?.aborted) throw new Error('Batch export aborted.');
    const beat = plan.beats[i];
    const beatDur = Math.max(0.2, beat.endTime - beat.startTime);
    const slugBit = safeSlug((beat.params.text || beat.primitive).slice(0, 24));
    const filename = `${pad2(i + 1)}-${beat.primitive}${slugBit ? '-' + slugBit : ''}.${extension}`;
    const label = `${i + 1}/${plan.beats.length} · ${PRIMITIVE_LABELS[beat.primitive]}`;

    const { blob } = await recordOneBeat(beat, aspect, fps, videoBitsPerSecond, mimeType, signal, (t01) => {
      onProgress?.({
        overall: (elapsed + t01 * beatDur) / totalDuration,
        current: t01,
        beatIndex: i,
        beatCount: plan.beats.length,
        beatLabel: label,
      });
    });
    elapsed += beatDur;
    filesFolder.file(filename, blob);
    filesForManifest.push({ beatId: beat.id, filename: `clips/${filename}` });
  }

  // Manifests at the ZIP root
  const manifestJson = buildManifestJson(plan, aspect, filesForManifest);
  zip.file('manifest.json', JSON.stringify(manifestJson, null, 2));
  zip.file('manifest.md', buildManifestMd(plan, aspect, filesForManifest));

  const primary = pickPrimaryPrimitive(plan.beats);
  const zipName = `motion-graphics-${safeSlug(plan.topicSlug)}-${primary}-${timestamp()}.zip`;

  // STORE (no compression) for video clips — they're already mp4/webm
  // compressed, so DEFLATE wastes CPU for ~0% size savings. JSZip per-file
  // compression isn't directly exposed across the public API as a per-file
  // override in older versions; bypass by passing STORE at generate time.
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  return { blob, filename: zipName, beatCount: plan.beats.length };
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};
