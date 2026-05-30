# Professional Color & Text System — Usage Examples

## Example 1: Automatic Palette Selection for Content

Automatically choose the right palette based on video content type:

```typescript
import { 
  selectPaletteForContent, 
  getProfessionalPalette,
  validatePaletteContrast 
} from './motion/professionalPalettes';

// Example 1a: Music video
const musicPalette = getProfessionalPalette(
  selectPaletteForContent('music-video')
);
console.log(musicPalette.description);
// Output: "Bold, energetic, creator-focused"

// Example 1b: Corporate presentation
const corpPalette = getProfessionalPalette(
  selectPaletteForContent('corporate-video')
);
console.log(corpPalette.description);
// Output: "Cool, professional, minimalist"

// Example 1c: Validate palette meets standards
const validation = validatePaletteContrast(musicPalette);
if (validation.isValid) {
  console.log('Palette meets WCAG AAA standards!');
  console.log(`Primary text contrast: ${musicPalette.primaryContrast}:1`);
}
```

## Example 2: Responsive Typography for Different Aspect Ratios

Scale text sizes based on video format (portrait, landscape, square):

```typescript
import { getTierSize, SIZING_STANDARDS } from './motion/sizingStandards';

// Example 2a: 9:16 Portrait (TikTok / Reels)
const portraitRatio = 9 / 16;
const titleSize9_16 = getTierSize('title', portraitRatio);
const bodySize9_16 = getTierSize('body', portraitRatio);

console.log(`Portrait title: ${titleSize9_16}px`);  // ~64px
console.log(`Portrait body: ${bodySize9_16}px`);    // ~24px

// Example 2b: 16:9 Landscape (YouTube)
const landscapeRatio = 16 / 9;
const titleSize16_9 = getTierSize('title', landscapeRatio);
const bodySize16_9 = getTierSize('body', landscapeRatio);

console.log(`Landscape title: ${titleSize16_9}px`); // ~80px
console.log(`Landscape body: ${bodySize16_9}px`);   // ~28px

// Example 2c: 1:1 Square (Instagram Feed)
const squareRatio = 1 / 1;
const titleSize1_1 = getTierSize('title', squareRatio);

console.log(`Square title: ${titleSize1_1}px`);     // ~70px
```

## Example 3: Premium Text Style Application

Apply professional text styles with drop shadows and glows:

```typescript
import { 
  PREMIUM_TEXT_STYLES, 
  drawPremiumText,
  scaleTextStyle 
} from './motion/premiumTextStyle';
import { getProfessionalPalette } from './motion/professionalPalettes';

const ctx = canvas.getContext('2d');
const palette = getProfessionalPalette('vibrant-creator');

// Example 3a: Draw title with bold style
const titleStyle = PREMIUM_TEXT_STYLES['title-bold'](
  palette.primary,              // white
  'rgba(0, 0, 0, 0.3)',        // subtle shadow
  palette.accent                // cyan glow
);

drawPremiumText(ctx, 'Beautiful Typography', 100, 100, titleStyle);

// Example 3b: Draw subtitle with elegant serif
const subtitleStyle = PREMIUM_TEXT_STYLES['title-elegant'](
  palette.primary,
  'rgba(0, 0, 0, 0.2)',
  palette.accent
);

drawPremiumText(ctx, 'A Premium Experience', 100, 200, subtitleStyle);

// Example 3c: Scale a style for different size
const scaledStyle = scaleTextStyle(titleStyle, 48);  // Smaller version
drawPremiumText(ctx, 'Scaled Title', 100, 300, scaledStyle);

// Example 3d: Body text with minimal shadow
const bodyStyle = PREMIUM_TEXT_STYLES['body'](
  palette.primary,
  'rgba(0, 0, 0, 0.1)'  // very subtle shadow
);

drawPremiumText(
  ctx, 
  'This is the main content text that should be readable and elegant.',
  100,
  400,
  bodyStyle
);
```

## Example 4: Full Text Validation Pipeline

Check text rendering for WCAG AAA compliance and readability:

