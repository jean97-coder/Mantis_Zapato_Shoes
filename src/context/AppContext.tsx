import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Customer,
  Material,
  ServiceCatalogItem,
  ServiceOrder,
  Supplier,
  User,
  AppSettings,
  CashRegister,
  Expense,
  OrderStatus,
  ShoePhoto,
  Diagnosis,
  OrderServiceItem,
  QualityControlCheck,
  DeliveryRecord,
  PaymentMethod,
  PaymentType,
  InventoryMovement,
  Purchase,
  SalesNote,
  DiscountType,
  CashMovementsReport,
  Partner,
  PartnerMovementHistory,
  StoreProduct,
  StoreSale,
} from '../types';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import { downloadOrderTicketPng } from '../lib/ticketSnapshot';

export interface WhatsAppPreview {
  url: string;
  message: string;
  customerName: string;
  phone: string;
}

const EMPTY_CASH_REGISTER: CashRegister = {
  id: 'none',
  openedAt: '',
  openedBy: '',
  initialAmount: 0,
  currentCash: 0,
  expectedCash: 0,
  status: 'CERRADA',
  movements: [],
};

interface NewOrderItemPayload {
  type: string;
  brand: string;
  model?: string;
  color?: string;
  size?: string;
  material: string;
  pairCount?: number;
  conditionDescription?: string;
  clientObservations?: string;
  diagnosis?: Diagnosis;
  photos?: Array<{ url: string; type: string; stage: string; caption?: string }>;
  services?: Array<{
    serviceId?: string;
    name: string;
    description?: string;
    price: number;
    estimatedMinutes?: number;
    technicianId?: string;
    technicianName?: string;
  }>;
}

interface NewOrderPayload {
  customerId: string;
  promisedDate: string;
  currentStatusText?: string;
  /** One entry per pair of shoes in this order (each with its own diagnosis/photos/services). */
  items: NewOrderItemPayload[];
  priority?: ServiceOrder['priority'];
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  branch?: string;
  generalObservations?: string;
  serviceConditionsAgreed?: boolean;
  discountType?: DiscountType;
  discountValue?: number;
  status?: OrderStatus;
  budgetStatus?: string;
}

interface AppContextType {
  orders: ServiceOrder[];
  customers: Customer[];
  materials: Material[];
  inventoryMovements: InventoryMovement[];
  servicesCatalog: ServiceCatalogItem[];
  suppliers: Supplier[];
  purchases: Purchase[];
  cashRegister: CashRegister;
  expenses: Expense[];
  partners: Partner[];
  storeProducts: StoreProduct[];
  users: User[];
  currentUser: User;
  settings: AppSettings;
  isLoading: boolean;
  loadError: string;
  retryInitialLoad: () => void;

  createOrder: (data: NewOrderPayload) => Promise<ServiceOrder>;
  updateOrder: (orderId: string, updates: Record<string, unknown>) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, observation?: string) => Promise<void>;
  updateDiagnosis: (orderId: string, diagnosis: Diagnosis) => Promise<void>;
  addPhotoToOrder: (orderId: string, photo: Omit<ShoePhoto, 'id' | 'date' | 'registeredBy'>) => Promise<void>;
  uploadOrderPhoto: (
    orderId: string,
    file: File,
    meta: { type: string; stage: string; caption?: string; shoeItemId?: string }
  ) => Promise<void>;
  addServiceToOrder: (orderId: string, serviceItem: Omit<OrderServiceItem, 'id'>) => Promise<void>;
  updateServiceItem: (orderId: string, serviceItemId: string, updates: Partial<Omit<OrderServiceItem, 'id'>>) => Promise<void>;
  removeServiceFromOrder: (orderId: string, serviceItemId: string) => Promise<void>;
  updateOrderDiscount: (orderId: string, discountType: DiscountType, discountValue: number) => Promise<void>;
  approveBudget: (orderId: string) => Promise<void>;
  rejectBudget: (orderId: string, reason: string) => Promise<void>;
  consumeMaterial: (
    orderId: string,
    materialId: string,
    quantity: number,
    notes?: string
  ) => Promise<{ success: boolean; message: string }>;
  completeQualityControl: (orderId: string, check: QualityControlCheck) => Promise<void>;
  registerPayment: (
    orderId: string,
    amount: number,
    method: PaymentMethod,
    type: PaymentType,
    reference?: string,
    notes?: string,
    cashReceived?: number
  ) => Promise<ServiceOrder>;
  deliverOrder: (orderId: string, deliveryData: DeliveryRecord) => Promise<ServiceOrder>;
  createCustomer: (
    customerData: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'ordersCount' | 'lastVisit'>
  ) => Promise<Customer>;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => Promise<void>;
  createMaterial: (material: Omit<Material, 'id'>) => Promise<Material>;
  updateMaterial: (materialId: string, updates: Partial<Material>) => Promise<void>;
  deleteMaterial: (materialId: string) => Promise<{ mode: 'deleted' | 'deactivated' }>;
  adjustInventoryStock: (
    materialId: string,
    newStock: number,
    reason: string,
    type?: InventoryMovement['type']
  ) => Promise<void>;
  createPurchase: (purchaseData: {
    supplierId: string;
    invoiceDocumentNumber?: string;
    paymentMethod: PaymentMethod;
    items: { materialId: string; quantity: number; unitCost: number; discount?: number }[];
  }) => Promise<Purchase>;
  createSupplier: (supplierData: Omit<Supplier, 'id' | 'createdAt'>) => Promise<Supplier>;
  updateSupplier: (supplierId: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (supplierId: string) => Promise<void>;
  createServiceCatalogItem: (item: Omit<ServiceCatalogItem, 'id'>) => Promise<ServiceCatalogItem>;
  updateServiceCatalogItem: (id: string, updates: Partial<ServiceCatalogItem>) => Promise<void>;
  openCashRegister: (initialAmount: number) => Promise<void>;
  closeCashRegister: (actualCashCounted: number) => Promise<void>;
  addExpense: (expense: {
    date: string;
    category: Expense['category'];
    description: string;
    amount: number;
    paidWith: PaymentMethod;
    receiptNumber?: string;
  }) => Promise<Expense>;
  capitalInjection: (data: { partnerId: string; amount: number; description: string; method?: PaymentMethod }) => Promise<void>;
  capitalReturn: (data: { partnerId: string; amount: number; description: string; method?: PaymentMethod }) => Promise<void>;
  fetchPartnerHistory: (partnerId: string) => Promise<PartnerMovementHistory>;
  createPartner: (data: { name: string; email?: string; phone?: string; notes?: string }) => Promise<void>;
  updatePartner: (
    partnerId: string,
    data: Partial<{ name: string; email: string; phone: string; notes: string; isActive: boolean }>
  ) => Promise<void>;
  deletePartner: (partnerId: string) => Promise<{ mode: 'deleted' | 'deactivated' }>;
  createStoreProduct: (product: Omit<StoreProduct, 'id' | 'isLowStock'>) => Promise<StoreProduct>;
  updateStoreProduct: (productId: string, updates: Partial<Omit<StoreProduct, 'id' | 'isLowStock'>>) => Promise<void>;
  deleteStoreProduct: (productId: string) => Promise<{ mode: 'deleted' | 'deactivated' }>;
  uploadStoreProductImage: (file: File) => Promise<string>;
  processStoreSale: (data: {
    items: { productId: string; quantity: number }[];
    paymentMethod: PaymentMethod;
    cashReceived: number;
    customerName?: string;
    customerDocument?: string;
  }) => Promise<StoreSale>;
  fetchStoreSales: (from?: string, to?: string) => Promise<StoreSale[]>;
  fetchCashMovementsReport: (from: string, to: string) => Promise<CashMovementsReport>;
  generateSalesNote: (orderId: string) => Promise<SalesNote>;
  /**
   * Fetches the ready-to-send WhatsApp message + wa.me link for an order and
   * opens the WhatsAppSendModal with it. We never call window.open()
   * ourselves — popup blockers (Brave in particular) flag any JS-triggered
   * tab as an unrequested popup even when pre-opened synchronously. Instead
   * the modal shows a real <a href> the user clicks directly, which no
   * blocker intercepts because it's a genuine user-initiated navigation.
   */
  triggerWhatsAppSend: (
    order: Pick<ServiceOrder, 'id' | 'customer'>,
    templateType: string,
    customNotes?: string
  ) => Promise<{ success: boolean; url: string; message: string }>;
  whatsappPreview: WhatsAppPreview | null;
  closeWhatsAppPreview: () => void;
  toastMessage: string | null;
  dismissToast: () => void;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  sendTelegramTest: () => Promise<void>;
  createUser: (data: {
    name: string;
    email: string;
    password: string;
    role: User['role'];
    phone?: string;
    specialty?: string;
  }) => Promise<User>;
  toggleUserActive: (userId: string, active: boolean) => Promise<void>;
  updateUser: (
    userId: string,
    updates: Partial<{
      name: string;
      role: User['role'];
      phone: string;
      specialty: string;
      password: string;
    }>
  ) => Promise<void>;
  deleteUser: (userId: string) => Promise<{ mode: 'deleted' | 'deactivated' }>;
  refreshOrders: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [servicesCatalog, setServicesCatalog] = useState<ServiceCatalogItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [cashRegister, setCashRegister] = useState<CashRegister>(EMPTY_CASH_REGISTER);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<AppSettings>({} as AppSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const replaceOrder = (updated: ServiceOrder) => {
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === updated.id);
      return exists ? prev.map((o) => (o.id === updated.id ? updated : o)) : [updated, ...prev];
    });
  };

  const refreshOrders = useCallback(async () => {
    const data = await api.get<ServiceOrder[]>('/orders');
    setOrders(data);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const [ordersRes, customersRes, materialsRes, movementsRes, catalogRes, suppliersRes, purchasesRes, cashRes, expensesRes, partnersRes, storeProductsRes, usersRes, settingsRes] =
          await Promise.all([
            api.get<ServiceOrder[]>('/orders'),
            api.get<Customer[]>('/customers'),
            api.get<Material[]>('/inventory/materials'),
            api.get<InventoryMovement[]>('/inventory/movements'),
            api.get<ServiceCatalogItem[]>('/catalog'),
            api.get<Supplier[]>('/inventory/suppliers'),
            api.get<Purchase[]>('/inventory/purchases'),
            api.get<CashRegister | null>('/cash/current'),
            api.get<Expense[]>('/cash/expenses'),
            api.get<Partner[]>('/cash/partners'),
            api.get<StoreProduct[]>('/store/products'),
            api.get<User[]>('/users'),
            api.get<AppSettings>('/settings'),
          ]);

        if (cancelled) return;
        setOrders(ordersRes);
        setCustomers(customersRes);
        setMaterials(materialsRes);
        setInventoryMovements(movementsRes);
        setServicesCatalog(catalogRes);
        setSuppliers(suppliersRes);
        setPurchases(purchasesRes);
        setCashRegister(cashRes || EMPTY_CASH_REGISTER);
        setExpenses(expensesRes);
        setPartners(partnersRes);
        setStoreProducts(storeProductsRes);
        setUsers(usersRes);
        setSettings(settingsRes);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'No se pudo conectar con el servidor. Verifique su conexión.'
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser, reloadToken]);

  const retryInitialLoad = useCallback(() => setReloadToken((t) => t + 1), []);

  // ------------------------------------------------------------------
  // ORDERS
  // ------------------------------------------------------------------

  const createOrder = async (data: NewOrderPayload): Promise<ServiceOrder> => {
    const created = await api.post<ServiceOrder>('/orders', data);
    replaceOrder(created);
    setCustomers((prev) =>
      prev.map((c) => (c.id === data.customerId ? { ...c, ordersCount: (c.ordersCount || 0) + 1 } : c))
    );
    return created;
  };

  const updateOrder = async (orderId: string, updates: Record<string, unknown>) => {
    const updated = await api.patch<ServiceOrder>(`/orders/${orderId}`, updates);
    replaceOrder(updated);
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, observation?: string) => {
    const updated = await api.post<ServiceOrder>(`/orders/${orderId}/status`, { status: newStatus, observation });
    replaceOrder(updated);
  };

  const updateDiagnosis = async (orderId: string, diagnosis: Diagnosis) => {
    const updated = await api.post<ServiceOrder>(`/orders/${orderId}/diagnosis`, diagnosis);
    replaceOrder(updated);
  };

  const addPhotoToOrder = async (orderId: string, photo: Omit<ShoePhoto, 'id' | 'date' | 'registeredBy'>) => {
    const updated = await api.post<ServiceOrder>(`/orders/${orderId}/photos`, photo);
    replaceOrder(updated);
  };

  const uploadOrderPhoto = async (
    orderId: string,
    file: File,
    meta: { type: string; stage: string; caption?: string; shoeItemId?: string }
  ) => {
    const form = new FormData();
    form.append('photos', file);
    form.append('type', meta.type);
    form.append('stage', meta.stage);
    if (meta.caption) form.append('caption', meta.caption);
    if (meta.shoeItemId) form.append('shoeItemId', meta.shoeItemId);
    const updated = await api.post<ServiceOrder>(`/orders/${orderId}/photos`, form);
    replaceOrder(updated);
  };

  const addServiceToOrder = async (orderId: string, serviceItem: Omit<OrderServiceItem, 'id'>) => {
    const updated = await api.post<ServiceOrder>(`/orders/${orderId}/services`, serviceItem);
    replaceOrder(updated);
  };

  const updateServiceItem = async (
    orderId: string,
    serviceItemId: string,
    updates: Partial<Omit<OrderServiceItem, 'id'>>
  ) => {
    const updated = await api.patch<ServiceOrder>(`/orders/${orderId}/services/${serviceItemId}`, updates);
    replaceOrder(updated);
  };

  const removeServiceFromOrder = async (orderId: string, serviceItemId: string) => {
    const updated = await api.delete<ServiceOrder>(`/orders/${orderId}/services/${serviceItemId}`);
    replaceOrder(updated);
  };

  const updateOrderDiscount = async (orderId: string, discountType: DiscountType, discountValue: number) => {
    const updated = await api.post<ServiceOrder>(`/orders/${orderId}/discount`, { discountType, discountValue });
    replaceOrder(updated);
  };

  const approveBudget = async (orderId: string) => {
    const updated = await api.post<ServiceOrder>(`/orders/${orderId}/budget/approve`);
    replaceOrder(updated);
  };

  const rejectBudget = async (orderId: string, reason: string) => {
    const updated = await api.post<ServiceOrder>(`/orders/${orderId}/budget/reject`, { reason });
    replaceOrder(updated);
  };

  const consumeMaterial = async (
    orderId: string,
    materialId: string,
    quantity: number,
    notes?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await api.post<{ order: ServiceOrder; message: string }>(`/orders/${orderId}/consume-material`, {
        materialId,
        quantity,
        notes,
      });
      replaceOrder(res.order);
      setMaterials((prev) =>
        prev.map((m) => (m.id === materialId ? { ...m, currentStock: m.currentStock - quantity } : m))
      );
      return { success: true, message: res.message };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Error al consumir material.' };
    }
  };

  const completeQualityControl = async (orderId: string, check: QualityControlCheck) => {
    const updated = await api.post<ServiceOrder>(`/orders/${orderId}/quality-control`, check);
    replaceOrder(updated);
  };

  const registerPayment = async (
    orderId: string,
    amount: number,
    method: PaymentMethod,
    type: PaymentType,
    reference?: string,
    notes?: string,
    cashReceived?: number
  ): Promise<ServiceOrder> => {
    const updated = await api.post<ServiceOrder>(`/orders/${orderId}/payments`, {
      amount,
      method,
      type,
      reference,
      notes,
      cashReceived,
    });
    replaceOrder(updated);
    setCustomers((prev) =>
      prev.map((c) => (c.id === updated.customerId ? { ...c, totalSpent: (c.totalSpent || 0) + amount } : c))
    );
    const freshCash = await api.get<CashRegister | null>('/cash/current');
    setCashRegister(freshCash || EMPTY_CASH_REGISTER);
    return updated;
  };

  const deliverOrder = async (orderId: string, deliveryData: DeliveryRecord): Promise<ServiceOrder> => {
    const res = await api.post<{ success: boolean; order: ServiceOrder }>(`/orders/${orderId}/deliver`, deliveryData);
    replaceOrder(res.order);
    return res.order;
  };

  const generateSalesNote = async (orderId: string): Promise<SalesNote> => {
    return api.post<SalesNote>(`/orders/${orderId}/sales-note`);
  };

  const [whatsappPreview, setWhatsappPreview] = useState<WhatsAppPreview | null>(null);
  const closeWhatsAppPreview = () => setWhatsappPreview(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const dismissToast = () => setToastMessage(null);

  const triggerWhatsAppSend = async (
    order: Pick<ServiceOrder, 'id' | 'customer'>,
    templateType: string,
    customNotes?: string
  ): Promise<{ success: boolean; url: string; message: string }> => {
    const res = await api.post<{
      success: boolean;
      url: string;
      message: string;
      record: { customerPhone: string };
    }>(`/orders/${order.id}/whatsapp`, { templateType, customNotes });
    setWhatsappPreview({
      url: res.url,
      message: res.message,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
      // Use the backend's normalized digits (country code, no leading trunk
      // "0") rather than the raw stored value, so the preview always matches
      // the number actually embedded in the wa.me link.
      phone: res.record.customerPhone,
    });

    // WhatsApp's web/app API has no way to attach a file programmatically, so
    // we auto-download the ticket as PNG the instant the message is ready —
    // the user only has to drag it into the chat that opens.
    const fullOrder = orders.find((o) => o.id === order.id);
    if (fullOrder) {
      downloadOrderTicketPng(fullOrder, settings)
        .then(() => {
          setToastMessage('¡Mensaje listo y ticket descargado en PNG! Adjunta la imagen descargada en el chat de WhatsApp.');
        })
        .catch(() => {
          setToastMessage('Mensaje listo. No se pudo generar la imagen del ticket automáticamente.');
        });
    }

    return res;
  };

  // ------------------------------------------------------------------
  // CUSTOMERS
  // ------------------------------------------------------------------

  const createCustomer = async (
    customerData: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'ordersCount' | 'lastVisit'>
  ): Promise<Customer> => {
    const created = await api.post<Customer>('/customers', customerData);
    setCustomers((prev) => [created, ...prev]);
    return created;
  };

  const updateCustomer = async (customerId: string, updates: Partial<Customer>) => {
    const updated = await api.patch<Customer>(`/customers/${customerId}`, updates);
    setCustomers((prev) => prev.map((c) => (c.id === customerId ? updated : c)));
  };

  // ------------------------------------------------------------------
  // INVENTORY
  // ------------------------------------------------------------------

  const createMaterial = async (material: Omit<Material, 'id'>): Promise<Material> => {
    const created = await api.post<Material>('/inventory/materials', material);
    setMaterials((prev) => [created, ...prev]);
    return created;
  };

  const updateMaterial = async (materialId: string, updates: Partial<Material>) => {
    const updated = await api.patch<Material>(`/inventory/materials/${materialId}`, updates);
    setMaterials((prev) => prev.map((m) => (m.id === materialId ? updated : m)));
  };

  const deleteMaterial = async (materialId: string): Promise<{ mode: 'deleted' | 'deactivated' }> => {
    const res = await api.delete<{ mode: 'deleted' | 'deactivated'; material: Material }>(
      `/inventory/materials/${materialId}`
    );
    if (res.mode === 'deleted') {
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    } else {
      setMaterials((prev) => prev.map((m) => (m.id === materialId ? res.material : m)));
    }
    return { mode: res.mode };
  };

  const adjustInventoryStock = async (
    materialId: string,
    newStock: number,
    reason: string,
    type: InventoryMovement['type'] = 'AJUSTE'
  ) => {
    const updated = await api.post<Material>(`/inventory/materials/${materialId}/adjust`, { newStock, reason, type });
    setMaterials((prev) => prev.map((m) => (m.id === materialId ? updated : m)));
    const movements = await api.get<InventoryMovement[]>('/inventory/movements');
    setInventoryMovements(movements);
  };

  const createPurchase = async (purchaseData: {
    supplierId: string;
    invoiceDocumentNumber?: string;
    paymentMethod: PaymentMethod;
    items: { materialId: string; quantity: number; unitCost: number; discount?: number }[];
  }): Promise<Purchase> => {
    const created = await api.post<Purchase>('/inventory/purchases', purchaseData);
    setPurchases((prev) => [created, ...prev]);
    // A purchase also books an Expense (and, if paid in cash, a CashMovement)
    // server-side, so refresh those alongside stock/kardex.
    const [materialsRes, movements, expensesRes, freshCash] = await Promise.all([
      api.get<Material[]>('/inventory/materials'),
      api.get<InventoryMovement[]>('/inventory/movements'),
      api.get<Expense[]>('/cash/expenses'),
      api.get<CashRegister | null>('/cash/current'),
    ]);
    setMaterials(materialsRes);
    setInventoryMovements(movements);
    setExpenses(expensesRes);
    setCashRegister(freshCash || EMPTY_CASH_REGISTER);
    return created;
  };

  const createSupplier = async (supplierData: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> => {
    const created = await api.post<Supplier>('/inventory/suppliers', supplierData);
    setSuppliers((prev) => [created, ...prev]);
    return created;
  };

  const updateSupplier = async (supplierId: string, updates: Partial<Supplier>) => {
    const updated = await api.patch<Supplier>(`/inventory/suppliers/${supplierId}`, updates);
    setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? updated : s)));
  };

  const deleteSupplier = async (supplierId: string) => {
    await api.delete(`/inventory/suppliers/${supplierId}`);
    setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));
  };

  // ------------------------------------------------------------------
  // SERVICE CATALOG
  // ------------------------------------------------------------------

  const createServiceCatalogItem = async (item: Omit<ServiceCatalogItem, 'id'>): Promise<ServiceCatalogItem> => {
    const created = await api.post<ServiceCatalogItem>('/catalog', item);
    setServicesCatalog((prev) => [created, ...prev]);
    return created;
  };

  const updateServiceCatalogItem = async (id: string, updates: Partial<ServiceCatalogItem>) => {
    const updated = await api.patch<ServiceCatalogItem>(`/catalog/${id}`, updates);
    setServicesCatalog((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };

  // ------------------------------------------------------------------
  // CASH REGISTER & EXPENSES
  // ------------------------------------------------------------------

  const openCashRegister = async (initialAmount: number) => {
    const created = await api.post<CashRegister>('/cash/open', { initialAmount });
    setCashRegister(created);
  };

  const closeCashRegister = async (actualCashCounted: number) => {
    const updated = await api.post<CashRegister>('/cash/close', { actualCashCounted });
    setCashRegister(updated);
  };

  const addExpense = async (expense: {
    date: string;
    category: Expense['category'];
    description: string;
    amount: number;
    paidWith: PaymentMethod;
    receiptNumber?: string;
  }): Promise<Expense> => {
    const created = await api.post<Expense>('/cash/expenses', expense);
    setExpenses((prev) => [created, ...prev]);
    const freshCash = await api.get<CashRegister | null>('/cash/current');
    setCashRegister(freshCash || EMPTY_CASH_REGISTER);
    return created;
  };

  const refreshPartners = async () => {
    setPartners(await api.get<Partner[]>('/cash/partners'));
  };

  const capitalInjection = async (data: { partnerId: string; amount: number; description: string; method?: PaymentMethod }) => {
    const updated = await api.post<CashRegister>('/cash/capital-injection', data);
    setCashRegister(updated);
    await refreshPartners();
  };

  const capitalReturn = async (data: { partnerId: string; amount: number; description: string; method?: PaymentMethod }) => {
    const updated = await api.post<CashRegister>('/cash/capital-return', data);
    setCashRegister(updated);
    await refreshPartners();
  };

  const fetchCashMovementsReport = async (from: string, to: string): Promise<CashMovementsReport> => {
    return api.get<CashMovementsReport>(`/cash/movements?from=${from}&to=${to}`);
  };

  const fetchPartnerHistory = async (partnerId: string): Promise<PartnerMovementHistory> => {
    return api.get<PartnerMovementHistory>(`/cash/partners/${partnerId}/movements`);
  };

  const createPartner = async (data: { name: string; email?: string; phone?: string; notes?: string }) => {
    await api.post<Partner>('/cash/partners', data);
    await refreshPartners();
  };

  const updatePartner = async (
    partnerId: string,
    data: Partial<{ name: string; email: string; phone: string; notes: string; isActive: boolean }>
  ) => {
    await api.patch<Partner>(`/cash/partners/${partnerId}`, data);
    await refreshPartners();
  };

  const deletePartner = async (partnerId: string): Promise<{ mode: 'deleted' | 'deactivated' }> => {
    const result = await api.delete<{ mode: 'deleted' | 'deactivated' }>(`/cash/partners/${partnerId}`);
    await refreshPartners();
    return result;
  };

  // ------------------------------------------------------------------
  // TIENDA / VENTA DIRECTA
  // ------------------------------------------------------------------

  const createStoreProduct = async (product: Omit<StoreProduct, 'id' | 'isLowStock'>): Promise<StoreProduct> => {
    const created = await api.post<StoreProduct>('/store/products', product);
    setStoreProducts((prev) => [created, ...prev]);
    return created;
  };

  const updateStoreProduct = async (productId: string, updates: Partial<Omit<StoreProduct, 'id' | 'isLowStock'>>) => {
    const updated = await api.patch<StoreProduct>(`/store/products/${productId}`, updates);
    setStoreProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
  };

  const deleteStoreProduct = async (productId: string): Promise<{ mode: 'deleted' | 'deactivated' }> => {
    const res = await api.delete<{ mode: 'deleted' | 'deactivated'; product?: StoreProduct }>(`/store/products/${productId}`);
    if (res.mode === 'deleted') {
      setStoreProducts((prev) => prev.filter((p) => p.id !== productId));
    } else if (res.product) {
      setStoreProducts((prev) => prev.map((p) => (p.id === productId ? res.product! : p)));
    }
    return { mode: res.mode };
  };

  const uploadStoreProductImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post<{ url: string }>('/store/products/upload-image', formData);
    return res.url;
  };

  const processStoreSale = async (data: {
    items: { productId: string; quantity: number }[];
    paymentMethod: PaymentMethod;
    cashReceived: number;
    customerName?: string;
    customerDocument?: string;
  }): Promise<StoreSale> => {
    const sale = await api.post<StoreSale>('/store/sales', data);
    const [products, cashRes] = await Promise.all([
      api.get<StoreProduct[]>('/store/products'),
      api.get<CashRegister | null>('/cash/current'),
    ]);
    setStoreProducts(products);
    setCashRegister(cashRes || EMPTY_CASH_REGISTER);
    return sale;
  };

  const fetchStoreSales = async (from?: string, to?: string): Promise<StoreSale[]> => {
    const query = from && to ? `?from=${from}&to=${to}` : '';
    return api.get<StoreSale[]>(`/store/sales${query}`);
  };

  // ------------------------------------------------------------------
  // SETTINGS
  // ------------------------------------------------------------------

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = await api.patch<AppSettings>('/settings', newSettings);
    setSettings(updated);
  };

  // ------------------------------------------------------------------
  // TELEGRAM ALERTS (internal delivery-alert bot)
  // ------------------------------------------------------------------

  const sendTelegramTest = async (): Promise<void> => {
    await api.post<{ ok: boolean }>('/telegram/test');
  };

  // ------------------------------------------------------------------
  // USERS (RBAC administration)
  // ------------------------------------------------------------------

  const createUser = async (data: {
    name: string;
    email: string;
    password: string;
    role: User['role'];
    phone?: string;
    specialty?: string;
  }): Promise<User> => {
    const created = await api.post<User>('/users', data);
    setUsers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  };

  const toggleUserActive = async (userId: string, active: boolean) => {
    const updated = await api.patch<User>(`/users/${userId}`, { active });
    setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
  };

  const updateUser = async (
    userId: string,
    updates: Partial<{ name: string; role: User['role']; phone: string; specialty: string; password: string }>
  ) => {
    const updated = await api.patch<User>(`/users/${userId}`, updates);
    setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
  };

  const deleteUser = async (userId: string): Promise<{ mode: 'deleted' | 'deactivated' }> => {
    const res = await api.delete<{ mode: 'deleted' | 'deactivated'; user?: User }>(`/users/${userId}`);
    if (res.mode === 'deleted') {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } else if (res.user) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.user! : u)));
    }
    return { mode: res.mode };
  };

  if (!currentUser) {
    return null;
  }

  return (
    <AppContext.Provider
      value={{
        orders,
        customers,
        materials,
        inventoryMovements,
        servicesCatalog,
        suppliers,
        purchases,
        cashRegister,
        expenses,
        partners,
        storeProducts,
        users,
        currentUser,
        settings,
        isLoading,
        loadError,
        retryInitialLoad,
        createOrder,
        updateOrder,
        updateOrderStatus,
        updateDiagnosis,
        addPhotoToOrder,
        uploadOrderPhoto,
        addServiceToOrder,
        updateServiceItem,
        removeServiceFromOrder,
        updateOrderDiscount,
        approveBudget,
        rejectBudget,
        consumeMaterial,
        completeQualityControl,
        registerPayment,
        deliverOrder,
        createCustomer,
        updateCustomer,
        createMaterial,
        updateMaterial,
        deleteMaterial,
        adjustInventoryStock,
        createPurchase,
        createSupplier,
        updateSupplier,
        deleteSupplier,
        createServiceCatalogItem,
        updateServiceCatalogItem,
        openCashRegister,
        closeCashRegister,
        addExpense,
        capitalInjection,
        capitalReturn,
        fetchCashMovementsReport,
        fetchPartnerHistory,
        createPartner,
        updatePartner,
        deletePartner,
        createStoreProduct,
        updateStoreProduct,
        deleteStoreProduct,
        uploadStoreProductImage,
        processStoreSale,
        fetchStoreSales,
        generateSalesNote,
        triggerWhatsAppSend,
        whatsappPreview,
        closeWhatsAppPreview,
        toastMessage,
        dismissToast,
        updateSettings,
        sendTelegramTest,
        createUser,
        toggleUserActive,
        updateUser,
        deleteUser,
        refreshOrders,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
