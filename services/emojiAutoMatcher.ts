/**
 * Emoji Auto Matcher
 * ─────────────────────────────────────────────────────────────────────────────
 * Analyzes each caption sentence and automatically selects the most
 * contextually appropriate Noto animated emoji.
 *
 * The matching is keyword-weighted: each token of the caption is scored
 * against a prioritized emoji keyword map. The emoji with the highest
 * total score wins. Ties fall back to a sentiment-level default.
 */

import { Caption } from '../types';

// ─── Priority-weight keyword → emoji map ─────────────────────────────────────
// Higher weight = stronger semantic signal
// Emojis are Noto-animated (rendered via CDN in captionRenderer.ts)
interface EmojiRule {
  emoji: string;
  keywords: string[];
  weight: number;
}

const EMOJI_RULES: EmojiRule[] = [
  // ── ENERGY / HYPE ──
  { emoji: '🔥', keywords: ['fire', 'hot', 'lit', 'insane', 'wild', 'crazy', 'unreal', 'burn', 'flames', 'blazing', 'heat'], weight: 10 },
  { emoji: '🚀', keywords: ['launch', 'rocket', 'blast', 'shoot', 'sky', 'space', 'growth', 'skyrocket', 'going', 'up', 'level'], weight: 10 },
  { emoji: '💥', keywords: ['boom', 'explode', 'explosion', 'hit', 'bang', 'crash', 'smash', 'burst', 'blow'], weight: 9 },
  { emoji: '⚡', keywords: ['fast', 'quick', 'speed', 'lightning', 'flash', 'instant', 'rapid', 'power', 'electric'], weight: 9 },
  { emoji: '🎯', keywords: ['goal', 'target', 'aim', 'focus', 'perfect', 'nailed', 'hit', 'exact', 'precise'], weight: 9 },

  // ── MONEY / SUCCESS ──
  { emoji: '💸', keywords: ['money', 'cash', 'income', 'earn', 'paid', 'payout', 'revenue', 'salary', 'profit'], weight: 10 },
  { emoji: '💰', keywords: ['rich', 'wealth', 'bag', 'stack', 'bank', 'funds', 'savings', 'invest'], weight: 9 },
  { emoji: '📈', keywords: ['growth', 'rise', 'increase', 'grow', 'trend', 'chart', 'graph', 'up', 'percent', 'business'], weight: 9 },
  { emoji: '🏆', keywords: ['win', 'winner', 'champion', 'victory', 'trophy', 'first', 'rank', 'best', 'succeed'], weight: 10 },
  { emoji: '👑', keywords: ['king', 'queen', 'royalty', 'boss', 'legend', 'goat', 'greatest'], weight: 9 },
  { emoji: '💎', keywords: ['diamond', 'luxury', 'premium', 'exclusive', 'rare', 'gem', 'crystal', 'value', 'quality'], weight: 8 },

  // ── JOY / CELEBRATION ──
  { emoji: '🎉', keywords: ['celebrate', 'party', 'congrats', 'congratulations', 'achievement', 'done', 'finished', 'complete', 'launch'], weight: 10 },
  { emoji: '🎊', keywords: ['festival', 'event', 'special', 'occasion', 'holiday', 'cheer', 'hooray', 'yay'], weight: 8 },
  { emoji: '😂', keywords: ['funny', 'laugh', 'lol', 'hilarious', 'jokes', 'comedy', 'humor', 'haha'], weight: 10 },
  { emoji: '🥳', keywords: ['birthday', 'party', 'fun', 'happy', 'excited', 'thrilled', 'great'], weight: 9 },
  { emoji: '😍', keywords: ['love', 'beautiful', 'gorgeous', 'stunning', 'amazing', 'incredible', 'perfect', 'heart'], weight: 9 },

  // ── REACTION ──
  { emoji: '🤯', keywords: ['mindblown', 'mindblowing', 'shocked', 'unbelievable', 'crazy', 'cannot believe', "can't believe", 'whaaat', 'omg'], weight: 10 },
  { emoji: '😱', keywords: ['scared', 'fear', 'terrified', 'horror', 'shocking', 'gasp', 'oh no', 'disaster'], weight: 9 },
  { emoji: '🤩', keywords: ['star', 'celebrity', 'idol', 'amazing', 'fantastic', 'excellent', 'stellar'], weight: 8 },
  { emoji: '😎', keywords: ['cool', 'swag', 'style', 'smooth', 'chill', 'relax', 'vibe'], weight: 8 },
  { emoji: '😤', keywords: ['grind', 'hustle', 'work', 'focus', 'determined', 'serious', 'push', 'harder'], weight: 8 },
  { emoji: '😭', keywords: ['sad', 'cry', 'crying', 'tears', 'heartbreak', 'miss', 'lost', 'gone', 'painful'], weight: 9 },
  { emoji: '🙏', keywords: ['thank', 'thanks', 'grateful', 'blessed', 'pray', 'please', 'appreciate', 'gratitude'], weight: 10 },

  // ── STRENGTH / ACTION ──
  { emoji: '💪', keywords: ['strong', 'strength', 'muscle', 'power', 'workout', 'gym', 'fitness', 'training', 'lift'], weight: 10 },
  { emoji: '👊', keywords: ['fight', 'punch', 'battle', 'compete', 'challenge', 'beat', 'overcome', 'knock'], weight: 9 },
  { emoji: '🤝', keywords: ['deal', 'team', 'partner', 'together', 'collab', 'collaboration', 'join', 'friends', 'handshake'], weight: 9 },
  { emoji: '👏', keywords: ['clap', 'applause', 'well done', 'bravo', 'respect', 'honor', 'kudos'], weight: 9 },
  { emoji: '🙌', keywords: ['raise', 'up', 'celebrate', 'cheer', 'hands', 'triumph'], weight: 8 },

  // ── MOTIVATION / MINDSET ──
  { emoji: '✨', keywords: ['magic', 'special', 'sparkle', 'glow', 'shine', 'light', 'bright', 'radiant'], weight: 9 },
  { emoji: '🌟', keywords: ['star', 'outstanding', 'excellent', 'wonder', 'brilliant', 'shine', 'spectacular'], weight: 9 },
  { emoji: '💫', keywords: ['dream', 'aspire', 'hope', 'vision', 'inspire', 'imagine', 'future', 'potential'], weight: 8 },
  { emoji: '🧠', keywords: ['smart', 'learn', 'knowledge', 'idea', 'mind', 'think', 'strategy', 'intelligence', 'education'], weight: 9 },
  { emoji: '🎯', keywords: ['strategy', 'plan', 'method', 'system', 'execute', 'approach'], weight: 8 },

  // ── CONTENT / CREATIVE ──
  { emoji: '🎵', keywords: ['music', 'song', 'beat', 'sound', 'melody', 'track', 'vibe', 'rhythm', 'artist'], weight: 10 },
  { emoji: '🎬', keywords: ['video', 'film', 'movie', 'shot', 'record', 'camera', 'scene', 'content', 'creator'], weight: 9 },
  { emoji: '🎤', keywords: ['sing', 'voice', 'speak', 'talk', 'mic', 'microphone', 'podcast', 'interview'], weight: 9 },
  { emoji: '🎸', keywords: ['guitar', 'band', 'rock', 'play', 'instrument', 'jam'], weight: 8 },
  { emoji: '🕺', keywords: ['dance', 'move', 'groove', 'choreography', 'tiktok', 'trending'], weight: 10 },
  { emoji: '💃', keywords: ['dance', 'girl', 'woman', 'women', 'celebrate', 'party', 'latina'], weight: 9 },

  // ── SOCIAL / COMMUNITY ──
  { emoji: '❤️', keywords: ['love', 'heart', 'care', 'support', 'loyal', 'forever', 'passion', 'devoted'], weight: 10 },
  { emoji: '🫶', keywords: ['heart hands', 'love', 'support', 'community', 'together', 'family', 'unity'], weight: 9 },
  { emoji: '🌍', keywords: ['world', 'global', 'planet', 'earth', 'international', 'universal', 'everywhere'], weight: 8 },
  { emoji: '🌈', keywords: ['pride', 'color', 'colorful', 'diversity', 'inclusive', 'rainbow', 'variety'], weight: 8 },

  // ── TECH ──
  { emoji: '🤖', keywords: ['ai', 'robot', 'automation', 'tech', 'technology', 'machine', 'artificial', 'digital'], weight: 10 },
  { emoji: '💻', keywords: ['code', 'coding', 'programming', 'software', 'developer', 'computer', 'laptop', 'app'], weight: 9 },
  { emoji: '📱', keywords: ['phone', 'mobile', 'app', 'social', 'instagram', 'tiktok', 'platform', 'device'], weight: 8 },

  // ── FOOD ──
  { emoji: '🍕', keywords: ['pizza', 'food', 'eat', 'hungry', 'meal', 'dinner', 'lunch'], weight: 10 },
  { emoji: '☕', keywords: ['coffee', 'morning', 'cafe', 'drink', 'brew', 'espresso', 'tea'], weight: 9 },
  { emoji: '🍔', keywords: ['burger', 'fast food', 'snack', 'cheat meal', 'food'], weight: 9 },

  // ── TRAVEL / ADVENTURE ──
  { emoji: '✈️', keywords: ['travel', 'fly', 'flight', 'trip', 'journey', 'explore', 'abroad', 'vacation', 'holiday'], weight: 10 },
  { emoji: '🌊', keywords: ['ocean', 'sea', 'beach', 'wave', 'surf', 'water', 'summer', 'flow'], weight: 9 },
  { emoji: '🏔️', keywords: ['mountain', 'climb', 'hike', 'nature', 'adventure', 'peak', 'summit', 'trek'], weight: 9 },

  // ── TIME / URGENCY ──
  { emoji: '⏰', keywords: ['time', 'hurry', 'deadline', 'now', 'today', 'urgent', 'rush', 'clock', 'wait'], weight: 8 },
  { emoji: '🔑', keywords: ['key', 'secret', 'unlock', 'access', 'answer', 'solution', 'tip', 'trick', 'hack'], weight: 9 },
  { emoji: '👀', keywords: ['look', 'watch', 'see', 'notice', 'check', 'reveal', 'show', 'eye', 'attention'], weight: 9 },

  // ── GENERAL POSITIVITY (catch-all) ──
  { emoji: '👍', keywords: ['good', 'great', 'nice', 'okay', 'sure', 'yes', 'right', 'true', 'correct'], weight: 5 },
];

