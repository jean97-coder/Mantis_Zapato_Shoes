import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/auth.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { logAudit } from '../lib/audit.js';

export const usersRouter = Router();
usersRouter.use(authenticate);

const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  specialty: true,
  avatar: true,
  active: true,
};

usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ select: publicSelect, orderBy: { name: 'asc' } });
    res.json(users);
  })
);

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'CAJERO', 'ZAPATERO', 'SOCIO_ADMIN']),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  avatar: z.string().optional(),
});

usersRouter.post(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = createUserSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw new HttpError(409, 'Ya existe un usuario con ese correo electrónico.');

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash: await hashPassword(data.password),
        role: data.role,
        phone: data.phone,
        specialty: data.specialty,
        avatar: data.avatar,
      },
      select: publicSelect,
    });

    await logAudit(req.user, 'CREAR_USUARIO', 'USUARIOS', `Usuario ${user.name} (${user.role}) creado.`, user.id);
    res.status(201).json(user);
  })
);

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'CAJERO', 'ZAPATERO', 'SOCIO_ADMIN']).optional(),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  avatar: z.string().optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

usersRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = updateUserSchema.parse(req.body);
    const { password, ...rest } = data;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
      select: publicSelect,
    });

    await logAudit(req.user, 'ACTUALIZAR_USUARIO', 'USUARIOS', `Usuario ${user.name} actualizado.`, user.id);
    res.json(user);
  })
);

usersRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.sub) {
      throw new HttpError(400, 'No puedes eliminar tu propia cuenta mientras la tienes activa.');
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new HttpError(404, 'Usuario no encontrado.');

    const assignedOrders = await prisma.serviceOrder.count({ where: { assignedTechnicianId: user.id } });

    if (assignedOrders > 0) {
      // Has order history tied to it — deactivate instead of a hard delete
      // that would break that relation.
      const updated = await prisma.user.update({ where: { id: user.id }, data: { active: false }, select: publicSelect });
      await logAudit(req.user, 'DESACTIVAR_USUARIO', 'USUARIOS', `Usuario desactivado (tiene órdenes asignadas): ${user.name}`, user.id);
      return res.json({ mode: 'deactivated', user: updated });
    }

    await prisma.user.delete({ where: { id: user.id } });
    await logAudit(req.user, 'ELIMINAR_USUARIO', 'USUARIOS', `Usuario eliminado: ${user.name}`, user.id);
    res.json({ mode: 'deleted' });
  })
);
