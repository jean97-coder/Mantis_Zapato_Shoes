import React, { useRef, useState } from 'react';
import { StoreSale, AppSettings } from '../../types';
import { Printer, Image as ImageIcon, FileDown, Loader2, ShoppingBag } from 'lucide-react';
import { exportNodeAsPng, exportNodeAsPdf } from '../../lib/exportDocument';
import { BRAND_LOGO } from '../../lib/brand';

interface StoreSaleReceiptProps {
  sale: StoreSale;
  settings: AppSettings;
  onNewSale: () => void;
}

/**
 * Formal "Nota de Venta" for a direct store sale — mirrors the repair-order
 * sales note layout (letterhead, fiscal data, items table, totals) but adds
 * the cash-received / change breakdown specific to a POS checkout.
 */
export const StoreSaleReceipt: React.FC<StoreSaleReceiptProps> = ({ sale, settings, onNewSale }) => {
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => window.print();

  const handleExport = async (kind: 'png' | 'pdf') => {
    if (!containerRef.current || exporting) return;
    setExporting(kind);
    try {
      const fileName = `NotaVenta-${sale.saleNumber}`;
      if (kind === 'png') await exportNodeAsPng(containerRef.current, fileName);
      else await exportNodeAsPdf(containerRef.current, fileName);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-100 rounded-xl border border-stone-200">
        <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
          <ShoppingBag className="w-4 h-4 text-stone-600" />
          Nota de Venta — Tienda
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport('png')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-xs disabled:opacity-60"
          >
            {exporting === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
            PNG
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-xs disabled:opacity-60"
          >
            {exporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            PDF
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </button>
          <button
            onClick={onNewSale}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-xs"
          >
            Nueva Venta
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="printable-card max-w-2xl mx-auto bg-white border border-stone-300 p-8 rounded-xl shadow-xs text-stone-900 font-sans"
      >
        <div className="print-avoid-break flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-stone-800">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <img src={BRAND_LOGO} alt={settings.businessName} className="w-12 h-12 object-contain shrink-0" />
              <div className="text-2xl font-extrabold text-stone-900 tracking-tight">{settings.businessName}</div>
            </div>
            <div className="text-sm font-semibold text-stone-700">{settings.commercialName}</div>
            <div className="text-xs text-stone-600 pt-1"><strong>RUC:</strong> {settings.ruc}</div>
            <div className="text-xs text-stone-600"><strong>Dirección:</strong> {settings.address}</div>
            <div className="text-xs text-stone-600"><strong>Teléfono:</strong> {settings.phone} | <strong>Email:</strong> {settings.email}</div>
          </div>

          <div className="sm:text-right border-2 border-stone-800 p-4 rounded-lg bg-stone-50/50 min-w-[220px]">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-600">Nota de Venta — Tienda</div>
            <div className="text-xl font-mono font-bold text-red-700 mt-0.5">{sale.saleNumber}</div>
            <div className="text-xs text-stone-500 mt-2"><strong>Fecha:</strong> {sale.date} {sale.time}</div>
          </div>
        </div>

        <div className="print-avoid-break my-6 p-4 bg-stone-50 rounded-lg border border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-stone-500 block">Cliente:</span>
            <span className="font-bold text-sm text-stone-900">{sale.customerName || 'Consumidor Final'}</span>
          </div>
          <div>
            <span className="text-stone-500 block">RUC / C.I.:</span>
            <span className="font-semibold font-mono text-stone-900">{sale.customerDocument || 'Consumidor Final'}</span>
          </div>
        </div>

        <div className="overflow-x-auto my-6">
          <table className="w-full text-left text-xs border border-stone-200 rounded-lg overflow-hidden">
            <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">Cant.</th>
                <th className="py-2.5 px-3">Producto</th>
                <th className="py-2.5 px-3 text-right w-24">P. Unitario</th>
                <th className="py-2.5 px-3 text-right w-24">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {sale.items.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50/50">
                  <td className="py-2.5 px-3 text-center font-mono font-medium">{item.quantity}</td>
                  <td className="py-2.5 px-3 font-medium text-stone-900">
                    {item.productName}
                    <div className="text-[10px] text-stone-500 font-normal">Talla {item.size} · {item.color}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">${item.unitPrice.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">${item.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="print-avoid-break flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-stone-200 text-xs">
          <div className="space-y-2 max-w-sm">
            <div>
              <span className="text-stone-500 font-medium">Forma de Pago: </span>
              <span className="font-bold text-stone-800 uppercase px-2 py-0.5 bg-stone-100 rounded-xs border border-stone-200">
                {sale.paymentMethod}
              </span>
            </div>
            <div>
              <span className="text-stone-500 font-medium">Atendido por: </span>
              <span className="text-stone-800 font-semibold">{sale.registeredBy}</span>
            </div>
          </div>

          <div className="w-full sm:w-64 space-y-2 border border-stone-200 rounded-lg p-3 bg-stone-50">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">${sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.taxRatePercent > 0 && (
              <div className="flex justify-between text-stone-500 text-[11px]">
                <span>IVA {sale.taxRatePercent}%:</span>
                <span className="font-mono">${sale.taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-900 font-bold text-base pt-2 border-t border-stone-300">
              <span>TOTAL:</span>
              <span className="font-mono font-extrabold text-stone-900">${sale.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-600 pt-1 border-t border-stone-200">
              <span>Efectivo Recibido:</span>
              <span className="font-mono font-semibold">${sale.cashReceived.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-800 bg-emerald-100/70 p-1.5 rounded-sm">
              <span>Vuelto / Cambio:</span>
              <span className="font-mono">${sale.changeGiven.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="print-avoid-break mt-8 pt-4 border-t border-dashed border-stone-300 text-center text-[10px] text-stone-400">
          Gracias por su compra en {settings.businessName}. Documento generado electrónicamente.
        </div>
      </div>
    </div>
  );
};
