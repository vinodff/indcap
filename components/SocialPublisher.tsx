import React, { useState, useEffect } from 'react';
import { X, Youtube, Instagram, Facebook, Video, UploadCloud, CheckCircle2, AlertCircle, Loader2, Link as LinkIcon, Lock, Globe, MessageCircle, Zap, Clock, ShieldCheck, Sparkles, Bot, ChevronDown, ChevronUp, Play, Settings, Bell, Send, Activity, AlertTriangle } from 'lucide-react';
import { SocialPlatform, SocialAccount, UploadProgress, UploadStage, InstagramAutomationConfig, Caption, IGAccountType } from '../types';
import { generateInstagramDm } from '../services/geminiService';
import { activateAutomation } from '../services/automationSimulationService';
import AutomationDashboard from './AutomationDashboard';

interface Props {
  onClose: () => void;
  videoSrc: string;
  captions?: Caption[]; // Passed for context
}

const PLATFORMS_CONFIG: Record<SocialPlatform, { label: string, icon: React.ReactNode, color: string, rules: string }> = {
  'YOUTUBE': { label: 'YouTube Main', icon: <Youtube size={20} />, color: '#FF0000', rules: '16:9 Preferred, High Retention' },
  'SHORTS': { label: 'YouTube Shorts', icon: <div className="font-black text-[10px] border border-current rounded px-1">S</div>, color: '#FF0000', rules: 'Max 60s, 9:16 Vertical' },
  'INSTAGRAM': { label: 'Instagram Reels', icon: <Instagram size={20} />, color: '#E1306C', rules: 'Max 90s, Trending Audio' },
  'TIKTOK': { label: 'TikTok', icon: <Video size={20} />, color: '#00F2EA', rules: 'Max 10m, High Engagement' },
  'FACEBOOK': { label: 'Facebook Reels', icon: <Facebook size={20} />, color: '#1877F2', rules: 'Max 60s, Community Focus' },
};

const SocialPublisher: React.FC<Props> = ({ onClose, videoSrc, captions }) => {
  const [activeStep, setActiveStep] = useState<'ACCOUNTS' | 'UPLOAD'>('ACCOUNTS');
  const [isSafetyCollapsed, setIsSafetyCollapsed] = useState(true);
  const [showLiveDashboard, setShowLiveDashboard] = useState(false);
  
  // Simulated Account State
  const [accounts, setAccounts] = useState<SocialAccount[]>([
    { id: 'YOUTUBE', name: 'YouTube', status: 'DISCONNECTED' },
    { id: 'SHORTS', name: 'YouTube Shorts', status: 'DISCONNECTED' },
    { id: 'INSTAGRAM', name: 'Instagram', status: 'DISCONNECTED' },
    { id: 'TIKTOK', name: 'TikTok', status: 'DISCONNECTED' },
    { id: 'FACEBOOK', name: 'Facebook', status: 'DISCONNECTED' },
  ]);

  // Upload State
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [generatingDm, setGeneratingDm] = useState<string | null>(null);

  // Automation State
  const [igAutomation, setIgAutomation] = useState<InstagramAutomationConfig>({
      enabled: false,
      accountType: 'CREATOR',
      comment: {
        enabled: true,
        triggerType: 'AI_INTENT',
        keywords: ['link', 'price', 'guide', 'info'],
        dmMode: 'AI_SMART',
        messageTemplate: "Hey! Thanks for watching. Here is the link you asked for: [LINK]",
        delay: 'RANDOM'
      },
      story: {
        enabled: true,
        dmMode: 'AI_SMART',
        messageTemplate: "Thanks for the reply! 😊"
      },
      welcome: {
        enabled: false,
        trigger: 'FOLLOW',
        dmMode: 'MANUAL',
        messageTemplate: "Thanks for following! 👋 Check out my latest reel."
      },
      safety: {
        maxDmsPerHour: 30,
        maxDmsPerDay: 100,
        stopOnReply: true,
        avoidDuplicates: true,
        autoPause: true
      }
  });

  // --- ACTIONS ---

  const toggleConnection = (id: SocialPlatform) => {
    setAccounts(prev => prev.map(acc => {
      if (acc.id === id) {
        if (acc.status === 'CONNECTED') return { ...acc, status: 'DISCONNECTED', username: undefined };
        // Simulate Connect Flow
        return { ...acc, status: 'CONNECTING' };
      }
      return acc;
    }));

    // Mock Async Connection
    setTimeout(() => {
        setAccounts(prev => prev.map(acc => {
            if (acc.id === id && acc.status === 'CONNECTING') {
                return { 
                    ...acc, 
                    status: 'CONNECTED', 
                    username: `@creator_${id.toLowerCase()}`, 
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}` 
                };
            }
            return acc;
        }));
    }, 1500);
  };

  const toggleSelection = (id: SocialPlatform) => {
      if (selectedPlatforms.includes(id)) {
          setSelectedPlatforms(prev => prev.filter(p => p !== id));
      } else {
          setSelectedPlatforms(prev => [...prev, id]);
      }
  };

  const updateAccountType = (type: IGAccountType) => {
      let limitHr = 20;
      let limitDay = 50;
      
      if (type === 'BUSINESS') {
          limitHr = 50;
          limitDay = 200;
      } else if (type === 'CREATOR') {
          limitHr = 30;
          limitDay = 100;
      } else {
          limitHr = 0;
          limitDay = 0;
      }

      setIgAutomation(prev => ({
          ...prev,
          accountType: type,
          safety: {
              ...prev.safety,
              maxDmsPerHour: limitHr,
              maxDmsPerDay: limitDay
          }
      }));
  };

  const startUpload = () => {
      if (selectedPlatforms.length === 0) return;
      setIsUploading(true);
      
      // Initialize Progress
      const initialProgress: Record<string, UploadProgress> = {};
      selectedPlatforms.forEach(p => {
          initialProgress[p] = { platformId: p, stage: 'QUEUED', progress: 0 };
      });
      setUploadProgress(initialProgress);

      // Simulate Parallel Uploads with staggered starts
      selectedPlatforms.forEach((platformId, index) => {
          simulatePlatformUpload(platformId, index * 800);
      });

      // Activate Automation if selected
      if (selectedPlatforms.includes('INSTAGRAM') && igAutomation.enabled) {
          activateAutomation(igAutomation, captions || []);
      }
  };

  const simulatePlatformUpload = (platformId: SocialPlatform, delay: number) => {
      setTimeout(() => {
          let progress = 0;
          const interval = setInterval(() => {
              progress += Math.random() * 5 + 2; // Random increment
              
              setUploadProgress(prev => {
                  const current = prev[platformId];
                  if (!current) return prev;

                  let stage: UploadStage = 'UPLOADING';
                  if (progress > 100) {
                      progress = 100;
                      stage = 'PROCESSING';
                  }

                  return {
                      ...prev,
                      [platformId]: { ...current, stage, progress }
                  };
              });

              if (progress >= 100) {
                  clearInterval(interval);
                  // Simulate Processing Phase
                  setTimeout(() => {
                      setUploadProgress(prev => ({
                          ...prev,
                          [platformId]: { 
                              ...prev[platformId], 
                              stage: 'DONE', 
                              url: `https://${platformId.toLowerCase()}.com/video/12345` 
                           }
                      }));
                  }, 2000 + Math.random() * 2000);
              }

          }, 200);
      }, delay);
  };

  const handleGenerateDm = async (section: 'comment' | 'story' | 'welcome') => {
      setGeneratingDm(section);
      try {
          const config = igAutomation[section];
          // For comment section, we need triggerType, others don't have it in the same way or use defaults
          const triggerType = section === 'comment' ? (config as any).triggerType : undefined;
          
          const text = await generateInstagramDm(captions || [], section === 'story' ? 'STORY' : section === 'welcome' ? 'WELCOME' : 'COMMENT', triggerType);
          
          setIgAutomation(prev => ({
              ...prev,
              [section]: {
                  ...prev[section],
                  messageTemplate: text,
                  dmMode: 'AI_SMART'
              }
          }));
      } catch (e) {
          console.error(e);
      } finally {
          setGeneratingDm(null);
      }
  };

  const connectedCount = accounts.filter(a => a.status === 'CONNECTED').length;
  const allDone = selectedPlatforms.length > 0 && selectedPlatforms.every(p => uploadProgress[p]?.stage === 'DONE');
  const isInstagramSelected = selectedPlatforms.includes('INSTAGRAM');

  // If live dashboard is open, render that instead of modal content
  if (showLiveDashboard) {
      return <AutomationDashboard onClose={() => setShowLiveDashboard(false)} />;
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-[#121212] border border-gray-800 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white z-20">
            <X size={20} />
        </button>

        {/* HEADER */}
        <div className="p-8 border-b border-gray-800 bg-[#161616]">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <UploadCloud className="text-blue-500" /> Multi-Platform Publisher
            </h2>
            <p className="text-gray-500 text-sm mt-1">Upload once. Go viral everywhere.</p>
            
            {/* Steps */}
            <div className="flex gap-2 mt-6">
                <button 
                    onClick={() => !isUploading && setActiveStep('ACCOUNTS')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeStep === 'ACCOUNTS' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-800'}`}
                >
                    1. Connect Accounts
                </button>
                <div className="w-8 h-[2px] bg-gray-800 self-center"></div>
                <button 
                    onClick={() => connectedCount > 0 && setActiveStep('UPLOAD')}
                    disabled={connectedCount === 0}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeStep === 'UPLOAD' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                >
                    2. Upload & Publish
                </button>
            </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[#0a0a0a]">
            
            {activeStep === 'ACCOUNTS' && (
                <div className="max-w-2xl mx-auto space-y-4">
                    <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl flex items-start gap-3 mb-6">
                        <Lock size={18} className="text-blue-400 mt-0.5" />
                        <div>
                            <p className="text-sm text-blue-200 font-bold">Secure Connection</p>
                            <p className="text-xs text-blue-300/70 mt-1">We use official APIs. Your passwords are never stored. You can revoke access at any time.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {accounts.map(acc => {
                            const conf = PLATFORMS_CONFIG[acc.id];
                            return (
                                <div key={acc.id} className="bg-[#161616] border border-gray-800 p-4 rounded-xl flex items-center justify-between group hover:border-gray-700 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black" style={{ color: conf.color }}>
                                            {conf.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-200">{conf.label}</h4>
                                            {acc.status === 'CONNECTED' ? (
                                                <p className="text-xs text-green-500 flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> {acc.username}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-gray-500">{conf.rules}</p>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => toggleConnection(acc.id)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                            acc.status === 'CONNECTED' ? 'bg-gray-800 text-gray-400 hover:text-red-400' : 
                                            acc.status === 'CONNECTING' ? 'bg-gray-800 text-gray-500' :
                                            'bg-white text-black hover:bg-gray-200'
                                        }`}
                                    >
                                        {acc.status === 'CONNECTED' ? 'Disconnect' : acc.status === 'CONNECTING' ? 'Connecting...' : 'Connect'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeStep === 'UPLOAD' && (
                <div className="max-w-full mx-auto flex flex-col xl:flex-row gap-8">
                    
                    {!isUploading ? (
                        <>
                            {/* LEFT COLUMN: Destinations & Metadata */}
                            <div className="flex-1 space-y-8 min-w-[300px]">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Select Destinations</h3>
                                    <div className="space-y-2">
                                        {accounts.filter(a => a.status === 'CONNECTED').map(acc => {
                                             const conf = PLATFORMS_CONFIG[acc.id];
                                             const isSelected = selectedPlatforms.includes(acc.id);
                                             return (
                                                 <button 
                                                    key={acc.id}
                                                    onClick={() => toggleSelection(acc.id)}
                                                    className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all ${
                                                        isSelected ? 'bg-blue-600/10 border-blue-500 text-white' : 'bg-[#161616] border-gray-800 text-gray-400 hover:bg-gray-800'
                                                    }`}
                                                 >
                                                     <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`}>
                                                         {isSelected && <CheckCircle2 size={14} className="text-white" />}
                                                     </div>
                                                     <div className="flex items-center gap-2">
                                                         {conf.icon} <span className="font-bold text-sm">{conf.label}</span>
                                                     </div>
                                                 </button>
                                             );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Metadata Check</h3>
                                    <div className="bg-[#161616] border border-gray-800 rounded-xl p-4 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-16 h-24 bg-gray-800 rounded-lg overflow-hidden">
                                                <video src={videoSrc} className="w-full h-full object-cover opacity-50" autoPlay loop muted playsInline />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-green-500 flex items-center gap-1 mb-1"><CheckCircle2 size={12}/> AI Captions Ready</div>
                                                <div className="text-xs font-bold text-green-500 flex items-center gap-1 mb-1"><CheckCircle2 size={12}/> 9:16 Optimized</div>
                                                <div className="text-xs font-bold text-gray-500 flex items-center gap-1"><AlertCircle size={12}/> SEO Auto-Gen</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Automation Config */}
                            <div className={`flex-[2] ${!isInstagramSelected ? 'opacity-50 pointer-events-none grayscale' : ''} transition-all duration-300`}>
                                 <div className="flex items-center justify-between mb-4">
                                     <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                         <Zap size={16} className={isInstagramSelected ? "text-pink-500" : "text-gray-600"} /> 
                                         Instagram Automation
                                     </h3>
                                     {isInstagramSelected && (
                                         <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">{igAutomation.enabled ? 'Automation ON' : 'Automation OFF'}</span>
                                            <button 
                                                onClick={() => setIgAutomation(prev => ({...prev, enabled: !prev.enabled}))}
                                                className={`w-12 h-6 rounded-full relative transition-colors ${igAutomation.enabled ? 'bg-pink-500' : 'bg-gray-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${igAutomation.enabled ? 'left-7' : 'left-1'}`}></div>
                                            </button>
                                         </div>
                                     )}
                                 </div>
                                 
                                 {/* Account Type Selector */}
                                 {isInstagramSelected && (
                                    <div className="mb-4 bg-[#161616] border border-gray-800 rounded-lg p-3 flex justify-between items-center">
                                       <div className="flex items-center gap-2 text-xs text-gray-300">
                                          <AlertCircle size={14} className="text-blue-400" />
                                          <span>Account Classification:</span>
                                       </div>
                                       <select 
                                         value={igAutomation.accountType}
                                         onChange={(e) => updateAccountType(e.target.value as any)}
                                         className="bg-black border border-gray-700 rounded text-xs text-white px-2 py-1 outline-none"
                                       >
                                         <option value="BUSINESS">Business (Recommended)</option>
                                         <option value="CREATOR">Creator (Limited)</option>
                                         <option value="PERSONAL">Personal (Not Supported)</option>
                                       </select>
                                    </div>
                                 )}

                                 {/* Automation Content Wrapper */}
                                 <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all ${igAutomation.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                     
                                     {/* Column 1: Config Sections */}
                                     <div className="space-y-4">
                                         
                                         {/* Comment Automation */}
                                         <div className="bg-[#161616] border border-gray-800 rounded-xl overflow-hidden">
                                             <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
                                                 <div className="flex items-center gap-2">
                                                     <MessageCircle size={16} className="text-blue-400" />
                                                     <span className="font-bold text-sm text-gray-200">Auto DM on Comments</span>
                                                 </div>
                                                 <button 
                                                     onClick={() => setIgAutomation(prev => ({...prev, comment: {...prev.comment, enabled: !prev.comment.enabled}}))}
                                                     className={`w-8 h-4 rounded-full relative transition-colors ${igAutomation.comment.enabled ? 'bg-blue-500' : 'bg-gray-600'}`}
                                                 >
                                                     <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${igAutomation.comment.enabled ? 'left-4.5' : 'left-0.5'}`}></div>
                                                 </button>
                                             </div>
                                             {igAutomation.comment.enabled && (
                                                 <div className="p-4 space-y-4">
                                                     <div className="space-y-2">
                                                         <label className="text-[10px] text-gray-500 uppercase font-bold">Trigger Logic</label>
                                                         <div className="grid grid-cols-3 gap-2">
                                                             {['ANY', 'KEYWORDS', 'AI_INTENT'].map(type => (
                                                                 <button 
                                                                    key={type}
                                                                    onClick={() => setIgAutomation(prev => ({...prev, comment: {...prev.comment, triggerType: type as any}}))}
                                                                    className={`py-1.5 px-2 rounded text-[10px] font-bold border transition-colors ${igAutomation.comment.triggerType === type ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'border-gray-700 text-gray-500 hover:bg-gray-800'}`}
                                                                 >
                                                                     {type === 'ANY' ? 'Any Comment' : type === 'KEYWORDS' ? 'Keywords' : 'AI Intent'}
                                                                 </button>
                                                             ))}
                                                         </div>
                                                     </div>
                                                     
                                                     {igAutomation.comment.triggerType === 'KEYWORDS' && (
                                                         <div>
                                                             <input 
                                                                 type="text" 
                                                                 placeholder="link, price, guide, info"
                                                                 value={igAutomation.comment.keywords.join(', ')}
                                                                 onChange={(e) => setIgAutomation(prev => ({...prev, comment: {...prev.comment, keywords: e.target.value.split(',').map(s => s.trim())}}))}
                                                                 className="w-full bg-black border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none"
                                                             />
                                                         </div>
                                                     )}

                                                     <div className="space-y-2">
                                                         <div className="flex justify-between items-center">
                                                            <label className="text-[10px] text-gray-500 uppercase font-bold">DM Response</label>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setIgAutomation(prev => ({...prev, comment: {...prev.comment, dmMode: 'MANUAL'}}))} className={`text-[9px] px-2 py-0.5 rounded ${igAutomation.comment.dmMode === 'MANUAL' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}>Manual</button>
                                                                <button onClick={() => handleGenerateDm('comment')} className={`text-[9px] px-2 py-0.5 rounded flex items-center gap-1 ${igAutomation.comment.dmMode === 'AI_SMART' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>
                                                                    {generatingDm === 'comment' ? <Loader2 className="animate-spin" size={8} /> : <Sparkles size={8}/>} AI Smart
                                                                </button>
                                                            </div>
                                                         </div>
                                                         <textarea 
                                                            value={igAutomation.comment.messageTemplate}
                                                            onChange={(e) => setIgAutomation(prev => ({...prev, comment: {...prev.comment, messageTemplate: e.target.value}}))}
                                                            className="w-full h-16 bg-black border border-gray-700 rounded-lg p-2 text-xs text-gray-300 focus:border-blue-500 outline-none resize-none"
                                                            placeholder="DM Text..."
                                                         />
                                                     </div>

                                                     <div className="flex items-center justify-between">
                                                         <div className="flex items-center gap-1">
                                                             <Clock size={12} className="text-gray-500" />
                                                             <span className="text-[10px] text-gray-400">Delay</span>
                                                         </div>
                                                         <select 
                                                            value={igAutomation.comment.delay}
                                                            onChange={(e) => setIgAutomation(prev => ({...prev, comment: {...prev.comment, delay: e.target.value as any}}))}
                                                            className="bg-black border border-gray-700 rounded text-[10px] px-2 py-1 text-white outline-none"
                                                         >
                                                             <option value="INSTANT">Instant</option>
                                                             <option value="10S">10 Seconds</option>
                                                             <option value="RANDOM">Random (Safe)</option>
                                                         </select>
                                                     </div>
                                                 </div>
                                             )}
                                         </div>

                                         {/* Story & Welcome Automation Row */}
                                         <div className="grid grid-cols-2 gap-4">
                                             <div className="bg-[#161616] border border-gray-800 rounded-xl p-3">
                                                 <div className="flex justify-between items-center mb-2">
                                                     <div className="flex items-center gap-1.5">
                                                         <Zap size={14} className="text-yellow-400" />
                                                         <span className="text-xs font-bold text-gray-300">Story Reply</span>
                                                     </div>
                                                     <button 
                                                         onClick={() => setIgAutomation(prev => ({...prev, story: {...prev.story, enabled: !prev.story.enabled}}))}
                                                         className={`w-6 h-3 rounded-full relative transition-colors ${igAutomation.story.enabled ? 'bg-yellow-500' : 'bg-gray-600'}`}
                                                     >
                                                         <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-transform ${igAutomation.story.enabled ? 'left-3.5' : 'left-0.5'}`}></div>
                                                     </button>
                                                 </div>
                                                 {igAutomation.story.enabled && (
                                                     <>
                                                         <div className="flex justify-end mb-2">
                                                             <button onClick={() => handleGenerateDm('story')} className={`text-[9px] px-2 py-0.5 rounded flex items-center gap-1 ${igAutomation.story.dmMode === 'AI_SMART' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                                                {generatingDm === 'story' ? <Loader2 className="animate-spin" size={8} /> : <Sparkles size={8}/>} AI
                                                             </button>
                                                         </div>
                                                         <textarea 
                                                            value={igAutomation.story.messageTemplate}
                                                            onChange={(e) => setIgAutomation(prev => ({...prev, story: {...prev.story, messageTemplate: e.target.value}}))}
                                                            className="w-full h-12 bg-black border border-gray-700 rounded-lg p-2 text-[10px] text-gray-300 focus:border-yellow-500 outline-none resize-none"
                                                            placeholder="Reply Text..."
                                                         />
                                                     </>
                                                 )}
                                             </div>

                                             <div className="bg-[#161616] border border-gray-800 rounded-xl p-3">
                                                 <div className="flex justify-between items-center mb-2">
                                                     <div className="flex items-center gap-1.5">
                                                         <Bot size={14} className="text-purple-400" />
                                                         <span className="text-xs font-bold text-gray-300">Welcome DM</span>
                                                     </div>
                                                     <button 
                                                         onClick={() => setIgAutomation(prev => ({...prev, welcome: {...prev.welcome, enabled: !prev.welcome.enabled}}))}
                                                         className={`w-6 h-3 rounded-full relative transition-colors ${igAutomation.welcome.enabled ? 'bg-purple-500' : 'bg-gray-600'}`}
                                                     >
                                                         <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-transform ${igAutomation.welcome.enabled ? 'left-3.5' : 'left-0.5'}`}></div>
                                                     </button>
                                                 </div>
                                                  {igAutomation.welcome.enabled && (
                                                      <>
                                                         <div className="flex justify-end mb-2">
                                                             <button onClick={() => handleGenerateDm('welcome')} className={`text-[9px] px-2 py-0.5 rounded flex items-center gap-1 ${igAutomation.welcome.dmMode === 'AI_SMART' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                                                {generatingDm === 'welcome' ? <Loader2 className="animate-spin" size={8} /> : <Sparkles size={8}/>} AI
                                                             </button>
                                                         </div>
                                                         <textarea 
                                                            value={igAutomation.welcome.messageTemplate}
                                                            onChange={(e) => setIgAutomation(prev => ({...prev, welcome: {...prev.welcome, messageTemplate: e.target.value}}))}
                                                            className="w-full h-12 bg-black border border-gray-700 rounded-lg p-2 text-[10px] text-gray-300 focus:border-purple-500 outline-none resize-none"
                                                            placeholder="Welcome Text..."
                                                         />
                                                      </>
                                                  )}
                                             </div>
                                         </div>

                                         {/* Safety Settings */}
                                         <div className="bg-[#161616] border border-gray-800 rounded-xl overflow-hidden">
                                              <button 
                                                  onClick={() => setIsSafetyCollapsed(!isSafetyCollapsed)}
                                                  className="w-full flex items-center justify-between p-3 bg-gray-900/30 hover:bg-gray-900/50 transition-colors"
                                              >
                                                  <div className="flex items-center gap-2">
                                                      <ShieldCheck size={14} className="text-green-400" />
                                                      <span className="text-xs font-bold text-gray-300">Advanced Safety</span>
                                                  </div>
                                                  {isSafetyCollapsed ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronUp size={14} className="text-gray-500" />}
                                              </button>
                                              
                                              {!isSafetyCollapsed && (
                                                  <div className="p-3 space-y-3 bg-black/20">
                                                      <div className="flex items-center justify-between">
                                                          <span className="text-[10px] text-gray-400">Max DMs/Hour</span>
                                                          <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-gray-500 font-mono">{igAutomation.safety.maxDmsPerHour}</span>
                                                            <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500" style={{width: `${(igAutomation.safety.maxDmsPerHour/50)*100}%`}}></div>
                                                            </div>
                                                          </div>
                                                      </div>
                                                       <div className="flex items-center justify-between">
                                                          <span className="text-[10px] text-gray-400">Max DMs/Day</span>
                                                          <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-gray-500 font-mono">{igAutomation.safety.maxDmsPerDay}</span>
                                                            <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500" style={{width: `${(igAutomation.safety.maxDmsPerDay/200)*100}%`}}></div>
                                                            </div>
                                                          </div>
                                                      </div>
                                                      <div className="flex items-center justify-between">
                                                          <span className="text-[10px] text-gray-400">Avoid Duplicates</span>
                                                          <div className={`w-2 h-2 rounded-full ${igAutomation.safety.avoidDuplicates ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                      </div>
                                                      <div className="p-2 bg-yellow-900/20 border border-yellow-500/20 rounded flex gap-2">
                                                          <AlertTriangle size={12} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                                                          <p className="text-[9px] text-yellow-500/80 leading-tight">These limits are based on your account type to prevent bans.</p>
                                                      </div>
                                                  </div>
                                              )}
                                         </div>
                                     </div>

                                     {/* Column 2: Live Preview */}
                                     <div className="relative">
                                          <div className="sticky top-0">
                                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                  <Bell size={12} /> Live Preview
                                              </h3>
                                              
                                              {/* Phone Mockup */}
                                              <div className="bg-white text-black rounded-3xl border-8 border-gray-800 overflow-hidden shadow-2xl max-w-[280px] mx-auto">
                                                  {/* Status Bar */}
                                                  <div className="bg-white border-b flex justify-between px-4 py-2 text-[8px] font-bold text-gray-800">
                                                      <span>9:41</span>
                                                      <div className="flex gap-1">
                                                          <span>📶</span><span>🔋</span>
                                                      </div>
                                                  </div>

                                                  {/* Instagram UI - Post View */}
                                                  <div className="bg-gray-50 pb-4">
                                                      {/* Mock Post */}
                                                      <div className="aspect-[4/5] bg-gray-200 relative mb-2">
                                                          <video src={videoSrc} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                                                          <div className="absolute bottom-2 left-2 flex gap-2">
                                                              <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-white"></div>
                                                              <div className="text-[8px] text-white font-bold drop-shadow-md pt-1">@creator</div>
                                                          </div>
                                                      </div>
                                                      
                                                      {/* Mock Comment Section */}
                                                      <div className="px-3 space-y-3">
                                                          <div className="flex gap-2">
                                                              <div className="w-6 h-6 rounded-full bg-blue-100 flex-shrink-0"></div>
                                                              <div className="flex-1 bg-white p-2 rounded-lg rounded-tl-none shadow-sm border border-gray-100">
                                                                  <p className="text-[10px] font-bold">fan_user_123</p>
                                                                  <p className="text-[10px] text-gray-600">
                                                                      OMG! Where did you get that? Send link pls! 🔥
                                                                  </p>
                                                              </div>
                                                          </div>

                                                          {/* Mock DM Notification / Reply */}
                                                          {igAutomation.enabled && igAutomation.comment.enabled && (
                                                              <div className="animate-in slide-in-from-top-2 fade-in duration-700 delay-500">
                                                                  <div className="flex justify-center mb-2">
                                                                      <span className="text-[8px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                                                                          Bot sent DM • {igAutomation.comment.delay === 'INSTANT' ? 'Just now' : '12s ago'}
                                                                      </span>
                                                                  </div>
                                                                  <div className="flex gap-2 flex-row-reverse">
                                                                      <div className="w-6 h-6 rounded-full bg-red-500 flex-shrink-0 border-2 border-white"></div>
                                                                      <div className="flex-1 bg-blue-500 text-white p-2 rounded-lg rounded-tr-none shadow-md">
                                                                           <p className="text-[9px] leading-tight">
                                                                               {igAutomation.comment.dmMode === 'AI_SMART' 
                                                                                ? (igAutomation.comment.messageTemplate || "Here is the link!")
                                                                                : igAutomation.comment.messageTemplate || "Here is the link!"}
                                                                           </p>
                                                                      </div>
                                                                  </div>
                                                              </div>
                                                          )}
                                                      </div>
                                                  </div>
                                              </div>
                                              <p className="text-center text-[10px] text-gray-500 mt-3">Preview of customer experience</p>
                                          </div>
                                     </div>

                                 </div>
                            </div>
                        </>
                    ) : (
                        <div className="w-full max-w-2xl mx-auto space-y-6">
                             <div className="flex items-center justify-between mb-4">
                                 <h3 className="text-xl font-bold text-white">Publishing Progress</h3>
                                 {allDone && <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">All Completed</span>}
                             </div>

                             <div className="space-y-4">
                                 {selectedPlatforms.map(pid => {
                                     const prog = uploadProgress[pid];
                                     const conf = PLATFORMS_CONFIG[pid as SocialPlatform];
                                     const isIg = pid === 'INSTAGRAM';
                                     
                                     return (
                                         <div key={pid} className="bg-[#161616] border border-gray-800 p-4 rounded-xl">
                                             <div className="flex justify-between items-center mb-2">
                                                 <div className="flex items-center gap-3">
                                                     <div className="p-1.5 rounded bg-gray-800" style={{color: conf.color}}>{conf.icon}</div>
                                                     <span className="font-bold text-sm">{conf.label}</span>
                                                 </div>
                                                 <span className={`text-xs font-bold ${
                                                     prog.stage === 'DONE' ? 'text-green-500' : 
                                                     prog.stage === 'FAILED' ? 'text-red-500' : 'text-blue-400'
                                                 }`}>
                                                     {prog.stage === 'DONE' ? 'PUBLISHED' : prog.stage}
                                                 </span>
                                             </div>
                                             
                                             <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                                                 <div 
                                                    className={`h-full transition-all duration-300 ${prog.stage === 'DONE' ? 'bg-green-500' : 'bg-blue-600'}`} 
                                                    style={{ width: `${prog.progress}%` }}
                                                 ></div>
                                             </div>

                                             <div className="flex justify-between items-center">
                                                 <span className="text-[10px] text-gray-500">
                                                     {prog.stage === 'UPLOADING' && `Uploading... ${Math.round(prog.progress)}%`}
                                                     {prog.stage === 'PROCESSING' && 'Platform Processing...'}
                                                     {prog.stage === 'DONE' && 'Live on Platform'}
                                                 </span>
                                                 {prog.stage === 'DONE' && (
                                                     <a href={prog.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-blue-400 hover:underline">
                                                         View Video <LinkIcon size={10} />
                                                     </a>
                                                 )}
                                             </div>

                                             {/* Automation Status */}
                                             {isIg && igAutomation.enabled && prog.stage === 'DONE' && (
                                                 <div className="mt-3 pt-3 border-t border-gray-800 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                                                     <div className="flex items-center gap-2">
                                                         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                         <span className="text-[10px] font-bold text-gray-400">Automation Active:</span>
                                                         <span className="text-[10px] text-gray-500">Listening for {igAutomation.comment.triggerType === 'KEYWORDS' ? 'keywords' : 'comments'}...</span>
                                                     </div>
                                                     <button 
                                                        onClick={() => setShowLiveDashboard(true)}
                                                        className="w-full py-1.5 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                                     >
                                                         <Activity size={12} /> Open Live Dashboard
                                                     </button>
                                                 </div>
                                             )}
                                         </div>
                                     );
                                 })}
                             </div>
                             
                             {allDone && (
                                 <div className="mt-8 p-6 bg-green-900/20 border border-green-500/30 rounded-xl text-center animate-in zoom-in duration-300">
                                     <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20">
                                         <CheckCircle2 size={24} className="text-white" />
                                     </div>
                                     <h3 className="text-xl font-bold text-white">You're Live! 🚀</h3>
                                     <p className="text-sm text-gray-400 mt-2">Your video has been successfully published to all selected platforms.</p>
                                     <button onClick={onClose} className="mt-6 px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-bold text-sm transition-colors">
                                         Done
                                     </button>
                                 </div>
                             )}
                        </div>
                    )}

                </div>
            )}
            
        </div>
        
        {/* FOOTER */}
        {activeStep === 'ACCOUNTS' && (
             <div className="p-4 border-t border-gray-800 bg-[#161616] flex justify-end">
                 <button 
                    onClick={() => connectedCount > 0 && setActiveStep('UPLOAD')}
                    disabled={connectedCount === 0}
                    className="px-6 py-3 bg-white text-black rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    Next Step <ChevronRight size={16} />
                 </button>
             </div>
        )}
        {activeStep === 'UPLOAD' && !isUploading && (
             <div className="p-4 border-t border-gray-800 bg-[#161616] flex justify-end">
                 <button 
                    onClick={startUpload}
                    disabled={selectedPlatforms.length === 0}
                    className="px-6 py-3 bg-white text-black rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-white/10"
                 >
                    {igAutomation.enabled ? <Zap size={20} className="text-yellow-400" /> : <UploadCloud size={20} />}
                    {igAutomation.enabled ? 'Publish + Activate Automation' : 'Publish Only'}
                 </button>
             </div>
        )}
      </div>
    </div>
  );
};

// Icon helper
const ChevronRight = ({size}:{size:number}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;

export default SocialPublisher;