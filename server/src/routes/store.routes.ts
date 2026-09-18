import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { logAudit } from '../lib/audit.js';
import { dateStr, timeStr } from '../lib/serialize.js';
import { uploadStoreImage } from '../lib/upload.js';

export const storeRouter = Router();
storeRouter.use(authenticate);

function serializeProduct(p: {
  id: string; code: string | null; name: string; description: string; size: string; color: string;
  style: string; price: number; costPrice: number; stock: number; minStock: number; imageUrl: string | null; active: boolean;
}) {
  return {
    id: p.id,
    code: p.code ?? undefined,
    name: p.name,
    description: p.description,
    size: p.size,
    color: p.color,
    style: p.style,
    price: p.price,
    costPrice: p.costPrice,
    stock: p.stock,
    minStock: p.minStock,
    imageUrl: p.imageUrl ?? undefined,
    active: p.active,
    isLowStock: p.stock <= p.minStock,
  };
}

// ---------------------------------------------------------------------
// PRODUCT CATALOG
// ---------------------------------------------------------------------

storeRouter.get(
  '/products',
  asyncHandler(async (_req, res) => {
    const products = await prisma.storeProduct.findMany({ orderBy: { name: 'asc' } });
    res.json(products.map(serializeProduct));
  })
);

const productSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  description: z.string().default(''),
  size: z.string().min(1),
  color: z.string().min(1),
  style: z.string().default(''),
  price: z.number().positive(),
  costPrice: z.number().min(0).default(0),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
  imageUrl: z.string().optional(),
});

storeRouter.post(
  '/products',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = productSchema.parse(req.body);
    const product = await prisma.storeProduct.create({ data: { ...data, code: data.code || undefined } });
    await logAudit(req.user, 'CREAR_PRODUCTO_TIENDA', 'TIENDA', `Nuevo producto: ${product.name} (talla ${product.size}, color ${product.color})`, product.id);
    res.status(201).json(serializeProduct(product));
  })
);

storeRouter.patch(
  '/products/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = productSchema.partial().extend({ active: z.boolean().optional() }).parse(req.body);
    const existing = await prisma.storeProduct.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Producto no encontrado.');

    const product = await prisma.storeProduct.update({
      where: { id: req.params.id },
      data: { ...data, code: data.code === '' ? null : data.code },
    });
    await logAudit(req.user, 'ACTUALIZAR_PRODUCTO_TIENDA', 'TIENDA', `Producto actualizado: ${product.name}`, product.id);
    res.json(serializeProduct(product));
  })
);

storeRouter.delete(
  '/products/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const product = await prisma.storeProduct.findUnique({ where: { id: req.params.id } });
    if (!product) throw new HttpError(404, 'Producto no encontrado.');

    const saleCount = await prisma.storeSaleItem.count({ where: { productId: product.id } });
    if (saleCount > 0) {
      const deactivated = await prisma.storeProduct.update({ where: { id: product.id }, data: { active: false } });
      await logAudit(req.user, 'DESACTIVAR_PRODUCTO_TIENDA', 'TIENDA', `Producto desactivado (tiene ventas registradas): ${product.name}`, product.id);
      return res.json({ mode: 'deactivated', product: serializeProduct(deactivated) });
    }

    await prisma.storeProduct.delete({ where: { id: product.id } });
    await logAudit(req.user, 'ELIMINAR_PRODUCTO_TIENDA', 'TIENDA', `Producto eliminado: ${product.name}`, product.id);
    res.json({ mode: 'deleted' });
  })
);

storeRouter.post(
  '/products/upload-image',
  requireRole('ADMIN'),
  uploadStoreImage.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'No se recibió ninguna imagen.');
    res.json({ url: `/uploads/store/${req.file.filename}` });
  })
);

// ---------------------------------------------------------------------
// POINT OF SALE
// ---------------------------------------------------------------------

storeRouter.get(
  '/sales',
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const sales = await prisma.storeSale.findMany({
      where: {
        ...(from ? { date: { gte: new Date(`${from}T00:00:00`) } } : {}),
        ...(to ? { date: { lte: new Date(`${to}T23:59:59`) } } : {}),
      },
      include: { items: true },
      orderBy: { date: 'desc' },
    });
    res.json(
      sales.map((s) => ({
        id: s.id,
        saleNumber: s.saleNumber,
        date: dateStr(s.date),
        time: timeStr(s.date),
        customerName: s.customerName ?? undefined,
        customerDocument: s.customerDocument ?? undefined,
        subtotal: s.subtotal,
        taxRatePercent: s.taxRatePercent,
        taxAmount: s.taxAmount,
        total: s.total,
        paymentMethod: s.paymentMethod,
        cashReceived: s.cashReceived,
        changeGiven: s.changeGiven,
        registeredBy: s.registeredBy,
        items: s.items.map((it) => ({
          id: it.id,
          productName: it.productName,
          size: it.size,
          color: it.color,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.totalPrice,
        })),
      }))
    );
  })
);

