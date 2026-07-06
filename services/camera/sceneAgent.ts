// Scene Agent — segment the video into "shots" from caption timing.
//
// A new shot begins after a silent gap (a likely cut / topic change) or when the
// current shot has run long enough that a re-establish keeps the frame fresh.
// Each shot gets one establish (zoom-out) + a slow push-in for retention.

import type { Caption } from '../../types';

export interface Shot { start: number; end: number; }

const GAP_CUT = 1.0;     // gap (s) between captions that implies a cut
const MAX_SHOT = 6.5;    // force a re-establish at least this often

export function sceneAgent(captions: Caption[], duration: number): Shot[] {
  if (!captions.length) {
    return duration > 0 ? [{ start: 0, end: duration }] : [];
  }
  const caps = [...captions].sort((a, b) => a.startTime - b.startTime);
  const shots: Shot[] = [];
  let start = caps[0].startTime;
  let prevEnd = caps[0].endTime;

  for (let i = 1; i < caps.length; i++) {
    const c = caps[i];
    const gap = c.startTime - prevEnd;
    const shotLen = prevEnd - start;
    if (gap > GAP_CUT || shotLen > MAX_SHOT) {
      shots.push({ start, end: prevEnd });
      start = c.startTime;
    }
    prevEnd = Math.max(prevEnd, c.endTime);
  }
  shots.push({ start, end: prevEnd });
  return shots;
}
