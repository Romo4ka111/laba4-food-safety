import React from 'react';

const roleText = {
    user: 'Пользователь: создаёт и просматривает свои проверки.',
    specialist: 'Специалист ИБ: анализирует проверки, меняет статусы и контролирует нарушения.',
    admin: 'Администратор: управляет пользователями, ролями и журналом действий.'
};

const Profile = ({ currentUser }) => (
    <div className="page-card profile-page">
        <div className="section-label">Личный кабинет</div>
        <h1>Профиль пользователя</h1>
        <p className="muted">
            Данные текущей сессии получены с сервера по защищённому эндпоинту /api/auth/me.
        </p>

        <div className="detail-grid">
            <div className="detail-row"><span>Имя</span><strong>{currentUser.name}</strong></div>
            <div className="detail-row"><span>Email</span><strong>{currentUser.email}</strong></div>
            <div className="detail-row"><span>Роль</span><strong>{currentUser.role}</strong></div>
            <div className="detail-row"><span>Статус</span><strong>{currentUser.status}</strong></div>
        </div>

        <section className="description-box">
            <h2>Права доступа</h2>
            <p>{roleText[currentUser.role]}</p>
            <ul className="check-list">
                <li>токен передаётся в заголовке Authorization;</li>
                <li>сервер проверяет JWT перед каждым защищённым запросом;</li>
                <li>роль пользователя проверяется для административных действий.</li>
            </ul>
        </section>
    </div>
);

export default Profile;
