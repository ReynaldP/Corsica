// src/services/tripService.ts
import { ref, onValue, push, update, remove, get, set } from "firebase/database";
import { db } from "./firebase";
import { TripData, Activity } from "../types";

// Fonction pour trouver la clé Firebase d'un jour par son ID
async function findDayKeyById(dayId: string): Promise<string> {
  console.log("Recherche de la clé Firebase pour le jour:", dayId);
  const daysRef = ref(db, 'trip/days');
  const snapshot = await get(daysRef);
  const days = snapshot.val();
  
  if (!days) {
    throw new Error('Aucune donnée de jours trouvée');
  }
  
  for (const [key, day] of Object.entries(days)) {
    if ((day as any).id === dayId) {
      console.log(`Jour ${dayId} trouvé avec la clé Firebase ${key}`);
      return key;
    }
  }
  
  throw new Error(`Jour avec l'ID ${dayId} non trouvé`);
}

// Fonction pour charger les données du voyage avec gestion d'erreur améliorée
export const loadTripData = (callback: (data: TripData | null) => void) => {
  console.log("TripService: Setting up data subscription");
  const tripRef = ref(db, 'trip');
  
  // Mettre en place un écouteur avec gestion explicite des erreurs
  const unsubscribe = onValue(
    tripRef, 
    (snapshot) => {
      console.log("TripService: Data received from Firebase");
      const data = snapshot.val();
      
      if (!data) {
        console.log("TripService: No data found, creating initial data");
        // Si aucune donnée n'existe, on peut créer des données initiales ici
        // ou simplement retourner null et laisser le composant gérer ce cas
        callback(null);
        return;
      }
      
      // Transformation des données si nécessaire
      // Par exemple, s'assurer que les jours sont dans un format utilisable
      const formattedData: TripData = {
        days: Array.isArray(data.days) 
          ? data.days 
          : Object.entries(data.days).map(([key, value]: [string, any]) => ({
              id: value.id || key,
              ...value,
              // S'assurer que activities est un objet, pas undefined
              activities: value.activities || {}
            })),
        budget: data.budget || { total: 2000, spent: 0 }
      };
      
      console.log("TripService: Data formatted successfully", 
        { dayCount: formattedData.days.length });
      
      callback(formattedData);
    },
    (error) => {
      // Gestion explicite des erreurs
      console.error("TripService: Error fetching data", error);
      // Propager l'erreur au composant appelant
      throw error;
    }
  );
  
  // Retourner la fonction pour annuler l'abonnement
  return unsubscribe;
};

// Fonction pour ajouter une activité
export const addActivity = async (dayId: string, activity: Omit<Activity, 'id'>) => {
  try {
    console.log("TripService: Adding activity", { dayId, activity });
    
    // Trouver la clé Firebase du jour
    const firebaseDayKey = await findDayKeyById(dayId);
    
    // Utiliser la clé Firebase pour le chemin
    const activitiesRef = ref(db, `trip/days/${firebaseDayKey}/activities`);
    const newActivityRef = push(activitiesRef);
    await update(newActivityRef, activity);
    await updateBudget();
    return true;
  } catch (error) {
    console.error("TripService: Error adding activity", error);
    throw error;
  }
};

// Fonction pour mettre à jour une activité
export const updateActivity = async (dayId: string, activityId: string, activity: Partial<Activity>) => {
  try {
    console.log("TripService: Updating activity", { dayId, activityId, activity });
    
    // Trouver la clé Firebase du jour
    const firebaseDayKey = await findDayKeyById(dayId);
    
    // Utiliser la clé Firebase pour le chemin
    const activityRef = ref(db, `trip/days/${firebaseDayKey}/activities/${activityId}`);
    await update(activityRef, activity);
    await updateBudget();
    return true;
  } catch (error) {
    console.error("TripService: Error updating activity", error);
    throw error;
  }
};

// Fonction pour supprimer une activité
export const deleteActivity = async (dayId: string, activityId: string) => {
  try {
    console.log("TripService: Deleting activity", { dayId, activityId });
    
    // Trouver la clé Firebase du jour
    const firebaseDayKey = await findDayKeyById(dayId);
    
    // Utiliser la clé Firebase pour le chemin
    const activityRef = ref(db, `trip/days/${firebaseDayKey}/activities/${activityId}`);
    await remove(activityRef);
    await updateBudget();
    return true;
  } catch (error) {
    console.error("TripService: Error deleting activity", error);
    throw error;
  }
};

