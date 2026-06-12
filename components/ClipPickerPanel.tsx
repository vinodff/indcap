import React, { useMemo, useState } from 'react';
import { Scissors, Play, X, TrendingUp, Clock } from 'lucide-react';
import { Caption } from '../types';
import { extractClips, formatClipTime, ClipCandidate } from '../services/clipExtractor';

interface ClipPickerPanelProps {
  captions: Caption[];
  onSeek: (time: number) => void;
  onClose: () => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60] as const;
type DurOpt = typeof DURATION_OPTIONS[number];

const SCORE_COLOR = (score: number): string => {
  if (score >= 70) return 'text-green-400';
  if (score >= 45) return 'text-yellow-400';
  return 'text-orange-400';
};

const ScoreBar: React.FC<{ score: number }> = ({ score }) => (
  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
    <div
      className={`h-full rounded-full transition-all ${score >= 70 ? 'bg-green-500' : score >= 45 ? 'bg-yellow-500' : 'bg-orange-500'}`}
      style={{ width: `${score}%` }}
    />
  </div>
);

export const ClipPickerPanel: React.FC<ClipPickerPanelProps> = ({
  captions,
  onSeek,
  onClose,
}) => {
  const [targetDuration, setTargetDuration] = useState<DurOpt>(30);

  const clips = useMemo(
    () => extractClips(captions, targetDuration, 6),
    [captions, targetDuration]
  );

  return (
    <div className="flex flex-col w-80 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[480px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#16213e] border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Scissors size={14} className="text-green-400" />
          <span className="text-xs font-semibold text-white">Best Clips</span>
          <span className="text-[10px] text-white/40 bg-white/8 px-1.5 py-0.5 rounded-full">
            AI scored
          </span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Duration selector */}
      <div className="flex gap-1 px-3 py-2 border-b border-white/5 flex-shrink-0">
        <span className="text-[10px] text-white/40 mr-1 self-center">Target:</span>
        {DURATION_OPTIONS.map(d => (
          <button
            key={d}
            onClick={() => setTargetDuration(d)}
            className={`text-[10px] px-2.5 py-1 rounded-full transition-colors ${
              targetDuration === d
                ? 'bg-green-600 text-white'
                : 'bg-white/8 text-white/60 hover:text-white'
            }`}
          >
            {d}s
          </button>
        ))}
      </div>

      {/* Clip list */}
      <div className="flex-1 overflow-y-auto">
        {clips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-white/30 text-xs gap-2">
            <Scissors size={24} className="opacity-30" />
            <p>No {targetDuration}s clips found.</p>
            <p className="text-[10px]">Generate captions first.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {clips.map((clip, i) => (
              <ClipCard
                key={`${clip.startTime}-${clip.endTime}`}
                clip={clip}
                rank={i + 1}
                onSeek={onSeek}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-white/5 flex-shrink-0">
        <p className="text-[10px] text-white/30">
          Click <Play size={8} className="inline" /> to preview • Clips scored by energy, pacing &amp; engagement
        </p>
      </div>
    </div>
  );
};

const ClipCard: React.FC<{
  clip: ClipCandidate;
  rank: number;
  onSeek: (time: number) => void;
}> = ({ clip, rank, onSeek }) => {
  const duration = clip.endTime - clip.startTime;

  return (
    <div className="px-3 py-2.5 hover:bg-white/4 transition-colors group">
      <div className="flex items-start gap-2">
        {/* Rank badge */}
        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center mt-0.5">
          <span className="text-[10px] font-bold text-white/60">#{rank}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Row 1: time range + score */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-[10px] text-white/60">
              <Clock size={10} />
              <span>{formatClipTime(clip.startTime)} – {formatClipTime(clip.endTime)}</span>
              <span className="text-white/30">({Math.round(duration)}s)</span>
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-bold ${SCORE_COLOR(clip.score)}`}>
              <TrendingUp size={9} />
              {clip.score}
            </div>
          </div>

          {/* Score bar */}
          <ScoreBar score={clip.score} />

          {/* Preview text */}
          <p className="text-[10px] text-white/50 mt-1.5 leading-relaxed line-clamp-2">{clip.preview}</p>

          {/* Reason tag + play button */}
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[9px] bg-white/8 text-white/50 px-1.5 py-0.5 rounded-full">
              {clip.reason}
            </span>
            <button
              onClick={() => onSeek(clip.startTime)}
              className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Play size={10} fill="currentColor" />
              Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
