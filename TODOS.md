# TODOS — Createrin v1

Tracked items deferred from /plan-eng-review (2026-04-19).

---

## CRITICAL — Before first external user

### 1. Real social publishing pipeline
**What:** Implement real OAuth + video upload for at least 1 platform (Instagram recommended — largest creator audience) before showing the Publish button to real users.
**Why:** All 10 platform connectors currently return `{ simulated: true }`. Instagram Graph API requires a publicly accessible video URL (not localhost). No OAuth callback handler exists. Users who connect an account and schedule a post will get a simulated "success" that never actually publishes.
**Pros:** Real product value. Publishing is the killer differentiator over caption-only tools.
**Cons:** OAuth + video CDN is significant scope (Instagram alone requires: app review, business account, media upload to CDN, Graph API call, async status polling).
**Context:** Start with Instagram. Get it working for one real account. Then replicate the pattern for other platforms.
**Depends on:** Deployment infrastructure (see item 3)

### 2. Pin Gemini model to explicit version [COMPLETED]
**What:** Changed `constants.ts` `GEMINI_MODEL` from `'gemini-flash-latest'` to `'gemini-2.0-flash'`.
**Why:** `gemini-flash-latest` is an unstable pointer. When Google releases a new flash model, transcription output format, JSON schema compliance, or latency can change silently with no code change. One silent model swap could break caption parsing for all users.
**Pros:** Deterministic behavior. You control when to upgrade.
**Cons:** Manual upgrade step required when you want a newer model.
**Context:** Do this before first external user. Pair with a changelog note: "Pinned to gemini-2.0-flash-001 for stability."
**Depends on:** Nothing

### 3. Define deployment strategy
**What:** Decide and document how the backend (Express + SQLite) will be deployed for real users.
**Why:** `server/index.js` hardcodes CORS for `localhost:5173`. SQLite is a local file. This architecture serves exactly one browser on one machine. Before any external user can use scheduling/publishing, the backend needs real deployment.
**Pros:** Enables the product to actually work for users beyond the founder's machine.
**Cons:** Adds infrastructure complexity. SQLite in production has limits (no concurrent writes at scale). May need PostgreSQL for production.
**Context:** Recommended path: Fly.io or Render for the Express server. Either use Turso (SQLite as a service) or migrate to PostgreSQL. Frontend can stay on Vercel/Netlify. Gemini API key must move to server env var (currently can be stored client-side).
**Depends on:** Nothing — can be designed before Phase 12 builds are complete

---

## NICE TO HAVE — After v1 ships

### 5. Creator Face Persona Engine
**What:** Train AI on 10-20 creator photos once. AI maintains a consistent face representation in thumbnails across sessions — same person, any expression, any background.
**Why:** 47.3% of creators cite "uncanny valley" AI faces as the reason they stopped using AI thumbnail tools (Social Blade, Dec 2025). The creator's real face, placed correctly, is the strongest differentiator from competitors.
**Pros:** Eliminates the #1 trust/quality barrier for AI thumbnail adoption. No other tool does this well.
**Cons:** Requires photo upload UI, LoRA fine-tuning pipeline or Gemini face reference API — XL scope (human) / M scope (CC). May need Vertex AI access.
**Context:** Deferred from /plan-ceo-review thumbnail rebuild (2026-05-17). Build after Canvas compositor core is validated with real users.
**Priority:** P2
**Effort:** XL (human ~2 weeks) / M (CC ~4hrs)
**Depends on:** Thumbnail generator core (Phases 1-4) complete

### 6. YouTube Analytics A/B Test Integration
**What:** Connect to YouTube Data API v3 to track actual CTR per thumbnail variant. Close the generate → deploy → measure → learn loop automatically.
**Why:** The biggest gap in the entire AI thumbnail market (2025). VidIQ comes closest but doesn't use historical channel data to improve future generations. This makes the tool smarter over time — a compounding moat.
**Pros:** Turns the CTR score from a prediction into a measurement. Every generation improves based on real channel performance data.
**Cons:** Requires YouTube OAuth 2.0 flow, Data API v3 access, and a way to associate uploaded thumbnails with Analytics events. Complex auth + API integration.
**Context:** Deferred from /plan-ceo-review thumbnail rebuild (2026-05-17). Cannot build until thumbnail export is working and creators have at least 3-4 videos using the tool.
**Priority:** P1 (after core ships)
**Effort:** L (human ~1 week) / M (CC ~3hrs)
**Depends on:** Thumbnail generator core + deployment strategy (#3)

### 7. Multi-Channel Agency Batch Mode
**What:** Generate thumbnails for 10+ channels simultaneously, each respecting per-channel brand rules (palette, font, logo). Unified review dashboard, bulk export, role-based access.
**Why:** Agencies and MCNs managing multiple YouTube channels have no suitable thumbnail tool. Canva/Kapwing have team features but no YouTube-specific CTR intelligence.
**Pros:** Opens the agency/MCN market tier. Different pricing model (per-channel seats vs. per-creator subscription). High LTV customers.
**Cons:** Requires multi-tenant data model, per-channel brand config storage, and agency pricing tiers. Different product than creator-focused tool.
**Context:** Deferred from /plan-ceo-review thumbnail rebuild (2026-05-17). Only relevant after single-creator mode is validated and revenue is established.
**Priority:** P3
**Effort:** XL (human ~4 weeks) / L (CC ~8hrs)
**Depends on:** Creator mode fully stable + deployment infrastructure (#3)

### 4. captionRenderer.ts renderer-per-style split [COMPLETED]
**What:** Split the 2696-line captionRenderer into per-style renderer files (e.g., `renderers/neonRenderer.ts`, `renderers/minimalRenderer.ts`).
**Why:** Currently 8+ if/else branches inside one massive class, each re-implementing shadow/stroke/gradient logic. Phase 7 will add more branches. A bug in gradient logic requires finding and fixing it in 3+ places.
**Pros:** Maintainable. Per-style tests become trivial.
**Cons:** Large refactor. Risk of regressions if done carelessly.
**Context:** Do this after Phase 7 ships. The effect helper extraction (decided in review) is a stepping stone toward this.
**Depends on:** Phase 7 complete (so helpers are already extracted)
