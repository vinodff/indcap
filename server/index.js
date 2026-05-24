/**
 * Createrin Backend API Server
 * Express + SQLite — runs on port 3001
 * Frontend runs on Vite port 5173
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';
import { createServer } from 'http';
import multer from 'multer';
import thumbnailRouter from './routes/thumbnail.js';
import motionRouter from './routes/motion.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── DATABASE SETUP ──────────────────────────────────────────────────────────
const DB_PATH = join(__dirname, 'db', 'createrin.db');

// Ensure db directory exists
import { mkdirSync } from 'fs';
mkdirSync(join(__dirname, 'db'), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema
db.exec(`
  CREATE TABLE IF NOT EXISTS brand_kits (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    niche      TEXT NOT NULL,
    audience   TEXT NOT NULL,
    tone       TEXT NOT NULL CHECK(tone IN ('FUNNY','EDUCATIONAL','FOMO','INSPIRATIONAL','PROFESSIONAL')),
    cta_link   TEXT,
    about      TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scheduled_posts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    platform       TEXT NOT NULL,
    content        TEXT NOT NULL,
    content_type   TEXT NOT NULL DEFAULT 'caption',
    scheduled_at   TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'SCHEDULED'
                   CHECK(status IN ('SCHEDULED','PUBLISHING','PUBLISHED','FAILED','CANCELLED')),
    brand_kit_id   INTEGER REFERENCES brand_kits(id),
    error_message  TEXT,
    published_at   TEXT,
    created_at     TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS remix_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    transcript   TEXT,
    instagram    TEXT,
    twitter      TEXT,
    linkedin     TEXT,
    youtube      TEXT,
    blog         TEXT,
    brand_kit_id INTEGER REFERENCES brand_kits(id),
    created_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS analytics_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    event      TEXT NOT NULL,
    metadata   TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS thumbnail_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    hook_text  TEXT NOT NULL,
    template   TEXT NOT NULL,
    ctr_score  INTEGER DEFAULT 0,
    image_url  TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ─── APP SETUP ───────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'] }));
app.use(express.json({ limit: '50mb' }));

// Multer — store uploads in memory (max 50MB), audio/video only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio and video files are accepted'));
    }
  },
});

// Simple request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── THUMBNAIL ROUTES ──────────────────────────────────────────────────────────
app.use('/api/thumbnail', thumbnailRouter);

// ─── MOTION GRAPHICS ROUTES ────────────────────────────────────────────────────
app.use('/api/motion', motionRouter);

// ─── BRAND KIT ROUTES ────────────────────────────────────────────────────────
// GET latest brand kit
app.get('/api/brandkit', (_req, res) => {
  const kit = db.prepare(`SELECT * FROM brand_kits ORDER BY updated_at DESC LIMIT 1`).get();
  if (!kit) return res.json({ data: null });
  return res.json({ data: kit });
});

// UPSERT brand kit (save or update)
app.post('/api/brandkit', (req, res) => {
  const { name, niche, audience, tone, ctaLink, about, id } = req.body;

  if (!name || !niche || !audience || !tone) {
    return res.status(400).json({ error: 'name, niche, audience, tone are required' });
  }

  if (id) {
    // Update existing
    db.prepare(`
      UPDATE brand_kits
      SET name=?, niche=?, audience=?, tone=?, cta_link=?, about=?, updated_at=datetime('now')
      WHERE id=?
    `).run(name, niche, audience, tone, ctaLink || null, about || null, id);
    const updated = db.prepare(`SELECT * FROM brand_kits WHERE id=?`).get(id);
    return res.json({ data: updated });
  } else {
    // Insert new
    const result = db.prepare(`
      INSERT INTO brand_kits (name, niche, audience, tone, cta_link, about)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, niche, audience, tone, ctaLink || null, about || null);
    const inserted = db.prepare(`SELECT * FROM brand_kits WHERE id=?`).get(result.lastInsertRowid);
    return res.status(201).json({ data: inserted });
  }
});

// DELETE brand kit
app.delete('/api/brandkit/:id', (req, res) => {
  db.prepare(`DELETE FROM brand_kits WHERE id=?`).run(req.params.id);
  return res.json({ success: true });
});

// ─── SCHEDULED POSTS ROUTES ──────────────────────────────────────────────────
// GET all scheduled posts
app.get('/api/schedules', (_req, res) => {
  const posts = db.prepare(`
    SELECT sp.*, bk.name as brand_name 
    FROM scheduled_posts sp
    LEFT JOIN brand_kits bk ON bk.id = sp.brand_kit_id
    ORDER BY scheduled_at ASC
  `).all();
  return res.json({ data: posts });
});

// GET single post
app.get('/api/schedules/:id', (req, res) => {
  const post = db.prepare(`SELECT * FROM scheduled_posts WHERE id=?`).get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found' });
  return res.json({ data: post });
});

// CREATE scheduled post
app.post('/api/schedules', (req, res) => {
  const { platform, content, contentType = 'caption', scheduledAt, brandKitId } = req.body;

  if (!platform || !content || !scheduledAt) {
    return res.status(400).json({ error: 'platform, content, scheduledAt are required' });
  }

  const result = db.prepare(`
    INSERT INTO scheduled_posts (platform, content, content_type, scheduled_at, brand_kit_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(platform, content, contentType, scheduledAt, brandKitId || null);

  const post = db.prepare(`SELECT * FROM scheduled_posts WHERE id=?`).get(result.lastInsertRowid);

  // Log analytics
  db.prepare(`INSERT INTO analytics_events (event, metadata) VALUES ('schedule_created', ?)`).run(
    JSON.stringify({ platform, scheduledAt })
  );

  return res.status(201).json({ data: post });
});

// UPDATE post status (PUBLISHED, FAILED, CANCELLED)
app.patch('/api/schedules/:id', (req, res) => {
  const { status, errorMessage } = req.body;
  const allowedStatuses = ['SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Use: ${allowedStatuses.join(', ')}` });
  }

  const publishedAt = status === 'PUBLISHED' ? new Date().toISOString() : null;
  db.prepare(`
    UPDATE scheduled_posts 
    SET status=?, error_message=?, published_at=?
    WHERE id=?
  `).run(status, errorMessage || null, publishedAt, req.params.id);

  if (status === 'PUBLISHED') {
    db.prepare(`INSERT INTO analytics_events (event) VALUES ('post_published')`).run();
  }

  const post = db.prepare(`SELECT * FROM scheduled_posts WHERE id=?`).get(req.params.id);
  return res.json({ data: post });
});

// DELETE post
app.delete('/api/schedules/:id', (req, res) => {
  db.prepare(`DELETE FROM scheduled_posts WHERE id=?`).run(req.params.id);
  return res.json({ success: true });
});

// ─── REMIX HISTORY ───────────────────────────────────────────────────────────
app.get('/api/remix-history', (_req, res) => {
  const items = db.prepare(`SELECT * FROM remix_history ORDER BY created_at DESC LIMIT 20`).all();
  return res.json({ data: items });
});

app.post('/api/remix-history', (req, res) => {
  const { transcript, instagram, twitter, linkedin, youtube, blog, brandKitId } = req.body;
  const result = db.prepare(`
    INSERT INTO remix_history (transcript, instagram, twitter, linkedin, youtube, blog, brand_kit_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    (transcript || '').substring(0, 2000),
    instagram || '', twitter || '', linkedin || '', youtube || '', blog || '',
    brandKitId || null
  );
  const item = db.prepare(`SELECT * FROM remix_history WHERE id=?`).get(result.lastInsertRowid);
  db.prepare(`INSERT INTO analytics_events (event) VALUES ('remix_created')`).run();
  return res.status(201).json({ data: item });
});

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
app.get('/api/analytics', (_req, res) => {
  const remixes = db.prepare(`SELECT COUNT(*) as count FROM remix_history`).get();
  const schedules = db.prepare(`SELECT COUNT(*) as count FROM scheduled_posts`).get();
  const published = db.prepare(`SELECT COUNT(*) as count FROM scheduled_posts WHERE status='PUBLISHED'`).get();
  const ideas_viewed = db.prepare(`SELECT COUNT(*) as count FROM analytics_events WHERE event='ideas_viewed'`).get();
  const viral_analyses = db.prepare(`SELECT COUNT(*) as count FROM analytics_events WHERE event='viral_analyzed'`).get();
  const platforms = db.prepare(`
    SELECT platform, COUNT(*) as count 
    FROM scheduled_posts 
    GROUP BY platform 
    ORDER BY count DESC
  `).all();
  const recent_events = db.prepare(`
    SELECT event, created_at FROM analytics_events 
    ORDER BY created_at DESC LIMIT 10
  `).all();

  return res.json({
    data: {
      remixes: remixes.count,
      schedules: schedules.count,
      published: published.count,
      ideas_viewed: ideas_viewed.count,
      viral_analyses: viral_analyses.count,
      platforms,
      recent_events,
    }
  });
});

// Track analytics events
app.post('/api/analytics/event', (req, res) => {
  const { event, metadata } = req.body;
  if (!event) return res.status(400).json({ error: 'event required' });
  db.prepare(`INSERT INTO analytics_events (event, metadata) VALUES (?, ?)`).run(
    event, metadata ? JSON.stringify(metadata) : null
  );
  return res.json({ success: true });
});

// ─── SCHEDULER AUTOMATION ────────────────────────────────────────────────────
// This runs every minute to check for posts due to publish
// In Blotato style: simulates posting (updates status to PUBLISHED with a delay)
const runScheduler = () => {
  const now = new Date().toISOString();
  const duePosts = db.prepare(`
    SELECT * FROM scheduled_posts 
    WHERE status='SCHEDULED' AND scheduled_at <= ?
  `).all(now);

  for (const post of duePosts) {
    console.log(`[SCHEDULER] Publishing post #${post.id} to ${post.platform}...`);

    // Mark as PUBLISHING
    db.prepare(`UPDATE scheduled_posts SET status='PUBLISHING' WHERE id=?`).run(post.id);

    // Simulate platform API call (2-5 second delay)
    setTimeout(() => {
      const success = Math.random() > 0.05; // 95% success rate simulation

      if (success) {
        db.prepare(`
          UPDATE scheduled_posts 
          SET status='PUBLISHED', published_at=datetime('now')
          WHERE id=?
        `).run(post.id);
        db.prepare(`INSERT INTO analytics_events (event, metadata) VALUES ('post_published', ?)`).run(
          JSON.stringify({ platform: post.platform, post_id: post.id })
        );
        console.log(`[SCHEDULER] ✓ Post #${post.id} published to ${post.platform}`);
      } else {
        db.prepare(`
          UPDATE scheduled_posts 
          SET status='FAILED', error_message='Platform API timeout. Please retry.'
          WHERE id=?
        `).run(post.id);
        console.log(`[SCHEDULER] ✗ Post #${post.id} failed`);
      }
    }, 2000 + Math.random() * 3000);
  }
};

// Run scheduler every 60 seconds
setInterval(runScheduler, 60 * 1000);
runScheduler(); // Run immediately on start

// ─── THUMBNAIL HISTORY ROUTES ────────────────────────────────────────────────
// GET last 20 thumbnails
app.get('/api/thumbnails', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM thumbnail_history ORDER BY created_at DESC LIMIT 20`).all();
  return res.json({ data: rows });
});

// POST create thumbnail history entry
app.post('/api/thumbnails', (req, res) => {
  const { hookText, template, ctrScore, imageUrl } = req.body;
  if (!hookText || !template) {
    return res.status(400).json({ error: 'hookText and template are required' });
  }
  const result = db.prepare(
    `INSERT INTO thumbnail_history (hook_text, template, ctr_score, image_url) VALUES (?, ?, ?, ?)`
  ).run(hookText, template, ctrScore ?? 0, imageUrl ?? null);
  return res.status(201).json({ data: { id: result.lastInsertRowid } });
});

// DELETE remove a thumbnail history entry
app.delete('/api/thumbnails/:id', (req, res) => {
  const { id } = req.params;
  db.prepare(`DELETE FROM thumbnail_history WHERE id = ?`).run(id);
  return res.json({ success: true });
});

// ─── GEMINI FILE API PROXY ───────────────────────────────────────────────────
// POST /api/upload-video  — proxies audio/video to Google File API
app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  try {
    const apiKey = (req.headers.authorization || '').replace('Bearer ', '');
    if (!apiKey) return res.status(401).json({ error: 'Missing API key' });
    if (!req.file)  return res.status(400).json({ error: 'No file uploaded' });

    const { buffer, mimetype, originalname } = req.file;
    // Sanitize user-supplied fields before embedding in multipart body strings
    const safeMime = (mimetype || 'application/octet-stream').replace(/[^\w\-\/+.]/g, '');
    const displayName = (originalname || 'audio_upload').replace(/[^\w\-_.]/g, '_').substring(0, 200);

    // Step 1: Initiate resumable upload
    const initRes = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'multipart',
          'Content-Type': `multipart/related; boundary=boundary_createrin`,
        },
        body: Buffer.concat([
          Buffer.from(
            `--boundary_createrin\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
            `{"file":{"displayName":"${displayName}"}}\r\n--boundary_createrin\r\nContent-Type: ${safeMime}\r\n\r\n`
          ),
          buffer,
          Buffer.from('\r\n--boundary_createrin--')
        ])
      }
    );

    if (!initRes.ok) {
      const errText = await initRes.text();
      console.error('[UPLOAD] File API error:', errText);
      return res.status(500).json({ error: 'File API upload failed', detail: errText });
    }

    const data = await initRes.json();
    const fileUri  = data?.file?.uri;
    const fileName = data?.file?.name;

    if (!fileUri) {
      return res.status(500).json({ error: 'No URI returned from File API', data });
    }

    console.log(`[UPLOAD] ✓ File uploaded: ${fileName}`);
    return res.json({ fileUri, fileName });
  } catch (err) {
    console.error('[UPLOAD] Unexpected error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// POST /api/delete-video — deletes file from Google File API after use
app.post('/api/delete-video', async (req, res) => {
  try {
    const apiKey = (req.headers.authorization || '').replace('Bearer ', '');
    const { fileName } = req.body;
    if (!apiKey || !fileName) return res.status(400).json({ error: 'apiKey and fileName required' });

    const delRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`,
      { method: 'DELETE' }
    );
    console.log(`[CLEANUP] File ${fileName} deleted:`, delRes.status);
    return res.json({ success: true });
  } catch (err) {
    console.error('[CLEANUP] Error:', err);
    return res.json({ success: false });
  }
});

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const dbStatus = db.prepare(`SELECT 1 as ok`).get();
  return res.json({
    status: 'ok',
    db: dbStatus ? 'connected' : 'error',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── START SERVER ────────────────────────────────────────────────────────────
const server = createServer(app);
server.listen(PORT, () => {
  console.log(`\n🚀 Createrin Backend running on http://localhost:${PORT}`);
  console.log(`📦 Database: ${DB_PATH}`);
  console.log(`⏰ Scheduler: Active (checks every 60s)\n`);
});

export default app;
