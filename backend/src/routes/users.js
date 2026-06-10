const express = require('express');
const { all, get, run, normalizeUser, addAuditLog } = require('../db');
const { authenticate, allowRoles } = require('../middleware/auth');

const router = express.Router();
const allowedRoles = ['user', 'specialist', 'admin'];
const allowedStatuses = ['active', 'blocked'];

router.get('/', authenticate, allowRoles('admin'), async (req, res, next) => {
  try {
    const rows = await all('SELECT * FROM users ORDER BY created_at DESC');
    res.json({ users: rows.map(normalizeUser) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, allowRoles('admin'), async (req, res, next) => {
  try {
    const role = req.body.role ? String(req.body.role) : null;
    const status = req.body.status ? String(req.body.status) : null;

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Некорректная роль пользователя.' });
    }
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Некорректный статус пользователя.' });
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден.' });

    if (req.user.id === req.params.id && status === 'blocked') {
      return res.status(400).json({ message: 'Администратор не может заблокировать сам себя.' });
    }

    await run(
      `UPDATE users
       SET role = COALESCE(?, role), status = COALESCE(?, status), updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [role, status, req.params.id]
    );

    await addAuditLog({
      userId: req.user.id,
      action: 'USER_UPDATED',
      entityType: 'user',
      entityId: req.params.id,
      details: `role=${role || user.role}, status=${status || user.status}`,
      ip: req.ip
    });

    const updated = normalizeUser(await get('SELECT * FROM users WHERE id = ?', [req.params.id]));
    res.json({ user: updated });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
