import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  limitToLast,
  onSnapshot,
  DocumentData,
  QueryConstraint,
  Timestamp,
  writeBatch,
  startAfter,
  DocumentSnapshot
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Local storage keys for caching
const CACHE_PREFIX = 'hybrid_firestore_';
const CACHE_EXPIRY_KEY = '_expiry';
const CACHE_TIMESTAMP_KEY = '_timestamp';

// Cache configuration
interface CacheConfig {
  enabled: boolean;
  expiryMinutes: number;
  storage: 'memory' | 'localStorage' | 'sessionStorage';
}

// Data fetching strategy configuration
interface FetchStrategy {
  useRealtime: boolean;
  realTimeFilter?: QueryConstraint[];
  onDemandFilter?: QueryConstraint[];
  pagination?: {
    enabled: boolean;
    pageSize: number;
  };
  cache: CacheConfig;
}

// Default strategies for different data types
const FETCH_STRATEGIES: Record<string, FetchStrategy> = {
  // Real-time critical data - always fresh, minimal queries
  notifications: {
    useRealtime: true,
    realTimeFilter: [orderBy('createdAt', 'desc'), limit(50)], // Only recent notifications
    cache: { enabled: false, expiryMinutes: 0, storage: 'memory' }
  },
  
  // Large datasets - cached with on-demand loading
  workers: {
    useRealtime: false,
    onDemandFilter: [orderBy('createdAt', 'desc')],
    pagination: { enabled: true, pageSize: 50 },
    cache: { enabled: true, expiryMinutes: 30, storage: 'sessionStorage' }
  },
  
  farms: {
    useRealtime: false,
    onDemandFilter: [orderBy('nom', 'asc')],
    cache: { enabled: true, expiryMinutes: 60, storage: 'localStorage' }
  },
  
  rooms: {
    useRealtime: false,
    onDemandFilter: [orderBy('numero', 'asc')],
    cache: { enabled: true, expiryMinutes: 45, storage: 'sessionStorage' }
  },
  
  stock: {
    useRealtime: false,
    onDemandFilter: [orderBy('updatedAt', 'desc')],
    pagination: { enabled: true, pageSize: 100 },
    cache: { enabled: true, expiryMinutes: 15, storage: 'sessionStorage' }
  },
  
  // Configuration data - long cache, rarely changes
  settings: {
    useRealtime: false,
    cache: { enabled: true, expiryMinutes: 120, storage: 'localStorage' }
  },
  
  // Real-time updates for new additions (listen only to recent changes)
  'workers_realtime': {
    useRealtime: true,
    realTimeFilter: [
      where('createdAt', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)), // Last 24 hours
      orderBy('createdAt', 'desc'),
      limit(10)
    ],
    cache: { enabled: false, expiryMinutes: 0, storage: 'memory' }
  },
  
  'farms_realtime': {
    useRealtime: true,
    realTimeFilter: [
      where('createdAt', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)), // Last 24 hours
      orderBy('createdAt', 'desc'),
      limit(5)
    ],
    cache: { enabled: false, expiryMinutes: 0, storage: 'memory' }
  }
};

interface UseHybridFirestoreOptions {
  strategy?: FetchStrategy;
  customConstraints?: QueryConstraint[];
  waitForAuth?: boolean;
}

interface PaginationState {
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
  currentPage: number;
  totalLoaded: number;
}