// ─── Sentence-level sentiment defaults ──────────────────────────────────────
// Used when no keyword match exceeds minimum threshold
const SENTIMENT_DEFAULTS = [
  { score: 2, emoji: '🔥' },  // very positive / hype
  { score: 1, emoji: '✨' },  // moderately positive
  { score: 0, emoji: '👀' },  // neutral / informational
  { score: -1, emoji: '💪' }, // challenging / tough
];

// ─── Tokenize and normalize text ─────────────────────────────────────────────
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

// ─── Score a single caption ───────────────────────────────────────────────────
function scoreCaptionForEmoji(text: string): Record<string, number> {
  const tokens = tokenize(text);
  const fullText = text.toLowerCase();
  const scores: Record<string, number> = {};

  for (const rule of EMOJI_RULES) {
    let totalScore = 0;
    for (const keyword of rule.keywords) {
      // Phrase match (higher confidence)
      if (fullText.includes(keyword)) {
        totalScore += rule.weight * 1.5;
        continue;
      }
      // Token match
      for (const token of tokens) {
        if (token === keyword || token.startsWith(keyword) || keyword.startsWith(token)) {
          totalScore += rule.weight;
        }
      }
    }
    if (totalScore > 0) {
      scores[rule.emoji] = (scores[rule.emoji] || 0) + totalScore;
    }
  }

  return scores;
}

