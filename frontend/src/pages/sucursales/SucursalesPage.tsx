import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, Phone, Clock, Power, Building2, Eye, UserCircle, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { sucursalesService } from '../../services/sucursales.service';
import { usuariosService } from '../../services/usuarios.service';
import { useVistaAdministradorStore } from '../../store/vistaAdministradorStore';
import type { Sucursal } from '../../types';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

interface FormState {
  nombre: string;
  direccion: string;
  telefono: string;
  diasOperacion: string[];
  horarioApertura: string;
  horarioCierre: string;
}

const DIAS_OPERACION = [
  { value: 'LUN', label: 'Lun' },
  { value: 'MAR', label: 'Mar' },
  { value: 'MIE', label: 'Mié' },
  { value: 'JUE', label: 'Jue' },
  { value: 'VIE', label: 'Vie' },
  { value: 'SAB', label: 'Sáb' },
  { value: 'DOM', label: 'Dom' },
];

const MOSTRAR_ELIMINAR_SUCURSAL = false;

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

const formatDiasOperacionTexto = (value?: string) => {
  const dias = parseDiasOperacion(value);

  if (dias.length === 0) return 'Sin días configurados';

  const labels = DIAS_OPERACION
    .filter((dia) => dias.includes(dia.value))
    .map((dia) => dia.label);

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

const emptyForm: FormState = {
  nombre: '',
  direccion: '',
  telefono: '',
  diasOperacion: ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'],
  horarioApertura: '08:00',
  horarioCierre: '22:00',
};

export default function SucursalesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { entrarVistaAdministrador } = useVistaAdministradorStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Sucursal | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'TODAS' | 'ABIERTAS' | 'CERRADAS'>('TODAS');

  const { data: sucursales = [], isLoading } = useQuery({
    queryKey: ['sucursales'],
    queryFn: sucursalesService.getAll,
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios', 'sucursales-staff'],
    queryFn: () => usuariosService.getAll(),
  });

  const sucursalesFiltradas = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return sucursales.filter((sucursal) => {
      const matchesSearch =
        !search ||
        sucursal.nombre.toLowerCase().includes(search);

      const matchesEstado =
        estadoFilter === 'TODAS' ||
        (estadoFilter === 'ABIERTAS' && sucursal.abierto) ||
        (estadoFilter === 'CERRADAS' && !sucursal.abierto);

      return matchesSearch && matchesEstado;
    });
  }, [sucursales, searchTerm, estadoFilter]);

  const hayFiltrosActivos = searchTerm.trim() !== '' || estadoFilter !== 'TODAS';

  const limpiarFiltros = () => {
    setSearchTerm('');
    setEstadoFilter('TODAS');
  };

  const crear = useMutation({
    mutationFn: () => sucursalesService.create({
      nombre: normalizarTextoFinal(form.nombre),
      direccion: normalizarTextoFinal(form.direccion),
      telefono: form.telefono.trim(),
      horarioApertura: form.horarioApertura,
      horarioCierre: form.horarioCierre,
      diasOperacion: formatDiasOperacion(form.diasOperacion),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sucursales'] });
      toast.success('Sucursal creada');
      closeModal();
    },
    onError: () => toast.error('Error al crear sucursal'),
  });

  const actualizar = useMutation({
    mutationFn: () => sucursalesService.update(editing!.id, {
      nombre: normalizarTextoFinal(form.nombre),
      direccion: normalizarTextoFinal(form.direccion),
      telefono: form.telefono.trim(),
      horarioApertura: form.horarioApertura,
      horarioCierre: form.horarioCierre,
      diasOperacion: formatDiasOperacion(form.diasOperacion),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sucursales'] });
      toast.success('Sucursal actualizada');
      closeModal();
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const toggle = useMutation({
    mutationFn: (id: string) => sucursalesService.toggle(id),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['sucursales'] }); toast.success(data.mensaje); },
    onError: () => toast.error('Error al cambiar estado'),
  });

  
  const eliminar = useMutation({
    mutationFn: (id: string) => sucursalesService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sucursales'] }); toast.success('Sucursal eliminada'); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Error al eliminar'),
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (s: Sucursal) => {
    setEditing(s);
    setForm({
      nombre: s.nombre,
      direccion: s.direccion ?? '',
      telefono: s.telefono ?? '',
      diasOperacion: parseDiasOperacion(s.diasOperacion),
      horarioApertura: s.horarioApertura ?? '08:00',
      horarioCierre: s.horarioCierre ?? '22:00',
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm); };

  const handleChange = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));
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

    editing ? actualizar.mutate() : crear.mutate();
  };

  const getAdministradorLabel = (sucursalId: string) => {
    const administradores = usuarios.filter((usuario) => {
      const usuarioSucursalId = usuario.sucursalId ?? usuario.sucursal?.id;
      return usuarioSucursalId === sucursalId && usuario.rol === 'ADMIN';
    });

    if (administradores.length === 0) return 'Sin administrador';
    if (administradores.length === 1) return administradores[0].nombre;

    return `${administradores.length} administradores`;
  };

  const handleVistaAdministrador = (sucursal: Sucursal) => {
    entrarVistaAdministrador({
      id: sucursal.id,
      nombre: sucursal.nombre,
    });

    navigate('/dashboard');
  };
  
  const handleToggleSucursal = async (sucursal: Sucursal) => {
    const estaAbierta = sucursal.abierto;

    const resultado = await Swal.fire({
      title: estaAbierta ? '¿Cerrar local?' : '¿Abrir local?',
      text: estaAbierta
        ? `Los meseros y cocineros ya no podrán operar en "${sucursal.nombre}".`
        : `Los usuarios asignados podrán iniciar sesión y operar en "${sucursal.nombre}".`,
      icon: estaAbierta ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: estaAbierta ? 'Sí, cerrar local' : 'Sí, abrir local',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: estaAbierta ? '#dc2626' : '#16a34a',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    });

    if (!resultado.isConfirmed) return;

    toggle.mutate(sucursal.id);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Mis sucursales</h2>
          <p className="text-sm text-text-muted">
            {sucursales.length} sucursal{sucursales.length !== 1 ? 'es' : ''} registrada{sucursales.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openNew}><Plus size={16} /> Nueva sucursal</Button>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label htmlFor="buscar-sucursal" className="text-sm font-medium text-text block mb-1">
              Buscar por nombre
            </label>
            <input
              id="buscar-sucursal"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ej: Local Centro"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="estado-sucursal" className="text-sm font-medium text-text block mb-1">
              Estado
            </label>
            <select
              id="estado-sucursal"
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value as 'TODAS' | 'ABIERTAS' | 'CERRADAS')}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="TODAS">Todas</option>
              <option value="ABIERTAS">Abiertas</option>
              <option value="CERRADAS">Cerradas</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-text-muted">
            Mostrando{' '}
            <span className="font-semibold text-text">{sucursalesFiltradas.length}</span>
            {' '}de{' '}
            <span className="font-semibold text-text">{sucursales.length}</span>
            {' '}sucursales
          </p>

          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="self-start sm:self-auto px-4 py-2 rounded-lg text-sm font-semibold bg-green-700 text-white hover:bg-green-800 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse h-48" />)}
        </div>
      ) : sucursales.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Building2 size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No tienes sucursales aún</p>
          <p className="text-sm mt-1">Crea tu primera sucursal para comenzar</p>
        </div>
      ) : sucursalesFiltradas.length === 0 ? (
        <div className="text-center py-16 text-text-muted bg-white rounded-xl border border-border">
          <Building2 size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No se encontraron sucursales</p>
          <p className="text-sm mt-1">
            Intenta cambiar el nombre buscado o el estado seleccionado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sucursalesFiltradas.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-border shadow-card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Building2 size={20} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-semibold text-text truncate">{s.nombre}</h3>
                    <Badge variant={s.abierto ? 'success' : 'neutral'} className="mt-1">
                      {s.abierto ? '● Abierto' : '○ Cerrado'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-text-muted">
                {s.direccion && (
                  <p className="flex items-center gap-2">
                    <MapPin size={14} className="flex-shrink-0" />
                    <span className="truncate">{s.direccion}</span>
                  </p>
                )}

                {s.telefono && (
                  <p className="flex items-center gap-2">
                    <Phone size={14} className="flex-shrink-0" />
                    <span>{s.telefono}</span>
                  </p>
                )}

                {s.horarioApertura && (
                  <p className="flex items-center gap-2">
                    <Clock size={14} className="flex-shrink-0" />
                    <span>
                      {s.horarioApertura} – {s.horarioCierre}
                      {s.diasOperacion && (
                        <span className="ml-1 text-xs">
                          ({formatDiasOperacionTexto(s.diasOperacion)})
                        </span>
                      )}
                    </span>
                  </p>
                )}

                <p className="flex items-center gap-2">
                  <UserCircle size={14} className="flex-shrink-0" />
                  <span className="truncate">
                    Administrador: {getAdministradorLabel(s.id)}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border mt-auto">
                <button
                  type="button"
                  onClick={() => handleToggleSucursal(s)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    s.abierto
                      ? 'bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700'
                      : 'bg-green-700 text-white hover:bg-green-800 focus-visible:outline-green-700'
                  }`}
                >
                  <Power size={14} aria-hidden="true" />
                  {s.abierto ? 'Cerrar local' : 'Abrir local'}
                </button>

                <button
                  type="button"
                  onClick={() => handleVistaAdministrador(s)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold bg-emerald-50 text-green-700 hover:bg-emerald-100 transition-colors"
                >
                  Vista administrador
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/sucursales/${s.id}`)}
                  className="p-2 rounded-lg hover:bg-green-50 text-primary hover:text-primary-dark transition-colors"
                  title="Ver información"
                >
                  <Eye size={16} />
                </button>

                {MOSTRAR_ELIMINAR_SUCURSAL && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Eliminar la sucursal "${s.nombre}"? Esta acción puede borrar información relacionada.`)) {
                        eliminar.mutate(s.id);
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 text-text-muted hover:text-error transition-colors"
                    title="Eliminar sucursal"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto">
          <div className="min-h-full flex items-start sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
              <h3 className="font-semibold text-text text-lg mb-5">{editing ? 'Editar sucursal' : 'Nueva sucursal'}</h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="sucursal-nombre" className="text-sm font-medium text-text block mb-1">Nombre *</label>
                  <input
                    id="sucursal-nombre"
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
                  <label htmlFor="sucursal-direccion" className="text-sm font-medium text-text block mb-1">Dirección</label>
                  <input
                    id="sucursal-direccion"
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
                  <label htmlFor="sucursal-telefono" className="text-sm font-medium text-text block mb-1">Teléfono</label>
                  <input
                    id="sucursal-telefono"
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

                <fieldset>
                  <legend className="text-sm font-medium text-text block mb-2">
                    Días de operación *
                  </legend>

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
                              ? 'border-green-700 bg-green-700 text-white'
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
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="sucursal-apertura" className="text-sm font-medium text-text block mb-1">Apertura</label>
                      <input
                        type="time"
                        id="sucursal-apertura"
                        value={form.horarioApertura}
                        onChange={(e) => handleChange('horarioApertura', e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label htmlFor="sucursal-cierre" className="text-sm font-medium text-text block mb-1">Cierre</label>
                      <input
                        id="sucursal-cierre"
                        type="time"
                        value={form.horarioCierre}
                        onChange={(e) => handleChange('horarioCierre', e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>Cancelar</Button>
                  <Button type="submit" className="flex-1" loading={crear.isPending || actualizar.isPending}>
                    {editing ? 'Guardar cambios' : 'Crear sucursal'}
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
