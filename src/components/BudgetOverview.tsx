// src/components/BudgetOverview.tsx
import React, { useState } from 'react';
import { Budget } from '../types';
import { updateBudget } from '../services/tripService';

interface BudgetOverviewProps {
  budget: Budget;
}

const BudgetOverview: React.FC<BudgetOverviewProps> = ({ budget }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newTotal, setNewTotal] = useState(budget.total.toString());

  const budgetPercentage = (budget.spent / budget.total) * 100;
  const budgetWarning = budgetPercentage > 75 && budgetPercentage <= 100;
  const budgetOverflow = budgetPercentage > 100;
  
  const getProgressBarClass = () => {
    if (budgetOverflow) return 'bg-danger';
    if (budgetWarning) return 'bg-warning';
    return 'bg-success';
  };

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
        
        <div className="progress mb-3">
          <div 
            className={`progress-bar ${getProgressBarClass()}`}
            role="progressbar" 
            style={{ width: `${Math.min(budgetPercentage, 100)}%` }} 
            aria-valuenow={Math.min(budgetPercentage, 100)} 
            aria-valuemin={0} 
            aria-valuemax={100}
          ></div>
        </div>
        
        <div className="d-flex justify-content-between">
          <span>Total dépensé: {budget.spent.toFixed(2)}€</span>
          
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
      </div>
    </div>
  );
};

export default BudgetOverview;