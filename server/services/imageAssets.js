/**
 * Image Assets Service Wrapper
 *
 * Re-exports the image asset orchestrator from the main services directory.
 * This allows the Express server to import and use the image asset system,
 * which requires Node.js modules (fs, path, crypto).
 */

// Import from the main services directory (one level up)
export { createImageAssetOrchestrator } from '../../services/imageAssets/index.js';
export { ImageAssetOrchestrator } from '../../services/imageAssets/orchestrator.js';
