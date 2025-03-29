// src/pages/NotFoundPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const NotFoundPage: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`container text-center mt-5 ${isDarkMode ? 'dark-mode' : ''}`}>
      <h1 className="display-1">404</h1>
      <h2 className="mb-4">Page non trouvée</h2>
      <p className="lead">Désolé, la page que vous recherchez n'existe pas.</p>
      <p>Peut-être que vous vous êtes égaré comme un randonneur dans les montagnes corses ?</p>
      <Link to="/" className="btn btn-primary mt-3">Retour à l'accueil</Link>
    </div>
  );
};

export default NotFoundPage;