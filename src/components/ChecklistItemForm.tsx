// src/components/ChecklistItemForm.tsx
import React, { useState, useEffect } from 'react';
import { ChecklistItem } from '../types';
import { useTheme } from '../context/ThemeContext';

interface ChecklistItemFormProps {
  item?: ChecklistItem;
  onSubmit: (item: Omit<ChecklistItem, 'id'>) => void;
  onCancel: () => void;
}

const ChecklistItemForm: React.FC<ChecklistItemFormProps> = ({ 
  item, 
  onSubmit, 
  onCancel 
}) => {
  const { isDarkMode } = useTheme();
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | undefined>(undefined);

  // Initialize form with item data if editing
  useEffect(() => {
    if (item) {
      setText(item.text);
      setCategory(item.category || '');
      setPriority(item.priority);
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!text.trim()) {
      alert('Veuillez saisir un texte pour l\'élément de la checklist');
      return;
    }
    
    // Create item object - explicitly include the completed status
    const newItem: Omit<ChecklistItem, 'id'> = {
      text: text.trim(),
      completed: item ? item.completed : false,
      ...(category ? { category: category.trim() } : {}),
      ...(priority ? { priority } : {})
    };
    
    // Log what we're submitting for debugging
    console.log("ChecklistItemForm: Submitting item", { 
      isEdit: !!item, 
      itemId: item?.id,
      newItem 
    });
    
    // Submit the form data
    onSubmit(newItem);
    
    // Reset form
    setText('');
    setCategory('');
    setPriority(undefined);
  };

  return (
    <div className={`card mb-4 ${isDarkMode ? 'bg-dark text-white' : ''}`}>
      <div className="card-body">
        <h5 className="card-title">
          {item ? 'Modifier l\'élément' : 'Ajouter un nouvel élément'}
        </h5>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="itemText" className="form-label">Texte *</label>
            <input
              type="text"
              className={`form-control ${isDarkMode ? 'bg-dark text-white' : ''}`}
              id="itemText"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Que devez-vous faire ?"
              required
            />
          </div>
          
          <div className="mb-3">
            <label htmlFor="itemCategory" className="form-label">Catégorie (optionnel)</label>
            <input
              type="text"
              className={`form-control ${isDarkMode ? 'bg-dark text-white' : ''}`}
              id="itemCategory"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: Documents, Vêtements, Équipement..."
            />
          </div>
          
          <div className="mb-3">
            <label className="form-label">Priorité (optionnel)</label>
            <div className="d-flex">
              <div className="form-check me-3">
                <input
                  className="form-check-input"
                  type="radio"
                  name="priority"
                  id="priorityLow"
                  checked={priority === 'low'}
                  onChange={() => setPriority('low')}
                />
                <label className="form-check-label" htmlFor="priorityLow">
                  Basse
                </label>
              </div>
              <div className="form-check me-3">
                <input
                  className="form-check-input"
                  type="radio"
                  name="priority"
                  id="priorityMedium"
                  checked={priority === 'medium'}
                  onChange={() => setPriority('medium')}
                />
                <label className="form-check-label" htmlFor="priorityMedium">
                  Moyenne
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="priority"
                  id="priorityHigh"
                  checked={priority === 'high'}
                  onChange={() => setPriority('high')}
                />
                <label className="form-check-label" htmlFor="priorityHigh">
                  Haute
                </label>
              </div>
            </div>
          </div>
          
          <div className="d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-outline-secondary me-2"
              onClick={onCancel}
            >
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              {item ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChecklistItemForm;
