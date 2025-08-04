import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const checkNotificationsForUser = async (userId: string) => {
  console.log(`🔍 Checking notifications for user: ${userId}`);
  
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId)
    );

    const snapshot = await getDocs(notificationsQuery);
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📬 Found ${notifications.length} notifications for user ${userId}:`, notifications);
    
    return {
      count: notifications.length,
      notifications: notifications.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        status: n.status,
        priority: n.priority,
        createdAt: n.createdAt?.toDate?.() || n.createdAt,
        type: n.type
      }))
    };
  } catch (error) {
    console.error(`❌ Failed to check notifications for user ${userId}:`, error);
    throw error;
  }
};

export const checkAllNotifications = async () => {
  console.log('🔍 Checking all notifications in database...');
  
  try {
    const notificationsQuery = query(collection(db, 'notifications'));
    const snapshot = await getDocs(notificationsQuery);
    
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📬 Total notifications in database: ${notifications.length}`);
    
    // Group by recipient
    const byRecipient = notifications.reduce((acc, notification) => {
      const recipientId = notification.recipientId;
      if (!acc[recipientId]) {
        acc[recipientId] = [];
      }
      acc[recipientId].push(notification);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('📊 Notifications by recipient:', byRecipient);
    
    return {
      total: notifications.length,
      byRecipient,
      allNotifications: notifications
    };
  } catch (error) {
    console.error('❌ Failed to check all notifications:', error);
    throw error;
  }
};
