// src/services/tripService.ts
import { ref as dbRef, onValue, push, update, remove, get, set } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase"; // Import storage
import { TripData, Activity, Attachment, ActivityCategory } from "../types"; // Import Attachment type and ActivityCategory

// Fonction pour trouver la clé Firebase d'un jour par son ID
async function findDayKeyById(dayId: string): Promise<string> {
  console.log("Recherche de la clé Firebase pour le jour:", dayId);
  const daysRef = dbRef(db, 'trip/days'); // Use dbRef
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

  const errorMessage = `Jour avec l'ID ${dayId} non trouvé`;
  console.error("findDayKeyById:", errorMessage);
  throw new Error(errorMessage);
}

// Fonction pour charger les données du voyage avec gestion d'erreur améliorée
export const loadTripData = (callback: (data: TripData | null) => void) => {
  console.log("TripService: Setting up data subscription");
  const tripRef = dbRef(db, 'trip'); // Use dbRef

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

      // Transformation des données pour la nouvelle structure
      const formattedData: TripData = {
        days: Array.isArray(data.days)
          ? data.days
          : Object.entries(data.days).map(([dayId, dayData]: [string, any]) => {
            const activityOrder = dayData.activityOrder || [];
            const activitiesById = dayData.activitiesById || {};

            return {
              id: dayId,
              date: dayData.date,
              title: dayData.title,
              activityOrder: activityOrder,
              activitiesById: activitiesById,
            };
          }),
        budget: data.budget || { total: 2000, spent: 0 }
      };

      console.log("TripService: Data formatted successfully",
        { dayCount: formattedData.days.length });

      callback(formattedData);
    },
    (error) => {
      // Gestion explicite des erreurs
      console.error("loadTripData: Error in onValue callback", error);
      // Consider if throwing here is best, or if callback(null, error) is better
      // For now, keeping the throw as it requires explicit handling in the component
      throw error;
    }
  );

  // Retourner la fonction pour annuler l'abonnement
  return unsubscribe;
};

// Fonction pour ajouter une activité (retourne l'ID de la nouvelle activité)
export const addActivity = async (dayId: string, activity: Omit<Activity, 'id'>): Promise<string> => {
  try {
    console.log("TripService: Adding activity", { dayId, activity });

    // Trouver la clé Firebase du jour
    const firebaseDayKey = await findDayKeyById(dayId);

    // Utiliser la clé Firebase pour le chemin - use activitiesById instead of activities
    const activitiesRef = dbRef(db, `trip/days/${firebaseDayKey}/activitiesById`); // Use dbRef
    const newActivityRef = push(activitiesRef);
    await update(newActivityRef, activity);
    
    // Also update the activityOrder array to include the new activity
    const dayRef = dbRef(db, `trip/days/${firebaseDayKey}`); // Use dbRef
    const daySnapshot = await get(dayRef);
    const dayData = daySnapshot.val();
    
    // Get the new activity ID (key)
    const newActivityId = newActivityRef.key;
    
    if (newActivityId) {
      // Get current activityOrder or initialize empty array
      const currentOrder = dayData.activityOrder || [];
      // Add new activity ID to the order
      const newOrder = [...currentOrder, newActivityId];
      
      // Update the activityOrder
      const activityOrderRef = dbRef(db, `trip/days/${firebaseDayKey}/activityOrder`); // Use dbRef
      await set(activityOrderRef, newOrder);
      
      console.log(`TripService: Activity order updated with new activity ${newActivityId}`);
    }
    await updateBudget();
    
    if (!newActivityId) {
      throw new Error("Failed to get new activity ID after push");
    }
    
    return newActivityId; // Retourne l'ID de la nouvelle activité
  } catch (error) {
    console.error("addActivity: Error adding activity", { dayId, activity }, error);
    throw error; // Re-throw for UI handling
  }
};

