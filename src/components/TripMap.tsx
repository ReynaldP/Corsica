import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Import marker icons (important for them to display correctly)
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

import { Day } from '../types';

// Fix default icon path issue with Leaflet and build tools
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

interface TripMapProps {
  days: Day[];
}

// Helper component to adjust map bounds
const MapBoundsAdjuster: React.FC<{ bounds: LatLngBoundsExpression | null }> = ({ bounds }) => {
  const map = useMap();
  React.useEffect(() => {
    if (bounds) {
      // Add slight padding to bounds
      map.fitBounds(bounds, { padding: [50, 50] }); 
    }
  }, [map, bounds]);
  return null;
};

const TripMap: React.FC<TripMapProps> = ({ days }) => {
  const markers: { position: LatLngExpression; popupText: string }[] = [];
  // Initialize bounds as null, but it will hold an L.LatLngBounds object
  let bounds: L.LatLngBounds | null = null; 

  // Collect markers and calculate bounds
  days.forEach(day => {
    // Check if activityOrder exists and is an array before calling forEach
    if (day.activityOrder && Array.isArray(day.activityOrder)) {
      day.activityOrder.forEach(activityId => {
      const activity = day.activitiesById[activityId];
      if (activity && activity.lat != null && activity.lon != null) {
        const position: LatLngExpression = [activity.lat, activity.lon];
        markers.push({
          position,
          popupText: `${activity.name} (${day.date})`,
        });
        // Extend bounds using L.LatLngBounds object
        if (!bounds) {
          // Create the bounds object with the first point
          bounds = L.latLngBounds(position, position);
        } else {
          // Extend the existing bounds object
          bounds.extend(position);
        }
      }
      });
    }
  });

  // Default center if no markers (e.g., center of Corsica)
  const defaultCenter: LatLngExpression = [42.0396, 9.0129]; 
  const defaultZoom = 8;

  if (markers.length === 0 && !bounds) {
     console.warn("TripMap: No activities with coordinates found to display.");
     // Optionally render a placeholder or message instead of the map
     // return <p>Aucune activité avec coordonnées à afficher sur la carte.</p>;
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h5 className="card-title mb-3">Carte du Voyage</h5>
        <MapContainer 
          center={bounds ? undefined : defaultCenter} // Center is handled by bounds if they exist
          zoom={bounds ? undefined : defaultZoom} // Zoom is handled by bounds if they exist
          scrollWheelZoom={false} 
          style={{ height: '400px', width: '100%', borderRadius: '8px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((marker, index) => (
            <Marker key={index} position={marker.position}>
              <Popup>{marker.popupText}</Popup>
            </Marker>
          ))}
          {/* Pass the L.LatLngBounds object to the helper */}
          <MapBoundsAdjuster bounds={bounds} /> 
        </MapContainer>
      </div>
    </div>
  );
};

export default TripMap;
