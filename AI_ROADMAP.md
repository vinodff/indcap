# CapGen AI - Strategic Roadmap & Enhancements

## 1. Feature Roadmap

### Phase 1: Contextual Intelligence (Immediate)
Moving beyond simple transcription to understanding *how* things are said.
- **Auto-Highlighting:** AI identifies the "power word" in every sentence (e.g., "This is **INSANE**"). The frontend uses this to apply a specialized kinetic animation (e.g., distinct color + scale bounce) to just that word.
- **Sentiment Mapping:** AI classifies audio segments as "High Energy", "Somber", or "Professional". The app automatically switches the `CaptionStyle` (e.g., `HORMOZI` for High Energy, `MINIMAL` for Professional).

### Phase 2: Viral Engineering (Short-term)
- **Viral Rewriting:** A separate mode where AI doesn't just transcribe, but *edits* the script.
    - *Input:* "So, I was thinking that maybe we could go..."
    - *Output:* "We NEED to go! 🚀"
- **Hook Generation:** AI analyzes the visual frames of the first 3 seconds and generates a clickbait Title Card overlay text that isn't spoken but summarizes the hook.

### Phase 3: Multi-Modal Agents (Long-term)
- **B-Roll Matching:** Gemini analyzes the text context (e.g., "Bitcoin is crashing") and suggests searching for "Stock market down arrow" stock footage to overlay.
- **AI Dubbing:** Translate the Hindi transcript to English and generate a synchronized audio track using a cloned voice.

## 2. Prompt Strategies

### Strategy A: The "Editor's Meta-Layer" (Single Pass)
We update the main `generateContent` prompt to return metadata alongside text. This avoids the latency of a second API call.

**Schema Update:**
```json
{
  "text": "Welcome to the future",
  "keywords": ["future"], // Used for highlighting
  "emotion": "excitement" // Used for style selection
}
```

### Strategy B: The "Punch-Up" Chain
For Viral Rewriting, we use a two-step prompting strategy:
1.  **Literal Transcription:** Get the raw text (high temperature = 0).
2.  **Viral Refinement:** Pass raw text to a new context window with `VIRAL_REWRITE_INSTRUCTION` (high temperature = 0.8) to generate the "TikTok version".

## 3. Gemini Integration Plan

### 1. Highlight Extraction
**Goal:** Colorize important words.
**Prompt:** "Identify the single most emphatic word in the segment. Return its index."
**Frontend:** The `drawCanvas` function iterates words; if `wordIndex === highlightIndex`, apply `activeTextColor` and `scale(1.3)`.

### 2. Auto-Emoji Placement
**Goal:** Insert emojis not just at the end, but at the specific visual location of the referenced object.
**Prompt:** "If the text mentions a concrete object (e.g., 'Coffee'), return the object name."
**Vision API:** Ask Gemini Vision "Where is the [object] in this frame?" -> Return bounding box -> Place emoji at (x,y).

### 3. Style Transfer
**Goal:** Match caption font to video vibe.
**Prompt:** "Analyze the video aesthetic. Is it 'Grungy', 'Clean', 'Chaotic', or 'Corporate'?"
**Mapping:**
- Grungy -> `GLITCH_CYBER`
- Clean -> `DEFAULT`
- Chaotic -> `BEAST_MODE`
- Corporate -> `MINIMAL_BOX`
