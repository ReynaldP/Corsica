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
      
      {/* Navigation menu */}
      {currentUser && (
        <nav className="mt-2 mb-3">
          <ul className="nav nav-pills">
            <li className="nav-item">
              <button 
                className={`nav-link ${window.location.pathname === '/dashboard' ? 'active' : 'text-light'}`}
                onClick={() => navigate('/dashboard')}
              >
                Tableau de bord
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${window.location.pathname === '/checklist' ? 'active' : 'text-light'}`}
                onClick={() => navigate('/checklist')}
              >
                Checklist
              </button>
            </li>
          </ul>
        </nav>
      )}
      
      {/* Stack vertically on xs, row on sm+, align center vertically */}
      <div className="mt-3 d-flex flex-column flex-sm-row justify-content-sm-between align-items-center w-100">
        {/* Add margin bottom for stacked view */}
        <div className="mb-2 mb-sm-0"> 
          {currentUser && (
            <span className="text-light me-sm-3"> {/* Adjust margin for sm+ */}
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
