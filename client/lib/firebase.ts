import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCKZpHRAm1W6lQddnArZo6Onxiwfngty6Y",
  authDomain: "secteur-1.firebaseapp.com",
  projectId: "secteur-1",
  storageBucket: "secteur-1.firebasestorage.app",
  messagingSenderId: "568304445766",
  appId: "1:568304445766:web:274405f81b2f432b80dd47"
};

// Debug: Log Firebase config
console.log('Initializing Firebase with config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey.substring(0, 10) + '...'
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase uses its own networking - don't intercept fetch

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Test Firebase connectivity with retry logic
export const testFirebaseConnection = async (retryCount = 0): Promise<{ success: boolean; error?: string }> => {
  const maxRetries = 3;
  try {
    console.log(`Testing Firebase connection (attempt ${retryCount + 1}/${maxRetries + 1})...`);

    // First check if we're online
    if (!navigator.onLine) {
      return { success: false, error: 'Device is offline' };
    }

    // Additional network check - try a simple fetch to a reliable endpoint
    try {
      const networkTest = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      console.log('Basic network connectivity: OK');
    } catch (networkError) {
      console.warn('Basic network test failed:', networkError);
      // Continue anyway - maybe it's just CORS
    }

    // Test Firestore connection using a valid collection name
    const testDoc = doc(db, 'app_config', 'connection_test');

    // Aggressive connection test with shorter timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 5000); // 5 seconds
    });

    const connectionPromise = getDoc(testDoc);
    await Promise.race([connectionPromise, timeoutPromise]);

    console.log('Firebase connection: SUCCESS');
    return { success: true };
  } catch (error: any) {
    console.error('Firebase connection test failed:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 500)
    });

    // Handle specific error cases
    if (error.code === 'permission-denied') {
      // Permission denied means Firebase is reachable but needs setup
      console.error('🚫 FIRESTORE RULES NOT DEPLOYED - This is the most common issue');
      console.error('💡 SOLUTION: Deploy simplified Firestore rules via Firebase Console');
      console.error('📋 Rules needed: Allow all authenticated users read/write access');
      return {
        success: false,
        error: 'URGENT: Firestore rules not deployed. Deploy simplified rules via Firebase Console to fix this error.'
      };
    }

    if (error.code === 'failed-precondition') {
      // Firestore database doesn't exist yet
      console.log('Firestore database not created yet');
      return {
        success: false,
        error: 'Firestore database not created - please initialize database in Firebase Console'
      };
    }

    let errorMessage = 'Connection failed';
    if (error.code) {
      errorMessage = `Firebase error: ${error.code}`;
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Connection timeout';
    } else if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
      console.error('🔥 Firebase fetch failure detected - possible causes:');
      console.error('1. Network connectivity issues');
      console.error('2. Firebase service temporarily down');
      console.error('3. Development server proxy issues');
      console.error('4. CORS configuration problems');
      errorMessage = 'CRITICAL: Network failure - Firebase unreachable. This may be temporary network issues.';
    } else if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      console.error('🚨 Complete fetch failure - network layer broken');
      errorMessage = 'NETWORK ERROR: Complete connectivity failure. Try refreshing the page.';
    }

    // Retry on fetch failures (transient network issues)
    if ((error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) && retryCount < maxRetries) {
      console.log(`🔄 Retrying connection test in 2 seconds (attempt ${retryCount + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return testFirebaseConnection(retryCount + 1);
    }

    return { success: false, error: errorMessage };
  }
};

// Connection recovery utility
export const attemptConnectionRecovery = async () => {
  console.log('🔄 Attempting connection recovery...');

  // Test actual Firestore connection
  return await testFirebaseConnection();
};

// Emergency recovery - clear cache and reload
export const emergencyFirebaseRecovery = () => {
  console.log('🚨 Emergency Firebase recovery - clearing cache and reloading...');

  // Clear localStorage
  try {
    localStorage.clear();
  } catch (e) {
    console.log('Could not clear localStorage:', e);
  }

  // Clear sessionStorage
  try {
    sessionStorage.clear();
  } catch (e) {
    console.log('Could not clear sessionStorage:', e);
  }

  // Force reload the page
  window.location.reload();
};

// Nuclear option - aggressive recovery
export const aggressiveFirebaseRecovery = () => {
  console.log('☢️ Aggressive Firebase recovery - nuclear option...');

  return new Promise<void>((resolve) => {
    // Clear all possible storage
    const clearStorage = async () => {
      try {
        // Clear all storage types
        localStorage.clear();
        sessionStorage.clear();

        // Clear IndexedDB
        if ('indexedDB' in window) {
          const dbs = await indexedDB.databases();
          await Promise.all(
            dbs.map(db => {
              return new Promise<void>((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(db.name!);
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => reject(deleteReq.error);
              });
            })
          );
        }

        // Clear service worker cache
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(reg => reg.unregister()));
        }

        // Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }

        console.log('✅ All storage cleared');
        resolve();
      } catch (error) {
        console.error('Storage clearing failed:', error);
        resolve(); // Continue anyway
      }
    };

    clearStorage().then(() => {
      // Force reload with cache busting
      const url = new URL(window.location.href);
      url.searchParams.set('cache_bust', Date.now().toString());
      url.searchParams.set('force_reload', 'true');
      window.location.href = url.toString();
    });
  });
};

export default app;
