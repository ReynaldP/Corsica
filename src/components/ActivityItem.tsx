// src/components/ActivityItem.tsx
import React from 'react';
import { Activity } from '../types';
import { deleteActivity } from '../services/tripService';

interface ActivityItemProps {
  activity: Activity;
  activityId: string;
  onEditClick: (activityId: string) => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, activityId, onEditClick }) => {
  // Fonction pour confirmer et supprimer une activité
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher le déclenchement de l'édition
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'activité "${activity.name}" ?`)) {
      try {
        // Nous avons besoin du dayId, mais il n'est pas disponible directement ici
        // On peut trouver l'élément parent avec data-day-id en remontant le DOM
        const dayCardContainer = (e.currentTarget as HTMLElement).closest('[data-day-id]');
        if (!dayCardContainer) {
          alert("Impossible de déterminer le jour associé à cette activité");
          return;
        }
        
        const dayId = dayCardContainer.getAttribute('data-day-id');
        if (!dayId) {
          alert("ID du jour non trouvé");
          return;
        }
        
        await deleteActivity(dayId, activityId);
        // La mise à jour UI se fera automatiquement via Firebase
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        alert("Erreur lors de la suppression de l'activité");
      }
    }
  };

  return (
    <div 
      className="activity-item" 
      data-activity-id={activityId} 
      data-booked={activity.booked ? "true" : "false"}
    >
      <div className="d-flex justify-content-between align-items-start">
        <h5 className="mb-1" onClick={() => onEditClick(activityId)}>{activity.name}</h5>
        <div>
          <span className={`badge ${activity.booked ? 'booked' : 'not-booked'} me-2`}>
            {activity.booked ? 'Réservé' : 'À réserver'}
          </span>
          <div className="btn-group btn-group-sm">
            <button 
              type="button" 
              className="btn btn-outline-primary btn-sm"
              onClick={() => onEditClick(activityId)}
              aria-label="Modifier l'activité"
            >
              <i className="bi bi-pencil"></i>
            </button>
            <button 
              type="button" 
              className="btn btn-outline-danger btn-sm"
              onClick={handleDelete}
              aria-label="Supprimer l'activité"
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
      
      <div className="activity-details" onClick={() => onEditClick(activityId)}>
        {activity.time && (
          <p className="mb-1"><strong>Horaire:</strong> {activity.time}</p>
        )}
        
        {activity.price && (
          <p className="mb-1"><strong>Prix:</strong> {activity.price}€</p>
        )}
        
        {activity.notes && (
          <p className="mb-1">{activity.notes}</p>
        )}
        
        {activity.link && (
          <p className="mb-1">
            <a 
              href={activity.link} 
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={(e) => e.stopPropagation()} // Éviter de déclencher l'édition
            >
              Plus d'informations
            </a>
          </p>
        )}
        
        <div className="activity-tags">
          {activity.tags && activity.tags.map((tag, index) => (
            <span key={index} className="tag">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityItem;