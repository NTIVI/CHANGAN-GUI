// api/admin.js - Admin Panel Management API with Gist DB
const {
  getDb,
  saveDb,
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

  // 1. ADMIN LOGIN ACTION
  if (action === 'login') {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Метод не разрешен' });

    // Check brute force lockout
    const rate = checkRateLimit(clientIp, 5, 5 * 60 * 1000); // 5 attempts -> 5 min lock
    if (!rate.allowed) {
      return res.status(429).json({
        success: false,
        error: `Доступ временно заблокирован из-за множества неверных попыток. Повторите через ${rate.remainingSec} сек.`
      });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    body = body || {};

    const login = String(body.login || '').trim();
    const password = String(body.password || '').trim();

    // Small artificial delay to slow down automated brute-force attacks
    await new Promise(r => setTimeout(r, 400));

    if (login === ADMIN_LOGIN && password === ADMIN_PASS) {
      resetFailedAttempts(clientIp);
      const { token, expiresAt } = createAdminToken(login);
      return res.status(200).json({
        success: true,
        token,
        expiresAt,
        message: 'Успешный вход в панель администратора'
      });
    } else {
      recordFailedAttempt(clientIp);
      return res.status(401).json({
        success: false,
        error: 'Неверный логин или пароль администратора'
      });
    }
  }

  // 2. ALL OTHER ACTIONS REQUIRE VALID ADMIN TOKEN
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!verifyAdminToken(token)) {
    return res.status(401).json({
      success: false,
      error: 'Сессия истекла или токен недействителен. Войдите заново.'
    });
  }

  // --- GET DATA (Users, Requests, Stats) ---
  if (action === 'data' || (req.method === 'GET' && !action)) {
    try {
      const db = await getDb(true);
      const users = db.users || [];
      const requests = db.requests || [];

      return res.status(200).json({
        success: true,
        stats: {
          totalUsers: users.length,
          activeUsers: users.filter(u => u.active !== false).length,
          pendingRequests: requests.length
        },
        users,
        requests
      });
    } catch (err) {
      console.error('admin data error:', err);
      return res.status(500).json({ success: false, error: 'Ошибка получения данных' });
    }
  }

  // Parse body for write actions
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) {}
  }
  body = body || {};

  // --- ACTIVATE USER (from call or from request) ---
  if (action === 'activate') {
    const code = String(body.code || '').trim().toUpperCase();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const carModel = String(body.carModel || 'Changan UNI-K').trim();
    const phone = String(body.phone || '').trim();

    if (!code || code.length > 16) {
      return res.status(400).json({ success: false, error: 'Код устройства обязателен' });
    }
    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, error: 'Укажите имя и фамилию' });
    }

    try {
      const db = await getDb(true);
      db.users = db.users || [];
      db.requests = db.requests || [];

      // Check if user already exists
      const existingIdx = db.users.findIndex(u => u.code.toUpperCase() === code);
      const userData = {
        code,
        firstName,
        lastName,
        carModel,
        phone,
        active: true,
        activatedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        db.users[existingIdx] = { ...db.users[existingIdx], ...userData };
      } else {
        db.users.unshift(userData);
      }

      // Remove from pending requests if present
      db.requests = db.requests.filter(r => r.code.toUpperCase() !== code);

      await saveDb(db);

      return res.status(200).json({
        success: true,
        message: `Пользователь ${firstName} ${lastName} (${carModel}) успешно активирован!`,
        user: userData
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

    if (!code) {
      return res.status(400).json({ success: false, error: 'Код пользователя не указан' });
    }

    try {
      const db = await getDb(true);
      db.users = db.users || [];
      const user = db.users.find(u => u.code.toUpperCase() === code);

      if (!user) {
        return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      }

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (carModel) user.carModel = carModel;
      if (phone !== undefined) user.phone = phone;
      user.active = active;
      user.updatedAt = new Date().toISOString();

      await saveDb(db);

      return res.status(200).json({
        success: true,
        message: 'Данные пользователя обновлены',
        user
      });
    } catch (err) {
      console.error('admin edit error:', err);
      return res.status(500).json({ success: false, error: 'Ошибка редактирования' });
    }
  }

  // --- DELETE USER ---
  if (action === 'delete') {
    const code = String(body.code || '').trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ success: false, error: 'Код не указан' });
    }

    try {
      const db = await getDb(true);
      db.users = db.users || [];
      const initialCount = db.users.length;
      db.users = db.users.filter(u => u.code.toUpperCase() !== code);

      if (db.users.length === initialCount) {
        return res.status(404).json({ success: false, error: 'Пользователь не найден' });
      }

      await saveDb(db);
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
      const db = await getDb(true);
      db.requests = db.requests || [];
      db.requests = db.requests.filter(r => {
        if (id && r.id === id) return false;
        if (code && r.code.toUpperCase() === code) return false;
        return true;
      });

      await saveDb(db);
      return res.status(200).json({ success: true, message: 'Заявка удалена' });
    } catch (err) {
      console.error('admin delete-request error:', err);
      return res.status(500).json({ success: false, error: 'Ошибка удаления заявки' });
    }
  }

  return res.status(400).json({ success: false, error: 'Неизвестное действие' });
};
