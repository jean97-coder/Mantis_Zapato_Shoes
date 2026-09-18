import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { logAudit } from '../lib/audit.js';
import { dateStr } from '../lib/serialize.js';

export const inventoryRouter = Router();
inventoryRouter.use(authenticate);

const materialInclude = { supplier: true } satisfies Prisma.MaterialInclude;
type FullMaterial = Prisma.MaterialGetPayload<{ include: typeof materialInclude }>;

function serializeMaterial(m: FullMaterial) {
  return {
    id: m.id,
    code: m.code,
    sku: m.sku,
    name: m.name,
    category: m.category,
    brand: m.brand,
    unit: m.unit,
    purchasePrice: m.purchasePrice,
    costPrice: m.costPrice,
    currentStock: m.currentStock,
    minStock: m.minStock,
    supplierId: m.supplierId ?? undefined,
    supplierName: m.supplier?.name ?? undefined,
    location: m.location ?? undefined,
    status: m.status,
    isTool: m.isTool,
  };
}

const purchaseInclude = {
  supplier: true,
  items: { include: { material: true } },
} satisfies Prisma.PurchaseInclude;
type FullPurchase = Prisma.PurchaseGetPayload<{ include: typeof purchaseInclude }>;

function serializePurchase(p: FullPurchase) {
  return {
    id: p.id,
    purchaseNumber: p.purchaseNumber,
    supplierId: p.supplierId,
    supplierName: p.supplier.name,
    date: dateStr(p.date),
    invoiceDocumentNumber: p.invoiceDocumentNumber ?? '',
    items: p.items.map((i) => ({
      materialId: i.materialId,
      materialName: i.material.name,
      quantity: i.quantity,
      unit: i.material.unit,
      unitCost: i.unitCost,
      discount: i.discount,
      total: i.total,
    })),
    subtotal: p.subtotal,
    discount: p.discount,
    taxes: p.taxes,
    total: p.total,
    paymentMethod: p.paymentMethod,
    status: p.status,
    registeredBy: p.registeredBy,
  };
}

// --- Materials ---

inventoryRouter.get(
  '/materials',
  asyncHandler(async (_req, res) => {
    const materials = await prisma.material.findMany({ include: materialInclude, orderBy: { name: 'asc' } });
    res.json(materials.map(serializeMaterial));
  })
);

inventoryRouter.get(
  '/materials/categories',
  asyncHandler(async (_req, res) => {
    const rows = await prisma.material.findMany({
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });
    res.json(rows.map((r) => r.category).filter(Boolean));
  })
);

const materialSchema = z.object({
  code: z.string(),
  sku: z.string(),
  name: z.string(),
  category: z.string(),
  brand: z.string().default(''),
  unit: z.string(),
  purchasePrice: z.number().default(0),
  costPrice: z.number().default(0),
  currentStock: z.number().default(0),
  minStock: z.number().default(0),
  supplierId: z.string().optional(),
  location: z.string().optional(),
  isTool: z.boolean().default(false),
  // Not settable on create (always starts "activo"), but PATCH needs it so a
  // material soft-deactivated by DELETE (because it has purchase/consumption
  // history) can be reactivated again — otherwise it would be stuck hidden
  // forever with no way back.
  status: z.enum(['activo', 'inactivo']).optional(),
});

inventoryRouter.post(
  '/materials',
  requireRole('ADMIN', 'ZAPATERO'),
  asyncHandler(async (req, res) => {
    const data = materialSchema.parse(req.body);
    const material = await prisma.material.create({ data, include: materialInclude });
    await logAudit(req.user, 'CREAR_MATERIAL', 'INVENTARIO', `Nuevo material: ${material.name}`, material.id);
    res.status(201).json(serializeMaterial(material));
  })
);

inventoryRouter.patch(
  '/materials/:id',
  requireRole('ADMIN', 'ZAPATERO'),
  asyncHandler(async (req, res) => {
    const data = materialSchema.partial().parse(req.body);
    const material = await prisma.material.update({ where: { id: req.params.id }, data, include: materialInclude });
    await logAudit(req.user, 'ACTUALIZAR_MATERIAL', 'INVENTARIO', `Material actualizado: ${material.name}`, material.id);
    res.json(serializeMaterial(material));
  })
);

