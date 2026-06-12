import React, { useState, useRef } from 'react';
import { Video, Zap, Play, Pause, Loader2, Smartphone, ThumbsUp, ThumbsDown, MessageSquare, Share2, Repeat, Heart, Send, Bookmark, MoreHorizontal, MoreVertical, Music, User, Camera, MessageCircle, Forward, Search, Type } from 'lucide-react';
import { ProcessingStatus, Caption, AspectRatio, CaptionStyle, StyleConfig, StickerItem } from '../types';

// ─── YouTube Shorts Platform SVGs ────────────────────────────────────────────
const YTLogo = () => (
  <svg viewBox="0 0 90 20" width="72" height="16" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.3 0H2.7C1.2 0 0 1.2 0 2.7v14.6C0 18.8 1.2 20 2.7 20h10.6c1.5 0 2.7-1.2 2.7-2.7V2.7C16 1.2 14.8 0 13.3 0zm-3 10-4.5 2.6V7.4L10.3 10z" fill="#FF0000"/>
    <text x="20" y="15" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="13" fill="white">YouTube</text>
  </svg>
);
const YTShortsLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <svg viewBox="0 0 16 20" width="13" height="16" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.3 0H2.7C1.2 0 0 1.2 0 2.7v14.6C0 18.8 1.2 20 2.7 20h10.6c1.5 0 2.7-1.2 2.7-2.7V2.7C16 1.2 14.8 0 13.3 0zm-3 10-4.5 2.6V7.4L10.3 10z" fill="#FF0000"/>
    </svg>
    <span style={{ fontWeight: 700, fontSize: 14, color: 'white', letterSpacing: 0.3 }}>YouTube</span>
  </div>
);
const YTSvgThumbUp = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className} width="20" height="20"><path d="M18.77,11h-4.23l1.52-4.94C16.38,5.03,15.54,4,14.38,4c-0.58,0-1.14,0.24-1.52,0.65L7,11H3v10h4h1h9.43 c1.06,0,1.98-0.67,2.19-1.61l1.34-6C21.23,12.15,20.18,11,18.77,11z M7,20H4v-8h3V20z M19.98,13.17l-1.34,6 C18.54,19.65,18.03,20,17.43,20H8v-8.61l5.6-6.06C13.84,5.07,14.08,5,14.38,5c0.26,0,0.5,0.11,0.63,0.3 c0.07,0.1,0.15,0.26,0.09,0.47l-1.52,4.94L13.18,12h1.35h4.23c0.41,0,0.8,0.17,1.03,0.46C19.92,12.61,20.05,12.86,19.98,13.17z"/></svg>
);
const YTSvgThumbDown = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className} width="20" height="20"><path d="M17,4h-1H6.57C5.5,4,4.59,4.67,4.38,5.61l-1.34,6C2.77,12.85,3.82,14,5.23,14h4.23l-1.52,4.94C7.62,19.97,8.46,21,9.62,21 c0.58,0,1.14-0.24,1.52-0.65L17,14h4V4H17z M10.4,19.67C10.21,19.88,9.92,20,9.62,20c-0.26,0-0.5-0.11-0.63-0.3 c-0.07-0.1-0.15-0.26-0.09-0.47l1.52-4.94l0.4-1.29H9.46H5.23c-0.41,0-0.8-0.17-1.03-0.46c-0.14-0.15-0.26-0.4-0.19-0.71l1.34-6 C5.46,5.35,5.97,5,6.57,5H16v8.61L10.4,19.67z M20,13h-3V5h3V13z"/></svg>
);
const YTSvgComment = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className} width="20" height="20"><path d="M9,15h9v-1H9V15z M9,11h9v-1H9V11z M9,7h9v-1H9V7z M22,2v20l-4-4H4V2H22z M21,3H5v14h13.17l2.83,2.83V3z M5,14V4h16v13.17 L18.17,14H5z"/></svg>
);
const YTSvgShare = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className} width="20" height="20"><path d="M15,5.63L20.66,12L15,18.37V14h-1c-3.96,0-7.14,1-9.75,3.09c1.84-4.07,5.11-6.4,9.89-7.1l0.86-0.13V5.63 M14,3v6 C6.22,10.13,3.11,15.33,2,21c2.78-3.97,6.44-6,12-6v6l8-9L14,3L14,3z"/></svg>
);
const YTSvgRemix = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><polyline points="11 3 11 11 14 8 17 11 17 3"></polyline></svg>
);

