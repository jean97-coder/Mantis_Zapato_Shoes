import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  DollarSign,
  ClipboardList,
  PackageX,
  AlertTriangle,
  Clock,
  RefreshCw,
  Wallet,
  Users,
  TrendingUp,
  ArrowRight,
  Activity,
  CalendarClock,
  Package,
  Wrench,
  Receipt,
  Truck,
  Camera,
  FileText,
  MessageCircle,
  Settings,
  PlusCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { ServiceOrder } from '../../types';
import { Sparkline } from '../common/Sparkline';
import { Modal } from '../common/Modal';
import { DailyPriorityPlan } from '../common/DailyPriorityPlan';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { BRAND_NAME, BRAND_LOGO } from '../../lib/brand';
import { ROLE_LABELS } from '../../lib/rbac';

interface DashboardMetrics {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  activeOrdersCount: number;
  inWorkshopCount: number;
  overdueCount: number;
  dueSoonCount: number;
  lowStockCount: number;
  materialsCount: number;
  customersCount: number;
  cashRegisterOpen: boolean;
  cashRegisterCurrent: number;
  revenueSeries: { date: string; total: number }[];
  ordersCreatedSeries: number[];
  dueSeries: number[];
  stockOutSeries: number[];
  statusBreakdown: { status: string; count: number }[];
  overdueOrders: Array<{ id: string; orderNumber: string; promisedDate: string; customerName: string; shoeBrand: string; shoeType: string; pairsSummary: string; pairsCount: number; status: string; daysOverdue: number }>;
  dueSoonOrders: Array<{ id: string; orderNumber: string; promisedDate: string; customerName: string; shoeBrand: string; shoeType: string; pairsSummary: string; pairsCount: number; status: string; daysRemaining: number }>;
  lowStockMaterials: Array<{ id: string; name: string; category: string; currentStock: number; minStock: number; unit: string }>;
  recentActivity: Array<{ id: string; timestamp: string; userName: string; action: string; module: string; details: string }>;
}

interface DashboardViewProps {
  orders: ServiceOrder[];
  onSelectOrder: (order: ServiceOrder) => void;
  onNewReception: () => void;
}

const MetricCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  gradient: string;
  sparklineData?: number[];
  delay?: number;
}> = ({ icon: Icon, label, value, sub, gradient, sparklineData, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    whileHover={{ y: -4, scale: 1.02 }}
    className={`group relative overflow-hidden rounded-2xl p-5 shadow-lg text-white ${gradient}`}
  >
    {/* Depth layers: ambient glow blobs + a diagonal glass sheen */}
    <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 blur-xl" />
    <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-black/10 blur-lg" />
    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

    <div className="relative flex items-start justify-between">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80 block">{label}</span>
        <span className="text-2xl font-black font-mono block mt-1">{value}</span>
        {sub && <span className="text-[11px] text-white/70 block mt-1">{sub}</span>}
      </div>
      <motion.div
        whileHover={{ rotate: 8, scale: 1.08 }}
        className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_10px_rgba(0,0,0,0.25)]"
      >
        <Icon className="w-5 h-5 drop-shadow-sm" />
      </motion.div>
    </div>

    {sparklineData && sparklineData.length >= 2 && (
      <div className="relative mt-3 -mb-1 opacity-90">
        <Sparkline data={sparklineData} height={26} stroke="rgba(255,255,255,0.95)" fill="rgba(255,255,255,0.22)" />
      </div>
    )}
  </motion.div>
);

