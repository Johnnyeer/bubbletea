import { useState } from 'react';
import sessionManager from '../utils/sessionManager.js';

const SessionSwitcher = ({ onSessionChange, onStatusMessage }) => {
    const [showSwitcher, setShowSwitcher] = useState(false);
    const allSessions = sessionManager.getAllSessions();
    const activeSession = sessionManager.getActiveSession();

    if (allSessions.length <= 1) {
        return null; // Don't show if only one or no sessions
    }

    const handleSessionSwitch = (sessionId) => {
        const success = sessionManager.switchSession(sessionId);
        if (success) {
            const newSession = sessionManager.getActiveSession();
            onSessionChange({
                user: newSession.user,
                token: newSession.token,
                isAuthenticated: true
            });
            onStatusMessage && onStatusMessage(`Switched to ${newSession.user.full_name} (${newSession.role})`);
        }
        setShowSwitcher(false);
    };

    const handleLogoutSession = (sessionId, event) => {
        event.stopPropagation();
        const sessionToRemove = allSessions.find(s => s.id === sessionId);
        if (sessionToRemove) {
            sessionManager.removeSession(sessionId);
            const remainingSession = sessionManager.getActiveSession();
            
            if (remainingSession) {
                onSessionChange({
                    user: remainingSession.user,
                    token: remainingSession.token,
                    isAuthenticated: true
                });
                onStatusMessage && onStatusMessage(`Logged out ${sessionToRemove.user.full_name}`);
            } else {
                onSessionChange({
                    user: null,
                    token: '',
                    isAuthenticated: false
                });
                onStatusMessage && onStatusMessage('All sessions logged out');
            }
        }
    };

    const formatRole = (role) => {
        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'manager': return { bg: '#1f2937', color: '#ffffff', label: 'Manager' };
            case 'admin': return { bg: '#1f2937', color: '#ffffff', label: 'Admin' };
            case 'staff': return { bg: '#3b82f6', color: '#ffffff', label: 'Staff' };
            case 'customer': return { bg: '#f97316', color: '#ffffff', label: 'Customer' };
            default: return { bg: '#6b7280', color: '#ffffff', label: 'User' };
        }
    };

    return (
        <div style={{ position: 'relative', marginBottom: '16px' }}>
            <button
                onClick={() => setShowSwitcher(!showSwitcher)}
                style={{
                    padding: '8px 16px',
                    backgroundColor: '#2c3e50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}
            >
                <span>👥 {allSessions.length} Active Sessions</span>
                <span style={{ transform: showSwitcher ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                    ▼
                </span>
            </button>

            {showSwitcher && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    maxHeight: '300px',
                    overflowY: 'auto'
                }}>
                    <div style={{ 
                        padding: '12px', 
                        borderBottom: '1px solid #eee',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#555'
                    }}>
                        Switch Between Sessions
                    </div>
                    
                    {allSessions.map((session) => (
                        <div
                            key={session.id}
                            style={{
                                padding: '12px',
                                borderBottom: allSessions.indexOf(session) === allSessions.length - 1 ? 'none' : '1px solid #eee',
                                cursor: 'pointer',
                                backgroundColor: session.id === activeSession?.id ? '#f8f9fa' : 'white',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'background-color 0.2s'
                            }}
                            onClick={() => handleSessionSwitch(session.id)}
                            onMouseEnter={(e) => {
                                if (session.id !== activeSession?.id) {
                                    e.target.style.backgroundColor = '#f8f9fa';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (session.id !== activeSession?.id) {
                                    e.target.style.backgroundColor = 'white';
                                }
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    marginBottom: '4px'
                                }}>
                                    <strong style={{ fontSize: '14px' }}>
                                        {session.user.full_name}
                                    </strong>
                                    <span
                                        style={{
                                            fontSize: '11px',
                                            padding: '2px 6px',
                                            borderRadius: '10px',
                                            backgroundColor: getRoleBadgeColor(session.role),
                                            color: 'white',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {formatRole(session.role)}
                                    </span>
                                    {session.id === activeSession?.id && (
                                        <span style={{ 
                                            fontSize: '11px', 
                                            color: '#27ae60',
                                            fontWeight: 'bold'
                                        }}>
                                            ACTIVE
                                        </span>
                                    )}
                                </div>
                                <div style={{ 
                                    fontSize: '12px', 
                                    color: '#666'
                                }}>
                                    {session.accountType === 'staff' ? session.user.username : session.user.email}
                                </div>
                            </div>
                            
                            <button
                                onClick={(e) => handleLogoutSession(session.id, e)}
                                style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#e74c3c',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    marginLeft: '8px'
                                }}
                                title="Logout this session"
                            >
                                Logout
                            </button>
                        </div>
                    ))}
                    
                    <div style={{ 
                        padding: '8px 12px',
                        borderTop: '1px solid #eee',
                        backgroundColor: '#f8f9fa'
                    }}>
                        <button
                            onClick={() => {
                                sessionManager.clearAllSessions();
                                onSessionChange({
                                    user: null,
                                    token: '',
                                    isAuthenticated: false
                                });
                                onStatusMessage && onStatusMessage('All sessions logged out');
                                setShowSwitcher(false);
                            }}
                            style={{
                                width: '100%',
                                padding: '6px',
                                backgroundColor: '#95a5a6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            Logout All Sessions
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SessionSwitcher;