// Fonction pour téléverser un fichier pour une activité
export const uploadActivityFile = async (dayId: string, activityId: string, file: File): Promise<Attachment> => {
  try {
    console.log("TripService: Uploading file for activity", { dayId, activityId, fileName: file.name });

    // Créer un chemin unique pour le fichier dans Firebase Storage
    const filePath = `activity_files/${dayId}/${activityId}/${Date.now()}_${file.name}`;
    const fileRef = storageRef(storage, filePath);

    // Téléverser le fichier
    const uploadResult = await uploadBytes(fileRef, file);
    console.log("TripService: File uploaded successfully", uploadResult);

    // Obtenir l'URL de téléchargement
    const downloadURL = await getDownloadURL(uploadResult.ref);
    console.log("TripService: Download URL obtained", downloadURL);

    // Créer l'objet Attachment
    const attachment: Attachment = {
      name: file.name,
      url: downloadURL,
      path: filePath // Stocker le chemin pour la suppression future
    };

    // Mettre à jour l'activité dans la base de données Realtime pour ajouter le fichier joint
    const firebaseDayKey = await findDayKeyById(dayId);
    const activityRef = dbRef(db, `trip/days/${firebaseDayKey}/activitiesById/${activityId}`);
    const activitySnapshot = await get(activityRef);
    const activityData = activitySnapshot.val() as Activity;

    const updatedAttachments = [...(activityData.attachments || []), attachment];

    await update(activityRef, { attachments: updatedAttachments });
    console.log("TripService: Activity updated with new attachment info");

    return attachment;
  } catch (error) {
    console.error("uploadActivityFile: Error uploading file", { dayId, activityId, fileName: file.name }, error);
    throw error; // Re-throw for UI handling
  }
};

// Fonction pour supprimer un fichier d'une activité
export const deleteActivityFile = async (dayId: string, activityId: string, attachmentToDelete: Attachment): Promise<void> => {
  try {
    console.log("TripService: Deleting file for activity", { dayId, activityId, attachmentPath: attachmentToDelete.path });

    // Supprimer le fichier de Firebase Storage
    const fileRef = storageRef(storage, attachmentToDelete.path);
    await deleteObject(fileRef);
    console.log("TripService: File deleted from Storage successfully");

    // Mettre à jour l'activité dans la base de données Realtime pour supprimer le fichier joint
    const firebaseDayKey = await findDayKeyById(dayId);
    const activityRef = dbRef(db, `trip/days/${firebaseDayKey}/activitiesById/${activityId}`);
    const activitySnapshot = await get(activityRef);
    const activityData = activitySnapshot.val() as Activity;

    if (activityData.attachments) {
      const updatedAttachments = activityData.attachments.filter(
        (att) => att.path !== attachmentToDelete.path
      );
      await update(activityRef, { attachments: updatedAttachments });
      console.log("TripService: Activity updated, attachment info removed");
    } else {
      console.log("TripService: No attachments found for the activity, nothing to remove from DB.");
    }

  } catch (error) {
    console.error("TripService: Error deleting file", error);
    // Gérer les erreurs spécifiques de Firebase Storage (ex: objet non trouvé)
    if ((error as any).code === 'storage/object-not-found') {
      console.warn("TripService: File not found in Storage, attempting to remove from DB anyway.");
      // Essayer quand même de supprimer de la base de données au cas où il y aurait une incohérence
      try {
        const firebaseDayKey = await findDayKeyById(dayId);
        const activityRef = dbRef(db, `trip/days/${firebaseDayKey}/activitiesById/${activityId}`);
        const activitySnapshot = await get(activityRef);
        const activityData = activitySnapshot.val() as Activity;
        if (activityData.attachments) {
          const updatedAttachments = activityData.attachments.filter(
            (att) => att.path !== attachmentToDelete.path
          );
          await update(activityRef, { attachments: updatedAttachments });
          console.log("TripService: Attachment info removed from DB despite Storage error.");
        }
      } catch (dbError) {
        console.error("deleteActivityFile: Error removing attachment info from DB after Storage error", { dayId, activityId, attachmentPath: attachmentToDelete.path }, dbError);
        throw dbError; // Re-throw the database error
      }
    } else {
      console.error("deleteActivityFile: Unhandled error deleting file", { dayId, activityId, attachmentPath: attachmentToDelete.path }, error);
      throw error; // Re-throw other errors
    }
  }
};

