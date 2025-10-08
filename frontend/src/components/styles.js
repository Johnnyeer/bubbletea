import { getThemeForRole, getThemedStyles } from "../themes.js";

const commonShadow = "0 22px 40px -24px rgba(15, 23, 42, 0.55)";

// Get current user role from body class or default to customer
const getCurrentUserRole = () => {
    if (typeof document === 'undefined') return 'customer';
    
    const bodyClasses = document.body.className || '';
    if (bodyClasses.includes('theme-manager')) return 'manager';
    if (bodyClasses.includes('theme-staff')) return 'staff';
    return 'customer';
};

// Dynamic styles based on current theme
export const getCardStyle = () => {
    const role = getCurrentUserRole();
    const theme = getThemeForRole(role);
    const themedStyles = getThemedStyles(theme);
    return themedStyles.card;
};

// Legacy static card style for backwards compatibility
export const cardStyle = {
    background: "var(--tea-surface-strong)",
    borderRadius: 24,
    padding: "clamp(20px, 3vw, 32px)",
    border: "1px solid var(--tea-border-strong)",
    boxShadow: commonShadow,
    backdropFilter: "blur(20px)",
};

// Dynamic form styles based on current theme
export const getInputStyle = () => {
    const role = getCurrentUserRole();
    const theme = getThemeForRole(role);
    const themedStyles = getThemedStyles(theme);
    return themedStyles.input;
};

export const getLabelStyle = () => {
    const role = getCurrentUserRole();
    const theme = getThemeForRole(role);
    const themedStyles = getThemedStyles(theme);
    return themedStyles.label;
};

// Legacy static styles for backwards compatibility
export const inputStyle = {
    width: "100%",
    marginTop: 6,
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(15, 23, 42, 0.12)",
    background: "rgba(255, 255, 255, 0.9)",
    boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.08)",
    fontSize: "1rem",
};

export const labelStyle = {
    display: "block",
    marginTop: 12,
    fontWeight: "600",
    color: "#0f172a",
};

// Dynamic button styles based on current theme
export const getPrimaryButtonStyle = () => {
    const role = getCurrentUserRole();
    const theme = getThemeForRole(role);
    const themedStyles = getThemedStyles(theme);
    return themedStyles.primaryButton;
};

export const getSecondaryButtonStyle = () => {
    const role = getCurrentUserRole();
    const theme = getThemeForRole(role);
    const themedStyles = getThemedStyles(theme);
    return themedStyles.secondaryButton;
};

// Legacy static styles for backwards compatibility
export const primaryButtonStyle = {
    border: "1px solid transparent",
    background: "linear-gradient(135deg, var(--tea-primary), var(--tea-secondary))",
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 700,
    letterSpacing: "0.01em",
    boxShadow: "0 18px 36px -22px rgba(249, 115, 22, 0.68)",
};

export const secondaryButtonStyle = {
    border: "1px solid rgba(15, 23, 42, 0.12)",
    background: "rgba(255, 255, 255, 0.72)",
    color: "#0f172a",
    padding: "12px 22px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 600,
    letterSpacing: "0.01em",
    boxShadow: "0 14px 28px -22px rgba(15, 23, 42, 0.45)",
};

export const pillButtonStyle = {
    border: "1px solid rgba(37, 99, 235, 0.22)",
    background: "linear-gradient(135deg, rgba(191, 219, 254, 0.85), rgba(221, 214, 254, 0.9))",
    color: "#1e3a8a",
    padding: "10px 20px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 600,
    letterSpacing: "0.01em",
    boxShadow: "0 12px 26px -20px rgba(37, 99, 235, 0.55)",
};
