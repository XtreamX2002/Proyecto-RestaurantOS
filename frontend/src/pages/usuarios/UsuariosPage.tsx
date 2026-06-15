import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, UserCircle, Pencil, KeyRound, Eye } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { usuariosService } from '../../services/usuarios.service';
import { sucursalesService } from '../../services/sucursales.service';
import { useAuthStore } from '../../store/authStore';
import { useVistaAdministradorStore } from '../../store/vistaAdministradorStore';
import type { Usuario } from '../../types';
import toast from 'react-hot-toast';

type Rol = 'ADMIN' | 'MESERO' | 'COCINERO';

interface FormState {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  sucursalId: string;
  activo: boolean;
}

const emptyForm: FormState = {
  nombre: '', email: '', password: '', rol: 'MESERO', sucursalId: '', activo: true,
};

const ROL_LABELS: Record<Rol, string> = {
  ADMIN: 'Administrador',
  MESERO: 'Mesero',
  COCINERO: 'Cocinero',
};

const ROL_VARIANTS: Record<Rol, 'success' | 'warning' | 'info'> = {
  ADMIN: 'success',
  MESERO: 'info',
  COCINERO: 'warning',
};

const getInitials = (name: string) => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
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

export default function UsuariosPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const {
    activo: vistaAdministradorActiva,
    sucursalActivaId,
    sucursalActivaNombre,
  } = useVistaAdministradorStore();

  const isDueno = user?.rol === 'DUENO';
  const isAdmin = user?.rol === 'ADMIN';

  const isDuenoEnVistaAdministrador =
    isDueno && vistaAdministradorActiva && Boolean(sucursalActivaId);

  const canViewSucursal = isDueno || isAdmin;
  const canEditSucursal = isDueno && !isDuenoEnVistaAdministrador;
  const canManageRoles = isDueno;
  const canAssignAdminRole = isDueno;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isModalEditing, setIsModalEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [rolFilter, setRolFilter] = useState('TODOS');
  const [estadoFilter, setEstadoFilter] = useState('TODOS');
  const [sucursalFilter, setSucursalFilter] = useState('TODAS');


  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios', user?.rol, user?.sucursalId ?? 'all'],
    queryFn: () => usuariosService.getAll(),
    enabled: Boolean(user),
  });

  const usuariosVisibles = useMemo(() => {
    return usuarios.filter((usuario) => usuario.rol !== 'DUENO');
  }, [usuarios]);

  const usuariosFiltrados = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return usuariosVisibles.filter((usuario) => {
        const usuarioSucursalId = usuario.sucursalId ?? usuario.sucursal?.id;

      const matchesSearch =
        !search ||
        usuario.nombre.toLowerCase().includes(search) ||
        usuario.email.toLowerCase().includes(search);

      const matchesRol =
        rolFilter === 'TODOS' ||
        usuario.rol === rolFilter;

      const matchesEstado =
        estadoFilter === 'TODOS' ||
        (estadoFilter === 'ACTIVO' && usuario.activo) ||
        (estadoFilter === 'INACTIVO' && !usuario.activo);

      const matchesSucursal =
        isDuenoEnVistaAdministrador
          ? usuarioSucursalId === sucursalActivaId
          : !isDueno ||
            sucursalFilter === 'TODAS' ||
            usuarioSucursalId === sucursalFilter;

      return matchesSearch && matchesRol && matchesEstado && matchesSucursal;
    });
  }, [usuariosVisibles, searchTerm, rolFilter, estadoFilter, sucursalFilter, isDueno, isDuenoEnVistaAdministrador, sucursalActivaId]);

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales'],
    queryFn: sucursalesService.getAll,
    enabled: isDueno,
  });

  const sucursalesDisponibles = useMemo(() => {
    if (user?.rol === 'ADMIN') {
      return sucursales
        .filter((s) => s.id === user.sucursalId)
        .map((sucursal) => ({
          id: sucursal.id,
          nombre: sucursal.nombre,
        }));
    }

    return sucursales.map((sucursal) => ({
      id: sucursal.id,
      nombre: sucursal.nombre,
    }));
  }, [sucursales, user]);

  const crear = useMutation({
    mutationFn: () =>
      usuariosService.create({
        nombre: form.nombre.trim().replace(/\s+/g, ' '),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        rol: canAssignAdminRole ? form.rol : 'MESERO',
        sucursalId: form.sucursalId || undefined,
        activo: form.activo,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario creado');
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Error al crear usuario'),
  });

  const actualizar = useMutation({
    mutationFn: () => usuariosService.update(editing!.id, {
      nombre: form.nombre.trim().replace(/\s+/g, ' '),
      email: form.email.trim().toLowerCase(),
      ...(isDueno
        ? { rol: form.rol }
        : isAdmin
          ? {
            rol:
              form.rol === 'MESERO' || form.rol === 'COCINERO'
                ? form.rol
                : editing?.rol,
          }
          : {}),
      activo: form.activo,
      sucursalId: form.sucursalId || undefined,
      ...(form.password ? { password: form.password } : {}),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario actualizado');
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Error al actualizar'),
  });

  /*const eliminar = useMutation({
    mutationFn: (id: string) => usuariosService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios', user?.sucursalId ?? 'all'] });
      toast.success('Usuario eliminado');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Error al eliminar'),
  });*/

  const openNew = () => {
    setEditing(null);
    setIsModalEditing(true);
    setForm({
      ...emptyForm,
      sucursalId: isDuenoEnVistaAdministrador 
        ? sucursalActivaId ?? ''
        : isDueno ? '' : user?.sucursalId ?? '',
    });
    setShowModal(true);
  };

  const openEdit = (u: Usuario) => {
    setEditing(u);
    setIsModalEditing(true);
    setForm({
      nombre: u.nombre,
      email: u.email,
      password: '',
      rol: u.rol as Rol,
      sucursalId: u.sucursalId ?? u.sucursal?.id ?? '',
      activo: u.activo,
    });
    setShowModal(true);
  };

  const openView = (u: Usuario) => {
    setEditing(u);
    setIsModalEditing(false);
    setForm({
      nombre: u.nombre,
      email: u.email,
      password: '',
      rol: u.rol as Rol,
      sucursalId: u.sucursalId ?? u.sucursal?.id ?? '',
      activo: u.activo,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setIsModalEditing(false);
    setForm(emptyForm);
  };
  const handleChange = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nombre = form.nombre.trim().replace(/\s+/g, ' ');
    const email = form.email.trim().toLowerCase();
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const nombreValido = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/.test(nombre);

    if (nombre.length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres');
      return;
    }

    if (nombre.length > 80) {
      toast.error('El nombre no debe superar 80 caracteres');
      return;
    }

    if (!nombreValido) {
      toast.error('El nombre solo debe contener letras y espacios');
      return;
    }

    if (email.length > 254) {
      toast.error('El email no debe superar 254 caracteres');
      return;
    }

    if (!emailValido) {
      toast.error('Ingresa un email válido');
      return;
    }

    if (!editing && form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setForm((prev) => ({
      ...prev,
      nombre,
      email,
    }));

    editing ? actualizar.mutate() : crear.mutate();
  };

  const isReadOnly = Boolean(editing && !isModalEditing);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">
            {isDuenoEnVistaAdministrador ? 'Personal' : 'Usuarios'}
          </h2>

          <p className="text-sm text-text-muted">
            {isDuenoEnVistaAdministrador
              ? `Personal de ${sucursalActivaNombre}`
              : `${usuariosVisibles.length} usuario${usuariosVisibles.length !== 1 ? 's' : ''} registrado${usuariosVisibles.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={openNew}><Plus size={16} /> Nuevo usuario</Button>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl border border-border p-4 animate-pulse h-16" />)}
        </div>
      ) : usuarios.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <UserCircle size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No hay usuarios aún</p>
          <p className="text-sm mt-1">Crea el primer usuario para tu equipo</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-border shadow-card p-4 mb-4">
            <div className={`grid grid-cols-1 md:grid-cols-2 ${isDueno ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-3`}>             <div>
              <label
                htmlFor="buscar-usuario"
                className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1"
              >
                Buscar
              </label>
              <input
                id="buscar-usuario"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre o email"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

              <div>
                <label
                    htmlFor="filtro-rol-usuario"
                    className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1"
                  >
                    Rol
                  </label>
                  <select
                    id="filtro-rol-usuario"
                    value={rolFilter}
                    onChange={(e) => setRolFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                  <option value="TODOS">Todos los roles</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="MESERO">Mesero</option>
                  <option value="COCINERO">Cocinero</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="filtro-estado-usuario"
                  className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1"
                >
                  Estado
                </label>
                <select
                  id="filtro-estado-usuario"
                  value={estadoFilter}
                  onChange={(e) => setEstadoFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="ACTIVO">Activos</option>
                  <option value="INACTIVO">Inactivos</option>
                </select>
              </div>
              {isDueno && !isDuenoEnVistaAdministrador && (
                <div>
                  <label
                    htmlFor="filtro-sucursal-usuario"
                    className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1"
                  >
                    Sucursal
                  </label>
                  <select
                    id="filtro-sucursal-usuario"
                    value={sucursalFilter}
                    onChange={(e) => setSucursalFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="TODAS">Todas las sucursales</option>
                    {sucursales.map((sucursal) => (
                      <option key={sucursal.id} value={sucursal.id}>
                        {sucursal.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <p className="text-sm text-text-muted">
                Mostrando <span className="font-semibold text-text">{usuariosFiltrados.length}</span> usuario{usuariosFiltrados.length !== 1 ? 's' : ''}
              </p>

              {(searchTerm || rolFilter !== 'TODOS' || estadoFilter !== 'TODOS' || sucursalFilter !== 'TODAS') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setRolFilter('TODOS');
                    setEstadoFilter('TODOS');
                    setSucursalFilter('TODAS');
                  }}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-background border-b border-border">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wide">
                      Nombre
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wide">
                      Rol
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wide">
                      Email
                    </th>
                    {canViewSucursal && (
                      <th className="px-5 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wide">
                        Sucursal
                      </th>
                    )}
                    <th className="px-5 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wide">
                      Estado
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-text-muted uppercase tracking-wide">
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {usuariosFiltrados.map((u) => (
                    <tr key={u.id} className="hover:bg-background/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-green-800 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                            {getInitials(u.nombre)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-text truncate">{u.nombre}</p>
                            <p className="text-xs text-text-muted truncate">ID: {u.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <Badge variant={ROL_VARIANTS[u.rol as Rol] ?? 'neutral'}>
                          {ROL_LABELS[u.rol as Rol] ?? u.rol}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 text-sm text-text-muted">
                        {u.email}
                      </td>

                      {canViewSucursal && (
                        <td className="px-5 py-4 text-sm text-text-muted">
                          {u.sucursal?.nombre ?? 'Sin sucursal'}
                        </td>
                      )}

                      <td className="px-5 py-4">
                        <Badge variant={u.activo ? 'success' : 'neutral'}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg hover:bg-green-50 text-primary hover:text-primary-dark transition-colors"
                            title="Ver usuario"
                            onClick={() => openView(u)}
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {usuariosFiltrados.length === 0 && (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium text-text">No se encontraron usuarios</p>
                <p className="text-sm text-text-muted mt-1">
                  Intenta cambiar o limpiar los filtros aplicados.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto">
          <div className="min-h-full flex items-start sm:items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h3 className="font-semibold text-text text-lg">
                  {editing ? 'Información de usuario' : 'Nuevo usuario'}
                </h3>

                {editing && !isModalEditing && (
                  <button
                    type="button"
                    onClick={() => setIsModalEditing(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2 transition-colors"
                  >
                    <Pencil size={14} />
                    Editar
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="usuario-nombre" className="text-sm font-medium text-text block mb-1">Nombre *</label>
                  <input
                    id="usuario-nombre"
                    value={form.nombre}
                    onChange={(e) => {
                      const soloLetras = e.target.value
                        .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '')
                        .replace(/\s{2,}/g, ' ')
                        .slice(0, 80);

                      handleChange('nombre', soloLetras);
                    }}
                    placeholder="Juan Pérez"
                    required
                    minLength={3}
                    maxLength={80}
                    disabled={isReadOnly}
                    className={`w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${isReadOnly ? 'bg-gray-100 text-text-muted cursor-not-allowed' : 'bg-white text-text'
                      }`}
                  />
                </div>

                <div>
                  <label htmlFor="usuario-email" className="text-sm font-medium text-text block mb-1">Email *</label>
                  <input
                    id="usuario-email"
                    type="email"
                    value={form.email}
                    onChange={e => handleChange('email', e.target.value.toLowerCase())}
                    placeholder="usuario@ejemplo.com"
                    required
                    minLength={6}
                    maxLength={254}
                    disabled={isReadOnly}
                    className={`w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                      isReadOnly ? 'bg-gray-100 text-text-muted cursor-not-allowed' : 'bg-white text-text'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor="usuario-password" className="text-sm font-medium text-text block mb-1">
                    {editing ? (
                      <span className="flex items-center gap-1.5"><KeyRound size={13} /> Nueva contraseña (dejar vacío para no cambiar)</span>
                    ) : 'Contraseña *'}
                  </label>
                  <input
                    id="usuario-password"
                    type="password"
                    value={form.password}
                    onChange={e => handleChange('password', e.target.value)}
                    placeholder={editing ? '******' : 'Mínimo 6 caracteres'}
                    required={!editing}
                    minLength={editing ? undefined : 6}
                    disabled={isReadOnly}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="usuario-rol" className="text-sm font-medium text-text block mb-1">Rol *</label>

                  <select
                    id="usuario-rol"
                    value={form.rol}
                    onChange={e => handleChange('rol', e.target.value)}
                    disabled={isReadOnly}
                    className={`w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${isReadOnly
                      ? 'bg-gray-100 text-text-muted cursor-not-allowed'
                      : 'bg-white text-text'
                      }`}
                  >
                    {isDueno && (
                      <option value="ADMIN">Administrador</option>
                    )}

                    <option value="MESERO">Mesero</option>
                    <option value="COCINERO">Cocinero</option>
                  </select>
                </div>

                {canViewSucursal && (
                  <div>
                    <label htmlFor="usuario-sucursal" className="text-sm font-medium text-text block mb-1">
                      Sucursal *
                    </label>

                    {canEditSucursal && !isReadOnly ? (
                      <select
                        id="usuario-sucursal"
                        value={form.sucursalId}
                        onChange={(e) => handleChange('sucursalId', e.target.value)}
                        required
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Selecciona una sucursal</option>

                        {sucursalesDisponibles.map((sucursal) => (
                          <option key={sucursal.id} value={sucursal.id}>
                            {sucursal.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="usuario-sucursal"
                        value={
                          editing?.sucursal?.nombre ||
                          sucursales.find((s) => s.id === form.sucursalId)?.nombre ||
                          user?.sucursal?.nombre ||
                          'Sin sucursal'
                        }
                        disabled
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-gray-100 text-text-muted cursor-not-allowed"
                      />
                    )}
                  </div>
                )}

                {editing && (
                  <div>
                    <label htmlFor="usuario-creado-en" className="text-sm font-medium text-text block mb-1">Fecha de creación</label>
                    <input
                      id="usuario-creado-en"
                      value={formatDate(editing.creadoEn)}
                      disabled
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-gray-100 text-text-muted cursor-not-allowed"
                    />
                  </div>
                )}

                <fieldset className="border-t border-border pt-4 mt-4">
                  <legend className="text-sm font-medium text-text block mb-2">
                    Estado del usuario
                  </legend>

                  <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3 bg-background/40">
                    <div>
                      <p className="text-sm font-medium text-text">
                        {form.activo ? 'Usuario activo' : 'Usuario inactivo'}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {form.activo
                          ? 'Puede iniciar sesión y operar en el sistema.'
                          : 'No puede iniciar sesión ni operar en el sistema.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => setForm(prev => ({ ...prev, activo: !prev.activo }))}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${form.activo
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                        } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : 'hover:brightness-95'}`}
                    >
                      {form.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                </fieldset>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>
                    {isReadOnly ? 'Cerrar' : 'Cancelar'}
                  </Button>

                  {!isReadOnly && (
                    <Button type="submit" className="flex-1" loading={crear.isPending || actualizar.isPending}>
                      {editing ? 'Guardar cambios' : 'Crear usuario'}
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}