const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:CHANGE_ME@127.0.0.1:5432/laba4_food_safety_db';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
});

function normalizeSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = { ...row };
  for (const [key, value] of Object.entries(normalized)) {
    if ((key === 'count' || key === 'total') && typeof value === 'string' && /^\d+$/.test(value)) {
      normalized[key] = Number(value);
    }
  }
  return normalized;
}

async function run(sql, params = []) {
  const result = await pool.query(normalizeSql(sql), params);
  return {
    lastID: undefined,
    changes: result.rowCount
  };
}

async function get(sql, params = []) {
  const result = await pool.query(normalizeSql(sql), params);
  return normalizeRow(result.rows[0]);
}

async function all(sql, params = []) {
  const result = await pool.query(normalizeSql(sql), params);
  return result.rows.map(normalizeRow);
}

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

async function initializeDatabase() {
  if (process.env.RESET_DATABASE === 'true') {
    await pool.query('DROP TABLE IF EXISTS audit_logs');
    await pool.query('DROP TABLE IF EXISTS inspections');
    await pool.query('DROP TABLE IF EXISTS users');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'specialist', 'admin')) DEFAULT 'user',
      status TEXT NOT NULL CHECK(status IN ('active', 'blocked')) DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      enterprise TEXT NOT NULL,
      product TEXT NOT NULL,
      risk_level TEXT NOT NULL CHECK(risk_level IN ('Низкий', 'Средний', 'Высокий')),
      status TEXT NOT NULL,
      date DATE NOT NULL,
      description TEXT DEFAULT '',
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT DEFAULT '',
      ip TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_inspections_risk_level ON inspections(risk_level)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_inspections_created_by ON inspections(created_by)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)');

  await seedDatabase();
}

async function seedDatabase() {
  const userCount = await get('SELECT COUNT(*)::int AS count FROM users');
  if (userCount.count === 0) {
    const users = [
      { name: 'admin', email: 'admin@example.local', password: 'Admin12345', role: 'admin' },
      { name: 'specialist', email: 'specialist@example.local', password: 'Spec12345', role: 'specialist' },
      { name: 'user', email: 'user@example.local', password: 'User12345', role: 'user' }
    ];

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await run(
        'INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)',
        [newId(), user.name, user.email, passwordHash, user.role, 'active']
      );
    }
  }

  const inspectionCount = await get('SELECT COUNT(*)::int AS count FROM inspections');
  if (inspectionCount.count === 0) {
    const admin = await get('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin']);
    const specialist = await get('SELECT id FROM users WHERE role = ? LIMIT 1', ['specialist']);
    const samples = [
      {
        name: 'Плановая проверка молочной продукции',
        enterprise: 'ООО «Сибирское молоко»',
        product: 'Молоко пастеризованное',
        riskLevel: 'Средний',
        status: 'Проверено',
        date: '2026-05-09',
        description: 'Проверены условия хранения, маркировка и санитарное состояние склада.'
      },
      {
        name: 'Контроль партии мясной продукции',
        enterprise: 'АО «Мясокомбинат Северный»',
        product: 'Колбасные изделия',
        riskLevel: 'Высокий',
        status: 'Требует устранения',
        date: '2026-05-15',
        description: 'Выявлены замечания по температурному режиму транспортировки.'
      },
      {
        name: 'Проверка овощной консервации',
        enterprise: 'ИП Кузнецов',
        product: 'Консервы овощные',
        riskLevel: 'Низкий',
        status: 'Соответствует нормам',
        date: '2026-05-22',
        description: 'Нарушений не выявлено.'
      }
    ];

    for (const item of samples) {
      await run(
        `INSERT INTO inspections
        (id, name, enterprise, product, risk_level, status, date, description, created_by, assigned_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId(), item.name, item.enterprise, item.product, item.riskLevel, item.status, item.date, item.description, admin.id, specialist.id]
      );
    }
  }
}

function normalizeDate(value) {
  if (!value) return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function normalizeDateTime(value) {
  if (!value) return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalizeInspection(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    enterprise: row.enterprise,
    product: row.product,
    riskLevel: row.risk_level,
    status: row.status,
    date: normalizeDate(row.date),
    description: row.description || '',
    createdBy: row.created_by,
    assignedUserId: row.assigned_user_id,
    createdByName: row.created_by_name || null,
    assignedUserName: row.assigned_user_name || null,
    createdAt: normalizeDateTime(row.created_at),
    updatedAt: normalizeDateTime(row.updated_at)
  };
}

function normalizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: normalizeDateTime(row.created_at),
    updatedAt: normalizeDateTime(row.updated_at)
  };
}

async function addAuditLog({ userId = null, action, entityType, entityId = null, details = '', ip = '' }) {
  await run(
    'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [newId(), userId, action, entityType, entityId, details, ip]
  );
}

async function closeDatabase() {
  await pool.end();
}

module.exports = {
  db: pool,
  pool,
  run,
  get,
  all,
  newId,
  initializeDatabase,
  normalizeInspection,
  normalizeUser,
  addAuditLog,
  closeDatabase
};
