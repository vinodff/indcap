// Curated SFX Palette — the "taste" layer that turns a flat 223-file library
// into a hand-picked, consistent signature kit the way a senior editor works.
//
// Why this exists: the old pipeline called pickAsset(category, seed) which chose
// an ARBITRARY file from the whole category on every cue. That meant (a) a junk
// asset ("Microsoft Windows XP Error" lives in WHOOSH, "Access Denied" in DATA)
// could fire as a transition, and (b) the same kind of moment got a DIFFERENT
// sound every time — which reads as random, amateur noise.
//
// A real editor does the opposite: they pick ONE good whoosh, ONE punchy hit,
// ONE pop, and reuse that palette across the whole video so it feels designed.
// This module:
//   1. SCORES every asset for quality per role (preferred keywords up, junk down)
//   2. picks a VIBE-specific signature set, LOCKED per video by a stable seed
//   3. exposes pick(role) → the signature asset, plus alternatives for the UI
//      "swap sound" control.

import { SFX_ASSETS, assetsIn, getAsset, type SfxAsset, type SfxCategory } from '../sfxLibrary';

// ── Vibes: the overall sound-design personality the user picks ──────────────
export type SfxVibe = 'CLEAN' | 'VIRAL' | 'CINEMATIC' | 'MINIMAL' | 'MEME';

export const VIBES: { id: SfxVibe; label: string; blurb: string }[] = [
  { id: 'CLEAN',     label: 'Clean',     blurb: 'Tasteful transitions + emphasis. Safe default.' },
  { id: 'VIRAL',     label: 'Viral',     blurb: 'Punchy, dense, TikTok energy. Pops + hits.' },
  { id: 'CINEMATIC', label: 'Cinematic', blurb: 'Big booms, risers, sparse and dramatic.' },
  { id: 'MINIMAL',   label: 'Minimal',   blurb: 'Just the essential whooshes + hits.' },
  { id: 'MEME',      label: 'Meme',      blurb: 'Playful pops, dings, cash & comedy stings.' },
];

// ── Roles: the editorial PURPOSE of a sound, not just its category ───────────
// Agents speak in roles; the palette maps a role to a curated category + the
// best asset for it under the active vibe.
export type SfxRole =
  | 'whoosh-in'   // text/transition arriving
  | 'whoosh-out'  // text leaving into a gap
  | 'whoosh-big'  // layered emphasis on a big move (zoom / scene change)
  | 'hit'         // the punchline / drop / max-emphasis release
  | 'riser'       // build-up leading into a hit
  | 'pop'         // medium word emphasis / list item
  | 'click'       // light tick on a reveal
  | 'keyboard'    // fast text block flourish
  | 'data'        // icon / number / "digital" reveal
  | 'notify'      // ding / message / positive beat
  | 'cash'        // money / win moment
  | 'camera'      // photo / freeze-frame
  | 'meme';       // comedy sting

const ROLE_CATEGORY: Record<SfxRole, SfxCategory> = {
  'whoosh-in': 'WHOOSH', 'whoosh-out': 'WHOOSH', 'whoosh-big': 'WHOOSH',
  hit: 'HIT', riser: 'RISER', pop: 'POP', click: 'CLICK', keyboard: 'KEYBOARD',
  data: 'DATA', notify: 'NOTIFY', cash: 'CASH', camera: 'CAMERA', meme: 'MEME',
};

// ── Quality curation: prefer the good, banish the junk ──────────────────────
// Keyword scoring per role. `prefer` boosts; `avoid` is a soft penalty; `ban`
// removes the asset from the role entirely (mislabeled or off-brand files).
interface RoleTaste { prefer: string[]; avoid: string[]; ban: string[]; }

const lc = (s: string) => s.toLowerCase();
const hit = (name: string, kws: string[]) => kws.some(k => lc(name).includes(k));

