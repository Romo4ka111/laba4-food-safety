import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import Notice from '../components/Notice';

const Login = ({ onLogin }) => {
    const [form, setForm] = useState({ login: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        try {
            setLoading(true);
            const response = await api.post('/auth/login', form);
            onLogin(response.data.user, response.data.token);
            navigate('/');
        } catch (requestError) {
            setError(getApiError(requestError, 'Неверный логин или пароль.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-layout">
            <section className="auth-card">
                <div className="section-label">Аутентификация</div>
                <h1>Вход в аккаунт</h1>
                <p className="muted">
                    Для доступа к защищённым разделам используется JWT-токен. Пароль проверяется на сервере,
                    в базе хранится только хеш.
                </p>

                {error && <Notice type="error">{error}</Notice>}

                <form className="form-grid" onSubmit={handleSubmit}>
                    <label>
                        Логин или email
                        <input
                            type="text"
                            name="login"
                            value={form.login}
                            onChange={handleChange}
                            placeholder="admin или admin@example.local"
                            required
                        />
                    </label>

                    <label>
                        Пароль
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Введите пароль"
                            required
                        />
                    </label>

                    <button className="btn btn-primary btn-wide" type="submit" disabled={loading}>
                        {loading ? 'Проверка...' : 'Войти'}
                    </button>
                </form>

                <p className="muted auth-hint">
                    Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
                </p>

                <div className="demo-box">
                    <strong>Тестовые пользователи:</strong>
                    <span>admin / Admin12345</span>
                    <span>specialist / Spec12345</span>
                    <span>user / User12345</span>
                </div>
            </section>
        </div>
    );
};

export default Login;