// ─── TikTok Platform SVGs ─────────────────────────────────────────────────────
const TKSvgHeart = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="white" className={className} xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}><path fillRule="evenodd" clipRule="evenodd" d="M24 41.516L23.447 41.096C12.607 32.844 5 25.101 5 15.688C5 8.914 10.321 3.5 17.151 3.5C21.01 3.5 24.316 5.342 26.243 8.307C28.17 5.342 31.477 3.5 35.335 3.5C42.166 3.5 47.487 8.914 47.487 15.688C47.487 25.101 39.88 32.844 29.04 41.096L28.487 41.516C27.18 42.508 25.307 42.508 24 41.516Z" /></svg>
);
const TKSvgComment = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="white" className={className} xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}><path fillRule="evenodd" clipRule="evenodd" d="M24 4C12.954 4 4 11.908 4 21.662C4 27.289 6.945 32.33 11.583 35.539L11.83 35.711C11.603 36.657 11.139 37.818 10.342 39.294L9.845 40.211C9.489 40.869 10.038 41.638 10.768 41.498L11.565 41.344C13.883 40.898 16.035 40.093 17.9 38.991C19.826 39.646 21.875 40 24 40C35.046 40 44 32.092 44 22.338C44 12.585 35.046 4 24 4ZM15 24C16.1046 24 17 23.1046 17 22C17 20.8954 16.1046 20 15 20C13.8954 20 13 20.8954 13 22C13 23.1046 13.8954 24 15 24ZM26 22C26 23.1046 25.1046 24 24 24C22.8954 24 22 23.1046 22 22C22 20.8954 22.8954 20 24 20C25.1046 20 26 20.8954 26 22ZM33 24C34.1046 24 35 23.1046 35 22C35 20.8954 34.1046 20 33 20C31.8954 20 31 20.8954 31 22C31 23.1046 31.8954 24 33 24Z" /></svg>
);
const TKSvgBookmark = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="white" className={className} xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}><path fillRule="evenodd" clipRule="evenodd" d="M13.5 7.5C12.119 7.5 11 8.619 11 10V41C11 41.873 11.558 42.648 12.385 42.924C13.212 43.201 14.128 42.919 14.664 42.222L24 30.081L33.336 42.222C33.872 42.919 34.788 43.201 35.615 42.924C36.442 42.648 37 41.873 37 41V10C37 8.619 35.881 7.5 34.5 7.5H13.5Z" /></svg>
);
const TKSvgShare = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="white" className={className} xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}><path fillRule="evenodd" clipRule="evenodd" d="M35.5 5.5C32.462 5.5 30 7.962 30 11C30 11.837 30.19 12.63 30.529 13.339L17.582 21.011C16.639 19.786 15.162 19 13.5 19C10.462 19 8 21.462 8 24.5C8 27.538 10.462 30 13.5 30C15.162 30 16.639 29.214 17.582 27.989L30.529 35.661C30.19 36.37 30 37.163 30 38C30 41.038 32.462 43.5 35.5 43.5C38.538 43.5 41 41.038 41 38C41 34.962 38.538 32.5 35.5 32.5C33.838 32.5 32.361 33.286 31.418 34.511L18.471 26.839C18.81 26.13 19 25.337 19 24.5C19 23.663 18.81 22.87 18.471 22.161L31.418 14.489C32.361 15.714 33.838 16.5 35.5 16.5C38.538 16.5 41 14.038 41 11C41 7.962 38.538 5.5 35.5 5.5Z" /></svg>
);

// ─── Instagram Platform SVGs ──────────────────────────────────────────────────
const IGSvgHeart = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className={className} width="18" height="18" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
);
const IGSvgComment = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className={className} width="18" height="18" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}><path strokeLinejoin="round" strokeLinecap="round" d="M20.656 17.008a9.993 9.993 0 10-3.59 3.615L22 22z"/></svg>
);
const IGSvgSend = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className={className} width="18" height="18" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}><line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round" strokeLinejoin="round"/><polygon points="22 2 15 22 11 13 2 9 22 2" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const IGSvgMore = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className} width="13" height="13" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
);

