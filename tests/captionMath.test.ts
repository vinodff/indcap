import { describe, it, expect } from 'vitest';

// Pure position-math helpers extracted for testing.
// These mirror the calculations in captionRenderer.ts so we can verify
// them independently of the DOM/canvas environment.

function computeScaleFactor(canvasHeight: number, fontScale: number): number {
  return (canvasHeight / 1000) * fontScale;
}

const ASPECT_RATIOS: Record<string, number> = {
  '9:16': 9 / 16,
  '16:9': 16 / 9,
  '1:1': 1,
  '4:5': 4 / 5,
};

type AspectRatio = 'ORIGINAL' | '9:16' | '16:9' | '1:1' | '4:5';

function getVisibleArea(
  canvasWidth: number,
  canvasHeight: number,
  aspectRatio?: AspectRatio
): { x: number; y: number; w: number; h: number } {
  if (!aspectRatio || aspectRatio === 'ORIGINAL') {
    return { x: 0, y: 0, w: canvasWidth, h: canvasHeight };
  }
  const targetRatio = ASPECT_RATIOS[aspectRatio];
  if (!targetRatio) return { x: 0, y: 0, w: canvasWidth, h: canvasHeight };

  const sourceRatio = canvasWidth / canvasHeight;
  if (targetRatio < sourceRatio) {
    const visW = canvasHeight * targetRatio;
    return { x: (canvasWidth - visW) / 2, y: 0, w: visW, h: canvasHeight };
  } else if (targetRatio > sourceRatio) {
    const visH = canvasWidth / targetRatio;
    return { x: 0, y: (canvasHeight - visH) / 2, w: canvasWidth, h: visH };
  }
  return { x: 0, y: 0, w: canvasWidth, h: canvasHeight };
}

function computeAnchorY(
  vis: { y: number; h: number },
  customY: number | undefined,
  vPos: number
): number {
  return customY !== undefined ? vis.y + customY * vis.h : vis.y + vis.h * (vPos / 100);
}

function computeAnchorX(
  vis: { x: number; w: number },
  customX: number | undefined,
  hPos: number
): number {
  return customX !== undefined ? vis.x + customX * vis.w : vis.x + vis.w * (hPos / 100);
}

function computeExportDimensions(
  origWidth: number,
  origHeight: number,
  targetHeight: number
): { width: number; height: number } {
  if (origHeight === 0) return { width: origWidth, height: origHeight };
  const scale = targetHeight / origHeight;
  return { width: Math.round(origWidth * scale), height: targetHeight };
}

// ── scaleFactor ──────────────────────────────────────────────────────────────

describe('computeScaleFactor', () => {
  it('returns 1.0 for a 1000px canvas with default font scale', () => {
    expect(computeScaleFactor(1000, 1)).toBe(1);
  });

  it('doubles when canvas height doubles', () => {
    expect(computeScaleFactor(2000, 1)).toBe(2);
  });

  it('scales with fontScale', () => {
    expect(computeScaleFactor(1000, 1.5)).toBeCloseTo(1.5);
  });

  it('is proportionally smaller for 720p', () => {
    expect(computeScaleFactor(720, 1)).toBeCloseTo(0.72);
  });
});

// ── anchorY ──────────────────────────────────────────────────────────────────

describe('computeAnchorY', () => {
  const fullVis = { y: 0, h: 1080 };

  it('uses customY when provided', () => {
    expect(computeAnchorY(fullVis, 0.8, 85)).toBe(864);
  });

  it('falls back to vPos percentage', () => {
    expect(computeAnchorY(fullVis, undefined, 85)).toBeCloseTo(918);
  });

  it('places caption at top with vPos=0', () => {
    expect(computeAnchorY({ y: 0, h: 720 }, undefined, 0)).toBe(0);
  });

  it('places caption at bottom with vPos=100', () => {
    expect(computeAnchorY({ y: 0, h: 720 }, undefined, 100)).toBe(720);
  });

  it('offsets from visible area top when aspect ratio crops vertically', () => {
    const vis = getVisibleArea(1080, 1920, '16:9');
    expect(computeAnchorY(vis, undefined, 50)).toBeCloseTo(vis.y + vis.h / 2);
    expect(vis.y).toBeGreaterThan(0);
  });
});

