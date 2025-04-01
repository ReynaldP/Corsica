// src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './pages/Dashboard';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ChecklistPage from './pages/ChecklistPage';
import { onAuthStateChange } from './services/authService';
import './styles.css';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    console.log("App: Setting up auth listener");
    const unsubscribe = onAuthStateChange((user) => {
      console.log("App: Auth state changed", user ? "User logged in" : "No user");
      setUser(user);
      setAuthChecked(true);
    });

    return () => {
      console.log("App: Cleaning up auth listener");
      unsubscribe();
    };
  }, []);

  if (!authChecked) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Vérification de l'authentification...</span>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
            <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/checklist" element={user ? <ChecklistPage /> : <Navigate to="/login" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
