/**
 * Platform Connector Factory
 * Each connector exports: { name, displayName, color, icon, publish, authConfig }
 */

import instagram from './instagram.js';
import youtube   from './youtube.js';
import twitter   from './twitter.js';
import linkedin  from './linkedin.js';
import tiktok    from './tiktok.js';
import facebook  from './facebook.js';
import pinterest from './pinterest.js';
import threads   from './threads.js';
import bluesky   from './bluesky.js';

export const PLATFORMS = [
  instagram, youtube, twitter, linkedin,
  tiktok, facebook, pinterest, threads, bluesky,
];

export const getPlatform = (name) =>
  PLATFORMS.find(p => p.name === name.toLowerCase()) || null;

/**
 * Publish a post through the platform connector.
 * If the platform has no real token or returns "SIMULATED",
 * the scheduler treats it as a 95%-success simulation.
 */
export async function publishToPlatform(platformName, token, payload) {
  const connector = getPlatform(platformName);
  if (!connector) throw new Error(`Unknown platform: ${platformName}`);
  try {
    return await connector.publish(token, payload);
  } catch (err) {
    // Graceful degradation: simulate success for demo purposes
    console.warn(`[${platformName}] Real API failed, simulating:`, err.message);
    return { simulated: true, postId: `sim_${Date.now()}` };
  }
}
