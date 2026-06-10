require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { initializeDatabase } = require('./db');
const { authenticate } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const inspectionRoutes = require('./routes/inspections');
const userRoutes = require('./routes/users');
const auditRoutes = require('./routes/audit');

const app = express();
const PORT = Number(process.env.PORT || 5001);

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'food-safety-api' });
});

// Защищённый профиль пользователя для соответствия требованиям ЛР4.
app.get('/api/profile', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.use('/api/auth', authRoutes);
app.use('/api/inspections', inspectionRoutes);

// Совместимость со старым фронтендом Лабы 1: /api/items работает как /api/inspections.
app.use('/api/items', inspectionRoutes);

app.use('/api/users', userRoutes);
// Альтернативный путь для админского API: /api/admin/users.
app.use('/api/admin/users', userRoutes);
app.use('/api/audit-log', auditRoutes);

app.use(notFound);
app.use(errorHandler);

initializeDatabase()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`REST API запущен на порту ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Не удалось инициализировать базу данных:', error);
    process.exit(1);
  });