```typescript
import { 
  validateTextRendering,
  getContrastRatio,
  getWCAGLevel,
  validatePaletteForText,
  getReadabilityScore
} from './motion/textValidation';

// Example 4a: Basic text validation
const validation = validateTextRendering(
  '#FFFFFF',          // white text
  '#0A0E27',          // dark background
  24,                 // font size
  style               // optional style object
);

console.log(`Valid: ${validation.isValid}`);
console.log(`Score: ${validation.score}/100`);
console.log(`Issues: ${validation.issues.length}`);

// Example 4b: Contrast ratio calculation
const ratio = getContrastRatio('#FFFFFF', '#0A0E27');
const level = getWCAGLevel(ratio);

console.log(`Contrast: ${ratio.toFixed(2)}:1`);
console.log(`WCAG Level: ${level}`);  // 'AAA', 'AA', or 'FAIL'

// Example 4c: Validate entire palette
const paletteValidation = validatePaletteForText(palette, 24);

console.log(`Primary contrast: ${paletteValidation.primary.score}`);
console.log(`Secondary contrast: ${paletteValidation.secondary.score}`);
console.log(`Accent contrast: ${paletteValidation.accent.score}`);
console.log(`Overall score: ${paletteValidation.score.toFixed(0)}/100`);

if (!paletteValidation.allValid) {
  paletteValidation.primary.issues.forEach(issue => {
    console.warn(`Issue: ${issue.message}`);
  });
}

// Example 4d: Readability score
const readability = getReadabilityScore(style, palette.bg);
console.log(`Readability: ${readability.toFixed(0)}/100`);
```

## Example 5: Professional Rendering Pipeline

Complete quality assurance for production rendering:

```typescript
import { 
  runRenderingPipeline,
  filterTemplatesByQuality,
  getRecommendedTemplates,
  getRecommendedTextStyle,
  generateQualityReport 
} from './motion/renderingPipeline';

// Example 5a: Run full pipeline
const pipeline = runRenderingPipeline({
  contentType: 'music-video',
  aspectRatio: 9 / 16,        // portrait
  minQualityScore: 8,         // only high-quality templates
  enforceContrast: true,      // WCAG AAA required
  fontSize: 24
});

console.log(`Valid: ${pipeline.isValid}`);
console.log(`Score: ${pipeline.score}/100`);
console.log(`Palette: ${pipeline.palette}`);

// Example 5b: Check for issues
if (!pipeline.isValid) {
  pipeline.issues.forEach(issue => {
    console.error(`[${issue.severity}] ${issue.message}`);
  });
}

// Example 5c: Get templates suitable for this content
const templates = getRecommendedTemplates('music-video', 8);
console.log(`Available templates: ${templates.join(', ')}`);

// Example 5d: Get recommended text style
const textStyle = getRecommendedTextStyle(pipeline.paletteData, 'title');
console.log(`Recommended font size: ${textStyle.fontSize}px`);
console.log(`Recommended weight: ${textStyle.fontWeight}`);

// Example 5e: Generate detailed report
const report = generateQualityReport(pipeline);
console.log(report);
```

## Example 6: Handling Different Content Types

Content-specific palette and template selection:

```typescript
import { 
  selectPaletteForContent, 
  getProfessionalPalette 
} from './motion/professionalPalettes';
import { 
  getRecommendedTemplates,
  runRenderingPipeline 
} from './motion/renderingPipeline';

// Example 6a: Product Demo (Tech)
const productDemo = runRenderingPipeline({
  contentType: 'product-demo',
  aspectRatio: 16 / 9,
  minQualityScore: 8,
  enforceContrast: true
});
console.log(`Product demo palette: ${productDemo.palette}`);
// Output: "modern-minimalist"

// Example 6b: Gaming Highlight (Creator)
const gaming = runRenderingPipeline({
  contentType: 'gaming-highlight',
  aspectRatio: 9 / 16,
  minQualityScore: 8
});
console.log(`Gaming palette: ${gaming.palette}`);
// Output: "vibrant-creator"

// Example 6c: Documentary (Cinematic)
const documentary = runRenderingPipeline({
  contentType: 'documentary',
  aspectRatio: 16 / 9,
  minQualityScore: 8
});
console.log(`Documentary palette: ${documentary.palette}`);
// Output: "cinema-teal-orange"

// Example 6d: Luxury Brand
const luxury = runRenderingPipeline({
  contentType: 'luxury-brand',
  aspectRatio: 1 / 1,
  minQualityScore: 8,
  enforceContrast: true
});
console.log(`Luxury palette: ${luxury.palette}`);
// Output: "gold-navy-premium"

// Example 6e: Sustainable Product (Green/Growth)
const sustainable = runRenderingPipeline({
  contentType: 'sustainability',
  aspectRatio: 16 / 9,
  minQualityScore: 8
});
console.log(`Sustainable palette: ${sustainable.palette}`);
// Output: "deep-navy-emerald"
```

