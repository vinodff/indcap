/** Pinterest Connector — Pinterest API v5. */
export default {
  name: 'pinterest', displayName: 'Pinterest', color: '#E60023',
  gradient: 'linear-gradient(135deg, #E60023, #ad081b)', icon: '📌',
  supportsVideo: false, supportsImage: true, supportsText: true,
  maxCaptionLength: 500, available: true,
  envKeys: ['PINTEREST_CLIENT_ID', 'PINTEREST_CLIENT_SECRET'],

  getAuthUrl(clientId, redirectUri) {
    return `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=boards:read,pins:write`;
  },
  async exchangeCode(code, clientId, clientSecret, redirectUri) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const data = await res.json();
    if (data.code) throw new Error(data.message);
    return { accessToken: data.access_token };
  },
  async publish(accessToken, { caption, mediaUrl, boardId }) {
    if (!accessToken || accessToken.startsWith('sim_')) return { simulated: true, postId: `pin_sim_${Date.now()}` };
    const res = await fetch('https://api.pinterest.com/v5/pins', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ board_id: boardId, title: caption.substring(0, 100), description: caption, media_source: { source_type: 'image_url', url: mediaUrl } }),
    });
    const data = await res.json();
    return { postId: data.id };
  },
};
