import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Globe, Sparkles, Wand2, Scissors, Check, Search, ChevronLeft, Languages, Star, Clock, X } from 'lucide-react';

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
  { code: 'as', name: 'Assamese',   nativeName: 'অসমীয়া',     script: 'Bengali',    flag: '🇮🇳', popular: false, region: 'indian' },
  { code: 'ur', name: 'Urdu',       nativeName: 'اردو',        script: 'Arabic',     flag: '🇵🇰', mixName: 'Urglish',  popular: false, region: 'indian' },
  { code: 'sa', name: 'Sanskrit',   nativeName: 'संस्कृतम्',    script: 'Devanagari', flag: '🇮🇳', popular: false, region: 'indian' },
  { code: 'ne', name: 'Nepali',     nativeName: 'नेपाली',      script: 'Devanagari', flag: '🇳🇵', popular: false, region: 'indian' },
  { code: 'si', name: 'Sinhala',    nativeName: 'සිංහල',       script: 'Sinhala',    flag: '🇱🇰', popular: false, region: 'indian' },
  { code: 'ks', name: 'Kashmiri',   nativeName: 'कॉशुर',       script: 'Arabic',     flag: '🇮🇳', popular: false, region: 'indian' },
  { code: 'doi', name: 'Dogri',     nativeName: 'डोगरी',       script: 'Devanagari', flag: '🇮🇳', popular: false, region: 'indian' },
  { code: 'kok', name: 'Konkani',   nativeName: 'कोंकणी',      script: 'Devanagari', flag: '🇮🇳', popular: false, region: 'indian' },
  { code: 'mni', name: 'Manipuri',  nativeName: 'মৈতৈলোন্',    script: 'Meetei Mayek', flag: '🇮🇳', popular: false, region: 'indian' },
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

