import { Caption } from '../../types';

function toVttTimestamp(seconds: number): string {
  // Round to total ms first — rounding the fraction separately can produce
  // ms === 1000 (e.g. 1.9996s → "00:00:01.1000"), which is invalid WebVTT.
  const totalMs = Math.round(seconds * 1000);
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function captionsToVtt(captions: Caption[]): string {
  const lines = ['WEBVTT', ''];
  captions.forEach((c, i) => {
    lines.push(`${i + 1}`);
    lines.push(`${toVttTimestamp(c.startTime)} --> ${toVttTimestamp(c.endTime)}`);
    lines.push(c.text);
    lines.push('');
  });
  return lines.join('\n');
}

export function downloadVtt(captions: Caption[], filename = 'captions.vtt'): void {
  const content = captionsToVtt(captions);
  const blob = new Blob([content], { type: 'text/vtt;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
