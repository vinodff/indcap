import React, { useState } from 'react';
import { X, Youtube, Instagram, Facebook, Video, Share2, Copy, Check, Loader2, Sparkles, Target } from 'lucide-react';
import { Caption, SeoResult, SocialPlatform } from '../types';
import { generateSeoMetadata } from '../services/geminiService';

interface Props {
  captions: Caption[];
  onClose: () => void;
}

const PLATFORMS: { id: SocialPlatform; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'YOUTUBE', label: 'YouTube', icon: <Youtube size={24} />, color: '#FF0000' },
  { id: 'SHORTS', label: 'Shorts', icon: <div className="font-black text-xs border border-current rounded px-1">S</div>, color: '#FF0000' },
  { id: 'INSTAGRAM', label: 'Instagram', icon: <Instagram size={24} />, color: '#E1306C' },
  { id: 'TIKTOK', label: 'TikTok', icon: <Video size={24} />, color: '#00F2EA' }, // Using Video icon as generic for TikTok
  { id: 'FACEBOOK', label: 'Facebook', icon: <Facebook size={24} />, color: '#1877F2' },
];

const SeoGenerator: React.FC<Props> = ({ captions, onClose }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeoResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleGenerate = async (platform: SocialPlatform) => {
    setSelectedPlatform(platform);
    setLoading(true);
    try {
      const data = await generateSeoMetadata(captions, platform);
      setResult(data);
    } catch (e) {
      console.error(e);
      alert("Failed to generate SEO metadata. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for HTTP environments
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (e) {
      console.error("Clipboard copy failed:", e);
      alert("Unable to copy to clipboard automatically. Your browser may restrict this action. Please select and copy manually.");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-[#161616] border border-gray-800 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col lg:flex-row overflow-hidden shadow-2xl">
        
        {/* LEFT: Platform Selection */}
        <div className="w-full lg:w-1/3 bg-[#101010] p-8 border-r border-gray-800 flex flex-col">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-2">
              <Share2 className="text-blue-500" /> Platform SEO
            </h2>
            <p className="text-gray-500 text-sm">Target the algorithm. Get more reach.</p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleGenerate(p.id)}
                className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all group relative overflow-hidden ${selectedPlatform === p.id ? 'bg-gray-800 border-white text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-black/50 group-hover:scale-110 transition-transform`} style={{ color: p.color }}>
                   {p.icon}
                </div>
                <div className="text-left flex-1">
                   <div className="font-bold text-sm">{p.label}</div>
                   {selectedPlatform === p.id && <div className="text-[10px] text-green-400">Active</div>}
                </div>
                {selectedPlatform === p.id && loading && <Loader2 size={16} className="animate-spin text-gray-500" />}
              </button>
            ))}
          </div>
          
          <button onClick={onClose} className="mt-8 py-3 w-full bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-colors">
            Close
          </button>
        </div>

        {/* RIGHT: Results Area */}
        <div className="flex-1 bg-[#161616] flex flex-col overflow-hidden relative">
          
          {/* Loading State */}
          {loading && (
             <div className="absolute inset-0 z-20 bg-[#161616]/80 backdrop-blur-sm flex flex-col items-center justify-center text-center">
                 <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
                 <h3 className="text-xl font-bold text-white">Consulting the Algorithm...</h3>
                 <p className="text-gray-500 text-sm mt-2">Analyzing transcript for {selectedPlatform} Optimization</p>
             </div>
          )}

          {!result && !loading && (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-600 p-8 text-center">
                <Target size={64} className="mb-4 opacity-20" />
                <h3 className="text-lg font-bold mb-2">Select a Platform</h3>
                <p className="text-sm max-w-xs">Choose where you want to post, and AI will generate the perfect title, tags, and description.</p>
             </div>
          )}

          {result && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
               
               {/* Algorithm Insight Header */}
               <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 p-4 rounded-xl flex gap-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg h-fit"><Sparkles size={20} className="text-blue-400" /></div>
                  <div>
                     <h4 className="text-blue-400 font-bold text-sm uppercase mb-1">Algorithm Strategy</h4>
                     <p className="text-gray-300 text-xs leading-relaxed">{result.algorithmNotes}</p>
                     <div className="mt-2 text-[10px] text-gray-500 font-mono">Target: {result.audienceTargeting}</div>
                  </div>
               </div>

               {/* Title Section */}
               <div className="space-y-2">
                  <div className="flex justify-between items-center">
                     <label className="text-xs font-black text-gray-500 uppercase">Optimized Title</label>
                     <button onClick={() => copyToClipboard(result.title, 'title')} className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                        {copiedField === 'title' ? <Check size={14} className="text-green-500"/> : <Copy size={14} />} {copiedField === 'title' ? 'Copied' : 'Copy'}
                     </button>
                  </div>
                  <div className="bg-black/50 p-4 rounded-xl border border-gray-800 text-lg font-bold text-white break-words">
                     {result.title}
                  </div>
               </div>

               {/* Description Section */}
               <div className="space-y-2">
                  <div className="flex justify-between items-center">
                     <label className="text-xs font-black text-gray-500 uppercase">Description / Caption</label>
                     <button onClick={() => copyToClipboard(result.description, 'desc')} className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                        {copiedField === 'desc' ? <Check size={14} className="text-green-500"/> : <Copy size={14} />} {copiedField === 'desc' ? 'Copied' : 'Copy'}
                     </button>
                  </div>
                  <textarea 
                    readOnly 
                    value={result.description} 
                    className="w-full bg-black/50 p-4 rounded-xl border border-gray-800 text-sm text-gray-300 min-h-[150px] outline-none resize-none"
                  />
               </div>

               {/* Keywords & Tags Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <div className="flex justify-between items-center">
                        <label className="text-xs font-black text-gray-500 uppercase">Keywords</label>
                        <button onClick={() => copyToClipboard(result.keywords.join(', '), 'keys')} className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                           {copiedField === 'keys' ? <Check size={14} className="text-green-500"/> : <Copy size={14} />} Copy All
                        </button>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        {result.keywords.map((k, i) => (
                           <span key={i} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300 border border-gray-700">{k}</span>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-2">
                     <div className="flex justify-between items-center">
                        <label className="text-xs font-black text-gray-500 uppercase">Hashtags</label>
                        <button onClick={() => copyToClipboard(result.hashtags.join(' '), 'tags')} className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
                           {copiedField === 'tags' ? <Check size={14} className="text-green-500"/> : <Copy size={14} />} Copy All
                        </button>
                     </div>
                     <div className="flex flex-wrap gap-2 text-blue-400 text-sm font-medium">
                        {result.hashtags.map((h, i) => (
                           <span key={i}>{h}</span>
                        ))}
                     </div>
                  </div>
               </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default SeoGenerator;