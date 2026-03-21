import React from 'react';
import { Type, Palette, Square, MousePointer2, AlignLeft, AlignCenter, AlignRight, ToggleLeft, ToggleRight, Check } from 'lucide-react';
import TranscriptEditor from './TranscriptEditor';
import { STYLES_CONFIG } from '../constants';
import { CaptionStyle, Caption } from '../types';
import { GRADIENT_PRESETS } from '../services/GradientTextPresets';

interface StyleCustomizerProps {
  activeTab: 'PRESETS' | 'DESIGN' | 'TRANSCRIPT';
  setActiveTab: (tab: 'PRESETS' | 'DESIGN' | 'TRANSCRIPT') => void;
  filterCategory: string;
  setFilterCategory: (cat: string) => void;
  currentStyle: string;
  selectPreset: (key: CaptionStyle) => void;
  fontFamily: string;
  setFontFamily: (val: string) => void;
  fontScale: number;
  setFontScale: (val: number) => void;
  fontWeight: string | number;
  setFontWeight: (val: string | number) => void;
  uppercase: boolean;
  setUppercase: (val: boolean) => void;
  textAlign: 'left' | 'center' | 'right';
  setTextAlign: (val: 'left' | 'center' | 'right') => void;
  textColor: string;
  setTextColor: (val: string) => void;
  strokeWidth: number;
  setStrokeWidth: (val: number) => void;
  strokeColor: string;
  setStrokeColor: (val: string) => void;
  bgEnabled: boolean;
  setBgEnabled: (val: boolean) => void;
  bgColor: string;
  setBgColor: (val: string) => void;
  bgPadding: number;
  setBgPadding: (val: number) => void;
  bgRadius: number;
  setBgRadius: (val: number) => void;
  verticalPos: number;
  setVerticalPos: (val: number) => void;
  horizontalPos: number;
  setHorizontalPos: (val: number) => void;
  captions?: Caption[];
  updateCaption?: (id: string, updates: Partial<Caption>) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

const StyleCustomizer: React.FC<StyleCustomizerProps> = ({
  activeTab,
  setActiveTab,
  filterCategory,
  setFilterCategory,
  currentStyle,
  selectPreset,
  fontFamily,
  setFontFamily,
  fontScale,
  setFontScale,
  fontWeight,
  setFontWeight,
  uppercase,
  setUppercase,
  textAlign,
  setTextAlign,
  textColor,
  setTextColor,
  strokeWidth,
  setStrokeWidth,
  strokeColor,
  setStrokeColor,
  bgEnabled,
  setBgEnabled,
  bgColor,
  setBgColor,
  bgPadding,
  setBgPadding,
  bgRadius,
  setBgRadius,
  verticalPos,
  setVerticalPos,
  horizontalPos,
  setHorizontalPos,
  captions = [],
  updateCaption,
  videoRef
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Tab Header */}
      <div className="flex border-b border-gray-800 bg-[#161616] sticky top-0 z-10">
          <button onClick={() => setActiveTab('PRESETS')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'PRESETS' ? 'text-white border-blue-500 bg-gray-800' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Templates</button>
          <button onClick={() => setActiveTab('DESIGN')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'DESIGN' ? 'text-white border-blue-500 bg-gray-800' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Customize</button>
          <button onClick={() => setActiveTab('TRANSCRIPT')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'TRANSCRIPT' ? 'text-white border-blue-500 bg-gray-800' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>Transcript</button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#121212]">
        {activeTab === 'TRANSCRIPT' ? (
           updateCaption && videoRef ? (
             <TranscriptEditor captions={captions} updateCaption={updateCaption} videoRef={videoRef} />
           ) : (
             <div className="text-gray-500 text-center text-sm p-4">Transcript data unavailable.</div>
           )
        ) : activeTab === 'PRESETS' ? (
          <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {['ALL', 'TRENDING', 'BOLD', 'VIRAL', 'NEON', 'MINIMAL', 'ART', 'GLOW', 'HIGHLIGHT', 'KINETIC', 'CUSTOM'].map(cat => (
                <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${filterCategory === cat ? 'bg-white text-black border-white' : 'bg-gray-800 text-gray-500 border-gray-700 hover:border-gray-500'}`}>{cat}</button>
              ))}
            </div>

            {/* Style Grid */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(STYLES_CONFIG)
                .filter(([_, config]) => filterCategory === 'ALL' || config.category === filterCategory)
                .map(([key, config]) => {
                  const isNew = [
                    'CAPCUT_CLASSIC','CAPCUT_BOLD_YELLOW','WORD_FIRE_POP','BOUNCE_WAVE','RAINBOW_BURST',
                    'VIRAL_WORD_SLAM','KARAOKE_FIRE','WORD_CINEMATIC','MINIMAL_WORD_FADE','GRADIENT_SHIFT',
                    'WORD_GLITTER','NEON_WORD_WAVE','WORD_SPOTLIGHT_REVEAL','WORD_SHAKE_IMPACT','WORD_OUTLINED_POP'
                  ].includes(key);
                  const sampleWord = config.displayMode === 'WORD' ? 'FIRE' : 'CAPTION';
                  const categoryColors: Record<string, string> = {
                    VIRAL: '#FF4500', TRENDING: '#1A5BFF', BOLD: '#FF0000', NEON: '#00FFFF',
                    MINIMAL: '#888', ART: '#C084FC', GLOW: '#FFD700', KINETIC: '#FF6B00',
                    HIGHLIGHT: '#22C55E', CUSTOM: '#6B7280'
                  };
                  const catColor = categoryColors[config.category] || '#888';
                  return (
                    <button key={key} onClick={() => selectPreset(key as CaptionStyle)}
                      className={`rounded-2xl border transition-all text-left group relative overflow-hidden ${
                        currentStyle === key ? 'border-blue-500 ring-1 ring-blue-500 bg-gray-800' : 'bg-gray-900 border-gray-800 hover:border-gray-600 hover:scale-[1.02]'
                      }`}
                      style={{ transform: 'translateZ(0)' }}
                    >
                      {/* NEW Badge */}
                      {isNew && (
                        <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest shadow-lg">
                          NEW
                        </div>
                      )}

                      {/* Preview area */}
                      <div
                        className="w-full aspect-[2/1] flex items-center justify-center overflow-hidden"
                        style={{
                          background: config.gradientColors && config.gradientColors.length >= 2
                            ? `linear-gradient(135deg, ${config.gradientColors.join(',')})`
                            : `linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)`,
                          borderRadius: '12px 12px 0 0'
                        }}
                      >
                        <span
                          style={{
                            fontFamily: config.fontFamily,
                            fontSize: '22px',
                            fontWeight: config.fontWeight || 900,
                            color: config.activeTextColor || config.textColor,
                            textShadow: config.shadowBlur
                              ? `0 0 ${Math.min(config.shadowBlur, 20)}px ${config.shadowColor}`
                              : 'none',
                            WebkitTextStroke: config.strokeWidth && config.strokeWidth > 0
                              ? `${Math.min(config.strokeWidth / 3, 2)}px ${config.strokeColor || '#000'}`
                              : 'none',
                            textTransform: config.uppercase ? 'uppercase' : 'none',
                          }}
                        >
                          {sampleWord}
                        </span>
                      </div>

                      {/* Info row */}
                      <div className="p-2.5">
                        <p className={`text-[10px] font-bold uppercase truncate leading-tight ${
                          currentStyle === key ? 'text-white' : 'text-gray-300'
                        }`}>{config.name}</p>
                        <div className="mt-1.5 flex gap-1 flex-wrap">
                          <span
                            className="text-[7px] px-1.5 py-0.5 rounded font-black uppercase"
                            style={{ background: `${catColor}22`, color: catColor, border: `1px solid ${catColor}44` }}
                          >{config.category}</span>
                          <span className="text-[7px] px-1.5 py-0.5 rounded bg-black/30 text-gray-500 font-bold uppercase">{config.displayMode}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

        ) : (
          <div className="space-y-8 pb-10">
            {/* Typography Group */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2"><Type size={14} className="text-blue-500" /> Typography</div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Font Family</label>
                      <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full bg-gray-900 border border-gray-800 p-3 rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none text-white">
                        <optgroup label="Sans Serif">
                          <option value="Inter, sans-serif">Modern Sans (Inter)</option>
                          <option value="Montserrat, sans-serif">Bold Dynamic (Montserrat)</option>
                          <option value="Poppins, sans-serif">Poppins</option>
                          <option value="Nunito, sans-serif">Nunito</option>
                          <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
                          <option value="'Archivo Black', sans-serif">Archivo Black</option>
                          <option value="Oswald, sans-serif">Oswald</option>
                          <option value="Fredoka, sans-serif">Fredoka</option>
                        </optgroup>
                        <optgroup label="Display">
                          <option value="Bangers, cursive">Comic/Hero (Bangers)</option>
                          <option value="'Bebas Neue', display">Bebas Neue</option>
                          <option value="Anton, sans-serif">Anton</option>
                          <option value="'Titan One', cursive">Bubble/3D (Titan One)</option>
                          <option value="'Luckiest Guy', cursive">Luckiest Guy</option>
                          <option value="Righteous, sans-serif">Righteous</option>
                          <option value="'Rubik Mono One', sans-serif">Rubik Mono One</option>
                          <option value="Staatliches, sans-serif">Staatliches</option>
                          <option value="Bungee, sans-serif">Bungee</option>
                          <option value="'Black Ops One', display">Black Ops One</option>
                          <option value="Koulen, display">Koulen</option>
                        </optgroup>
                        <optgroup label="Serif">
                          <option value="'Playfair Display', serif">Playfair Display</option>
                          <option value="'DM Serif Display', serif">DM Serif Display</option>
                        </optgroup>
                        <optgroup label="Script & Handwritten">
                          <option value="Caveat, cursive">Handwritten (Caveat)</option>
                          <option value="Satisfy, cursive">Satisfy</option>
                          <option value="Pacifico, cursive">Pacifico</option>
                          <option value="'Permanent Marker', cursive">Permanent Marker</option>
                          <option value="'Special Elite', cursive">Special Elite</option>
                        </optgroup>
                        <optgroup label="Sci-Fi & Tech">
                          <option value="Orbitron, sans-serif">Sci-Fi (Orbitron)</option>
                          <option value="'Press Start 2P', monospace">Press Start 2P</option>
                          <option value="'Rubik Glitch', system-ui">Rubik Glitch</option>
                        </optgroup>
                      </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">Size <span>{Math.round(fontScale*100)}%</span></label>
                        <input type="range" min="0.5" max="2.5" step="0.1" value={fontScale} onChange={e => setFontScale(parseFloat(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <label className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">Weight <span>{fontWeight}</span></label>
                        <select value={fontWeight} onChange={e => setFontWeight(e.target.value)} className="w-full bg-gray-900 border border-gray-800 p-2 rounded-lg text-xs font-bold outline-none text-white">
                            {[400, 600, 800, 900].map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </div>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setUppercase(!uppercase)} className={`flex-1 py-3 rounded-xl text-[10px] font-black border transition-all ${uppercase ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-500'}`}>ABC</button>
                      <div className="flex flex-[2] rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
                        {[
                            { id: 'left', icon: <AlignLeft size={16}/> },
                            { id: 'center', icon: <AlignCenter size={16}/> },
                            { id: 'right', icon: <AlignRight size={16}/> }
                        ].map(a => (
                            <button key={a.id} onClick={() => setTextAlign(a.id as any)} className={`flex-1 flex items-center justify-center transition-colors ${textAlign === a.id ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>{a.icon}</button>
                        ))}
                      </div>
                  </div>
                </div>
            </section>

            {/* Colors & Appearance */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2"><Palette size={14} className="text-pink-500" /> Appearance</div>
                <div className="space-y-4 bg-gray-800/30 p-4 rounded-2xl border border-gray-800/50">
                  <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Text Color</span>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-gray-600 overflow-hidden relative">
                          <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] p-0 cursor-pointer" />
                        </div>
                        <span className="text-[10px] font-mono text-gray-500 uppercase">{textColor}</span>
                      </div>
                  </div>
                  <div className="space-y-3 pt-2 border-t border-gray-700/50">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Stroke Width</span>
                        <input type="range" min="0" max="15" step="1" value={strokeWidth} onChange={e => setStrokeWidth(parseInt(e.target.value))} className="w-32 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                      </div>
                      {strokeWidth > 0 && (
                        <div className="flex items-center justify-between pl-2">
                          <span className="text-[10px] text-gray-500 uppercase">Stroke Color</span>
                          <div className="w-6 h-6 rounded border border-gray-600 overflow-hidden relative">
                              <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] p-0 cursor-pointer" />
                          </div>
                        </div>
                      )}
                  </div>
                </div>
            </section>

            {/* Background */}
            <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest"><Square size={14} className="text-green-500" /> Background</div>
                  <button onClick={() => setBgEnabled(!bgEnabled)}>{bgEnabled ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} className="text-gray-700" />}</button>
                </div>
                {bgEnabled && (
                  <div className="space-y-4 bg-gray-800/30 p-4 rounded-2xl border border-gray-800/50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">BG Color</span>
                        <div className="w-8 h-8 rounded border border-gray-600 overflow-hidden relative">
                            <input type="color" value={bgColor.startsWith('rgba') ? '#000000' : bgColor} onChange={e => setBgColor(e.target.value)} className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] p-0 cursor-pointer" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="flex justify-between text-[10px] text-gray-500">Padding <span>{bgPadding}px</span></label>
                        <input type="range" min="0" max="40" step="1" value={bgPadding} onChange={e => setBgPadding(parseInt(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg accent-green-500" />
                    </div>
                    <div className="space-y-2">
                        <label className="flex justify-between text-[10px] text-gray-500">Radius <span>{bgRadius}px</span></label>
                        <input type="range" min="0" max="50" step="1" value={bgRadius} onChange={e => setBgRadius(parseInt(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg accent-green-500" />
                    </div>
                  </div>
                )}
            </section>

            {/* Position */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2"><MousePointer2 size={14} className="text-purple-500" /> Layout</div>
                <div className="space-y-4 bg-gray-800/30 p-4 rounded-2xl border border-gray-800/50">
                  <div className="space-y-2">
                      <label className="flex justify-between text-[10px] text-gray-500">Vertical Position <span>{verticalPos}%</span></label>
                      <input type="range" min="10" max="90" step="1" value={verticalPos} onChange={e => setVerticalPos(parseInt(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg accent-purple-500 cursor-pointer" />
                      <div className="flex justify-between text-[9px] text-gray-600 px-1">
                        <span>Top</span>
                        <span>Center</span>
                        <span>Bottom</span>
                      </div>
                  </div>
                  <div className="space-y-2 mt-4">
                      <label className="flex justify-between text-[10px] text-gray-500">Horizontal Offset <span>{horizontalPos}%</span></label>
                      <input type="range" min="10" max="90" step="1" value={horizontalPos} onChange={e => setHorizontalPos(parseInt(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg accent-purple-500 cursor-pointer" />
                  </div>
                </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default StyleCustomizer;