## Example 7: Canvas Text Rendering Integration

Real-world canvas drawing with professional styles:

```typescript
import { 
  PREMIUM_TEXT_STYLES, 
  drawPremiumText, 
  applyPremiumTextStyle 
} from './motion/premiumTextStyle';
import { 
  getProfessionalPalette 
} from './motion/professionalPalettes';
import { getTierSize } from './motion/sizingStandards';

function renderMotionGraphic(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  contentType: string
) {
  const aspectRatio = width / height;
  const palette = getProfessionalPalette(
    selectPaletteForContent(contentType)
  );

  // Fill background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  // Title
  const titleSize = getTierSize('title', aspectRatio);
  const titleStyle = PREMIUM_TEXT_STYLES['title-bold'](
    palette.primary,
    'rgba(0, 0, 0, 0.2)',
    palette.accent
  );
  drawPremiumText(ctx, 'Main Title', width / 2, height * 0.3, titleStyle);

  // Subtitle
  const subtitleSize = getTierSize('subtitle', aspectRatio);
  const subtitleStyle = PREMIUM_TEXT_STYLES['subtitle'](
    palette.secondary,
    'rgba(0, 0, 0, 0.15)'
  );
  drawPremiumText(ctx, 'Supporting text', width / 2, height * 0.5, subtitleStyle);

  // CTA button
  const buttonSize = getTierSize('body', aspectRatio);
  const buttonStyle = PREMIUM_TEXT_STYLES['button'](
    palette.bg,          // inverted colors
    palette.primary,
  );
  
  // Draw button background
  const buttonX = width / 2 - 100;
  const buttonY = height * 0.7;
  ctx.fillStyle = palette.primary;
  ctx.fillRect(buttonX, buttonY, 200, 50);

  // Draw button text
  ctx.save();
  applyPremiumTextStyle(ctx, buttonStyle);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Learn More', width / 2, buttonY + 25);
  ctx.restore();
}

// Usage
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
renderMotionGraphic(ctx, 1920, 1080, 'product-demo');
```

## Example 8: Error Handling and Fallbacks

Graceful handling of validation failures:

```typescript
import { 
  runRenderingPipeline,
  generateQualityReport 
} from './motion/renderingPipeline';

function safeRenderingPipeline(contentType: string) {
  try {
    const pipeline = runRenderingPipeline({
      contentType,
      aspectRatio: 16 / 9,
      minQualityScore: 8,
      enforceContrast: true
    });

    if (!pipeline.isValid) {
      // Handle validation failures
      console.warn('Pipeline validation failed:');
      pipeline.issues.forEach(issue => {
        console.warn(`[${issue.severity}] ${issue.message}`);
      });

      // Log for debugging
      console.log(generateQualityReport(pipeline));

      // Return fallback
      return {
        palette: 'modern-minimalist',  // safe default
        quality: pipeline.score
      };
    }

    // Use validated pipeline
    return {
      palette: pipeline.palette,
      quality: pipeline.score
    };
  } catch (error) {
    console.error('Pipeline error:', error);
    return {
      palette: 'modern-minimalist',
      quality: 0
    };
  }
}

const result = safeRenderingPipeline('unknown-content-type');
console.log(`Using palette: ${result.palette} (quality: ${result.quality})`);
```

## Example 9: Dynamic Size Calculation for Responsive Content

Calculate sizes based on actual canvas dimensions:

