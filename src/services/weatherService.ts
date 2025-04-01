// src/services/weatherService.ts
import { DailyForecast } from '../types'; // Importing only the type we're using

const API_KEY = '5ab9c6e14fa35cc11980dfe533233bec'; // User-provided API Key
const BASE_URL = 'https://api.openweathermap.org/data/2.5/forecast';

interface OpenWeatherMapResponse {
  cod: string;
  message: number | string;
  cnt: number;
  list: Array<{
    dt: number;
    main: {
      temp: number;
      temp_min: number;
      temp_max: number;
      humidity: number;
      feels_like: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    clouds: {
      all: number;
    };
    wind: {
      speed: number;
      deg: number;
    };
    visibility: number;
    pop: number; // Probability of precipitation
    dt_txt: string;
  }>;
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

// Helper to get a simple daily summary from 3-hour forecasts
const processForecastData = (data: OpenWeatherMapResponse): DailyForecast[] => {
  const dailyData: { [key: string]: { temps: number[], icons: string[], descriptions: string[], pops: number[] } } = {};

  data.list.forEach(item => {
    const date = item.dt_txt.split(' ')[0]; // Get YYYY-MM-DD part

    if (!dailyData[date]) {
      dailyData[date] = { temps: [], icons: [], descriptions: [], pops: [] };
    }
    dailyData[date].temps.push(item.main.temp);
    dailyData[date].icons.push(item.weather[0]?.icon);
    dailyData[date].descriptions.push(item.weather[0]?.description);
    dailyData[date].pops.push(item.pop); // Probability of precipitation
  });

  // Get today's date string to filter out past forecasts within the first day
  const todayStr = new Date().toISOString().split('T')[0];

  return Object.entries(dailyData)
    .filter(([date]) => date >= todayStr) // Only include today and future dates
    .slice(0, 5) // Limit to 5 days
    .map(([date, dayData]) => {
      const minTemp = Math.min(...dayData.temps);
      const maxTemp = Math.max(...dayData.temps);
      // Find the most frequent icon/description around midday (or first available)
      const middayIndex = Math.floor(dayData.icons.length / 2); // Approximation
      const icon = dayData.icons[middayIndex] || dayData.icons[0];
      const description = dayData.descriptions[middayIndex] || dayData.descriptions[0];
      const avgPop = dayData.pops.reduce((a, b) => a + b, 0) / dayData.pops.length;

      return {
        date: date,
        temp_min: Math.round(minTemp),
        temp_max: Math.round(maxTemp),
        description: description,
        icon: icon,
        pop: Math.round(avgPop * 100), // Convert probability to percentage
      };
    });
};


export const getWeatherForecast = async (lat: number, lon: number): Promise<DailyForecast[]> => {
  const url = `${BASE_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=fr`;
  console.log(`WeatherService: Fetching forecast from ${url}`);

  try {
    const response = await fetch(url);
    const data: OpenWeatherMapResponse = await response.json();

    if (!response.ok || data.cod !== "200") {
      console.error("WeatherService: API Error", data);
      throw new Error(typeof data.message === 'string' ? data.message : `Erreur API (${data.cod})`);
    }

    console.log("WeatherService: Forecast data received", data);
    const processedData = processForecastData(data);
    console.log("WeatherService: Processed forecast data", processedData);
    return processedData;

  } catch (error: any) {
    console.error("WeatherService: Error fetching or processing weather data", error);
    // Rethrow a generic error or the specific error message
    throw new Error(`Impossible de récupérer la météo : ${error.message}`);
  }
};
