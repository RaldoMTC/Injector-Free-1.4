import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { deviceId, model, brand, android, sdk } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID required' });
    }

    // Simpan bot info ke Vercel KV
    const botData = {
      id: deviceId,
      model: model || 'Unknown',
      brand: brand || 'Unknown',
      android: android || 'Unknown',
      sdk: sdk || 0,
      lastSeen: Date.now(),
      online: true,
      registeredAt: Date.now()
    };

    await kv.hset(`bot:${deviceId}`, botData);
    await kv.sadd('bots', deviceId);
    
    // Simpan juga ke list untuk history
    await kv.lpush('bots:history', JSON.stringify({
      ...botData,
      action: 'register'
    }));

    console.log(`✅ Bot registered: ${deviceId} - ${model}`);
    
    res.json({ 
      success: true, 
      message: 'Bot registered successfully',
      id: deviceId
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
