import React, { useState, useRef } from 'react';
import { Video, Zap, Play, Pause, Loader2, Smartphone } from 'lucide-react';
import { ProcessingStatus, Caption, AspectRatio, StickerItem } from '../types';

interface VideoPreviewAreaProps {
  videoSrc: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setVideoSrc: (src: string) => void;
  setVideoFile: (file: File) => void;
  setStatus: (status: ProcessingStatus) => void;
  handleTimeUpdate: () => void;
  isPlaying: boolean;
  togglePlay: () => void;
  status: ProcessingStatus;
  exportProgress: number;
  captions?: Caption[];
  updateCaption?: (id: string, updates: Partial<Caption>) => void;
  showSafeZones?: boolean;
  aspectRatio?: AspectRatio;
  stickers?: StickerItem[];
  updateSticker?: (id: string, updates: Partial<StickerItem>) => void;
  activeTool?: any; // ActiveTool type
}

// Map aspect ratio enum to CSS class
const ASPECT_RATIO_CLASS: Record<string, string> = {
  '9:16': 'aspect-[9/16]',
  '16:9': 'aspect-[16/9]',
  '1:1': 'aspect-[1/1]',
  '4:5': 'aspect-[4/5]',
};

const VideoPreviewArea: React.FC<VideoPreviewAreaProps> = ({
  videoSrc,
  videoRef,
  canvasRef,
  handleFileUpload,
  setVideoSrc,
  setVideoFile,
  setStatus,
  handleTimeUpdate,
  isPlaying,
  togglePlay,
  status,
  exportProgress,
  captions = [],
  updateCaption,
  showSafeZones = false,
  aspectRatio = '9:16',
  stickers = [],
  updateSticker,
  activeTool,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCaptionId, setDraggedCaptionId] = useState<string | null>(null);
  const [draggedStickerId, setDraggedStickerId] = useState<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!videoRef.current) {
      togglePlay();
      return;
    }
    const time = videoRef.current.currentTime;
    
    // First, check if we're clicking a sticker (they render on top)
    if (activeTool === 'STICKERS') {
      const activeSticker = stickers.find(s => time >= s.startTime && time <= s.endTime);
      // Rough bounding box check could go here if we tracked precise text dimension
      if (activeSticker && updateSticker) {
        setIsDragging(true);
        setDraggedStickerId(activeSticker.id);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }

    const activeCaption = captions.find(c => time >= c.startTime && time <= c.endTime);

    if (activeCaption && updateCaption) {
      setIsDragging(true);
      setDraggedCaptionId(activeCaption.id);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      togglePlay();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert to normalized coordinates based on the display dimensions
    let normX = x / rect.width;
    let normY = y / rect.height;

    // Clamp to prevent dragging completely off-screen
    normX = Math.max(0.05, Math.min(normX, 0.95));
    normY = Math.max(0.05, Math.min(normY, 0.95));

    if (draggedStickerId && updateSticker) {
      updateSticker(draggedStickerId, { x: normX, y: normY });
    } else if (draggedCaptionId && updateCaption) {
      updateCaption(draggedCaptionId, { customX: normX, customY: normY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setIsDragging(false);
      setDraggedCaptionId(null);
      setDraggedStickerId(null);
      e.currentTarget.releasePointerCapture(e.pointerId);
      
      // If mouse moved very little, treat as click to toggle play
      const dx = Math.abs(e.clientX - dragStartPos.current.x);
      const dy = Math.abs(e.clientY - dragStartPos.current.y);
      if (dx < 5 && dy < 5) {
        togglePlay();
      }
    }
  };

  const aspectClass = ASPECT_RATIO_CLASS[aspectRatio] || 'aspect-[9/16]';

  return (
    <>
      {!videoSrc ? (
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Video size={48} className="text-blue-500" />
          </div>
          <h2 className="text-3xl font-black text-white">Upload Your Video</h2>
          <p className="text-gray-500 text-sm">
            Drag & drop or select a vertical video (9:16) for Reels, TikTok, or Shorts.
          </p>
          <div className="flex flex-col gap-3 w-full px-12">
            <label className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold cursor-pointer active:scale-95 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
              <Video size={18} />
              Select File
              <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <button 
              onClick={async () => {
                const sampleUrl = '/test video.mp4';
                setStatus('IDLE');
                try {
                  const response = await fetch(sampleUrl);
                  if (!response.ok) throw new Error('Local file not found via fetch');
                  const blob = await response.blob();
                  const file = new File([blob], "test video.mp4", { type: "video/mp4" });
                  setVideoFile(file);
                  const objectUrl = URL.createObjectURL(file);
                  setVideoSrc(objectUrl);
                } catch (e) {
                  console.error("Failed to load local sample video, trying remote fallback", e);
                  try {
                    const remoteUrl = 'https://storage.googleapis.com/generativeai-downloads/images/test%20video.mp4';
                    const response = await fetch(remoteUrl);
                    if (!response.ok) throw new Error('Remote file fetch failed');
                    const blob = await response.blob();
                    const file = new File([blob], "test video.mp4", { type: "video/mp4" });
                    setVideoFile(file);
                    const objectUrl = URL.createObjectURL(file);
                    setVideoSrc(objectUrl);
                  } catch (remoteErr) {
                    console.error("Both local and remote sample video failed", remoteErr);
                    setStatus('IDLE');
                  }
                }
              }}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-3.5 rounded-xl font-bold active:scale-95 transition-all border border-gray-700 flex items-center justify-center gap-2"
            >
              <Zap size={16} className="text-yellow-500" />
              Use Sample Video
            </button>
          </div>
        </div>
      ) : (
        /* Bug 6 Fix: Add `group` class so group-hover:opacity-100 on controls works.
           Bug 16 Fix: Apply dynamically chosen aspect ratio class. */
        <div className={`group relative h-full max-h-[85vh] ${aspectClass} bg-black rounded-[2rem] shadow-2xl overflow-hidden border-[6px] border-[#222] ring-1 ring-white/10 z-20`}>
          {/* Bug 5 Fix: use onLoadedMetadata (fires after dimensions are confirmed) instead
              of onLoadedData. Also removed forced seek to 0.1 (Bug 15). */}
          <video 
            ref={videoRef as any} 
            src={videoSrc} 
            className="absolute inset-0 w-full h-full object-cover hidden" 
            onTimeUpdate={handleTimeUpdate} 
            onLoadedMetadata={() => {
              if (videoRef.current && canvasRef.current) {
                const vw = videoRef.current.videoWidth;
                const vh = videoRef.current.videoHeight;
                if (vw > 0 && vh > 0) {
                  canvasRef.current.width = vw;
                  canvasRef.current.height = vh;
                }
              }
            }}
            crossOrigin="anonymous"
            playsInline
            preload="auto"
          />
          <canvas 
            ref={canvasRef as any} 
            className={`w-full h-full object-contain ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} z-10 relative`} 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          
          {/* Safe Zones Overlay */}
          {showSafeZones && (
            <div className="absolute inset-0 pointer-events-none z-20 border-[2px] border-yellow-400/30">
              {/* Top gradient for back button/header */}
              <div className="absolute top-0 left-0 right-0 h-[10%] bg-gradient-to-b from-black/40 to-transparent border-b border-yellow-400/30 font-mono text-[10px] text-yellow-400/80 pl-2 pt-2">HEADER SAFE ZONE</div>
              
              {/* Right side icons */}
              <div className="absolute top-[40%] right-2 bottom-[20%] w-[12%] border border-yellow-400/30 bg-black/20 flex items-center justify-center font-mono text-[10px] text-yellow-400/80 rotate-90 origin-center whitespace-nowrap">ENGAGEMENT SAFE ZONE</div>
              
              {/* Bottom bio/music area */}
              <div className="absolute bottom-0 left-0 right-0 h-[25%] bg-gradient-to-t from-black/60 to-transparent border-t border-yellow-400/30 font-mono text-[10px] text-yellow-400/80 pl-2 pb-2 flex items-end">DESCRIPTION SAFE ZONE</div>
              
              <div className="absolute top-4 right-4 bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded backdrop-blur-sm text-xs border border-yellow-400/40 flex items-center gap-1">
                <Smartphone size={12} />
                <span>TikTok / Reels Guide</span>
              </div>
            </div>
          )}
          
          {/* Overlay Controls — Bug 6 Fix: group class on parent makes this work */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 px-6 py-3 bg-black/60 backdrop-blur-md rounded-full border border-white/10 transition-opacity hover:opacity-100 opacity-0 group-hover:opacity-100">
              <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors">
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              </button>
          </div>

          {(status === 'UPLOADING' || status === 'TRANSCRIBING' || status === 'EXPORTING') && (
            <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center text-center p-8 backdrop-blur-md">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                <Loader2 size={56} className="animate-spin text-blue-500 relative z-10" />
              </div>
              <h3 className="text-xl font-black text-white mb-2 tracking-tight">
                {status === 'EXPORTING' ? 'Finalizing Video...' : (status === 'UPLOADING' ? 'Uploading Media...' : 'AI Transcribing...')}
              </h3>
              <p className="text-gray-400 text-xs font-medium max-w-[200px]">
                {status === 'EXPORTING' ? `Burning captions: ${exportProgress}%` : 'Analyzing speech patterns and generating viral captions.'}
              </p>
            </div>
          )}
          
          {status === 'READY' && !isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-2xl animate-pulse">
                <Play size={36} className="text-white fill-white ml-2" />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default VideoPreviewArea;
