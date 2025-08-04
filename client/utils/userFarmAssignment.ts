/**
 * Utility functions for managing user farm assignments
 * These functions help debug and fix users without proper farm assignments
 */

import { doc, updateDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Ferme } from '@shared/types';

export interface UserFarmAssignmentCheck {
  hasIssues: boolean;
  issues: string[];
  suggestions: string[];
  userInfo: {
    uid: string;
    email: string;
    nom: string;
    role: string;
    fermeId?: string;
  };
}

/**
 * Check if a user has proper farm assignment
 */
export const checkUserFarmAssignment = async (user: User): Promise<UserFarmAssignmentCheck> => {
  const result: UserFarmAssignmentCheck = {
    hasIssues: false,
    issues: [],
    suggestions: [],
    userInfo: {
      uid: user.uid,
      email: user.email,
      nom: user.nom,
      role: user.role,
      fermeId: user.fermeId
    }
  };

  // Check if user has farm ID
  if (!user.fermeId) {
    result.hasIssues = true;
    result.issues.push('Utilisateur sans ferme assignée');
    
    if (user.role === 'user') {
      result.suggestions.push('Les utilisateurs réguliers doivent avoir une ferme assignée');
    } else if (user.role === 'admin') {
      result.suggestions.push('Les administrateurs doivent être assignés à leur ferme');
    } else if (user.role === 'superadmin') {
      result.suggestions.push('Les super-administrateurs peuvent fonctionner sans ferme spécifique');
    }
    
    return result;
  }

  // Check if assigned farm exists
  try {
    const fermeDoc = await getDoc(doc(db, 'fermes', user.fermeId));
    if (!fermeDoc.exists()) {
      result.hasIssues = true;
      result.issues.push('La ferme assignée n\'existe pas dans la base de données');
      result.suggestions.push('Réassigner l\'utilisateur à une ferme existante ou recréer la ferme');
    } else {
      const fermeData = fermeDoc.data() as Ferme;
      
      // Check if user is in farm's admin list (for admin users)
      if (user.role === 'admin' && (!fermeData.admins || !fermeData.admins.includes(user.uid))) {
        result.hasIssues = true;
        result.issues.push('Utilisateur admin non présent dans la liste des administrateurs de la ferme');
        result.suggestions.push('Ajouter l\'utilisateur à la liste des admins de la ferme');
      }
    }
  } catch (error) {
    result.hasIssues = true;
    result.issues.push('Erreur lors de la vérification de la ferme');
    result.suggestions.push('Vérifier la connectivité Firebase et les permissions');
  }

  return result;
};

/**
 * Get list of available farms for assignment
 */
export const getAvailableFarms = async (): Promise<Ferme[]> => {
  try {
    const fermesSnapshot = await getDocs(collection(db, 'fermes'));
    return fermesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Ferme));
  } catch (error) {
    console.error('Error fetching available farms:', error);
    return [];
  }
};

/**
 * Assign a farm to a user
 */
export const assignUserToFarm = async (userId: string, fermeId: string): Promise<{success: boolean, error?: string}> => {
  try {
    // First, verify the farm exists
    const fermeDoc = await getDoc(doc(db, 'fermes', fermeId));
    if (!fermeDoc.exists()) {
      return { success: false, error: 'La ferme spécifiée n\'existe pas' };
    }

    // Update user document
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      fermeId: fermeId,
      updatedAt: new Date()
    });

    console.log(`✅ Successfully assigned user ${userId} to farm ${fermeId}`);
    return { success: true };
  } catch (error) {
    console.error('Error assigning user to farm:', error);
    return { success: false, error: String(error) };
  }
};

/**
 * Add user to farm's admin list (for admin users)
 */
export const addUserToFarmAdmins = async (userId: string, fermeId: string): Promise<{success: boolean, error?: string}> => {
  try {
    const fermeDocRef = doc(db, 'fermes', fermeId);
    const fermeDoc = await getDoc(fermeDocRef);
    
    if (!fermeDoc.exists()) {
      return { success: false, error: 'La ferme spécifiée n\'existe pas' };
    }

    const fermeData = fermeDoc.data() as Ferme;
    const currentAdmins = fermeData.admins || [];
    
    if (!currentAdmins.includes(userId)) {
      await updateDoc(fermeDocRef, {
        admins: [...currentAdmins, userId],
        updatedAt: new Date()
      });
      console.log(`✅ Successfully added user ${userId} to farm ${fermeId} admins`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding user to farm admins:', error);
    return { success: false, error: String(error) };
  }
};

/**
 * Find users without farm assignments
 */
export const findUsersWithoutFarms = async (): Promise<User[]> => {
  try {
    // Query users without fermeId
    const usersQuery = query(
      collection(db, 'users'),
      where('fermeId', '==', null)
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    const usersWithoutFarms = usersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    } as User));

    // Also check users where fermeId field doesn't exist
    const allUsersSnapshot = await getDocs(collection(db, 'users'));
    const allUsers = allUsersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    } as User));

    const usersWithoutFarmField = allUsers.filter(user => !user.fermeId);
    
    // Combine and deduplicate
    const combinedUsers = [...usersWithoutFarms, ...usersWithoutFarmField];
    const uniqueUsers = combinedUsers.filter((user, index, self) => 
      index === self.findIndex(u => u.uid === user.uid)
    );

    return uniqueUsers;
  } catch (error) {
    console.error('Error finding users without farms:', error);
    return [];
  }
};

/**
 * Auto-assign users to farms based on simple rules
 */
export const autoAssignUsersToFarms = async (): Promise<{
  assigned: number;
  errors: string[];
  assignments: Array<{userId: string, fermeId: string, userName: string, farmName: string}>;
}> => {
  const result = {
    assigned: 0,
    errors: [],
    assignments: [] as Array<{userId: string, fermeId: string, userName: string, farmName: string}>
  };

  try {
    const usersWithoutFarms = await findUsersWithoutFarms();
    const availableFarms = await getAvailableFarms();

    if (availableFarms.length === 0) {
      result.errors.push('Aucune ferme disponible pour assignation');
      return result;
    }

    // Simple rule: assign to first available farm
    const defaultFarm = availableFarms[0];

    for (const user of usersWithoutFarms) {
      try {
        const assignResult = await assignUserToFarm(user.uid, defaultFarm.id);
        if (assignResult.success) {
          result.assigned++;
          result.assignments.push({
            userId: user.uid,
            fermeId: defaultFarm.id,
            userName: user.nom || user.email,
            farmName: defaultFarm.nom
          });

          // If user is admin, also add to farm's admin list
          if (user.role === 'admin') {
            await addUserToFarmAdmins(user.uid, defaultFarm.id);
          }
        } else {
          result.errors.push(`Erreur assignation ${user.nom}: ${assignResult.error}`);
        }
      } catch (error) {
        result.errors.push(`Erreur assignation ${user.nom}: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`Erreur générale: ${error}`);
  }

  return result;
};
