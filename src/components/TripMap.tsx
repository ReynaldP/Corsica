import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Libraries } from '@react-google-maps/api';
import { Day } from '../types'; // Removed Activity as it's implicitly used

interface TripMapProps {
  days: Day[];
  filterDayId?: string; // Add optional filter prop
}

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  address?: string;
  category?: string;
  date?: string; // Add date field
  time?: string; // Add time field
  tags?: string[]; // Add tags field
}

const containerStyle = {
  width: '100%',
  height: '400px' // Adjust height as needed
};

// Define the libraries needed with the correct type
const libraries: Libraries = ['places']; 

const TripMap: React.FC<TripMapProps> = ({ days, filterDayId = 'all' }) => { // Destructure and default filterDayId
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyBwpPefXZ1brfWoRr3SzXQOCodskppK2TU", // Use the provided API key
    libraries: libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Extract markers from days data, applying the filter
  const markers = useMemo(() => {
    console.log(`TripMap: Calculating markers for filterDayId: ${filterDayId}`);
    const allMarkers: MapMarker[] = [];
    
    const filteredDays = filterDayId === 'all' 
      ? days 
      : days.filter(day => day.id === filterDayId);
      
    console.log(`TripMap: Processing ${filteredDays.length} days after filtering.`);

    // Dump all activities for debugging (using filtered days)
    console.log("TripMap: All activities data:", days.map(day => ({
      dayId: day.id,
      activities: Object.entries(day.activitiesById || {}).map(([id, act]) => ({
        id,
        name: act.name,
        address: act.address,
        lat: act.lat,
        lon: act.lon
      }))
    })));
    
    filteredDays.forEach(day => { // Iterate over filteredDays
      Object.entries(day.activitiesById || {}).forEach(([activityId, activity]) => {
        // Log every activity for debugging
        console.log(`TripMap: Processing activity "${activity.name}"`, {
          id: activityId,
          address: activity.address,
          lat: activity.lat,
          lon: activity.lon,
          hasCoordinates: activity.lat != null && activity.lon != null
        });
        
        // Vérifier si l'activité a des coordonnées valides
        if (activity.lat != null && activity.lon != null) {
          // Convertir explicitement en nombres pour s'assurer qu'ils sont du bon type
          const lat = typeof activity.lat === 'string' ? parseFloat(activity.lat) : activity.lat;
          const lon = typeof activity.lon === 'string' ? parseFloat(activity.lon) : activity.lon;
          
          console.log(`TripMap: Adding marker for activity "${activity.name}"`, {
            lat,
            lon
          });
          
          allMarkers.push({
            id: activityId,
            lat: lat,
            lng: lon, // Utiliser lon comme lng pour Google Maps
            name: activity.name,
            address: activity.address,
            category: activity.category,
            date: day.date, // Include the date from the day
            time: activity.time, // Include time
            tags: activity.tags // Include tags
          });
        } else if (activity.address) {
          console.log(`TripMap: Activity "${activity.name}" has address but no coordinates`);
        }
      });
    });
    
    console.log(`TripMap: Found ${allMarkers.length} markers after filtering:`, allMarkers);
    return allMarkers;
  }, [days, filterDayId]); // Add filterDayId to dependency array

  // Initialize the map
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    const initialMap = new google.maps.Map(mapRef.current, {
      center: { lat: 42.0396, lng: 9.0129 }, // Center of Corsica
      zoom: 8,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    setMap(initialMap);
  }, [isLoaded]);

  // Create a ref for the InfoWindow
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Update markers when days or map changes
  useEffect(() => {
    if (!map || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Create InfoWindow if it doesn't exist
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    const newBounds = new google.maps.LatLngBounds();
    let hasValidCoordinates = false;

    // Create markers for each activity with coordinates
    markers.forEach(marker => {
      // Validate coordinates before creating marker
      if (typeof marker.lat !== 'number' || typeof marker.lng !== 'number' ||
          isNaN(marker.lat) || isNaN(marker.lng)) {
        console.warn(`TripMap: Invalid coordinates for marker "${marker.name}":`, marker);
        return; // Skip this marker
      }
      
      try {
        hasValidCoordinates = true;
        // Create a proper Google Maps LatLng object with explicit number conversion
        const latLng = new google.maps.LatLng(
          Number(marker.lat), 
          Number(marker.lng)
        );
        
        // Create a standard red pin marker
        const googleMarker = new google.maps.Marker({
          position: latLng,
          map,
          title: marker.name,
          // Use a red pin icon
          icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(32, 32)
          },
          animation: google.maps.Animation.DROP
        });
        
        // Add click event to the marker using native Google Maps InfoWindow
        googleMarker.addListener('click', () => {
          // Construct Google Maps URL - Prioritize address if available
          const googleMapsUrl = marker.address
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(marker.address)}`
            : marker.lat && marker.lng
            ? `https://www.google.com/maps/search/?api=1&query=${marker.lat},${marker.lng}`
            : null;

          // Set content for the InfoWindow
          const contentString = `
            <div style="font-family: Arial, sans-serif; font-size: 14px; max-width: 250px;">
              <h5 style="margin: 0 0 8px 0; padding: 0; font-size: 16px; color: #333;">${marker.name}</h5>
              ${marker.date ? `<p style="margin: 0 0 4px 0; padding: 0; font-weight: bold; color: #dc3545;">Date: ${marker.date}</p>` : ''}
              ${marker.time ? `<p style="margin: 0 0 4px 0; padding: 0; color: #555;">Heure: ${marker.time}</p>` : ''}
              ${marker.address ? `<p style="margin: 0 0 4px 0; padding: 0; color: #555;">${marker.address}</p>` : ''}
              ${marker.tags && marker.tags.length > 0 ? `<p style="margin: 8px 0 4px 0; padding: 0; font-size: 12px; color: #777;">Tags: ${marker.tags.join(', ')}</p>` : ''}
              ${googleMapsUrl ? `<a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: none; font-size: 13px;">Voir sur Google Maps</a>` : ''}
            </div>
          `;
          
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(contentString);
            infoWindowRef.current.open({
              map,
              anchor: googleMarker,
            });
          }
        });
        
        markersRef.current.push(googleMarker);
        
        // Safely extend bounds with valid coordinates
        try {
          newBounds.extend(latLng);
        } catch (boundsError) {
          console.error("TripMap: Error extending bounds with coordinates:", latLng, boundsError);
        }
      } catch (markerError) {
        console.error("TripMap: Error creating marker for:", marker, markerError);
      }
    });
    
    // Only adjust bounds if we have valid coordinates and bounds is not empty
    if (hasValidCoordinates) {
      try {
        // Check if bounds is empty or invalid
        if (!newBounds.isEmpty()) {
          // Get the northeast and southwest corners to verify bounds is valid
          const ne = newBounds.getNorthEast();
          const sw = newBounds.getSouthWest();
          
          if (ne && sw && !isNaN(ne.lat()) && !isNaN(ne.lng()) && !isNaN(sw.lat()) && !isNaN(sw.lng())) {
            console.log("TripMap: Fitting to bounds:", {
              ne: { lat: ne.lat(), lng: ne.lng() },
              sw: { lat: sw.lat(), lng: sw.lng() }
            });
            
            // Use a try-catch block for fitBounds
            try {
              map.fitBounds(newBounds);
              
              // Adjust zoom level if there's only one marker
              if (markers.length === 1) {
                map.setZoom(15);
              }
            } catch (fitError) {
              console.error("TripMap: Error fitting bounds:", fitError);
              // Fallback to center on Corsica
              map.setCenter({ lat: 42.0396, lng: 9.0129 });
              map.setZoom(8);
            }
          } else {
            console.warn("TripMap: Invalid bounds corners detected, using default center");
            map.setCenter({ lat: 42.0396, lng: 9.0129 });
            map.setZoom(8);
          }
        } else {
          console.log("TripMap: Empty bounds, using default center");
          map.setCenter({ lat: 42.0396, lng: 9.0129 });
          map.setZoom(8);
        }
      } catch (boundsError) {
        console.error("TripMap: Error checking or using bounds:", boundsError);
        // Fallback to center on Corsica
        map.setCenter({ lat: 42.0396, lng: 9.0129 });
        map.setZoom(8);
      }
    } else {
      console.log("TripMap: No valid coordinates found, using default center");
      map.setCenter({ lat: 42.0396, lng: 9.0129 });
      map.setZoom(8);
    }
  }, [map, markers, isLoaded, filterDayId]); // Add filterDayId to dependency array


  if (loadError) {
    return <div>Erreur lors du chargement de la carte: {loadError.message}</div>;
  }

  if (!isLoaded) {
    return <div>Chargement de la carte...</div>;
  }

  return (
    <div className="card">
      <div className="card-header">
        Carte du Voyage
      </div>
      <div className="card-body p-0">
        <div ref={mapRef} style={{ width: '100%', height: '400px', borderRadius: '0 0 4px 4px' }} />
      </div>
    </div>
  );
};

export default TripMap;
