# CreatorIn v1 - Remaining Phases Implementation Plan

## Overview
This document outlines the implementation plan for the remaining phases of the CreatorIn v1 application:
- Phase 5: Sticker & Emoji Overlay System Enhancement
- Phase 6: Caption Templates Gallery with live preview thumbnails
- Phase 7: Text Effects Panel (Glow, shadow, outline, gradient, 3D depth)
- Phase 8: Auto-Caption Split/Merge in transcript editor
- Phase 11: Caption Timing Fine-Tune (drag handles on timeline)
- Phase 12: Aspect Ratio Presets (9:16, 16:9, 1:1, 4:5)
- Phase 13: Batch Caption Style Apply
- Phase 14: Caption Search & Replace
- Phase 15: Keyboard Shortcut Panel

## Phase 5: Enhance Sticker & Emoji Overlay System

### Current State
The StickerPanel component already exists with basic emoji functionality. It allows adding emojis with position, scale, rotation, duration, and animation controls.

### Enhancements Needed
1. **Add image sticker support** (upload, position, scale, rotation)
2. **Add sticker animation controls** (bounce, spin, pulse, shake) - already partially implemented
3. **Improve sticker duration editing UI**
4. **Add sticker layering/order controls**

### Implementation Approach
- Extend StickerItem interface to support image URLs
- Add image upload functionality to StickerPanel
- Enhance duration editing with better UI
- Add z-index or ordering controls for stickers

## Phase 6: Caption Templates Gallery with live preview thumbnails

### Current State
Styles are defined in constants.ts and accessed via STYLES_CONFIG. StyleCustomizer shows presets but without live preview.

### Features Needed
1. **Create template gallery component** with thumbnail previews
2. **Add live preview** of selected template on sample text
3. **Implement template categorization** (Trending, Bold, Neon, etc.)
4. **Add template search/filter functionality**
5. **Enable one-click template application**

### Implementation Approach
- Create new TemplateGallery component
- Generate thumbnail previews using canvas or SVG
- Integrate with StyleCustomizer PRESETS tab
- Add search/filter controls
- Connect to existing style selection mechanism

## Phase 7: Implement Text Effects Panel

### Current State
StyleCustomizer has basic controls for font, color, stroke, background, position.

### Features Needed
1. **Add controls for glow intensity and color**
2. **Add shadow offset, blur, and color controls**
3. **Add outline width and color controls**
4. **Add gradient color stops and direction controls**
5. **Add 3D depth controls** (extrusion, bevel, lighting)
6. **Integrate with StyleCustomizer DESIGN tab**

### Implementation Approach
- Add new sections to StyleCustomizer for each effect type
- Update activeConfig calculation in App.tsx to include effect properties
- Modify captionRenderer.ts to render the new effects
- Ensure backward compatibility with existing styles

## Phase 8: Integrate Auto-Caption Split/Merge in transcript editor

### Current State
TranscriptEditor shows captions and words with color cycling. Split functionality exists in App.tsx and EnhancedTimeline.

### Features Needed
1. **Add split caption button** to TranscriptEditor word interface
2. **Add merge captions functionality** (adjacent captions)
3. **Add visual indication** of split/merge points in transcript
4. **Update transcript editor** to show split/merge capabilities

### Implementation Approach
- Modify TranscriptEditor to show split/merge controls
- Add merge functionality to App.tsx
- Update UI to indicate split/merge points visually
- Ensure proper state updates and undo/redo support

## Phase 11: Caption Timing Fine-Tune (drag handles on timeline)

### Current State
EnhancedTimeline already has drag handles for moving and resizing captions.

### Enhancements Needed
1. **Verify existing drag handles work correctly**
2. **Add visual feedback** for drag operations
3. **Add snapping to grid/other captions option**
4. **Add timecode tooltip during drag**

### Implementation Approach
- Test current drag handle functionality
- Improve visual feedback during drag (highlight, tooltips)
- Add snapping logic to align with grid or other captions
- Add timecode display during drag operations

## Phase 12: Implement Aspect Ratio Presets

### Current State
No aspect ratio controls exist. Video canvas appears to use fixed dimensions.

### Features Needed
1. **Add aspect ratio state** to App.tsx
2. **Add aspect ratio presets button** in UI (9:16, 16:9, 1:1, 4:5)
3. **Implement video canvas resizing** based on aspect ratio
4. **Update caption positioning calculations** for different ratios
5. **Add aspect ratio indicator** in preview area

### Implementation Approach
- Add aspectRatio state to App.tsx
- Create aspect ratio selector UI component
- Update video and canvas dimensions based on aspect ratio
- Adjust caption positioning calculations in captionRenderer.ts
- Add visual indicator in VideoPreviewArea

