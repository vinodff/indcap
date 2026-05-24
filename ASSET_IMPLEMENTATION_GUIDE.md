# Asset Collection Implementation Guide

Practical code examples and step-by-step implementation for the typography reel asset system.

---

## Phase 1: Font Registry Setup

### Step 1: Create Font Metadata Database

```typescript
// services/assetRegistry/fontMetadata.ts

export const TYPOGRAPHY_FONTS: FontMetadata[] = [
  // BOLD & IMPACTFUL
  {
    id: 'anton',
    name: 'Anton',
    family: 'Anton',
    provider: 'google',
    weights: [400],
    styles: ['normal'],
    category: 'sans-serif',
    subCategory: 'bold',
    personality: ['energetic', 'athletic', 'urgent'],
    metrics: {
      baseFontSize: 48,
      lineHeight: 1.2,
      letterSpacing: 0,
    },
    pairsWith: ['poppins', 'inter', 'fredoka'],
    useCase: ['viral', 'fitness', 'motivation'],
    loaded: false,
  },

  {
    id: 'space_grotesk',
    name: 'Space Grotesk',
    family: 'Space Grotesk',
    provider: 'google',
    weights: [500, 700],
    styles: ['normal'],
    category: 'sans-serif',
    subCategory: 'neon',
    personality: ['modern', 'tech-forward', 'geometric'],
    metrics: {
      baseFontSize: 48,
      lineHeight: 1.2,
      letterSpacing: 0.5,
    },
    pairsWith: ['montserrat', 'inter'],
    useCase: ['viral', 'neon', 'tech'],
    loaded: false,
  },

  // MINIMAL & CLEAN
  {
    id: 'inter',
    name: 'Inter',
    family: 'Inter',
    provider: 'google',
    weights: [300, 400, 500, 600, 700, 800, 900],
    styles: ['normal'],
    category: 'sans-serif',
    subCategory: 'minimal',
    personality: ['clean', 'modern', 'readable'],
    metrics: {
      baseFontSize: 36,
      lineHeight: 1.5,
      letterSpacing: 0,
    },
    pairsWith: ['playfair_display', 'cinzel'],
    useCase: ['minimal', 'tech', 'corporate'],
    loaded: false,
  },

  // ELEGANT & SOPHISTICATED
  {
    id: 'playfair_display',
    name: 'Playfair Display',
    family: 'Playfair Display',
    provider: 'google',
    weights: [400, 700, 900],
    styles: ['normal', 'italic'],
    category: 'serif',
    subCategory: 'elegant',
    personality: ['sophisticated', 'editorial', 'luxury'],
    metrics: {
      baseFontSize: 56,
      lineHeight: 1.25,
      letterSpacing: -0.5,
    },
    pairsWith: ['lato', 'inter'],
    useCase: ['luxury', 'editorial', 'cinematic'],
    loaded: false,
  },

  {
    id: 'cinzel',
    name: 'Cinzel',
    family: 'Cinzel',
    provider: 'google',
    weights: [400, 700, 900],
    styles: ['normal'],
    category: 'serif',
    subCategory: 'elegant',
    personality: ['majestic', 'cinematic', 'formal'],
    metrics: {
      baseFontSize: 52,
      lineHeight: 1.5,
      letterSpacing: 4,
    },
    pairsWith: ['inter', 'lato'],
    useCase: ['cinematic', 'luxury', 'editorial'],
    loaded: false,
  },

  // NEON & FUTURISTIC
  {
    id: 'orbitron',
    name: 'Orbitron',
    family: 'Orbitron',
    provider: 'google',
    weights: [400, 700, 900],
    styles: ['normal'],
    category: 'sans-serif',
    subCategory: 'neon',
    personality: ['cyber', 'futuristic', 'geometric'],
    metrics: {
      baseFontSize: 44,
      lineHeight: 1.5,
      letterSpacing: 2,
    },
    pairsWith: ['courier_new', 'space_grotesk'],
    useCase: ['neon', 'cyber', 'tech'],
    loaded: false,
  },

  // PLAYFUL & DISPLAY
  {
    id: 'luckiest_guy',
    name: 'Luckiest Guy',
    family: 'Luckiest Guy',
    provider: 'google',
    weights: [400],
    styles: ['normal'],
    category: 'display',
    subCategory: 'playful',
    personality: ['fun', 'playful', 'bubbly'],
    metrics: {
      baseFontSize: 52,
      lineHeight: 1.2,
      letterSpacing: 1,
    },
    pairsWith: ['fredoka', 'poppins'],
    useCase: ['entertainment', 'playful', 'kids'],
    loaded: false,
  },

  // MULTILINGUAL
  {
    id: 'noto_sans_devanagari',
    name: 'Noto Sans Devanagari',
    family: 'Noto Sans Devanagari',
    provider: 'google',
    weights: [400, 700],
    styles: ['normal'],
    category: 'sans-serif',
    subCategory: 'cultural',
    personality: ['readable', 'neutral', 'professional'],
    metrics: {
      baseFontSize: 40,
      lineHeight: 1.6,
      letterSpacing: 0,
    },
    pairsWith: ['inter', 'poppins'],
    useCase: ['india', 'multilingual', 'regional'],
    loaded: false,
  },

  {
    id: 'noto_sans_tamil',
    name: 'Noto Sans Tamil',
    family: 'Noto Sans Tamil',
    provider: 'google',
    weights: [400, 700],
    styles: ['normal'],
    category: 'sans-serif',
    subCategory: 'cultural',
    personality: ['readable', 'neutral', 'professional'],
    metrics: {
      baseFontSize: 40,
      lineHeight: 1.6,
      letterSpacing: 0,
    },
    pairsWith: ['inter', 'poppins'],
    useCase: ['tamil', 'multilingual', 'regional'],
    loaded: false,
  },

  {
    id: 'noto_sans_telugu',
    name: 'Noto Sans Telugu',
    family: 'Noto Sans Telugu',
    provider: 'google',
    weights: [400, 700],
    styles: ['normal'],
    category: 'sans-serif',
    subCategory: 'cultural',
    personality: ['readable', 'neutral', 'professional'],
    metrics: {
      baseFontSize: 40,
      lineHeight: 1.6,
      letterSpacing: 0,
    },
    pairsWith: ['inter', 'poppins'],
    useCase: ['telugu', 'multilingual', 'regional'],
    loaded: false,
  },
];
```