inventoryRouter.delete(
  '/materials/:id',
  requireRole('ADMIN', 'ZAPATERO'),
  asyncHandler(async (req, res) => {
    const material = await prisma.material.findUnique({ where: { id: req.params.id } });
    if (!material) throw new HttpError(404, 'Material no encontrado.');

    const [consumptions, purchaseItems, movements] = await Promise.all([
      prisma.materialConsumption.count({ where: { materialId: material.id } }),
      prisma.purchaseItem.count({ where: { materialId: material.id } }),
      prisma.inventoryMovement.count({ where: { materialId: material.id } }),
    ]);

    const hasHistory = consumptions > 0 || purchaseItems > 0 || movements > 0;

    if (hasHistory) {
      // Preserve the historical record (consumption, purchases, kardex all
      // reference it) — deactivate instead of a hard delete that would break
      // those relations.
      const updated = await prisma.material.update({
        where: { id: material.id },
        data: { status: 'inactivo' },
        include: materialInclude,
      });
      await logAudit(req.user, 'DESACTIVAR_MATERIAL', 'INVENTARIO', `Material desactivado (tiene historial): ${material.name}`, material.id);
      return res.json({ mode: 'deactivated', material: serializeMaterial(updated) });
    }

    await prisma.material.delete({ where: { id: material.id } });
    await logAudit(req.user, 'ELIMINAR_MATERIAL', 'INVENTARIO', `Material eliminado: ${material.name}`, material.id);
    res.json({ mode: 'deleted', material: serializeMaterial({ ...material, supplier: null }) });
  })
);

const adjustSchema = z.object({
  newStock: z.number(),
  reason: z.string(),
  type: z.string().default('AJUSTE'),
});

inventoryRouter.post(
  '/materials/:id/adjust',
  requireRole('ADMIN', 'ZAPATERO'),
  asyncHandler(async (req, res) => {
    const { newStock, reason, type } = adjustSchema.parse(req.body);

    const material = await prisma.material.findUnique({ where: { id: req.params.id } });
    if (!material) throw new HttpError(404, 'Material no encontrado.');

    const previousStock = material.currentStock;
    await prisma.material.update({ where: { id: material.id }, data: { currentStock: newStock } });
    await prisma.inventoryMovement.create({
      data: {
        materialId: material.id,
        type,
        quantity: Math.abs(newStock - previousStock),
        previousStock,
        newStock,
        reason,
        registeredBy: req.user!.name,
      },
    });

    await logAudit(req.user, 'AJUSTE_INVENTARIO', 'INVENTARIO', `${material.name}: ${previousStock} -> ${newStock} (${reason})`, material.id);
    const updated = await prisma.material.findUnique({ where: { id: material.id }, include: materialInclude });
    res.json(serializeMaterial(updated!));
  })
);

inventoryRouter.get(
  '/movements',
  asyncHandler(async (_req, res) => {
    const movements = await prisma.inventoryMovement.findMany({
      include: { material: true },
      orderBy: { date: 'desc' },
      take: 200,
    });
    res.json(
      movements.map((m) => ({
        id: m.id,
        date: m.date.toISOString().split('T')[0],
        time: m.date.toISOString().substring(11, 16),
        materialId: m.materialId,
        materialName: m.material.name,
        type: m.type,
        quantity: m.quantity,
        unit: m.material.unit,
        previousStock: m.previousStock,
        newStock: m.newStock,
        reason: m.reason,
        orderId: m.orderId ?? undefined,
        registeredBy: m.registeredBy,
      }))
    );
  })
);

// --- Suppliers ---

inventoryRouter.get(
  '/suppliers',
  asyncHandler(async (_req, res) => {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    res.json(suppliers.map((s) => ({ ...s, createdAt: dateStr(s.createdAt) })));
  })
);

