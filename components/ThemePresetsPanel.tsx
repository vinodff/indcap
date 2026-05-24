import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Wand2, Lightbulb, Loader2, Save, Trash2, FolderOpen, Play, Pause, Check, Eye, Zap } from 'lucide-react';
import { THEME_PRESETS, ThemePreset, generateAIStyleSuggestion, generateHookSuggestions, AIStyleSuggestion } from '../services/aiStyleService';
import { generateViralTypographyCaptions } from '../services/geminiService';
import { TemplateManager, CaptionTemplate } from '../services/TemplateManager';
import { Caption, CaptionStyle, EntryAnimation, ViralTypographyCaption } from '../types';


interface ThemePresetsPanelProps {
  captions: Caption[];
  onApplyTheme: (preset: ThemePreset) => void;
  onApplyAIStyle: (suggestion: AIStyleSuggestion) => void;
  currentConfig: Omit<CaptionTemplate, 'id' | 'name' | 'createdAt'>;
  onApplyTemplate: (template: CaptionTemplate) => void;
  /** Called after Viral Typography generates; passes re-styled captions back to App */
  onApplyViralTypography: (viralCaptions: ViralTypographyCaption[]) => void;
}


// ─── Category filter data ───
const CATEGORIES = [
  { id: 'ALL', label: 'All', icon: '✦' },
  { id: 'HYPER', label: 'HyperCSS', icon: '🔮' },
  { id: 'Trending', label: 'Trending', icon: '🔥' },
  { id: 'Professional', label: 'Minimal', icon: '✨' },
  { id: 'Dynamic', label: 'Viral', icon: '⚡' },
  { id: 'Fun', label: 'Fun', icon: '🎨' },
  { id: 'Unique', label: 'Unique', icon: '💎' },
  { id: 'Typography', label: 'Typography', icon: '🔤' },
];



