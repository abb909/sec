import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { where, orderBy, limit, QueryConstraint } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useHybridFirestore, useRealtimeFirestore, FETCH_STRATEGIES } from '@/hooks/useHybridFirestore';
import { Worker, Ferme, Room, Notification } from '@shared/types';

interface DataContextType {
  // Workers data - cached with on-demand loading
  workers: {
    data: Worker[];
    loading: boolean;
    error: string | null;
    loadMore: () => void;
    hasMore: boolean;
    refresh: () => void;
    add: (data: any) => Promise<string>;
    update: (id: string, data: any) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };

  // Farms data - cached
  farms: {
    data: Ferme[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
    add: (data: any) => Promise<string>;
    update: (id: string, data: any) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };

  // Rooms data - cached
  rooms: {
    data: Room[];
    loading: boolean;
    error: string | null;
    refresh: () => void;
    add: (data: any) => Promise<string>;
    update: (id: string, data: any) => Promise<void>;
    remove: (id: string) => Promise<void>;
  };

  // Notifications - real-time only
  notifications: {
    data: Notification[];
    loading: boolean;
    error: string | null;
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
  };

  // Real-time updates for new additions
  realtimeUpdates: {
    newWorkers: Worker[];
    newFarms: Ferme[];
    hasNewData: boolean;
    clearNewData: () => void;
  };

  // Cache management
  cache: {
    clearAll: () => void;
    clearCollection: (collection: string) => void;
    getCacheStatus: () => Record<string, any>;
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: React.ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { user, isSuperAdmin } = useAuth();
  const [hasNewData, setHasNewData] = useState(false);

  // Extract stable values to prevent infinite re-renders
  const userId = user?.uid;
  const userFermeId = user?.fermeId;

  // Build constraints based on user permissions with stable dependencies
  const getWorkerConstraints = useCallback((): QueryConstraint[] => {
    if (isSuperAdmin || userFermeId === 'all') {
      return [orderBy('createdAt', 'desc')];
    }
    return userFermeId
      ? [where('fermeId', '==', userFermeId), orderBy('createdAt', 'desc')]
      : [];
  }, [isSuperAdmin, userFermeId]);

  const getFarmConstraints = useCallback((): QueryConstraint[] => {
    if (isSuperAdmin || userFermeId === 'all') {
      return [orderBy('nom', 'asc')];
    }
    return userFermeId
      ? [where('id', '==', userFermeId)]
      : [];
  }, [isSuperAdmin, userFermeId]);

  const getRoomConstraints = useCallback((): QueryConstraint[] => {
    if (isSuperAdmin || userFermeId === 'all') {
      return [orderBy('numero', 'asc')];
    }
    return userFermeId
      ? [where('fermeId', '==', userFermeId), orderBy('numero', 'asc')]
      : [];
  }, [isSuperAdmin, userFermeId]);

  const getNotificationConstraints = useCallback((): QueryConstraint[] => {
    if (!userId) return [];

    return [
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50) // Only load recent notifications
    ];
  }, [userId]);

  // Main data hooks using hybrid strategy
  const workers = useHybridFirestore<Worker>('workers', {
    customConstraints: getWorkerConstraints(),
    waitForAuth: true
  });

  const farms = useHybridFirestore<Ferme>('fermes', {
    customConstraints: getFarmConstraints(),
    waitForAuth: true
  });

  const rooms = useHybridFirestore<Room>('rooms', {
    customConstraints: getRoomConstraints(),
    waitForAuth: true
  });

  // Real-time notifications (critical data)
  const notifications = useRealtimeFirestore<Notification>('notifications', getNotificationConstraints());

  // Real-time listeners for new data only (last 24 hours)
  const newWorkers = useRealtimeFirestore<Worker>('workers', [
    where('createdAt', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)),
    orderBy('createdAt', 'desc'),
    limit(10)
  ]);

