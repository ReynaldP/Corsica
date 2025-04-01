// src/components/ActivityForm.tsx
import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import axios from 'axios'; // Import axios
import { useLoadScript, Autocomplete } from '@react-google-maps/api'; // Import Google Maps components
import { Activity, ActivityCategory, Attachment } from '../types'; // Import ActivityCategory and Attachment
import { addActivity, updateActivity, deleteActivity, uploadActivityFile, deleteActivityFile } from '../services/tripService'; // Import file functions

const libraries: ("places")[] = ['places']; // Define libraries type explicitly
const googleMapsApiKey = "AIzaSyBwpPefXZ1brfWoRr3SzXQOCodskppK2TU"; // Reuse existing key

interface ActivityFormProps {
  dayId: string | null;
  activity: Activity | null;
  activityId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ActivityForm: React.FC<ActivityFormProps> = ({ 
  dayId, 
  activity, 
  activityId, 
  onClose, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState<Omit<Activity, 'id'>>({
    name: '',
    time: '',
    price: 0,
    link: '',
    notes: '',
    address: '', 
    lat: null, // Use null instead of undefined for initial state
    lon: null,
    booked: false,
    tags: [],
    category: undefined // Add category to state
  });
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // State for selected file
  const [isUploading, setIsUploading] = useState(false); // State for upload status
  const [currentAttachments, setCurrentAttachments] = useState<Attachment[]>([]); // State for current attachments
  const [autocompleteInstance, setAutocompleteInstance] = useState<google.maps.places.Autocomplete | null>(null); // State for Autocomplete instance

  const isEditMode = !!activityId;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: googleMapsApiKey,
    libraries: libraries,
  });

  // Initialiser le formulaire avec les données de l'activité si en mode édition
  useEffect(() => {
    if (activity) {
      setFormData({
        name: activity.name || '',
        time: activity.time || '',
        price: activity.price || 0,
        link: activity.link || '',
        notes: activity.notes || '',
        address: activity.address || '', 
        lat: activity.lat ?? null, // Load lat/lon, default to null
        lon: activity.lon ?? null,
        booked: activity.booked || false,
        tags: activity.tags || [],
        category: activity.category, // Load category in edit mode
        attachments: activity.attachments || [] // Load attachments
      });
      setTagsInput(activity.tags?.join(', ') || '');
      setCurrentAttachments(activity.attachments || []); // Set current attachments state
    }
  }, [activity]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { // Update event type
    const { name, value, type } = e.target;
    
    if (name === 'tags') {
      setTagsInput(value);
      // Convertir les tags en tableau
      const tagsArray = value.split(',').map(tag => tag.trim()).filter(tag => tag);
      setFormData(prev => ({ ...prev, tags: tagsArray }));
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (e.target.tagName === 'SELECT') { // Correctly handle select change
      setFormData(prev => ({ ...prev, [name]: value as ActivityCategory }));
    } else { // Default case for other input types (text, url, textarea)
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handler for file input change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null); // Clear previous errors
    } else {
      setSelectedFile(null);
    }
  };

  // Autocomplete handlers
  const handleAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    setAutocompleteInstance(autocomplete);
  };

  const handlePlaceChanged = () => {
    if (autocompleteInstance !== null) {
      const place = autocompleteInstance.getPlace();
      if (place.formatted_address && place.geometry?.location) {
        setFormData(prev => ({
          ...prev,
          address: place.formatted_address || '',
          lat: place.geometry?.location?.lat() ?? null,
          lon: place.geometry?.location?.lng() ?? null,
        }));
        console.log("Place selected:", {
          address: place.formatted_address,
          lat: place.geometry.location.lat(),
          lon: place.geometry.location.lng(),
        });
      } else {
        console.log('Autocomplete place not found or geometry missing');
        // Keep the manually typed address, but clear coordinates if place is invalid
        // The user might just be typing a generic address without selecting a suggestion
        setFormData(prev => ({
          ...prev,
          lat: null,
          lon: null,
        }));
      }
    } else {
      console.log('Autocomplete is not loaded yet!');
    }
  };

