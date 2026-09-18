import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { CashMovementsReport, AppSettings } from '../types';
import { CashReportDocument } from '../components/cash/CashReportDocument';
import { exportNodeAsPaginatedPdf } from './exportDocument';

/**
 * Renders the cash report off-screen and downloads it as a paginated PDF —
 * same technique as ticketSnapshot.tsx, so the export never depends on the
 * report already being visible in the DOM.
 */
export async function downloadCashReportPdf(
  report: CashMovementsReport,
  settings: AppSettings,
  generatedBy: string
): Promise<void> {
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
        <CashReportDocument
          ref={(el) => {
            node = el;
          }}
          report={report}
          settings={settings}
          generatedBy={generatedBy}
        />
      );
    });

    if (node) {
      const rangeLabel = report.from === report.to ? report.from : `${report.from}_a_${report.to}`;
      await exportNodeAsPaginatedPdf(node, `Reporte-Caja-${rangeLabel}`);
    }
  } finally {
    root.unmount();
    container.remove();
  }
}
