// Build the SFX manifest: scan the user's SFX library, classify each audio file
// into a sound-design category by filename keywords, and emit a typed JSON the
// app loads at runtime. Re-runnable + idempotent.
//
//   node scripts/build-sfx-manifest.mjs
//
// Categories map to the three-stage sound-design model:
//   WHOOSH  -> Stage 1 (motion / transitions)
//   CLICK/KEYBOARD/WRITING/DATA/POP/CAMERA -> Stage 2 (texture)
//   RISER (buildup) + HIT (release/impact) -> Stage 3
//   NOTIFY/CASH/APPLAUSE/MEME/CLOCK/AMBIENT/MUSIC -> semantic + accents
//   OTHER -> unclassifiable by name (still usable via a future picker)

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO = join(__dirname, '..');
const SFX_DIR = join(REPO, 'public', 'assets', 'SFX Sound Effects-20260613T023948Z-3-001', 'SFX Sound Effects');
const OUT = join(REPO, 'services', 'audio', 'sfxManifest.json');

// Ordered: first match wins. More specific keywords come before generic ones.
const RULES = [
  ['RISER',    [/riser/i, /build[\s-]?up/i, /swell/i, /ascending/i, /suction/i, /drum roll/i, /suspense/i, /pulses/i, /power[\s-]?up/i, /trailer/i, /sub\b/i, /subsonic/i]],
  ['HIT',      [/\bboom\b/i, /impact/i, /\bhit\b/i, /slam/i, /crash/i, /struck/i, /punch/i, /\bdrop\b/i, /shatter/i, /thud/i, /breaking/i, /grand hit/i, /universe boom/i, /metal/i]],
  ['WHOOSH',   [/whoosh/i, /woosh/i, /swoosh/i, /swish/i, /swing/i, /\bswipe/i, /transition/i, /warp/i, /zoom/i, /slide/i, /jump swish/i, /lens flare/i, /spinning/i, /fast forward/i, /rewind/i, /portal hop/i, /wind/i]],
  ['KEYBOARD', [/keyboard/i, /typing/i, /typewriter/i, /writing on keyboard/i]],
  ['WRITING',  [/writing/i, /pencil/i, /\bpaper/i, /crumpled/i, /\bpen\b/i]],
  ['CAMERA',   [/camera/i, /shutter/i, /shot flash/i]],
  ['CASH',     [/cash/i, /kaching/i, /register/i, /\bcoin\b/i, /\bracks\b/i, /\bting\b/i]],
  ['APPLAUSE', [/applause/i, /\bclap/i, /\bcrowd/i, /party horn/i]],
  ['NOTIFY',   [/notification/i, /\bding\b/i, /\bmessage\b/i, /iphone/i, /discord/i, /apple/i, /menu select/i, /\bmenu\b/i, /new idea/i, /correct/i, /quick[\s-]?win/i, /good[\s-]?idea/i, /\bbell\b/i, /receive/i, /\bsend\b/i]],
  ['DATA',     [/data/i, /digital/i, /display digits/i, /disc read/i, /download/i, /network/i, /disconnect/i, /access (denied|granted)/i, /glitch/i, /hack/i, /sci[\s-]?fi/i, /dial[\s-]?up/i, /processing/i, /erased/i, /reboot/i, /restart/i, /switcher/i, /line break/i, /intermodulation/i, /terminal/i, /counting/i, /loading/i, /static/i, /electricity/i, /gears/i]],
  ['POP',      [/\bpop\b/i, /bloop/i, /bubble/i, /\bcork\b/i, /\bsplat\b/i]],
  ['CLICK',    [/click/i, /\btap\b/i, /gun.?(click|metal)/i, /mouse/i]],
  ['CLOCK',    [/clock/i, /tick/i]],
  ['MEME',     [/fart/i, /goofy/i, /awww/i, /\bhmm/i, /yeyy|yay/i, /minecraft/i, /\bdog\b/i, /bark/i, /whistle/i, /censor/i, /wrong/i, /error/i, /boxing/i, /splat/i, /cartoon/i, /shocked/i, /eyes-in-the-puddle/i, /zay-zay/i]],
  ['MUSIC',    [/podcast/i, /background music/i, /cinematic sounds/i, /driving-ambition/i, /\btrap\b/i, /purple-js/i, /we-own-the-night/i, /\bbeat/i]],
  ['AMBIENT',  [/spooky/i, /\bwind\b/i, /ambient/i]],
];

function classify(name) {
  for (const [cat, patterns] of RULES) {
    if (patterns.some((re) => re.test(name))) return cat;
  }
  return 'OTHER';
}

function slug(name) {
  return name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'sfx';
}

function encodePath(rel) {
  // rel uses OS separators; convert to URL and encode each segment (spaces etc.)
  return '/' + rel.split(/[\\/]/).map(encodeURIComponent).join('/');
}

const AUDIO_EXT = new Set(['.wav', '.mp3']);

let entries = [];
const seen = new Set();
const counts = {};

const files = readdirSync(SFX_DIR);
for (const f of files) {
  const full = join(SFX_DIR, f);
  if (!statSync(full).isFile()) continue;
  const ext = extname(f).toLowerCase();
  if (!AUDIO_EXT.has(ext)) continue; // skip .mp4 reference videos
  const category = classify(f);
  let id = slug(f);
  while (seen.has(id)) id += '-x';
  seen.add(id);
  const rel = relative(join(REPO, 'public'), full); // public/ is served at site root
  entries.push({ id, name: f, url: encodePath(rel), category, ext: ext.slice(1) });
  counts[category] = (counts[category] || 0) + 1;
}

entries.sort((a, b) => (a.category + a.name).localeCompare(b.category + b.name));

const manifest = {
  generatedAt: new Date().toISOString(),
  baseDir: 'assets/SFX Sound Effects-20260613T023948Z-3-001/SFX Sound Effects',
  count: entries.length,
  countsByCategory: counts,
  assets: entries,
};

writeFileSync(OUT, JSON.stringify(manifest, null, 2));
console.log(`Wrote ${OUT}`);
console.log(`Classified ${entries.length} files:`);
for (const [cat, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat.padEnd(9)} ${n}`);
}
const other = entries.filter((e) => e.category === 'OTHER').map((e) => e.name);
if (other.length) console.log(`\nOTHER (unclassified, ${other.length}):\n  ${other.join('\n  ')}`);