// Fonction pour mettre à jour une activité
export const updateActivity = async (dayId: string, activityId: string, activity: Partial<Activity>) => {
  try {
    console.log("TripService: Updating activity", { dayId, activityId, activity });

    // Trouver la clé Firebase du jour
    const firebaseDayKey = await findDayKeyById(dayId);

    // Utiliser la clé Firebase pour le chemin - use activitiesById instead of activities
    const activityRef = dbRef(db, `trip/days/${firebaseDayKey}/activitiesById/${activityId}`); // Use dbRef
    await update(activityRef, activity);
    await updateBudget();
    return true;
  } catch (error) {
    console.error("updateActivity: Error updating activity", { dayId, activityId, activity }, error);
    throw error; // Re-throw for UI handling
  }
};

// Fonction pour supprimer une activité
export const deleteActivity = async (dayId: string, activityId: string) => {
  try {
    console.log("TripService: Deleting activity", { dayId, activityId });

    // Trouver la clé Firebase du jour
    const firebaseDayKey = await findDayKeyById(dayId);

    // Utiliser la clé Firebase pour le chemin - use activitiesById instead of activities
    const activityRef = dbRef(db, `trip/days/${firebaseDayKey}/activitiesById/${activityId}`); // Use dbRef
    await remove(activityRef);
    
    // Also remove the activity from the activityOrder array
    const dayRef = dbRef(db, `trip/days/${firebaseDayKey}`); // Use dbRef
    const daySnapshot = await get(dayRef);
    const dayData = daySnapshot.val();
    
    if (dayData.activityOrder) {
      // Filter out the deleted activity ID
      const newOrder = dayData.activityOrder.filter((id: string) => id !== activityId);
      
      // Update the activityOrder
      const activityOrderRef = dbRef(db, `trip/days/${firebaseDayKey}/activityOrder`); // Use dbRef
      await set(activityOrderRef, newOrder);
      
      console.log(`TripService: Activity order updated after deleting activity ${activityId}`);
    }
    await updateBudget();
    return true;
  } catch (error) {
    console.error("deleteActivity: Error deleting activity", { dayId, activityId }, error);
    throw error; // Re-throw for UI handling
  }
};

// Fonction pour obtenir les dépenses par catégorie
export const getExpensesByCategory = (): Promise<Record<string, number>> => {
  return new Promise(async (resolve, reject) => {
    try {
      const daysRef = dbRef(db, 'trip/days'); // Use dbRef
      const snapshot = await get(daysRef);
      
      try {
        const days = snapshot.val();
        const expensesByCategory: Record<string, number> = {};
        const defaultCategory: ActivityCategory = "Autre"; // Use 'Autre' as default

        if (days) {
          // Helper function to process activities for a day
          const processDayActivities = (dayData: any) => {
            if (dayData.activitiesById) {
              Object.values(dayData.activitiesById).forEach((activity: any) => {
                if (activity.price) {
                  const price = parseFloat(activity.price);
                  // Use the activity's category, defaulting to 'Autre'
                  const category: ActivityCategory = activity.category || defaultCategory;
                  expensesByCategory[category] = (expensesByCategory[category] || 0) + price;
                }
              });
            }
          };

          // Check if days is an array (old structure) or object (new structure)
          if (Array.isArray(days)) {
            // This case might be obsolete if data is always stored as an object
            console.warn("TripService: 'days' data is an array, processing might be incomplete if keys are not standard.");
            days.forEach(processDayActivities);
          } else if (typeof days === 'object' && days !== null) {
            // Process each day in the object
            Object.values(days).forEach(processDayActivities);
          }
        }

        console.log("TripService: Expenses by category calculated", expensesByCategory);
        resolve(expensesByCategory);
      } catch (calcError) {
        console.error("getExpensesByCategory: Error calculating expenses", calcError);
        reject(calcError); // Reject the promise on calculation error
      }
    } catch (fetchError) {
      console.error("getExpensesByCategory: Error fetching days data", fetchError);
      reject(fetchError); // Reject the promise on fetch error
    }
  });
};

