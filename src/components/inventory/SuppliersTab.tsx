import React, { useState } from 'react';
import { Supplier } from '../../types';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Plus, Pencil, Trash2, Building2, Phone, Mail, MapPin, Truck } from 'lucide-react';

interface SupplierFormState {
  name: string;
  tradeName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  ruc: string;
  contactPerson: string;
}

const EMPTY_FORM: SupplierFormState = {
  name: '', tradeName: '', phone: '', email: '', address: '', notes: '', ruc: '', contactPerson: '',
};

export const SuppliersTab: React.FC = () => {
  const { suppliers, createSupplier, updateSupplier, deleteSupplier } = useApp();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState<Supplier | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      tradeName: s.tradeName || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      notes: s.notes || '',
      ruc: s.ruc || '',
      contactPerson: s.contactPerson || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await updateSupplier(editing.id, form);
      } else {
        await createSupplier(form);
      }
      setIsFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-500">
          Directorio de proveedores para reabastecer insumos del taller.
        </p>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </button>
      </div>

      {suppliers.length === 0 ? (
        <div className="bg-white border border-dashed border-stone-300 rounded-xl p-10 text-center text-stone-400 text-sm">
          <Truck className="w-8 h-8 mx-auto mb-2 text-stone-300" />
          Aún no registras proveedores. Crea el primero para poder registrar compras.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-white border border-stone-200 rounded-xl shadow-xs p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">{s.name}</h3>
                  {s.tradeName && (
                    <p className="text-[11px] text-stone-500 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {s.tradeName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                    title="Editar proveedor"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setToDelete(s)}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                    title="Eliminar proveedor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-stone-600 pt-1 border-t border-stone-100">
                {s.phone && (
                  <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-stone-400" /> {s.phone}</div>
                )}
                {s.email && (
                  <div className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 text-stone-400 shrink-0" /> {s.email}</div>
                )}
                {s.address && (
                  <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-stone-400 shrink-0" /> {s.address}</div>
                )}
                {s.notes && <p className="text-[10px] text-stone-400 italic pt-1">{s.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT SUPPLIER */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editing ? `Editar Proveedor — ${editing.name}` : 'Nuevo Proveedor'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Empresa</label>
              <input
                type="text"
                value={form.tradeName}
                onChange={(e) => setForm((f) => ({ ...f, tradeName: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Correo</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Dirección</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">RUC (opcional)</label>
              <input
                type="text"
                value={form.ruc}
                onChange={(e) => setForm((f) => ({ ...f, ruc: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden font-mono focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Persona de Contacto</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Observaciones</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs disabled:opacity-60"
            >
              {submitting ? 'Guardando...' : editing ? 'Guardar Cambios' : 'Crear Proveedor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM */}
      {toDelete && (
        <ConfirmDialog
          isOpen={!!toDelete}
          onClose={() => setToDelete(null)}
          onConfirm={() => deleteSupplier(toDelete.id)}
          title="Eliminar Proveedor"
          description={`¿Seguro que deseas eliminar a "${toDelete.name}"? Esta acción no se puede deshacer.`}
        />
      )}
    </div>
  );
};
