import { Redis } from '@upstash/redis';

/**
 * Dynamically resolves Redis credentials, supporting any Custom Prefix configured in Vercel.
 * Examples:
 *   Default: KV_REST_API_URL, KV_REST_API_TOKEN
 *   Custom:  OFFICE_DB_REST_API_URL, MY_TEAM_REST_API_URL, etc.
 */
function getRedisCredentials() {
  // 1. Check standard Vercel KV and Upstash names
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return { url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN };
  }
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN };
  }

  // 2. Auto-discover custom prefix from process.env
  const envKeys = Object.keys(process.env);
  const urlKey = envKeys.find((k) => k.endsWith('_REST_API_URL') || k.includes('REDIS_REST_URL'));
  const tokenKey = envKeys.find((k) => k.endsWith('_REST_API_TOKEN') || k.includes('REDIS_REST_TOKEN'));

  if (urlKey && tokenKey && process.env[urlKey] && process.env[tokenKey]) {
    return { url: process.env[urlKey], token: process.env[tokenKey] };
  }

  return { url: null, token: null };
}

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

  const { url, token } = getRedisCredentials();

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
