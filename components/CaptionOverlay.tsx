import React, { useEffect, useRef } from 'react';
import { Caption, CaptionStyle, StyleConfig, AspectRatio } from '../types';
import { HyperCaptionRenderer, HyperRenderState } from '../services/hyperCaptionRenderer';

interface Props {
  captions: Caption[];
  activeConfig: StyleConfig;
  currentStyle: CaptionStyle;
  fontScale: number;
  verticalPos: number;
  horizontalPos: number;
  videoRef: React.RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  aspectRatio?: AspectRatio;
}

export function CaptionOverlay({
  captions, activeConfig, currentStyle, fontScale, verticalPos, horizontalPos,
  videoRef, isPlaying, aspectRatio,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef(new HyperCaptionRenderer());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    rendererRef.current.mount(container, videoRef.current ?? undefined);
    return () => rendererRef.current.unmount();
  }, [videoRef]);

  useEffect(() => {
    const renderer = rendererRef.current;

    const loop = () => {
      const video = videoRef.current;
      if (!video || !containerRef.current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const state: HyperRenderState = {
        captions, activeConfig, currentStyle, fontScale,
        verticalPos, horizontalPos, isPlaying,
      };
      renderer.render(state, video.currentTime);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [captions, activeConfig, currentStyle, fontScale, verticalPos, horizontalPos, isPlaying, videoRef]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'hidden',
      }}
    />
  );
}
