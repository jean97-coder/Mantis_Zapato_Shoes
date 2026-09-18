import React from 'react';
import { OrderStatus, OrderPriority } from '../../types';

export const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; border: string; dot: string }> =
  {
    RECIBIDA: {
      label: 'Recibida',
      bg: 'bg-stone-100',
      text: 'text-stone-800',
      border: 'border-stone-300',
      dot: 'bg-stone-500',
    },
    EN_DIAGNOSTICO: {
      label: 'En Diagnóstico',
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-200',
      dot: 'bg-indigo-500',
    },
    PRESUPUESTO_PENDIENTE: {
      label: 'Presupuesto Pendiente',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      dot: 'bg-amber-500',
    },
    APROBADA: {
      label: 'Aprobada',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      dot: 'bg-emerald-500',
    },
    EN_ESPERA_DE_MATERIAL: {
      label: 'Espera de Insumo',
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-300',
      dot: 'bg-orange-500',
    },
    EN_REPARACION: {
      label: 'En Reparación',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-300',
      dot: 'bg-blue-600',
    },
    EN_RESTAURACION: {
      label: 'En Restauración',
      bg: 'bg-cyan-50',
      text: 'text-cyan-800',
      border: 'border-cyan-300',
      dot: 'bg-cyan-600',
    },
    CONTROL_CALIDAD: {
      label: 'Control de Calidad',
      bg: 'bg-purple-50',
      text: 'text-purple-800',
      border: 'border-purple-300',
      dot: 'bg-purple-600',
    },
    TERMINADA: {
      label: 'Terminada',
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-300',
      dot: 'bg-teal-600',
    },
    LISTA_PARA_ENTREGAR: {
      label: 'Lista para Entregar',
      bg: 'bg-green-50',
      text: 'text-green-800',
      border: 'border-green-300',
      dot: 'bg-green-600',
    },
    PENDIENTE_DE_PAGO: {
      label: 'Pendiente de Pago',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-300',
      dot: 'bg-rose-500',
    },
    ENTREGADA: {
      label: 'Entregada',
      bg: 'bg-stone-800',
      text: 'text-stone-100',
      border: 'border-stone-700',
      dot: 'bg-emerald-400',
    },
    CERRADA: {
      label: 'Cerrada',
      bg: 'bg-stone-200',
      text: 'text-stone-700',
      border: 'border-stone-300',
      dot: 'bg-stone-500',
    },
    CANCELADA: {
      label: 'Cancelada',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      dot: 'bg-red-400',
    },
    RECHAZADA: {
      label: 'Rechazada',
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300',
      dot: 'bg-red-600',
    },
    NO_RETIRADA: {
      label: 'No Retirada',
      bg: 'bg-yellow-100',
      text: 'text-yellow-900',
      border: 'border-yellow-300',
      dot: 'bg-yellow-600',
    },
  };

export function getStatusLabel(status: OrderStatus): string {
  return STATUS_CONFIG[status]?.label || status;
}

export const StatusBadge: React.FC<{ status: OrderStatus; className?: string }> = ({ status, className = '' }) => {
  const conf = STATUS_CONFIG[status] || STATUS_CONFIG.RECIBIDA;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${conf.bg} ${conf.text} ${conf.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
      <span className="whitespace-nowrap">{conf.label}</span>
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: OrderPriority }> = ({ priority }) => {
  if (priority === 'MUY_URGENTE') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        Muy Urgente
      </span>
    );
  }
  if (priority === 'URGENTE') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-white">
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
        Urgente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
      Normal
    </span>
  );
};
