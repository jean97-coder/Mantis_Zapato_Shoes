import React, { forwardRef } from 'react';
import { CashMovementsReport, AppSettings } from '../../types';
import { BRAND_LOGO } from '../../lib/brand';

interface CashReportDocumentProps {
  report: CashMovementsReport;
  settings: AppSettings;
  generatedBy: string;
}

const TYPE_LABELS: Record<string, string> = {
  ANTICIPO: 'Anticipo',
  PAGO_ORDEN: 'Pago de Orden',
  VENTA: 'Venta',
  GASTO: 'Gasto / Egreso',
  RETIRO: 'Retiro',
  INGRESO_MANUAL: 'Ingreso Manual',
  DEVOLUCION: 'Devolución',
  APORTE_CAPITAL: 'Aporte de Socio',
  DEVOLUCION_CAPITAL: 'Devolución a Socio',
};

const OUTFLOW = new Set(['GASTO', 'RETIRO', 'DEVOLUCION', 'DEVOLUCION_CAPITAL']);

/**
 * The actual printable/exportable financial report — rendered either
 * off-screen for PDF export (see lib/cashReportSnapshot.ts) or, if ever
 * needed, inline for an on-screen preview. Kept as its own component so both
 * paths share exactly one layout.
 */
export const CashReportDocument = forwardRef<HTMLDivElement, CashReportDocumentProps>(
  ({ report, settings, generatedBy }, ref) => {
    const rangeLabel = report.from === report.to ? report.from : `${report.from} a ${report.to}`;

    return (
      <div
        ref={ref}
        className="printable-card bg-white p-8 text-stone-900 font-sans"
        style={{ width: '780px' }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-stone-800">
          <div className="flex items-start gap-3">
            <img src={BRAND_LOGO} alt={settings.businessName} className="w-14 h-14 object-contain shrink-0" />
            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-stone-900 tracking-tight">{settings.businessName}</div>
              <div className="text-sm font-semibold text-stone-700">{settings.commercialName}</div>
              <div className="text-xs text-stone-600 pt-1"><strong>RUC:</strong> {settings.ruc}</div>
              <div className="text-xs text-stone-600"><strong>Dirección:</strong> {settings.address}</div>
            </div>
          </div>
          <div className="sm:text-right border-2 border-stone-800 p-4 rounded-lg bg-stone-50/50 min-w-[240px]">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-600">Reporte de Caja</div>
            <div className="text-lg font-mono font-bold text-stone-900 mt-0.5">{rangeLabel}</div>
            <div className="text-[11px] text-stone-500 mt-2">Generado: {new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'medium', hour12: false })}</div>
            <div className="text-[11px] text-stone-500">Por: {generatedBy}</div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-6">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="text-[10px] font-bold uppercase text-emerald-700">Ingresos</div>
            <div className="text-lg font-mono font-extrabold text-emerald-800">${report.summary.totalIngresos.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
            <div className="text-[10px] font-bold uppercase text-sky-700">Aportes de Socios</div>
            <div className="text-lg font-mono font-extrabold text-sky-800">${report.summary.totalAportes.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-[10px] font-bold uppercase text-purple-700">Devoluciones a Socios</div>
            <div className="text-lg font-mono font-extrabold text-purple-800">-${report.summary.totalDevolucionesCapital.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-[10px] font-bold uppercase text-red-700">Egresos</div>
            <div className="text-lg font-mono font-extrabold text-red-800">-${report.summary.totalEgresos.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-stone-900 rounded-lg">
            <div className="text-[10px] font-bold uppercase text-stone-300">Balance Final</div>
            <div className="text-lg font-mono font-extrabold text-white">${report.summary.balance.toFixed(2)}</div>
          </div>
        </div>

        {/* Movements table */}
        <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] border border-stone-200 rounded-lg overflow-hidden">
          <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200 uppercase tracking-wider">
            <tr>
              <th className="py-2 px-2.5">Fecha</th>
              <th className="py-2 px-2.5">Hora</th>
              <th className="py-2 px-2.5">Tipo</th>
              <th className="py-2 px-2.5">Concepto</th>
              <th className="py-2 px-2.5">Método</th>
              <th className="py-2 px-2.5 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {report.movements.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-stone-400">Sin movimientos en el rango seleccionado.</td>
              </tr>
            ) : (
              report.movements.map((m) => {
                const isOutflow = OUTFLOW.has(m.type);
                return (
                  <tr key={m.id}>
                    <td className="py-1.5 px-2.5 font-mono text-stone-600">{m.date}</td>
                    <td className="py-1.5 px-2.5 font-mono text-stone-500">{m.time}</td>
                    <td className="py-1.5 px-2.5 text-stone-800">{TYPE_LABELS[m.type] || m.type}</td>
                    <td className="py-1.5 px-2.5 text-stone-800">{m.concept}</td>
                    <td className="py-1.5 px-2.5 text-stone-600">{m.paymentMethod}</td>
                    <td className={`py-1.5 px-2.5 text-right font-mono font-bold ${isOutflow ? 'text-red-700' : 'text-emerald-700'}`}>
                      {isOutflow ? '-' : '+'}${m.amount.toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-stone-200 text-[10px] text-stone-400">
          <span>{report.summary.count} movimiento(s) en el período.</span>
          <span>{settings.businessName} — Documento interno de control financiero.</span>
        </div>
      </div>
    );
  }
);

CashReportDocument.displayName = 'CashReportDocument';
