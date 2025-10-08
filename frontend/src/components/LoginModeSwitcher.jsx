import { useState } from 'react';

const LoginModeSwitcher = ({ onModeChange, currentMode = 'customer' }) => {
    const modes = [
        { 
            id: 'customer', 
            label: 'Customer Login', 
            icon: '🧑‍🤝‍🧑', 
            description: 'Order delicious drinks & earn rewards',
            color: '#f97316',
            bgColor: '#fff7ed'
        },
        { 
            id: 'staff', 
            label: 'Staff Login', 
            icon: '👨‍💼', 
            description: 'Manage orders & operations efficiently',
            color: '#3b82f6',
            bgColor: '#eff6ff'
        }
    ];

    return (
        <div style={{ 
            marginBottom: '24px',
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8))',
            borderRadius: '16px',
            border: '1px solid rgba(15, 23, 42, 0.1)',
            boxShadow: '0 4px 20px -8px rgba(15, 23, 42, 0.15)'
        }}>
            <h4 style={{ 
                margin: '0 0 16px 0',
                fontSize: '18px',
                color: '#1f2937',
                fontWeight: '600',
                textAlign: 'center'
            }}>
                Choose Login Type
            </h4>
            
            <div style={{ 
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px'
            }}>
                {modes.map(mode => (
                    <button
                        key={mode.id}
                        onClick={() => onModeChange(mode.id)}
                        style={{
                            padding: '16px',
                            backgroundColor: currentMode === mode.id ? mode.color : 'white',
                            color: currentMode === mode.id ? 'white' : '#374151',
                            border: `2px solid ${currentMode === mode.id ? mode.color : 'rgba(15, 23, 42, 0.15)'}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            fontSize: '14px',
                            fontWeight: '600',
                            boxShadow: currentMode === mode.id 
                                ? `0 8px 25px -8px ${mode.color}40`
                                : '0 2px 10px -4px rgba(15, 23, 42, 0.1)'
                        }}
                        onMouseEnter={(e) => {
                            if (currentMode !== mode.id) {
                                e.target.style.borderColor = mode.color;
                                e.target.style.backgroundColor = mode.bgColor;
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = `0 6px 20px -6px ${mode.color}30`;
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (currentMode !== mode.id) {
                                e.target.style.borderColor = 'rgba(15, 23, 42, 0.15)';
                                e.target.style.backgroundColor = 'white';
                                e.target.style.transform = 'translateY(0px)';
                                e.target.style.boxShadow = '0 2px 10px -4px rgba(15, 23, 42, 0.1)';
                            }
                        }}
                    >
                        <div style={{ 
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '24px' }}>{mode.icon}</span>
                            <strong style={{ fontSize: '15px' }}>{mode.label}</strong>
                            <div style={{ 
                                fontSize: '12px',
                                opacity: currentMode === mode.id ? 0.9 : 0.7,
                                lineHeight: '1.3'
                            }}>
                                {mode.description}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LoginModeSwitcher;