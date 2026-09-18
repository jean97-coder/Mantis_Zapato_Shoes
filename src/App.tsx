import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { AppLayout, NavTab } from './components/layout/AppLayout';
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './components/dashboard/DashboardView';
import { OrdersView } from './components/orders/OrdersView';
import { NewOrderWizard } from './components/orders/NewOrderWizard';
import { OrderDetailModal } from './components/orders/OrderDetailModal';
import { PrintableTicket } from './components/ticket/PrintableTicket';
import { PrintableSalesNote } from './components/sales-note/PrintableSalesNote';
import { BeforeAfterPhotoModal } from './components/orders/BeforeAfterPhotoModal';
import { QualityControlModal } from './components/workshop/QualityControlModal';
import { MaterialConsumptionModal } from './components/workshop/MaterialConsumptionModal';
import { PaymentDeliveryModal } from './components/orders/PaymentDeliveryModal';
import { InventoryView } from './components/inventory/InventoryView';
import { StoreView } from './components/store/StoreView';
import { CashRegisterView } from './components/cash/CashRegisterView';
import { CustomersView } from './components/customers/CustomersView';
import { WorkshopView } from './components/workshop/WorkshopView';
import { CalendarView } from './components/calendar/CalendarView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { Modal } from './components/common/Modal';
import { Toast } from './components/common/Toast';
import { WhatsAppSendModal } from './components/whatsapp/WhatsAppSendModal';
import { ServiceOrder, SalesNote } from './types';
import { BRAND_NAME } from './lib/brand';

