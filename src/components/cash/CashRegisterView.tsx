import React, { useState, useEffect, useCallback } from 'react';
import { CashMovement, PaymentMethod, ExpenseCategory, CashMovementsReport, ServiceOrder, Partner } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  Unlock,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Landmark,
  Users,
  FileDown,
  Loader2,
  ExternalLink,
  Wallet,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { downloadCashReportPdf } from '../../lib/cashReportSnapshot';
import { PartnerHistoryModal } from './PartnerHistoryModal';

interface CashRegisterViewProps {
  onSelectOrder: (order: ServiceOrder) => void;
}

function todayStr(d: Date = new Date()): string {
  return d.toISOString().split('T')[0];
}

interface MovementsTableProps {
  movements: CashMovement[];
  loading: boolean;
  emptyMessage: string;
  onMovementClick: (m: CashMovement) => void;
}

const MovementsTable: React.FC<MovementsTableProps> = ({ movements, loading, emptyMessage, onMovementClick }) => (
  <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
          <tr>
            <th className="py-2.5 px-3">Fecha</th>
            <th className="py-2.5 px-3">Hora</th>
            <th className="py-2.5 px-3">Tipo</th>
            <th className="py-2.5 px-3">Concepto</th>
            <th className="py-2.5 px-3">Método</th>
            <th className="py-2.5 px-3 text-right">Monto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          {loading ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-stone-400">
                <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" /> Cargando movimientos...
              </td>
            </tr>
          ) : movements.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-stone-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            movements.map((m) => {
              const meta = TYPE_META[m.type] || { label: m.type, income: true, badge: 'bg-stone-100 text-stone-700' };
              const clickable = !!m.orderId;
              return (
                <tr
                  key={m.id}
                  onClick={() => onMovementClick(m)}
                  className={`hover:bg-stone-50 ${clickable ? 'cursor-pointer' : ''}`}
                >
                  <td className="py-2 px-3 font-mono text-stone-500 text-[11px]">{m.date}</td>
                  <td className="py-2 px-3 font-mono text-stone-500 text-[11px]">{m.time}</td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.badge}`}>
                      {meta.income ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      {meta.label}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-medium text-stone-900">
                    {clickable ? (
                      <span className="inline-flex items-center gap-1 text-amber-800 hover:text-amber-900 hover:underline">
                        {m.concept}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </span>
                    ) : (
                      m.concept
                    )}
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] text-stone-600">{m.paymentMethod}</td>
                  <td className={`py-2 px-3 text-right font-mono font-bold ${meta.income ? 'text-emerald-700' : 'text-red-700'}`}>
                    {meta.income ? '+' : '-'}${m.amount.toFixed(2)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const TYPE_META: Record<string, { label: string; income: boolean; badge: string }> = {
  ANTICIPO: { label: 'Anticipo', income: true, badge: 'bg-emerald-100 text-emerald-800' },
  PAGO_ORDEN: { label: 'Pago de Orden', income: true, badge: 'bg-emerald-100 text-emerald-800' },
  VENTA: { label: 'Venta', income: true, badge: 'bg-emerald-100 text-emerald-800' },
  INGRESO_MANUAL: { label: 'Ingreso Manual', income: true, badge: 'bg-stone-100 text-stone-700' },
  APORTE_CAPITAL: { label: 'Aporte de Socio', income: true, badge: 'bg-sky-100 text-sky-800' },
  DEVOLUCION_CAPITAL: { label: 'Devolución a Socio', income: false, badge: 'bg-purple-100 text-purple-800' },
  GASTO: { label: 'Gasto', income: false, badge: 'bg-red-100 text-red-800' },
  RETIRO: { label: 'Retiro', income: false, badge: 'bg-red-100 text-red-800' },
  DEVOLUCION: { label: 'Devolución', income: false, badge: 'bg-amber-100 text-amber-800' },
};

export const CashRegisterView: React.FC<CashRegisterViewProps> = ({ onSelectOrder }) => {
  const {
    cashRegister,
    openCashRegister,
    closeCashRegister,
    addExpense,
    partners,
    capitalInjection,
    capitalReturn,
    fetchCashMovementsReport,
    fetchPartnerHistory,
    orders,
    settings,
    currentUser,
  } = useApp();

  const isShiftOpen = cashRegister.status === 'ABIERTA';

  // --- Date-range movements report ---
  const [fromDate, setFromDate] = useState(todayStr());
  const [toDate, setToDate] = useState(todayStr());
  const [report, setReport] = useState<CashMovementsReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const loadReport = useCallback(
    async (from: string, to: string) => {
      setLoadingReport(true);
      try {
        setReport(await fetchCashMovementsReport(from, to));
      } finally {
        setLoadingReport(false);
      }
    },
    [fetchCashMovementsReport]
  );

  useEffect(() => {
    loadReport(fromDate, toDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = (preset: 'hoy' | 'ayer' | 'semana' | 'mes') => {
    const today = new Date();
    let from = new Date(today);
    const to = new Date(today);
    if (preset === 'ayer') {
      from = new Date(today);
      from.setDate(from.getDate() - 1);
      to.setDate(to.getDate() - 1);
    } else if (preset === 'semana') {
      from = new Date(today);
      from.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    } else if (preset === 'mes') {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    const fromStr = todayStr(from);
    const toStr = todayStr(to);
    setFromDate(fromStr);
    setToDate(toStr);
    loadReport(fromStr, toStr);
  };

  const handleMovementClick = (m: CashMovement) => {
    if (!m.orderId) return;
    const order = orders.find((o) => o.id === m.orderId);
    if (order) onSelectOrder(order);
  };

  const movementIsIncome = (m: CashMovement) => (TYPE_META[m.type]?.income ?? true);
  const incomeMovements = report ? report.movements.filter(movementIsIncome) : [];
  const expenseMovements = report ? report.movements.filter((m) => !movementIsIncome(m)) : [];

  const handleExportPdf = async () => {
    if (!report) return;
    setExportingPdf(true);
    try {
      await downloadCashReportPdf(report, settings, currentUser.name);
    } finally {
      setExportingPdf(false);
    }
  };

  // --- Open / Close shift ---
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [initialCash, setInitialCash] = useState<number>(50.0);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [actualCashCounted, setActualCashCounted] = useState<number>(cashRegister.currentCash || 0);

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    openCashRegister(Number(initialCash));
    setIsOpenShiftModalOpen(false);
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    closeCashRegister(Number(actualCashCounted));
    setIsCloseShiftModalOpen(false);
  };

  // --- Partner capital contribution ---
  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
  const [capitalPartnerId, setCapitalPartnerId] = useState('');
  const [capitalAmount, setCapitalAmount] = useState<number>(0);
  const [capitalDesc, setCapitalDesc] = useState('');
  const [capitalMethod, setCapitalMethod] = useState<PaymentMethod>('EFECTIVO');
  const [capitalSubmitting, setCapitalSubmitting] = useState(false);
  const [capitalError, setCapitalError] = useState<string | null>(null);

  const openCapitalModal = (partnerId?: string) => {
    setCapitalPartnerId(partnerId || partners[0]?.id || '');
    setCapitalAmount(0);
    setCapitalDesc('');
    setCapitalError(null);
    setIsCapitalModalOpen(true);
  };

  const handleCapitalInjection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capitalPartnerId || capitalAmount <= 0 || !capitalDesc.trim()) return;
    setCapitalSubmitting(true);
    setCapitalError(null);
    try {
      await capitalInjection({
        partnerId: capitalPartnerId,
        amount: Number(capitalAmount),
        description: capitalDesc.trim(),
        method: capitalMethod,
      });
      setIsCapitalModalOpen(false);
      loadReport(fromDate, toDate);
    } catch (err) {
      setCapitalError(err instanceof Error ? err.message : 'No se pudo registrar el aporte.');
    } finally {
      setCapitalSubmitting(false);
    }
  };

  // --- Partner capital return ---
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnPartnerId, setReturnPartnerId] = useState('');
  const [returnAmount, setReturnAmount] = useState<number>(0);
  const [returnDesc, setReturnDesc] = useState('');
  const [returnMethod, setReturnMethod] = useState<PaymentMethod>('EFECTIVO');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  const openReturnModal = (partnerId?: string) => {
    const target = partnerId || partners.find((p) => p.pendingBalance > 0)?.id || partners[0]?.id || '';
    setReturnPartnerId(target);
    setReturnAmount(0);
    setReturnDesc('');
    setReturnError(null);
    setIsReturnModalOpen(true);
  };

  const returnPartner = partners.find((p) => p.id === returnPartnerId);

  const handleCapitalReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnPartnerId || returnAmount <= 0 || !returnDesc.trim()) return;
    setReturnSubmitting(true);
    setReturnError(null);
    try {
      await capitalReturn({
        partnerId: returnPartnerId,
        amount: Number(returnAmount),
        description: returnDesc.trim(),
        method: returnMethod,
      });
      setIsReturnModalOpen(false);
      loadReport(fromDate, toDate);
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : 'No se pudo registrar la devolución.');
    } finally {
      setReturnSubmitting(false);
    }
  };

  // --- Partner chronological history modal ---
  const [historyPartnerId, setHistoryPartnerId] = useState<string | null>(null);
  const [historyPartnerName, setHistoryPartnerName] = useState('');
  const openPartnerHistory = (partnerId: string, name: string) => {
    setHistoryPartnerId(partnerId);
    setHistoryPartnerName(name);
  };

  // --- Shop expense (separate block, below everything else) ---
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState<number>(10.0);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Materiales');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseMethod, setExpenseMethod] = useState<PaymentMethod>('EFECTIVO');

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0) return;
    await addExpense({
      date: todayStr(),
      category: expenseCategory,
      amount: Number(expenseAmount),
      paidWith: expenseMethod,
      description: expenseDesc,
    });
    setIsExpenseModalOpen(false);
    setExpenseAmount(10);
    setExpenseDesc('');
    loadReport(fromDate, toDate);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Control de Caja & Movimientos Financieros
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Arqueo de caja diario, cobro de anticipos, aportes y devoluciones de capital a socios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isShiftOpen ? (
            <button
              onClick={() => {
                setActualCashCounted(cashRegister.currentCash);
                setIsCloseShiftModalOpen(true);
              }}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Lock className="w-4 h-4" />
              Cerrar Turno de Caja
            </button>
          ) : (
            <button
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Unlock className="w-4 h-4" />
              Abrir Turno de Caja
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Summary Banner */}
      {isShiftOpen ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Turno de Caja Abierto</span>
              <span className="text-xs text-stone-400">• Apertura: {cashRegister.openedAt} por {cashRegister.openedBy}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[11px] text-stone-500 block">Fondo Inicial Apertura</span>
              <span className="text-lg font-bold font-mono text-stone-900">${cashRegister.initialAmount.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <span className="text-[11px] text-emerald-800 block">Efectivo en Gaveta</span>
              <span className="text-lg font-bold font-mono text-emerald-700">${cashRegister.currentCash.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[11px] text-stone-500 block">Efectivo Esperado</span>
              <span className="text-lg font-bold font-mono text-stone-800">${cashRegister.expectedCash.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-stone-50 rounded-2xl border-2 border-dashed border-stone-300 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="text-base font-bold text-stone-800">No hay un turno de caja abierto en este momento.</div>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Abra la caja ingresando el fondo inicial en efectivo para comenzar a registrar cobros y anticipos.
          </p>
          <button
            onClick={() => setIsOpenShiftModalOpen(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs inline-flex items-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            Abrir Caja Ahora
          </button>
        </div>
      )}

      {/* --- SOCIOS: capital contributions & returns --- */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Landmark className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-sm font-bold text-stone-900">Aportes y Devoluciones de Capital a Socios</div>
              <div className="text-[11px] text-stone-500">Saldo pendiente de devolución por cada socio registrado.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openCapitalModal()}
              disabled={!isShiftOpen}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isShiftOpen ? 'Abre un turno de caja primero' : ''}
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar Aporte
            </button>
            <button
              onClick={() => openReturnModal()}
              disabled={!isShiftOpen}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isShiftOpen ? 'Abre un turno de caja primero' : ''}
            >
              <Minus className="w-3.5 h-3.5" />
              Registrar Devolución
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {partners.map((p) => (
            <div key={p.id} className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="text-sm font-bold text-stone-900 truncate">{p.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-stone-500 block">Aportado</span>
                  <span className="font-mono font-bold text-emerald-700">${p.totalContributed.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Devuelto</span>
                  <span className="font-mono font-bold text-purple-700">${p.totalReturned.toFixed(2)}</span>
                </div>
              </div>
              <div
                className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center justify-between ${
                  p.pendingBalance > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                <span>Saldo Pendiente</span>
                <span className="font-mono">${p.pendingBalance.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <button
                  onClick={() => openPartnerHistory(p.id, p.name)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 hover:text-stone-800 hover:underline"
                >
                  <History className="w-3 h-3" />
                  Ver historial
                </button>
                {p.pendingBalance > 0 && (
                  <button
                    onClick={() => openReturnModal(p.id)}
                    disabled={!isShiftOpen}
                    className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 hover:underline disabled:opacity-50"
                  >
                    Devolver capital
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical / Date-range movement report */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <History className="w-4 h-4 text-stone-500" />
            Historial de Ingresos y Aportes
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['hoy', 'ayer', 'semana', 'mes'] as const).map((p) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className="px-2.5 py-1 text-[11px] font-semibold text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors capitalize"
              >
                {p === 'hoy' ? 'Hoy' : p === 'ayer' ? 'Ayer' : p === 'semana' ? 'Esta Semana' : 'Este Mes'}
              </button>
            ))}
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2 py-1 text-[11px] border border-stone-300 rounded-lg outline-hidden"
            />
            <span className="text-stone-400 text-[11px]">a</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2 py-1 text-[11px] border border-stone-300 rounded-lg outline-hidden"
            />
            <button
              onClick={() => loadReport(fromDate, toDate)}
              className="px-3 py-1 text-[11px] font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors"
            >
              Consultar
            </button>
            <button
              onClick={handleExportPdf}
              disabled={!report || exportingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60"
            >
              {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              Exportar Reporte PDF
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[11px] text-emerald-700 font-semibold block">Ingresos</span>
              <span className="text-lg font-bold font-mono text-emerald-800">${report.summary.totalIngresos.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
              <span className="text-[11px] text-sky-700 font-semibold block">Aportes de Socios</span>
              <span className="text-lg font-bold font-mono text-sky-800">${report.summary.totalAportes.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
              <span className="text-[11px] text-purple-700 font-semibold block">Devoluciones a Socios</span>
              <span className="text-lg font-bold font-mono text-purple-800">-${report.summary.totalDevolucionesCapital.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-red-50 rounded-xl border border-red-200">
              <span className="text-[11px] text-red-700 font-semibold block">Egresos</span>
              <span className="text-lg font-bold font-mono text-red-800">-${report.summary.totalEgresos.toFixed(2)}</span>
            </div>
            <div className="p-3 bg-stone-900 rounded-xl">
              <span className="text-[11px] text-stone-300 font-semibold block">Balance del Período</span>
              <span className="text-lg font-bold font-mono text-white">${report.summary.balance.toFixed(2)}</span>
            </div>
          </div>
        )}

        <MovementsTable
          movements={incomeMovements}
          loading={loadingReport}
          emptyMessage="No hay ingresos ni aportes registrados en el rango seleccionado."
          onMovementClick={handleMovementClick}
        />
      </div>

      {/* --- GASTOS DE TALLER: independent block, strictly egresos/gastos, separate from income above --- */}
      <div className="pt-2 space-y-3">
        <div className="bg-white rounded-2xl border-2 border-dashed border-red-200 p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900">Gastos de Taller</div>
                <div className="text-[11px] text-stone-500">Compras menores, suministros operativos y egresos del día a día.</div>
              </div>
            </div>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Registrar Gasto de Taller
            </button>
          </div>
        </div>

        <div className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
          <Wallet className="w-4 h-4 text-red-500" />
          Historial de Gastos y Egresos
        </div>
        <MovementsTable
          movements={expenseMovements}
          loading={loadingReport}
          emptyMessage="No hay gastos ni egresos registrados en el rango seleccionado."
          onMovementClick={handleMovementClick}
        />
      </div>

      {/* MODAL: OPEN SHIFT */}
      <Modal
        isOpen={isOpenShiftModalOpen}
        onClose={() => setIsOpenShiftModalOpen(false)}
        title="Apertura de Caja"
        subtitle="Inicie el turno ingresando el fondo de dinero base en efectivo."
        maxWidth="md"
      >
        <form onSubmit={handleOpenShift} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Fondo Inicial en Efectivo ($) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-stone-400 font-bold">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={initialCash}
                onChange={(e) => setInitialCash(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2 text-sm font-bold font-mono border border-stone-300 rounded-lg outline-hidden"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Monto destinado para vueltos y cambio en mostrador.</p>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-600">
            <div><strong>Cajero Responsable:</strong> {currentUser.name}</div>
            <div><strong>Fecha:</strong> {new Date().toLocaleDateString('es-EC')}</div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsOpenShiftModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs">
              Confirmar Apertura
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CLOSE SHIFT */}
      {isShiftOpen && (
        <Modal
          isOpen={isCloseShiftModalOpen}
          onClose={() => setIsCloseShiftModalOpen(false)}
          title="Cierre y Arqueo de Caja"
          subtitle="Cuadre los valores físicos en caja con los registros del sistema."
          maxWidth="lg"
        >
          <form onSubmit={handleCloseShift} className="space-y-4">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-500">Efectivo esperado según sistema:</span>
              <div className="text-base font-bold font-mono text-stone-900">${cashRegister.expectedCash.toFixed(2)}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Efectivo Físico Real Contado en Gaveta ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={actualCashCounted}
                onChange={(e) => setActualCashCounted(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-base font-bold font-mono border border-stone-300 rounded-lg outline-hidden"
              />
            </div>

            {(() => {
              const diff = actualCashCounted - cashRegister.expectedCash;
              return (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between font-mono ${
                    diff === 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' : 'bg-red-50 border-red-300 text-red-800 font-bold'
                  }`}
                >
                  <span>{diff === 0 ? '✓ Arqueo Exacto (Sin diferencias)' : '⚠ Diferencia de Arqueo:'}</span>
                  <span>{diff >= 0 ? `+$${diff.toFixed(2)} (Sobrante)` : `-$${Math.abs(diff).toFixed(2)} (Faltante)`}</span>
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setIsCloseShiftModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
              >
                Cancelar
              </button>
              <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-xs">
                Confirmar Cierre Definitivo
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: PARTNER CAPITAL CONTRIBUTION */}
      <Modal
        isOpen={isCapitalModalOpen}
        onClose={() => setIsCapitalModalOpen(false)}
        title="Ingreso de Capital / Inversión del Socio"
        subtitle="Registra un aporte extraordinario que suma al balance de caja."
        maxWidth="md"
      >
        <form onSubmit={handleCapitalInjection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Socio *</label>
            <select
              required
              value={capitalPartnerId}
              onChange={(e) => setCapitalPartnerId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden bg-white"
            >
              <option value="">-- Selecciona un socio --</option>
              {partners.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Monto del Aporte ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={capitalAmount}
              onChange={(e) => setCapitalAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm font-bold font-mono border border-stone-300 rounded-lg outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Descripción *</label>
            <input
              type="text"
              required
              placeholder="Ej: Inyección de capital para compra de maquinaria"
              value={capitalDesc}
              onChange={(e) => setCapitalDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Forma de Ingreso *</label>
            <select
              value={capitalMethod}
              onChange={(e) => setCapitalMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden bg-white"
            >
              <option value="EFECTIVO">Efectivo (suma a la gaveta física)</option>
              <option value="TRANSFERENCIA">Transferencia Bancaria</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          {capitalError && (
            <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{capitalError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsCapitalModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={capitalSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs disabled:opacity-60"
            >
              {capitalSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Registrar Aporte
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: PARTNER CAPITAL RETURN */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title="Devolución de Capital al Socio"
        subtitle="Registra un pago parcial o total para saldar el capital aportado."
        maxWidth="md"
      >
        <form onSubmit={handleCapitalReturn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Socio *</label>
            <select
              required
              value={returnPartnerId}
              onChange={(e) => setReturnPartnerId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden bg-white"
            >
              <option value="">-- Selecciona un socio --</option>
              {partners.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>{p.name} (Saldo: ${p.pendingBalance.toFixed(2)})</option>
              ))}
            </select>
          </div>
          {returnPartner && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
              Saldo pendiente de devolución: <strong className="font-mono">${returnPartner.pendingBalance.toFixed(2)}</strong>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Monto a Devolver ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={returnAmount}
              onChange={(e) => setReturnAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm font-bold font-mono border border-stone-300 rounded-lg outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Descripción *</label>
            <input
              type="text"
              required
              placeholder="Ej: Devolución parcial de capital, primer abono"
              value={returnDesc}
              onChange={(e) => setReturnDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Forma de Pago *</label>
            <select
              value={returnMethod}
              onChange={(e) => setReturnMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden bg-white"
            >
              <option value="EFECTIVO">Efectivo (sale de la gaveta física)</option>
              <option value="TRANSFERENCIA">Transferencia Bancaria</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          {returnError && (
            <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{returnError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsReturnModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={returnSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs disabled:opacity-60"
            >
              {returnSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Registrar Devolución
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: SHOP EXPENSE */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Registrar Gasto de Taller"
        subtitle="Compras urgentes de insumos, herramientas o consumibles."
        maxWidth="md"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Monto ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs font-bold font-mono border border-stone-300 rounded-lg outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Categoría *</label>
            <select
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden bg-white"
            >
              <option value="Materiales">Materiales e Insumos</option>
              <option value="Herramientas">Herramientas</option>
              <option value="Sueldos">Sueldos / Personal</option>
              <option value="Pago a Proveedor">Pago a Proveedor</option>
              <option value="Mantenimiento">Mantenimiento maquinaria</option>
              <option value="Transporte">Transporte / Envíos</option>
              <option value="Servicios básicos">Servicios básicos</option>
              <option value="Otros">Otros</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Método de Pago *</label>
            <select
              value={expenseMethod}
              onChange={(e) => setExpenseMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden bg-white"
            >
              <option value="EFECTIVO">Efectivo de Caja</option>
              <option value="TRANSFERENCIA">Transferencia Bancaria</option>
              <option value="TARJETA">Tarjeta de Débito/Crédito</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Detalle o Justificativo *</label>
            <input
              type="text"
              required
              placeholder="Ej: Factura ferretería por 2 brochas y lija fina..."
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-xs">
              Guardar Gasto
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: PARTNER CHRONOLOGICAL HISTORY */}
      <PartnerHistoryModal
        isOpen={!!historyPartnerId}
        onClose={() => setHistoryPartnerId(null)}
        partnerId={historyPartnerId}
        partnerName={historyPartnerName}
        fetchHistory={fetchPartnerHistory}
      />
    </div>
  );
};
