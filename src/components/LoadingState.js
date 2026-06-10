import React from 'react';

const LoadingState = ({ text = 'Загрузка данных...' }) => (
    <div className="loading-state" role="status" aria-live="polite">
        <div className="loader-ring" />
        <p>{text}</p>
    </div>
);

export default LoadingState;
