/** Bluesky Connector — AT Protocol / app password auth. No OAuth required! */
export default {
  name: 'bluesky', displayName: 'Bluesky', color: '#0085ff',
  gradient: 'linear-gradient(135deg, #0085ff, #0060cc)', icon: '🦋',
  supportsVideo: false, supportsImage: true, supportsText: true,
  maxCaptionLength: 300, available: true,
  envKeys: [], // Uses handle + app password, no OAuth

  getAuthUrl() { return 'bluesky_app_password'; }, // Special: no standard OAuth

  async exchangeCode(handle, _unused, appPassword) {
    // Bluesky uses app passwords — no OAuth code exchange
    const res = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password: appPassword }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.message);
    return { accessToken: data.accessJwt, did: data.did };
  },

  async publish(accessToken, { caption, did }) {
    if (!accessToken || accessToken.startsWith('sim_')) return { simulated: true, postId: `bsky_sim_${Date.now()}` };
    const res = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: did,
        collection: 'app.bsky.feed.post',
        record: { text: caption.substring(0, 300), createdAt: new Date().toISOString(), '$type': 'app.bsky.feed.post' },
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.message);
    return { postId: data.uri };
  },
};