storeRouter.get(
  '/sales/:id',
  asyncHandler(async (req, res) => {
    const s = await prisma.storeSale.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!s) throw new HttpError(404, 'Venta no encontrada.');
    res.json({
      id: s.id,
      saleNumber: s.saleNumber,
      date: dateStr(s.date),
      time: timeStr(s.date),
      customerName: s.customerName ?? undefined,
      customerDocument: s.customerDocument ?? undefined,
      subtotal: s.subtotal,
      taxRatePercent: s.taxRatePercent,
      taxAmount: s.taxAmount,
      total: s.total,
      paymentMethod: s.paymentMethod,
      cashReceived: s.cashReceived,
      changeGiven: s.changeGiven,
      registeredBy: s.registeredBy,
      items: s.items.map((it) => ({
        id: it.id,
        productName: it.productName,
        size: it.size,
        color: it.color,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
      })),
    });
  })
);

const saleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  paymentMethod: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO']),
  cashReceived: z.number().min(0),
  customerName: z.string().optional(),
  customerDocument: z.string().optional(),
});

storeRouter.post(
  '/sales',
  requireRole('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const data = saleSchema.parse(req.body);

    const register = await prisma.cashRegister.findFirst({ where: { status: 'ABIERTA' } });
    if (!register) throw new HttpError(400, 'No hay una caja abierta. Abre un turno de caja primero.');

    const products = await prisma.storeProduct.findMany({
      where: { id: { in: data.items.map((i) => i.productId) } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const lineItems = data.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) throw new HttpError(404, `Producto no encontrado (${item.productId}).`);
      if (!product.active) throw new HttpError(400, `El producto "${product.name}" ya no está disponible.`);
      if (product.stock < item.quantity) {
        throw new HttpError(400, `Stock insuficiente para "${product.name}" (disponible: ${product.stock}).`);
      }
      return {
        product,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: product.price * item.quantity,
      };
    });

    const subtotal = lineItems.reduce((acc, li) => acc + li.totalPrice, 0);
    const settings = await prisma.appSettings.findUniqueOrThrow({ where: { id: 'singleton' } });
    const taxRatePercent = settings.taxRatePercent;
    const taxAmount = subtotal * (taxRatePercent / 100);
    const total = subtotal + taxAmount;

    let cashReceived = data.cashReceived;
    let changeGiven = 0;
    if (data.paymentMethod === 'EFECTIVO') {
      if (cashReceived < total) throw new HttpError(400, 'El efectivo recibido es menor al total a cobrar.');
      changeGiven = cashReceived - total;
    } else {
      cashReceived = total;
      changeGiven = 0;
    }

    const seq = settings.nextStoreSaleSequence;
    const saleNumber = `${settings.storeSalePrefix}${String(seq).padStart(6, '0')}`;

    const sale = await prisma.$transaction(async (tx) => {
      await tx.appSettings.update({ where: { id: 'singleton' }, data: { nextStoreSaleSequence: seq + 1 } });

      for (const li of lineItems) {
        await tx.storeProduct.update({ where: { id: li.product.id }, data: { stock: { decrement: li.quantity } } });
      }

      const created = await tx.storeSale.create({
        data: {
          saleNumber,
          customerName: data.customerName || undefined,
          customerDocument: data.customerDocument || undefined,
          subtotal,
          taxRatePercent,
          taxAmount,
          total,
          paymentMethod: data.paymentMethod,
          cashReceived,
          changeGiven,
          registeredBy: req.user!.name,
          items: {
            create: lineItems.map((li) => ({
              productId: li.product.id,
              productName: li.product.name,
              size: li.product.size,
              color: li.product.color,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              totalPrice: li.totalPrice,
            })),
          },
        },
        include: { items: true },
      });

      await tx.cashMovement.create({
        data: {
          cashRegisterId: register.id,
          type: 'VENTA',
          amount: total,
          concept: `Venta de tienda ${saleNumber}${data.customerName ? ` - ${data.customerName}` : ''}`,
          paymentMethod: data.paymentMethod,
          storeSaleId: created.id,
          cashReceived,
          changeGiven,
          registeredBy: req.user!.name,
        },
      });

      if (data.paymentMethod === 'EFECTIVO') {
        await tx.cashRegister.update({
          where: { id: register.id },
          data: { expectedCash: { increment: total }, currentCash: { increment: total } },
        });
      }

      return created;
    });

    await logAudit(req.user, 'VENTA_TIENDA', 'TIENDA', `Venta de tienda ${saleNumber} por $${total.toFixed(2)}`, sale.id);

    res.status(201).json({
      id: sale.id,
      saleNumber: sale.saleNumber,
      date: dateStr(sale.date),
      time: timeStr(sale.date),
      customerName: sale.customerName ?? undefined,
      customerDocument: sale.customerDocument ?? undefined,
      subtotal: sale.subtotal,
      taxRatePercent: sale.taxRatePercent,
      taxAmount: sale.taxAmount,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      cashReceived: sale.cashReceived,
      changeGiven: sale.changeGiven,
      registeredBy: sale.registeredBy,
      items: sale.items.map((it) => ({
        id: it.id,
        productName: it.productName,
        size: it.size,
        color: it.color,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
      })),
    });
  })
);