const ACTIVITY_STYLE: Record<string, { icon: React.ElementType; classes: string }> = {
  CAJA: { icon: Wallet, classes: 'bg-emerald-100 text-emerald-700' },
  GASTOS: { icon: Receipt, classes: 'bg-red-100 text-red-700' },
  ORDENES: { icon: ClipboardList, classes: 'bg-amber-100 text-amber-700' },
  TALLER: { icon: Wrench, classes: 'bg-sky-100 text-sky-700' },
  SERVICIOS: { icon: Wrench, classes: 'bg-sky-100 text-sky-700' },
  INVENTARIO: { icon: Package, classes: 'bg-violet-100 text-violet-700' },
  COMPRAS: { icon: Package, classes: 'bg-violet-100 text-violet-700' },
  PROVEEDORES: { icon: Package, classes: 'bg-violet-100 text-violet-700' },
  USUARIOS: { icon: Users, classes: 'bg-indigo-100 text-indigo-700' },
  CLIENTES: { icon: Users, classes: 'bg-indigo-100 text-indigo-700' },
  ENTREGAS: { icon: Truck, classes: 'bg-teal-100 text-teal-700' },
  FOTOGRAFIAS: { icon: Camera, classes: 'bg-pink-100 text-pink-700' },
  PRESUPUESTO: { icon: FileText, classes: 'bg-orange-100 text-orange-700' },
  VENTAS: { icon: FileText, classes: 'bg-orange-100 text-orange-700' },
  WHATSAPP: { icon: MessageCircle, classes: 'bg-green-100 text-green-700' },
  SISTEMA: { icon: Settings, classes: 'bg-stone-200 text-stone-700' },
};
const DEFAULT_ACTIVITY_STYLE = { icon: Activity, classes: 'bg-stone-100 text-stone-600' };

