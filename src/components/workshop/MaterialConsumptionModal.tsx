import React, { useState } from 'react';
import { ServiceOrder, Material } from '../../types';
import { Modal } from '../common/Modal';
import { Package, Plus, AlertCircle, Check, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface MaterialConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder;
}

export const MaterialConsumptionModal: React.FC<MaterialConsumptionModalProps> = ({ isOpen, onClose, order }) => {
  const { materials, consumeMaterial } = useApp();

  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const activeMaterials = materials.filter(m => m.status === 'activo');
  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

  const totalCostConsumed = order.materialsConsumed.reduce((acc, mc) => acc + mc.totalCost, 0);

  const handleConsume = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedMaterialId) {
      setErrorMessage('Por favor seleccione un material.');
      return;
    }

    if (quantity <= 0) {
      setErrorMessage('La cantidad debe ser mayor a 0.');
      return;
    }

    const result = await consumeMaterial(order.id, selectedMaterialId, Number(quantity), notes);

    if (!result.success) {
      setErrorMessage(result.message);
    } else {
      setSuccessMessage(result.message);
      setQuantity(1);
      setNotes('');
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Consumo de Materiales e Insumos - ${order.orderNumber}`}
      subtitle={`${order.shoe.type} ${order.shoe.brand} (${order.customer.firstName} ${order.customer.lastName})`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Register New Consumption Form */}
        <form onSubmit={handleConsume} className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-amber-600" />
            Descontar Insumo de Inventario para esta Orden
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs flex items-center gap-1.5">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Seleccionar Material / Insumo *
              </label>
              <select
                value={selectedMaterialId}
                onChange={e => {
                  setSelectedMaterialId(e.target.value);
                  setErrorMessage('');
                }}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
                required
              >
                <option value="">-- Seleccionar insumo de bodega --</option>
                {activeMaterials.map(mat => (
                  <option key={mat.id} value={mat.id}>
                    {mat.name} (Stock: {mat.currentStock} {mat.unit} | Costo: ${mat.costPrice.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Cantidad a Usar *
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={quantity}
                  onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-l-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white font-mono"
                />
                <span className="px-2.5 py-2 text-xs bg-stone-200 border border-l-0 border-stone-300 rounded-r-lg text-stone-700 font-medium">
                  {selectedMaterial?.unit || 'Unid.'}
                </span>
              </div>
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Descontar
              </button>
            </div>
          </div>

          {selectedMaterial && (
            <div className="text-[11px] text-stone-500 flex flex-wrap gap-4 pt-1">
              <span>Categoría: <strong>{selectedMaterial.category}</strong></span>
              <span>Ubicación en taller: <strong>{selectedMaterial.location || 'Bodega general'}</strong></span>
              <span>
                Stock disponible: <strong className={selectedMaterial.currentStock <= selectedMaterial.minStock ? 'text-red-600' : 'text-emerald-700'}>
                  {selectedMaterial.currentStock} {selectedMaterial.unit}
                </strong>
              </span>
              <span>Costo calculado: <strong>${((quantity || 0) * selectedMaterial.costPrice).toFixed(2)}</strong></span>
            </div>
          )}

          <div>
            <input
              type="text"
              placeholder="Detalle o nota (ej. Usado en puntera y viras laterales)..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
            />
          </div>
        </form>

        {/* Consumed Materials Table for This Order */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Materiales Registrados en esta Orden ({order.materialsConsumed.length})
            </span>
            <span className="text-xs font-semibold text-stone-900">
              Costo total insumos: <span className="font-mono text-amber-900">${totalCostConsumed.toFixed(2)}</span>
            </span>
          </div>

          {order.materialsConsumed.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-400 border border-dashed border-stone-200 rounded-xl bg-stone-50">
              Aún no se han registrado consumos de bodega para esta orden.
            </div>
          ) : (
            <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-3">Material / Insumo</th>
                    <th className="py-2.5 px-3 text-center">Cantidad</th>
                    <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                    <th className="py-2.5 px-3">Fecha y Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {order.materialsConsumed.map(mc => (
                    <tr key={mc.id} className="hover:bg-stone-50">
                      <td className="py-2.5 px-3 font-medium text-stone-900">
                        {mc.materialName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {mc.quantity} {mc.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                        ${mc.unitCost.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                        ${mc.totalCost.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-stone-500">
                        {mc.date} • {mc.registeredBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
