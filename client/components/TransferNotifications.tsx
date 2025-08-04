import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Bell,
  Check,
  X,
  Package,
  ArrowRight,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { StockTransfer, TransferNotification } from '@shared/types';

export function TransferNotifications() {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<TransferNotification[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<StockTransfer[]>([]);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<TransferNotification | null>(null);
  const [loading, setLoading] = useState(false);

  // Load notifications and pending transfers
  useEffect(() => {
    if (!user?.fermeId) return;

    // Load notifications for current user's farm
    const notificationQuery = query(
      collection(db, 'transfer_notifications'),
      where('toFermeId', '==', user.fermeId)
    );

    const unsubscribeNotifications = onSnapshot(notificationQuery, (snapshot) => {
      const notificationsData: TransferNotification[] = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as TransferNotification))
        .filter(notification => notification.status !== 'acknowledged') // Filter in memory
        .sort((a, b) => {
          // Sort by createdAt in memory (newest first)
          const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return bTime.getTime() - aTime.getTime();
        });
      setNotifications(notificationsData);
    });

    // Load pending transfers for this farm
    const transferQuery = query(
      collection(db, 'stock_transfers'),
      where('toFermeId', '==', user.fermeId)
    );

    const unsubscribeTransfers = onSnapshot(transferQuery, (snapshot) => {
      const transfersData: StockTransfer[] = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as StockTransfer))
        .filter(transfer => transfer.status === 'pending') // Filter in memory
        .sort((a, b) => {
          // Sort by createdAt in memory (newest first)
          const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return bTime.getTime() - aTime.getTime();
        });
      setPendingTransfers(transfersData);
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeTransfers();
    };
  }, [user?.fermeId]);

  const handleConfirmTransfer = async (transferId: string) => {
    setLoading(true);
    try {
      const transfer = pendingTransfers.find(t => t.id === transferId);
      if (!transfer) return;

      // Update transfer status
      const transferRef = doc(db, 'stock_transfers', transferId);
      await updateDoc(transferRef, {
        status: 'confirmed',
        confirmedAt: serverTimestamp(),
        receivedBy: user?.uid,
        receivedByName: user?.nom || user?.email
      });

      // Update notification status
      const notificationQuery = query(
        collection(db, 'transfer_notifications'),
        where('toFermeId', '==', user?.fermeId)
      );

      const notificationSnapshot = await getDocs(notificationQuery);
      notificationSnapshot.forEach(async (notifDoc) => {
        const notifData = notifDoc.data();
        // Filter in memory: update only notifications for this item that aren't acknowledged
        if (notifData.item === transfer.item && notifData.status !== 'acknowledged') {
          await updateDoc(doc(db, 'transfer_notifications', notifDoc.id), {
            status: 'acknowledged',
            acknowledgedAt: serverTimestamp()
          });
        }
      });

      toast({
        title: "Transfert confirmé",
        description: `${transfer.item} a été confirmé avec succès`
      });

      setShowNotificationDialog(false);
      setSelectedNotification(null);
    } catch (error) {
      console.error('Erreur lors de la confirmation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de confirmer le transfert",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTransfer = async (transferId: string, reason: string = 'Rejeté par l\'utilisateur') => {
    setLoading(true);
    try {
      const transfer = pendingTransfers.find(t => t.id === transferId);
      if (!transfer) return;

      // Update transfer status
      const transferRef = doc(db, 'stock_transfers', transferId);
      await updateDoc(transferRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: user?.uid,
        rejectedByName: user?.nom || user?.email,
        rejectionReason: reason
      });

      // Update notification status
      const notificationQuery = query(
        collection(db, 'transfer_notifications'),
        where('toFermeId', '==', user?.fermeId)
      );

      const notificationSnapshot = await getDocs(notificationQuery);
      notificationSnapshot.forEach(async (notifDoc) => {
        const notifData = notifDoc.data();
        // Filter in memory: update only notifications for this item that aren't acknowledged
        if (notifData.item === transfer.item && notifData.status !== 'acknowledged') {
          await updateDoc(doc(db, 'transfer_notifications', notifDoc.id), {
            status: 'acknowledged',
            acknowledgedAt: serverTimestamp()
          });
        }
      });

      toast({
        title: "Transfert rejeté",
        description: `${transfer.item} a été rejeté`
      });

      setShowNotificationDialog(false);
      setSelectedNotification(null);
    } catch (error) {
      console.error('Erreur lors du rejet:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejeter le transfert",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      // Skip mock notifications
      if (notificationId === 'mock') return;

      const notificationRef = doc(db, 'transfer_notifications', notificationId);
      await updateDoc(notificationRef, {
        status: 'read',
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erreur lors du marquage:', error);
    }
  };

  const openNotificationDialog = (notification: TransferNotification) => {
    setSelectedNotification(notification);
    setShowNotificationDialog(true);
    markNotificationAsRead(notification.id);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="h-4 w-4" />;
      case 'high': return <Clock className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  if (notifications.length === 0 && pendingTransfers.length === 0) {
    return null;
  }

  return (
    <>
      {/* Persistent notification banner */}
      {(notifications.length > 0 || pendingTransfers.length > 0) && (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-400 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Bell className="h-6 w-6 text-orange-600" />
                {(notifications.length > 0 || pendingTransfers.length > 0) && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notifications.length + pendingTransfers.length}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-orange-800">
                  Transferts en attente de confirmation
                </h3>
                <p className="text-sm text-orange-600">
                  Vous avez {notifications.length + pendingTransfers.length} transfert{(notifications.length + pendingTransfers.length) > 1 ? 's' : ''} nécessitant votre attention.
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                // Create a mock notification to show dialog
                if (pendingTransfers.length > 0) {
                  const transfer = pendingTransfers[0];
                  const mockNotification: TransferNotification = {
                    id: 'mock',
                    transferId: transfer.id,
                    type: 'incoming_transfer',
                    fromFermeId: transfer.fromFermeId,
                    fromFermeName: transfer.fromFermeName || '',
                    toFermeId: transfer.toFermeId,
                    toFermeName: transfer.toFermeName || '',
                    item: transfer.item,
                    quantity: transfer.quantity,
                    unit: transfer.unit,
                    message: `Transfert entrant: ${transfer.item}`,
                    status: 'unread',
                    createdAt: transfer.createdAt,
                    userId: user?.uid || '',
                    priority: transfer.priority || 'medium'
                  };
                  openNotificationDialog(mockNotification);
                } else if (notifications.length > 0) {
                  openNotificationDialog(notifications[0]);
                }
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Gérer les transferts
            </Button>
          </div>


        </div>
      )}

      {/* Notification Dialog */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent className="w-[95vw] max-w-md mx-2 sm:mx-auto mobile-dialog-container">
          <DialogHeader className="mobile-dialog-header">
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification && getPriorityIcon(selectedNotification.priority)}
              Transfert entrant
            </DialogTitle>
            <DialogDescription>
              Nouveau transfert nécessitant votre confirmation
            </DialogDescription>
          </DialogHeader>
          
          {selectedNotification && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Article:</span>
                      <span className="font-semibold">{selectedNotification.item}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Quantité:</span>
                      <span>{selectedNotification.quantity} {selectedNotification.unit}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">De:</span>
                      <span>{selectedNotification.fromFermeName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Vers:</span>
                      <span>{selectedNotification.toFermeName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Priorité:</span>
                      <Badge className={getPriorityColor(selectedNotification.priority)}>
                        {selectedNotification.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Date:</span>
                      <span className="text-sm">{formatDate(selectedNotification.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNotificationDialog(false);
                    setSelectedNotification(null);
                  }}
                >
                  Fermer
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const transfer = pendingTransfers.find(t => t.item === selectedNotification.item);
                    if (transfer) {
                      handleRejectTransfer(transfer.id);
                    }
                  }}
                  disabled={loading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Rejeter
                </Button>
                <Button
                  onClick={() => {
                    const transfer = pendingTransfers.find(t => t.item === selectedNotification.item);
                    if (transfer) {
                      handleConfirmTransfer(transfer.id);
                    }
                  }}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Confirmer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
