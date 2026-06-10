import React, { useEffect, useState } from 'react';
import api, { getApiError } from '../services/api';
import LoadingState from '../components/LoadingState';
import Notice from '../components/Notice';

const actionLabels = {
    REGISTER: 'Регистрация',
    LOGIN_SUCCESS: 'Успешный вход',
    LOGIN_FAILED: 'Ошибка входа',
    LOGIN_BLOCKED: 'Вход заблокированного пользователя',
    LOGOUT: 'Выход',
    INSPECTION_CREATED: 'Создание проверки',
    INSPECTION_UPDATED: 'Изменение проверки',
    INSPECTION_DELETED: 'Удаление проверки',
    USER_UPDATED: 'Изменение пользователя',
    ACCESS_DENIED: 'Отказ в доступе',
    AUTH_REQUIRED: 'Запрос без токена',
    TOKEN_INVALID: 'Недействительный токен',
    SERVER_ERROR: 'Ошибка сервера'
};

const AuditLog = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadLogs() {
            try {
                setLoading(true);
                setError('');
                const response = await api.get('/audit-log', { params: { limit: 200 } });
                setLogs(response.data.logs || []);
            } catch (requestError) {
                setError(getApiError(requestError, 'Не удалось загрузить журнал действий.'));
            } finally {
                setLoading(false);
            }
        }

        loadLogs();
    }, []);

    return (
        <div className="page-card">
            <div className="section-label">Журналирование</div>
            <h1>Журнал действий</h1>
            <p className="muted">
                В журнал записываются входы, ошибки авторизации, изменения данных, удаления и попытки доступа без прав.
            </p>

            {error && <Notice type="error">{error}</Notice>}
            {loading ? (
                <LoadingState text="Загрузка журнала..." />
            ) : logs.length === 0 ? (
                <Notice>Записи журнала пока отсутствуют.</Notice>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Время</th>
                                <th>Пользователь</th>
                                <th>Действие</th>
                                <th>Объект</th>
                                <th>Детали</th>
                                <th>IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id}>
                                    <td>{log.createdAt}</td>
                                    <td>{log.userName}</td>
                                    <td>{actionLabels[log.action] || log.action}</td>
                                    <td>{log.entityType}</td>
                                    <td>{log.details}</td>
                                    <td>{log.ip}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AuditLog;
