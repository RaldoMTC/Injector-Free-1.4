import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ambil semua bot IDs
    const botIds = await kv.smembers('bots') || [];
    const bots = [];

    for (const id of botIds) {
      const bot = await kv.hgetall(`bot:${id}`);
      if (bot) {
        // Cek apakah online (lastSeen < 5 menit)
        const online = (Date.now() - (bot.lastSeen || 0)) < 300000;
        bots.push({
          ...bot,
          online,
          lastSeen: bot.lastSeen || 0
        });
      }
    }

    // Sort by lastSeen descending
    bots.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));

    res.json(bots);

  } catch (error) {
    console.error('Get bots error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