// Fonction pour obtenir les dépenses par tag
export const getExpensesByTag = (): Promise<Record<string, number>> => {
  return new Promise(async (resolve, reject) => {
    try {
      const daysRef = dbRef(db, 'trip/days');
      const snapshot = await get(daysRef);

      try {
        const days = snapshot.val();
        const expensesByTag: Record<string, number> = {};
        const defaultTag = "Sans tag"; // Default for activities without tags

        if (days) {
          // Helper function to process activities for a day
          const processDayActivities = (dayData: any) => {
            if (dayData.activitiesById) {
              Object.values(dayData.activitiesById).forEach((activity: any) => {
                if (activity.price) {
                  const price = parseFloat(activity.price);
                  if (activity.tags && activity.tags.length > 0) {
                    // Distribute the amount among tags if present
                    activity.tags.forEach((tag: string) => {
                      expensesByTag[tag] = (expensesByTag[tag] || 0) + price;
                    });
                  } else {
                    // Otherwise, add to the default group
                    expensesByTag[defaultTag] = (expensesByTag[defaultTag] || 0) + price;
                  }
                }
              });
            }
          };

          // Check if days is an array or object
          if (Array.isArray(days)) {
            console.warn("TripService: 'days' data is an array in getExpensesByTag, processing might be incomplete.");
            days.forEach(processDayActivities);
          } else if (typeof days === 'object' && days !== null) {
            Object.values(days).forEach(processDayActivities);
          }
        }

        console.log("TripService: Expenses by tag calculated", expensesByTag);
        resolve(expensesByTag);
      } catch (calcError) {
        console.error("getExpensesByTag: Error calculating expenses", calcError);
        reject(calcError);
      }
    } catch (fetchError) {
      console.error("getExpensesByTag: Error fetching days data", fetchError);
      reject(fetchError);
    }
  });
};


// Fonction pour mettre à jour le budget
export const updateBudget = async (newTotalBudget?: number) => {
  try {
    console.log("TripService: Updating budget");
    const daysRef = dbRef(db, 'trip/days'); // Use dbRef

    return new Promise<void>(async (resolve, reject) => {
      try {
        const snapshot = await get(daysRef);
        const days = snapshot.val();
        let totalSpent = 0;

        if (days) {
          // Helper function to process activities for a day
           const processDayActivities = (dayData: any) => {
             if (dayData.activitiesById) {
               Object.values(dayData.activitiesById).forEach((activity: any) => {
                 if (activity.price) {
                   totalSpent += parseFloat(activity.price);
                 }
               });
             }
           };

          // Check if days is an array or object
          if (Array.isArray(days)) {
             console.warn("TripService: 'days' data is an array in updateBudget, processing might be incomplete.");
             days.forEach(processDayActivities);
          } else if (typeof days === 'object' && days !== null) {
             Object.values(days).forEach(processDayActivities);
          }
        }

        const budgetRef = dbRef(db, 'trip/budget'); // Use dbRef

        // Si un nouveau budget total est fourni, mettez-le à jour également
        const updateData = newTotalBudget !== undefined // Check if newTotalBudget is provided
          ? { spent: totalSpent, total: newTotalBudget }
          : { spent: totalSpent };

        await update(budgetRef, updateData);
        console.log("TripService: Budget updated successfully", updateData);
        resolve();
      } catch (calcError) {
        console.error("updateBudget: Error calculating or updating budget", calcError);
        reject(calcError); // Reject the promise on calculation/update error
      }
    });
  } catch (outerError) {
    // This catch block might be redundant if the inner promise handles all errors
    console.error("updateBudget: Outer error (should not happen if promise catches)", outerError);
    throw outerError;
  }
};

// Fonction pour mettre à jour les limites de budget par catégorie
export const updateCategoryBudgetLimits = async (categoryLimits: Record<string, number>): Promise<void> => {
  try {
    console.log("TripService: Updating category budget limits", categoryLimits);
    const budgetRef = dbRef(db, 'trip/budget/categoryLimits');
    await set(budgetRef, categoryLimits);
    console.log("TripService: Category budget limits updated successfully");
  } catch (error) {
    console.error("updateCategoryBudgetLimits: Error updating category limits", error);
    throw error;
  }
};

