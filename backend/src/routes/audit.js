const express = require('express');
const { all } = require('../db');
const { authenticate, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, allowRoles('admin'), async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '100', 10), 1), 300);
    const rows = await all(
      `SELECT l.*, u.name AS user_name, u.email AS user_email
       FROM audit_logs l
       LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.created_at DESC
       LIMIT ?`,
      [limit]
    );

    res.json({
      logs: rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name || 'Система/неизвестно',
        userEmail: row.user_email || null,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        details: row.details,
        ip: row.ip,
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
