// src/components/WeatherWidget.tsx
import React, { useState, useEffect } from 'react';
import { getWeatherForecast } from '../services/weatherService';
import { DailyForecast } from '../types';

interface WeatherWidgetProps {
  lat: number;
  lon: number;
  locationName?: string; // Optional name for display
}

// Helper function to format date string (YYYY-MM-DD) to a more readable format (e.g., Mar 15)
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  // Adjust for timezone if necessary, but for simplicity, using local date parts
  return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
};

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ lat, lon, locationName }) => {
  const [forecast, setForecast] = useState<DailyForecast[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      // Don't reset loading if it's just a background refresh
      // setLoading(true); 
      setError(null);
      // Don't clear forecast on refresh, only on error or initial load
      // setForecast(null); 

      try {
        console.log(`WeatherWidget: Fetching weather for ${locationName || 'coords'} (${lat}, ${lon})`);
        const data = await getWeatherForecast(lat, lon);
        setForecast(data);
      } catch (err: any) {
        setError(err.message || 'Impossible de charger la météo.');
        console.error("WeatherWidget: Error fetching weather", err);
        setForecast(null); // Clear forecast on error
      } finally {
        setLoading(false); // Set loading false after fetch attempt
      }
    };

    setLoading(true); // Set loading true when props change
    fetchWeather(); // Fetch weather immediately when lat/lon change

    // Optional: Set up an interval for periodic refresh (e.g., every hour)
    // Be mindful of API call limits
    // const intervalId = setInterval(fetchWeather, 3600000); // Refresh every hour
    // return () => clearInterval(intervalId); // Cleanup interval on unmount

  }, [lat, lon]); // Re-fetch when lat or lon changes

  return (
    <div className="card weather-widget mb-4">
      <div className="card-body">
        <h5 className="card-title">
          Météo {locationName ? `à ${locationName}` : ''}
        </h5>
        {loading && (
          <div className="text-center">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Chargement météo...</span>
            </div>
          </div>
        )}
        {error && <div className="alert alert-warning p-2 small">{error}</div>}
        {!loading && !error && forecast && forecast.length > 0 && (
          <div className="d-flex flex-wrap justify-content-around">
            {forecast.map((day) => (
              <div key={day.date} className="text-center p-2 weather-day">
                <strong>{formatDate(day.date)}</strong>
                <img 
                  src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`} 
                  alt={day.description} 
                  title={day.description}
                  width="50" 
                  height="50" 
                />
                <div>{day.temp_min}° / {day.temp_max}°C</div>
                <small className="text-muted">{day.description}</small>
                {day.pop > 10 && ( // Show precipitation probability if > 10%
                   <div className="text-info small" title="Probabilité de précipitation">
                     <i className="bi bi-cloud-drizzle me-1"></i>{day.pop}%
                   </div>
                )}
              </div>
            ))}
          </div>
        )}
         {!loading && !error && (!forecast || forecast.length === 0) && (
             <p className="text-muted small">Aucune prévision disponible.</p>
         )}
      </div>
    </div>
  );
};

export default WeatherWidget;
