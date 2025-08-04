import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore } from '@/hooks/useFirestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Ferme } from '@shared/types';
import {
  AlertTriangle,
  Building2,
  User as UserIcon,
  Settings,
  Mail
} from 'lucide-react';

interface UserSetupCheckProps {
  children: React.ReactNode;
}

export const UserSetupCheck: React.FC<UserSetupCheckProps> = ({ children }) => {
  const { user, isSuperAdmin } = useAuth();
  const { data: fermes } = useFirestore<Ferme>('fermes');

  // If user is superadmin, they don't need a specific farm assignment
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // If user has "all" farms access, they can see everything like a superadmin
  if (user?.fermeId === 'all') {
    return <>{children}</>;
  }

  // If user has a farm ID and it exists in the database, everything is fine
  if (user?.fermeId && fermes?.some(f => f.id === user.fermeId)) {
    return <>{children}</>;
  }

  // If user has a farm ID but it doesn't exist in database
  if (user?.fermeId && fermes && !fermes.some(f => f.id === user.fermeId)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-900">Ferme introuvable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Votre compte est associé à une ferme qui n'existe plus dans le système (ID: {user.fermeId}).
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3 text-sm text-gray-600">
              <p><strong>Que faire ?</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Contactez votre administrateur système</li>
                <li>Vérifiez que votre ferme n'a pas été supprimée</li>
                <li>Demandez à être réassigné à une ferme active</li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-gray-500 mb-3">
                <strong>Informations de contact :</strong>
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-3 w-3 text-gray-400" />
                  <span>Utilisateur: {user.nom} ({user.email})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-3 w-3 text-gray-400" />
                  <span>Ferme assignée: {user.fermeId}</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="w-full"
            >
              Actualiser la page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user doesn't have a farm ID at all
  if (!user?.fermeId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-yellow-100 rounded-full w-fit">
              <Settings className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-xl text-yellow-900">Configuration requise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Votre compte n'est pas encore associé à une ferme. Une configuration supplémentaire est nécessaire.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3 text-sm text-gray-600">
              <p><strong>Pour commencer :</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Contactez votre administrateur pour être assigné à une ferme</li>
                <li>Vérifiez que votre compte a été configuré correctement</li>
                <li>Assurez-vous d'avoir les permissions appropriées</li>
              </ul>
            </div>

            {fermes && fermes.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-2">
                  <strong>Fermes disponibles dans le système :</strong>
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {fermes.slice(0, 3).map(ferme => (
                    <li key={ferme.id} className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-gray-400" />
                      {ferme.nom}
                    </li>
                  ))}
                  {fermes.length > 3 && (
                    <li className="text-gray-400 italic">
                      ... et {fermes.length - 3} autres
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-3 w-3 text-gray-400" />
                  <span>Utilisateur: {user.nom} ({user.email})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="h-3 w-3 text-gray-400" />
                  <span>Rôle: {user.role}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="flex-1"
              >
                Actualiser
              </Button>
              <Button 
                onClick={() => window.location.href = 'mailto:support@votre-domaine.com?subject=Demande d\'assignation de ferme'} 
                className="flex-1"
              >
                <Mail className="h-4 w-4 mr-2" />
                Contacter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default case - render children if everything is okay
  return <>{children}</>;
};
