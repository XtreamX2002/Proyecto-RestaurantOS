import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface VistaAdministradorState {
  activo: boolean;
  sucursalActivaId: string | null;
  sucursalActivaNombre: string | null;

  entrarVistaAdministrador: (sucursal: { id: string; nombre: string }) => void;
  salirVistaAdministrador: () => void;
}

export const useVistaAdministradorStore = create<VistaAdministradorState>()(
  persist(
    (set) => ({
      activo: false,
      sucursalActivaId: null,
      sucursalActivaNombre: null,

      entrarVistaAdministrador: (sucursal) =>
        set({
          activo: true,
          sucursalActivaId: sucursal.id,
          sucursalActivaNombre: sucursal.nombre,
        }),

      salirVistaAdministrador: () =>
        set({
          activo: false,
          sucursalActivaId: null,
          sucursalActivaNombre: null,
        }),
    }),
    {
      name: 'restaurantos-vista-administrador',
    }
  )
);