// ─── Public: pick the best emoji for one caption text ────────────────────────
export function matchEmojiForCaption(text: string): string {
  const scores = scoreCaptionForEmoji(text);

  if (Object.keys(scores).length === 0) {
    // No keyword match — use a position-aware default
    const hash = [...text].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const defaults = ['🔥', '✨', '💫', '⚡', '🚀', '🎯', '💪', '🌟'];
    return defaults[hash % defaults.length];
  }

  // Return the highest-scoring emoji
  return Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0];
}

// ─── Public: Apply auto emojis to a full captions array ─────────────────────
// Appends the matched animated emoji to the END of each caption text.
// The canvas renderer auto-converts emoji → Noto animated GIF.
export function applyAutoEmojis(captions: Caption[]): Caption[] {
  return captions.map(caption => {
    // Strip any previously auto-assigned trailing emoji first
    const strippedText = caption.text
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();

    const emoji = matchEmojiForCaption(strippedText);
    return {
      ...caption,
      text: `${strippedText} ${emoji}`,
    };
  });
}

// ─── Public: Remove auto emojis (revert) ─────────────────────────────────────
export function removeAutoEmojis(captions: Caption[]): Caption[] {
  return captions.map(caption => ({
    ...caption,
    text: caption.text
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
      .trim(),
  }));
}
