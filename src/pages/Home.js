import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import LoadingState from '../components/LoadingState';
import Notice from '../components/Notice';

const PhotoPropeller = () => {
    const photo = '/images/1234.jpg';

    return (
        <section className="propeller-section propeller-clean" aria-label="Вращающийся визуальный блок">
            <div className="propeller">
                <div className="propeller-glow" />
                <div className="propellerRotor">
                    <div className="blade blade1">
                        <img src={photo} alt="Контроль производства" />
                    </div>
                    <div className="blade blade2">
                        <img src={photo} alt="Контроль хранения" />
                    </div>
                    <div className="blade blade3">
                        <img src={photo} alt="Контроль поставок" />
                    </div>
                </div>
                <div className="hub" aria-hidden="true" />
            </div>
        </section>
    );
};

const statusClass = (status) => {
    if (status === 'Требует устранения') return 'danger';
    if (status === 'Соответствует нормам' || status === 'Проверено' || status === 'Закрыта') return 'success';
    return 'warning';
};

const riskClass = (risk) => {
    if (risk === 'Высокий') return 'danger';
    if (risk === 'Средний') return 'warning';
    return 'success';
};

const Home = ({ auth }) => {
    const currentUser = auth?.currentUser;
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 6, totalPages: 1 });
    const [filters, setFilters] = useState({ q: '', status: '', riskLevel: '', sortBy: 'date', sortOrder: 'desc' });
    const [loading, setLoading] = useState(Boolean(currentUser));
    const [error, setError] = useState('');

    const stats = useMemo(() => {
        const total = data.length;
        const highRisk = data.filter((item) => item.riskLevel === 'Высокий').length;
        const problems = data.filter((item) => item.status === 'Требует устранения').length;
        return { total, highRisk, problems };
    }, [data]);

    async function loadData(page = 1) {
        if (!currentUser) return;
        try {
            setLoading(true);
            setError('');
            const response = await api.get('/inspections', {
                params: {
                    page,
                    limit: meta.limit,
                    q: filters.q || undefined,
                    status: filters.status || undefined,
                    riskLevel: filters.riskLevel || undefined,
                    sortBy: filters.sortBy || 'date',
                    sortOrder: filters.sortOrder || 'desc'
                }
            });
            setData(response.data.items || []);
            setMeta({
                total: response.data.total,
                page: response.data.page,
                limit: response.data.limit,
                totalPages: response.data.totalPages
            });
        } catch (requestError) {
            const message = getApiError(requestError, 'Не удалось загрузить список проверок с сервера.');
            setError(message);
            if (requestError.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    const handleFilterChange = (event) => {
        const { name, value } = event.target;
        setFilters((current) => ({ ...current, [name]: value }));
    };

    const handleFilterSubmit = (event) => {
        event.preventDefault();
        loadData(1);
    };

    async function exportCsv() {
        try {
            setError('');
            const response = await api.get('/inspections/export.csv', {
                params: {
                    q: filters.q || undefined,
                    status: filters.status || undefined,
                    riskLevel: filters.riskLevel || undefined,
                    sortBy: filters.sortBy || 'date',
                    sortOrder: filters.sortOrder || 'desc'
                },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'inspections.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (requestError) {
            setError(getApiError(requestError, 'Не удалось выгрузить список проверок.'));
        }
    }

    async function deleteItem(id) {
        const isConfirmed = window.confirm('Удалить выбранную проверку? Действие будет записано в журнал аудита.');
        if (!isConfirmed) return;

        try {
            await api.delete(`/inspections/${id}`);
            setData((currentData) => currentData.filter((item) => item.id !== id));
        } catch (requestError) {
            setError(getApiError(requestError, 'Не удалось удалить проверку. Попробуйте повторить запрос.'));
        }
    }

    return (
        <div>
            <section className="hero">
                <div>
                    <div className="section-label">Лабораторная работа 4 / РГР</div>
                    <h1>Система учёта проверок безопасности пищевой продукции</h1>
                    <p>
                        Приложение хранит проверки в базе данных, использует REST API, JWT-авторизацию,
                        роли пользователей и журналирование действий.
                    </p>
                    <div className="hero-actions">
                        {currentUser ? (
                            <div className="section-actions">
                                <button className="btn btn-outline" type="button" onClick={exportCsv}>Выгрузить CSV</button>
                                <Link className="btn btn-success" to="/add">Добавить проверку</Link>
                            </div>
                        ) : (
                            <>
                                <Link className="btn btn-primary" to="/login">Войти</Link>
                                <Link className="btn btn-outline" to="/register">Создать аккаунт</Link>
                            </>
                        )}
                    </div>
                </div>
                <div className="hero-panel">
                    <span>Защищённый доступ</span>
                    <strong>JWT + роли + audit log</strong>
                    <small>Пароли хранятся только в виде хеша</small>
                </div>
            </section>

            <PhotoPropeller />

            {!currentUser ? (
                <section className="page-card center-card">
                    <h2>Для работы со списком проверок нужно войти</h2>
                    <p className="muted">
                        Это демонстрирует защищённый доступ к API: без токена сервер возвращает 401 Unauthorized.
                    </p>
                    <Link className="btn btn-primary" to="/login">Перейти ко входу</Link>
                </section>
            ) : (
                <>
                    <section className="stats-grid">
                        <div className="stat-card">
                            <span>На странице</span>
                            <strong>{stats.total}</strong>
                        </div>
                        <div className="stat-card">
                            <span>Высокий риск</span>
                            <strong>{stats.highRisk}</strong>
                        </div>
                        <div className="stat-card">
                            <span>Требуют устранения</span>
                            <strong>{stats.problems}</strong>
                        </div>
                        <div className="stat-card">
                            <span>Всего в базе</span>
                            <strong>{meta.total}</strong>
                        </div>
                    </section>

                    <section className="page-card">
                        <div className="section-head">
                            <div>
                                <div className="section-label">CRUD + фильтрация + сортировка</div>
                                <h2>Список проверок</h2>
                            </div>
                            <div className="section-actions">
                                <button className="btn btn-outline" type="button" onClick={exportCsv}>Выгрузить CSV</button>
                                <Link className="btn btn-success" to="/add">Добавить проверку</Link>
                            </div>
                        </div>

                        <form className="filter-panel" onSubmit={handleFilterSubmit}>
                            <input
                                type="search"
                                name="q"
                                value={filters.q}
                                onChange={handleFilterChange}
                                placeholder="Поиск по названию, предприятию или продукции"
                            />
                            <select name="riskLevel" value={filters.riskLevel} onChange={handleFilterChange}>
                                <option value="">Все уровни риска</option>
                                <option value="Низкий">Низкий</option>
                                <option value="Средний">Средний</option>
                                <option value="Высокий">Высокий</option>
                            </select>
                            <select name="status" value={filters.status} onChange={handleFilterChange}>
                                <option value="">Все статусы</option>
                                <option value="Новая">Новая</option>
                                <option value="В работе">В работе</option>
                                <option value="Проверено">Проверено</option>
                                <option value="Соответствует нормам">Соответствует нормам</option>
                                <option value="Требует устранения">Требует устранения</option>
                                <option value="Закрыта">Закрыта</option>
                            </select>
                            <select name="sortBy" value={filters.sortBy} onChange={handleFilterChange}>
                                <option value="date">Сортировать по дате</option>
                                <option value="name">Сортировать по названию</option>
                                <option value="enterprise">Сортировать по предприятию</option>
                                <option value="product">Сортировать по продукции</option>
                                <option value="riskLevel">Сортировать по риску</option>
                                <option value="status">Сортировать по статусу</option>
                            </select>
                            <select name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange}>
                                <option value="desc">По убыванию</option>
                                <option value="asc">По возрастанию</option>
                            </select>
                            <button className="btn btn-primary" type="submit">Применить</button>
                        </form>

                        {error && <Notice type="error">{error}</Notice>}
                        {loading ? (
                            <LoadingState text="Загрузка списка проверок..." />
                        ) : data.length === 0 ? (
                            <Notice>Проверки по выбранным условиям не найдены.</Notice>
                        ) : (
                            <div className="card-grid">
                                {data.map((item) => (
                                    <article key={item.id} className="inspection-card">
                                        <div className="card-topline">
                                            <span className={`badge ${riskClass(item.riskLevel)}`}>{item.riskLevel} риск</span>
                                            <span className={`badge ${statusClass(item.status)}`}>{item.status}</span>
                                        </div>
                                        <h3>{item.name}</h3>
                                        <p><b>Предприятие:</b> {item.enterprise}</p>
                                        <p><b>Продукция:</b> {item.product}</p>
                                        <p><b>Дата проверки:</b> {item.date}</p>
                                        {item.assignedUserName && <p><b>Ответственный:</b> {item.assignedUserName}</p>}

                                        <div className="card-actions">
                                            <Link className="btn btn-primary btn-small" to={`/detail/${item.id}`}>Подробнее</Link>
                                            <Link className="btn btn-warning btn-small" to={`/edit/${item.id}`}>Редактировать</Link>
                                            <button className="btn btn-danger btn-small" onClick={() => deleteItem(item.id)}>Удалить</button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}

                        <div className="pagination">
                            <button className="btn btn-outline btn-small" disabled={meta.page <= 1 || loading} onClick={() => loadData(meta.page - 1)}>
                                Назад
                            </button>
                            <span>Страница {meta.page} из {meta.totalPages}</span>
                            <button className="btn btn-outline btn-small" disabled={meta.page >= meta.totalPages || loading} onClick={() => loadData(meta.page + 1)}>
                                Вперёд
                            </button>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default Home;
