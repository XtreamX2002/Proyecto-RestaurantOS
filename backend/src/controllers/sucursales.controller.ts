import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const normalizarNombreSucursal = (value: string) => {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
};

const normalizarDireccionSucursal = (value: string) => {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
};

const nombreSucursalValido = (value: string) => {
  return /^[A-ZÁÉÍÓÚÜÑ0-9\s.\-/'&]+$/.test(value);
};

const direccionSucursalValida = (value: string) => {
  return /^[A-ZÁÉÍÓÚÜÑ0-9\s.,\-/#]+$/.test(value);
};

const telefonoValido = (telefono: string) => {
  return /^\d{7}$/.test(telefono) || /^9\d{8}$/.test(telefono);
};

export async function getSucursales(req: Request, res: Response): Promise<void> {
  const { userId, rol, sucursalId } = req.user!;

  const where =
    rol === 'DUENO'
      ? { duenoId: userId }
      : { id: sucursalId ?? '' };

  const sucursales = await prisma.sucursal.findMany({
    where,
    include: {
      _count: { select: { usuarios: true, pedidos: true } },
    },
    orderBy: { creadoEn: 'asc' },
  });

  res.json(sucursales);
}

export async function getSucursalById(req: Request, res: Response): Promise<void> {
  const sucursal = await prisma.sucursal.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { usuarios: true, mesas: true, productos: true } } },
  });
  if (!sucursal) { res.status(404).json({ error: 'Sucursal no encontrada' }); return; }
  res.json(sucursal);
}

export async function createSucursal(req: Request, res: Response): Promise<void> {
  const { nombre, direccion, telefono, horarioApertura, horarioCierre, diasOperacion } = req.body;

  if (!nombre || !direccion || !telefono) {
    res.status(400).json({ error: 'Nombre, dirección y teléfono son requeridos' });
    return;
  }

  const nombreNormalizado = normalizarNombreSucursal(String(nombre));
  const direccionNormalizada = normalizarDireccionSucursal(String(direccion));
  const telefonoNormalizado = String(telefono).trim().replace(/\D/g, '');

  if (nombreNormalizado.length < 3) {
    res.status(400).json({ error: 'El nombre de la sucursal debe tener al menos 3 caracteres' });
    return;
  }

  if (nombreNormalizado.length > 80) {
    res.status(400).json({ error: 'El nombre de la sucursal no debe superar 80 caracteres' });
    return;
  }

  if (!nombreSucursalValido(nombreNormalizado)) {
    res.status(400).json({ error: 'El nombre de la sucursal contiene caracteres no permitidos' });
    return;
  }

  if (direccionNormalizada.length < 5) {
    res.status(400).json({ error: 'La dirección debe tener al menos 5 caracteres' });
    return;
  }

  if (direccionNormalizada.length > 120) {
    res.status(400).json({ error: 'La dirección no debe superar 120 caracteres' });
    return;
  }

  if (!direccionSucursalValida(direccionNormalizada)) {
    res.status(400).json({ error: 'La dirección contiene caracteres no permitidos' });
    return;
  }

  if (!telefonoValido(telefonoNormalizado)) {
    res.status(400).json({ error: 'El teléfono debe tener 7 dígitos o 9 dígitos empezando en 9' });
    return;
  }

  if (!diasOperacion) {
    res.status(400).json({ error: 'Los días de operación son requeridos' });
    return;
  }

  if (!horarioApertura || !horarioCierre) {
    res.status(400).json({ error: 'El horario de apertura y cierre es requerido' });
    return;
  }

  if (horarioApertura >= horarioCierre) {
    res.status(400).json({ error: 'La hora de cierre debe ser posterior a la apertura' });
    return;
  }

  const sucursal = await prisma.sucursal.create({
    data: {
      nombre: nombreNormalizado,
      direccion: direccionNormalizada,
      telefono: telefonoNormalizado,
      horarioApertura,
      horarioCierre,
      diasOperacion,
      abierto: false,
      duenoId: req.user!.userId,
    },
  });

  res.status(201).json(sucursal);
}

