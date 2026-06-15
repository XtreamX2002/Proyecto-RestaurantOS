import { Request, Response } from "express";
import { PrismaClient, EstadoMesa } from "@prisma/client";

const prisma = new PrismaClient();

const obtenerSucursalOperativa = async (req: Request) => {
  const user = req.user as {
    userId: string;
    rol: string;
    sucursalId?: string;
  };

  if (user.rol === 'ADMIN' || user.rol === 'MESERO') {
    return user.sucursalId ?? null;
  }

  if (user.rol === 'DUENO') {
    const sucursalId =
      typeof req.query.sucursalId === 'string'
        ? req.query.sucursalId
        : typeof req.body.sucursalId === 'string'
          ? req.body.sucursalId
          : null;

    if (!sucursalId) {
      return null;
    }

    const sucursal = await prisma.sucursal.findFirst({
      where: {
        id: sucursalId,
        duenoId: user.userId,
      },
      select: {
        id: true,
      },
    });

    return sucursal?.id ?? null;
  }

  return null;
};

export const getMesas = async (req: Request, res: Response): Promise<void> => {
  try {
    const sucursalId = await obtenerSucursalOperativa(req);

    if (!sucursalId) {
      res.status(400).json({ message: "Sucursal no encontrada o no autorizada" });
      return;
    }

    const mesas = await prisma.mesa.findMany({
      where: { sucursalId },
      orderBy: { numero: "asc" },
    });

    res.json(mesas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener mesas" });
  }
};

export const crearMesa = async (req: Request, res: Response): Promise<void> => {
  try {
    const { numero, capacidad } = req.body;
    const sucursalId = await obtenerSucursalOperativa(req);

    if (!sucursalId) {
      res.status(400).json({ message: "Sucursal no encontrada o no autorizada" });
      return;
    }

    const numeroMesa = Number(numero);
    const capacidadMesa = Number(capacidad);

    if (!numeroMesa || numeroMesa <= 0) {
      res.status(400).json({ message: "El número de mesa debe ser mayor a 0" });
      return;
    }

    if (!capacidadMesa || capacidadMesa <= 0) {
      res.status(400).json({ message: "La capacidad debe ser mayor a 0" });
      return;
    }

    const existe = await prisma.mesa.findFirst({
      where: {
        numero: numeroMesa,
        sucursalId,
      },
    });

    if (existe) {
      res.status(400).json({ message: "La mesa ya existe en esta sucursal" });
      return;
    }

    const mesa = await prisma.mesa.create({
      data: {
        numero: numeroMesa,
        capacidad: capacidadMesa,
        sucursalId,
      },
    });

    res.status(201).json(mesa);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creando mesa" });
  }
};

export const actualizarMesa = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const sucursalId = await obtenerSucursalOperativa(req);

    if (!sucursalId) {
      res.status(400).json({ message: "Sucursal no encontrada o no autorizada" });
      return;
    }

    const { numero, capacidad, estado } = req.body;

    const mesaExiste = await prisma.mesa.findFirst({
      where: {
        id,
        sucursalId,
      },
    });

    if (!mesaExiste) {
      res.status(404).json({ message: "Mesa no encontrada" });
      return;
    }

    const numeroMesa = Number(numero);
    const capacidadMesa = Number(capacidad);

    if (!numeroMesa || numeroMesa <= 0) {
      res.status(400).json({ message: "El número de mesa debe ser mayor a 0" });
      return;
    }

    if (!capacidadMesa || capacidadMesa <= 0) {
      res.status(400).json({ message: "La capacidad debe ser mayor a 0" });
      return;
    }

    if (numeroMesa !== mesaExiste.numero) {
      const existeNumero = await prisma.mesa.findFirst({
        where: {
          numero: numeroMesa,
          sucursalId,
          id: {
            not: id,
          },
        },
      });

      if (existeNumero) {
        res.status(400).json({ message: "Ya existe otra mesa con ese número en esta sucursal" });
        return;
      }
    }

    const mesa = await prisma.mesa.update({
      where: {
        id,
      },
      data: {
        numero: numeroMesa,
        capacidad: capacidadMesa,
        estado: estado as EstadoMesa,
      },
    });

    res.json(mesa);
  } catch (error: any) {
    console.error("ERROR UPDATE MESA:", error);
    res.status(500).json({
      message: "Error actualizando mesa",
      error: error?.message,
    });
  }
};