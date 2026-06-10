import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import LoadingState from '../components/LoadingState';
import Notice from '../components/Notice';

const Detail = () => {
    const { id } = useParams();
    const [itemData, setItemData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadItem() {
            try {
                setLoading(true);
                setError('');
                const response = await api.get(`/inspections/${id}`);
                setItemData(response.data);
            } catch (requestError) {
                setError(getApiError(requestError, 'Проверка не найдена или сервер не отвечает.'));
            } finally {
                setLoading(false);
            }
        }

        loadItem();
    }, [id]);

    if (loading) {
        return <LoadingState text="Загрузка данных проверки..." />;
    }

    if (error) {
        return (
            <div className="page-card error-card">
                <h1>Страница детализации</h1>
                <Notice type="error">{error}</Notice>
                <Link className="btn btn-primary" to="/">Вернуться на главную</Link>
            </div>
        );
    }

    return (
        <div className="page-card detail-page">
            <div className="section-label">Карточка объекта</div>
            <h1>{itemData.name}</h1>
            <p className="muted">Подробная информация о проверке и ответственных пользователях.</p>

            <div className="detail-grid">
                <div className="detail-row"><span>ID</span><strong>{itemData.id}</strong></div>
                <div className="detail-row"><span>Предприятие</span><strong>{itemData.enterprise}</strong></div>
                <div className="detail-row"><span>Вид продукции</span><strong>{itemData.product}</strong></div>
                <div className="detail-row"><span>Уровень риска</span><strong>{itemData.riskLevel}</strong></div>
                <div className="detail-row"><span>Статус проверки</span><strong>{itemData.status}</strong></div>
                <div className="detail-row"><span>Дата проверки</span><strong>{itemData.date}</strong></div>
                <div className="detail-row"><span>Создал</span><strong>{itemData.createdByName || 'Не указано'}</strong></div>
                <div className="detail-row"><span>Ответственный</span><strong>{itemData.assignedUserName || 'Не назначен'}</strong></div>
            </div>

            <section className="description-box">
                <h2>Описание</h2>
                <p>{itemData.description || 'Описание не заполнено.'}</p>
            </section>

            <div className="form-actions">
                <Link className="btn btn-outline" to="/">Назад к списку</Link>
                <Link className="btn btn-warning" to={`/edit/${itemData.id}`}>Редактировать</Link>
            </div>
        </div>
    );
};

export default Detail;
