import React from 'react';
import { Sparkles, Type, Zap, ChevronRight, Wand2, Film } from 'lucide-react';

interface FeatureSelectorProps {
  setActiveFeature: (feature: string) => void;
}

const FeatureSelector: React.FC<FeatureSelectorProps> = ({ setActiveFeature }) => {
  const features = [
    { id: 'STUDIO',          title: 'AI Studio Mode',        desc: 'Upload any video → AI auto-fixes color, noise, faces & audio. One-tap studio quality.', icon: <Sparkles size={24} />, color: 'from-fuchsia-600 via-violet-500 to-cyan-400',  badge: 'NEW' },
    { id: 'CAPTIONS',        title: 'Viral Captions',        desc: 'Auto-transcribe & style with viral presets.',                                        icon: <Type size={24} />,  color: 'from-blue-500 to-cyan-400',                        badge: null },
    { id: 'TYPOGRAPHY_REEL', title: 'Typography Reel',       desc: 'Upload audio → AI transcribes → animated Devon Jatho style typography video.',       icon: <Film size={24} />,  color: 'from-violet-600 via-indigo-500 to-cyan-400',       badge: 'NEW' },
    { id: 'MOTION',          title: 'Auto Motion Graphics',  desc: 'Paste a script. AI plans kinetic typography & icon bursts on a timeline.',            icon: <Wand2 size={24} />, color: 'from-fuchsia-500 via-pink-500 to-orange-500',      badge: 'NEW' },
  ];

  return (
    <main className="flex-1 flex flex-col items-center p-6 bg-[var(--cc-bg)] overflow-y-auto custom-scrollbar relative">
      
      {/* Animated Mesh Gradient Background confined to welcome page */}
      <div className="mesh-container opacity-[0.1]">
        <div className="mesh-blob mesh-cyan"></div>
        <div className="mesh-blob mesh-blue"></div>
        <div className="mesh-blob mesh-violet"></div>
        <div className="mesh-blob mesh-magenta"></div>
        <div className="mesh-blob mesh-amber"></div>
      </div>

      <div className="max-w-4xl w-full space-y-12 py-16 my-auto relative z-10">
        <div className="text-center space-y-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--cc-blue-dim)] border border-[rgba(0,112,243,0.15)] text-[var(--cc-blue)] text-[10px] font-semibold uppercase tracking-wider">
            <Sparkles size={11} /> Beta Access
          </div>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-[-2.4px] text-[var(--cc-text-1)] leading-none">
            Select Your Magic
          </h1>
          <p className="text-[var(--cc-text-2)] text-base md:text-lg max-w-xl mx-auto font-normal">
            Choose a professional AI tool to start your creative journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFeature(f.id)}
              className="group relative p-8 rounded-[12px] bg-[var(--cc-surface)] border border-[var(--cc-border)] hover:border-[var(--cc-border-hi)] transition-all text-left overflow-hidden shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              {f.badge && (
                <div className="absolute top-5 right-5 px-2.5 py-0.5 bg-[var(--cc-text-1)] text-[var(--cc-bg)] text-[9px] font-semibold rounded-full uppercase tracking-wider">
                  {f.badge}
                </div>
              )}
              {/* Subtle hover gradient bloom in the card corner */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-5 blur-3xl transition-opacity`} />
              
              <div className={`w-12 h-12 rounded-[6px] bg-[var(--cc-surface-3)] border border-[var(--cc-border)] flex items-center justify-center text-[var(--cc-text-1)] mb-6 group-hover:scale-105 transition-transform`}>
                {f.icon}
              </div>
              
              <h3 className="text-xl font-semibold text-[var(--cc-text-1)] mb-2 tracking-[-0.4px]">{f.title}</h3>
              <p className="text-[var(--cc-text-2)] text-xs md:text-sm leading-relaxed font-normal">{f.desc}</p>
              
              <div className="mt-6 flex items-center gap-1 text-[11px] font-semibold text-[var(--cc-blue)] uppercase tracking-normal opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Launch Tool</span>
                <ChevronRight size={12} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
};

export default FeatureSelector;
