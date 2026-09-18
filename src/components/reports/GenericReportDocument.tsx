import React, { forwardRef } from 'react';
import { AppSettings } from '../../types';
import { BRAND_LOGO } from '../../lib/brand';

export interface ReportSummaryCard {
  label: string;
  value: string;
  tone: 'emerald' | 'red' | 'sky' | 'purple' | 'stone' | 'amber';
}

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

interface GenericReportDocumentProps {
  title: string;
  subtitle: string;
  settings: AppSettings;
  generatedBy: string;
  summaryCards: ReportSummaryCard[];
  columns: ReportColumn[];
  rows: Record<string, string>[];
  footerNote?: string;
  secondaryTitle?: string;
  secondaryColumns?: ReportColumn[];
  secondaryRows?: Record<string, string>[];
}

const TONE_CLASSES: Record<ReportSummaryCard['tone'], string> = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  sky: 'bg-sky-50 border-sky-200 text-sky-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  stone: 'bg-stone-900 border-stone-900 text-stone-300',
};

const TONE_VALUE_CLASSES: Record<ReportSummaryCard['tone'], string> = {
  emerald: 'text-emerald-800',
  red: 'text-red-800',
  sky: 'text-sky-800',
  purple: 'text-purple-800',
  amber: 'text-amber-800',
  stone: 'text-white',
};

/**
 * A single reusable printable/exportable report layout — shared by every
 * report type in Reportes & Métricas (Caja reuses CashReportDocument
 * instead, since it already existed) so each report only has to supply its
 * own summary cards + table data, not a whole bespoke document.
 */
export const GenericReportDocument = forwardRef<HTMLDivElement, GenericReportDocumentProps>(
  (
    { title, subtitle, settings, generatedBy, summaryCards, columns, rows, footerNote, secondaryTitle, secondaryColumns, secondaryRows },
    ref
  ) => {
    return (
      <div ref={ref} className="printable-card bg-white p-8 text-stone-900 font-sans" style={{ width: '780px' }}>
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
            <div className="text-xs font-bold uppercase tracking-wider text-stone-600">{title}</div>
            <div className="text-sm font-mono font-bold text-stone-900 mt-0.5">{subtitle}</div>
            <div className="text-[11px] text-stone-500 mt-2">Generado: {new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'medium', hour12: false })}</div>
            <div className="text-[11px] text-stone-500">Por: {generatedBy}</div>
          </div>
        </div>

        {/* Summary */}
        {summaryCards.length > 0 && (
          <div className="grid gap-3 my-6" style={{ gridTemplateColumns: `repeat(${Math.min(summaryCards.length, 5)}, minmax(0, 1fr))` }}>
            {summaryCards.map((c, idx) => (
              <div key={idx} className={`p-3 border rounded-lg ${TONE_CLASSES[c.tone]}`}>
                <div className="text-[10px] font-bold uppercase">{c.label}</div>
                <div className={`text-lg font-mono font-extrabold ${TONE_VALUE_CLASSES[c.tone]}`}>{c.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] border border-stone-200 rounded-lg overflow-hidden">
          <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200 uppercase tracking-wider">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`py-2 px-2.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-6 text-center text-stone-400">
                  Sin datos para mostrar.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-1.5 px-2.5 text-stone-800 ${col.align === 'right' ? 'text-right font-mono font-bold' : col.align === 'center' ? 'text-center' : ''}`}
                    >
                      {row[col.key] ?? ''}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {secondaryColumns && secondaryColumns.length > 0 && (
          <div className="mt-6">
            {secondaryTitle && (
              <div className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">{secondaryTitle}</div>
            )}
            <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border border-stone-200 rounded-lg overflow-hidden">
              <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200 uppercase tracking-wider">
                <tr>
                  {secondaryColumns.map((col) => (
                    <th key={col.key} className={`py-2 px-2.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {!secondaryRows || secondaryRows.length === 0 ? (
                  <tr>
                    <td colSpan={secondaryColumns.length} className="py-6 text-center text-stone-400">
                      Sin datos para mostrar.
                    </td>
                  </tr>
                ) : (
                  secondaryRows.map((row, idx) => (
                    <tr key={idx}>
                      {secondaryColumns.map((col) => (
                        <td
                          key={col.key}
                          className={`py-1.5 px-2.5 text-stone-800 ${col.align === 'right' ? 'text-right font-mono font-bold' : col.align === 'center' ? 'text-center' : ''}`}
                        >
                          {row[col.key] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-stone-200 text-[10px] text-stone-400">
          <span>{rows.length} registro(s) en este reporte.</span>
          <span>{footerNote || `${settings.businessName} — Documento interno de control.`}</span>
        </div>
      </div>
    );
  }
);

GenericReportDocument.displayName = 'GenericReportDocument';
