// Admin access control with PIN protection
const ADMIN_SESSION_KEY = 'admin-session';
const ADMIN_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface AdminSession {
  authenticated: boolean;
  expiresAt: number;
}

export function isAdmin(): boolean {
  try {
    const sessionData = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionData) return false;
    
    const session: AdminSession = JSON.parse(sessionData);
    
    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      clearAdminSession();
      return false;
    }
    
    return session.authenticated;
  } catch {
    return false;
  }
}

export function setAdminSession(): void {
  try {
    const session: AdminSession = {
      authenticated: true,
      expiresAt: Date.now() + ADMIN_SESSION_DURATION
    };
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('Failed to set admin session:', error);
  }
}

export function clearAdminSession(): void {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch (error) {
    console.warn('Failed to clear admin session:', error);
  }
}

export function requireAdmin(): boolean {
  const isAuthenticated = isAdmin();
  if (!isAuthenticated) {
    clearAdminSession(); // Clear any invalid session
  }
  return isAuthenticated;
}