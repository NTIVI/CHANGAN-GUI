// api/notifications.js — Changan UI v2: Push Notifications API
const { queryNeon, verifyAdminToken } = require('./_db');

// Ensure table exists (idempotent)
let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await queryNeon(`
    CREATE TABLE IF NOT EXISTS v2_notifications (
      id         SERIAL PRIMARY KEY,
      title      TEXT NOT NULL,
      body       TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  tableReady = true;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensureTable();

    // ── GET: fetch notifications newer than ?since=<id> ──
    if (req.method === 'GET') {
      const since = parseInt(req.query?.since ?? '0') || 0;
      const rows = await queryNeon(
        'SELECT id, title, body, created_at FROM v2_notifications WHERE id > $1 ORDER BY id ASC LIMIT 50',
        [since]
      );
      return res.json({ notifications: rows });
    }

    // ── POST: admin posts a new notification ──
    if (req.method === 'POST') {
      const authHeader = req.headers?.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.body?.adminToken;

      // Accept either a valid admin session token OR the hardcoded v2 dev key
      const isAdmin = verifyAdminToken(token) || token === 'v2devkey_changan';
      if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { title, body } = req.body || {};
      if (!title?.trim()) return res.status(400).json({ error: 'title required' });

      const rows = await queryNeon(
        'INSERT INTO v2_notifications (title, body) VALUES ($1, $2) RETURNING *',
        [title.trim(), (body || '').trim()]
      );
      return res.json({ success: true, notification: rows[0] });
    }

    // ── DELETE: admin clears all notifications ──
    if (req.method === 'DELETE') {
      const authHeader = req.headers?.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.body?.adminToken;
      const isAdmin = verifyAdminToken(token) || token === 'v2devkey_changan';
      if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });

      await queryNeon('DELETE FROM v2_notifications');
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('[notifications]', err);
    return res.status(500).json({ error: err.message });
  }
};
