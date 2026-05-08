import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AuthPatient, LoginCredentials, RegisterCredentials, patientPortalAPI, setAccessToken } from '../api/client';

interface AuthContextValue {
  user: AuthPatient | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login(credentials: LoginCredentials): Promise<void>;
  register(credentials: RegisterCredentials): Promise<void>;
  logout(): Promise<void>;
  refreshSession(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthPatient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    patientPortalAPI
      .getProfile()
      .then((profile) => {
        if (!mounted) {
          return;
        }

        setUser(profile);
      })
      .catch(() => {
        if (mounted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function login(credentials: LoginCredentials): Promise<void> {
    const response = await patientPortalAPI.login(credentials);
    const token = response.tokens?.accessToken || response.accessToken;
    if (token) setAccessToken(token);
    setUser(response.patient);
  }

  async function register(credentials: RegisterCredentials): Promise<void> {
    const response = await patientPortalAPI.register(credentials);
    const token = response.tokens?.accessToken || response.accessToken;
    if (token) setAccessToken(token);
    setUser(response.patient);
  }

  async function logout(): Promise<void> {
    await patientPortalAPI.logout();
    setAccessToken(null);
    setUser(null);
  }

  async function refreshSession(): Promise<void> {
    const response = await patientPortalAPI.refreshToken();
    setUser(response.patient);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}