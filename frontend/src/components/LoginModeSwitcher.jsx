import { useState } from 'react';

const LoginModeSwitcher = ({ onModeChange, currentMode = 'customer' }) => {
    const modes = [
        { id: 'customer', label: 'Customer Login', icon: '🧑‍🤝‍🧑', description: 'Order drinks and manage rewards' },
        { id: 'staff', label: 'Staff Login', icon: '👨‍💼', description: 'Manage orders and operations' }
    ];

    return (
        <div style={{ 
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
        }}>
            <h4 style={{ 
                margin: '0 0 12px 0',
                fontSize: '16px',
                color: '#495057'
            }}>
                Login As
            </h4>
            
            <div style={{ 
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
            }}>
                {modes.map(mode => (
                    <button
                        key={mode.id}
                        onClick={() => onModeChange(mode.id)}
                        style={{
                            padding: '12px',
                            backgroundColor: currentMode === mode.id ? '#007bff' : 'white',
                            color: currentMode === mode.id ? 'white' : '#495057',
                            border: `2px solid ${currentMode === mode.id ? '#007bff' : '#dee2e6'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s ease',
                            fontSize: '14px'
                        }}
                        onMouseEnter={(e) => {
                            if (currentMode !== mode.id) {
                                e.target.style.borderColor = '#007bff';
                                e.target.style.backgroundColor = '#f8f9fa';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (currentMode !== mode.id) {
                                e.target.style.borderColor = '#dee2e6';
                                e.target.style.backgroundColor = 'white';
                            }
                        }}
                    >
                        <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px'
                        }}>
                            <span style={{ fontSize: '18px' }}>{mode.icon}</span>
                            <strong>{mode.label}</strong>
                        </div>
                        <div style={{ 
                            fontSize: '12px',
                            opacity: 0.8
                        }}>
                            {mode.description}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LoginModeSwitcher;