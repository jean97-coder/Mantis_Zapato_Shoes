import React, { useState } from 'react';
import { ServiceOrder, User } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  Wrench, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  PauseCircle, 
  Play, 
  ShieldCheck, 
  Package, 
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { DailyPriorityPlan } from '../common/DailyPriorityPlan';

interface WorkshopViewProps {
  onSelectOrder: (order: ServiceOrder) => void;
  onOpenQualityControl: (order: ServiceOrder) => void;
  onOpenMaterialConsumption: (order: ServiceOrder) => void;
}

export const WorkshopView: React.FC<WorkshopViewProps> = ({
  onSelectOrder,
  onOpenQualityControl,
  onOpenMaterialConsumption,
}) => {
  const { orders, users, updateOrderStatus } = useApp();

  const [selectedTechId, setSelectedTechId] = useState<string>('TODOS');

  const technicians = users.filter(u => u.role === 'ZAPATERO' || u.role === 'ADMIN');

  // Filter workshop-active orders
  const workshopOrders = orders.filter(o => 
    ['APROBADA', 'EN_ESPERA_DE_MATERIAL', 'EN_REPARACION', 'EN_RESTAURACION', 'CONTROL_CALIDAD'].includes(o.status)
  );

  const filteredOrders = workshopOrders.filter(o => 
    selectedTechId === 'TODOS' || o.assignedTechnicianId === selectedTechId
  );

  // Technician productivity calculation
  const techProductivity = technicians.map(tech => {
    const techCompleted = orders.filter(
      o => o.assignedTechnicianId === tech.id && ['TERMINADA', 'LISTA_PARA_ENTREGAR', 'ENTREGADA', 'CERRADA'].includes(o.status)
    );
    const techActive = orders.filter(
      o => o.assignedTechnicianId === tech.id && ['APROBADA', 'EN_REPARACION', 'EN_RESTAURACION', 'CONTROL_CALIDAD'].includes(o.status)
    );
    const revenueGenerated = techCompleted.reduce((acc, o) => acc + o.budget.total, 0);

    return {
      tech,
      completedCount: techCompleted.length,
      activeCount: techActive.length,
      revenueGenerated,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Taller & Productividad de Técnicos Zapateros
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Mesa de trabajo técnico: control de tiempos, consumo de insumos por orden y aseguramiento de calidad artesanal.
          </p>
        </div>

        {/* Filter by Technician */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 font-semibold">Filtrar por Técnico:</span>
          <select
            value={selectedTechId}
            onChange={e => setSelectedTechId(e.target.value)}
            className="px-3 py-1.5 text-xs border border-stone-300 rounded-lg bg-white outline-hidden"
          >
            <option value="TODOS">Todos los técnicos</option>
            {technicians.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.specialty || 'General'})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Daily priority plan — same widget as the Dashboard, so the workshop
          floor sees exactly which orders to start or push today. */}
      <DailyPriorityPlan
        orders={orders}
        onSelectOrder={onSelectOrder}
        onStartWork={(order) => updateOrderStatus(order.id, 'EN_REPARACION', 'Iniciado desde el Plan de Trabajo Prioritario del día')}
      />

      {/* Technician Productivity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {techProductivity.map(item => (
          <div
            key={item.tech.id}
            className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  {item.tech.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-xs text-stone-900">{item.tech.name}</h3>
                  <p className="text-[10px] text-stone-400">{item.tech.specialty || 'Maestro Zapatero'}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-stone-100 rounded-sm text-[10px] font-mono font-bold text-stone-600">
                {item.tech.role}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-stone-50 rounded-lg">
              <div>
                <span className="text-[10px] text-stone-400 block">En Proceso</span>
                <span className="font-bold font-mono text-amber-800">{item.activeCount}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block">Terminadas</span>
                <span className="font-bold font-mono text-emerald-700">{item.completedCount}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block">Generado</span>
                <span className="font-bold font-mono text-stone-900">${item.revenueGenerated.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Workshop Worklist */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-600" />
            Órdenes en Taller Activo ({filteredOrders.length})
          </span>
          <span className="text-xs text-stone-400">
            Requieren avance de labor, descuento de materiales o control de calidad
          </span>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-400">
            No hay órdenes pendientes en taller para el filtro seleccionado.
          </div>
        ) : (
          <div className="divide-y divide-stone-200">
            {filteredOrders.map(order => (
              <div key={order.id} className="p-4 hover:bg-stone-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Info block */}
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-stone-900">
                      {order.orderNumber}
                    </span>
                    <StatusBadge status={order.status} />
                    <PriorityBadge priority={order.priority} />
                    <span className="text-xs text-stone-500">
                      • Recibido: <strong className="font-mono text-stone-800">{order.date}</strong>
                    </span>
                    <span className="text-xs text-stone-500">
                      • Entrega estimada: <strong className="font-mono text-stone-800">{order.promisedDate}</strong>
                    </span>
                  </div>

                  <div className="text-sm font-bold text-stone-900">
                    {order.shoe.type} {order.shoe.brand} {order.shoe.model || ''}
                    <span className="font-normal text-stone-500 text-xs ml-2">
                      (Cliente: {order.customer.firstName} {order.customer.lastName})
                    </span>
                  </div>

                  <div className="text-xs text-stone-600">
                    <strong>Servicios:</strong> {order.services.map(s => s.name).join(' • ')}
                  </div>

                  {order.diagnosis?.recommendedWork && (
                    <div className="text-[11px] text-amber-800 font-medium bg-amber-50/60 px-2 py-1 rounded-sm border border-amber-200 inline-block">
                      Plan técnico: {order.diagnosis.recommendedWork}
                    </div>
                  )}
                </div>

                {/* Status progress and buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Material consumption shortcut */}
                  <button
                    onClick={() => onOpenMaterialConsumption(order)}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    Insumos ({order.materialsConsumed.length})
                  </button>

                  {/* Quality Control shortcut */}
                  <button
                    onClick={() => onOpenQualityControl(order)}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    Control Calidad {order.qualityControl?.approved && '✓'}
                  </button>

                  {/* Advance status */}
                  {order.status === 'APROBADA' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'EN_REPARACION', 'Iniciado trabajo en mesa de taller')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Iniciar Reparación
                    </button>
                  )}

                  {order.status === 'EN_REPARACION' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'CONTROL_CALIDAD', 'Finalizado en taller, pasa a inspección')}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      A Control Calidad
                    </button>
                  )}

                  <button
                    onClick={() => onSelectOrder(order)}
                    className="px-3 py-1.5 border border-stone-300 hover:bg-stone-100 rounded-lg text-xs font-semibold text-stone-700"
                  >
                    Ver Ficha
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
