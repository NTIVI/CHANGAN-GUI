// api/request.js - Submit support access request (Neon PostgreSQL)
const {
  queryNeon,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt
} = require('./_db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Метод не разрешен' });

  const clientIp = getClientIp(req);
  const rate = checkRateLimit(clientIp, 10, 10 * 60 * 1000);
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

    if (!code || code.length > 16) {
      return res.status(400).json({ success: false, error: 'Неверный код устройства' });
    }
    if (!firstName || !lastName || !phone) {
      return res.status(400).json({ success: false, error: 'Заполните все поля: имя, фамилию и телефон' });
    }

    // Check if user is already activated
    const activeRows = await queryNeon(
      `SELECT code FROM users WHERE UPPER(code) = $1 AND active = TRUE`,
      [code]
    );
    if (activeRows.length > 0) {
      return res.status(200).json({
        success: true,
        alreadyActive: true,
        message: 'Пользователь уже активирован'
      });
    }

    // Upsert request (insert or update on conflict)
    const reqId = 'req_' + Date.now().toString(36);
    await queryNeon(
      `INSERT INTO requests (id, code, first_name, last_name, phone, car_model, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (code) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name  = EXCLUDED.last_name,
         phone      = EXCLUDED.phone,
         car_model  = EXCLUDED.car_model,
         updated_at = NOW()`,
      [reqId, code, firstName, lastName, phone, carModel]
    );

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
