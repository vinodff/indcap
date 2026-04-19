/** Threads Connector — Meta Threads API (same as Instagram Business). */
export default {
  name: 'threads', displayName: 'Threads', color: '#101010',
  gradient: 'linear-gradient(135deg, #101010, #434343)', icon: '🧵',
  supportsVideo: false, supportsImage: true, supportsText: true,
  maxCaptionLength: 500, available: true,
  envKeys: ['INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET'],

  getAuthUrl(clientId, redirectUri) {
    return `https://threads.net/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=threads_basic,threads_content_publish&response_type=code`;
  },
  async exchangeCode(code, clientId, clientSecret, redirectUri) {
    const res = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_message || data.error);
    return { accessToken: data.access_token, userId: data.user_id };
  },
  async publish(accessToken, { caption, userId, mediaUrl }) {
    if (!accessToken || accessToken.startsWith('sim_')) return { simulated: true, postId: `th_sim_${Date.now()}` };
    const uid   = userId || 'me';
    const cRes  = await fetch(`https://graph.threads.net/v1.0/${uid}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_type: mediaUrl ? 'IMAGE' : 'TEXT', text: caption, image_url: mediaUrl, access_token: accessToken }),
    });
    const c = await cRes.json();
    if (c.error) throw new Error(c.error.message);
    const pRes = await fetch(`https://graph.threads.net/v1.0/${uid}/threads_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: c.id, access_token: accessToken }),
    });
    const p = await pRes.json();
    return { postId: p.id };
  },
};