  const newFarms = useRealtimeFirestore<Ferme>('fermes', [
    where('createdAt', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)),
    orderBy('createdAt', 'desc'),
    limit(5)
  ]);

  // Track unread notifications
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const count = notifications.data.filter(n => n.status === 'unread').length;
    setUnreadCount(count);
  }, [notifications.data]);

  // Track new data availability
  useEffect(() => {
    if (newWorkers.data.length > 0 || newFarms.data.length > 0) {
      setHasNewData(true);
    }
  }, [newWorkers.data.length, newFarms.data.length]);

  // Notification management functions
  const markAsRead = useCallback(async (id: string) => {
    try {
      await notifications.update?.(id, { status: 'read', readAt: new Date() });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [notifications.update]);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.data.filter(n => n.status === 'unread');
      await Promise.all(
        unreadNotifications.map(notification =>
          notifications.update?.(notification.id, { status: 'read', readAt: new Date() })
        )
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [notifications.data, notifications.update]);

  // Cache management - using refs to avoid dependency issues
  const clearAllCache = useCallback(() => {
    console.log('🧹 Clearing all cache');

    // Clear localStorage and sessionStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('hybrid_firestore_')) {
        localStorage.removeItem(key);
      }
    });

    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('hybrid_firestore_')) {
        sessionStorage.removeItem(key);
      }
    });

    // Force refresh by reloading the page
    window.location.reload();
  }, []);

  const clearCollectionCache = useCallback((collection: string) => {
    console.log(`🧹 Clearing cache for ${collection}`);

    // Clear specific collection cache from storage
    ['localStorage', 'sessionStorage'].forEach(storageType => {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
      Object.keys(storage).forEach(key => {
        if (key.startsWith(`hybrid_firestore_${collection}_`)) {
          storage.removeItem(key);
        }
      });
    });

    // Refresh the page to reload data
    window.location.reload();
  }, []);

  const getCacheStatus = useCallback(() => {
    return {
      workers: workers.cacheStatus || {},
      farms: farms.cacheStatus || {},
      rooms: rooms.cacheStatus || {},
      strategies: FETCH_STRATEGIES
    };
  }, [workers.cacheStatus, farms.cacheStatus, rooms.cacheStatus]);

  const clearNewData = useCallback(() => {
    setHasNewData(false);
  }, []);

  const contextValue: DataContextType = {
    workers: {
      data: workers.data,
      loading: workers.loading,
      error: workers.error,
      loadMore: workers.loadMore,
      hasMore: workers.hasMore,
      refresh: workers.refresh,
      add: workers.add,
      update: workers.update,
      remove: workers.remove
    },

    farms: {
      data: farms.data,
      loading: farms.loading,
      error: farms.error,
      refresh: farms.refresh,
      add: farms.add,
      update: farms.update,
      remove: farms.remove
    },

    rooms: {
      data: rooms.data,
      loading: rooms.loading,
      error: rooms.error,
      refresh: rooms.refresh,
      add: rooms.add,
      update: rooms.update,
      remove: rooms.remove
    },

    notifications: {
      data: notifications.data,
      loading: notifications.loading,
      error: notifications.error,
      unreadCount,
      markAsRead,
      markAllAsRead
    },

    realtimeUpdates: {
      newWorkers: newWorkers.data,
      newFarms: newFarms.data,
      hasNewData,
      clearNewData
    },

    cache: {
      clearAll: clearAllCache,
      clearCollection: clearCollectionCache,
      getCacheStatus
    }
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

// Utility hook for getting specific collection data
export const useWorkers = () => {
  const { workers } = useData();
  return workers;
};

export const useFarms = () => {
  const { farms } = useData();
  return farms;
};

export const useRooms = () => {
  const { rooms } = useData();
  return rooms;
};

export const useNotifications = () => {
  const { notifications } = useData();
  return notifications;
};

export const useRealtimeUpdates = () => {
  const { realtimeUpdates } = useData();
  return realtimeUpdates;
};

// Performance monitoring hook
export const useDataPerformance = () => {
  const { cache } = useData();
  
  const [performanceStats, setPerformanceStats] = useState({
    cacheHitRate: 0,
    totalQueries: 0,
    cachedQueries: 0,
    realtimeConnections: 0
  });

  useEffect(() => {
    const updateStats = () => {
      const status = cache.getCacheStatus();
      // Calculate performance metrics
      setPerformanceStats(prev => ({
        ...prev,
        cacheStatus: status
      }));
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [cache]);

  return {
    ...performanceStats,
    clearCache: cache.clearAll,
    clearCollectionCache: cache.clearCollection
  };
};
