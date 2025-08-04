import { useState, ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/NotificationPanel';
import { NotificationPopup } from '@/components/NotificationPopup';
import { NetworkStatus } from '@/components/NetworkStatus';

import { useNavigate, useLocation } from 'react-router-dom';
import { useFirestore } from '@/hooks/useFirestore';
import { Ferme, StockAlert, StockTransfer } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Building2,
  Users,
  Home,
  Settings,
  LogOut,
  Menu,
  BedDouble,
  BarChart3,
  Package,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout, isSuperAdmin, isAdmin, isUser, hasAllFarmsAccess } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [stockNotifications, setStockNotifications] = useState(0);
  const { data: fermes } = useFirestore<Ferme>('fermes');

  const getFermeName = (fermeId: string) => {
    if (!fermeId) return '-';
    if (fermeId === 'all') return 'Toutes les fermes';
    if (!fermes || fermes.length === 0) return fermeId; // Still loading or no fermes data
    const ferme = fermes.find(f => f.id === fermeId);
    return ferme?.nom || fermeId; // Fallback to ID if ferme not found
  };

  // Track stock notifications
  useEffect(() => {
    if (!user) return;

    let unsubscribeAlerts: (() => void) | undefined;
    let unsubscribeTransfers: (() => void) | undefined;

    // Listen for stock alerts
    const alertQuery = hasAllFarmsAccess
      ? query(collection(db, 'stock_alerts'), where('acknowledged', '==', false))
      : query(collection(db, 'stock_alerts'),
          where('secteurId', '==', user.fermeId || ''),
          where('acknowledged', '==', false));

    unsubscribeAlerts = onSnapshot(alertQuery, (snapshot) => {
      const alertCount = snapshot.docs.length;

      // Listen for transfers to this user's sector
      const transferQuery = query(
        collection(db, 'stock_transfers'),
        where('toSecteurId', '==', user.fermeId || '')
      );

      unsubscribeTransfers = onSnapshot(transferQuery, (transferSnapshot) => {
        const pendingTransferCount = transferSnapshot.docs
          .filter(doc => {
            const data = doc.data();
            return data.status === 'pending' || data.status === 'in_transit';
          }).length;
        setStockNotifications(alertCount + pendingTransferCount);
      });
    });

    return () => {
      unsubscribeAlerts?.();
      unsubscribeTransfers?.();
    };
  }, [user, hasAllFarmsAccess]);

  const navigation = [
    {
      name: 'Tableau de bord',
      href: '/',
      icon: Home,
      show: true,
      notificationCount: 0
    },
    {
      name: 'Fermes',
      href: '/fermes',
      icon: Building2,
      show: hasAllFarmsAccess || isAdmin || isUser, // Show to users with all farms access or any role
      notificationCount: 0
    },
    {
      name: 'Ouvriers',
      href: '/ouvriers',
      icon: Users,
      show: !isUser, // Hide ONLY from regular users
      notificationCount: 0
    },
    {
      name: 'Chambres',
      href: '/chambres',
      icon: BedDouble,
      show: isSuperAdmin || isAdmin || isUser, // Show to all except when no role
      notificationCount: 0
    },
    {
      name: 'Stock',
      href: '/stock',
      icon: Package,
      show: isSuperAdmin || isAdmin || isUser, // Show to all except when no role
      notificationCount: stockNotifications
    },
    {
      name: 'Statistiques',
      href: '/statistiques',
      icon: BarChart3,
      show: true,
      notificationCount: 0
    },
    {
      name: 'Administration',
      href: '/admin',
      icon: Settings,
      show: isSuperAdmin,
      notificationCount: 0
    }
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Administrateur';
      case 'admin': return 'Administrateur';
      case 'user': return 'Utilisateur';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold text-gray-900">
                    Gestion des Secteurs
                  </h1>
                  {user?.fermeId && (
                    <p className="text-sm text-gray-500">
                      Ferme: {getFermeName(user.fermeId)}
                    </p>
                  )}
                </div>
                <div className="sm:hidden">
                  <h1 className="text-lg font-bold text-gray-900">
                    Secteurs
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notification Bell */}
              <NotificationBell />

              {/* Mobile menu button */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[350px] p-6">
                  <div className="flex flex-col space-y-6">
                    <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                      <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          Gestion des Secteurs
                        </h2>
                        {user?.fermeId && (
                          <p className="text-sm text-gray-500 mt-1">
                            Ferme: {getFermeName(user.fermeId)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {navigation
                        .filter(item => item.show)
                        .map((item) => {
                          const isActive = location.pathname === item.href;
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={cn(
                                'flex items-center justify-between px-4 py-4 text-base font-medium rounded-lg transition-colors w-full min-h-[48px]',
                                isActive
                                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              )}
                            >
                              <div className="flex items-center">
                                <item.icon className="mr-3 h-5 w-5" />
                                {item.name}
                              </div>
                              {item.notificationCount > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="h-5 w-5 p-0 text-xs flex items-center justify-center"
                                >
                                  {item.notificationCount > 99 ? '99+' : item.notificationCount}
                                </Badge>
                              )}
                            </Link>
                          );
                        })}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full md:h-8 md:w-8">
                    <Avatar className="h-10 w-10 md:h-8 md:w-8">
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base md:text-sm">
                        {getInitials(user?.nom || '')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.nom}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {getRoleLabel(user?.role || '')}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/parametres')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Paramètres</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Se déconnecter</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8">
        {/* Secondary Navigation - Hidden on mobile, shown on desktop */}
        <div className="mb-6 sm:mb-8 hidden md:block">
          <nav className="flex space-x-4 lg:space-x-8 overflow-x-auto">
            {navigation
              .filter(item => item.show)
              .map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap relative',
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                    {item.notificationCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                      >
                        {item.notificationCount > 99 ? '99+' : item.notificationCount}
                      </Badge>
                    )}
                  </Link>
                );
              })}
          </nav>
        </div>

        {/* Network Status */}
        <NetworkStatus />


        {/* Page Content */}
        {children}

        {/* Automatic notification popup */}
        <NotificationPopup />
      </div>
    </div>
  );
};
