import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod } from '../../types';
import { Modal } from '../common/Modal';
import {
  Plus, Trash2, ShoppingCart, History, ArrowDownLeft, ArrowUpRight,
  ClipboardList, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';

interface DraftItem {
  materialId: string;
  quantity: number;
  unitCost: number;
}

const PAYMENT_METHODS: PaymentMethod[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO'];

export const PurchasesTab: React.FC = () => {
  const { materials, suppliers, purchases, inventoryMovements, createPurchase } = useApp();

  const [innerView, setInnerView] = useState<'compras' | 'movimientos'>('compras');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('EFECTIVO');
  const [items, setItems] = useState<DraftItem[]>([{ materialId: '', quantity: 1, unitCost: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null);

  const resetForm = () => {
    setSupplierId('');
    setInvoiceNumber('');
    setPaymentMethod('EFECTIVO');
    setItems([{ materialId: '', quantity: 1, unitCost: 0 }]);
  };

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== index) return it;
      const next = { ...it, ...patch };
      // Prefill unit cost from the material's last known cost the moment it's picked
      if (patch.materialId) {
        const mat = materials.find((m) => m.id === patch.materialId);
        if (mat) next.unitCost = mat.costPrice;
      }
      return next;
    }));
  };

  const addItemRow = () => setItems((prev) => [...prev, { materialId: '', quantity: 1, unitCost: 0 }]);
  const removeItemRow = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const validItems = items.filter((it) => it.materialId && it.quantity > 0);
  const total = validItems.reduce((acc, it) => acc + it.quantity * it.unitCost, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || validItems.length === 0) return;
    setSubmitting(true);
    try {
      await createPurchase({
        supplierId,
        invoiceDocumentNumber: invoiceNumber.trim() || undefined,
        paymentMethod,
        items: validItems.map((it) => ({ materialId: it.materialId, quantity: it.quantity, unitCost: it.unitCost })),
      });
      resetForm();
      setIsFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const sortedPurchases = useMemo(() => [...purchases].sort((a, b) => b.date.localeCompare(a.date)), [purchases]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs w-fit">
          <button
            onClick={() => setInnerView('compras')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              innerView === 'compras' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Compras Registradas
          </button>
          <button
            onClick={() => setInnerView('movimientos')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
              innerView === 'movimientos' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Kárdex de Movimientos
          </button>
        </div>

        {innerView === 'compras' && (
          <button
            onClick={() => setIsFormOpen(true)}
            disabled={suppliers.length === 0}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
            title={suppliers.length === 0 ? 'Registra un proveedor primero' : ''}
          >
            <Plus className="w-4 h-4" />
            Registrar Compra
          </button>
        )}
      </div>

      {innerView === 'compras' ? (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3 w-8" />
                  <th className="py-2.5 px-3">N° Orden</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Proveedor</th>
                  <th className="py-2.5 px-3 text-center">Ítems</th>
                  <th className="py-2.5 px-3">Método de Pago</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {sortedPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-400">
                      Aún no se han registrado compras a proveedores.
                    </td>
                  </tr>
                ) : (
                  sortedPurchases.map((p) => (
                    <React.Fragment key={p.id}>
                      <tr
                        className="hover:bg-stone-50 cursor-pointer"
                        onClick={() => setExpandedPurchase(expandedPurchase === p.id ? null : p.id)}
                      >
                        <td className="py-2.5 px-3 text-stone-400">
                          {expandedPurchase === p.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-stone-800">{p.purchaseNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-stone-500">{p.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-stone-900">{p.supplierName}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{p.items.length}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-stone-100 rounded-sm text-[10px] uppercase font-bold text-stone-600">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">${p.total.toFixed(2)}</td>
                      </tr>
                      {expandedPurchase === p.id && (
                        <tr>
                          <td colSpan={7} className="bg-stone-50/70 px-3 py-3">
                            <table className="w-full text-[11px]">
                              <thead className="text-stone-500 font-semibold">
                                <tr>
                                  <th className="text-left py-1 px-2">Insumo</th>
                                  <th className="text-center py-1 px-2">Cantidad</th>
                                  <th className="text-right py-1 px-2">Costo Unit.</th>
                                  <th className="text-right py-1 px-2">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-200">
                                {p.items.map((it, idx) => (
                                  <tr key={idx}>
                                    <td className="py-1 px-2 font-medium text-stone-800">{it.materialName}</td>
                                    <td className="py-1 px-2 text-center font-mono">{it.quantity} {it.unit}</td>
                                    <td className="py-1 px-2 text-right font-mono">${it.unitCost.toFixed(2)}</td>
                                    <td className="py-1 px-2 text-right font-mono font-bold">${it.total.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {p.invoiceDocumentNumber && (
                              <p className="text-[10px] text-stone-400 mt-2">Documento/Factura: {p.invoiceDocumentNumber}</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-stone-50 border-b border-stone-200 flex justify-between items-center text-xs">
            <span className="font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" />
              Entradas, Salidas y Consumo por Orden
            </span>
            <span className="text-stone-500">Total: {inventoryMovements.length} transacciones</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Tipo Movimiento</th>
                  <th className="py-2.5 px-3">Insumo</th>
                  <th className="py-2.5 px-3 text-center">Cantidad</th>
                  <th className="py-2.5 px-3">Orden de Servicio / Motivo</th>
                  <th className="py-2.5 px-3">Registrado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {inventoryMovements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 font-mono text-stone-500 text-[11px]">{mov.date} {mov.time}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        mov.type === 'ENTRADA' || mov.type === 'COMPRA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : mov.type === 'CONSUMO_ORDEN'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-stone-100 text-stone-800'
                      }`}>
                        {mov.type === 'ENTRADA' || mov.type === 'COMPRA' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {mov.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-stone-900">{mov.materialName}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">{mov.quantity} {mov.unit}</td>
                    <td className="py-2.5 px-3 text-stone-600">
                      {mov.orderNumber ? (
                        <span className="font-mono font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded-xs">{mov.orderNumber}</span>
                      ) : (
                        <span>{mov.reason}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-stone-500 text-[11px]">{mov.registeredBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER PURCHASE */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Registrar Compra / Reabastecimiento"
        subtitle="Actualiza el stock automáticamente y registra el egreso en caja."
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Proveedor *</label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden bg-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Selecciona --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">N° Factura / Documento</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Opcional"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Método de Pago *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden bg-white focus:ring-2 focus:ring-amber-500"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-stone-700">Insumos Adquiridos *</label>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar línea
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => {
                const mat = materials.find((m) => m.id === it.materialId);
                const lineTotal = it.quantity * it.unitCost;
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-stone-50 border border-stone-200 rounded-lg p-2">
                    <select
                      value={it.materialId}
                      onChange={(e) => updateItem(idx, { materialId: e.target.value })}
                      className="col-span-5 px-2 py-1.5 text-xs border border-stone-300 rounded-lg outline-hidden bg-white"
                    >
                      <option value="">-- Insumo --</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>{m.code} · {m.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                      placeholder="Cant."
                      className="col-span-2 px-2 py-1.5 text-xs border border-stone-300 rounded-lg outline-hidden font-mono"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.unitCost}
                      onChange={(e) => updateItem(idx, { unitCost: parseFloat(e.target.value) || 0 })}
                      placeholder="Costo unit."
                      className="col-span-2 px-2 py-1.5 text-xs border border-stone-300 rounded-lg outline-hidden font-mono"
                    />
                    <div className="col-span-2 text-xs font-mono font-bold text-stone-800 text-right pr-1">
                      ${lineTotal.toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      disabled={items.length === 1}
                      className="col-span-1 flex justify-center text-stone-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {mat && (
                      <div className="col-span-12 text-[10px] text-stone-400 -mt-1">
                        Stock actual: {mat.currentStock} {mat.unit} · Costo previo: ${mat.costPrice.toFixed(2)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end items-center gap-3 pt-2 border-t border-stone-200">
            <span className="text-xs text-stone-500">Total de la compra:</span>
            <span className="text-lg font-black font-mono text-stone-900">${total.toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !supplierId || validItems.length === 0}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting ? 'Registrando...' : 'Registrar Compra y Actualizar Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
