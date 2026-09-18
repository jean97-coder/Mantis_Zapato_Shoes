import React, { useState, useEffect } from 'react';
import { ServiceOrder, OrderStatus, DiscountType } from '../../types';
import { Modal } from '../common/Modal';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import {
  MessageCircle,
  Printer,
  FileText,
  Camera,
  CheckCircle,
  AlertCircle,
  Package,
  DollarSign,
  ShieldCheck,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Percent,
  ImagePlus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder;
  onOpenTicket: () => void;
  onOpenSalesNote: () => void;
  onOpenPhotos: () => void;
  onOpenQualityControl: () => void;
  onOpenMaterialConsumption: () => void;
  onOpenPaymentDelivery: (tab: 'payment' | 'delivery') => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  onOpenTicket,
  onOpenSalesNote,
  onOpenPhotos,
  onOpenQualityControl,
  onOpenMaterialConsumption,
  onOpenPaymentDelivery,
}) => {
  const {
    updateOrderStatus,
    approveBudget,
    rejectBudget,
    triggerWhatsAppSend,
    servicesCatalog,
    addServiceToOrder,
    updateServiceItem,
    removeServiceFromOrder,
    updateOrderDiscount,
    uploadOrderPhoto,
  } = useApp();

  const [activeSection, setActiveSection] = useState<'info' | 'pairs' | 'diagnosis' | 'services' | 'history'>('info');
  const hasMultiplePairs = order.items.length > 1;
  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);
  const [statusObs, setStatusObs] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState<number>(0);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, number>>({});
  const [discountDraft, setDiscountDraft] = useState<{ type: DiscountType; value: number }>({
    type: order.budget.discountType,
    value: order.budget.discountValue,
  });

  useEffect(() => {
    setDiscountDraft({ type: order.budget.discountType, value: order.budget.discountValue });
  }, [order.id, order.budget.discountType, order.budget.discountValue]);

  const previewDiscountAmount = Math.min(
    order.budget.subtotal,
    discountDraft.type === 'PERCENT'
      ? order.budget.subtotal * (Math.max(0, discountDraft.value) / 100)
      : Math.max(0, discountDraft.value)
  );
  const previewTotal = Math.max(0, order.budget.subtotal - previewDiscountAmount);

  const commitDiscount = () => {
    if (discountDraft.type !== order.budget.discountType || discountDraft.value !== order.budget.discountValue) {
      updateOrderDiscount(order.id, discountDraft.type, discountDraft.value);
    }
  };

  const handleStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatus !== order.status) {
      updateOrderStatus(order.id, newStatus, statusObs || undefined);
      setStatusObs('');
    }
  };

  const handleAddService = () => {
    if (!selectedServiceId) return;
    const catalogItem = servicesCatalog.find(s => s.id === selectedServiceId);
    if (!catalogItem) return;

    addServiceToOrder(order.id, {
      serviceId: catalogItem.id,
      name: catalogItem.name,
      description: catalogItem.description,
      price: catalogItem.standardPrice,
      estimatedMinutes: catalogItem.estimatedMinutes,
      status: 'pendiente',
    });
    setSelectedServiceId('');
  };

  const handleAddCustomService = () => {
    if (!customServiceName.trim() || customServicePrice <= 0) return;
    addServiceToOrder(order.id, {
      name: customServiceName.trim(),
      description: 'Servicio personalizado agregado a la orden',
      price: customServicePrice,
      estimatedMinutes: 0,
      status: 'pendiente',
    });
    setCustomServiceName('');
    setCustomServicePrice(0);
  };

  const commitPriceEdit = (serviceItemId: string, currentPrice: number) => {
    const draft = priceDrafts[serviceItemId];
    if (draft !== undefined && draft !== currentPrice && draft >= 0) {
      updateServiceItem(order.id, serviceItemId, { price: draft });
    }
  };

  const handleWhatsApp = (templateType: string) => {
    triggerWhatsAppSend(order, templateType);
  };

  const beforePhotos = order.photos.filter(p => p.stage !== 'final' && p.type !== 'despues');
  const afterPhotos = order.photos.filter(p => p.stage === 'final' || p.type === 'despues');

  const handleQuickPhotoUpload = (file: File, isAfter: boolean) => {
    uploadOrderPhoto(order.id, file, { type: isAfter ? 'despues' : 'otra', stage: isAfter ? 'final' : 'recepcion' });
  };

  const isOverdue = !['ENTREGADA', 'CERRADA', 'CANCELADA'].includes(order.status) && 
    new Date(order.promisedDate) < new Date(new Date().toISOString().split('T')[0]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Orden de Servicio ${order.orderNumber}`}
      subtitle={`Cliente: ${order.customer.firstName} ${order.customer.lastName} • Ingreso: ${order.date}`}
      maxWidth="4xl"
    >
      {/* Top Header Card with Status, Urgency, Overdue alert, and quick action buttons */}
      <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={order.status} className="text-sm px-3 py-1" />
            <PriorityBadge priority={order.priority} />
            {isOverdue && (
              <span className="px-2.5 py-1 text-xs font-bold bg-red-600 text-white rounded-full flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                ORDEN ATRASADA
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenTicket}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-stone-600" />
              Ticket
            </button>
            <button
              onClick={onOpenSalesNote}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-stone-600" />
              Nota Venta
            </button>
            <button
              onClick={onOpenPhotos}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors shadow-xs"
            >
              <Camera className="w-3.5 h-3.5 text-stone-600" />
              Fotos ({order.photos.length})
            </button>
            <button
              onClick={() => handleWhatsApp('ORDEN_RECIBIDA')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </button>
          </div>
        </div>

        {/* Quick info row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs pt-2 border-t border-stone-200">
          <div>
            <span className="text-stone-500 block">Fecha de Recepción:</span>
            <span className="font-bold text-stone-900">{order.date}</span>
          </div>
          <div>
            <span className="text-stone-500 block">Fecha Estimada de Entrega:</span>
            <span className="font-bold text-stone-900">{order.promisedDate}</span>
          </div>
          <div>
            <span className="text-stone-500 block">Técnico Asignado:</span>
            <span className="font-bold text-stone-900">{order.assignedTechnicianName || 'Sin asignar'}</span>
          </div>
          <div>
            <span className="text-stone-500 block">Total / Abonado:</span>
            <span className="font-bold text-stone-900">${order.budget.total.toFixed(2)} / ${order.totalPaid.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-stone-500 block">Saldo Pendiente:</span>
            <span className={`font-bold font-mono ${order.balancePending > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              ${order.balancePending.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation tabs within order */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveSection('info')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeSection === 'info'
              ? 'border-amber-600 text-amber-900 bg-amber-50/40'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          Calzado & Cliente
        </button>
        {hasMultiplePairs && (
          <button
            onClick={() => setActiveSection('pairs')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeSection === 'pairs'
                ? 'border-amber-600 text-amber-900 bg-amber-50/40'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Pares de Calzado ({order.items.length})
          </button>
        )}
        <button
          onClick={() => setActiveSection('diagnosis')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeSection === 'diagnosis'
              ? 'border-amber-600 text-amber-900 bg-amber-50/40'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          Diagnóstico Técnico
        </button>
        <button
          onClick={() => setActiveSection('services')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeSection === 'services'
              ? 'border-amber-600 text-amber-900 bg-amber-50/40'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          Servicios & Presupuesto ({order.services.length})
        </button>
        <button
          onClick={() => setActiveSection('history')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeSection === 'history'
              ? 'border-amber-600 text-amber-900 bg-amber-50/40'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          Línea de Tiempo & Auditoría
        </button>
      </div>

      {/* SECTION: INFO */}
      {activeSection === 'info' && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Box */}
            <div className="border border-stone-200 rounded-xl p-4 bg-white space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center justify-between">
                <span>Datos del Cliente</span>
                <button
                  onClick={() => handleWhatsApp('ORDEN_RECIBIDA')}
                  className="text-[11px] text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  Escribir por WA
                </button>
              </div>
              <div className="text-sm font-bold text-stone-900">
                {order.customer.firstName} {order.customer.lastName}
              </div>
              <div className="text-xs text-stone-600 space-y-1">
                <div><strong>Teléfono:</strong> {order.customer.phone}</div>
                <div><strong>WhatsApp:</strong> {order.customer.whatsapp || order.customer.phone}</div>
                {order.customer.documentId && <div><strong>Cédula/RUC:</strong> {order.customer.documentId}</div>}
                {order.customer.email && <div><strong>Email:</strong> {order.customer.email}</div>}
                {order.customer.address && <div><strong>Dirección:</strong> {order.customer.address}</div>}
              </div>
            </div>

            {/* Shoe Specs Box */}
            <div className="border border-stone-200 rounded-xl p-4 bg-white space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center justify-between">
                <span>Ficha del Calzado{hasMultiplePairs ? ' — Par 1' : ''}</span>
                {hasMultiplePairs && (
                  <button
                    onClick={() => setActiveSection('pairs')}
                    className="text-[11px] text-amber-700 font-semibold hover:underline"
                  >
                    Ver {order.items.length} pares →
                  </button>
                )}
              </div>
              <div className="text-sm font-bold text-stone-900">
                {order.shoe.type} {order.shoe.brand} {order.shoe.model || ''}
              </div>
              <div className="text-xs text-stone-600 space-y-1">
                <div><strong>Color:</strong> {order.shoe.color} | <strong>Talla:</strong> {order.shoe.size}</div>
                <div><strong>Material:</strong> {order.shoe.material} ({order.shoe.pairCount} par)</div>
                <div><strong>Estado de recepción:</strong> {order.shoe.conditionDescription || 'Sin notas'}</div>
                {order.shoe.clientObservations && (
                  <div><strong>Petición especial del cliente:</strong> {order.shoe.clientObservations}</div>
                )}
              </div>
            </div>
          </div>

          {/* Integrated Before/After Photo Evidence */}
          <div className="border border-stone-200 rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-600" />
                Evidencia Fotográfica ({order.photos.length})
              </div>
              <button
                onClick={onOpenPhotos}
                className="text-[11px] text-amber-700 font-semibold hover:underline"
              >
                Ver galería completa
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Before */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Antes</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {beforePhotos.slice(0, 2).map(p => (
                    <div key={p.id} className="aspect-square rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
                      <img src={p.url} alt={p.type} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                  <label className="aspect-square rounded-lg border-2 border-dashed border-stone-300 flex items-center justify-center text-stone-400 hover:border-amber-500 hover:text-amber-600 cursor-pointer transition-colors">
                    <ImagePlus className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleQuickPhotoUpload(file, false);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* After */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Después</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {afterPhotos.slice(0, 2).map(p => (
                    <div key={p.id} className="aspect-square rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
                      <img src={p.url} alt={p.type} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                  <label className="aspect-square rounded-lg border-2 border-dashed border-emerald-300 flex items-center justify-center text-emerald-500 hover:border-emerald-600 hover:text-emerald-700 cursor-pointer transition-colors bg-emerald-50/30">
                    <ImagePlus className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleQuickPhotoUpload(file, true);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenMaterialConsumption}
                className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg text-xs font-semibold text-stone-800 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Package className="w-4 h-4 text-amber-600" />
                Registrar Insumos ({order.materialsConsumed.length})
              </button>

              <button
                onClick={onOpenQualityControl}
                className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg text-xs font-semibold text-stone-800 transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Control de Calidad {order.qualityControl?.approved && '✓'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenPaymentDelivery('payment')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <DollarSign className="w-4 h-4" />
                Cobrar (${order.balancePending.toFixed(2)})
              </button>

              <button
                onClick={() => onOpenPaymentDelivery('delivery')}
                className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Entregar Calzado
              </button>
            </div>
          </div>

          {/* Status Change Form */}
          <form onSubmit={handleStatusChange} className="border border-stone-200 rounded-xl p-4 bg-white space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
              Actualizar Estado del Flujo de Trabajo
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
                >
                  <option value="RECIBIDA">RECIBIDA</option>
                  <option value="EN_DIAGNOSTICO">EN DIAGNÓSTICO</option>
                  <option value="PRESUPUESTO_PENDIENTE">PRESUPUESTO PENDIENTE</option>
                  <option value="APROBADA">APROBADA</option>
                  <option value="EN_ESPERA_DE_MATERIAL">EN ESPERA DE MATERIAL</option>
                  <option value="EN_REPARACION">EN REPARACIÓN</option>
                  <option value="EN_RESTAURACION">EN RESTAURACIÓN</option>
                  <option value="CONTROL_CALIDAD">CONTROL DE CALIDAD</option>
                  <option value="TERMINADA">TERMINADA</option>
                  <option value="LISTA_PARA_ENTREGAR">LISTA PARA ENTREGAR</option>
                  <option value="PENDIENTE_DE_PAGO">PENDIENTE DE PAGO</option>
                  <option value="ENTREGADA">ENTREGADA</option>
                  <option value="CERRADA">CERRADA</option>
                  <option value="CANCELADA">CANCELADA</option>
                  <option value="RECHAZADA">RECHAZADA</option>
                  <option value="NO_RETIRADA">NO RETIRADA</option>
                </select>
              </div>

              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="Observación del cambio (ej. Secado de adhesivo completado)..."
                  value={statusObs}
                  onChange={e => setStatusObs(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={newStatus === order.status}
                  className="w-full py-2 px-3 bg-stone-800 hover:bg-stone-900 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                >
                  Guardar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* SECTION: DIAGNOSIS */}
      {/* SECTION: PAIRS BREAKDOWN — one order, several independent pairs of shoes */}
      {activeSection === 'pairs' && (
        <div className="space-y-4 pt-1">
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-500">
            Esta orden agrupa {order.items.length} pares de calzado bajo un solo cliente, ticket y anticipo. Cada par tiene su propio diagnóstico, fotos y servicios asignados.
          </div>
          {order.items.map((item, idx) => (
            <div key={item.id} className="border border-stone-200 rounded-xl overflow-hidden">
              <div className="bg-stone-100 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900">
                  Par {idx + 1}: {item.shoe.type} {item.shoe.brand} {item.shoe.model} (Talla {item.shoe.size} • {item.shoe.color})
                </span>
                <span className="text-[11px] text-stone-500 font-mono">{item.photos.length} foto(s) • {item.services.length} servicio(s)</span>
              </div>

              <div className="p-4 space-y-3">
                <div className="text-xs text-stone-700">
                  <span className="font-semibold text-stone-900">Estado físico: </span>
                  {item.shoe.conditionDescription || 'Sin descripción registrada.'}
                </div>

                {item.diagnosis && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      ['Suela', item.diagnosis.soleCondition],
                      ['Tacón', item.diagnosis.heelCondition],
                      ['Cuero', item.diagnosis.leatherCondition],
                      ['Costuras', item.diagnosis.stitchingCondition],
                      ['Forro', item.diagnosis.liningCondition],
                      ['Cremalleras', item.diagnosis.zippersCondition],
                      ['Ojales', item.diagnosis.eyeletsCondition],
                      ['General', item.diagnosis.generalCondition],
                    ].map(([label, value]) => (
                      <div key={label} className="p-2 bg-stone-50 rounded-lg border border-stone-200">
                        <span className="text-[10px] text-stone-500 block">{label}</span>
                        <span className="text-[11px] font-bold text-stone-900">{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {item.diagnosis?.recommendedWork && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                    <span className="font-bold text-amber-900">Trabajo recomendado: </span>
                    <span className="text-stone-700">{item.diagnosis.recommendedWork}</span>
                  </div>
                )}

                {item.photos.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {item.photos.map((p) => (
                      <div key={p.id} className="aspect-square rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
                        <img src={p.url} alt={p.type} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ))}
                  </div>
                )}

                {item.services.length > 0 && (
                  <div className="divide-y divide-stone-100 border border-stone-200 rounded-lg overflow-hidden">
                    {item.services.map((s) => (
                      <div key={s.id} className="flex items-center justify-between px-3 py-1.5 text-xs bg-white">
                        <span className="text-stone-800 font-medium">{s.name}</span>
                        <span className="font-mono font-bold text-stone-900">${s.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSection === 'diagnosis' && (
        <div className="space-y-4 pt-1">
          {hasMultiplePairs && (
            <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-[11px] text-stone-500">
              Esta orden tiene {order.items.length} pares — aquí se muestra el diagnóstico del Par 1. Vea la pestaña "Pares de Calzado" para el desglose completo.
            </div>
          )}
          {order.diagnosis ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-[11px] text-stone-500 block">Suela</span>
                  <span className="text-xs font-bold text-stone-900">{order.diagnosis.soleCondition}</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-[11px] text-stone-500 block">Tacón</span>
                  <span className="text-xs font-bold text-stone-900">{order.diagnosis.heelCondition}</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-[11px] text-stone-500 block">Cuero / Capellada</span>
                  <span className="text-xs font-bold text-stone-900">{order.diagnosis.leatherCondition}</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-[11px] text-stone-500 block">Costuras</span>
                  <span className="text-xs font-bold text-stone-900">{order.diagnosis.stitchingCondition}</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-[11px] text-stone-500 block">Forro Interno</span>
                  <span className="text-xs font-bold text-stone-900">{order.diagnosis.liningCondition}</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-[11px] text-stone-500 block">Cremalleras</span>
                  <span className="text-xs font-bold text-stone-900">{order.diagnosis.zippersCondition}</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-[11px] text-stone-500 block">Ojales / Herrajes</span>
                  <span className="text-xs font-bold text-stone-900">{order.diagnosis.eyeletsCondition}</span>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-[11px] text-stone-500 block">Estado General</span>
                  <span className="text-xs font-bold text-stone-900">{order.diagnosis.generalCondition}</span>
                </div>
              </div>

              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs">
                <div>
                  <span className="font-bold text-stone-900">Diagnóstico Técnico:</span>
                  <p className="text-stone-700 mt-0.5">{order.diagnosis.technicalNotes || 'Sin notas'}</p>
                </div>
                <div className="pt-2 border-t border-stone-200">
                  <span className="font-bold text-amber-900">Trabajo Recomendado:</span>
                  <p className="text-stone-700 mt-0.5">{order.diagnosis.recommendedWork || 'Sin recomendaciones'}</p>
                </div>
                <div className="text-[10px] text-stone-400 pt-1">
                  Evaluado por: {order.diagnosis.diagnosedBy} • {order.diagnosis.diagnosedAt}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-stone-400 border border-dashed border-stone-300 rounded-xl">
              No se ha registrado diagnóstico técnico aún.
            </div>
          )}
        </div>
      )}

      {/* SECTION: SERVICES & BUDGET */}
      {activeSection === 'services' && (
        <div className="space-y-4 pt-1">
          {/* Budget Approval Banner */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                Estado del Presupuesto
              </span>
              <span className="text-sm font-bold capitalize text-stone-900">
                {order.budget.status}
              </span>
              {order.budget.approvedAt && (
                <span className="text-[10px] text-stone-400 ml-2 font-mono">
                  (Aprobado: {order.budget.approvedAt})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleWhatsApp('PRESUPUESTO')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Enviar Presupuesto por WhatsApp
              </button>

              {order.budget.status !== 'aprobado' && (
                <button
                  onClick={() => approveBudget(order.id)}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                  Aprobar Presupuesto
                </button>
              )}

              {order.budget.status !== 'rechazado' && (
                <button
                  onClick={() => setShowRejectInput(!showRejectInput)}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  Rechazar
                </button>
              )}
            </div>
          </div>

          {showRejectInput && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2">
              <input
                type="text"
                placeholder="Motivo del rechazo del cliente (ej. Costo elevado, buscará otra opción)..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-red-300 rounded-lg bg-white outline-hidden"
              />
              <button
                onClick={() => {
                  if (rejectReason) {
                    rejectBudget(order.id, rejectReason);
                    setShowRejectInput(false);
                  }
                }}
                className="px-3 py-1.5 bg-red-700 text-white text-xs font-bold rounded-lg"
              >
                Confirmar Rechazo
              </button>
            </div>
          )}

          {/* Services List Table */}
          <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Servicio de Restauración</th>
                  <th className="py-2.5 px-3 text-center">Tiempo Estimado</th>
                  <th className="py-2.5 px-3 text-right">Precio</th>
                  <th className="py-2.5 px-3 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {order.services.map((srv, idx) => (
                  <tr key={srv.id || idx} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-stone-900">{srv.name}</div>
                      <div className="text-[11px] text-stone-500">{srv.description}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center text-stone-600 font-mono">
                      {srv.estimatedMinutes} min
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="relative inline-block">
                        <span className="absolute left-2 top-1.5 text-[10px] text-stone-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={priceDrafts[srv.id] ?? srv.price}
                          onChange={e =>
                            setPriceDrafts(prev => ({ ...prev, [srv.id]: parseFloat(e.target.value) || 0 }))
                          }
                          onBlur={() => commitPriceEdit(srv.id, srv.price)}
                          className="w-24 pl-5 pr-2 py-1 text-right text-xs font-mono font-bold border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => removeServiceFromOrder(order.id, srv.id)}
                        className="text-stone-400 hover:text-red-600 p-1"
                        title="Quitar servicio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Add Service Bar */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <div className="flex gap-2">
              <select
                value={selectedServiceId}
                onChange={e => setSelectedServiceId(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-stone-300 rounded-lg bg-white outline-hidden"
              >
                <option value="">-- Agregar otro servicio del catálogo --</option>
                {servicesCatalog.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} (${cat.standardPrice.toFixed(2)} • {cat.category})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddService}
                disabled={!selectedServiceId}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar
              </button>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-stone-200">
              <input
                type="text"
                placeholder="O agregue un servicio personalizado al vuelo..."
                value={customServiceName}
                onChange={e => setCustomServiceName(e.target.value)}
                className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white outline-hidden"
              />
              <div className="relative">
                <span className="absolute left-2 top-1.5 text-[10px] text-stone-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={customServicePrice || ''}
                  onChange={e => setCustomServicePrice(parseFloat(e.target.value) || 0)}
                  className="w-24 pl-5 pr-2 py-1.5 text-xs font-mono border border-stone-300 rounded-lg bg-white"
                />
              </div>
              <button
                type="button"
                onClick={handleAddCustomService}
                disabled={!customServiceName.trim() || customServicePrice <= 0}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Personalizado
              </button>
            </div>
          </div>

          {/* Budget Summary Card with live discount editor */}
          <div className="max-w-sm ml-auto p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span className="font-mono">${order.budget.subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-stone-600">Descuento:</span>
              <div className="flex items-center gap-1.5">
                <div className="flex border border-stone-300 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setDiscountDraft(d => ({ ...d, type: 'FIXED' }))}
                    onBlur={commitDiscount}
                    className={`px-1.5 py-1 ${discountDraft.type === 'FIXED' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500'}`}
                    title="Monto fijo"
                  >
                    <DollarSign className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountDraft(d => ({ ...d, type: 'PERCENT' }))}
                    onBlur={commitDiscount}
                    className={`px-1.5 py-1 border-l border-stone-300 ${discountDraft.type === 'PERCENT' ? 'bg-stone-900 text-white' : 'bg-white text-stone-500'}`}
                    title="Porcentaje"
                  >
                    <Percent className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  max={discountDraft.type === 'PERCENT' ? 100 : order.budget.subtotal}
                  value={discountDraft.value}
                  onChange={e => setDiscountDraft(d => ({ ...d, value: parseFloat(e.target.value) || 0 }))}
                  onBlur={commitDiscount}
                  className="w-16 px-1.5 py-1 text-right font-mono font-bold border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
            </div>
            {previewDiscountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Descuento aplicado:</span>
                <span className="font-mono">-${previewDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm text-stone-900 pt-2 border-t border-stone-300">
              <span>TOTAL:</span>
              <span className="font-mono text-base">${previewTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Anticipo Abonado:</span>
              <span className="font-mono text-emerald-700 font-bold">${order.totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-amber-900 bg-amber-100/70 p-1.5 rounded-sm">
              <span>Saldo a Cobrar:</span>
              <span className="font-mono">${Math.max(0, previewTotal - order.totalPaid).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: TIMELINE & AUDIT */}
      {activeSection === 'history' && (
        <div className="space-y-4 pt-1">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-600">
            Historial Cronológico de la Orden (Trazabilidad)
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
            {order.timeline.map((evt, idx) => (
              <div key={evt.id || idx} className="relative">
                <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-amber-600 ring-4 ring-white" />
                <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-xs">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-xs text-stone-900">{evt.title}</span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {evt.date} {evt.time}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1">{evt.description}</p>
                  <div className="text-[10px] text-stone-400 mt-1">
                    Por: {evt.userName} {evt.userRole && `(${evt.userRole})`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};
