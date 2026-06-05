import { Caption, WordTiming } from '../types';

const ICON_BASE_URL = 'https://img.icons8.com/fluency/96';

// Map trigger words to premium Icons8 Fluency icons
export const KEYWORD_ICON_MAP: Record<string, { name: string; url: string }> = {
  // Energy / Power / Fire
  fire: { name: 'fire', url: `${ICON_BASE_URL}/fire.png` },
  flame: { name: 'fire', url: `${ICON_BASE_URL}/fire.png` },
  burning: { name: 'fire', url: `${ICON_BASE_URL}/fire.png` },
  hot: { name: 'fire', url: `${ICON_BASE_URL}/fire.png` },
  flash: { name: 'flash-on', url: `${ICON_BASE_URL}/flash-on.png` },
  lightning: { name: 'flash-on', url: `${ICON_BASE_URL}/flash-on.png` },
  power: { name: 'flash-on', url: `${ICON_BASE_URL}/flash-on.png` },

  // Idea / Smart / Brain / Think
  idea: { name: 'light-on', url: `${ICON_BASE_URL}/light-on.png` },
  bulb: { name: 'light-on', url: `${ICON_BASE_URL}/light-on.png` },
  smart: { name: 'brain', url: `${ICON_BASE_URL}/brain.png` },
  brain: { name: 'brain', url: `${ICON_BASE_URL}/brain.png` },
  think: { name: 'brain', url: `${ICON_BASE_URL}/brain.png` },
  mind: { name: 'brain', url: `${ICON_BASE_URL}/brain.png` },

  // Rocket / Growth / Launch / Chart
  rocket: { name: 'rocket', url: `${ICON_BASE_URL}/rocket.png` },
  launch: { name: 'rocket', url: `${ICON_BASE_URL}/rocket.png` },
  grow: { name: 'chart-arriba', url: `${ICON_BASE_URL}/chart-arriba.png` },
  growth: { name: 'chart-arriba', url: `${ICON_BASE_URL}/chart-arriba.png` },
  chart: { name: 'chart-arriba', url: `${ICON_BASE_URL}/chart-arriba.png` },
  up: { name: 'chart-arriba', url: `${ICON_BASE_URL}/chart-arriba.png` },

  // Love / Heart / Like / Favorite
  love: { name: 'like', url: `${ICON_BASE_URL}/like.png` },
  heart: { name: 'like', url: `${ICON_BASE_URL}/like.png` },
  like: { name: 'like', url: `${ICON_BASE_URL}/like.png` },

  // Money / Cash / Wealth / Gold
  money: { name: 'money-bag', url: `${ICON_BASE_URL}/money-bag.png` },
  cash: { name: 'money-bag', url: `${ICON_BASE_URL}/money-bag.png` },
  earn: { name: 'money-bag', url: `${ICON_BASE_URL}/money-bag.png` },
  profit: { name: 'money-bag', url: `${ICON_BASE_URL}/money-bag.png` },
  income: { name: 'money-bag', url: `${ICON_BASE_URL}/money-bag.png` },
  rich: { name: 'money-bag', url: `${ICON_BASE_URL}/money-bag.png` },
  gold: { name: 'money-bag', url: `${ICON_BASE_URL}/money-bag.png` },

  // Warning / Danger / Risk / Error
  warning: { name: 'error', url: `${ICON_BASE_URL}/error.png` },
  danger: { name: 'error', url: `${ICON_BASE_URL}/error.png` },
  risk: { name: 'error', url: `${ICON_BASE_URL}/error.png` },
  stop: { name: 'error', url: `${ICON_BASE_URL}/error.png` },

  // Check / Success / Done / Correct
  check: { name: 'checked', url: `${ICON_BASE_URL}/checked.png` },
  done: { name: 'checked', url: `${ICON_BASE_URL}/checked.png` },
  correct: { name: 'checked', url: `${ICON_BASE_URL}/checked.png` },
  yes: { name: 'checked', url: `${ICON_BASE_URL}/checked.png` },
  success: { name: 'checked', url: `${ICON_BASE_URL}/checked.png` },
  ok: { name: 'checked', url: `${ICON_BASE_URL}/checked.png` },

  // Wrong / Cross / Fail / Cancel
  wrong: { name: 'cancel', url: `${ICON_BASE_URL}/cancel.png` },
  no: { name: 'cancel', url: `${ICON_BASE_URL}/cancel.png` },
  mistake: { name: 'cancel', url: `${ICON_BASE_URL}/cancel.png` },
  fail: { name: 'cancel', url: `${ICON_BASE_URL}/cancel.png` },
  bad: { name: 'cancel', url: `${ICON_BASE_URL}/cancel.png` },

  // Star / Premium / Rating
  star: { name: 'star', url: `${ICON_BASE_URL}/star.png` },
  best: { name: 'star', url: `${ICON_BASE_URL}/star.png` },
  top: { name: 'star', url: `${ICON_BASE_URL}/star.png` },
  popular: { name: 'star', url: `${ICON_BASE_URL}/star.png` },

  // Clock / Time / Alarm / Speed
  time: { name: 'clock', url: `${ICON_BASE_URL}/clock.png` },
  clock: { name: 'clock', url: `${ICON_BASE_URL}/clock.png` },
  hurry: { name: 'alarm-clock', url: `${ICON_BASE_URL}/alarm-clock.png` },
  fast: { name: 'alarm-clock', url: `${ICON_BASE_URL}/alarm-clock.png` },
  quick: { name: 'alarm-clock', url: `${ICON_BASE_URL}/alarm-clock.png` },

  // World / Globe / Global / Earth
  world: { name: 'globe', url: `${ICON_BASE_URL}/globe.png` },
  global: { name: 'globe', url: `${ICON_BASE_URL}/globe.png` },
  earth: { name: 'globe', url: `${ICON_BASE_URL}/globe.png` },
  internet: { name: 'globe', url: `${ICON_BASE_URL}/globe.png` },

  // Phone / Mobile / Smartphone
  phone: { name: 'iphone', url: `${ICON_BASE_URL}/iphone.png` },
  mobile: { name: 'iphone', url: `${ICON_BASE_URL}/iphone.png` },
  smartphone: { name: 'iphone', url: `${ICON_BASE_URL}/iphone.png` },

  // Video / Camera / Film
  video: { name: 'camera', url: `${ICON_BASE_URL}/camera.png` },
  camera: { name: 'camera', url: `${ICON_BASE_URL}/camera.png` },
  movie: { name: 'camera', url: `${ICON_BASE_URL}/camera.png` },
  film: { name: 'camera', url: `${ICON_BASE_URL}/camera.png` },

  // Music / Song / Audio
  music: { name: 'musical-notes', url: `${ICON_BASE_URL}/musical-notes.png` },
  song: { name: 'musical-notes', url: `${ICON_BASE_URL}/musical-notes.png` },
  audio: { name: 'musical-notes', url: `${ICON_BASE_URL}/musical-notes.png` },

  // Game / Play / Gaming
  game: { name: 'controller', url: `${ICON_BASE_URL}/controller.png` },
  gaming: { name: 'controller', url: `${ICON_BASE_URL}/controller.png` },
  play: { name: 'controller', url: `${ICON_BASE_URL}/controller.png` },

  // Trophy / Win / Champion
  win: { name: 'trophy', url: `${ICON_BASE_URL}/trophy.png` },
  winner: { name: 'trophy', url: `${ICON_BASE_URL}/trophy.png` },
  trophy: { name: 'trophy', url: `${ICON_BASE_URL}/trophy.png` },
  champion: { name: 'trophy', url: `${ICON_BASE_URL}/trophy.png` },
  first: { name: 'trophy', url: `${ICON_BASE_URL}/trophy.png` },

  // Gift / Box / Free
  gift: { name: 'gift', url: `${ICON_BASE_URL}/gift.png` },
  reward: { name: 'gift', url: `${ICON_BASE_URL}/gift.png` },
  free: { name: 'gift', url: `${ICON_BASE_URL}/gift.png` },

  // Key / Lock / Security
  key: { name: 'key', url: `${ICON_BASE_URL}/key.png` },
  unlock: { name: 'key', url: `${ICON_BASE_URL}/key.png` },
  lock: { name: 'lock', url: `${ICON_BASE_URL}/lock.png` },
  secret: { name: 'lock', url: `${ICON_BASE_URL}/lock.png` },
  secure: { name: 'security-shield', url: `${ICON_BASE_URL}/security-shield.png` },
  protect: { name: 'security-shield', url: `${ICON_BASE_URL}/security-shield.png` },

  // Target / Goal / Focus
  target: { name: 'target', url: `${ICON_BASE_URL}/target.png` },
  goal: { name: 'target', url: `${ICON_BASE_URL}/target.png` },
  focus: { name: 'target', url: `${ICON_BASE_URL}/target.png` },

  // People / Team / Group
  people: { name: 'people', url: `${ICON_BASE_URL}/people.png` },
  team: { name: 'people', url: `${ICON_BASE_URL}/people.png` },
  group: { name: 'people', url: `${ICON_BASE_URL}/people.png` },
  users: { name: 'people', url: `${ICON_BASE_URL}/people.png` },
  friends: { name: 'people', url: `${ICON_BASE_URL}/people.png` },

  // Shop / Buy / Shopping
  shop: { name: 'shopping-cart', url: `${ICON_BASE_URL}/shopping-cart.png` },
  buy: { name: 'shopping-cart', url: `${ICON_BASE_URL}/shopping-cart.png` },
  sell: { name: 'shopping-cart', url: `${ICON_BASE_URL}/shopping-cart.png` },
  cart: { name: 'shopping-cart', url: `${ICON_BASE_URL}/shopping-cart.png` },

  // Deal / Handshake
  deal: { name: 'handshake', url: `${ICON_BASE_URL}/handshake.png` },
  handshake: { name: 'handshake', url: `${ICON_BASE_URL}/handshake.png` },

  // Crown / Premium / Gold
  crown: { name: 'crown', url: `${ICON_BASE_URL}/crown.png` },
  king: { name: 'crown', url: `${ICON_BASE_URL}/crown.png` },
  premium: { name: 'crown', url: `${ICON_BASE_URL}/crown.png` },
};

