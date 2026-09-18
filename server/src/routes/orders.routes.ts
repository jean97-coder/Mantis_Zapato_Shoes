import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { logAudit } from '../lib/audit.js';
import { ORDER_INCLUDE, serializeOrder, dateStr, timeStr } from '../lib/serialize.js';
import { computeBudget, DiscountType } from '../lib/budget.js';
import { uploadPhoto } from '../lib/upload.js';
import { WhatsAppTemplateService } from '../lib/whatsapp.js';

export const ordersRouter = Router();
ordersRouter.use(authenticate);

async function getFullOrderOrThrow(id: string) {
  const order = await prisma.serviceOrder.findUnique({ where: { id }, include: ORDER_INCLUDE });
  if (!order) throw new HttpError(404, 'Orden de servicio no encontrada.');
  return order;
}

async function addTimelineEvent(
  orderId: string,
  data: { status: string; title: string; description: string; userName: string; userRole?: string }
) {
  await prisma.orderTimelineEvent.create({ data: { orderId, ...data } });
}

// ---------------------------------------------------------------------
// LIST / DETAIL
// ---------------------------------------------------------------------

ordersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, q } = req.query as { status?: string; q?: string };
    const orders = await prisma.serviceOrder.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(q
          ? {
              OR: [
                { orderNumber: { contains: q, mode: 'insensitive' } },
                { shoeBrand: { contains: q, mode: 'insensitive' } },
                { items: { some: { brand: { contains: q, mode: 'insensitive' } } } },
                { customer: { firstName: { contains: q, mode: 'insensitive' } } },
                { customer: { lastName: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: ORDER_INCLUDE,
      orderBy: { date: 'desc' },
    });
    res.json(orders.map(serializeOrder));
  })
);

ordersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await getFullOrderOrThrow(req.params.id);
    res.json(serializeOrder(order));
  })
);

// ---------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------

const orderItemServiceSchema = z.object({
  serviceId: z.string().optional(),
  name: z.string(),
  description: z.string().default(''),
  price: z.number(),
  estimatedMinutes: z.number().default(0),
  technicianId: z.string().optional(),
  technicianName: z.string().optional(),
});

const orderItemPhotoSchema = z.object({
  url: z.string(),
  type: z.string().default('otra'),
  stage: z.string().default('recepcion'),
  caption: z.string().optional(),
});

const orderItemSchema = z.object({
  type: z.string(),
  brand: z.string(),
  model: z.string().default(''),
  color: z.string().default(''),
  size: z.string().default(''),
  material: z.string(),
  pairCount: z.number().default(1),
  conditionDescription: z.string().default(''),
  clientObservations: z.string().default(''),
  diagnosis: z.record(z.string(), z.unknown()).optional(),
  photos: z.array(orderItemPhotoSchema).default([]),
  services: z.array(orderItemServiceSchema).default([]),
});

const createOrderSchema = z.object({
  customerId: z.string(),
  promisedDate: z.string(),
  currentStatusText: z.string().default(''),
  items: z.array(orderItemSchema).min(1, 'La orden debe incluir al menos un par de calzado.'),
  priority: z.enum(['NORMAL', 'URGENTE', 'MUY_URGENTE']).default('NORMAL'),
  assignedTechnicianId: z.string().optional(),
  assignedTechnicianName: z.string().optional(),
  branch: z.string().default('Sucursal Principal'),
  generalObservations: z.string().default(''),
  serviceConditionsAgreed: z.boolean().default(true),
  discountType: z.enum(['FIXED', 'PERCENT']).default('FIXED'),
  discountValue: z.number().default(0),
  status: z.string().optional(),
  budgetStatus: z.string().optional(),
});

