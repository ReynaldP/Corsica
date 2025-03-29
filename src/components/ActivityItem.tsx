// src/components/ActivityItem.tsx
import React from 'react';
import { Activity } from '../types';

interface ActivityItemProps {
  activity: Activity;
  activityId: string;
  onEditClick: (activityId: string) => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, activityId, onEditClick }) => {
  return (
    <div 
      className="activity-item" 
      data-activity-id={activityId} 
      data-booked={activity.booked ? "true" : "false"}
      onClick={() => onEditClick(activityId)}
    >
      <div className="d-flex justify-content-between align-items-center">
        <h5>{activity.name}</h5>
        <span className={`badge ${activity.booked ? 'booked' : 'not-booked'}`}>
          {activity.booked ? 'Réservé' : 'À réserver'}
        </span>
      </div>
      
      {activity.time && (
        <p><strong>Horaire:</strong> {activity.time}</p>
      )}
      
      {activity.price && (
        <p><strong>Prix:</strong> {activity.price}€</p>
      )}
      
      {activity.notes && (
        <p>{activity.notes}</p>
      )}
      
      {activity.link && (
        <p>
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
      
      <div>
        {activity.tags && activity.tags.map((tag, index) => (
          <span key={index} className="tag">{tag}</span>
        ))}
      </div>
    </div>
  );
};

export default ActivityItem;