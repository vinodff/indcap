# Text Editing Guide — Typography Reel Studio

## Overview

The Typography Reel Studio now includes a **professional-grade text editor** for refining your reels. Edit word-by-word or bulk replace text, with real-time preview and keyboard shortcuts for power editing.

---

## Text Editor Features

### **1. Word List View**
- See all words/phrases in your reel
- Click any word to select and edit
- Shows timing info: `0.25s – 0.75s`
- Visual selection highlight in blue

### **2. Text Editor Panel**
When a word is selected:
- **Content textarea** — edit the text with full Unicode support (emojis work!)
- **Character count** — shows content length and word count
- **Word properties** — view timing, font size, emphasis level
- **Buttons**:
  - **Duplicate** — copy the word with 100ms gap
  - **Delete** — remove from sequence

### **3. Interactive Timeline**
Visual timeline showing word distribution:
- **Word blocks** — colored boxes positioned by time
- **Click blocks** — select word directly from timeline
- **Progress line** — shows current playback position in real-time
- **Time markers** — 1-second intervals at bottom
- **Statistics**:
  - Total word count
  - Average word duration
  - Coverage % (text vs silence)

### **4. Find & Replace**
Bulk text editing for power users:
- **Search box** — find text in all words (case-insensitive)
- **Replace with** — what to replace it with
- **Buttons**:
  - **Replace** — replace next occurrence
  - **Replace All** — replace all matches at once
- **Match counter** — shows how many matches found

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **↑ / ↓** | Navigate between words in list |
| **Enter** | Save text changes (in textarea) |
| **Alt + Delete** | Delete selected word |
| **Escape** | Deselect current word |
| **Ctrl + H** | Open Find & Replace |

---

## Editing Workflows

### **Workflow 1: Quick Text Edits**
1. Generate reel (AI analyzes audio)
2. Click **✏️ Text** tab on right panel
3. Select word from list
4. Edit text in textarea
5. Press Enter or click away to save
6. See changes instantly on canvas
7. Export when done

### **Workflow 2: Duplicate & Vary**
1. Select a word
2. Click **Duplicate** button
3. New copy appears with 100ms gap
4. Edit the copy's text
5. Repeat to create word sequences

Example:
```
"amazing" → Duplicate → "amazing amazing" (two copies)
                      → Edit second to "so amazing"
```

### **Workflow 3: Bulk Find & Replace**
1. Press **Ctrl + H** (or click search icon)
2. Type word to find: `"emotion"`
3. Type replacement: `"feeling"`
4. Click **Replace All**
5. All occurrences update instantly

### **Workflow 4: Visual Pacing Control**
1. Look at timeline visualization
2. Spot gaps (white space = silence)
3. Add more words to fill gaps
4. Use Duplicate button for quick additions
5. Adjust timing in properties

---

## Tips & Tricks

### **Unicode Support**
Full emoji support! Examples:
- `emotion 🔥` — word with emoji
- `✨ magic ✨` — emoji bookends
- `🚀 launch 🚀` — decorative emoji

### **Timing Patterns**
- Short words (< 0.3s): snappy, punchy
- Medium words (0.3–0.7s): readable
- Long words (> 0.7s): emphasis, impact
- Mixed timing creates rhythm

### **Word Grouping**
Create phrases instead of single words:
- Instead of: "the", "quick", "fox"
- Better: "the quick fox" (one word block)
- Fewer but longer blocks = cleaner visual

### **Coverage**
The timeline shows coverage %:
- **50%**: Half silence, half text (sparse style)
- **80%**: Dense pacing, fast rhythm
- **100%**: No breaks between words (intense)

### **Keyboard Power User Mode**
For rapid editing:
1. ↑↓ to navigate words quickly
2. Type edit
3. Enter to save
4. ↑ or ↓ to next word
5. Repeat (no mouse needed!)

---

## Timeline Visualization

### **Reading the Timeline**

```
Timeline: [AMAZING]────[the][quick]──[fox]──[jumps]────[high]
          0s      1s    2s   2.5s   3s  3.5s 4s       5s
```

