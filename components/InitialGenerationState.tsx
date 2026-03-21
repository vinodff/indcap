import React from 'react';
import { Globe, Sparkles, Wand2, Scissors, Check } from 'lucide-react';

interface InitialGenerationStateProps {
  languageMode: 'AUTO' | 'ENGLISH' | 'PURE_TELUGU' | 'TELGLISH' | 'HINDI' | 'TAMIL' | 'KANNADA' | 'MARATHI' | 'HINGLISH';
  setLanguageMode: (mode: 'AUTO' | 'ENGLISH' | 'PURE_TELUGU' | 'TELGLISH' | 'HINDI' | 'TAMIL' | 'KANNADA' | 'MARATHI' | 'HINGLISH') => void;
  autoAdjustEnabled: boolean;
  setAutoAdjustEnabled: (val: boolean) => void;
  smartCompressionEnabled: boolean;
  setSmartCompressionEnabled: (val: boolean) => void;
  handleGenerateCaptions: () => Promise<void>;
}

const InitialGenerationState: React.FC<InitialGenerationStateProps> = ({
  languageMode,
  setLanguageMode,
  autoAdjustEnabled,
  setAutoAdjustEnabled,
  smartCompressionEnabled,
  setSmartCompressionEnabled,
  handleGenerateCaptions
}) => {
  return (
    <div className="flex-1 p-8 flex flex-col justify-center space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
          <Globe size={14} className="text-blue-500" /> Source Language
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'AUTO', label: 'Auto Detect', desc: 'Best for mixed audio' },
            { id: 'ENGLISH', label: 'English Only', desc: 'Strict English output' },
            { id: 'PURE_TELUGU', label: 'Pure Telugu', desc: 'Telugu script only' },
            { id: 'TELGLISH', label: 'Telglish', desc: 'Telugu + English script' },
            { id: 'HINDI', label: 'Hindi Only', desc: 'Hindi script only' },
            { id: 'TAMIL', label: 'Tamil Only', desc: 'Tamil script only' },
            { id: 'KANNADA', label: 'Kannada Only', desc: 'Kannada script only' },
            { id: 'MARATHI', label: 'Marathi Only', desc: 'Marathi script only' },
            { id: 'HINGLISH', label: 'Hinglish', desc: 'Hindi + English mix' }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setLanguageMode(m.id as any)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${languageMode === m.id ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
            >
              <div className={`font-bold text-sm mb-1 ${languageMode === m.id ? 'text-white' : 'text-gray-300'}`}>{m.label}</div>
              <div className={`text-[10px] ${languageMode === m.id ? 'text-blue-200' : 'text-gray-600'}`}>{m.desc}</div>
              {languageMode === m.id && <div className="absolute top-2 right-2"><Check size={14} /></div>}
            </button>
          ))}
        </div>
      </div>

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

      <button
        onClick={handleGenerateCaptions}
        className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl hover:bg-gray-200"
      >
        <Sparkles size={20} className="text-yellow-500 fill-yellow-500" />
        Generate Captions
      </button>
    </div>
  );
};

export default InitialGenerationState;