export const useHybridFirestore = <T = DocumentData>(
  collectionName: string,
  options: UseHybridFirestoreOptions = {}
) => {
  // Get strategy (custom or predefined)
  const strategy = options.strategy || FETCH_STRATEGIES[collectionName] || {
    useRealtime: false,
    cache: { enabled: true, expiryMinutes: 30, storage: 'sessionStorage' }
  };

  // State management
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(!options.waitForAuth);
  const [pagination, setPagination] = useState<PaginationState>({
    hasMore: true,
    lastDoc: null,
    currentPage: 0,
    totalLoaded: 0
  });

  // Refs for cleanup and state management
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const cacheRef = useRef<Map<string, any>>(new Map());
  const isMountedRef = useRef(true);

  // Cache utilities
  const getCacheKey = (key: string) => `${CACHE_PREFIX}${collectionName}_${key}`;
  
  const getCachedData = useCallback((): T[] | null => {
    if (!strategy.cache.enabled) return null;

    try {
      const cacheKey = getCacheKey('data');
      const timestampKey = getCacheKey(CACHE_TIMESTAMP_KEY);
      
      let cachedData: string | null = null;
      let cachedTimestamp: string | null = null;

      if (strategy.cache.storage === 'memory') {
        cachedData = cacheRef.current.get('data');
        cachedTimestamp = cacheRef.current.get('timestamp');
      } else if (strategy.cache.storage === 'localStorage') {
        cachedData = localStorage.getItem(cacheKey);
        cachedTimestamp = localStorage.getItem(timestampKey);
      } else {
        cachedData = sessionStorage.getItem(cacheKey);
        cachedTimestamp = sessionStorage.getItem(timestampKey);
      }

      if (!cachedData || !cachedTimestamp) return null;

      const timestamp = parseInt(cachedTimestamp);
      const expiryTime = timestamp + (strategy.cache.expiryMinutes * 60 * 1000);
      
      if (Date.now() > expiryTime) {
        // Clear expired cache
        clearCache();
        return null;
      }

      console.log(`📦 Using cached data for ${collectionName} (${Math.floor((expiryTime - Date.now()) / 60000)} min remaining)`);
      return JSON.parse(cachedData);
    } catch (err) {
      console.warn(`Failed to get cached data for ${collectionName}:`, err);
      return null;
    }
  }, [collectionName, strategy.cache]);

  const setCachedData = useCallback((newData: T[]) => {
    if (!strategy.cache.enabled) return;

    try {
      const cacheKey = getCacheKey('data');
      const timestampKey = getCacheKey(CACHE_TIMESTAMP_KEY);
      const dataStr = JSON.stringify(newData);
      const timestamp = Date.now().toString();

      if (strategy.cache.storage === 'memory') {
        cacheRef.current.set('data', dataStr);
        cacheRef.current.set('timestamp', timestamp);
      } else if (strategy.cache.storage === 'localStorage') {
        localStorage.setItem(cacheKey, dataStr);
        localStorage.setItem(timestampKey, timestamp);
      } else {
        sessionStorage.setItem(cacheKey, dataStr);
        sessionStorage.setItem(timestampKey, timestamp);
      }

      console.log(`💾 Cached ${newData.length} items for ${collectionName}`);
    } catch (err) {
      console.warn(`Failed to cache data for ${collectionName}:`, err);
    }
  }, [collectionName, strategy.cache]);

  const clearCache = useCallback(() => {
    if (!strategy.cache.enabled) return;

    try {
      const cacheKey = getCacheKey('data');
      const timestampKey = getCacheKey(CACHE_TIMESTAMP_KEY);

      if (strategy.cache.storage === 'memory') {
        cacheRef.current.delete('data');
        cacheRef.current.delete('timestamp');
      } else if (strategy.cache.storage === 'localStorage') {
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(timestampKey);
      } else {
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(timestampKey);
      }

      console.log(`🗑️ Cleared cache for ${collectionName}`);
    } catch (err) {
      console.warn(`Failed to clear cache for ${collectionName}:`, err);
    }
  }, [collectionName, strategy.cache]);

  // On-demand data fetching with pagination
  const fetchOnDemand = useCallback(async (
    isLoadMore: boolean = false,
    customConstraints: QueryConstraint[] = []
  ) => {
    if (!isLoadMore) setLoading(true);
    setError(null);

    try {
      console.log(`🔄 Fetching ${isLoadMore ? 'more' : 'initial'} data from ${collectionName}`);

      const collectionRef = collection(db, collectionName);
      const constraints: QueryConstraint[] = [
        ...(strategy.onDemandFilter || []),
        ...customConstraints,
        ...(options.customConstraints || [])
      ];

      // Add pagination if enabled
      if (strategy.pagination?.enabled) {
        if (isLoadMore && pagination.lastDoc) {
          constraints.push(startAfter(pagination.lastDoc));
        }
        constraints.push(limit(strategy.pagination.pageSize));
      }

      const q = query(collectionRef, ...constraints);
      const snapshot = await getDocs(q);

      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      if (!isMountedRef.current) return;

      if (isLoadMore) {
        setData(prev => [...prev, ...documents]);
        setPagination(prev => ({
          ...prev,
          hasMore: documents.length === (strategy.pagination?.pageSize || 50),
          lastDoc: snapshot.docs[snapshot.docs.length - 1] || prev.lastDoc,
          currentPage: prev.currentPage + 1,
          totalLoaded: prev.totalLoaded + documents.length
        }));
      } else {
        setData(documents);
        setPagination({
          hasMore: documents.length === (strategy.pagination?.pageSize || 50),
          lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
          currentPage: 1,
          totalLoaded: documents.length
        });
        
        // Cache the data
        setCachedData(documents);
      }

      console.log(`✅ Fetched ${documents.length} documents from ${collectionName}`);
    } catch (err: any) {
      console.error(`❌ Error fetching data from ${collectionName}:`, err);
      
      let errorMessage = 'Erreur de chargement des données';
      if (err.code === 'permission-denied') {
        errorMessage = 'Permissions insuffisantes pour accéder aux données';
      } else if (err.message?.includes('network')) {
        errorMessage = 'Erreur de connexion réseau';
      }
      
      if (!isLoadMore) setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [collectionName, strategy, pagination.lastDoc, options.customConstraints, setCachedData]);

  // Real-time subscription setup
  const setupRealtimeListener = useCallback(() => {
    if (!strategy.useRealtime) return;

    console.log(`📡 Setting up real-time listener for ${collectionName}`);

    try {
      const collectionRef = collection(db, collectionName);
      const constraints = [
        ...(strategy.realTimeFilter || []),
        ...(options.customConstraints || [])
      ];
      
      const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!isMountedRef.current) return;

          const documents = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as T[];

          console.log(`📡 Real-time update: ${documents.length} documents in ${collectionName}`);
          setData(documents);
          setError(null);
          setLoading(false);

          // For real-time data, don't cache (it's always fresh)
          if (!strategy.cache.enabled) {
            console.log(`⚡ Real-time data - skipping cache for ${collectionName}`);
          }
        },
        (err: any) => {
          console.error(`❌ Real-time listener error for ${collectionName}:`, err);
          
          let errorMessage = 'Erreur de synchronisation temps réel';
          if (err.code === 'permission-denied') {
            errorMessage = 'Permissions insuffisantes pour les mises à jour temps réel';
          } else if (err.code === 'unavailable') {
            errorMessage = 'Service temporairement indisponible';
          }
          
          setError(errorMessage);
          setLoading(false);

          // Fallback to cached data if available
          const cachedData = getCachedData();
          if (cachedData) {
            console.log(`📦 Falling back to cached data for ${collectionName}`);
            setData(cachedData);
          }
        }
      );

      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      console.error(`Failed to setup real-time listener for ${collectionName}:`, err);
      // Fallback to on-demand fetching
      fetchOnDemand();
    }
  }, [collectionName, strategy.useRealtime, strategy.realTimeFilter, options.customConstraints]);

  // Load more function for pagination
  const loadMore = useCallback(async () => {
    if (!pagination.hasMore || loading) return;

    setLoading(true);
    setError(null);

    try {
      const collectionRef = collection(db, collectionName);
      const constraints: QueryConstraint[] = [
        ...(strategy.onDemandFilter || []),
        ...(options.customConstraints || [])
      ];

      // Add pagination
      if (strategy.pagination?.enabled && pagination.lastDoc) {
        constraints.push(startAfter(pagination.lastDoc));
        constraints.push(limit(strategy.pagination.pageSize));
      }

      const q = query(collectionRef, ...constraints);
      const snapshot = await getDocs(q);

      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      if (!isMountedRef.current) return;

      setData(prev => [...prev, ...documents]);
      setPagination(prev => ({
        ...prev,
        hasMore: documents.length === (strategy.pagination?.pageSize || 50),
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || prev.lastDoc,
        currentPage: prev.currentPage + 1,
        totalLoaded: prev.totalLoaded + documents.length
      }));
    } catch (err) {
      console.error(`❌ Error loading more data from ${collectionName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [pagination.hasMore, pagination.lastDoc, loading, collectionName, strategy, options.customConstraints]);

  // Refresh function
  const refresh = useCallback(() => {
    clearCache();
    setPagination({
      hasMore: true,
      lastDoc: null,
      currentPage: 0,
      totalLoaded: 0
    });

    if (!strategy.useRealtime) {
      // Force page reload for simplicity
      window.location.reload();
    }
  }, [clearCache, strategy.useRealtime]);

  // CRUD operations with cache invalidation
  const addDocument = useCallback(async (docData: any) => {
    try {
      console.log(`➕ Adding document to ${collectionName}`);
      const collectionRef = collection(db, collectionName);
      const docRef = await addDoc(collectionRef, {
        ...docData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`✅ Added document ${docRef.id} to ${collectionName}`);
      
      // Clear cache to ensure fresh data
      clearCache();
      
      // If not using real-time, refresh data
      if (!strategy.useRealtime) {
        refresh();
      }
      
      return docRef.id;
    } catch (err: any) {
      console.error(`❌ Error adding document to ${collectionName}:`, err);
      throw err;
    }
  }, [collectionName, clearCache, strategy.useRealtime, refresh]);

  const updateDocument = useCallback(async (id: string, docData: any) => {
    try {
      console.log(`✏️ Updating document ${id} in ${collectionName}`);
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...docData,
        updatedAt: new Date()
      });
      
      console.log(`✅ Updated document ${id} in ${collectionName}`);
      
      // Clear cache to ensure fresh data
      clearCache();
      
      // If not using real-time, refresh data
      if (!strategy.useRealtime) {
        refresh();
      }
    } catch (err: any) {
      console.error(`❌ Error updating document ${id} in ${collectionName}:`, err);
      throw err;
    }
  }, [collectionName, clearCache, strategy.useRealtime, refresh]);

  const deleteDocument = useCallback(async (id: string) => {
    try {
      console.log(`🗑️ Deleting document ${id} from ${collectionName}`);
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      
      console.log(`✅ Deleted document ${id} from ${collectionName}`);
      
      // Clear cache to ensure fresh data
      clearCache();
      
      // If not using real-time, refresh data
      if (!strategy.useRealtime) {
        refresh();
      }
    } catch (err: any) {
      console.error(`❌ Error deleting document ${id} from ${collectionName}:`, err);
      throw err;
    }
  }, [collectionName, clearCache, strategy.useRealtime, refresh]);

  // Auth state effect
  useEffect(() => {
    if (!options.waitForAuth) {
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log(`🔐 Auth state changed for ${collectionName}:`, user ? 'authenticated' : 'not authenticated');
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [options.waitForAuth, collectionName]);

  // Main data loading effect
  useEffect(() => {
    if (!authReady) return;

    let mounted = true;

    const initializeData = async () => {
      // Check cache first for non-real-time data
      if (!strategy.useRealtime) {
        const cachedData = getCachedData();
        if (cachedData && mounted) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }

      // Setup data fetching based on strategy
      if (strategy.useRealtime) {
        setupRealtimeListener();
      } else {
        await fetchOnDemand();
      }
    };

    initializeData();

    // Cleanup function
    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        console.log(`🧹 Cleaning up listener for ${collectionName}`);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [authReady, collectionName, strategy.useRealtime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    // Data and state
    data,
    loading,
    error,
    
    // Pagination
    pagination,
    loadMore,
    hasMore: pagination.hasMore,
    
    // Actions
    refresh,
    clearCache,
    
    // CRUD operations
    add: addDocument,
    update: updateDocument,
    remove: deleteDocument,
    
    // Utilities
    strategy: strategy,
    cacheStatus: {
      enabled: strategy.cache.enabled,
      storage: strategy.cache.storage,
      expiryMinutes: strategy.cache.expiryMinutes
    }
  };
};

// Export the fetch strategies for reference
export { FETCH_STRATEGIES };

// Utility function to create custom strategies
export const createFetchStrategy = (config: Partial<FetchStrategy>): FetchStrategy => {
  return {
    useRealtime: false,
    cache: { enabled: true, expiryMinutes: 30, storage: 'sessionStorage' },
    ...config
  };
};

// Hook for real-time-only data (like notifications)
export const useRealtimeFirestore = <T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = []
) => {
  return useHybridFirestore<T>(collectionName, {
    strategy: {
      useRealtime: true,
      realTimeFilter: constraints,
      cache: { enabled: false, expiryMinutes: 0, storage: 'memory' }
    }
  });
};

// Hook for cached-only data (like settings)
export const useCachedFirestore = <T = DocumentData>(
  collectionName: string,
  cacheMinutes: number = 60,
  constraints: QueryConstraint[] = []
) => {
  return useHybridFirestore<T>(collectionName, {
    strategy: {
      useRealtime: false,
      onDemandFilter: constraints,
      cache: { enabled: true, expiryMinutes: cacheMinutes, storage: 'localStorage' }
    }
  });
};
