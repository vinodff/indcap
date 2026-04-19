/**
 * YouTube Platform Connector
 * Uses YouTube Data API v3
 * Env: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET
 */

export default {
  name: 'youtube',
  displayName: 'YouTube',
  color: '#FF0000',
  gradient: 'linear-gradient(135deg, #FF0000, #CC0000)',
  icon: '▶️',
  supportsVideo: true,
  supportsImage: false,
  supportsText: false,
  maxCaptionLength: 5000,
  available: true,
  envKeys: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],

  getAuthUrl(clientId, redirectUri) {
    const scopes = encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube');
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&access_type=offline`;
  },

  async exchangeCode(code, clientId, clientSecret, redirectUri) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
  },

  async publish(accessToken, { mediaUrl, caption, title = 'New Video from Createrin' }) {
    if (!accessToken || accessToken.startsWith('sim_')) {
      return { simulated: true, postId: `yt_sim_${Date.now()}` };
    }
    // Upload via resumable upload — simplified
    const metaRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/*',
      },
      body: JSON.stringify({
        snippet:  { title: title.substring(0, 100), description: caption, categoryId: '22' },
        status:   { privacyStatus: 'public' },
      }),
    });
    const uploadUri = metaRes.headers.get('location');
    if (!uploadUri) throw new Error('Failed to get YouTube upload URI');
    // Note: actual file upload requires streaming — simulated here
    return { simulated: true, postId: `yt_queued_${Date.now()}`, uploadUri };
  },
};
