import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { logAudit } from '../lib/audit.js';
import { isTelegramConfigured, sendTelegramTestMessage, sendDeliveryAlertReport } from '../lib/telegram.js';

export const telegramRouter = Router();
telegramRouter.use(authenticate);

telegramRouter.get(
  '/status',
  asyncHandler(async (_req, res) => {
    res.json({ configured: isTelegramConfigured() });
  })
);

telegramRouter.post(
  '/test',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const result = await sendTelegramTestMessage();
    if (!result.ok) throw new HttpError(502, result.description || 'No se pudo enviar el mensaje de prueba a Telegram.');

    await logAudit(req.user, 'PRUEBA_TELEGRAM', 'SISTEMA', 'Alerta de prueba enviada al chat de Telegram configurado.');
    res.json({ ok: true });
  })
);

telegramRouter.post(
  '/check-deliveries',
  requireRole('ADMIN', 'CAJERO', 'ZAPATERO'),
  asyncHandler(async (req, res) => {
    const result = await sendDeliveryAlertReport();
    if (!result.ok) throw new HttpError(502, result.description || 'No se pudo enviar el reporte de entregas a Telegram.');

    await logAudit(req.user, 'ALERTA_ENTREGAS_TELEGRAM', 'SISTEMA', `Reporte de entregas enviado a Telegram (${result.ordersCount} orden(es)).`);
    res.json({ ok: true, ordersCount: result.ordersCount });
  })
);