// Fonction pour mettre à jour les limites de budget par tag
export const updateTagBudgetLimits = async (tagLimits: Record<string, number>): Promise<void> => {
  try {
    console.log("TripService: Updating tag budget limits", tagLimits);
    const budgetRef = dbRef(db, 'trip/budget/tagLimits');
    await set(budgetRef, tagLimits);
    console.log("TripService: Tag budget limits updated successfully");
  } catch (error) {
    console.error("updateTagBudgetLimits: Error updating tag limits", error);
    throw error;
  }
};

// Fonction pour obtenir les limites de budget par catégorie
export const getCategoryBudgetLimits = async (): Promise<Record<string, number>> => {
  try {
    console.log("TripService: Getting category budget limits");
    const budgetRef = dbRef(db, 'trip/budget/categoryLimits');
    const snapshot = await get(budgetRef);
    const categoryLimits = snapshot.val() || {};
    console.log("TripService: Category budget limits retrieved", categoryLimits);
    return categoryLimits;
  } catch (error) {
    console.error("getCategoryBudgetLimits: Error getting category limits", error);
    throw error;
  }
};

// Fonction pour obtenir les limites de budget par tag
export const getTagBudgetLimits = async (): Promise<Record<string, number>> => {
  try {
    console.log("TripService: Getting tag budget limits");
    const budgetRef = dbRef(db, 'trip/budget/tagLimits');
    const snapshot = await get(budgetRef);
    const tagLimits = snapshot.val() || {};
    console.log("TripService: Tag budget limits retrieved", tagLimits);
    return tagLimits;
  } catch (error) {
    console.error("getTagBudgetLimits: Error getting tag limits", error);
    throw error;
  }
};

// Alias pour la compatibilité avec le code existant qui utilise updateTotalBudget
export const updateTotalBudget = updateBudget;