### Step 2: Initialize Registry Instance

```typescript
// services/assetRegistry/index.ts

import { FontRegistry } from './FontRegistry';
import { TYPOGRAPHY_FONTS } from './fontMetadata';

export const globalFontRegistry = new FontRegistry();

// Register all fonts
TYPOGRAPHY_FONTS.forEach(metadata => {
  globalFontRegistry.register(metadata);
});

// Export singleton
export { FontRegistry };
export type { FontMetadata };
```

---

## Phase 2: Setup HTML Font Loading

### Step 3: Optimize Font Links in HTML

```html
<!-- index.html -->

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Createrin - Smart Captions</title>

  <!-- Critical: Preconnect to Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

  <!-- CRITICAL FONTS: Load immediately for above-the-fold text -->
  <link 
    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@500;700&family=Montserrat:wght@300;400;700;900&display=swap"
    rel="stylesheet"
  >

  <!-- SECONDARY FONTS: Defer with media=print + onload trick -->
  <link 
    href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Cinzel:wght@400;700;900&family=Anton&family=Orbitron:wght@700;900&family=Fredoka:wght@600;700&family=Poppins:wght@600;800;900&display=swap"
    rel="stylesheet"
    media="print"
    onload="this.media='all'"
  >

  <!-- REGIONAL FONTS: Load on demand -->
  <link 
    href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&family=Noto+Sans+Tamil:wght@400;700&family=Noto+Sans+Telugu:wght@400;700&display=swap"
    rel="stylesheet"
    media="print"
    onload="this.media='all'"
  >

  <!-- Fallback for no-JS -->
  <noscript>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@500;700&family=Montserrat:wght@300;400;700;900&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Cinzel:wght@400;700;900&family=Anton&family=Orbitron:wght@700;900&display=swap" rel="stylesheet">
  </noscript>

  <link rel="stylesheet" href="/index.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/index.tsx"></script>
</body>
</html>
```

---

## Phase 3: CSS Setup

### Step 4: Define Font Variables & Stacks

