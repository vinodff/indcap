/**
 * Image Assets API Endpoint
 *
 * Handles intelligent image extraction, searching, processing, and storage
 * for typography reels. This endpoint wraps the image asset orchestrator
 * which requires Node.js modules (fs, path, crypto).
 *
 * Runs only on the backend to avoid browser compatibility issues.
 */

import express from 'express';
import {
  createImageAssetOrchestrator,
} from '../services/imageAssets.js';

const router = express.Router();

/**
 * POST /api/imageAssets/process
 *
 * Process transcript and animation sequence to extract and integrate images
 *
 * Request body:
 * {
 *   "transcriptText": "The audio transcript...",
 *   "animationSequence": { AnimationSequence object }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "reelWithImages": { TypographyReelWithImages object },
 *   "coverage": 45.5,  // percentage of words with images
 *   "imagesCount": 3
 * }
 */
router.post('/process', async (req, res) => {
  try {
    const { transcriptText, animationSequence } = req.body;

    if (!transcriptText || !animationSequence) {
      return res.status(400).json({
        success: false,
        error: 'Missing transcriptText or animationSequence',
      });
    }

    // Validate animation sequence structure
    if (!animationSequence.id || !Array.isArray(animationSequence.animations)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid animationSequence structure',
      });
    }

    // Create orchestrator with environment configuration
    const orchestrator = createImageAssetOrchestrator();

    // Process transcript and generate images
    const reelWithImages = await orchestrator.processTranscriptForImages(
      transcriptText,
      animationSequence
    );

    return res.json({
      success: true,
      reelWithImages,
      coverage: reelWithImages.overallImageCoverage,
      imagesCount: reelWithImages.imageAssets.length,
    });
  } catch (error) {
    console.error('[imageAssets] API error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/imageAssets/stats
 *
 * Get current storage statistics (total assets, storage usage, etc.)
 */
router.get('/stats', (req, res) => {
  try {
    const orchestrator = createImageAssetOrchestrator();
    const stats = orchestrator.getStorageStats();

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[imageAssets] Stats error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/imageAssets/clear
 *
 * Clear all stored image assets (for reset/testing)
 */
router.post('/clear', (req, res) => {
  try {
    const orchestrator = createImageAssetOrchestrator();
    orchestrator.clearStorage();

    return res.json({
      success: true,
      message: 'All image assets cleared',
    });
  } catch (error) {
    console.error('[imageAssets] Clear error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;
