import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const testNotificationCreation = async (recipientId: string, fermeId: string) => {
  console.log('🧪 Testing direct notification creation...');
  
  try {
    const notificationData = {
      type: 'worker_duplicate',
      title: '🧪 Test Direct Notification',
      message: `Test notification created directly at ${new Date().toLocaleString('fr-FR')}`,
      recipientId: recipientId,
      recipientFermeId: fermeId,
      status: 'unread',
      priority: 'urgent',
      createdAt: serverTimestamp(),
      actionData: {
        actionRequired: 'Test notification - ignore',
        actionUrl: '/workers'
      }
    };

    console.log('📤 Creating notification with data:', notificationData);

    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    console.log('✅ Notification created with ID:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Failed to create test notification:', error);
    throw error;
  }
};

export const debugNotificationPermissions = async () => {
  console.log('🔍 Debugging notification permissions...');
  
  try {
    // Test basic Firestore write access
    const testDoc = await addDoc(collection(db, 'test_collection'), {
      message: 'Permission test',
      timestamp: serverTimestamp()
    });
    
    console.log('✅ Basic Firestore write works, test doc:', testDoc.id);
    return true;
  } catch (error) {
    console.error('❌ Basic Firestore write failed:', error);
    return false;
  }
};
