import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { aggressiveFirebaseRecovery } from '@/lib/firebase';

export const FloatingEmergencyButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    // Monitor for Firebase fetch errors
    const originalFetch = window.fetch;
    let errorCounter = 0;
    let lastErrorTime = 0;
    let successfulRequestCount = 0;

    window.fetch = (...args) => {
      return originalFetch(...args)
        .then(response => {
          // Track successful Firebase requests
          const url = args[0]?.toString() || '';
          const isFirebaseRequest = url.includes('firestore.googleapis.com') ||
                                   url.includes('firebase') ||
                                   args[0]?.toString().includes('googleapis.com');

          if (isFirebaseRequest && response.ok) {
            successfulRequestCount++;
            // Hide emergency button after 2 successful Firebase requests
            if (successfulRequestCount >= 2 && isVisible) {
              setIsVisible(false);
              errorCounter = 0;
              successfulRequestCount = 0;
              setErrorCount(0);
            }
          }

          return response;
        })
        .catch(error => {
          // Only track Firebase-related fetch failures to avoid false positives
          const url = args[0]?.toString() || '';
          const isFirebaseRequest = url.includes('firestore.googleapis.com') ||
                                   url.includes('firebase') ||
                                   args[0]?.toString().includes('googleapis.com');

          if (error.message?.includes('Failed to fetch') && isFirebaseRequest) {
            const now = Date.now();
            // Debounce: only count errors that are at least 1 second apart
            if (now - lastErrorTime > 1000) {
              errorCounter++;
              lastErrorTime = now;
              setErrorCount(errorCounter);

              // Show emergency button after 3 consecutive Firebase failures
              if (errorCounter >= 3) {
                setIsVisible(true);
              }
            }
          }

          // Re-throw the error to maintain normal error handling
          throw error;
        });
    };

    // Monitor console errors for Firebase issues
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ').toLowerCase();
      // Only show button for serious Firebase connectivity issues
      if ((message.includes('failed to fetch') && message.includes('firebase')) ||
          (message.includes('permission-denied') && message.includes('firestore')) ||
          (message.includes('network') && message.includes('firebase'))) {
        errorCounter++;
        setErrorCount(errorCounter);

        // Only show after multiple consecutive errors
        if (errorCounter >= 2) {
          setIsVisible(true);
        }
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      window.fetch = originalFetch;
      console.error = originalConsoleError;
    };
  }, []);

  const handleEmergencyFix = async () => {
    if (confirm(
      '🚨 RÉCUPÉRATION D\'URGENCE\n\n' +
      `${errorCount} erreurs de connexion détectées.\n\n` +
      'Cette action va effacer tout le cache et redémarrer l\'application.\n\n' +
      'Continuer ?'
    )) {
      await aggressiveFirebaseRecovery();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <Button
        onClick={handleEmergencyFix}
        className="bg-red-600 hover:bg-red-700 text-white shadow-lg animate-pulse"
        size="sm"
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        🚨 ERREUR CRITIQUE ({errorCount})
      </Button>
    </div>
  );
};