const TASTE: Partial<Record<SfxRole, RoleTaste>> = {
  'whoosh-in':  { prefer: ['clean', 'swish', 'swoosh', 'fast whoosh', 'jump', 'swing', 'whoosh'], avoid: ['long', 'rewind', 'fast forward'], ban: ['error', 'windows xp', 'xp '] },
  'whoosh-out': { prefer: ['swoosh', 'swish', 'whoosh', 'rewind', 'fast forward'],                avoid: ['portal'],                          ban: ['error', 'windows xp', 'xp '] },
  'whoosh-big': { prefer: ['long whoosh', 'portal', 'lens flare', 'fast forward', 'whoosh'],      avoid: ['clean-fast'],                      ban: ['error', 'windows xp', 'xp '] },
  hit:          { prefer: ['boom', 'impact', 'slam', 'grand hit', 'drop', 'crash', 'braam'],      avoid: ['hint of metal'],                   ban: [] },
  riser:        { prefer: ['riser', 'swell', 'build', 'ascending', 'drum roll', 'suction', 'subsonic'], avoid: ['glass hit'],                 ban: [] },
  pop:          { prefer: ['pop', 'bloop', 'bubble'],                                              avoid: ['splat', 'cork', 'fart'],           ban: [] },
  click:        { prefer: ['click', 'mouse', 'rm click'],                                          avoid: [],                                  ban: ['gun'] },
  keyboard:     { prefer: ['keyboard', 'typing'],                                                  avoid: ['typewriter'],                      ban: [] },
  data:         { prefer: ['processing', 'data transfer', 'disc read', 'switch', 'transfer', 'access granted', 'intermodulation'], avoid: ['dial-up'], ban: ['denied', 'failure', 'erased', 'reboot', 'line break'] },
  notify:       { prefer: ['ding', 'apple', 'message', 'correct', 'good-idea', 'select', 'iphone receive', 'menu'], avoid: ['leave'], ban: [] },
  cash:         { prefer: ['kaching', 'cash register', 'cash', 'coin', 'ting', 'racks'],           avoid: [],                                  ban: [] },
  camera:       { prefer: ['shutter', 'camera shot', 'flash'],                                     avoid: ['13695'],                           ban: [] },
  meme:         { prefer: ['yeyy', 'awww', 'goofy', 'hmmm', 'whistle', 'boing', 'censor'],         avoid: ['fart', 'hurt', 'barking'],         ban: [] },
};

/** Rank a role's category assets best-first, dropping banned ones. */
function rankedForRole(role: SfxRole): SfxAsset[] {
  const cat = ROLE_CATEGORY[role];
  const taste = TASTE[role];
  const pool = assetsIn(cat).filter(a => !(taste?.ban ?? []).some(b => lc(a.name).includes(b)));
  if (!taste) return pool;
  const scored = pool.map(a => {
    let s = 0;
    if (hit(a.name, taste.prefer)) s += 2;
    if (hit(a.name, taste.avoid)) s -= 2;
    // Mild preference for shorter, cleaner names (less likely to be a novelty clip).
    s += Math.max(0, 1 - a.name.length / 60);
    return { a, s };
  });
  scored.sort((x, y) => y.s - x.s);
  return scored.map(x => x.a);
}

// ── Vibe configuration ──────────────────────────────────────────────────────
interface VibeConfig {
  roles: SfxRole[];        // which roles are allowed to sound
  densityPerMin: number;   // editorial budget: target cues/minute at intensity 1
  gainScale: number;       // overall loudness character
}

const VIBE_CONFIG: Record<SfxVibe, VibeConfig> = {
  MINIMAL:   { roles: ['whoosh-in', 'whoosh-big', 'hit', 'riser'], densityPerMin: 7, gainScale: 0.95 },
  CLEAN:     { roles: ['whoosh-in', 'whoosh-out', 'whoosh-big', 'hit', 'riser', 'pop', 'click', 'data'], densityPerMin: 14, gainScale: 1 },
  CINEMATIC: { roles: ['whoosh-in', 'whoosh-big', 'hit', 'riser', 'camera'], densityPerMin: 11, gainScale: 1.12 },
  VIRAL:     { roles: ['whoosh-in', 'whoosh-out', 'whoosh-big', 'hit', 'riser', 'pop', 'click', 'keyboard', 'data', 'notify', 'cash'], densityPerMin: 24, gainScale: 1.05 },
  MEME:      { roles: ['whoosh-in', 'hit', 'pop', 'click', 'notify', 'cash', 'meme'], densityPerMin: 26, gainScale: 1 },
};

