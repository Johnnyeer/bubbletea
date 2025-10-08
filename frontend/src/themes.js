// Role-based themes for different user types

export const customerTheme = {
  // Warm, welcoming colors for customers
  name: 'customer',
  colors: {
    primary: '#f97316', // warm orange
    secondary: '#ec4899', // pink
    accent: '#06b6d4', // cyan
    background: 'radial-gradient(circle at 12% 8%, rgba(254, 215, 170, 0.45), transparent 55%), radial-gradient(circle at 82% 12%, rgba(254, 205, 211, 0.48), transparent 60%), radial-gradient(circle at 18% 86%, rgba(134, 239, 172, 0.42), transparent 60%), #fff8f1',
    surface: 'rgba(255, 255, 255, 0.88)',
    surfaceStrong: 'rgba(255, 255, 255, 0.95)',
    headerBackground: 'linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(254, 242, 242, 0.75))',
    buttonGradient: 'linear-gradient(135deg, #f97316, #ec4899)',
    buttonShadow: '0 18px 36px -22px rgba(249, 115, 22, 0.68)',
    text: '#1f2937',
    textMuted: '#64748b',
    border: 'rgba(15, 23, 42, 0.08)',
    borderStrong: 'rgba(15, 23, 42, 0.16)',
  },
  fonts: {
    primary: "'Inter', 'Segoe UI', system-ui, sans-serif",
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    }
  },
  spacing: {
    borderRadius: 24,
    buttonRadius: 999,
  }
};

export const staffTheme = {
  // Professional, efficient colors for staff
  name: 'staff',
  colors: {
    primary: '#3b82f6', // professional blue
    secondary: '#6366f1', // indigo
    accent: '#10b981', // emerald
    background: 'radial-gradient(circle at 15% 10%, rgba(147, 197, 253, 0.35), transparent 55%), radial-gradient(circle at 85% 15%, rgba(196, 181, 253, 0.38), transparent 60%), radial-gradient(circle at 20% 85%, rgba(167, 243, 208, 0.35), transparent 60%), #f8fafc',
    surface: 'rgba(248, 250, 252, 0.92)',
    surfaceStrong: 'rgba(248, 250, 252, 0.98)',
    headerBackground: 'linear-gradient(135deg, rgba(248, 250, 252, 0.95), rgba(241, 245, 249, 0.85))',
    buttonGradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    buttonShadow: '0 18px 36px -22px rgba(59, 130, 246, 0.68)',
    text: '#0f172a',
    textMuted: '#475569',
    border: 'rgba(15, 23, 42, 0.12)',
    borderStrong: 'rgba(15, 23, 42, 0.2)',
  },
  fonts: {
    primary: "'Roboto', 'Segoe UI', system-ui, sans-serif",
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    }
  },
  spacing: {
    borderRadius: 16,
    buttonRadius: 12,
  }
};

export const managerTheme = {
  // Executive, authoritative colors for managers
  name: 'manager',
  colors: {
    primary: '#1f2937', // dark gray
    secondary: '#374151', // medium gray
    accent: '#059669', // emerald
    background: 'radial-gradient(circle at 18% 12%, rgba(156, 163, 175, 0.25), transparent 55%), radial-gradient(circle at 82% 18%, rgba(209, 213, 219, 0.35), transparent 60%), radial-gradient(circle at 25% 88%, rgba(167, 243, 208, 0.25), transparent 60%), #f9fafb',
    surface: 'rgba(249, 250, 251, 0.95)',
    surfaceStrong: 'rgba(255, 255, 255, 0.98)',
    headerBackground: 'linear-gradient(135deg, rgba(249, 250, 251, 0.98), rgba(243, 244, 246, 0.9))',
    buttonGradient: 'linear-gradient(135deg, #1f2937, #374151)',
    buttonShadow: '0 18px 36px -22px rgba(31, 41, 55, 0.68)',
    text: '#111827',
    textMuted: '#4b5563',
    border: 'rgba(31, 41, 55, 0.15)',
    borderStrong: 'rgba(31, 41, 55, 0.25)',
  },
  fonts: {
    primary: "'Source Sans Pro', 'Segoe UI', system-ui, sans-serif",
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    }
  },
  spacing: {
    borderRadius: 12,
    buttonRadius: 8,
  }
};

// Function to get theme based on user role
export const getThemeForRole = (role) => {
  const normalizedRole = (role || '').toLowerCase().trim();
  
  switch (normalizedRole) {
    case 'manager':
    case 'admin':
      return managerTheme;
    case 'staff':
      return staffTheme;
    case 'customer':
    case 'member':
    default:
      return customerTheme;
  }
};

// Apply theme to CSS variables
export const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  // Update CSS custom properties
  root.style.setProperty('--tea-background', theme.colors.background);
  root.style.setProperty('--tea-surface', theme.colors.surface);
  root.style.setProperty('--tea-surface-strong', theme.colors.surfaceStrong);
  root.style.setProperty('--tea-primary', theme.colors.primary);
  root.style.setProperty('--tea-secondary', theme.colors.secondary);
  root.style.setProperty('--tea-accent', theme.colors.accent);
  root.style.setProperty('--tea-border', theme.colors.border);
  root.style.setProperty('--tea-border-strong', theme.colors.borderStrong);
  root.style.setProperty('--tea-text', theme.colors.text);
  root.style.setProperty('--tea-text-muted', theme.colors.textMuted);
  
  // Add theme class to body for additional styling
  document.body.className = document.body.className.replace(/theme-\w+/g, '');
  document.body.classList.add(`theme-${theme.name}`);
  
  console.log('Applied theme:', theme.name, 'to body classes:', document.body.className);
};

// Enhanced styles for different roles
export const getThemedStyles = (theme) => ({
  card: {
    background: theme.colors.surfaceStrong,
    borderRadius: theme.spacing.borderRadius,
    padding: "clamp(20px, 3vw, 32px)",
    border: `1px solid ${theme.colors.borderStrong}`,
    boxShadow: "0 22px 40px -24px rgba(15, 23, 42, 0.55)",
    backdropFilter: "blur(20px)",
  },

  primaryButton: {
    border: "1px solid transparent",
    background: theme.colors.buttonGradient,
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: theme.spacing.buttonRadius,
    cursor: "pointer",
    fontWeight: 700,
    letterSpacing: "0.01em",
    boxShadow: theme.colors.buttonShadow,
    fontFamily: theme.fonts.primary,
  },

  secondaryButton: {
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.surface,
    color: theme.colors.text,
    padding: "12px 22px",
    borderRadius: theme.spacing.buttonRadius,
    cursor: "pointer",
    fontWeight: theme.fonts.weights.semibold,
    letterSpacing: "0.01em",
    boxShadow: "0 14px 28px -22px rgba(15, 23, 42, 0.45)",
    fontFamily: theme.fonts.primary,
  },

  input: {
    width: "100%",
    marginTop: 6,
    padding: "12px 14px",
    borderRadius: theme.name === 'manager' ? 8 : 16,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.surface,
    boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.08)",
    fontSize: "1rem",
    fontFamily: theme.fonts.primary,
  },

  label: {
    display: "block",
    marginTop: 12,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    fontFamily: theme.fonts.primary,
  },

  header: {
    background: theme.colors.headerBackground,
  },
});