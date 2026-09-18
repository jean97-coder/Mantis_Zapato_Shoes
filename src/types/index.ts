export type UserRole = 'ADMIN' | 'CAJERO' | 'ZAPATERO' | 'SOCIO_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  active: boolean;
  phone?: string;
  specialty?: string;
}

export type ShoeType = 
  | 'Zapatos'
  | 'Zapatillas'
  | 'Botas'
  | 'Botines'
  | 'Tacones'
  | 'Sandalias'
  | 'Mocasines'
  | 'Calzado deportivo'
  | 'Otros';

export type ShoeMaterial = 
  | 'Cuero'
  | 'Gamuza / ante'
  | 'Sintético'
  | 'Tela'
  | 'Lona'
  | 'Nobuk'
  | 'Otros';

export type PhotoType = 
  | 'frontal'
  | 'lateral'
  | 'trasera'
  | 'suela'
  | 'tacon'
  | 'dano'
  | 'interior'
  | 'otra'
  | 'despues';

export interface ShoePhoto {
  id: string;
  url: string;
  type: PhotoType;
  stage: 'recepcion' | 'diagnostico' | 'taller' | 'final';
  caption?: string;
  date: string;
  registeredBy: string;
}

export interface ShoeDetails {
  type: ShoeType;
  brand: string;
  model: string;
  color: string;
  size: string;
  material: ShoeMaterial;
  pairCount: number;
  conditionDescription: string;
  currentStatusText: string;
  clientObservations: string;
}

export interface Diagnosis {
  issuesFound: string[];
  soleCondition: 'Bueno' | 'Desgastado' | 'Perforado' | 'Despegado' | 'N/A';
  heelCondition: 'Bueno' | 'Desgastado' | 'Tapa destruida' | 'Desalineado' | 'N/A';
  leatherCondition: 'Seco' | 'Cuarteado' | 'Manchado' | 'Descolorido' | 'Óptimo' | 'N/A';
  stitchingCondition: 'Intactas' | 'Rotas en puntera' | 'Descosido lateral' | 'Falta hilo' | 'N/A';
  liningCondition: 'Intacto' | 'Talonera rota' | 'Desgastado' | 'Rasgado' | 'N/A';
  zippersCondition: 'N/A' | 'Bueno' | 'Atascado' | 'Dientes rotos';
  eyeletsCondition: 'Bueno' | 'Oxidado' | 'Faltante' | 'N/A';
  generalCondition: 'Excelente' | 'Aceptable' | 'Deteriorado' | 'Crítico' | 'N/A';
  technicalNotes: string;
  recommendedWork: string;
  diagnosedBy: string;
  diagnosedAt: string;
}

// Historic fixed set, kept only as suggestions for the category combobox —
// the field itself is free text (matches Material.category / the backend,
// which accepts any string) so new categories can be created on the fly.
export const SERVICE_CATEGORY_SUGGESTIONS = [
  'REPARACIÓN Y CAMBIO DE SUELAS Y TACONES',
  'RESTAURACIÓN ESTÉTICA',
  'AJUSTES Y COMODIDAD',
  'COSTURAS Y ESTRUCTURA',
  'CIERRES Y ACCESORIOS',
  'PARCHES INTERNOS',
] as const;

export interface ServiceCatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  estimatedMinutes: number;
  standardPrice: number;
  recommendedMaterials?: { materialId: string; quantity: number; unit: string }[];
}

export interface OrderServiceItem {
  id: string;
  serviceId?: string;
  name: string;
  description: string;
  price: number;
  estimatedMinutes: number;
  technicianId?: string;
  technicianName?: string;
  status: 'pendiente' | 'en_proceso' | 'terminado' | 'cancelado';
  notes?: string;
}

// One pair of shoes within an order. An order groups one or more of these —
// each with its own shoe attributes, diagnosis, photos and assigned services —
// under a single customer/ticket/advance payment. `currentStatusText` lives
// only on the order as a whole (see ShoeDetails/ServiceOrder), not per pair.
export type ShoePairDetails = Omit<ShoeDetails, 'currentStatusText'>;

export interface OrderShoeItem {
  id: string;
  position: number;
  shoe: ShoePairDetails;
  diagnosis?: Diagnosis;
  photos: ShoePhoto[];
  services: OrderServiceItem[];
}

export type DiscountType = 'FIXED' | 'PERCENT';

export interface Budget {
  subtotal: number;
  discount: number;
  discountType: DiscountType;
  discountValue: number;
  taxes: number;
  total: number;
  laborCost: number;
  materialCost: number;
  status: 'pendiente' | 'aprobado' | 'rechazado' | 'modificado';
  approvedAt?: string;
  rejectionReason?: string;
}

