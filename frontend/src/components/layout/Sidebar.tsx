import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  LogOut,
  Shield,
  DollarSign,
  TrendingDown,
  Wallet,
  Activity,
  ShoppingCartIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import clsx from 'clsx';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles?: string[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Punto de Venta', href: '/', icon: ShoppingCart },
  { name: 'Mis Productos', href: '/products', icon: Package },
  { name: 'Mis Ventas', href: '/sales', icon: FileText },
  { name: 'Mis Clientes', href: '/clients', icon: Users },
  { 
    name: 'Control de Caja', 
    href: '/cash-register', 
    icon: Wallet,
    roles: ['ADMIN', 'CAJERO'] 
  },
  { 
    name: 'Egresos', 
    href: '/expenses', 
    icon: TrendingDown,
    roles: ['ADMIN', 'CAJERO'] 
  },
  {
    name: 'Movimientos',
    href: '/movements',
    icon: Activity, // ✅ icono correcto para auditoría / logs
  },
  {
    name: 'Tasa de Cambio',
    href: '/exchange-rate',
    icon: DollarSign,
    roles: ['ADMIN', 'CAJERO'],
  },
  {
    name: 'Gestión de Usuarios',
    href: '/register-user',
    icon: Shield,
    roles: ['ADMIN'],
  },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  // ✅ LOGOUT
  const handleLogout = async () => {
    try {
      const confirmed = window.confirm('¿Estás seguro de cerrar sesión?');
      if (!confirmed) return;

      await logout();
      localStorage.clear();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error:', error);
      navigate('/login', { replace: true });
    }
  };

  // ✅ Filtrar navegación por rol
  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || '');
  });

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <ShoppingCartIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">FinkuPOS</h1>
            <p className="text-xs text-gray-500">v2.0</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium',
                isActive
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 font-semibold text-lg">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.role}</p>
          </div>
        </div>

        {/* ✅ BOTÓN LOGOUT MEJORADO */}
        <button
          onClick={handleLogout}
          type="button"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
