const jwt = require('jsonwebtoken');
const { get, normalizeUser, addAuditLog } = require('../db');

function getTokenFromHeader(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

async function authenticate(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      await addAuditLog({
        action: 'AUTH_REQUIRED',
        entityType: 'api',
        details: `Запрос без токена: ${req.method} ${req.originalUrl}`,
        ip: req.ip
      });
      return res.status(401).json({ message: 'Требуется авторизация.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    const userRow = await get('SELECT * FROM users WHERE id = ?', [payload.id]);
    const user = normalizeUser(userRow);

    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'Пользователь не найден или заблокирован.' });
    }

    req.user = user;
    next();
  } catch (error) {
    await addAuditLog({
      action: 'TOKEN_INVALID',
      entityType: 'api',
      details: `Недействительный токен: ${req.method} ${req.originalUrl}`,
      ip: req.ip
    });
    return res.status(401).json({ message: 'Недействительный или просроченный токен.' });
  }
}

function allowRoles(...roles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Требуется авторизация.' });
    }

    if (!roles.includes(req.user.role)) {
      await addAuditLog({
        userId: req.user.id,
        action: 'ACCESS_DENIED',
        entityType: 'api',
        details: `Недостаточно прав. Требуется: ${roles.join(', ')}`,
        ip: req.ip
      });
      return res.status(403).json({ message: 'Недостаточно прав для выполнения действия.' });
    }

    next();
  };
}

module.exports = { authenticate, allowRoles };
