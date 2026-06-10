const express = require('express');
const { all, get, run, newId, normalizeInspection, addAuditLog } = require('../db');
const { authenticate, allowRoles } = require('../middleware/auth');

const router = express.Router();

const statuses = ['Новая', 'Проверено', 'Соответствует нормам', 'Требует устранения', 'В работе', 'Закрыта'];
const risks = ['Низкий', 'Средний', 'Высокий'];

function validateInspection(body, partial = false) {
  const result = {};
  const errors = [];

  const stringFields = ['name', 'enterprise', 'product'];
  stringFields.forEach((field) => {
    if (body[field] !== undefined) {
      result[field] = String(body[field]).trim();
      if (!result[field]) errors.push(`Поле ${field} не должно быть пустым.`);
      if (result[field].length > 160) errors.push(`Поле ${field} слишком длинное.`);
    } else if (!partial) {
      errors.push(`Поле ${field} обязательно.`);
    }
  });

  if (body.riskLevel !== undefined) {
    result.riskLevel = String(body.riskLevel).trim();
    if (!risks.includes(result.riskLevel)) errors.push('Некорректный уровень риска.');
  } else if (!partial) {
    errors.push('Поле riskLevel обязательно.');
  }

  if (body.status !== undefined) {
    result.status = String(body.status).trim();
    if (!statuses.includes(result.status)) errors.push('Некорректный статус проверки.');
  } else if (!partial) {
    errors.push('Поле status обязательно.');
  }

  if (body.date !== undefined) {
    result.date = String(body.date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result.date)) errors.push('Дата должна быть в формате YYYY-MM-DD.');
  } else if (!partial) {
    errors.push('Поле date обязательно.');
  }

  if (body.description !== undefined) {
    result.description = String(body.description).trim().slice(0, 1000);
  } else if (!partial) {
    result.description = '';
  }

  return { result, errors };
}

function buildWhere(query, user) {
  const where = [];
  const params = [];

  if (query.q) {
    where.push('(lower(i.name) LIKE ? OR lower(i.enterprise) LIKE ? OR lower(i.product) LIKE ?)');
    const search = `%${String(query.q).trim().toLowerCase()}%`;
    params.push(search, search, search);
  }
  if (query.status) {
    where.push('i.status = ?');
    params.push(String(query.status));
  }
  if (query.riskLevel) {
    where.push('i.risk_level = ?');
    params.push(String(query.riskLevel));
  }

  if (user.role === 'user') {
    where.push('(i.created_by = ? OR i.assigned_user_id = ?)');
    params.push(user.id, user.id);
  }

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params
  };
}