export const DashboardView: React.FC<DashboardViewProps> = ({ orders, onSelectOrder, onNewReception }) => {
  const { currentUser } = useAuth();
  const { updateOrderStatus } = useApp();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [now, setNow] = useState(new Date());
  const [deliveryAlertOpen, setDeliveryAlertOpen] = useState(false);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(clock);
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.get<DashboardMetrics>('/dashboard/metrics');
      setMetrics(data);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const findOrder = (id: string) => orders.find((o) => o.id === id);

  const openOrderById = (id: string) => {
    const order = findOrder(id);
    if (order) onSelectOrder(order);
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center py-24 text-stone-400 text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Cargando panel de control...
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">Dashboard Ejecutivo</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Visión general en tiempo real del taller: ingresos, entregas, inventario y actividad reciente.
          </p>
        </div>
        <button
          onClick={load}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-50 shadow-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizado {lastRefresh.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </button>
      </div>

      {/* Executive welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 text-white p-6 shadow-lg"
      >
        <div className="absolute -right-10 -top-14 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl" />
        <div className="absolute right-32 -bottom-20 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={BRAND_LOGO}
              alt={BRAND_NAME}
              className="w-14 h-14 object-contain drop-shadow-[0_0_10px_rgba(217,180,90,0.35)] shrink-0 hidden sm:block"
            />
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                ¡Bienvenido a {BRAND_NAME}, {ROLE_LABELS[currentUser.role]}!
              </h2>
              <p className="text-sm text-amber-200/80 mt-1">
                Sistema de Gestión ERP de Alta Gama — Control de Taller, Órdenes y Finanzas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-stone-400 uppercase tracking-wider">Hoy</div>
              <div className="text-sm font-semibold text-white capitalize">
                {now.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onNewReception}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-900/30 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Nueva Recepción
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Daily priority plan — the first thing an operator should see: which
          orders to start or push today under the shop's 3-day delivery rule. */}
      <DailyPriorityPlan
        orders={orders}
        onSelectOrder={onSelectOrder}
        onStartWork={(order) => updateOrderStatus(order.id, 'EN_REPARACION', 'Iniciado desde el Plan de Trabajo Prioritario del día')}
      />

      {/* Gradient metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={DollarSign}
          label="Ingresos Hoy"
          value={`$${metrics.revenueToday.toFixed(2)}`}
          sub={`Mes: $${metrics.revenueMonth.toFixed(2)}`}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-700"
          sparklineData={metrics.revenueSeries.map((p) => p.total)}
          delay={0}
        />
        <MetricCard
          icon={ClipboardList}
          label="Órdenes Activas"
          value={String(metrics.activeOrdersCount)}
          sub={`${metrics.inWorkshopCount} en taller ahora`}
          gradient="bg-gradient-to-br from-amber-500 to-orange-700"
          sparklineData={metrics.ordersCreatedSeries}
          delay={0.05}
        />
        {/* Delivery alert (3-day rule) — pulses with high-impact color the moment
            anything is overdue or due within 3 days, and opens the detailed
            panel on click instead of just displaying a number. */}
        <motion.button
          type="button"
          onClick={() => (metrics.overdueCount + metrics.dueSoonCount > 0) && setDeliveryAlertOpen(true)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`group relative overflow-hidden rounded-2xl p-5 shadow-lg text-white text-left ${
            metrics.overdueCount > 0
              ? 'animate-ruby-glow bg-gradient-to-br from-red-600 to-rose-800 cursor-pointer'
              : metrics.dueSoonCount > 0
              ? 'animate-amber-glow bg-gradient-to-br from-amber-500 to-orange-700 cursor-pointer'
              : 'bg-gradient-to-br from-emerald-500 to-teal-700 cursor-default'
          }`}
        >
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 blur-xl" />
          <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-black/10 blur-lg" />
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80 block">
                Entregas Próximas (3 días)
              </span>
              <span className="text-2xl font-black font-mono block mt-1">
                {metrics.dueSoonCount + metrics.overdueCount}
              </span>
              <span className="text-[11px] text-white/70 block mt-1">
                {metrics.overdueCount} ya atrasada{metrics.overdueCount !== 1 ? 's' : ''}
              </span>
            </div>
            <motion.div
              animate={metrics.overdueCount + metrics.dueSoonCount > 0 ? { scale: [1, 1.12, 1] } : {}}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_10px_rgba(0,0,0,0.25)]"
            >
              <CalendarClock className="w-5 h-5 drop-shadow-sm" />
            </motion.div>
          </div>

          {metrics.dueSeries.length >= 2 && (
            <div className="relative mt-3 -mb-1 opacity-90">
              <Sparkline data={metrics.dueSeries} height={26} stroke="rgba(255,255,255,0.95)" fill="rgba(255,255,255,0.22)" />
            </div>
          )}

          {metrics.overdueCount + metrics.dueSoonCount > 0 && (
            <span className="relative mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
              Ver detalle
              <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </motion.button>
        <MetricCard
          icon={PackageX}
          label="Stock Bajo"
          value={String(metrics.lowStockCount)}
          sub={`de ${metrics.materialsCount} insumos`}
          gradient="bg-gradient-to-br from-violet-500 to-indigo-700"
          sparklineData={metrics.stockOutSeries}
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-xs p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              Ingresos de los últimos 14 días
            </h3>
            <span className="text-xs text-stone-400 font-mono">
              Semana: <strong className="text-stone-700">${metrics.revenueWeek.toFixed(2)}</strong>
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={metrics.revenueSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => d.slice(5)}
                tick={{ fontSize: 10, fill: '#78716c' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Ingresos']}
                labelFormatter={(label: string) => `Fecha: ${label}`}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e7e5e4' }}
              />
              <Area type="monotone" dataKey="total" stroke="#d97706" strokeWidth={2} fill="url(#revenueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Recent activity feed */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 flex flex-col"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5 mb-3">
            <Activity className="w-4 h-4 text-amber-600" />
            Actividad Reciente
          </h3>
          <div className="space-y-1 overflow-y-auto max-h-[220px] pr-1">
            {metrics.recentActivity.length === 0 && (
              <p className="text-xs text-stone-400">Sin actividad registrada aún.</p>
            )}
            <AnimatePresence initial={false}>
              {metrics.recentActivity.map((a, idx) => {
                const style = ACTIVITY_STYLE[a.module] ?? DEFAULT_ACTIVITY_STYLE;
                const AIcon = style.icon;
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.035 }}
                    className="flex items-start gap-2.5 py-2 rounded-xl hover:bg-stone-50 transition-colors px-1.5 -mx-1.5"
                  >
                    <div
                      className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ring-4 ring-white shadow-sm ${style.classes}`}
                    >
                      <AIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <div className="text-[12px] font-semibold text-stone-800 leading-snug tracking-tight truncate">
                        {a.details}
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5 font-medium">
                        {a.userName} · {new Date(a.timestamp).toLocaleString('es-EC', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', hour12: false })}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Delivery alerts: 3-day rule */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5 mb-3">
            <Clock className="w-4 h-4 text-red-600" />
            Alertas de Entrega (Regla de 3 días)
          </h3>

          {metrics.overdueOrders.length === 0 && metrics.dueSoonOrders.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">
              No hay entregas atrasadas ni próximas. ¡Todo al día!
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {metrics.overdueOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => openOrderById(o.id)}
                  className="w-full flex items-center justify-between gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-red-900 truncate">
                        {o.orderNumber} · {o.customerName}
                      </div>
                      <div className="text-[10px] text-red-700 truncate">
                        {o.pairsSummary}{o.pairsCount > 1 ? ` (${o.pairsCount} pares)` : ''} — vencida el {o.promisedDate}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-full">
                    {o.daysOverdue}d atraso
                  </span>
                </button>
              ))}
              {metrics.dueSoonOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => openOrderById(o.id)}
                  className="w-full flex items-center justify-between gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-amber-900 truncate">
                        {o.orderNumber} · {o.customerName}
                      </div>
                      <div className="text-[10px] text-amber-700 truncate">
                        {o.pairsSummary}{o.pairsCount > 1 ? ` (${o.pairsCount} pares)` : ''} — promesa: {o.promisedDate}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-white bg-amber-600 px-2 py-0.5 rounded-full">
                    {o.daysRemaining === 0 ? 'Hoy' : `${o.daysRemaining}d`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Low stock */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5 mb-3">
            <PackageX className="w-4 h-4 text-violet-600" />
            Control de Stock Bajo
          </h3>

          {metrics.lowStockMaterials.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">Todos los insumos están en niveles saludables.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {metrics.lowStockMaterials.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 p-2.5 bg-violet-50 border border-violet-200 rounded-xl"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-violet-900 truncate">{m.name}</div>
                    <div className="text-[10px] text-violet-700">{m.category}</div>
                  </div>
                  <span className="text-xs font-mono font-bold text-violet-800 bg-white px-2 py-0.5 rounded-full border border-violet-200 shrink-0">
                    {m.currentStock}/{m.minStock} {m.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center">
            <Wallet className={`w-4 h-4 ${metrics.cashRegisterOpen ? 'text-emerald-600' : 'text-stone-400'}`} />
          </div>
          <div>
            <span className="text-[10px] text-stone-500 block">Caja</span>
            <span className="text-sm font-bold text-stone-900 font-mono block">
              {metrics.cashRegisterOpen ? `$${metrics.cashRegisterCurrent.toFixed(2)}` : 'Cerrada'}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <span className="text-[10px] text-stone-500 block">Clientes Registrados</span>
            <span className="text-sm font-bold text-stone-900 font-mono block">{metrics.customersCount}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-stone-600" />
          </div>
          <div>
            <span className="text-[10px] text-stone-500 block">Insumos en Catálogo</span>
            <span className="text-sm font-bold text-stone-900 font-mono block">{metrics.materialsCount}</span>
          </div>
        </div>
      </div>

      {/* Delivery alert modal — the detailed, interactive breakdown behind the
          pulsing "Entregas Próximas" card and the header capsule. */}
      <Modal
        isOpen={deliveryAlertOpen}
        onClose={() => setDeliveryAlertOpen(false)}
        title="Alertas de Entrega — Regla de 3 Días"
        subtitle={`${metrics.overdueCount} atrasada${metrics.overdueCount !== 1 ? 's' : ''} · ${metrics.dueSoonCount} por vencer en 3 días o menos`}
        maxWidth="lg"
      >
        {metrics.overdueOrders.length === 0 && metrics.dueSoonOrders.length === 0 ? (
          <p className="text-xs text-stone-400 py-8 text-center">No hay entregas atrasadas ni próximas. ¡Todo al día!</p>
        ) : (
          <div className="space-y-2">
            {metrics.overdueOrders.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  setDeliveryAlertOpen(false);
                  openOrderById(o.id);
                }}
                className="w-full flex items-center justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-red-900 truncate">
                      {o.orderNumber} · {o.customerName}
                    </div>
                    <div className="text-[11px] text-red-700 truncate">
                      {o.pairsSummary}{o.pairsCount > 1 ? ` · ${o.pairsCount} pares` : ''} — fecha prometida: {o.promisedDate}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-white bg-red-600 px-2.5 py-1 rounded-full">
                  {o.daysOverdue}d de atraso
                </span>
              </button>
            ))}
            {metrics.dueSoonOrders.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  setDeliveryAlertOpen(false);
                  openOrderById(o.id);
                }}
                className="w-full flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-amber-900 truncate">
                      {o.orderNumber} · {o.customerName}
                    </div>
                    <div className="text-[11px] text-amber-700 truncate">
                      {o.pairsSummary}{o.pairsCount > 1 ? ` · ${o.pairsCount} pares` : ''} — fecha prometida: {o.promisedDate}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-white bg-amber-600 px-2.5 py-1 rounded-full">
                  {o.daysRemaining === 0 ? 'Vence hoy' : `${o.daysRemaining}d restantes`}
                </span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
