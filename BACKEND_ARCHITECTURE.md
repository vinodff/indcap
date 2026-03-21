# CapGen AI - Backend Architecture Specification

## 1. High-Level Architecture

The system is designed to be **Hybrid**:
- **Draft/Preview:** Client-side (React + Canvas) for zero-latency feedback and zero server cost.
- **Final Export:** Server-side (FFmpeg Workers) for consistent high-quality rendering, or Client-side (MediaRecorder) for cost efficiency on lower tiers.

### System Diagram

```mermaid
graph TD
    Client[React Client] -->|Upload Video| S3[Object Storage (S3)]
    Client -->|API Requests| LB[Load Balancer]
    LB --> API[Node.js API Service]
    
    API -->|Auth/Data| DB[(PostgreSQL)]
    API -->|Cache/PubSub| Redis[(Redis)]
    
    subgraph "Async Processing Pipeline"
        API -->|Push Job| Queue[Job Queue (BullMQ/SQS)]
        Queue --> Worker[Python/FFmpeg Worker Cluster]
        Worker -->|Fetch Video| S3
        Worker -->|Call AI| Gemini[Google Gemini API]
        Worker -->|Update Status| Redis
        Worker -->|Save Result| S3
    end
```

## 2. Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **API Server** | **Node.js (NestJS)** | Strong typing, excellent async handling for uploads, shared types with frontend. |
| **Workers** | **Python** | Best ecosystem for video (MoviePy, FFmpeg bindings) and AI integration. |
| **Queue** | **BullMQ (Redis)** | Reliable, supports priorities (paid users first), easy to self-host or scale. |
| **Database** | **PostgreSQL** | Relational integrity for Users, Projects, and Billing. |
| **Storage** | **AWS S3 / R2** | Cheap, reliable storage for large video files. |
| **Transcoding** | **FFmpeg** | Industry standard for video manipulation and subtitle burning. |

## 3. Database Schema

### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary Key |
| email | varchar | Unique |
| tier | enum | 'FREE', 'PRO', 'ENTERPRISE' |
| credits | int | Monthly rendering credits |

### `projects`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary Key |
| user_id | uuid | FK -> users.id |
| source_url | varchar | S3 URL of original video |
| status | enum | 'UPLOADING', 'PROCESSING', 'READY', 'RENDERING', 'FAILED' |
| created_at | timestamp | |

### `captions`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary Key |
| project_id | uuid | FK -> projects.id |
| start_ms | int | Start time in milliseconds |
| end_ms | int | End time in milliseconds |
| text | text | The caption content |
| meta | jsonb | Style overrides, confidence scores |

### `renders`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary Key |
| project_id | uuid | FK -> projects.id |
| output_url | varchar | S3 URL of final video |
| format | varchar | 'mp4', 'webm' |
| resolution | varchar | '720p', '1080p' |
| duration_ms | int | Processing time taken |

## 4. API Specification

### Authentication
Standard JWT (Access Token + Refresh Token).

### Endpoints

#### `POST /v1/projects/upload`
Initiates a multipart upload or returns a Presigned S3 URL (better for large files).
**Response:** `{ uploadUrl: string, projectId: string }`

#### `POST /v1/projects/:id/transcribe`
Triggers the AI transcription process.
**Body:** `{ language: 'auto' | 'hi' | 'ta' | 'te' }`
**Action:** Pushes job to `transcription_queue`.

#### `GET /v1/projects/:id`
Polls for status and returns captions when ready.
**Response:** `{ status: 'READY', captions: [...] }`

#### `POST /v1/projects/:id/render`
Submits a render job with the final edited captions and selected style.
**Body:**
```json
{
  "styleConfig": { "font": "Montserrat", "color": "#FF0000", ... },
  "captions": [...], // User might have edited text, so we send current state
  "resolution": "1080p"
}
```
**Action:** Pushes job to `render_queue`.

## 5. Queue Strategy & Scaling

### Priority Queues
1.  **High Priority:** 'PRO' users. Processed immediately.
2.  **Standard Priority:** 'FREE' users. Processed when resources permit.

### Worker Scaling (KEDA)
- **Metric:** Queue depth (number of waiting jobs).
- **Scale Out:** If queue depth > 10, spawn new Worker Pods (Kubernetes) or EC2 Spot Instances.
- **Scale In:** If queue empty for 5 min, terminate instances to save cost.

### Temporary Storage Strategy
- **Raw Uploads:** Lifecycle policy to delete after 24 hours (if project not saved).
- **Render Artifacts:** Stored in `/tmp` on worker, deleted immediately after S3 upload.

## 6. Security Measures

1.  **Rate Limiting:** Redis-based sliding window (e.g., 5 uploads/hour for Free tier).
2.  **File Validation:** 
    - Check "Magic Bytes" to ensure file is actually video (not renamed .exe).
    - Max duration check (using `ffprobe` on upload completion).
3.  **Sanitization:** All caption text input sanitized to prevent XSS if rendered in HTML views, though backend uses FFmpeg (safe from XSS, but sensitive to command injection).
    - **Mitigation:** Use parameter binding in FFmpeg libraries, never string concatenation for shell commands.
