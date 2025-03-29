// src/components/FilterBar.tsx
import React from 'react';
import { FilterType } from '../types';

interface FilterBarProps {
  currentFilter: FilterType;
  setFilter: (filter: FilterType) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ currentFilter, setFilter }) => {
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">Filtres</h5>
        <div className="btn-group" role="group">
          <button 
            type="button" 
            className={`btn ${currentFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFilter('all')}
          >
            Tout
          </button>
          <button 
            type="button" 
            className={`btn ${currentFilter === 'booked' ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setFilter('booked')}
          >
            Réservé
          </button>
          <button 
            type="button" 
            className={`btn ${currentFilter === 'not-booked' ? 'btn-danger' : 'btn-outline-danger'}`}
            onClick={() => setFilter('not-booked')}
          >
            À réserver
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;