ordersRouter.post(
  '/',
  requireRole('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const data = createOrderSchema.parse(req.body);

    const settings = await prisma.appSettings.findUniqueOrThrow({ where: { id: 'singleton' } });
    const seq = settings.nextOrderSequence;
    const orderNumber = `${settings.orderPrefix}${String(seq).padStart(6, '0')}`;
    await prisma.appSettings.update({ where: { id: 'singleton' }, data: { nextOrderSequence: seq + 1 } });

    const allServices = data.items.flatMap((it) => it.services);
    const budget = computeBudget(allServices.map((s) => ({ price: s.price })), data.discountType, data.discountValue);

    // The order's flat shoeType/shoeBrand/.../diagnosis columns always mirror
    // items[0] (the "primary" pair) so every single-shoe view (order list,
    // dashboard, kanban, ticket, WhatsApp, analytics) keeps working unchanged;
    // the full per-pair breakdown lives in the `items` relation below.
    const primary = data.items[0];
    const pairsSummary = data.items.map((it) => `${it.type} ${it.brand}`.trim()).join(' + ');

    const orderId = await prisma.$transaction(async (tx) => {
      const created = await tx.serviceOrder.create({
        data: {
          orderNumber,
          promisedDate: new Date(data.promisedDate),
          customerId: data.customerId,
          shoeType: primary.type,
          shoeBrand: primary.brand,
          shoeModel: primary.model,
          shoeColor: primary.color,
          shoeSize: primary.size,
          shoeMaterial: primary.material,
          pairCount: primary.pairCount,
          conditionDescription: primary.conditionDescription,
          currentStatusText: data.currentStatusText,
          clientObservations: primary.clientObservations,
          subtotal: budget.subtotal,
          discount: budget.discount,
          discountType: budget.discountType,
          discountValue: budget.discountValue,
          taxes: budget.taxes,
          total: budget.total,
          laborCost: budget.subtotal,
          materialCost: 0,
          diagnosis: primary.diagnosis as Prisma.InputJsonValue | undefined,
          budgetStatus: data.budgetStatus || 'pendiente',
          budgetApprovedAt: data.budgetStatus === 'aprobado' ? new Date() : undefined,
          status: (data.status as any) || 'RECIBIDA',
          priority: data.priority,
          assignedTechnicianId: data.assignedTechnicianId,
          assignedTechnicianName: data.assignedTechnicianName,
          branch: data.branch,
          generalObservations: data.generalObservations,
          serviceConditionsAgreed: data.serviceConditionsAgreed,
          balancePending: budget.total,
          items: {
            create: data.items.map((it, idx) => ({
              position: idx + 1,
              type: it.type,
              brand: it.brand,
              model: it.model,
              color: it.color,
              size: it.size,
              material: it.material,
              pairCount: it.pairCount,
              conditionDescription: it.conditionDescription,
              clientObservations: it.clientObservations,
              diagnosis: it.diagnosis as Prisma.InputJsonValue | undefined,
            })),
          },
          timeline: {
            create: {
              status: 'RECIBIDA',
              title: 'Orden de servicio creada',
              description: `Recepción de calzado: ${pairsSummary} (${data.items.length} par${data.items.length > 1 ? 'es' : ''}) por ${req.user!.name}.`,
              userName: req.user!.name,
              userRole: req.user!.role,
            },
          },
        },
        include: { items: { orderBy: { position: 'asc' } } },
      });

      // Photos and services belong to a specific pair — create them now that
      // each ShoeItem has a generated id, tagging both orderId (denormalized,
      // for order-wide queries) and shoeItemId (the owning pair).
      for (let idx = 0; idx < data.items.length; idx++) {
        const it = data.items[idx];
        const shoeItemId = created.items[idx].id;

        if (it.photos.length) {
          await tx.shoePhoto.createMany({
            data: it.photos.map((p) => ({
              orderId: created.id,
              shoeItemId,
              url: p.url,
              type: p.type,
              stage: p.stage,
              caption: p.caption,
              registeredBy: req.user!.name,
            })),
          });
        }

        if (it.services.length) {
          await tx.orderServiceItem.createMany({
            data: it.services.map((s) => ({
              orderId: created.id,
              shoeItemId,
              serviceId: s.serviceId,
              name: s.name,
              description: s.description,
              price: s.price,
              estimatedMinutes: s.estimatedMinutes,
              technicianId: s.technicianId,
              technicianName: s.technicianName,
              status: 'pendiente',
            })),
          });
        }
      }

      return created.id;
    });

    await prisma.customer.update({
      where: { id: data.customerId },
      data: { ordersCount: { increment: 1 }, lastVisit: new Date() },
    });

    const full = await getFullOrderOrThrow(orderId);
    await logAudit(req.user, 'CREAR_ORDEN', 'ORDENES', `Nueva orden ${full.orderNumber} creada (${data.items.length} par(es)).`, orderId);

    res.status(201).json(serializeOrder(full));
  })
);

// ---------------------------------------------------------------------
// GENERAL UPDATE (shoe/observations/priority/branch/assignment)
// ---------------------------------------------------------------------

