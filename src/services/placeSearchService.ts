// src/services/placeSearchService.ts
import { GeoLocation, PlaceSearchResult } from '../types';

// Délai entre les requêtes pour respecter les limites d'utilisation de Nominatim
const NOMINATIM_DELAY = 1000; 
let lastRequestTime = 0;

interface SearchOptions {
  radius?: number; // rayon de recherche en mètres (défaut: 1000m)
  limit?: number;  // nombre maximum de résultats (défaut: 10)
  category?: 'restaurant' | 'hotel' | 'attraction' | 'beach' | string; // catégorie de lieu
}

/**
 * Recherche des lieux autour d'une position donnée
 */
export const searchPlacesNearby = async (
  location: GeoLocation, 
  options: SearchOptions = {}
): Promise<PlaceSearchResult[]> => {
  // Valeurs par défaut
  const radius = options.radius || 1000; // 1km par défaut
  const limit = options.limit || 10;
  const category = options.category || 'restaurant';
  
  // Respecter la limite d'utilisation de Nominatim (max 1 requête par seconde)
  const now = Date.now();
  const timeElapsed = now - lastRequestTime;
  if (timeElapsed < NOMINATIM_DELAY && lastRequestTime !== 0) {
    await new Promise(resolve => setTimeout(resolve, NOMINATIM_DELAY - timeElapsed));
  }
  
  try {
    // Utiliser Overpass API pour une recherche plus précise
    // C'est une API plus puissante pour OpenStreetMap
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    
    // Rayon en degrés approximatifs (conversion approximative)
    const radiusDegrees = radius / 111000; // ~111km par degré à l'équateur
    
    // Construire la requête Overpass
    const query = `
      [out:json];
      node["amenity"="${category}"](around:${radius},${location.lat},${location.lon});
      out body ${limit};
    `;
    
    // Effectuer la requête
    const response = await fetch(overpassUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    
    lastRequestTime = Date.now();
    
    if (!response.ok) {
      throw new Error(`Erreur réseau: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transformer les résultats
    const results: PlaceSearchResult[] = data.elements.map((element: any) => {
      return {
        id: element.id.toString(),
        name: element.tags.name || `${category.charAt(0).toUpperCase() + category.slice(1)} sans nom`,
        location: {
          lat: element.lat,
          lon: element.lon,
          address: element.tags['addr:street'] 
            ? `${element.tags['addr:housenumber'] || ''} ${element.tags['addr:street']}, ${element.tags['addr:postcode'] || ''} ${element.tags['addr:city'] || ''}`
            : undefined
        },
        category: category,
        // Métadonnées supplémentaires si disponibles
        cuisine: element.tags.cuisine,
        phone: element.tags.phone,
        website: element.tags.website,
        openingHours: element.tags.opening_hours
      };
    });
    
    return results;
  } catch (error) {
    console.error("Erreur lors de la recherche de lieux avec Overpass:", error);
    
    // Fallback: utiliser Nominatim si Overpass échoue
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&amenity=${category}&lat=${location.lat}&lon=${location.lon}&radius=${radius}&limit=${limit}`;
      
      const response = await fetch(nominatimUrl, {
        headers: {
          'Accept-Language': 'fr',
          'User-Agent': 'CorsicaTripPlanner/1.0'
        }
      });
      
      lastRequestTime = Date.now();
      
      if (!response.ok) {
        throw new Error(`Erreur réseau: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transformer les résultats
      const results: PlaceSearchResult[] = data.map((item: any) => ({
        id: item.place_id,
        name: item.display_name.split(',')[0],
        location: {
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          address: item.display_name
        },
        category: category
      }));
      
      return results;
    } catch (fallbackError) {
      console.error("Erreur également avec le fallback Nominatim:", fallbackError);
      throw new Error("Impossible de rechercher des lieux à proximité");
    }
  }
};

/**
 * Calcule la distance en mètres entre deux coordonnées GPS
 */
export const calculateDistance = (point1: GeoLocation, point2: GeoLocation): number => {
  const R = 6371e3; // Rayon de la terre en mètres
  const φ1 = point1.lat * Math.PI / 180;
  const φ2 = point2.lat * Math.PI / 180;
  const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
  const Δλ = (point2.lon - point1.lon) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};