const supplierSchema = z.object({
  name: z.string(),
  tradeName: z.string().optional(),
  ruc: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

inventoryRouter.post(
  '/suppliers',
  requireRole('ADMIN', 'ZAPATERO'),
  asyncHandler(async (req, res) => {
    const data = supplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({ data });
    await logAudit(req.user, 'CREAR_PROVEEDOR', 'PROVEEDORES', `Proveedor creado: ${supplier.name}`, supplier.id);
    res.status(201).json({ ...supplier, createdAt: dateStr(supplier.createdAt) });
  })
);

inventoryRouter.patch(
  '/suppliers/:id',
  requireRole('ADMIN', 'ZAPATERO'),
  asyncHandler(async (req, res) => {
    const data = supplierSchema.partial().parse(req.body);
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
    await logAudit(req.user, 'ACTUALIZAR_PROVEEDOR', 'PROVEEDORES', `Proveedor actualizado: ${supplier.name}`, supplier.id);
    res.json({ ...supplier, createdAt: dateStr(supplier.createdAt) });
  })
);

inventoryRouter.delete(
  '/suppliers/:id',
  requireRole('ADMIN', 'ZAPATERO'),
  asyncHandler(async (req, res) => {
    const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!supplier) throw new HttpError(404, 'Proveedor no encontrado.');

    const [materialCount, purchaseCount] = await Promise.all([
      prisma.material.count({ where: { supplierId: supplier.id } }),
      prisma.purchase.count({ where: { supplierId: supplier.id } }),
    ]);

    if (materialCount > 0 || purchaseCount > 0) {
      throw new HttpError(
        409,
        `No se puede eliminar: el proveedor tiene ${materialCount} insumo(s) y ${purchaseCount} compra(s) asociadas. Reasigna o elimina esos registros primero.`
      );
    }

    await prisma.supplier.delete({ where: { id: supplier.id } });
    await logAudit(req.user, 'ELIMINAR_PROVEEDOR', 'PROVEEDORES', `Proveedor eliminado: ${supplier.name}`, supplier.id);
    res.json({ success: true });
  })
);

// --- Purchases ---

inventoryRouter.get(
  '/purchases',
  asyncHandler(async (_req, res) => {
    const purchases = await prisma.purchase.findMany({
      include: purchaseInclude,
      orderBy: { date: 'desc' },
    });
    res.json(purchases.map(serializePurchase));
  })
);

const purchaseSchema = z.object({
  supplierId: z.string(),
  invoiceDocumentNumber: z.string().optional(),
  paymentMethod: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO']),
  items: z
    .array(
      z.object({
        materialId: z.string(),
        quantity: z.number().positive(),
        unitCost: z.number().nonnegative(),
        discount: z.number().default(0),
      })
    )
    .min(1),
});

inventoryRouter.post(
  '/purchases',
  requireRole('ADMIN', 'ZAPATERO', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const data = purchaseSchema.parse(req.body);
    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) throw new HttpError(404, 'Proveedor no encontrado.');

    const itemsWithTotal = data.items.map((i) => ({ ...i, total: i.quantity * i.unitCost - i.discount }));
    const subtotal = itemsWithTotal.reduce((acc, i) => acc + i.quantity * i.unitCost, 0);
    const discount = itemsWithTotal.reduce((acc, i) => acc + i.discount, 0);
    const total = subtotal - discount;

    const count = await prisma.purchase.count();
    const purchaseNumber = `OC-${String(count + 1).padStart(4, '0')}`;

    const purchaseId = await prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          purchaseNumber,
          supplierId: data.supplierId,
          invoiceDocumentNumber: data.invoiceDocumentNumber,
          subtotal,
          discount,
          taxes: 0,
          total,
          paymentMethod: data.paymentMethod,
          registeredBy: req.user!.name,
          items: { create: itemsWithTotal },
        },
      });

      for (const item of itemsWithTotal) {
        const material = await tx.material.findUnique({ where: { id: item.materialId } });
        if (!material) continue;
        const previousStock = material.currentStock;
        const newStock = previousStock + item.quantity;
        await tx.material.update({ where: { id: item.materialId }, data: { currentStock: newStock, purchasePrice: item.unitCost } });
        await tx.inventoryMovement.create({
          data: {
            materialId: item.materialId,
            type: 'COMPRA',
            quantity: item.quantity,
            previousStock,
            newStock,
            reason: `Compra ${purchaseNumber} - ${supplier.name}`,
            registeredBy: req.user!.name,
          },
        });
      }

      // Register the purchase as a financial outflow so it always shows up
      // in the expenses ledger, and additionally hits the physical cash
      // drawer when it was actually paid in cash — mirroring how the
      // regular /cash/expenses endpoint books an EFECTIVO expense.
      const expense = await tx.expense.create({
        data: {
          category: 'Materiales',
          description: `Compra ${purchaseNumber} a ${supplier.name}${data.invoiceDocumentNumber ? ` (Doc. ${data.invoiceDocumentNumber})` : ''}`,
          amount: total,
          receiptNumber: data.invoiceDocumentNumber,
          paidWith: data.paymentMethod,
          registeredBy: req.user!.name,
        },
      });

      const register = await tx.cashRegister.findFirst({ where: { status: 'ABIERTA' } });
      if (register) {
        await tx.cashMovement.create({
          data: {
            cashRegisterId: register.id,
            type: 'GASTO',
            amount: total,
            concept: `Compra de insumos: ${purchaseNumber} - ${supplier.name}`,
            paymentMethod: data.paymentMethod,
            expenseId: expense.id,
            registeredBy: req.user!.name,
          },
        });
        if (data.paymentMethod === 'EFECTIVO') {
          await tx.cashRegister.update({
            where: { id: register.id },
            data: { expectedCash: { decrement: total }, currentCash: { decrement: total } },
          });
        }
      }

      return created.id;
    });

    const full = await prisma.purchase.findUniqueOrThrow({ where: { id: purchaseId }, include: purchaseInclude });
    await logAudit(req.user, 'REGISTRAR_COMPRA', 'COMPRAS', `Compra ${full.purchaseNumber} por $${total.toFixed(2)}`, full.id);
    res.status(201).json(serializePurchase(full));
  })
);
