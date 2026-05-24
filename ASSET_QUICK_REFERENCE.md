# Asset Collection Quick Reference Guide

Rapid lookup tables and checklists for typography reel asset management.

---

## Font Selection Matrix

### By Use Case

| Use Case | Primary Font | Secondary Font | Accent Font |
|----------|-------------|-----------------|-------------|
| **Viral Reels** | Montserrat / Space Grotesk | Anton / Bebas Neue | Anton |
| **Fitness/Motivation** | Anton / Poppins | Inter / Roboto | Bebas Neue |
| **Luxury/Fashion** | Playfair Display | Lato | Cinzel |
| **Tech/SaaS** | Inter / Space Grotesk | Roboto Mono | Orbitron |
| **Educational** | Inter / Poppins | Open Sans | Inter Bold |
| **Entertainment** | Luckiest Guy / Fredoka | Poppins | Bungee |
| **Cinematic** | Cinzel / Playfair | Inter | Anton |
| **Minimal** | Inter | Lato / Roboto | Inter Bold |
| **Neon/Cyber** | Orbitron / Space Grotesk | Courier New | Orbitron Bold |

### By Device Preference

| Device | Optimal Fonts | Reasoning |
|--------|--------------|-----------|
| **Mobile (< 480px)** | Poppins, Montserrat, Anton | Bold, chunky letterforms read well small |
| **Tablet (480-768px)** | Inter, Playfair Display, Space Grotesk | Balance of readability + elegance |
| **Desktop (> 768px)** | Cinzel, Playfair Display, Orbitron | Thinner strokes acceptable at scale |

---

## Gradient Quick Pick

### By Mood

```
ENERGETIC → Sunset Vibes, Fire Storm, Electric Blue
CALM → Ocean Wave, Aurora, Cotton Candy
LUXURY → Royal Purple, Golden Hour, Emerald
NEON → Neon Night, Electric Blue, Devon Neon Pack
WARM → Golden Hour, Sunset Vibes, Candy Pop
COOL → Ocean Wave, Aurora, Neon Night
PROFESSIONAL → Electric Blue, Aurora, Royal Purple
PLAYFUL → Candy Pop, Cotton Candy, Cherry Blossom
```

### By Color Preference

```
BLUE PALETTE → Ocean Wave, Aurora, Electric Blue, Neon Night
RED/ORANGE → Sunset Vibes, Fire Storm, Golden Hour, Candy Pop
PURPLE → Royal Purple, Neon Night, Cotton Candy
GREEN → Emerald, Candy Pop, Aurora
MULTI-COLOR → Devon Multi-Color, Devon Gold Cinematic, Devon Neon Pack
GOLD → Golden Hour, Devon Gold Cinematic
PINK → Candy Pop, Cherry Blossom, Cotton Candy
```

---

## Pairing Presets

### Recommended Font Combinations

```
CLASSIC EDITORIAL
├─ Headline: Playfair Display Bold
├─ Subhead: Lato Regular
└─ Body: Inter Regular

MODERN TECH
├─ Headline: Space Grotesk Bold
├─ Subhead: Inter Medium
└─ Body: Roboto Regular

VIRAL MOMENTUM
├─ Headline: Anton Regular
├─ Accent: Montserrat Bold
└─ Body: Poppins Regular

LUXURY CINEMATIC
├─ Headline: Cinzel Bold
├─ Accent: Playfair Display
└─ Body: Inter Regular

PLAYFUL ENERGY
├─ Headline: Luckiest Guy Regular
├─ Accent: Fredoka Bold
└─ Body: Poppins Regular

NEON FUTURISTIC
├─ Headline: Orbitron Bold
├─ Accent: Space Grotesk Bold
└─ Code: Courier New Regular

MINIMAL CLEAN
├─ Headline: Inter Bold
├─ Accent: Inter Semibold
└─ Body: Inter Regular
```

---

## Font Metrics Quick Reference

### Default Settings by Font

| Font | Recommended Size | Line Height | Letter Spacing | Weight |
|------|-----------------|-------------|-----------------|--------|
| Anton | 48-72px | 1.1 | 0 | 400 |
| Bebas Neue | 48-80px | 1.0 | +2px | 400 |
| Cinzel | 52-68px | 1.5 | +4px | 700 |
| Inter | 28-56px | 1.5 | 0 | 600 |
| Lato | 28-48px | 1.6 | 0 | 400 |
| Montserrat | 32-64px | 1.3 | 0 | 700 |
| Orbitron | 40-60px | 1.5 | +2px | 700 |
| Poppins | 28-56px | 1.5 | 0 | 600 |
| Playfair Display | 40-72px | 1.2 | -1px | 700 |
| Space Grotesk | 36-64px | 1.2 | +0.5px | 700 |

### Mobile Adjustments

**Reduce font size by 20-30% on mobile:**
```
Desktop 48px → Mobile 32px
Desktop 64px → Mobile 45px
Desktop 72px → Mobile 50px
```

---

## Icon Library Comparison

