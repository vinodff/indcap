/** LinkedIn Connector — LinkedIn API v2. Env: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET */
export default {
  name: 'linkedin', displayName: 'LinkedIn', color: '#0077B5',
  gradient: 'linear-gradient(135deg, #0077B5, #005885)', icon: '💼',
  supportsVideo: true, supportsImage: true, supportsText: true,
  maxCaptionLength: 3000, available: true,
  envKeys: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],

  getAuthUrl(clientId, redirectUri) {
    return `https://www.linkedin.com/oauth/v2/authorization?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=r_liteprofile+w_member_social&response_type=code`;
  },

  async exchangeCode(code, clientId, clientSecret, redirectUri) {
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description);
    return { accessToken: data.access_token };
  },

  async publish(accessToken, { caption }) {
    if (!accessToken || accessToken.startsWith('sim_')) return { simulated: true, postId: `li_sim_${Date.now()}` };
    const meRes = await fetch('https://api.linkedin.com/v2/me', { headers: { Authorization: `Bearer ${accessToken}` } });
    const me    = await meRes.json();
    const urn   = `urn:li:person:${me.id}`;
    const res   = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: urn, lifecycleState: 'PUBLISHED', specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text: caption }, shareMediaCategory: 'NONE' } }, visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' } }),
    });
    const data = await res.json();
    return { postId: data.id };
  },
};
