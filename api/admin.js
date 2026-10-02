// api/admin.js - Admin Panel Management API with Brute-Force & DDoS Protection (Neon PostgreSQL)
const {
  queryNeon,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
  createAdminToken,
  verifyAdminToken
} = require('./_db');

const ADMIN_LOGIN = 'NTIVISTUDIO';
const ADMIN_PASS = 'Changanistan';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = (req.query?.action || req.body?.action || '').trim();
  const clientIp = getClientIp(req);

  // 1. ADMIN LOGIN
  if (action === 'login') {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Метод не разрешен' });

    const rate = checkRateLimit(clientIp, 5, 5 * 60 * 1000);
    if (!rate.allowed) {
      return res.status(429).json({
        success: false,
        error: `Доступ временно заблокирован. Повторите через ${rate.remainingSec} сек.`
      });
    }

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) {} }
    body = body || {};

    const login = String(body.login || '').trim();
    const password = String(body.password || '').trim();

    await new Promise(r => setTimeout(r, 400));

    if (login === ADMIN_LOGIN && password === ADMIN_PASS) {
      resetFailedAttempts(clientIp);
      const { token, expiresAt } = createAdminToken(login);
      return res.status(200).json({ success: true, token, expiresAt, message: 'Успешный вход в панель администратора' });
    } else {
      recordFailedAttempt(clientIp);
      return res.status(401).json({ success: false, error: 'Неверный логин или пароль администратора' });
    }
  }

  // 2. ALL OTHER ACTIONS REQUIRE VALID ADMIN TOKEN
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!verifyAdminToken(token)) {
    return res.status(401).json({ success: false, error: 'Сессия истекла или токен недействителен. Войдите заново.' });
  }

  // --- GET DATA ---
  if (action === 'data' || (req.method === 'GET' && !action)) {
    try {
      const users = await queryNeon(`SELECT * FROM users ORDER BY created_at DESC`);
      const requests = await queryNeon(`SELECT * FROM requests ORDER BY created_at DESC`);

      // Normalize field names for frontend (snake_case -> camelCase)
      const normalizeUser = u => ({
        code: u.code,
        firstName: u.first_name,
        lastName: u.last_name,
        carModel: u.car_model,
        phone: u.phone || '',
        active: u.active,
        activatedAt: u.activated_at,
        createdAt: u.created_at
      });
      const normalizeReq = r => ({
        id: r.id,
        code: r.code,
        firstName: r.first_name,
        lastName: r.last_name,
        phone: r.phone || '',
        carModel: r.car_model || '',
        createdAt: r.created_at,
        updatedAt: r.updated_at
      });

      return res.status(200).json({
        success: true,
        stats: {
          totalUsers: users.length,
          activeUsers: users.filter(u => u.active).length,
          pendingRequests: requests.length
        },
        users: users.map(normalizeUser),
        requests: requests.map(normalizeReq)
      });
    } catch (err) {
      console.error('admin data error:', err);
      return res.status(500).json({ success: false, error: 'Ошибка получения данных' });
    }
  }

  // Parse body for write actions
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) {} }
  body = body || {};

  // --- ACTIVATE USER ---
  if (action === 'activate') {
    const code = String(body.code || '').trim().toUpperCase();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const carModel = String(body.carModel || 'Changan UNI-K').trim();
    const phone = String(body.phone || '').trim();

    if (!code || code.length > 16) return res.status(400).json({ success: false, error: 'Код устройства обязателен' });
    if (!firstName || !lastName) return res.status(400).json({ success: false, error: 'Укажите имя и фамилию' });

    try {
      await queryNeon(
        `INSERT INTO users (code, first_name, last_name, car_model, phone, active, activated_at, created_at)
         VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
         ON CONFLICT (code) DO UPDATE SET
           first_name   = EXCLUDED.first_name,
           last_name    = EXCLUDED.last_name,
           car_model    = EXCLUDED.car_model,
           phone        = EXCLUDED.phone,
           active       = TRUE,
           activated_at = NOW()`,
        [code, firstName, lastName, carModel, phone]
      );

      // Remove from pending requests
      await queryNeon(`DELETE FROM requests WHERE UPPER(code) = $1`, [code]);

      return res.status(200).json({
        success: true,
        message: `Пользователь ${firstName} ${lastName} (${carModel}) успешно активирован!`,
        user: { code, firstName, lastName, carModel, phone, active: true }
      });
    } catch (err) {
      console.error('admin activate error:', err);
      return res.status(500).json({ success: false, error: 'Ошибка активации пользователя' });
    }
  }

  // --- EDIT USER ---
  if (action === 'edit') {
    const code = String(body.code || '').trim().toUpperCase();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const carModel = String(body.carModel || '').trim();
    const phone = String(body.phone || '').trim();
    const active = body.active !== undefined ? Boolean(body.active) : true;

    if (!code) return res.status(400).json({ success: false, error: 'Код пользователя не указан' });

    try {
      const result = await queryNeon(
        `UPDATE users SET
           first_name = COALESCE(NULLIF($2,''), first_name),
           last_name  = COALESCE(NULLIF($3,''), last_name),
           car_model  = COALESCE(NULLIF($4,''), car_model),
           phone      = $5,
           active     = $6
         WHERE UPPER(code) = $1
         RETURNING *`,
        [code, firstName, lastName, carModel, phone, active]
      );

      if (result.length === 0) return res.status(404).json({ success: false, error: 'Пользователь не найден' });

      return res.status(200).json({ success: true, message: 'Данные пользователя обновлены', user: result[0] });
    } catch (err) {
      console.error('admin edit error:', err);
      return res.status(500).json({ success: false, error: 'Ошибка редактирования' });
    }
  }

  // --- DELETE USER ---
  if (action === 'delete') {
    const code = String(body.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ success: false, error: 'Код не указан' });

    try {
      const result = await queryNeon(
        `DELETE FROM users WHERE UPPER(code) = $1 RETURNING code`,
        [code]
      );

      if (result.length === 0) return res.status(404).json({ success: false, error: 'Пользователь не найден' });

      return res.status(200).json({ success: true, message: 'Пользователь удален' });
    } catch (err) {
      console.error('admin delete error:', err);
      return res.status(500).json({ success: false, error: 'Ошибка удаления' });
    }
  }

  // --- DELETE PENDING REQUEST ---
  if (action === 'delete-request') {
    const code = String(body.code || '').trim().toUpperCase();
    const id = String(body.id || '').trim();

    try {
      if (id) {
        await queryNeon(`DELETE FROM requests WHERE id = $1`, [id]);
      } else if (code) {
        await queryNeon(`DELETE FROM requests WHERE UPPER(code) = $1`, [code]);
      }
      return res.status(200).json({ success: true, message: 'Заявка удалена' });
    } catch (err) {
      console.error('admin delete-request error:', err);
      return res.status(500).json({ success: false, error: 'Ошибка удаления заявки' });
    }
  }

  return res.status(400).json({ success: false, error: 'Неизвестное действие' });
};
