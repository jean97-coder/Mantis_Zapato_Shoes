import React, { useState } from 'react';
import { ServiceCatalogItem } from '../../types';
import { Modal } from '../common/Modal';
import { CategoryCombobox } from '../common/CategoryCombobox';

interface ServiceCatalogFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ServiceCatalogItem, 'id'>) => Promise<void> | void;
  categories: string[];
  item?: ServiceCatalogItem | null;
}

export const ServiceCatalogFormModal: React.FC<ServiceCatalogFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  item,
}) => {
  const isEdit = !!item;

  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState(item?.category ?? (categories[0] ?? ''));
  const [description, setDescription] = useState(item?.description ?? '');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(item?.estimatedMinutes ?? 30);
  const [standardPrice, setStandardPrice] = useState<number>(item?.standardPrice ?? 0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !category.trim() || standardPrice <= 0) return;
    setSubmitting(true);
    try {
      await onSubmit({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        estimatedMinutes: Number(estimatedMinutes),
        standardPrice: Number(standardPrice),
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
      title={isEdit ? `Editar Servicio — ${item!.name}` : 'Nuevo Servicio del Catálogo'}
      subtitle="Precio sugerido y tiempo estándar de mano de obra para este servicio."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Código *</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: SRV-012"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg uppercase font-mono outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre del Servicio *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Cambio de suela completo"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <CategoryCombobox value={category} onChange={setCategory} categories={categories} />

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Descripción</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalle breve del trabajo que incluye este servicio..."
            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Tiempo Estimado (minutos) *</label>
            <input
              type="number"
              min="0"
              step="5"
              required
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden font-mono focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Precio Estándar ($) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={standardPrice}
              onChange={(e) => setStandardPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden font-mono focus:ring-2 focus:ring-amber-500"
            />
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
            {submitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Servicio'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
