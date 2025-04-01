// src/pages/ChecklistPage.tsx
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import Header from '../components/Header';
import ChecklistItem from '../components/ChecklistItem';
import ChecklistItemForm from '../components/ChecklistItemForm';
import { Checklist, ChecklistItem as ChecklistItemType } from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  loadChecklistData,
  createInitialChecklistData,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  updateChecklistItemOrder
} from '../services/checklistService';

const ChecklistPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [checklistData, setChecklistData] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItemType | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Load checklist data
  useEffect(() => {
    let unsubscribe: () => void;
    let isActive = true;

    const loadData = async () => {
      console.log("[PAGE] useEffect: Loading checklist data");
      setLoading(true);
      setError(null);

      try {
        unsubscribe = loadChecklistData((data) => {
          if (!isActive) return;

          console.log("[PAGE] useEffect/onValue: Checklist data received from service:", data);
          if (data) {
            setChecklistData(data);
            setLoading(false);
          } else {
            // If no data exists, create initial data
            console.log("[PAGE] useEffect/onValue: No data found, attempting to create initial data.");
            createInitialChecklistData()
              .then((initialData) => {
                if (!isActive) return;
                console.log("[PAGE] useEffect/onValue: Initial data created:", initialData);
                setChecklistData(initialData);
                setLoading(false);
              })
              .catch((err) => {
                if (!isActive) return;
                console.error("[PAGE] useEffect/onValue: Error creating initial data", err);
                setError("Erreur lors de la création des données initiales. Veuillez réessayer.");
                setLoading(false);
              });
          }
        });
      } catch (err: any) {
        if (!isActive) return;
        console.error("[PAGE] useEffect: Error setting up data subscription", err);
        setError(err.message || "Erreur lors du chargement des données");
        setLoading(false);
      }
    };

    loadData();

    return () => {
      console.log("[PAGE] useEffect cleanup: Unsubscribing from checklist data.");
      isActive = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Handle adding a new checklist item
  const handleAddItem = async (item: Omit<ChecklistItemType, 'id'>) => {
    setError(null); // Clear previous errors
    try {
      console.log("[PAGE] handleAddItem: Attempting to add item:", item);
      await addChecklistItem(item);
      console.log("[PAGE] handleAddItem: Item added successfully via service.");
      setShowAddForm(false);
    } catch (err: any) {
      console.error("[PAGE] handleAddItem: Error adding item", err);
      setError(`Erreur lors de l'ajout : ${err.message}. Veuillez réessayer.`);
    }
  };

  // Handle updating a checklist item - Back to basics
  const handleUpdateItem = async (updatedFields: Omit<ChecklistItemType, 'id'>) => {
    if (!editingItem) return; // Should not happen if form is shown for editing
    setError(null); // Clear previous errors
    try {
      console.log("[PAGE] handleUpdateItem: Attempting to update item", { itemId: editingItem.id, updatedFields });
      // Directly call the update service with the ID and the fields from the form
      await updateChecklistItem(editingItem.id, updatedFields);
      console.log("[PAGE] handleUpdateItem: Item updated successfully via service.");
      setEditingItem(null); // Close the form on success
      setShowAddForm(false); 
    } catch (err: any) {
      console.error("[PAGE] handleUpdateItem: Error updating item", err);
      setError(`Erreur de mise à jour : ${err.message}. Veuillez réessayer.`);
    }
  };

  // Handle toggling item completion - Back to basics
  const handleToggleComplete = async (id: string, completed: boolean) => {
    try {
      console.log("[PAGE] handleToggleComplete: Attempting to toggle completion", { id, completed });
      // Directly call the update service with the ID and the new completed status
      await updateChecklistItem(id, { completed });
      console.log("[PAGE] handleToggleComplete: Toggle completion successful via service.");
      // Let the Firebase listener update the UI state
    } catch (err: any) {
      console.error("[PAGE] handleToggleComplete: Error toggling item completion", err);
      // Display error briefly, but don't prevent UI updates if they eventually come through
      setError(`Erreur de mise à jour : ${err.message}.`); 
      // Optionally revert UI optimistically if needed, but listener should handle it
    }
  };

  // Handle deleting an item
  const handleDeleteItem = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) {
      setError(null); // Clear previous errors
      try {
        console.log(`[PAGE] handleDeleteItem: Attempting to delete item with ID: ${id}`);
        await deleteChecklistItem(id);
        console.log(`[PAGE] handleDeleteItem: Item ${id} deleted successfully via service.`);
      } catch (err: any) {
        console.error("[PAGE] handleDeleteItem: Error deleting item", err);
        setError(`Erreur de suppression : ${err.message}. Veuillez réessayer.`);
      }
    }
  };

  // Handle drag and drop reordering
  const handleDragEnd = async (result: DropResult) => {
    console.log("[PAGE] handleDragEnd: Drag ended.", result);
    // If dropped outside the list or no destination
    if (!result.destination || !checklistData) {
      console.log("[PAGE] handleDragEnd: No destination or no checklist data. Aborting.");
      return;
    }

    // Get the current item order
    const itemOrder = [...checklistData.itemOrder];
    console.log("[PAGE] handleDragEnd: Current item order:", itemOrder);
    
    // Get the item ID that was dragged
    const itemId = result.draggableId;
    console.log("[PAGE] handleDragEnd: Dragged item ID:", itemId);
    
    // Remove the item from its current position
    const sourceIndex = itemOrder.indexOf(itemId);
    if (sourceIndex !== -1) {
      itemOrder.splice(sourceIndex, 1);
      console.log(`[PAGE] handleDragEnd: Removed item ${itemId} from index ${sourceIndex}.`);
    }
    
    // Insert it at the new position
    itemOrder.splice(result.destination.index, 0, itemId);
    console.log(`[PAGE] handleDragEnd: Inserted item ${itemId} at index ${result.destination.index}. New order:`, itemOrder);
    
    // Update in Firebase
    try {
      await updateChecklistItemOrder(itemOrder);
      console.log("[PAGE] handleDragEnd: Item order updated successfully via service.");
    } catch (err: any) {
      console.error("[PAGE] handleDragEnd: Error updating item order", err);
      setError(`Erreur de réorganisation : ${err.message}. Veuillez réessayer.`);
      // Note: Reverting the UI state optimistically might be complex here.
      // The listener should eventually correct the order if the update failed.
    }
  };

  // Get unique categories for filter dropdown
  const getUniqueCategories = () => {
    if (!checklistData) return [];
    
    const categories = new Set<string>();
    
    Object.values(checklistData.items).forEach(item => {
      if (item.category) {
        categories.add(item.category);
      }
    });
    
    return Array.from(categories);
  };

  // Filter items based on current filters
  const getFilteredItems = () => {
    if (!checklistData || !checklistData.items || !checklistData.itemOrder) {
        console.log("[PAGE] getFilteredItems: checklistData or its properties are missing.");
        return [];
    }
    
    console.log("[PAGE] getFilteredItems: Starting filtering. Full data:", checklistData);

    // Get items in the correct order, ensuring each has an ID
    const itemsWithId = checklistData.itemOrder
      .map(id => {
        const itemData = checklistData.items[id];
        // Return the item data along with its ID, only if itemData exists
        if (itemData) {
          return { ...itemData, id }; // Explicitly add the ID
        }
        console.warn(`[PAGE] getFilteredItems: Item data not found for ID ${id} in itemOrder.`);
        return null; // Mark as null if data is missing for an ID in itemOrder
      })
      .filter(item => item !== null); // Filter out nulls (items missing data)

    console.log("[PAGE] getFilteredItems: Items after mapping ID and filtering nulls:", itemsWithId);

    // Apply status filter
    let filteredItems = itemsWithId;
    if (filter === 'completed') {
      // Add null check: item && item.completed
      filteredItems = filteredItems.filter(item => item && item.completed);
    } else if (filter === 'pending') {
      // Add null check: item && !item.completed
      filteredItems = filteredItems.filter(item => item && !item.completed);
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      // Add null check: item && item.category === categoryFilter
      filteredItems = filteredItems.filter(item => item && item.category === categoryFilter);
    }
    
    // console.log("[PAGE] getFilteredItems: Returning filtered items:", filteredItems); // Reduce noise, uncomment if needed
    return filteredItems;
  };

  // Calculate progress
  const calculateProgress = () => {
    if (!checklistData || Object.keys(checklistData.items).length === 0) {
      return 0;
    }
    
    // Get only valid items (those that are in the itemOrder array)
    const validItemIds = new Set(checklistData.itemOrder);
    const validItems = Object.entries(checklistData.items)
      .filter(([id]) => validItemIds.has(id))
      .map(([, item]) => item);
    
    const totalItems = validItems.length;
    const completedItems = validItems.filter(item => item.completed).length;
    
    console.log("ChecklistPage: Calculating progress", {
      totalItems,
      completedItems,
      percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
    });
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  return (
    <div className={isDarkMode ? 'dark-mode' : ''}>
      <Header
        title="Checklist de Voyage"
        subtitle="Organisez votre préparation de voyage"
      />

      <div className="container">
        {/* Progress bar */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Progression</h5>
                <div className="progress">
                  <div
                    className="progress-bar bg-success"
                    role="progressbar"
                    style={{ width: `${calculateProgress()}%` }}
                    aria-valuenow={calculateProgress()}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    {calculateProgress()}%
                  </div>
                </div>
                {checklistData && (
                  <div className="mt-2 text-muted">
                    {(() => {
                      // Use the same logic as calculateProgress
                      const validItemIds = new Set(checklistData.itemOrder);
                      const validItems = Object.entries(checklistData.items)
                        .filter(([id]) => validItemIds.has(id))
                        .map(([, item]) => item);
                      
                      const totalItems = validItems.length;
                      const completedItems = validItems.filter(item => item.completed).length;
                      
                      return `${completedItems} sur ${totalItems} éléments complétés`;
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Add button */}
        <div className="row mb-4">
          <div className="col-md-8">
            <div className="d-flex flex-wrap gap-2">
              <div className="me-3">
                <label htmlFor="statusFilter" className="form-label me-2">Statut:</label>
                <select
                  id="statusFilter"
                  className="form-select form-select-sm"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as 'all' | 'completed' | 'pending')}
                >
                  <option value="all">Tous</option>
                  <option value="pending">À faire</option>
                  <option value="completed">Complétés</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="categoryFilter" className="form-label me-2">Catégorie:</label>
                <select
                  id="categoryFilter"
                  className="form-select form-select-sm"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">Toutes</option>
                  {getUniqueCategories().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="col-md-4 d-flex justify-content-md-end mt-3 mt-md-0">
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingItem(null);
                setShowAddForm(!showAddForm);
              }}
            >
              {showAddForm ? 'Annuler' : 'Ajouter un élément'}
            </button>
          </div>
        </div>

        {/* Add/Edit form */}
        {(showAddForm || editingItem) && (
          <div className="row mb-4">
            <div className="col-12">
              <ChecklistItemForm
                item={editingItem || undefined}
                onSubmit={editingItem ? handleUpdateItem : handleAddItem}
                onCancel={() => {
                  setShowAddForm(false);
                  setEditingItem(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Loading and error states */}
        {loading && (
          <div className="row mb-4">
            <div className="col-12 text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="row mb-4">
            <div className="col-12">
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            </div>
          </div>
        )}

        {/* Checklist items - Wrap the entire conditional rendering block with DragDropContext */}
        <DragDropContext onDragEnd={handleDragEnd}>
          {!loading && !error && checklistData && (
            <Droppable droppableId="checklist-items">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="checklist-items"
                >
                  {getFilteredItems().length > 0 ? (
                    getFilteredItems().map((item, index) => {
                      // Add a check here to ensure item and item.id are valid before rendering Draggable
                      if (!item || typeof item.id !== 'string') {
                        console.error("[PAGE] Rendering Draggable: Invalid item or missing/invalid ID found at index", index, item);
                        return null; // Skip rendering this item if invalid
                      }
                      return (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided) => (
                            <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                              <ChecklistItem
                                item={item} // Pass the item which now includes the id
                                onToggleComplete={handleToggleComplete}
                                // Ensure onEdit receives the correct id from the item object
                                onEdit={() => { 
                                  console.log(`[PAGE] Edit button clicked for item ID: ${item.id}`);
                                  // We already have the full item object here from getFilteredItems
                                  setEditingItem(item); 
                                  setShowAddForm(true); 
                                }}
                                onDelete={handleDeleteItem}
                              />
                            </div>
                          )}
                        </Draggable>
                      );
                    })
                  ) : (
                    <div className="alert alert-info">
                      {Object.keys(checklistData.items).length === 0
                        ? "Aucun élément dans la checklist. Ajoutez-en un pour commencer !"
                        : "Aucun élément ne correspond aux filtres sélectionnés."}
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </DragDropContext>
      </div>
    </div>
  );
};

export default ChecklistPage;
