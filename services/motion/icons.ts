/**
 * Concept → emoji map for canvas-rendered icons.
 *
 * Phase 6 curation: ~160 aliases that map common motion-graphics intents
 * ("boom", "magic", "mind-blown", "gem", "shock") to high-impact emoji
 * glyphs. Apple Color Emoji / Segoe UI Emoji 14+ render these with subtle
 * shading and dimensionality, which is what we want for "creative not flat"
 * iconography.
 *
 * Gemini is told to pick concrete nouns. If a key isn't found we return the
 * raw value (so Gemini-supplied emojis pass through), or fall back to ✨.
 */

export const ICON_EMOJI: Record<string, string> = {
  // ─── Energy / action / impact ────────────────────────────────────────
  zap: '⚡', flash: '⚡', bolt: '⚡', power: '⚡', electric: '⚡', shock: '⚡',
  fire: '🔥', flame: '🔥', hot: '🔥', lit: '🔥', burning: '🔥',
  boom: '💥', explosion: '💥', impact: '💥', burst: '💥', bang: '💥',
  rocket: '🚀', launch: '🚀', rocketlaunch: '🚀', liftoff: '🚀', blastoff: '🚀',
  trendingup: '📈', growth: '📈', upward: '📈', rising: '📈',
  trendingdown: '📉', falling: '📉', downward: '📉', dropping: '📉',
  target: '🎯', goal: '🎯', focus: '🎯', aim: '🎯', bullseye: '🎯',
  flag: '🚩', milestone: '🚩', stop: '🚩',
  wave: '🌊', flood: '🌊', surge: '🌊',
  tornado: '🌪️', whirlwind: '🌪️', spiral: '🌪️',

  // ─── People / emotion / reaction ────────────────────────────────────
  heart: '❤️', love: '❤️', romantic: '❤️',
  fire_heart: '❤️‍🔥', burningheart: '❤️‍🔥',
  smile: '😊', happy: '😊',
  laugh: '😂', lol: '😂', funny: '😂',
  cry: '😭', sad: '😭', upset: '😭',
  mindblown: '🤯', shocked: '🤯', wow: '🤯',
  wow_emoji: '🤩', amazed: '🤩', impressed: '🤩', starstruck: '🤩',
  brain: '🧠', smart: '🧠', think: '🧠', genius: '🧠', intelligence: '🧠',
  eye: '👁️', see: '👁️', vision: '👁️', watch: '👁️',
  hand: '✋', stop_hand: '✋',
  pointingright: '👉', point: '👉', look: '👉', here: '👉',
  thumbsup: '👍', good: '👍', approve: '👍', yes: '👍',
  thumbsdown: '👎', bad: '👎', reject: '👎', no: '👎',
  pray: '🙏', please: '🙏', thanks: '🙏',
  raisedhands: '🙌', celebrate: '🙌',
  muscle: '💪', strong: '💪', strength: '💪', flex: '💪',

  // ─── Money / business ────────────────────────────────────────────────
  dollarsign: '💰', dollar: '💰', money: '💰', cash: '💰', rich: '💰',
  moneywings: '💸', spending: '💸', loss: '💸',
  banknote: '💵', bill: '💵', cash_stack: '💵',
  briefcase: '💼', business: '💼', work: '💼', professional: '💼',
  chart: '📊', graph: '📊', analytics: '📊', stats: '📊',
  growth_chart: '📈', revenue: '📈',
  bank: '🏦', vault: '🏦',
  creditcard: '💳', payment: '💳',

  // ─── Concept / decision / clarity ───────────────────────────────────
  lightbulb: '💡', bulb: '💡', idea: '💡', insight: '💡', eureka: '💡',
  star: '⭐', favorite: '⭐', best: '⭐', top: '⭐', special: '⭐',
  glowstar: '🌟', shining: '🌟',
  sparkles: '✨', magic: '✨', special_effect: '✨', glitter: '✨', shiny: '✨',
  dizzy: '💫', dizzy_star: '💫', sparkle: '💫',
  trophy: '🏆', winner: '🏆', champion: '🏆', achievement: '🏆',
  medal: '🏅', award: '🏅', honor: '🏅',
  gem: '💎', diamond: '💎', premium: '💎', luxury: '💎', valuable: '💎',
  crown: '👑', royal: '👑', leader: '👑', king: '👑', queen: '👑',
  unicorn: '🦄', rare: '🦄', mythical: '🦄', unique: '🦄',
  crystal: '🔮', future: '🔮', prediction: '🔮', mystical: '🔮',
  check: '✅', checkcircle: '✅', done: '✅', success: '✅', completed: '✅', correct: '✅',
  x: '❌', xcircle: '❌', wrong: '❌', fail: '❌', error: '❌', incorrect: '❌',
  warning: '⚠️', alertcircle: '⚠️', alerttriangle: '⚠️', caution: '⚠️', danger: '⚠️',
  info: 'ℹ️', information: 'ℹ️', note: 'ℹ️',
  question: '❓', confused: '❓', wonder: '❓',
  exclamation: '❗', alert: '❗', notice: '❗', urgent: '❗',

  // ─── Tools / tech ────────────────────────────────────────────────────
  phone: '📱', smartphone: '📱', mobile: '📱', cell: '📱',
  laptop: '💻', computer: '💻', code: '💻', programming: '💻',
  desktop: '🖥️', monitor: '🖥️', screen: '🖥️',
  keyboard: '⌨️', typing: '⌨️',
  camera: '📷', photo: '📷', picture: '📷',
  video: '🎥', film: '🎥', movie: '🎥', recording: '🎥',
  tv: '📺', television: '📺', broadcast: '📺',
  music: '🎵', song: '🎵', audio: '🎵',
  musicalnote: '🎶', tune: '🎶',
  headphones: '🎧', listening: '🎧',
  mic: '🎤', microphone: '🎤', podcast: '🎤', voice: '🎤',
  bell: '🔔', notification: '🔔', alert_sound: '🔔', reminder: '🔔',
  lock: '🔒', secure: '🔒', private: '🔒', protected: '🔒',
  unlock: '🔓', open: '🔓', accessible: '🔓',
  key: '🔑', access: '🔑', solution: '🔑', secret: '🔑',
  search: '🔍', find: '🔍', lookup: '🔍', research: '🔍',
  link: '🔗', connection: '🔗', url: '🔗',
  satellite: '📡', signal: '📡', broadcast_signal: '📡',
  robot: '🤖', ai: '🤖', automation: '🤖', bot: '🤖',
  rocket_ship: '🚀',

  // ─── Time / progress ─────────────────────────────────────────────────
  clock: '⏰', time: '⏰', alarm: '⏰', schedule: '⏰',
  hourglass: '⏳', wait: '⏳', loading: '⏳', patience: '⏳',
  calendar: '📅', date: '📅', day: '📅', planning: '📅',
  timer: '⏱️', stopwatch: '⏱️', countdown: '⏱️',

  // ─── Places / travel ─────────────────────────────────────────────────
  globe: '🌍', earth: '🌍', world: '🌍', global: '🌍', international: '🌍',
  map: '🗺️', location: '🗺️', navigation: '🗺️',
  pin: '📍', place: '📍', here_location: '📍', marker: '📍',
  airplane: '✈️', flight: '✈️', travel: '✈️',
  car: '🚗', drive: '🚗', vehicle: '🚗',

  // ─── Knowledge / content ─────────────────────────────────────────────
  book: '📖', read: '📖', learn: '📖', knowledge: '📖', story: '📖',
  pencil: '✏️', write: '✏️', edit: '✏️', note_taking: '✏️',
  speech: '💬', talk: '💬', conversation: '💬', dialogue: '💬',
  thought: '💭', thinking: '💭', mind: '💭',
  document: '📄', file: '📄', paper: '📄',
  scroll: '📜', historic: '📜',

  // ─── Celebration / energy ───────────────────────────────────────────
  gift: '🎁', present: '🎁', reward: '🎁', surprise: '🎁',
  party: '🎉', celebrate_emoji: '🎉', festival: '🎉', confetti: '🎉',
  balloon: '🎈', festive: '🎈',
  cake: '🎂', birthday: '🎂',
  fireworks: '🎆', explosion_pretty: '🎆',
  sparkler: '🎇',

  // ─── Direction / arrows (handy for callouts) ────────────────────────
  arrowup: '⬆️', up: '⬆️', north: '⬆️',
  arrowdown: '⬇️', down: '⬇️', south: '⬇️',
  arrowright: '➡️', right: '➡️', forward: '➡️', east: '➡️',
  arrowleft: '⬅️', left: '⬅️', backward: '⬅️', west: '⬅️',
  loop: '🔁', repeat: '🔁', cycle: '🔁', recurring: '🔁',
  refresh: '🔄', reload: '🔄', refresh_action: '🔄',
};

const normalizeKey = (s: string): string => s.toLowerCase().replace(/[-_\s]/g, '');

export const resolveIcon = (raw?: string): string => {
  if (!raw) return '✨';
  const key = normalizeKey(raw);
  if (ICON_EMOJI[key]) return ICON_EMOJI[key];
  // If the raw input is already a short glyph (likely an emoji from Gemini),
  // return it as-is. Otherwise fall back to a sparkle so callers always get
  // something printable.
  return raw.length <= 6 ? raw : '✨';
};
