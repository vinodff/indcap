/**
 * Twitter / X Platform Connector
 * Uses Twitter API v2
 * Env: TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET
 */

export default {
  name: 'twitter',
  displayName: 'Twitter / X',
  color: '#1DA1F2',
  gradient: 'linear-gradient(135deg, #1DA1F2, #0a85c9)',
  icon: '🐦',
  supportsVideo: true,
  supportsImage: true,
  supportsText: true,
  maxCaptionLength: 280,
  available: true,
  envKeys: ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET'],

  getAuthUrl(clientId, redirectUri) {
    const scopes = encodeURIComponent('tweet.read tweet.write users.read offline.access media.write');
    const state  = btoa(Math.random().toString()).slice(0, 16);
    return `https://twitter.com/i/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
  },

  async exchangeCode(code, clientId, clientSecret, redirectUri) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ code, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: 'challenge' }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
  },

  async publish(accessToken, { caption, mediaId }) {
    if (!accessToken || accessToken.startsWith('sim_')) {
      return { simulated: true, postId: `tw_sim_${Date.now()}` };
    }
    const body = { text: caption.substring(0, 280) };
    if (mediaId) body.media = { media_ids: [mediaId] };
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.errors) throw new Error(data.errors[0]?.message);
    return { postId: data.data?.id };
  },
};
