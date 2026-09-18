import React, { useState, useEffect } from 'react';
import { Partner } from '../../types';
import { Modal } from '../common/Modal';

interface PartnerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; email?: string; phone?: string; notes?: string }) => Promise<void>;
  partner?: Partner | null;
}

/**
 * Handles both registering a new partner and editing an existing one's
 * contact details. The modal stays mounted across opens, so fields are
 * re-synced from the `partner` prop every time it opens rather than only on
 * first mount.
 */
export const PartnerFormModal: React.FC<PartnerFormModalProps> = ({ isOpen, onClose, onSubmit, partner }) => {
  const isEdit = !!partner;

  const [name, setName] = useState(partner?.name ?? '');
  const [email, setEmail] = useState(partner?.email ?? '');
  const [phone, setPhone] = useState(partner?.phone ?? '');
  const [notes, setNotes] = useState(partner?.notes ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(partner?.name ?? '');
      setEmail(partner?.email ?? '');
      setPhone(partner?.phone ?? '');
      setNotes(partner?.notes ?? '');
      setError('');
    }
  }, [isOpen, partner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el socio.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Editar Socio — ${partner!.name}` : 'Registrar Nuevo Socio'}
      subtitle="Los socios se usan para trazar aportes y devoluciones de capital en Caja & Cobros."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">{error}</div>}

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre Completo *</label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Teléfono / WhatsApp</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+593..."
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="socio@correo.com"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Notas (opcional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Socio fundador, socia inversionista..."
            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs disabled:opacity-60"
          >
            {submitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Registrar Socio'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
