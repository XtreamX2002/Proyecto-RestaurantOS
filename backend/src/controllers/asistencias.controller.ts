import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


type UserToken = {
    userId: string;
    id?: string;
    rol: 'DUENO' | 'ADMIN' | 'MESERO' | 'COCINERO';
    sucursalId?: string | null;
};

const TOLERANCIA_MINUTOS = 10;

const getUser = (req: Request): UserToken | undefined => {
    return req.user as UserToken | undefined;
};

const obtenerSucursalOperativa = async (req: Request) => {
    const user = getUser(req);

    if (!user) {
        return null;
    }

    if (user.rol === 'ADMIN' || user.rol === 'MESERO' || user.rol === 'COCINERO') {
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
                duenoId: user.userId ?? user.id,
            },
            select: {
                id: true,
            },
        });

        return sucursal?.id ?? null;
    }

    return null;
};

const getFechaSolo = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};


const esTardanza = (
    horaActual: Date,
    horarioApertura?: string | null
) => {

    if (!horarioApertura) {
        return false;
    }

    const [h, m] = horarioApertura
        .split(':')
        .map(Number);

    const limite = new Date(horaActual);

    limite.setHours(
        h,
        m + TOLERANCIA_MINUTOS,
        0,
        0
    );

    return horaActual > limite;
};


export const getAsistencias = async (req: Request, res: Response) => {
    try {
        const user = getUser(req);

        if (!user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const fecha = getFechaSolo();

        const sucursalId = await obtenerSucursalOperativa(req);

        if (!sucursalId) {
            return res.status(400).json({
                error: 'Sucursal no encontrada o no autorizada',
            });
        }

        const whereSucursal = {
            sucursalId,
        };

        const usuarios = await prisma.usuario.findMany({
            where: {
                ...whereSucursal,
                rol: {
                    in: ['MESERO', 'COCINERO'],
                },
            },
            include: {
                asistencias: {
                    where: {
                        fecha,
                    },
                    take: 1,
                },
            },
        });

        const result = usuarios.map((u) => {
            const a = u.asistencias?.[0];

            return {
                id: u.id,
                nombre: u.nombre,
                rol: u.rol,
                asistencia: a?.presente ?? false,
                horaEntrada: a?.horaEntrada ?? null,
                tardanza: a?.tardanza ?? false,
            };
        });

        return res.json(result);

    } catch (error) {
        console.error('ERROR getAsistencias:', error);
        return res.status(500).json({
            error: 'Error al obtener asistencias',
        });
    }
};

export const toggleAsistencia = async (req: Request, res: Response) => {
    try {
        const user = getUser(req);

        if (!user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const { id } = req.params;
        const { presente } = req.body;

        const sucursalId = await obtenerSucursalOperativa(req);

        if (!sucursalId) {
            return res.status(400).json({
                error: 'Sucursal no encontrada o no autorizada',
            });
        }

        const fecha = getFechaSolo();
        const ahora = new Date();

        const whereEmpleado = {
            id,
            sucursalId,
        }
            
        const empleado = await prisma.usuario.findFirst({
            where: whereEmpleado,
        });

        if (!empleado) {
            return res.status(404).json({
                error: 'Usuario no existe o no pertenece a la sucursal',
                debug: {
                    id,
                    rol: user.rol,
                    sucursalId: user.sucursalId,
                },
            });
        }

        const existente = await prisma.asistencia.findFirst({
            where: {
                usuarioId: id,
                fecha,
            },
        });

        const horaEntrada = presente
            ? ahora
            : null;

        const sucursal = await prisma.sucursal.findUnique({
            where: {
                id: sucursalId,
            },
        });

        const tardanza =
            presente && !existente?.horaEntrada
                ? esTardanza(
                    ahora,
                    sucursal?.horarioApertura
                )
                : existente?.tardanza ?? false;

        let asistencia;

        if (existente) {
            asistencia = await prisma.asistencia.update({
                where: { id: existente.id },
                data: {
                    presente,
                    horaEntrada: presente ? horaEntrada : null,
                    tardanza: presente ? tardanza : false,
                },
            });
        } else {
            asistencia = await prisma.asistencia.create({
                data: {
                    usuarioId: id,
                    sucursalId,
                    fecha,
                    presente,
                    horaEntrada: presente ? ahora : null,
                    tardanza: presente
                        ? esTardanza(
                            ahora,
                            sucursal?.horarioApertura
                        )
                        : false,
                },
            });
        }

        return res.json(asistencia);

    } catch (error) {
        console.error('ERROR toggleAsistencia:', error);
        return res.status(500).json({
            message: 'Error al actualizar asistencia',
        });
    }


};