## Phase 13: Implement Batch Caption Style Apply

### Current State
No multi-select or batch operations exist.

### Features Needed
1. **Add multi-select capability** in transcript editor/timeline
2. **Add batch style apply button** when multiple captions selected
3. **Add option to apply style to all captions**
4. **Add preview of batch changes** before applying

### Implementation Approach
- Add selection state to TranscriptEditor and EnhancedTimeline
- Implement multi-select functionality (shift-click, drag-select)
- Add batch apply button in StyleCustomizer or toolbar
- Create preview mechanism for batch changes
- Update caption styles in batch

## Phase 14: Implement Caption Search & Replace

### Current State
TranscriptEditor shows captions but no search functionality.

### Features Needed
1. **Add search bar** to TranscriptEditor
2. **Add replace functionality** with replace all/replace one options
3. **Add case sensitivity and whole word options**
4. **Add search result highlighting** in transcript
5. **Add navigation between search results**

### Implementation Approach
- Add search controls to TranscriptEditor header
- Implement search/filter logic for captions and words
- Add highlighting of search results in word display
- Add replace functionality with options
- Add navigation controls (next/previous match)

## Phase 15: Implement Keyboard Shortcut Panel

### Current State
Some keyboard shortcuts exist (space for play/pause, arrow keys for seek) but no reference panel.

### Features Needed
1. **Create keyboard shortcut reference panel**
2. **List all available shortcuts** (playback, editing, navigation)
3. **Add ability to customize shortcuts** (stored in localStorage)
4. **Add shortcut conflict detection**
5. **Add shortcut panel toggle button** in UI

### Implementation Approach
- Create KeyboardShortcutPanel component
- Define default shortcut map
- Add shortcut customization UI with conflict detection
- Store custom shortcuts in localStorage
- Add toggle button to UI (likely in header or tools panel)
- Implement keyboard event handling using custom shortcuts

## Implementation Order

Based on dependencies and logical flow, I recommend implementing in this order:

1. **Phase 15: Keyboard Shortcut Panel** - Provides foundation for other implementations
2. **Phase 12: Aspect Ratio Presets** - Affects core rendering calculations
3. **Phase 7: Text Effects Panel** - Enhances core styling capabilities
4. **Phase 6: Caption Templates Gallery** - Builds on styling system
5. **Phase 5: Enhance Sticker & Emoji Overlay System** - Independent enhancement
6. **Phase 11: Caption Timing Fine-Tune** - Refines existing timeline functionality
7. **Phase 8: Integrate Auto-Caption Split/Merge in transcript editor** - Enhances editing
8. **Phase 13: Implement Batch Caption Style Apply** - Builds on selection systems
9. **Phase 14: Implement Caption Search & Replace** - Enhances transcript editor

## Cross-Cutting Considerations

- **State Management**: Ensure all new features properly integrate with useUndoableState hooks
- **Performance**: Monitor re-renders and optimize where necessary
- **Accessibility**: Ensure new controls are keyboard accessible and have proper labels
- **Responsiveness**: Ensure UI works on different screen sizes
- **Persistence**: Consider localStorage for user preferences where appropriate
- **Error Handling**: Add proper error boundaries and user feedback for operations

## Files to Modify/Create

### New Files to Create:
- `components/TemplateGallery.tsx`
- `components/TextEffectsPanel.tsx` (or integrate into StyleCustomizer)
- `components/KeyboardShortcutPanel.tsx`
- `components/AspectRatioSelector.tsx`
- `plans/implementation_plan.md` (this file)

### Existing Files to Modify:
- `App.tsx` - Add state for aspect ratio, shortcuts, etc.
- `components/StyleCustomizer.tsx` - Add text effects controls, template gallery integration
- `components/StickerPanel.tsx` - Add image support, improve controls
- `components/TranscriptEditor.tsx` - Add split/merge, search/replace functionality
- `components/EnhancedTimeline.tsx` - Enhance drag handles, add multi-select
- `components/VideoPreviewArea.tsx` - Add aspect ratio indicator
- `services/captionRenderer.ts` - Implement text effects rendering
- `constants.ts` - Add aspect ratio constants, effect configurations
- `types.ts` - Extend interfaces for new features (StickerItem, effect configs, etc.)

## Next Steps

Since I'm currently in architect mode, I should:
1. Create this implementation plan document
2. Switch to code mode to begin implementation
3. Start with Phase 15 (Keyboard Shortcut Panel) as it provides foundational utilities