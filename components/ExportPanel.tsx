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
        { id: 'LOW' as const, label: 'Low', desc: '2 Mbps', color: 'text-gray-400' },
        { id: 'MEDIUM' as const, label: 'Medium', desc: '5 Mbps', color: 'text-blue-400' },
        { id: 'HIGH' as const, label: 'High', desc: '8 Mbps', color: 'text-green-400' },
        { id: 'ULTRA' as const, label: 'Ultra', desc: '15 Mbps', color: 'text-yellow-400' },
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                            <Download size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white">Export Video</h2>
                            <p className="text-[10px] text-gray-500">Choose quality settings</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                    {/* Social Media Presets */}
                    <section className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Smartphone size={11} /> Quick Export
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {SOCIAL_EXPORT_PRESETS.slice(0, 3).map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => applySocialPreset(preset)}
                                    className="p-2.5 rounded-xl border bg-gray-900 border-gray-800 hover:border-blue-500/50 hover:bg-blue-600/10 transition-all text-center group"
                                >
                                    <div className="text-xl mb-1">{preset.icon}</div>
                                    <div className="text-[9px] font-bold text-gray-400 group-hover:text-blue-300 truncate">{preset.name}</div>
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {SOCIAL_EXPORT_PRESETS.slice(3).map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => applySocialPreset(preset)}
                                    className="p-2.5 rounded-xl border bg-gray-900 border-gray-800 hover:border-blue-500/50 hover:bg-blue-600/10 transition-all text-center group"
                                >
                                    <div className="text-xl mb-1">{preset.icon}</div>
                                    <div className="text-[9px] font-bold text-gray-400 group-hover:text-blue-300 truncate">{preset.name}</div>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Resolution */}
                    <section className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Film size={11} /> Resolution
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {RESOLUTIONS.map(res => (
                                <button
                                    key={res.id}
                                    onClick={() => setOptions(o => ({ ...o, resolution: res.id }))}
                                    className={`p-3 rounded-xl border text-center transition-all ${options.resolution === res.id
                                            ? 'bg-blue-600/20 border-blue-500/60'
                                            : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                                        }`}
                                >
                                    <div className={`text-xs font-black ${options.resolution === res.id ? 'text-blue-300' : 'text-gray-300'}`}>
                                        {res.label}
                                    </div>
                                    <div className="text-[9px] text-gray-600 mt-0.5">{res.desc}</div>
                                    <div className="text-[9px] text-gray-700 mt-0.5">{res.size}</div>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* FPS */}
                    <section className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Zap size={11} /> Frame Rate
                        </label>
                        <div className="flex gap-2">
                            {FPS_OPTIONS.map(fps => (
                                <button
                                    key={fps.id}
                                    onClick={() => setOptions(o => ({ ...o, fps: fps.id }))}
                                    className={`flex-1 p-3 rounded-xl border text-center transition-all ${options.fps === fps.id
                                            ? 'bg-purple-600/20 border-purple-500/60'
                                            : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                                        }`}
                                >
                                    <div className={`text-xs font-black ${options.fps === fps.id ? 'text-purple-300' : 'text-gray-300'}`}>
                                        {fps.label}
                                    </div>
                                    <div className="text-[9px] text-gray-600">{fps.desc}</div>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Bitrate */}
                    <section className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Settings2 size={11} /> Quality
                        </label>
                        <div className="flex gap-2">
                            {BITRATES.map(br => (
                                <button
                                    key={br.id}
                                    onClick={() => setOptions(o => ({ ...o, bitrate: br.id }))}
                                    className={`flex-1 p-2.5 rounded-xl border text-center transition-all ${options.bitrate === br.id
                                            ? 'bg-gray-700 border-gray-500'
                                            : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                                        }`}
                                >
                                    <div className={`text-[10px] font-black ${options.bitrate === br.id ? br.color : 'text-gray-500'}`}>
                                        {br.label}
                                    </div>
                                    <div className="text-[9px] text-gray-700">{br.desc}</div>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Format & Audio */}
                    <section className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Format</label>
                        <div className="flex gap-2">
                            {(['mp4', 'webm'] as const).map(fmt => (
                                <button
                                    key={fmt}
                                    onClick={() => setOptions(o => ({ ...o, format: fmt }))}
                                    className={`flex-1 py-2.5 rounded-xl border text-xs font-black uppercase transition-all ${options.format === fmt
                                            ? 'bg-gray-700 border-gray-500 text-white'
                                            : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700'
                                        }`}
                                >
                                    .{fmt}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Audio Toggle */}
                    <section className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Include Audio</span>
                        <button
                            onClick={() => setOptions(o => ({ ...o, audioEnabled: !o.audioEnabled }))}
                            className={`w-10 h-5 rounded-full transition-all relative ${options.audioEnabled ? 'bg-green-500' : 'bg-gray-700'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${options.audioEnabled ? 'left-5.5' : 'left-0.5'}`}
                                 style={{ left: options.audioEnabled ? '22px' : '2px' }}
                            />
                        </button>
                    </section>
                </div>

                {/* Export Button */}
                <div className="p-5 pt-0 flex-shrink-0">
                    {isExporting ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span className="flex items-center gap-2">
                                    <Loader2 size={14} className="animate-spin text-blue-400" />
                                    Exporting...
                                </span>
                                <span className="font-mono font-bold text-white">{exportProgress}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-300"
                                    style={{ width: `${exportProgress}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-gray-600 text-center">
                                Do not close this window during export
                            </p>
                        </div>
                    ) : (
                        <button
                            onClick={() => onExport(options)}
                            className="w-full bg-white text-black py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-200 active:scale-95 transition-all shadow-xl"
                        >
                            <Download size={18} /> Export Video
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExportPanel;
