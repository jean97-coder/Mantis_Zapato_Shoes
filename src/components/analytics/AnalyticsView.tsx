import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getStatusLabel } from '../common/Badge';
import { downloadGenericReportPdf } from '../../lib/genericReportSnapshot';
import { downloadCashReportPdf } from '../../lib/cashReportSnapshot';
import { CashMovementsReport, OrderStatus } from '../../types';
import {
  TrendingUp,
  Footprints,
  Wrench,
  Package,
  Award,
  FileDown,
  Loader2,
  Wallet,
  ClipboardList,
  Landmark,
  Boxes,
} from 'lucide-react';

type ReportTab = 'resumen' | 'caja' | 'ordenes' | 'inventario' | 'socios';

function todayStr(d: Date = new Date()): string {
  return d.toISOString().split('T')[0];
}

// One calendar month ago, as a sensible default window for reports that
// need a bounded range instead of "all time" by default.
function oneMonthAgoStr(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return todayStr(d);
}

export const AnalyticsView: React.FC = () => {
  const { orders, materials, partners, inventoryMovements, settings, currentUser, fetchCashMovementsReport } = useApp();

  const [activeTab, setActiveTab] = useState<ReportTab>('resumen');

  // ------------------------------------------------------------------
  // TAB: RESUMEN EJECUTIVO
  // ------------------------------------------------------------------
  const [resumenFrom, setResumenFrom] = useState(oneMonthAgoStr());
  const [resumenTo, setResumenTo] = useState(todayStr());
  const [resumenAllTime, setResumenAllTime] = useState(false);

  const applyResumenPreset = (preset: 'week' | 'month' | 'all') => {
    if (preset === 'all') {
      setResumenAllTime(true);
      return;
    }
    setResumenAllTime(false);
    const from = new Date();
    if (preset === 'week') from.setDate(from.getDate() - 7);
    else from.setMonth(from.getMonth() - 1);
    setResumenFrom(todayStr(from));
    setResumenTo(todayStr());
  };

  const filteredOrders = useMemo(() => {
    if (resumenAllTime) return orders;
    return orders.filter((o) => o.date >= resumenFrom && o.date <= resumenTo);
  }, [orders, resumenAllTime, resumenFrom, resumenTo]);

  const totalRevenue = filteredOrders.reduce((acc, o) => acc + o.budget.total, 0);
  const totalCollected = filteredOrders.reduce((acc, o) => acc + o.totalPaid, 0);
  const totalPending = filteredOrders.reduce((acc, o) => acc + o.balancePending, 0);
  const totalMaterialCost = filteredOrders.reduce(
    (acc, o) => acc + o.materialsConsumed.reduce((sub, m) => sub + m.totalCost, 0),
    0
  );
  const grossProfit = totalRevenue - totalMaterialCost;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const serviceCounts: { [name: string]: { count: number; total: number } } = {};
  filteredOrders.forEach((o) => {
    o.services.forEach((s) => {
      if (!serviceCounts[s.name]) serviceCounts[s.name] = { count: 0, total: 0 };
      serviceCounts[s.name].count += 1;
      serviceCounts[s.name].total += s.price;
    });
  });
  const topServices = Object.entries(serviceCounts).sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  const shoeTypeCounts: { [type: string]: number } = {};
  const brandCounts: { [brand: string]: number } = {};
  filteredOrders.forEach((o) => {
    shoeTypeCounts[o.shoe.type] = (shoeTypeCounts[o.shoe.type] || 0) + 1;
    brandCounts[o.shoe.brand] = (brandCounts[o.shoe.brand] || 0) + 1;
  });
  const topShoeTypes = Object.entries(shoeTypeCounts).sort((a, b) => b[1] - a[1]);
  const topBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const matConsumption: { [name: string]: { qty: number; cost: number; unit: string } } = {};
  filteredOrders.forEach((o) => {
    o.materialsConsumed.forEach((mc) => {
      if (!matConsumption[mc.materialName]) matConsumption[mc.materialName] = { qty: 0, cost: 0, unit: mc.unit };
      matConsumption[mc.materialName].qty += mc.quantity;
      matConsumption[mc.materialName].cost += mc.totalCost;
    });
  });
  const topMaterials = Object.entries(matConsumption).sort((a, b) => b[1].cost - a[1].cost).slice(0, 5);

  // ------------------------------------------------------------------
  // TAB: ÓRDENES POR ESTADO
  // ------------------------------------------------------------------
  const [ordenesFrom, setOrdenesFrom] = useState(oneMonthAgoStr());
  const [ordenesTo, setOrdenesTo] = useState(todayStr());
  const [ordenesAllTime, setOrdenesAllTime] = useState(true);

  const ordenesFiltered = useMemo(() => {
    if (ordenesAllTime) return orders;
    return orders.filter((o) => o.date >= ordenesFrom && o.date <= ordenesTo);
  }, [orders, ordenesAllTime, ordenesFrom, ordenesTo]);

  const statusGroups = useMemo(() => {
    const map = new Map<OrderStatus, { count: number; total: number; paid: number; pending: number }>();
    for (const o of ordenesFiltered) {
      const entry = map.get(o.status) || { count: 0, total: 0, paid: 0, pending: 0 };
      entry.count += 1;
      entry.total += o.budget.total;
      entry.paid += o.totalPaid;
      entry.pending += o.balancePending;
      map.set(o.status, entry);
    }
    return Array.from(map.entries())
      .map(([status, data]) => ({ status, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [ordenesFiltered]);

  const [exportingOrdenes, setExportingOrdenes] = useState(false);
  const handleExportOrdenes = async () => {
    setExportingOrdenes(true);
    try {
      await downloadGenericReportPdf({
        title: 'Reporte de Órdenes por Estado',
        subtitle: ordenesAllTime ? `${ordenesFiltered.length} órdenes (histórico)` : `${ordenesFiltered.length} órdenes (${ordenesFrom} a ${ordenesTo})`,
        settings,
        generatedBy: currentUser.name,
        summaryCards: [
          { label: 'Total Órdenes', value: String(ordenesFiltered.length), tone: 'stone' },
          { label: 'Valor Total', value: `$${ordenesFiltered.reduce((a, o) => a + o.budget.total, 0).toFixed(2)}`, tone: 'emerald' },
          { label: 'Cobrado', value: `$${ordenesFiltered.reduce((a, o) => a + o.totalPaid, 0).toFixed(2)}`, tone: 'sky' },
          { label: 'Saldo Pendiente', value: `$${ordenesFiltered.reduce((a, o) => a + o.balancePending, 0).toFixed(2)}`, tone: 'amber' },
        ],
        columns: [
          { key: 'status', label: 'Estado' },
          { key: 'count', label: 'Cantidad', align: 'center' },
          { key: 'total', label: 'Valor Total', align: 'right' },
          { key: 'paid', label: 'Cobrado', align: 'right' },
          { key: 'pending', label: 'Saldo Pendiente', align: 'right' },
        ],
        rows: statusGroups.map((g) => ({
          status: getStatusLabel(g.status),
          count: String(g.count),
          total: `$${g.total.toFixed(2)}`,
          paid: `$${g.paid.toFixed(2)}`,
          pending: `$${g.pending.toFixed(2)}`,
        })),
        fileName: `Reporte-Ordenes-${todayStr()}`,
      });
    } finally {
      setExportingOrdenes(false);
    }
  };

  // ------------------------------------------------------------------
  // TAB: INVENTARIO
  // ------------------------------------------------------------------
  const activeMaterials = materials.filter((m) => m.status === 'activo');
  const lowStockMaterials = activeMaterials.filter((m) => m.currentStock <= m.minStock);
  const totalValuation = activeMaterials.reduce((acc, m) => acc + m.currentStock * m.costPrice, 0);

  const [inventarioFrom, setInventarioFrom] = useState(oneMonthAgoStr());
  const [inventarioTo, setInventarioTo] = useState(todayStr());

  // Stock/valuation are always "as of now" — the date range instead scopes
  // which kardex movements (purchases, consumption, adjustments) show below.
  const inventarioMovements = useMemo(
    () => inventoryMovements.filter((m) => m.date >= inventarioFrom && m.date <= inventarioTo),
    [inventoryMovements, inventarioFrom, inventarioTo]
  );

  const [exportingInventario, setExportingInventario] = useState(false);
  const handleExportInventario = async () => {
    setExportingInventario(true);
    try {
      await downloadGenericReportPdf({
        title: 'Reporte de Inventario',
        subtitle: `${activeMaterials.length} insumos activos · Movimientos ${inventarioFrom} a ${inventarioTo}`,
        settings,
        generatedBy: currentUser.name,
        summaryCards: [
          { label: 'Insumos Activos', value: String(activeMaterials.length), tone: 'stone' },
          { label: 'Bajo Stock Mínimo', value: String(lowStockMaterials.length), tone: 'red' },
          { label: 'Valorización Total', value: `$${totalValuation.toFixed(2)}`, tone: 'emerald' },
          { label: 'Movimientos en Período', value: String(inventarioMovements.length), tone: 'sky' },
        ],
        columns: [
          { key: 'code', label: 'Código' },
          { key: 'name', label: 'Insumo' },
          { key: 'category', label: 'Categoría' },
          { key: 'stock', label: 'Stock', align: 'center' },
          { key: 'min', label: 'Mínimo', align: 'center' },
          { key: 'cost', label: 'Costo Unit.', align: 'right' },
          { key: 'value', label: 'Valor Total', align: 'right' },
          { key: 'estado', label: 'Estado', align: 'center' },
        ],
        rows: activeMaterials.map((m) => ({
          code: m.code,
          name: m.name,
          category: m.category,
          stock: `${m.currentStock} ${m.unit}`,
          min: `${m.minStock} ${m.unit}`,
          cost: `$${m.costPrice.toFixed(2)}`,
          value: `$${(m.currentStock * m.costPrice).toFixed(2)}`,
          estado: m.currentStock <= m.minStock ? 'BAJO STOCK' : 'Normal',
        })),
        fileName: `Reporte-Inventario-${todayStr()}`,
      });
    } finally {
      setExportingInventario(false);
    }
  };

  // ------------------------------------------------------------------
  // TAB: SOCIOS
  // ------------------------------------------------------------------
  const totalAportado = partners.reduce((acc, p) => acc + p.totalContributed, 0);
  const totalDevuelto = partners.reduce((acc, p) => acc + p.totalReturned, 0);
  const totalPendienteSocios = partners.reduce((acc, p) => acc + p.pendingBalance, 0);

  const [sociosFrom, setSociosFrom] = useState(oneMonthAgoStr());
  const [sociosTo, setSociosTo] = useState(todayStr());
  const [sociosReport, setSociosReport] = useState<CashMovementsReport | null>(null);
  const [loadingSocios, setLoadingSocios] = useState(false);

  const loadSociosMovements = useCallback(
    async (from: string, to: string) => {
      setLoadingSocios(true);
      try {
        setSociosReport(await fetchCashMovementsReport(from, to));
      } finally {
        setLoadingSocios(false);
      }
    },
    [fetchCashMovementsReport]
  );

  useEffect(() => {
    if (activeTab === 'socios' && !sociosReport) loadSociosMovements(sociosFrom, sociosTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const sociosMovements = useMemo(
    () => (sociosReport?.movements ?? []).filter((m) => m.type === 'APORTE_CAPITAL' || m.type === 'DEVOLUCION_CAPITAL'),
    [sociosReport]
  );

  const [exportingSocios, setExportingSocios] = useState(false);
  const handleExportSocios = async () => {
    setExportingSocios(true);
    try {
      let periodMovements = sociosReport;
      if (!periodMovements || periodMovements.from !== sociosFrom || periodMovements.to !== sociosTo) {
        periodMovements = await fetchCashMovementsReport(sociosFrom, sociosTo);
      }
      const chronology = periodMovements.movements.filter(
        (m) => m.type === 'APORTE_CAPITAL' || m.type === 'DEVOLUCION_CAPITAL'
      );
      await downloadGenericReportPdf({
        title: 'Reporte de Socios',
        subtitle: `${partners.length} socios registrados · Movimientos ${sociosFrom} a ${sociosTo}`,
        settings,
        generatedBy: currentUser.name,
        summaryCards: [
          { label: 'Total Aportado', value: `$${totalAportado.toFixed(2)}`, tone: 'sky' },
          { label: 'Total Devuelto', value: `$${totalDevuelto.toFixed(2)}`, tone: 'purple' },
          { label: 'Saldo Pendiente Total', value: `$${totalPendienteSocios.toFixed(2)}`, tone: 'amber' },
          { label: 'Movimientos en Período', value: String(chronology.length), tone: 'stone' },
        ],
        columns: [
          { key: 'name', label: 'Socio' },
          { key: 'contributed', label: 'Aportado', align: 'right' },
          { key: 'returned', label: 'Devuelto', align: 'right' },
          { key: 'pending', label: 'Saldo Pendiente', align: 'right' },
        ],
        rows: partners.map((p) => ({
          name: p.name,
          contributed: `$${p.totalContributed.toFixed(2)}`,
          returned: `$${p.totalReturned.toFixed(2)}`,
          pending: `$${p.pendingBalance.toFixed(2)}`,
        })),
        secondaryTitle: 'Cronología de Aportes y Devoluciones en el Período',
        secondaryColumns: [
          { key: 'date', label: 'Fecha' },
          { key: 'time', label: 'Hora' },
          { key: 'partner', label: 'Socio' },
          { key: 'type', label: 'Movimiento' },
          { key: 'amount', label: 'Monto', align: 'right' },
        ],
        secondaryRows: chronology.map((m) => ({
          date: m.date,
          time: m.time,
          partner: m.partnerName ?? '—',
          type: m.type === 'APORTE_CAPITAL' ? 'Aporte' : 'Devolución',
          amount: `${m.type === 'APORTE_CAPITAL' ? '+' : '-'}$${m.amount.toFixed(2)}`,
        })),
        fileName: `Reporte-Socios-${todayStr()}`,
      });
    } finally {
      setExportingSocios(false);
    }
  };

  // ------------------------------------------------------------------
  // TAB: CAJA (Diario / Histórico)
  // ------------------------------------------------------------------
  const [cajaFrom, setCajaFrom] = useState(todayStr());
  const [cajaTo, setCajaTo] = useState(todayStr());
  const [cajaReport, setCajaReport] = useState<CashMovementsReport | null>(null);
  const [loadingCaja, setLoadingCaja] = useState(false);
  const [exportingCaja, setExportingCaja] = useState(false);

  const loadCajaReport = useCallback(
    async (from: string, to: string) => {
      setLoadingCaja(true);
      try {
        setCajaReport(await fetchCashMovementsReport(from, to));
      } finally {
        setLoadingCaja(false);
      }
    },
    [fetchCashMovementsReport]
  );

  useEffect(() => {
    if (activeTab === 'caja' && !cajaReport) loadCajaReport(cajaFrom, cajaTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleExportCaja = async () => {
    if (!cajaReport) return;
    setExportingCaja(true);
    try {
      await downloadCashReportPdf(cajaReport, settings, currentUser.name);
    } finally {
      setExportingCaja(false);
    }
  };

  const TABS: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'resumen', label: 'Resumen Ejecutivo', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'caja', label: 'Caja', icon: <Wallet className="w-4 h-4" /> },
    { id: 'ordenes', label: 'Órdenes por Estado', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'inventario', label: 'Inventario', icon: <Boxes className="w-4 h-4" /> },
    { id: 'socios', label: 'Socios', icon: <Landmark className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Reportes & Métricas
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Genere y exporte los reportes clave del negocio: caja, órdenes, inventario y socios.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: RESUMEN EJECUTIVO */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => applyResumenPreset('week')}
              className="px-2.5 py-1 text-[11px] font-semibold text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Esta Semana
            </button>
            <button
              onClick={() => applyResumenPreset('month')}
              className="px-2.5 py-1 text-[11px] font-semibold text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Este Mes
            </button>
            <button
              onClick={() => applyResumenPreset('all')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                resumenAllTime ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-600 bg-white border-stone-300 hover:bg-stone-50'
              }`}
            >
              Histórico General
            </button>
            <input
              type="date"
              value={resumenFrom}
              onChange={(e) => {
                setResumenFrom(e.target.value);
                setResumenAllTime(false);
              }}
              className="px-2 py-1 text-[11px] border border-stone-300 rounded-lg outline-hidden"
            />
            <span className="text-stone-400 text-[11px]">a</span>
            <input
              type="date"
              value={resumenTo}
              onChange={(e) => {
                setResumenTo(e.target.value);
                setResumenAllTime(false);
              }}
              className="px-2 py-1 text-[11px] border border-stone-300 rounded-lg outline-hidden"
            />
          </div>

          {/* Financial Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
              <span className="text-xs font-semibold text-stone-500 block">Facturación Total (Ventas)</span>
              <span className="text-2xl font-black font-mono text-stone-900 mt-1 block">${totalRevenue.toFixed(2)}</span>
              <div className="text-[11px] text-emerald-700 font-medium mt-1">Cobrado: ${totalCollected.toFixed(2)}</div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
              <span className="text-xs font-semibold text-amber-800 block">Cuentas por Cobrar (Saldos)</span>
              <span className="text-2xl font-black font-mono text-amber-900 mt-1 block">${totalPending.toFixed(2)}</span>
              <div className="text-[11px] text-stone-400 mt-1">A cobrar contra entrega del calzado</div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
              <span className="text-xs font-semibold text-stone-500 block">Costo Directo Insumos Usados</span>
              <span className="text-2xl font-black font-mono text-rose-700 mt-1 block">${totalMaterialCost.toFixed(2)}</span>
              <div className="text-[11px] text-stone-400 mt-1">Descontados de bodega en órdenes</div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs">
              <span className="text-xs font-semibold text-emerald-800 block">Margen Bruto de Utilidad</span>
              <span className="text-2xl font-black font-mono text-emerald-700 mt-1 block">{grossMargin.toFixed(1)}%</span>
              <div className="text-[11px] text-stone-500 font-medium mt-1">Ganancia bruta: ${grossProfit.toFixed(2)}</div>
            </div>
          </div>

          {/* Grid: Top Services & Materials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  Servicios Más Contratados
                </h3>
                <span className="text-xs text-stone-400">Demanda</span>
              </div>
              <div className="space-y-2.5">
                {topServices.map(([name, data], idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-stone-50/70">
                    <div className="max-w-[240px]">
                      <span className="font-bold text-stone-900 block truncate">{idx + 1}. {name}</span>
                      <span className="text-[11px] text-stone-500">{data.count} trabajos ejecutados</span>
                    </div>
                    <span className="font-mono font-bold text-stone-900">${data.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-amber-600" />
                  Insumos de Mayor Costo Consumidos
                </h3>
                <span className="text-xs text-stone-400">Costo Acumulado</span>
              </div>
              <div className="space-y-2.5">
                {topMaterials.map(([name, data], idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-stone-50/70">
                    <div className="max-w-[240px]">
                      <span className="font-bold text-stone-900 block truncate">{name}</span>
                      <span className="text-[11px] text-stone-500">Cantidad usada: {data.qty.toFixed(1)} {data.unit}</span>
                    </div>
                    <span className="font-mono font-bold text-rose-800">${data.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grid: Shoes & Brands */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5 pb-2 border-b border-stone-100">
                <Footprints className="w-4 h-4 text-stone-600" />
                Distribución por Tipología de Calzado
              </h3>
              <div className="space-y-2">
                {topShoeTypes.map(([type, count]) => {
                  const pct = filteredOrders.length > 0 ? (count / filteredOrders.length) * 100 : 0;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-stone-800">{type}</span>
                        <span className="text-stone-500 font-mono">{count} pares ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5 pb-2 border-b border-stone-100">
                <Award className="w-4 h-4 text-amber-600" />
                Marcas de Calzado Más Frecuentes en Taller
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {topBrands.map(([brand, count]) => (
                  <div key={brand} className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex justify-between items-center text-xs">
                    <span className="font-bold text-stone-900 truncate">{brand}</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded-sm border border-stone-200 text-stone-700 font-bold">
                      {count} {count === 1 ? 'par' : 'pares'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CAJA */}
      {activeTab === 'caja' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={cajaFrom}
                onChange={(e) => setCajaFrom(e.target.value)}
                className="px-2 py-1 text-[11px] border border-stone-300 rounded-lg outline-hidden"
              />
              <span className="text-stone-400 text-[11px]">a</span>
              <input
                type="date"
                value={cajaTo}
                onChange={(e) => setCajaTo(e.target.value)}
                className="px-2 py-1 text-[11px] border border-stone-300 rounded-lg outline-hidden"
              />
              <button
                onClick={() => loadCajaReport(cajaFrom, cajaTo)}
                className="px-3 py-1 text-[11px] font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors"
              >
                Consultar
              </button>
            </div>
            <button
              onClick={handleExportCaja}
              disabled={!cajaReport || exportingCaja}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {exportingCaja ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              Exportar Reporte de Caja PDF
            </button>
          </div>

          {loadingCaja ? (
            <div className="bg-white rounded-xl border border-stone-200 p-10 text-center text-stone-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Cargando reporte de caja...
            </div>
          ) : cajaReport ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[11px] text-emerald-700 font-semibold block">Ingresos</span>
                  <span className="text-lg font-bold font-mono text-emerald-800">${cajaReport.summary.totalIngresos.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
                  <span className="text-[11px] text-sky-700 font-semibold block">Aportes de Socios</span>
                  <span className="text-lg font-bold font-mono text-sky-800">${cajaReport.summary.totalAportes.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <span className="text-[11px] text-purple-700 font-semibold block">Devoluciones a Socios</span>
                  <span className="text-lg font-bold font-mono text-purple-800">-${cajaReport.summary.totalDevolucionesCapital.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                  <span className="text-[11px] text-red-700 font-semibold block">Egresos</span>
                  <span className="text-lg font-bold font-mono text-red-800">-${cajaReport.summary.totalEgresos.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-stone-900 rounded-xl">
                  <span className="text-[11px] text-stone-300 font-semibold block">Balance del Período</span>
                  <span className="text-lg font-bold font-mono text-white">${cajaReport.summary.balance.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-[11px] text-stone-400">
                {cajaReport.summary.count} movimiento(s) entre {cajaReport.from} y {cajaReport.to}. Ve a "Caja & Cobros" para el detalle línea por línea con enlaces directos a cada orden.
              </p>
            </>
          ) : null}
        </div>
      )}

      {/* TAB: ÓRDENES POR ESTADO */}
      {activeTab === 'ordenes' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setOrdenesAllTime(true)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                  ordenesAllTime ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-600 bg-white border-stone-300 hover:bg-stone-50'
                }`}
              >
                Histórico General
              </button>
              <input
                type="date"
                value={ordenesFrom}
                onChange={(e) => {
                  setOrdenesFrom(e.target.value);
                  setOrdenesAllTime(false);
                }}
                className="px-2 py-1 text-[11px] border border-stone-300 rounded-lg outline-hidden"
              />
              <span className="text-stone-400 text-[11px]">a</span>
              <input
                type="date"
                value={ordenesTo}
                onChange={(e) => {
                  setOrdenesTo(e.target.value);
                  setOrdenesAllTime(false);
                }}
                className="px-2 py-1 text-[11px] border border-stone-300 rounded-lg outline-hidden"
              />
            </div>
            <button
              onClick={handleExportOrdenes}
              disabled={exportingOrdenes}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {exportingOrdenes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              Exportar Reporte PDF
            </button>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-center">Cantidad</th>
                  <th className="py-2.5 px-3 text-right">Valor Total</th>
                  <th className="py-2.5 px-3 text-right">Cobrado</th>
                  <th className="py-2.5 px-3 text-right">Saldo Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {statusGroups.map((g) => (
                  <tr key={g.status} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 font-bold text-stone-900">{getStatusLabel(g.status)}</td>
                    <td className="py-2.5 px-3 text-center font-mono">{g.count}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">${g.total.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700">${g.paid.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-700">${g.pending.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: INVENTARIO */}
      {activeTab === 'inventario' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid grid-cols-3 gap-3 flex-1">
              <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
                <span className="text-[11px] text-stone-500 block">Insumos Activos</span>
                <span className="text-lg font-bold font-mono text-stone-900">{activeMaterials.length}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
                <span className="text-[11px] text-red-600 block">Bajo Stock Mínimo</span>
                <span className="text-lg font-bold font-mono text-red-700">{lowStockMaterials.length}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
                <span className="text-[11px] text-emerald-700 block">Valorización Total</span>
                <span className="text-lg font-bold font-mono text-emerald-800">${totalValuation.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handleExportInventario}
              disabled={exportingInventario}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {exportingInventario ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              Exportar Reporte PDF
            </button>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Insumo</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-center">Stock</th>
                  <th className="py-2.5 px-3 text-right">Valor Total</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {activeMaterials.map((m) => {
                  const isLow = m.currentStock <= m.minStock;
                  return (
                    <tr key={m.id} className={`hover:bg-stone-50 ${isLow ? 'bg-red-50/20' : ''}`}>
                      <td className="py-2.5 px-3 font-mono font-bold text-stone-800">{m.code}</td>
                      <td className="py-2.5 px-3 font-semibold text-stone-900">{m.name}</td>
                      <td className="py-2.5 px-3 text-stone-600">{m.category}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{m.currentStock} {m.unit}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">${(m.currentStock * m.costPrice).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLow ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {isLow ? 'Bajo Stock' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Movimientos en el Período ({inventarioMovements.length})
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={inventarioFrom}
                onChange={(e) => setInventarioFrom(e.target.value)}
                className="px-2 py-1 text-[11px] border border-stone-300 rounded-lg outline-hidden"
              />
              <span className="text-stone-400 text-[11px]">a</span>
              <input
                type="date"
                value={inventarioTo}
                onChange={(e) => setInventarioTo(e.target.value)}
                className="px-2 py-1 text-[11px] border border-stone-300 rounded-lg outline-hidden"
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Insumo</th>
                  <th className="py-2.5 px-3 text-center">Cantidad</th>
                  <th className="py-2.5 px-3">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {inventarioMovements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-stone-400">Sin movimientos en el rango seleccionado.</td>
                  </tr>
                ) : (
                  inventarioMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-stone-50">
                      <td className="py-2 px-3 font-mono text-stone-500 text-[11px]">{m.date} {m.time}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 bg-stone-100 rounded-full text-[10px] font-bold text-stone-700">{m.type}</span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-stone-900">{m.materialName}</td>
                      <td className="py-2 px-3 text-center font-mono">{m.quantity} {m.unit}</td>
                      <td className="py-2 px-3 text-stone-600">{m.orderNumber ? `Orden ${m.orderNumber}` : m.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SOCIOS */}
      {activeTab === 'socios' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid grid-cols-3 gap-3 flex-1">
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
                <span className="text-[11px] text-sky-700 block">Total Aportado</span>
                <span className="text-lg font-bold font-mono text-sky-800">${totalAportado.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                <span className="text-[11px] text-purple-700 block">Total Devuelto</span>
                <span className="text-lg font-bold font-mono text-purple-800">${totalDevuelto.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[11px] text-amber-700 block">Saldo Pendiente Total</span>
                <span className="text-lg font-bold font-mono text-amber-800">${totalPendienteSocios.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handleExportSocios}
              disabled={exportingSocios}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {exportingSocios ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              Exportar Reporte PDF
            </button>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Socio</th>
                  <th className="py-2.5 px-3 text-right">Aportado</th>
                  <th className="py-2.5 px-3 text-right">Devuelto</th>
                  <th className="py-2.5 px-3 text-right">Saldo Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {partners.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 font-bold text-stone-900">{p.name}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700">${p.totalContributed.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-purple-700">${p.totalReturned.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">${p.pendingBalance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Movimientos en el Período {loadingSocios ? '' : `(${sociosMovements.length})`}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={sociosFrom}
                onChange={(e) => {
                  setSociosFrom(e.target.value);
                  loadSociosMovements(e.target.value, sociosTo);
                }}
                className="px-2 py-1 text-[11px] border border-stone-300 rounded-lg outline-hidden"
              />
              <span className="text-stone-400 text-[11px]">a</span>
              <input
                type="date"
                value={sociosTo}
                onChange={(e) => {
                  setSociosTo(e.target.value);
                  loadSociosMovements(sociosFrom, e.target.value);
                }}
                className="px-2 py-1 text-[11px] border border-stone-300 rounded-lg outline-hidden"
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Hora</th>
                  <th className="py-2.5 px-3">Socio</th>
                  <th className="py-2.5 px-3">Movimiento</th>
                  <th className="py-2.5 px-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {loadingSocios ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-stone-400">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Cargando movimientos...
                    </td>
                  </tr>
                ) : sociosMovements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-stone-400">Sin aportes ni devoluciones en el rango seleccionado.</td>
                  </tr>
                ) : (
                  sociosMovements.map((m) => {
                    const isAporte = m.type === 'APORTE_CAPITAL';
                    return (
                      <tr key={m.id} className="hover:bg-stone-50">
                        <td className="py-2 px-3 font-mono text-stone-500 text-[11px]">{m.date}</td>
                        <td className="py-2 px-3 font-mono text-stone-500 text-[11px]">{m.time}</td>
                        <td className="py-2 px-3 font-semibold text-stone-900">{m.partnerName ?? '—'}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isAporte ? 'bg-sky-100 text-sky-800' : 'bg-purple-100 text-purple-800'}`}>
                            {isAporte ? 'Aporte' : 'Devolución'}
                          </span>
                        </td>
                        <td className={`py-2 px-3 text-right font-mono font-bold ${isAporte ? 'text-emerald-700' : 'text-red-700'}`}>
                          {isAporte ? '+' : '-'}${m.amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
