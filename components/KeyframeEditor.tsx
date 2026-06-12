import React, { useState, useCallback } from 'react';
import { Diamond, Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Caption, Keyframe, KeyframeMap } from '../types';
import { upsertKeyframe, removeKeyframe } from '../services/caption/keyframeEngine';

interface KeyframeEditorProps {
  captions: Caption[];
  keyframeMap: KeyframeMap;
  onKeyframeMapChange: (map: KeyframeMap) => void;
  currentTime: number;
  onClose: () => void;
}

interface SliderRowProps {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  step: number;
  defaultVal: number;
  onChange: (v: number | undefined) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, step, defaultVal, onChange }) => {
  const active = value !== undefined;
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(active ? undefined : defaultVal)}
        className={`w-2.5 h-2.5 rounded-sm border flex-shrink-0 transition-colors ${active ? 'bg-violet-500 border-violet-400' : 'bg-transparent border-white/30'}`}
        title={active ? 'Remove override' : 'Add override'}
      />
      <span className="text-[10px] text-white/50 w-12 flex-shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value ?? defaultVal}
        disabled={!active}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-violet-500 disabled:opacity-30"
      />
      <span className="text-[10px] text-white/40 w-8 text-right flex-shrink-0">
        {(value ?? defaultVal).toFixed(step < 1 ? 2 : 0)}
      </span>
    </div>
  );
};

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return `${m}:${sec.padStart(4, '0')}`;
};

interface BezierEditorProps {
  controlPoints: [number, number, number, number] | undefined;
  onChange: (points: [number, number, number, number] | undefined) => void;
}

