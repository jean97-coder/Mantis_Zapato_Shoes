import { prisma } from './prisma.js';

const TELEGRAM_API = 'https://api.telegram.org';
const NOT_CLOSED_STATUSES = ['ENTREGADA', 'CERRADA', 'CANCELADA', 'RECHAZADA'];

interface TelegramConfig {
  token: string;
  chatId: string;
}

interface TelegramSendResult {
  ok: boolean;
  description?: string;
}

function getConfig(): TelegramConfig | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}

export function isTelegramConfigured(): boolean {
  return getConfig() !== null;
}

async function sendRawMessage(text: string): Promise<TelegramSendResult> {
  const config = getConfig();
  if (!config) {
    return { ok: false, description: "TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no están configurados en server/.env." };
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${config.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return { ok: false, description: data?.description || `Telegram respondió con estado HTTP ${res.status}.` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, description: err instanceof Error ? err.message : 'No se pudo contactar la API de Telegram.' };
  }
}

export async function sendTelegramTestMessage(): Promise<TelegramSendResult> {
  const text =
    `✅ <b>JC SHOE'S ERP — Prueba de Conexión</b>\n\n` +
    `El bot de alertas internas de Telegram está configurado correctamente y listo para avisar sobre entregas atrasadas o próximas a vencer.\n\n` +
    `🕒 ${new Date().toLocaleString('es-EC', { dateStyle: 'full', timeStyle: 'short', hour12: false })}`;
  return sendRawMessage(text);
}

function daysBetween(fromMidnight: Date, toMidnight: Date): number {
  return Math.round((toMidnight.getTime() - fromMidnight.getTime()) / (24 * 60 * 60 * 1000));
}

function toMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

type OrderWithItems = {
  orderNumber: string;
  shoeType: string;
  shoeBrand: string;
  date: Date;
  promisedDate: Date;
  customer: { firstName: string; lastName: string };
  items: { type: string; brand: string; diagnosis: unknown }[];
  services: { name: string }[];
};

/** DD/MM/YYYY, easy to read at a glance on a phone notification. */
function formatDate(d: Date): string {
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Every pair of shoes in the order, e.g. "Zapatos Nike + Botas Timberland". */
function pairsSummary(order: OrderWithItems): string {
  if (order.items.length > 1) return order.items.map((it) => `${it.type} ${it.brand}`.trim()).join(' + ');
  return `${order.shoeType} ${order.shoeBrand}`.trim();
}

/** The technical recommendation per pair when available, falling back to the assigned service names. */
function pendingWork(order: OrderWithItems): string {
  const fromDiagnosis = order.items
    .map((it) => (it.diagnosis as { recommendedWork?: string } | null)?.recommendedWork)
    .filter((w): w is string => !!w);
  if (fromDiagnosis.length) return fromDiagnosis.join(' + ');
  if (order.services.length) return order.services.map((s) => s.name).join(', ');
  return 'Diagnóstico y presupuesto pendientes';
}

export interface DeliveryAlertEntry {
  order: OrderWithItems;
  isOverdue: boolean;
  daysOverdue: number;
  daysRemaining: number;
}

/**
 * Orders under the shop's 3-day delivery rule: already overdue, or promised
 * within `windowDays` (default 3), and not yet marked as delivered/closed.
 * Sorted strictly by urgency, matching the Dashboard's "Plan de Trabajo
 * Prioritario" logic so the Telegram report and the UI never disagree.
 */
export async function findOrdersNeedingAlert(windowDays = 3): Promise<DeliveryAlertEntry[]> {
  const today = toMidnight(new Date());
  const windowEnd = new Date(today.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const orders = await prisma.serviceOrder.findMany({
    where: {
      status: { notIn: NOT_CLOSED_STATUSES as any },
      promisedDate: { lte: windowEnd },
    },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      items: { select: { type: true, brand: true, diagnosis: true } },
      services: { select: { name: true } },
    },
    orderBy: { promisedDate: 'asc' },
  });

  return orders
    .map((o) => {
      const diff = daysBetween(today, toMidnight(o.promisedDate));
      return {
        order: o,
        isOverdue: diff < 0,
        daysOverdue: diff < 0 ? Math.abs(diff) : 0,
        daysRemaining: diff >= 0 ? diff : 0,
      };
    })
    .sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return a.isOverdue ? b.daysOverdue - a.daysOverdue : a.daysRemaining - b.daysRemaining;
    });
}

