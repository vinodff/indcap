import { Caption } from '../../types';

function toSrtTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function captionsToSrt(captions: Caption[]): string {
  return captions
    .map((c, i) => {
      const start = toSrtTimestamp(c.startTime);
      const end = toSrtTimestamp(c.endTime);
      return `${i + 1}\n${start} --> ${end}\n${c.text}\n`;
    })
    .join('\n');
}

export function downloadSrt(captions: Caption[], filename = 'captions.srt'): void {
  const content = captionsToSrt(captions);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
