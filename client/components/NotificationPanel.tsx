import React, { useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Bell,
  X,
  Check,
  Clock,
  AlertCircle,
  User,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export const NotificationBell: React.FC = () => {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[98vw] max-w-2xl mx-1 sm:mx-auto max-h-[80vh] overflow-y-auto mobile-dialog-container">
        <DialogHeader className="mobile-dialog-header">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </DialogTitle>
              <DialogDescription>
                Gérez vos notifications et actions en attente
              </DialogDescription>
            </div>
            <DeleteAllButton />
          </div>
        </DialogHeader>
        <NotificationList />
      </DialogContent>
    </Dialog>
  );
};

export const NotificationList: React.FC = () => {
  const { notifications, loading, connectionError, markAsRead, markAsAcknowledged, dismissNotification } = useNotifications();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-2">
          <Clock className="h-6 w-6 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Chargement des notifications...</p>
        </div>
      </div>
    );
  }

  // Show connection error if present
  if (connectionError) {
    return (
      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-orange-800 mb-2">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Problème de connexion</span>
          </div>
          <p className="text-sm text-orange-700 mb-3">{connectionError}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="text-orange-700 border-orange-300 hover:bg-orange-100"
          >
            <Clock className="h-4 w-4 mr-2" />
            Actualiser la page
          </Button>
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Aucune notification</p>
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
          <p><strong>Debug:</strong></p>
          <p>Notifications chargées: {notifications.length}</p>
          <p>État de chargement: {loading ? 'Chargement...' : 'Terminé'}</p>
          <p>Vérifiez la console pour plus de détails</p>
        </div>
      </div>
    );
  }

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleAcknowledge = async (notificationId: string) => {
    await markAsAcknowledged(notificationId);
  };

  const handleDismiss = async (notificationId: string) => {
    await dismissNotification(notificationId);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'low': return <Bell className="h-4 w-4 text-blue-600" />;
      default: return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    return formatDistanceToNow(date, { addSuffix: true, locale: fr });
  };

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {notifications.map((notification) => (
        <Card 
          key={notification.id} 
          className={`${getPriorityColor(notification.priority)} border-l-4 ${
            notification.status === 'unread' ? 'shadow-md' : 'opacity-75'
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {getPriorityIcon(notification.priority)}
                <CardTitle className="text-sm font-medium">
                  {notification.title}
                </CardTitle>
                {notification.status === 'unread' && (
                  <Badge variant="destructive" className="text-xs">
                    Nouveau
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(notification.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-700 mb-2">
              {notification.message}
            </p>
            
            {notification.actionData && (
              <div className="bg-white/50 rounded p-2 mb-2 text-xs space-y-1">
                {notification.actionData.workerName && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>Ouvrier: {notification.actionData.workerName}</span>
                    {notification.actionData.workerCin && (
                      <span className="text-gray-500">({notification.actionData.workerCin})</span>
                    )}
                  </div>
                )}
                {notification.actionData.requesterFermeName && (
                  <div className="text-gray-600">
                    Demandeur: {notification.actionData.requesterFermeName}
                  </div>
                )}
                {notification.actionData.actionRequired && (
                  <div className="text-blue-600 font-medium">
                    Action: {notification.actionData.actionRequired}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{formatTimestamp(notification.createdAt)}</span>
              <div className="flex items-center gap-2">
                {notification.actionData?.actionUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = notification.actionData!.actionUrl!}
                    className="h-6 text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Action
                  </Button>
                )}
                {notification.status === 'unread' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="h-6 text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Lu
                  </Button>
                )}
                {notification.status === 'read' && notification.type === 'worker_duplicate' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAcknowledge(notification.id)}
                    className="h-6 text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Traité
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const DeleteAllButton: React.FC = () => {
  const { deleteAllNotificationsByFarm } = useNotifications();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAll = async () => {
    if (!user?.fermeId) {
      console.warn('No farm ID available for current user - cannot delete farm-specific notifications');
      alert('Impossible de supprimer les notifications: aucune ferme assignée à votre compte. Veuillez contacter un administrateur.');
      return;
    }

    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir supprimer toutes les notifications liées à votre ferme ? Cette action est irréversible.'
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteAllNotificationsByFarm(user.fermeId);
    } catch (error) {
      console.error('Failed to delete notifications:', error);
      alert('Erreur lors de la suppression des notifications');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDeleteAll}
      disabled={isDeleting}
      className="text-red-600 hover:text-red-700 hover:bg-red-50"
      title="Supprimer toutes les notifications liées à votre ferme"
    >
      {isDeleting ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
};