```css
/* index.css */

:root {
  /* Primary fonts */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-secondary: 'Space Grotesk', 'Montserrat', sans-serif;
  --font-serif: 'Playfair Display', 'Cinzel', Georgia, serif;
  --font-display: 'Anton', 'Orbitron', sans-serif;
  --font-sans-bold: 'Montserrat', 'Poppins', sans-serif;
  --font-mono: 'Courier New', monospace;

  /* Typography scales */
  --font-weight-thin: 100;
  --font-weight-light: 300;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-black: 900;

  /* Font features */
  --font-kerning: 1;
  --font-smoothing: antialiased;

  /* Regional fonts */
  --font-hindi: 'Noto Sans Devanagari', sans-serif;
  --font-tamil: 'Noto Sans Tamil', sans-serif;
  --font-telugu: 'Noto Sans Telugu', sans-serif;
}

/* Apply font smoothing across all text */
body, input, button, textarea, select {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: 'kern' var(--font-kerning);
}

/* Base typography */
body {
  font-family: var(--font-primary);
  font-weight: var(--font-weight-regular);
  font-size: 16px;
  line-height: 1.5;
}

/* Headings */
h1, h2, h3 {
  font-family: var(--font-secondary);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

h1 {
  font-size: 2.5rem;
  font-family: var(--font-display);
}

h2 {
  font-size: 2rem;
}

h3 {
  font-size: 1.5rem;
}

/* Display text */
.text-display {
  font-family: var(--font-display);
  font-weight: var(--font-weight-bold);
  font-size: 3rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Elegant/serif text */
.text-elegant {
  font-family: var(--font-serif);
  font-weight: var(--font-weight-bold);
  font-style: italic;
  letter-spacing: -0.01em;
}

/* Monospace/code */
code, pre {
  font-family: var(--font-mono);
  font-weight: var(--font-weight-regular);
  font-size: 0.95em;
  line-height: 1.4;
}

/* Regional text */
[lang='hi'], .lang-hindi {
  font-family: var(--font-hindi);
}

[lang='ta'], .lang-tamil {
  font-family: var(--font-tamil);
}

[lang='te'], .lang-telugu {
  font-family: var(--font-telugu);
}

/* Responsive font sizing with variable fonts */
@media (max-width: 640px) {
  h1 { font-size: 1.875rem; }
  h2 { font-size: 1.5rem; }
  h3 { font-size: 1.25rem; }
  .text-display { font-size: 2rem; }
}

/* Optimize for printing */
@media print {
  body {
    font-size: 12pt;
    line-height: 1.6;
  }
}
```

---

## Phase 4: TypeScript Font Manager

### Step 5: Implement Font Manager Service

```typescript
// services/assetRegistry/FontManager.ts

import { globalFontRegistry } from './index';

export class FontManager {
  private preloadedFonts: Set<string> = new Set();
  private loadingPromises: Map<string, Promise<void>> = new Map();

  async preloadCriticalFonts(): Promise<void> {
    const critical = [
      'inter',
      'space_grotesk',
      'montserrat',
    ];

    try {
      await Promise.all(
        critical.map(fontId => this.loadFont(fontId))
      );
      console.log('✓ Critical fonts preloaded');
    } catch (error) {
      console.error('Failed to preload fonts:', error);
    }
  }

  async loadFont(fontId: string): Promise<void> {
    // Return cached promise if already loading
    if (this.loadingPromises.has(fontId)) {
      return this.loadingPromises.get(fontId);
    }

    // Skip if already loaded
    if (this.preloadedFonts.has(fontId)) {
      return;
    }

    const promise = this._loadFontInternal(fontId);
    this.loadingPromises.set(fontId, promise);

    try {
      await promise;
      this.preloadedFonts.add(fontId);
    } finally {
      this.loadingPromises.delete(fontId);
    }
  }

  private async _loadFontInternal(fontId: string): Promise<void> {
    const metadata = globalFontRegistry.getMetadata(fontId);
    if (!metadata) {
      throw new Error(`Font not found: ${fontId}`);
    }

    // Use native Font Loading API if available
    if ('fonts' in document) {
      await this._loadViaFontFaceAPI(metadata);
    } else {
      // Fallback: fonts already loaded via CSS link
      console.warn(`Using CSS-loaded fonts for ${fontId}`);
    }

    metadata.loaded = true;
  }

  private async _loadViaFontFaceAPI(metadata: FontMetadata): Promise<void> {
    const { family, weights } = metadata;

    for (const weight of weights) {
      const fontFace = new FontFace(
        family,
        `url('https://fonts.gstatic.com/s/...')`,
        { weight: weight.toString() }
      );

      try {
        await fontFace.load();
        (document.fonts as any).add(fontFace);
      } catch (error) {
        console.warn(`Failed to load ${family}:${weight}`, error);
      }
    }
  }

  // Get CSS font stack
  getFontStack(fontId: string): string {
    return globalFontRegistry.generateFontStack(fontId);
  }

  // Check if font is loaded
  isFontLoaded(fontId: string): boolean {
    return this.preloadedFonts.has(fontId);
  }

  // Get all loaded fonts
  getLoadedFonts(): string[] {
    return Array.from(this.preloadedFonts);
  }
}

export const fontManager = new FontManager();
```

