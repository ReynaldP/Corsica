// src/components/ExpensesChart.tsx
import React, { useEffect, useState } from 'react';
import { 
  getExpensesByCategory, 
  getExpensesByTag, 
  getCategoryBudgetLimits, 
  getTagBudgetLimits,
  updateCategoryBudgetLimits,
  updateTagBudgetLimits
} from '../services/tripService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

type GroupingMode = 'category' | 'tag';

interface ChartItem {
  name: string;
  amount: number;
  limit?: number;
  overBudget?: boolean;
}

const ExpensesChart: React.FC = () => {
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('category');
  const [budgetLimits, setBudgetLimits] = useState<Record<string, number>>({});
  const [editMode, setEditMode] = useState(false);
  const [newLimit, setNewLimit] = useState<Record<string, string>>({});
  const [savingLimits, setSavingLimits] = useState(false);

  // Fetch expenses and budget limits
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get expenses data based on grouping mode
        let expensesData: Record<string, number>;
        let limitsData: Record<string, number>;
        
        if (groupingMode === 'category') {
          [expensesData, limitsData] = await Promise.all([
            getExpensesByCategory(),
            getCategoryBudgetLimits()
          ]);
        } else {
          [expensesData, limitsData] = await Promise.all([
            getExpensesByTag(),
            getTagBudgetLimits()
          ]);
        }
        
        // Store budget limits
        setBudgetLimits(limitsData);
        
        // Initialize newLimit state with current limits
        const initialLimits: Record<string, string> = {};
        Object.entries(limitsData).forEach(([key, value]) => {
          initialLimits[key] = value.toString();
        });
        setNewLimit(initialLimits);
        
        // Transform data for chart
        const data = Object.entries(expensesData).map(([name, amount]) => {
          const limit = limitsData[name];
          return {
            name,
            amount: Number(amount.toFixed(2)),
            limit,
            overBudget: limit ? amount > limit : false
          };
        });
        
        // Sort by amount descending
        data.sort((a, b) => b.amount - a.amount);
        
        setChartData(data);
      } catch (err: any) {
        setError(err.message);
        console.error(`Erreur lors du chargement des données de dépenses par ${groupingMode}:`, err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [groupingMode]);
  
  // Handle input change for budget limits
  const handleLimitChange = (name: string, value: string) => {
    setNewLimit(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Save budget limits
  const handleSaveLimits = async () => {
    setSavingLimits(true);
    try {
      // Convert string values to numbers and filter out empty values
      const updatedLimits: Record<string, number> = {};
      Object.entries(newLimit).forEach(([key, value]) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue > 0) {
          updatedLimits[key] = numValue;
        }
      });
      
      // Save to Firebase based on grouping mode
      if (groupingMode === 'category') {
        await updateCategoryBudgetLimits(updatedLimits);
      } else {
        await updateTagBudgetLimits(updatedLimits);
      }
      
      // Update local state
      setBudgetLimits(updatedLimits);
      
      // Update chart data with new limits
      setChartData(prev => 
        prev.map(item => ({
          ...item,
          limit: updatedLimits[item.name],
          overBudget: updatedLimits[item.name] ? item.amount > updatedLimits[item.name] : false
        }))
      );
      
      // Exit edit mode
      setEditMode(false);
    } catch (err: any) {
      setError(`Erreur lors de l'enregistrement des limites: ${err.message}`);
    } finally {
      setSavingLimits(false);
    }
  };
  
  // Custom tooltip to show both amount and limit
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="custom-tooltip bg-white p-2 border shadow-sm">
          <p className="mb-1"><strong>{label}</strong></p>
          <p className="mb-1 text-primary">Dépenses: {item.amount}€</p>
          {item.limit && (
            <p className={`mb-0 ${item.overBudget ? 'text-danger' : 'text-success'}`}>
              Budget max: {item.limit}€ 
              {item.overBudget && ' (dépassé)'}
            </p>
          )}
        </div>
      );
    }
    return null;
  };
  
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
    const message = groupingMode === 'category'
      ? "Aucune donnée de dépense disponible. Ajoutez des activités avec des catégories et des prix pour voir des statistiques."
      : "Aucune donnée de dépense disponible. Ajoutez des activités avec des tags et des prix pour voir des statistiques.";
    return (
      <div className="alert alert-info" role="alert">
        {message}
      </div>
    );
  }
  
  const chartTitle = groupingMode === 'category' ? 'Dépenses par Catégorie' : 'Dépenses par Tag';

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="card-title mb-0">{chartTitle}</h5>
          <div className="d-flex align-items-center">
            <button 
              type="button" 
              className={`btn btn-sm ${editMode ? 'btn-outline-secondary' : 'btn-outline-primary'} me-2`}
              onClick={() => setEditMode(!editMode)}
              disabled={savingLimits}
            >
              {editMode ? 'Annuler' : 'Définir budgets max'}
            </button>
            <div className="btn-group btn-group-sm" role="group" aria-label="Mode de groupement">
              <button 
                type="button" 
                className={`btn ${groupingMode === 'category' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setGroupingMode('category')}
                disabled={editMode}
              >
                Catégorie
              </button>
              <button 
                type="button" 
                className={`btn ${groupingMode === 'tag' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setGroupingMode('tag')}
                disabled={editMode}
              >
                Tag
              </button>
            </div>
          </div>
        </div>
        
        {editMode ? (
          <div className="mb-3">
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Dépenses actuelles</th>
                    <th>Budget maximum</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map(item => (
                    <tr key={item.name}>
                      <td>{item.name}</td>
                      <td>{item.amount}€</td>
                      <td>
                        <div className="input-group input-group-sm">
                          <input
                            type="number"
                            className="form-control"
                            value={newLimit[item.name] || ''}
                            onChange={(e) => handleLimitChange(item.name, e.target.value)}
                            placeholder="Budget max"
                            min="0"
                            step="1"
                          />
                          <span className="input-group-text">€</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex justify-content-end mt-2">
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleSaveLimits}
                disabled={savingLimits}
              >
                {savingLimits ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    Enregistrement...
                  </>
                ) : 'Enregistrer les budgets'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {/* Use a custom shape renderer to color bars based on budget status */}
                <Bar 
                  dataKey="amount" 
                  name="Dépenses (€)" 
                  shape={(props: any) => {
                    const { x, y, width, height, payload } = props;
                    const fill = payload.overBudget ? '#dc3545' : '#28a745'; // Red if over budget, green if under
                    return (
                      <rect 
                        x={x} 
                        y={y} 
                        width={width} 
                        height={height} 
                        fill={fill} 
                        fillOpacity={0.8}
                        stroke={payload.overBudget ? '#b02a37' : '#208537'}
                        strokeWidth={1}
                        rx={2}
                        ry={2}
                      />
                    );
                  }}
                />
                {/* Add reference lines for budget limits with different colors */}
                {chartData.map((entry, index) => {
                  if (!entry.limit) return null;
                  
                  // Generate different colors for reference lines
                  const colors = ['#dc3545', '#fd7e14', '#6f42c1', '#20c997', '#0dcaf0', '#6610f2'];
                  const colorIndex = index % colors.length;
                  
                  return (
                    <ReferenceLine 
                      key={`limit-${entry.name}`}
                      x={entry.name} 
                      y={entry.limit} 
                      stroke={colors[colorIndex]}
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      isFront={true}
                      ifOverflow="extendDomain"
                      label={{
                        position: 'top',
                        value: `${entry.limit}€`,
                        fill: colors[colorIndex],
                        fontSize: 10
                      }}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpensesChart;
