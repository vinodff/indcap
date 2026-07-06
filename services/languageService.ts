// ─── Unified Language System (100+ languages) ───

export interface LanguageDefinition {
  code: string;         // ISO 639-1 code
  name: string;         // English name
  nativeName: string;   // Native script name
  script: string;       // Script system (Latin, Devanagari, etc.)
  flag: string;         // Emoji flag or icon
  /** Romanized-mix variant name (e.g., "Hinglish", "Telglish", "Tanglish") */
  mixName?: string;
  /** Popular / frequently used */
  popular?: boolean;
  /** Region group for categorization */
  region: 'indian' | 'east-asian' | 'southeast-asian' | 'middle-eastern' | 'european' | 'african' | 'american' | 'other';
}

// Comprehensive language database — 100+ languages
export const LANGUAGES: LanguageDefinition[] = [
  // ── Indian Languages ──
  { code: 'hi', name: 'Hindi',      nativeName: 'हिन्दी',      script: 'Devanagari', flag: '🇮🇳', mixName: 'Hinglish', popular: true,  region: 'indian' },
  { code: 'te', name: 'Telugu',     nativeName: 'తెలుగు',      script: 'Telugu',     flag: '🇮🇳', mixName: 'Telglish', popular: true,  region: 'indian' },
  { code: 'ta', name: 'Tamil',      nativeName: 'தமிழ்',       script: 'Tamil',      flag: '🇮🇳', mixName: 'Tanglish', popular: true,  region: 'indian' },
  { code: 'kn', name: 'Kannada',    nativeName: 'ಕನ್ನಡ',       script: 'Kannada',    flag: '🇮🇳', mixName: 'Kanglish', popular: true,  region: 'indian' },
  { code: 'mr', name: 'Marathi',    nativeName: 'मराठी',       script: 'Devanagari', flag: '🇮🇳', mixName: 'Marathlish', popular: true, region: 'indian' },
  { code: 'ml', name: 'Malayalam',  nativeName: 'മലയാളം',     script: 'Malayalam',  flag: '🇮🇳', mixName: 'Manglish', popular: false, region: 'indian' },
  { code: 'bn', name: 'Bengali',    nativeName: 'বাংলা',       script: 'Bengali',    flag: '🇮🇳', mixName: 'Benglish', popular: false, region: 'indian' },
  { code: 'gu', name: 'Gujarati',   nativeName: 'ગુજરાતી',     script: 'Gujarati',   flag: '🇮🇳', mixName: 'Gujlish',  popular: false, region: 'indian' },
  { code: 'pa', name: 'Punjabi',    nativeName: 'ਪੰਜਾਬੀ',      script: 'Gurmukhi',   flag: '🇮🇳', mixName: 'Punglish', popular: false, region: 'indian' },
  { code: 'or', name: 'Odia',       nativeName: 'ଓଡ଼ିଆ',       script: 'Odia',       flag: '🇮🇳', popular: false, region: 'indian' },
  { code: 'as', name: 'Assamese',   nativeName: 'অસમীয়া',     script: 'Bengali',    flag: '🇮🇳', popular: false, region: 'indian' },
  { code: 'ur', name: 'Urdu',       nativeName: 'اردو',        script: 'Arabic',     flag: '🇵🇰', mixName: 'Urglish',  popular: false, region: 'indian' },
  { code: 'sa', name: 'Sanskrit',   nativeName: 'संस्कृतम्',    script: 'Devanagari', flag: '🇮🇳', popular: false, region: 'indian' },
  { code: 'ne', name: 'Nepali',     nativeName: 'नेपाली',      script: 'Devanagari', flag: '🇳🇵', popular: false, region: 'indian' },
  { code: 'si', name: 'Sinhala',    nativeName: 'සිංහල',       script: 'Sinhala',    flag: '🇱🇰', popular: false, region: 'indian' },
  { code: 'ks', name: 'Kashmiri',   nativeName: 'कॉशुर',       script: 'Arabic',     flag: '🇮🇳', popular: false, region: 'indian' },
  { code: 'doi', name: 'Dogri',     nativeName: 'डोगरी',       script: 'Devanagari', flag: '🇮🇳', popular: false, region: 'indian' },
  { code: 'kok', name: 'Konkani',   nativeName: 'कोंकणी',      script: 'Devanagari', flag: '🇮🇳', popular: false, region: 'indian' },
  { code: 'mni', name: 'Manipuri',  nativeName: 'മৈতৈলোন্',    script: 'Meetei Mayek', flag: '🇮🇳', popular: false, region: 'indian' },
  { code: 'sat', name: 'Santali',   nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ',     script: 'Ol Chiki',   flag: '🇮🇳', popular: false, region: 'indian' },
  { code: 'sd', name: 'Sindhi',     nativeName: 'سنڌي',        script: 'Arabic',     flag: '🇮🇳', popular: false, region: 'indian' },
  { code: 'mai', name: 'Maithili',  nativeName: 'मैथिली',       script: 'Devanagari', flag: '🇮🇳', popular: false, region: 'indian' },
  { code: 'bho', name: 'Bhojpuri',  nativeName: 'भोजपुरी',     script: 'Devanagari', flag: '🇮🇳', popular: false, region: 'indian' },

  // ── East Asian ──
  { code: 'zh', name: 'Chinese (Mandarin)', nativeName: '中文',        script: 'Han',       flag: '🇨🇳', popular: true,  region: 'east-asian' },
  { code: 'ja', name: 'Japanese',           nativeName: '日本語',      script: 'Kanji/Kana', flag: '🇯🇵', popular: true,  region: 'east-asian' },
  { code: 'ko', name: 'Korean',             nativeName: '한국어',      script: 'Hangul',    flag: '🇰🇷', popular: true,  region: 'east-asian' },
  { code: 'yue', name: 'Cantonese',         nativeName: '廣東話',      script: 'Han',       flag: '🇭🇰', popular: false, region: 'east-asian' },
  { code: 'mn', name: 'Mongolian',          nativeName: 'Монгол',     script: 'Cyrillic',  flag: '🇲🇳', popular: false, region: 'east-asian' },

  // ── Southeast Asian ──
  { code: 'th', name: 'Thai',       nativeName: 'ไทย',        script: 'Thai',       flag: '🇹🇭', popular: false, region: 'southeast-asian' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', script: 'Latin',      flag: '🇻🇳', popular: false, region: 'southeast-asian' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', script: 'Latin', flag: '🇮🇩', popular: false, region: 'southeast-asian' },
  { code: 'ms', name: 'Malay',      nativeName: 'Bahasa Melayu',   script: 'Latin', flag: '🇲🇾', popular: false, region: 'southeast-asian' },
  { code: 'fil', name: 'Filipino',  nativeName: 'Filipino',   script: 'Latin',      flag: '🇵🇭', mixName: 'Taglish', popular: false, region: 'southeast-asian' },
  { code: 'my', name: 'Burmese',    nativeName: 'မြန်မာ',      script: 'Myanmar',    flag: '🇲🇲', popular: false, region: 'southeast-asian' },
  { code: 'km', name: 'Khmer',      nativeName: 'ខ្មែរ',       script: 'Khmer',      flag: '🇰🇭', popular: false, region: 'southeast-asian' },
  { code: 'lo', name: 'Lao',        nativeName: 'ລາວ',        script: 'Lao',        flag: '🇱🇦', popular: false, region: 'southeast-asian' },

  // ── Middle Eastern ──
  { code: 'ar', name: 'Arabic',     nativeName: 'العربية',     script: 'Arabic',     flag: '🇸🇦', popular: true,  region: 'middle-eastern' },
  { code: 'fa', name: 'Persian',    nativeName: 'فارسی',       script: 'Arabic',     flag: '🇮🇷', popular: false, region: 'middle-eastern' },
  { code: 'tr', name: 'Turkish',    nativeName: 'Türkçe',      script: 'Latin',      flag: '🇹🇷', popular: true,  region: 'middle-eastern' },
  { code: 'he', name: 'Hebrew',     nativeName: 'עברית',       script: 'Hebrew',     flag: '🇮🇱', popular: false, region: 'middle-eastern' },
  { code: 'ku', name: 'Kurdish',    nativeName: 'Kurdî',       script: 'Latin/Arabic', flag: '🇮🇶', popular: false, region: 'middle-eastern' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', script: 'Latin',      flag: '🇦🇿', popular: false, region: 'middle-eastern' },
  { code: 'uz', name: 'Uzbek',      nativeName: 'Oʻzbek',     script: 'Latin',      flag: '🇺🇿', popular: false, region: 'middle-eastern' },
  { code: 'ps', name: 'Pashto',     nativeName: 'پښتو',        script: 'Arabic',     flag: '🇦🇫', popular: false, region: 'middle-eastern' },

  // ── European ──
  { code: 'en', name: 'English',     nativeName: 'English',     script: 'Latin',     flag: '🇺🇸', popular: true,  region: 'european' },
  { code: 'es', name: 'Spanish',     nativeName: 'Español',     script: 'Latin',     flag: '🇪🇸', popular: true,  region: 'european' },
  { code: 'fr', name: 'French',      nativeName: 'Français',    script: 'Latin',     flag: '🇫🇷', popular: true,  region: 'european' },
  { code: 'de', name: 'German',      nativeName: 'Deutsch',     script: 'Latin',     flag: '🇩🇪', popular: true,  region: 'european' },
  { code: 'pt', name: 'Portuguese',  nativeName: 'Português',   script: 'Latin',     flag: '🇧🇷', popular: true,  region: 'european' },
  { code: 'it', name: 'Italian',     nativeName: 'Italiano',    script: 'Latin',     flag: '🇮🇹', popular: false, region: 'european' },
  { code: 'ru', name: 'Russian',     nativeName: 'Русский',     script: 'Cyrillic',  flag: '🇷🇺', popular: true,  region: 'european' },
  { code: 'pl', name: 'Polish',      nativeName: 'Polski',      script: 'Latin',     flag: '🇵🇱', popular: false, region: 'european' },
  { code: 'uk', name: 'Ukrainian',   nativeName: 'Українська',  script: 'Cyrillic',  flag: '🇺🇦', popular: false, region: 'european' },
  { code: 'nl', name: 'Dutch',       nativeName: 'Nederlands',  script: 'Latin',     flag: '🇳🇱', popular: false, region: 'european' },
  { code: 'ro', name: 'Romanian',    nativeName: 'Română',      script: 'Latin',     flag: '🇷🇴', popular: false, region: 'european' },
  { code: 'cs', name: 'Czech',       nativeName: 'Čeština',     script: 'Latin',     flag: '🇨🇿', popular: false, region: 'european' },
  { code: 'el', name: 'Greek',       nativeName: 'Ελληνικά',    script: 'Greek',     flag: '🇬🇷', popular: false, region: 'european' },
  { code: 'sv', name: 'Swedish',     nativeName: 'Svenska',     script: 'Latin',     flag: '🇸🇪', popular: false, region: 'european' },
  { code: 'da', name: 'Danish',      nativeName: 'Dansk',       script: 'Latin',     flag: '🇩🇰', popular: false, region: 'european' },
  { code: 'no', name: 'Norwegian',   nativeName: 'Norsk',       script: 'Latin',     flag: '🇳🇴', popular: false, region: 'european' },
  { code: 'fi', name: 'Finnish',     nativeName: 'Suomi',       script: 'Latin',     flag: '🇫🇮', popular: false, region: 'european' },
  { code: 'hu', name: 'Hungarian',   nativeName: 'Magyar',      script: 'Latin',     flag: '🇭🇺', popular: false, region: 'european' },
  { code: 'sk', name: 'Slovak',      nativeName: 'Slovenčina',  script: 'Latin',     flag: '🇸🇰', popular: false, region: 'european' },
  { code: 'bg', name: 'Bulgarian',   nativeName: 'Български',   script: 'Cyrillic',  flag: '🇧🇬', popular: false, region: 'european' },
  { code: 'hr', name: 'Croatian',    nativeName: 'Hrvatski',    script: 'Latin',     flag: '🇭🇷', popular: false, region: 'european' },
  { code: 'sr', name: 'Serbian',     nativeName: 'Српски',      script: 'Cyrillic',  flag: '🇷🇸', popular: false, region: 'european' },
  { code: 'lt', name: 'Lithuanian',  nativeName: 'Lietuvių',    script: 'Latin',     flag: '🇱🇹', popular: false, region: 'european' },
  { code: 'lv', name: 'Latvian',     nativeName: 'Latviešu',    script: 'Latin',     flag: '🇱🇻', popular: false, region: 'european' },
  { code: 'et', name: 'Estonian',    nativeName: 'Eesti',       script: 'Latin',     flag: '🇪🇪', popular: false, region: 'european' },
  { code: 'sl', name: 'Slovenian',   nativeName: 'Slovenščina', script: 'Latin',     flag: '🇸🇮', popular: false, region: 'european' },
  { code: 'is', name: 'Icelandic',   nativeName: 'Íslenska',    script: 'Latin',     flag: '🇮🇸', popular: false, region: 'european' },
  { code: 'ga', name: 'Irish',       nativeName: 'Gaeilge',     script: 'Latin',     flag: '🇮🇪', popular: false, region: 'european' },
  { code: 'ca', name: 'Catalan',     nativeName: 'Català',      script: 'Latin',     flag: '🇪🇸', popular: false, region: 'european' },
  { code: 'eu', name: 'Basque',      nativeName: 'Euskara',     script: 'Latin',     flag: '🇪🇸', popular: false, region: 'european' },
  { code: 'gl', name: 'Galician',    nativeName: 'Galego',      script: 'Latin',     flag: '🇪🇸', popular: false, region: 'european' },
  { code: 'sq', name: 'Albanian',    nativeName: 'Shqip',       script: 'Latin',     flag: '🇦🇱', popular: false, region: 'european' },
  { code: 'mk', name: 'Macedonian',  nativeName: 'Македонски',  script: 'Cyrillic',  flag: '🇲🇰', popular: false, region: 'european' },
  { code: 'bs', name: 'Bosnian',     nativeName: 'Bosanski',    script: 'Latin',     flag: '🇧🇦', popular: false, region: 'european' },
  { code: 'mt', name: 'Maltese',     nativeName: 'Malti',       script: 'Latin',     flag: '🇲🇹', popular: false, region: 'european' },
  { code: 'cy', name: 'Welsh',       nativeName: 'Cymraeg',     script: 'Latin',     flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', popular: false, region: 'european' },
  { code: 'ka', name: 'Georgian',    nativeName: 'ქართული',     script: 'Georgian',  flag: '🇬🇪', popular: false, region: 'european' },
  { code: 'hy', name: 'Armenian',    nativeName: 'Հայերեն',     script: 'Armenian',  flag: '🇦🇲', popular: false, region: 'european' },
  { code: 'be', name: 'Belarusian',  nativeName: 'Беларуская',  script: 'Cyrillic',  flag: '🇧🇾', popular: false, region: 'european' },
  { code: 'kk', name: 'Kazakh',     nativeName: 'Қазақ',       script: 'Cyrillic',  flag: '🇰🇿', popular: false, region: 'european' },

  // ── African ──
  { code: 'sw', name: 'Swahili',    nativeName: 'Kiswahili',   script: 'Latin',     flag: '🇹🇿', popular: false, region: 'african' },
  { code: 'am', name: 'Amharic',    nativeName: 'አማርኛ',        script: 'Ethiopic',  flag: '🇪🇹', popular: false, region: 'african' },
  { code: 'ha', name: 'Hausa',      nativeName: 'Hausa',       script: 'Latin',     flag: '🇳🇬', popular: false, region: 'african' },
  { code: 'yo', name: 'Yoruba',     nativeName: 'Yorùbá',      script: 'Latin',     flag: '🇳🇬', popular: false, region: 'african' },
  { code: 'ig', name: 'Igbo',       nativeName: 'Igbo',        script: 'Latin',     flag: '🇳🇬', popular: false, region: 'african' },
  { code: 'zu', name: 'Zulu',       nativeName: 'isiZulu',     script: 'Latin',     flag: '🇿🇦', popular: false, region: 'african' },
  { code: 'xh', name: 'Xhosa',     nativeName: 'isiXhosa',    script: 'Latin',     flag: '🇿🇦', popular: false, region: 'african' },
  { code: 'af', name: 'Afrikaans',  nativeName: 'Afrikaans',   script: 'Latin',     flag: '🇿🇦', popular: false, region: 'african' },
  { code: 'so', name: 'Somali',     nativeName: 'Soomaali',    script: 'Latin',     flag: '🇸🇴', popular: false, region: 'african' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', script: 'Latin',   flag: '🇷🇼', popular: false, region: 'african' },
  { code: 'mg', name: 'Malagasy',   nativeName: 'Malagasy',    script: 'Latin',     flag: '🇲🇬', popular: false, region: 'african' },
  { code: 'sn', name: 'Shona',      nativeName: 'chiShona',    script: 'Latin',     flag: '🇿🇼', popular: false, region: 'african' },
];

export const REGION_LABELS: Record<string, string> = {
  'indian': '🇮🇳 Indian Languages',
  'east-asian': '🌏 East Asian',
  'southeast-asian': '🌴 Southeast Asian',
  'middle-eastern': '🕌 Middle Eastern',
  'european': '🌍 European',
  'african': '🌍 African',
  'american': '🌎 Americas',
  'other': '🌐 Other',
};

// ─── Output Mode Types ───
export type OutputMode = 'NATIVE' | 'ROMANIZED_MIX' | 'ENGLISH' | 'CUSTOM';

export interface LanguageSelection {
  /** Primary language code (e.g., 'te') */
  primaryCode: string;
  /** Output mode */
  outputMode: OutputMode;
  /** Custom language code if outputMode is CUSTOM */
  customCode?: string;
}

/**
 * Build the LanguageMode string to pass to geminiService.
 * This maps the new selection to legacy LanguageMode or a dynamic instruction key.
 */
export function buildLanguageMode(sel: LanguageSelection): string {
  const lang = LANGUAGES.find(l => l.code === sel.primaryCode);
  if (!lang) return 'AUTO';

  switch (sel.outputMode) {
    case 'NATIVE':
      // Map to legacy codes where they exist
      if (lang.code === 'hi') return 'HINDI';
      if (lang.code === 'te') return 'PURE_TELUGU';
      if (lang.code === 'ta') return 'TAMIL';
      if (lang.code === 'kn') return 'KANNADA';
      if (lang.code === 'mr') return 'MARATHI';
      if (lang.code === 'en') return 'ENGLISH';
      // For all other languages, return dynamic key
      return `NATIVE_${lang.code.toUpperCase()}`;
    case 'ROMANIZED_MIX':
      if (lang.code === 'te') return 'TELGLISH';
      if (lang.code === 'hi') return 'HINGLISH';
      return `MIX_${lang.code.toUpperCase()}`;
    case 'ENGLISH':
      return 'ENGLISH';
    case 'CUSTOM':
      const custom = LANGUAGES.find(l => l.code === sel.customCode);
      if (custom) return `NATIVE_${custom.code.toUpperCase()}`;
      return 'AUTO';
    default:
      return 'AUTO';
  }
}

/**
 * Generate a dynamic Gemini instruction for any language+mode combo.
 * This replaces hardcoded constants for new languages.
 */
export function generateLanguageInstruction(sel: LanguageSelection): string {
  const lang = LANGUAGES.find(l => l.code === sel.primaryCode);
  if (!lang) return '';

  switch (sel.outputMode) {
    case 'NATIVE':
      return `
**STRICT LANGUAGE RULE: ${lang.name.toUpperCase()} ONLY**
- Generate captions fully in ${lang.name} (${lang.nativeName}, ${lang.script} script).
- Translate any English or other language words into natural, conversational ${lang.name}.
- Keep tone culturally accurate and relatable for a ${lang.name}-speaking audience.
- Keep captions energetic and creator-friendly for Instagram Reels / YouTube Shorts.
`;
    case 'ROMANIZED_MIX':
      const mixLabel = lang.mixName || `${lang.name}lish`;
      return `
**STRICT LANGUAGE RULE: ${mixLabel.toUpperCase()} (${lang.name} + English)**
- Generate captions for ${lang.name} speech using the English/Latin script (romanized).
- Mix ${lang.name} words with simple, trendy English words naturally.
- Keep it relatable, energetic, and creator-friendly for Instagram/Reels.
- Use romanization for ${lang.name} words so all audiences can read them.
`;
    case 'ENGLISH':
      return `
**STRICT LANGUAGE RULE: ENGLISH ONLY**
- Generate captions fully in simple, clear English.
- If the speaker is using ${lang.name} or other languages, translate them into punchy, reel-friendly English.
- Use short sentences and high-impact vocabulary.
`;
    case 'CUSTOM': {
      const target = LANGUAGES.find(l => l.code === sel.customCode);
      if (!target) return '';
      return `
**STRICT LANGUAGE RULE: TRANSLATE TO ${target.name.toUpperCase()}**
- The audio is in ${lang.name}. Translate ALL captions into ${target.name} (${target.nativeName}, ${target.script} script).
- Ensure translations are natural, culturally accurate, and conversational.
- Keep captions short and suitable for video subtitles.
`;
    }
    default:
      return '';
  }
}
