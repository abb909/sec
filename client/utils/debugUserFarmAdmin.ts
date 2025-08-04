import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const debugCurrentUserFarmAdmin = async (user: any) => {
  console.log('🔍 Debugging current user farm admin assignment...');
  console.log('👤 Current user:', {
    uid: user?.uid,
    email: user?.email,
    fermeId: user?.fermeId,
    role: user?.role,
    nom: user?.nom
  });

  if (!user?.uid || !user?.fermeId) {
    console.error('❌ Missing user UID or fermeId');
    return {
      success: false,
      error: 'User UID or fermeId missing'
    };
  }

  try {
    // Step 1: Get the farm document
    console.log(`🏢 Fetching farm document: ${user.fermeId}`);
    const farmRef = doc(db, 'fermes', user.fermeId);
    const farmSnap = await getDoc(farmRef);

    if (!farmSnap.exists()) {
      console.error(`❌ Farm document ${user.fermeId} not found`);
      return {
        success: false,
        error: `Farm document ${user.fermeId} not found`
      };
    }

    const farmData = farmSnap.data();
    console.log('🏢 Farm document data:', farmData);

    // Step 2: Check admin fields
    console.log('🔍 Checking admin fields in farm document:');
    const possibleAdminFields = ['admins', 'admin', 'adminIds', 'administrators', 'adminList'];
    
    let foundAdmins = null;
    let adminFieldName = null;

    for (const field of possibleAdminFields) {
      if (farmData[field]) {
        console.log(`  ✅ Found field "${field}":`, farmData[field]);
        if (Array.isArray(farmData[field]) && farmData[field].length > 0) {
          foundAdmins = farmData[field];
          adminFieldName = field;
          break;
        }
      } else {
        console.log(`  ❌ Field "${field}": not found`);
      }
    }

    if (!foundAdmins) {
      console.error('❌ No admin array found in farm document');
      return {
        success: false,
        error: 'No admin array found in farm document',
        farmData: farmData,
        suggestion: 'Farm document needs an "admins" field with array of user UIDs'
      };
    }

    // Step 3: Check if current user UID is in admins array
    console.log(`👥 Admins in "${adminFieldName}" field:`, foundAdmins);
    const isUserInAdmins = foundAdmins.includes(user.uid);
    
    console.log(`🔍 Is current user UID "${user.uid}" in admins array?`, isUserInAdmins);

    if (!isUserInAdmins) {
      console.error('❌ Current user UID not found in farm admins array');
      return {
        success: false,
        error: 'Current user UID not found in farm admins array',
        userUID: user.uid,
        farmAdmins: foundAdmins,
        suggestion: `Add "${user.uid}" to the farm's "${adminFieldName}" array`
      };
    }

    // Step 4: Success - user is properly configured
    console.log('✅ User is properly configured as farm admin');
    return {
      success: true,
      message: 'User is properly configured as farm admin',
      farmId: user.fermeId,
      farmName: farmData.nom,
      adminFieldName: adminFieldName,
      adminCount: foundAdmins.length,
      allAdmins: foundAdmins
    };

  } catch (error) {
    console.error('❌ Error debugging user farm admin:', error);
    return {
      success: false,
      error: `Debug failed: ${error}`
    };
  }
};

export const fixUserFarmAdminAssignment = async (user: any) => {
  console.log('🔧 Attempting to fix user farm admin assignment...');
  
  // This function would update the farm document to include the user's UID
  // For now, we'll just provide instructions
  
  const debugResult = await debugCurrentUserFarmAdmin(user);
  
  if (debugResult.success) {
    return {
      success: true,
      message: 'User admin assignment is already correct'
    };
  }

  return {
    success: false,
    error: debugResult.error,
    instructions: [
      '1. Go to Firebase Console → Firestore Database',
      `2. Find the farm document with ID: ${user.fermeId}`,
      '3. Look for the "admins" field (or create it if missing)',
      `4. Add "${user.uid}" to the admins array`,
      '5. Save the document'
    ],
    consoleCommand: `
// In Firebase Console, update the farm document:
{
  "admins": ["${user.uid}"]  // Add your UID to this array
}
    `.trim()
  };
};