- **Blue block**: Selected word
- **Gray block**: Other words
- **White space**: Silence
- **Red line**: Current playback position

### **Timeline Interaction**
- Click any block to select that word
- See instant timing and text info
- Word duration shown by block width

---

## Common Edits

### **Add Emphasis**
```
Before: "amazing"
After:  "SO AMAZING" or "amazing ✨"
```
Change to ALL CAPS or add emojis.

### **Fix Transcription Errors**
1. Ctrl+H (Find & Replace)
2. Find incorrect word
3. Replace with correct word
4. Click Replace All

### **Slow Down Pacing**
1. Select fast words
2. Duplicate them
3. Stagger new copies before/after
4. Creates breathing room

### **Speed Up Pacing**
1. Delete low-priority words
2. Combine short words into phrases
3. Remove silence-padding

### **Change Tone**
Example: "I feel happy" → "I'm SO HAPPY" 🎉
- Delete low-emphasis words
- Add capitalization/emoji
- Keeps same audio sync (words move earlier in reel)

---

## Advanced Features

### **Per-Word Properties** (Visible but not editable in v1)
- **Font Size**: Auto-calculated from emphasis
- **Emphasis**: Normal / Medium / High (affects animation)
- **Start Time**: Millisecond precision
- **Duration**: How long the word appears

### **Future Enhancements**
- [ ] Undo/redo history (Ctrl+Z / Ctrl+Y)
- [ ] Word-level animation picker (select effect per word)
- [ ] Merge consecutive words
- [ ] Swap word positions
- [ ] Batch styling (make all caps, etc.)
- [ ] Text formatting (bold, italic, underline)
- [ ] Layer control (z-index for overlapping text)

---

## Export with Edited Text

When you're done editing:
1. Click **Export MP4** button
2. All edited text bakes into video
3. Timing and animations sync perfectly
4. Audio aligns with your changes

---

## Troubleshooting

### **"Word appears to be cut off"**
- This is normal — the canvas crops at edges
- Use Position/Size properties in Image Editor to adjust
- Or delete the word if unwanted

### **"Changes aren't appearing"**
- Press Enter in textarea to confirm edit
- Check that word is truly selected (blue highlight)
- Try clicking another word and back

### **"Timeline is empty"**
- Wait for reel to fully generate
- Timeline appears once animation sequence is ready
- May take 10–15 seconds for Gemini + beat detection

### **"Undo isn't working"**
- Undo/redo not in v1 (coming in Phase 2)
- Workaround: Screenshot text edits before exporting
- Or re-generate and edit again

---

## Keyboard Reference Card

### **Navigation**
- ↑ / ↓ — Move between words
- Click word → Select it
- Click timeline block → Select word
- Escape → Deselect

### **Editing**
- Type → Edit selected word text
- Enter → Save changes
- Ctrl+H → Find & Replace
- Alt+Delete → Remove word

### **Timeline**
- Click blocks → Quick word selection
- Watch progress line → See current time
- Hover blocks → See word + timing

---

## Performance Notes

- **Editing is instant** — changes preview immediately
- **Search is fast** — even with 100+ words
- **Timeline renders smoothly** — no lag with 50+ words
- **Undo not yet available** — plan carefully or re-generate

---

## Keyboard Shortcut Cheat Sheet

```
╔════════════════════════════════════════╗
║       TEXT EDITOR CHEAT SHEET          ║
╠════════════════════════════════════════╣
║  ↑ ↓ ← →   Navigate & select words     ║
║  Enter     Save text changes            ║
║  Alt+Del   Delete selected word         ║
║  Esc       Deselect word                ║
║  Ctrl+H    Find & Replace               ║
║  Drag      Move words in timeline       ║
║  Click     Select word from any place   ║
╚════════════════════════════════════════╝
```

---

## Next Steps

After editing text:
1. **Switch to Image tab** — add/edit extracted images
2. **Play preview** — check sync with audio
3. **Fine-tune timing** — if any words feel off
4. **Export MP4** — save final reel with both text and images

Enjoy professional-grade text editing! 🎬✨
