import React, { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore } from '@/hooks/useFirestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Bell,
  X,
  CheckCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Edit,
  User as UserIcon,
  Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { Worker, Ferme, User } from '@shared/types';

export const NotificationPopup: React.FC = () => {
  const { notifications, markAsRead, sendNotification } = useNotifications();
  const { user } = useAuth();
  const { data: workers, updateDocument } = useFirestore<Worker>('workers');
  const { data: fermes } = useFirestore<Ferme>('fermes');
  const { data: users } = useFirestore<User>('users');

  const [isOpen, setIsOpen] = useState(false);
  const [shownNotifications, setShownNotifications] = useState<Set<string>>(new Set());

  // Worker edit modal state
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    dateSortie: '',
    motif: 'none'
  });

  // Show popup when there are new high priority unread notifications
  useEffect(() => {
    const highPriorityUnread = notifications.filter(n => 
      n.status === 'unread' && 
      (n.priority === 'high' || n.priority === 'urgent') &&
      !shownNotifications.has(n.id)
    );

    if (highPriorityUnread.length > 0 && !isOpen) {
      setIsOpen(true);
      // Mark these notifications as shown so they don't popup again
      setShownNotifications(prev => {
        const newSet = new Set(prev);
        highPriorityUnread.forEach(n => newSet.add(n.id));
        return newSet;
      });
    }
  }, [notifications, isOpen, shownNotifications]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleAction = (actionUrl?: string) => {
    if (actionUrl) {
      window.location.href = actionUrl;
    }
    setIsOpen(false);
  };

  const handleRejectWorkerRequest = async (notification: any) => {
    try {
      // Mark current notification as read
      await markAsRead(notification.id);

      // Find the worker and farm information
      const workerId = notification.actionData?.workerId;
      const worker = workers.find(w => w.id === workerId);
      const currentFarm = fermes.find(f => f.id === user?.fermeId);

      if (worker && currentFarm) {
        // Send rejection notification back to the requester
        // Try to determine the requester farm ID from notification context
        const requesterFarmId = notification.senderFermeId || notification.recipientFermeId;
        const requesterFarm = fermes.find(f => f.id === requesterFarmId);

        if (requesterFarm && requesterFarm.admins) {
          for (const adminId of requesterFarm.admins) {
            await sendNotification({
              type: 'worker_request_rejected',
              title: '❌ Demande rejetée',
              message: `Votre demande concernant l'ouvrier ${worker.nom} (CIN: ${worker.cin}) a été rejetée par ${currentFarm.nom}. L'ouvrier n'a pas encore quitté leur ferme et n'est pas disponible pour le moment.`,
              recipientId: adminId,
              recipientFermeId: requesterFarmId,
              status: 'unread',
              priority: 'medium',
              actionData: {
                workerId: worker.id,
                workerName: worker.nom,
                workerCin: worker.cin,
                actionRequired: 'Demande rejetée - ouvrier non disponible',
                rejectedBy: currentFarm.nom
              }
            });
          }

          console.log(`✅ Rejection notification sent to ${requesterFarm.nom}`);
          alert(`✅ Demande rejetée et notification envoyée à ${requesterFarm.nom}`);
        }
      }

      // Close the notification modal
      setIsOpen(false);

    } catch (error) {
      console.error('Failed to reject worker request:', error);
      alert('❌ Erreur lors du rejet de la demande');
    }
  };

  const handleWorkerAction = (notification: any) => {
    // Find worker by ID from notification data
    const workerId = notification.actionData?.workerId;
    const worker = workers.find(w => w.id === workerId);

    if (worker) {
      setSelectedWorker(worker);
      setFormData({
        dateSortie: new Date().toISOString().split('T')[0], // Default to today
        motif: 'none'
      });
      // Store the notification to mark as read later
      setSelectedWorker({...worker, notificationId: notification.id});
      setWorkerModalOpen(true);
    } else {
      // Fallback to regular action
      handleAction(notification.actionData?.actionUrl);
    }
  };

  const handleWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;

    try {
      // Update worker with exit date
      const updateData = {
        ...selectedWorker,
        dateSortie: formData.dateSortie,
        motif: formData.motif !== 'none' ? formData.motif : undefined,
        statut: 'inactif' as const
      };

      await updateDocument(selectedWorker.id, updateData);

      // Send notifications to all other farm administrators
      const currentFarm = fermes.find(f => f.id === selectedWorker.fermeId);
      if (currentFarm) {
        const otherFarms = fermes.filter(f => f.id !== currentFarm.id && f.admins && f.admins.length > 0);

        for (const farm of otherFarms) {
          // Filter out sender and superadmin
          const filteredAdminIds = farm.admins.filter(adminId => {
            // Don't send to the sender (current user)
            if (adminId === user?.uid) {
              console.log(`🚫 Skipping sender: ${adminId}`);
              return false;
            }

            // Don't send to superadmin
            const adminUser = users?.find(u => u.uid === adminId);
            if (adminUser?.role === 'superadmin') {
              console.log(`🚫 Skipping superadmin: ${adminId}`);
              return false;
            }

            return true;
          });

          for (const adminId of filteredAdminIds) {
            await sendNotification({
              type: 'worker_exit_confirmed',
              title: '✅ Ouvrier disponible',
              message: `L'ouvrier ${selectedWorker.nom} (CIN: ${selectedWorker.cin}) a quitté ${currentFarm.nom} le ${new Date(formData.dateSortie).toLocaleDateString('fr-FR')}. ${formData.motif && formData.motif !== 'none' ? `Motif: ${formData.motif.replace('_', ' ')}. ` : ''}Cet ouvrier est maintenant disponible pour votre ferme.`,
              recipientId: adminId,
              recipientFermeId: farm.id,
              status: 'unread',
              priority: 'medium',
              actionData: {
                workerId: selectedWorker.id,
                workerName: selectedWorker.nom,
                workerCin: selectedWorker.cin,
                actionRequired: 'Ouvrier disponible pour enregistrement',
                actionUrl: `/ouvriers/add?prefill=${selectedWorker.cin}`
              }
            });
          }
        }
      }

      // Mark the original notification as read so it doesn't show again
      const notificationId = (selectedWorker as any)?.notificationId;
      if (notificationId) {
        await markAsRead(notificationId);
      }

      // Close modals and show success
      setWorkerModalOpen(false);
      setSelectedWorker(null);
      setIsOpen(false); // Also close the notification popup
      alert('✅ Date de sortie ajoutée et notifications envoyées aux autres fermes!');
    } catch (error) {
      console.error('Failed to update worker:', error);
      alert('❌ Erreur lors de la mise à jour');
    }
  };

  const getIcon = (type: string, priority: string) => {
    if (priority === 'urgent') return <AlertTriangle className="h-5 w-5 text-red-600" />;
    if (priority === 'high') return <Bell className="h-5 w-5 text-orange-600" />;
    if (type === 'worker_exit_confirmed') return <CheckCircle className="h-5 w-5 text-green-600" />;
    return <Info className="h-5 w-5 text-blue-600" />;
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

  const unreadHighPriority = notifications.filter(n => 
    n.status === 'unread' && 
    (n.priority === 'high' || n.priority === 'urgent')
  );

  if (unreadHighPriority.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-md mx-2 sm:mx-auto mobile-dialog-container">
        <DialogHeader className="mobile-dialog-header">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-600" />
            Nouvelles notifications importantes
          </DialogTitle>
          <DialogDescription>
            Vous avez {unreadHighPriority.length} notification{unreadHighPriority.length > 1 ? 's' : ''} importante{unreadHighPriority.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {unreadHighPriority.slice(0, 3).map((notification) => (
            <Card key={notification.id} className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getIcon(notification.type, notification.priority)}
                    <CardTitle className="text-sm">
                      {notification.title}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="h-6 w-6 p-0"
                    title="Marquer comme lu"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-700 mb-2">
                  {notification.message}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatTimestamp(notification.createdAt)}</span>
                  <div className="flex gap-1">
                    {notification.actionData?.workerId && notification.type.includes('worker') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWorkerAction(notification)}
                        className="h-6 text-xs bg-orange-50 hover:bg-orange-100 border-orange-200"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Gérer sortie
                      </Button>
                    )}
                    {notification.actionData?.actionUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRejectWorkerRequest(notification)}
                        className="h-6 text-xs bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Rejeter
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {unreadHighPriority.length > 3 && (
            <div className="text-center text-sm text-gray-500">
              ... et {unreadHighPriority.length - 3} autre{unreadHighPriority.length - 3 > 1 ? 's' : ''} notification{unreadHighPriority.length - 3 > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Fermer
          </Button>
          <Button onClick={() => {
            // Mark all as read
            unreadHighPriority.forEach(n => markAsRead(n.id));
            setIsOpen(false);
          }}>
            Tout marquer comme lu
          </Button>
        </div>
      </DialogContent>

      {/* Worker Exit Date Modal */}
      <Dialog open={workerModalOpen} onOpenChange={setWorkerModalOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-2 sm:mx-auto mobile-dialog-container">
          <DialogHeader className="mobile-dialog-header">
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-blue-600" />
              Ajouter date de sortie
            </DialogTitle>
            <DialogDescription>
              Ajoutez la date de sortie pour libérer cet ouvrier. Les autres fermes seront notifiées.
            </DialogDescription>
          </DialogHeader>

          {selectedWorker && (
            <div className="space-y-4">
              {/* Worker Info Card */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                    <div><strong>Nom:</strong> {selectedWorker.nom}</div>
                    <div><strong>CIN:</strong> {selectedWorker.cin}</div>
                    <div><strong>Téléphone:</strong> {selectedWorker.telephone}</div>
                    <div><strong>Statut actuel:</strong>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${selectedWorker.statut === 'actif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {selectedWorker.statut}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Exit Form */}
              <form onSubmit={handleWorkerSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dateSortie">Date de sortie</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="dateSortie"
                      type="date"
                      value={formData.dateSortie}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateSortie: e.target.value }))}
                      className="pl-10"
                      min={selectedWorker.dateEntree}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motif">Motif de sortie</Label>
                  <Select
                    value={formData.motif}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, motif: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un motif" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun motif</SelectItem>
                      <SelectItem value="fin_contrat">Fin de contrat</SelectItem>
                      <SelectItem value="demission">Démission</SelectItem>
                      <SelectItem value="licenciement">Licenciement</SelectItem>
                      <SelectItem value="mutation">Mutation</SelectItem>
                      <SelectItem value="retraite">Retraite</SelectItem>
                      <SelectItem value="opportunite_salariale">Opportunité salariale</SelectItem>
                      <SelectItem value="depart_volontaire">Départ volontaire</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" type="button" onClick={() => setWorkerModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                    <Calendar className="h-4 w-4 mr-2" />
                    Confirmer sortie
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