const updateOrderSchema = z.object({
  promisedDate: z.string().optional(),
  priority: z.enum(['NORMAL', 'URGENTE', 'MUY_URGENTE']).optional(),
  assignedTechnicianId: z.string().nullable().optional(),
  assignedTechnicianName: z.string().nullable().optional(),
  branch: z.string().optional(),
  generalObservations: z.string().optional(),
  shoe: z
    .object({
      type: z.string().optional(),
      brand: z.string().optional(),
      model: z.string().optional(),
      color: z.string().optional(),
      size: z.string().optional(),
      material: z.string().optional(),
      pairCount: z.number().optional(),
      conditionDescription: z.string().optional(),
      currentStatusText: z.string().optional(),
      clientObservations: z.string().optional(),
    })
    .optional(),
});

ordersRouter.patch(
  '/:id',
  requireRole('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const data = updateOrderSchema.parse(req.body);
    const { shoe, promisedDate, ...rest } = data;

    await prisma.serviceOrder.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(promisedDate ? { promisedDate: new Date(promisedDate) } : {}),
        ...(shoe?.type ? { shoeType: shoe.type } : {}),
        ...(shoe?.brand ? { shoeBrand: shoe.brand } : {}),
        ...(shoe?.model !== undefined ? { shoeModel: shoe.model } : {}),
        ...(shoe?.color !== undefined ? { shoeColor: shoe.color } : {}),
        ...(shoe?.size !== undefined ? { shoeSize: shoe.size } : {}),
        ...(shoe?.material ? { shoeMaterial: shoe.material } : {}),
        ...(shoe?.pairCount !== undefined ? { pairCount: shoe.pairCount } : {}),
        ...(shoe?.conditionDescription !== undefined ? { conditionDescription: shoe.conditionDescription } : {}),
        ...(shoe?.currentStatusText !== undefined ? { currentStatusText: shoe.currentStatusText } : {}),
        ...(shoe?.clientObservations !== undefined ? { clientObservations: shoe.clientObservations } : {}),
      },
    });

    await logAudit(req.user, 'ACTUALIZAR_ORDEN', 'ORDENES', `Orden ${req.params.id} actualizada.`, req.params.id);
    const full = await getFullOrderOrThrow(req.params.id);
    res.json(serializeOrder(full));
  })
);

// ---------------------------------------------------------------------
// STATUS
// ---------------------------------------------------------------------

const statusSchema = z.object({
  status: z.string(),
  observation: z.string().optional(),
});

ordersRouter.post(
  '/:id/status',
  requireRole('ADMIN', 'CAJERO', 'ZAPATERO'),
  asyncHandler(async (req, res) => {
    const { status, observation } = statusSchema.parse(req.body);

    await prisma.serviceOrder.update({ where: { id: req.params.id }, data: { status: status as any } });
    await addTimelineEvent(req.params.id, {
      status,
      title: `Estado cambiado a: ${status.replace(/_/g, ' ')}`,
      description: observation || `Cambio de estado realizado por ${req.user!.name} (${req.user!.role}).`,
      userName: req.user!.name,
      userRole: req.user!.role,
    });

    await logAudit(req.user, 'CAMBIO_ESTADO_ORDEN', 'ORDENES', `Orden ${req.params.id} -> ${status}`, req.params.id);
    const full = await getFullOrderOrThrow(req.params.id);
    res.json(serializeOrder(full));
  })
);

// ---------------------------------------------------------------------
// DIAGNOSIS
// ---------------------------------------------------------------------

const diagnosisSchema = z.object({
  issuesFound: z.array(z.string()).default([]),
  soleCondition: z.string(),
  heelCondition: z.string(),
  leatherCondition: z.string(),
  stitchingCondition: z.string(),
  liningCondition: z.string(),
  zippersCondition: z.string(),
  eyeletsCondition: z.string(),
  generalCondition: z.string(),
  technicalNotes: z.string().default(''),
  recommendedWork: z.string().default(''),
  diagnosedBy: z.string(),
  diagnosedAt: z.string(),
});

ordersRouter.post(
  '/:id/diagnosis',
  requireRole('ADMIN', 'ZAPATERO'),
  asyncHandler(async (req, res) => {
    const diagnosis = diagnosisSchema.parse(req.body);

    await prisma.serviceOrder.update({
      where: { id: req.params.id },
      data: { diagnosis, status: 'EN_DIAGNOSTICO' },
    });
    await addTimelineEvent(req.params.id, {
      status: 'EN_DIAGNOSTICO',
      title: 'Diagnóstico técnico actualizado',
      description: `Diagnóstico emitido por ${diagnosis.diagnosedBy || req.user!.name}. Recomendación: ${diagnosis.recommendedWork || ''}`,
      userName: req.user!.name,
      userRole: req.user!.role,
    });

    await logAudit(req.user, 'ACTUALIZAR_DIAGNOSTICO', 'ORDENES', `Diagnóstico actualizado en orden ${req.params.id}`, req.params.id);
    const full = await getFullOrderOrThrow(req.params.id);
    res.json(serializeOrder(full));
  })
);