### Step 6: React Hook for Font Loading

```typescript
// hooks/useFontLoader.ts

import { useEffect, useState } from 'react';
import { fontManager } from '../services/assetRegistry/FontManager';

export function useFontLoader(fontIds: string[]) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        await Promise.all(fontIds.map(id => fontManager.loadFont(id)));
        if (isMounted) setLoading(false);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [fontIds]);

  return { loading, error };
}

// Usage in component
export function TypographyReelStudio() {
  const { loading } = useFontLoader([
    'space_grotesk',
    'playfair_display',
    'orbitron',
  ]);

  if (loading) return <div>Loading fonts...</div>;

  return <div>Typography Reel Studio Ready</div>;
}
```

---

## Phase 5: Gradient System

### Step 7: Gradient Preset Registry

```typescript
// services/assetRegistry/gradientPresets.ts

export interface GradientPreset {
  id: string;
  name: string;
  colors: string[];
  angle?: number;
  mood: string[];
  useCase: string[];
  popularity: number;
}

export const GRADIENT_LIBRARY: GradientPreset[] = [
  // SUNSET & WARM
  {
    id: 'sunset_vibes',
    name: 'Sunset Vibes',
    colors: ['#FF512F', '#F09819'],
    angle: 135,
    mood: ['warm', 'energetic', 'happy'],
    useCase: ['viral', 'entertainment', 'travel'],
    popularity: 95,
  },

  {
    id: 'fire_storm',
    name: 'Fire Storm',
    colors: ['#f12711', '#f5af19'],
    angle: 135,
    mood: ['intense', 'energetic', 'hot'],
    useCase: ['fitness', 'motivation', 'viral'],
    popularity: 88,
  },

  {
    id: 'golden_hour',
    name: 'Golden Hour',
    colors: ['#F2994A', '#F2C94C'],
    angle: 135,
    mood: ['warm', 'luxurious', 'peaceful'],
    useCase: ['luxury', 'fashion', 'photography'],
    popularity: 82,
  },

  // COOL & NEON
  {
    id: 'neon_night',
    name: 'Neon Night',
    colors: ['#FF00FF', '#00FFFF'],
    angle: 90,
    mood: ['cyber', 'electric', 'modern'],
    useCase: ['neon', 'tech', 'futuristic'],
    popularity: 90,
  },

  {
    id: 'electric_blue',
    name: 'Electric Blue',
    colors: ['#4776E6', '#8E54E9'],
    angle: 135,
    mood: ['calm', 'professional', 'modern'],
    useCase: ['tech', 'corporate', 'education'],
    popularity: 85,
  },

  {
    id: 'ocean_wave',
    name: 'Ocean Wave',
    colors: ['#2193b0', '#6dd5ed'],
    angle: 135,
    mood: ['calm', 'cool', 'peaceful'],
    useCase: ['nature', 'travel', 'wellness'],
    popularity: 80,
  },

  // PREMIUM & LUXE
  {
    id: 'royal_purple',
    name: 'Royal Purple',
    colors: ['#8E2DE2', '#4A00E0'],
    angle: 135,
    mood: ['luxurious', 'elegant', 'mysterious'],
    useCase: ['luxury', 'fashion', 'premium'],
    popularity: 87,
  },

  {
    id: 'emerald',
    name: 'Emerald',
    colors: ['#11998e', '#38ef7d'],
    angle: 135,
    mood: ['natural', 'fresh', 'growth'],
    useCase: ['nature', 'wellness', 'eco'],
    popularity: 78,
  },

  // DEVON JATHO SIGNATURE
  {
    id: 'devon_multi_color',
    name: 'Purple-Cyan Dream',
    colors: ['#C084FC', '#818CF8', '#38BDF8', '#E879F9'],
    angle: 135,
    mood: ['vibrant', 'modern', 'viral'],
    useCase: ['devon_jatho', 'viral', 'entertainment'],
    popularity: 99,
  },

  {
    id: 'devon_neon_pack',
    name: 'Neon Glow Pack',
    colors: ['#00F5D4', '#67E8F9', '#A78BFA'],
    angle: 90,
    mood: ['electric', 'futuristic', 'neon'],
    useCase: ['neon', 'tech', 'viral'],
    popularity: 92,
  },

  {
    id: 'devon_gold_cinematic',
    name: 'Gold Cinematic',
    colors: ['#B45309', '#F59E0B', '#FDE68A', '#F59E0B'],
    angle: 135,
    mood: ['luxurious', 'cinematic', 'elegant'],
    useCase: ['cinematic', 'luxury', 'movie'],
    popularity: 91,
  },
];

export function getGradientCSS(gradientId: string): string {
  const preset = GRADIENT_LIBRARY.find(g => g.id === gradientId);
  if (!preset) return '';

  const angle = preset.angle || 135;
  const colorStops = preset.colors.join(', ');
  return `linear-gradient(${angle}deg, ${colorStops})`;
}

export function getGradientsByMood(mood: string): GradientPreset[] {
  return GRADIENT_LIBRARY.filter(g => g.mood.includes(mood));
}

export function getGradientsByUseCase(useCase: string): GradientPreset[] {
  return GRADIENT_LIBRARY.filter(g => g.useCase.includes(useCase));
}
```

