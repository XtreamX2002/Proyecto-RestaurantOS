import { NavLink, useNavigate } from 'react-router-dom';
import { useVistaAdministradorStore } from '../../store/vistaAdministradorStore';
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  UtensilsCrossed,
  ClipboardList,
  Grid2X2,
  BarChart3,
  CalendarCheck2,
  LogOut,
  X,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';

const navDueno = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sucursales', icon: Building2, label: 'Sucursales' },
  { to: '/usuarios', icon: Users, label: 'Usuarios' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/configuracion', icon: Settings, label: 'Configuración' },
];

const navAdmin = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/pedidos', icon: ClipboardList, label: 'Pedidos' },
  { to: '/mesas', icon: Grid2X2, label: 'Mesas' },
  { to: '/menu', icon: UtensilsCrossed, label: 'Menú' },
  { to: '/usuarios', icon: Users, label: 'Personal' },
  { to: '/asistencias', icon: CalendarCheck2, label: 'Asistencias' },

  { to: '/configuracion', icon: Settings, label: 'Configuración' },
];

const navMesero = [
  { to: '/mesero/mesas', icon: Grid2X2, label: 'Mesas' },
  { to: '/mesero/pedidos', icon: ClipboardList, label: 'Pedidos' },
  { to: '/configuracion', icon: Settings, label: 'Configuración' },
];

const navCocinero = [
  { to: '/pedidos-cocina', icon: ClipboardList, label: 'Pedidos' },
  { to: '/configuracion', icon: Settings, label: 'Configuración' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const {
    activo: vistaAdministradorActiva,
    sucursalActivaNombre,
    salirVistaAdministrador,
  } = useVistaAdministradorStore();

  const isDuenoEnVistaAdministrador =
    user?.rol === 'DUENO' && vistaAdministradorActiva;

  const navVistaAdministradorDueno = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/usuarios', icon: Users, label: 'Personal' },
    { to: '/reportes', icon: BarChart3, label: 'Reportes' },
    { to: '/pedidos', icon: ClipboardList, label: 'Pedidos' },
    { to: '/mesas', icon: Grid2X2, label: 'Mesas' },
    { to: '/asistencias', icon: CalendarCheck2, label: 'Asistencias' },
  ];
  
  const navItems =
    isDuenoEnVistaAdministrador ? navVistaAdministradorDueno :
      user?.rol === 'DUENO' ? navDueno :
        user?.rol === 'ADMIN' ? navAdmin :
          user?.rol === 'MESERO' ? navMesero :
            user?.rol === 'COCINERO' ? navCocinero : [];

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-border flex flex-col',
        'transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <UtensilsCrossed size={16} className="text-white" />
            </div>
            <span className="font-bold text-text text-base">RestaurantOS</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-background transition-colors"
            aria-label="Cerrar menú lateral"
            title="Cerrar menú lateral"
          >
            <X size={18} className="text-text-muted" aria-hidden="true" />
          </button>
        </div>

        {isDuenoEnVistaAdministrador ? (
          <div className="px-4 py-3 bg-emerald-50 border-b border-border space-y-2">
            <div>
              <p className="text-xs text-slate-700 font-medium uppercase tracking-wide">
                Vista administrador
              </p>
              <p className="text-sm font-semibold text-green-800 truncate">
                {sucursalActivaNombre}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                salirVistaAdministrador();
                navigate('/dashboard');
              }}
              className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-white text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
            >
              Salir de vista administrador
            </button>
          </div>
        ) : user?.sucursal ? (
          <div className="px-4 py-3 bg-green-50 border-b border-border">
            <p className="text-xs text-slate-700 font-medium uppercase tracking-wide">
              Sucursal activa
            </p>
            <p className="text-sm font-semibold text-green-800 truncate">
              {user.sucursal.nombre}
            </p>
          </div>
        ) : null}

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => { if (window.innerWidth < 1024) onClose(); }}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-green-700 text-white shadow-sm'
                  : 'text-text-muted hover:text-text hover:bg-background'
              )}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={14} className="opacity-40" />
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-background transition-colors group cursor-pointer"
            onClick={() => navigate('/configuracion')}>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
              {user?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text truncate">{user?.nombre}</p>
              <p className="text-xs text-text-muted">{user?.rol}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleLogout(); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 hover:text-error transition-all"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}