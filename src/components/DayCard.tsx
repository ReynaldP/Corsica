// src/components/DayCard.tsx
import React from 'react';
import { Day, Activity } from '../types';
import ActivityItem from './ActivityItem';

interface DayCardProps {
  day: Day;
  index: number;
  onAddActivity: (dayId: string) => void;
  onEditActivity: (dayId: string, activityId: string) => void;
}

const DayCard: React.FC<DayCardProps> = ({ day, index, onAddActivity, onEditActivity }) => {
  // Vérifier si ce jour a des activités réservées ou non réservées
  const hasBookedActivities = Object.values(day.activities || {}).some(activity => activity.booked);
  const hasNotBookedActivities = Object.values(day.activities || {}).some(activity => !activity.booked);
  
  // Classe CSS pour le filtrage
  const dayClasses = `day-card card mb-4 ${hasBookedActivities ? 'has-booked' : ''} ${hasNotBookedActivities ? 'has-not-booked' : ''}`;
  
  return (
    <div className="col-lg-6 day-card-container" data-day-id={day.id}>
      <div className={dayClasses}>
        <div className="day-header">
          <h3>{day.date} - {day.title}</h3>
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