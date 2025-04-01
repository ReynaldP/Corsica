// src/components/ActivityItem.tsx
import React, { useState } from 'react'; // Import useState
import { Activity, ActivityCategory } from '../types'; // Import ActivityCategory
import { deleteActivity } from '../services/tripService';
// Optional: Import an icon library if you want visual indicators
// import { BsChevronDown, BsChevronUp } from 'react-icons/bs';

// Helper function to get color class based on category
const getCategoryColorClass = (category?: ActivityCategory): string => {
  switch (category) {
    case 'Logement': return 'bg-primary';
    case 'Transport': return 'bg-info text-dark'; // Use text-dark for better contrast on light blue
    case 'Activité': return 'bg-success';
    case 'Alimentation': return 'bg-warning text-dark'; // Use text-dark for better contrast on yellow
    case 'Autre': return 'bg-secondary';
    default: return 'bg-light text-dark'; // Default for undefined category
  }
};

interface ActivityItemProps {
  dayId: string; // Add dayId prop
  activity: Activity;
  activityId: string;
  onEditClick: (activityId: string) => void;
  onFindNearbyRestaurants: (lat: number, lon: number, type?: string) => void; // Add type parameter
}

const ActivityItem: React.FC<ActivityItemProps> = ({ dayId, activity, activityId, onEditClick, onFindNearbyRestaurants }) => {
  const [isExpanded, setIsExpanded] = useState(false); // State for expansion

  // Toggle expansion
  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Fonction pour confirmer et supprimer une activité
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering expand/collapse or edit
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'activité "${activity.name}" ?`)) {
      try {
        // Use the dayId prop directly
        await deleteActivity(dayId, activityId);
        // La mise à jour UI se fera automatiquement via Firebase
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        alert("Erreur lors de la suppression de l'activité");
      }
    }
  };

  // No longer need handleButtonClick helper

  return (
    <div 
      className="activity-item" 
      data-activity-id={activityId} 
      data-booked={activity.booked ? "true" : "false"}
      onClick={handleToggleExpand} // Toggle expand on the whole item click
      style={{ cursor: 'pointer' }} // Indicate it's clickable
    >
      {/* Adjust flex direction and alignment for mobile */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start">
        {/* Left side: Name and Category */}
        {/* Allow wrapping for long names/categories */}
        <div className="d-flex align-items-center flex-wrap mb-2 mb-md-0 me-md-2">
          <h5 className="mb-1 me-2">{activity.name}</h5>
          {activity.category && (
            <span className={`badge ${getCategoryColorClass(activity.category)} category-badge mb-1`}>
              {activity.category}
            </span>
          )}
        </div>
        {/* Right side: Status and Buttons */}
        {/* Align buttons to the start on mobile, end on medium+ */}
        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center"> 
          <span className={`badge ${activity.booked ? 'booked' : 'not-booked'} me-md-2 mb-2 mb-md-0`}> {/* Add bottom margin on mobile */}
            {activity.booked ? 'Réservé' : 'À réserver'}
          </span>
          {/* Use handleButtonClick to stop propagation */}
          {/* Stop propagation directly in onClick */}
          {/* Ensure button group wraps or stacks if needed, though btn-group might handle it */}
          <div className="btn-group"> 
            <button 
              type="button" 
              className="btn btn-sm btn-outline-primary me-1" // Make buttons slightly smaller
              onClick={(e) => {
                e.stopPropagation(); // Stop propagation here
                onEditClick(activityId); // Call original handler
              }}
              aria-label="Modifier l'activité"
            >
              <i className="bi bi-pencil"></i>
            </button>
            <button 
              type="button" 
              className="btn btn-sm btn-outline-danger" // Make buttons slightly smaller
              onClick={(e) => {
                e.stopPropagation(); // Stop propagation here
                handleDelete(e); // Call original handler, passing the event
              }}
              aria-label="Supprimer l'activité"
            >
              <i className="bi bi-trash"></i>
            </button>
            {/* Optional: Add expand/collapse icon */}
            {/* <span className="ms-2 align-self-center">
              {isExpanded ? <BsChevronUp /> : <BsChevronDown />}
            </span> */}
          </div>
        </div>
      </div>
      
      {/* Conditionally render details based on isExpanded state */}
      {isExpanded && (
        // Remove onClick handler from details div
        <div className="activity-details mt-2"> 
          {activity.time && (
            <p className="mb-1"><strong>Horaire:</strong> {activity.time}</p>
          )}
          
          {activity.price != null && activity.price > 0 && ( // Show price only if > 0
            <p className="mb-1"><strong>Prix:</strong> {activity.price}€</p>
          )}
          
          {activity.notes && (
            <p className="mb-1"><strong>Notes:</strong> {activity.notes}</p>
          )}

          {/* Add Address and Google Maps Link */}
          {activity.address && (
            <p className="mb-1">
              <strong>Adresse:</strong> {activity.address}
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.address)}`}
                target="_blank" 
                rel="noopener noreferrer" 
                className="ms-2" // Add some spacing
                onClick={(e) => e.stopPropagation()} // Prevent expand/collapse
                title="Ouvrir dans Google Maps"
              >
                <i className="bi bi-geo-alt-fill"></i> {/* Map pin icon */}
              </a>
            </p>
          )}
          
          {activity.link && (
            <p className="mb-1">
              <a 
                href={activity.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => e.stopPropagation()} // Prevent expand/collapse when clicking link
              >
                Plus d'informations <i className="bi bi-box-arrow-up-right ms-1 small"></i>
              </a>
            </p>
          )}
          
          {activity.tags && activity.tags.length > 0 && ( // Check if tags exist
            <div className="activity-tags">
              {activity.tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>
          )}

          {/* Add Button to find nearby places if lat/lon exist */}
          {activity.lat != null && activity.lon != null && (
            <div className="mt-2">
              <p className="mb-1"><strong>Explorer les environs:</strong></p>
              {/* Make button group vertical on small screens, horizontal on medium+ */}
              <div className="btn-group-vertical btn-group-md"> 
                <button 
                  className="btn btn-sm btn-outline-info"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent expand/collapse
                    onFindNearbyRestaurants(activity.lat!, activity.lon!, 'restaurant'); // Specify restaurant type
                  }}
                  title="Restaurants à proximité"
                >
                  <i className="bi bi-cup-hot me-1"></i> Restaurants
                </button>
                <button 
                  className="btn btn-sm btn-outline-info"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent expand/collapse
                    onFindNearbyRestaurants(activity.lat!, activity.lon!, 'bar'); // Specify bar type
                  }}
                  title="Bars à proximité"
                >
                  <i className="bi bi-cup-straw me-1"></i> Bars
                </button>
                <button 
                  className="btn btn-sm btn-outline-info"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent expand/collapse
                    onFindNearbyRestaurants(activity.lat!, activity.lon!, 'tourist_attraction'); // Specify attraction type
                  }}
                  title="Attractions touristiques à proximité"
                >
                  <i className="bi bi-camera me-1"></i> Attractions
                </button>
              </div>
            </div>
          )}

          {/* Display Attachments */}
          {activity.attachments && activity.attachments.length > 0 && (
            <div className="mt-2">
              <p className="mb-1"><strong>Fichiers joints:</strong></p>
              <ul className="list-unstyled">
                {activity.attachments.map((att, index) => (
                  <li key={index} className="mb-1">
                    <a 
                      href={att.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()} // Prevent expand/collapse
                    >
                      <i className="bi bi-paperclip me-1"></i>{att.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityItem;
