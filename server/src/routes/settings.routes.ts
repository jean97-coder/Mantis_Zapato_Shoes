import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logAudit } from '../lib/audit.js';

export const settingsRouter = Router();
settingsRouter.use(authenticate);

settingsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const settings = await prisma.appSettings.findUniqueOrThrow({ where: { id: 'singleton' } });
    res.json(settings);
  })
);

const settingsSchema = z.object({
  businessName: z.string().optional(),
  commercialName: z.string().optional(),
  ruc: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  logoUrl: z.string().optional(),
  defaultCurrency: z.string().optional(),
  taxRatePercent: z.number().optional(),
  orderPrefix: z.string().optional(),
  standardServiceDays: z.number().optional(),
  defaultConditions: z.string().optional(),
  whatsappTemplates: z.record(z.string(), z.string()).optional(),
  whatsappIntegrationMode: z.string().optional(),
});

settingsRouter.patch(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = settingsSchema.parse(req.body);
    const settings = await prisma.appSettings.update({ where: { id: 'singleton' }, data });
    await logAudit(req.user, 'CONFIGURACION', 'SISTEMA', 'Configuración general actualizada');
    res.json(settings);
  })
);
