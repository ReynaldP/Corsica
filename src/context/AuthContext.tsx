// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { onAuthStateChange, login, logout } from '../services/authService';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

// Fournir une valeur par défaut au contexte
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  error: null
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Setting up auth listener");
    
    // Configurer l'écouteur d'état d'authentification
    const unsubscribe = onAuthStateChange((user) => {
      console.log("Auth state changed", user ? `User logged in: ${user.email}` : "No user");
      setCurrentUser(user);
      setLoading(false);
    });

    // Nettoyer l'écouteur lors du démontage du composant
    return () => {
      console.log("Cleaning up auth listener");
      unsubscribe();
    };
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setError(null);
    try {
      console.log(`Attempting to login user: ${email}`);
      await login(email, password);
      // Note: No need to setCurrentUser here as the onAuthStateChange listener will handle it
    } catch (err: any) {
      console.error("Login error:", err.message);
      setError(err.message);
      throw err;
    }
  };

  const handleLogout = async () => {
    setError(null);
    try {
      console.log("Attempting to logout user");
      await logout();
      // Note: No need to setCurrentUser here as the onAuthStateChange listener will handle it
    } catch (err: any) {
      console.error("Logout error:", err.message);
      setError(err.message);
      throw err;
    }
  };

  const value = {
    currentUser,
    loading,
    login: handleLogin,
    logout: handleLogout,
    error
  };

  console.log("Auth Provider rendering", { loading, user: currentUser?.email });

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p>Vérification de l'authentification...</p>
            <small className="text-muted">Si ce message persiste, il pourrait y avoir un problème avec Firebase</small>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};