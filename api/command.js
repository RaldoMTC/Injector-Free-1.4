import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

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
    const { deviceId, command, args = {} } = req.body;
    
    if (!deviceId || !command) {
      return res.status(400).json({ error: 'Device ID and command required' });
    }

    // Cek apakah bot ada
    const botExists = await kv.hexists(`bot:${deviceId}`, 'id');
    if (!botExists) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    // Buat command object
    const cmdData = {
      id: uuidv4(),
      command,
      args,
      timestamp: Date.now(),
      from: req.headers['x-admin-id'] || 'unknown'
    };

    // Simpan ke queue bot
    await kv.rpush(`cmd:${deviceId}`, JSON.stringify(cmdData));
    
    // Simpan ke history global
    await kv.lpush('commands:all', JSON.stringify({
      ...cmdData,
      deviceId,
      status: 'queued'
    }));

    console.log(`📤 Command sent to ${deviceId}: ${command}`);

    res.json({ 
      success: true, 
      message: 'Command queued successfully',
      commandId: cmdData.id
    });

  } catch (error) {
    console.error('Command error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
