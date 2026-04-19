/** Facebook Connector — Meta Graph API (Pages). Same dev app as Instagram. */
export default {
  name: 'facebook', displayName: 'Facebook', color: '#1877F2',
  gradient: 'linear-gradient(135deg, #1877F2, #0d5ed9)', icon: '📘',
  supportsVideo: true, supportsImage: true, supportsText: true,
  maxCaptionLength: 63206, available: true,
  envKeys: ['INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET'], // same Meta app

  getAuthUrl(clientId, redirectUri) {
    return `https://www.facebook.com/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=pages_manage_posts,pages_read_engagement&response_type=code`;
  },
  async exchangeCode(code, clientId, clientSecret, redirectUri) {
    const res  = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { accessToken: data.access_token };
  },
  async publish(accessToken, { caption, mediaUrl }) {
    if (!accessToken || accessToken.startsWith('sim_')) return { simulated: true, postId: `fb_sim_${Date.now()}` };
    const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`);
    const pages    = await pagesRes.json();
    const page     = pages.data?.[0];
    if (!page) throw new Error('No Facebook Page found');
    const endpoint = mediaUrl ? 'videos' : 'feed';
    const body     = mediaUrl ? { file_url: mediaUrl, description: caption } : { message: caption };
    const res = await fetch(`https://graph.facebook.com/v18.0/${page.id}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, access_token: page.access_token }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { postId: data.id };
  },
};