/**
 * Maps triggers inside captions to Icons8 Fluency PNG CDN URLs.
 * Leaves captions.text intact but enriches caption.words Timing entries.
 */
export function mapIconWords(captions: Caption[]): Caption[] {
  return captions.map(caption => {
    if (!caption.words || caption.words.length === 0) return caption;

    const newWords: WordTiming[] = caption.words.map(word => {
      // Normalize punctuation and casing
      const normalized = word.text.toLowerCase().replace(/[^a-z]/g, '');
      let match = KEYWORD_ICON_MAP[normalized];
      
      // If singularized fallback exists, use it (e.g. "rockets" -> "rocket")
      if (!match && normalized.endsWith('s')) {
        match = KEYWORD_ICON_MAP[normalized.slice(0, -1)];
      }

      if (!match) return word;

      return {
        ...word,
        iconEmoji: match.name, // Using name as identifier
        iconUrl: match.url,
      };
    });

    return { ...caption, words: newWords };
  });
}

/**
 * Clean up icon fields from caption words (revert filter state)
 */
export function removeIconWords(captions: Caption[]): Caption[] {
  return captions.map(caption => ({
    ...caption,
    words: caption.words?.map(w => {
      const { iconEmoji: _, iconUrl: __, ...rest } = w;
      return rest;
    })
  }));
}
