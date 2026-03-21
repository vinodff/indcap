import React from 'react';
import { Key, CheckCircle2, ShieldAlert } from 'lucide-react';

const TEST_KEYS = [
  "AIzaSyCh5cMHCvWJ7rO0NrduRkWobHr-Mf7HoeI",
  "AIzaSyAH_I5p5h3iz8-Id6enhAIGYy5p6josXic",
  "AIzaSyBWFczR-knZ83bc6SXdC0PPhDfQZfoN_Eg",
  "AIzaSyC6js-11wA8LzAUM4ohgzntOncxk6v0-1k"
];

interface Props {
  onSelect: (key: string) => void;
}

const ApiKeySelector: React.FC<Props> = ({ onSelect }) => {
  return (
    <div className="fixed inset-0 bg-[#050505] flex flex-col items-center justify-center p-6 z-[100]">
      <div className="max-w-md w-full bg-[#121212] border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"></div>
        
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center border border-gray-800 shadow-inner">
            <Key size={32} className="text-blue-500" />
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Createrin Access</h2>
          <p className="text-gray-500 text-sm">
            Select a verified API key to initialize the generative engine.
          </p>
        </div>
        
        <div className="space-y-3">
          {TEST_KEYS.map((k, i) => (
            <button
              key={k}
              onClick={() => onSelect(k)}
              className="w-full p-4 bg-[#1a1a1a] hover:bg-[#202020] border border-gray-800 hover:border-blue-500/50 rounded-xl flex items-center gap-4 transition-all group text-left relative overflow-hidden"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                0{i + 1}
              </div>
              <div className="flex-1 z-10">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Test Key</div>
                <div className="text-xs font-mono text-gray-300 truncate">
                  {k.substring(0, 8)}••••••••{k.substring(k.length - 6)}
                </div>
              </div>
              <CheckCircle2 size={18} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-110" />
            </button>
          ))}
        </div>
        
        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-gray-600 bg-gray-900/50 p-2 rounded-lg">
          <ShieldAlert size={12} />
          <span>Internal Testing Environment Only</span>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySelector;