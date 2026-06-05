import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

let faceDetector: FaceDetector | null = null;
let isInitializing = false;

/**
 * Initialize MediaPipe face detector with model asset loaded from CDN.
 */
export async function initFaceDetector(): Promise<FaceDetector | null> {
  if (faceDetector) return faceDetector;
  if (isInitializing) return null;

  isInitializing = true;
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
    );
    faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
    });
    console.log('✅ MediaPipe FaceDetector initialized');
    return faceDetector;
  } catch (e) {
    console.error('❌ Failed to initialize MediaPipe FaceDetector:', e);
    return null;
  } finally {
    isInitializing = false;
  }
}

/**
 * Detects face in a video frame and returns the safe Y bounds (0-100) where captions won't cover a face.
 * Returns null if no face is detected.
 */
export function detectSafeZone(
  video: HTMLVideoElement,
  timestamp: number
): { min: number; max: number } | null {
  if (!faceDetector) return null;

  try {
    const result = faceDetector.detectForVideo(video, timestamp);
    if (!result.detections || result.detections.length === 0) return null;

    // Find the largest detected face (likely the main speaker)
    const mainFace = result.detections.reduce((best, d) => {
      const area = (d.boundingBox?.width || 0) * (d.boundingBox?.height || 0);
      const bestArea = (best.boundingBox?.width || 0) * (best.boundingBox?.height || 0);
      return area > bestArea ? d : best;
    });

    const bbox = mainFace.boundingBox;
    if (!bbox) return null;

    // Convert face top and bottom to percentage (0 to 100)
    const faceTop = (bbox.originY / video.videoHeight) * 100;
    const faceBottom = ((bbox.originY + bbox.height) / video.videoHeight) * 100;

    // If face is in lower half (e.g. bottom half), safe Y is in the top zone
    if (faceTop > 50) {
      return { min: 10, max: Math.max(15, faceTop - 8) };
    } else {
      // Face is in upper half (normal talking head), safe Y is in the bottom zone
      return { min: Math.min(85, faceBottom + 8), max: 90 };
    }
  } catch (e) {
    console.warn('Face detection error:', e);
    return null;
  }
}
