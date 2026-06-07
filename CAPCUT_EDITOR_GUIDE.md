# CapCut-Style Editor — Professional UI Guide

## 🎬 Overview

The Typography Reel Studio now features a **professional video editor interface** inspired by CapCut, Premiere Pro, and DaVinci Resolve.

### **Layout**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back  │ Typography Reel Studio                │ Export    │ Header
├──────────┼────────────────────────────────────────┼───────────┤
│          │                                        │           │
│ TOOLS    │      CANVAS PREVIEW                    │ PROPERTIES│
│          │      (Video/Text Rendering)            │ PANEL     │
│ • Text   │                                        │           │
│ • Images │                                        │ • Position│
│ • FX     │      + Playback Controls               │ • Size    │
│          │                                        │ • Opacity │
│          │                                        │           │
├──────────┴────────────────────────────────────────┴───────────┤
│                  TIMELINE EDITOR                             │
│  [Item] [Item] [Item]  ▶ [Item]     [Item]                 │
│                                                              │
│  0s          1s          2s          3s          4s          │
└──────────────────────────────────────────────────────────────┘
```

---

## 📍 4-Panel Design

### **1. Left Panel — Tools (256px)**
**Purpose:** Select editing tools

**Available Tools:**
- **✏️ Text** — Edit words and typography
- **🖼️ Images** — Manage and position images
- **✨ Effects** — Animation effects (future)
- **📚 Layers** — Layer management (future)
- **⚙️ Settings** — Project settings (future)

**Pro Tip Section:**
- Shows helpful hints
- Keyboard shortcut reminders

### **2. Center — Canvas (Flex)**
**Purpose:** Large preview of your reel

**Features:**
- Full-size video preview
- Real-time animation playback
- Text and image rendering
- Click to interact with elements

**Playback Controls:**
- ▶️ Play/Pause
- ⟲ Restart
- Current time display
- Synchronized with audio

### **3. Right Panel — Properties (320px)**
**Purpose:** Edit properties of selected item

**Content Changes Based on Selection:**

**When Word Selected:**
- Text content editor
- Timing (start/duration)
- Font properties
- Emphasis level
- Duplicate/Delete buttons

**When Image Selected:**
- Position (X, Y)
- Size (width, height)
- Opacity slider (0-100%)
- Rotation slider (0-360°)
- Blend mode dropdown
- Delete button

**When Nothing Selected:**
- Helpful prompt to click an element

**Property Input Types:**
- **Sliders** — Smooth continuous values
- **Text fields** — Precise typing
- **Dropdowns** — Preset options
- **Color pickers** — Color selection

### **4. Bottom — Timeline (160px)**
**Purpose:** Visual timeline with all elements

**Timeline Features:**

| Feature | Function |
|---------|----------|
| **Item Blocks** | Each word (violet) or image (amber) |
| **Playhead** | Red vertical line shows position |
| **Progress Bar** | Blue highlight shows elapsed time |
| **Time Markers** | Grid lines at 1-second intervals |
| **Click to Seek** | Click anywhere to jump to time |
| **Select Items** | Click block to select for editing |

**Status Indicators:**
- **Purple/Violet blocks** = Text items
- **Amber/Orange blocks** = Image items
- **Blue highlight** = Currently selected item
- **Red line** = Current playback position

---

## 🎯 Editing Workflows

### **Workflow 1: Edit Text**
1. Click **✏️ Text** tool in left panel
2. Click word on timeline or canvas
3. Edit text in right properties panel
4. See changes instantly in preview
5. Press Enter or click away to save

### **Workflow 2: Position Image**
1. Click **🖼️ Images** tool in left panel
2. Click image on timeline
3. Adjust properties in right panel:
   - Drag position sliders (X, Y)
   - Resize with width/height
   - Change opacity
   - Rotate if needed
4. See changes in real-time on canvas

### **Workflow 3: Timeline Editing**
1. Look at bottom timeline
2. Click any block to select item
3. Properties panel updates instantly
4. Edit properties on right
5. Click another block to select next item

### **Workflow 4: Playback & Sync Check**
1. Click **▶️** play button in timeline
2. Watch video sync with audio
3. Pause at any moment to adjust timing
4. Click to seek to specific time
5. Verify all text/images appear at right times

---

## 🎮 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| Esc | Deselect item |
| Delete | Remove selected item |
| Ctrl+Z | Undo (future) |
| Ctrl+C | Copy (future) |
| Ctrl+V | Paste (future) |
| H | Show help |

---

## 💡 UI Features

### **Color Coding**
- **Violet/Purple** = Text elements
- **Amber/Orange** = Image elements
- **Blue** = Selected state
- **Red** = Playhead position
- **Dark gray** = Background/UI

### **Visual Feedback**
- **Hover effects** — Buttons brighten
- **Selected state** — Blue border & highlight
- **Transitions** — Smooth animations
- **Progress bar** — Shows elapsed time
- **Time display** — Precise playback position

### **Responsive Design**
- **Left panel:** Collapses on small screens
- **Right panel:** Scrollable for small screens
- **Timeline:** Scrollable horizontally
- **Canvas:** Scales to fit available space

---

## 📊 Timeline Details

### **Reading the Timeline**

```
Time:    0s              1s              2s              3s
         |               |               |               |
         v               v               v               v
