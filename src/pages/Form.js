import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getApiError } from '../services/api';
import LoadingState from '../components/LoadingState';
import Notice from '../components/Notice';

const emptyForm = {
    name: '',
    enterprise: '',
    product: '',
    riskLevel: '',
    status: 'Новая',
    date: '',
    description: ''
};

const Form = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState(emptyForm);
    const [loading, setLoading] = useState(isEditMode);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        async function loadItemForEdit() {
            if (!isEditMode) return;

            try {
                setLoading(true);
                setError('');
                const response = await api.get(`/inspections/${id}`);
                setFormData({
                    name: response.data.name || '',
                    enterprise: response.data.enterprise || '',
                    product: response.data.product || '',
                    riskLevel: response.data.riskLevel || '',
                    status: response.data.status || 'Новая',
                    date: response.data.date || '',
                    description: response.data.description || ''
                });
            } catch (requestError) {
                setError(getApiError(requestError, 'Не удалось загрузить данные проверки для редактирования.'));
            } finally {
                setLoading(false);
            }
        }

        loadItemForEdit();
    }, [id, isEditMode]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((currentData) => ({ ...currentData, [name]: value }));
    };

    const validateForm = () => {
        if (!formData.name.trim()) return 'Введите название проверки.';
        if (!formData.enterprise.trim()) return 'Введите название предприятия.';
        if (!formData.product.trim()) return 'Введите вид продукции.';
        if (!formData.riskLevel) return 'Выберите уровень риска.';
        if (!formData.status) return 'Выберите статус проверки.';
        if (!formData.date) return 'Выберите дату проверки.';
        if (formData.description.length > 1000) return 'Описание не должно превышать 1000 символов.';
        return '';
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setSaving(true);

            if (isEditMode) {
                await api.put(`/inspections/${id}`, formData);
                setSuccess('Данные проверки обновлены.');
            } else {
                await api.post('/inspections', formData);
                setSuccess('Проверка добавлена.');
            }

            setTimeout(() => navigate('/'), 600);
        } catch (requestError) {
            setError(getApiError(requestError, 'Не удалось сохранить данные на сервере.'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <LoadingState text="Загрузка формы..." />;
    }

    return (
        <div className="page-card form-page">
            <div className="section-label">Защищённая операция</div>
            <h1>{isEditMode ? 'Редактирование проверки' : 'Добавление проверки'}</h1>
            <p className="muted">
                Создание и изменение данных выполняется через защищённый REST API. Все действия фиксируются в журнале.
            </p>

            {error && <Notice type="error">{error}</Notice>}
            {success && <Notice type="success">{success}</Notice>}

            <form className="form-grid" onSubmit={handleSubmit}>
                <label>
                    Название проверки
                    <input type="text" name="name" value={formData.name} onChange={handleChange} />
                </label>

                <label>
                    Предприятие
                    <input type="text" name="enterprise" value={formData.enterprise} onChange={handleChange} />
                </label>

                <label>
                    Вид продукции
                    <input type="text" name="product" value={formData.product} onChange={handleChange} />
                </label>

                <label>
                    Уровень риска
                    <select name="riskLevel" value={formData.riskLevel} onChange={handleChange}>
                        <option value="">Выберите уровень риска</option>
                        <option value="Низкий">Низкий</option>
                        <option value="Средний">Средний</option>
                        <option value="Высокий">Высокий</option>
                    </select>
                </label>

                <label>
                    Статус проверки
                    <select name="status" value={formData.status} onChange={handleChange}>
                        <option value="Новая">Новая</option>
                        <option value="В работе">В работе</option>
                        <option value="Проверено">Проверено</option>
                        <option value="Соответствует нормам">Соответствует нормам</option>
                        <option value="Требует устранения">Требует устранения</option>
                        <option value="Закрыта">Закрыта</option>
                    </select>
                </label>

                <label>
                    Дата проверки
                    <input type="date" name="date" value={formData.date} onChange={handleChange} />
                </label>

                <label className="span-2">
                    Описание / результаты проверки
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="5"
                        placeholder="Опишите выявленные нарушения, результат контроля или рекомендации"
                    />
                </label>

                <div className="form-actions span-2">
                    <button className="btn btn-success" type="submit" disabled={saving}>
                        {saving ? 'Сохранение...' : (isEditMode ? 'Сохранить изменения' : 'Добавить')}
                    </button>
                    <Link className="btn btn-outline" to="/">Отмена</Link>
                </div>
            </form>
        </div>
    );
};

export default Form;
