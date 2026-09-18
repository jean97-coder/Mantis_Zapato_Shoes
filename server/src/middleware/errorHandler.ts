import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Datos inválidos.', details: err.issues });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Referencia inválida: uno de los registros relacionados no existe.' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un registro con ese valor único.' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Registro no encontrado.' });
    }
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor.' });
}
