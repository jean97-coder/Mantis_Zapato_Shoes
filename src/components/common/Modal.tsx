import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  /**
   * When true, this modal is a printable document (ticket / sales note).
   * While it's open, every other element on the page is forced invisible
   * for print media so only this document's content reaches the printer,
   * regardless of what view or sidebar is behind it.
   */
  printIsolate?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '2xl',
  printIsolate = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && printIsolate) {
      document.body.classList.add('print-isolating');
      return () => document.body.classList.remove('print-isolating');
    }
  }, [isOpen, printIsolate]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:static print:block print:p-0 print:overflow-visible">
      {/* Backdrop */}
      <div
        className="no-print fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Dialog box */}
      <div
        className={`${printIsolate ? 'print-isolate-target' : ''} relative w-full ${maxWidthClasses} bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-10 flex flex-col max-h-[92vh] transition-all print:static print:max-w-none print:w-auto print:max-h-none print:overflow-visible print:shadow-none print:border-0 print:rounded-none`}
      >
        {/* Header */}
        <div className="no-print flex items-start justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/70">
          <div>
            <h3 className="text-lg font-bold text-stone-900 leading-6">{title}</h3>
            {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 print:p-0 print:overflow-visible print:max-h-none">
          {children}
        </div>
      </div>
    </div>
  );
};
