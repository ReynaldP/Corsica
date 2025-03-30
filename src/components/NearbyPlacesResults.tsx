import React, { useState, useEffect } from 'react';
import { NearbyPlace, searchNearbyPlaces } from '../services/googlePlacesService';

interface NearbyPlacesResultsProps {
  lat: number;
  lng: number;
  onClose: () => void;
  nearbySearchType?: string; // Ajout de cette prop optionnelle pour compatibilité avec Dashboard
}

const NearbyPlacesResults: React.FC<NearbyPlacesResultsProps> = ({ 
  lat, 
  lng, 
  onClose, 
  nearbySearchType // Récupérer la prop du Dashboard
}) => {
  // Utiliser nearbySearchType comme valeur initiale si elle est fournie
  const [placeType, setPlaceType] = useState<string>(nearbySearchType || 'restaurant');
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mettre à jour le placeType quand nearbySearchType change (important pour la réactivité)
  useEffect(() => {
    if (nearbySearchType) {
      setPlaceType(nearbySearchType);
    }
  }, [nearbySearchType]);

  useEffect(() => {
    fetchPlaces(placeType);
  }, [lat, lng, placeType]);

  const fetchPlaces = async (type: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await searchNearbyPlaces(lat, lng, type);
      setPlaces(results);
    } catch (err) {
      console.error('Error fetching nearby places:', err);
      setError('Erreur lors de la recherche des lieux à proximité');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: string) => {
    setPlaceType(type);
  };

  // Function to render stars based on rating
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return (
      <div className="rating">
        {[...Array(fullStars)].map((_, i) => (
          <i key={`full-${i}`} className="bi bi-star-fill text-warning"></i>
        ))}
        {halfStar && <i className="bi bi-star-half text-warning"></i>}
        {[...Array(emptyStars)].map((_, i) => (
          <i key={`empty-${i}`} className="bi bi-star text-warning"></i>
        ))}
      </div>
    );
  };

  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Lieux à proximité</h5>
        <button 
          type="button" 
          className="btn-close" 
          onClick={onClose}
          aria-label="Fermer"
        ></button>
      </div>
      <div className="card-body">
        <div className="mb-3">
          <div className="btn-group w-100">
            <button 
              className={`btn ${placeType === 'restaurant' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleTypeChange('restaurant')}
            >
              <i className="bi bi-cup-hot me-1"></i> Restaurants
            </button>
            <button 
              className={`btn ${placeType === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleTypeChange('bar')}
            >
              <i className="bi bi-cup-straw me-1"></i> Bars
            </button>
            <button 
              className={`btn ${placeType === 'tourist_attraction' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleTypeChange('tourist_attraction')}
            >
              <i className="bi bi-camera me-1"></i> Attractions
            </button>
            <button 
              className={`btn ${placeType === 'cafe' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleTypeChange('cafe')}
            >
              <i className="bi bi-cup me-1"></i> Cafés
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center my-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="mt-2">Recherche des lieux à proximité...</p>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && places.length === 0 && (
          <div className="alert alert-info" role="alert">
            Aucun lieu trouvé à proximité.
          </div>
        )}

        {!loading && !error && places.length > 0 && (
          <div className="list-group">
            {places.map(place => (
              <div key={place.id} className="list-group-item list-group-item-action">
                <div className="row">
                  {place.photoUrl && (
                    <div className="col-md-3">
                      <img 
                        src={place.photoUrl} 
                        alt={place.name} 
                        className="img-fluid rounded"
                        style={{ height: '100px', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  <div className={place.photoUrl ? "col-md-9" : "col-12"}>
                    <div className="d-flex justify-content-between">
                      <h5 className="mb-1">{place.name}</h5>
                      <div className="d-flex align-items-center">
                        <span className="badge bg-warning text-dark me-2">
                          {place.rating.toFixed(1)}
                        </span>
                        <small className="text-muted">
                          ({place.reviewCount} avis)
                        </small>
                      </div>
                    </div>
                    <div className="mb-1">
                      {renderStars(place.rating)}
                    </div>
                    <p className="mb-1">{place.address}</p>
                    <div className="mt-2">
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary"
                      >
                        <i className="bi bi-map me-1"></i> Voir sur Google Maps
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyPlacesResults;