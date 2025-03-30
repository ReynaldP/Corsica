// Modification du composant DayCard pour debugger

import React, { useEffect } from 'react';
import { Day, Activity } from '../types';
import ActivityItem from './ActivityItem';

interface DayCardProps {
  day: Day;
  index: number;
  onAddActivity: (dayId: string) => void;
  onEditActivity: (dayId: string, activityId: string) => void;
}

const DayCard: React.FC<DayCardProps> = ({ day, index, onAddActivity, onEditActivity }) => {
  // Log au montage pour confirmer que le composant est bien rendu
  useEffect(() => {
    console.log(`DayCard ${index} (${day.id}) - Monté`);
    
    // Nettoyage
    return () => {
      console.log(`DayCard ${index} (${day.id}) - Démonté`);
    };
  }, [day.id, index]);
  
  // Vérifier si ce jour a des activités réservées ou non réservées
  const hasBookedActivities = Object.values(day.activities || {}).some(activity => activity.booked === true);
  const hasNotBookedActivities = Object.values(day.activities || {}).some(activity => activity.booked === false);
  
  // Classe CSS pour le filtrage
  const dayClasses = `day-card card mb-4 ${hasBookedActivities ? 'has-booked' : ''} ${hasNotBookedActivities ? 'has-not-booked' : ''}`;
  
  // Logging pour debug
  console.log(`DayCard ${index} (${day.id}) - Render`, {
    hasBookedActivities,
    hasNotBookedActivities,
    activitiesCount: Object.keys(day.activities || {}).length,
    dayData: day
  });
  
  return (
    <div 
      className="col-lg-6 day-card-container" 
      data-day-id={day.id}
      data-index={index}
      data-has-booked={hasBookedActivities ? "true" : "false"}
      data-has-not-booked={hasNotBookedActivities ? "true" : "false"}
    >
      <div className={dayClasses}>
        <div className="day-header d-flex justify-content-between align-items-center">
          <h3>{day.date} - {day.title}</h3>
          <div>
            <span className="badge bg-info me-2">Jour {index + 1}</span>
            {hasBookedActivities && <span className="badge bg-success me-1">Réservé</span>}
            {hasNotBookedActivities && <span className="badge bg-danger me-1">À réserver</span>}
          </div>
        </div>
        <div className="card-body">
          <div className="activities-container">
            {Object.entries(day.activities || {}).length > 0 ? (
              Object.entries(day.activities).map(([activityId, activity]) => (
                <ActivityItem 
                  key={activityId}
                  activityId={activityId}
                  activity={activity as Activity}
                  onEditClick={(id) => onEditActivity(day.id, id)}
                />
              ))
            ) : (
              <p>Aucune activité planifiée</p>
            )}
          </div>
          <button 
            type="button" 
            className="btn add-activity-btn mt-3"
            onClick={() => onAddActivity(day.id)}
          >
            + Ajouter une activité
          </button>
        </div>
      </div>
    </div>
  );
};

export default DayCard;