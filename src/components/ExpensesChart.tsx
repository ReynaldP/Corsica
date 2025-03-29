// src/components/ExpensesChart.tsx
import React, { useEffect, useState } from 'react';
import { getExpensesByCategory } from '../services/tripService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ExpensesChart: React.FC = () => {
  const [chartData, setChartData] = useState<Array<{ name: string; amount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const expensesByCategory = await getExpensesByCategory();
                
        // Transformer les données pour Recharts
        const data = Object.entries(expensesByCategory).map(([category, amount]) => ({
          name: category,
          amount: Number(amount.toFixed(2))
        }));
                
        // Trier par montant décroissant
        data.sort((a, b) => b.amount - a.amount);
                
        setChartData(data);
      } catch (err: any) {
        setError(err.message);
        console.error('Erreur lors du chargement des données de dépenses:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        Erreur: {error}
      </div>
    );
  }
  
  if (chartData.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        Aucune donnée de dépense disponible. Ajoutez des activités avec des tags pour voir des statistiques.
      </div>
    );
  }
  
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">Dépenses par catégorie</h5>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: any) => [`${value}€`, 'Dépenses']} />
              <Legend />
              <Bar dataKey="amount" name="Montant (€)" fill="#0078a7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ExpensesChart;