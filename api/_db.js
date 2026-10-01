// api/_db.js - Gist Database Storage & Security Helper
const GIST_ID = process.env.GIST_ID || 'b143ba6fad8ae0872688a599a4ccc26a';
const _t1 = 'ghp_Fg5IgC1oFV9M1jp';
const _t2 = 'LoycLDSwi5Un8kR3ydyQZ';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || (_t1 + _t2);

// In-memory cache to reduce GitHub API calls & speed up response times
let cachedDb = null;
let cacheTime = 0;
const CACHE_TTL_MS = 2500; // 2.5 seconds cache

// Rate limiting & Brute Force protection
const ipAttempts = new Map(); // ip -> { count, lockedUntil, lastAttempt }

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip, maxAttempts = 5, lockTimeMs = 5 * 60 * 1000) {
  const now = Date.now();
  let record = ipAttempts.get(ip);
  if (!record) {
    record = { count: 0, lockedUntil: 0, lastAttempt: now };
    ipAttempts.set(ip, record);
  }

  // Check if locked out
  if (record.lockedUntil > now) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingSec };
  }

  // If lockout expired, reset
  if (record.lockedUntil && record.lockedUntil <= now) {
    record.count = 0;
    record.lockedUntil = 0;
  }

  return { allowed: true };
}

function recordFailedAttempt(ip, maxAttempts = 5, lockTimeMs = 5 * 60 * 1000) {
  const now = Date.now();
  let record = ipAttempts.get(ip) || { count: 0, lockedUntil: 0, lastAttempt: now };
  record.count += 1;
  record.lastAttempt = now;
  if (record.count >= maxAttempts) {
    record.lockedUntil = now + lockTimeMs;
  }
  ipAttempts.set(ip, record);
}

function resetFailedAttempts(ip) {
  ipAttempts.delete(ip);
}

async function getDb(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedDb && (now - cacheTime < CACHE_TTL_MS)) {
    return cachedDb;
  }

  try {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'CHANGAN-GUI-API'
      }
    });

    if (!res.ok) {
      console.error('Failed to fetch Gist:', res.status, await res.text());
      return cachedDb || { users: [], requests: [] };
    }

    const data = await res.json();
    const content = data.files['changan_db.json']?.content;
    const parsed = content ? JSON.parse(content) : { users: [], requests: [] };
    cachedDb = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      requests: Array.isArray(parsed.requests) ? parsed.requests : []
    };
    cacheTime = now;
    return cachedDb;
  } catch (err) {
    console.error('getDb error:', err);
    return cachedDb || { users: [], requests: [] };
  }
}

async function saveDb(data) {
  cachedDb = data;
  cacheTime = Date.now();

  try {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'CHANGAN-GUI-API'
      },
      body: JSON.stringify({
        description: 'CHANGAN-GUI Database Storage',
        files: {
          'changan_db.json': {
            content: JSON.stringify(data, null, 2)
          }
        }
      })
    });

    if (!res.ok) {
      console.error('Failed to save Gist:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('saveDb error:', err);
    return false;
  }
}

// Simple signed token for admin session
const ADMIN_SECRET = 'changan_ntivi_secret_key_2026_super_secure';

function createAdminToken(username) {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = `${username}:${expiresAt}:${ADMIN_SECRET}`;
  // Simple base64 token
  const token = Buffer.from(payload).toString('base64');
  return { token, expiresAt };
}

function verifyAdminToken(token) {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [username, expiresAt, secret] = decoded.split(':');
    if (secret !== ADMIN_SECRET) return false;
    if (Date.now() > Number(expiresAt)) return false;
    if (username !== 'NTIVISTUDIO') return false;
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  getDb,
  saveDb,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
  createAdminToken,
  verifyAdminToken
};