export async function updateSucursal(req: Request, res: Response): Promise<void> {
  const { nombre, direccion, telefono, horarioApertura, horarioCierre, diasOperacion } = req.body;

  const existe = await prisma.sucursal.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });

  if (!existe) {
    res.status(404).json({ error: 'Sucursal no encontrada' });
    return;
  }

  const data: {
    nombre?: string;
    direccion?: string;
    telefono?: string;
    horarioApertura?: string;
    horarioCierre?: string;
    diasOperacion?: string;
  } = {};

  if (nombre !== undefined) {
    const nombreNormalizado = normalizarNombreSucursal(String(nombre));

    if (nombreNormalizado.length < 3) {
      res.status(400).json({ error: 'El nombre de la sucursal debe tener al menos 3 caracteres' });
      return;
    }

    if (nombreNormalizado.length > 80) {
      res.status(400).json({ error: 'El nombre de la sucursal no debe superar 80 caracteres' });
      return;
    }

    if (!nombreSucursalValido(nombreNormalizado)) {
      res.status(400).json({ error: 'El nombre de la sucursal contiene caracteres no permitidos' });
      return;
    }

    data.nombre = nombreNormalizado;
  }

  if (direccion !== undefined) {
    const direccionNormalizada = normalizarDireccionSucursal(String(direccion));

    if (direccionNormalizada.length < 5) {
      res.status(400).json({ error: 'La dirección debe tener al menos 5 caracteres' });
      return;
    }

    if (direccionNormalizada.length > 120) {
      res.status(400).json({ error: 'La dirección no debe superar 120 caracteres' });
      return;
    }

    if (!direccionSucursalValida(direccionNormalizada)) {
      res.status(400).json({ error: 'La dirección contiene caracteres no permitidos' });
      return;
    }

    data.direccion = direccionNormalizada;
  }

  if (telefono !== undefined) {
    const telefonoNormalizado = String(telefono).trim().replace(/\D/g, '');

    if (!telefonoValido(telefonoNormalizado)) {
      res.status(400).json({ error: 'El teléfono debe tener 7 dígitos o 9 dígitos empezando en 9' });
      return;
    }

    data.telefono = telefonoNormalizado;
  }

  if (horarioApertura !== undefined) data.horarioApertura = horarioApertura;
  if (horarioCierre !== undefined) data.horarioCierre = horarioCierre;
  if (diasOperacion !== undefined) data.diasOperacion = diasOperacion;

  const aperturaFinal = data.horarioApertura ?? undefined;
  const cierreFinal = data.horarioCierre ?? undefined;

  if (aperturaFinal && cierreFinal && aperturaFinal >= cierreFinal) {
    res.status(400).json({ error: 'La hora de cierre debe ser posterior a la apertura' });
    return;
  }

  const sucursal = await prisma.sucursal.update({
    where: { id: req.params.id },
    data,
  });

  res.json(sucursal);
}

export async function toggleSucursal(req: Request, res: Response): Promise<void> {
  const sucursal = await prisma.sucursal.findUnique({ where: { id: req.params.id } });
  if (!sucursal) { res.status(404).json({ error: 'Sucursal no encontrada' }); return; }

  const updated = await prisma.sucursal.update({
    where: { id: req.params.id },
    data: { abierto: !sucursal.abierto },
  });
  res.json({ abierto: updated.abierto, mensaje: updated.abierto ? 'Sucursal abierta' : 'Sucursal cerrada' });
}

export async function deleteSucursal(req: Request, res: Response): Promise<void> {
  const sucursal = await prisma.sucursal.findUnique({ where: { id: req.params.id } });
  if (!sucursal) { res.status(404).json({ error: 'Sucursal no encontrada' }); return; }

  const activos = await prisma.pedido.count({
    where: { sucursalId: req.params.id, estado: { notIn: ['PAGADO', 'CANCELADO'] } },
  });
  if (activos > 0) {
    res.status(400).json({ error: `No se puede eliminar: hay ${activos} pedido(s) activo(s)` });
    return;
  }

  await prisma.sucursal.delete({ where: { id: req.params.id } });
  res.json({ mensaje: 'Sucursal eliminada correctamente' });
}
