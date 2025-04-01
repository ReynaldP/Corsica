// src/services/googlePlacesService.ts

export interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  types: string[];
  photoUrl?: string;
}

/**
 * Recherche des lieux à proximité en utilisant l'API JavaScript Google Maps
 * Cette approche évite les problèmes CORS qui se produisent lors d'appels directs à l'API REST
 */
export const searchNearbyPlaces = (
  lat: number, 
  lng: number, 
  type: 'restaurant' | 'bar' | 'tourist_attraction' | 'cafe' | 'museum' | 'park' | string = 'restaurant',
  radius: number = 1500
): Promise<NearbyPlace[]> => {
  return new Promise((resolve, reject) => {
    try {
      // Vérifier si l'API Google Maps est chargée
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error("L'API Google Maps n'est pas chargée. Vérifiez l'inclusion du script dans index.html");
        return resolve(getPlaceholderData(lat, lng, type));
      }
      
      // Créer un élément DOM temporaire pour le service Places
      const mapDiv = document.createElement('div');
      const service = new google.maps.places.PlacesService(mapDiv);
      
      // Configurer la requête
      const request = {
        location: new google.maps.LatLng(lat, lng),
        radius: radius,
        type: type
      };
      
      // Effectuer la recherche
      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          // Transformer les résultats
          const places: NearbyPlace[] = results.map(place => ({
            id: place.place_id || `place-${Math.random().toString(36).substring(2, 9)}`,
            name: place.name || 'Sans nom',
            address: place.vicinity || 'Adresse non disponible',
            lat: place.geometry?.location?.lat() || lat,
            lng: place.geometry?.location?.lng() || lng,
            rating: place.rating || 0,
            reviewCount: place.user_ratings_total || 0,
            types: place.types || [],
            photoUrl: place.photos && place.photos.length > 0
              ? place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 })
              : undefined
          }));
          
          // Trier par note décroissante
          resolve(places.sort((a, b) => b.rating - a.rating));
        } else {
          console.warn(`Aucun résultat trouvé ou erreur: ${status}`);
          resolve([]);
        }
      });
    } catch (error) {
      console.error('Erreur lors de la recherche de lieux:', error);
      resolve(getPlaceholderData(lat, lng, type));
    }
  });
};

/**
 * Récupère les détails d'un lieu spécifique en utilisant l'API JavaScript Google Maps
 */
export const getPlaceDetails = (placeId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      // Vérifier si l'API Google Maps est chargée
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error("L'API Google Maps n'est pas chargée");
        return reject(new Error('API Google Maps non disponible'));
      }
      
      // Créer un élément DOM temporaire pour le service Places
      const mapDiv = document.createElement('div');
      const service = new google.maps.places.PlacesService(mapDiv);
      
      // Configurer la requête
      const request = {
        placeId: placeId,
        fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 
                'opening_hours', 'rating', 'user_ratings_total', 'reviews', 'photos', 'price_level']
      };
      
      // Effectuer la recherche de détails
      service.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          resolve(place);
        } else {
          reject(new Error(`Erreur lors de la récupération des détails: ${status}`));
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des détails:', error);
      reject(error);
    }
  });
};

/**
 * Données de secours en cas d'erreur d'API
 */
const getPlaceholderData = (lat: number, lng: number, type: string): NearbyPlace[] => {
  const mockDataByType: Record<string, NearbyPlace[]> = {
    'restaurant': [
      {
        id: 'rest1',
        name: 'La Table Corse',
        address: 'Avenue Napoléon, Porto-Vecchio',
        lat: lat + 0.003,
        lng: lng - 0.002,
        rating: 4.7,
        reviewCount: 124,
        types: ['restaurant', 'food']
      },
      {
        id: 'rest2',
        name: 'Chez Antoine',
        address: 'Rue du Port, Porto-Vecchio',
        lat: lat - 0.001,
        lng: lng + 0.004,
        rating: 4.5,
        reviewCount: 89,
        types: ['restaurant', 'food']
      }
    ],
    'bar': [
      {
        id: 'bar1',
        name: 'Le Bar de la Marine',
        address: 'Quai de la Marine, Porto-Vecchio',
        lat: lat + 0.002,
        lng: lng - 0.001,
        rating: 4.3,
        reviewCount: 78,
        types: ['bar', 'nightlife']
      }
    ],
    'cafe': [
      {
        id: 'cafe1',
        name: 'Café de la Place',
        address: 'Place de la Mairie, Porto-Vecchio',
        lat: lat - 0.001,
        lng: lng - 0.001,
        rating: 4.1,
        reviewCount: 45,
        types: ['cafe', 'food']
      }
    ],
    'tourist_attraction': [
      {
        id: 'attr1',
        name: 'Vieille Ville',
        address: 'Centre Historique, Porto-Vecchio',
        lat: lat + 0.001,
        lng: lng + 0.001,
        rating: 4.6,
        reviewCount: 320,
        types: ['tourist_attraction', 'point_of_interest']
      }
    ]
  };
  
  return mockDataByType[type] || [];
};

// Ajout des types pour TypeScript
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          PlacesService: any;
          PlacesServiceStatus: {
            OK: string;
            ZERO_RESULTS: string;
            OVER_QUERY_LIMIT: string;
            REQUEST_DENIED: string;
            INVALID_REQUEST: string;
            UNKNOWN_ERROR: string;
          };
        };
        LatLng: new (lat: number, lng: number) => any;
      };
    };
  }
}