import React, { useState } from 'react';
import { Download, Film, Zap, Settings2, X, Loader2, Smartphone } from 'lucide-react';
import { ExportOptions } from '../types';
import { SOCIAL_EXPORT_PRESETS, SocialExportPreset } from '../services/GradientTextPresets';

interface ExportPanelProps {
    onExport: (options: ExportOptions) => void;
    onClose: () => void;
    isExporting: boolean;
    exportProgress: number;
}

const ExportPanel: React.FC<ExportPanelProps> = ({
    onExport,
    onClose,
    isExporting,
    exportProgress,
}) => {
    const [options, setOptions] = useState<ExportOptions>({
        resolution: '1080p',
        fps: 30,
        bitrate: 'HIGH',
        format: 'mp4',
        audioEnabled: true,
    });

    const RESOLUTIONS = [
        { id: '720p' as const, label: '720p HD', desc: '1280×720', size: '~50MB/min' },
        { id: '1080p' as const, label: '1080p FHD', desc: '1920×1080', size: '~120MB/min' },
        { id: '4K' as const, label: '4K UHD', desc: '3840×2160', size: '~400MB/min' },
    ];

    const FPS_OPTIONS = [
        { id: 24 as const, label: '24 FPS', desc: 'Cinematic' },
        { id: 30 as const, label: '30 FPS', desc: 'Standard' },
        { id: 60 as const, label: '60 FPS', desc: 'Smooth' },
    ];

    const BITRATES = [
        { id: 'LOW' as const, label: 'Low', desc: '2 Mbps', glowClass: 'shadow-[0_0_15px_rgba(156,163,175,0.4)]', colorClass: 'text-gray-300' },
        { id: 'MEDIUM' as const, label: 'Medium', desc: '5 Mbps', glowClass: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]', colorClass: 'text-blue-400' },
        { id: 'HIGH' as const, label: 'High', desc: '8 Mbps', glowClass: 'shadow-[0_0_15px_rgba(34,197,94,0.4)]', colorClass: 'text-green-400' },
        { id: 'ULTRA' as const, label: 'Ultra', desc: '15 Mbps', glowClass: 'shadow-[0_0_15px_rgba(234,179,8,0.4)]', colorClass: 'text-yellow-400' },
    ];

    const applySocialPreset = (preset: SocialExportPreset) => {
        setOptions({
            resolution: preset.resolution,
            fps: preset.fps,
            bitrate: preset.bitrate,
            format: preset.format,
            audioEnabled: true,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="bg-[#0a0a0add] backdrop-blur-2xl ring-1 ring-white/10 border border-white/5 rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col relative">
                
                {/* Decorative background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-blue-500/10 blur-[60px] pointer-events-none rounded-full" />

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 ring-1 ring-white/10 flex items-center justify-center shadow-lg shadow-blue-500/10">
                            <Download size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-wide">Export Video</h2>
                            <p className="text-xs tracking-wider text-gray-400 uppercase mt-0.5">Render Settings</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 relative z-10">


                    {/* Resolution */}
                    <section className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Film size={12} className="text-cyan-400" /> Resolution
                        </label>
                        <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-black/40 border border-white/5 ring-1 ring-white/5 inset-shadow-sm">
                            {RESOLUTIONS.map(res => {
                                const isActive = options.resolution === res.id;
                                return (
                                    <button
                                        key={res.id}
                                        onClick={() => setOptions(o => ({ ...o, resolution: res.id }))}
                                        className={`p-3 rounded-[12px] text-center transition-all duration-300 relative ${isActive
                                                ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                                                : 'border border-transparent hover:bg-white/5 hover:border-white/5'
                                            }`}
                                    >
                                        <div className={`text-xs font-black tracking-wider ${isActive ? 'text-cyan-300 drop-shadow-[0_0_5px_rgba(103,232,249,0.5)]' : 'text-gray-400'}`}>
                                            {res.label}
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-0.5">{res.desc}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* FPS */}
                    <section className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Zap size={12} className="text-purple-400" /> Frame Rate
                        </label>
                        <div className="flex gap-2 p-1 rounded-2xl bg-black/40 border border-white/5 ring-1 ring-white/5">
                            {FPS_OPTIONS.map(fps => {
                                const isActive = options.fps === fps.id;
                                return (
                                    <button
                                        key={fps.id}
                                        onClick={() => setOptions(o => ({ ...o, fps: fps.id }))}
                                        className={`flex-1 p-2.5 rounded-[12px] text-center transition-all duration-300 ${isActive
                                                ? 'bg-gradient-to-br from-purple-500/20 to-fuchsia-600/20 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                                                : 'border border-transparent hover:bg-white/5 hover:border-white/5'
                                            }`}
                                    >
                                        <div className={`text-[11px] font-black tracking-wider ${isActive ? 'text-purple-300 drop-shadow-[0_0_5px_rgba(216,180,254,0.5)]' : 'text-gray-400'}`}>
                                            {fps.label}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    {/* Bitrate */}
                    <section className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Settings2 size={12} className="text-yellow-400" /> Quality / Bitrate
                        </label>
                        <div className="flex gap-2 p-1 rounded-2xl bg-black/40 border border-white/5 ring-1 ring-white/5">
                            {BITRATES.map(br => {
                                const isActive = options.bitrate === br.id;
                                return (
                                    <button
                                        key={br.id}
                                        onClick={() => setOptions(o => ({ ...o, bitrate: br.id }))}
                                        className={`flex-1 p-2 rounded-[12px] text-center transition-all duration-300 ${isActive
                                                ? `bg-white/10 border border-white/20 ${br.glowClass}`
                                                : 'border border-transparent hover:bg-white/5 hover:border-white/5'
                                            }`}
                                    >
                                        <div className={`text-[10px] font-black uppercase tracking-wider ${isActive ? br.colorClass : 'text-gray-500'}`}>
                                            {br.label}
                                        </div>
                                        <div className={`text-[9px] mt-0.5 ${isActive ? 'text-white/70' : 'text-gray-600'}`}>{br.desc}</div>
                                    </button>
                                )
                            })}
                        </div>
                    </section>
                    
                    {/* Format & Audio Row */}
                    <div className="flex gap-4">
                        {/* Format */}
                        <section className="flex-1 space-y-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Format</label>
                            <div className="flex gap-2 p-1 rounded-2xl bg-black/40 border border-white/5 ring-1 ring-white/5">
                                {(['mp4', 'webm'] as const).map(fmt => (
                                    <button
                                        key={fmt}
                                        onClick={() => setOptions(o => ({ ...o, format: fmt }))}
                                        className={`flex-1 py-2.5 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all ${options.format === fmt
                                                ? 'bg-white/15 border border-white/20 text-white shadow-xl'
                                                : 'border border-transparent hover:bg-white/5 text-gray-500'
                                            }`}
                                    >
                                        .{fmt}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Audio Toggle */}
                        <section className="flex-1 space-y-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Audio</label>
                            <div className="flex items-center justify-between p-2 px-4 rounded-xl border border-white/5 bg-black/40 ring-1 ring-white/5 h-[46px]">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Include</span>
                                <button
                                    onClick={() => setOptions(o => ({ ...o, audioEnabled: !o.audioEnabled }))}
                                    className={`w-11 h-6 rounded-full transition-all relative shadow-inner ${options.audioEnabled ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-gray-800'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-md ${options.audioEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Export Button */}
                <div className="p-6 pt-2 flex-shrink-0 relative z-10 border-t border-white/5 mt-2 bg-[#0a0a0add]">
                    {isExporting ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs text-blue-300 font-bold tracking-widest uppercase">
                                <span className="flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                                    Rendering Video...
                                </span>
                                <span className="font-mono text-cyan-200">{exportProgress}%</span>
                            </div>
                            <div className="w-full h-3 bg-black/50 border border-white/5 rounded-full overflow-hidden ring-1 ring-black/50 inset-shadow-sm p-0.5">
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 rounded-full transition-all duration-300 relative"
                                    style={{ width: `${exportProgress}%` }}
                                >
                                    {/* Shimmer effect inside progress bar */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-[shimmer_2s_infinite]" style={{ backgroundSize: '200% 100%' }} />
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-500 text-center tracking-widest uppercase font-bold">
                                Please keep this window open
                            </p>
                        </div>
                    ) : (
                        <button
                            onClick={() => onExport(options)}
                            className="group relative w-full overflow-hidden rounded-2xl p-[1px] font-black text-sm uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-all active:scale-[0.98]"
                        >
                            {/* Animated gradient border */}
                            <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#312e81_0%,#818cf8_50%,#312e81_100%)]" />
                            
                            {/* Button background */}
                            <div className="relative flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white py-4 rounded-2xl w-full transition-all border border-white/10">
                                <Download size={18} className="drop-shadow-lg" />
                                <span className="drop-shadow-md">Begin Export</span>
                            </div>
                        </button>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%) }
                    100% { transform: translateX(100%) }
                }
            `}</style>
        </div>
    );
};

export default ExportPanel;
