import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Globe, Sparkles, Wand2, Scissors, Check, Search, ChevronLeft, Languages, Star, Clock, X } from 'lucide-react';

import {
  LANGUAGES,
  REGION_LABELS,
  buildLanguageMode,
  generateLanguageInstruction,
  LanguageDefinition,
  LanguageSelection,
  OutputMode
} from '../services/languageService';


// ─── PROPS ───

interface InitialGenerationStateProps {
  languageMode: string;
  setLanguageMode: (mode: string) => void;
  autoAdjustEnabled: boolean;
  setAutoAdjustEnabled: (val: boolean) => void;
  smartCompressionEnabled: boolean;
  setSmartCompressionEnabled: (val: boolean) => void;
  iconCaptionsEnabled: boolean;
  setIconCaptionsEnabled: (val: boolean) => void;
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
  iconCaptionsEnabled,
  setIconCaptionsEnabled,
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

  // Bug 3 Fix: Pre-select "Auto Detect" so the Generate button is visible by default
  const [confirmedSelection, setConfirmedSelection] = useState<LanguageSelection | null>(
    { primaryCode: 'auto', outputMode: 'NATIVE' }
  );

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
                  { id: 'comp', label: 'Smart Brevity', icon: <Scissors size={18} />, state: smartCompressionEnabled, toggle: setSmartCompressionEnabled, desc: 'Shortens sentences for higher retention' },
                  { id: 'icon', label: 'Icon Captions', icon: <Sparkles size={18} />, state: iconCaptionsEnabled, toggle: setIconCaptionsEnabled, desc: 'Replaces key words with premium icons' }
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
