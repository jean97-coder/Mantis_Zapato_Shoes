import React, { useState } from 'react';
import { ServiceOrder } from '../../types';
import { getUrgentOrders } from '../../lib/deliveryUrgency';
import { PriorityBadge } from './Badge';
import { AlertTriangle, Flame, Clock, Eye, Play, ChevronDown, PartyPopper } from 'lucide-react';

interface DailyPriorityPlanProps {
  orders: ServiceOrder[];
  onSelectOrder: (order: ServiceOrder) => void;
  /** Moves the order straight into "En Reparación" — only offered when the order is APROBADA and ready to start. */
  onStartWork: (order: ServiceOrder) => void;
  /** Cards shown before collapsing behind "Ver N más"; the header count is never truncated. */
  maxVisible?: number;
}

/**
 * "Plan de Trabajo Prioritario para Hoy" — a high-visibility, always-first
 * widget that tells the operator exactly which orders to start today under
 * the shop's 3-day delivery rule, strictly sorted by urgency (overdue first,
 * most days late first; then soonest-due), with a one-click way to jump into
 * that order instead of hunting through the full list.
 */
export const DailyPriorityPlan: React.FC<DailyPriorityPlanProps> = ({ orders, onSelectOrder, onStartWork, maxVisible = 4 }) => {
  const [expanded, setExpanded] = useState(false);
  const entries = getUrgentOrders(orders);
  const overdueCount = entries.filter((e) => e.isOverdue).length;
  const visible = expanded ? entries : entries.slice(0, maxVisible);
  const hiddenCount = entries.length - visible.length;

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <PartyPopper className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-bold text-emerald-900">Sin urgencias por ahora</div>
          <div className="text-xs text-emerald-700">Ninguna orden vence hoy, está atrasada, o vence en los próximos 3 días. ¡Taller al día!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 shadow-lg overflow-hidden">
      {/* High-impact header banner */}
      <div className="bg-gradient-to-r from-red-700 via-red-600 to-orange-600 px-5 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 ring-1 ring-white/30 shrink-0">
            <AlertTriangle className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-300 animate-ping" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-300" />
          </span>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wide leading-tight">
              🚨 Plan de Trabajo Prioritario para Hoy
            </h3>
            <p className="text-[11px] text-red-50/90">
              {overdueCount > 0 ? `${overdueCount} atrasada${overdueCount !== 1 ? 's' : ''} · ` : ''}
              {entries.length} orden{entries.length !== 1 ? 'es' : ''} que iniciar o priorizar hoy — regla de 3 días.
            </p>
          </div>
        </div>
      </div>

      {/* Priority cards, strictly sorted by urgency */}
      <div className="divide-y divide-stone-100 bg-white">
        {visible.map((entry) => {
          const { order, isOverdue, daysOverdue, daysRemaining, pairsSummary } = entry;
          const dueToday = !isOverdue && daysRemaining === 0;
          const canStart = order.status === 'APROBADA';

          return (
            <div
              key={order.id}
              className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 ${isOverdue ? 'bg-red-50/40' : dueToday ? 'bg-amber-50/50' : ''}`}
            >
              <div className="shrink-0">
                {isOverdue ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black text-white bg-red-600 whitespace-nowrap">
                    <Flame className="w-3 h-3" />
                    {daysOverdue}d de atraso
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black text-white bg-amber-500 whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    {dueToday ? 'Entrega HOY' : `Entrega en ${daysRemaining}d`}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-stone-900 truncate">
                  Hoy debes iniciar: {pairsSummary}
                  {order.items.length > 1 && <span className="text-stone-400 font-medium"> ({order.items.length} pares)</span>}
                </div>
                <div className="text-[11px] text-stone-500 truncate flex items-center gap-1.5 flex-wrap">
                  <span>Orden {order.orderNumber} · {order.customer.firstName} {order.customer.lastName}</span>
                  <span>—</span>
                  <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-amber-700 font-semibold'}>
                    {isOverdue ? `Atrasada por ${daysOverdue} día${daysOverdue !== 1 ? 's' : ''}` : dueToday ? 'Vence hoy' : `Entrega en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`}
                  </span>
                  {order.priority !== 'NORMAL' && <PriorityBadge priority={order.priority} />}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {canStart && (
                  <button
                    onClick={() => onStartWork(order)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                    title="Mover esta orden a En Reparación y empezar ahora"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    Iniciar en Taller
                  </button>
                )}
                <button
                  onClick={() => onSelectOrder(order)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-bold transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver Orden
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-stone-50 hover:bg-stone-100 text-xs font-bold text-stone-700 transition-colors"
        >
          Ver {hiddenCount} orden{hiddenCount !== 1 ? 'es' : ''} más
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