```typescript
import { getResponsiveSize, getTierSize } from './motion/sizingStandards';

function calculateTextSizes(
  canvasWidth: number,
  canvasHeight: number
) {
  const aspectRatio = canvasWidth / canvasHeight;

  // Option A: Using tier names
  const titleSize = getTierSize('title', aspectRatio);
  const bodySize = getTierSize('body', aspectRatio);

  // Option B: Direct calculation with custom constraints
  const largeDisplaySize = getResponsiveSize(
    aspectRatio,
    100,    // base size
    80,     // minimum
    140     // maximum
  );

  return {
    title: titleSize,
    body: bodySize,
    display: largeDisplaySize
  };
}

// Mobile portrait
console.log(calculateTextSizes(1080, 1920));
// { title: 64, body: 24, display: 100 }

// Desktop landscape
console.log(calculateTextSizes(1920, 1080));
// { title: 80, body: 28, display: 140 }

// Square
console.log(calculateTextSizes(1080, 1080));
// { title: 72, body: 26, display: 120 }
```

## Example 10: Complete Motion Graphics Workflow

End-to-end example with palette, size, and text validation:

```typescript
import { 
  selectPaletteForContent,
  getProfessionalPalette,
  validatePaletteContrast 
} from './motion/professionalPalettes';
import { 
  getTierSize,
  getLineHeightMultiplier,
  getLetterSpacing 
} from './motion/sizingStandards';
import { 
  PREMIUM_TEXT_STYLES,
  drawPremiumText 
} from './motion/premiumTextStyle';
import { 
  validateTextRendering,
  getReadabilityScore 
} from './motion/textValidation';
import { 
  runRenderingPipeline,
  generateQualityReport 
} from './motion/renderingPipeline';

class ProfessionalMotionGraphic {
  private palette;
  private pipeline;
  private contentType: string;

  constructor(contentType: string, aspectRatio: number) {
    this.contentType = contentType;

    // Step 1: Run pipeline validation
    this.pipeline = runRenderingPipeline({
      contentType,
      aspectRatio,
      minQualityScore: 8,
      enforceContrast: true
    });

    if (!this.pipeline.isValid) {
      console.warn('Pipeline validation failed:');
      console.log(generateQualityReport(this.pipeline));
    }

    this.palette = this.pipeline.paletteData;
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const aspectRatio = width / height;

    // Background
    ctx.fillStyle = this.palette.bg;
    ctx.fillRect(0, 0, width, height);

    // Title
    const titleSize = getTierSize('title', aspectRatio);
    const titleStyle = PREMIUM_TEXT_STYLES['title-bold'](
      this.palette.primary,
      'rgba(0, 0, 0, 0.2)',
      this.palette.accent
    );

    // Validate before rendering
    const titleValidation = validateTextRendering(
      this.palette.primary,
      this.palette.bg,
      titleSize,
      titleStyle
    );

    if (!titleValidation.isValid) {
      console.warn('Title rendering not optimal:', titleValidation.issues);
    } else {
      console.log(`Title readability: ${titleValidation.score}/100`);
    }

    drawPremiumText(
      ctx,
      'Professional Motion Graphics',
      width / 2,
      height * 0.3,
      titleStyle
    );

    // Body
    const bodySize = getTierSize('body', aspectRatio);
    const bodyStyle = PREMIUM_TEXT_STYLES['body'](
      this.palette.primary,
      'rgba(0, 0, 0, 0.15)'
    );

    drawPremiumText(
      ctx,
      'Created with professional color and text standards',
      width / 2,
      height * 0.6,
      bodyStyle
    );

    // Debug info (optional)
    console.log(`Content Type: ${this.contentType}`);
    console.log(`Palette: ${this.pipeline.palette}`);
    console.log(`Quality Score: ${this.pipeline.score}/100`);
    console.log(`Contrast (primary): ${this.palette.primaryContrast}:1`);
  }
}

// Usage
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

const graphic = new ProfessionalMotionGraphic('music-video', 9 / 16);
graphic.render(ctx, 1080, 1920);
```

All examples demonstrate the professional system's flexibility and robustness for production motion graphics.
