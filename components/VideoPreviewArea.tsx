import React, { useState, useRef } from 'react';
import { Video, Zap, Play, Pause, Loader2, Smartphone, ThumbsUp, ThumbsDown, MessageSquare, Share2, Repeat, Heart, Send, Bookmark, MoreHorizontal, MoreVertical, Music, User, Camera, MessageCircle, Forward, Search } from 'lucide-react';
import { ProcessingStatus, Caption, AspectRatio, StickerItem } from '../types';

const YTSvgThumbUp = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className} width="24" height="24">
    <path d="M18.77,11h-4.23l1.52-4.94C16.38,5.03,15.54,4,14.38,4c-0.58,0-1.14,0.24-1.52,0.65L7,11H3v10h4h1h9.43 c1.06,0,1.98-0.67,2.19-1.61l1.34-6C21.23,12.15,20.18,11,18.77,11z M7,20H4v-8h3V20z M19.98,13.17l-1.34,6 C18.54,19.65,18.03,20,17.43,20H8v-8.61l5.6-6.06C13.84,5.07,14.08,5,14.38,5c0.26,0,0.5,0.11,0.63,0.3 c0.07,0.1,0.15,0.26,0.09,0.47l-1.52,4.94L13.18,12h1.35h4.23c0.41,0,0.8,0.17,1.03,0.46C19.92,12.61,20.05,12.86,19.98,13.17z"/>
  </svg>
);
const YTSvgThumbDown = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className} width="24" height="24">
    <path d="M17,4h-1H6.57C5.5,4,4.59,4.67,4.38,5.61l-1.34,6C2.77,12.85,3.82,14,5.23,14h4.23l-1.52,4.94C7.62,19.97,8.46,21,9.62,21 c0.58,0,1.14-0.24,1.52-0.65L17,14h4V4H17z M10.4,19.67C10.21,19.88,9.92,20,9.62,20c-0.26,0-0.5-0.11-0.63-0.3 c-0.07-0.1-0.15-0.26-0.09-0.47l1.52-4.94l0.4-1.29H9.46H5.23c-0.41,0-0.8-0.17-1.03-0.46c-0.14-0.15-0.26-0.4-0.19-0.71l1.34-6 C5.46,5.35,5.97,5,6.57,5H16v8.61L10.4,19.67z M20,13h-3V5h3V13z"/>
  </svg>
);
const YTSvgComment = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className} width="24" height="24">
    <path d="M9,15h9v-1H9V15z M9,11h9v-1H9V11z M9,7h9v-1H9V7z M22,2v20l-4-4H4V2H22z M21,3H5v14h13.17l2.83,2.83V3z M5,14V4h16v13.17 L18.17,14H5z"/>
  </svg>
);
const YTSvgShare = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className} width="24" height="24">
    <path d="M15,5.63L20.66,12L15,18.37V14h-1c-3.96,0-7.14,1-9.75,3.09c1.84-4.07,5.11-6.4,9.89-7.1l0.86-0.13V5.63 M14,3v6 C6.22,10.13,3.11,15.33,2,21c2.78-3.97,6.44-6,12-6v6l8-9L14,3L14,3z"/>
  </svg>
);
const YTSvgRemix = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} width="24" height="24">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <polyline points="11 3 11 11 14 8 17 11 17 3"></polyline>
  </svg>
);
const TKSvgHeart = ({ className }: { className?: string }) => (
  <svg width="36" height="36" viewBox="0 0 48 48" fill="white" className={className} xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M24 41.516L23.447 41.096C12.607 32.844 5 25.101 5 15.688C5 8.914 10.321 3.5 17.151 3.5C21.01 3.5 24.316 5.342 26.243 8.307C28.17 5.342 31.477 3.5 35.335 3.5C42.166 3.5 47.487 8.914 47.487 15.688C47.487 25.101 39.88 32.844 29.04 41.096L28.487 41.516C27.18 42.508 25.307 42.508 24 41.516Z" />
  </svg>
);
const TKSvgComment = ({ className }: { className?: string }) => (
  <svg width="34" height="34" viewBox="0 0 48 48" fill="white" className={className} xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M24 4C12.954 4 4 11.908 4 21.662C4 27.289 6.945 32.33 11.583 35.539L11.83 35.711C11.603 36.657 11.139 37.818 10.342 39.294L9.845 40.211C9.489 40.869 10.038 41.638 10.768 41.498L11.565 41.344C13.883 40.898 16.035 40.093 17.9 38.991C19.826 39.646 21.875 40 24 40C35.046 40 44 32.092 44 22.338C44 12.585 35.046 4 24 4ZM15 24C16.1046 24 17 23.1046 17 22C17 20.8954 16.1046 20 15 20C13.8954 20 13 20.8954 13 22C13 23.1046 13.8954 24 15 24ZM26 22C26 23.1046 25.1046 24 24 24C22.8954 24 22 23.1046 22 22C22 20.8954 22.8954 20 24 20C25.1046 20 26 20.8954 26 22ZM33 24C34.1046 24 35 23.1046 35 22C35 20.8954 34.1046 20 33 20C31.8954 20 31 20.8954 31 22C31 23.1046 31.8954 24 33 24Z" />
  </svg>
);
const TKSvgBookmark = ({ className }: { className?: string }) => (
  <svg width="34" height="34" viewBox="0 0 48 48" fill="white" className={className} xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M13.5 7.5C12.119 7.5 11 8.619 11 10V41C11 41.873 11.558 42.648 12.385 42.924C13.212 43.201 14.128 42.919 14.664 42.222L24 30.081L33.336 42.222C33.872 42.919 34.788 43.201 35.615 42.924C36.442 42.648 37 41.873 37 41V10C37 8.619 35.881 7.5 34.5 7.5H13.5Z" />
  </svg>
);
const TKSvgShare = ({ className }: { className?: string }) => (
  <svg width="34" height="34" viewBox="0 0 49 48" fill="white" className={className} xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M43.082 24.5C43.082 24.966 42.859 25.405 42.483 25.683L19.483 42.683C18.96 43.069 18.239 43.104 17.676 42.77C17.113 42.436 16.793 41.83 16.804 41.178L16.945 32.909C9.284 34.026 3.12 39.467 1.348 46.901C1.048 48.161 -0.669 47.962 -0.564 46.618C1.517 20.088 12.378 14.814 17.279 14.281L17.29 6.822C17.29 6.171 17.611 5.565 18.174 5.231C18.736 4.897 19.458 4.931 19.981 5.318L42.483 23.318C42.86 23.596 43.082 24.035 43.082 24.5Z" />
  </svg>
);
const IGSvgHeart = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className={className} width="28" height="28" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);
const IGSvgComment = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className={className} width="27" height="27" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}>
    <path strokeLinejoin="round" strokeLinecap="round" d="M20.656 17.008a9.993 9.993 0 10-3.59 3.615L22 22z"/>
  </svg>
);
const IGSvgSend = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className={className} width="27" height="27" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}>
    <line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round" strokeLinejoin="round"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IGSvgMore = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className} width="24" height="24" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}>
    <circle cx="12" cy="12" r="2.5"/><circle cx="19.5" cy="12" r="2.5"/><circle cx="4.5" cy="12" r="2.5"/>
  </svg>
);

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
  safeZonePlatform?: 'SHORTS' | 'TIKTOK' | 'INSTAGRAM';
  aspectRatio?: AspectRatio;
  stickers?: StickerItem[];
  updateSticker?: (id: string, updates: Partial<StickerItem>) => void;
  activeTool?: any; // ActiveTool type
  videoIntrinsicRatio?: number | null;
  setVideoIntrinsicRatio?: (ratio: number) => void;
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
  safeZonePlatform = 'SHORTS',
  aspectRatio = '9:16',
  stickers = [],
  updateSticker,
  activeTool,
  videoIntrinsicRatio = null,
  setVideoIntrinsicRatio,
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

  const aspectClass = aspectRatio === 'ORIGINAL' ? '' : (ASPECT_RATIO_CLASS[aspectRatio] || 'aspect-[9/16]');
  const inlineStyle = aspectRatio === 'ORIGINAL' && videoIntrinsicRatio ? { aspectRatio: videoIntrinsicRatio } : {};

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
          <div className="flex flex-col gap-3 w-full px-6 md:px-12">
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
           Bug 16 Fix: Apply dynamically chosen aspect ratio class or inline style. */
        <div 
          className={`group relative h-full max-h-[85vh] max-w-full ${aspectClass} bg-black rounded-[2rem] shadow-2xl overflow-hidden border-[6px] border-[#222] ring-1 ring-white/10 z-20 transition-all duration-300`}
          style={inlineStyle}
        >
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
                  if (setVideoIntrinsicRatio) setVideoIntrinsicRatio(vw / vh);
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
          
          {/* Safe Zones Overlay - Exact Previews */}
          {showSafeZones && (
            <div className="absolute inset-0 pointer-events-none z-40">
              {/* Platform specific overlays */}
              {safeZonePlatform === 'SHORTS' && (
                <>
                  {/* YouTube Shorts Top Right */}
                  <div className="absolute top-4 right-4 text-white flex gap-4 drop-shadow-md z-50">
                     <Search size={22} className="opacity-90 drop-shadow-lg" />
                     <MoreVertical size={22} className="opacity-90 drop-shadow-lg" />
                  </div>
                  {/* YouTube Shorts Icons (Right side) */}
                  <div className="absolute right-3 bottom-[12%] flex flex-col items-center gap-[22px] z-50 text-white drop-shadow-md">
                    <div className="flex flex-col items-center gap-[6px]"><YTSvgThumbUp className="drop-shadow-lg" /><span className="text-[13px] font-medium tracking-wide">1.2M</span></div>
                    <div className="flex flex-col items-center gap-[6px]"><YTSvgThumbDown className="drop-shadow-lg" /><span className="text-[13px] font-medium tracking-wide">Dislike</span></div>
                    <div className="flex flex-col items-center gap-[6px]"><YTSvgComment className="drop-shadow-lg" /><span className="text-[13px] font-medium tracking-wide">45K</span></div>
                    <div className="flex flex-col items-center gap-[6px]"><YTSvgShare className="drop-shadow-lg" /><span className="text-[13px] font-medium tracking-wide">Share</span></div>
                    <div className="flex flex-col items-center gap-[6px]"><YTSvgRemix className="drop-shadow-lg" /><span className="text-[13px] font-medium tracking-wide">Remix</span></div>
                    <div className="w-[40px] h-[40px] mt-2 bg-gradient-to-tr from-gray-900 to-gray-700 rounded-lg flex items-center justify-center border-[2.5px] border-white overflow-hidden shadow-lg"><Music size={20} className="text-gray-300" /></div>
                  </div>
                  {/* YouTube Shorts Description (Bottom) */}
                  <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gradient-to-t from-black/80 via-black/30 to-transparent z-40"></div>
                  <div className="absolute bottom-6 left-4 right-[20%] flex flex-col gap-3 z-50 text-white drop-shadow-md">
                    <div className="flex items-center gap-2.5">
                        <div className="w-[34px] h-[34px] rounded-full bg-gray-500 border border-white/20 flex items-center justify-center overflow-hidden"><User size={20} className="text-white/80" /></div>
                        <span className="font-bold text-[15px] tracking-wide">@ChannelName</span>
                        <button className="bg-white text-black px-4 py-1.5 rounded-full text-[13px] font-black tracking-wide ml-1">Subscribe</button>
                    </div>
                    <p className="text-[14.5px] font-medium leading-[1.3] line-clamp-2 drop-shadow-lg pr-4">This is an amazing short video showing off this cool new feature! #shorts #viral</p>
                    <div className="flex items-center gap-2 mt-1 -ml-1 text-[13px] font-medium opacity-90">
                        <Music size={14} className="ml-1" />
                        <span className="whitespace-nowrap overflow-hidden overflow-ellipsis tracking-wide">Original Sound - @ChannelName</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 border border-white/10 pointer-events-none rounded-[1.8rem]" />
                  {/* Progress Bar (Shorts) */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-50 rounded-b-[1.75rem] overflow-hidden">
                    <div className="h-full bg-red-600 w-1/3"></div>
                  </div>
                </>
              )}
              {safeZonePlatform === 'TIKTOK' && (
                <>
                  {/* TikTok Search (Top Right) */}
                  <div className="absolute top-[5%] right-4 text-white flex gap-5 drop-shadow-md z-50 opacity-90">
                     <Search size={22} strokeWidth={2.5} />
                  </div>
                  {/* TikTok Live/Following/ForYou (Top) */}
                  <div className="absolute top-[5%] left-0 right-0 flex justify-center gap-4 text-white font-bold text-shadow text-[15px] z-50 drop-shadow-lg opacity-90">
                     <span className="text-white/60">Following</span>
                     <span className="relative">For You<div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-7 h-[3px] bg-white rounded-full"></div></span>
                  </div>
                  {/* TikTok Icons (Right side) */}
                  <div className="absolute right-2 bottom-[8%] flex flex-col items-center gap-[22px] z-50 text-white drop-shadow-md">
                    <div className="w-[46px] h-[46px] rounded-full bg-gray-300 border-[1.5px] border-white mb-2 relative flex items-center justify-center overflow-visible shadow-sm">
                        <User size={26} className="text-gray-500" />
                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[#FE2C55] text-white text-[14px] w-[20px] h-[20px] rounded-full flex items-center justify-center font-black border-2 border-white leading-none pb-0.5">+</div>
                    </div>
                    <div className="flex flex-col items-center gap-[4px]"><TKSvgHeart className="drop-shadow-lg" /><span className="text-[13px] font-bold tracking-wide text-shadow">1.2M</span></div>
                    <div className="flex flex-col items-center gap-[4px]"><TKSvgComment className="drop-shadow-lg" /><span className="text-[13px] font-bold tracking-wide text-shadow">45.0K</span></div>
                    <div className="flex flex-col items-center gap-[4px]"><TKSvgBookmark className="drop-shadow-lg" /><span className="text-[13px] font-bold tracking-wide text-shadow">12.0K</span></div>
                    <div className="flex flex-col items-center gap-[4px]"><TKSvgShare className="drop-shadow-lg" /><span className="text-[13px] font-bold tracking-wide text-shadow">4,011</span></div>
                    <div className="relative mt-6 mb-2">
                       <div className="w-[48px] h-[48px] rounded-full bg-gray-800 border-[8px] border-[#252525] flex items-center justify-center animate-spin drop-shadow-xl" style={{ animationDuration: '4s' }}>
                          <div className="w-[16px] h-[16px] bg-gray-400 rounded-full flex items-center justify-center"><Music size={8} className="text-gray-800" /></div>
                       </div>
                    </div>
                  </div>
                  {/* TikTok Description (Bottom) */}
                  <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black/80 via-black/40 to-transparent z-40"></div>
                  <div className="absolute bottom-4 left-3 right-[20%] flex flex-col gap-2 z-50 text-white drop-shadow-md">
                    <span className="font-bold text-[16px] tracking-wide hover:underline cursor-pointer">@username</span>
                    <p className="text-[14.5px] font-medium leading-[1.3] line-clamp-3">This is an amazing short video showing off this cool new feature! Check out how smooth these captions look natively on the app! #fyp #viral #trending</p>
                    <div className="flex items-center gap-2 text-[13px] mt-1.5 font-medium opacity-90 whitespace-nowrap overflow-hidden">
                        <Music size={14} className="ml-1" />
                        <span className="marquee whitespace-nowrap overflow-hidden overflow-ellipsis tracking-wide">original sound - @username ♫</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 border border-white/10 pointer-events-none rounded-[1.8rem]" />
                  {/* Progress Bar (TikTok) */}
                  <div className="absolute bottom-1 left-0 right-0 h-[2px] bg-white/30 z-50 mx-2 hover:h-1 transition-all cursor-pointer">
                    <div className="h-full bg-white w-2/3"></div>
                  </div>
                </>
              )}
              {safeZonePlatform === 'INSTAGRAM' && (
                <>
                  {/* Instagram Reels Header (Top) */}
                  <div className="absolute top-0 left-0 right-0 h-[15%] bg-gradient-to-b from-black/60 to-transparent z-40 pointer-events-none"></div>
                  <div className="absolute top-[4.5%] left-4 text-white font-bold text-[22px] tracking-tight drop-shadow-md z-50">
                     Reels
                  </div>
                  <div className="absolute top-[4.5%] right-4 text-white flex gap-5 drop-shadow-md z-50 opacity-95">
                     <Camera size={26} strokeWidth={2} />
                  </div>
                  {/* Instagram Reels Icons (Right side) */}
                  <div className="absolute right-3 bottom-[4%] flex flex-col items-center gap-[22px] z-50 text-white drop-shadow-md">
                    <div className="flex flex-col items-center gap-1.5"><IGSvgHeart /><span className="text-[12px] font-bold text-shadow">1.2M</span></div>
                    <div className="flex flex-col items-center gap-1.5"><IGSvgComment /><span className="text-[12px] font-bold text-shadow">45K</span></div>
                    <div className="flex flex-col items-center gap-1.5"><IGSvgSend /><span className="text-[12px] font-bold text-shadow">12K</span></div>
                    <div className="flex flex-col items-center gap-1.5"><IGSvgMore /></div>
                    <div className="w-[28px] h-[28px] rounded-md border-2 border-white mt-2 overflow-hidden bg-gray-800 flex items-center justify-center shadow-lg">
                       <Music size={14} className="text-white/80" />
                    </div>
                  </div>
                  {/* Instagram Reels Description (Bottom) */}
                  <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-gradient-to-t from-black/80 via-black/40 to-transparent z-40"></div>
                  <div className="absolute bottom-[4.5%] left-3 right-[18%] flex flex-col gap-3 z-50 text-white drop-shadow-md">
                    <div className="flex items-center gap-2.5">
                        <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-fuchsia-600 p-[2px]">
                           <div className="w-full h-full bg-gray-800 rounded-full border-2 border-black flex items-center justify-center overflow-hidden">
                              <User size={18} className="text-white/80" />
                           </div>
                        </div>
                        <span className="font-bold text-[14.5px] tracking-wide">username</span>
                        <div className="w-2.5 h-2.5 flex items-center justify-center"><div className="w-1 h-1 bg-white rounded-full"></div></div>
                        <button className="bg-transparent text-white border border-white/80 px-3 py-1 rounded-md text-[13px] font-bold hover:bg-white/10 transition-colors">Follow</button>
                    </div>
                    <p className="text-[14.5px] font-medium leading-[1.3] line-clamp-2 drop-shadow-lg">This is an amazing short video showing off this cool new feature! #reels #viral #explorepage</p>
                    <div className="flex items-center">
                      <div className="flex items-center gap-1.5 text-[12.5px] bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/5 shadow-sm text-white/95">
                          <Music size={11} strokeWidth={2.5} />
                          <span className="whitespace-nowrap overflow-hidden overflow-ellipsis font-bold tracking-wide">Original audio</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 border border-white/10 pointer-events-none rounded-[1.8rem]" />
                  {/* Progress Bar (Reels) */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 z-50 overflow-hidden">
                    <div className="h-full bg-white w-1/4"></div>
                  </div>
                </>
              )}
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
