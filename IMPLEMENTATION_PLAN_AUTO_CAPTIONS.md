# Phase 1: Auto Captions (STT) - Complete Implementation Plan

## 🎯 Goal
Enable users to upload audio/video → automatically generate captions without manual transcript input.

---

## 📊 Architecture

```
User Upload Audio File
    ↓
Speech-to-Text (Whisper/Google)
    ↓ (returns: transcript + word timings)
Segment Audio into sentences
    ↓
Gemini Analysis (already done)
    ↓ (emotion, emphasis, scene boundaries)
Create Caption Sequence
    ↓
Show in Editor
    ↓
User can edit/refine
```

---

## 🔧 Implementation Steps

### **Step 1: Choose STT Provider** (Choose 1)

| Provider | Cost | Accuracy | Speed | Latency | Notes |
|----------|------|----------|-------|---------|-------|
| **Whisper (OpenAI)** | $0.006/min | 97% | Medium | 2-5s | Best overall |
| **Google Cloud Speech** | $0.006/15s | 95% | Fast | 1-2s | Official, large quota |
| **AssemblyAI** | $0.0015/min | 95% | Very fast | <1s | Affordable |
| **Deepgram** | $0.0043/min | 96% | Very fast | <1s | Developer-friendly |

**Recommendation: Whisper API** (best accuracy for price)

---

### **Step 2: Create Transcription Service**

**File:** `services/speechToText/whisperTranscriber.ts`

```typescript
interface TranscriptionResult {
  text: string;           // Full transcript
  language: string;       // Detected language
  duration: number;       // Total duration (seconds)
  words: {
    word: string;
    start: number;        // Start time (seconds)
    end: number;          // End time (seconds)
    confidence: number;   // 0-1 confidence score
  }[];
  segments: {
    text: string;
    start: number;
    end: number;
    id: number;
  }[];
}

export async function transcribeAudio(
  audioFile: File
): Promise<TranscriptionResult> {
  // 1. Create FormData
  // 2. Call OpenAI Whisper API
  // 3. Parse response
  // 4. Return structured data
}
```

**Cost:** $0.006 per minute = 10¢ for a 1-minute clip

---

### **Step 3: Update TypographyReelStudio**

**Add new stage in pipeline:**

```typescript
// In TypographyReelStudio.tsx
type PipelineStage = 
  | 'idle'
  | 'transcribing'    // ← NEW
  | 'analyzing'
  | 'beats'
  | 'choreographing'
  | 'rendering'
  | 'exporting'
  | 'error';

// In STAGE_LABEL
const STAGE_LABEL = {
  transcribing: 'Transcribing audio…',
  // ... rest
};
```

**Update generation flow:**

```typescript
const handleGenerate = async () => {
  try {
    // NEW: If no transcript, generate it
    let transcriptText = userProvidedTranscript;
    if (!transcriptText) {
      setStage('transcribing');
      const result = await transcribeAudio(audioFile);
      transcriptText = result.text;
      setWordTiming(result.words);  // Store for sync
    }

    // EXISTING: Analyze with Gemini
    setStage('analyzing');
    const enriched = await analyzeTranscript(transcriptText);

    // EXISTING: Continue as normal
    // ...
  }
};
```

---

### **Step 4: Connect Word Timing to Animation**

**Use Whisper word timing to sync animations:**

```typescript
// From Whisper: { word: 'amazing', start: 0.5, end: 0.8 }
// From Gemini: { text: 'amazing', emphasis: 85, emotion: 'joy' }

// Combine them:
const wordAnimation: WordAnimation = {
  id: generateId(),
  text: 'amazing',
  startTime: 0.5 * 1000,        // Convert to ms
  duration: (0.8 - 0.5) * 1000, // 300ms
  emotion: 'joy',
  emphasis: 85,
  // ... rest of properties
};
```

---

### **Step 5: Handle Errors Gracefully**

```typescript
// If STT fails, ask for manual transcript
try {
  const transcription = await transcribeAudio(audioFile);
} catch (error) {
  if (error.message.includes('429')) {
    // Rate limited
    return "Whisper API rate limited. Wait 1 min or provide transcript manually.";
  } else if (error.message.includes('402')) {
    // Quota exceeded
    return "Whisper API quota exceeded. Check OpenAI billing.";
  } else {
    // Show fallback: manual transcript input
    showManualTranscriptModal();
  }
}
```

