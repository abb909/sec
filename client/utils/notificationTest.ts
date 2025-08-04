import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const createTestNotification = async (userId: string, userFermeId: string) => {
  try {
    console.log('🧪 Creating manual test notification...');
    
    const testNotification = {
      type: 'general',
      title: '🧪 Test Manual de Notification',
      message: `Notification de test créée manuellement le ${new Date().toLocaleString('fr-FR')}. Si vous voyez ceci, le système fonctionne!`,
      recipientId: userId,
      recipientFermeId: userFermeId,
      status: 'unread',
      priority: 'urgent',
      createdAt: serverTimestamp(),
      actionData: {
        actionRequired: 'Test manuel réussi',
        actionUrl: '/workers'
      }
    };

    console.log('📝 Test notification data:', testNotification);
    
    const docRef = await addDoc(collection(db, 'notifications'), testNotification);
    
    console.log('✅ Manual test notification created with ID:', docRef.id);
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Failed to create manual test notification:', error);
    throw error;
  }
};

export const debugNotificationSystem = () => {
  console.log('🔍 Debugging notification system...');
  console.log('📱 Navigator online:', navigator.onLine);
  console.log('🔥 Firebase config:', {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing',
  });

  // Check Firebase Auth state
  import('@/lib/firebase').then(({ auth }) => {
    const currentUser = auth.currentUser;
    console.log('👤 Firebase Auth Status:', {
      isAuthenticated: !!currentUser,
      uid: currentUser?.uid || '❌ No UID',
      email: currentUser?.email || '❌ No email',
      emailVerified: currentUser?.emailVerified || false
    });
  });
};
