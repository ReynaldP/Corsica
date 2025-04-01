// src/components/BudgetOverview.tsx
import React, { useState, useEffect } from 'react';
import { Budget } from '../types';
import { updateBudget, getBookedAndUnbookedExpenses } from '../services/tripService';

interface BudgetOverviewProps {
  budget: Budget;
}

const BudgetOverview: React.FC<BudgetOverviewProps> = ({ budget }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newTotal, setNewTotal] = useState(budget.total.toString());
  const [bookedExpenses, setBookedExpenses] = useState(0);
  const [unbookedExpenses, setUnbookedExpenses] = useState(0);
  const [loading, setLoading] = useState(true);

  // Charger les dépenses réservées et non réservées
  useEffect(() => {
    const loadExpensesData = async () => {
      try {
        setLoading(true);
        const { booked, unbooked } = await getBookedAndUnbookedExpenses();
        setBookedExpenses(booked);
        setUnbookedExpenses(unbooked);
      } catch (error) {
        console.error('Erreur lors du chargement des dépenses:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExpensesData();
  }, [budget]); // Recharger lorsque le budget change

  const totalSpent = bookedExpenses + unbookedExpenses;
  const bookedPercentage = (bookedExpenses / budget.total) * 100;
  const unbookedPercentage = (unbookedExpenses / budget.total) * 100;
  const totalPercentage = bookedPercentage + unbookedPercentage;
  
  const budgetWarning = totalPercentage > 75 && totalPercentage <= 100;
  const budgetOverflow = totalPercentage > 100;

  const handleSaveBudget = async () => {
    try {
      const newTotalNumber = parseFloat(newTotal);
      if (isNaN(newTotalNumber) || newTotalNumber <= 0) {
        alert('Veuillez entrer un montant valide');
        return;
      }
      
      await updateBudget(newTotalNumber);
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du budget:', error);
      alert('Erreur lors de la mise à jour du budget');
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="card-title m-0">Budget</h5>
          <button 
            className="btn btn-sm btn-outline-primary" 
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Annuler' : 'Modifier'}
          </button>
        </div>
        
        {loading ? (
          <div className="d-flex justify-content-center my-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Barre de progression à deux couleurs */}
            <div className="progress mb-3" style={{ height: '15px' }}>
              {/* Partie réservée (verte) */}
              <div 
                className="progress-bar bg-success"
                role="progressbar" 
                style={{ width: `${Math.min(bookedPercentage, 100)}%` }} 
                aria-valuenow={Math.min(bookedPercentage, 100)} 
                aria-valuemin={0} 
                aria-valuemax={100}
              >
                {bookedPercentage > 8 ? `${bookedExpenses.toFixed(0)}€` : ''}
              </div>
              
              {/* Partie non réservée (rouge) */}
              <div 
                className="progress-bar bg-danger"
                role="progressbar" 
                style={{ width: `${Math.min(unbookedPercentage, 100 - bookedPercentage)}%` }} 
                aria-valuenow={Math.min(unbookedPercentage, 100 - bookedPercentage)} 
                aria-valuemin={0} 
                aria-valuemax={100}
              >
                {unbookedPercentage > 8 ? `${unbookedExpenses.toFixed(0)}€` : ''}
              </div>
            </div>

            <div className="mb-3 small">
              <div className="d-flex justify-content-between mb-1">
                <span>
                  <span className="badge bg-success me-1">&nbsp;</span>
                  Dépenses réservées: {bookedExpenses.toFixed(2)}€
                </span>
                <span>{(bookedPercentage).toFixed(1)}%</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>
                  <span className="badge bg-danger me-1">&nbsp;</span>
                  Dépenses à réserver: {unbookedExpenses.toFixed(2)}€
                </span>
                <span>{(unbookedPercentage).toFixed(1)}%</span>
              </div>
            </div>
            
            <div className="d-flex justify-content-between">
              <span>Total dépensé: {totalSpent.toFixed(2)}€</span>
              
              {isEditing ? (
                <div className="input-group input-group-sm" style={{ maxWidth: '200px' }}>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={newTotal} 
                    onChange={(e) => setNewTotal(e.target.value)}
                    min="1"
                    step="100"
                  />
                  <span className="input-group-text">€</span>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSaveBudget}
                  >
                    Enregistrer
                  </button>
                </div>
              ) : (
                <span>Budget: {budget.total.toFixed(2)}€</span>
              )}
            </div>
            
            {budgetOverflow && (
              <div className="alert alert-danger mt-2 mb-0 py-1 px-2" role="alert">
                <small>Vous avez dépassé votre budget!</small>
              </div>
            )}
            
            {budgetWarning && !budgetOverflow && (
              <div className="alert alert-warning mt-2 mb-0 py-1 px-2" role="alert">
                <small>Vous approchez votre limite de budget!</small>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BudgetOverview;