// ---------------------------------------------------------------------
// SERVICES (add / remove) with budget recompute
// ---------------------------------------------------------------------

const addServiceSchema = z.object({
  serviceId: z.string().optional(),
  name: z.string(),
  description: z.string().default(''),
  price: z.number(),
  estimatedMinutes: z.number().default(0),
  technicianId: z.string().optional(),
  technicianName: z.string().optional(),
});

async function recomputeOrderBudget(orderId: string) {
  const order = await prisma.serviceOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new HttpError(404, 'Orden no encontrada.');
  const services = await prisma.orderServiceItem.findMany({ where: { orderId } });
  const budget = computeBudget(services, order.discountType as DiscountType, order.discountValue);

  await prisma.serviceOrder.update({
    where: { id: orderId },
    data: {
      subtotal: budget.subtotal,
      discount: budget.discount,
      total: budget.total,
      laborCost: budget.subtotal,
      balancePending: Math.max(0, budget.total - order.totalPaid),
    },
  });
}

ordersRouter.post(
  '/:id/services',
  requireRole('ADMIN', 'CAJERO', 'ZAPATERO'),
  asyncHandler(async (req, res) => {
    const data = addServiceSchema.parse(req.body);
    const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, 'Orden no encontrada.');

    await prisma.orderServiceItem.create({
      data: { orderId: order.id, ...data, status: 'pendiente' },
    });

    await recomputeOrderBudget(order.id);

    await logAudit(req.user, 'AGREGAR_SERVICIO_ORDEN', 'SERVICIOS', `Servicio ${data.name} agregado a orden ${order.id}`, order.id);
    const full = await getFullOrderOrThrow(order.id);
    res.json(serializeOrder(full));
  })
);

const editServiceSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().optional(),
  estimatedMinutes: z.number().optional(),
  technicianId: z.string().optional(),
  technicianName: z.string().optional(),
});

ordersRouter.patch(
  '/:id/services/:itemId',
  requireRole('ADMIN', 'CAJERO', 'ZAPATERO'),
  asyncHandler(async (req, res) => {
    const data = editServiceSchema.parse(req.body);

    const item = await prisma.orderServiceItem.findUnique({ where: { id: req.params.itemId } });
    if (!item || item.orderId !== req.params.id) throw new HttpError(404, 'Servicio no encontrado en esta orden.');

    await prisma.orderServiceItem.update({ where: { id: req.params.itemId }, data });
    await recomputeOrderBudget(req.params.id);

    await logAudit(req.user, 'EDITAR_SERVICIO_ORDEN', 'SERVICIOS', `Servicio editado en orden ${req.params.id}`, req.params.itemId);
    const full = await getFullOrderOrThrow(req.params.id);
    res.json(serializeOrder(full));
  })
);

ordersRouter.delete(
  '/:id/services/:itemId',
  requireRole('ADMIN', 'CAJERO', 'ZAPATERO'),
  asyncHandler(async (req, res) => {
    const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, 'Orden no encontrada.');

    await prisma.orderServiceItem.delete({ where: { id: req.params.itemId } });
    await recomputeOrderBudget(order.id);

    await logAudit(req.user, 'QUITAR_SERVICIO_ORDEN', 'SERVICIOS', `Servicio retirado de la orden ${order.id}`, order.id);
    const full = await getFullOrderOrThrow(order.id);
    res.json(serializeOrder(full));
  })
);

// ---------------------------------------------------------------------
// DISCOUNT
// ---------------------------------------------------------------------

const discountSchema = z.object({
  discountType: z.enum(['FIXED', 'PERCENT']),
  discountValue: z.number().min(0),
});

ordersRouter.post(
  '/:id/discount',
  requireRole('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const data = discountSchema.parse(req.body);
    const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, 'Orden no encontrada.');

    await prisma.serviceOrder.update({
      where: { id: order.id },
      data: { discountType: data.discountType, discountValue: data.discountValue },
    });
    await recomputeOrderBudget(order.id);

    await logAudit(
      req.user,
      'ACTUALIZAR_DESCUENTO',
      'PRESUPUESTO',
      `Descuento actualizado en orden ${order.id}: ${data.discountType === 'PERCENT' ? `${data.discountValue}%` : `$${data.discountValue.toFixed(2)}`}`,
      order.id
    );
    const full = await getFullOrderOrThrow(order.id);
    res.json(serializeOrder(full));
  })
);