// ─── Preview Card Thumbnail ───
const TemplateThumbnail: React.FC<{ preset: ThemePreset }> = ({ preset }) => {
  const bgGradient = preset.gradientColors
    ? `linear-gradient(135deg, ${preset.gradientColors.join(', ')})`
    : `linear-gradient(135deg, ${preset.textColor}22, ${preset.textColor}44)`;

  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black shrink-0 relative overflow-hidden"
      style={{
        background: bgGradient,
        fontFamily: preset.fontFamily,
        color: preset.textColor,
        textShadow: preset.strokeWidth > 0
          ? `0 0 ${preset.strokeWidth}px ${preset.strokeColor}`
          : 'none',
      }}
    >
      <span className="relative z-10 text-lg">{preset.icon}</span>
      {/* Tiny glow */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at center, ${preset.textColor}40, transparent 70%)`,
        }}
      />
    </div>
  );
};

// ─── Main Component ───
const ThemePresetsPanel: React.FC<ThemePresetsPanelProps> = ({
  captions,
  onApplyTheme,
  onApplyAIStyle,
  currentConfig,
  onApplyTemplate,
  onApplyViralTypography,
}) => {

  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [hoveredPreset, setHoveredPreset] = useState<ThemePreset | null>(null);
  const [activeCategory, setActiveCategory] = useState('ALL');

  // AI section
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AIStyleSuggestion | null>(null);
  const [hookTexts, setHookTexts] = useState<string[]>([]);
  const [isLoadingHooks, setIsLoadingHooks] = useState(false);

  // Viral Typography section
  const [isViralTypoLoading, setIsViralTypoLoading] = useState(false);
  const [viralTypoResult, setViralTypoResult] = useState<ViralTypographyCaption[] | null>(null);
  const [viralTypoError, setViralTypoError] = useState<string | null>(null);

  // Template saving
  const [templates, setTemplates] = useState<CaptionTemplate[]>(TemplateManager.loadTemplates());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Active section toggle
  const [activeSection, setActiveSection] = useState<'browse' | 'ai' | 'saved'>('browse');



  // Filter presets
  const filteredPresets = useMemo(() => {
    if (activeCategory === 'ALL') return THEME_PRESETS;
    return THEME_PRESETS.filter(p => p.category === activeCategory);
  }, [activeCategory]);

  const handleHover = useCallback((preset: ThemePreset) => {
    setHoveredPreset(preset);
  }, []);

  const handleSelect = useCallback((preset: ThemePreset) => {
    setActiveThemeId(preset.id);
    onApplyTheme(preset);
  }, [onApplyTheme]);

  const handleAIStyle = async () => {
    if (captions.length === 0) return;
    setIsAISuggesting(true);
    setAiSuggestion(null);
    try {
      const suggestion = await generateAIStyleSuggestion(captions);
      setAiSuggestion(suggestion);
      onApplyAIStyle(suggestion);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAISuggesting(false);
    }
  };

  const handleGenerateHooks = async () => {
    if (captions.length === 0) return;
    setIsLoadingHooks(true);
    try {
      const hooks = await generateHookSuggestions(captions);
      setHookTexts(hooks);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHooks(false);
    }
  };

  const handleViralTypography = async () => {
    if (captions.length === 0) return;
    setIsViralTypoLoading(true);
    setViralTypoResult(null);
    setViralTypoError(null);
    try {
      const result = await generateViralTypographyCaptions(captions);
      setViralTypoResult(result);
      onApplyViralTypography(result);
    } catch (e: any) {
      console.error('Viral Typography error:', e);
      setViralTypoError(e?.message ?? 'Failed to generate viral captions.');
    } finally {
      setIsViralTypoLoading(false);
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    TemplateManager.saveTemplate(templateName.trim(), currentConfig);
    setTemplates(TemplateManager.loadTemplates());
    setTemplateName('');
    setShowSaveDialog(false);
  };

  const handleDeleteTemplate = (id: string) => {
    TemplateManager.deleteTemplate(id);
    setTemplates(TemplateManager.loadTemplates());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Section Tabs */}
      <div className="flex bg-[#0d0d0d] border-b border-gray-800/60 px-2 pt-2 gap-1 shrink-0">
        {([
          { id: 'browse', label: 'Browse', icon: <Sparkles size={12} /> },
          { id: 'ai', label: 'AI Style', icon: <Wand2 size={12} /> },
          { id: 'saved', label: 'Saved', icon: <FolderOpen size={12} /> },
        ] as const).map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeSection === sec.id
                ? 'bg-[#1a1a2e] text-white border-t border-x border-blue-500/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
              }`}
          >
            {sec.icon}
            {sec.label}
          </button>
        ))}
      </div>

      {/* ─── BROWSE SECTION (Split layout) ─── */}
      {activeSection === 'browse' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Category filter chips */}
          <div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto custom-scrollbar shrink-0 bg-[#0e0e16]/80 border-b border-gray-800/40">
            {CATEGORIES.map(cat => {
              const isHyper = cat.id === 'HYPER';
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all shrink-0 ${isActive
                      ? isHyper
                        ? 'text-violet-300 border border-violet-500/60 shadow-lg shadow-violet-500/20'
                        : 'bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-lg shadow-blue-500/10'
                      : isHyper
                        ? 'bg-violet-900/30 text-violet-400 border border-violet-700/50 hover:bg-violet-800/40 hover:text-violet-300'
                        : 'bg-gray-800/40 text-gray-500 border border-gray-700/40 hover:bg-gray-700/50 hover:text-gray-300'
                    }`}
                  style={isActive && isHyper ? { background: 'rgba(139,92,246,0.25)' } : undefined}
                >
                  <span className="text-xs">{cat.icon}</span>
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Template Cards */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 space-y-1.5" onMouseLeave={() => setHoveredPreset(null)}>
              {filteredPresets.length === 0 && (
                <div className="text-center py-8 text-gray-600 text-xs">
                  No templates in this category
                </div>
              )}
              {filteredPresets.map(preset => {
                const isSelected = activeThemeId === preset.id;
                const isHovered = hoveredPreset?.id === preset.id;
                const isHyperPreset = preset.category === 'HYPER';
                return (
                  <button
                    key={preset.id}
                    onMouseEnter={() => handleHover(preset)}
                    onClick={() => handleSelect(preset)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 group relative overflow-hidden ${isSelected
                        ? isHyperPreset
                          ? 'bg-violet-600/15 border-violet-500/50 shadow-lg shadow-violet-500/10'
                          : 'bg-blue-600/15 border-blue-500/50 shadow-lg shadow-blue-500/10'
                        : isHovered
                          ? 'bg-gray-800/60 border-gray-600/60 shadow-md shadow-black/30 scale-[1.01]'
                          : isHyperPreset
                            ? 'bg-violet-950/30 border-violet-900/40 hover:bg-violet-900/30 hover:border-violet-700/50'
                            : 'bg-[#111118]/80 border-gray-800/50 hover:bg-gray-800/50 hover:border-gray-600/50'
                      }`}
                    style={{
                      transform: isHovered && !isSelected ? 'scale(1.01)' : undefined,
                      transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    {/* Hover glow overlay */}
                    {isHovered && (
                      <div
                        className="absolute inset-0 opacity-[0.06] pointer-events-none"
                        style={{
                          background: `radial-gradient(ellipse at 30% 50%, ${preset.textColor}, transparent 70%)`,
                        }}
                      />
                    )}

                    {/* Thumbnail */}
                    <TemplateThumbnail preset={preset} />

                    {/* Info */}
                    <div className="text-left flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[12px] font-black leading-tight ${isSelected
                            ? isHyperPreset ? 'text-violet-300' : 'text-blue-300'
                            : 'text-gray-200'
                          }`}>
                          {preset.name}
                        </span>
                        {isHyperPreset && (
                          <span className="text-[7px] px-1.5 py-0.5 rounded font-black uppercase tracking-wide bg-violet-500/20 text-violet-400 border border-violet-500/30 shrink-0">
                            CSS+GSAP
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-gray-500 truncate mt-0.5 leading-tight">
                        {preset.description}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-col items-end gap-1 relative z-10 shrink-0">
                      <span
                        className="text-[7px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide"
                        style={{
                          backgroundColor: `${preset.textColor}15`,
                          color: `${preset.textColor}99`,
                        }}
                      >
                        {preset.entryAnimation.replace(/_/g, ' ')}
                      </span>
                      {preset.wordHighlight !== 'NONE' && (
                        <span className="text-[7px] px-1.5 py-0.5 rounded bg-white/5 text-gray-600 font-bold uppercase tracking-wide">
                          {preset.wordHighlight}
                        </span>
                      )}
                    </div>

                    {/* Selected checkmark */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0 relative z-10">
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Bottom spacer */}
              <div className="h-4" />
            </div>
          </div>
        </div>
      )}

      {/* ─── AI SECTION ─── */}
      {activeSection === 'ai' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">

          {/* ─── Viral Typography (FIRST — most prominent) ─── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-orange-800/40 pb-2">
              <Zap size={13} className="text-orange-400" /> Viral Typography
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Transforms captions into high-retention CapCut-style segments — emotion-based fonts, animations, highlights &amp; emojis.
            </p>
            <button
              id="viral-typography-btn"
              onClick={handleViralTypography}
              disabled={isViralTypoLoading || captions.length === 0}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              style={{
                background: isViralTypoLoading
                  ? 'rgba(249,115,22,0.3)'
                  : 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
                color: '#fff',
                boxShadow: isViralTypoLoading ? 'none' : '0 4px 24px rgba(249,115,22,0.35)',
                border: '1px solid rgba(249,115,22,0.3)',
              }}
            >
              {isViralTypoLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Generating Viral Captions…</>
              ) : (
                <><Zap size={16} /> ⚡ Generate Viral Captions</>
              )}
            </button>
            {captions.length === 0 && (
              <p className="text-[10px] text-gray-600 text-center">
                Generate captions first to use Viral Typography
              </p>
            )}
            {viralTypoError && (
              <div className="text-[10px] text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg p-2.5">
                {viralTypoError}
              </div>
            )}
            {viralTypoResult && viralTypoResult.length > 0 && (
              <div className="bg-orange-900/15 border border-orange-500/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap size={12} className="text-orange-400" />
                  <span className="text-[10px] font-black text-orange-300 uppercase">
                    ✅ Applied — {viralTypoResult.length} segments styled
                  </span>
                </div>
                <div className="space-y-1">
                  {viralTypoResult.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-orange-400 text-[10px] font-bold mt-0.5 shrink-0">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-300 truncate">{item.text}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-orange-800/40 text-orange-300 font-bold">
                            {item.style.template}
                          </span>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-orange-800/40 text-orange-300 font-bold">
                            {item.style.animation.entry}
                          </span>
                          {item.style.emoji && (
                            <span className="text-[10px]">{item.style.emoji}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {viralTypoResult.length > 3 && (
                    <p className="text-[9px] text-gray-600 pl-4">+{viralTypoResult.length - 3} more segments</p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Divider */}
          <div className="border-t border-gray-800/60" />

          {/* AI Auto-Style */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">
              <Wand2 size={13} className="text-purple-400" /> AI Auto-Style
            </div>
            <button
              onClick={handleAIStyle}
              disabled={isAISuggesting || captions.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 active:scale-95 shadow-lg shadow-purple-500/20"
            >
              {isAISuggesting ? (
                <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
              ) : (
                <><Sparkles size={16} /> Auto-Style with AI</>
              )}
            </button>
            {captions.length === 0 && (
              <p className="text-[10px] text-gray-600 text-center">
                Generate captions first to use AI styling
              </p>
            )}
            {aiSuggestion && (
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-purple-400" />
                  <span className="text-[10px] font-black text-purple-300 uppercase">
                    AI Recommendation
                  </span>
                </div>
                <p className="text-[11px] text-gray-300">{aiSuggestion.reasoning}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[9px] px-2 py-0.5 rounded bg-purple-800/50 text-purple-300 font-bold">
                    {aiSuggestion.theme}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-purple-800/50 text-purple-300 font-bold">
                    {aiSuggestion.entryAnimation}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-purple-800/50 text-purple-300 font-bold">
                    {aiSuggestion.wordHighlight}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Hook Suggestions */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">
              <Lightbulb size={13} className="text-yellow-400" /> Hook Suggestions
            </div>
            <button
              onClick={handleGenerateHooks}
              disabled={isLoadingHooks || captions.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/20 active:scale-95"
            >
              {isLoadingHooks ? (
                <><Loader2 size={14} className="animate-spin" /> Generating...</>
              ) : (
                <><Lightbulb size={14} /> Generate Hook Ideas</>
              )}
            </button>
            {hookTexts.length > 0 && (
              <div className="space-y-1.5">
                {hookTexts.map((hook, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2.5 bg-gray-900 rounded-lg border border-gray-800 group hover:border-yellow-500/30 transition-colors"
                  >
                    <span className="text-yellow-400 text-xs font-bold flex-shrink-0">
                      {i + 1}.
                    </span>
                    <span className="text-xs text-gray-300 flex-1">{hook}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>
      )}

      {/* ─── SAVED SECTION ─── */}
      {activeSection === 'saved' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {/* Save Current */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">
              <Save size={13} className="text-green-400" /> Save Current Style
            </div>
            {showSaveDialog ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
                  placeholder="Template name..."
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-green-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveTemplate}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-500 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-xs font-bold hover:bg-gray-700 transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black bg-green-500/10 text-green-300 border border-green-500/30 hover:bg-green-500/20 active:scale-95 transition-all"
              >
                <Save size={14} /> Save as Template
              </button>
            )}
          </section>

          {/* Saved Templates */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">
              <FolderOpen size={13} className="text-blue-400" /> Saved Templates (
              {templates.length})
            </div>
            {templates.length === 0 ? (
              <p className="text-[10px] text-gray-600 text-center py-4">
                No saved templates yet. Save your current style to create one.
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map(tmpl => (
                  <div
                    key={tmpl.id}
                    className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl border border-gray-800 group hover:border-blue-500/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-gray-300 truncate">
                        {tmpl.name}
                      </div>
                      <div className="text-[9px] text-gray-600 mt-0.5">
                        {new Date(tmpl.createdAt).toLocaleDateString()} ·{' '}
                        {tmpl.fontFamily.split(',')[0].replace(/'/g, '')}
                      </div>
                    </div>
                    <button
                      onClick={() => onApplyTemplate(tmpl)}
                      className="px-2.5 py-1.5 bg-blue-600/20 text-blue-300 rounded-lg text-[9px] font-bold hover:bg-blue-600/40 transition-colors"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                      className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default ThemePresetsPanel;