// ── anchorX ──────────────────────────────────────────────────────────────────

describe('computeAnchorX', () => {
  const fullVis = { x: 0, w: 1920 };

  it('centers at 50%', () => {
    expect(computeAnchorX(fullVis, undefined, 50)).toBe(960);
  });

  it('uses customX when provided', () => {
    expect(computeAnchorX(fullVis, 0.25, 50)).toBe(480);
  });

  it('offsets from visible area left when aspect ratio crops horizontally', () => {
    const vis = getVisibleArea(1920, 1080, '9:16');
    expect(computeAnchorX(vis, undefined, 50)).toBeCloseTo(vis.x + vis.w / 2);
    expect(vis.x).toBeGreaterThan(0);
  });
});

// ── export canvas resize ─────────────────────────────────────────────────────

describe('computeExportDimensions', () => {
  it('scales 720p source to 1080p preserving aspect ratio', () => {
    const result = computeExportDimensions(1280, 720, 1080);
    expect(result.height).toBe(1080);
    expect(result.width).toBe(1920);
  });

  it('scales 1080p source to 4K', () => {
    const result = computeExportDimensions(1920, 1080, 2160);
    expect(result.height).toBe(2160);
    expect(result.width).toBe(3840);
  });

  it('scales vertical 9:16 correctly', () => {
    const result = computeExportDimensions(1080, 1920, 2160);
    expect(result.height).toBe(2160);
    expect(result.width).toBe(1215);
  });

  it('handles zero canvas height safely', () => {
    const result = computeExportDimensions(1280, 0, 1080);
    expect(result.height).toBe(0);
    expect(result.width).toBe(1280);
  });
});

// ── getVisibleArea (Phase 12: Aspect Ratio) ──────────────────────────────────

describe('getVisibleArea', () => {
  it('returns full canvas for ORIGINAL', () => {
    const vis = getVisibleArea(1920, 1080, 'ORIGINAL');
    expect(vis).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });

  it('returns full canvas when undefined', () => {
    const vis = getVisibleArea(1920, 1080, undefined);
    expect(vis).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });

  it('crops horizontally for 9:16 on a 16:9 source', () => {
    const vis = getVisibleArea(1920, 1080, '9:16');
    expect(vis.h).toBe(1080);
    expect(vis.w).toBeCloseTo(1080 * 9 / 16);
    expect(vis.x).toBeCloseTo((1920 - vis.w) / 2);
    expect(vis.y).toBe(0);
  });

  it('crops vertically for 16:9 on a 9:16 source', () => {
    const vis = getVisibleArea(1080, 1920, '16:9');
    expect(vis.w).toBe(1080);
    expect(vis.h).toBeCloseTo(1080 / (16 / 9));
    expect(vis.y).toBeCloseTo((1920 - vis.h) / 2);
    expect(vis.x).toBe(0);
  });

  it('crops to square for 1:1 on a 16:9 source', () => {
    const vis = getVisibleArea(1920, 1080, '1:1');
    expect(vis.w).toBeCloseTo(1080);
    expect(vis.h).toBe(1080);
    expect(vis.x).toBeCloseTo((1920 - 1080) / 2);
    expect(vis.y).toBe(0);
  });

  it('crops horizontally for 4:5 on a 16:9 source', () => {
    const vis = getVisibleArea(1920, 1080, '4:5');
    expect(vis.h).toBe(1080);
    expect(vis.w).toBeCloseTo(1080 * 4 / 5);
    expect(vis.x).toBeCloseTo((1920 - vis.w) / 2);
  });

  it('returns full canvas when source matches target ratio', () => {
    const vis = getVisibleArea(1920, 1080, '16:9');
    expect(vis).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });
});
