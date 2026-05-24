/**
 * MotionStage — canvas + optional video, with a stable RAF loop that doesn't
 * tear down on every state change.
 *
 * Bug fixes in this version:
 *   - The render loop is established ONCE (no deps re-running each frame).
 *     Latest values (playing, currentTime, duration, videoSrc, beats) are
 *     read from refs each tick instead of being captured in closure.
 *   - onCanvasReady fires once when the canvas mounts AND on subsequent
 *     resolution changes (aspect ratio switch).
 *   - Cleanup cancels the RAF on unmount.
 */

import React, { useEffect, useRef } from 'react';
import type { MotionBeat } from '../../services/motionGraphicsService';
import { createMotionRendererState, renderMotion } from '../../services/motionGraphicsRenderer';
import { initTextures } from '../../services/motion/textures';

interface Props {
  beats: MotionBeat[];
  duration: number;
  videoSrc: string | null;
  playing: boolean;
  currentTime: number;
  onTimeChange: (t: number) => void;
  onVideoReady?: (videoEl: HTMLVideoElement) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  width?: number;
  height?: number;
}

export const MotionStage: React.FC<Props> = ({
  beats,
  duration,
  videoSrc,
  playing,
  currentTime,
  onTimeChange,
  onVideoReady,
  onCanvasReady,
  width = 1280,
  height = 720,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);

  // Latest-value refs read by the RAF loop
  const playingRef = useRef(playing);
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const videoSrcRef = useRef<string | null>(videoSrc);
  const onTimeChangeRef = useRef(onTimeChange);
  const rendererStateRef = useRef(createMotionRendererState(beats));
  const playAnchorRef = useRef<{ wallStart: number; tStart: number } | null>(null);

  // Sync refs whenever props change
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { videoSrcRef.current = videoSrc; }, [videoSrc]);
  useEffect(() => { onTimeChangeRef.current = onTimeChange; }, [onTimeChange]);
  useEffect(() => { rendererStateRef.current = createMotionRendererState(beats); }, [beats]);

  // Hand the canvas up whenever it mounts or its dimensions change
  useEffect(() => {
    if (canvasRef.current && onCanvasReady) onCanvasReady(canvasRef.current);
  }, [width, height, onCanvasReady]);

  // Pause/play the video element when `playing` toggles
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    if (playing) v.play().catch(() => undefined);
    else v.pause();
  }, [playing, videoSrc]);

  // When paused, keep video.currentTime aligned with state for scrubbing
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc || playing) return;
    if (Math.abs(v.currentTime - currentTime) > 0.05) v.currentTime = currentTime;
  }, [currentTime, playing, videoSrc]);

  // Wall-clock anchor for script-only playback (no video)
  useEffect(() => {
    if (playing) {
      playAnchorRef.current = { wallStart: performance.now(), tStart: currentTimeRef.current };
    } else {
      playAnchorRef.current = null;
    }
  }, [playing]);

  // ── ONE-SHOT RAF LOOP — never tears down until unmount ───────────
  useEffect(() => {
    initTextures();
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const dur = durationRef.current;
      let t = currentTimeRef.current;

      if (playingRef.current) {
        if (videoSrcRef.current && videoRef.current) {
          t = videoRef.current.currentTime;
        } else if (playAnchorRef.current) {
          t = playAnchorRef.current.tStart + (performance.now() - playAnchorRef.current.wallStart) / 1000;
        }
        if (t >= dur) t = dur;
        if (Math.abs(t - currentTimeRef.current) > 0.01) {
          // Update both ref and parent state
          currentTimeRef.current = t;
          onTimeChangeRef.current(t);
        }
      }

      // Draw video frame (if any) + motion graphics
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (videoSrcRef.current && videoRef.current) {
        const v = videoRef.current;
        if (v.readyState >= 2 && v.videoWidth > 0) {
          const va = v.videoWidth / v.videoHeight;
          const ca = canvas.width / canvas.height;
          let dw = canvas.width, dh = canvas.height, dx = 0, dy = 0;
          if (va > ca) {
            dh = canvas.width / va;
            dy = (canvas.height - dh) / 2;
          } else {
            dw = canvas.height * va;
            dx = (canvas.width - dw) / 2;
          }
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(v, dx, dy, dw, dh);
        }
      } else {
        const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        g.addColorStop(0, '#0f172a');
        g.addColorStop(1, '#050505');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      renderMotion(rendererStateRef.current, ctx, canvas.width, canvas.height, t);

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // Intentionally empty — the loop self-updates via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inline aspect-ratio style based on canvas pixel size
  const aspectStyle: React.CSSProperties = {
    aspectRatio: `${width} / ${height}`,
  };

  return (
    <div
      className="relative w-full bg-black rounded-2xl overflow-hidden border border-gray-800 mx-auto"
      style={{ ...aspectStyle, maxHeight: '70vh' }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full"
      />
      {videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          className="hidden"
          playsInline
          muted={false}
          onLoadedMetadata={(e) => onVideoReady?.(e.currentTarget)}
        />
      )}
    </div>
  );
};

export default MotionStage;
