import { api } from './api';
import type { Usuario } from '../types';

export const usuariosService = {
  getAll: async (sucursalId?: string): Promise<Usuario[]> => {
    const { data } = await api.get('/usuarios', { params: { sucursalId } });
    return data;
  },
  create: async (payload: {
    nombre: string;
    email: string;
    password: string;
    rol: string;
    sucursalId?: string;
    activo?: boolean;
  }): Promise<Usuario> => {
    const { data } = await api.post('/usuarios', payload);
    return data;
  },
  update: async (id: string, payload: {
    nombre?: string;
    email?: string;
    rol?: string;
    activo?: boolean;
    sucursalId?: string;
    password?: string;
  }): Promise<Usuario> => {
    const { data } = await api.patch(`/usuarios/${id}`, payload);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/usuarios/${id}`);
  },
};
