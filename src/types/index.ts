// Types pour l'application de voyage en Corse

export interface User {
    uid: string;
    email: string | null;
  }
  
  export interface Activity {
    id?: string;
    name: string;
    time?: string;
    price?: number;
    link?: string;
    notes?: string;
    booked: boolean;
    tags: string[];
  }
  
  export interface Day {
    id: string;
    date: string;
    title: string;
    activities: Record<string, Activity>;
  }
  
  export interface Budget {
    total: number;
    spent: number;
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