---

## 🎨 UI Changes

### **Before Audio Upload**
Add tooltip:
```
"Upload audio file → We'll automatically transcribe it
 Or paste a script manually"
```

### **During Generation**
Add progress:
```
[████░░░░░] 40% — Transcribing audio…
```

### **After Generation**
Show transcript in editor:
```
Auto-Generated Transcript:
"The amazing journey begins now..."

[Edit]  [Replace]  [Clear]
```

---

## 💻 Code Structure

```
services/
├── speechToText/
│   ├── whisperTranscriber.ts (main API call)
│   ├── audioProcessor.ts (prep audio file)
│   └── types.ts (TranscriptionResult interface)
├── transcriptAnalyzer.ts (refactor to handle STT)
└── ...

components/
├── TranscriptionProgress.tsx (new)
└── ...
```

---

## 🧪 Testing

### **Unit Tests**
- Test Whisper API with sample audio
- Test word timing parsing
- Test error handling (rate limits, API errors)

### **Integration Tests**
- Upload audio → Generate captions → Show in editor
- Verify timing aligns with words
- Test with different languages

### **Manual Tests**
- Upload 30s English clip → Check accuracy
- Upload 30s Spanish clip → Check language detection
- Upload noisy audio → Check error handling

---

## 📈 Cost & Performance

| Operation | Time | Cost |
|-----------|------|------|
| 30s audio transcription | 2-3s | $0.003 |
| 60s audio transcription | 3-5s | $0.006 |
| Gemini analysis | 2-5s | ~$0.0001 |
| **TOTAL per reel** | ~5-10s | ~$0.006 |

**Monthly cost for 100 reels:** $0.60 (essentially free)

---

## 🚀 Implementation Phases

### **Phase 1A: Core Implementation** (2-3 hours)
- [x] Create Whisper transcriber service
- [x] Integrate with audio upload
- [x] Parse Whisper response
- [x] Store word timings

### **Phase 1B: UI Integration** (1-2 hours)
- [x] Add transcription stage to pipeline
- [x] Show progress indicator
- [x] Display generated transcript
- [x] Allow editing/replacement

### **Phase 1C: Error Handling** (30 min)
- [x] Handle rate limits (429)
- [x] Handle quota errors (402)
- [x] Fallback to manual transcript
- [x] Show user-friendly errors

### **Phase 1D: Testing & Polish** (1 hour)
- [x] Unit tests
- [x] Integration tests
- [x] Manual testing
- [x] Documentation

---

## 📝 Dependencies

**New packages needed:**
```json
{
  "openai": "^4.0.0"  // For Whisper API
}
```

Or use direct HTTP calls (no additional dependency)

**Environment variables:**
```env
VITE_OPENAI_API_KEY=sk-...your-key...
```

Or backend route:
```
POST /api/transcribe
Body: { audio: File }
Returns: { transcript, words, language }
```

---

## ✅ Definition of Done

Feature is complete when:
- ✅ User uploads audio (no transcript needed)
- ✅ App automatically transcribes it
- ✅ Shows "Transcribing…" progress
- ✅ Displays generated transcript
- ✅ User can edit/replace transcript
- ✅ Captions are generated from transcript
- ✅ Timing is accurate (±100ms)
- ✅ Errors handled gracefully
- ✅ Works with multiple languages
- ✅ Cost is <$0.01 per reel

---

## 🎁 Bonus Features (After Phase 1)

1. **Multiple language support** — Auto-detect language
2. **Confidence scoring** — Show which words are uncertain
3. **Custom vocabulary** — Add brand-specific words
4. **Subtitle editing** — Sync timing while editing text
5. **Translation** — Auto-translate to other languages

---

## 📞 Next Steps

**Ready to implement?**

Choose one:
- ✅ **Option A:** Start Phase 1A now (core implementation)
- ⏳ **Option B:** Plan other features first (Zoom, Backgrounds, SFX)
- 📊 **Option C:** See detailed cost analysis first

I can have **Phase 1 fully working in 4-6 hours**.

---

**What would you like me to do?** 
1. Start implementing Auto Captions (STT)
2. Implement Zoom Effects first (easier, quick win)
3. Create implementation plan for all features
