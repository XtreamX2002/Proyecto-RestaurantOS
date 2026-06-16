import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  Search,
  UserCircle2,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { useVistaAdministradorStore } from '../../../store/vistaAdministradorStore';

interface Personal {
  id: string;
  nombre: string;
  rol: 'MESERO' | 'COCINERO';
  asistencia: boolean;
  horaEntrada: string | null;
  tardanza: boolean;
}

const ROL_LABELS = {
  MESERO: 'Mesero',
  COCINERO: 'Cocinero',
};

const getInitials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export default function AsistenciasPage() {
  const { user } = useAuthStore();

  const {
    activo: vistaAdministradorActiva,
    sucursalActivaId,
    sucursalActivaNombre,
  } = useVistaAdministradorStore();

  const isDuenoEnVistaAdministrador =
    user?.rol === 'DUENO' &&
    vistaAdministradorActiva &&
    Boolean(sucursalActivaId);

  const sucursalIdOperativa =
    isDuenoEnVistaAdministrador
      ? sucursalActivaId
      : user?.sucursalId;

  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [rolFilter, setRolFilter] = useState('TODOS');
  const [estadoFilter, setEstadoFilter] = useState('TODOS');

  useEffect(() => {
    cargarAsistencias();
  }, [sucursalIdOperativa]);

  const cargarAsistencias = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (isDuenoEnVistaAdministrador && sucursalIdOperativa) {
        params.append('sucursalId', sucursalIdOperativa);
      }

      const query = params.toString();

      const { data } = await api.get<Personal[]>(
        query ? `/asistencias?${query}` : '/asistencias'
      );
      setPersonal(Array.isArray(data) ? data : []);

    } catch (error) {
      console.error('ERROR REAL:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAsistencia = async (id: string) => {
    try {
      const empleado = personal.find((p) => p.id === id);
      if (!empleado) return;

      const nuevoEstado = !empleado.asistencia;

      setPersonal((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, asistencia: nuevoEstado } : e
        )
      );

      const { data } = await api.post<{
        presente: boolean;
        tardanza: boolean;
        horaEntrada: string | null;
      }>(
        `/asistencias/${id}`,
        {
          presente: nuevoEstado,
          sucursalId: isDuenoEnVistaAdministrador
            ? sucursalIdOperativa
            : undefined,
        }
      );

      setPersonal((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
              ...e,
              asistencia: data.presente,
              tardanza: data.tardanza,
              horaEntrada: data.horaEntrada,
            }
            : e
        )
      );

    } catch (error) {
      console.error(error);
      cargarAsistencias();
    }
  };
  const personalFiltrado = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return personal.filter((empleado) => {
      const matchesSearch =
        !search ||
        empleado.nombre.toLowerCase().includes(search) ||
        empleado.rol.toLowerCase().includes(search);

      const matchesRol =
        rolFilter === 'TODOS' ||
        empleado.rol === rolFilter;

      const matchesEstado =
        estadoFilter === 'TODOS' ||
        (estadoFilter === 'PRESENTE' &&
          empleado.asistencia) ||
        (estadoFilter === 'AUSENTE' &&
          !empleado.asistencia);

      return (
        matchesSearch &&
        matchesRol &&
        matchesEstado
      );
    });
  }, [
    personal,
    searchTerm,
    rolFilter,
    estadoFilter,
  ]);

  const totalPresentes = personal.filter(
    (p) => p.asistencia
  ).length;

  const totalAusentes = personal.filter((p) => !p.asistencia).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="animate-spin text-primary"
            size={32}
          />

          <p className="text-sm text-text-muted">
            Cargando asistencias...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">
            Asistencias
          </h2>

          <p className="text-sm text-text-muted">
            Registro del personal
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-2 shadow-sm">
          <CalendarCheck2
            size={18}
            className="text-primary"
          />

          <div>
            <p className="text-xs text-text-muted">
              Fecha
            </p>

            <p className="text-sm font-semibold text-text">
              {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">
                Total personal
              </p>

              <h3 className="text-2xl font-bold text-text mt-1">
                {personal.length}
              </h3>
            </div>

            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCircle2
                size={22}
                className="text-primary"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">
                Presentes
              </p>

              <h3 className="text-2xl font-bold text-text mt-1">
                {totalPresentes}
              </h3>
            </div>

            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle2
                size={22}
                className="text-green-600"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">
                Ausentes
              </p>

              <h3 className="text-2xl font-bold text-text mt-1">
                {totalAusentes}
              </h3>
            </div>

            <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center">
              <XCircle
                size={22}
                className="text-red-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-border shadow-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
              Buscar
            </label>

            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />

              <input
                type="text"
                placeholder="Buscar personal..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
              Rol
            </label>

            <select
              value={rolFilter}
              onChange={(e) =>
                setRolFilter(e.target.value)
              }
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="TODOS">
                Todos los roles
              </option>

              <option value="MESERO">
                Mesero
              </option>

              <option value="COCINERO">
                Cocinero
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
              Estado
            </label>

            <select
              value={estadoFilter}
              onChange={(e) =>
                setEstadoFilter(e.target.value)
              }
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="TODOS">Todos</option>

              <option value="PRESENTE">
                Presentes
              </option>

              <option value="AUSENTE">
                Ausentes
              </option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <p className="text-sm text-text-muted">
            Mostrando{' '}
            <span className="font-semibold text-text">
              {personalFiltrado.length}
            </span>{' '}
            de{' '}
            <span className="font-semibold text-text">
              {personal.length}
            </span>{' '}
            empleados
          </p>

          {(searchTerm ||
            rolFilter !== 'TODOS' ||
            estadoFilter !== 'TODOS') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRolFilter('TODOS');
                  setEstadoFilter('TODOS');
                }}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors"
              >
                Limpiar filtros
              </button>
            )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wide">
                  Personal
                </th>

                <th className="px-5 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wide">
                  Rol
                </th>

                <th className="px-5 py-3 text-center text-xs font-bold text-text-muted uppercase tracking-wide">
                  Asistencia
                </th>

                <th className="px-5 py-3 text-center text-xs font-bold text-text-muted uppercase tracking-wide">
                  Hora entrada
                </th>

                <th className="px-5 py-3 text-center text-xs font-bold text-text-muted uppercase tracking-wide">
                  Estado
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {personalFiltrado.map((empleado) => (
                <tr
                  key={empleado.id}
                  className="hover:bg-background/70 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                        {getInitials(
                          empleado.nombre
                        )}
                      </div>

                      <div>
                        <p className="font-medium text-text">
                          {empleado.nombre}
                        </p>

                        <p className="text-xs text-text-muted">
                          ID: {empleado.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm text-text-muted">
                    {ROL_LABELS[empleado.rol]}
                  </td>

                  <td className="px-5 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={empleado.asistencia}
                      onChange={() =>
                        toggleAsistencia(
                          empleado.id
                        )
                      }
                      className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                    />
                  </td>

                  <td className="px-5 py-4 text-center text-sm text-text-muted">
                    {empleado.horaEntrada
                      ? new Date(empleado.horaEntrada).toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      : '—'}
                  </td>

                  <td className="px-5 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">

                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${empleado.asistencia
                          ? empleado.tardanza
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                          }`}
                      >
                        {empleado.asistencia
                          ? empleado.tardanza
                            ? 'Tarde'
                            : 'Puntual'
                          : 'Ausente'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {personalFiltrado.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-text">
              No se encontraron empleados
            </p>

            <p className="text-sm text-text-muted mt-1">
              Intenta cambiar los filtros
              aplicados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}