  // Handler for deleting an attachment
  const handleDeleteAttachment = async (attachmentToDelete: Attachment) => {
    if (!dayId || !activityId) return;

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le fichier "${attachmentToDelete.name}" ?`)) {
      setIsSubmitting(true); // Use submitting state to disable buttons
      setError(null);
      try {
        await deleteActivityFile(dayId, activityId, attachmentToDelete);
        // Update local state to remove the attachment immediately
        setCurrentAttachments(prev => prev.filter(att => att.path !== attachmentToDelete.path));
        // Optionally: Call onSuccess or show a success message
      } catch (err: any) {
        console.error("handleDeleteAttachment: Error deleting attachment", err);
        setError(`Erreur de suppression du fichier : ${err.message}. Veuillez réessayer.`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!dayId) {
      setError('ID du jour manquant');
      return;
    }
    
    if (!formData.name.trim()) {
      setError('Le nom de l\'activité est requis');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    let activityDataToSave = { ...formData };

    // --- Geocoding Logic Removed ---
    // Coordinates (lat, lon) are now set by the handlePlaceChanged function
    // when a place is selected from the Autocomplete dropdown.
    // We still need to handle the case where the address is cleared manually.
    if (!formData.address) {
      activityDataToSave.lat = null;
      activityDataToSave.lon = null;
    }
    // --- End Geocoding Logic Removal ---

    // Remove category if it's undefined to prevent Firebase error
    if (activityDataToSave.category === undefined) {
      delete (activityDataToSave as Partial<Activity>).category; // Use type assertion to allow deletion
    }

    let savedActivityId = activityId; // Use existing ID for updates

    try {
      // 1. Save or Update Activity Data (without new attachment info yet)
      if (isEditMode && savedActivityId) {
        await updateActivity(dayId, savedActivityId, activityDataToSave);
      } else {
        // TODO: Modify addActivity in tripService to return the new activity ID
        // For now, we can't easily upload files for brand new activities in one step.
        // Let's proceed assuming we'll handle upload *after* initial save & close,
        // requiring the user to edit the activity to add files.
        // OR: We could potentially generate a temporary ID client-side, but that's complex.
        // Save the new activity and get its ID
        const newActivityId = await addActivity(dayId, activityDataToSave);
        savedActivityId = newActivityId; // Store the new ID for potential file upload
      }

      // 2. Upload File (if a file is selected, regardless of edit/add mode now)
      if (savedActivityId && selectedFile) {
        setIsUploading(true);
        try {
          const newAttachment = await uploadActivityFile(dayId, savedActivityId, selectedFile);
          setCurrentAttachments(prev => [...prev, newAttachment]); // Update UI immediately
          setSelectedFile(null); // Clear file input
        } catch (uploadError: any) {
          console.error("File upload error:", uploadError);
          setError(`Erreur lors du téléversement du fichier : ${uploadError.message}. L'activité a été enregistrée, mais le fichier n'a pas pu être ajouté.`);
          // Don't close the modal if upload fails, let user retry or cancel.
          setIsSubmitting(false);
          setIsUploading(false);
          return; // Stop execution here
        } finally {
          setIsUploading(false);
        }
      }

      onSuccess(); // Call success callback
      onClose(); // Close modal only if everything succeeded

    } catch (err: any) {
      console.error("handleSubmit: Error saving or updating activity", err);
      // Keep the specific upload error message if it was set previously
      if (!error) { // Only set general error if no specific upload error occurred
          setError(`Erreur d'enregistrement : ${err.message}. Vérifiez votre connexion et réessayez.`);
      }
    } finally {
      setIsSubmitting(false); // Ensure this runs even if upload fails mid-way
    }
  };

  const handleDelete = async () => {
    if (!dayId || !activityId) return;

    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette activité et tous ses fichiers joints ?')) {
      setIsSubmitting(true);
      setError(null);
      try {
        // 1. Delete associated files from Storage first
        if (currentAttachments && currentAttachments.length > 0) {
          console.log(`Deleting ${currentAttachments.length} attachments for activity ${activityId}`);
          const deletePromises = currentAttachments.map(att =>
            deleteActivityFile(dayId, activityId!, att).catch(err => {
              // Log error but continue trying to delete others and the activity itself
              console.error(`Failed to delete attachment ${att.path}:`, err);
              setError(`Erreur lors de la suppression du fichier ${att.name}. L'activité sera quand même supprimée.`);
            })
          );
          await Promise.all(deletePromises);
        }

        // 2. Delete activity data from Realtime Database
        await deleteActivity(dayId, activityId);
        onSuccess();
        onClose();
      } catch (err: any) {
        console.error("handleDelete: Error deleting activity", err);
         // Keep the specific attachment deletion error if it was set previously
        if (!error) { // Only set general error if no specific attachment error occurred
            setError(`Erreur de suppression : ${err.message}. Vérifiez votre connexion et réessayez.`);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {isEditMode ? 'Modifier une activité' : 'Ajouter une activité'}
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              aria-label="Fermer"
            ></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              
              <div className="mb-3">
                <label htmlFor="name" className="form-label">Nom de l'activité</label>
                <input 
                  type="text" 
                  className="form-control" 
                  id="name" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="time" className="form-label">Horaire</label>
                <input 
                  type="text" 
                  className="form-control" 
                  id="time" 
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  placeholder="ex: 10h00-12h00"
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="price" className="form-label">Prix (€)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  id="price" 
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0" 
                  step="0.01"
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="link" className="form-label">Lien (site web)</label>
                <input 
                  type="url" 
                  className="form-control" 
                  id="link" 
                  name="link"
                  value={formData.link}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="notes" className="form-label">Notes</label>
                <textarea 
                  className="form-control" 
                  id="notes" 
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                ></textarea>
              </div>

              {/* Address Field with Autocomplete */}
              <div className="mb-3">
                <label htmlFor="address" className="form-label">Adresse</label>
                {isLoaded && (
                  <Autocomplete
                    onLoad={handleAutocompleteLoad}
                    onPlaceChanged={handlePlaceChanged}
                    // Optional: Add restrictions like bounds or country
                    // options={{
                    //   componentRestrictions: { country: 'fr' }, // Example: Restrict to France
                    // }}
                  >
                    <input
                      type="text"
                      className="form-control"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange} // Keep standard onChange to update formData.address while typing
                      placeholder="ex: Plage de Palombaggia, Porto-Vecchio"
                      disabled={!isLoaded} // Disable input until script loads
                    />
                  </Autocomplete>
                )}
                {!isLoaded && !loadError && <input type="text" className="form-control" placeholder="Chargement de l'autocomplétion..." disabled />}
                {loadError && <div className="text-danger mt-1">Erreur de chargement Google Maps. Vérifiez la clé API et la connexion.</div>}
              </div>

              {/* Add Category Select Field */}
              <div className="mb-3">
                <label htmlFor="category" className="form-label">Catégorie</label>
                <select
                  className="form-select"
                  id="category"
                  name="category"
                  value={formData.category || ''} // Use empty string if undefined for controlled component
                  onChange={handleChange}
                >
                  <option value="" disabled>Choisir une catégorie</option>
                  <option value="Logement">Logement</option>
                  <option value="Transport">Transport</option>
                  <option value="Activité">Activité</option>
                  <option value="Alimentation">Alimentation</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              
              <div className="form-check mb-3">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  id="booked" 
                  name="booked"
                  checked={formData.booked}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="booked">
                  Réservé
                </label>
              </div>
              
              <div className="mb-3">
                <label htmlFor="tags" className="form-label">Tags (séparés par des virgules)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  id="tags" 
                  name="tags"
                  value={tagsInput}
                  onChange={handleChange}
                  placeholder="ex: Randonnée, Plage, Culture"
                />
              </div>

              {/* File Attachment Section */}
              <div className="mb-3">
                <label htmlFor="attachment" className="form-label">Ajouter un fichier (billet, réservation...)</label>
                <input
                  type="file"
                  className="form-control"
                  id="attachment"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.gif" // Specify accepted file types
                  disabled={isUploading || isSubmitting || !isEditMode} // Disable if uploading, submitting, or adding new activity
                />
                 {!isEditMode && <small className="text-muted d-block mt-1">Vous pourrez ajouter des fichiers après avoir enregistré l'activité.</small>}
                 {isUploading && <div className="text-primary mt-1"><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Téléversement...</div>}
              </div>

              {/* Display Existing Attachments */}
              {isEditMode && currentAttachments.length > 0 && (
                <div className="mb-3">
                  <label className="form-label">Fichiers joints :</label>
                  <ul className="list-group">
                    {currentAttachments.map((att, index) => (
                      <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          <i className="bi bi-file-earmark-text me-2"></i>{att.name}
                        </a>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteAttachment(att)}
                          disabled={isSubmitting || isUploading}
                          aria-label={`Supprimer ${att.name}`}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Annuler
              </button>
              
              {isEditMode && (
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  Supprimer
                </button>
              )}
              
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    {isUploading ? 'Téléversement...' : 'Traitement...'}
                  </>
                ) : isEditMode ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ActivityForm;
