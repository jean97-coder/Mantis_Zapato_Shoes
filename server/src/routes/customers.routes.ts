import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { logAudit } from '../lib/audit.js';

export const customersRouter = Router();
customersRouter.use(authenticate);

customersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    const customers = await prisma.customer.findMany({
      where: q
        ? {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q } },
              { documentId: { contains: q } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json(customers);
  })
);

customersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { orders: { orderBy: { date: 'desc' } } },
    });
    if (!customer) throw new HttpError(404, 'Cliente no encontrado.');
    res.json(customer);
  })
);

const customerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  documentId: z.string().optional(),
  phone: z.string().min(6),
  whatsapp: z.string().min(6),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
});

customersRouter.post(
  '/',
  requireRole('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const data = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({
      data: { ...data, lastVisit: new Date() },
    });
    await logAudit(req.user, 'CREAR_CLIENTE', 'CLIENTES', `Nuevo cliente: ${customer.firstName} ${customer.lastName}`, customer.id);
    res.status(201).json(customer);
  })
);

customersRouter.patch(
  '/:id',
  requireRole('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const data = customerSchema.partial().parse(req.body);
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data });
    await logAudit(req.user, 'ACTUALIZAR_CLIENTE', 'CLIENTES', `Cliente ${customer.id} actualizado.`, customer.id);
    res.json(customer);
  })
);
