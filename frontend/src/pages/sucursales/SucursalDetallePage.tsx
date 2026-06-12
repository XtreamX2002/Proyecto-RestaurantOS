import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  ShoppingBag,
  Users,
  Package,
  UserCircle,
  Pencil,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { sucursalesService } from '../../services/sucursales.service';
import { usuariosService } from '../../services/usuarios.service';
import { dashboardService } from '../../services/dashboard.service';
import type { Rol } from '../../types';

const ROL_LABELS: Record<Rol, string> = {
  DUENO: 'Dueño',
  ADMIN: 'Administrador',
  MESERO: 'Mesero',
  COCINERO: 'Cocinero',
};

const DIAS_OPERACION = [
  { value: 'LUN', label: 'Lun' },
  { value: 'MAR', label: 'Mar' },
  { value: 'MIE', label: 'Mié' },
  { value: 'JUE', label: 'Jue' },
  { value: 'VIE', label: 'Vie' },
  { value: 'SAB', label: 'Sáb' },
  { value: 'DOM', label: 'Dom' },
];

interface FormState {
  nombre: string;
  direccion: string;
  telefono: string;
  diasOperacion: string[];
  horarioApertura: string;
  horarioCierre: string;
}

const parseDiasOperacion = (value?: string) => {
  if (!value) return [];

  return value
    .split(/[-,]/)
    .map((dia) => dia.trim())
    .filter(Boolean);
};

const formatDiasOperacion = (dias: string[]) => {
  return DIAS_OPERACION
    .filter((dia) => dias.includes(dia.value))
    .map((dia) => dia.value)
    .join('-');
};

const ROL_VARIANTS: Record<Rol, 'success' | 'warning' | 'info' | 'neutral'> = {
  DUENO: 'neutral',
  ADMIN: 'success',
  MESERO: 'info',
  COCINERO: 'warning',
};

