import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Database,
  Wifi,
  WifiOff,
  Clock,
  HardDrive,
  Activity,
  RefreshCw,
  Trash2,
  Bell,
  AlertTriangle,
  CheckCircle,
  Settings
} from 'lucide-react';
import { useData, useDataPerformance, useRealtimeUpdates } from '@/contexts/DataContext';

interface CacheStatusDisplayProps {
  collection: string;
  status: any;
}

const CacheStatusDisplay: React.FC<CacheStatusDisplayProps> = ({ collection, status }) => {
  const formatCollectionName = (name: string) => {
    const names = {
      workers: 'Ouvriers',
      farms: 'Fermes',
      rooms: 'Chambres',
      notifications: 'Notifications'
    };
    return names[name as keyof typeof names] || name;
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center space-x-3">
        <Database className="h-4 w-4 text-gray-500" />
        <div>
          <p className="font-medium text-sm">{formatCollectionName(collection)}</p>
          <p className="text-xs text-gray-500">
            {status?.enabled ? `Cache: ${status.storage}` : 'Pas de cache'}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant={status?.enabled ? 'default' : 'secondary'} className="text-xs">
          {status?.enabled ? 'Actif' : 'Désactivé'}
        </Badge>
        {status?.enabled && (
          <Badge variant="outline" className="text-xs">
            {status.expiryMinutes}min
          </Badge>
        )}
      </div>
    </div>
  );
};

export const DataMonitoringDashboard: React.FC = () => {
  const { cache } = useData();
  const performance = useDataPerformance();
  const realtimeUpdates = useRealtimeUpdates();
  const [isOpen, setIsOpen] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<any>({});

  useEffect(() => {
    setCacheStatus(cache.getCacheStatus());
  }, [cache]);

  const handleClearAllCache = () => {
    cache.clearAll();
    setCacheStatus(cache.getCacheStatus());
  };

  const handleClearCollectionCache = (collection: string) => {
    cache.clearCollection(collection);
    setCacheStatus(cache.getCacheStatus());
  };

  return (
    <>
      {/* Floating monitoring button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="fixed bottom-4 right-4 h-10 w-10 rounded-full shadow-lg bg-white border-2 border-blue-200 hover:border-blue-400 z-40"
            title="Monitoring des données"
          >
            <Activity className="h-4 w-4 text-blue-600" />
          </Button>
        </DialogTrigger>

        <DialogContent className="w-[98vw] max-w-2xl mx-1 sm:mx-auto max-h-[90vh] overflow-y-auto mobile-dialog-container">
          <DialogHeader className="mobile-dialog-header">
            <DialogTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span>Monitoring des Données</span>
            </DialogTitle>
            <DialogDescription>
              Surveillance de la stratégie hybride Firebase - cache et temps réel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Real-time Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Wifi className="h-5 w-5 text-green-600" />
                <span>Connexions Temps Réel</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Notifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm">Actif (Temps réel)</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Nouvelles Données</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm">
                        {realtimeUpdates.newWorkers.length + realtimeUpdates.newFarms.length} nouvelles
                      </span>
                    </div>
                    {realtimeUpdates.hasNewData && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={realtimeUpdates.clearNewData}
                        className="mt-2"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Marquer comme vues
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Cache Status */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <HardDrive className="h-5 w-5 text-blue-600" />
                  <span>État du Cache</span>
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearAllCache}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Vider tout
                </Button>
              </div>

              <div className="space-y-3">
                {Object.entries(cacheStatus).map(([collection, status]) => {
                  if (collection === 'strategies') return null;
                  return (
                    <div key={collection} className="flex items-center justify-between">
                      <CacheStatusDisplay collection={collection} status={status} />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleClearCollectionCache(collection)}
                        className="ml-2"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fetch Strategies Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Settings className="h-5 w-5 text-gray-600" />
                <span>Stratégies de Récupération</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Alert>
                  <Wifi className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Temps Réel:</strong>
                    <br />
                    • Notifications (dernières 50)
                    <br />
                    • Nouvelles données (24h)
                  </AlertDescription>
                </Alert>

                <Alert>
                  <HardDrive className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Cache + À la demande:</strong>
                    <br />
                    • Ouvriers (30min, session)
                    <br />
                    • Fermes (60min, localStorage)
                    <br />
                    • Chambres (45min, session)
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <span>Optimisations</span>
              </h3>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Stratégie Hybride Active</span>
                </div>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>✓ Cache local pour les données volumineuses</li>
                  <li>✓ Temps réel uniquement pour les données critiques</li>
                  <li>✓ Pagination automatique pour les grandes listes</li>
                  <li>✓ Nettoyage automatique des souscriptions</li>
                  <li>✓ Filtrage intelligent des mises à jour temps réel</li>
                </ul>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Actions Rapides</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Recharger l'app
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => console.log('Cache status:', cacheStatus)}
                >
                  <Database className="h-3 w-3 mr-1" />
                  Log cache status
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Data Notification */}
      {realtimeUpdates.hasNewData && (
        <div className="fixed top-4 right-4 z-50">
          <Alert className="bg-blue-50 border-blue-200 max-w-sm">
            <Bell className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="flex items-center justify-between">
                <span>Nouvelles données disponibles</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={realtimeUpdates.clearNewData}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <CheckCircle className="h-3 w-3" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
};

export default DataMonitoringDashboard;
