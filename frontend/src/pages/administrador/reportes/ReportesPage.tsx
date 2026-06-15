import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Download,
  DollarSign,
  ClipboardList,
} from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';

interface VentaDia {
  dia: string;
  monto: number;
}

interface PedidoDia {
  dia: string;
  pedidos: number;
}

interface Mesero {
  nombre: string;
  pedidos: number;
}

interface MeseroSelect {
  id: string;
  nombre: string;
}

interface ReportesResponse {
  totalVentas: number;
  cantidadPedidos: number;
  ventasPorDia: VentaDia[];
  pedidosPorDia: PedidoDia[];
  rendimientoMeseros: Mesero[];
  meseros: MeseroSelect[];
}

export default function ReportesPage() {
  const hoy = new Date().toISOString().split('T')[0];

  const hace7Dias = new Date();
  hace7Dias.setDate(hace7Dias.getDate() - 6);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const [filtroRapido, setFiltroRapido] = useState<
    'HOY' | 'SEMANA' | 'MES' | 'PERSONALIZADO'
  >('SEMANA');

  const [desde, setDesde] = useState(formatDate(hace7Dias));
  const [hasta, setHasta] = useState(hoy);
  const [meseroId, setMeseroId] = useState('');

  const fetchReportes = async (): Promise<ReportesResponse> => {
    const params = new URLSearchParams();

    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);
    if (meseroId) params.append('meseroId', meseroId);

    const { data } = await api.get<ReportesResponse>(
      `/reportes?${params.toString()}`
    );

    return data;
  };

  const { data, isLoading } = useQuery({
    queryKey: ['reportes', desde, hasta, meseroId],
    queryFn: fetchReportes,
  });

  const ventasData = data?.ventasPorDia ?? [];
  const pedidosData = data?.pedidosPorDia ?? [];
  const meserosData = data?.rendimientoMeseros ?? [];
  const meseros = data?.meseros ?? [];

  const totalVentas = data?.totalVentas ?? 0;
  const cantidadPedidos = data?.cantidadPedidos ?? 0;

  const maxVenta = useMemo(
    () => Math.max(...ventasData.map((v) => v.monto), 1),
    [ventasData]
  );

  const maxPedidos = useMemo(
    () => Math.max(...pedidosData.map((p) => p.pedidos), 1),
    [pedidosData]
  );

  const maxMeseros = useMemo(
    () => Math.max(...meserosData.map((m) => m.pedidos), 1),
    [meserosData]
  );

  const exportarExcel = async () => {
    try {
      const params = new URLSearchParams();

      if (desde) params.append('desde', desde);
      if (hasta) params.append('hasta', hasta);
      if (meseroId) params.append('meseroId', meseroId);

      const response = await api.get(
        `/reportes/exportar?${params.toString()}`,
        {
          responseType: 'blob',
        }
      );

      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const a = document.createElement('a');

      a.href = url;
      a.download = `reporte-${desde}-${hasta}.xlsx`;

      document.body.appendChild(a);

      a.click();

      a.remove();

      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error(error);
    }
  };

  const aplicarFiltroRapido = (tipo: 'HOY' | 'SEMANA' | 'MES') => {
    const hoyDate = new Date();

    if (tipo === 'HOY') {
      const f = formatDate(hoyDate);
      setDesde(f);
      setHasta(f);
    }

    if (tipo === 'SEMANA') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setDesde(formatDate(d));
      setHasta(formatDate(hoyDate));
    }

    if (tipo === 'MES') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setDesde(formatDate(d));
      setHasta(formatDate(hoyDate));
    }

    setFiltroRapido(tipo);
  };

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text">
            Reportes
          </h1>

          <p className="text-text-muted mt-1">
            Visualiza estadísticas del restaurante
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => aplicarFiltroRapido('HOY')}
              className={`px-4 py-2 rounded-xl border transition-all ${filtroRapido === 'HOY'
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-border text-text'
                }`}
            >
              Hoy
            </button>

            <button
              onClick={() => aplicarFiltroRapido('SEMANA')}
              className={`px-4 py-2 rounded-xl border transition-all ${filtroRapido === 'SEMANA'
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-border text-text'
                }`}
            >
              Últimos 7 días
            </button>

            <button
              onClick={() => aplicarFiltroRapido('MES')}
              className={`px-4 py-2 rounded-xl border transition-all ${filtroRapido === 'MES'
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-border text-text'
                }`}
            >
              Últimos 30 días
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Desde
              </label>

              <div className="relative">
                <CalendarDays
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="date"
                  value={desde}
                  max={hasta || undefined}
                  onChange={(e) => {
                    const value = e.target.value;

                    setDesde(value);

                    if (hasta && value > hasta) {
                      setHasta(value);
                    }

                    setFiltroRapido('PERSONALIZADO');
                  }}
                  className="bg-white border border-border rounded-xl pl-11 pr-4 py-3 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Hasta
              </label>

              <div className="relative">
                <CalendarDays
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="date"
                  value={hasta}
                  min={desde || undefined}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (desde && value < desde) {
                      return;
                    }

                    setHasta(value);

                    setFiltroRapido('PERSONALIZADO');
                  }}
                  className="bg-white border border-border rounded-xl pl-11 pr-4 py-3 outline-none"
                />
              </div>
            </div>

            <button
              onClick={exportarExcel}
              className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <Download size={18} />
              Exportar Excel
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-text-muted text-sm mb-2">
                Total de ventas
              </p>

              <h2 className="text-4xl font-bold text-text">
                {isLoading
                  ? '...'
                  : `S/ ${totalVentas.toLocaleString('es-PE')}`}
              </h2>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
              <DollarSign
                size={24}
                className="text-green-600"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-text-muted text-sm mb-2">
                Cantidad de pedidos
              </p>

              <h2 className="text-4xl font-bold text-text">
                {isLoading ? '...' : cantidadPedidos}
              </h2>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
              <ClipboardList
                size={24}
                className="text-blue-600"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-1">
            Ventas por día
          </h3>

          <p className="text-sm text-text-muted mb-6">
            Ingresos generados diariamente
          </p>

          <div className="space-y-4">
            {ventasData.map((item) => (
              <div key={item.dia}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.dia}</span>

                  <span>
                    S/ {item.monto.toLocaleString('es-PE')}
                  </span>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full"
                    style={{
                      width: `${(item.monto / maxVenta) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold mb-1">
            Pedidos por día
          </h3>

          <p className="text-sm text-text-muted mb-6">
            Cantidad de pedidos diarios
          </p>

          <div className="space-y-4">
            {pedidosData.map((item) => (
              <div key={item.dia}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.dia}</span>

                  <span>
                    {item.pedidos} pedidos
                  </span>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{
                      width: `${(item.pedidos / maxPedidos) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold">
              Rendimiento de meseros
            </h3>

            <p className="text-sm text-text-muted">
              Pedidos atendidos por mesero
            </p>
          </div>

          <select
            value={meseroId}
            onChange={(e) => setMeseroId(e.target.value)}
            className="bg-background border border-border rounded-xl px-4 py-3 outline-none"
          >
            <option value="">
              Todos los meseros
            </option>

            {meseros.map((mesero) => (
              <option
                key={mesero.id}
                value={mesero.id}
              >
                {mesero.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-5">
          {meserosData.map((mesero) => (
            <div key={mesero.nombre}>
              <div className="flex justify-between text-sm mb-1">
                <span>{mesero.nombre}</span>

                <span>
                  {mesero.pedidos} pedidos
                </span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                <div
                  className="bg-orange-500 h-full rounded-full"
                  style={{
                    width: `${(mesero.pedidos / maxMeseros) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}