const formatDate = (value?: string) => {
  if (!value) return 'Sin fecha';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';

  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDiasOperacionTexto = (value?: string) => {
  const dias = parseDiasOperacion(value);

  if (dias.length === 0) return 'Sin días configurados';

  const labels = dias
    .map((dia) => DIAS_OPERACION.find((item) => item.value === dia)?.label)
    .filter(Boolean);

  if (labels.length === 7) return 'Lunes a domingo';

  return labels.join(', ');
};

const normalizarNombreSucursal = (value: string) => {
  return value
    .toUpperCase()
    .replace(/[^A-ZÁÉÍÓÚÜÑ0-9\s.\-/'&]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 80);
};

const normalizarDireccionSucursal = (value: string) => {
  return value
    .toUpperCase()
    .replace(/[^A-ZÁÉÍÓÚÜÑ0-9\s.,\-/#]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 120);
};

const normalizarTextoFinal = (value: string) => {
  return value.trim().replace(/\s+/g, ' ');
};

const telefonoValido = (telefono: string) => {
  return /^\d{7}$/.test(telefono) || /^9\d{8}$/.test(telefono);
};

export default function SucursalDetallePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const qc = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm] = useState<FormState>({
    nombre: '',
    direccion: '',
    telefono: '',
    diasOperacion: [],
    horarioApertura: '08:00',
    horarioCierre: '22:00',});


  const { data: sucursal, isLoading } = useQuery({
    queryKey: ['sucursal', id],
    queryFn: () => sucursalesService.getById(id!),
    enabled: Boolean(id),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios', 'detalle-sucursal', id],
    queryFn: () => usuariosService.getAll(),
    enabled: Boolean(id),
  });

  const { data: dashboardSucursal } = useQuery({
    queryKey: ['dashboard-sucursal', id],
    queryFn: () => dashboardService.getSucursal(id!),
    enabled: Boolean(id),
  });

  const staffSucursal = useMemo(() => {
    return usuarios.filter((usuario) => {
      const usuarioSucursalId = usuario.sucursalId ?? usuario.sucursal?.id;
      return usuarioSucursalId === id;
    });
  }, [usuarios, id]);

  const administradores = useMemo(() => {
    return staffSucursal.filter((usuario) => usuario.rol === 'ADMIN');
  }, [staffSucursal]);

  const administradoresTooltip = administradores
    .map((admin) => admin.nombre)
    .join('\n');

  const administradorTexto =
    administradores.length === 0
      ? 'Sin administrador'
      : administradores.length === 1
        ? administradores[0].nombre
        : `${administradores.length} administradores`;

  const openEditModal = () => {
    if (!sucursal) return;

    setForm({
        nombre: sucursal.nombre,
        direccion: sucursal.direccion ?? '',
        telefono: sucursal.telefono ?? '',
        diasOperacion: parseDiasOperacion(sucursal.diasOperacion),
        horarioApertura: sucursal.horarioApertura ?? '08:00',
        horarioCierre: sucursal.horarioCierre ?? '22:00',
    });

    setShowEditModal(true);
    };

    const closeEditModal = () => {
    setShowEditModal(false);
    };

    const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    };

    const toggleDiaOperacion = (dia: string) => {
    setForm((prev) => {
        const exists = prev.diasOperacion.includes(dia);

        return {
        ...prev,
        diasOperacion: exists
            ? prev.diasOperacion.filter((item) => item !== dia)
            : [...prev.diasOperacion, dia],
        };
    });
    };

    const actualizar = useMutation({
    mutationFn: () => sucursalesService.update(id!, {
        nombre: normalizarTextoFinal(form.nombre),
        direccion: normalizarTextoFinal(form.direccion),
        telefono: form.telefono.trim(),
        horarioApertura: form.horarioApertura,
        horarioCierre: form.horarioCierre,
        diasOperacion: formatDiasOperacion(form.diasOperacion),
    }),
    onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['sucursal', id] });
        qc.invalidateQueries({ queryKey: ['sucursales'] });
        toast.success('Sucursal actualizada');
        closeEditModal();
    },
    onError: () => toast.error('Error al actualizar sucursal'),
    });

    const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nombre = normalizarTextoFinal(form.nombre);
    const direccion = normalizarTextoFinal(form.direccion);
    const telefono = form.telefono.trim();

    if (nombre.length < 3) {
        toast.error('El nombre de la sucursal debe tener al menos 3 caracteres');
        return;
    }

    if (nombre.length > 80) {
      toast.error('El nombre de la sucursal no debe superar 80 caracteres');
      return;
    }

    if (direccion.length < 5) {
      toast.error('La dirección es obligatoria y debe tener al menos 5 caracteres');
      return;
    }

    if (direccion.length > 120) {
      toast.error('La dirección no debe superar 120 caracteres');
      return;
    }

    if (!telefono) {
      toast.error('El teléfono es obligatorio');
      return;
    }

    if (!/^\d+$/.test(telefono)) {
      toast.error('El teléfono solo debe contener números');
      return;
    }

    if (!telefonoValido(telefono)) {
      toast.error('El teléfono debe tener 7 dígitos o 9 dígitos empezando en 9');
      return;
    }

    if (form.diasOperacion.length === 0) {
      toast.error('Selecciona al menos un día de operación');
      return;
    }

    if (!form.horarioApertura || !form.horarioCierre) {
      toast.error('Configura la hora de apertura y cierre');
      return;
    }

    if (form.horarioApertura >= form.horarioCierre) {
      toast.error('La hora de cierre debe ser posterior a la apertura');
      return;
    }

    actualizar.mutate();
    };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-muted">Cargando información de la sucursal...</p>
      </div>
    );
  }

  if (!sucursal) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-card p-6 text-center">
        <p className="font-semibold text-text">Sucursal no encontrada</p>
        <p className="text-sm text-text-muted mt-1">
          No se pudo cargar la información de esta sucursal.
        </p>
        <Button className="mt-4" onClick={() => navigate('/sucursales')}>
          Volver a sucursales
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('/sucursales')}
        className="inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text transition-colors"
      >
        <ArrowLeft size={16} />
        Volver a sucursales
      </button>

      <div className="bg-white rounded-xl border border-border shadow-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Building2 size={28} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-text">{sucursal.nombre}</h1>
                <Badge variant={sucursal.abierto ? 'success' : 'neutral'}>
                  {sucursal.abierto ? 'Abierto' : 'Cerrado'}
                </Badge>
              </div>

              <p className="text-sm text-text-muted mt-1">
                Información general y operativa de la sucursal.
              </p>

              <div className="flex flex-wrap gap-3 mt-4 text-sm text-text-muted">
                {sucursal.direccion && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} />
                    {sucursal.direccion}
                  </span>
                )}

                {sucursal.telefono && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={14} />
                    {sucursal.telefono}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={openEditModal}
            >
            <Pencil size={16} />
            Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="flex items-center justify-between">
                <div>
                <p className="text-sm text-text-muted">Ventas de hoy</p>
                <p className="text-2xl font-bold text-text mt-1">
                    S/ {(dashboardSucursal?.ventasHoy ?? 0).toFixed(2)}
                </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-50 text-primary flex items-center justify-center">
                <ShoppingBag size={20} />
                </div>
            </div>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="flex items-center justify-between">
                <div>
                <p className="text-sm text-text-muted">Pedidos de hoy</p>
                <p className="text-2xl font-bold text-text mt-1">
                    {dashboardSucursal?.pedidosHoy ?? 0}
                </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag size={20} />
                </div>
            </div>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="flex items-center justify-between">
                <div>
                <p className="text-sm text-text-muted">Staff total</p>
                <p className="text-2xl font-bold text-text mt-1">{staffSucursal.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Users size={20} />
                </div>
            </div>
            </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border shadow-card p-6">
          <h2 className="font-semibold text-text mb-4">Información de sucursal</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-text-muted">Nombre</span>
              <span className="font-medium text-text text-right">{sucursal.nombre}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-text-muted">Dirección</span>
              <span className="font-medium text-text text-right">
                {sucursal.direccion || 'Sin dirección'}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-text-muted">Teléfono</span>
              <span className="font-medium text-text text-right">
                {sucursal.telefono || 'Sin teléfono'}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-text-muted">
                {administradores.length > 1 ? 'Administradores' : 'Administrador'}
              </span>

              {administradores.length > 1 ? (
                <span className="relative group text-right">
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 border border-green-100">
                    {administradorTexto}
                  </span>

                  <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-56 rounded-xl border border-border bg-white p-3 text-left shadow-lg group-hover:block">
                    <p className="text-xs font-semibold text-text mb-2">
                      Administradores asignados
                    </p>

                    <div className="space-y-1">
                      {administradores.map((admin) => (
                        <p key={admin.id} className="text-xs text-text-muted">
                          {admin.nombre}
                        </p>
                      ))}
                    </div>
                  </div>
                </span>
              ) : (
                <span className="font-medium text-text text-right">
                  {administradorTexto}
                </span>
              )}
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-text-muted">Creado en</span>
              <span className="font-medium text-text text-right">
                {formatDate(sucursal.creadoEn)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-text-muted">Actualizado en</span>
              <span className="font-medium text-text text-right">
                {formatDate(sucursal.actualizadoEn)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-card p-6">
          <h2 className="font-semibold text-text mb-4">Horario de operación</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-background/60 border border-border p-4">
              <Clock size={18} className="text-primary" />
              <div>
                <p className="text-sm font-medium text-text">
                  {sucursal.horarioApertura || '--:--'} - {sucursal.horarioCierre || '--:--'}
                </p>
                <p className="text-xs text-text-muted">Horario de atención</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-background/60 border border-border p-4">
              <CalendarDays size={18} className="text-primary" />
              <div>
                <p className="text-sm font-medium text-text">
                  {formatDiasOperacionTexto(sucursal.diasOperacion)}
                </p>
                <p className="text-xs text-text-muted">Días de operación</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-text">Miembros de la sucursal</h2>
          <p className="text-sm text-text-muted mt-1">
            Personal asignado a esta sucursal. Esta sección es solo informativa.
          </p>
        </div>

        {staffSucursal.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-medium text-text">No hay personal asignado</p>
            <p className="text-sm text-text-muted mt-1">
              Esta sucursal aún no tiene usuarios vinculados.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {staffSucursal.map((usuario) => (
              <div key={usuario.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <UserCircle size={20} />
                  </div>

                  <div className="min-w-0">
                    <p className="font-medium text-text truncate">{usuario.nombre}</p>
                    <p className="text-sm text-text-muted truncate">{usuario.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={ROL_VARIANTS[usuario.rol]}>
                    {ROL_LABELS[usuario.rol]}
                  </Badge>

                  <Badge variant={usuario.activo ? 'success' : 'neutral'}>
                    {usuario.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto">
            <div className="min-h-full flex items-start sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
                <h3 className="font-semibold text-text text-lg mb-5">
                Editar sucursal
                </h3>

                <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <label className="text-sm font-medium text-text block mb-1">Nombre *</label>
                    <input
                    value={form.nombre}
                    onChange={(e) => handleChange('nombre', normalizarNombreSucursal(e.target.value))}
                    placeholder="Ej: LOCAL CENTRO"
                    required
                    minLength={3}
                    maxLength={80}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-text block mb-1">Dirección *</label>
                    <input
                    value={form.direccion}
                    onChange={(e) => handleChange('direccion', normalizarDireccionSucursal(e.target.value))}
                    placeholder="AV. PRINCIPAL 123"
                    required
                    minLength={5}
                    maxLength={120}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-text block mb-1">Teléfono *</label>
                    <input
                    value={form.telefono}
                    onChange={(e) => {
                        const onlyNumbers = e.target.value.replace(/\D/g, '').slice(0, 9);
                        handleChange('telefono', onlyNumbers);
                    }}
                    inputMode="numeric"
                    maxLength={9}
                    required
                    placeholder="987654321"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-text-muted mt-1">
                    Solo números. Usa 7 dígitos para fijo o 9 dígitos empezando en 9 para celular.
                    </p>
                </div>

                <div>
                    <label className="text-sm font-medium text-text block mb-2">
                    Días de operación *
                    </label>

                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {DIAS_OPERACION.map((dia) => {
                        const selected = form.diasOperacion.includes(dia.value);

                        return (
                        <button
                            key={dia.value}
                            type="button"
                            onClick={() => toggleDiaOperacion(dia.value)}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                            selected
                                ? 'border-primary bg-primary text-white'
                                : 'border-border bg-white text-text-muted hover:bg-gray-50'
                            }`}
                        >
                            {dia.label}
                        </button>
                        );
                    })}
                    </div>

                    <p className="text-xs text-text-muted mt-2">
                    Selecciona los días en que la sucursal atenderá.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                    <label className="text-sm font-medium text-text block mb-1">Apertura</label>
                    <input
                        type="time"
                        value={form.horarioApertura}
                        onChange={(e) => handleChange('horarioApertura', e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    </div>

                    <div>
                    <label className="text-sm font-medium text-text block mb-1">Cierre</label>
                    <input
                        type="time"
                        value={form.horarioCierre}
                        onChange={(e) => handleChange('horarioCierre', e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={closeEditModal}
                    >
                    Cancelar
                    </Button>

                    <Button
                    type="submit"
                    className="flex-1"
                    loading={actualizar.isPending}
                    >
                    Guardar cambios
                    </Button>
                </div>
                </form>
            </div>
            </div>
        </div>
        )}
    </div>
  );
}