// Small deterministic hash so the signature palette is STABLE per video (same
// seed → same kit) but differs between videos.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export interface Palette {
  vibe: SfxVibe;
  gainScale: number;
  densityPerMin: number;
  /** Is this editorial role allowed under the current vibe? */
  allows(role: SfxRole): boolean;
  /** The signature asset for a role. `variant` lets a few roles (e.g. hits)
   *  rotate through 2 curated options for life; most roles return one fixed pick. */
  pick(role: SfxRole, variant?: number): SfxAsset | undefined;
}

// Roles that may tastefully rotate between a couple of curated options instead
// of one fixed sound (pros vary hits/pops a little; transitions stay constant).
const ROTATE: Partial<Record<SfxRole, number>> = { hit: 2, pop: 2, riser: 2 };

/**
 * Build the locked signature palette for a video.
 * @param vibe  chosen personality
 * @param seed  stable per-video string (e.g. `${duration}:${captionCount}`)
 */
export function buildPalette(vibe: SfxVibe, seed: string): Palette {
  const cfg = VIBE_CONFIG[vibe] ?? VIBE_CONFIG.CLEAN;
  const allowed = new Set(cfg.roles);
  const base = hashStr(seed);

  // Pre-resolve the top curated options per allowed role, locked by the seed.
  const chosen = new Map<SfxRole, SfxAsset[]>();
  for (const role of cfg.roles) {
    const ranked = rankedForRole(role);
    if (!ranked.length) continue;
    const slots = ROTATE[role] ?? 1;
    // Take from the top of the ranked list; offset by the seed so two videos
    // with the same vibe still feel slightly different.
    const picks: SfxAsset[] = [];
    const topN = Math.min(ranked.length, Math.max(slots, 4));
    for (let i = 0; i < slots; i++) {
      const idx = (base + i * 7) % topN;
      picks.push(ranked[idx]);
    }
    chosen.set(role, picks);
  }

  return {
    vibe,
    gainScale: cfg.gainScale,
    densityPerMin: cfg.densityPerMin,
    allows: (role) => allowed.has(role),
    pick: (role, variant = 0) => {
      const opts = chosen.get(role);
      if (!opts || !opts.length) return undefined;
      return opts[Math.abs(variant) % opts.length];
    },
  };
}

/**
 * Curated alternatives for a given asset's role/category, best-first — powers the
 * per-cue "swap sound" control in the timeline. Returns the asset that is `dir`
 * steps away from the current one in the curated ranking (wraps around).
 */
export function cycleAsset(currentAssetId: string, category: SfxCategory, dir: 1 | -1): SfxAsset | undefined {
  // Find the role(s) that map to this category to reuse curation; fall back to
  // the raw category list (still ban-filtered where possible).
  const role = (Object.keys(ROLE_CATEGORY) as SfxRole[]).find(r => ROLE_CATEGORY[r] === category);
  const list = role ? rankedForRole(role) : assetsIn(category);
  if (!list.length) return getAsset(currentAssetId);
  const i = Math.max(0, list.findIndex(a => a.id === currentAssetId));
  const next = (i + dir + list.length) % list.length;
  return list[next];
}

/** All curated, ban-filtered assets in a category (best-first) for a browse UI. */
export function curatedAssets(category: SfxCategory): SfxAsset[] {
  const role = (Object.keys(ROLE_CATEGORY) as SfxRole[]).find(r => ROLE_CATEGORY[r] === category);
  return role ? rankedForRole(role) : assetsIn(category);
}

export { ROLE_CATEGORY };
export const SFX_LIBRARY_SIZE = SFX_ASSETS.length;
