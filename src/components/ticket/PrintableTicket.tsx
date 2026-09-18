import React, { useRef, useState } from 'react';
import { ServiceOrder, AppSettings } from '../../types';
import { Printer, MessageCircle, Copy, Check, Image as ImageIcon, FileDown, Loader2 } from 'lucide-react';
import { exportNodeAsPng, exportNodeAsPdf } from '../../lib/exportDocument';
import { TicketDocument } from './TicketDocument';

interface PrintableTicketProps {
  order: ServiceOrder;
  settings: AppSettings;
  onSendWhatsApp: () => void;
}

export const PrintableTicket: React.FC<PrintableTicketProps> = ({ order, settings, onSendWhatsApp }) => {
  const [copied, setCopied] = React.useState(false);
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async (kind: 'png' | 'pdf') => {
    if (!ticketRef.current || exporting) return;
    setExporting(kind);
    try {
      const fileName = `Ticket-${order.orderNumber}`;
      if (kind === 'png') {
        await exportNodeAsPng(ticketRef.current, fileName);
      } else {
        await exportNodeAsPdf(ticketRef.current, fileName);
      }
    } finally {
      setExporting(null);
    }
  };

  const handleCopyText = () => {
    const summary = `
=========================================
${settings.businessName.toUpperCase()}
${settings.commercialName}
RUC: ${settings.ruc} | Telf: ${settings.phone}
${settings.address}
=========================================
ORDEN DE SERVICIO: ${order.orderNumber}
Fecha Recepción: ${order.date} ${order.time}
Fecha Prometida: ${order.promisedDate}
-----------------------------------------
CLIENTE: ${order.customer.firstName} ${order.customer.lastName}
Teléfono: ${order.customer.phone}
WhatsApp: ${order.customer.whatsapp || order.customer.phone}
-----------------------------------------
${order.items.length > 1
  ? `CALZADO (${order.items.length} PARES):\n` +
    order.items.map((it, idx) =>
      `Par ${idx + 1}: ${it.shoe.type} ${it.shoe.brand} ${it.shoe.model} — Color: ${it.shoe.color} | Talla: ${it.shoe.size} | Material: ${it.shoe.material}\n` +
      it.services.map(s => `   - ${s.name}: $${s.price.toFixed(2)}`).join('\n')
    ).join('\n')
  : `CALZADO:\nTipo: ${order.shoe.type}\nMarca: ${order.shoe.brand}\nModelo: ${order.shoe.model}\nColor: ${order.shoe.color} | Talla: ${order.shoe.size}\nMaterial: ${order.shoe.material}\n-----------------------------------------\nSERVICIOS:\n${order.services.map(s => `- ${s.name}: $${s.price.toFixed(2)}`).join('\n')}`
}
-----------------------------------------
Subtotal: $${order.budget.subtotal.toFixed(2)}
Descuento: $${order.budget.discount.toFixed(2)}
TOTAL: $${order.budget.total.toFixed(2)}
Anticipo Pagado: $${order.totalPaid.toFixed(2)}
SALDO PENDIENTE: $${order.balancePending.toFixed(2)}
-----------------------------------------
OBSERVACIONES:
${order.generalObservations || 'Ninguna'}
=========================================
CONDICIONES:
${settings.defaultConditions}
=========================================
`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar (hidden when printing) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-100 rounded-xl border border-stone-200">
        <span className="text-xs font-semibold text-stone-700">
          Ticket formato recibo comercial (Térmico / 80mm)
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado' : 'Copiar Texto'}
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
            onClick={onSendWhatsApp}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Enviar por WhatsApp
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Ticket
          </button>
        </div>
      </div>

      {/* Ticket Container */}
      <TicketDocument ref={ticketRef} order={order} settings={settings} />
    </div>
  );
};
