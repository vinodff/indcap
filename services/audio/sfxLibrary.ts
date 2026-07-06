// SFX Library — typed accessor over the generated sfxManifest.json.
// The manifest is produced by scripts/build-sfx-manifest.mjs (re-run after
// adding files). This module gives the sound-design agents a clean API:
//   pickAsset(category, seed)  — deterministic asset choice per category
//   getAsset(id)               — lookup by id
//
// Categories map to the three-stage sound-design model (see the build script).

import manifestJson from './sfxManifest.json';

export type SfxCategory =
  | 'WHOOSH' | 'HIT' | 'RISER'
  | 'CLICK' | 'KEYBOARD' | 'WRITING' | 'DATA' | 'POP' | 'CAMERA'
  | 'NOTIFY' | 'CASH' | 'APPLAUSE' | 'CLOCK' | 'MEME' | 'MUSIC' | 'AMBIENT'
  | 'OTHER';

export interface SfxAsset {
  id: string;
  name: string;
  url: string;
  category: SfxCategory;
  ext: string;
}

interface SfxManifest {
  generatedAt: string;
  baseDir: string;
  count: number;
  countsByCategory: Record<string, number>;
  assets: SfxAsset[];
}

const manifest = manifestJson as SfxManifest;

export const SFX_ASSETS: SfxAsset[] = manifest.assets;
export const SFX_COUNT = manifest.count;

const BY_ID = new Map<string, SfxAsset>(SFX_ASSETS.map((a) => [a.id, a]));
const BY_CATEGORY = new Map<SfxCategory, SfxAsset[]>();
for (const a of SFX_ASSETS) {
  const list = BY_CATEGORY.get(a.category) ?? [];
  list.push(a);
  BY_CATEGORY.set(a.category, list);
}

export function getAsset(id: string): SfxAsset | undefined {
  return BY_ID.get(id);
}

export function assetsIn(category: SfxCategory): SfxAsset[] {
  return BY_CATEGORY.get(category) ?? [];
}

export function hasCategory(category: SfxCategory): boolean {
  return (BY_CATEGORY.get(category)?.length ?? 0) > 0;
}

/**
 * Deterministically pick one asset from a category. `seed` (e.g. a cue index or
 * caption start time * 1000) makes the choice stable across re-runs, so
 * regenerating the sound design doesn't reshuffle every sound. Falls back
 * through a sensible chain when a category is empty.
 */
export function pickAsset(category: SfxCategory, seed = 0): SfxAsset | undefined {
  const fallbacks: Record<string, SfxCategory[]> = {
    KEYBOARD: ['KEYBOARD', 'WRITING', 'CLICK'],
    WRITING: ['WRITING', 'CLICK'],
    POP: ['POP', 'CLICK'],
    CAMERA: ['CAMERA', 'CLICK'],
    RISER: ['RISER', 'DATA'],
    HIT: ['HIT', 'POP'],
    WHOOSH: ['WHOOSH'],
  };
  const chain = fallbacks[category] ?? [category];
  for (const cat of chain) {
    const list = BY_CATEGORY.get(cat);
    if (list && list.length) {
      const idx = Math.abs(Math.floor(seed)) % list.length;
      return list[idx];
    }
  }
  return undefined;
}
