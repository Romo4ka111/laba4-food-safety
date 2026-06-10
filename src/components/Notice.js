import React from 'react';

const Notice = ({ type = 'info', children }) => (
    <div className={`notice notice-${type}`}>
        {children}
    </div>
);

export default Notice;
