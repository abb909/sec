import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const autoFixUserFarmAdmin = async (user: any) => {
  console.log('🔧 Auto-fixing user farm admin assignment...');
  
  if (!user?.uid || !user?.fermeId) {
    throw new Error('User UID or fermeId missing');
  }

  try {
    // Step 1: Get current farm document
    const farmRef = doc(db, 'fermes', user.fermeId);
    const farmSnap = await getDoc(farmRef);

    if (!farmSnap.exists()) {
      throw new Error(`Farm document ${user.fermeId} not found`);
    }

    const farmData = farmSnap.data();
    console.log('📋 Current farm data:', farmData);

    // Step 2: Check current admins array
    const currentAdmins = farmData.admins || [];
    console.log('👥 Current admins:', currentAdmins);

    // Step 3: Check if user is already in admins
    if (currentAdmins.includes(user.uid)) {
      console.log('✅ User already in admins array');
      return {
        success: true,
        message: 'User already configured as admin',
        alreadyAdmin: true
      };
    }

    // Step 4: Add user to admins array
    console.log(`➕ Adding user ${user.uid} to farm admins...`);
    
    await updateDoc(farmRef, {
      admins: arrayUnion(user.uid)
    });

    console.log('✅ Successfully added user to farm admins');
    
    // Step 5: Verify the fix
    const updatedFarmSnap = await getDoc(farmRef);
    const updatedFarmData = updatedFarmSnap.data();
    const updatedAdmins = updatedFarmData?.admins || [];
    
    console.log('✅ Updated admins:', updatedAdmins);
    
    return {
      success: true,
      message: 'Successfully added user to farm admins',
      farmId: user.fermeId,
      farmName: farmData.nom,
      previousAdmins: currentAdmins,
      updatedAdmins: updatedAdmins,
      userAdded: true
    };

  } catch (error) {
    console.error('❌ Failed to auto-fix farm admin:', error);
    throw error;
  }
};

export const verifyFarmAdminFix = async (user: any) => {
  console.log('🔍 Verifying farm admin fix...');
  
  try {
    const farmRef = doc(db, 'fermes', user.fermeId);
    const farmSnap = await getDoc(farmRef);
    const farmData = farmSnap.data();
    const admins = farmData?.admins || [];
    
    const isUserInAdmins = admins.includes(user.uid);
    
    console.log('🔍 Verification result:', {
      farmId: user.fermeId,
      farmName: farmData?.nom,
      currentAdmins: admins,
      userInAdmins: isUserInAdmins
    });
    
    return {
      success: isUserInAdmins,
      farmName: farmData?.nom,
      adminCount: admins.length,
      userInAdmins: isUserInAdmins
    };
    
  } catch (error) {
    console.error('❌ Failed to verify fix:', error);
    throw error;
  }
};
