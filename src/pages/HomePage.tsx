// src/pages/HomePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const HomePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div className={`${isDarkMode ? 'dark-mode' : ''}`}>
      <div className="container">
        <div className="d-flex justify-content-end mt-3">
          <button 
            className="btn btn-sm btn-outline-secondary" 
            onClick={toggleTheme}
            aria-label={isDarkMode ? "Passer au mode clair" : "Passer au mode sombre"}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
        
        <div className="row mt-5">
          <div className="col-md-6 offset-md-3 text-center">
            <h1 className="display-4 mb-4">Planificateur de Vacances en Corse</h1>
            <p className="lead">Organisez votre séjour en Corse du Sud jour par jour.</p>
            
            <div className="mt-5">
              {currentUser ? (
                <Link to="/dashboard" className="btn btn-primary btn-lg me-3">Mon tableau de bord</Link>
              ) : (
                <Link to="/login" className="btn btn-primary btn-lg me-3">Se connecter</Link>
              )}
              <a href="#features" className="btn btn-outline-secondary btn-lg">En savoir plus</a>
            </div>
            
            <div className="mt-5">
              <img src="/images/corsica-map.png" alt="Carte de la Corse" className="img-fluid rounded shadow-sm" />
            </div>
          </div>
        </div>
        
        <div className="row mt-5" id="features">
          <div className="col-md-4">
            <div className="card h-100">
              <div className="card-body text-center">
                <h3 className="card-title">Planifiez</h3>
                <p className="card-text">Organisez votre voyage jour par jour avec des activités personnalisées.</p>
              </div>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="card h-100">
              <div className="card-body text-center">
                <h3 className="card-title">Budgétisez</h3>
                <p className="card-text">Suivez vos dépenses et restez dans votre budget grâce au suivi intégré.</p>
              </div>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="card h-100">
              <div className="card-body text-center">
                <h3 className="card-title">Analysez</h3>
                <p className="card-text">Visualisez vos dépenses par catégorie et optimisez votre budget de voyage.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="row mt-5 mb-5">
          <div className="col-md-6 offset-md-3 text-center">
            <h2>Fonctionnalités principales</h2>
            <ul className="list-group mt-3">
              <li className="list-group-item">Gestion des activités par jour</li>
              <li className="list-group-item">Suivi du budget en temps réel</li>
              <li className="list-group-item">Filtrage des activités réservées et non réservées</li>
              <li className="list-group-item">Mode sombre/clair pour le confort visuel</li>
              <li className="list-group-item">Statistiques des dépenses par catégorie</li>
            </ul>
            
            {!currentUser && (
              <div className="mt-4">
                <Link to="/login" className="btn btn-primary">Commencer maintenant</Link>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <footer className="footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Vacances en Corse - Planificateur</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;