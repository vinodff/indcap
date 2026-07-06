import fs from 'fs';
import path from 'path';

const FILES_TO_RESTYLE = [
  'App.tsx',
  'components/StudioModeStudio.tsx',
  'components/TypographyReelStudio.tsx',
  'components/MotionGraphicsPanel.tsx',
  'components/SocialPublisher.tsx',
  'components/AutomationDashboard.tsx',
  'components/AiThumbnailGenerator.tsx',
  'components/SeoGenerator.tsx',
];

const REPLACEMENTS = [
  // Backgrounds
  { from: /bg-\[\#0a0a0a\]/g, to: 'bg-[var(--cc-bg)]' },
  { from: /bg-\[\#0c0c0c\]/g, to: 'bg-[var(--cc-surface)]' },
  { from: /bg-\[\#080808\]/g, to: 'bg-[var(--cc-bg)]' },
  { from: /bg-\[\#121212\]/g, to: 'bg-[var(--cc-surface)]' },
  { from: /bg-\[\#181818\]/g, to: 'bg-[var(--cc-surface)]' },
  { from: /bg-gray-900/g, to: 'bg-[var(--cc-surface)]' },
  { from: /bg-gray-950/g, to: 'bg-[var(--cc-bg)]' },
  
  // Borders
  { from: /border-gray-800/g, to: 'border-[var(--cc-border)]' },
  { from: /border-gray-700/g, to: 'border-[var(--cc-border)]' },
  { from: /border-white\/10/g, to: 'border-[var(--cc-border)]' },
  { from: /border-white\/5/g, to: 'border-[var(--cc-border)]/50' },
  
  // Text colors (only when representing standard text styles)
  { from: /text-gray-500/g, to: 'text-[var(--cc-text-3)]' },
  { from: /text-gray-400/g, to: 'text-[var(--cc-text-3)]' },
  { from: /text-gray-300/g, to: 'text-[var(--cc-text-2)]' },
  { from: /text-white\/60/g, to: 'text-[var(--cc-text-2)]/60' },
  { from: /text-white\/70/g, to: 'text-[var(--cc-text-2)]/70' },
  { from: /text-white\/80/g, to: 'text-[var(--cc-text-2)]/80' },
  { from: /text-white\/90/g, to: 'text-[var(--cc-text-1)]/90' },
  { from: /text-white\b/g, to: 'text-[var(--cc-text-1)]' }, // Match exact text-white, avoid text-white/60 etc.
  
  // Gray boxes / highlights
  { from: /bg-gray-800\/50/g, to: 'bg-[var(--cc-surface-3)]/50' },
  { from: /bg-gray-800/g, to: 'bg-[var(--cc-surface-3)]' },
  { from: /bg-gray-900\/50/g, to: 'bg-[var(--cc-surface-3)]/50' },
  { from: /hover:bg-gray-800/g, to: 'hover:bg-[var(--cc-surface-3)]' },
  { from: /hover:bg-gray-700/g, to: 'hover:bg-[var(--cc-surface-3)]/80' },
  
  // Active states from CapCut blue to Vercel Blue
  { from: /text-blue-400/g, to: 'text-[var(--cc-blue)]' },
  { from: /bg-blue-500\/10/g, to: 'bg-[var(--cc-blue-dim)]' },
  { from: /border-blue-500\/20/g, to: 'border-[rgba(0,112,243,0.15)]' },
  { from: /hover:text-blue-400/g, to: 'hover:text-[var(--cc-blue-light)]' },
  { from: /text-cyan-400/g, to: 'text-[var(--cc-green)]' },
];

function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }
  
  console.log(`Restyling: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  for (const rep of REPLACEMENTS) {
    content = content.replace(rep.from, rep.to);
  }
  
  // Fix specific elements back to black/dark for video preview contrast
  // Video player areas should always remain dark
  content = content.replace(/bg-\[var\(--cc-bg\)\]\s+relative\s+p-4\s+min-h-\[40vh\]/g, 'bg-[#030303] relative p-4 min-h-[40vh]');
  content = content.replace(/bg-\[var\(--cc-bg\)\]\s+relative\s+flex-1\s+min-h-0\s+flex/g, 'bg-[#030303] relative flex-1 min-h-0 flex');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully updated: ${filePath}`);
  } else {
    console.log(`No changes made to: ${filePath}`);
  }
}

// Run for all files
const rootDir = 'c:/MY Projects/indcaption/createrin--v1/createrin-v1-main';
for (const file of FILES_TO_RESTYLE) {
  processFile(path.join(rootDir, file));
}
console.log('Restyling script execution finished.');
