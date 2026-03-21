import React, { useState } from 'react';
import { Sparkles, Wand2, Lightbulb, Check, Loader2, Save, Trash2, FolderOpen } from 'lucide-react';
import { THEME_PRESETS, ThemePreset, generateAIStyleSuggestion, generateHookSuggestions, AIStyleSuggestion } from '../services/aiStyleService';
import { TemplateManager, CaptionTemplate } from '../services/TemplateManager';
import { Caption, CaptionStyle, EntryAnimation, ExitAnimation, WordHighlightMode, TextAlign } from '../types';

interface ThemePresetsPanelProps {
  captions: Caption[];
  // Current style setters
  onApplyTheme: (preset: ThemePreset) => void;
  // AI auto-style
  onApplyAIStyle: (suggestion: AIStyleSuggestion) => void;
  // Template system
  currentConfig: Omit<CaptionTemplate, 'id' | 'name' | 'createdAt'>;
  onApplyTemplate: (template: CaptionTemplate) => void;
}

const ThemePresetsPanel: React.FC<ThemePresetsPanelProps> = ({
  captions,
  onApplyTheme,
  onApplyAIStyle,
  currentConfig,
  onApplyTemplate,
}) => {
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AIStyleSuggestion | null>(null);
  const [hookTexts, setHookTexts] = useState<string[]>([]);
  const [isLoadingHooks, setIsLoadingHooks] = useState(false);
  const [templates, setTemplates] = useState<CaptionTemplate[]>(TemplateManager.loadTemplates());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [activeSection, setActiveSection] = useState<'themes' | 'ai' | 'templates'>('themes');

  const handleApplyTheme = (preset: ThemePreset) => {
    setActiveThemeId(preset.id);
    onApplyTheme(preset);
  };

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
    <div className="space-y-4 p-4">
      {/* Section Switcher */}
      <div className="flex bg-gray-900 rounded-xl p-1 gap-1">
        {([
          { id: 'themes', label: '🎭 Themes', },
          { id: 'ai', label: '🤖 AI Style' },
          { id: 'templates', label: '💾 Templates' },
        ] as const).map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              activeSection === sec.id
                ? 'bg-gray-700 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* THEMES SECTION */}
      {activeSection === 'themes' && (
        <div className="space-y-3">
          <p className="text-[10px] text-gray-500 text-center">
            One-click theme presets for instant style transformation
          </p>
          <div className="space-y-2">
            {THEME_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => handleApplyTheme(preset)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all group ${
                  activeThemeId === preset.id
                    ? 'bg-blue-600/15 border-blue-500/50 shadow-lg shadow-blue-500/10'
                    : 'bg-gray-900 border-gray-800 hover:border-gray-600 hover:bg-gray-800/50'
                }`}
              >
                <span className="text-2xl flex-shrink-0">{preset.icon}</span>
                <div className="text-left flex-1 min-w-0">
                  <div className={`text-sm font-black ${
                    activeThemeId === preset.id ? 'text-blue-300' : 'text-gray-300'
                  }`}>
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">{preset.description}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-black/40 text-gray-600 font-bold uppercase">
                    {preset.entryAnimation.replace('_', ' ')}
                  </span>
                </div>
                {activeThemeId === preset.id && (
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI SECTION */}
      {activeSection === 'ai' && (
        <div className="space-y-4">
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
                <>
                  <Loader2 size={16} className="animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Auto-Style with AI
                </>
              )}
            </button>
            {captions.length === 0 && (
              <p className="text-[10px] text-gray-600 text-center">Generate captions first to use AI styling</p>
            )}
            {aiSuggestion && (
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-purple-400" />
                  <span className="text-[10px] font-black text-purple-300 uppercase">AI Recommendation</span>
                </div>
                <p className="text-[11px] text-gray-300">{aiSuggestion.reasoning}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[9px] px-2 py-0.5 rounded bg-purple-800/50 text-purple-300 font-bold">{aiSuggestion.theme}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-purple-800/50 text-purple-300 font-bold">{aiSuggestion.entryAnimation}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-purple-800/50 text-purple-300 font-bold">{aiSuggestion.wordHighlight}</span>
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
                  <div key={i} className="flex items-center gap-2 p-2.5 bg-gray-900 rounded-lg border border-gray-800 group hover:border-yellow-500/30 transition-colors">
                    <span className="text-yellow-400 text-xs font-bold flex-shrink-0">{i + 1}.</span>
                    <span className="text-xs text-gray-300 flex-1">{hook}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TEMPLATES SECTION */}
      {activeSection === 'templates' && (
        <div className="space-y-4">
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
                <button onClick={handleSaveTemplate} className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-500 transition-colors">
                  Save
                </button>
                <button onClick={() => setShowSaveDialog(false)} className="px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-xs font-bold hover:bg-gray-700 transition-colors">
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
              <FolderOpen size={13} className="text-blue-400" /> Saved Templates ({templates.length})
            </div>
            {templates.length === 0 ? (
              <p className="text-[10px] text-gray-600 text-center py-4">
                No saved templates yet. Save your current style to create one.
              </p>
            ) : (
              <div className="space-y-2">
                {templates.map(tmpl => (
                  <div key={tmpl.id} className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl border border-gray-800 group hover:border-blue-500/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-gray-300 truncate">{tmpl.name}</div>
                      <div className="text-[9px] text-gray-600 mt-0.5">
                        {new Date(tmpl.createdAt).toLocaleDateString()} · {tmpl.fontFamily.split(',')[0].replace(/'/g, '')}
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