// Fonction pour mettre à jour les coordonnées de toutes les activités avec des adresses
export const updateAllActivityCoordinates = async (): Promise<boolean> => {
  try {
    console.log("TripService: Updating coordinates for all activities with addresses");
    const daysRef = dbRef(db, 'trip/days'); // Use dbRef
    const snapshot = await get(daysRef);
    const days = snapshot.val();

    if (!days) {
      console.log("TripService: No days data found");
      return false;
    }

    // Collecter toutes les activités avec des adresses qui nécessitent une mise à jour
    const activitiesToUpdate: Array<{
      dayKey: string;
      activityId: string;
      activity: Activity;
      needsForceUpdate: boolean;
    }> = [];

    // Pour chaque jour (assuming days is an object)
    if (typeof days === 'object' && days !== null) {
        for (const [dayKey, dayData] of Object.entries(days)) {
          const day = dayData as any;
          if (!day.activitiesById) continue;

          // Pour chaque activité du jour
          for (const [activityId, activityData] of Object.entries(day.activitiesById)) {
            const activity = activityData as Activity;
            
            // Vérifier si l'activité a une adresse
            if (activity.address) {
              // Vérifier si l'activité a besoin d'une mise à jour
              const hasCoordinates = activity.lat != null && activity.lon != null;
              // Force update if coordinates exist but are strings (old format)
              const needsForceUpdate = hasCoordinates && 
                (typeof activity.lat === 'string' || typeof activity.lon === 'string');
              
              if (!hasCoordinates || needsForceUpdate) {
                activitiesToUpdate.push({
                  dayKey,
                  activityId,
                  activity,
                  needsForceUpdate
                });
              }
            }
          }
        }
    } else {
        console.warn("TripService: 'days' data is not an object in updateAllActivityCoordinates.");
    }


    console.log(`TripService: Found ${activitiesToUpdate.length} activities that need coordinate updates`);
    
    if (activitiesToUpdate.length === 0) {
      console.log("TripService: No activities need coordinate updates");
      return false;
    }

    let updatedCount = 0;
    let errorCount = 0;
    let hasUpdates = false;
    
    // Traiter les activités par lots pour éviter de surcharger l'API
    const batchSize = 5;
    for (let i = 0; i < activitiesToUpdate.length; i += batchSize) {
      const batch = activitiesToUpdate.slice(i, i + batchSize);
      
      // Traiter chaque lot en parallèle
      const batchPromises = batch.map(async ({ dayKey, activityId, activity }) => {
        try {
          console.log(`TripService: Geocoding address for activity: ${activity.name}`);
          
          // Utiliser l'API Google Maps pour géocoder l'adresse
          const googleMapsApiKey = "AIzaSyBwpPefXZ1brfWoRr3SzXQOCodskppK2TU"; // Replace with your actual API key management
          const googleResponse = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(activity.address!)}&key=${googleMapsApiKey}`);
          const googleData = await googleResponse.json();
          
          if (googleData && googleData.status === 'OK' && googleData.results.length > 0) {
            const location = googleData.results[0].geometry.location;
            const lat = location.lat;
            const lng = location.lng; // Google uses lng, we store as lon
            
            // Mettre à jour l'activité avec les nouvelles coordonnées
            const activityRef = dbRef(db, `trip/days/${dayKey}/activitiesById/${activityId}`); // Use dbRef
            await update(activityRef, {
              lat: lat,
              lon: lng
            });
            
            console.log(`TripService: Updated coordinates for activity: ${activity.name} using Google Maps API`);
            updatedCount++;
            hasUpdates = true;
            return true;
          } else {
            console.warn(`TripService: Google Maps geocoding failed for address: ${activity.address}. Status: ${googleData.status}`);
            
            // Fallback to Nominatim if Google fails
            console.log(`TripService: Falling back to Nominatim for activity: ${activity.name}`);
            const nominatimResponse = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(activity.address!)}&format=json&limit=1`);
            const nominatimData = await nominatimResponse.json();
            
            if (nominatimData && nominatimData.length > 0) {
              const { lat, lon } = nominatimData[0];
              const parsedLat = parseFloat(lat);
              const parsedLon = parseFloat(lon);
              
              // Mettre à jour l'activité avec les nouvelles coordonnées
              const activityRef = dbRef(db, `trip/days/${dayKey}/activitiesById/${activityId}`); // Use dbRef
              await update(activityRef, {
                lat: parsedLat,
                lon: parsedLon
              });
              
              console.log(`TripService: Updated coordinates for activity: ${activity.name} using Nominatim`);
              updatedCount++;
              hasUpdates = true;
              return true;
            } else {
              console.warn(`TripService: No coordinates found for address: ${activity.address} with either Google Maps or Nominatim`);
              // Optionally update with null coordinates if not found
              // await update(dbRef(db, `trip/days/${dayKey}/activitiesById/${activityId}`), { lat: null, lon: null });
              errorCount++;
              return false;
            }
          }
        } catch (error) {
          console.error(`TripService: Error geocoding address for activity: ${activity.name}`, error);
          errorCount++;
          return false;
        }
      });
      
      await Promise.all(batchPromises);
      
      // Attendre un peu entre chaque lot pour éviter de surcharger l'API
      if (i + batchSize < activitiesToUpdate.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`TripService: Finished updating coordinates for all activities. Updated: ${updatedCount}, Errors: ${errorCount}`);
    return hasUpdates;
  } catch (error) {
    console.error("updateAllActivityCoordinates: Error during bulk update", error);
    throw error; // Re-throw for potential handling elsewhere
  }
};

// Fonction pour mettre à jour l'ordre des activités
export const updateActivityOrder = async (dayId: string, activityOrder: string[]) => {
  try {
    console.log("TripService: Updating activity order", { dayId, activityOrder });

    // Trouver la clé Firebase du jour
    const firebaseDayKey = await findDayKeyById(dayId);

    // Utiliser la clé Firebase pour le chemin
    const activityOrderRef = dbRef(db, `trip/days/${firebaseDayKey}/activityOrder`); // Use dbRef
    await set(activityOrderRef, activityOrder);
    
    // Log success for debugging
    console.log(`TripService: Activity order updated successfully for day ${dayId}`, activityOrder);
    return true;
  } catch (error) {
    console.error("updateActivityOrder: Error updating activity order", { dayId, activityOrder }, error);
    throw error; // Re-throw for UI handling
  }
};