// ---------------------------------------------------------------------
// BUDGET APPROVE / REJECT
// ---------------------------------------------------------------------

ordersRouter.post(
  '/:id/budget/approve',
  requireRole('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, 'Orden no encontrada.');

    await prisma.serviceOrder.update({
      where: { id: order.id },
      data: { status: 'APROBADA', budgetStatus: 'aprobado', budgetApprovedAt: new Date() },
    });
    await addTimelineEvent(order.id, {
      status: 'APROBADA',
      title: 'Presupuesto aprobado por el cliente',
      description: `Presupuesto de $${order.total.toFixed(2)} aprobado formalmente.`,
      userName: req.user!.name,
      userRole: req.user!.role,
    });

    await logAudit(req.user, 'APROBAR_PRESUPUESTO', 'PRESUPUESTO', `Presupuesto aprobado para la orden ${order.id}`, order.id);
    const full = await getFullOrderOrThrow(order.id);
    res.json(serializeOrder(full));
  })
);

ordersRouter.post(
  '/:id/budget/reject',
  requireRole('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const { reason } = z.object({ reason: z.string() }).parse(req.body);
    await prisma.serviceOrder.update({
      where: { id: req.params.id },
      data: { status: 'RECHAZADA', budgetStatus: 'rechazado', budgetRejectionReason: reason },
    });
    await addTimelineEvent(req.params.id, {
      status: 'RECHAZADA',
      title: 'Presupuesto rechazado',
      description: `Motivo: ${reason}`,
      userName: req.user!.name,
      userRole: req.user!.role,
    });

    await logAudit(req.user, 'RECHAZAR_PRESUPUESTO', 'PRESUPUESTO', `Presupuesto rechazado (${req.params.id}). Motivo: ${reason}`, req.params.id);
    const full = await getFullOrderOrThrow(req.params.id);
    res.json(serializeOrder(full));
  })
);

// ---------------------------------------------------------------------
// PHOTOS
// ---------------------------------------------------------------------

ordersRouter.post(
  '/:id/photos',
  requireRole('ADMIN', 'CAJERO', 'ZAPATERO'),
  uploadPhoto.array('photos', 8),
  asyncHandler(async (req, res) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const type = (req.body.type as string) || 'otra';
    const stage = (req.body.stage as string) || 'recepcion';
    const caption = (req.body.caption as string) || undefined;
    const shoeItemId = (req.body.shoeItemId as string) || undefined;

    let count = 0;

    if (files.length > 0) {
      await prisma.shoePhoto.createMany({
        data: files.map((f) => ({
          orderId: req.params.id,
          shoeItemId,
          url: `/uploads/orders/${req.params.id}/${f.filename}`,
          type,
          stage,
          caption,
          registeredBy: req.user!.name,
        })),
      });
      count = files.length;
    } else if (typeof req.body.url === 'string' && req.body.url.trim()) {
      await prisma.shoePhoto.create({
        data: { orderId: req.params.id, shoeItemId, url: req.body.url.trim(), type, stage, caption, registeredBy: req.user!.name },
      });
      count = 1;
    } else {
      throw new HttpError(400, 'No se recibió ninguna imagen ni URL válida.');
    }

    await addTimelineEvent(req.params.id, {
      status: 'FOTOGRAFIA',
      title: `${count} fotografía(s) registrada(s)`,
      description: `Etapa: ${stage}. Tipo: ${type}.`,
      userName: req.user!.name,
      userRole: req.user!.role,
    });

    await logAudit(req.user, 'REGISTRAR_FOTOGRAFIA', 'FOTOGRAFIAS', `${count} foto(s) agregadas a orden ${req.params.id}`, req.params.id);
    const full = await getFullOrderOrThrow(req.params.id);
    res.json(serializeOrder(full));
  })
);

// ---------------------------------------------------------------------
// MATERIAL CONSUMPTION
// ---------------------------------------------------------------------

const consumeSchema = z.object({
  materialId: z.string(),
  quantity: z.number().positive(),
  notes: z.string().optional(),
});

