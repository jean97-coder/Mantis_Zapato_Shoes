import React, { useState } from 'react';
import { ServiceOrder } from '../../types';
import { Modal } from '../common/Modal';
import { CheckSquare, AlertTriangle, ShieldCheck, Camera } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import confetti from 'canvas-confetti';

interface QualityControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder;
}

export const QualityControlModal: React.FC<QualityControlModalProps> = ({ isOpen, onClose, order }) => {
  const { completeQualityControl, currentUser } = useApp();

  const [checklist, setChecklist] = useState({
    serviceExecutedProperly: false,
    soleProperlyAdhered: false,
    stitchingInspected: false,
    noAdditionalDamage: false,
    colorUniformAndSealed: false,
  });

  const [observations, setObservations] = useState(
    'Acabado artesanal de alta calidad conforme a los requerimientos de la orden de servicio.'
  );
  const [approved, setApproved] = useState(true);

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecked = Object.values(checklist).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await completeQualityControl(order.id, {
      checklist,
      observations,
      inspectorId: currentUser.id,
      inspectorName: currentUser.name,
      approved,
      inspectedAt: new Date().toLocaleString('es-EC', { hour12: false }),
    });

    if (approved) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {
        // Safe fallback
      }
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Control de Calidad - ${order.orderNumber}`}
      subtitle={`${order.shoe.type} ${order.shoe.brand} ${order.shoe.model || ''}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Protocolo de Entrega Garantizada:</span>
            <p className="mt-0.5">
              Verifique minuciosamente cada punto antes de autorizar la entrega al cliente. La aprobación cambiará el estado a <strong>LISTA PARA ENTREGAR</strong>.
            </p>
          </div>
        </div>

        {/* Checklist */}
        <div className="border border-stone-200 rounded-xl p-4 bg-white space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
            Puntos de Inspección Técnica
          </div>

          {[
            { key: 'serviceExecutedProperly', label: 'Trabajos y servicios contratados ejecutados en su totalidad' },
            { key: 'soleProperlyAdhered', label: 'Suela firmemente adherida, sin burbujas de aire ni bordes despegados' },
            { key: 'stitchingInspected', label: 'Costuras revisadas, rematadas y con tensión de hilo homogénea' },
            { key: 'noAdditionalDamage', label: 'Calzado sin raspaduras ni daños ocasionados durante el taller' },
            { key: 'colorUniformAndSealed', label: 'Tono uniforme, sin marcas de chorreado y sellado' },
          ].map(item => (
            <label
              key={item.key}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-stone-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={checklist[item.key as keyof typeof checklist]}
                onChange={() => toggleCheck(item.key as keyof typeof checklist)}
                className="mt-0.5 w-4 h-4 text-amber-600 rounded-sm border-stone-300 focus:ring-amber-500"
              />
              <span className="text-xs text-stone-800 leading-tight">
                {item.label}
              </span>
            </label>
          ))}
        </div>

        {/* Status of inspection */}
        <div className="flex items-center justify-between p-3 bg-stone-50 border border-stone-200 rounded-xl">
          <span className="text-xs font-semibold text-stone-800">Resultado de la Inspección:</span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer">
              <input
                type="radio"
                name="approval"
                checked={approved === true}
                onChange={() => setApproved(true)}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-semibold text-emerald-700">Aprobado</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer">
              <input
                type="radio"
                name="approval"
                checked={approved === false}
                onChange={() => setApproved(false)}
                className="text-red-600 focus:ring-red-500"
              />
              <span className="font-semibold text-red-700">No Conforme (Reingreso a Taller)</span>
            </label>
          </div>
        </div>

        {/* Observations */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Observaciones del Inspector *
          </label>
          <textarea
            required
            rows={3}
            value={observations}
            onChange={e => setObservations(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
          />
        </div>

        <div className="text-[11px] text-stone-500 flex justify-between items-center">
          <span>Inspector: <strong>{currentUser.name}</strong> ({currentUser.role})</span>
          {!allChecked && approved && (
            <span className="text-amber-600 font-medium">
              Nota: Hay puntos sin marcar.
            </span>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5 ${
              approved
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            {approved ? 'Confirmar Aprobación y Finalizar' : 'Rechazar y Devolver a Taller'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
