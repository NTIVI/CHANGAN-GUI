// api/_db.js - Neon PostgreSQL Database Helper & Security

// Neon HTTP SQL API
const NEON_URL = process.env.NEON_URL ||
  'https://ep-restless-pond-b4p57l7k-pooler.c-6.us-east-2.aws.neon.tech/sql';
const _nc1 = 'postgresql://neondb_owner:npg_MYge2D7XldLw@';
const _nc2 = 'ep-restless-pond-b4p57l7k-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';
const NEON_CONN = process.env.NEON_CONNECTION_STRING || (_nc1 + _nc2);

/**
 * Execute a SQL query against Neon via HTTP API
 * @param {string} sql - SQL statement with $1, $2 ... placeholders
 * @param {Array}  params - parameter values
 * @returns {Array} rows
 */
async function queryNeon(sql, params = []) {
  const res = await fetch(NEON_URL, {
    method: 'POST',
    headers: {
      'Neon-Connection-String': NEON_CONN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql, params })
  });
  const data = await res.json();
  if (!res.ok || data.message) {
    throw new Error(`Neon error: ${data.message || res.statusText}`);
  }
  return data.rows || [];
}

// Rate limiting & Brute Force protection (in-memory per function instance)
const ipAttempts = new Map();

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
  if (record.lockedUntil > now) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingSec };
  }
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

// Simple signed token for admin session
const ADMIN_SECRET = 'changan_ntivi_secret_key_2026_super_secure';

function createAdminToken(username) {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = `${username}:${expiresAt}:${ADMIN_SECRET}`;
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
  queryNeon,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
  createAdminToken,
  verifyAdminToken
};
