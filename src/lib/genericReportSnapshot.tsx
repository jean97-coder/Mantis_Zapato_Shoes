import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { AppSettings } from '../types';
import { GenericReportDocument, ReportSummaryCard, ReportColumn } from '../components/reports/GenericReportDocument';
import { exportNodeAsPaginatedPdf } from './exportDocument';

interface DownloadGenericReportOptions {
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
  fileName: string;
}

/**
 * Renders any of the Reportes & Métricas documents off-screen and downloads
 * it as a paginated PDF — same off-screen-render technique used for tickets
 * and the cash report, so the export never depends on the report already
 * being visible in the DOM.
 */
export async function downloadGenericReportPdf(options: DownloadGenericReportOptions): Promise<void> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  const root = createRoot(container);
  let node: HTMLDivElement | null = null;

  try {
    flushSync(() => {
      root.render(
        <GenericReportDocument
          ref={(el) => {
            node = el;
          }}
          title={options.title}
          subtitle={options.subtitle}
          settings={options.settings}
          generatedBy={options.generatedBy}
          summaryCards={options.summaryCards}
          columns={options.columns}
          rows={options.rows}
          footerNote={options.footerNote}
          secondaryTitle={options.secondaryTitle}
          secondaryColumns={options.secondaryColumns}
          secondaryRows={options.secondaryRows}
        />
      );
    });

    if (node) {
      await exportNodeAsPaginatedPdf(node, options.fileName);
    }
  } finally {
    root.unmount();
    container.remove();
  }
}
