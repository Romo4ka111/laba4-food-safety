import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    timeout: 15000
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('isAuth');
        }
        return Promise.reject(error);
    }
);

export function getApiError(error, fallback = 'Произошла ошибка. Попробуйте повторить действие.') {
    return error?.response?.data?.message || fallback;
}

export default api;
