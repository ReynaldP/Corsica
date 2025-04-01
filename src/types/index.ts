// Types pour l'application de voyage en Corse

export interface User {
    uid: string;
    email: string | null;
  }

// Types pour la checklist
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface Checklist {
  items: Record<string, ChecklistItem>;
  itemOrder: string[];
}
  
  export interface Attachment {
    name: string;
    url: string;
    path: string; // Path in Firebase Storage for deletion
  }
  
  export interface Activity {
    id?: string;
    name: string;
    time?: string;
    price?: number;
    link?: string;
    notes?: string;
    address?: string; 
    lat: number | null; // Allow null for latitude
    lon: number | null; // Allow null for longitude
    booked: boolean;
    tags: string[];
    category?: ActivityCategory; // Add category field
    attachments?: Attachment[]; // Optional array for file attachments
  }

  // Define the allowed categories
  export type ActivityCategory = "Logement" | "Transport" | "Activité" | "Alimentation" | "Autre";
  
  export interface Day {
    id: string;
    date: string;
    title: string;
    activityOrder: string[]; // Array of activity IDs for ordering
    activitiesById: Record<string, Activity>; // Object to store activity data
  }
  
  export interface Budget {
    total: number;
    spent: number;
    categoryLimits?: Record<string, number>; // Budget limits per category
    tagLimits?: Record<string, number>; // Budget limits per tag
  }
  
  export interface TripData {
    days: Day[];
    budget: Budget;
  }
  
  export type FilterType = 'all' | 'booked' | 'not-booked';
  
  export interface ThemeContextType {
    isDarkMode: boolean;
    toggleTheme: () => void;
  }
// Ajoutez ces types à votre fichier src/types/index.ts existant

// Ajoutez ces propriétés à votre interface Activity existante
// lat?: number;
// lon?: number;
// address?: string;

// Interface pour les coordonnées géographiques
export interface GeoLocation {
  lat: number;
  lon: number;
  address?: string;
}

// Interface pour les résultats de recherche de lieux
export interface PlaceSearchResult {
  id: string;
  name: string;
  location: GeoLocation;
  category?: string;
  cuisine?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  distance?: number;
}

// Type pour les prévisions météo quotidiennes simplifiées
export interface DailyForecast {
  date: string; // YYYY-MM-DD
  temp_min: number; // Degrés Celsius
  temp_max: number; // Degrés Celsius
  description: string; // Description textuelle (ex: 'Ciel dégagé')
  icon: string; // Code icône OpenWeatherMap (ex: '01d')
  pop: number; // Probabilité de précipitation (%)
}
