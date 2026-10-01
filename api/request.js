// api/request.js - Submit support access request
const { getDb, saveDb, getClientIp, checkRateLimit, recordFailedAttempt } = require('./_db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Метод не разрешен' });

  const clientIp = getClientIp(req);
  const rate = checkRateLimit(clientIp, 10, 10 * 60 * 1000); // 10 attempts per 10 mins
  if (!rate.allowed) {
    return res.status(429).json({
      success: false,
      error: `Слишком много запросов. Подождите ${rate.remainingSec} сек.`
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { }
    }
    body = body || {};

    const code = String(body.code || '').trim().toUpperCase();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const phone = String(body.phone || '').trim();
    const carModel = String(body.carModel || 'Changan UNI-K').trim();

    if (!code || code.length > 8) {
      return res.status(400).json({ success: false, error: 'Неверный код устройства (максимум 8 символов)' });
    }
    if (!firstName || !lastName || !phone) {
      return res.status(400).json({ success: false, error: 'Заполните все поля: имя, фамилию и телефон' });
    }

    const db = await getDb(true);

    // Check if user is already activated
    const existingUser = (db.users || []).find(u => u.code.toUpperCase() === code);
    if (existingUser && existingUser.active !== false) {
      return res.status(200).json({
        success: true,
        alreadyActive: true,
        message: 'Пользователь уже активирован'
      });
    }

    // Check if request already pending
    const existingReq = (db.requests || []).find(r => r.code.toUpperCase() === code);
    if (existingReq) {
      // Update existing request
      existingReq.firstName = firstName;
      existingReq.lastName = lastName;
      existingReq.phone = phone;
      existingReq.carModel = carModel;
      existingReq.updatedAt = new Date().toISOString();
      await saveDb(db);
      return res.status(200).json({
        success: true,
        message: 'Заявка уже была отправлена, данные обновлены. Ожидайте подтверждения.'
      });
    }

    // Add new request
    const newRequest = {
      id: 'req_' + Date.now().toString(36),
      code,
      firstName,
      lastName,
      phone,
      carModel,
      createdAt: new Date().toISOString()
    };

    db.requests = db.requests || [];
    db.requests.unshift(newRequest);

    // Keep max 500 requests to avoid unbounded growth
    if (db.requests.length > 500) {
      db.requests = db.requests.slice(0, 500);
    }

    await saveDb(db);

    return res.status(200).json({
      success: true,
      message: 'Заявка успешно отправлена! Ожидайте подтверждения администратора.'
    });
  } catch (err) {
    console.error('request error:', err);
    recordFailedAttempt(clientIp);
    return res.status(500).json({ success: false, error: 'Ошибка сохранения заявки' });
  }
};