ordersRouter.post(
  '/:id/consume-material',
  requireRole('ADMIN', 'ZAPATERO'),
  asyncHandler(async (req, res) => {
    const { materialId, quantity, notes } = consumeSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const material = await tx.material.findUnique({ where: { id: materialId } });
      if (!material) throw new HttpError(404, 'Material no encontrado en inventario.');
      if (material.currentStock < quantity) {
        throw new HttpError(400, `Stock insuficiente. Disponible: ${material.currentStock} ${material.unit}.`);
      }

      const order = await tx.serviceOrder.findUnique({ where: { id: req.params.id } });
      if (!order) throw new HttpError(404, 'Orden no encontrada.');

      const previousStock = material.currentStock;
      const newStock = previousStock - quantity;
      const totalCost = material.costPrice * quantity;

      await tx.material.update({ where: { id: materialId }, data: { currentStock: newStock } });

      await tx.materialConsumption.create({
        data: {
          orderId: order.id,
          materialId,
          quantity,
          unitCost: material.costPrice,
          totalCost,
          registeredBy: req.user!.name,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          materialId,
          type: 'CONSUMO_ORDEN',
          quantity,
          previousStock,
          newStock,
          reason: notes || `Consumo para reparación en orden ${order.orderNumber}`,
          orderId: order.id,
          registeredBy: req.user!.name,
        },
      });

      return { newStock, materialName: material.name, unit: material.unit };
    });

    await logAudit(
      req.user,
      'CONSUMO_MATERIAL',
      'INVENTARIO',
      `Descontado ${quantity} ${result.unit} de ${result.materialName} para orden ${req.params.id}`,
      materialId
    );

    const full = await getFullOrderOrThrow(req.params.id);
    res.json({
      order: serializeOrder(full),
      message: `Consumo registrado. Nuevo stock de ${result.materialName}: ${result.newStock} ${result.unit}.`,
    });
  })
);

// ---------------------------------------------------------------------
// QUALITY CONTROL
// ---------------------------------------------------------------------

const qualityControlSchema = z.object({
  checklist: z.object({
    serviceExecutedProperly: z.boolean(),
    soleProperlyAdhered: z.boolean(),
    stitchingInspected: z.boolean(),
    noAdditionalDamage: z.boolean(),
    colorUniformAndSealed: z.boolean(),
  }),
  observations: z.string().default(''),
  inspectorId: z.string(),
  inspectorName: z.string(),
  approved: z.boolean(),
  inspectedAt: z.string(),
});

ordersRouter.post(
  '/:id/quality-control',
  requireRole('ADMIN', 'ZAPATERO'),
  asyncHandler(async (req, res) => {
    const check = qualityControlSchema.parse(req.body);
    const nextStatus = check.approved ? 'LISTA_PARA_ENTREGAR' : 'EN_REPARACION';

    await prisma.serviceOrder.update({
      where: { id: req.params.id },
      data: { qualityControl: check, status: nextStatus },
    });

    await addTimelineEvent(req.params.id, {
      status: check.approved ? 'CONTROL_CALIDAD' : 'EN_REPARACION',
      title: check.approved ? 'Control de calidad aprobado' : 'Control de calidad no conforme (reingreso a taller)',
      description: check.observations || (check.approved ? 'Inspección exitosa.' : 'Detalles pendientes.'),
      userName: req.user!.name,
      userRole: req.user!.role,
    });

    await logAudit(req.user, 'CONTROL_CALIDAD', 'TALLER', `QC en orden ${req.params.id}: ${check.approved ? 'APROBADO' : 'NO CONFORME'}`, req.params.id);
    const full = await getFullOrderOrThrow(req.params.id);
    res.json(serializeOrder(full));
  })
);

// ---------------------------------------------------------------------
// PAYMENTS (Abonos)
// ---------------------------------------------------------------------

const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO']),
  type: z.enum(['ANTICIPO', 'PARCIAL', 'FINAL', 'COMPLETO']),
  reference: z.string().optional(),
  notes: z.string().optional(),
  cashReceived: z.number().nonnegative().optional(),
});