// ─── Facebook Platform SVGs ───────────────────────────────────────────────────
const FBSvgLike = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className} width="16" height="16" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3m7-10v3a3 3 0 01-3 3H8v4a2 2 0 002 2h6.28a2 2 0 001.98-1.73l.7-6A2 2 0 0017 4h-3z"/></svg>
);
const FBSvgComment = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className={className} width="16" height="16" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
);
const FBSvgShare = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className={className} width="16" height="16" style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
);


interface VideoPreviewAreaProps {
  videoSrc: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadSampleVideo?: () => void;
  onTestWithSampleText?: () => void;
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
  safeZonePlatform?: 'SHORTS' | 'TIKTOK' | 'INSTAGRAM' | 'FACEBOOK';
  aspectRatio?: AspectRatio;

  videoIntrinsicRatio?: number | null;
  setVideoIntrinsicRatio?: (ratio: number) => void;

  activeConfig?: StyleConfig;
  currentStyle?: CaptionStyle;
  fontScale?: number;
  verticalPos?: number;
  horizontalPos?: number;
  isSandboxMode?: boolean;
  onSandboxModeToggle?: (val: boolean) => void;

  // Stickers integration
  stickers?: StickerItem[];
  onUpdateSticker?: (id: string, updates: Partial<StickerItem>) => void;
  isStickersTabActive?: boolean;
}

// Map aspect ratio enum to CSS class
const ASPECT_RATIO_CLASS: Record<string, string> = {
  '9:16': 'aspect-[9/16]',
  '16:9': 'aspect-[16/9]',
  '1:1': 'aspect-[1/1]',
  '4:5': 'aspect-[4/5]',
};

