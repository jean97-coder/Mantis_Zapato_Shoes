import React, { useState, useEffect } from 'react';
import { ServiceOrder, PaymentMethod, PaymentType, DeliveryRecord } from '../../types';
import { Modal } from '../common/Modal';
import { DollarSign, CheckCircle2, AlertTriangle, ShieldAlert, FileText, Banknote } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import confetti from 'canvas-confetti';

interface PaymentDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder;
  initialTab?: 'payment' | 'delivery';
  onShowSalesNote?: () => void;
}

export const PaymentDeliveryModal: React.FC<PaymentDeliveryModalProps> = ({
  isOpen,
  onClose,
  order,
  initialTab = 'payment',
  onShowSalesNote,
}) => {
  const { registerPayment, deliverOrder, triggerWhatsAppSend, currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<'payment' | 'delivery'>(initialTab);

  // Payment form state
  const [payAmount, setPayAmount] = useState<number>(order.balancePending);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('EFECTIVO');
  const [payType, setPayType] = useState<PaymentType>(order.balancePending === order.budget.total ? 'ANTICIPO' : 'FINAL');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [cashReceived, setCashReceived] = useState<number>(order.balancePending);

  useEffect(() => {
    setCashReceived(payAmount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payAmount]);

  const changeDue = payMethod === 'EFECTIVO' ? Math.max(0, cashReceived - payAmount) : 0;
  const insufficientCash = payMethod === 'EFECTIVO' && cashReceived < payAmount;

  // Delivery form state
  const [receivedByName, setReceivedByName] = useState(`${order.customer.firstName} ${order.customer.lastName}`);
  const [documentNumber, setDocumentNumber] = useState(order.customer.documentId || '');
  const [deliveryObservations, setDeliveryObservations] = useState('Entregado conforme en perfectas condiciones.');
  const [signatureConfirmed, setSignatureConfirmed] = useState(true);
  const [allowException, setAllowException] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');
  const [deliveryError, setDeliveryError] = useState('');

  const [paymentError, setPaymentError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) return;
    setPaymentError('');
    setIsProcessing(true);

    if (insufficientCash) return;

    try {
      await registerPayment(
        order.id,
        payAmount,
        payMethod,
        payType,
        payReference,
        payNotes,
        payMethod === 'EFECTIVO' ? cashReceived : undefined
      );
      setPaymentSuccess(
        payMethod === 'EFECTIVO' && changeDue > 0
          ? `Pago de $${payAmount.toFixed(2)} registrado. Entregue $${changeDue.toFixed(2)} de vuelto al cliente.`
          : `Pago de $${payAmount.toFixed(2)} registrado exitosamente.`
      );

      setTimeout(() => {
        setPaymentSuccess('');
        if (order.balancePending - payAmount <= 0) {
          setActiveTab('delivery');
        }
      }, 1500);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'No se pudo registrar el pago.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeliveryError('');

    const deliveryData: DeliveryRecord = {
      deliveredAt: new Date().toLocaleString('es-EC', { hour12: false }),
      deliveredBy: currentUser.name,
      receivedByName,
      documentNumber,
      observations: deliveryObservations,
      signatureConfirmed,
      exceptionAuthorized: allowException,
      exceptionReason: allowException ? exceptionReason : undefined,
    };

    setIsProcessing(true);
    try {
      await deliverOrder(order.id, deliveryData);

      try {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      } catch (err) {}

      // Send WhatsApp delivery notification
      triggerWhatsAppSend(order, 'ENTREGA');
      onClose();
    } catch (err) {
      setDeliveryError(err instanceof Error ? err.message : 'No se pudo completar la entrega.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Caja, Cobro y Entrega - ${order.orderNumber}`}
      subtitle={`${order.shoe.type} ${order.shoe.brand} (${order.customer.firstName} ${order.customer.lastName})`}
      maxWidth="2xl"
    >
      {/* Tab bar */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('payment')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'payment'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Registrar Cobro / Anticipo
        </button>
        <button
          onClick={() => setActiveTab('delivery')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'delivery'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Entrega del Calzado al Cliente
        </button>
      </div>

      {/* Financial Summary Pill Box */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200 text-center">
        <div>
          <span className="text-[11px] text-stone-500 block">Total Presupuesto</span>
          <span className="text-sm font-bold text-stone-900 font-mono">${order.budget.total.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[11px] text-stone-500 block">Total Abonado</span>
          <span className="text-sm font-bold text-emerald-700 font-mono">${order.totalPaid.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[11px] text-stone-500 block">Saldo Pendiente</span>
          <span className={`text-sm font-bold font-mono ${order.balancePending > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
            ${order.balancePending.toFixed(2)}
          </span>
        </div>
      </div>

      {/* TAB: PAYMENT */}
      {activeTab === 'payment' && (
        <form onSubmit={handleRegisterPayment} className="space-y-4 pt-1">
          {paymentError && (
            <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              {paymentError}
            </div>
          )}
          {paymentSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {paymentSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Monto a Cobrar ($) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-stone-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={order.balancePending > 0 ? order.balancePending : 9999}
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 text-sm font-bold font-mono border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
                />
              </div>
              <div className="flex gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setPayAmount(order.balancePending)}
                  className="text-[10px] text-amber-700 hover:underline font-semibold"
                >
                  Cobrar saldo total (${order.balancePending.toFixed(2)})
                </button>
                {order.balancePending > 10 && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(Math.round(order.balancePending / 2))}
                    className="text-[10px] text-stone-600 hover:underline"
                  >
                    50% (${(order.balancePending / 2).toFixed(2)})
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Método de Pago *
              </label>
              <select
                value={payMethod}
                onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
              >
                <option value="EFECTIVO">Efectivo (Ingresa a Caja)</option>
                <option value="TARJETA">Tarjeta Débito / Crédito</option>
                <option value="TRANSFERENCIA">Transferencia Bancaria / Deuna</option>
                <option value="OTRO">Otro medio</option>
              </select>
            </div>
          </div>

          {/* Quick cash register: efectivo recibido / vuelto */}
          {payMethod === 'EFECTIVO' && (
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <Banknote className="w-4 h-4" />
                Cobro Rápido en Efectivo
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Efectivo Recibido del Cliente ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cashReceived}
                      onChange={e => setCashReceived(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 text-sm font-bold font-mono border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
                    />
                  </div>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {[5, 10, 20, 50].map(bill => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => setCashReceived(Math.max(bill, Math.ceil(payAmount / bill) * bill))}
                        className="text-[10px] px-1.5 py-0.5 bg-white border border-emerald-300 rounded-md text-emerald-800 hover:bg-emerald-100"
                        title={`Cliente entrega billete de $${bill}`}
                      >
                        ${bill}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCashReceived(payAmount)}
                      className="text-[10px] px-1.5 py-0.5 text-stone-500 hover:underline"
                    >
                      Exacto
                    </button>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <span className="text-[11px] text-emerald-800 font-semibold uppercase tracking-wider">Vuelto a Entregar</span>
                  <span className={`text-2xl font-mono font-black ${insufficientCash ? 'text-red-600' : 'text-emerald-700'}`}>
                    ${changeDue.toFixed(2)}
                  </span>
                  {insufficientCash && (
                    <span className="text-[11px] text-red-600 font-semibold">
                      El efectivo recibido es menor al monto a cobrar.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tipo de Pago
              </label>
              <select
                value={payType}
                onChange={e => setPayType(e.target.value as PaymentType)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
              >
                <option value="ANTICIPO">Anticipo inicial</option>
                <option value="PARCIAL">Abono parcial</option>
                <option value="FINAL">Pago final de retiro</option>
                <option value="COMPLETO">Pago total completo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Referencia / Voucher / N° Transacción
              </label>
              <input
                type="text"
                placeholder="Ej: Lote 0456 o Transf #9921"
                value={payReference}
                onChange={e => setPayReference(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Notas adicionales del pago
            </label>
            <input
              type="text"
              placeholder="Ej: Recibido billete de $50, vuelto entregado..."
              value={payNotes}
              onChange={e => setPayNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-200">
            {onShowSalesNote && (
              <button
                type="button"
                onClick={onShowSalesNote}
                className="text-xs text-stone-700 hover:text-stone-900 font-semibold flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-stone-500" />
                Ver Nota de Venta
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={isProcessing || insufficientCash}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5" />
                {isProcessing ? 'Procesando...' : 'Registrar Pago en Sistema'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB: DELIVERY */}
      {activeTab === 'delivery' && (
        <form onSubmit={handleDeliver} className="space-y-4 pt-1">
          {deliveryError && (
            <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs font-semibold flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{deliveryError}</span>
            </div>
          )}

          {/* Pending Balance Warning */}
          {order.balancePending > 0 ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-800">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                ATENCIÓN: La orden tiene un saldo pendiente de ${order.balancePending.toFixed(2)}
              </div>
              <p className="text-[11px] text-red-700">
                La regla del negocio estipula que no se puede entregar el calzado sin cobrar el saldo total, salvo que un administrador autorice una excepción.
              </p>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPayAmount(order.balancePending);
                    setActiveTab('payment');
                  }}
                  className="px-3 py-1.5 bg-red-700 text-white rounded-lg text-xs font-bold hover:bg-red-800"
                >
                  Cobrar saldo de ${order.balancePending.toFixed(2)} ahora
                </button>

                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowException}
                    onChange={e => setAllowException(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded-xs"
                  />
                  <span className="font-semibold text-red-800">Autorizar excepción</span>
                </label>
              </div>

              {allowException && (
                <div className="pt-2">
                  <input
                    type="text"
                    required
                    placeholder="Motivo de la excepción autorizada (ej. Cliente corporativo a crédito 15 días)..."
                    value={exceptionReason}
                    onChange={e => setExceptionReason(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-red-300 rounded-lg bg-white outline-hidden"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Saldo completamente cancelado. Calzado liberado para entrega.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Persona que Recibe el Calzado *
              </label>
              <input
                type="text"
                required
                value={receivedByName}
                onChange={e => setReceivedByName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Cédula / Documento de Identidad
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={e => setDocumentNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Observaciones de Entrega
            </label>
            <textarea
              rows={2}
              value={deliveryObservations}
              onChange={e => setDeliveryObservations(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
            />
          </div>

          <label className="flex items-start gap-3 p-3 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              required
              checked={signatureConfirmed}
              onChange={e => setSignatureConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-amber-600 rounded-xs"
            />
            <div className="text-xs">
              <span className="font-bold text-stone-900 block">
                Confirmación de Retiro y Satisfacción del Cliente
              </span>
              <span className="text-stone-500">
                El cliente revisó el calzado reparado y manifiesta su conformidad con los acabados y trabajos realizados.
              </span>
            </div>
          </label>

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
              disabled={(order.balancePending > 0 && !allowException) || isProcessing}
              className="px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {isProcessing ? 'Procesando...' : 'Finalizar Entrega y Cerrar Orden'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
