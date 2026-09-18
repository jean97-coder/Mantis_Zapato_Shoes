import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ServiceOrder } from '../../types';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { ChevronLeft, ChevronRight, CalendarDays, AlertTriangle, Footprints, Phone, Wallet } from 'lucide-react';

interface CalendarViewProps {
  orders: ServiceOrder[];
  onSelectOrder: (order: ServiceOrder) => void;
}

type ViewMode = 'day' | 'week' | 'month';
type VisualState = 'overdue' | 'today' | 'soon' | 'delivered' | 'normal';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const CLOSED_STATUSES = ['ENTREGADA', 'CERRADA', 'CANCELADA', 'RECHAZADA'];

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Monday-start week */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // 0 = Monday
  return addDays(x, -dow);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function orderVisualState(order: ServiceOrder, todayKey: string): VisualState {
  if (CLOSED_STATUSES.includes(order.status)) return 'delivered';
  if (order.promisedDate < todayKey) return 'overdue';
  if (order.promisedDate === todayKey) return 'today';
  const diffDays = (new Date(order.promisedDate).getTime() - new Date(todayKey).getTime()) / 86400000;
  if (diffDays <= 3) return 'soon';
  return 'normal';
}

// Solid, high-contrast colors for status dots/accents (never pastel) so the
// delivery urgency reads instantly across every view of the calendar.
const STATE_STYLES: Record<VisualState, { solid: string; soft: string; text: string; ring: string; label: string }> = {
  overdue: { solid: 'bg-red-600', soft: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200', label: 'Atrasada' },
  today: { solid: 'bg-amber-500', soft: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-200', label: 'Entrega hoy' },
  soon: { solid: 'bg-orange-400', soft: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200', label: 'Próxima (≤3 días)' },
  delivered: { solid: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', label: 'Entregada' },
  normal: { solid: 'bg-stone-400', soft: 'bg-stone-50', text: 'text-stone-600', ring: 'ring-stone-200', label: 'Programada' },
};

export const CalendarView: React.FC<CalendarViewProps> = ({ orders, onSelectOrder }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [anchorDate, setAnchorDate] = useState<Date>(startOfDay(new Date()));
  const [hoveredOrderId, setHoveredOrderId] = useState<string | null>(null);

  const todayKey = toDateKey(new Date());

  const ordersByDate = useMemo(() => {
    const map = new Map<string, ServiceOrder[]>();
    for (const o of orders) {
      const list = map.get(o.promisedDate) || [];
      list.push(o);
      map.set(o.promisedDate, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [orders]);

  const goPrev = () => {
    if (viewMode === 'day') setAnchorDate(d => addDays(d, -1));
    else if (viewMode === 'week') setAnchorDate(d => addDays(d, -7));
    else setAnchorDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };
  const goNext = () => {
    if (viewMode === 'day') setAnchorDate(d => addDays(d, 1));
    else if (viewMode === 'week') setAnchorDate(d => addDays(d, 7));
    else setAnchorDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };
  const goToday = () => setAnchorDate(startOfDay(new Date()));

  const headerLabel = useMemo(() => {
    if (viewMode === 'day') {
      return anchorDate.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const start = startOfWeek(anchorDate);
      const end = addDays(start, 6);
      const sameMonth = start.getMonth() === end.getMonth();
      return sameMonth
        ? `${start.getDate()} - ${end.getDate()} de ${MONTH_LABELS[start.getMonth()]} ${start.getFullYear()}`
        : `${start.getDate()} ${MONTH_LABELS[start.getMonth()]} - ${end.getDate()} ${MONTH_LABELS[end.getMonth()]} ${end.getFullYear()}`;
    }
    return `${MONTH_LABELS[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`;
  }, [viewMode, anchorDate]);

  // Rich hover tooltip: shows customer, shoe, phone, promised date and
  // balance so the cashier can triage a delivery without opening it first.
  const OrderTooltip: React.FC<{ order: ServiceOrder; state: VisualState }> = ({ order, state }) => {
    const style = STATE_STYLES[state];
    return (
      <motion.div
        initial={{ opacity: 0, y: 4, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.96 }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
        className="pointer-events-none absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1.5 w-56 rounded-xl border border-stone-200 bg-white shadow-xl p-3 text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono font-black text-sm text-stone-900">{order.orderNumber}</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide text-white ${style.solid}`}>
            {style.label}
          </span>
        </div>
        <div className="mt-1.5 text-xs font-semibold text-stone-800 truncate">
          {order.customer.firstName} {order.customer.lastName}
        </div>
        <div className="text-[11px] text-stone-500 truncate">{order.shoe.type} {order.shoe.brand} · {order.shoe.color}</div>
        <div className="mt-2 pt-2 border-t border-stone-100 space-y-1 text-[11px] text-stone-600">
          <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-stone-400" /> {order.customer.phone}</div>
          <div className="flex items-center gap-1.5"><CalendarDays className="w-3 h-3 text-stone-400" /> Entrega: {order.promisedDate}</div>
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3 h-3 text-stone-400" />
            Saldo: <span className={order.balancePending > 0 ? 'font-bold text-amber-700' : 'font-bold text-emerald-700'}>${order.balancePending.toFixed(2)}</span>
          </div>
        </div>
        <div className="mt-2 text-[10px] font-semibold text-amber-700">Clic para abrir la orden completa →</div>
      </motion.div>
    );
  };

  const OrderChip: React.FC<{ order: ServiceOrder; compact?: boolean }> = ({ order, compact }) => {
    const state = orderVisualState(order, todayKey);
    const style = STATE_STYLES[state];
    const isHovered = hoveredOrderId === order.id;
    return (
      <div className="relative">
        <motion.button
          onClick={() => onSelectOrder(order)}
          onMouseEnter={() => setHoveredOrderId(order.id)}
          onMouseLeave={() => setHoveredOrderId(null)}
          whileHover={{ y: -1, scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.12 }}
          className={`w-full text-left pl-2 pr-1.5 py-1 rounded-lg border-l-4 ${style.soft} border border-stone-200/70 ${style.text} shadow-xs hover:shadow-sm transition-shadow ${compact ? 'text-[10px]' : 'text-xs'}`}
          style={{ borderLeftColor: 'currentColor' }}
        >
          <span className="flex items-center gap-1.5 font-bold font-mono truncate">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.solid}`} />
            {order.orderNumber}
          </span>
          {!compact && (
            <span className="block truncate opacity-80 font-sans font-medium">{order.customer.firstName} {order.customer.lastName}</span>
          )}
        </motion.button>
        <AnimatePresence>{isHovered && <OrderTooltip order={order} state={state} />}</AnimatePresence>
      </div>
    );
  };

  // ---------------------------------------------------------------
  // MONTH VIEW
  // ---------------------------------------------------------------
  const renderMonth = () => {
    const gridStart = startOfWeek(startOfMonth(anchorDate));
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    const currentMonth = anchorDate.getMonth();

    return (
      <div className="border border-stone-200 rounded-2xl bg-white shadow-sm overflow-visible">
        <div className="grid grid-cols-7 bg-gradient-to-b from-stone-100 to-stone-50 border-b border-stone-200 rounded-t-2xl overflow-hidden">
          {WEEKDAY_LABELS.map(w => (
            <div key={w} className="py-2.5 text-center text-[11px] font-bold text-stone-600 uppercase tracking-wider">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 rounded-b-2xl">
          {days.map(day => {
            const key = toDateKey(day);
            const dayOrders = ordersByDate.get(key) || [];
            const isCurrentMonth = day.getMonth() === currentMonth;
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={`min-h-[108px] border-b border-r border-stone-100 p-1.5 flex flex-col gap-1 transition-colors ${
                  isToday ? 'bg-amber-50/50 ring-1 ring-inset ring-amber-300' : isCurrentMonth ? 'bg-white hover:bg-stone-50/60' : 'bg-stone-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-amber-600 text-white shadow-sm' : isCurrentMonth ? 'text-stone-700' : 'text-stone-300'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {dayOrders.length > 0 && (
                    <span className="text-[9px] font-mono font-bold text-stone-400 bg-stone-100 rounded-full px-1.5">{dayOrders.length}</span>
                  )}
                </div>
                <div className="space-y-1 overflow-visible">
                  {dayOrders.slice(0, 2).map(o => (
                    <OrderChip key={o.id} order={o} compact />
                  ))}
                  {dayOrders.length > 2 && (
                    <button
                      onClick={() => {
                        setAnchorDate(startOfDay(day));
                        setViewMode('day');
                      }}
                      className="text-[9px] text-amber-700 font-semibold hover:underline pl-1"
                    >
                      +{dayOrders.length - 2} más
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------
  // WEEK VIEW
  // ---------------------------------------------------------------
  const renderWeek = () => {
    const start = startOfWeek(anchorDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    return (
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
        {days.map(day => {
          const key = toDateKey(day);
          const dayOrders = ordersByDate.get(key) || [];
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={`border rounded-2xl p-2.5 space-y-2 min-h-[220px] shadow-sm transition-colors ${
                isToday ? 'border-amber-400 bg-amber-50/40 ring-1 ring-amber-200' : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="text-center pb-2 border-b border-stone-100">
                <div className="text-[10px] uppercase font-bold text-stone-500">{WEEKDAY_LABELS[(day.getDay() + 6) % 7]}</div>
                <div className={`text-lg font-black ${isToday ? 'text-amber-700' : 'text-stone-800'}`}>{day.getDate()}</div>
              </div>
              <div className="space-y-1.5">
                {dayOrders.length === 0 ? (
                  <p className="text-[10px] text-stone-300 text-center pt-2">Sin entregas</p>
                ) : (
                  dayOrders.map(o => <OrderChip key={o.id} order={o} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ---------------------------------------------------------------
  // DAY VIEW
  // ---------------------------------------------------------------
  const renderDay = () => {
    const key = toDateKey(anchorDate);
    const dayOrders = ordersByDate.get(key) || [];

    return (
      <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100 shadow-sm overflow-hidden">
        {dayOrders.length === 0 ? (
          <div className="p-10 text-center text-stone-400 text-sm">
            No hay entregas programadas para este día.
          </div>
        ) : (
          dayOrders.map(o => {
            const state = orderVisualState(o, todayKey);
            const style = STATE_STYLES[state];
            return (
              <motion.button
                key={o.id}
                onClick={() => onSelectOrder(o)}
                whileHover={{ backgroundColor: 'rgba(245,245,244,0.8)' }}
                className="w-full flex items-center gap-4 p-4 text-left transition-colors"
              >
                <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${style.soft} ${style.text}`}>
                  <Footprints className="w-5 h-5" />
                  <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${style.solid}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-stone-900">{o.orderNumber}</span>
                    <StatusBadge status={o.status} />
                    <PriorityBadge priority={o.priority} />
                    {state === 'overdue' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-red-600">
                        <AlertTriangle className="w-3 h-3" /> Atrasada
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-stone-800 mt-0.5">
                    {o.customer.firstName} {o.customer.lastName} · {o.shoe.type} {o.shoe.brand}
                  </div>
                  <div className="text-[11px] text-stone-400">Recibido: {o.date} • Tel: {o.customer.phone}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-stone-900">${o.budget.total.toFixed(2)}</div>
                  <div className="text-[11px] text-amber-700">Saldo: ${o.balancePending.toFixed(2)}</div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
              <CalendarDays className="w-5 h-5 text-white" />
            </span>
            Calendario de Entregas
          </h1>
          <p className="text-xs text-stone-500 mt-0.5 ml-11">
            Visualice las fechas estimadas de entrega y acceda directamente a cada orden.
          </p>
        </div>

        <div className="relative flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs w-fit">
          {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`relative z-10 px-3.5 py-1.5 rounded-lg font-semibold transition-colors ${
                viewMode === mode ? 'text-stone-900' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {viewMode === mode && (
                <motion.span
                  layoutId="calendar-tab-pill"
                  className="absolute inset-0 -z-10 bg-white rounded-lg shadow-xs"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-stone-200 rounded-xl p-2.5 shadow-sm">
        <div className="flex items-center gap-1">
          <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors" title="Anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors" title="Siguiente">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="ml-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            Hoy
          </button>
        </div>
        <span className="text-sm font-bold text-stone-800 capitalize">{headerLabel}</span>
        <div className="flex items-center gap-2 flex-wrap">
          {(['overdue', 'today', 'soon', 'delivered'] as VisualState[]).map(s => (
            <span key={s} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATE_STYLES[s].soft} ${STATE_STYLES[s].text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATE_STYLES[s].solid}`} />
              {STATE_STYLES[s].label}
            </span>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
        >
          {viewMode === 'month' && renderMonth()}
          {viewMode === 'week' && renderWeek()}
          {viewMode === 'day' && renderDay()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