Timeline: [amazing]───[the]──[quick]─────────[fox]───[jumps]
          
Selected: [amazing] (blue highlight)
Playhead:           ▶ (red line at 0.5s)
Progress: ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

### **Interaction**

1. **Click block** → Select that item
2. **Click background** → Seek to that time
3. **Hover block** → See tooltip (text/timing)
4. **Right-click** → Context menu (future)

### **Item Properties Shown in Timeline**

Each block shows:
- Type icon (✏️ for text, 🖼️ for image)
- Item content (text or image name)
- Duration (block width = duration)
- Position (left = start time)

---

## 🎨 Pro Tips

### **Efficient Editing**
1. **Use timeline for quick selection** — Click blocks instead of scrolling lists
2. **Watch playback while editing** — Verify timing as you go
3. **Drag to compare** — Scrub timeline back/forth to A/B check
4. **Batch edits** — Select similar items, edit properties once

### **Visual Design**
- **Same width blocks** = Same duration (easy to spot inconsistencies)
- **Tight timeline** = Dense, punchy pacing
- **Sparse timeline** = Slower, more dramatic feel
- **Varied block sizes** = Good rhythm and dynamics

### **Performance**
- Timeline updates in real-time
- Property changes render instantly
- Smooth playback at 30+ FPS
- No lag even with 50+ items

---

## 🔧 UI Components

### **Property Inputs**

**Range Slider**
```
Opacity: [████████░░░░░░░░░░] 80%
         Move slider left/right to adjust
```

**Text Field**
```
X Position: [100]
           Type precise number
```

**Dropdown**
```
Blend Mode: [normal ▼]
            Click to select option
```

**Color Picker** (Future)
```
Background: [████]
            Click square to pick color
```

---

## 🎯 Selection Model

**Only One Item Selected at a Time**

When you select:
- **Word** → Right panel shows text editor
- **Image** → Right panel shows image properties
- **Nothing** → Right panel shows prompt

**Visual Indication:**
- Selected block turns blue on timeline
- Properties panel header highlights
- Canvas may highlight item (if implemented)

---

## 📱 Responsive Behavior

### **Large Screen (1920×1080+)**
- Full 4-panel layout visible
- All properties accessible
- Timeline fully visible

### **Medium Screen (1280×720)**
- Panels may be narrower
- Properties panel becomes scrollable
- Timeline remains fully accessible

### **Small Screen (<1280px)**
- Left/right panels can collapse
- Canvas maximized
- Timeline becomes primary editor

---

## 🐛 Troubleshooting

### **"Properties panel is empty"**
- Solution: Click an item on timeline or canvas to select it

### **"I can't see the timeline"**
- Solution: The timeline is at the bottom. Scroll down if needed.

### **"Changes aren't appearing"**
- Solution: Press Enter to confirm text edits
- Wait for canvas to re-render (usually instant)

### **"Timeline is too zoomed in/out"**
- Solution: Horizontal scroll in timeline to see more/less
- (Future: Add zoom slider)

---

## 🚀 Future Enhancements

- [ ] **Zoom controls** for timeline
- [ ] **Minimap** in timeline for long projects
- [ ] **Undo/Redo** buttons in header
- [ ] **Multi-select** (shift+click)
- [ ] **Right-click context menus**
- [ ] **Drag-to-reorder** items on timeline
- [ ] **Snap to grid** options
- [ ] **Zoom/pan** canvas with mouse
- [ ] **Full-screen** preview mode
- [ ] **Split view** (preview + timeline side-by-side)

---

## ✨ Next Steps After Editing

1. **Preview** — Click play to watch full reel
2. **Fine-tune** — Adjust timing if needed
3. **Export** — Click Export button for MP4
4. **Share** — Upload to social media

---

## 📖 Related Guides

- **TEXT_EDITING_GUIDE.md** — Detailed text editing workflows
- **STUDIO_FEATURE_SUMMARY.md** — Complete feature list
- **IMAGE_EDITOR_SETUP.md** — Image system setup

---

**Enjoy professional-grade reel editing!** 🎬✨
