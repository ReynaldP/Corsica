// src/components/NearbyPlacesPanel.tsx
import React, { useState } from 'react';
import { PlaceSearchResult, GeoLocation } from '../types';
import { searchPlacesNearby, calculateDistance } from '../services/placeSearchService';

interface NearbyPlacesPanelProps {
  location: GeoLocation;
  // onPlaceSelected: (place: PlaceSearchResult) => void; // No longer needed
  onClose: () => void;
}

const NearbyPlacesPanel: React.FC<NearbyPlacesPanelProps> = ({
  location,
  // onPlaceSelected, // Removed
  onClose
}) => {
  const [places, setPlaces] = useState<PlaceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('restaurant');
  const [radius, setRadius] = useState<number>(1000); // 1km par défaut

  // Recherche des lieux à proximité
  const searchNearby = async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await searchPlacesNearby(location, {
        category,
        radius,
        limit: 15
      });

      // Calculer la distance pour chaque résultat et trier par distance
      const resultsWithDistance = results.map(place => ({
        ...place,
        distance: calculateDistance(location, place.location)
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setPlaces(resultsWithDistance);
      
      if (resultsWithDistance.length === 0) {
        setError(`Aucun ${category} trouvé dans un rayon de ${radius / 1000} km.`);
      }
    } catch (err) {
      console.error("Erreur lors de la recherche:", err);
      setError(`Erreur lors de la recherche: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  // Formater la distance
  const formatDistance = (meters: number | undefined): string => {
    if (meters === undefined) return '';
    
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Obtenir l'icône en fonction de la catégorie
  const getCategoryIcon = (cat: string): string => {
    switch (cat) {
      case 'restaurant':
        return 'bi-cup-hot';
      case 'cafe':
        return 'bi-cup';
      case 'bar':
        return 'bi-cup-straw';
      case 'hotel':
        return 'bi-building';
      case 'attraction':
        return 'bi-camera';
      case 'beach':
        return 'bi-umbrella';
      default:
        return 'bi-geo-alt';
    }
  };

  return (
    <div className="nearby-places-panel card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Lieux à proximité</h5>
        <button 
          className="btn-close" 
          onClick={onClose}
          aria-label="Fermer"
        ></button>
      </div>
      <div className="card-body">
        <div className="mb-3">
          <label htmlFor="categorySelect" className="form-label">Catégorie</label>
          <select 
            id="categorySelect" 
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="restaurant">Restaurant</option>
            <option value="cafe">Café</option>
            <option value="bar">Bar</option>
            <option value="hotel">Hôtel</option>
            <option value="attraction">Attraction</option>
            <option value="beach">Plage</option>
          </select>
        </div>
        
        <div className="mb-3">
          <label htmlFor="radiusRange" className="form-label">
            Rayon de recherche: {radius / 1000} km
          </label>
          <input 
            type="range" 
            className="form-range" 
            id="radiusRange"
            min="500" 
            max="5000" 
            step="500"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
          />
        </div>
        
        <button 
          className="btn btn-primary w-100 mb-3"
          onClick={searchNearby}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Recherche...
            </>
          ) : (
            <>
              <i className={`bi ${getCategoryIcon(category)} me-2`}></i>
              Rechercher des {category === 'restaurant' ? 'restaurants' : category + 's'}
            </>
          )}
        </button>
        
        {error && (
          <div className="alert alert-warning" role="alert">
            {error}
          </div>
        )}
        
        {places.length > 0 && (
          <div className="list-group mt-3">
            {places.map((place) => (
              <button
                key={place.id}
                // Change button to anchor tag for better semantics, or keep button and use window.open
                type="button" 
                className="list-group-item list-group-item-action"
                onClick={() => {
                  // Construct Google Maps URL using name and address if available, fallback to coordinates
                  let query = place.name;
                  if (place.location.address) {
                    // Use name and address for better accuracy
                    query = `${place.name}, ${place.location.address}`;
                  } else {
                    // Fallback to coordinates if no address
                    query = `${place.location.lat},${place.location.lon}`;
                  }
                  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
                  window.open(mapsUrl, '_blank', 'noopener,noreferrer');
                }}
                title={`Rechercher ${place.name} sur Google Maps`}
              >
                <div className="d-flex w-100 justify-content-between">
                  <h5 className="mb-1">{place.name} <i className="bi bi-box-arrow-up-right small"></i></h5> 
                  {place.distance !== undefined && (
                    <small>{formatDistance(place.distance)}</small>
                  )}
                </div>
                {place.cuisine && (
                  <p className="mb-1 small text-muted">
                    <strong>Cuisine:</strong> {place.cuisine}
                  </p>
                )}
                {place.location.address && (
                  <p className="mb-1 small text-truncate">
                    {place.location.address.split(',').slice(0, 2).join(', ')}
                  </p>
                )}
                {place.openingHours && (
                  <small className="text-muted">Horaires: {place.openingHours}</small>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyPlacesPanel;