| Library | Best For | Icons | Free | SVG | Customization |
|---------|----------|-------|------|-----|---------------|
| **Lucide** | Modern, clean design | 1,600+ | Yes | Yes | Excellent |
| **Feather** | Minimalist UI | 280 | Yes | Yes | Good |
| **Tabler** | Variety, consistency | 5,900+ | Yes | Yes | Excellent |
| **Bootstrap** | Web frameworks | 2,000+ | Yes | SVG/Font | Good |
| **Phosphor** | Multiple weights | 7,000+ | Yes | Yes | Excellent |

**Quick Pick:**
- **Startup/Minimal**: Feather Icons
- **Maximum Variety**: Tabler Icons
- **Modern Design**: Lucide Icons
- **Professional**: Bootstrap Icons

---

## Audio Asset Sources

### Music for Reels (Top Picks)

| Platform | Best For | Cost | Library |
|----------|----------|------|---------|
| **Epidemic Sound** | Professional quality | $10-14/mo | 55,000+ tracks |
| **AudioJungle** | One-off purchases | $1-50 | 66,900+ tracks |
| **YouTube Audio Library** | YouTube creators | Free (YouTube only) | 10,000+ tracks |
| **Artlist** | Filmmakers | $4.99/mo | 150,000+ tracks |

### Sound Effects (Top Picks)

| Platform | Best For | Cost | Library |
|----------|----------|------|---------|
| **Epidemic Sound** | Professional SFX | $10-14/mo | 250,000+ effects |
| **Freesound** | Budget projects | Free/Pro | 500,000+ sounds |
| **Pixabay Sounds** | Quick finds | Free | 60,000+ effects |
| **Zapsplat** | Commercial use | Free | 100,000+ effects |

---

## Styling Quick Commands

### CSS Font Stack Generator

```css
/* Use this template */
--font-[name]: '[Font Name]', [category-fallback], sans-serif;

/* Examples */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-serif: 'Playfair Display', 'Cinzel', Georgia, serif;
--font-display: 'Anton', 'Bebas Neue', sans-serif;
--font-mono: 'Courier New', monospace;
```

### Common CSS Classes

```css
/* Viral/Bold */
.text-viral { font-family: var(--font-display); font-weight: 700; }

/* Minimal/Clean */
.text-minimal { font-family: var(--font-primary); font-weight: 400; }

/* Elegant/Serif */
.text-elegant { font-family: var(--font-serif); font-weight: 700; }

/* Neon/Tech */
.text-neon { font-family: var(--font-display); letter-spacing: 2px; }

/* Readable Body */
.text-body { font-family: var(--font-primary); line-height: 1.6; }
```

---

## Regional Language Font Coverage

| Language | Font | Coverage | Notes |
|----------|------|----------|-------|
| **Hindi** | Noto Sans Devanagari | 100% | Use weights 400, 700 |
| **Tamil** | Noto Sans Tamil | 100% | Excellent for Tamil Nadu market |
| **Telugu** | Noto Sans Telugu | 100% | Covers Telugu script fully |
| **Bengali** | Noto Sans Bengali | 100% | Bengali India content |
| **Gujarati** | Noto Sans Gujarati | 100% | Gujarat/Rajasthan market |
| **Marathi** | Noto Sans Devanagari | 100% | Uses Devanagari script |

---

## Performance Optimization Checklist

### Font Loading

- [ ] Use `font-display: swap` in all @font-face declarations
- [ ] Preload only critical fonts (max 3)
- [ ] Defer secondary fonts with `media=print` + `onload`
- [ ] Load regional fonts only when needed
- [ ] Use WOFF2 as primary format
- [ ] Implement IndexedDB caching for fonts
- [ ] Target max 100KB WOFF2 per font

### Rendering

- [ ] Apply `-webkit-font-smoothing: antialiased`
- [ ] Set `font-feature-settings: 'kern' 1`
- [ ] Use CSS containment: `contain: layout`
- [ ] Avoid rapid font-family changes in animations
- [ ] Use system fonts as ultimate fallback
- [ ] Test on 3G connection speed

### Delivery

- [ ] Configure HTTP caching headers (1 year)
- [ ] Enable Brotli compression on server
- [ ] Use CDN for Google Fonts (already done)
- [ ] Lazy-load non-critical assets
- [ ] Monitor Core Web Vitals
- [ ] Target LCP < 2.5s with fonts loaded

---

## Browser Support Reference

| Feature | Support | Fallback |
|---------|---------|----------|
| **WOFF2** | 95%+ modern browsers | Use WOFF + TTF |
| **Variable Fonts** | 92%+ (Safari 13+, Firefox 62+) | Use static weights |
| **Font Loading API** | 92%+ | Use CSS-only loading |
| **Font Palette** | 80%+ (Chrome 101+) | Graceful degradation |
| **`font-display`** | 97%+ | All modern browsers |

---

## Monitoring & Metrics

### Key Metrics to Track

```
Font Loading Performance:
├─ TTFB (Time to First Byte): < 500ms
├─ FCP (First Contentful Paint): < 1.5s
├─ LCP (Largest Contentful Paint): < 2.5s
├─ Average Font Load Time: < 1s
└─ Cache Hit Rate: > 85%

User Experience:
├─ Layout Shift (CLS): < 0.1
├─ Time to Interactive: < 3s
├─ Perceived Performance: Subjective
└─ Font Availability: 100%
```

### Monitoring Setup

```javascript
// Log font loading metrics
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('fonts'))
  .forEach(r => {
    console.log(`${r.name}: ${r.duration.toFixed(0)}ms`);
  });

// Check font readiness
const ready = document.fonts.ready;
ready.then(() => console.log('All fonts loaded'));
```

---

## Quick Start Commands

### Initialize Font System

```bash
# 1. Copy asset files to project
cp ASSET_COLLECTION_STRATEGY.md <project>/
cp ASSET_IMPLEMENTATION_GUIDE.md <project>/

# 2. Add font dependencies (already in package.json)
npm install

# 3. Initialize registry
import { globalFontRegistry } from './services/assetRegistry';

# 4. Preload critical fonts
import { fontManager } from './services/assetRegistry/FontManager';
await fontManager.preloadCriticalFonts();

# 5. Start using fonts in components
import { useFontLoader } from './hooks/useFontLoader';
const { loading } = useFontLoader(['inter', 'playfair_display']);
```

### Add New Font to Registry

```typescript
// 1. Add to fontMetadata.ts
TYPOGRAPHY_FONTS.push({
  id: 'new_font_id',
  name: 'New Font Name',
  family: 'New Font Family',
  // ... rest of metadata
});

// 2. Add to HTML index.html
<link href="https://fonts.googleapis.com/css2?family=New+Font+Family:wght@400;700&display=swap" rel="stylesheet">

// 3. Add CSS variable to index.css
--font-new: 'New Font Family', sans-serif;

// 4. Use in component
const fontStack = globalFontRegistry.generateFontStack('new_font_id');
```

### Add New Gradient

```typescript
// 1. Add to gradientPresets.ts
GRADIENT_LIBRARY.push({
  id: 'gradient_id',
  name: 'Gradient Name',
  colors: ['#COLOR1', '#COLOR2'],
  // ... rest of properties
});

// 2. Use in component
import { getGradientCSS } from './services/assetRegistry/gradientPresets';
const css = getGradientCSS('gradient_id');
```

---

## Troubleshooting

### Fonts Not Loading

```
✓ Check CORS headers: Cross-Origin-Resource-Policy
✓ Verify fonts.googleapis.com is accessible
✓ Check browser console for font load errors
✓ Test with throttled network (Chrome DevTools)
✓ Verify @font-face declarations in CSS
✓ Check font-display values
```

### Slow Font Loading

```
✓ Reduce font file sizes (use WOFF2)
✓ Enable browser caching (1 year)
✓ Use preload/prefetch wisely (limit to 1-2)
✓ Defer secondary fonts with media=print
✓ Implement IndexedDB caching
✓ Use variable fonts where possible
✓ Check network throttling in DevTools
```

### Font Not Applying

```
✓ Check font-family CSS property spelling
✓ Verify @font-face font-family matches CSS font-family
✓ Clear browser cache (Cmd+Shift+R)
✓ Check CSS specificity
✓ Verify font weights are available
✓ Check for font-feature-settings conflicts
```

### Regional Fonts Not Working

```
✓ Verify Noto Sans language variant is loaded
✓ Check lang attribute on HTML element
✓ Test with sample text in target script
✓ Verify font covers all characters needed
✓ Check z-index and display issues
```

---

## External Resources

### Official Documentation
- [Google Fonts API](https://fonts.google.com)
- [MDN Web Font Loading](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face)
- [Variable Fonts](https://variablefonts.io)
- [Font Loading API](https://drafts.csswg.org/css-font-loading)

### Performance Tools
- [Google PageSpeed Insights](https://pagespeed.web.dev)
- [WebPageTest Font Analysis](https://www.webpagetest.org)
- [Chrome DevTools Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Font File Analyzer](https://wakamaifondue.com)

### Asset Libraries
- [Google Fonts](https://fonts.google.com) — 1,000+ free fonts
- [Lucide Icons](https://lucide.dev) — 1,600+ modern icons
- [Epidemic Sound](https://epidemicsound.com) — 55,000+ music tracks
- [AudioJungle](https://audiojungle.net) — 66,900+ music packs

### Learning Resources
- [Figma Font Pairings Guide](https://www.figma.com/resource-library/font-pairings)
- [Typewolf Google Fonts Analysis](https://www.typewolf.com/google-fonts)
- [Creative Bloq Font Pairing](https://www.creativebloq.com/typography/font-pairings)
- [FontFont Design Guide](https://www.fontfont.com)

---

## Support & Contribution

### Reporting Issues
Report font issues to `vinodkondeti081@gmail.com` with:
1. Font ID and name
2. Device/browser info
3. Screenshot of issue
4. Console errors

### Contributing New Fonts
To add fonts to the registry:
1. Research popularity (> 80% modern browser support)
2. Test loading performance
3. Add metadata to `fontMetadata.ts`
4. Include pairing recommendations
5. Submit pull request

### Feedback
Share suggestions for:
- New font additions
- Pairing improvements
- Performance optimization
- Regional language support