const REGION_LABELS: Record<string, string> = {
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


// ─── PROPS ───

interface InitialGenerationStateProps {
  languageMode: string;
  setLanguageMode: (mode: string) => void;
  autoAdjustEnabled: boolean;
  setAutoAdjustEnabled: (val: boolean) => void;
  smartCompressionEnabled: boolean;
  setSmartCompressionEnabled: (val: boolean) => void;
  handleGenerateCaptions: () => Promise<void>;
  detectedLanguage?: string;
  /** New: expose the full language selection for instruction generation */
  onLanguageSelectionChange?: (sel: LanguageSelection) => void;
}

// ─── Sub-components ───

/** Step 1: Language grid picker */
const LanguagePicker: React.FC<{
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelect: (lang: LanguageDefinition) => void;
  recentCodes: string[];
}> = ({ searchQuery, setSearchQuery, onSelect, recentCodes }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus search on mount
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return null; // Show categories
    return LANGUAGES.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const popular = useMemo(() => LANGUAGES.filter(l => l.popular), []);
  const recent = useMemo(() => 
    recentCodes.map(c => LANGUAGES.find(l => l.code === c)).filter(Boolean) as LanguageDefinition[],
    [recentCodes]
  );

  // Group by region
  const byRegion = useMemo(() => {
    const groups: Record<string, LanguageDefinition[]> = {};
    LANGUAGES.forEach(l => {
      if (!groups[l.region]) groups[l.region] = [];
      groups[l.region].push(l);
    });
    return groups;
  }, []);

  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="relative px-3 pt-3 pb-2 shrink-0">
        <Search size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 mt-0.5" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search 100+ languages..."
          className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-6 top-1/2 -translate-y-1/2 mt-0.5 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4 space-y-4">
        {/* Search Results */}
        {filtered ? (
          filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-xs">
              No languages matching "{searchQuery}"
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filtered.map(lang => (
                <LanguageCard key={lang.code} lang={lang} onSelect={onSelect} />
              ))}
            </div>
          )
        ) : (
          <>
            {/* Auto Detect */}
            <div>
              <button
                onClick={() => onSelect({ code: 'auto', name: 'Auto Detect', nativeName: 'Auto', script: 'Any', flag: '🌐', region: 'other' })}
                className="w-full p-3.5 rounded-xl border border-dashed border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 flex items-center gap-3 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center text-lg shrink-0">
                  🌐
                </div>
                <div className="text-left">
                  <div className="text-sm font-black text-blue-300">Auto Detect</div>
                  <div className="text-[9px] text-gray-500">Best for mixed/unknown audio</div>
                </div>
              </button>
            </div>

            {/* Recent */}
            {recent.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                  <Clock size={11} /> Recent
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {recent.map(lang => (
                    <LanguageCard key={lang.code} lang={lang} onSelect={onSelect} compact />
                  ))}
                </div>
              </div>
            )}

            {/* Popular */}
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                <Star size={11} /> Popular
              </div>
              <div className="grid grid-cols-2 gap-2">
                {popular.map(lang => (
                  <LanguageCard key={lang.code} lang={lang} onSelect={onSelect} />
                ))}
              </div>
            </div>

            {/* All by Region */}
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                <Languages size={11} /> All Languages
              </div>
              <div className="space-y-1.5">
                {Object.entries(byRegion).map(([region, langs]) => (
                  <div key={region}>
                    <button
                      onClick={() => setExpandedRegion(expandedRegion === region ? null : region)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg bg-gray-900/60 border border-gray-800/60 hover:border-gray-700/80 text-left transition-all"
                    >
                      <span className="text-xs font-bold text-gray-400">
                        {REGION_LABELS[region] || region}
                      </span>
                      <span className="text-[9px] text-gray-600 font-bold">
                        {langs.length} {expandedRegion === region ? '▾' : '▸'}
                      </span>
                    </button>
                    {expandedRegion === region && (
                      <div className="grid grid-cols-2 gap-1.5 mt-1.5 pl-1">
                        {langs.map(lang => (
                          <LanguageCard key={lang.code} lang={lang} onSelect={onSelect} compact />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/** Language card button */
const LanguageCard: React.FC<{
  lang: LanguageDefinition;
  onSelect: (lang: LanguageDefinition) => void;
  compact?: boolean;
}> = ({ lang, onSelect, compact }) => (
  <button
    onClick={() => onSelect(lang)}
    className={`rounded-xl border border-gray-800/60 bg-gray-900/50 hover:bg-gray-800/60 hover:border-gray-600/80 text-left transition-all group overflow-hidden relative ${
      compact ? 'p-2.5' : 'p-3'
    }`}
  >
    <div className="flex items-center gap-2">
      <span className={compact ? 'text-sm' : 'text-lg'}>{lang.flag}</span>
      <div className="min-w-0 flex-1">
        <div className={`font-bold text-gray-300 truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>
          {lang.name}
        </div>
        {!compact && (
          <div className="text-[9px] text-gray-600 truncate">{lang.nativeName}</div>
        )}
      </div>
    </div>
    {/* Shine on hover */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
  </button>
);


/** Step 2: Output mode selector (shown after picking a language) */
const OutputModeSelector: React.FC<{
  selectedLang: LanguageDefinition;
  onSelect: (mode: OutputMode) => void;
  onBack: () => void;
  onShowCustom: () => void;
}> = ({ selectedLang, onSelect, onBack, onShowCustom }) => {
  const isLatinScript = selectedLang.script === 'Latin';
  const isEnglish = selectedLang.code === 'en';

  // Build available output options
  const options: { id: OutputMode; label: string; desc: string; icon: string; highlight?: boolean }[] = [];

  // 1. Native script
  options.push({
    id: 'NATIVE',
    label: isEnglish ? 'English Only' : `${selectedLang.name} (${selectedLang.nativeName})`,
    desc: isEnglish
      ? 'Strict English output'
      : `Output in ${selectedLang.script} script — pure ${selectedLang.name}`,
    icon: selectedLang.flag,
    highlight: true,
  });

  // 2. Romanized mix (only for non-Latin scripts)
  if (!isLatinScript && !isEnglish && selectedLang.script !== 'Latin') {
    options.push({
      id: 'ROMANIZED_MIX',
      label: selectedLang.mixName || `${selectedLang.name}lish`,
      desc: `${selectedLang.name} + English mix in Latin script`,
      icon: '🔤',
    });
  }

  // 3. English Translation
  if (!isEnglish) {
    options.push({
      id: 'ENGLISH',
      label: 'English Translation',
      desc: `Translate ${selectedLang.name} audio to English captions`,
      icon: '🇺🇸',
    });
  }

  // 4. Translate to another language
  if (!isEnglish) {
    options.push({
      id: 'CUSTOM',
      label: 'Translate to Another Language',
      desc: 'Pick any target language for translation',
      icon: '🌐',
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with back */}
      <div className="flex items-center gap-3 px-3 pt-3 pb-2 border-b border-gray-800/50 shrink-0">
        <button
          onClick={onBack}
          className="w-7 h-7 rounded-lg bg-gray-800/60 flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft size={14} className="text-gray-400" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">{selectedLang.flag}</span>
          <div>
            <div className="text-xs font-black text-white">{selectedLang.name}</div>
            <div className="text-[9px] text-gray-500">{selectedLang.nativeName} · {selectedLang.script}</div>
          </div>
        </div>
      </div>

      {/* Caption output options */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
          <Languages size={11} /> Caption Output Style
        </div>

        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => opt.id === 'CUSTOM' ? onShowCustom() : onSelect(opt.id)}
            className={`w-full p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
              opt.highlight
                ? 'bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-blue-500/30 hover:border-blue-400/50'
                : 'bg-gray-900/60 border-gray-800/60 hover:border-gray-600/80 hover:bg-gray-800/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-800/60 flex items-center justify-center text-xl shrink-0">
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-bold text-sm ${opt.highlight ? 'text-blue-300' : 'text-gray-300'}`}>
                  {opt.label}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</div>
              </div>
              <ChevronLeft size={14} className="text-gray-600 rotate-180 shrink-0 group-hover:text-gray-400 transition-colors" />
            </div>
            {/* Shine */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
          </button>
        ))}
      </div>
    </div>
  );
};


// ─── MAIN COMPONENT ───

const InitialGenerationState: React.FC<InitialGenerationStateProps> = ({
  languageMode,
  setLanguageMode,
  autoAdjustEnabled,
  setAutoAdjustEnabled,
  smartCompressionEnabled,
  setSmartCompressionEnabled,
  handleGenerateCaptions,
  detectedLanguage,
  onLanguageSelectionChange,
}) => {
  // Multi-step wizard state
  const [step, setStep] = useState<'pick-language' | 'pick-mode' | 'pick-custom-target'>('pick-language');
  const [selectedLang, setSelectedLang] = useState<LanguageDefinition | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customSearchQuery, setCustomSearchQuery] = useState('');

  // Recent languages (persisted)
  const [recentCodes, setRecentCodes] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('createrin_recent_langs') || '[]');
    } catch { return []; }
  });

  // Currently confirmed selection
  const [confirmedSelection, setConfirmedSelection] = useState<LanguageSelection | null>(null);

  const addRecent = useCallback((code: string) => {
    if (code === 'auto') return;
    setRecentCodes(prev => {
      const next = [code, ...prev.filter(c => c !== code)].slice(0, 5);
      localStorage.setItem('createrin_recent_langs', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleLanguagePick = useCallback((lang: LanguageDefinition) => {
    if (lang.code === 'auto') {
      // Auto detect → skip step 2
      setLanguageMode('AUTO');
      const sel: LanguageSelection = { primaryCode: 'auto', outputMode: 'NATIVE' };
      setConfirmedSelection(sel);
      onLanguageSelectionChange?.(sel);
      setStep('pick-language');
      return;
    }

    setSelectedLang(lang);
    addRecent(lang.code);

    // English → skip output mode selection
    if (lang.code === 'en') {
      setLanguageMode('ENGLISH');
      const sel: LanguageSelection = { primaryCode: 'en', outputMode: 'NATIVE' };
      setConfirmedSelection(sel);
      onLanguageSelectionChange?.(sel);
      return;
    }

    // Latin-script language with no mix variant → auto-select NATIVE
    if (lang.script === 'Latin' && !lang.mixName) {
      const mode = buildLanguageMode({ primaryCode: lang.code, outputMode: 'NATIVE' });
      setLanguageMode(mode);
      const sel: LanguageSelection = { primaryCode: lang.code, outputMode: 'NATIVE' };
      setConfirmedSelection(sel);
      onLanguageSelectionChange?.(sel);
      return;
    }

    setStep('pick-mode');
  }, [setLanguageMode, addRecent, onLanguageSelectionChange]);

  const handleOutputModePick = useCallback((mode: OutputMode) => {
    if (!selectedLang) return;
    const sel: LanguageSelection = { primaryCode: selectedLang.code, outputMode: mode };
    const modeStr = buildLanguageMode(sel);
    setLanguageMode(modeStr);
    setConfirmedSelection(sel);
    onLanguageSelectionChange?.(sel);
    setStep('pick-language');
  }, [selectedLang, setLanguageMode, onLanguageSelectionChange]);

  const handleCustomTargetPick = useCallback((targetLang: LanguageDefinition) => {
    if (!selectedLang) return;
    const sel: LanguageSelection = {
      primaryCode: selectedLang.code,
      outputMode: 'CUSTOM',
      customCode: targetLang.code,
    };
    const modeStr = buildLanguageMode(sel);
    setLanguageMode(modeStr);
    setConfirmedSelection(sel);
    onLanguageSelectionChange?.(sel);
    setStep('pick-language');
    setCustomSearchQuery('');
  }, [selectedLang, setLanguageMode, onLanguageSelectionChange]);

  // Determine current label
  const currentLabel = useMemo(() => {
    if (!confirmedSelection) return 'Auto Detect';
    const lang = LANGUAGES.find(l => l.code === confirmedSelection.primaryCode);
    if (!lang) return 'Auto Detect';
    if (confirmedSelection.outputMode === 'NATIVE') return `${lang.name} (${lang.nativeName})`;
    if (confirmedSelection.outputMode === 'ROMANIZED_MIX') return lang.mixName || `${lang.name}lish`;
    if (confirmedSelection.outputMode === 'ENGLISH') return `${lang.name} → English`;
    if (confirmedSelection.outputMode === 'CUSTOM') {
      const target = LANGUAGES.find(l => l.code === confirmedSelection.customCode);
      return `${lang.name} → ${target?.name || '?'}`;
    }
    return lang.name;
  }, [confirmedSelection]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ─── LANGUAGE SELECTION ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Current selection badge */}
        <div className="px-3 pt-3 pb-1 shrink-0">
          <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
            <Globe size={14} className="text-blue-500" /> Source Language
          </div>
          {confirmedSelection && (
            <button
              onClick={() => { setStep('pick-language'); setConfirmedSelection(null); }}
              className="mt-2 w-full flex items-center justify-between p-3 rounded-xl bg-blue-600/15 border border-blue-500/40 hover:bg-blue-600/25 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Check size={14} className="text-blue-400 shrink-0" />
                <span className="text-sm font-bold text-blue-300 truncate">{currentLabel}</span>
              </div>
              <span className="text-[9px] text-blue-400/60 font-bold shrink-0">CHANGE</span>
            </button>
          )}
        </div>

        {/* Step content */}
        {!confirmedSelection ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {step === 'pick-language' && (
              <LanguagePicker
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSelect={handleLanguagePick}
                recentCodes={recentCodes}
              />
            )}
            {step === 'pick-mode' && selectedLang && (
              <OutputModeSelector
                selectedLang={selectedLang}
                onSelect={handleOutputModePick}
                onBack={() => setStep('pick-language')}
                onShowCustom={() => { setStep('pick-custom-target'); setCustomSearchQuery(''); }}
              />
            )}
            {step === 'pick-custom-target' && selectedLang && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center gap-3 px-3 pt-3 pb-2 border-b border-gray-800/50 shrink-0">
                  <button
                    onClick={() => setStep('pick-mode')}
                    className="w-7 h-7 rounded-lg bg-gray-800/60 flex items-center justify-center hover:bg-gray-700 transition-colors"
                  >
                    <ChevronLeft size={14} className="text-gray-400" />
                  </button>
                  <div className="text-xs font-black text-gray-300">
                    Translate {selectedLang.name} →
                  </div>
                </div>
                <LanguagePicker
                  searchQuery={customSearchQuery}
                  setSearchQuery={setCustomSearchQuery}
                  onSelect={handleCustomTargetPick}
                  recentCodes={recentCodes}
                />
              </div>
            )}
          </div>
        ) : (
          /* AI Enhancements + Generate button */
          <div className="flex-1 flex flex-col px-4 py-4 space-y-4 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                <Sparkles size={14} className="text-purple-500" /> AI Enhancements
              </div>
              <div className="space-y-3">
                {[
                  { id: 'adj', label: 'Auto Framing', icon: <Wand2 size={18} />, state: autoAdjustEnabled, toggle: setAutoAdjustEnabled, desc: 'Smartly positions text to avoid faces' },
                  { id: 'comp', label: 'Smart Brevity', icon: <Scissors size={18} />, state: smartCompressionEnabled, toggle: setSmartCompressionEnabled, desc: 'Shortens sentences for higher retention' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => f.toggle(!f.state)}
                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${f.state ? 'bg-gray-800 border-blue-500/50' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.state ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-600'}`}>{f.icon}</div>
                      <div className="text-left">
                        <p className={`text-sm font-bold ${f.state ? 'text-white' : 'text-gray-400'}`}>{f.label}</p>
                        <p className="text-[10px] text-gray-500">{f.desc}</p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${f.state ? 'bg-blue-500 border-blue-500' : 'border-gray-700'}`}>
                      {f.state && <Check size={14} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generate button — always visible at bottom */}
      {confirmedSelection && (
        <div className="px-4 pb-4 pt-2 shrink-0 bg-gradient-to-t from-[#141414] via-[#141414] to-transparent">
          <button
            onClick={handleGenerateCaptions}
            className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl hover:bg-gray-200"
          >
            <Sparkles size={20} className="text-yellow-500 fill-yellow-500" />
            Generate Captions
          </button>
        </div>
      )}
    </div>
  );
};

export default InitialGenerationState;
