import { Redis } from '@upstash/redis';

/**
 * Serverless Function to interact with Free Vercel KV / Upstash Redis Database
 * Key: "office_teams_v1"
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Read standard Vercel KV or Upstash environment variables
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(200).json({
      connected: false,
      source: 'local_fallback',
      message: 'Vercel KV credentials not set. Connect free Vercel KV or Upstash storage in Vercel project settings.',
      teams: null,
    });
  }

  try {
    const redis = new Redis({ url, token });

    if (req.method === 'GET') {
      const data = await redis.get('office_teams_v1');
      const teams = data ? (typeof data === 'string' ? JSON.parse(data) : data) : [];
      return res.status(200).json({
        connected: true,
        source: 'vercel_kv',
        teams,
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const teams = body?.teams || [];
      await redis.set('office_teams_v1', JSON.stringify(teams));
      return res.status(200).json({
        connected: true,
        success: true,
        count: teams.length,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Vercel KV Error:', error);
    return res.status(500).json({
      connected: false,
      error: error.message,
    });
  }
}