---

## Phase 6: Icon System

### Step 8: Icon Registry

```typescript
// services/assetRegistry/iconRegistry.ts

export interface IconAsset {
  id: string;
  name: string;
  library: 'lucide' | 'feather' | 'tabler' | 'bootstrap';
  category: string;
  tags: string[];
  default_size: number;
}

export const ICON_LIBRARIES = {
  lucide: {
    url: 'https://cdn.jsdelivr.net/npm/lucide@latest',
    icons: 1600,
    free: true,
  },
  feather: {
    url: 'https://cdn.jsdelivr.net/npm/feather-icons',
    icons: 280,
    free: true,
  },
  tabler: {
    url: 'https://cdn.jsdelivr.net/npm/@tabler/icons',
    icons: 5900,
    free: true,
  },
  bootstrap: {
    url: 'https://cdn.jsdelivr.net/npm/bootstrap-icons',
    icons: 2000,
    free: true,
  },
};

export async function loadIcon(
  library: string,
  iconName: string,
  size: number = 24
): Promise<string> {
  try {
    const url = `https://cdn.jsdelivr.net/npm/${library}/icons/${iconName}.svg`;
    const response = await fetch(url);
    let svg = await response.text();
    
    // Inject size attributes
    svg = svg.replace(
      /<svg/,
      `<svg width="${size}" height="${size}"`
    );
    
    return svg;
  } catch (error) {
    console.error(`Failed to load icon: ${library}/${iconName}`, error);
    return '';
  }
}

export function getIconLibraryInfo(library: string) {
  return ICON_LIBRARIES[library as keyof typeof ICON_LIBRARIES];
}
```

---

## Phase 7: Audio Assets

### Step 9: Sound Effect & Music Registry

```typescript
// services/assetRegistry/audioRegistry.ts

export interface AudioAsset {
  id: string;
  name: string;
  type: 'music' | 'sfx' | 'beat';
  duration: number;
  bpm?: number;
  genre: string[];
  mood: string[];
  license: string;
  source: string;
  url?: string;
}

export const AUDIO_SOURCES = {
  epidemic_sound: {
    name: 'Epidemic Sound',
    apiUrl: 'https://api.epidemicsound.com/v1',
    musicCount: 55000,
    sfxCount: 250000,
    pricingTier: 'premium',
  },
  audiojungle: {
    name: 'AudioJungle',
    apiUrl: 'https://videohive.net/api',
    musicCount: 66900,
    sfxCount: 100000,
    pricingTier: 'mixed',
  },
  freesound: {
    name: 'Freesound',
    apiUrl: 'https://freesound.org/api',
    musicCount: 0,
    sfxCount: 500000,
    pricingTier: 'free',
  },
  pixabay: {
    name: 'Pixabay',
    apiUrl: 'https://pixabay.com/api',
    musicCount: 60000,
    sfxCount: 60000,
    pricingTier: 'free',
  },
};

export class AudioAssetManager {
  // Recommend music by mood/genre
  static getRecommendations(filters: {
    mood?: string;
    genre?: string;
    duration?: number;
  }): AudioAsset[] {
    // Implementation would query audio APIs
    return [];
  }

