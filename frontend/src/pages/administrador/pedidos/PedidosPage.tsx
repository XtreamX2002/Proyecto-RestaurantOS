import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Eye,
  X,
  Printer,
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { useVistaAdministradorStore } from '../../../store/vistaAdministradorStore';

interface ProductoPedido {
  nombre: string;
  cantidad: number;
  precio: number;
}

interface Pedido {
  id: number;
  pedidoId: string;
  mesa: number;
  estado: 'PENDIENTE' | 'LISTO' | 'PAGADO' | 'CANCELADO';
  usuario: string;
  productos: ProductoPedido[];
  total: number;
  creadoEn: string;
  actualizadoEn: string;
}

export default function PedidosPage() {
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

  const [loading, setLoading] =
    useState(true);

  const [busqueda, setBusqueda] =
    useState('');

  const [filtro, setFiltro] =
    useState('TODOS');

  const [pedidos, setPedidos] =
    useState<Pedido[]>([]);

  const [
    pedidoSeleccionado,
    setPedidoSeleccionado,
  ] = useState<Pedido | null>(null);

  const [modalDetalle, setModalDetalle] =
    useState(false);

  const fetchPedidos = async (mostrarLoading = false) => {
    try {
      if (mostrarLoading) setLoading(true);

      const params: Record<string, string> = {};

      if (busqueda) {
        params.busqueda = busqueda;
      }

      if (filtro !== 'TODOS') {
        params.estado = filtro;
      }

      if (isDuenoEnVistaAdministrador && sucursalIdOperativa) {
        params.sucursalId = sucursalIdOperativa;
      }

      const { data } = await api.get<Pedido[]>('/pedidos', {
        params,
      });

      setPedidos(Array.isArray(data) ? data : []);

    } catch (error: any) {
      console.error(
        'Error cargando pedidos:',
        error.response?.data || error.message
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cargarPedidos = () => {
      fetchPedidos();
    };

    cargarPedidos();

    const interval = setInterval(() => {
      cargarPedidos();
    }, 2000);

    return () => clearInterval(interval);

  }, [busqueda, filtro, sucursalIdOperativa]);

  const calcularTotal = (
    productos: ProductoPedido[]
  ) => {
    return productos.reduce(
      (acc, item) =>
        acc +
        item.precio *
        item.cantidad,
      0
    );
  };

  const pedidosFiltrados = useMemo(() => {
    return [...pedidos].sort((a, b) => {
      return (
        new Date(b.actualizadoEn).getTime() -
        new Date(a.actualizadoEn).getTime()
      );
    });
  }, [pedidos]);

  const imprimirPedido = () => {
    if (!pedidoSeleccionado) return;

    const total = calcularTotal(
      pedidoSeleccionado.productos
    ).toFixed(2);

    const fecha = new Date(pedidoSeleccionado.creadoEn)
      .toLocaleString('es-PE', {
        timeZone: 'America/Lima',
      });

    const productosHTML =
      pedidoSeleccionado.productos
        .map(
          (p) => `
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px">
          <div>
            <div style="font-weight:600">
              ${p.nombre}
            </div>

            <div style="color:#666">
              ${p.cantidad} x S/ ${p.precio.toFixed(2)}
            </div>
          </div>

          <div style="font-weight:600">
            S/ ${(p.precio * p.cantidad).toFixed(2)}
          </div>
        </div>
      `
        )
        .join('');

    const ventana = window.open(
      '',
      '_blank',
      'width=420,height=700'
    );

    if (!ventana) return;

    ventana.document.write(`
    <html>
      <head>
        <title>Boleta Pedido #${pedidoSeleccionado.id}</title>

        <style>
          body{
            font-family: Arial, sans-serif;
            padding:20px;
            color:#111;
          }

          .ticket{
            max-width:340px;
            margin:auto;
          }

          .center{
            text-align:center;
          }

          .title{
            font-size:22px;
            font-weight:bold;
            margin-bottom:4px;
          }

          .subtitle{
            font-size:13px;
            color:#555;
          }

          .divider{
            border-top:1px dashed #999;
            margin:16px 0;
          }

          .row{
            display:flex;
            justify-content:space-between;
            margin-bottom:6px;
            font-size:14px;
          }

          .total{
            display:flex;
            justify-content:space-between;
            font-size:22px;
            font-weight:bold;
            margin-top:14px;
          }

          .footer{
            margin-top:24px;
            text-align:center;
            font-size:12px;
            color:#666;
          }

          @media print {
            body{
              padding:0;
            }

            .ticket{
              width:100%;
            }
          }
        </style>
      </head>

      <body>
        <div class="ticket">

          <div class="center">
            <div class="title">
              RESTAURANTE
            </div>

            <div class="subtitle">
              Sistema de Pedidos
            </div>
          </div>

          <div class="divider"></div>

          <div class="row">
            <span>Pedido:</span>
            <strong>#${pedidoSeleccionado.id}</strong>
          </div>

          <div class="row">
            <span>Mesa:</span>
            <strong>${pedidoSeleccionado.mesa}</strong>
          </div>

          <div class="row">
            <span>Usuario:</span>
            <strong>${pedidoSeleccionado.usuario}</strong>
          </div>

          <div class="row">
            <span>Fecha:</span>
            <strong>${fecha}</strong>
          </div>

          <div class="divider"></div>

          ${productosHTML}

          <div class="divider"></div>

          <div class="total">
            <span>TOTAL</span>
            <span>S/ ${total}</span>
          </div>

          <div class="footer">
            Gracias por su compra
          </div>

        </div>
      </body>
    </html>
  `);

    ventana.document.close();
    ventana.focus();
    ventana.print();
    ventana.close();
  };

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text">
            Pedidos
          </h1>

          <p className="text-text-muted mt-1">
            Visualiza y filtra los pedidos registrados
          </p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
        />

        <input
          type="text"
          placeholder="Buscar por mesa o # de pedido"
          value={busqueda}
          onChange={(e) =>
            setBusqueda(
              e.target.value
            )
          }
          className="w-full lg:w-[400px] bg-white border border-border rounded-2xl pl-11 pr-4 py-3 outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        {[
          'TODOS',
          'PENDIENTE',
          'PAGADO',
          'CANCELADO',
        ].map((item) => (
          <button
            key={item}
            onClick={() =>
              setFiltro(item)
            }
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors
            ${filtro === item
                ? 'bg-primary text-white'
                : 'bg-white border border-border'
              }`}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-text-muted">
          Cargando pedidos...
        </div>
      ) : pedidosFiltrados.length ===
        0 ? (
        <div className="text-center py-20 text-text-muted">
          No se encontraron pedidos
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pedidosFiltrados.map(
            (pedido) => (
              <div
                key={pedido.id}
                className="bg-white border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-2xl font-bold text-text">
                      Mesa{' '}
                      {pedido.mesa}
                    </h2>

                    <div className="flex items-center gap-2 mt-2">
                      <div
                        className={`w-3 h-3 rounded-full ${pedido.estado === 'PENDIENTE'
                          ? 'bg-yellow-400'
                          : pedido.estado === 'LISTO'
                            ? 'bg-blue-400'
                            : pedido.estado === 'PAGADO'
                              ? 'bg-green-500'
                              : 'bg-red-400'
                          }`}
                      />

                      <span
                        className={`text-sm font-medium ${pedido.estado === 'PENDIENTE'
                          ? 'text-yellow-500'
                          : pedido.estado === 'LISTO'
                            ? 'text-blue-500'
                            : pedido.estado === 'PAGADO'
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}
                      >
                        {pedido.estado === 'PENDIENTE'
                          ? 'Pendiente'
                          : pedido.estado === 'LISTO'
                            ? 'Listo'
                            : pedido.estado === 'PAGADO'
                              ? 'Pagado'
                              : 'Cancelado'}
                      </span>

                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setPedidoSeleccionado(
                        pedido
                      );

                      setModalDetalle(
                        true
                      );
                    }}
                    className="w-11 h-11 rounded-xl border border-border flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <Eye size={18} />
                  </button>
                </div>

                <div className="space-y-3 mb-5">
                  {pedido.productos.map(
                    (
                      producto,
                      index
                    ) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-text">
                          {
                            producto.cantidad
                          }
                          x{' '}
                          {
                            producto.nombre
                          }
                        </span>

                        <span className="font-medium">
                          S/{' '}
                          {(
                            producto.precio *
                            producto.cantidad
                          ).toFixed(
                            2
                          )}
                        </span>
                      </div>
                    )
                  )}
                </div>

                <div className="border-t border-border pt-4 flex items-center justify-between">
                  <span className="text-text-muted">
                    Total
                  </span>

                  <span className="text-2xl font-bold text-primary">
                    S/{' '}
                    {pedido.total.toFixed(
                      2
                    )}
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* MODAL */}
      {modalDetalle &&
        pedidoSeleccionado && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    Pedido #
                    {
                      pedidoSeleccionado.id
                    }
                  </h2>

                  <p className="text-text-muted">
                    Mesa{' '}
                    {
                      pedidoSeleccionado.mesa
                    }
                  </p>
                </div>

                <button
                  onClick={() =>
                    setModalDetalle(
                      false
                    )
                  }
                >
                  <X size={22} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-background rounded-xl p-4">
                  <p className="text-sm text-text-muted mb-1">
                    Mesa
                  </p>

                  <h3 className="font-semibold">
                    Mesa{' '}
                    {
                      pedidoSeleccionado.mesa
                    }
                  </h3>
                </div>

                <div className="bg-background rounded-xl p-4">
                  <p className="text-sm text-text-muted mb-1">
                    Usuario
                  </p>

                  <h3 className="font-semibold">
                    {
                      pedidoSeleccionado.usuario
                    }
                  </h3>
                </div>

                <div className="bg-background rounded-xl p-4">
                  <p className="text-sm text-text-muted mb-1">
                    Estado
                  </p>

                  <h3
                    className={`font-semibold ${pedidoSeleccionado.estado === 'PENDIENTE'
                      ? 'text-yellow-500'
                      : pedidoSeleccionado.estado === 'PAGADO'
                        ? 'text-sky-500'
                        : 'text-red-500'
                      }`}
                  >
                    {pedidoSeleccionado.estado}
                  </h3>
                </div>
              </div>

              <div className="border border-border rounded-2xl overflow-hidden mb-6">
                <div className="grid grid-cols-4 bg-background px-5 py-4 font-semibold text-sm">
                  <span className="col-span-2">
                    Producto
                  </span>

                  <span>
                    Cantidad
                  </span>

                  <span>
                    Precio
                  </span>
                </div>

                <div className="divide-y divide-border">
                  {pedidoSeleccionado.productos.map(
                    (
                      producto,
                      index
                    ) => (
                      <div
                        key={index}
                        className="grid grid-cols-4 px-5 py-4 text-sm"
                      >
                        <span className="col-span-2">
                          {
                            producto.nombre
                          }
                        </span>

                        <span>
                          {
                            producto.cantidad
                          }
                        </span>

                        <span>
                          S/{' '}
                          {(
                            producto.precio *
                            producto.cantidad
                          ).toFixed(
                            2
                          )}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mb-8">
                <span className="text-lg font-medium">
                  TOTAL
                </span>

                <span className="text-3xl font-bold text-primary">
                  S/{' '}
                  {pedidoSeleccionado.total.toFixed(
                    2
                  )}
                </span>
              </div>

              <div className="flex justify-end gap-3">

                {pedidoSeleccionado.estado ===
                  'PAGADO' && (
                    <button
                      onClick={imprimirPedido}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl border border-border hover:bg-background transition-colors"
                    >
                      <Printer size={18} />
                      Imprimir
                    </button>
                  )}

                <button
                  onClick={() =>
                    setModalDetalle(
                      false
                    )
                  }
                  className="px-5 py-3 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}