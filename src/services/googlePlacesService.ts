import axios from 'axios';

// Types for Google Places API responses
interface PlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    }
  };
  rating?: number;
  user_ratings_total?: number;
  types: string[];
  photos?: {
    photo_reference: string;
    height: number;
    width: number;
  }[];
}

interface PlacesResponse {
  results: PlaceResult[];
  status: string;
  next_page_token?: string;
}

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

// Function to search for nearby places using Google Places API
export const searchNearbyPlaces = async (
  lat: number, 
  lng: number, 
  type: 'restaurant' | 'bar' | 'tourist_attraction' | 'cafe' | 'museum' | 'park' | string = 'restaurant',
  radius: number = 1500 // Default radius in meters (1.5km)
): Promise<NearbyPlace[]> => {
  try {
    const apiKey = "AIzaSyBwpPefXZ1brfWoRr3SzXQOCodskppK2TU"; // Same key used in TripMap
    
    const response = await axios.get<PlacesResponse>(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
      {
        params: {
          location: `${lat},${lng}`,
          radius: radius,
          type: type,
          key: apiKey
        }
      }
    );
    
    if (response.data.status !== 'OK') {
      console.error('Google Places API error:', response.data.status);
      return [];
    }
    
    // Transform the results to our format and sort by rating
    const places = response.data.results.map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating || 0,
      reviewCount: place.user_ratings_total || 0,
      types: place.types,
      photoUrl: place.photos && place.photos.length > 0
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`
        : undefined
    }));
    
    // Sort by rating (highest first)
    return places.sort((a, b) => b.rating - a.rating);
  } catch (error) {
    console.error('Error searching for nearby places:', error);
    return [];
  }
};

// Function to get place details
export const getPlaceDetails = async (placeId: string): Promise<any> => {
  try {
    const apiKey = "AIzaSyBwpPefXZ1brfWoRr3SzXQOCodskppK2TU";
    
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json`,
      {
        params: {
          place_id: placeId,
          fields: 'name,formatted_address,geometry,rating,user_ratings_total,formatted_phone_number,website,opening_hours,price_level,reviews',
          key: apiKey
        }
      }
    );
    
    if (response.data.status !== 'OK') {
      console.error('Google Place Details API error:', response.data.status);
      return null;
    }
    
    return response.data.result;
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
};
