const { addAuditLog } = require('../db');

function notFound(req, res) {
  res.status(404).json({ message: 'Ресурс не найден.' });
}

async function errorHandler(error, req, res, next) {
  console.error(error);
  try {
    await addAuditLog({
      userId: req.user ? req.user.id : null,
      action: 'SERVER_ERROR',
      entityType: 'server',
      details: error.message,
      ip: req.ip
    });
  } catch (_) {
    // Ошибка логирования не должна ломать ответ клиенту.
  }

  res.status(error.status || 500).json({
    message: process.env.NODE_ENV === 'production'
      ? 'Внутренняя ошибка сервера.'
      : error.message || 'Внутренняя ошибка сервера.'
  });
}

module.exports = { notFound, errorHandler };
