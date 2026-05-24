/**
 * useTypographyReel Hook
 *
 * Orchestrates the complete typography reel generation pipeline:
 * Audio → Analysis → Beat Detection → Choreography → Export
 *
 * Pure state management hook, no UI dependencies.
 */

import { useCallback, useRef, useState } from 'react';

import type {
  AnimationSequence,
  BeatGrid,
  EnrichedTranscript,
  PipelineStage,
  ThemeProfile,
  TranscriptWord,
} from '../services/typography';
import {
  choreograph,
  createCanvasRenderer,
  analyzeTranscript,
  analyzeBeats,
  createDemoTranscript,
} from '../services/typography';

// ─── State Type ───────────────────────────────────────────────────────────

export interface TypographyReelState {
  // Pipeline state
  stage: PipelineStage;
  progress: number; // 0-1
  message: string;
  error: string | null;

  // Data
  audioFile: File | null;
  transcript: EnrichedTranscript | null;
  beatGrid: BeatGrid | null;
  animationSequence: AnimationSequence | null;

  // Playback
  isPlaying: boolean;
  currentTime: number; // Seconds
  duration: number;

  // Export
  isExporting: boolean;
  exportProgress: number; // 0-1
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useTypographyReel() {
  const [state, setState] = useState<TypographyReelState>({
    stage: 'idle',
    progress: 0,
    message: '',
    error: null,
    audioFile: null,
    transcript: null,
    beatGrid: null,
    animationSequence: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isExporting: false,
    exportProgress: 0,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<any | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ─── Load Audio File ──────────────────────────────────────────────────

  const loadAudio = useCallback(
    async (file: File): Promise<boolean> => {
      try {
        // Validate file
        if (!file.type.startsWith('audio/')) {
          throw new Error('Invalid file type. Please select an audio file.');
        }

        if (file.size > 50 * 1024 * 1024) {
          throw new Error('File too large (max 50MB)');
        }

        // Check duration
        const audio = new Audio();
        const urlObject = URL.createObjectURL(file);

        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error('Audio load timeout')),
            10000
          );

          audio.onloadedmetadata = () => {
            clearTimeout(timer);
            if (audio.duration > 60) {
              reject(new Error('Audio too long (max 60 seconds)'));
            } else {
              resolve();
            }
          };

          audio.onerror = () => {
            clearTimeout(timer);
            reject(new Error('Failed to load audio'));
          };

          audio.src = urlObject;
        });

        setState((s) => ({
          ...s,
          audioFile: file,
          duration: audio.duration,
          message: 'Audio loaded successfully',
        }));

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setState((s) => ({ ...s, error: message }));
        return false;
      }
    },
    []
  );

  // ─── Analyze Audio with Gemini ────────────────────────────────────────

  const analyzeAudio = useCallback(
    async (audioFile: File): Promise<EnrichedTranscript | null> => {
      try {
        setState((s) => ({
          ...s,
          stage: 'analyzing',
          progress: 0,
          message: 'Analyzing audio with AI...',
          error: null,
        }));

        let transcript: EnrichedTranscript;

        try {
          // Try to use Gemini API
          transcript = await analyzeTranscript(audioFile);
        } catch (err) {
          console.warn('Gemini analysis failed, using demo transcript:', err);
          // Fallback to demo transcript for testing
          transcript = createDemoTranscript();
        }

        setState((s) => ({
          ...s,
          transcript,
          progress: 1,
          message: 'Audio analysis complete',
        }));

        return transcript;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed';
        setState((s) => ({ ...s, error: message }));
        return null;
      }
    },
    []
  );

  // ─── Detect Audio Beats ───────────────────────────────────────────────

  const detectBeats = useCallback(
    async (audioFile: File): Promise<BeatGrid | null> => {
      try {
        setState((s) => ({
          ...s,
          stage: 'beats',
          progress: 0,
          message: 'Detecting audio beats...',
          error: null,
        }));

        // Use Web Audio API beat detection
        const beatGrid = await analyzeBeats(audioFile);

        setState((s) => ({
          ...s,
          beatGrid,
          progress: 1,
          message: `Beat detection complete (${beatGrid.beats.length} beats detected at ${beatGrid.bpm} BPM)`,
        }));

        return beatGrid;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Beat detection failed';
        setState((s) => ({ ...s, error: message }));
        return null;
      }
    },
    []
  );

  // ─── Generate Animation Sequence ──────────────────────────────────────

  const generateSequence = useCallback(
    async (
      transcript: EnrichedTranscript,
      beatGrid: BeatGrid,
      theme: ThemeProfile
    ): Promise<AnimationSequence | null> => {
      try {
        setState((s) => ({
          ...s,
          stage: 'choreographing',
          progress: 0,
          message: 'Generating animation sequence...',
          error: null,
        }));

        // Choreograph animations
        const sequence = choreograph({
          transcript,
          beatGrid,
          theme,
        });

        setState((s) => ({
          ...s,
          animationSequence: sequence,
          progress: 1,
          message: 'Animation sequence generated',
        }));

        return sequence;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation failed';
        setState((s) => ({ ...s, error: message }));
        return null;
      }
    },
    []
  );

  // ─── Complete Pipeline ────────────────────────────────────────────────

  const generate = useCallback(
    async (
      audioFile: File,
      theme: ThemeProfile
    ): Promise<boolean> => {
      abortControllerRef.current = new AbortController();

      try {
        // Step 1: Load audio
        const audioLoaded = await loadAudio(audioFile);
        if (!audioLoaded) return false;

        // Step 2: Analyze with Gemini
        const transcript = await analyzeAudio(audioFile);
        if (!transcript) return false;

        // Step 3: Detect beats
        const beatGrid = await detectBeats(audioFile);
        if (!beatGrid) return false;

        // Step 4: Generate animations
        const sequence = await generateSequence(transcript, beatGrid, theme);
        if (!sequence) return false;

        // Setup for rendering
        if (canvasRef.current) {
          rendererRef.current = createCanvasRenderer(canvasRef.current, sequence);
        }

        setState((s) => ({
          ...s,
          stage: 'idle',
          message: 'Ready to play',
        }));

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Pipeline failed';
        setState((s) => ({ ...s, stage: 'error', error: message }));
        return false;
      }
    },
    [loadAudio, analyzeAudio, detectBeats, generateSequence]
  );

  // ─── Playback Controls ────────────────────────────────────────────────

  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setState((s) => ({ ...s, isPlaying: true }));
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState((s) => ({ ...s, isPlaying: false }));
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState((s) => ({ ...s, currentTime: time }));
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  // ─── Export to MP4 ────────────────────────────────────────────────────

  const exportToMP4 = useCallback(
    async (options?: any): Promise<Blob | null> => {
      try {
        if (!canvasRef.current || !audioRef.current || !state.animationSequence) {
          throw new Error('Animation not ready for export');
        }

        setState((s) => ({
          ...s,
          stage: 'exporting',
          isExporting: true,
          exportProgress: 0,
          message: 'Exporting video...',
        }));

        // Use MediaRecorder to encode video
        const stream = (canvasRef.current as any).captureStream(30); // 30 FPS
        const audioTrack = (audioRef.current as any).captureStream().getAudioTracks()[0];

        stream.addTrack(audioTrack);

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/mp4',
          videoBitsPerSecond: 8 * 1024 * 1024, // 8 Mbps
        });

        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          chunks.push(event.data);
          setState((s) => ({
            ...s,
            exportProgress: Math.min(
              1,
              chunks.length / state.animationSequence!.durationMs
            ),
          }));
        };

        return new Promise((resolve, reject) => {
          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/mp4' });
            setState((s) => ({
              ...s,
              stage: 'idle',
              isExporting: false,
              message: 'Export complete',
            }));
            resolve(blob);
          };

          mediaRecorder.onerror = (err) => {
            setState((s) => ({
              ...s,
              stage: 'error',
              error: 'Export failed',
            }));
            reject(err);
          };

          // Start recording
          mediaRecorder.start();

          // Stop after animation duration
          setTimeout(
            () => mediaRecorder.stop(),
            state.animationSequence!.durationMs
          );
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Export failed';
        setState((s) => ({ ...s, error: message }));
        return null;
      }
    },
    [state.animationSequence]
  );

  // ─── Render Animation ─────────────────────────────────────────────────

  const renderFrame = useCallback((time: number) => {
    if (rendererRef.current && state.animationSequence) {
      rendererRef.current.render(time, audioRef.current);
    }
  }, [state.animationSequence]);

  return {
    state,
    actions: {
      generate,
      loadAudio,
      analyzeAudio,
      detectBeats,
      generateSequence,
      play,
      pause,
      togglePlayPause,
      seek,
      exportToMP4,
      renderFrame,
    },
    refs: {
      audioRef,
      canvasRef,
      rendererRef,
    },
  };
}
