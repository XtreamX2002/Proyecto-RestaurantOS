import { Request, Response } from 'express';
import { PrismaClient, Rol } from '@prisma/client';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();

function getFechaInicio(fecha?: string) {
  if (!fecha) {
    const hoy = new Date();
    hoy.setDate(hoy.getDate() - 6);
    hoy.setHours(0, 0, 0, 0);
    return hoy;
  }

  const date = new Date(`${fecha}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getFechaFin(fecha?: string) {
  const date = fecha ? new Date(`${fecha}T00:00:00`) : new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function formatDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function generarDiasRango(desde: Date, hasta: Date) {
  const dias: string[] = [];
  const actual = new Date(desde);
  actual.setHours(0, 0, 0, 0);

  const fin = new Date(hasta);
  fin.setHours(0, 0, 0, 0);

  while (actual <= fin) {
    dias.push(formatDateKey(actual));
    actual.setDate(actual.getDate() + 1);
  }

  return dias;
}

export async function getReporteDueno(req: Request, res: Response): Promise<void> {
  try {
    const duenoId = req.user!.userId;
    const { desde, hasta, sucursalId } = req.query;

    const fechaInicio = getFechaInicio(typeof desde === 'string' ? desde : undefined);
    const fechaFin = getFechaFin(typeof hasta === 'string' ? hasta : undefined);

    const sucursalesDueno = await prisma.sucursal.findMany({
      where: { duenoId },
      select: {
        id: true,
        nombre: true,
      },
      orderBy: { nombre: 'asc' },
    });

    const sucursalIdsPermitidas = sucursalesDueno.map((sucursal) => sucursal.id);

    if (sucursalIdsPermitidas.length === 0) {
      res.json({
        filtros: {
          desde: formatDateKey(fechaInicio),
          hasta: formatDateKey(fechaFin),
          sucursales: [],
        },
        resumen: {
          ventasTotales: 0,
          pedidosPagados: 0,
          ticketPromedio: 0,
          productoMasVendido: null,
          sucursalLider: null,
        },
        ventasPorDia: [],
        ventasPorSucursal: [],
        ventasPorMetodoPago: [],
        topProductos: [],
        detallePedidos: [],
      });
      return;
    }

    const sucursalFiltro =
      typeof sucursalId === 'string' && sucursalId.trim() !== ''
        ? sucursalId
        : undefined;

    if (sucursalFiltro && !sucursalIdsPermitidas.includes(sucursalFiltro)) {
      res.status(403).json({ error: 'No tienes acceso a esta sucursal' });
      return;
    }

    const sucursalIdsConsulta = sucursalFiltro
      ? [sucursalFiltro]
      : sucursalIdsPermitidas;

    const pedidoWhere = {
      sucursalId: { in: sucursalIdsConsulta },
      estado: 'PAGADO' as const,
      pagado: true,
      creadoEn: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    };

    const [
      ventasAggregate,
      pedidosPagados,
      pedidosBase,
      ventasPorSucursalRaw,
      ventasPorMetodoPagoRaw,
      topProductosRaw,
      detallePedidosRaw,
    ] = await Promise.all([
      prisma.pedido.aggregate({
        where: pedidoWhere,
        _sum: { total: true },
      }),

      prisma.pedido.count({
        where: pedidoWhere,
      }),

      prisma.pedido.findMany({
        where: pedidoWhere,
        select: {
          id: true,
          creadoEn: true,
          total: true,
        },
      }),

      prisma.pedido.groupBy({
        by: ['sucursalId'],
        where: pedidoWhere,
        _sum: { total: true },
        _count: { _all: true },
        orderBy: { _sum: { total: 'desc' } },
      }),

      prisma.pedido.groupBy({
        by: ['metodoPago'],
        where: pedidoWhere,
        _sum: { total: true },
        _count: { _all: true },
        orderBy: { _sum: { total: 'desc' } },
      }),

      prisma.itemPedido.groupBy({
        by: ['productoId'],
        where: {
          pedido: pedidoWhere,
        },
        _sum: {
          cantidad: true,
          subtotal: true,
        },
        orderBy: {
          _sum: {
            subtotal: 'desc',
          },
        },
        take: 10,
      }),

      prisma.pedido.findMany({
        where: pedidoWhere,
        orderBy: { creadoEn: 'desc' },
        take: 50,
        select: {
          id: true,
          numero: true,
          creadoEn: true,
          metodoPago: true,
          total: true,
          sucursal: {
            select: {
              id: true,
              nombre: true,
            },
          },
          mesero: {
            select: {
              id: true,
              nombre: true,
              rol: true,
            },
          },
        },
      }),
    ]);

    const sucursalNombrePorId = new Map(
      sucursalesDueno.map((sucursal) => [sucursal.id, sucursal.nombre])
    );

    const ventasPorDiaMap = new Map<string, { fecha: string; total: number; pedidos: number }>();

    generarDiasRango(fechaInicio, fechaFin).forEach((fecha) => {
      ventasPorDiaMap.set(fecha, {
        fecha,
        total: 0,
        pedidos: 0,
      });
    });

    pedidosBase.forEach((pedido) => {
      const fecha = formatDateKey(pedido.creadoEn);
      const actual = ventasPorDiaMap.get(fecha) ?? {
        fecha,
        total: 0,
        pedidos: 0,
      };

      actual.total += Number(pedido.total ?? 0);
      actual.pedidos += 1;

      ventasPorDiaMap.set(fecha, actual);
    });

    const ventasPorDia = Array.from(ventasPorDiaMap.values());

    const ventasPorSucursal = ventasPorSucursalRaw.map((item) => ({
      sucursalId: item.sucursalId,
      sucursal: sucursalNombrePorId.get(item.sucursalId) ?? 'Sucursal no encontrada',
      total: Number(item._sum.total ?? 0),
      pedidos: item._count._all,
    }));

    const ventasTotales = Number(ventasAggregate._sum.total ?? 0);

    const ticketPromedio =
      pedidosPagados > 0 ? ventasTotales / pedidosPagados : 0;

    const ventasPorMetodoPago = ventasPorMetodoPagoRaw.map((item) => ({
      metodoPago: item.metodoPago?.trim() || 'No registrado',
      total: Number(item._sum.total ?? 0),
      pedidos: item._count._all,
    }));

    const productosIds = topProductosRaw.map((item) => item.productoId);

    const productos = await prisma.producto.findMany({
      where: {
        id: { in: productosIds },
      },
      select: {
        id: true,
        nombre: true,
      },
    });

    const productoNombrePorId = new Map(
      productos.map((producto) => [producto.id, producto.nombre])
    );

    const topProductos = topProductosRaw.map((item) => ({
      productoId: item.productoId,
      producto: productoNombrePorId.get(item.productoId) ?? 'Producto no encontrado',
      cantidad: item._sum.cantidad ?? 0,
      total: Number(item._sum.subtotal ?? 0),
    }));

    const productoMasVendido = topProductos.length > 0 ? topProductos[0] : null;

    const sucursalLider =
      ventasPorSucursal.length > 0
        ? {
            id: ventasPorSucursal[0].sucursalId,
            nombre: ventasPorSucursal[0].sucursal,
            total: ventasPorSucursal[0].total,
          }
        : null;

    const detallePedidos = detallePedidosRaw.map((pedido) => ({
      id: pedido.id,
      numero: pedido.numero,
      fecha: pedido.creadoEn.toISOString(),
      sucursal: pedido.sucursal.nombre,
      mesero: pedido.mesero?.nombre ?? 'Sin mesero',
      metodoPago: pedido.metodoPago,
      total: Number(pedido.total ?? 0),
    }));

    res.json({
      filtros: {
        desde: formatDateKey(fechaInicio),
        hasta: formatDateKey(fechaFin),
        sucursales: sucursalesDueno,
      },
      resumen: {
        ventasTotales,
        pedidosPagados,
        ticketPromedio,
        productoMasVendido,
        sucursalLider,
      },
      ventasPorDia,
      ventasPorSucursal,
      ventasPorMetodoPago,
      topProductos,
      detallePedidos,
    });
  } catch (error) {
    console.error('Error generando reporte de dueño:', error);
    res.status(500).json({ error: 'Error generando reporte de dueño' });
  }
}

export async function getReportes(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as {
      userId: string;
      rol: Rol;
      sucursalId?: string;
    };

    const {
      desde,
      hasta,
      meseroId,
      sucursalId,
    } = req.query as {
      desde?: string;
      hasta?: string;
      meseroId?: string;
      sucursalId?: string;
    };

    const fechaInicio = desde
      ? new Date(`${desde}T00:00:00`)
      : new Date(new Date().setDate(new Date().getDate() - 6));

    const fechaFin = hasta
      ? new Date(`${hasta}T23:59:59`)
      : new Date();

    const whereBase: any = {
      pagado: true,
      creadoEn: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    };

    if (user.rol === 'ADMIN') {
      whereBase.sucursalId = user.sucursalId;
    }

    if (user.rol === 'DUENO') {
      if (sucursalId) {
        const sucursalPermitida = await prisma.sucursal.findFirst({
          where: {
            id: sucursalId,
            duenoId: user.userId,
          },
          select: {
            id: true,
          },
        });

        if (!sucursalPermitida) {
          res.status(403).json({
            message: 'No tienes acceso a esta sucursal',
          });
          return;
        }

        whereBase.sucursalId = sucursalId;
      } else {
        whereBase.sucursal = {
          duenoId: user.userId,
        };
      }
    }

    if (meseroId) {
      whereBase.meseroId = meseroId;
    }

    const pedidos = await prisma.pedido.findMany({
      where: whereBase,
      include: {
        mesero: true,
      },
      orderBy: {
        creadoEn: 'asc',
      },
    });

    const totalVentas = pedidos.reduce(
      (acc, pedido) => acc + Number(pedido.total || 0),
      0
    );

    const cantidadPedidos = pedidos.length;

    const ventasMap = new Map<string, number>();

    pedidos.forEach((pedido) => {
      const fecha = pedido.creadoEn.toLocaleDateString('es-PE', {
        weekday: 'short',
      });

      const actual = ventasMap.get(fecha) || 0;

      ventasMap.set(
        fecha,
        actual + Number(pedido.total || 0)
      );
    });

    const ventasPorDia = Array.from(ventasMap.entries()).map(
      ([dia, monto]) => ({
        dia:
          dia.charAt(0).toUpperCase() +
          dia.slice(1, 3),
        monto,
      })
    );

    const pedidosMap = new Map<string, number>();

    pedidos.forEach((pedido) => {
      const fecha = pedido.creadoEn.toLocaleDateString('es-PE', {
        weekday: 'short',
      });

      const actual = pedidosMap.get(fecha) || 0;

      pedidosMap.set(fecha, actual + 1);
    });

    const pedidosPorDia = Array.from(pedidosMap.entries()).map(
      ([dia, cantidad]) => ({
        dia:
          dia.charAt(0).toUpperCase() +
          dia.slice(1, 3),
        pedidos: cantidad,
      })
    );

    const meserosMap = new Map<
      string,
      {
        nombre: string;
        pedidos: number;
      }
    >();

    pedidos.forEach((pedido) => {
      if (!pedido.mesero) return;

      const actual = meserosMap.get(pedido.mesero.id);

      if (actual) {
        actual.pedidos += 1;
      } else {
        meserosMap.set(pedido.mesero.id, {
          nombre: pedido.mesero.nombre,
          pedidos: 1,
        });
      }
    });

    const rendimientoMeseros = Array.from(
      meserosMap.values()
    ).sort((a, b) => b.pedidos - a.pedidos);

    const whereMeseros: any = {
      rol: 'MESERO',
      activo: true,
    };

    if (user.rol === 'ADMIN') {
      whereMeseros.sucursalId = user.sucursalId;
    }

    if (user.rol === 'DUENO') {
      if (sucursalId) {
        whereMeseros.sucursalId = sucursalId;
      } else {
        whereMeseros.sucursal = {
          duenoId: user.userId,
        };
      }
    }

    const meseros = await prisma.usuario.findMany({
      where: whereMeseros,
      select: {
        id: true,
        nombre: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    res.status(200).json({
      totalVentas,
      cantidadPedidos,
      ventasPorDia,
      pedidosPorDia,
      rendimientoMeseros,
      meseros,
    });

  } catch (error) {
    console.error('Error reportes:', error);

    res.status(500).json({
      message: 'Error al obtener reportes',
    });
  }
}

export async function exportarReporteExcel(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = req.user as {
      userId: string;
      rol: Rol;
      sucursalId?: string;
    };

    const {
      desde,
      hasta,
      meseroId,
      sucursalId,
    } = req.query as {
      desde?: string;
      hasta?: string;
      meseroId?: string;
      sucursalId?: string;
    };

    const fechaInicio = desde
      ? new Date(`${desde}T00:00:00`)
      : new Date(new Date().setDate(new Date().getDate() - 6));

    const fechaFin = hasta
      ? new Date(`${hasta}T23:59:59`)
      : new Date();

    const whereBase: any = {
      pagado: true,
      creadoEn: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    };

    if (user.rol === 'ADMIN') {
      whereBase.sucursalId = user.sucursalId;
    }

    if (user.rol === 'DUENO') {
      if (sucursalId) {
        const sucursalPermitida = await prisma.sucursal.findFirst({
          where: {
            id: sucursalId,
            duenoId: user.userId,
          },
          select: {
            id: true,
          },
        });

        if (!sucursalPermitida) {
          res.status(403).json({
            message: 'No tienes acceso a esta sucursal',
          });
          return;
        }

        whereBase.sucursalId = sucursalId;
      } else {
        whereBase.sucursal = {
          duenoId: user.userId,
        };
      }
    }

    if (meseroId) {
      whereBase.meseroId = meseroId;
    }

    const pedidos = await prisma.pedido.findMany({
      where: whereBase,
      include: {
        mesero: true,
        mesa: true,
        items: {
          include: {
            producto: true,
          },
        },
      },
      orderBy: {
        creadoEn: 'desc',
      },
    });

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet('Reporte');

    worksheet.columns = [
      {
        header: 'Pedido',
        key: 'pedido',
        width: 15,
      },
      {
        header: 'Fecha',
        key: 'fecha',
        width: 25,
      },
      {
        header: 'Mesero',
        key: 'mesero',
        width: 25,
      },
      {
        header: 'Mesa',
        key: 'mesa',
        width: 15,
      },
      {
        header: 'Tipo',
        key: 'tipo',
        width: 20,
      },
      {
        header: 'Método Pago',
        key: 'metodoPago',
        width: 20,
      },
      {
        header: 'Total',
        key: 'total',
        width: 15,
      },
    ];

    pedidos.forEach((pedido) => {
      worksheet.addRow({
        pedido: pedido.numero,
        fecha: pedido.creadoEn.toLocaleString('es-PE'),
        mesero: pedido.mesero?.nombre || '-',
        mesa: pedido.mesa?.numero || '-',
        tipo: pedido.tipo,
        metodoPago: pedido.metodoPago || '-',
        total: Number(pedido.total || 0),
      });
    });

    worksheet.getRow(1).font = {
      bold: true,
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte.xlsx`
    );

    await workbook.xlsx.write(res);

    res.end();

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Error exportando excel',
    });
  }
}