// Fonction pour obtenir les dépenses réservées et non réservées
export const getBookedAndUnbookedExpenses = (): Promise<{ booked: number; unbooked: number }> => {
  return new Promise(async (resolve, reject) => {
    try {
      const daysRef = dbRef(db, 'trip/days'); // Use dbRef
      const snapshot = await get(daysRef);
      
      try {
        const days = snapshot.val();
        let bookedExpenses = 0;
        let unbookedExpenses = 0;

        if (days) {
           // Helper function to process activities for a day
           const processDayActivities = (dayData: any) => {
             if (dayData.activitiesById) {
               Object.values(dayData.activitiesById).forEach((activity: any) => {
                 if (activity.price) {
                   const price = parseFloat(activity.price);
                   if (activity.booked) {
                     bookedExpenses += price;
                   } else {
                     unbookedExpenses += price;
                   }
                 }
               });
             }
           };

          // Check if days is an array or object
          if (Array.isArray(days)) {
             console.warn("TripService: 'days' data is an array in getBookedAndUnbookedExpenses, processing might be incomplete.");
             days.forEach(processDayActivities);
          } else if (typeof days === 'object' && days !== null) {
             Object.values(days).forEach(processDayActivities);
          }
        }

        console.log("TripService: Booked and unbooked expenses calculated", {
          booked: bookedExpenses,
          unbooked: unbookedExpenses
        });

        resolve({ booked: bookedExpenses, unbooked: unbookedExpenses });
      } catch (calcError) {
        console.error("getBookedAndUnbookedExpenses: Error calculating expenses", calcError);
        reject(calcError); // Reject the promise on calculation error
      }
    } catch (fetchError) {
      console.error("getBookedAndUnbookedExpenses: Error fetching days data", fetchError);
      reject(fetchError); // Reject the promise on fetch error
    }
  });
};

// Fonction pour créer des données initiales si nécessaire
export const createInitialData = async (): Promise<TripData> => {
  console.log("TripService: Creating initial data");

  const initialData: TripData = {
    days: [
      {
        id: "jour1",
        date: "10/06",
        title: "Arrivée à Porto-Vecchio",
        activityOrder: [],
        activitiesById: {}
      },
      {
        id: "jour2",
        date: "11/06",
        title: "Aiguilles de Bavella & Piscines du Cavu",
        activityOrder: [],
        activitiesById: {}
      },
      {
        id: "jour3",
        date: "12/06",
        title: "Bonifacio",
        activityOrder: [],
        activitiesById: {}
      },
      {
        id: "jour4",
        date: "13/06",
        title: "Plages de Palombaggia",
        activityOrder: [],
        activitiesById: {}
      },
      {
        id: "jour5",
        date: "14/06",
        title: "Réserve naturelle de Scandola",
        activityOrder: [],
        activitiesById: {}
      },
      {
        id: "jour6",
        date: "15/06",
        title: "Corte & Vallée de la Restonica",
        activityOrder: [],
        activitiesById: {}
      },
      {
        id: "jour7",
        date: "16/06",
        title: "Calvi",
        activityOrder: [],
        activitiesById: {}
      },
      {
        id: "jour8",
        date: "17/06",
        title: "Cap Corse",
        activityOrder: [],
        activitiesById: {}
      },
      {
        id: "jour9",
        date: "18/06",
        title: "Ajaccio",
        activityOrder: [],
        activitiesById: {}
      },
      {
        id: "jour10",
        date: "19/06",
        title: "Départ",
        activityOrder: [],
        activitiesById: {}
      }
    ],
    budget: {
      total: 2000,
      spent: 0
    }
  };

  try {
    const tripRef = dbRef(db, 'trip'); // Use dbRef

    // Convert the days array to an object suitable for Firebase
    const daysAsObject: Record<string, any> = {};
    initialData.days.forEach((day, index) => {
      daysAsObject[day.id] = { // Use day.id as the key
        id: day.id,
        date: day.date,
        title: day.title,
        activityOrder: day.activityOrder,
        activitiesById: day.activitiesById,
      };
    });

    const firebaseData = {
      days: daysAsObject,
      budget: initialData.budget
    };

    await set(tripRef, firebaseData);
    console.log("TripService: Initial data created successfully");
    return initialData;
  } catch (error) {
    console.error("createInitialData: Error creating initial data", error);
    throw error; // Re-throw for UI handling
  }
};
