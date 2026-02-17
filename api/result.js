import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { deviceId, command, result, status, timestamp } = req.body;
    
    if (!deviceId || !command) {
      return res.status(400).json({ error: 'Device ID and command required' });
    }

    // Simpan hasil ke history
    const resultData = {
      deviceId,
      command,
      result,
      status: status || 'success',
      timestamp: timestamp || Date.now()
    };

    await kv.lpush(`results:${deviceId}`, JSON.stringify(resultData));
    await kv.lpush('results:all', JSON.stringify(resultData));
    
    // Update bot status
    await kv.hset(`bot:${deviceId}`, { 
      lastSeen: Date.now(),
      online: true 
    });

    console.log(`📩 Result from ${deviceId}: ${command}`);

    res.json({ success: true });

  } catch (error) {
    console.error('Result error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
