import React, { useState, useMemo } from 'react';
import { ServiceOrder, OrderStatus, OrderPriority } from '../../types';
import { useApp } from '../../context/AppContext';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Printer, 
  MessageCircle, 
  Camera, 
  DollarSign, 
  AlertCircle, 
  LayoutList, 
  Kanban,
  Clock,
  CheckCircle2,
  Calendar
} from 'lucide-react';

interface OrdersViewProps {
  onNewOrder: () => void;
  onSelectOrder: (order: ServiceOrder) => void;
  onOpenTicket: (order: ServiceOrder) => void;
  onOpenPhotos: (order: ServiceOrder) => void;
  onOpenPaymentDelivery: (order: ServiceOrder, tab: 'payment' | 'delivery') => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  onNewOrder,
  onSelectOrder,
  onOpenTicket,
  onOpenPhotos,
  onOpenPaymentDelivery,
}) => {
  const { orders, users, triggerWhatsAppSend } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [priorityFilter, setPriorityFilter] = useState<string>('TODOS');
  const [techFilter, setTechFilter] = useState<string>('TODOS');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtered orders calculation
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search term
      const q = searchTerm.toLowerCase();
      const matchSearch = 
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        `${order.customer.firstName} ${order.customer.lastName}`.toLowerCase().includes(q) ||
        order.customer.phone.includes(q) ||
        order.shoe.brand.toLowerCase().includes(q) ||
        order.shoe.type.toLowerCase().includes(q) ||
        (order.shoe.model && order.shoe.model.toLowerCase().includes(q));

      // Status
      const matchStatus = statusFilter === 'TODOS' || order.status === statusFilter;

      // Priority
      const matchPriority = priorityFilter === 'TODOS' || order.priority === priorityFilter;

      // Technician
      const matchTech = techFilter === 'TODOS' || order.assignedTechnicianId === techFilter;

      // Overdue
      const isOverdue = !['ENTREGADA', 'CERRADA', 'CANCELADA'].includes(order.status) && order.promisedDate < todayStr;
      const matchOverdue = !overdueOnly || isOverdue;

      return matchSearch && matchStatus && matchPriority && matchTech && matchOverdue;
    });
  }, [orders, searchTerm, statusFilter, priorityFilter, techFilter, overdueOnly, todayStr]);

  // Statistics
  const activeOrdersCount = orders.filter(o => !['ENTREGADA', 'CERRADA', 'CANCELADA'].includes(o.status)).length;
  const inWorkshopCount = orders.filter(o => ['EN_REPARACION', 'EN_RESTAURACION', 'CONTROL_CALIDAD'].includes(o.status)).length;
  const readyToDeliverCount = orders.filter(o => o.status === 'LISTA_PARA_ENTREGAR').length;
  const overdueCount = orders.filter(o => !['ENTREGADA', 'CERRADA', 'CANCELADA'].includes(o.status) && o.promisedDate < todayStr).length;
  const totalPendingBalance = orders.reduce((acc, o) => acc + (o.balancePending || 0), 0);

  // Kanban Columns
  const kanbanColumns: Array<{ title: string; status: OrderStatus; bg: string }> = [
    { title: 'Recepción & Diagnóstico', status: 'RECIBIDA', bg: 'border-blue-300' },
    { title: 'Aprobadas para Taller', status: 'APROBADA', bg: 'border-emerald-300' },
    { title: 'En Reparación / Restauración', status: 'EN_REPARACION', bg: 'border-amber-300' },
    { title: 'Control de Calidad', status: 'CONTROL_CALIDAD', bg: 'border-purple-300' },
    { title: 'Listas para Entregar', status: 'LISTA_PARA_ENTREGAR', bg: 'border-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Gestión de Órdenes de Servicio
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Control integral del ciclo de reparación: recepción, taller, calidad, cobro y entrega.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'table' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Vista en Lista"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'kanban' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Vista en Tablero Kanban"
            >
              <Kanban className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onNewOrder}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nueva Orden
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[11px] text-stone-500 font-medium block">Órdenes Activas</span>
          <span className="text-xl font-bold font-mono text-stone-900">{activeOrdersCount}</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[11px] text-amber-700 font-medium block">En Taller Activo</span>
          <span className="text-xl font-bold font-mono text-amber-900">{inWorkshopCount}</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[11px] text-emerald-700 font-medium block">Listas para Entregar</span>
          <span className="text-xl font-bold font-mono text-emerald-800">{readyToDeliverCount}</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[11px] text-red-600 font-medium block flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Atrasadas
          </span>
          <span className="text-xl font-bold font-mono text-red-700">{overdueCount}</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] text-stone-500 font-medium block">Saldo por Cobrar</span>
          <span className="text-xl font-bold font-mono text-stone-900">${totalPendingBalance.toFixed(2)}</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por orden, cliente, teléfono, marca o calzado..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          {/* Status Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="RECIBIDA">Recibida</option>
              <option value="EN_DIAGNOSTICO">En Diagnóstico</option>
              <option value="APROBADA">Aprobada</option>
              <option value="EN_REPARACION">En Reparación</option>
              <option value="EN_RESTAURACION">En Restauración</option>
              <option value="CONTROL_CALIDAD">Control de Calidad</option>
              <option value="LISTA_PARA_ENTREGAR">Lista para Entregar</option>
              <option value="ENTREGADA">Entregada</option>
              <option value="CERRADA">Cerrada</option>
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="sm:col-span-2">
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
            >
              <option value="TODOS">Todas Prioridades</option>
              <option value="NORMAL">Normal</option>
              <option value="URGENTE">Urgente</option>
              <option value="MUY_URGENTE">Muy Urgente</option>
            </select>
          </div>

          {/* Technician Dropdown */}
          <div className="sm:col-span-2">
            <select
              value={techFilter}
              onChange={e => setTechFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
            >
              <option value="TODOS">Todos Técnicos</option>
              {users.filter(u => u.role === 'ZAPATERO').map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Overdue checkbox */}
          <div className="sm:col-span-1 flex items-center">
            <button
              onClick={() => setOverdueOnly(!overdueOnly)}
              className={`w-full py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1 ${
                overdueOnly
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
              }`}
              title="Filtrar sólo órdenes con fecha prometida vencida"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Atrasadas
            </button>
          </div>
        </div>
      </div>

      {/* VIEW: TABLE MODE */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-3.5">N° Orden / Recepción</th>
                  <th className="py-3 px-3.5">Cliente</th>
                  <th className="py-3 px-3.5">Calzado & Servicios</th>
                  <th className="py-3 px-3.5">Estado</th>
                  <th className="py-3 px-3.5">Prioridad</th>
                  <th className="py-3 px-3.5">Fecha Estimada de Entrega</th>
                  <th className="py-3 px-3.5 text-right">Total / Saldo</th>
                  <th className="py-3 px-3.5 text-center">Acciones Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      No se encontraron órdenes con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => {
                    const isOverdue = !['ENTREGADA', 'CERRADA', 'CANCELADA'].includes(order.status) && order.promisedDate < todayStr;
                    return (
                      <tr 
                        key={order.id} 
                        className={`hover:bg-stone-50 transition-colors ${
                          isOverdue ? 'bg-red-50/30' : ''
                        }`}
                      >
                        {/* Order Number & Date */}
                        <td className="py-3 px-3.5">
                          <button
                            onClick={() => onSelectOrder(order)}
                            className="font-mono font-bold text-stone-900 hover:text-amber-700 hover:underline flex items-center gap-1.5"
                          >
                            {order.orderNumber}
                          </button>
                          <div className="text-[11px] text-stone-400 mt-0.5">
                            Recibido: {order.date}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-stone-900">
                            {order.customer.firstName} {order.customer.lastName}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono">
                            {order.customer.phone}
                          </div>
                        </td>

                        {/* Shoe & Services Summary */}
                        <td className="py-3 px-3.5 max-w-xs">
                          <div className="font-medium text-stone-900 truncate">
                            {order.shoe.type} {order.shoe.brand} {order.shoe.model || ''}
                          </div>
                          <div className="text-[11px] text-stone-500 truncate mt-0.5">
                            {order.services.map(s => s.name).join(', ')}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5">
                          <StatusBadge status={order.status} />
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-3.5">
                          <PriorityBadge priority={order.priority} />
                        </td>

                        {/* Promised Delivery Date */}
                        <td className="py-3 px-3.5">
                          <div className={`font-medium font-mono ${isOverdue ? 'text-red-700 font-bold flex items-center gap-1' : 'text-stone-700'}`}>
                            {isOverdue && <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
                            {order.promisedDate}
                          </div>
                          {isOverdue && (
                            <span className="text-[10px] text-red-600 font-semibold">
                              ¡Entrega Atrasada!
                            </span>
                          )}
                        </td>

                        {/* Financial balance */}
                        <td className="py-3 px-3.5 text-right font-mono">
                          <div className="font-bold text-stone-900">
                            ${order.budget.total.toFixed(2)}
                          </div>
                          <div className={`text-[11px] ${order.balancePending > 0 ? 'text-amber-800 font-semibold' : 'text-emerald-700 font-semibold'}`}>
                            Saldo: ${order.balancePending.toFixed(2)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onSelectOrder(order)}
                              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors"
                              title="Ver Ficha Completa"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onOpenTicket(order)}
                              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors"
                              title="Ver / Imprimir Ticket"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onOpenPhotos(order)}
                              className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors"
                              title="Fotos Antes / Después"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => triggerWhatsAppSend(order, 'ORDEN_RECIBIDA')}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onOpenPaymentDelivery(order, order.status === 'LISTA_PARA_ENTREGAR' ? 'delivery' : 'payment')}
                              className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Cobro / Entrega"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map(col => {
            const colOrders = filteredOrders.filter(o => {
              if (col.status === 'RECIBIDA') {
                return ['RECIBIDA', 'EN_DIAGNOSTICO', 'PRESUPUESTO_PENDIENTE'].includes(o.status);
              }
              if (col.status === 'APROBADA') {
                return ['APROBADA', 'EN_ESPERA_DE_MATERIAL'].includes(o.status);
              }
              if (col.status === 'EN_REPARACION') {
                return ['EN_REPARACION', 'EN_RESTAURACION'].includes(o.status);
              }
              return o.status === col.status;
            });

            return (
              <div
                key={col.status}
                className="bg-stone-100 rounded-xl p-3 border border-stone-200 flex flex-col min-h-[500px]"
              >
                {/* Column header */}
                <div className={`flex items-center justify-between pb-2 border-b-2 ${col.bg} mb-3`}>
                  <span className="text-xs font-bold text-stone-800 tracking-tight">
                    {col.title}
                  </span>
                  <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded-full text-stone-700 border border-stone-200">
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {colOrders.map(order => {
                    const isOverdue = !['ENTREGADA', 'CERRADA', 'CANCELADA'].includes(order.status) && order.promisedDate < todayStr;
                    return (
                      <div
                        key={order.id}
                        onClick={() => onSelectOrder(order)}
                        className={`p-3 bg-white rounded-xl border border-stone-200 shadow-xs hover:border-amber-500 cursor-pointer transition-all ${
                          isOverdue ? 'border-red-300 bg-red-50/20' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono font-bold text-xs text-stone-900">
                            {order.orderNumber}
                          </span>
                          <PriorityBadge priority={order.priority} />
                        </div>

                        <div className="text-xs font-bold text-stone-900 truncate">
                          {order.customer.firstName} {order.customer.lastName}
                        </div>

                        <div className="text-[11px] text-stone-600 truncate mt-0.5">
                          {order.shoe.type} {order.shoe.brand}
                        </div>

                        <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-500 font-mono">
                          <span title="Fecha de recepción">Recibido: {order.date}</span>
                          <span className="font-bold text-stone-800">
                            ${order.budget.total.toFixed(2)}
                          </span>
                        </div>
                        <div className={`flex items-center gap-0.5 text-[10px] font-mono ${isOverdue ? 'text-red-700 font-bold' : 'text-stone-500'}`}>
                          <Clock className="w-3 h-3 inline" /> Entrega estimada: {order.promisedDate}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
