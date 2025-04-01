// Modification du composant DayCard pour debugger

import React, { useEffect, useState } from 'react';
import { Day, Activity } from '../types';
import ActivityItem from './ActivityItem';
import WeatherWidget from './WeatherWidget'; // Import WeatherWidget
import { FilterType } from '../types'; // Import FilterType
import { Droppable, Draggable } from 'react-beautiful-dnd';

interface DayCardProps {
  day: Day;
  index: number;
  filter: FilterType; // Add filter prop
  onAddActivity: (dayId: string) => void;
  onEditActivity: (dayId: string, activityId: string) => void;
  onFindNearbyRestaurantsForActivity: (lat: number, lon: number, type?: string) => void; // Add type parameter
}

const DayCard: React.FC<DayCardProps> = ({ day, index, filter, onAddActivity, onEditActivity, onFindNearbyRestaurantsForActivity }) => {
  // State to track activity order locally
  const [localActivityOrder, setLocalActivityOrder] = useState<string[]>([]);
  // Log au montage pour confirmer que le composant est bien rendu
  useEffect(() => {
    console.log(`DayCard ${index} (${day.id}) - Monté`);
    
  // Initialize local activity order from day.activityOrder or from activitiesById keys
  const initialOrder = day.activityOrder && day.activityOrder.length > 0 
    ? day.activityOrder 
    : Object.keys(day.activitiesById || {});
  
  setLocalActivityOrder(initialOrder);
  
  // Log for debugging
  console.log(`DayCard ${index} (${day.id}) - Activity Order:`, initialOrder);
  console.log(`DayCard ${index} (${day.id}) - Activities:`, day.activitiesById);
    
    // Nettoyage
    return () => {
      console.log(`DayCard ${index} (${day.id}) - Démonté`);
    };
  }, [day.id, day.activityOrder, day.activitiesById, index]);
  
  // Vérifier si ce jour a des activités réservées ou non réservées
  const hasBookedActivities = Object.values(day.activitiesById || {}).some(activity => activity.booked === true);
  const hasNotBookedActivities = Object.values(day.activitiesById || {}).some(activity => activity.booked === false);
  
  // Classe CSS pour le filtrage
  const dayClasses = `day-card card mb-4 ${hasBookedActivities ? 'has-booked' : ''} ${hasNotBookedActivities ? 'has-not-booked' : ''}`;
  
  // Logging pour debug (can be removed later)
  // console.log(`DayCard ${index} (${day.id}) - Render`, {
  //   hasBookedActivities,
  //   hasNotBookedActivities,
  //   activitiesCount: Object.keys(day.activitiesById || {}).length,
  //   dayData: day,
  //   currentFilter: filter // Log the received filter
  // });

  // Drag and drop is now handled at the Dashboard level

  // Get activities to display - first try using localActivityOrder, but fall back to direct object entries if needed
  let activitiesToDisplay: [string, Activity][] = [];
  
  // If we have a valid localActivityOrder with items, use it to order the activities
  if (localActivityOrder && localActivityOrder.length > 0) {
    activitiesToDisplay = localActivityOrder
      .map(activityId => {
        const activity = day.activitiesById[activityId];
        return activity ? [activityId, activity] as [string, Activity] : null;
      })
      .filter((item): item is [string, Activity] => item !== null);
  } 
  // Otherwise, fall back to using Object.entries directly
  else {
    activitiesToDisplay = Object.entries(day.activitiesById || {}) as [string, Activity][];
  }
  
  // Apply filtering based on the current filter prop
  const filteredActivities = activitiesToDisplay.filter(([_, activity]) => {
    if (filter === 'all') {
      return true; // Show all activities
    }
    if (filter === 'booked') {
      return activity.booked === true; // Show only booked
    }
    if (filter === 'not-booked') {
      return activity.booked === false; // Show only not-booked
    }
    return true; // Default case (shouldn't happen with FilterType)
  });

  // Find the first activity with coordinates to use for the weather widget
  const firstActivityWithCoords = activitiesToDisplay.find(([_, activity]) => 
    activity.lat != null && activity.lon != null
  )?.[1]; // Get the activity object itself

  return (
    // Revert: Remove d-flex 
    <div 
      className="col-lg-6 day-card-container" 
      data-day-id={day.id}
      data-index={index}
      data-has-booked={hasBookedActivities ? "true" : "false"}
      data-has-not-booked={hasNotBookedActivities ? "true" : "false"}
    >
      {/* Revert: Remove h-100 */}
      <div className={dayClasses}>
        {/* Adjust header flex direction for mobile */}
        <div className="day-header d-flex flex-column flex-md-row justify-content-between align-items-md-center">
          <h3 className="mb-2 mb-md-0 me-md-3">{day.date} - {day.title}</h3> {/* Add margin for spacing */}
          <div className="d-flex flex-wrap"> {/* Allow badges to wrap */}
            <span className="badge bg-info me-2 mb-1 mb-md-0">Jour {index + 1}</span> {/* Add bottom margin on mobile */}
            {hasBookedActivities && <span className="badge bg-success me-1 mb-1 mb-md-0">Réservé</span>}
            {hasNotBookedActivities && <span className="badge bg-danger me-1 mb-1 mb-md-0">À réserver</span>}
          </div>
        </div>
        {/* Revert: Remove d-flex flex-column */}
        <div className="card-body"> 
          {/* Render Weather Widget if coordinates are found */}
          {firstActivityWithCoords && firstActivityWithCoords.lat != null && firstActivityWithCoords.lon != null && (
            <WeatherWidget 
              lat={firstActivityWithCoords.lat} 
              lon={firstActivityWithCoords.lon}
              // Attempt to extract a meaningful location name from the address or use day title
              locationName={firstActivityWithCoords.address?.split(',')[0] || day.title} 
            />
          )}
          {/* Revert: Remove flex-grow-1 */}
          <div className="activities-container">
            {filteredActivities.length > 0 ? (
              // Move DragDropContext to a higher level component (Dashboard)
              <Droppable droppableId={`day-${day.id}`} key={`day-${day.id}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="activities-list"
                    >
                      {filteredActivities.map(([activityId, activity], activityIndex) => (
                        <Draggable 
                          key={activityId} 
                          draggableId={`activity-${activityId}`} 
                          index={activityIndex}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`draggable-activity ${snapshot.isDragging ? 'is-dragging' : ''}`}
                            >
                              <ActivityItem 
                                dayId={day.id} 
                                activityId={activityId}
                                activity={activity}
                                onEditClick={(id) => onEditActivity(day.id, id)}
                                onFindNearbyRestaurants={onFindNearbyRestaurantsForActivity} // Pass the prop down
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
            ) : (
              // Update the message based on the filter
              <p className="text-center text-muted fst-italic">
                {filter === 'all' 
                  ? 'Aucune activité planifiée pour ce jour.' 
                  : `Aucune activité ${filter === 'booked' ? 'réservée' : 'non réservée'} pour ce jour.`}
              </p>
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
