import React, { forwardRef } from 'react';
import { ServiceOrder, AppSettings } from '../../types';
import { Scissors } from 'lucide-react';
import { StatusBadge } from '../common/Badge';
import { BRAND_LOGO } from '../../lib/brand';

interface TicketDocumentProps {
  order: ServiceOrder;
  settings: AppSettings;
}

/**
 * The actual receipt-style ticket markup, extracted from PrintableTicket so it
 * can also be rendered headlessly (off-screen) for PNG snapshot export — see
 * lib/ticketSnapshot.ts — without duplicating this JSX in two places.
 */
export const TicketDocument = forwardRef<HTMLDivElement, TicketDocumentProps>(({ order, settings }, ref) => {
  return (
    <div
      ref={ref}
      className="printable-card ticket-single-page max-w-sm mx-auto bg-white border border-dashed border-stone-300 p-6 rounded-xl shadow-xs text-stone-800 font-mono text-xs leading-relaxed"
    >
      {/* Header */}
      <div className="print-avoid-break text-center pb-3 border-b border-stone-200">
        <img src={BRAND_LOGO} alt={settings.businessName} className="w-14 h-14 object-contain mx-auto mb-1" />
        <div className="font-bold text-base text-stone-900 tracking-wider">
          {settings.businessName.toUpperCase()}
        </div>
        <div className="text-[11px] text-stone-600 font-sans">{settings.commercialName}</div>
        <div className="text-[10px] text-stone-500 mt-1">RUC: {settings.ruc}</div>
        <div className="text-[10px] text-stone-500">{settings.address}</div>
        <div className="text-[10px] text-stone-500">Telf: {settings.phone} | WA: {settings.whatsapp}</div>
      </div>

      {/* Order Identifier */}
      <div className="print-avoid-break py-3 text-center border-b border-stone-200 bg-stone-50/60 my-2 rounded-md">
        <div className="text-[10px] text-stone-500 uppercase tracking-widest">TICKET DE RECEPCIÓN</div>
        <div className="text-xl font-extrabold text-stone-900 font-sans tracking-wide">
          {order.orderNumber}
        </div>
        <div className="mt-1 flex justify-center">
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Dates & Client */}
      <div className="py-2 space-y-1 border-b border-stone-200">
        <div className="flex justify-between">
          <span className="text-stone-500">Fecha Ingreso:</span>
          <span className="font-bold">{order.date} {order.time}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Fecha Estimada:</span>
          <span className="font-bold text-amber-700">{order.promisedDate}</span>
        </div>
        <div className="flex justify-between pt-1">
          <span className="text-stone-500">Cliente:</span>
          <span className="font-bold text-stone-900 truncate max-w-[170px]">
            {order.customer.firstName} {order.customer.lastName}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Teléfono/WA:</span>
          <span>{order.customer.phone}</span>
        </div>
        {order.customer.documentId && (
          <div className="flex justify-between">
            <span className="text-stone-500">C.I. / RUC:</span>
            <span>{order.customer.documentId}</span>
          </div>
        )}
      </div>

      {/* Shoe specifications — one block per pair when the order has several */}
      <div className="py-2 space-y-1 border-b border-stone-200 bg-stone-50/40 px-2 rounded-xs">
        <div className="text-[10px] font-bold uppercase text-stone-600 tracking-wider">
          DATOS DEL CALZADO{order.items.length > 1 ? ` (${order.items.length} PARES)` : ''}
        </div>
        {order.items.length > 1 ? (
          order.items.map((item, idx) => (
            <div key={item.id} className={idx > 0 ? 'pt-1.5 mt-1.5 border-t border-dashed border-stone-300' : ''}>
              <div className="flex justify-between">
                <span className="text-stone-500">Par {idx + 1}:</span>
                <span className="font-semibold">{item.shoe.type} {item.shoe.brand} {item.shoe.model || ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Talla / Color:</span>
                <span>Talla {item.shoe.size} • {item.shoe.color}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Material:</span>
                <span>{item.shoe.material} ({item.shoe.pairCount} par)</span>
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-stone-500">Calzado:</span>
              <span className="font-semibold">{order.shoe.type} {order.shoe.brand}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Modelo:</span>
              <span>{order.shoe.model || 'N/D'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Talla / Color:</span>
              <span>Talla {order.shoe.size} • {order.shoe.color}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Material:</span>
              <span>{order.shoe.material} ({order.shoe.pairCount} par)</span>
            </div>
          </>
        )}
      </div>

      {/* Services Requested — grouped by pair when the order has several */}
      <div className="py-3 border-b border-stone-200 space-y-2">
        <div className="text-[10px] font-bold uppercase text-stone-600 tracking-wider flex justify-between">
          <span>TRABAJOS SOLICITADOS</span>
          <span>PRECIO</span>
        </div>
        {order.items.length > 1 ? (
          order.items.map((item, pairIdx) => (
            <div key={item.id} className="space-y-1">
              <div className="text-[10px] font-bold text-amber-800">
                Par {pairIdx + 1} — {item.shoe.type} {item.shoe.brand}
              </div>
              {item.services.map((srv, idx) => (
                <div key={srv.id || idx} className="flex justify-between items-start gap-2 pl-2">
                  <span className="text-stone-800 text-[11px] leading-tight">
                    {idx + 1}. {srv.name}
                  </span>
                  <span className="font-bold whitespace-nowrap">${srv.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ))
        ) : (
          order.services.map((srv, idx) => (
            <div key={srv.id || idx} className="flex justify-between items-start gap-2">
              <span className="text-stone-800 text-[11px] leading-tight">
                {idx + 1}. {srv.name}
              </span>
              <span className="font-bold whitespace-nowrap">${srv.price.toFixed(2)}</span>
            </div>
          ))
        )}
      </div>

      {/* Financial Breakdown */}
      <div className="print-avoid-break py-2 space-y-1.5 border-b border-stone-200">
        <div className="flex justify-between text-stone-600">
          <span>Subtotal:</span>
          <span>${order.budget.subtotal.toFixed(2)}</span>
        </div>
        {order.budget.discount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Descuento:</span>
            <span>-${order.budget.discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-stone-900 font-bold text-sm pt-1 border-t border-dashed border-stone-300">
          <span>TOTAL:</span>
          <span>${order.budget.total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-stone-600">
          <span>Anticipo Abonado:</span>
          <span className="font-bold text-emerald-700">${order.totalPaid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-stone-900 font-bold text-sm bg-amber-50 p-1.5 rounded-sm border border-amber-200">
          <span className="text-amber-900">SALDO PENDIENTE:</span>
          <span className="text-amber-900">${order.balancePending.toFixed(2)}</span>
        </div>
      </div>

      {/* Observations */}
      {order.generalObservations && (
        <div className="py-2 border-b border-stone-200 text-[10px] text-stone-600">
          <span className="font-bold text-stone-800">OBSERVACIONES:</span> {order.generalObservations}
        </div>
      )}

      {/* Terms & Conditions */}
      <div className="pt-2 text-[9px] text-stone-500 text-justify leading-tight space-y-1">
        <div className="font-bold text-center text-stone-700">CONDICIONES DEL SERVICIO</div>
        <p>{settings.defaultConditions}</p>
      </div>

      {/* Barcode representation */}
      <div className="print-avoid-break pt-4 text-center">
        <div className="inline-block tracking-widest font-mono text-stone-900 bg-stone-100 px-4 py-1.5 rounded-sm border border-stone-300">
          ||| | |||| | || |||| | ||||| | ||
        </div>
        <div className="text-[10px] text-stone-500 mt-1">
          Presenta este ticket para retirar tu calzado
        </div>
        <div className="text-[9px] text-stone-400 mt-2 flex items-center justify-center gap-1">
          <Scissors className="w-3 h-3" /> Cortar por la línea punteada
        </div>
      </div>
    </div>
  );
});

TicketDocument.displayName = 'TicketDocument';
