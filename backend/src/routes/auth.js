const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run, newId, normalizeUser, addAuditLog } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'dev_secret_change_me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password) {
  return typeof password === 'string' && password.length >= 8 && /[A-Za-zА-Яа-я]/.test(password) && /\d/.test(password);
}

router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || name.length < 3) {
      return res.status(400).json({ message: 'Имя пользователя должно содержать минимум 3 символа.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Введите корректный email.' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Пароль должен быть не короче 8 символов и содержать буквы и цифры.' });
    }

    const duplicate = await get('SELECT id FROM users WHERE name = ? OR email = ?', [name, email]);
    if (duplicate) {
      return res.status(409).json({ message: 'Пользователь с таким именем или email уже существует.' });
    }

    const id = newId();
    const passwordHash = await bcrypt.hash(password, 10);
    await run(
      'INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, email, passwordHash, 'user', 'active']
    );

    const user = normalizeUser(await get('SELECT * FROM users WHERE id = ?', [id]));
    await addAuditLog({ userId: id, action: 'REGISTER', entityType: 'user', entityId: id, details: `Зарегистрирован пользователь ${name}`, ip: req.ip });

    res.status(201).json({ message: 'Регистрация выполнена успешно.', user });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const login = String(req.body.login || req.body.name || req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!login || !password) {
      return res.status(400).json({ message: 'Введите логин/email и пароль.' });
    }

    const row = await get('SELECT * FROM users WHERE lower(name) = ? OR lower(email) = ?', [login, login]);
    const isPasswordValid = row ? await bcrypt.compare(password, row.password_hash) : false;

    if (!row || !isPasswordValid) {
      await addAuditLog({ action: 'LOGIN_FAILED', entityType: 'auth', details: `Неудачный вход: ${login}`, ip: req.ip });
      return res.status(401).json({ message: 'Неверный логин или пароль.' });
    }

    if (row.status !== 'active') {
      await addAuditLog({ userId: row.id, action: 'LOGIN_BLOCKED', entityType: 'auth', details: 'Попытка входа заблокированного пользователя', ip: req.ip });
      return res.status(403).json({ message: 'Пользователь заблокирован.' });
    }

    const user = normalizeUser(row);
    const token = signToken(user);
    await addAuditLog({ userId: user.id, action: 'LOGIN_SUCCESS', entityType: 'auth', details: `Вход пользователя ${user.name}`, ip: req.ip });

    res.json({ message: 'Вход выполнен успешно.', token, user });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.post('/refresh', authenticate, (req, res) => {
  const token = signToken(req.user);
  res.json({ token, user: req.user });
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await addAuditLog({ userId: req.user.id, action: 'LOGOUT', entityType: 'auth', details: `Выход пользователя ${req.user.name}`, ip: req.ip });
    res.json({ message: 'Выход выполнен.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
