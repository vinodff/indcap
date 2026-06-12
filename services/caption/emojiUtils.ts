export const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;

export const isEmojiWord = (word: string): boolean => {
  const clean = word.trim();
  if (!clean) return false;
  // Check if removing all emojis from the string leaves it empty
  const stripped = clean.replace(EMOJI_REGEX, '');
  // Also strip any remaining ZWJ (200D) or variation selectors
  const fullyStripped = stripped.replace(/[\uFE0F\u200D]/g, '');
  return fullyStripped.length === 0;
};

export const emojiToNotoUrl = (emoji: string): string => {
  // Get the base codepoint, skipping variation selectors (FE0F) and ZWJ (200D)
  const codepoints = [...emoji]
    .map(c => c.codePointAt(0)!)
    .filter(cp => cp !== 0xFE0F) // strip variation selector-16
    .map(cp => cp.toString(16).toLowerCase());
  // For multi-codepoint (ZWJ sequences), join with underscore
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${codepoints.join('_')}/512.gif`;
};

export async function fetchAndCacheEmojiGif(url: string): Promise<string> {
  if (typeof caches === 'undefined') {
    return url;
  }
  try {
    const cache = await caches.open('createrin-emoji-cache');
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch emoji: ${response.status}`);
    }

    // Cache the response
    await cache.put(url, response.clone());

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.warn('Emoji caching failed, falling back to direct URL:', error);
    return url;
  }
}
