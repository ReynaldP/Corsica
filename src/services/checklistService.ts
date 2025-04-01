// src/services/checklistService.ts
import { ref as dbRef, onValue, push, update, remove, get, set } from "firebase/database";
import { db } from "./firebase";
import { Checklist, ChecklistItem } from "../types";

// Function to load checklist data
export const loadChecklistData = (callback: (data: Checklist | null) => void) => {
  console.log("[SERVICE] loadChecklistData: Setting up data subscription at 'checklist'");
  const checklistRef = dbRef(db, 'checklist');

  const unsubscribe = onValue(
    checklistRef,
    (snapshot) => {
      const data = snapshot.val();
      console.log("[SERVICE] loadChecklistData: Raw data received from Firebase:", data);

      if (!data) {
        console.log("[SERVICE] loadChecklistData: No data found at 'checklist'.");
        callback(null); // Indicate no data
        return;
      }

      // Ensure items and itemOrder are correctly structured
      const formattedData: Checklist = {
        items: data.items && typeof data.items === 'object' ? data.items : {},
        itemOrder: Array.isArray(data.itemOrder) ? data.itemOrder : []
      };

      // Clean up itemOrder: remove IDs that don't exist in items
      const validItemIds = new Set(Object.keys(formattedData.items));
      formattedData.itemOrder = formattedData.itemOrder.filter(id => validItemIds.has(id));

      console.log("[SERVICE] loadChecklistData: Formatted data being sent to callback:", formattedData);
      callback(formattedData);
    },
    (error) => {
      // Explicit error handling
      console.error("loadChecklistData: Error fetching data", error);
      throw error; // Re-throw for UI handling
    }
  );

  // Return the function to cancel the subscription
  return unsubscribe;
};

// Function to add a checklist item (returns the ID of the new item)
export const addChecklistItem = async (item: Omit<ChecklistItem, 'id'>): Promise<string> => {
  try {
    console.log("ChecklistService: Adding item", { item });

    // Use Firebase to generate a unique ID
    const itemsRef = dbRef(db, 'checklist/items');
    const newItemRef = push(itemsRef);
    await update(newItemRef, item);
    
    // Get the new item ID (key)
    const newItemId = newItemRef.key;
    
    if (newItemId) {
      // Get current itemOrder or initialize empty array
      const checklistRef = dbRef(db, 'checklist');
      const checklistSnapshot = await get(checklistRef);
      const checklistData = checklistSnapshot.val() || { itemOrder: [] };
      
      // Add new item ID to the order
      const currentOrder = checklistData.itemOrder || [];
      const newOrder = [...currentOrder, newItemId];
      
      // Update the itemOrder
      const itemOrderRef = dbRef(db, 'checklist/itemOrder');
      await set(itemOrderRef, newOrder);
      
      console.log(`ChecklistService: Item order updated with new item ${newItemId}`);
    }
    
    if (!newItemId) {
      throw new Error("Failed to get new item ID after push");
    }
    
    return newItemId;
  } catch (error) {
    console.error("addChecklistItem: Error adding item", { item }, error);
    throw error; // Re-throw for UI handling
  }
};

// Function to update a checklist item - Reverting to update
export const updateChecklistItem = async (itemId: string, itemUpdate: Partial<ChecklistItem>) => {
  try {
    console.log("[SERVICE] updateChecklistItem: Attempting to update item using 'update'", { itemId, itemUpdate });

    // Get the reference to the specific item
    const itemRef = dbRef(db, `checklist/items/${itemId}`);

    // Use Firebase's update function directly for partial updates
    await update(itemRef, itemUpdate);

    console.log(`[SERVICE] updateChecklistItem: Item ${itemId} updated successfully using 'update'.`);
    return true;
  } catch (error) {
    // Log the specific error from Firebase
    console.error("updateChecklistItem: Error updating item", { itemId, itemUpdate }, error);
    throw error; // Re-throw the error to be caught by the calling function
  }
};

// Function to delete a checklist item
export const deleteChecklistItem = async (itemId: string) => {
  try {
    console.log("ChecklistService: Deleting item", { itemId });

    // Remove the item from items
    const itemRef = dbRef(db, `checklist/items/${itemId}`);
    await remove(itemRef);
    
    // Also remove the item from the itemOrder array
    const checklistRef = dbRef(db, 'checklist');
    const checklistSnapshot = await get(checklistRef);
    const checklistData = checklistSnapshot.val();
    
    if (checklistData && checklistData.itemOrder) {
      // Filter out the deleted item ID
      const newOrder = checklistData.itemOrder.filter((id: string) => id !== itemId);
      
      // Update the itemOrder
      const itemOrderRef = dbRef(db, 'checklist/itemOrder');
      await set(itemOrderRef, newOrder);
      
      console.log(`ChecklistService: Item order updated after deleting item ${itemId}`);
    }
    
    return true;
  } catch (error) {
    console.error("deleteChecklistItem: Error deleting item", { itemId }, error);
    throw error; // Re-throw for UI handling
  }
};

// Function to update the order of checklist items
export const updateChecklistItemOrder = async (itemOrder: string[]) => {
  try {
    console.log("ChecklistService: Updating item order", { itemOrder });

    const itemOrderRef = dbRef(db, 'checklist/itemOrder');
    await set(itemOrderRef, itemOrder);
    
    console.log("ChecklistService: Item order updated successfully");
    return true;
  } catch (error) {
    console.error("updateChecklistItemOrder: Error updating item order", { itemOrder }, error);
    throw error; // Re-throw for UI handling
  }
};

// Function to create initial checklist data if needed
export const createInitialChecklistData = async (): Promise<Checklist> => {
  console.log("ChecklistService: Creating initial data");

  const initialData: Checklist = {
    items: {},
    itemOrder: []
  };

  try {
    const checklistRef = dbRef(db, 'checklist');
    await set(checklistRef, initialData);
    console.log("ChecklistService: Initial data created successfully");
    return initialData;
  } catch (error) {
    console.error("createInitialChecklistData: Error creating initial data", error);
    throw error; // Re-throw for UI handling
  }
};
