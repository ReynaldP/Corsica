// src/services/authService.ts
import { 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut, 
    onAuthStateChanged,
    User as FirebaseUser
  } from 'firebase/auth';
  import { auth } from './firebase';
  import { User } from '../types';
  
  // Fonction pour se connecter
  export const login = async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      return {
        uid: user.uid,
        email: user.email
      };
    } catch (error: any) {
      let errorMessage = 'Erreur d\'authentification';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Adresse email invalide';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Email ou mot de passe incorrect';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Trop de tentatives de connexion, veuillez réessayer plus tard';
          break;
        default:
          errorMessage = `Erreur d'authentification: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  };
  
  // Fonction pour se déconnecter
  export const logout = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      throw new Error(`Erreur lors de la déconnexion: ${error.message}`);
    }
  };
  
  // Hook pour observer l'état de l'authentification
  export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
    return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email
        };
        callback(user);
      } else {
        callback(null);
      }
    });
  };
  
  // Fonction pour obtenir l'utilisateur actuel
  export const getCurrentUser = (): User | null => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email
      };
    }
    return null;
  };