// Fonction pour obtenir les dépenses par catégorie
export const getExpensesByCategory = (): Promise<Record<string, number>> => {
  return new Promise((resolve, reject) => {
    try {
      const daysRef = ref(db, 'trip/days');
      
      onValue(daysRef, (snapshot) => {
        try {
          const days = snapshot.val();
          const expensesByCategory: Record<string, number> = {};
          
          // Catégorie par défaut pour les activités sans tag
          const defaultCategory = "Sans catégorie";
          
          if (days) {
            // Si days est un tableau
            if (Array.isArray(days)) {
              days.forEach((day: any) => {
                if (day.activities) {
                  Object.values(day.activities).forEach((activity: any) => {
                    if (activity.price) {
                      const price = parseFloat(activity.price);
                      
                      // Si l'activité a des tags, répartir le montant entre les tags
                      if (activity.tags && activity.tags.length > 0) {
                        activity.tags.forEach((tag: string) => {
                          expensesByCategory[tag] = (expensesByCategory[tag] || 0) + price;
                        });
                      } else {
                        // Sinon, ajouter au groupe "Sans catégorie"
                        expensesByCategory[defaultCategory] = (expensesByCategory[defaultCategory] || 0) + price;
                      }
                    }
                  });
                }
              });
            } 
            // Si days est un objet
            else {
              Object.values(days).forEach((day: any) => {
                if (day.activities) {
                  Object.values(day.activities).forEach((activity: any) => {
                    if (activity.price) {
                      const price = parseFloat(activity.price);
                      
                      if (activity.tags && activity.tags.length > 0) {
                        activity.tags.forEach((tag: string) => {
                          expensesByCategory[tag] = (expensesByCategory[tag] || 0) + price;
                        });
                      } else {
                        expensesByCategory[defaultCategory] = (expensesByCategory[defaultCategory] || 0) + price;
                      }
                    }
                  });
                }
              });
            }
          }
          
          console.log("TripService: Expenses by category calculated", expensesByCategory);
          resolve(expensesByCategory);
        } catch (error) {
          console.error("TripService: Error calculating expenses by category", error);
          reject(error);
        }
      }, {
        onlyOnce: true // Important: Nous ne voulons qu'une seule lecture
      });
    } catch (error) {
      console.error("TripService: Error setting up expenses calculation", error);
      reject(error);
    }
  });
};

// Fonction pour mettre à jour le budget
export const updateBudget = async (newTotalBudget?: number) => {
  try {
    console.log("TripService: Updating budget");
    const daysRef = ref(db, 'trip/days');
    
    return new Promise<void>((resolve, reject) => {
      onValue(
        daysRef,
        (snapshot) => {
          try {
            const days = snapshot.val();
            let totalSpent = 0;
            
            if (days) {
              // Si days est un tableau
              if (Array.isArray(days)) {
                days.forEach((day: any) => {
                  if (day.activities) {
                    Object.values(day.activities).forEach((activity: any) => {
                      if (activity.price) {
                        totalSpent += parseFloat(activity.price);
                      }
                    });
                  }
                });
              } 
              // Si days est un objet
              else {
                Object.values(days).forEach((day: any) => {
                  if (day.activities) {
                    Object.values(day.activities).forEach((activity: any) => {
                      if (activity.price) {
                        totalSpent += parseFloat(activity.price);
                      }
                    });
                  }
                });
              }
            }
            
            const budgetRef = ref(db, 'trip/budget');
            
            // Si un nouveau budget total est fourni, mettez-le à jour également
            const updateData = newTotalBudget 
              ? { spent: totalSpent, total: newTotalBudget }
              : { spent: totalSpent };
              
            update(budgetRef, updateData)
              .then(() => {
                console.log("TripService: Budget updated successfully", updateData);
                resolve();
              })
              .catch(reject);
          } catch (error) {
            console.error("TripService: Error calculating budget", error);
            reject(error);
          }
        },
        { onlyOnce: true }
      );
    });
  } catch (error) {
    console.error("TripService: Error in updateBudget", error);
    throw error;
  }
};

// Alias pour la compatibilité avec le code existant qui utilise updateTotalBudget
export const updateTotalBudget = updateBudget;

// Fonction pour créer des données initiales si nécessaire
export const createInitialData = async (): Promise<TripData> => {
  console.log("TripService: Creating initial data");
  
  const initialData: TripData = {
    days: [
      {
        id: "jour1",
        date: "10/06",
        title: "Arrivée à Porto-Vecchio",
        activities: {}
      },
      {
        id: "jour2",
        date: "11/06",
        title: "Aiguilles de Bavella & Piscines du Cavu",
        activities: {}
      },
      {
        id: "jour3",
        date: "12/06",
        title: "Bonifacio",
        activities: {}
      },
      {
        id: "jour4",
        date: "13/06",
        title: "Plages de Palombaggia",
        activities: {}
      },
      {
        id: "jour5",
        date: "14/06",
        title: "Réserve naturelle de Scandola",
        activities: {}
      },
      {
        id: "jour6",
        date: "15/06",
        title: "Corte & Vallée de la Restonica",
        activities: {}
      },
      {
        id: "jour7",
        date: "16/06",
        title: "Calvi",
        activities: {}
      },
      {
        id: "jour8",
        date: "17/06",
        title: "Cap Corse",
        activities: {}
      },
      {
        id: "jour9",
        date: "18/06",
        title: "Ajaccio",
        activities: {}
      },
      {
        id: "jour10",
        date: "19/06",
        title: "Départ",
        activities: {}
      }
    ],
    budget: {
      total: 2000,
      spent: 0
    }
  };
  
  try {
    const tripRef = ref(db, 'trip');
    
    // Convertir explicitement le tableau days en objet pour Firebase
    const daysAsObject: Record<string, any> = {};
    initialData.days.forEach((day, index) => {
      daysAsObject[index] = day;
    });
    
    const firebaseData = {
      days: daysAsObject,
      budget: initialData.budget
    };
    
    await set(tripRef, firebaseData);
    console.log("TripService: Initial data created successfully");
    return initialData;
  } catch (error) {
    console.error("TripService: Error creating initial data", error);
    throw error;
  }
};