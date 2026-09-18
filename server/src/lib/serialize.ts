import { Prisma } from '@prisma/client';

export function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function timeStr(d: Date): string {
  return d.toISOString().substring(11, 16);
}

const orderInclude = {
  customer: true,
  items: {
    orderBy: { position: 'asc' as const },
    include: {
      photos: { orderBy: { date: 'asc' as const } },
      services: true,
    },
  },
  photos: { orderBy: { date: 'asc' as const } },
  services: true,
  materialsConsumed: { include: { material: true }, orderBy: { date: 'asc' as const } },
  payments: { orderBy: { date: 'desc' as const } },
  timeline: { orderBy: { date: 'desc' as const } },
  salesNote: true,
  whatsappMessages: { orderBy: { sentAt: 'desc' as const } },
} satisfies Prisma.ServiceOrderInclude;

export type FullOrder = Prisma.ServiceOrderGetPayload<{ include: typeof orderInclude }>;

export const ORDER_INCLUDE = orderInclude;

function serializePhoto(p: { id: string; url: string; type: string; stage: string; caption: string | null; date: Date; registeredBy: string }) {
  return {
    id: p.id,
    url: p.url,
    type: p.type,
    stage: p.stage,
    caption: p.caption ?? undefined,
    date: p.date.toISOString(),
    registeredBy: p.registeredBy,
  };
}

function serializeServiceItem(s: {
  id: string; serviceId: string | null; name: string; description: string; price: number;
  estimatedMinutes: number; technicianId: string | null; technicianName: string | null; status: string; notes: string | null;
}) {
  return {
    id: s.id,
    serviceId: s.serviceId ?? undefined,
    name: s.name,
    description: s.description,
    price: s.price,
    estimatedMinutes: s.estimatedMinutes,
    technicianId: s.technicianId ?? undefined,
    technicianName: s.technicianName ?? undefined,
    status: s.status,
    notes: s.notes ?? undefined,
  };
}

export function serializeOrder(order: FullOrder) {
  const promisedDate = dateStr(order.promisedDate);
  const today = dateStr(new Date());
  const isDelivered = ['ENTREGADA', 'CERRADA', 'CANCELADA', 'RECHAZADA'].includes(order.status);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    date: dateStr(order.date),
    time: timeStr(order.date),
    promisedDate,
    customerId: order.customerId,
    customer: order.customer,
    shoe: {
      type: order.shoeType,
      brand: order.shoeBrand,
      model: order.shoeModel,
      color: order.shoeColor,
      size: order.shoeSize,
      material: order.shoeMaterial,
      pairCount: order.pairCount,
      conditionDescription: order.conditionDescription,
      currentStatusText: order.currentStatusText,
      clientObservations: order.clientObservations,
    },
    photos: order.photos.map(serializePhoto),
    diagnosis: order.diagnosis ?? undefined,
    services: order.services.map(serializeServiceItem),
    items: order.items.map((item) => ({
      id: item.id,
      position: item.position,
      shoe: {
        type: item.type,
        brand: item.brand,
        model: item.model,
        color: item.color,
        size: item.size,
        material: item.material,
        pairCount: item.pairCount,
        conditionDescription: item.conditionDescription,
        clientObservations: item.clientObservations,
      },
      diagnosis: item.diagnosis ?? undefined,
      photos: item.photos.map(serializePhoto),
      services: item.services.map(serializeServiceItem),
    })),
    budget: {
      subtotal: order.subtotal,
      discount: order.discount,
      discountType: order.discountType,
      discountValue: order.discountValue,
      taxes: order.taxes,
      total: order.total,
      laborCost: order.laborCost,
      materialCost: order.materialCost,
      status: order.budgetStatus,
      approvedAt: order.budgetApprovedAt?.toISOString(),
      rejectionReason: order.budgetRejectionReason ?? undefined,
    },
    status: order.status,
    priority: order.priority,
    assignedTechnicianId: order.assignedTechnicianId ?? undefined,
    assignedTechnicianName: order.assignedTechnicianName ?? undefined,
    branch: order.branch,
    generalObservations: order.generalObservations,
    serviceConditionsAgreed: order.serviceConditionsAgreed,
    totalPaid: order.totalPaid,
    balancePending: order.balancePending,
    materialsConsumed: order.materialsConsumed.map((m) => ({
      id: m.id,
      orderId: m.orderId,
      orderNumber: order.orderNumber,
      materialId: m.materialId,
      materialName: m.material.name,
      quantity: m.quantity,
      unit: m.material.unit,
      unitCost: m.unitCost,
      totalCost: m.totalCost,
      registeredBy: m.registeredBy,
      date: m.date.toISOString(),
    })),
    payments: order.payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      orderNumber: order.orderNumber,
      receiptNumber: p.receiptNumber,
      customerId: p.customerId,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      date: dateStr(p.date),
      time: timeStr(p.date),
      amount: p.amount,
      method: p.method,
      type: p.type,
      reference: p.reference ?? undefined,
      cashReceived: p.cashReceived ?? undefined,
      changeGiven: p.changeGiven ?? undefined,
      registeredBy: p.registeredBy,
      notes: p.notes ?? undefined,
    })),
    qualityControl: order.qualityControl ?? undefined,
    deliveryInfo: order.deliveryInfo ?? undefined,
    timeline: order.timeline.map((t) => ({
      id: t.id,
      status: t.status,
      title: t.title,
      description: t.description,
      date: dateStr(t.date),
      time: timeStr(t.date),
      userName: t.userName,
      userRole: t.userRole ?? undefined,
    })),
    whatsappMessages: order.whatsappMessages.map((w) => ({
      id: w.id,
      orderId: w.orderId,
      orderNumber: order.orderNumber,
      customerName: w.customerName,
      customerPhone: w.customerPhone,
      messageText: w.messageText,
      templateType: w.templateType,
      sentAt: w.sentAt.toISOString(),
      status: w.status,
      deliveryMode: w.deliveryMode,
    })),
    isOverdue: !isDelivered && promisedDate < today,
    isDueSoon:
      !isDelivered &&
      promisedDate >= today &&
      new Date(promisedDate).getTime() - new Date(today).getTime() <= 3 * 24 * 60 * 60 * 1000,
  };
}
