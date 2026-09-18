import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { logAudit } from '../lib/audit.js';
import { dateStr, timeStr } from '../lib/serialize.js';

export const cashRouter = Router();
cashRouter.use(authenticate);

const movementInclude = { partner: true } satisfies Prisma.CashMovementInclude;
const registerInclude = {
  movements: { orderBy: { date: 'desc' as const }, include: movementInclude },
} satisfies Prisma.CashRegisterInclude;
type FullRegister = Prisma.CashRegisterGetPayload<{ include: typeof registerInclude }>;
type FullMovement = FullRegister['movements'][number];

// Movements only store a plain orderId (no Prisma relation), so resolving a
// human-readable order number for traceability needs one batched lookup
// rather than an N+1 query per movement. Partner is a real relation and is
// included directly instead.
async function buildOrderNumberMap(orderIds: string[]): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(orderIds));
  if (uniqueIds.length === 0) return {};
  const orders = await prisma.serviceOrder.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, orderNumber: true },
  });
  return Object.fromEntries(orders.map((o) => [o.id, o.orderNumber]));
}

function serializeMovement(m: FullMovement, orderNumberMap: Record<string, string>) {
  return {
    id: m.id,
    date: dateStr(m.date),
    time: timeStr(m.date),
    type: m.type,
    amount: m.amount,
    concept: m.concept,
    paymentMethod: m.paymentMethod,
    orderId: m.orderId ?? undefined,
    orderNumber: m.orderId ? orderNumberMap[m.orderId] : undefined,
    expenseId: m.expenseId ?? undefined,
    partnerId: m.partnerId ?? undefined,
    partnerName: m.partner?.name,
    cashReceived: m.cashReceived ?? undefined,
    changeGiven: m.changeGiven ?? undefined,
    registeredBy: m.registeredBy,
  };
}

function serializeRegister(register: FullRegister, orderNumberMap: Record<string, string>) {
  return {
    id: register.id,
    openedAt: `${dateStr(register.openedAt)} ${timeStr(register.openedAt)}`,
    closedAt: register.closedAt ? `${dateStr(register.closedAt)} ${timeStr(register.closedAt)}` : undefined,
    openedBy: register.openedBy,
    closedBy: register.closedBy ?? undefined,
    initialAmount: register.initialAmount,
    currentCash: register.currentCash,
    expectedCash: register.expectedCash,
    actualCashCounted: register.actualCashCounted ?? undefined,
    difference: register.difference ?? undefined,
    status: register.status,
    movements: register.movements.map((m) => serializeMovement(m, orderNumberMap)),
  };
}

async function serializeRegisterWithLookup(register: FullRegister) {
  const orderNumberMap = await buildOrderNumberMap(register.movements.flatMap((m) => (m.orderId ? [m.orderId] : [])));
  return serializeRegister(register, orderNumberMap);
}

const INCOME_TYPES = new Set(['ANTICIPO', 'PAGO_ORDEN', 'VENTA', 'INGRESO_MANUAL', 'APORTE_CAPITAL']);
const OUTFLOW_TYPES = new Set(['GASTO', 'RETIRO', 'DEVOLUCION']);
// Capital returned to a partner is tracked as its own summary bucket (not
// lumped into general GASTO/RETIRO egresos) so the report can show
// contributions vs. paybacks distinctly.
const CAPITAL_RETURN_TYPE = 'DEVOLUCION_CAPITAL';

cashRouter.get(
  '/current',
  asyncHandler(async (_req, res) => {
    const register = await prisma.cashRegister.findFirst({
      where: { status: 'ABIERTA' },
      include: registerInclude,
      orderBy: { openedAt: 'desc' },
    });
    if (!register) return res.json(null);
    res.json(await serializeRegisterWithLookup(register));
  })
);

cashRouter.get(
  '/history',
  asyncHandler(async (_req, res) => {
    const registers = await prisma.cashRegister.findMany({
      include: registerInclude,
      orderBy: { openedAt: 'desc' },
      take: 30,
    });
    const orderNumberMap = await buildOrderNumberMap(
      registers.flatMap((r) => r.movements.flatMap((m) => (m.orderId ? [m.orderId] : [])))
    );
    res.json(registers.map((r) => serializeRegister(r, orderNumberMap)));
  })
);

cashRouter.post(
  '/open',
  requireRole('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const { initialAmount } = z.object({ initialAmount: z.number().nonnegative() }).parse(req.body);

    const existing = await prisma.cashRegister.findFirst({ where: { status: 'ABIERTA' } });
    if (existing) throw new HttpError(409, 'Ya existe una caja abierta.');

    const register = await prisma.cashRegister.create({
      data: {
        openedBy: req.user!.name,
        initialAmount,
        currentCash: initialAmount,
        expectedCash: initialAmount,
        status: 'ABIERTA',
        movements: {
          create: {
            type: 'INGRESO_MANUAL',
            amount: initialAmount,
            concept: 'Apertura de caja - Fondo inicial',
            paymentMethod: 'EFECTIVO',
            registeredBy: req.user!.name,
          },
        },
      },
      include: registerInclude,
    });

    await logAudit(req.user, 'APERTURA_CAJA', 'CAJA', `Caja abierta con $${initialAmount.toFixed(2)}`, register.id);
    res.status(201).json(await serializeRegisterWithLookup(register));
  })
);

