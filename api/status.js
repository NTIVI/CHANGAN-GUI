// api/status.js - Check activation status of a device code (Neon PostgreSQL)
const { queryNeon } = require('./_db');

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
    const rows = await queryNeon(
      `SELECT code, first_name, last_name, car_model, activated_at
       FROM users
       WHERE UPPER(code) = $1 AND active = TRUE`,
      [code]
    );

    if (rows.length > 0) {
      const u = rows[0];
      return res.status(200).json({
        success: true,
        active: true,
        user: {
          code: u.code,
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          carModel: u.car_model || 'Changan',
          activatedAt: u.activated_at || null
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