const MainApp: React.FC = () => {
  const {
    orders,
    settings,
    triggerWhatsAppSend,
    whatsappPreview,
    closeWhatsAppPreview,
    toastMessage,
    dismissToast,
    generateSalesNote,
    isLoading,
    loadError,
    retryInitialLoad,
  } = useApp();

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  // Selected order for full detail modal
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);

  // Modals state
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [isSalesNoteOpen, setIsSalesNoteOpen] = useState(false);
  const [activeSalesNote, setActiveSalesNote] = useState<SalesNote | null>(null);
  const [isPhotosOpen, setIsPhotosOpen] = useState(false);
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [isConsumptionOpen, setIsConsumptionOpen] = useState(false);
  const [isPaymentDeliveryOpen, setIsPaymentDeliveryOpen] = useState(false);
  const [paymentDeliveryInitialTab, setPaymentDeliveryInitialTab] = useState<'payment' | 'delivery'>('payment');

  // Keep selectedOrder in sync with state in context
  const activeOrder = selectedOrder ? orders.find((o) => o.id === selectedOrder.id) || selectedOrder : null;

  // Handlers for quick modal opens
  const handleOpenTicket = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setIsTicketOpen(true);
  };

  const handleOpenSalesNote = async (order: ServiceOrder) => {
    setSelectedOrder(order);
    const note = await generateSalesNote(order.id);
    setActiveSalesNote(note);
    setIsSalesNoteOpen(true);
  };

  const handleOpenPhotos = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setIsPhotosOpen(true);
  };

  const handleOpenQuality = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setIsQualityOpen(true);
  };

  const handleOpenConsumption = (order: ServiceOrder) => {
    setSelectedOrder(order);
    setIsConsumptionOpen(true);
  };

  const handleOpenPaymentDelivery = (order: ServiceOrder, tab: 'payment' | 'delivery') => {
    setSelectedOrder(order);
    setPaymentDeliveryInitialTab(tab);
    setIsPaymentDeliveryOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 text-stone-500 text-sm">
        Cargando datos del taller...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-100 gap-4 px-4">
        <div className="max-w-sm text-center space-y-2">
          <p className="text-sm font-bold text-red-700">No se pudo cargar la información del sistema</p>
          <p className="text-xs text-stone-500">{loadError}</p>
        </div>
        <button
          onClick={retryInitialLoad}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <AppLayout currentTab={currentTab} onSelectTab={setCurrentTab} onSelectOrder={(order) => setSelectedOrder(order)}>
      {/* 0. DASHBOARD */}
      {currentTab === 'dashboard' && (
        <DashboardView
          orders={orders}
          onSelectOrder={(order) => setSelectedOrder(order)}
          onNewReception={() => setCurrentTab('reception')}
        />
      )}

      {/* 1. ORDERS VIEW */}
      {currentTab === 'orders' && (
        <OrdersView
          onNewOrder={() => setCurrentTab('reception')}
          onSelectOrder={(order) => setSelectedOrder(order)}
          onOpenTicket={handleOpenTicket}
          onOpenPhotos={handleOpenPhotos}
          onOpenPaymentDelivery={handleOpenPaymentDelivery}
        />
      )}

      {/* 2. RECEPTION WIZARD */}
      {currentTab === 'reception' && (
        <NewOrderWizard
          onSuccess={(createdOrder) => {
            setSelectedOrder(createdOrder);
            setCurrentTab('orders');
            setIsTicketOpen(true);
          }}
          onCancel={() => setCurrentTab('orders')}
        />
      )}

      {/* 3. WORKSHOP VIEW */}
      {currentTab === 'workshop' && (
        <WorkshopView
          onSelectOrder={(order) => setSelectedOrder(order)}
          onOpenQualityControl={handleOpenQuality}
          onOpenMaterialConsumption={handleOpenConsumption}
        />
      )}

      {/* CALENDAR VIEW */}
      {currentTab === 'calendar' && (
        <CalendarView orders={orders} onSelectOrder={(order) => setSelectedOrder(order)} />
      )}

      {/* 4. INVENTORY VIEW */}
      {currentTab === 'inventory' && <InventoryView />}

      {/* 4b. STORE / DIRECT SALE VIEW */}
      {currentTab === 'store' && <StoreView />}

      {/* 5. CASH REGISTER VIEW */}
      {currentTab === 'cash' && <CashRegisterView onSelectOrder={(order) => setSelectedOrder(order)} />}

      {/* 6. CUSTOMERS CRM VIEW */}
      {currentTab === 'customers' && <CustomersView onSelectOrder={(order) => setSelectedOrder(order)} />}

      {/* 7. REPORTS & ANALYTICS VIEW */}
      {currentTab === 'reports' && <AnalyticsView />}

      {/* 8. SETTINGS VIEW */}
      {currentTab === 'settings' && <SettingsView />}

      {/* MODAL: ORDER FULL DETAIL */}
      {activeOrder && !isTicketOpen && !isSalesNoteOpen && !isPhotosOpen && !isQualityOpen && !isConsumptionOpen && !isPaymentDeliveryOpen && (
        <OrderDetailModal
          isOpen={!!activeOrder}
          onClose={() => setSelectedOrder(null)}
          order={activeOrder}
          onOpenTicket={() => setIsTicketOpen(true)}
          onOpenSalesNote={() => handleOpenSalesNote(activeOrder)}
          onOpenPhotos={() => setIsPhotosOpen(true)}
          onOpenQualityControl={() => setIsQualityOpen(true)}
          onOpenMaterialConsumption={() => setIsConsumptionOpen(true)}
          onOpenPaymentDelivery={(tab) => {
            setPaymentDeliveryInitialTab(tab);
            setIsPaymentDeliveryOpen(true);
          }}
        />
      )}

      {/* MODAL: PRINTABLE TICKET */}
      {activeOrder && isTicketOpen && (
        <Modal
          isOpen={isTicketOpen}
          onClose={() => setIsTicketOpen(false)}
          title={`Ticket de Servicio - ${activeOrder.orderNumber}`}
          subtitle={`Cliente: ${activeOrder.customer.firstName} ${activeOrder.customer.lastName}`}
          maxWidth="md"
          printIsolate
        >
          <PrintableTicket
            order={activeOrder}
            settings={settings}
            onSendWhatsApp={() => triggerWhatsAppSend(activeOrder, 'ORDEN_RECIBIDA')}
          />
        </Modal>
      )}

      {/* MODAL: PRINTABLE SALES NOTE */}
      {activeSalesNote && isSalesNoteOpen && (
        <Modal
          isOpen={isSalesNoteOpen}
          onClose={() => setIsSalesNoteOpen(false)}
          title={`Nota de Venta - ${activeSalesNote.noteNumber}`}
          subtitle={`Orden Ref: ${activeSalesNote.orderNumber}`}
          maxWidth="3xl"
          printIsolate
        >
          <PrintableSalesNote salesNote={activeSalesNote} settings={settings} />
        </Modal>
      )}

      {/* MODAL: WHATSAPP SEND PREVIEW (opened from any view via triggerWhatsAppSend) */}
      <WhatsAppSendModal data={whatsappPreview} onClose={closeWhatsAppPreview} />

      {/* GLOBAL TOAST NOTIFICATIONS */}
      <Toast message={toastMessage} onDismiss={dismissToast} />

      {/* MODAL: BEFORE & AFTER PHOTOS */}
      {activeOrder && isPhotosOpen && (
        <BeforeAfterPhotoModal isOpen={isPhotosOpen} onClose={() => setIsPhotosOpen(false)} order={activeOrder} />
      )}

      {/* MODAL: QUALITY CONTROL CHECKLIST */}
      {activeOrder && isQualityOpen && (
        <QualityControlModal isOpen={isQualityOpen} onClose={() => setIsQualityOpen(false)} order={activeOrder} />
      )}

      {/* MODAL: MATERIAL CONSUMPTION FROM INVENTORY */}
      {activeOrder && isConsumptionOpen && (
        <MaterialConsumptionModal
          isOpen={isConsumptionOpen}
          onClose={() => setIsConsumptionOpen(false)}
          order={activeOrder}
        />
      )}

      {/* MODAL: PAYMENT & DELIVERY */}
      {activeOrder && isPaymentDeliveryOpen && (
        <PaymentDeliveryModal
          isOpen={isPaymentDeliveryOpen}
          onClose={() => setIsPaymentDeliveryOpen(false)}
          order={activeOrder}
          initialTab={paymentDeliveryInitialTab}
          onShowSalesNote={() => {
            setIsPaymentDeliveryOpen(false);
            handleOpenSalesNote(activeOrder);
          }}
        />
      )}
    </AppLayout>
  );
};

const AuthGate: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-400 text-sm">
        Cargando {BRAND_NAME} ERP...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
