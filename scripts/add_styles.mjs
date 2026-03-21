import { readFileSync, writeFileSync } from 'fs';

const file = 'constants.ts';
const content = readFileSync(file, 'utf8');

// Find the last line before CUSTOM section and insert new styles
const customSection = `\n  // --- CAPCUT-LEVEL WORD-BY-WORD STYLES (NEW) ---
  [CaptionStyle.CAPCUT_CLASSIC]: { name:"CapCut Classic",category:"VIRAL",fontFamily:"'Montserrat', sans-serif",fontSize:60,fontWeight:900,textColor:"#FFFFFF",activeTextColor:"#FFD700",strokeColor:"#000000",strokeWidth:8,shadowColor:"rgba(0,0,0,0.9)",shadowBlur:8,shadowOffsetY:4,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.CAPCUT_BOLD_YELLOW]: { name:"CapCut Bold Yellow",category:"VIRAL",fontFamily:"'Montserrat', sans-serif",fontSize:64,fontWeight:900,textColor:"#FFFFFFCC",activeTextColor:"#FFEE00",strokeColor:"#000000",strokeWidth:10,shadowColor:"rgba(0,0,0,1)",shadowBlur:0,shadowOffsetY:6,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_FIRE_POP]: { name:"Fire Pop",category:"VIRAL",fontFamily:"'Anton', sans-serif",fontSize:66,fontWeight:400,textColor:"#FF9500",activeTextColor:"#FFE100",gradientColors:["#FF4500","#FF8C00","#FFD700"],strokeColor:"#8B1A00",strokeWidth:8,shadowColor:"#FF4500",shadowBlur:30,shadowOffsetY:6,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.BOUNCE_WAVE]: { name:"Bounce Wave",category:"VIRAL",fontFamily:"'Poppins', sans-serif",fontSize:58,fontWeight:900,textColor:"#00D4FF",activeTextColor:"#FFFFFF",strokeColor:"#003366",strokeWidth:6,shadowColor:"#0077FF",shadowBlur:20,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.RAINBOW_BURST]: { name:"Rainbow Burst",category:"VIRAL",fontFamily:"'Fredoka', sans-serif",fontSize:62,fontWeight:700,textColor:"#FF6B6B",activeTextColor:"#FFFFFF",strokeColor:"#000000",strokeWidth:8,shadowColor:"rgba(0,0,0,0.7)",shadowBlur:10,shadowOffsetY:5,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.VIRAL_WORD_SLAM]: { name:"Word Slam",category:"KINETIC",fontFamily:"'Anton', sans-serif",fontSize:80,fontWeight:400,textColor:"#FFFFFF",strokeColor:"#000000",strokeWidth:14,shadowColor:"#FF0000",shadowBlur:20,shadowOffsetY:12,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.KARAOKE_FIRE]: { name:"Karaoke Fire",category:"NEON",fontFamily:"'Poppins', sans-serif",fontSize:50,fontWeight:900,textColor:"rgba(255,255,255,0.25)",activeTextColor:"#FF6B00",strokeColor:"#3D1A00",strokeWidth:2,shadowColor:"#FF4500",shadowBlur:35,animation:"KARAOKE",displayMode:"BLOCK"},
  [CaptionStyle.WORD_CINEMATIC]: { name:"Cinematic",category:"MINIMAL",fontFamily:"'Inter', sans-serif",fontSize:52,fontWeight:300,textColor:"rgba(255,255,255,0.35)",activeTextColor:"#FFFFFF",shadowColor:"rgba(0,0,0,0.95)",shadowBlur:20,shadowOffsetY:2,animation:"SCALE_UP",uppercase:false,displayMode:"WORD"},
  [CaptionStyle.MINIMAL_WORD_FADE]: { name:"Minimal Fade",category:"MINIMAL",fontFamily:"'Nunito', sans-serif",fontSize:56,fontWeight:800,textColor:"rgba(255,255,255,0.25)",activeTextColor:"#FFFFFF",shadowColor:"rgba(0,0,0,0.8)",shadowBlur:15,animation:"SCALE_UP",uppercase:false,displayMode:"WORD"},
  [CaptionStyle.GRADIENT_SHIFT]: { name:"Gradient Shift",category:"GLOW",fontFamily:"'Poppins', sans-serif",fontSize:58,fontWeight:900,textColor:"#FFFFFF",activeTextColor:"#00FFFF",gradientColors:["#7B2FBE","#00D4FF","#FF6BCB"],shadowColor:"rgba(123,47,190,0.6)",shadowBlur:30,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_GLITTER]: { name:"Glitter",category:"GLOW",fontFamily:"'Fredoka', sans-serif",fontSize:58,fontWeight:700,textColor:"#FFB6C1",activeTextColor:"#FFFFFF",gradientColors:["#FF6BCB","#FFADD2","#C084FC"],shadowColor:"rgba(255,107,203,0.7)",shadowBlur:30,animation:"POP",displayMode:"WORD"},
  [CaptionStyle.NEON_WORD_WAVE]: { name:"Neon Wave",category:"NEON",fontFamily:"'Orbitron', sans-serif",fontSize:52,fontWeight:900,textColor:"rgba(0,255,255,0.4)",activeTextColor:"#00FFFF",strokeColor:"#003344",strokeWidth:3,shadowColor:"#00FFFF",shadowBlur:40,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_SPOTLIGHT_REVEAL]: { name:"Spotlight Reveal",category:"ART",fontFamily:"'Montserrat', sans-serif",fontSize:60,fontWeight:900,textColor:"rgba(255,255,255,0.2)",activeTextColor:"#FFFFFF",shadowColor:"rgba(255,255,255,0.8)",shadowBlur:35,animation:"SCALE_UP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_SHAKE_IMPACT]: { name:"Shake Impact",category:"KINETIC",fontFamily:"'Anton', sans-serif",fontSize:72,fontWeight:400,textColor:"#FFFFFF",activeTextColor:"#FF3B3B",strokeColor:"#000000",strokeWidth:10,shadowColor:"#FF0000",shadowBlur:15,shadowOffsetY:10,animation:"POP",uppercase:true,displayMode:"WORD"},
  [CaptionStyle.WORD_OUTLINED_POP]: { name:"Outlined Pop",category:"BOLD",fontFamily:"'Bebas Neue', display",fontSize:68,fontWeight:900,textColor:"#FFFFFF",activeTextColor:"#FFEE00",strokeColor:"#000000",strokeWidth:14,shadowColor:"#000000",shadowBlur:0,shadowOffsetY:10,animation:"POP",uppercase:true,displayMode:"WORD"},
\n`;

// Insert before the CUSTOM entry
const marker = '[CaptionStyle.CUSTOM]';
const idx = content.lastIndexOf(marker);
if (idx === -1) { console.error('Marker not found!'); process.exit(1); }

// Find start of that line
let lineStart = idx;
while (lineStart > 0 && content[lineStart - 1] !== '\n') lineStart--;

const newContent = content.slice(0, lineStart) + customSection + '  ' + content.slice(idx);
writeFileSync(file, newContent, 'utf8');
console.log('Done! Added', (customSection.match(/\[CaptionStyle\./g) || []).length, 'new styles.');
