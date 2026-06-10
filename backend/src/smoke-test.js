process.env.PORT = process.env.PORT || '5098';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke_test_secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:CHANGE_ME@127.0.0.1:5432/laba4_food_safety_test';
process.env.RESET_DATABASE = 'true';

require('./server');

const baseUrl = `http://127.0.0.1:${process.env.PORT}/api`;

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, body };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const { response } = await request('/health');
      if (response.ok) return;
    } catch (_) {
      // Сервер ещё запускается.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('API не запустился для smoke test');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  await waitForServer();

  const noToken = await request('/profile', { headers: {} });
  assert(noToken.response.status === 401, 'Профиль без токена должен возвращать 401');

  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: 'admin', password: 'Admin12345' })
  });
  assert(login.response.status === 200 && login.body.token, 'Вход admin должен вернуть JWT');

  const authHeader = { Authorization: `Bearer ${login.body.token}` };
  const profile = await request('/profile', { headers: authHeader });
  assert(profile.response.status === 200 && profile.body.user.role === 'admin', 'Профиль admin должен открываться по JWT');

  const list = await request('/inspections?sortBy=name&sortOrder=asc', { headers: authHeader });
  assert(list.response.status === 200 && Array.isArray(list.body.items), 'Список проверок должен возвращаться');
  assert(list.body.sortBy === 'name' && list.body.sortOrder === 'asc', 'Сортировка должна учитываться API');

  const exported = await fetch(`${baseUrl}/inspections/export.csv`, { headers: authHeader });
  const csv = await exported.text();
  assert(exported.status === 200 && csv.includes('Название'), 'CSV-выгрузка должна возвращать файл');

  const userLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: 'user', password: 'User12345' })
  });
  const userForbidden = await request('/admin/users', { headers: { Authorization: `Bearer ${userLogin.body.token}` } });
  assert(userForbidden.response.status === 403, 'Обычный пользователь не должен открывать админский API');

  console.log('Smoke test: API, JWT, роли, сортировка и CSV-выгрузка работают');
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
