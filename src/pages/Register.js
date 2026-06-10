import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import Notice from '../components/Notice';

const Register = () => {
    const [form, setForm] = useState({ name: '', email: '', password: '', repeatPassword: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const validate = () => {
        if (form.name.trim().length < 3) return 'Имя пользователя должно содержать минимум 3 символа.';
        if (!form.email.includes('@')) return 'Введите корректный email.';
        if (form.password.length < 8) return 'Пароль должен содержать минимум 8 символов.';
        if (!/\d/.test(form.password) || !/[A-Za-zА-Яа-я]/.test(form.password)) {
            return 'Пароль должен содержать буквы и цифры.';
        }
        if (form.password !== form.repeatPassword) return 'Пароли не совпадают.';
        return '';
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setLoading(true);
            await api.post('/auth/register', {
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password
            });
            setSuccess('Регистрация выполнена успешно. Сейчас откроется страница входа.');
            setTimeout(() => navigate('/login'), 900);
        } catch (requestError) {
            setError(getApiError(requestError, 'Не удалось зарегистрировать пользователя.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-layout">
            <section className="auth-card">
                <div className="section-label">Создание аккаунта</div>
                <h1>Регистрация</h1>
                <p className="muted">
                    Новый пользователь получает роль «Пользователь». Администратор может изменить роль в панели управления.
                </p>

                {error && <Notice type="error">{error}</Notice>}
                {success && <Notice type="success">{success}</Notice>}

                <form className="form-grid" onSubmit={handleSubmit}>
                    <label>
                        Имя пользователя
                        <input type="text" name="name" value={form.name} onChange={handleChange} required />
                    </label>

                    <label>
                        Email
                        <input type="email" name="email" value={form.email} onChange={handleChange} required />
                    </label>

                    <label>
                        Пароль
                        <input type="password" name="password" value={form.password} onChange={handleChange} required />
                    </label>

                    <label>
                        Повторите пароль
                        <input type="password" name="repeatPassword" value={form.repeatPassword} onChange={handleChange} required />
                    </label>

                    <button className="btn btn-success btn-wide" type="submit" disabled={loading}>
                        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                    </button>
                </form>

                <p className="muted auth-hint">
                    Уже есть аккаунт? <Link to="/login">Войти</Link>
                </p>
            </section>
        </div>
    );
};

export default Register;
