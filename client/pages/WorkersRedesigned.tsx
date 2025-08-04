import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useWorkers, useFarms, useRooms, useRealtimeUpdates } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  UserPlus,
  Search,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  Phone,
  IdCard,
  Building,
  BedDouble,
  TrendingUp,
  BarChart3,
  AlertCircle,
  Check,
  User,
  Filter,
  Download,
  Upload,
  Clock,
  UserCheck,
  UserX
} from 'lucide-react';
import { Worker, Ferme, Room } from '@shared/types';
import DataMonitoringDashboard from '@/components/DataMonitoringDashboard';

interface WorkerFormData {
  nom: string;
  cin: string;
  telephone: string;
  sexe: 'homme' | 'femme' | '';
  yearOfBirth: number;
  age: number;
  fermeId: string;
  chambre: string;
  secteur: string;
  dateEntree: string;
  dateSortie?: string;
}

export default function WorkersRedesigned() {
  const { user, isSuperAdmin } = useAuth();
  const { sendNotification } = useNotifications();

  // Use hybrid data fetching strategy
  const workers = useWorkers();
  const farms = useFarms();
  const rooms = useRooms();
  const realtimeUpdates = useRealtimeUpdates();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'actif' | 'inactif'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<WorkerFormData>({
    nom: '',
    cin: '',
    telephone: '',
    sexe: '',
    yearOfBirth: new Date().getFullYear() - 25,
    age: 25,
    fermeId: '',
    chambre: '',
    secteur: '',
    dateEntree: new Date().toISOString().split('T')[0]
  });

  // Calculate age from birth year
  const calculateAge = (birthYear: number) => {
    return new Date().getFullYear() - birthYear;
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      nom: '',
      cin: '',
      telephone: '',
      sexe: '',
      yearOfBirth: new Date().getFullYear() - 25,
      age: 25,
      fermeId: user?.fermeId || '',
      chambre: '',
      secteur: '',
      dateEntree: new Date().toISOString().split('T')[0]
    });
    setError('');
  };

  // Workers are already filtered by permissions in the DataProvider
  const filteredWorkers = workers.data || [];

  // Apply search and status filters
  const displayedWorkers = filteredWorkers.filter(worker => {
    const matchesSearch = worker.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         worker.cin.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || worker.statut === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get available rooms for the selected farm and gender
  const getAvailableRooms = () => {
    if (!formData.fermeId || !formData.sexe) return [];

    return rooms.data?.filter(room =>
      room.fermeId === formData.fermeId &&
      room.genre === (formData.sexe === 'homme' ? 'hommes' : 'femmes') &&
      (editingWorker || room.occupantsActuels < room.capaciteTotale)
    ) || [];
  };

  // Calculate statistics
  const stats = {
    total: filteredWorkers.length,
    actifs: filteredWorkers.filter(w => w.statut === 'actif').length,
    inactifs: filteredWorkers.filter(w => w.statut === 'inactif').length,
    hommes: filteredWorkers.filter(w => w.sexe === 'homme' && w.statut === 'actif').length,
    femmes: filteredWorkers.filter(w => w.sexe === 'femme' && w.statut === 'actif').length
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const workerData = {
        ...formData,
        age: calculateAge(formData.yearOfBirth),
        statut: 'actif' as const,
        dateCreation: new Date(),
        fermeId: formData.fermeId || user?.fermeId || ''
      };

      if (editingWorker) {
        await workers.update(editingWorker.id, workerData);
        await sendNotification({
          type: 'worker_updated',
          title: 'Ouvrier modifié',
          message: `L'ouvrier ${formData.nom} a été modifié avec succès`,
          recipientId: user?.uid || '',
          recipientFermeId: formData.fermeId,
          status: 'unread',
          priority: 'medium'
        });
      } else {
        await workers.add(workerData);
        await sendNotification({
          type: 'worker_added',
          title: 'Nouvel ouvrier ajouté',
          message: `L'ouvrier ${formData.nom} a été ajouté avec succès`,
          recipientId: user?.uid || '',
          recipientFermeId: formData.fermeId,
          status: 'unread',
          priority: 'medium'
        });
      }

      setIsAddDialogOpen(false);
      setEditingWorker(null);
      resetForm();
    } catch (err) {
      setError('Erreur lors de l\'enregistrement');
      console.error('Error saving worker:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 mb-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-6 mb-4">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 leading-9">
                    Gestion des Ouvriers
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Gérez vos équipes et suivez les activités
                  </p>
                </div>
              </div>
              
              {/* Statistics Grid */}
              <div 
                className="grid grid-cols-4 gap-4" 
                style={{ width: '99%', margin: '16px auto 0' }}
              >
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Total Ouvriers</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                    </div>
                    <div className="p-2 bg-blue-200 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Actifs</p>
                      <p className="text-2xl font-bold text-green-900">{stats.actifs}</p>
                    </div>
                    <div className="p-2 bg-green-200 rounded-lg">
                      <UserCheck className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-600 text-sm font-medium">Inactifs</p>
                      <p className="text-2xl font-bold text-orange-900">{stats.inactifs}</p>
                    </div>
                    <div className="p-2 bg-orange-200 rounded-lg">
                      <UserX className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Répartition H/F</p>
                      <p className="text-lg font-bold text-purple-900">{stats.hommes}/{stats.femmes}</p>
                    </div>
                    <div className="p-2 bg-purple-200 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12 px-6"
                    onClick={() => {
                      setEditingWorker(null);
                      resetForm();
                    }}
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Nouvel Ouvrier
                  </Button>
                </DialogTrigger>
                
                {/* Modern Worker Form */}
                <DialogContent className="w-[98vw] max-w-4xl mx-1 sm:mx-auto max-h-[95vh] overflow-y-auto mobile-dialog-container">
                  <DialogHeader className="space-y-4 pb-6 border-b border-gray-100 mobile-dialog-header">
                    <DialogTitle className="text-2xl font-semibold text-gray-900 flex items-center">
                      <UserPlus className="mr-3 h-6 w-6 text-blue-600" />
                      {editingWorker ? 'Modifier l\'ouvrier' : 'Ajouter un nouvel ouvrier'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 text-base">
                      {editingWorker ? 'Modifiez les informations de l\'ouvrier' : 'Remplissez les informations pour créer un nouveau profil ouvrier'}
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="space-y-8 pt-6">
                    {/* Personal Information Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <User className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Informations personnelles</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <div className="space-y-2">
                          <Label htmlFor="nom" className="text-sm font-medium text-gray-700">
                            Nom complet *
                          </Label>
                          <Input
                            id="nom"
                            value={formData.nom}
                            onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                            placeholder="Ex: Ahmed Ben Ali"
                            required
                            className="h-12 text-base"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="cin" className="text-sm font-medium text-gray-700">
                            CIN *
                          </Label>
                          <Input
                            id="cin"
                            value={formData.cin}
                            onChange={(e) => setFormData(prev => ({ ...prev, cin: e.target.value }))}
                            placeholder="Ex: AA123456"
                            required
                            className="h-12 text-base"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="telephone" className="text-sm font-medium text-gray-700">
                            Téléphone
                          </Label>
                          <Input
                            id="telephone"
                            value={formData.telephone}
                            onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                            placeholder="Ex: 0612345678"
                            className="h-12 text-base"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Sexe *
                          </Label>
                          <Select
                            value={formData.sexe}
                            onValueChange={(value: 'homme' | 'femme') => {
                              setFormData(prev => ({
                                ...prev,
                                sexe: value,
                                chambre: '',
                                secteur: ''
                              }));
                            }}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Sélectionner le sexe" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="homme">Homme</SelectItem>
                              <SelectItem value="femme">Femme</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="yearOfBirth" className="text-sm font-medium text-gray-700">
                            Année de naissance *
                          </Label>
                          <Input
                            id="yearOfBirth"
                            type="number"
                            value={formData.yearOfBirth}
                            onChange={(e) => {
                              const year = parseInt(e.target.value) || new Date().getFullYear();
                              const age = calculateAge(year);
                              setFormData(prev => ({
                                ...prev,
                                yearOfBirth: year,
                                age: age
                              }));
                            }}
                            placeholder={`${new Date().getFullYear() - 25}`}
                            min="1950"
                            max={new Date().getFullYear() - 16}
                            required
                            className="h-12 text-base"
                          />
                          <p className="text-xs text-gray-500">
                            Âge calculé: <span className="font-medium">{formData.age} ans</span>
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="dateEntree" className="text-sm font-medium text-gray-700">
                            Date d'entrée *
                          </Label>
                          <Input
                            id="dateEntree"
                            type="date"
                            value={formData.dateEntree}
                            onChange={(e) => setFormData(prev => ({ ...prev, dateEntree: e.target.value }))}
                            required
                            className="h-12 text-base"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Assignment Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Building className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Attribution et logement</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-6 rounded-xl border border-blue-200">
                        {isSuperAdmin && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">
                              Ferme *
                            </Label>
                            <Select
                              value={formData.fermeId}
                              onValueChange={(value) => {
                                setFormData(prev => ({
                                  ...prev,
                                  fermeId: value,
                                  chambre: '',
                                  secteur: ''
                                }));
                              }}
                            >
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Sélectionner une ferme" />
                              </SelectTrigger>
                              <SelectContent>
                        {farms.data?.map(ferme => (
                          <SelectItem key={ferme.id} value={ferme.id}>
                            {ferme.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Chambre
                          </Label>
                          <Select
                            value={formData.chambre}
                            onValueChange={(value) => {
                              const selectedRoom = getAvailableRooms().find(room => room.numero === value);
                              setFormData(prev => ({
                                ...prev,
                                chambre: value,
                                secteur: selectedRoom ? (selectedRoom.genre === 'hommes' ? 'Secteur Hommes' : 'Secteur Femmes') : ''
                              }));
                            }}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Sélectionner une chambre" />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableRooms().length === 0 ? (
                                <div className="p-3 text-center text-sm text-gray-500">
                                  {!formData.fermeId ? 'Sélectionnez d\'abord une ferme' :
                                   !formData.sexe ? 'Sélectionnez d\'abord le sexe' :
                                   'Aucune chambre disponible'}
                                </div>
                              ) : (
                                getAvailableRooms().map(room => {
                                  const isAvailable = room.occupantsActuels < room.capaciteTotale;
                                  const availableSpaces = room.capaciteTotale - room.occupantsActuels;
                                  return (
                                    <SelectItem
                                      key={room.id}
                                      value={room.numero}
                                      disabled={!isAvailable && !editingWorker}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span>Chambre {room.numero}</span>
                                        <Badge variant={isAvailable ? "secondary" : "destructive"} className="ml-2">
                                          {availableSpaces}/{room.capaciteTotale} places
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  );
                                })
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="secteur" className="text-sm font-medium text-gray-700">
                            Secteur
                          </Label>
                          <Input
                            id="secteur"
                            value={formData.secteur}
                            placeholder="Auto-rempli selon la chambre"
                            readOnly
                            className="bg-gray-100 h-12 text-base"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          {error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          setIsAddDialogOpen(false);
                          resetForm();
                        }}
                        className="h-12 px-6"
                      >
                        Annuler
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12 px-8 font-medium"
                      >
                        {loading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Enregistrement...</span>
                          </div>
                        ) : (
                          editingWorker ? 'Modifier l\'ouvrier' : 'Ajouter l\'ouvrier'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" className="h-12 px-6">
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>

              {/* Load more button for pagination */}
              {workers.hasMore && (
                <Button
                  variant="outline"
                  className="h-12 px-6"
                  onClick={workers.loadMore}
                  disabled={workers.loading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Charger plus
                </Button>
              )}
            </div>
          </div>

          {/* New data indicator */}
          {realtimeUpdates.hasNewData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    {realtimeUpdates.newWorkers.length} nouveaux ouvriers • {realtimeUpdates.newFarms.length} nouvelles fermes
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    workers.refresh();
                    farms.refresh();
                    realtimeUpdates.clearNewData();
                  }}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Actualiser
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom ou CIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={(value: 'all' | 'actif' | 'inactif') => setStatusFilter(value)}>
                <SelectTrigger className="w-40 h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="actif">Actifs</SelectItem>
                  <SelectItem value="inactif">Inactifs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Workers Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Ouvrier</TableHead>
                  <TableHead className="font-semibold">Contact</TableHead>
                  <TableHead className="font-semibold">Ferme</TableHead>
                  <TableHead className="font-semibold">Chambre</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold">Dates</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedWorkers.map((worker) => (
                  <TableRow key={worker.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{worker.nom}</div>
                        <div className="text-sm text-gray-500">{worker.cin}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{worker.telephone || 'Non renseigné'}</div>
                        <div className="text-xs text-gray-500">{worker.age} ans • {worker.sexe}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {farms.data?.find(f => f.id === worker.fermeId)?.nom || 'Non assignée'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <BedDouble className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">{worker.chambre || 'Non assignée'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={worker.statut === 'actif' ? 'default' : 'secondary'}
                        className={worker.statut === 'actif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {worker.statut}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div>Entrée: {new Date(worker.dateEntree).toLocaleDateString('fr-FR')}</div>
                        {worker.dateSortie && (
                          <div>Sortie: {new Date(worker.dateSortie).toLocaleDateString('fr-FR')}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingWorker(worker);
                            setFormData({
                              nom: worker.nom,
                              cin: worker.cin,
                              telephone: worker.telephone || '',
                              sexe: worker.sexe,
                              yearOfBirth: worker.yearOfBirth || new Date().getFullYear() - worker.age,
                              age: worker.age,
                              fermeId: worker.fermeId,
                              chambre: worker.chambre || '',
                              secteur: worker.secteur || '',
                              dateEntree: worker.dateEntree.split('T')[0],
                              dateSortie: worker.dateSortie?.split('T')[0]
                            });
                            setIsAddDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer cet ouvrier ?')) {
                              workers.remove(worker.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {displayedWorkers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <Users className="h-8 w-8 text-gray-400" />
                        <p className="text-gray-500">Aucun ouvrier trouvé</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Data Monitoring Dashboard */}
        <DataMonitoringDashboard />
      </div>
    </div>
  );
}
