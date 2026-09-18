import React, { useRef, useState } from 'react';
import { SalesNote, AppSettings } from '../../types';
import { Printer, Copy, Check, FileText, Image as ImageIcon, FileDown, Loader2 } from 'lucide-react';
import { exportNodeAsPng, exportNodeAsPdf } from '../../lib/exportDocument';
import { BRAND_LOGO } from '../../lib/brand';

interface PrintableSalesNoteProps {
  salesNote: SalesNote;
  settings: AppSettings;
}

export const PrintableSalesNote: React.FC<PrintableSalesNoteProps> = ({ salesNote, settings }) => {
  const [copied, setCopied] = React.useState(false);
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async (kind: 'png' | 'pdf') => {
    if (!containerRef.current || exporting) return;
    setExporting(kind);
    try {
      const fileName = `NotaVenta-${salesNote.noteNumber}`;
      if (kind === 'png') {
        await exportNodeAsPng(containerRef.current, fileName);
      } else {
        await exportNodeAsPdf(containerRef.current, fileName);
      }
    } finally {
      setExporting(null);
    }
  };

  const handleCopy = () => {
    const text = `
NOTA DE VENTA: ${salesNote.noteNumber}
Fecha: ${salesNote.date}
Emisor: ${settings.businessName} (RUC: ${settings.ruc})
Cliente: ${salesNote.customerName} (CI/RUC: ${salesNote.customerDocument || 'Consumidor Final'})
Orden Asociada: ${salesNote.orderNumber}
Total Pagado: $${salesNote.total.toFixed(2)} (${salesNote.paymentMethod})
Atendido por: ${salesNote.cashierName}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Action Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-100 rounded-xl border border-stone-200">
        <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-stone-600" />
          Nota de Venta Comercial (Estructura Fiscal Preparada)
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          <button
            onClick={() => handleExport('png')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-xs disabled:opacity-60"
            title="Descargar como imagen PNG para adjuntar en WhatsApp"
          >
            {exporting === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
            PNG
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-xs disabled:opacity-60"
            title="Descargar como PDF de una sola página"
          >
            {exporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            PDF
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Documento
          </button>
        </div>
      </div>

      {/* Formal Invoice / Sales Note Sheet */}
      <div 
        ref={containerRef}
        className="printable-card max-w-2xl mx-auto bg-white border border-stone-300 p-8 rounded-xl shadow-xs text-stone-900 font-sans"
      >
        {/* Top Header Grid */}
        <div className="print-avoid-break flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-stone-800">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <img src={BRAND_LOGO} alt={settings.businessName} className="w-12 h-12 object-contain shrink-0" />
              <div className="text-2xl font-extrabold text-stone-900 tracking-tight">
                {settings.businessName}
              </div>
            </div>
            <div className="text-sm font-semibold text-stone-700">{settings.commercialName}</div>
            <div className="text-xs text-stone-600 pt-1">
              <strong>RUC:</strong> {settings.ruc}
            </div>
            <div className="text-xs text-stone-600">
              <strong>Matriz:</strong> {settings.address}
            </div>
            <div className="text-xs text-stone-600">
              <strong>Teléfono:</strong> {settings.phone} | <strong>Email:</strong> {settings.email}
            </div>
            <div className="inline-block mt-2 px-2 py-0.5 bg-stone-100 text-stone-600 text-[11px] font-medium rounded-xs border border-stone-200">
              CONTRIBUYENTE RÉGIMEN RIMPE - NEGOCIO ARTESANAL
            </div>
          </div>

          <div className="sm:text-right border-2 border-stone-800 p-4 rounded-lg bg-stone-50/50 min-w-[220px]">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-600">NOTA DE VENTA</div>
            <div className="text-xl font-mono font-bold text-red-700 mt-0.5">
              {salesNote.noteNumber}
            </div>
            <div className="text-xs text-stone-500 mt-2">
              <strong>Fecha:</strong> {salesNote.date}
            </div>
            <div className="text-xs text-stone-500">
              <strong>Orden Ref:</strong> {salesNote.orderNumber}
            </div>
          </div>
        </div>

        {/* Customer Information Box */}
        <div className="print-avoid-break my-6 p-4 bg-stone-50 rounded-lg border border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-stone-500 block">Señor(es) / Cliente:</span>
            <span className="font-bold text-sm text-stone-900">{salesNote.customerName}</span>
          </div>
          <div>
            <span className="text-stone-500 block">RUC / C.I.:</span>
            <span className="font-semibold font-mono text-stone-900">{salesNote.customerDocument || 'Consumidor Final'}</span>
          </div>
          <div>
            <span className="text-stone-500 block">Dirección:</span>
            <span className="text-stone-800">{salesNote.customerAddress || 'Quito, Ecuador'}</span>
          </div>
          <div>
            <span className="text-stone-500 block">Teléfono:</span>
            <span className="text-stone-800">{salesNote.customerPhone}</span>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto my-6">
          <table className="w-full text-left text-xs border border-stone-200 rounded-lg overflow-hidden">
            <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">Cant.</th>
                <th className="py-2.5 px-3">Descripción del Servicio de Restauración</th>
                <th className="py-2.5 px-3 text-right w-24">P. Unitario</th>
                <th className="py-2.5 px-3 text-right w-20">Desc.</th>
                <th className="py-2.5 px-3 text-right w-24">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {salesNote.items.map((item, index) => (
                <tr key={index} className="hover:bg-stone-50/50">
                  <td className="py-2.5 px-3 text-center font-mono font-medium">{item.quantity}</td>
                  <td className="py-2.5 px-3 font-medium text-stone-900">{item.serviceOrMaterialName}</td>
                  <td className="py-2.5 px-3 text-right font-mono">${item.unitPrice.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                    {item.discount > 0 ? `-$${item.discount.toFixed(2)}` : '$0.00'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">${item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment / Abonos History */}
        {salesNote.payments && salesNote.payments.length > 0 && (
          <div className="print-avoid-break my-6">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-2">
              Historial de Abonos y Pagos
            </div>
            <table className="w-full text-left text-xs border border-stone-200 rounded-lg overflow-hidden">
              <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200 uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-3">Fecha / Hora</th>
                  <th className="py-2 px-3">Recibo</th>
                  <th className="py-2 px-3">Tipo</th>
                  <th className="py-2 px-3">Método</th>
                  <th className="py-2 px-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {salesNote.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 px-3 font-mono text-stone-600">{p.date} {p.time}</td>
                    <td className="py-2 px-3 font-mono text-stone-600">{p.receiptNumber}</td>
                    <td className="py-2 px-3 text-stone-800 capitalize">{p.type.toLowerCase()}</td>
                    <td className="py-2 px-3 text-stone-800">{p.method}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">${p.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Section: Payment & Totals */}
        <div className="print-avoid-break flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-stone-200 text-xs">
          <div className="space-y-2 max-w-sm">
            <div>
              <span className="text-stone-500 font-medium">Forma de Pago: </span>
              <span className="font-bold text-stone-800 uppercase px-2 py-0.5 bg-stone-100 rounded-xs border border-stone-200">
                {salesNote.paymentMethod}
              </span>
            </div>
            <div>
              <span className="text-stone-500 font-medium">Atendido por: </span>
              <span className="text-stone-800 font-semibold">{salesNote.cashierName}</span>
            </div>
            <p className="text-[10px] text-stone-400 italic pt-2">
              * Documento interno de control y entrega. En caso de requerir Factura Electrónica con desglose de IVA y autorización del SRI, favor solicitarla en caja con sus datos tributarios completos.
            </p>
          </div>

          <div className="w-full sm:w-64 space-y-2 border border-stone-200 rounded-lg p-3 bg-stone-50">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">${salesNote.subtotal.toFixed(2)}</span>
            </div>
            {salesNote.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Descuento aplicado:</span>
                <span className="font-mono font-semibold">-${salesNote.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-500 text-[11px]">
              <span>Tarifa IVA 0%:</span>
              <span className="font-mono">$0.00</span>
            </div>
            <div className="flex justify-between text-stone-900 font-bold text-base pt-2 border-t border-stone-300">
              <span>TOTAL A PAGAR:</span>
              <span className="font-mono font-extrabold text-stone-900">${salesNote.total.toFixed(2)}</span>
            </div>
            {salesNote.totalPaid !== undefined && (
              <>
                <div className="flex justify-between text-emerald-700 pt-1 border-t border-stone-200">
                  <span>Total Abonado:</span>
                  <span className="font-mono font-semibold">${salesNote.totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-900 bg-amber-100/70 p-1.5 rounded-sm">
                  <span>Saldo Pendiente:</span>
                  <span className="font-mono">${(salesNote.balancePending ?? 0).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Signatures */}
        <div className="print-avoid-break grid grid-cols-2 gap-12 mt-12 pt-8 border-t border-dashed border-stone-300 text-center text-xs text-stone-500">
          <div>
            <div className="border-t border-stone-400 w-40 mx-auto pt-1 font-semibold text-stone-700">
              Firma Autorizada
            </div>
            <span className="text-[10px] text-stone-400">{settings.businessName}</span>
          </div>
          <div>
            <div className="border-t border-stone-400 w-40 mx-auto pt-1 font-semibold text-stone-700">
              Recibí Conforme
            </div>
            <span className="text-[10px] text-stone-400">Cliente / C.I. {salesNote.customerDocument || ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
