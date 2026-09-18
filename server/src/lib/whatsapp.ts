interface SerializedOrderForWA {
  orderNumber: string;
  date: string;
  promisedDate: string;
  total: number;
  totalPaid: number;
  balancePending: number;
  customer: { firstName: string; lastName: string };
  shoe: { type: string; brand: string; model: string };
  services: { name: string; price: number }[];
  diagnosis?: { recommendedWork?: string; technicalNotes?: string };
  budget?: { total: number };
  items?: { shoe: { type: string; brand: string; model: string }; services: { name: string; price: number }[] }[];
}

interface AppSettingsLike {
  businessName: string;
  address: string | null;
  whatsappTemplates: unknown;
}

export class WhatsAppTemplateService {
  static formatMessage(templateType: string, order: any, settings: AppSettingsLike, customNotes?: string): string {
    const templates = (settings.whatsappTemplates as Record<string, string>) || {};
    const template = templates[templateType] || templates['ORDEN_RECIBIDA'] || '';

    const hasMultiplePairs = Array.isArray(order.items) && order.items.length > 1;

    const servicesList = hasMultiplePairs
      ? order.items
          .map((it: any, idx: number) =>
            `Par ${idx + 1} (${it.shoe.type} ${it.shoe.brand}):\n` +
            (it.services.map((s: any) => `• ${s.name} ($${s.price.toFixed(2)})`).join('\n') || '• Diagnóstico y mantenimiento')
          )
          .join('\n')
      : order.services.map((s: any) => `• ${s.name} ($${s.price.toFixed(2)})`).join('\n') || 'Diagnóstico y mantenimiento';
    const diagnosisText = order.diagnosis?.recommendedWork || order.diagnosis?.technicalNotes || 'Revisión técnica de estructura y capellada';

    const shoeTipo = hasMultiplePairs ? `${order.items.length} pares` : order.shoe.type;
    const shoeMarca = hasMultiplePairs ? order.items.map((it: any) => it.shoe.brand).join(' + ') : order.shoe.brand;
    const shoeModelo = hasMultiplePairs ? order.items.map((it: any) => it.shoe.model).filter(Boolean).join(' + ') : order.shoe.model;

    let text = template
      .replace(/{NOMBRE}/g, `${order.customer.firstName} ${order.customer.lastName}`.trim())
      .replace(/{NEGOCIO}/g, settings.businessName)
      .replace(/{TIPO}/g, shoeTipo)
      .replace(/{MARCA}/g, shoeMarca)
      .replace(/{MODELO}/g, shoeModelo)
      .replace(/{ORDEN}/g, order.orderNumber)
      .replace(/{SERVICIOS}/g, servicesList)
      .replace(/{DIAGNOSTICO}/g, diagnosisText)
      .replace(/{FECHA_RECEPCION}/g, order.date)
      .replace(/{FECHA_ENTREGA}/g, order.promisedDate)
      .replace(/{TOTAL}/g, order.budget.total.toFixed(2))
      .replace(/{ANTICIPO}/g, order.totalPaid.toFixed(2))
      .replace(/{SALDO}/g, order.balancePending.toFixed(2))
      .replace(/{DIRECCION}/g, settings.address || '');

    if (customNotes) {
      text += `\n\n📌 *Nota adicional:* ${customNotes}`;
    }

    return text;
  }

  /**
   * Normalizes a customer phone to the full international digits-only format
   * wa.me requires (e.g. 593998808926) — country code, no "+", no spaces,
   * dashes, or leading trunk "0". Customers are stored in the local Ecuadorian
   * mobile format (e.g. 0998808926), which wa.me silently rejects: it keeps
   * the leading 0 and never resolves to a valid chat. Numbers already saved
   * with the country code pass through untouched.
   */
  static sanitizePhone(phone: string): string {
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) {
      return `593${digits.slice(1)}`;
    }
    return digits;
  }

  static getWhatsAppUrl(phone: string, message: string): string {
    const cleanPhone = this.sanitizePhone(phone);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }
}
