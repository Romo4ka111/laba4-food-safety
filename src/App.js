import React, { useEffect, useMemo, useState } from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    NavLink,
    Navigate,
    useNavigate
} from 'react-router-dom';

import Home from './pages/Home';
import Detail from './pages/Detail';
import Form from './pages/Form';
import Register from './pages/Register';
import Login from './pages/Login';
import Profile from './pages/Profile';
import AdminUsers from './pages/AdminUsers';
import AuditLog from './pages/AuditLog';
import AccessDenied from './pages/AccessDenied';
import api from './services/api';

const roleLabels = {
    user: 'Пользователь',
    specialist: 'Специалист ИБ',
    admin: 'Администратор'
};

const Header = ({ currentUser, onLogout }) => {
    const navigate = useNavigate();

    const handleLogoutClick = async () => {
        try {
            await api.post('/auth/logout');
        } catch (_) {
            // Даже если сервер недоступен, локальный выход должен выполниться.
        }

        onLogout();
        navigate('/login');
    };

    return (
        <header className="app-header">
            <NavLink to="/" className="brand">
                <span>
                    <strong>Контроль пищевой безопасности</strong>
                    <small>Система учёта проверок и контроля доступа</small>
                </span>
            </NavLink>

            <nav className="nav-links" aria-label="Главное меню">
                <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
                    Главная
                </NavLink>

                {currentUser && (
                    <NavLink to="/add" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        Добавить проверку
                    </NavLink>
                )}

                {currentUser && (
                    <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        Профиль
                    </NavLink>
                )}

                {currentUser?.role === 'admin' && (
                    <>
                        <NavLink to="/admin/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            Пользователи
                        </NavLink>

                        <NavLink to="/audit-log" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            Журнал
                        </NavLink>
                    </>
                )}

                {!currentUser ? (
                    <>
                        <NavLink to="/register" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            Регистрация
                        </NavLink>

                        <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            Вход
                        </NavLink>
                    </>
                ) : (
                    <div className="user-chip">
                        <span className="avatar">{currentUser.name?.slice(0, 1).toUpperCase()}</span>

                        <span>
                            {currentUser.name}
                            <small>{roleLabels[currentUser.role] || currentUser.role}</small>
                        </span>

                        <button className="btn btn-danger btn-small" onClick={handleLogoutClick}>
                            Выйти
                        </button>
                    </div>
                )}
            </nav>
        </header>
    );
};

const ProtectedRoute = ({ currentUser, roles, children }) => {
    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    if (roles && !roles.includes(currentUser.role)) {
        return <Navigate to="/access-denied" replace />;
    }

    return children;
};

const PublicRoute = ({ currentUser, children }) => {
    if (currentUser) {
        return <Navigate to="/" replace />;
    }

    return children;
};

const App = () => {
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('user')) || null;
        } catch (_) {
            return null;
        }
    });

    const authValue = useMemo(() => ({ currentUser, setCurrentUser }), [currentUser]);

    const clearSession = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('isAuth');
        setCurrentUser(null);
    };

    useEffect(() => {
        const validateSession = async () => {
            const token = localStorage.getItem('token');

            if (!token) {
                clearSession();
                return;
            }

            try {
                const response = await api.get('/auth/me');
                localStorage.setItem('user', JSON.stringify(response.data.user));
                localStorage.setItem('isAuth', 'true');
                setCurrentUser(response.data.user);
            } catch (_) {
                clearSession();
            }
        };

        validateSession();
    }, []);

    const handleLogin = (user, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('isAuth', 'true');
        setCurrentUser(user);
    };

    const handleLogout = () => {
        clearSession();
    };

    return (
        <Router>
            <Header currentUser={currentUser} onLogout={handleLogout} />

            <main className="app-main">
                <Routes>
                    <Route path="/" element={<Home auth={authValue} />} />

                    <Route
                        path="/register"
                        element={
                            <PublicRoute currentUser={currentUser}>
                                <Register />
                            </PublicRoute>
                        }
                    />

                    <Route
                        path="/login"
                        element={
                            <PublicRoute currentUser={currentUser}>
                                <Login onLogin={handleLogin} />
                            </PublicRoute>
                        }
                    />

                    <Route
                        path="/detail/:id"
                        element={
                            <ProtectedRoute currentUser={currentUser}>
                                <Detail auth={authValue} />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/add"
                        element={
                            <ProtectedRoute currentUser={currentUser}>
                                <Form auth={authValue} />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/edit/:id"
                        element={
                            <ProtectedRoute currentUser={currentUser}>
                                <Form auth={authValue} />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute currentUser={currentUser}>
                                <Profile currentUser={currentUser} />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/admin/users"
                        element={
                            <ProtectedRoute currentUser={currentUser} roles={['admin']}>
                                <AdminUsers />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/audit-log"
                        element={
                            <ProtectedRoute currentUser={currentUser} roles={['admin']}>
                                <AuditLog />
                            </ProtectedRoute>
                        }
                    />

                    <Route path="/access-denied" element={<AccessDenied />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </Router>
    );
};

export default App;