ordersRouter.post(
  '/:id/payments',
  requireRole('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const data = paymentSchema.parse(req.body);
    const changeGiven =
      data.method === 'EFECTIVO' && data.cashReceived !== undefined
        ? Math.max(0, data.cashReceived - data.amount)
        : undefined;

    const payment = await prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findUnique({ where: { id: req.params.id }, include: { customer: true } });
      if (!order) throw new HttpError(404, 'Orden no encontrada.');

      const receiptNumber = `REC-${Date.now().toString().slice(-8)}`;
      const updatedPaid = order.totalPaid + data.amount;
      const updatedBalance = Math.max(0, order.total - updatedPaid);

      const created = await tx.payment.create({
        data: {
          orderId: order.id,
          receiptNumber,
          customerId: order.customerId,
          amount: data.amount,
          method: data.method,
          type: data.type,
          reference: data.reference,
          cashReceived: data.cashReceived,
          changeGiven,
          registeredBy: req.user!.name,
          notes: data.notes,
        },
      });

      await tx.serviceOrder.update({
        where: { id: order.id },
        data: { totalPaid: updatedPaid, balancePending: updatedBalance },
      });

      await tx.customer.update({
        where: { id: order.customerId },
        data: { totalSpent: { increment: data.amount } },
      });

      await tx.orderTimelineEvent.create({
        data: {
          orderId: order.id,
          status: order.status,
          title: `Pago registrado: $${data.amount.toFixed(2)} (${data.type})`,
          description: `Método: ${data.method}. Recibo: ${receiptNumber}. Saldo restante: $${updatedBalance.toFixed(2)}${
            changeGiven ? ` · Recibido: $${data.cashReceived!.toFixed(2)}, Vuelto: $${changeGiven.toFixed(2)}` : ''
          }`,
          userName: req.user!.name,
          userRole: req.user!.role,
        },
      });

      const openRegister = await tx.cashRegister.findFirst({ where: { status: 'ABIERTA' } });
      if (openRegister) {
        const isCash = data.method === 'EFECTIVO';
        await tx.cashMovement.create({
          data: {
            cashRegisterId: openRegister.id,
            type: data.type === 'ANTICIPO' ? 'ANTICIPO' : 'PAGO_ORDEN',
            amount: data.amount,
            concept: `${data.type} de orden ${order.orderNumber} - ${order.customer.firstName} ${order.customer.lastName}${
              changeGiven ? ` (Recibido: $${data.cashReceived!.toFixed(2)}, Vuelto: $${changeGiven.toFixed(2)})` : ''
            }`,
            paymentMethod: data.method,
            orderId: order.id,
            cashReceived: data.cashReceived,
            changeGiven,
            registeredBy: req.user!.name,
          },
        });
        if (isCash) {
          await tx.cashRegister.update({
            where: { id: openRegister.id },
            data: { expectedCash: { increment: data.amount }, currentCash: { increment: data.amount } },
          });
        }
      }

      return created;
    });

    await logAudit(req.user, 'REGISTRO_PAGO', 'CAJA', `Pago de $${data.amount.toFixed(2)} registrado para orden ${req.params.id}`, payment.id);
    const full = await getFullOrderOrThrow(req.params.id);
    res.json(serializeOrder(full));
  })
);

// ---------------------------------------------------------------------
// DELIVERY
// ---------------------------------------------------------------------

const deliverySchema = z.object({
  receivedByName: z.string(),
  documentNumber: z.string().optional(),
  observations: z.string().optional(),
  signatureConfirmed: z.boolean().default(false),
  exceptionAuthorized: z.boolean().optional(),
  exceptionReason: z.string().optional(),
});

ordersRouter.post(
  '/:id/deliver',
  requireRole('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const data = deliverySchema.parse(req.body);
    const order = await prisma.serviceOrder.findUnique({ where: { id: req.params.id } });
    if (!order) throw new HttpError(404, 'Orden no encontrada.');

    if (order.balancePending > 0 && !data.exceptionAuthorized) {
      throw new HttpError(400, `No se puede entregar con saldo pendiente de $${order.balancePending.toFixed(2)} sin autorización explícita.`);
    }

    const deliveryInfo = { ...data, deliveredAt: new Date().toISOString(), deliveredBy: req.user!.name };

    await prisma.serviceOrder.update({
      where: { id: order.id },
      data: { status: 'ENTREGADA', deliveryInfo },
    });

    await addTimelineEvent(order.id, {
      status: 'ENTREGADA',
      title: 'Calzado entregado al cliente',
      description: `Entregado a ${data.receivedByName}. Observaciones: ${data.observations || 'Sin novedades.'}`,
      userName: req.user!.name,
      userRole: req.user!.role,
    });

    await logAudit(req.user, 'ENTREGA_CALZADO', 'ENTREGAS', `Orden ${order.orderNumber} entregada a ${data.receivedByName}`, order.id);
    const full = await getFullOrderOrThrow(order.id);
    res.json({ success: true, order: serializeOrder(full) });
  })
);

// ---------------------------------------------------------------------
// SALES NOTE
// ---------------------------------------------------------------------

function serializePaymentsForNote(payments: { id: string; date: Date; amount: number; method: string; type: string; receiptNumber: string; cashReceived: number | null; changeGiven: number | null }[]) {
  return payments
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((p) => ({
      id: p.id,
      date: dateStr(p.date),
      time: timeStr(p.date),
      amount: p.amount,
      method: p.method,
      type: p.type,
      receiptNumber: p.receiptNumber,
      cashReceived: p.cashReceived ?? undefined,
      changeGiven: p.changeGiven ?? undefined,
    }));
}

