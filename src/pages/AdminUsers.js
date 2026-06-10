import React, { useEffect, useState } from 'react';
import api, { getApiError } from '../services/api';
import LoadingState from '../components/LoadingState';
import Notice from '../components/Notice';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadUsers = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get('/users');
            setUsers(response.data.users || []);
        } catch (requestError) {
            setError(getApiError(requestError, 'Не удалось загрузить пользователей.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const updateUser = async (id, patch) => {
        try {
            setError('');
            setSuccess('');
            await api.put(`/users/${id}`, patch);
            setSuccess('Пользователь обновлён. Действие записано в журнал.');
            await loadUsers();
        } catch (requestError) {
            setError(getApiError(requestError, 'Не удалось обновить пользователя.'));
        }
    };

    return (
        <div className="page-card">
            <div className="section-label">Раздел администратора</div>
            <h1>Управление пользователями</h1>
            <p className="muted">Администратор может изменять роли и блокировать пользователей.</p>

            {error && <Notice type="error">{error}</Notice>}
            {success && <Notice type="success">{success}</Notice>}

            {loading ? (
                <LoadingState text="Загрузка пользователей..." />
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Имя</th>
                                <th>Email</th>
                                <th>Роль</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <select value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value })}>
                                            <option value="user">user</option>
                                            <option value="specialist">specialist</option>
                                            <option value="admin">admin</option>
                                        </select>
                                    </td>
                                    <td>
                                        <select value={user.status} onChange={(event) => updateUser(user.id, { status: event.target.value })}>
                                            <option value="active">active</option>
                                            <option value="blocked">blocked</option>
                                        </select>
                                    </td>
                                    <td>
                                        <span className="badge success">ID: {user.id.slice(0, 8)}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
