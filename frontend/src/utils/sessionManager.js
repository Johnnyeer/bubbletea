// Session Manager for handling multiple user types simultaneously
class SessionManager {
    constructor() {
        this.STORAGE_PREFIX = 'bubbleTea_session_';
        this.ACTIVE_SESSION_KEY = 'bubbleTea_active_session';
        this.sessions = new Map();
        this.activeSessionId = null;
        this.loadSessions();
    }

    // Generate unique session ID
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Load all existing sessions from localStorage
    loadSessions() {
        try {
            // Load active session
            this.activeSessionId = localStorage.getItem(this.ACTIVE_SESSION_KEY);

            // Load all sessions
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.STORAGE_PREFIX)) {
                    const sessionData = JSON.parse(localStorage.getItem(key));
                    const sessionId = key.replace(this.STORAGE_PREFIX, '');
                    this.sessions.set(sessionId, sessionData);
                }
            }

            // Validate active session still exists
            if (this.activeSessionId && !this.sessions.has(this.activeSessionId)) {
                this.activeSessionId = null;
                localStorage.removeItem(this.ACTIVE_SESSION_KEY);
            }
        } catch (error) {
            console.warn('Failed to load sessions:', error);
            this.sessions.clear();
            this.activeSessionId = null;
        }
    }

    // Create a new session
    createSession(user, token) {
        const sessionId = this.generateSessionId();
        const sessionData = {
            user,
            token,
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            accountType: user.account_type,
            role: user.role,
            id: sessionId
        };

        this.sessions.set(sessionId, sessionData);
        this.activeSessionId = sessionId;
        this.persistSession(sessionId, sessionData);
        localStorage.setItem(this.ACTIVE_SESSION_KEY, sessionId);
        
        return sessionId;
    }

    // Switch to an existing session
    switchSession(sessionId) {
        if (this.sessions.has(sessionId)) {
            this.activeSessionId = sessionId;
            localStorage.setItem(this.ACTIVE_SESSION_KEY, sessionId);
            this.updateLastActive(sessionId);
            return true;
        }
        return false;
    }

    // Get active session
    getActiveSession() {
        if (this.activeSessionId && this.sessions.has(this.activeSessionId)) {
            return this.sessions.get(this.activeSessionId);
        }
        return null;
    }

    // Get all sessions
    getAllSessions() {
        return Array.from(this.sessions.values());
    }

    // Get sessions by account type
    getSessionsByType(accountType) {
        return this.getAllSessions().filter(session => session.accountType === accountType);
    }

    // Remove a session
    removeSession(sessionId) {
        if (this.sessions.has(sessionId)) {
            this.sessions.delete(sessionId);
            localStorage.removeItem(this.STORAGE_PREFIX + sessionId);
            
            // If removing active session, switch to another or clear
            if (this.activeSessionId === sessionId) {
                const remainingSessions = this.getAllSessions();
                if (remainingSessions.length > 0) {
                    this.activeSessionId = remainingSessions[0].id;
                    localStorage.setItem(this.ACTIVE_SESSION_KEY, this.activeSessionId);
                } else {
                    this.activeSessionId = null;
                    localStorage.removeItem(this.ACTIVE_SESSION_KEY);
                }
            }
        }
    }

    // Clear all sessions
    clearAllSessions() {
        // Remove from localStorage
        this.getAllSessions().forEach(session => {
            localStorage.removeItem(this.STORAGE_PREFIX + session.id);
        });
        
        // Clear active session
        localStorage.removeItem(this.ACTIVE_SESSION_KEY);
        
        // Clear in-memory data
        this.sessions.clear();
        this.activeSessionId = null;
    }

    // Persist session to localStorage
    persistSession(sessionId, sessionData) {
        try {
            localStorage.setItem(this.STORAGE_PREFIX + sessionId, JSON.stringify(sessionData));
        } catch (error) {
            console.error('Failed to persist session:', error);
        }
    }

    // Update last active time
    updateLastActive(sessionId) {
        if (this.sessions.has(sessionId)) {
            const session = this.sessions.get(sessionId);
            session.lastActive = new Date().toISOString();
            this.sessions.set(sessionId, session);
            this.persistSession(sessionId, session);
        }
    }

    // Check if user is already logged in
    findExistingSession(accountType, identifier) {
        for (const session of this.sessions.values()) {
            if (session.accountType === accountType) {
                const sessionIdentifier = accountType === 'staff' 
                    ? session.user.username 
                    : session.user.email;
                if (sessionIdentifier === identifier) {
                    return session.id;
                }
            }
        }
        return null;
    }

    // Get current user and token for compatibility
    getCurrentUser() {
        const activeSession = this.getActiveSession();
        return activeSession ? activeSession.user : null;
    }

    getCurrentToken() {
        const activeSession = this.getActiveSession();
        return activeSession ? activeSession.token : null;
    }

    // Check if any staff/manager session exists
    hasStaffSession() {
        return this.getSessionsByType('staff').length > 0;
    }

    // Check if any customer session exists
    hasCustomerSession() {
        return this.getSessionsByType('member').length > 0;
    }

    // Migrate old localStorage data (for backward compatibility)
    migrateOldSession() {
        try {
            const oldToken = localStorage.getItem('jwt');
            const oldUser = JSON.parse(localStorage.getItem('jwt_user') || 'null');
            
            if (oldToken && oldUser && this.sessions.size === 0) {
                console.log('Migrating old session data...');
                const sessionId = this.createSession(oldUser, oldToken);
                
                // Clean up old data
                localStorage.removeItem('jwt');
                localStorage.removeItem('jwt_user');
                
                return sessionId;
            }
        } catch (error) {
            console.warn('Failed to migrate old session:', error);
        }
        return null;
    }
}

// Create singleton instance
const sessionManager = new SessionManager();

export default sessionManager;