function serializeSalesNote(
  note: {
    id: string;
    noteNumber: string;
    orderId: string;
    date: Date;
    customerName: string;
    customerDocument: string | null;
    customerPhone: string | null;
    customerAddress: string | null;
    items: unknown;
    subtotal: number;
    discount: number;
    taxes: number;
    total: number;
    paymentMethod: string;
    cashierName: string;
  },
  order: { orderNumber: string; totalPaid: number; balancePending: number; payments: Parameters<typeof serializePaymentsForNote>[0] }
) {
  return {
    id: note.id,
    noteNumber: note.noteNumber,
    orderId: note.orderId,
    orderNumber: order.orderNumber,
    date: dateStr(note.date),
    customerName: note.customerName,
    customerDocument: note.customerDocument ?? undefined,
    customerPhone: note.customerPhone ?? undefined,
    customerAddress: note.customerAddress ?? undefined,
    items: note.items,
    subtotal: note.subtotal,
    discount: note.discount,
    taxes: note.taxes,
    total: note.total,
    paymentMethod: note.paymentMethod,
    cashierName: note.cashierName,
    payments: serializePaymentsForNote(order.payments),
    totalPaid: order.totalPaid,
    balancePending: order.balancePending,
  };
}

ordersRouter.post(
  '/:id/sales-note',
  requireRole('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.salesNote.findUnique({ where: { orderId: req.params.id } });
    if (existing) {
      const order = await prisma.serviceOrder.findUnique({
        where: { id: req.params.id },
        include: { payments: { orderBy: { date: 'asc' } } },
      });
      if (!order) throw new HttpError(404, 'Orden no encontrada.');
      return res.json(serializeSalesNote(existing, order));
    }

    const order = await prisma.serviceOrder.findUnique({
      where: { id: req.params.id },
      include: { customer: true, services: true, payments: { orderBy: { date: 'asc' } } },
    });
    if (!order) throw new HttpError(404, 'Orden no encontrada.');

    const noteNumber = `NV-${order.orderNumber.replace('OS-', '')}`;
    const items = order.services.map((s) => ({
      serviceOrMaterialName: s.name,
      quantity: 1,
      unitPrice: s.price,
      discount: 0,
      subtotal: s.price,
    }));

    const salesNote = await prisma.salesNote.create({
      data: {
        noteNumber,
        orderId: order.id,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        customerDocument: order.customer.documentId,
        customerPhone: order.customer.phone,
        customerAddress: order.customer.address,
        items,
        subtotal: order.subtotal,
        discount: order.discount,
        taxes: order.taxes,
        total: order.total,
        paymentMethod: order.payments[0]?.method || 'EFECTIVO',
        cashierName: req.user!.name,
      },
    });

    await logAudit(req.user, 'GENERAR_NOTA_VENTA', 'VENTAS', `Nota de venta ${salesNote.noteNumber} generada`, order.id);
    res.status(201).json(serializeSalesNote(salesNote, order));
  })
);

// ---------------------------------------------------------------------
// WHATSAPP
// ---------------------------------------------------------------------

const whatsappSchema = z.object({
  templateType: z.string(),
  customNotes: z.string().optional(),
});

ordersRouter.post(
  '/:id/whatsapp',
  requireRole('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const { templateType, customNotes } = whatsappSchema.parse(req.body);
    const order = await getFullOrderOrThrow(req.params.id);
    const settings = await prisma.appSettings.findUniqueOrThrow({ where: { id: 'singleton' } });

    const serialized = serializeOrder(order);
    const messageText = WhatsAppTemplateService.formatMessage(templateType, serialized, settings, customNotes);
    const phone = serialized.customer.whatsapp || serialized.customer.phone;
    const url = WhatsAppTemplateService.getWhatsAppUrl(phone, messageText);

    const record = await prisma.whatsAppMessageRecord.create({
      data: {
        orderId: order.id,
        customerName: `${serialized.customer.firstName} ${serialized.customer.lastName}`,
        customerPhone: WhatsAppTemplateService.sanitizePhone(phone),
        messageText,
        templateType,
        status: 'ENVIADO',
        deliveryMode: settings.whatsappIntegrationMode === 'CLOUD_API_ONLY' ? 'CLOUD_API_SIMULATED' : 'DIRECT_WEB',
      },
    });

    await logAudit(req.user, 'NOTIFICACION_WHATSAPP', 'WHATSAPP', `Mensaje [${templateType}] generado para orden ${order.id}`, order.id);
    res.json({ success: true, url, message: messageText, record });
  })
);
