// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable'; // Import useSwipeable
import Header from '../components/Header';
import BudgetOverview from '../components/BudgetOverview';
import FilterBar from '../components/FilterBar';
import DayCard from '../components/DayCard';
import ActivityForm from '../components/ActivityForm';
import ExpensesChart from '../components/ExpensesChart';
import TripMap from '../components/TripMap';
import NearbyPlacesResults from '../components/NearbyPlacesResults';
import { loadTripData, createInitialData, updateActivityOrder, updateAllActivityCoordinates } from '../services/tripService';
import { ref, get } from 'firebase/database';
import { db } from '../services/firebase';
import { TripData, Day, Activity, FilterType, GeoLocation } from '../types';
import { useTheme } from '../context/ThemeContext';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';

const Dashboard: React.FC = () => {
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // État pour le filtrage des activités
  const [filter, setFilter] = useState<FilterType>('all');

  // États pour le modal d'activité
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // État pour l'affichage des statistiques
  const [showStats, setShowStats] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState(0); // State for mobile swipe navigation
  const [mapFilterDayId, setMapFilterDayId] = useState<string>('all'); // State for map day filter

  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(null);

  // State to trigger nearby places panel display
  const [nearbySearchCoords, setNearbySearchCoords] = useState<{lat: number, lng: number} | null>(null);
  const [nearbySearchType, setNearbySearchType] = useState<string>('restaurant'); // Default type

  const { isDarkMode } = useTheme();

  // Charger les données du voyage
  useEffect(() => {
    let unsubscribe: () => void;
    let isActive = true; // Pour éviter les mises à jour d'état après démontage

    const loadData = async () => {
      console.log("Dashboard: Loading trip data");
      setLoading(true);
      setError(null);

      try {
        // Mettre en place l'abonnement aux données
        unsubscribe = loadTripData((data) => {
          if (!isActive) return;

          console.log("Dashboard: Trip data received", data ? "Data exists" : "No data");
          if (data) {
            console.log("Dashboard: Processing trip data before setting state");
            
            // Toujours mettre à jour les coordonnées pour toutes les activités avec des adresses
            // pour s'assurer que les repères rouges s'affichent correctement
            updateAllActivityCoordinates()
              .then((hasUpdates) => {
                console.log(`Dashboard: All activity coordinates updated. Updates made: ${hasUpdates}`);
                
                // Recharger les données après la mise à jour des coordonnées
                // pour s'assurer que nous avons les données les plus récentes
                const tripRef = ref(db, 'trip');
                return get(tripRef);
              })
              .then((updatedSnapshot) => {
                const updatedData = updatedSnapshot.val();
                if (updatedData) {
                  console.log("Dashboard: Reloaded data after coordinate update");
                  
                  // Transformer les données mises à jour
                  const updatedFormattedData: TripData = {
                    days: Array.isArray(updatedData.days)
                      ? updatedData.days
                      : Object.entries(updatedData.days).map(([dayId, dayData]: [string, any]) => {
                        const activityOrder = dayData.activityOrder || [];
                        const activitiesById = dayData.activitiesById || {};
                        
                        return {
                          id: dayId,
                          date: dayData.date,
                          title: dayData.title,
                          activityOrder: activityOrder,
                          activitiesById: activitiesById,
                        };
                      }),
                    budget: updatedData.budget || { total: 2000, spent: 0 }
                  };
                  
                  // Mettre à jour l'état avec les données mises à jour
                  setTripData(updatedFormattedData);
                  setLoading(false);
                } else {
                  // Si pour une raison quelconque nous ne pouvons pas recharger les données,
                  // utiliser les données originales
                  console.log("Dashboard: Could not reload data, using original data");
                  setTripData(data);
                  setLoading(false);
                }
              })
              .catch((err) => {
                console.error("Dashboard: Error reloading data after coordinate update", err);
                // En cas d'erreur, utiliser les données originales
                setTripData(data);
                setLoading(false);
              });
          } else {
            // Si aucune donnée n'est disponible, créer des données initiales
            console.log("Dashboard: No data, creating initial data");
            createInitialData()
              .then((initialData) => {
                if (!isActive) return;
                setTripData(initialData);
                setLoading(false);
              })
              .catch((err) => {
                if (!isActive) return;
                console.error("Dashboard: Error creating initial data", err);
                setError("Erreur lors de la création des données initiales. Veuillez réessayer.");
                setLoading(false);
              });
          }
        });
      } catch (err: any) {
        if (!isActive) return;
        console.error("Dashboard: Error in data loading process", err);
        setError(err.message || "Erreur lors du chargement des données");
        setLoading(false);
      }
    };

    loadData();

    // Nettoyage lors du démontage du composant
    return () => {
      console.log("Dashboard: Cleaning up trip data subscription");
      isActive = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Swipe handlers for mobile
  const handleSwipeLeft = () => {
    if (tripData && currentDayIndex < tripData.days.length - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
    }
  };

  const handleSwipeRight = () => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleSwipeLeft,
    onSwipedRight: handleSwipeRight,
    preventScrollOnSwipe: true, // Prevent vertical scroll during horizontal swipe
    trackMouse: true // Optional: Allow swiping with mouse for testing
  });

  // Gestionnaire pour ouvrir le modal d'ajout d'activité
  const handleAddActivity = (dayId: string) => {
    console.log("Dashboard: Adding activity for day", dayId);
    setSelectedDayId(dayId);
    setSelectedActivityId(null);
    setSelectedActivity(null);
    setShowActivityModal(true);
  };

  // Gestionnaire pour ouvrir le modal de modification d'activité
  const handleEditActivity = (dayId: string, activityId: string) => {
    console.log("Dashboard: Editing activity", { dayId, activityId });
    if (!tripData) return;

    // Trouver le jour par ID
    const day = tripData.days.find(d => d.id === dayId);
    if (!day) {
      console.error("Dashboard: Day not found", dayId);
      return;
    }

    // Trouver l'activité par ID
    const activity = day.activitiesById[activityId];
    if (!activity) {
      console.error("Dashboard: Activity not found", activityId);
      return;
    }

    setSelectedDayId(dayId);
    setSelectedActivityId(activityId);
    setSelectedActivity({ ...activity, id: activityId });
    setShowActivityModal(true);
  };

  // Gestionnaire pour afficher le panneau de recherche à proximité
  const handleFindNearbyRestaurants = (lat: number, lon: number, type: string = 'restaurant') => {
    console.log("Dashboard: Triggering nearby search panel for", { lat, lon, type });
    setNearbySearchCoords({ lat, lng: lon }); // Utiliser 'lng' au lieu de 'lon' pour correspondre aux props
    setNearbySearchType(type);
  };

  // Function to close the nearby panel
  const handleCloseNearbyPanel = () => {
    setNearbySearchCoords(null); // Set coords to null to hide the panel
  };

  return (
    <div className={isDarkMode ? 'dark-mode' : ''}>
      <Header
        title="Découverte de la Corse du Sud"
        subtitle="10 jours d'aventures entre mer turquoise et montagnes sauvages"
      />

      <div className="container">
        {/* Loading State */}
        {loading && (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="alert alert-danger" role="alert">
            Erreur de chargement : {error}
          </div>
        )}

        {/* Content: Render only when not loading and no error */}
        {!loading && !error && tripData && (
          <>
            {/* Filtres et statistiques */}
            <div className="row mb-4">
              <div className="col-md-6">
                <BudgetOverview budget={tripData.budget} />
              </div>
              <div className="col-md-6">
                <FilterBar currentFilter={filter} setFilter={setFilter} />
              </div>
            </div>

            {/* Bouton pour afficher/masquer les statistiques */}
            <div className="row mb-4">
              <div className="col-12">
                <button
                  className="btn btn-outline-primary"
                  onClick={() => setShowStats(!showStats)}
                >
                  {showStats ? 'Masquer les statistiques' : 'Afficher les statistiques'}
                </button>
              </div>
            </div>

            {/* Section des statistiques (conditionnelle) */}
            {showStats && (
              <div className="row mb-4">
                <div className="col-12">
                  <ExpensesChart />
                </div>
              </div>
            )}

            {/* Add the TripMap component */}
            <div className="row mb-4">
              <div className="col-12">
                {/* Use flex-column on small screens, flex-md-row on medium and up */}
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3"> 
                  <h3 className="mb-2 mb-md-0">Carte du Voyage</h3> {/* Adjust margin for mobile */}
                  {/* Map Day Filter Dropdown and Button Container */}
                  {/* Use flex-column on small, flex-md-row on medium, align items */}
                  <div className="d-flex flex-column flex-md-row align-items-md-center">
                    {/* Filter Group */}
                    <div className="d-flex align-items-center mb-2 mb-md-0"> {/* Add bottom margin on mobile */}
                      <label htmlFor="mapDayFilter" className="form-label me-2 mb-0 small">Filtrer:</label> {/* Shorten label */}
                      <select 
                        id="mapDayFilter"
                        className="form-select form-select-sm" 
                        style={{width: 'auto'}} // Adjust width
                        value={mapFilterDayId} 
                        onChange={(e) => setMapFilterDayId(e.target.value)}
                        disabled={!tripData || tripData.days.length === 0} // Disable if no data
                      >
                        <option value="all">Tous les jours</option>
                        {tripData.days.map(day => (
                          // Display only the day title, remove the date part
                          <option key={day.id} value={day.id}>
                            {day.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Update Button */}
                    <button 
                      className="btn btn-sm btn-outline-secondary ms-md-2" // Use margin start only on medium+ screens
                      onClick={() => {
                        console.log("Dashboard: Manually updating coordinates");
                        setLoading(true);
                        
                        updateAllActivityCoordinates()
                          .then((hasUpdates) => {
                            console.log(`Dashboard: Manual coordinate update completed. Updates made: ${hasUpdates}`);
                            
                            // Recharger les données après la mise à jour des coordonnées
                            const tripRef = ref(db, 'trip');
                            return get(tripRef).then(snapshot => ({ snapshot, hasUpdates }));
                          })
                          .then(({ snapshot, hasUpdates }) => {
                            const updatedData = snapshot.val();
                            if (updatedData) {
                              console.log("Dashboard: Reloaded data after manual coordinate update");
                              
                              // Transformer les données mises à jour
                              const updatedFormattedData: TripData = {
                                days: Array.isArray(updatedData.days)
                                  ? updatedData.days
                                  : Object.entries(updatedData.days).map(([dayId, dayData]: [string, any]) => {
                                    const activityOrder = dayData.activityOrder || [];
                                    const activitiesById = dayData.activitiesById || {};
                                    
                                    return {
                                      id: dayId,
                                      date: dayData.date,
                                      title: dayData.title,
                                      activityOrder: activityOrder,
                                      activitiesById: activitiesById,
                                    };
                                  }),
                                budget: updatedData.budget || { total: 2000, spent: 0 }
                              };
                              
                              // Mettre à jour l'état avec les données mises à jour
                              setTripData(updatedFormattedData);
                              
                              // Afficher un message à l'utilisateur
                              if (hasUpdates) {
                                alert("Les coordonnées ont été mises à jour avec succès. Les repères devraient maintenant apparaître sur la carte.");
                              } else {
                                alert("Aucune mise à jour nécessaire. Toutes les activités avec adresses ont déjà des coordonnées valides.");
                              }
                            }
                            setLoading(false);
                          })
                          .catch((err) => {
                            console.error("Dashboard: Error in manual coordinate update", err);
                            alert("Erreur lors de la mise à jour des coordonnées. Veuillez réessayer.");
                            setLoading(false);
                          });
                      }}
                    >
                      <i className="bi bi-geo-alt me-1"></i> Mettre à jour les coordonnées
                    </button>
                  </div>
                </div>
                <TripMap days={tripData.days} filterDayId={mapFilterDayId} /> {/* Pass filter prop */}
              </div>
            </div>

            {/* Nearby Places Results (conditionally rendered) */}
            {nearbySearchCoords && (
              <div className="row mb-4">
                <div className="col-12">
                  <NearbyPlacesResults
                    lat={nearbySearchCoords.lat}
                    lng={nearbySearchCoords.lng}
                    nearbySearchType={nearbySearchType}
                    onClose={handleCloseNearbyPanel}
                  />
                </div>
              </div>
            )}

            {/* Conteneur pour les jours */}
            <DragDropContext
              onDragEnd={(result: DropResult) => {
                // If dropped outside the list or no destination
                if (!result.destination) {
                  return;
                }

                // Extract the day ID from the droppableId (format: "day-{dayId}")
                const dayId = result.destination.droppableId.replace('day-', '');
                
                // Find the day by ID
                const day = tripData.days.find(d => d.id === dayId);
                if (!day) {
                  console.error(`Day with ID ${dayId} not found`);
                  return;
                }
                
                // Get the current activity order
                const activityOrder = [...(day.activityOrder || [])];
                
                // Get the activity ID that was dragged and remove the prefix
                const prefixedActivityId = result.draggableId;
                const activityId = prefixedActivityId.replace('activity-', '');
                
                // Remove the activity from its current position
                const sourceIndex = activityOrder.indexOf(activityId);
                if (sourceIndex !== -1) {
                  activityOrder.splice(sourceIndex, 1);
                }
                
                // Insert it at the new position
                activityOrder.splice(result.destination.index, 0, activityId);
                
                // Update in Firebase
                updateActivityOrder(dayId, activityOrder)
                  .then(() => console.log(`Activity order updated for day ${dayId}`))
                  .catch(error => console.error(`Error updating activity order for day ${dayId}:`, error));
              }}
            >
              {/* Desktop View: Grid */}
              <div className="row d-none d-md-flex" id="daysContainerDesktop">
                {tripData.days.map((day, index) => (
                  <DayCard
                    key={`desktop-${day.id}`}
                    day={day}
                    index={index}
                    filter={filter} // Pass filter down
                    onAddActivity={handleAddActivity}
                    onEditActivity={handleEditActivity}
                    onFindNearbyRestaurantsForActivity={handleFindNearbyRestaurants} // Pass the handler down
                  />
                ))}
              </div>

              {/* Mobile View: Swipeable Single Card */}
              <div {...swipeHandlers} className="d-md-none" id="daysContainerMobile">
                {tripData.days.length > 0 && (
                  <DayCard
                    key={`mobile-${tripData.days[currentDayIndex].id}`}
                    day={tripData.days[currentDayIndex]}
                    index={currentDayIndex}
                    filter={filter} // Pass filter down
                    onAddActivity={handleAddActivity}
                    onEditActivity={handleEditActivity}
                    onFindNearbyRestaurantsForActivity={handleFindNearbyRestaurants} // Pass the handler down
                  />
                )}
                {/* Optional: Add swipe indicators (dots) here */}
                {tripData.days.length > 1 && (
                  <div className="d-flex justify-content-center mt-2">
                    {tripData.days.map((_, index) => (
                      <span
                        key={`dot-${index}`}
                        className={`swipe-indicator ${index === currentDayIndex ? 'active' : ''}`}
                        onClick={() => setCurrentDayIndex(index)} // Allow clicking dots
                      ></span>
                    ))}
                  </div>
                )}
              </div>
            </DragDropContext>

            {/* Modal pour ajouter/modifier une activité */}
            {showActivityModal && (
              <ActivityForm
                dayId={selectedDayId}
                activity={selectedActivity}
                activityId={selectedActivityId}
                onClose={() => setShowActivityModal(false)}
                onSuccess={() => {
                  // Le modal sera fermé par la fonction onClose du composant ActivityForm
                  // Refresh des données est automatique grâce à la souscription Firebase
                  console.log("Activity operation successful");
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
