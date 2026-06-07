# Image Editor Setup Guide

## Overview
The typography reel now includes an intelligent image editor that:
1. Extracts keywords from audio transcripts
2. Searches Google Images for relevant visuals
3. Removes backgrounds automatically
4. Lets users drag, resize, and animate images on the canvas

## Configuration

### Enable Image Processing
Add to `.env.local`:
```
VITE_IMAGE_ASSET_ENABLED=true
```

### Backend Requirements

The image processing runs on the Express server (port 3001). It requires:

1. **Google Custom Search API**
   - Create project at https://console.cloud.google.com
   - Enable Custom Search API
   - Get API key and Search Engine ID
   - Add to `.env.local`:
     ```
     GOOGLE_SEARCH_API_KEY=your-api-key
     GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id
     ```

2. **Storage Directory**
   - Images are cached in `./public/assets/images`
   - Ensure directory exists and is writable
   - Size limit: 500MB (auto-cleanup when exceeded)

### Optional: Bing Images Fallback
If Google Images API quota is exceeded, Bing fallback can be enabled:
```
BING_SEARCH_API_KEY=your-bing-key
```

## Architecture

```
Frontend (React)
    ↓
POST /api/imageAssets/process
    ↓
Express Server (Node.js)
    ├→ Extract keywords (TF-IDF + Regex)
    ├→ Search images (Google Custom Search)
    ├→ Download & validate
    ├→ Remove backgrounds (ONNX rembg)
    ├→ Store & deduplicate
    └→ Map to words & return JSON
    ↓
Frontend (Canvas + Editor)
    ├→ Preview with overlays
    ├→ Drag-drop repositioning
    ├→ Properties editor (timing, opacity, blend mode)
    └→ Export MP4 with images baked in
```

## Features

### Canvas Interactions
- **Click image** to select
- **Drag** to reposition
- **Arrow keys** to nudge (Shift for 1px fine-tune)
- **Delete** to remove

### Image Properties (Right Panel)
- **Timing**: Start/end time in seconds
- **Opacity**: 0-100%
- **Rotation**: 0-360°
- **Blend Mode**: normal, multiply, screen, overlay, etc.
- **Size**: Width & height in pixels
- **Position**: X, Y coordinates

### Visual Feedback
- Selection box with dashed border
- Resize handles on corners/edges
- Animated status indicator
- Cursor feedback (pointer → grabbing)
- Helpful tooltips and keyboard shortcuts

## Troubleshooting

### Images not appearing?
1. Open browser DevTools (F12)
2. Check Console for errors
3. Look for `[reel]` log messages
4. Verify `/api/imageAssets/process` was called

### Check if image processing is enabled:
Look in the Pipeline section on the left—image extraction should show 🖼️ if enabled.

### Common issues:
- **"API Error"** → Google Custom Search API key invalid or quota exceeded
- **"No images found"** → Keywords may not match typical images (too specific/obscure)
- **"Background removal failed"** → Image too small or too different from training data
- **"Storage full"** → Clear old assets with `POST /api/imageAssets/clear`

## Advanced Configuration

### Image Size Preferences
Edit in `.env.local`:
```
DEFAULT_IMAGE_SIZE=medium  # small, medium, large
```

### Background Removal Model
```
BACKGROUND_REMOVAL_MODEL=u2net  # or u2netp for faster processing
```

### Quality Thresholds
```
MIN_IMAGE_QUALITY=5  # Skip blurry/low-res images (0-10 scale)
MAX_PARALLEL_DOWNLOADS=5
DOWNLOAD_TIMEOUT_MS=30000
```

## Performance Notes

- **Keyword extraction**: ~500ms (TF-IDF analysis)
- **Google Images search**: ~2-3 seconds per keyword (1-5 images)
- **Background removal**: ~1-2 seconds per image (GPU-accelerated with ONNX)
- **Total for 3 keywords**: ~10-15 seconds

Images are cached, so regenerating with same transcript is ~2x faster.

## Graceful Degradation

If image processing fails at any step:
- Reel still renders perfectly with just text animations
- Users can manually add images later (Phase 2 feature)
- No red error screens—seamless fallback

## Next Phase (Future)

- [ ] Per-image animation timing (zoom, pan, scale)
- [ ] Layer reordering (z-index controls)
- [ ] Image duplication/copy
- [ ] Undo/redo history
- [ ] Manual image upload (instead of search)
- [ ] Smart background replacement