function buildOrder(query) {
  const allowedSortFields = {
    date: 'i.date',
    name: 'i.name',
    enterprise: 'i.enterprise',
    product: 'i.product',
    riskLevel: 'i.risk_level',
    status: 'i.status',
    createdAt: 'i.created_at'
  };
  const sortBy = String(query.sortBy || 'date');
  const sortOrder = String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const column = allowedSortFields[sortBy] || allowedSortFields.date;
  return {
    clause: `ORDER BY ${column} ${sortOrder}, i.created_at DESC`,
    sortBy: allowedSortFields[sortBy] ? sortBy : 'date',
    sortOrder: sortOrder.toLowerCase()
  };
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(items) {
  const headers = ['ID', 'Название', 'Предприятие', 'Продукция', 'Риск', 'Статус', 'Дата', 'Описание', 'Создал', 'Ответственный'];
  const rows = items.map((item) => [
    item.id,
    item.name,
    item.enterprise,
    item.product,
    item.riskLevel,
    item.status,
    item.date,
    item.description,
    item.createdByName || '',
    item.assignedUserName || ''
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(';')).join('\n');
}

router.get('/export.csv', authenticate, async (req, res, next) => {
  try {
    const { clause, params } = buildWhere(req.query, req.user);
    const order = buildOrder(req.query);
    const rows = await all(
      `SELECT i.*, cu.name AS created_by_name, au.name AS assigned_user_name
       FROM inspections i
       LEFT JOIN users cu ON cu.id = i.created_by
       LEFT JOIN users au ON au.id = i.assigned_user_id
       ${clause}
       ${order.clause}`,
      params
    );

    const items = rows.map(normalizeInspection);
    await addAuditLog({
      userId: req.user.id,
      action: 'INSPECTIONS_EXPORTED',
      entityType: 'inspection',
      details: `Выгружено записей: ${items.length}`,
      ip: req.ip
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="inspections.csv"');
    res.send(`﻿${toCsv(items)}`);
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '6', 10), 1), 50);
    const offset = (page - 1) * limit;
    const { clause, params } = buildWhere(req.query, req.user);
    const order = buildOrder(req.query);

    const countRow = await get(`SELECT COUNT(*) AS total FROM inspections i ${clause}`, params);
    const rows = await all(
      `SELECT i.*, cu.name AS created_by_name, au.name AS assigned_user_name
       FROM inspections i
       LEFT JOIN users cu ON cu.id = i.created_by
       LEFT JOIN users au ON au.id = i.assigned_user_id
       ${clause}
       ${order.clause}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      items: rows.map(normalizeInspection),
      total: countRow.total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(countRow.total / limit), 1),
      sortBy: order.sortBy,
      sortOrder: order.sortOrder
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const row = await get(
      `SELECT i.*, cu.name AS created_by_name, au.name AS assigned_user_name
       FROM inspections i
       LEFT JOIN users cu ON cu.id = i.created_by
       LEFT JOIN users au ON au.id = i.assigned_user_id
       WHERE i.id = ?`,
      [req.params.id]
    );

    if (!row) return res.status(404).json({ message: 'Проверка не найдена.' });

    if (req.user.role === 'user' && row.created_by !== req.user.id && row.assigned_user_id !== req.user.id) {
      return res.status(403).json({ message: 'Нет доступа к этой проверке.' });
    }

    res.json(normalizeInspection(row));
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, allowRoles('user', 'specialist', 'admin'), async (req, res, next) => {
  try {
    const { result, errors } = validateInspection(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join(' ') });

    const id = newId();
    await run(
      `INSERT INTO inspections
      (id, name, enterprise, product, risk_level, status, date, description, created_by, assigned_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, result.name, result.enterprise, result.product, result.riskLevel, result.status, result.date, result.description, req.user.id, req.user.id]
    );

    await addAuditLog({ userId: req.user.id, action: 'INSPECTION_CREATED', entityType: 'inspection', entityId: id, details: result.name, ip: req.ip });
    const created = await get('SELECT * FROM inspections WHERE id = ?', [id]);
    res.status(201).json(normalizeInspection(created));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, allowRoles('user', 'specialist', 'admin'), async (req, res, next) => {
  try {
    const current = await get('SELECT * FROM inspections WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ message: 'Проверка не найдена.' });

    if (req.user.role === 'user' && current.created_by !== req.user.id) {
      return res.status(403).json({ message: 'Обычный пользователь может изменять только свои проверки.' });
    }

    const { result, errors } = validateInspection(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join(' ') });

    await run(
      `UPDATE inspections
       SET name = ?, enterprise = ?, product = ?, risk_level = ?, status = ?, date = ?, description = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [result.name, result.enterprise, result.product, result.riskLevel, result.status, result.date, result.description, req.params.id]
    );

    await addAuditLog({ userId: req.user.id, action: 'INSPECTION_UPDATED', entityType: 'inspection', entityId: req.params.id, details: result.name, ip: req.ip });
    const updated = await get('SELECT * FROM inspections WHERE id = ?', [req.params.id]);
    res.json(normalizeInspection(updated));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, allowRoles('user', 'specialist', 'admin'), async (req, res, next) => {
  try {
    const current = await get('SELECT * FROM inspections WHERE id = ?', [req.params.id]);
    if (!current) return res.status(404).json({ message: 'Проверка не найдена.' });

    if (req.user.role === 'user' && current.created_by !== req.user.id) {
      return res.status(403).json({ message: 'Обычный пользователь может удалять только свои проверки.' });
    }

    await run('DELETE FROM inspections WHERE id = ?', [req.params.id]);
    await addAuditLog({ userId: req.user.id, action: 'INSPECTION_DELETED', entityType: 'inspection', entityId: req.params.id, details: current.name, ip: req.ip });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