export function formatDeliveryAlertReport(entries: DeliveryAlertEntry[]): string {
  if (entries.length === 0) {
    return (
      `✅ <b>JC SHOE'S — Reporte de Entregas</b>\n\n` +
      `No hay órdenes atrasadas ni próximas a vencer en los próximos 3 días. ¡Taller al día!`
    );
  }

  const overdueCount = entries.filter((e) => e.isOverdue).length;
  const dueSoonCount = entries.length - overdueCount;

  const lines = entries.map(({ order: o, isOverdue, daysOverdue, daysRemaining }) => {
    const flag = isOverdue ? '🔴' : daysRemaining === 0 ? '🟠' : '🟡';
    const dueText = isOverdue
      ? `Atrasada ${daysOverdue} día${daysOverdue !== 1 ? 's' : ''}`
      : daysRemaining === 0
      ? 'Vence HOY'
      : `Entrega en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`;

    return (
      `${flag} <b>${o.orderNumber}</b> — ${o.customer.firstName} ${o.customer.lastName}\n` +
      `   👞 ${pairsSummary(o)}\n` +
      `   🔧 ${pendingWork(o)}\n` +
      `   📥 Recepción: <b>${formatDate(o.date)}</b>\n` +
      `   🎯 Entrega prometida: <b>${formatDate(o.promisedDate)}</b>\n` +
      `   ⏳ ${dueText}`
    );
  });

  return (
    `🚨 <b>JC SHOE'S — Alertas de Entrega (Regla de 3 Días)</b>\n\n` +
    `${overdueCount} atrasada${overdueCount !== 1 ? 's' : ''} · ${dueSoonCount} por vencer.\n\n` +
    lines.join('\n\n')
  );
}

export async function sendDeliveryAlertReport(): Promise<TelegramSendResult & { ordersCount: number }> {
  const entries = await findOrdersNeedingAlert();
  const text = formatDeliveryAlertReport(entries);
  const result = await sendRawMessage(text);
  return { ...result, ordersCount: entries.length };
}

let lastAutoAlertFireKey: string | null = null;

const SCHEDULE_TIMEZONE = 'America/Guayaquil';

/**
 * Reads the current hour and calendar day as seen in Ecuador, regardless of
 * the host/container's own system timezone (which on the VPS runs in UTC).
 * Intl.DateTimeFormat with an explicit `timeZone` does the conversion itself
 * — unlike Date.getHours(), it never depends on TZ/tzdata being configured
 * at the OS level.
 */
function getEcuadorTimeParts(date: Date): { dateKey: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SCHEDULE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  // Some ICU builds render midnight as "24" under hour12:false; normalize it.
  const hour = Number(get('hour')) % 24;
  const dateKey = `${get('year')}-${get('month')}-${get('day')}`;
  return { dateKey, hour };
}

/**
 * Starts the twice-daily automatic check: every minute, compares the current
 * hour in America/Guayaquil against TELEGRAM_ALERT_HOURS (default "8,14" —
 * 08:00 and 14:00 Ecuador time) and — once per hour slot per calendar day —
 * sends the delivery-alert report (same 3-day-rule / overdue filtering as
 * the on-demand endpoint) if the bot is configured. A minute-level poll
 * (rather than fixed setTimeout calls) is deliberately simple and survives
 * `tsx watch` restarts without ever firing twice for the same day+hour,
 * since it only sends when the in-memory "already sent this slot" key
 * differs from the current one.
 */
export function scheduleDailyDeliveryAlertJob(): void {
  const targetHours = (process.env.TELEGRAM_ALERT_HOURS ?? '8,14')
    .split(',')
    .map((h) => Number(h.trim()))
    .filter((h) => Number.isInteger(h) && h >= 0 && h <= 23);

  setInterval(async () => {
    if (!isTelegramConfigured()) return;

    const { dateKey, hour } = getEcuadorTimeParts(new Date());
    if (!targetHours.includes(hour)) return;

    const fireKey = `${dateKey}-${hour}`;
    if (lastAutoAlertFireKey === fireKey) return;

    lastAutoAlertFireKey = fireKey;
    try {
      const result = await sendDeliveryAlertReport();
      if (!result.ok) console.error('[telegram] Alerta automática de entregas falló:', result.description);
      else
        console.log(
          `[telegram] Alerta automática de entregas enviada a las ${String(hour).padStart(2, '0')}:00 America/Guayaquil (${result.ordersCount} orden(es)).`
        );
    } catch (err) {
      console.error('[telegram] Error enviando la alerta automática de entregas:', err);
    }
  }, 60_000);
}
