import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList,
  PlusCircle,
  Wrench,
  Package,
  DollarSign,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  AlertTriangle,
  Lock,
  LogOut,
  LayoutDashboard,
  MessageCircle,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ChevronDown,
  Flame,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  CalendarClock,
  Maximize,
  Minimize,
  ShoppingBag,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { ServiceOrder, UserRole } from '../../types';
import { isAdminRole, ROLE_LABELS } from '../../lib/rbac';
import { BRAND_NAME, BRAND_LOGO, SIDEBAR_LOGO } from '../../lib/brand';
import { pairsSummaryForOrder } from '../../lib/deliveryUrgency';
import { buildWhatsAppUrl } from '../../lib/whatsapp';

export type NavTab =
  | 'dashboard'
  | 'orders'
  | 'reception'
  | 'workshop'
  | 'calendar'
  | 'inventory'
  | 'store'
  | 'cash'
  | 'customers'
  | 'reports'
  | 'settings';

interface AppLayoutProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onSelectOrder?: (order: ServiceOrder) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onSelectTab,
  onSelectOrder,
  children,
}) => {
  const { orders, materials, storeProducts, cashRegister, currentUser, settings, fetchCashMovementsReport } = useApp();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('jcshoes_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [overduePanelOpen, setOverduePanelOpen] = useState(false);
  const [cashPanelOpen, setCashPanelOpen] = useState(false);
  const [cashToday, setCashToday] = useState<{ ingresos: number; egresos: number } | null>(null);
  const [loadingCashToday, setLoadingCashToday] = useState(false);
  const [now, setNow] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const overduePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const isShiftOpen = cashRegister.status === 'ABIERTA';
  const todayStr = new Date().toISOString().split('T')[0];
  const CLOSED_STATUSES = ['ENTREGADA', 'CERRADA', 'CANCELADA', 'RECHAZADA'];
  const in3DaysStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const overdueOrdersList = orders
    .filter(o => !CLOSED_STATUSES.includes(o.status) && o.promisedDate < todayStr)
    .sort((a, b) => a.promisedDate.localeCompare(b.promisedDate));
  const overdueCount = overdueOrdersList.length;
  // 3-day delivery rule: due today through 3 days out, not yet overdue.
  const dueSoonOrdersList = orders
    .filter(o => !CLOSED_STATUSES.includes(o.status) && o.promisedDate >= todayStr && o.promisedDate <= in3DaysStr)
    .sort((a, b) => a.promisedDate.localeCompare(b.promisedDate));
  const dueSoonCount = dueSoonOrdersList.length;
  const urgentDeliveriesCount = overdueCount + dueSoonCount;
  const activeOrdersCount = orders.filter(o => !['ENTREGADA', 'CERRADA', 'CANCELADA'].includes(o.status)).length;
  const inWorkshopCount = orders.filter(o => ['EN_REPARACION', 'EN_RESTAURACION', 'CONTROL_CALIDAD'].includes(o.status)).length;
  const lowStockMaterialsCount = materials.filter(m => m.currentStock <= m.minStock).length;
  const lowStockStoreProductsCount = storeProducts.filter(p => p.active && p.stock <= p.minStock).length;
  const lowStockCount = lowStockMaterialsCount + lowStockStoreProductsCount;

  const daysOverdue = (promisedDate: string) => {
    const diff = Math.floor((new Date(todayStr).getTime() - new Date(promisedDate).getTime()) / (24 * 60 * 60 * 1000));
    return diff > 0 ? diff : 0;
  };
  const daysRemaining = (promisedDate: string) => {
    const diff = Math.floor((new Date(promisedDate).getTime() - new Date(todayStr).getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0, diff);
  };

  const handleOpenOverdueOrder = (order: ServiceOrder) => {
    setOverduePanelOpen(false);
    if (onSelectOrder) onSelectOrder(order);
    else onSelectTab('orders');
  };

  const handleCashHoverEnter = () => {
    setCashPanelOpen(true);
    if (!cashToday && !loadingCashToday) {
      setLoadingCashToday(true);
      fetchCashMovementsReport(todayStr, todayStr)
        .then((report) => setCashToday({ ingresos: report.summary.totalIngresos, egresos: report.summary.totalEgresos }))
        .finally(() => setLoadingCashToday(false));
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('jcshoes_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
    } catch {
      /* ignore — collapse state simply won't persist across reloads */
    }
  }, [sidebarCollapsed]);

  // Close the overdue popover on an outside click, same UX contract as any dropdown.
  useEffect(() => {
    if (!overduePanelOpen) return;
    const handler = (e: MouseEvent) => {
      if (overduePanelRef.current && !overduePanelRef.current.contains(e.target as Node)) {
        setOverduePanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overduePanelOpen]);

  const allNavItems: Array<{ id: NavTab; label: string; icon: any; badge?: number; alertBadge?: number; statusDot?: boolean; highlight?: boolean; roles: UserRole[] }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'CAJERO', 'ZAPATERO'] },
    { id: 'orders', label: 'Órdenes de Servicio', icon: ClipboardList, badge: activeOrdersCount, roles: ['ADMIN', 'CAJERO', 'ZAPATERO'] },
    { id: 'reception', label: 'Nueva Recepción', icon: PlusCircle, highlight: true, roles: ['ADMIN', 'CAJERO'] },
    { id: 'workshop', label: 'Mesa de Taller', icon: Wrench, badge: inWorkshopCount, roles: ['ADMIN', 'ZAPATERO'] },
    { id: 'calendar', label: 'Calendario de Entregas', icon: CalendarDays, roles: ['ADMIN', 'CAJERO', 'ZAPATERO'] },
    { id: 'inventory', label: 'Inventario & Bodega', icon: Package, alertBadge: lowStockCount > 0 ? lowStockCount : undefined, roles: ['ADMIN', 'ZAPATERO'] },
    { id: 'store', label: 'Tienda', icon: ShoppingBag, roles: ['ADMIN', 'CAJERO'] },
    { id: 'cash', label: 'Caja & Cobros', icon: DollarSign, statusDot: isShiftOpen, roles: ['ADMIN', 'CAJERO'] },
    { id: 'customers', label: 'Clientes (CRM)', icon: Users, roles: ['ADMIN', 'CAJERO'] },
    { id: 'reports', label: 'Reportes & Métricas', icon: BarChart3, roles: ['ADMIN', 'CAJERO'] },
    { id: 'settings', label: 'Configuración', icon: Settings, roles: ['ADMIN'] },
  ];

  // SOCIO_ADMIN carries the same privileges as ADMIN, so it sees every tab
  // an ADMIN would — nav items are still declared with plain 'ADMIN' above.
  const effectiveRole = isAdminRole(currentUser.role) ? 'ADMIN' : currentUser.role;
  const navItems = allNavItems.filter(item => item.roles.includes(effectiveRole));

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-900">
      {/* Top Navbar */}
      <header className="no-print bg-stone-900 text-stone-100 border-b border-stone-800 sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-stone-300 hover:text-white rounded-lg hover:bg-stone-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div 
              onClick={() => onSelectTab('orders')}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 ring-1 ring-amber-400/30 flex items-center justify-center shadow-xs p-1 shrink-0">
                <img src={BRAND_LOGO} alt={BRAND_NAME} className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight text-white block leading-none">
                  {BRAND_NAME}
                </span>
                <span className="text-[10px] text-amber-400 font-mono tracking-wider">
                  ERP TALLER ZAPATERO
                </span>
              </div>
            </div>
          </div>

          {/* Center cluster: quick actions + live clock + fullscreen — fills the
              empty middle space on wide screens without crowding mobile. */}
          <div className="hidden lg:flex flex-1 items-center justify-center gap-3 px-4 min-w-0">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectTab('reception')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Nueva Recepción
            </motion.button>

            <div className="flex items-center gap-1.5 text-xs text-stone-300 font-mono px-3 py-1.5 rounded-full bg-stone-800/60 border border-stone-700/60 shrink-0">
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              <span className="capitalize">{now.toLocaleDateString('es-EC', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
              <span className="text-stone-600">·</span>
              <span className="text-stone-100 tabular-nums">{now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors shrink-0"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick status counters on top */}
          <div className="flex items-center gap-3">
            {/* Delivery alert capsule (3-day rule) — glows + pulses only while
                something is actually urgent: ruby-red once anything is overdue,
                amber while everything urgent is still within the 3-day window. */}
            {urgentDeliveriesCount > 0 && (
              <div className="relative hidden sm:block" ref={overduePanelRef}>
                <motion.button
                  onClick={() => setOverduePanelOpen((v) => !v)}
                  whileHover={{ scale: 1.04 }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ scale: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full text-xs font-bold text-white transition-colors ${
                    overdueCount > 0
                      ? 'animate-ruby-glow bg-gradient-to-r from-red-600 to-rose-600'
                      : 'animate-amber-glow bg-gradient-to-r from-amber-500 to-orange-600'
                  }`}
                  title={`${overdueCount} atrasadas · ${dueSoonCount} por vencer en 3 días`}
                >
                  {overdueCount > 0 ? (
                    <Flame className="w-3.5 h-3.5 text-red-100" />
                  ) : (
                    <CalendarClock className="w-3.5 h-3.5 text-amber-50" />
                  )}
                  <span>
                    {overdueCount > 0 ? `${overdueCount} Atrasadas` : `${dueSoonCount} Por Vencer`}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-white/80 transition-transform ${overduePanelOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                  {overduePanelOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50 text-stone-900"
                    >
                      <div
                        className={`px-4 py-3 text-white ${
                          overdueCount > 0
                            ? 'bg-gradient-to-r from-red-600 to-rose-600'
                            : 'bg-gradient-to-r from-amber-500 to-orange-600'
                        }`}
                      >
                        <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Alertas de Entrega — Regla de 3 Días
                        </div>
                        <div className="text-[11px] text-white/85 mt-0.5">
                          {overdueCount} atrasada{overdueCount !== 1 ? 's' : ''} · {dueSoonCount} por vencer en 3 días o menos.
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                        {[...overdueOrdersList, ...dueSoonOrdersList].slice(0, 8).map((o) => {
                          const isOverdue = o.promisedDate < todayStr;
                          return (
                            <button
                              key={o.id}
                              onClick={() => handleOpenOverdueOrder(o)}
                              className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 transition-colors text-left ${
                                isOverdue ? 'hover:bg-red-50' : 'hover:bg-amber-50'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-stone-900 truncate">
                                  {o.orderNumber} · {o.customer.firstName} {o.customer.lastName}
                                </div>
                                <div className="text-[10px] text-stone-500 truncate">
                                  {pairsSummaryForOrder(o)} {o.items.length > 1 && <span className="text-stone-400">({o.items.length} pares)</span>}
                                </div>
                              </div>
                              <span
                                className={`shrink-0 text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${
                                  isOverdue ? 'bg-red-600' : 'bg-amber-600'
                                }`}
                              >
                                {isOverdue
                                  ? `${daysOverdue(o.promisedDate)}d atraso`
                                  : daysRemaining(o.promisedDate) === 0
                                  ? 'Hoy'
                                  : `${daysRemaining(o.promisedDate)}d restantes`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => {
                          setOverduePanelOpen(false);
                          onSelectTab('orders');
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-stone-50 hover:bg-stone-100 text-xs font-bold text-stone-700 transition-colors"
                      >
                        Ver todas las órdenes
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Cash register capsule — hover reveals a live income/expense breakdown */}
            <div
              className="relative hidden sm:block"
              onMouseEnter={handleCashHoverEnter}
              onMouseLeave={() => setCashPanelOpen(false)}
            >
              <motion.button
                onClick={() => onSelectTab('cash')}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold transition-colors border ${
                  isShiftOpen
                    ? 'animate-emerald-glow bg-gradient-to-r from-emerald-600/90 to-teal-700/90 border-emerald-500/40 text-white'
                    : 'bg-stone-800 border-stone-700 text-stone-400'
                }`}
              >
                {isShiftOpen ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                    <span>Caja: ${cashRegister.currentCash.toFixed(2)}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-stone-400" />
                    <span>Caja Cerrada</span>
                  </>
                )}
              </motion.button>

              <AnimatePresence>
                {cashPanelOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50 text-stone-900"
                  >
                    <div className="px-4 py-2.5 bg-stone-900 text-white">
                      <div className="text-xs font-black uppercase tracking-wider">Resumen de Hoy</div>
                    </div>
                    <div className="p-3 space-y-2">
                      {loadingCashToday && !cashToday ? (
                        <div className="text-[11px] text-stone-400 py-2 text-center">Cargando movimientos...</div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
                              <TrendingUp className="w-3.5 h-3.5" /> Ingresos
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-800">
                              ${(cashToday?.ingresos ?? 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-red-50 border border-red-100">
                            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-red-800">
                              <TrendingDown className="w-3.5 h-3.5" /> Egresos
                            </span>
                            <span className="text-xs font-mono font-bold text-red-800">
                              ${(cashToday?.egresos ?? 0).toFixed(2)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-stone-800">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-semibold text-white block leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-amber-400 uppercase font-mono block">
                  {ROLE_LABELS[currentUser.role]}
                </span>
              </div>

              <button
                onClick={logout}
                className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 w-full flex">
        {/* Desktop Left Sidebar */}
        <aside
          className={`no-print hidden lg:block shrink-0 py-6 border-r border-stone-200 transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? 'w-20 px-3' : 'w-64 pl-4 sm:pl-6 lg:pl-8 pr-6'
          }`}
        >
          <nav className="space-y-1 sticky top-20">
            <div className={`flex items-center gap-2 pb-4 mb-1 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
              <div className="flex items-center gap-2 min-w-0">
                <img src={SIDEBAR_LOGO} alt={BRAND_NAME} className="w-8 h-8 object-contain shrink-0" />
                <span
                  className={`font-black text-sm text-stone-900 tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ${
                    sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'
                  }`}
                >
                  {BRAND_NAME}
                </span>
              </div>
              {!sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="shrink-0 p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-200/70 transition-colors"
                  title="Colapsar menú"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}
            </div>

            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-full flex items-center justify-center py-1.5 mb-2 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-200/70 transition-colors"
                title="Expandir menú"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center py-2.5 rounded-xl text-xs font-bold transition-all ${
                    sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3.5'
                  } ${
                    item.highlight && !isActive
                      ? 'bg-amber-100/70 text-amber-900 hover:bg-amber-100'
                      : isActive
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-700 hover:bg-stone-200/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-stone-500'}`} />
                    <span
                      className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                        sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>

                  {!sidebarCollapsed && item.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 ${
                      isActive ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}

                  {!sidebarCollapsed && item.alertBadge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-100 text-red-700 border border-red-200 shrink-0">
                      {item.alertBadge}
                    </span>
                  )}

                  {!sidebarCollapsed && item.statusDot && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </button>
              );
            })}

            {/* Quick helper card */}
            {!sidebarCollapsed && (
              <div className="pt-6 mt-6 border-t border-stone-200">
                <div className="p-3.5 bg-white rounded-xl border border-stone-200 shadow-xs text-xs space-y-1">
                  <span className="font-bold text-stone-900 block">{settings.businessName}</span>
                  <span className="text-[11px] text-stone-500 block">RUC: {settings.ruc}</span>
                  <span className="text-[10px] text-stone-400 block pt-1">
                    Atención WA: {settings.whatsapp}
                  </span>
                </div>
              </div>
            )}
          </nav>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="no-print fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs lg:hidden">
            <div className="w-72 bg-white h-full p-4 flex flex-col justify-between shadow-2xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                  <span className="font-black text-sm text-stone-900">MENÚ {BRAND_NAME.toUpperCase()}</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1">
                    <X className="w-5 h-5 text-stone-600" />
                  </button>
                </div>

                <div className="space-y-1">
                  {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                          isActive ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge !== undefined && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-200 text-stone-800">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[11px] text-stone-400 text-center pt-4 border-t border-stone-100">
                {BRAND_NAME} ERP v1.0 • Ecuador
              </div>
            </div>
          </div>
        )}

        {/* Main View Area */}
        <main className="flex-1 min-w-0 py-6 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Institutional footer — shown at the bottom of every main panel in the app shell */}
      <footer className="no-print px-4 sm:px-6 lg:px-8 py-3 text-center text-[10px] text-stone-400 border-t border-stone-200 bg-stone-50">
        © 2026 {BRAND_NAME} — Todos los derechos reservados. Desarrollado por MANTIS.EC.
      </footer>

      {/* Floating WhatsApp quick-contact button */}
      {settings.whatsapp && (
        <a
          href={buildWhatsAppUrl(settings.whatsapp, `Hola, escribo desde el sistema interno de ${settings.businessName}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="no-print fixed bottom-5 right-5 z-30 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 hover:scale-105 active:scale-95 text-white shadow-lg shadow-emerald-900/30 flex items-center justify-center transition-all"
          title="Contacto rápido por WhatsApp"
        >
          <MessageCircle className="w-5 h-5" />
        </a>
      )}
    </div>
  );
};