cashRouter.post(
  '/close',
  requireRole('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const { actualCashCounted } = z.object({ actualCashCounted: z.number().nonnegative() }).parse(req.body);

    const register = await prisma.cashRegister.findFirst({ where: { status: 'ABIERTA' } });
    if (!register) throw new HttpError(404, 'No hay caja abierta.');

    const difference = actualCashCounted - register.expectedCash;
    const updated = await prisma.cashRegister.update({
      where: { id: register.id },
      data: { closedAt: new Date(), closedBy: req.user!.name, actualCashCounted, difference, status: 'CERRADA' },
      include: registerInclude,
    });

    await logAudit(
      req.user,
      'CIERRE_CAJA',
      'CAJA',
      `Caja cerrada. Esperado: $${register.expectedCash.toFixed(2)}, Contado: $${actualCashCounted.toFixed(2)}, Dif: $${difference.toFixed(2)}`,
      register.id
    );
    res.json(await serializeRegisterWithLookup(updated));
  })
);

const expenseSchema = z.object({
  date: z.string().optional(),
  category: z.string(),
  description: z.string(),
  amount: z.number().positive(),
  receiptNumber: z.string().optional(),
  paidWith: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO']),
});

cashRouter.get(
  '/expenses',
  asyncHandler(async (_req, res) => {
    const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
    res.json(expenses.map((e) => ({ ...e, date: dateStr(e.date) })));
  })
);

cashRouter.post(
  '/expenses',
  requireRole('ADMIN', 'CAJERO'),
  asyncHandler(async (req, res) => {
    const data = expenseSchema.parse(req.body);
    const { date, ...rest } = data;
    const expense = await prisma.expense.create({
      data: { ...rest, ...(date ? { date: new Date(date) } : {}), registeredBy: req.user!.name },
    });

    // Always leave a CashMovement trail for the day's financial report —
    // regardless of payment method — mirroring how customer payments are
    // logged. Only the physical drawer counters (currentCash/expectedCash)
    // are conditional on the expense actually having been paid in cash.
    const register = await prisma.cashRegister.findFirst({ where: { status: 'ABIERTA' } });
    if (register) {
      await prisma.cashMovement.create({
        data: {
          cashRegisterId: register.id,
          type: 'GASTO',
          amount: data.amount,
          concept: `Gasto: ${data.category} - ${data.description}`,
          paymentMethod: data.paidWith,
          expenseId: expense.id,
          registeredBy: req.user!.name,
        },
      });
      if (data.paidWith === 'EFECTIVO') {
        await prisma.cashRegister.update({
          where: { id: register.id },
          data: {
            expectedCash: { decrement: data.amount },
            currentCash: { decrement: data.amount },
          },
        });
      }
    }

    await logAudit(req.user, 'REGISTRAR_GASTO', 'GASTOS', `Gasto de $${data.amount.toFixed(2)} (${data.category})`, expense.id);
    res.status(201).json({ ...expense, date: dateStr(expense.date) });
  })
);

// --- Partners (Socios) — capital contributions & returns are tracked per partner ---

async function computePartnerBalances(partnerIds: string[]) {
  const totals = await prisma.cashMovement.groupBy({
    by: ['partnerId', 'type'],
    where: { partnerId: { in: partnerIds }, type: { in: ['APORTE_CAPITAL', CAPITAL_RETURN_TYPE] } },
    _sum: { amount: true },
  });
  const map = new Map<string, { totalContributed: number; totalReturned: number }>();
  for (const id of partnerIds) map.set(id, { totalContributed: 0, totalReturned: 0 });
  for (const t of totals) {
    if (!t.partnerId) continue;
    const entry = map.get(t.partnerId);
    if (!entry) continue;
    if (t.type === 'APORTE_CAPITAL') entry.totalContributed = t._sum.amount ?? 0;
    else if (t.type === CAPITAL_RETURN_TYPE) entry.totalReturned = t._sum.amount ?? 0;
  }
  return map;
}

