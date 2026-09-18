import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ServiceOrder, AppSettings } from '../types';
import { TicketDocument } from '../components/ticket/TicketDocument';
import { exportNodeAsPng } from './exportDocument';

/**
 * Renders the ticket off-screen (never visible to the user) and immediately
 * downloads it as a PNG. Used to auto-attach-ready a ticket image the moment
 * a WhatsApp message is sent, since the WhatsApp web/app API has no way to
 * attach a file programmatically — the user has to drop the downloaded image
 * into the chat themselves.
 */
export async function downloadOrderTicketPng(order: ServiceOrder, settings: AppSettings): Promise<void> {
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
        <TicketDocument
          ref={(el) => {
            node = el;
          }}
          order={order}
          settings={settings}
        />
      );
    });

    if (node) {
      await exportNodeAsPng(node, `Ticket-${order.orderNumber}`);
    }
  } finally {
    root.unmount();
    container.remove();
  }
}
