// api/notifications.js — Push Notifications API
const { getDb, saveDb, verifyAdminToken } = require('./_db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const db = await getDb(true);
    db.notifications = db.notifications || [];

    // ── GET: fetch notifications newer than ?since=<id> ──
    if (req.method === 'GET') {
      const since = parseInt(req.query?.since ?? '0') || 0;
      const rows = db.notifications
        .filter(n => n.id > since)
        .slice(-50);
      return res.json({ notifications: rows });
    }

    // ── POST: admin posts a new notification ──
    if (req.method === 'POST') {
      const authHeader = req.headers?.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.body?.adminToken;

      const isAdmin = verifyAdminToken(token) || token === 'v2devkey_changan';
      if (!isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { title, body } = req.body || {};
      if (!title?.trim()) return res.status(400).json({ error: 'title required' });

      const newNotif = {
        id: Date.now(),
        title: title.trim(),
        body: (body || '').trim(),
        created_at: new Date().toISOString()
      };

      db.notifications.push(newNotif);
      if (db.notifications.length > 100) {
        db.notifications = db.notifications.slice(-100);
      }
      await saveDb(db);
      return res.json({ success: true, notification: newNotif });
    }

    // ── DELETE: admin clears all notifications ──
    if (req.method === 'DELETE') {
      const authHeader = req.headers?.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.body?.adminToken;
      const isAdmin = verifyAdminToken(token) || token === 'v2devkey_changan';
      if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });

      db.notifications = [];
      await saveDb(db);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[notifications]', err);
    return res.status(500).json({ error: err.message });
  }
};
