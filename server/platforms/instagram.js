/**
 * Instagram Platform Connector
 * Uses Meta Graph API — requires Instagram Business/Creator account
 * Env: INSTAGRAM_CLIENT_ID, INSTAGRAM_CLIENT_SECRET
 */

export default {
  name: 'instagram',
  displayName: 'Instagram',
  color: '#E1306C',
  gradient: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
  icon: '📷',
  supportsVideo: true,
  supportsImage: true,
  supportsText: false,
  maxCaptionLength: 2200,
  available: true,
  envKeys: ['INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET'],

  getAuthUrl(clientId, redirectUri) {
    const scopes = 'instagram_basic,instagram_content_publish,pages_show_list';
    return `https://www.facebook.com/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;
  },

  async exchangeCode(code, clientId, clientSecret, redirectUri) {
    const url = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { accessToken: data.access_token, expiresIn: data.expires_in };
  },

  async publish(accessToken, { mediaUrl, caption, isVideo = true }) {
    if (!accessToken || accessToken.startsWith('sim_')) {
      return { simulated: true, postId: `ig_sim_${Date.now()}` };
    }
    // Get IG user id
    const meRes  = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`);
    const meData = await meRes.json();
    const pageId = meData.data?.[0]?.id;
    if (!pageId) throw new Error('No Facebook Page connected to this account');

    // Create media container
    const containerRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        [isVideo ? 'video_url' : 'image_url']: mediaUrl,
        caption,
        access_token: accessToken,
      }),
    });
    const container = await containerRes.json();
    if (container.error) throw new Error(container.error.message);

    // Publish
    const publishRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
    });
    const published = await publishRes.json();
    if (published.error) throw new Error(published.error.message);
    return { postId: published.id };
  },
};
