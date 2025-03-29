// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import BudgetOverview from '../components/BudgetOverview';
import FilterBar from '../components/FilterBar';
import DayCard from '../components/DayCard';
import ActivityForm from '../components/ActivityForm';
import ExpensesChart from '../components/ExpensesChart';
import { loadTripData, createInitialData } from '../services/tripService';
import { TripData, Day, Activity, FilterType } from '../types';
import { useTheme } from '../context/ThemeContext';

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
            setTripData(data);
            setLoading(false);
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
    const activity = day.activities[activityId];
    if (!activity) {
      console.error("Dashboard: Activity not found", activityId);
      return;
    }
    
    setSelectedDayId(dayId);
    setSelectedActivityId(activityId);
    setSelectedActivity({ ...activity, id: activityId });
    setShowActivityModal(true);
  };

  // Filtrer les jours en fonction du filtre sélectionné
  const getFilteredDays = () => {
    if (!tripData) return [];
    
    return tripData.days.map(day => {
      // Vérifier si ce jour doit être affiché selon le filtre actuel
      let display = true;
      
      if (filter === 'booked') {
        // Afficher seulement si le jour a des activités réservées
        display = Object.values(day.activities || {}).some(activity => activity.booked);
      } else if (filter === 'not-booked') {
        // Afficher seulement si le jour a des activités non réservées
        display = Object.values(day.activities || {}).some(activity => !activity.booked);
      }
      
      return { 
        ...day, 
        display
      };
    });
  };

  // Affichage conditionnel basé sur l'état
  if (loading) {
    return (
      <div className={`d-flex justify-content-center align-items-center ${isDarkMode ? 'dark-mode' : ''}`} style={{ height: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p>Chargement des données du voyage...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`container mt-5 ${isDarkMode ? 'dark-mode' : ''}`}>
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Erreur !</h4>
          <p>{error}</p>
          <hr />
          <p className="mb-0">
            <button 
              className="btn btn-outline-danger" 
              onClick={() => window.location.reload()}
            >
              Réessayer
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (!tripData) {
    return (
      <div className={`container mt-5 ${isDarkMode ? 'dark-mode' : ''}`}>
        <div className="alert alert-warning" role="alert">
          <h4 className="alert-heading">Aucune donnée</h4>
          <p>Aucune donnée de voyage disponible. Tentative de création de données initiales...</p>
          <hr />
          <p className="mb-0">
            <button 
              className="btn btn-primary"
              onClick={() => {
                setLoading(true);
                createInitialData()
                  .then(data => {
                    setTripData(data);
                    setLoading(false);
                  })
                  .catch(err => {
                    setError("Erreur lors de la création des données initiales: " + err.message);
                    setLoading(false);
                  });
              }}
            >
              Créer des données initiales
            </button>
          </p>
        </div>
      </div>
    );
  }

  const filteredDays = getFilteredDays();

  return (
    <div className={isDarkMode ? 'dark-mode' : ''}>
      <Header 
        title="Découverte de la Corse du Sud" 
        subtitle="10 jours d'aventures entre mer turquoise et montagnes sauvages" 
      />
      
      <div className="container">
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

        {/* Conteneur pour les jours */}
        <div className="row" id="daysContainer">
          {filteredDays.map((day, index) => (
            day.display && (
              <DayCard 
                key={day.id}
                day={day as Day}
                index={index}
                onAddActivity={handleAddActivity}
                onEditActivity={handleEditActivity}
              />
            )
          ))}
          
          {filteredDays.filter(day => day.display).length === 0 && (
            <div className="col-12 text-center my-5">
              <p>Aucun jour ne correspond au filtre actuel.</p>
              <button 
                className="btn btn-primary" 
                onClick={() => setFilter('all')}
              >
                Voir tous les jours
              </button>
            </div>
          )}
        </div>
      </div>
      
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
    </div>
  );
};

export default Dashboard;