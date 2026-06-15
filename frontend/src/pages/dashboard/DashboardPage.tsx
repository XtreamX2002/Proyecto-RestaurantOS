import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/cn';
import { dashboardService } from '../../services/dashboard.service';
import { useVistaAdministradorStore } from '../../store/vistaAdministradorStore';
import DuenoDashboard from './DuenoDashboard';
import type { DashboardDueno, DashboardSucursal } from '../../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'text-primary',
}: {
  label: string;
  value: string | number;
  icon: any;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-text-muted">{label}</p>
        <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-text">{value}</p>
    </div>
  );
}

function isDashboardDueno(
  data: DashboardDueno | DashboardSucursal | undefined
): data is DashboardDueno {
  return !!data && 'sucursales' in data;
}

function isDashboardSucursal(
  data: DashboardDueno | DashboardSucursal | undefined
): data is DashboardSucursal {
  return !!data && 'ventasHoy' in data;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isDueno = user?.rol === 'DUENO';

  const {
    activo: vistaAdministradorActiva,
    sucursalActivaId,
    sucursalActivaNombre,
  } = useVistaAdministradorStore();

  const isDuenoEnVistaAdministrador =
    isDueno && vistaAdministradorActiva && Boolean(sucursalActivaId);

  const { data, isLoading } = useQuery<DashboardDueno | DashboardSucursal>({
    queryKey: [
      'dashboard',
      user?.rol,
      user?.sucursalId,
      isDuenoEnVistaAdministrador ? sucursalActivaId : 'global',
    ],
    queryFn: async () => {
      if (isDuenoEnVistaAdministrador && sucursalActivaId) {
        return dashboardService.getSucursal(sucursalActivaId);
      }

      if (isDueno) {
        return dashboardService.getDueno();
      }

      return dashboardService.getSucursal(user?.sucursalId ?? '');
    },
    enabled:
      !!user &&
      (
        isDuenoEnVistaAdministrador ||
        isDueno ||
        !!user.sucursalId
      ),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-border p-5 animate-pulse h-28"
          />
        ))}
      </div>
    );
  }

  if (isDueno && !isDuenoEnVistaAdministrador && isDashboardDueno(data)) {
    return <DuenoDashboard data={data} />;
  }

  if (!isDashboardSucursal(data)) {
    return (
      <div className="bg-white rounded-xl border border-border p-5 shadow-card">
        <p className="text-sm text-text-muted">
          No se pudo cargar la información del dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text">
          {isDuenoEnVistaAdministrador ? 'Resumen de sucursal' : 'Resumen del día'}
        </h2>
        <p className="text-sm text-text-muted">
          {isDuenoEnVistaAdministrador ? sucursalActivaNombre : user?.sucursal?.nombre}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Ventas hoy"
          value={formatCurrency(data.ventasHoy ?? 0)}
          icon={TrendingUp}
        />

        <StatCard
          label="Pedidos hoy"
          value={data.pedidosHoy ?? 0}
          icon={ShoppingBag}
        />

        <StatCard
          label="Mesas ocupadas"
          value={`${data.mesasOcupadas ?? 0} / ${data.totalMesas ?? 0}`}
          icon={Users}
        />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-text">
            Productos más vendidos
          </h3>

          <p className="text-sm text-text-muted">
            Rendimiento de ventas del día
          </p>
        </div>

        {(data.topProductos ?? []).length === 0 ? (
          <div className="py-10 text-center text-sm text-text-muted">
            No hay información para mostrar
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(data.topProductos ?? []).map((p) => ({
                  nombre:
                    p.nombre.length > 12
                      ? `${p.nombre.slice(0, 12)}...`
                      : p.nombre,
                  cantidad: p.cantidad,
                }))}
              >
                <CartesianGrid
                  stroke="#dcfce7"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="nombre"
                  tick={{
                    fontSize: 12,
                    fill: '#166534',
                  }}
                  axisLine={{ stroke: '#bbf7d0' }}
                  tickLine={{ stroke: '#bbf7d0' }}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{
                    fill: '#166534',
                  }}
                  axisLine={{ stroke: '#bbf7d0' }}
                  tickLine={{ stroke: '#bbf7d0' }}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #bbf7d0',
                    backgroundColor: '#f0fdf4',
                  }}
                  labelStyle={{
                    color: '#166534',
                    fontWeight: 600,
                  }}
                />

                <Bar
                  dataKey="cantidad"
                  fill="#16a34a"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-text">Top ventas del día</h3>
        </div>

        <div className="divide-y divide-border">
          {(data.topProductos ?? []).length === 0 ? (
            <p className="px-5 py-6 text-sm text-text-muted text-center">
              Sin ventas registradas hoy
            </p>
          ) : (
            (data.topProductos ?? []).map((producto, index) => (
              <div
                key={producto.id}
                className="px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-text-muted w-5">
                    #{index + 1}
                  </span>
                  <p className="font-medium text-text">{producto.nombre}</p>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <span className="text-text-muted">
                    {producto.cantidad} vendidos
                  </span>
                  <span className="font-semibold text-text">
                    {formatCurrency(producto.total)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}