cashRouter.get(
  '/partners',
  asyncHandler(async (_req, res) => {
    const partners = await prisma.partner.findMany({ orderBy: { name: 'asc' } });
    const balances = await computePartnerBalances(partners.map((p) => p.id));
    res.json(
      partners.map((p) => {
        const bal = balances.get(p.id)!;
        return {
          id: p.id,
          name: p.name,
          email: p.email ?? undefined,
          phone: p.phone ?? undefined,
          notes: p.notes ?? undefined,
          isActive: p.isActive,
          totalContributed: bal.totalContributed,
          totalReturned: bal.totalReturned,
          pendingBalance: bal.totalContributed - bal.totalReturned,
        };
      })
    );
  })
);

// Full chronological history of one partner's capital contributions and
// returns, oldest first, with a running balance after each entry — this is
// what powers the "hasta completar la devolución total" breakdown, and is
// intentionally NOT bounded by any date range (a partial repayment made
// months ago still has to count toward the running balance today).
cashRouter.get(
  '/partners/:id/movements',
  asyncHandler(async (req, res) => {
    const partner = await prisma.partner.findUnique({ where: { id: req.params.id } });
    if (!partner) throw new HttpError(404, 'Socio no encontrado.');

    const movements = await prisma.cashMovement.findMany({
      where: { partnerId: partner.id, type: { in: ['APORTE_CAPITAL', CAPITAL_RETURN_TYPE] } },
      orderBy: { date: 'asc' },
    });

    let running = 0;
    const history = movements.map((m) => {
      running += m.type === 'APORTE_CAPITAL' ? m.amount : -m.amount;
      return {
        id: m.id,
        date: dateStr(m.date),
        time: timeStr(m.date),
        type: m.type,
        amount: m.amount,
        concept: m.concept,
        paymentMethod: m.paymentMethod,
        registeredBy: m.registeredBy,
        runningBalance: running,
      };
    });

    res.json({ partnerId: partner.id, partnerName: partner.name, history: history.reverse() });
  })
);

const partnerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

function serializePartner(p: { id: string; name: string; email: string | null; phone: string | null; notes: string | null; isActive: boolean }, bal: { totalContributed: number; totalReturned: number }) {
  return {
    id: p.id,
    name: p.name,
    email: p.email ?? undefined,
    phone: p.phone ?? undefined,
    notes: p.notes ?? undefined,
    isActive: p.isActive,
    totalContributed: bal.totalContributed,
    totalReturned: bal.totalReturned,
    pendingBalance: bal.totalContributed - bal.totalReturned,
  };
}

cashRouter.post(
  '/partners',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = partnerSchema.parse(req.body);
    const partner = await prisma.partner.create({
      data: { name: data.name, email: data.email || undefined, phone: data.phone, notes: data.notes },
    });
    await logAudit(req.user, 'CREAR_SOCIO', 'SOCIOS', `Nuevo socio registrado: ${partner.name}`, partner.id);
    res.status(201).json(serializePartner(partner, { totalContributed: 0, totalReturned: 0 }));
  })
);

cashRouter.patch(
  '/partners/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = partnerSchema.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
    const existing = await prisma.partner.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, 'Socio no encontrado.');

    const partner = await prisma.partner.update({
      where: { id: req.params.id },
      data: { ...data, email: data.email === '' ? null : data.email },
    });
    await logAudit(req.user, 'ACTUALIZAR_SOCIO', 'SOCIOS', `Socio actualizado: ${partner.name}`, partner.id);

    const balances = await computePartnerBalances([partner.id]);
    res.json(serializePartner(partner, balances.get(partner.id)!));
  })
);

cashRouter.delete(
  '/partners/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const partner = await prisma.partner.findUnique({ where: { id: req.params.id } });
    if (!partner) throw new HttpError(404, 'Socio no encontrado.');

    const movementCount = await prisma.cashMovement.count({ where: { partnerId: partner.id } });
    if (movementCount > 0) {
      await prisma.partner.update({ where: { id: partner.id }, data: { isActive: false } });
      await logAudit(req.user, 'DESACTIVAR_SOCIO', 'SOCIOS', `Socio desactivado (tiene aportes/devoluciones registrados): ${partner.name}`, partner.id);
      return res.json({ mode: 'deactivated' });
    }

    await prisma.partner.delete({ where: { id: partner.id } });
    await logAudit(req.user, 'ELIMINAR_SOCIO', 'SOCIOS', `Socio eliminado: ${partner.name}`, partner.id);
    res.json({ mode: 'deleted' });
  })
);

// --- Capital injections (partner contributions) ---

const capitalInjectionSchema = z.object({
  partnerId: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().min(1),
  method: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO']).default('EFECTIVO'),
});

