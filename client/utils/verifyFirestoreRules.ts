import { collection, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const verifyFirestoreRulesDeployment = async (userId: string) => {
  console.log('🔍 Verifying Firestore rules deployment...');
  
  const testDocId = `rules_test_${Date.now()}`;
  const testDocRef = doc(db, 'rules_verification', testDocId);
  
  try {
    // Step 1: Test write permission
    console.log('📝 Testing write permission...');
    await setDoc(testDocRef, {
      message: 'Rules verification test',
      timestamp: new Date().toISOString(),
      userId: userId
    });
    console.log('✅ Write permission: WORKING');

    // Step 2: Test read permission
    console.log('�� Testing read permission...');
    const docSnap = await getDoc(testDocRef);
    if (docSnap.exists()) {
      console.log('✅ Read permission: WORKING');
    } else {
      console.log('❌ Read permission: FAILED - Document not found');
      return { success: false, error: 'Read permission failed' };
    }

    // Step 3: Test delete permission (cleanup)
    console.log('🗑️ Testing delete permission...');
    await deleteDoc(testDocRef);
    console.log('✅ Delete permission: WORKING');

    console.log('🎉 All Firestore rules verification tests PASSED!');
    return { 
      success: true, 
      message: 'Firestore rules are properly deployed and working' 
    };

  } catch (error: any) {
    console.error('❌ Firestore rules verification FAILED:', error);
    
    if (error.code === 'permission-denied') {
      return {
        success: false,
        error: 'PERMISSION DENIED - Rules not deployed yet',
        solution: 'Deploy simplified Firestore rules via Firebase Console'
      };
    } else if (error.code === 'unavailable') {
      return {
        success: false,
        error: 'FIRESTORE UNAVAILABLE - Network or service issue',
        solution: 'Check internet connection and Firebase service status'
      };
    } else {
      return {
        success: false,
        error: `Firebase error: ${error.code || error.message}`,
        solution: 'Check Firebase configuration and deployment'
      };
    }
  }
};

export const testNotificationPermissions = async (userId: string, fermeId: string) => {
  console.log('🔔 Testing notification-specific permissions...');
  
  try {
    const testNotificationRef = doc(db, 'notifications', `test_${Date.now()}`);
    
    // Test notification creation
    await setDoc(testNotificationRef, {
      type: 'test',
      title: 'Rules verification test notification',
      message: 'This is a test notification to verify Firestore rules',
      recipientId: userId,
      recipientFermeId: fermeId,
      status: 'unread',
      priority: 'low',
      createdAt: new Date()
    });
    
    console.log('✅ Notification creation: WORKING');
    
    // Cleanup
    await deleteDoc(testNotificationRef);
    console.log('✅ Notification deletion: WORKING');
    
    return { success: true, message: 'Notification permissions verified' };
    
  } catch (error: any) {
    console.error('❌ Notification permissions test FAILED:', error);
    return {
      success: false,
      error: `Notification test failed: ${error.code || error.message}`
    };
  }
};
