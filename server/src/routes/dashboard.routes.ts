import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Human-readable summary of every pair of shoes in the order, e.g.
 * "Zapatos Nike + Botas Timberland" — falls back to the order's legacy
 * single-shoe columns for orders that predate the multi-pair feature. */
function describePairs(o: { shoeType: string; shoeBrand: string; items: { type: string; brand: string }[] }): string {
  if (o.items.length > 1) {
    return o.items.map((it) => `${it.type} ${it.brand}`.trim()).join(' + ');
  }
  return `${o.shoeType} ${o.shoeBrand}`.trim();
}

dashboardRouter.get(
  '/metrics',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const today = startOfDay(now);
    const in3Days = new Date(today.getTime() + 3 * DAY_MS);
    const in7Days = new Date(today.getTime() + 7 * DAY_MS);
    const startOfWeek = new Date(today.getTime() - 6 * DAY_MS);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const seriesStart = new Date(today.getTime() - 13 * DAY_MS);

    const NOT_CLOSED: any = { status: { notIn: ['ENTREGADA', 'CERRADA', 'CANCELADA', 'RECHAZADA'] } };

    const [
      activeOrders,
      inWorkshopOrders,
      overdueOrders,
      dueSoonOrders,
      lowStockMaterials,
      paymentsToday,
      paymentsWeek,
      paymentsMonth,
      seriesPayments,
      materialsCount,
      customersCount,
      cashRegister,
      recentAudit,
      allActiveForStatus,
      ordersCreatedInSeries,
      upcomingPromised,
      stockOutMovements,
    ] = await Promise.all([
      prisma.serviceOrder.count({ where: NOT_CLOSED }),
      prisma.serviceOrder.count({ where: { status: { in: ['EN_REPARACION', 'EN_RESTAURACION', 'CONTROL_CALIDAD'] } } }),
      prisma.serviceOrder.findMany({
        where: { ...NOT_CLOSED, promisedDate: { lt: today } },
        include: { customer: true, items: { orderBy: { position: 'asc' } } },
        orderBy: { promisedDate: 'asc' },
        take: 20,
      }),
      prisma.serviceOrder.findMany({
        where: { ...NOT_CLOSED, promisedDate: { gte: today, lte: in3Days } },
        include: { customer: true, items: { orderBy: { position: 'asc' } } },
        orderBy: { promisedDate: 'asc' },
        take: 20,
      }),
      prisma.material.findMany({
        where: { status: 'activo' },
        orderBy: { currentStock: 'asc' },
      }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: today } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfWeek } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfMonth } } }),
      prisma.payment.findMany({ where: { date: { gte: seriesStart } }, select: { date: true, amount: true } }),
      prisma.material.count(),
      prisma.customer.count(),
      prisma.cashRegister.findFirst({ where: { status: 'ABIERTA' } }),
      prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 12 }),
      prisma.serviceOrder.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.serviceOrder.findMany({ where: { date: { gte: seriesStart } }, select: { date: true } }),
      prisma.serviceOrder.findMany({ where: { ...NOT_CLOSED, promisedDate: { gte: today, lte: in7Days } }, select: { promisedDate: true } }),
      prisma.inventoryMovement.findMany({
        where: { date: { gte: seriesStart }, type: { in: ['SALIDA', 'CONSUMO_ORDEN', 'PERDIDA', 'DANO'] } },
        select: { date: true },
      }),
    ]);

    const lowStock = lowStockMaterials.filter((m) => m.currentStock <= m.minStock);

    const seriesMap = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(seriesStart.getTime() + i * DAY_MS);
      seriesMap.set(d.toISOString().split('T')[0], 0);
    }
    for (const p of seriesPayments) {
      const key = p.date.toISOString().split('T')[0];
      if (seriesMap.has(key)) seriesMap.set(key, (seriesMap.get(key) || 0) + p.amount);
    }
    const revenueSeries = Array.from(seriesMap.entries()).map(([date, total]) => ({ date, total }));

    const statusBreakdown = allActiveForStatus.map((s) => ({ status: s.status, count: s._count.status }));

    // Real (non-fabricated) day-by-day counters backing each KPI card's sparkline.
    const ordersCreatedSeries: number[] = new Array(14).fill(0);
    for (const o of ordersCreatedInSeries) {
      const dayIndex = Math.floor((startOfDay(o.date).getTime() - seriesStart.getTime()) / DAY_MS);
      if (dayIndex >= 0 && dayIndex < 14) ordersCreatedSeries[dayIndex] += 1;
    }

    const dueSeries: number[] = new Array(8).fill(0);
    for (const o of upcomingPromised) {
      const dayIndex = Math.floor((startOfDay(o.promisedDate).getTime() - today.getTime()) / DAY_MS);
      if (dayIndex >= 0 && dayIndex < 8) dueSeries[dayIndex] += 1;
    }

    const stockOutSeries: number[] = new Array(14).fill(0);
    for (const m of stockOutMovements) {
      const dayIndex = Math.floor((startOfDay(m.date).getTime() - seriesStart.getTime()) / DAY_MS);
      if (dayIndex >= 0 && dayIndex < 14) stockOutSeries[dayIndex] += 1;
    }

    res.json({
      revenueToday: paymentsToday._sum.amount || 0,
      revenueWeek: paymentsWeek._sum.amount || 0,
      revenueMonth: paymentsMonth._sum.amount || 0,
      activeOrdersCount: activeOrders,
      inWorkshopCount: inWorkshopOrders,
      overdueCount: overdueOrders.length,
      dueSoonCount: dueSoonOrders.length,
      lowStockCount: lowStock.length,
      materialsCount,
      customersCount,
      cashRegisterOpen: !!cashRegister,
      cashRegisterCurrent: cashRegister?.currentCash ?? 0,
      revenueSeries,
      ordersCreatedSeries,
      dueSeries,
      stockOutSeries,
      statusBreakdown,
      overdueOrders: overdueOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        promisedDate: o.promisedDate.toISOString().split('T')[0],
        customerName: `${o.customer.firstName} ${o.customer.lastName}`,
        shoeBrand: o.shoeBrand,
        shoeType: o.shoeType,
        pairsSummary: describePairs(o),
        pairsCount: Math.max(1, o.items.length),
        status: o.status,
        daysOverdue: Math.max(0, Math.round((today.getTime() - startOfDay(o.promisedDate).getTime()) / DAY_MS)),
      })),
      dueSoonOrders: dueSoonOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        promisedDate: o.promisedDate.toISOString().split('T')[0],
        customerName: `${o.customer.firstName} ${o.customer.lastName}`,
        shoeBrand: o.shoeBrand,
        shoeType: o.shoeType,
        pairsSummary: describePairs(o),
        pairsCount: Math.max(1, o.items.length),
        status: o.status,
        daysRemaining: Math.max(0, Math.round((startOfDay(o.promisedDate).getTime() - today.getTime()) / DAY_MS)),
      })),
      lowStockMaterials: lowStock.slice(0, 20).map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        currentStock: m.currentStock,
        minStock: m.minStock,
        unit: m.unit,
      })),
      recentActivity: recentAudit.map((a) => ({
        id: a.id,
        timestamp: a.timestamp.toISOString(),
        userName: a.userName,
        action: a.action,
        module: a.module,
        details: a.details,
      })),
    });
  })
);