const BezierEditor: React.FC<BezierEditorProps> = ({ controlPoints, onChange }) => {
  const points = controlPoints || [0.25, 0.1, 0.25, 1.0];
  const [x1, y1, x2, y2] = points;

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);

  const padding = 15;
  const size = 120; // internal size of graph area

  const toCanvasCoords = useCallback((x: number, y: number) => {
    return {
      cx: padding + x * size,
      cy: padding + (1 - y) * size,
    };
  }, [size, padding]);

  const fromCanvasCoords = useCallback((cx: number, cy: number) => {
    let x = (cx - padding) / size;
    let y = 1 - (cy - padding) / size;
    x = Math.max(0, Math.min(1, x));
    y = Math.max(-0.5, Math.min(1.5, y));
    return { x, y };
  }, [size, padding]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding + size / 2, padding);
    ctx.lineTo(padding + size / 2, padding + size);
    ctx.moveTo(padding, padding + size / 2);
    ctx.lineTo(padding + size, padding + size / 2);
    ctx.stroke();

    // Box border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeRect(padding, padding, size, size);

    const p0 = toCanvasCoords(0, 0);
    const p3 = toCanvasCoords(1, 1);
    const c1 = toCanvasCoords(x1, y1);
    const c2 = toCanvasCoords(x2, y2);

    // Connector lines
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p0.cx, p0.cy);
    ctx.lineTo(c1.cx, c1.cy);
    ctx.moveTo(p3.cx, p3.cy);
    ctx.lineTo(c2.cx, c2.cy);
    ctx.stroke();

    // Bezier curve
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p0.cx, p0.cy);
    ctx.bezierCurveTo(c1.cx, c1.cy, c2.cx, c2.cy, p3.cx, p3.cy);
    ctx.stroke();

    // Handle 1
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(c1.cx, c1.cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Handle 2
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(c2.cx, c2.cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [x1, y1, x2, y2, toCanvasCoords, size, padding]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const c1 = toCanvasCoords(x1, y1);
    const c2 = toCanvasCoords(x2, y2);

    const dist1 = Math.hypot(cx - c1.cx, cy - c1.cy);
    const dist2 = Math.hypot(cx - c2.cx, cy - c2.cy);

    if (dist1 < 10) {
      setDragging('p1');
      canvas.setPointerCapture(e.pointerId);
    } else if (dist2 < 10) {
      setDragging('p2');
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const { x, y } = fromCanvasCoords(cx, cy);

    if (dragging === 'p1') {
      onChange([x, y, x2, y2]);
    } else {
      onChange([x1, y1, x, y]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragging) {
      const canvas = canvasRef.current;
      canvas?.releasePointerCapture(e.pointerId);
      setDragging(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1.5 mt-2 p-2 bg-white/5 rounded-lg border border-white/5">
      <div className="text-[9px] text-white/40 flex justify-between w-full">
        <span>emerald handle: P1 ({x1.toFixed(2)}, {y1.toFixed(2)})</span>
        <span>blue handle: P2 ({x2.toFixed(2)}, {y2.toFixed(2)})</span>
      </div>
      <canvas
        ref={canvasRef}
        width={size + padding * 2}
        height={size + padding * 2}
        className="cursor-crosshair bg-black/30 rounded border border-white/10"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  );
};

export const KeyframeEditor: React.FC<KeyframeEditorProps> = ({
  captions,
  keyframeMap,
  onKeyframeMapChange,
  currentTime,
  onClose,
}) => {
  const [expandedCaption, setExpandedCaption] = useState<string | null>(null);
  const [editingKf, setEditingKf] = useState<{ captionId: string; kf: Keyframe } | null>(null);

  const activeCaptionId = captions.find(
    c => currentTime >= c.startTime && currentTime <= c.endTime
  )?.id ?? null;

  const addKeyframe = useCallback((captionId: string) => {
    const kf: Keyframe = { time: currentTime };
    onKeyframeMapChange(upsertKeyframe(keyframeMap, captionId, kf));
    setEditingKf({ captionId, kf });
  }, [currentTime, keyframeMap, onKeyframeMapChange]);

  const deleteKeyframe = useCallback((captionId: string, time: number, wordIdx?: number) => {
    onKeyframeMapChange(removeKeyframe(keyframeMap, captionId, time, wordIdx));
    if (editingKf?.captionId === captionId && editingKf.kf.time === time && editingKf.kf.wordIdx === wordIdx) {
      setEditingKf(null);
    }
  }, [keyframeMap, onKeyframeMapChange, editingKf]);

  const updateEditingKf = useCallback((updates: Partial<Keyframe>) => {
    if (!editingKf) return;
    const next: Keyframe = { ...editingKf.kf, ...updates };
    onKeyframeMapChange(upsertKeyframe(keyframeMap, editingKf.captionId, next));
    setEditingKf({ ...editingKf, kf: next });
  }, [editingKf, keyframeMap, onKeyframeMapChange]);

  const handleWordIdxChange = useCallback((newWordIdx: number | undefined) => {
    if (!editingKf) return;
    const oldKf = editingKf.kf;
    const next: Keyframe = { ...oldKf, wordIdx: newWordIdx };
    const mapWithRemoved = removeKeyframe(keyframeMap, editingKf.captionId, oldKf.time, oldKf.wordIdx);
    onKeyframeMapChange(upsertKeyframe(mapWithRemoved, editingKf.captionId, next));
    setEditingKf({ ...editingKf, kf: next });
  }, [editingKf, keyframeMap, onKeyframeMapChange]);

  const captionsWithKf = captions.filter(c => keyframeMap.has(c.id));
  const totalKfs = [...keyframeMap.values()].reduce((s, arr) => s + arr.length, 0);

  const activeCap = editingKf ? captions.find(c => c.id === editingKf.captionId) : null;
  const wordsList = activeCap?.text.split(' ') || [];

  return (
    <div className="flex flex-col w-72 max-h-[580px] bg-[#13111a] border border-violet-500/20 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#0f0d16] border-b border-violet-500/15 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Diamond size={13} className="text-violet-400" />
          <span className="text-xs font-semibold text-white">Keyframe Editor</span>
          {totalKfs > 0 && (
            <span className="text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded-full">
              {totalKfs}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Add to active caption */}
        {activeCaptionId && (
          <div className="px-3 py-2 border-b border-white/5">
            <div className="text-[10px] text-white/40 mb-1.5">Current caption at {formatTime(currentTime)}</div>
            <button
              onClick={() => addKeyframe(activeCaptionId)}
              className="flex items-center gap-1.5 text-[11px] text-violet-300 hover:text-violet-200 bg-violet-500/10 hover:bg-violet-500/20 px-2.5 py-1.5 rounded-lg w-full justify-center transition-colors"
            >
              <Plus size={11} />
              Add Keyframe Here
            </button>
          </div>
        )}

        {/* Keyframe editor panel */}
        {editingKf && (
          <div className="px-3 py-2.5 border-b border-violet-500/10 bg-violet-500/5">
            <div className="text-[10px] text-violet-300 font-semibold mb-2">
              Editing @ {formatTime(editingKf.kf.time)}
            </div>
            
            {/* Word selector dropdown */}
            <div className="mb-2.5">
              <div className="text-[9px] text-white/40 mb-1 uppercase tracking-widest">Apply to</div>
              <select
                value={editingKf.kf.wordIdx === undefined ? 'caption' : editingKf.kf.wordIdx.toString()}
                onChange={e => {
                  const val = e.target.value;
                  handleWordIdxChange(val === 'caption' ? undefined : parseInt(val));
                }}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-violet-500"
              >
                <option value="caption" className="bg-[#13111a]">Whole Caption</option>
                {wordsList.map((w, idx) => (
                  <option key={idx} value={idx.toString()} className="bg-[#13111a]">
                    Word {idx + 1}: {w}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <SliderRow
                label="Scale"
                value={editingKf.kf.scale}
                min={0.1} max={3} step={0.05} defaultVal={1}
                onChange={v => updateEditingKf({ scale: v })}
              />
              <SliderRow
                label="Opacity"
                value={editingKf.kf.opacity}
                min={0} max={1} step={0.05} defaultVal={1}
                onChange={v => updateEditingKf({ opacity: v })}
              />
              <SliderRow
                label="Offset X"
                value={editingKf.kf.offsetX}
                min={-200} max={200} step={1} defaultVal={0}
                onChange={v => updateEditingKf({ offsetX: v })}
              />
              <SliderRow
                label="Offset Y"
                value={editingKf.kf.offsetY}
                min={-200} max={200} step={1} defaultVal={0}
                onChange={v => updateEditingKf({ offsetY: v })}
              />
              <SliderRow
                label="Rotation"
                value={editingKf.kf.rotation !== undefined ? editingKf.kf.rotation * (180 / Math.PI) : undefined}
                min={-180} max={180} step={1} defaultVal={0}
                onChange={v => updateEditingKf({ rotation: v !== undefined ? v * (Math.PI / 180) : undefined })}
              />
            </div>
            
            {/* Easing curve selector */}
            <div className="mt-2.5">
              <div className="text-[9px] text-white/40 mb-1.5 uppercase tracking-widest">Curve → next</div>
              <div className="flex gap-1">
                {(['linear', 'ease', 'instant', 'custom'] as const).map(curve => {
                  const isActive = curve === 'custom' 
                    ? editingKf.kf.controlPoints !== undefined 
                    : ((editingKf.kf.easing ?? 'linear') === curve && editingKf.kf.controlPoints === undefined);
                  return (
                    <button
                      key={curve}
                      onClick={() => {
                        if (curve === 'custom') {
                          updateEditingKf({ controlPoints: [0.25, 0.1, 0.25, 1.0] });
                        } else {
                          updateEditingKf({ easing: curve, controlPoints: undefined });
                        }
                      }}
                      className={`flex-1 text-[9px] py-1.5 rounded transition-colors font-mono ${
                        isActive
                          ? 'bg-violet-500 text-white'
                          : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60'
                      }`}
                    >
                      {curve}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bezier Editor (displayed only when 'custom' control points are active) */}
            {editingKf.kf.controlPoints !== undefined && (
              <BezierEditor
                controlPoints={editingKf.kf.controlPoints}
                onChange={points => updateEditingKf({ controlPoints: points })}
              />
            )}
          </div>
        )}

        {/* Keyframe list */}
        {captionsWithKf.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-white/25">
            <Diamond size={24} className="opacity-30" />
            <p className="text-[11px]">No keyframes yet.</p>
            <p className="text-[10px]">Seek to a time and click "Add Keyframe Here".</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {captionsWithKf.map(cap => {
              const frames = keyframeMap.get(cap.id) ?? [];
              const isExpanded = expandedCaption === cap.id;
              const words = cap.text.split(' ');
              return (
                <div key={cap.id}>
                  <button
                    onClick={() => setExpandedCaption(isExpanded ? null : cap.id)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/4 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Diamond size={10} className="text-violet-400 flex-shrink-0" />
                      <span className="text-[11px] text-white/70 truncate max-w-[140px]">{cap.text}</span>
                      <span className="text-[10px] text-violet-400/70 bg-violet-500/10 px-1 rounded flex-shrink-0">
                        {frames.length}
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp size={11} className="text-white/30" /> : <ChevronDown size={11} className="text-white/30" />}
                  </button>
                  {isExpanded && (
                    <div className="bg-white/2 px-3 py-1.5 flex flex-col gap-1">
                      {frames.map((kf, kIdx) => (
                        <div
                          key={kIdx}
                          className={`flex items-center justify-between py-1 px-2 rounded-lg cursor-pointer transition-colors ${
                            editingKf?.captionId === cap.id && editingKf.kf.time === kf.time && editingKf.kf.wordIdx === kf.wordIdx
                              ? 'bg-violet-500/20 border border-violet-500/30'
                              : 'hover:bg-white/5'
                          }`}
                          onClick={() => setEditingKf({ captionId: cap.id, kf })}
                        >
                          <div className="flex flex-col">
                            <span className="text-[10px] text-white/60 font-mono">{formatTime(kf.time)}</span>
                            <span className="text-[8px] text-violet-400 font-semibold">
                              {kf.wordIdx === undefined ? 'Caption' : `Word ${kf.wordIdx + 1}: ${words[kf.wordIdx] ?? ''}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] text-white/30">
                            {kf.scale !== undefined && <span>sc:{kf.scale.toFixed(2)}</span>}
                            {kf.opacity !== undefined && <span>op:{kf.opacity.toFixed(2)}</span>}
                            {kf.offsetX !== undefined && <span>x:{kf.offsetX}</span>}
                            {kf.offsetY !== undefined && <span>y:{kf.offsetY}</span>}
                          </div>
                          <button
                            onClick={e => { e.stopPropagation(); deleteKeyframe(cap.id, kf.time, kf.wordIdx); }}
                            className="text-white/20 hover:text-red-400 transition-colors ml-1"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-white/5 flex-shrink-0">
        <p className="text-[10px] text-white/25">
          Click a keyframe to edit its properties • Keyframes interpolate between values
        </p>
      </div>
    </div>
  );
};
