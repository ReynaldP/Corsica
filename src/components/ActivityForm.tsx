// src/components/ActivityForm.tsx
import React, { useState, useEffect } from 'react';
import { Activity } from '../types';
import { addActivity, updateActivity, deleteActivity } from '../services/tripService';

interface ActivityFormProps {
  dayId: string | null;
  activity: Activity | null;
  activityId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ActivityForm: React.FC<ActivityFormProps> = ({ 
  dayId, 
  activity, 
  activityId, 
  onClose, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState<Omit<Activity, 'id'>>({
    name: '',
    time: '',
    price: 0,
    link: '',
    notes: '',
    booked: false,
    tags: []
  });
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!activityId;

  // Initialiser le formulaire avec les données de l'activité si en mode édition
  useEffect(() => {
    if (activity) {
      setFormData({
        name: activity.name || '',
        time: activity.time || '',
        price: activity.price || 0,
        link: activity.link || '',
        notes: activity.notes || '',
        booked: activity.booked || false,
        tags: activity.tags || []
      });
      setTagsInput(activity.tags?.join(', ') || '');
    }
  }, [activity]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'tags') {
      setTagsInput(value);
      // Convertir les tags en tableau
      const tagsArray = value.split(',').map(tag => tag.trim()).filter(tag => tag);
      setFormData(prev => ({ ...prev, tags: tagsArray }));
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!dayId) {
      setError('ID du jour manquant');
      return;
    }
    
    if (!formData.name.trim()) {
      setError('Le nom de l\'activité est requis');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (isEditMode && activityId) {
        await updateActivity(dayId, activityId, formData);
      } else {
        await addActivity(dayId, formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!dayId || !activityId) return;
    
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette activité?')) {
      setIsSubmitting(true);
      try {
        await deleteActivity(dayId, activityId);
        onSuccess();
        onClose();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {isEditMode ? 'Modifier une activité' : 'Ajouter une activité'}
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              aria-label="Fermer"
            ></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              
              <div className="mb-3">
                <label htmlFor="name" className="form-label">Nom de l'activité</label>
                <input 
                  type="text" 
                  className="form-control" 
                  id="name" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="time" className="form-label">Horaire</label>
                <input 
                  type="text" 
                  className="form-control" 
                  id="time" 
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  placeholder="ex: 10h00-12h00"
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="price" className="form-label">Prix (€)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  id="price" 
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0" 
                  step="0.01"
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="link" className="form-label">Lien (site web)</label>
                <input 
                  type="url" 
                  className="form-control" 
                  id="link" 
                  name="link"
                  value={formData.link}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="notes" className="form-label">Notes</label>
                <textarea 
                  className="form-control" 
                  id="notes" 
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                ></textarea>
              </div>
              
              <div className="form-check mb-3">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="booked" 
                  name="booked"
                  checked={formData.booked}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="booked">
                  Réservé
                </label>
              </div>
              
              <div className="mb-3">
                <label htmlFor="tags" className="form-label">Tags (séparés par des virgules)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  id="tags" 
                  name="tags"
                  value={tagsInput}
                  onChange={handleChange}
                  placeholder="ex: Randonnée, Plage, Culture"
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Annuler
              </button>
              
              {isEditMode && (
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  Supprimer
                </button>
              )}
              
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Traitement...
                  </>
                ) : isEditMode ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ActivityForm;