export type OrderStatus = 
  | 'RECIBIDA'
  | 'EN_DIAGNOSTICO'
  | 'PRESUPUESTO_PENDIENTE'
  | 'APROBADA'
  | 'EN_ESPERA_DE_MATERIAL'
  | 'EN_REPARACION'
  | 'EN_RESTAURACION'
  | 'CONTROL_CALIDAD'
  | 'TERMINADA'
  | 'LISTA_PARA_ENTREGAR'
  | 'PENDIENTE_DE_PAGO'
  | 'ENTREGADA'
  | 'CERRADA'
  | 'CANCELADA'
  | 'RECHAZADA'
  | 'NO_RETIRADA';

export type OrderPriority = 'NORMAL' | 'URGENTE' | 'MUY_URGENTE';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  documentId?: string; // Cédula o RUC
  phone: string;
  whatsapp: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  totalSpent: number;
  ordersCount: number;
  lastVisit: string;
}

export interface OrderTimelineEvent {
  id: string;
  status: OrderStatus | string;
  title: string;
  description: string;
  date: string;
  time: string;
  userName: string;
  userRole?: string;
}

export interface MaterialConsumption {
  id: string;
  orderId: string;
  orderNumber: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  registeredBy: string;
  date: string;
}

export interface QualityControlCheck {
  checklist: {
    serviceExecutedProperly: boolean;
    soleProperlyAdhered: boolean;
    stitchingInspected: boolean;
    noAdditionalDamage: boolean;
    colorUniformAndSealed: boolean;
  };
  observations: string;
  inspectorId: string;
  inspectorName: string;
  approved: boolean;
  inspectedAt: string;
}

export interface DeliveryRecord {
  deliveredAt: string;
  deliveredBy: string;
  receivedByName: string;
  documentNumber?: string;
  observations?: string;
  signatureConfirmed: boolean;
  exceptionAuthorized?: boolean;
  exceptionReason?: string;
}

export type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'OTRO';
export type PaymentType = 'ANTICIPO' | 'PARCIAL' | 'FINAL' | 'COMPLETO';

export interface Payment {
  id: string;
  orderId: string;
  orderNumber: string;
  receiptNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  time: string;
  amount: number;
  method: PaymentMethod;
  type: PaymentType;
  reference?: string;
  cashReceived?: number;
  changeGiven?: number;
  registeredBy: string;
  notes?: string;
}

export interface ServiceOrder {
  id: string;
  orderNumber: string; // e.g. OS-000101
  date: string;
  time: string;
  promisedDate: string;
  customerId: string;
  customer: Customer;
  shoe: ShoeDetails;
  photos: ShoePhoto[];
  diagnosis?: Diagnosis;
  services: OrderServiceItem[];
  /** Full per-pair breakdown (own shoe attrs, diagnosis, photos, services). `shoe`/`diagnosis`/`photos`/`services` above always mirror items[0] + the flattened totals for single-pair views. */
  items: OrderShoeItem[];
  budget: Budget;
  status: OrderStatus;
  priority: OrderPriority;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  branch: string;
  generalObservations: string;
  serviceConditionsAgreed: boolean;
  totalPaid: number;
  balancePending: number;
  materialsConsumed: MaterialConsumption[];
  payments: Payment[];
  qualityControl?: QualityControlCheck;
  deliveryInfo?: DeliveryRecord;
  timeline: OrderTimelineEvent[];
  whatsappMessages?: WhatsAppMessageRecord[];
  isOverdue?: boolean;
  isDueSoon?: boolean;
}

export type MaterialUnit = 
  | 'Unidad'
  | 'Par'
  | 'Metro'
  | 'Centímetro'
  | 'Litro'
  | 'Mililitro'
  | 'Kilogramo'
  | 'Gramo'
  | 'Rollo'
  | 'Caja';

export interface Material {
  id: string;
  code: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  unit: MaterialUnit;
  purchasePrice: number;
  costPrice: number;
  currentStock: number;
  minStock: number;
  supplierId?: string;
  supplierName?: string;
  location?: string;
  status: 'activo' | 'inactivo';
  isTool?: boolean;
}

export interface InventoryMovement {
  id: string;
  date: string;
  time: string;
  materialId: string;
  materialName: string;
  type: 'ENTRADA' | 'SALIDA' | 'COMPRA' | 'CONSUMO_ORDEN' | 'AJUSTE' | 'PERDIDA' | 'DANO' | 'DEVOLUCION';
  quantity: number;
  unit: string;
  previousStock: number;
  newStock: number;
  reason: string;
  orderId?: string;
  orderNumber?: string;
  registeredBy: string;
}

export interface Supplier {
  id: string;
  name: string;
  tradeName: string;
  ruc: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  createdAt: string;
}