export const VideoPreviewArea: React.FC<VideoPreviewAreaProps> = ({
  videoSrc,
  videoRef,
  canvasRef,
  handleFileUpload,
  onLoadSampleVideo,
  onTestWithSampleText,
  setVideoSrc,
  setVideoFile,
  setStatus,
  handleTimeUpdate,
  isPlaying,
  togglePlay,
  status,
  exportProgress,
  updateCaption,
  captions = [],
  showSafeZones = false,
  safeZonePlatform = 'SHORTS',
  aspectRatio = '9:16',

  videoIntrinsicRatio = null,
  setVideoIntrinsicRatio,
  activeConfig,
  currentStyle,
  fontScale = 1,
  verticalPos = 82,
  horizontalPos = 50,
  isSandboxMode = false,
  onSandboxModeToggle,
  stickers = [],
  onUpdateSticker,
  isStickersTabActive = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedCaptionId, setDraggedCaptionId] = useState<string | null>(null);
  const [draggedStickerId, setDraggedStickerId] = useState<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // ── File drop zone handlers ──────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setVideoFile(file);
      setStatus('READY');
    }
  };
  // ────────────────────────────────────────────────────────────────────────


  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!videoRef.current || !canvasRef.current) {
      togglePlay();
      return;
    }
    const time = videoRef.current.currentTime;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const clickX = cx / rect.width;
    const clickY = cy / rect.height;

    // 1. If stickers tab is active, try selecting/dragging a sticker first
    if (isStickersTabActive && stickers.length > 0) {
      const activeStickers = stickers.filter(s => time >= s.startTime && time <= s.endTime);
      let foundSticker: StickerItem | null = null;
      let minDistance = 0.15; // Normalized click threshold radius

      for (const s of activeStickers) {
        const dist = Math.hypot(clickX - s.x, clickY - s.y);
        if (dist < minDistance) {
          minDistance = dist;
          foundSticker = s;
        }
      }

      if (foundSticker && onUpdateSticker) {
        setIsDragging(true);
        setDraggedStickerId(foundSticker.id);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }

    // 2. Fallback to dragging captions
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

    if (draggedStickerId && onUpdateSticker) {
      onUpdateSticker(draggedStickerId, { x: normX, y: normY });
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
      {!videoSrc && !isSandboxMode && status !== 'READY' ? (
        <div 
          className={`relative max-w-sm w-full text-center p-1 rounded-[32px] overflow-hidden transition-all duration-300 ${
            isDragging ? 'scale-105 shadow-2xl shadow-blue-500/20' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Animated Gradient Border */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-600 to-cyan-400 opacity-20 pointer-events-none" />
          {isDragging && <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-600 to-cyan-400 animate-spin-slow opacity-50 pointer-events-none" style={{ animationDuration: '4s' }} />}
          
          <div className="relative bg-[#111] m-[2px] rounded-[30px] p-10 flex flex-col items-center justify-center border border-white/5 z-10 backdrop-blur-xl">
            <div className={`relative flex items-center justify-center w-28 h-28 mb-8 transition-transform ${isDragging ? 'scale-110' : ''}`}>
              <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-black/50 z-10">
                <Video size={36} className="text-white" />
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 p-2 bg-[#222] rounded-full border border-white/10 animate-bounce" style={{ animationDuration: '3s' }}><Zap size={14} className="text-yellow-400" /></div>
              <div className="absolute -bottom-2 -left-2 p-2 bg-[#222] rounded-full border border-white/10 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}><Music size={14} className="text-emerald-400" /></div>
              <div className="absolute bottom-4 -right-2 p-1.5 bg-[#222] rounded-full border border-white/10 animate-pulse"><Type size={12} className="text-blue-400" /></div>
            </div>

            <h2 className="text-2xl font-black text-white mb-3 tracking-tight font-['Space_Grotesk']">Start Creating</h2>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed px-4">
              Drag & drop a <strong className="text-white">9:16 vertical video</strong> or click to browse.
            </p>

            <div className="flex flex-col gap-3 w-full">
              <label className="group relative w-full bg-white text-black py-3.5 rounded-xl font-bold cursor-pointer transition-all hover:bg-gray-200 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 overflow-hidden">
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <Video size={18} />
                Select File
                <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
              </label>
              <button
                onClick={async () => {
                  if (onLoadSampleVideo) {
                    onLoadSampleVideo();
                  }
                }}
                className="group w-full bg-[#1a1a1a] hover:bg-[#222] text-gray-300 py-3 rounded-xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/5 hover:border-white/10"
              >
                <Zap size={16} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                Use Sample Video
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onSandboxModeToggle) {
                    onSandboxModeToggle(true);
                  }
                }}
                className="group w-full bg-gradient-to-r from-amber-600/20 to-yellow-600/20 hover:from-amber-600/30 hover:to-yellow-600/30 text-yellow-300 py-3 rounded-xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2 border border-yellow-500/20 hover:border-yellow-500/30"
              >
                <span>🧪</span>
                Sandbox Preview Mode
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Bug 6 Fix: Add `group` class so group-hover:opacity-100 on controls works.
           Bug 16 Fix: Apply dynamically chosen aspect ratio class or inline style. */
        <div 
          ref={(node) => {
            // If no video is present, force canvas initialization once the element mounts
            if (node && !videoSrc && canvasRef.current && canvasRef.current.width === 300) {
              canvasRef.current.width = 1080;
              canvasRef.current.height = 1920;
              if (setVideoIntrinsicRatio) setVideoIntrinsicRatio(1080 / 1920);
            }
          }}
          className={`group relative h-full max-h-[85vh] max-w-full ${aspectClass} bg-black rounded-[2rem] shadow-2xl overflow-hidden border-[6px] border-[#222] ring-1 ring-white/10 z-20 transition-all duration-300`}
          style={inlineStyle}
        >
          {/* Render video only if videoSrc is provided. Otherwise, it's pure black screen testing */}
          {videoSrc && (
            <video 
              ref={videoRef as any} 
              src={videoSrc} 
              className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none" 
              onTimeUpdate={handleTimeUpdate} 
              onLoadedMetadata={() => {
                if (videoRef.current && canvasRef.current) {
                  const vw = videoRef.current.videoWidth;
                  const vh = videoRef.current.videoHeight;
                  if (vw > 320 && vh > 320) {
                    canvasRef.current.width = vw;
                    canvasRef.current.height = vh;
                    if (setVideoIntrinsicRatio) setVideoIntrinsicRatio(vw / vh);
                  }
                }
              }}
              crossOrigin="anonymous"
              playsInline
              preload="auto"
              loop
            />
          )}
          <canvas 
            ref={canvasRef as any} 
            className={`w-full h-full object-contain ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} z-10 relative`} 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />

          {/* Safe Zones Overlay - Pixel-Perfect Platform Previews */}
          {showSafeZones && (
            <div className="absolute inset-0 pointer-events-none z-40">

              {/* ─── YouTube Shorts ──────────────────────────────────── */}
              {safeZonePlatform === 'SHORTS' && (
                <>
                  {/* Top gradient */}
                  <div className="absolute top-0 left-0 right-0 h-[14%] bg-gradient-to-b from-black/50 to-transparent z-40" />

                  {/* Top-left: YouTube Logo */}
                  <div className="absolute z-50 flex items-center gap-1 drop-shadow-lg" style={{ top: '2.5%', left: 10 }}>
                    <svg viewBox="0 0 20 14" width="18" height="13" xmlns="http://www.w3.org/2000/svg">
                      <rect width="20" height="14" rx="3" fill="#FF0000"/>
                      <polygon points="8,3 8,11 15,7" fill="white"/>
                    </svg>
                    <span style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 11, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>YouTube</span>
                  </div>

                  {/* Top-right: Search + More */}
                  <div className="absolute z-50 flex items-center gap-2 text-white" style={{ top: '2.5%', right: 8 }}>
                    <Search size={16} strokeWidth={2.2} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))' }} />
                    <MoreVertical size={16} strokeWidth={2.2} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))' }} />
                  </div>

                  {/* Right side action buttons — anchored from bottom */}
                  <div className="absolute z-50 text-white flex flex-col items-center" style={{ right: 7, bottom: '8%', gap: 12 }}>
                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                      <YTSvgThumbUp />
                      <span style={{ fontSize: 9.5, fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>873k</span>
                    </div>
                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                      <YTSvgThumbDown />
                      <span style={{ fontSize: 9.5, fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>Dislike</span>
                    </div>
                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                      <YTSvgComment />
                      <span style={{ fontSize: 9.5, fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>3,719</span>
                    </div>
                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                      <YTSvgShare />
                      <span style={{ fontSize: 9.5, fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>Share</span>
                    </div>
                    <MoreVertical size={16} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))' }} />
                    {/* Music album art */}
                    <div style={{ width: 28, height: 28, borderRadius: 5, background: 'linear-gradient(135deg,#1a1a2e,#374151)', border: '1.5px solid rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                      <Music size={13} color="rgba(255,255,255,0.8)" />
                    </div>
                  </div>

                  {/* Bottom gradient */}
                  <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/80 via-black/35 to-transparent z-40" />

                  {/* Bottom-left: Channel info */}
                  <div className="absolute z-50 text-white flex flex-col" style={{ bottom: 10, left: 10, right: 48, gap: 4 }}>
                    {/* Avatar + Username + Subscribe */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 25, height: 25, borderRadius: '50%', background: 'rgba(120,120,120,0.8)', border: '1px solid rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={14} color="rgba(255,255,255,0.9)" />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 10.5, textShadow: '0 1px 3px rgba(0,0,0,0.95)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@ChannelName</span>
                      <button style={{ background: 'white', color: '#000', borderRadius: 12, padding: '2px 8px', fontWeight: 800, fontSize: 9.5, whiteSpace: 'nowrap', flexShrink: 0 }}>Subscribe</button>
                    </div>
                    {/* Description */}
                    <p style={{ fontSize: 10, fontWeight: 500, lineHeight: 1.3, textShadow: '0 1px 2px rgba(0,0,0,0.95)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      This is an amazing short video! #shorts #viral
                    </p>
                    {/* Music */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 500, textShadow: '0 1px 2px rgba(0,0,0,0.95)', opacity: 0.88 }}>
                      <Music size={10} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Original Sound - @ChannelN…</span>
                    </div>
                  </div>

                  {/* Red progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/20 z-50 overflow-hidden">
                    <div className="h-full bg-red-600" style={{ width: '33%' }} />
                  </div>
                </>
              )}

              {/* ─── TikTok ──────────────────────────────────────────── */}
              {safeZonePlatform === 'TIKTOK' && (
                <>
                  {/* Top gradient */}
                  <div className="absolute top-0 left-0 right-0 h-[14%] bg-gradient-to-b from-black/50 to-transparent z-40" />

                  {/* Top center: Following | For You nav */}
                  <div className="absolute z-50 flex justify-center items-center gap-3" style={{ top: '2.5%', left: 0, right: 0 }}>
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>Following</span>
                    <span style={{ color: 'white', fontSize: 11, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.9)', position: 'relative' }}>
                      For You
                      <span style={{ position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)', width: 20, height: 2, background: 'white', borderRadius: 1, display: 'block' }} />
                    </span>
                  </div>

                  {/* Top-right: Search */}
                  <div className="absolute z-50 text-white" style={{ top: '2.5%', right: 10 }}>
                    <Search size={16} strokeWidth={2.3} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))' }} />
                  </div>

                  {/* Right-side action column */}
                  <div className="absolute z-50 text-white flex flex-col items-center" style={{ right: 7, bottom: '6%', gap: 12 }}>
                    {/* Profile avatar with + button */}
                    <div style={{ position: 'relative', width: 35, height: 35, marginBottom: 6 }}>
                      <div style={{ width: 35, height: 35, borderRadius: '50%', background: 'rgba(180,180,180,0.8)', border: '2px solid white', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={19} color="#555" />
                      </div>
                      <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 16, height: 16, borderRadius: '50%', background: '#FE2C55', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: 'white', lineHeight: 1 }}>+</div>
                    </div>
                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                      <TKSvgHeart />
                      <span style={{ fontSize: 9.5, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>1.2M</span>
                    </div>
                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                      <TKSvgComment />
                      <span style={{ fontSize: 9.5, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>45.0K</span>
                    </div>
                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                      <TKSvgBookmark />
                      <span style={{ fontSize: 9.5, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>12.0K</span>
                    </div>
                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                      <TKSvgShare />
                      <span style={{ fontSize: 9.5, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>4,011</span>
                    </div>
                    {/* Spinning music disc */}
                    <div style={{ marginTop: 5, width: 35, height: 35, borderRadius: '50%', background: 'linear-gradient(135deg,#1a1a1a,#333)', border: '5px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 4s linear infinite', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                      <div style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(160,160,160,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Music size={6} color="#333" />
                      </div>
                    </div>
                  </div>

                  {/* Bottom gradient */}
                  <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/80 via-black/35 to-transparent z-40" />

                  {/* Bottom-left: user info */}
                  <div className="absolute z-50 text-white flex flex-col" style={{ bottom: 10, left: 10, right: 50, gap: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 11, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>@username</span>
                    <p style={{ fontSize: 10, fontWeight: 500, lineHeight: 1.3, textShadow: '0 1px 2px rgba(0,0,0,0.9)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      This is an amazing short video! #fyp #viral #trending 🔥
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.9)', opacity: 0.9 }}>
                      <Music size={10} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>original sound - @username ♫</span>
                    </div>
                  </div>

                  {/* White progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/30 z-50">
                    <div className="h-full bg-white" style={{ width: '62%' }} />
                  </div>
                </>
              )}

              {/* ─── Instagram Reels ─────────────────────────────────── */}
              {safeZonePlatform === 'INSTAGRAM' && (
                <>
                  {/* Top gradient */}
                  <div className="absolute top-0 left-0 right-0 h-[14%] bg-gradient-to-b from-black/55 to-transparent z-40" />

                  {/* Top-left: "Reels" */}
                  <div className="absolute z-50" style={{ top: '2.5%', left: 10 }}>
                    <span style={{ color: 'white', fontWeight: 800, fontSize: 14, textShadow: '0 1px 3px rgba(0,0,0,0.9)', fontFamily: 'system-ui, sans-serif' }}>Reels</span>
                  </div>

                  {/* Top-right: Camera icon */}
                  <div className="absolute z-50 text-white" style={{ top: '2.5%', right: 10 }}>
                    <Camera size={18} strokeWidth={2} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))' }} />
                  </div>

                  {/* Right-side action column */}
                  <div className="absolute z-50 text-white flex flex-col items-center" style={{ right: 7, bottom: '6%', gap: 15 }}>
                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                      <IGSvgHeart />
                      <span style={{ fontSize: 9.5, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>1.2M</span>
                    </div>
                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                      <IGSvgComment />
                      <span style={{ fontSize: 9.5, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>45K</span>
                    </div>
                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                      <IGSvgSend />
                      <span style={{ fontSize: 9.5, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>12K</span>
                    </div>
                    <IGSvgMore />
                    {/* Music disc thumbnail */}
                    <div style={{ width: 22, height: 22, borderRadius: 5, border: '2px solid white', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                      <Music size={11} color="rgba(255,255,255,0.85)" />
                    </div>
                  </div>

                  {/* Bottom gradient */}
                  <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/80 via-black/35 to-transparent z-40" />

                  {/* Bottom-left: user info */}
                  <div className="absolute z-50 text-white flex flex-col" style={{ bottom: 10, left: 10, right: 46, gap: 5 }}>
                    {/* Username row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {/* IG-style avatar with gradient ring */}
                      <div style={{ width: 25, height: 25, borderRadius: '50%', padding: 2, background: 'linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#111', border: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <User size={13} color="rgba(255,255,255,0.85)" />
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 10.5, textShadow: '0 1px 3px rgba(0,0,0,0.9)', flexShrink: 0 }}>username</span>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, flexShrink: 0 }}>•</span>
                      <button style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.75)', borderRadius: 5, padding: '2px 8px', fontWeight: 700, fontSize: 9, flexShrink: 0 }}>Follow</button>
                    </div>
                    {/* Caption */}
                    <p style={{ fontSize: 10, fontWeight: 500, lineHeight: 1.3, textShadow: '0 1px 2px rgba(0,0,0,0.9)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      Amazing reel! Check out this cool feature #reels #viral
                    </p>
                    {/* Music pill */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '2px 8px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', width: 'fit-content' }}>
                      <Music size={9} strokeWidth={2.5} />
                      <span style={{ fontSize: 9.5, fontWeight: 700, whiteSpace: 'nowrap' }}>Original audio</span>
                    </div>
                  </div>

                  {/* Instagram white progress line */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/30 z-50 overflow-hidden">
                    <div className="h-full bg-white" style={{ width: '25%' }} />
                  </div>
                </>
              )}

              {/* ─── Facebook Reels ───────────────────────────────────── */}
              {safeZonePlatform === 'FACEBOOK' && (
                <>
                  {/* Top gradient */}
                  <div className="absolute top-0 left-0 right-0 h-[14%] bg-gradient-to-b from-black/55 to-transparent z-40" />

                  {/* Top-left: Facebook Reels header */}
                  <div className="absolute z-50 flex items-center gap-1" style={{ top: '2.5%', left: 10 }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: 11, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>Reels</span>
                  </div>

                  {/* Top-right: More dots */}
                  <div className="absolute z-50 text-white" style={{ top: '2.5%', right: 10 }}>
                    <MoreVertical size={16} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))' }} />
                  </div>

                  {/* Right side: action column */}
                  <div className="absolute z-50 text-white flex flex-col items-center" style={{ right: 7, bottom: '6%', gap: 12 }}>
                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <FBSvgLike />
                      </div>
                      <span style={{ fontSize: 9.5, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>2.4K</span>
                    </div>
                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <FBSvgComment />
                      </div>
                      <span style={{ fontSize: 9.5, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>318</span>
                    </div>
                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <FBSvgShare />
                      </div>
                      <span style={{ fontSize: 9.5, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>Share</span>
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                      <MoreHorizontal size={16} color="white" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))' }} />
                    </div>
                  </div>

                  {/* Bottom gradient */}
                  <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/80 via-black/35 to-transparent z-40" />

                  {/* Bottom-left: user info */}
                  <div className="absolute z-50 text-white flex flex-col" style={{ bottom: 10, left: 10, right: 50, gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(100,100,100,0.75)', border: '1px solid rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        <User size={15} color="rgba(255,255,255,0.85)" />
                      </div>
                      <div className="flex flex-col">
                        <span style={{ fontWeight: 700, fontSize: 10.5, textShadow: '0 1px 3px rgba(0,0,0,0.9)', lineHeight: 1.2 }}>Page Name</span>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>• Follow</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 10, fontWeight: 500, lineHeight: 1.3, textShadow: '0 1px 2px rgba(0,0,0,0.9)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      Amazing video! Watch till the end 🔥 #FacebookReels
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.9)', opacity: 0.9 }}>
                      <Music size={10} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Original Audio</span>
                    </div>
                  </div>

                  {/* FB progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/25 z-50 overflow-hidden">
                    <div className="h-full bg-white" style={{ width: '40%' }} />
                  </div>
                </>
              )}

            </div>
          )}

          
          {/* Processing status overlay */}
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
              {/* Escape hatch — a stalled network request must never trap the user */}
              {(status === 'UPLOADING' || status === 'TRANSCRIBING') && (
                <button
                  type="button"
                  onClick={() => setStatus('IDLE')}
                  className="mt-5 px-4 py-2 text-xs font-bold text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-800 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {/* Single play/pause overlay — replaces the old dual-button setup */}
          {status === 'READY' && !isPlaying && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-30"
              onClick={togglePlay}
            >
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-2xl hover:bg-white/30 hover:scale-110 transition-all">
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
