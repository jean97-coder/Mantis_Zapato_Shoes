import { ServiceOrder, OrderPriority } from '../types';

const CLOSED_STATUSES = ['ENTREGADA', 'CERRADA', 'CANCELADA', 'RECHAZADA'];
const PRIORITY_RANK: Record<OrderPriority, number> = { MUY_URGENTE: 2, URGENTE: 1, NORMAL: 0 };

/** Days between two YYYY-MM-DD date strings (b - a), ignoring time of day. */
function dayDiff(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (24 * 60 * 60 * 1000));
}

/** Every pair of shoes in the order, e.g. "Zapatos Nike + Botas Timberland". */
export function pairsSummaryForOrder(order: ServiceOrder): string {
  return order.items.length > 1
    ? order.items.map((it) => `${it.shoe.type} ${it.shoe.brand}`.trim()).join(' + ')
    : `${order.shoe.type} ${order.shoe.brand}`.trim();
}

export interface UrgentOrderEntry {
  order: ServiceOrder;
  isOverdue: boolean;
  daysOverdue: number;
  daysRemaining: number;
  pairsSummary: string;
}

/**
 * Orders that need attention today under the shop's 3-day delivery rule:
 * already overdue, or promised within the next `windowDays` (default 3).
 * Sorted strictly by urgency — overdue first (most days late first), then
 * soonest-due, with order priority (Muy Urgente > Urgente > Normal) as the
 * tiebreaker within the same day bucket.
 */
export function getUrgentOrders(orders: ServiceOrder[], windowDays = 3): UrgentOrderEntry[] {
  const todayStr = new Date().toISOString().split('T')[0];

  return orders
    .filter((o) => !CLOSED_STATUSES.includes(o.status))
    .map((o) => {
      const diff = dayDiff(todayStr, o.promisedDate);
      const isOverdue = diff < 0;
      return {
        order: o,
        isOverdue,
        daysOverdue: isOverdue ? Math.abs(diff) : 0,
        daysRemaining: isOverdue ? 0 : diff,
        pairsSummary: pairsSummaryForOrder(o),
      };
    })
    .filter((e) => e.isOverdue || e.daysRemaining <= windowDays)
    .sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      const dayCompare = a.isOverdue ? b.daysOverdue - a.daysOverdue : a.daysRemaining - b.daysRemaining;
      if (dayCompare !== 0) return dayCompare;
      return PRIORITY_RANK[b.order.priority] - PRIORITY_RANK[a.order.priority];
    });
}
