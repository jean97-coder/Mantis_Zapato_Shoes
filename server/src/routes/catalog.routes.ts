import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logAudit } from '../lib/audit.js';

export const catalogRouter = Router();
catalogRouter.use(authenticate);

catalogRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await prisma.serviceCatalogItem.findMany({ orderBy: { category: 'asc' } });
    res.json(items);
  })
);

const catalogSchema = z.object({
  code: z.string(),
  name: z.string(),
  category: z.string(),
  description: z.string().default(''),
  estimatedMinutes: z.number().default(0),
  standardPrice: z.number().positive(),
});

catalogRouter.post(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = catalogSchema.parse(req.body);
    const item = await prisma.serviceCatalogItem.create({ data });
    await logAudit(req.user, 'CREAR_CATALOGO_SERVICIO', 'SERVICIOS', `Nuevo servicio: ${item.name}`, item.id);
    res.status(201).json(item);
  })
);

catalogRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = catalogSchema.partial().parse(req.body);
    const item = await prisma.serviceCatalogItem.update({ where: { id: req.params.id }, data });
    await logAudit(req.user, 'ACTUALIZAR_CATALOGO_SERVICIO', 'SERVICIOS', `Actualizado servicio ${item.id}`, item.id);
    res.json(item);
  })
);