  // Check license compatibility
  static isLicenseCompatible(asset: AudioAsset, platform: 'youtube' | 'tiktok' | 'instagram'): boolean {
    const compatibleLicenses: Record<string, string[]> = {
      youtube: ['CC0', 'royalty-free', 'youtube-licensed'],
      tiktok: ['CC0', 'royalty-free', 'tiktok-library'],
      instagram: ['CC0', 'royalty-free', 'instagram-licensed'],
    };

    return compatibleLicenses[platform].includes(asset.license);
  }
}
```

---

## Phase 8: Full Integration Example

### Step 10: Complete Asset Panel Component

```typescript
// components/AssetLibraryPanel.tsx

import React, { useState, useEffect } from 'react';
import { globalFontRegistry } from '../services/assetRegistry';
import { GRADIENT_LIBRARY, getGradientCSS } from '../services/assetRegistry/gradientPresets';
import { useFontLoader } from '../hooks/useFontLoader';

interface AssetSelection {
  fontId: string;
  gradientId: string;
  fontSize: number;
}

export function AssetLibraryPanel() {
  const [selection, setSelection] = useState<AssetSelection>({
    fontId: 'inter',
    gradientId: 'sunset_vibes',
    fontSize: 48,
  });

  const [fonts, setFonts] = useState<FontMetadata[]>([]);
  const [filteredFonts, setFilteredFonts] = useState<FontMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { loading } = useFontLoader([selection.fontId]);

  useEffect(() => {
    // Load all fonts
    const allFonts = globalFontRegistry.getAllFonts();
    setFonts(allFonts);
    setFilteredFonts(allFonts);
  }, []);

  useEffect(() => {
    // Filter fonts by search and category
    let filtered = fonts;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(f =>
        f.name.toLowerCase().includes(lowerQuery) ||
        f.personality.some(p => p.toLowerCase().includes(lowerQuery))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(f => f.subCategory === selectedCategory);
    }

    setFilteredFonts(filtered);
  }, [searchQuery, selectedCategory, fonts]);

  const selectedFont = fonts.find(f => f.id === selection.fontId);
  const selectedGradient = GRADIENT_LIBRARY.find(g => g.id === selection.gradientId);

  const previewStyle = {
    fontFamily: selectedFont ? globalFontRegistry.generateFontStack(selectedFont.id) : 'sans-serif',
    fontSize: `${selection.fontSize}px`,
    background: selectedGradient ? getGradientCSS(selection.gradientId) : '#000',
    WebkitBackgroundClip: 'text' as any,
    WebkitTextFillColor: 'transparent' as any,
    color: 'transparent',
  };

  return (
    <div className="asset-library-panel">
      <h2>Asset Library</h2>

      {/* Preview */}
      <div className="preview-section">
        <div style={previewStyle} className="preview-text">
          Createrin Typography Reels
        </div>
      </div>

      {/* Font Selector */}
      <div className="section">
        <h3>Fonts</h3>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search fonts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-filter">
          {['all', 'bold', 'minimal', 'elegant', 'neon', 'playful'].map(cat => (
            <button
              key={cat}
              className={selectedCategory === cat ? 'active' : ''}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div className="font-grid">
          {filteredFonts.map(font => (
            <div
              key={font.id}
              className={`font-card ${selection.fontId === font.id ? 'selected' : ''}`}
              onClick={() => setSelection({ ...selection, fontId: font.id })}
            >
              <div
                className="font-preview"
                style={{ fontFamily: globalFontRegistry.generateFontStack(font.id) }}
              >
                {font.name}
              </div>
              <div className="font-info">
                <p className="font-name">{font.name}</p>
                <p className="font-personality">
                  {font.personality.slice(0, 2).join(', ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gradient Selector */}
      <div className="section">
        <h3>Gradients</h3>
        <div className="gradient-grid">
          {GRADIENT_LIBRARY.map(gradient => (
            <div
              key={gradient.id}
              className={`gradient-card ${selection.gradientId === gradient.id ? 'selected' : ''}`}
              onClick={() => setSelection({ ...selection, gradientId: gradient.id })}
            >
              <div
                className="gradient-preview"
                style={{ background: getGradientCSS(gradient.id) }}
              />
              <p className="gradient-name">{gradient.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Font Size Slider */}
      <div className="section">
        <h3>Font Size</h3>
        <input
          type="range"
          min="24"
          max="120"
          value={selection.fontSize}
          onChange={(e) => setSelection({ ...selection, fontSize: parseInt(e.target.value) })}
        />
        <span>{selection.fontSize}px</span>
      </div>

      {/* Export Settings */}
      <div className="section">
        <h3>Export Settings</h3>
        {selectedFont && (
          <div className="export-info">
            <p><strong>Font:</strong> {selectedFont.family}</p>
            <p><strong>Category:</strong> {selectedFont.category}</p>
            <p><strong>Provider:</strong> {selectedFont.provider}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Performance Monitoring

### Step 11: Font Loading Metrics

```typescript
// services/metrics/fontMetrics.ts

export class FontMetricsCollector {
  private metrics: Map<string, any> = new Map();

  recordFontLoad(fontId: string, loadTimeMs: number): void {
    this.metrics.set(`font_load_${fontId}`, {
      time: loadTimeMs,
      timestamp: Date.now(),
    });
  }

  recordCacheHit(source: 'browser' | 'indexeddb' | 'cdn'): void {
    const key = `cache_hit_${source}`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
  }

  getAverageLoadTime(): number {
    const loads = Array.from(this.metrics.entries())
      .filter(([key]) => key.startsWith('font_load_'))
      .map(([, value]) => value.time);

    return loads.length > 0
      ? loads.reduce((a, b) => a + b, 0) / loads.length
      : 0;
  }

  getCacheHitRate(): number {
    const hits = Array.from(this.metrics.entries())
      .filter(([key]) => key.startsWith('cache_hit_'))
      .reduce((sum, [, count]) => sum + count, 0);

    const total = this.metrics.size;
    return total > 0 ? (hits / total) * 100 : 0;
  }

  report(): void {
    console.log('📊 Font Loading Metrics:');
    console.log(`  Average Load Time: ${this.getAverageLoadTime().toFixed(2)}ms`);
    console.log(`  Cache Hit Rate: ${this.getCacheHitRate().toFixed(1)}%`);
  }
}

export const fontMetrics = new FontMetricsCollector();
```

---

## Testing

### Step 12: Asset Registry Tests

```typescript
// __tests__/AssetRegistry.test.ts

import { describe, it, expect } from 'vitest';
import { FontRegistry } from '../services/assetRegistry/FontRegistry';
import { TYPOGRAPHY_FONTS } from '../services/assetRegistry/fontMetadata';

describe('AssetRegistry', () => {
  let registry: FontRegistry;

  beforeEach(() => {
    registry = new FontRegistry();
    TYPOGRAPHY_FONTS.forEach(font => registry.register(font));
  });

  it('should register and retrieve fonts', () => {
    const font = registry.getMetadata('inter');
    expect(font).toBeDefined();
    expect(font?.name).toBe('Inter');
  });

  it('should find fonts by category', () => {
    const sansSerifFonts = registry.findBy({ category: 'sans-serif' });
    expect(sansSerifFonts.length).toBeGreaterThan(0);
    sansSerifFonts.forEach(f => {
      expect(f.category).toBe('sans-serif');
    });
  });

  it('should find fonts by personality', () => {
    const modernFonts = registry.findBy({ personality: 'modern' });
    expect(modernFonts.length).toBeGreaterThan(0);
  });

  it('should generate correct font stacks', () => {
    const stack = registry.generateFontStack('inter');
    expect(stack).toContain('Inter');
    expect(stack).toContain('sans-serif');
  });

  it('should find font pairings', () => {
    const pairings = registry.getPairings('inter');
    expect(pairings.length).toBeGreaterThan(0);
  });
});
```

---

## Deployment Checklist

- [ ] All Google Fonts links in `index.html` use `display=swap`
- [ ] Critical fonts preload on app init
- [ ] Secondary fonts defer with `media=print` hack
- [ ] CSS variables declared in `:root`
- [ ] Font fallback stacks include system fonts
- [ ] Font Manager singleton initialized
- [ ] IndexedDB cache schema created
- [ ] Asset Registry populated with metadata
- [ ] Performance metrics collection enabled
- [ ] Regional fonts load on demand
- [ ] Mobile responsive typography tested
- [ ] WCAG accessibility verified for all fonts
- [ ] Font file sizes optimized (< 50KB WOFF2 per font)
- [ ] Cache headers configured (1 year for Google Fonts)
- [ ] Production builds minified and optimized