export interface PurchaseItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  discount: number;
  total: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string; // OC-0001
  supplierId: string;
  supplierName: string;
  date: string;
  invoiceDocumentNumber: string;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  taxes: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: 'COMPLETADA' | 'PENDIENTE';
  registeredBy: string;
}

export interface CashMovement {
  id: string;
  date: string;
  time: string;
  type:
    | 'ANTICIPO'
    | 'PAGO_ORDEN'
    | 'VENTA'
    | 'GASTO'
    | 'RETIRO'
    | 'INGRESO_MANUAL'
    | 'DEVOLUCION'
    | 'APORTE_CAPITAL'
    | 'DEVOLUCION_CAPITAL';
  amount: number;
  concept: string;
  paymentMethod: PaymentMethod;
  orderId?: string;
  orderNumber?: string;
  expenseId?: string;
  partnerId?: string;
  partnerName?: string;
  cashReceived?: number;
  changeGiven?: number;
  registeredBy: string;
}

export interface CashMovementsReport {
  from: string;
  to: string;
  movements: CashMovement[];
  summary: {
    totalIngresos: number;
    totalEgresos: number;
    totalAportes: number;
    totalDevolucionesCapital: number;
    balance: number;
    count: number;
  };
}

export interface PartnerMovementHistoryEntry {
  id: string;
  date: string;
  time: string;
  type: 'APORTE_CAPITAL' | 'DEVOLUCION_CAPITAL';
  amount: number;
  concept: string;
  paymentMethod: PaymentMethod;
  registeredBy: string;
  runningBalance: number;
}

export interface PartnerMovementHistory {
  partnerId: string;
  partnerName: string;
  history: PartnerMovementHistoryEntry[];
}

export interface Partner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  isActive: boolean;
  totalContributed: number;
  totalReturned: number;
  pendingBalance: number;
}

export interface CashRegister {
  id: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  initialAmount: number;
  currentCash: number;
  expectedCash: number;
  actualCashCounted?: number;
  difference?: number;
  status: 'ABIERTA' | 'CERRADA';
  movements: CashMovement[];
}

export type ExpenseCategory =
  | 'Arriendo'
  | 'Servicios básicos'
  | 'Internet'
  | 'Transporte'
  | 'Publicidad'
  | 'Sueldos'
  | 'Pago a Proveedor'
  | 'Mantenimiento'
  | 'Materiales'
  | 'Herramientas'
  | 'Otros';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  receiptNumber?: string;
  paidWith: PaymentMethod;
  registeredBy: string;
}

export interface SalesNoteItem {
  serviceOrMaterialName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export interface SalesNote {
  id: string;
  noteNumber: string; // NV-000101
  orderId: string;
  orderNumber: string;
  date: string;
  customerName: string;
  customerDocument?: string;
  customerPhone: string;
  customerAddress?: string;
  items: SalesNoteItem[];
  subtotal: number;
  discount: number;
  taxes: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashierName: string;
  payments?: Array<{
    id: string;
    date: string;
    time: string;
    amount: number;
    method: PaymentMethod;
    type: PaymentType;
    receiptNumber: string;
    cashReceived?: number;
    changeGiven?: number;
  }>;
  totalPaid?: number;
  balancePending?: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  recordId?: string;
  details: string;
}

export interface WhatsAppTemplate {
  key: string;
  title: string;
  description: string;
  template: string;
}

export interface WhatsAppMessageRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  messageText: string;
  templateType: string;
  sentAt: string;
  status: 'ENVIADO' | 'PENDIENTE' | 'FALLIDO';
  deliveryMode: 'DIRECT_WEB' | 'CLOUD_API_SIMULATED';
}

export interface StoreProduct {
  id: string;
  code?: string;
  name: string;
  description: string;
  size: string;
  color: string;
  style: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  imageUrl?: string;
  active: boolean;
  isLowStock: boolean;
}

export interface StoreSaleItem {
  id: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface StoreSale {
  id: string;
  saleNumber: string;
  date: string;
  time: string;
  customerName?: string;
  customerDocument?: string;
  subtotal: number;
  taxRatePercent: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  changeGiven: number;
  registeredBy: string;
  items: StoreSaleItem[];
}

export interface AppSettings {
  businessName: string;
  commercialName: string;
  ruc: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  logoUrl: string;
  defaultCurrency: string;
  taxRatePercent: number;
  orderPrefix: string;
  nextOrderSequence: number;
  storeSalePrefix: string;
  nextStoreSaleSequence: number;
  standardServiceDays: number;
  defaultConditions: string;
  whatsappTemplates: Record<string, string>;
  whatsappIntegrationMode: 'DIRECT_WEB_AND_API' | 'CLOUD_API_ONLY';
}
