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

let createImageAssetOrchestrator = null;

// Try to import the orchestrator, but fail gracefully if not available
try {
  const module = await import('../services/imageAssets.js');
  createImageAssetOrchestrator = module.createImageAssetOrchestrator;
} catch (err) {
  console.warn('[imageAssets] Orchestrator not available:', err.message);
}

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
    // Check if orchestrator is available
    if (!createImageAssetOrchestrator) {
      return res.status(503).json({
        success: false,
        error: 'Image asset system not available. Please configure environment variables.',
        imagesCount: 0,
        reelWithImages: {
          imageAssets: [],
          overallImageCoverage: 0,
        },
      });
    }

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

/**
 * GET /api/imageAssets/search
 *
 * Proxy endpoint to query Google Custom Search API for content-relevant images.
 *
 * Query params:
 *   q: search query string
 *
 * Response:
 *   {
 *     "success": true,
 *     "items": [
 *       { "link": "https://..." }
 *     ]
 *   }
 */
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter q is required',
      });
    }

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !cx) {
      console.warn('[imageAssets] GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID not configured on backend.');
      return res.status(503).json({
        success: false,
        error: 'Google Search API keys are not configured on the server.',
      });
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&searchType=image&num=5`;
    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Search API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const items = (data.items || []).map(item => ({
      link: item.link
    }));

    return res.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error('[imageAssets] Search error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;