cashRouter.post(
  '/capital-injection',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = capitalInjectionSchema.parse(req.body);
    const partner = await prisma.partner.findUnique({ where: { id: data.partnerId } });
    if (!partner) throw new HttpError(404, 'Socio no encontrado.');

    const register = await prisma.cashRegister.findFirst({ where: { status: 'ABIERTA' } });
    if (!register) throw new HttpError(400, 'No hay una caja abierta. Abre un turno de caja primero.');

    await prisma.cashMovement.create({
      data: {
        cashRegisterId: register.id,
        type: 'APORTE_CAPITAL',
        amount: data.amount,
        concept: `Aporte de Capital del Socio: ${partner.name} - ${data.description}`,
        paymentMethod: data.method,
        partnerId: partner.id,
        registeredBy: req.user!.name,
      },
    });

    if (data.method === 'EFECTIVO') {
      await prisma.cashRegister.update({
        where: { id: register.id },
        data: { expectedCash: { increment: data.amount }, currentCash: { increment: data.amount } },
      });
    }

    await logAudit(
      req.user,
      'APORTE_CAPITAL',
      'CAJA',
      `Aporte de capital de $${data.amount.toFixed(2)} del socio ${partner.name}: ${data.description}`,
      register.id
    );

    const updated = await prisma.cashRegister.findUniqueOrThrow({ where: { id: register.id }, include: registerInclude });
    res.status(201).json(await serializeRegisterWithLookup(updated));
  })
);

// --- Capital returns (paying a partner back) ---

const capitalReturnSchema = z.object({
  partnerId: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().min(1),
  method: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO']).default('EFECTIVO'),
});

cashRouter.post(
  '/capital-return',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const data = capitalReturnSchema.parse(req.body);
    const partner = await prisma.partner.findUnique({ where: { id: data.partnerId } });
    if (!partner) throw new HttpError(404, 'Socio no encontrado.');

    const balances = await computePartnerBalances([partner.id]);
    const pendingBalance = balances.get(partner.id)!.totalContributed - balances.get(partner.id)!.totalReturned;
    if (data.amount > pendingBalance + 0.005) {
      throw new HttpError(
        400,
        `El monto excede el saldo pendiente de devolución a ${partner.name} ($${pendingBalance.toFixed(2)}).`
      );
    }

    const register = await prisma.cashRegister.findFirst({ where: { status: 'ABIERTA' } });
    if (!register) throw new HttpError(400, 'No hay una caja abierta. Abre un turno de caja primero.');

    await prisma.cashMovement.create({
      data: {
        cashRegisterId: register.id,
        type: CAPITAL_RETURN_TYPE,
        amount: data.amount,
        concept: `Devolución de Capital al Socio: ${partner.name} - ${data.description}`,
        paymentMethod: data.method,
        partnerId: partner.id,
        registeredBy: req.user!.name,
      },
    });

    if (data.method === 'EFECTIVO') {
      await prisma.cashRegister.update({
        where: { id: register.id },
        data: { expectedCash: { decrement: data.amount }, currentCash: { decrement: data.amount } },
      });
    }

    await logAudit(
      req.user,
      'DEVOLUCION_CAPITAL',
      'CAJA',
      `Devolución de capital de $${data.amount.toFixed(2)} al socio ${partner.name}: ${data.description}`,
      register.id
    );

    const updated = await prisma.cashRegister.findUniqueOrThrow({ where: { id: register.id }, include: registerInclude });
    res.status(201).json(await serializeRegisterWithLookup(updated));
  })
);

// --- Historical / date-range movement report (across all registers, open or closed) ---

const movementsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

cashRouter.get(
  '/movements',
  asyncHandler(async (req, res) => {
    const { from, to } = movementsQuerySchema.parse(req.query);
    const today = dateStr(new Date());
    const fromDate = new Date(`${from || to || today}T00:00:00.000Z`);
    const toDate = new Date(`${to || from || today}T23:59:59.999Z`);

    const movements = await prisma.cashMovement.findMany({
      where: { date: { gte: fromDate, lte: toDate } },
      orderBy: { date: 'desc' },
      include: movementInclude,
    });

    const orderNumberMap = await buildOrderNumberMap(movements.flatMap((m) => (m.orderId ? [m.orderId] : [])));
    const serialized = movements.map((m) => serializeMovement(m, orderNumberMap));

    let totalIngresos = 0;
    let totalEgresos = 0;
    let totalAportes = 0;
    let totalDevolucionesCapital = 0;
    for (const m of movements) {
      if (m.type === 'APORTE_CAPITAL') totalAportes += m.amount;
      else if (m.type === CAPITAL_RETURN_TYPE) totalDevolucionesCapital += m.amount;
      else if (INCOME_TYPES.has(m.type)) totalIngresos += m.amount;
      else if (OUTFLOW_TYPES.has(m.type)) totalEgresos += m.amount;
    }

    res.json({
      from: dateStr(fromDate),
      to: dateStr(toDate),
      movements: serialized,
      summary: {
        totalIngresos,
        totalEgresos,
        totalAportes,
        totalDevolucionesCapital,
        balance: totalIngresos + totalAportes - totalEgresos - totalDevolucionesCapital,
        count: serialized.length,
      },
    });
  })
);
