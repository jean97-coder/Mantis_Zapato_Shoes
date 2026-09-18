import React, { useState } from 'react';
import { Material, MaterialUnit, Supplier } from '../../types';
import { Modal } from '../common/Modal';
import { CategoryCombobox } from '../common/CategoryCombobox';

interface MaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Material, 'id' | 'status'> & { status?: Material['status'] }) => Promise<void> | void;
  suppliers: Supplier[];
  categories: string[];
  material?: Material | null;
}

const UNIT_OPTIONS: MaterialUnit[] = [
  'Par', 'Unidad', 'Metro', 'Centímetro', 'Litro', 'Mililitro', 'Kilogramo', 'Gramo', 'Rollo', 'Caja',
];

export const MaterialFormModal: React.FC<MaterialFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  suppliers,
  categories,
  material,
}) => {
  const isEdit = !!material;

  const [code, setCode] = useState(material?.code ?? '');
  const [name, setName] = useState(material?.name ?? '');
  const [category, setCategory] = useState(material?.category ?? (categories[0] ?? ''));
  const [brand, setBrand] = useState(material?.brand ?? '');
  const [unit, setUnit] = useState<MaterialUnit>(material?.unit ?? 'Par');
  const [stock, setStock] = useState<number>(material?.currentStock ?? 0);
  const [minStock, setMinStock] = useState<number>(material?.minStock ?? 0);
  const [cost, setCost] = useState<number>(material?.costPrice ?? 0);
  const [location, setLocation] = useState(material?.location ?? '');
  const [supplierId, setSupplierId] = useState(material?.supplierId ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !category.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        code: code.trim().toUpperCase(),
        sku: code.trim().toUpperCase(),
        name: name.trim(),
        category: category.trim(),
        brand: brand.trim(),
        unit,
        currentStock: Number(stock),
        minStock: Number(minStock),
        purchasePrice: Number(cost),
        costPrice: Number(cost),
        location: location.trim() || undefined,
        supplierId: supplierId || undefined,
        ...(isEdit ? { status: material!.status } : {}),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Editar Insumo — ${material!.name}` : 'Registrar Nuevo Material o Insumo'}
      subtitle={
        isEdit
          ? 'Modifica los datos del insumo. El stock se ajusta desde el flujo de Compras o Ajuste.'
          : 'Agregue un artículo al catálogo de bodega para descontar en reparaciones.'
      }
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Código de Referencia *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: SUE-004, HIL-002..."
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg uppercase font-mono outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre del Insumo *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Suela Vibram Montagna Talla 42"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CategoryCombobox value={category} onChange={setCategory} categories={categories} />

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Marca</label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Ej: Vibram, Saphir, Kenda Farben..."
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Unidad de Medida *</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as MaterialUnit)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden bg-white focus:ring-2 focus:ring-amber-500"
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Stock {isEdit ? 'Actual' : 'Inicial'} *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={stock}
              onChange={(e) => setStock(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden font-mono focus:ring-2 focus:ring-amber-500"
            />
            {isEdit && (
              <p className="text-[10px] text-stone-400 mt-1">Para entradas de stock, usa "Registrar Compra" en su lugar.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Stock Mínimo (Alerta) *</label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={minStock}
              onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden font-mono focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Costo Unitario ($) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={cost}
              onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden font-mono focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Ubicación en Bodega / Taller</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej: Estante A-3, Cajón 2..."
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Proveedor Habitual</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden bg-white focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- Sin asignar --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.tradeName ? ` (${s.tradeName})` : ''}</option>
              ))}
            </select>
          </div>
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
            {submitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Insumo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
