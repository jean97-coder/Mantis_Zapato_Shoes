import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { WhatsAppPreview } from '../../context/AppContext';
import { Copy, Check, MessageCircle, Phone } from 'lucide-react';

interface WhatsAppSendModalProps {
  data: WhatsAppPreview | null;
  onClose: () => void;
}

/**
 * Shows the exact WhatsApp message ready to copy, plus a real <a href="https://wa.me/...">
 * link the user clicks directly. We deliberately never call window.open() for this —
 * popup blockers (Brave in particular) flag a JS-triggered tab as an unrequested popup
 * even when pre-opened synchronously, leaving the user staring at a blank "about:blank"
 * tab. A genuine anchor click is a real user-initiated navigation, so no blocker
 * intercepts it.
 */
export const WhatsAppSendModal: React.FC<WhatsAppSendModalProps> = ({ data, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!data) return null;

  const displayPhone = data.phone.replace(/[^0-9]/g, '');

  return (
    <Modal
      isOpen={!!data}
      onClose={onClose}
      title="Enviar por WhatsApp"
      subtitle={`${data.customerName} · +${displayPhone}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Phone className="w-3.5 h-3.5" />
          Se abrirá WhatsApp con el mensaje ya escrito, listo para enviar.
        </div>

        <div className="rounded-2xl bg-[#e5ddd5] p-3">
          <div className="rounded-xl rounded-tl-none bg-white shadow-xs p-3 max-h-64 overflow-y-auto">
            <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-stone-800">
              {data.message}
            </pre>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-stone-700 bg-white border border-stone-300 rounded-xl hover:bg-stone-50 transition-colors shadow-xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Mensaje copiado' : 'Copiar mensaje'}
          </button>

          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
          >
            <MessageCircle className="w-4.5 h-4.5" />
            Abrir WhatsApp y enviar
          </a>
        </div>
      </div>
    </Modal>
  );
};
