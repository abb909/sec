import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Wifi } from 'lucide-react';
import { emergencyFirebaseRecovery, aggressiveFirebaseRecovery } from '@/lib/firebase';

interface CriticalErrorRecoveryProps {
  error?: string;
  onRetry?: () => void;
}

export const CriticalErrorRecovery: React.FC<CriticalErrorRecoveryProps> = ({ 
  error, 
  onRetry 
}) => {
  const handleEmergencyRecovery = () => {
    if (confirm(
      '🚨 RÉCUPÉRATION D\'URGENCE\n\n' +
      'Cette action va:\n' +
      '• Recharger complètement l\'application\n' +
      '• Vider tout le cache local\n' +
      '• Forcer une nouvelle connexion Firebase\n\n' +
      'Continuer ?'
    )) {
      emergencyFirebaseRecovery();
    }
  };

  const handleImmediateForceReload = async () => {
    // Nuclear option - use the aggressive recovery method
    await aggressiveFirebaseRecovery();
  };

  const handleSimpleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <p><strong>🚨 ERREUR CRITIQUE DÉTECTÉE</strong></p>
              <p className="text-sm">
                {error || 'Connexion Firebase complètement interrompue. Récupération nécessaire.'}
              </p>
              
              <div className="space-y-2">
                <p className="text-xs font-semibold">SOLUTIONS IMMÉDIATES:</p>
                
                <Button
                  onClick={handleImmediateForceReload}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                >
                  <AlertTriangle className="h-3 w-3 mr-2" />
                  🚨 FORCER REDÉMARRAGE
                </Button>

                <Button
                  onClick={handleSimpleRefresh}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Recharger la page
                </Button>

                <Button
                  onClick={handleEmergencyRecovery}
                  variant="destructive"
                  className="w-full"
                  size="sm"
                >
                  <AlertTriangle className="h-3 w-3 mr-2" />
                  Récupération d'urgence
                </Button>
                
                {onRetry && (
                  <Button
                    onClick={onRetry}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    <Wifi className="h-3 w-3 mr-2" />
                    Réessayer la connexion
                  </Button>
                )}
              </div>
              
              <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                <p><strong>Si le problème persiste:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Vérifiez votre connexion internet</li>
                  <li>Désactivez VPN/Proxy temporairement</li>
                  <li>Essayez un autre navigateur</li>
                  <li>Contactez le support technique</li>
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};
