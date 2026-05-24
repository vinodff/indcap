import React from 'react';
import { Sparkles, Type, Globe, Share2, Zap, ChevronRight, Image, Wand2, Film } from 'lucide-react';

interface FeatureSelectorProps {
  setActiveFeature: (feature: string) => void;
}

const FeatureSelector: React.FC<FeatureSelectorProps> = ({ setActiveFeature }) => {
  const features = [
    { id: 'CAPTIONS',        title: 'Viral Captions',        desc: 'Auto-transcribe & style with viral presets.',                                        icon: <Type size={32} />,  color: 'from-blue-500 to-cyan-400',                        badge: null },
    { id: 'TYPOGRAPHY_REEL', title: 'Typography Reel',       desc: 'Upload audio → AI transcribes → animated Devon Jatho style typography video.',       icon: <Film size={32} />,  color: 'from-violet-600 via-indigo-500 to-cyan-400',       badge: 'NEW' },
    { id: 'THUMBNAIL',       title: 'AI Thumbnail',          desc: 'Upload image, add text, pick a template — AI generates a pro YouTube thumbnail.',    icon: <Image size={32} />, color: 'from-fuchsia-500 to-pink-500',                     badge: 'NEW' },
    { id: 'MOTION',          title: 'Auto Motion Graphics',  desc: 'Paste a script. AI plans kinetic typography & icon bursts on a timeline.',            icon: <Wand2 size={32} />, color: 'from-fuchsia-500 via-pink-500 to-orange-500',      badge: 'NEW' },
    { id: 'SEO',             title: 'SEO Metadata',          desc: 'Generate viral titles, tags & descriptions.',                                         icon: <Globe size={32} />, color: 'from-emerald-500 to-teal-400',                     badge: null },
    { id: 'PUBLISH',         title: 'Social Publisher',      desc: 'Post to IG, TikTok & YouTube with scheduler.',                                        icon: <Share2 size={32} />,color: 'from-orange-500 to-yellow-400',                    badge: null },
    { id: 'AUTOMATION',      title: 'AI Automation',         desc: 'Smart DM & comment auto-replies.',                                                    icon: <Zap size={32} />,   color: 'from-indigo-500 to-blue-600',                      badge: null },
  ];

  return (

    <main className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0a0a0a] overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl w-full space-y-12 py-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest animate-pulse">
            <Sparkles size={14} /> Beta Access
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white leading-none font-['Space_Grotesk']">
            SELECT YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">MAGIC</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto font-medium">
            Choose a professional AI tool to start your creative journey.
          </p>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFeature(f.id)}
              className="group relative p-8 rounded-[32px] bg-[#121212] border border-gray-800 hover:border-gray-600 transition-all text-left overflow-hidden active:scale-95"
            >
              {f.badge && (
                <div className="absolute top-5 right-5 px-2 py-0.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[9px] font-black rounded-full uppercase tracking-widest">
                  {f.badge}
                </div>
              )}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity`} />
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-6 shadow-lg shadow-black/20 group-hover:scale-110 transition-transform`}>
                {f.icon}
              </div>
              <h3 className="text-2xl font-black text-white mb-2 tracking-tight">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed font-medium">{f.desc}</p>
              <div className="mt-6 flex items-center gap-2 text-xs font-black text-blue-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                Launch Tool <ChevronRight size={14} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
};

export default FeatureSelector;

