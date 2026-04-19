/** TikTok Connector — TikTok Content Posting API. Requires business approval. */
export default {
  name: 'tiktok', displayName: 'TikTok', color: '#010101',
  gradient: 'linear-gradient(135deg, #010101, #fe2c55)',
  icon: '🎵', supportsVideo: true, supportsImage: false, supportsText: false,
  maxCaptionLength: 2200, available: false, comingSoon: true,
  comingSoonReason: 'TikTok Content Posting API requires business app approval.',
  envKeys: ['TIKTOK_CLIENT_ID', 'TIKTOK_CLIENT_SECRET'],

  getAuthUrl() { return '#'; },
  async exchangeCode() { return { accessToken: 'sim_tiktok' }; },
  async publish() { return { simulated: true, postId: `tt_sim_${Date.now()}` }; },
};
