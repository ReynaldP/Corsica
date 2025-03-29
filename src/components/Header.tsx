// src/components/Header.tsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { currentUser, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <header className={`site-header ${isDarkMode ? 'dark' : ''}`}>
      <h1>{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
      
      <div className="mt-3 d-flex justify-content-between w-100">
        <div>
          {currentUser && (
            <span className="text-light me-3">
              Connecté en tant que: {currentUser.email}
            </span>
          )}
        </div>
        
        <div>
          <button 
            className="btn btn-outline-light me-2" 
            onClick={toggleTheme}
            aria-label={isDarkMode ? "Passer au mode clair" : "Passer au mode sombre"}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          
          {currentUser && (
            <button 
              onClick={handleLogout} 
              className="btn btn-light"
            >
              Déconnexion
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;