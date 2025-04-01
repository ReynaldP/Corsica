// src/components/ChecklistItem.tsx
import React from 'react';
import { ChecklistItem as ChecklistItemType } from '../types';
import { useTheme } from '../context/ThemeContext';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onToggleComplete: (id: string, completed: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({ 
  item, 
  onToggleComplete, 
  onEdit, 
  onDelete 
}) => {
  const { isDarkMode } = useTheme();

  // Get priority color
  const getPriorityColor = () => {
    switch (item.priority) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'secondary';
    }
  };

  return (
    <div 
      className={`card mb-2 ${isDarkMode ? 'bg-dark text-white' : ''}`}
      style={{ opacity: item.completed ? 0.7 : 1 }}
    >
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center flex-grow-1">
            <div className="form-check me-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={item.completed}
                onChange={() => onToggleComplete(item.id, !item.completed)}
                id={`check-${item.id}`}
              />
              <label 
                className="form-check-label visually-hidden" 
                htmlFor={`check-${item.id}`}
              >
                Marquer comme {item.completed ? 'non complété' : 'complété'}
              </label>
            </div>
            
            <div>
              <p 
                className={`mb-0 ${item.completed ? 'text-decoration-line-through' : ''}`}
                style={{ fontWeight: item.completed ? 'normal' : 'bold' }}
              >
                {item.text}
              </p>
              
              {item.category && (
                <small className="text-muted d-block mt-1">
                  Catégorie: {item.category}
                </small>
              )}
            </div>
          </div>
          
          {item.priority && (
            <span className={`badge bg-${getPriorityColor()} me-2`}>
              {item.priority === 'high' ? 'Haute' : 
               item.priority === 'medium' ? 'Moyenne' : 'Basse'}
            </span>
          )}
          
          <div className="btn-group">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => onEdit(item.id)}
              aria-label="Modifier"
            >
              <i className="bi bi-pencil"></i>
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => onDelete(item.id)}
              aria-label="Supprimer"
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistItem;
