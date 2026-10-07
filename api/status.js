// api/status.js - Check activation status of a device code
const { getDb } = require('./_db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const code = (req.query.code || '').trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ success: false, error: 'Код не указан' });
  }

  try {
    const db = await getDb(true);
    const user = (db.users || []).find(u => (u.code || '').trim().toUpperCase() === code);

    if (user && user.active !== false) {
      return res.status(200).json({
        success: true,
        active: true,
        user: {
          code: user.code,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          carModel: user.carModel || 'Changan',
          activatedAt: user.activatedAt || null
        }
      });
    }

    return res.status(200).json({
      success: true,
      active: false,
      message: 'Код ожидает активации'
    });
  } catch (err) {
    console.error('status error:', err);
    return res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
};
