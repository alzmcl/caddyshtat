import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setToken(savedToken);
          } else {
            // Token invalid, clear it
            localStorage.removeItem('token');
            setToken(null);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Password change failed');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    changePassword,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
