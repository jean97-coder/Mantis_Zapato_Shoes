import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Sembrando datos de JC SHOE'S ERP...");

  // -------------------------------------------------------------
  // USERS: none are seeded — login is a single static master credential
  // defined in server/src/routes/auth.routes.ts, not backed by any User
  // row. User rows still exist as a model (for technician assignment /
  // attribution on service orders) but the demo data below no longer
  // references named staff, only generic role/station labels.
  // -------------------------------------------------------------

  // -------------------------------------------------------------
  // CUSTOMERS
  // -------------------------------------------------------------
  const customerData = [
    {
      firstName: 'Santiago',
      lastName: 'Guerrero',
      documentId: '1723456789',
      phone: '+593 98 412 9081',
      whatsapp: '+593984129081',
      email: 'santiago.guerrero@gmail.com',
      address: 'Av. República de El Salvador 890 y Portugal, Quito',
      notes: 'Cliente premium, coleccionista de botas Goodyear Welted y calzado artesanal.',
    },
    {
      firstName: 'Valeria',
      lastName: 'Montalvo',
      documentId: '1719876543',
      phone: '+593 99 789 0123',
      whatsapp: '+593997890123',
      email: 'valeria.montalvo@outlook.com',
      address: 'González Suárez N27-44, Quito',
      notes: 'Exige acabados finos en tacones de alta gama.',
    },
    {
      firstName: 'Diego',
      lastName: 'Albuja',
      documentId: '1705647382',
      phone: '+593 98 555 3322',
      whatsapp: '+593985553322',
      email: 'diego.albuja@hotmail.com',
      address: 'Cumbayá, Paseo San Francisco Casa 14',
      notes: 'Trae zapatillas para limpieza profunda periódica.',
    },
    {
      firstName: 'Lucía',
      lastName: 'Espinosa',
      documentId: '0918273645',
      phone: '+593 99 222 6677',
      whatsapp: '+593992226677',
      email: 'lucia.espinosa@gmail.com',
      address: 'La Floresta, Guipúzcoa 312',
      notes: 'Cuidado especial con cueros exóticos o gamuza clara.',
    },
    {
      firstName: 'Fernando',
      lastName: 'Paredes',
      documentId: '1711223344',
      phone: '+593 97 123 9988',
      whatsapp: '+593971239988',
      email: 'f.paredes@corporacion.ec',
      address: 'Av. 12 de Octubre y Lincoln',
      notes: 'Usa zapatos Oxford clásicos de oficina.',
    },
  ];

  const customers = [];
  for (const c of customerData) {
    const existing = await prisma.customer.findFirst({ where: { documentId: c.documentId } });
    customers.push(existing || (await prisma.customer.create({ data: c })));
  }
  const [cSantiago, cValeria, cDiego, cLucia, cFernando] = customers;

  // -------------------------------------------------------------
  // SUPPLIERS
  // -------------------------------------------------------------
  const supplierData = [
    { name: 'Curtiduría Tungurahua S.A.', tradeName: 'Cueros Ambato', ruc: '1890123456001', contactPerson: 'Ing. Marcelo Mayorga', phone: '+593 3 284 1100', email: 'ventas@cuerostungurahua.ec', address: 'Parque Industrial Ambato, Lote 14' },
    { name: 'Distribuidora Zapatera Andina Cía. Ltda.', tradeName: 'Andina Shoemaker Supplies', ruc: '1792345678001', contactPerson: 'Erika Villacís', phone: '+593 2 245 9988', email: 'pedidos@andinazapatera.com', address: 'Av. Gran Colombia y Tarqui, Quito' },
    { name: "Saphir & Tarrago Sudamérica", tradeName: 'Cuidado Premium Calzado', ruc: '1798765432001', contactPerson: 'Fabián Rosero', phone: '+593 99 876 5432', email: 'soporte@cuidadocalzado.com', address: 'Cumbayá Business Center Of. 302' },
  ];
  const suppliers = [];
  for (const s of supplierData) {
    const existing = await prisma.supplier.findFirst({ where: { ruc: s.ruc } });
    suppliers.push(existing || (await prisma.supplier.create({ data: s })));
  }
  const [supCueros, supAndina, supSaphir] = suppliers;

  // -------------------------------------------------------------
  // PARTNERS (Socios) — capital contributions/returns are tracked per partner
  // -------------------------------------------------------------
  const partnerData = [
    { name: 'Beatriz Vélez' },
    { name: 'Damaris Vélez' },
    { name: 'Diego Carguacungo' },
    { name: 'Juan Carguacundo' },
  ];
  for (const p of partnerData) {
    const existing = await prisma.partner.findFirst({ where: { name: p.name } });
    if (!existing) await prisma.partner.create({ data: p });
  }

  // -------------------------------------------------------------
  // MATERIALS
  // -------------------------------------------------------------
  const materialData = [
    { code: 'MAT-SUE-01', sku: 'VIB-MON-42', name: 'Suela Vibram Montagna Bloque Talla 42-44', category: 'Suelas', brand: 'Vibram', unit: 'Par', purchasePrice: 15.5, costPrice: 17.0, currentStock: 14, minStock: 4, supplierId: supAndina.id, location: 'Estante A-1' },
    { code: 'MAT-SUE-02', sku: 'SUE-CUE-ITA', name: 'Media suela de cuero curtido italiano 4mm', category: 'Suelas', brand: 'Cuoio di Toscana', unit: 'Par', purchasePrice: 9.0, costPrice: 10.0, currentStock: 8, minStock: 3, supplierId: supCueros.id, location: 'Estante A-2' },
    { code: 'MAT-TAC-01', sku: 'TAP-POL-TOP', name: 'Tapas de tacón poliuretano densidad 95A', category: 'Tapas de tacón', brand: 'Casali', unit: 'Par', purchasePrice: 2.2, costPrice: 2.5, currentStock: 28, minStock: 10, supplierId: supAndina.id, location: 'Cajón B-1' },
    { code: 'MAT-TAC-02', sku: 'TAC-MAD-FORR', name: 'Tacones cubanos de madera forrada en cuero', category: 'Tacones', brand: 'Artesanal', unit: 'Par', purchasePrice: 6.5, costPrice: 7.2, currentStock: 3, minStock: 5, supplierId: supCueros.id, location: 'Estante B-2' },
    { code: 'MAT-PEG-01', sku: 'PEG-REN-COL', name: 'Pegamento de contacto profesional Renia Colle de Cologne', category: 'Pegamentos', brand: 'Renia Germany', unit: 'Mililitro', purchasePrice: 0.04, costPrice: 0.05, currentStock: 1800, minStock: 500, supplierId: supAndina.id, location: 'Mesa Químicos 1' },
    { code: 'MAT-PEG-02', sku: 'PEG-RAP-ZAP', name: 'Cianocrilato flexible Kola Loka Zapatero', category: 'Pegamentos', brand: 'Kola Loka', unit: 'Unidad', purchasePrice: 1.8, costPrice: 2.0, currentStock: 2, minStock: 6, supplierId: supAndina.id, location: 'Gaveta A-3' },
    { code: 'MAT-TIN-01', sku: 'TIN-TAR-NEG', name: 'Tinte penetrante para cuero Negro Azabache', category: 'Tintas', brand: 'Tarrago', unit: 'Mililitro', purchasePrice: 0.08, costPrice: 0.09, currentStock: 650, minStock: 200, supplierId: supSaphir.id, location: 'Estante Pinturas C-1' },
    { code: 'MAT-PIN-01', sku: 'ANG-WHT-COL', name: 'Pintura Acrílica Flexible Sneaker Paint Blanco Puro', category: 'Pinturas', brand: 'Angelus', unit: 'Mililitro', purchasePrice: 0.12, costPrice: 0.14, currentStock: 80, minStock: 150, supplierId: supSaphir.id, location: 'Estante Pinturas C-2' },
    { code: 'MAT-CRE-01', sku: 'SAP-POM-MED', name: "Crema Pommadier Médaille d'Or Incolora", category: 'Cremas', brand: 'Saphir', unit: 'Gramo', purchasePrice: 0.18, costPrice: 0.2, currentStock: 350, minStock: 100, supplierId: supSaphir.id, location: 'Gaveta Tratamientos D-1' },
    { code: 'MAT-LIM-01', sku: 'SNK-FOA-CLE', name: 'Espuma limpiadora Sneakers Care pH Neutro', category: 'Productos de limpieza', brand: 'Tarrago', unit: 'Mililitro', purchasePrice: 0.05, costPrice: 0.06, currentStock: 2100, minStock: 500, supplierId: supSaphir.id, location: 'Zona Lavado' },
    { code: 'MAT-HIL-01', sku: 'HIL-ENC-ITA-08', name: 'Hilo encerado zapatero 0.8mm Marrón Oscuro', category: 'Hilos', brand: 'Filomar', unit: 'Metro', purchasePrice: 0.08, costPrice: 0.1, currentStock: 480, minStock: 100, supplierId: supAndina.id, location: 'Carrete 3 Taller' },
    { code: 'MAT-CREM-01', sku: 'CREM-YKK-NEG', name: 'Cremallera metálica reforzada YKK 25cm Negra', category: 'Cremalleras', brand: 'YKK', unit: 'Unidad', purchasePrice: 2.8, costPrice: 3.2, currentStock: 7, minStock: 5, supplierId: supAndina.id, location: 'Cajón C-4' },
  ];

  const materials: Record<string, Awaited<ReturnType<typeof prisma.material.create>>> = {};
  for (const m of materialData) {
    materials[m.sku] = await prisma.material.upsert({ where: { sku: m.sku }, update: {}, create: m });
  }

  // -------------------------------------------------------------
  // SERVICE CATALOG
  // -------------------------------------------------------------
  const serviceData = [
    { code: 'SUEL-001', name: 'Cambio de suela completo / Resole', category: 'REPARACIÓN Y CAMBIO DE SUELAS Y TACONES', description: 'Desmontaje de suela vencida, lijado de vira y prensado profesional.', estimatedMinutes: 180, standardPrice: 38.0 },
    { code: 'SUEL-003', name: 'Cambio de tapas de tacón', category: 'REPARACIÓN Y CAMBIO DE SUELAS Y TACONES', description: 'Retiro de tapas desgastadas y colocación de tapas nuevas.', estimatedMinutes: 45, standardPrice: 10.0 },
    { code: 'SUEL-006', name: 'Nivelación de tacón', category: 'REPARACIÓN Y CAMBIO DE SUELAS Y TACONES', description: 'Corrección de pisada y balance biomecánico del tacón.', estimatedMinutes: 40, standardPrice: 12.0 },
    { code: 'REST-001', name: 'Limpieza profunda', category: 'RESTAURACIÓN ESTÉTICA', description: 'Limpieza manual minuciosa con detergentes pH neutro.', estimatedMinutes: 60, standardPrice: 15.0 },
    { code: 'REST-007', name: 'Restauración de cuero y lustre espejo', category: 'RESTAURACIÓN ESTÉTICA', description: 'Lijado microfino y acabado glacage francés.', estimatedMinutes: 90, standardPrice: 25.0 },
    { code: 'REST-009', name: 'Pintura y unificación cromática', category: 'RESTAURACIÓN ESTÉTICA', description: 'Aerografía y pincelado de pigmentos flexibles.', estimatedMinutes: 120, standardPrice: 28.0 },
    { code: 'REST-011', name: 'Restauración de gamuza / ante / nobuk', category: 'RESTAURACIÓN ESTÉTICA', description: 'Cepillado, lavado especial y revitalizado de tono.', estimatedMinutes: 80, standardPrice: 24.0 },
    { code: 'REST-012', name: 'Nutrición e hidratación del cuero', category: 'RESTAURACIÓN ESTÉTICA', description: 'Bálsamos con ceras naturales para flexibilizar el cuero.', estimatedMinutes: 40, standardPrice: 10.0 },
    { code: 'AJUS-002', name: 'Ensanchamiento de empeine', category: 'AJUSTES Y COMODIDAD', description: 'Dilatación localizada en zonas de presión.', estimatedMinutes: 60, standardPrice: 16.0 },
    { code: 'COST-001', name: 'Reparación de costuras descosidas', category: 'COSTURAS Y ESTRUCTURA', description: 'Costura manual con hilo encerado reforzado.', estimatedMinutes: 60, standardPrice: 10.0 },
    { code: 'ACCE-001', name: 'Cambio de cremallera en bota/botín', category: 'CIERRES Y ACCESORIOS', description: 'Colocación de cremallera metálica YKK reforzada.', estimatedMinutes: 90, standardPrice: 16.0 },
    { code: 'PARC-001', name: 'Cambio de talonera interna de cuero', category: 'PARCHES INTERNOS', description: 'Parche anatómico en badana natural.', estimatedMinutes: 60, standardPrice: 12.0 },
  ];

  const services: Record<string, Awaited<ReturnType<typeof prisma.serviceCatalogItem.create>>> = {};
  for (const s of serviceData) {
    services[s.code] = await prisma.serviceCatalogItem.upsert({ where: { code: s.code }, update: {}, create: s });
  }

  // -------------------------------------------------------------
  // APP SETTINGS (singleton)
  // -------------------------------------------------------------
  await prisma.appSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      businessName: "JC SHOE'S",
      commercialName: "JC SHOE'S - El Arte de Renovar tu Calzado",
      ruc: '1792448899001',
      address: 'Av. República de El Salvador N34-112 y Suiza, Edificio Plaza, PB, Quito, Ecuador',
      phone: '+593 2 290 8877',
      whatsapp: '+593984129081',
      email: 'contacto@jcshoes.ec',
      website: 'https://jcshoes.ec',
      logoUrl: '',
      defaultCurrency: '$',
      taxRatePercent: 0,
      orderPrefix: 'OS-',
      nextOrderSequence: 106,
      standardServiceDays: 3,
      defaultConditions:
        '1. El calzado no retirado después de 60 días de la fecha de aviso será donado o rematado para cubrir costos de almacenaje.\n' +
        '2. Los materiales utilizados son de primera calidad certificada para zapatería de lujo.\n' +
        '3. Garantía de 30 días en costuras, pegados de suela y colocación de tapas.\n' +
        '4. Todo reclamo debe presentarse con la presente orden de servicio o nota de venta.',
      // Every emoji below is a single Unicode codepoint from the small, universally-
      // supported "safe" set (📦 📅 💰 ✅ 👟 💵 💳 👋 🔍 📍 🙌 🔧). We deliberately avoid
      // any emoji that requires a variation-selector or ZWJ sequence (e.g. 🛠️, ⏱️) —
      // those are the ones that render as broken/replacement glyphs on some WhatsApp
      // clients and older Android keyboards.
      whatsappTemplates: {
        ORDEN_RECIBIDA:
          'Hola *{NOMBRE}* 👋,\n\nHemos recibido tu calzado correctamente en *{NEGOCIO}*.\n\n👟 *Detalle:* {TIPO} {MARCA} {MODELO}\n📋 *Orden de Servicio:* *{ORDEN}*\n🔧 *Servicios:* {SERVICIOS}\n📅 *Fecha de recepción:* {FECHA_RECEPCION}\n📦 *Fecha estimada de entrega:* {FECHA_ENTREGA}\n\n💵 *Total:* ${TOTAL}\n💰 *Anticipo:* ${ANTICIPO}\n💳 *Saldo pendiente:* ${SALDO}\n\n¡Gracias por confiar en nosotros!',
        PRESUPUESTO:
          'Hola *{NOMBRE}*,\n\nTu calzado ({MARCA} {MODELO}) ya fue revisado por nuestros maestros artesanos.\n\n📋 *Orden:* *{ORDEN}*\n🔍 *Diagnóstico técnico:* {DIAGNOSTICO}\n🔧 *Trabajos recomendados:* {SERVICIOS}\n💵 *Presupuesto total:* ${TOTAL}\n\nPor favor confírmanos si apruebas el presupuesto.',
        APROBACION: '✅ ¡Excelente *{NOMBRE}*! Confirmamos la aprobación de tu orden *{ORDEN}*. El taller ha comenzado la restauración de tu {MARCA}.',
        EN_REPARACION: 'Hola *{NOMBRE}*, tu calzado (*{ORDEN}*) se encuentra en proceso activo de reparación en nuestro taller artesanal.',
        TERMINADA:
          'Hola *{NOMBRE}* ✅, ¡tu calzado {MARCA} ha sido restaurado y aprobado por control de calidad!\n\n📋 *Orden:* *{ORDEN}*\n💳 *Saldo pendiente:* ${SALDO}\n📍 *Dirección:* {DIRECCION}\n\n¡Te esperamos!',
        LISTO_PARA_ENTREGAR: 'Hola *{NOMBRE}*, tu orden *{ORDEN}* ({MARCA}) está lista para su entrega. Horario: Lunes a Sábado de 09:00 a 19:00.',
        RECORDATORIO: 'Estimado/a *{NOMBRE}*, tu orden *{ORDEN}* sigue lista y resguardada. Saldo: ${SALDO}. Por favor acércate a retirarla.',
        ENTREGA: '¡Muchas gracias por tu visita *{NOMBRE}*! 🙌 Tu orden *{ORDEN}* fue entregada con éxito. Garantía de 30 días en nuestros trabajos.',
      },
      whatsappIntegrationMode: 'DIRECT_WEB_AND_API',
    },
  });

  // -------------------------------------------------------------
  // SAMPLE ORDERS (only if none exist yet, to keep seed idempotent)
  // -------------------------------------------------------------
  const orderCount = await prisma.serviceOrder.count();
  if (orderCount === 0) {
    const today = new Date();
    const daysAgo = (n: number) => new Date(today.getTime() - n * 24 * 60 * 60 * 1000);
    const daysFromNow = (n: number) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000);

    // Order 1: in workshop, promised in 1 day (due-soon alert)
    const order1 = await prisma.serviceOrder.create({
      data: {
        orderNumber: 'OS-000101',
        date: daysAgo(3),
        promisedDate: daysFromNow(1),
        customerId: cSantiago.id,
        shoeType: 'Botas',
        shoeBrand: 'Red Wing',
        shoeModel: 'Iron Ranger 8111',
        shoeColor: 'Marrón Amber Harness',
        shoeSize: '42',
        shoeMaterial: 'Cuero',
        pairCount: 1,
        conditionDescription: 'Suela de nitrilo desgastada en metatarso, cuero reseco con marcas de lluvia.',
        currentStatusText: 'Trabajo en proceso en el taller de suelas.',
        clientObservations: 'Desea conservar la vira original y colocar suela Vibram con dibujo profundo.',
        diagnosis: {
          issuesFound: ['Suela vencida', 'Pérdida de tracción', 'Cuero deshidratado'],
          soleCondition: 'Desgastado',
          heelCondition: 'Desgastado',
          leatherCondition: 'Seco',
          stitchingCondition: 'Intactas',
          liningCondition: 'Intacto',
          zippersCondition: 'N/A',
          eyeletsCondition: 'Bueno',
          generalCondition: 'Aceptable',
          technicalNotes: 'La vira Goodyear está en excelente estado.',
          recommendedWork: 'Resole completo con Vibram Montagna + Hidratación profunda.',
          diagnosedBy: 'Taller',
          diagnosedAt: daysAgo(3).toISOString(),
        },
        subtotal: 48.0,
        discount: 3.0,
        taxes: 0,
        total: 45.0,
        laborCost: 28.0,
        materialCost: 17.0,
        budgetStatus: 'aprobado',
        budgetApprovedAt: daysAgo(3),
        status: 'EN_REPARACION',
        priority: 'NORMAL',
        generalObservations: 'Cliente frecuente. Notificar por WhatsApp cuando concluya el secado de suela.',
        totalPaid: 25.0,
        balancePending: 20.0,
        photos: {
          create: [
            { url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=80', type: 'suela', stage: 'recepcion', caption: 'Suela desgastada con agujero incipiente', registeredBy: 'Recepción' },
            { url: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800&auto=format&fit=crop&q=80', type: 'lateral', stage: 'recepcion', caption: 'Capellada reseca y polvo incrustado', registeredBy: 'Recepción' },
          ],
        },
        services: {
          create: [
            { serviceId: services['SUEL-001'].id, name: services['SUEL-001'].name, description: 'Colocación de suela Vibram y prensado profesional', price: 38.0, estimatedMinutes: 180, technicianName: 'Taller', status: 'en_proceso' },
            { serviceId: services['REST-012'].id, name: services['REST-012'].name, description: 'Bálsamo con cera de abeja y masajes en cuero', price: 10.0, estimatedMinutes: 40, technicianName: 'Taller', status: 'pendiente' },
          ],
        },
        materialsConsumed: {
          create: [
            { materialId: materials['VIB-MON-42'].id, quantity: 1, unitCost: 17.0, totalCost: 17.0, registeredBy: 'Taller', date: daysAgo(2) },
          ],
        },
        payments: {
          create: [{ receiptNumber: 'REC-00000101', customerId: cSantiago.id, amount: 25.0, method: 'EFECTIVO', type: 'ANTICIPO', registeredBy: 'Recepción', date: daysAgo(3) }],
        },
        timeline: {
          create: [
            { status: 'RECIBIDA', title: 'Calzado recibido en recepción', description: 'Se registró par de botas Red Wing y fotografías iniciales.', userName: 'Recepción', userRole: 'CAJERO', date: daysAgo(3) },
            { status: 'APROBADA', title: 'Presupuesto aprobado por cliente', description: 'Cliente aprobó el presupuesto de $45.00 con anticipo de $25.00.', userName: 'Recepción', userRole: 'CAJERO', date: daysAgo(3) },
            { status: 'EN_REPARACION', title: 'Iniciado trabajo en taller', description: 'Desbaste de suela antigua y aplicación de imprimante.', userName: 'Taller', userRole: 'ZAPATERO', date: daysAgo(2) },
          ],
        },
      },
    });

    // Order 2: ready for pickup
    await prisma.serviceOrder.create({
      data: {
        orderNumber: 'OS-000102',
        date: daysAgo(4),
        promisedDate: daysAgo(1),
        customerId: cDiego.id,
        shoeType: 'Zapatillas',
        shoeBrand: 'Nike',
        shoeModel: 'Air Jordan 1 Retro High OG Chicago',
        shoeColor: 'Blanco / Rojo / Negro',
        shoeSize: '41',
        shoeMaterial: 'Cuero',
        pairCount: 1,
        conditionDescription: 'Media suela amarilla y sucia, puntera descolorida.',
        currentStatusText: 'Control de calidad completado. Listo para entrega.',
        clientObservations: 'Exige mantener la apariencia original sin alterar el tono Chicago Red.',
        subtotal: 43.0,
        discount: 0,
        taxes: 0,
        total: 43.0,
        laborCost: 32.0,
        materialCost: 11.0,
        budgetStatus: 'aprobado',
        budgetApprovedAt: daysAgo(4),
        status: 'LISTA_PARA_ENTREGAR',
        priority: 'URGENTE',
        generalObservations: 'Cliente fue notificado por WhatsApp. Saldo pendiente $13.00.',
        totalPaid: 30.0,
        balancePending: 13.0,
        qualityControl: {
          checklist: {
            serviceExecutedProperly: true,
            soleProperlyAdhered: true,
            heelInspectedAndBalanced: true,
            stitchingInspected: true,
            deepCleanComplete: true,
            colorUniformAndSealed: true,
            noAdditionalDamage: true,
            finalPhotosCaptured: true,
          },
          observations: 'Acabado de fábrica impecable.',
          inspectorName: 'Control de Calidad',
          approved: true,
          inspectedAt: daysAgo(1).toISOString(),
        },
        photos: {
          create: [
            { url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80', type: 'frontal', stage: 'recepcion', caption: 'Puntera antes de limpieza', registeredBy: 'Recepción' },
            { url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80', type: 'despues', stage: 'final', caption: 'Resultado impecable tras limpieza y pintura', registeredBy: 'Taller' },
          ],
        },
        services: {
          create: [
            { serviceId: services['REST-001'].id, name: services['REST-001'].name, description: 'Limpieza con espuma especial', price: 15.0, estimatedMinutes: 60, technicianName: 'Taller', status: 'terminado' },
            { serviceId: services['REST-009'].id, name: services['REST-009'].name, description: 'Retoque puntera rojo Chicago y sellador', price: 28.0, estimatedMinutes: 120, technicianName: 'Taller', status: 'terminado' },
          ],
        },
        payments: {
          create: [{ receiptNumber: 'REC-00000102', customerId: cDiego.id, amount: 30.0, method: 'EFECTIVO', type: 'ANTICIPO', registeredBy: 'Recepción', date: daysAgo(4) }],
        },
        timeline: {
          create: [
            { status: 'RECIBIDA', title: 'Recepción de zapatillas Air Jordan 1', description: 'Registrado estado y fotografías del cliente.', userName: 'Recepción', date: daysAgo(4) },
            { status: 'LISTA_PARA_ENTREGAR', title: 'Control de calidad aprobado', description: 'Notificación WhatsApp enviada.', userName: 'Control de Calidad', date: daysAgo(1) },
          ],
        },
      },
    });

    // Order 3: overdue, in reparación, high priority
    await prisma.serviceOrder.create({
      data: {
        orderNumber: 'OS-000103',
        date: daysAgo(7),
        promisedDate: daysAgo(3),
        customerId: cValeria.id,
        shoeType: 'Tacones',
        shoeBrand: 'Christian Louboutin',
        shoeModel: 'So Kate 120mm',
        shoeColor: 'Negro Charol Suela Roja',
        shoeSize: '38',
        shoeMaterial: 'Cuero',
        pairCount: 1,
        conditionDescription: 'Tapas de tacón comidas hasta el metal, tacón desbalanceado.',
        currentStatusText: 'Atrasada - En espera de aprobación de tacón estructural.',
        clientObservations: 'Cuidado extremo con la suela roja icónica.',
        subtotal: 22.0,
        discount: 0,
        taxes: 0,
        total: 22.0,
        laborCost: 16.0,
        materialCost: 6.0,
        budgetStatus: 'aprobado',
        budgetApprovedAt: daysAgo(7),
        status: 'EN_REPARACION',
        priority: 'MUY_URGENTE',
        generalObservations: 'Fecha prometida superada. Prioridad máxima.',
        totalPaid: 10.0,
        balancePending: 12.0,
        photos: {
          create: [{ url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&auto=format&fit=crop&q=80', type: 'tacon', stage: 'recepcion', caption: 'Tapa de tacón destruida', registeredBy: 'Recepción' }],
        },
        services: {
          create: [
            { serviceId: services['SUEL-003'].id, name: services['SUEL-003'].name, description: 'Tapas de alta densidad para stiletto', price: 10.0, estimatedMinutes: 45, technicianName: 'Taller', status: 'en_proceso' },
            { serviceId: services['SUEL-006'].id, name: services['SUEL-006'].name, description: 'Alineación de pisada', price: 12.0, estimatedMinutes: 40, technicianName: 'Taller', status: 'en_proceso' },
          ],
        },
        payments: {
          create: [{ receiptNumber: 'REC-00000103', customerId: cValeria.id, amount: 10.0, method: 'EFECTIVO', type: 'ANTICIPO', registeredBy: 'Recepción', date: daysAgo(7) }],
        },
        timeline: {
          create: [
            { status: 'RECIBIDA', title: 'Recepción de tacones Louboutin', description: 'Cliente solicita cambio de tapas urgente.', userName: 'Recepción', date: daysAgo(7) },
            { status: 'EN_REPARACION', title: 'Trabajo iniciado', description: 'Nivelación en taller.', userName: 'Taller', date: daysAgo(6) },
          ],
        },
      },
    });

    // Order 4: delivered & closed
    await prisma.serviceOrder.create({
      data: {
        orderNumber: 'OS-000104',
        date: daysAgo(9),
        promisedDate: daysAgo(6),
        customerId: cFernando.id,
        shoeType: 'Zapatos',
        shoeBrand: "Church's",
        shoeModel: 'Consul Oxford Clásico',
        shoeColor: 'Negro',
        shoeSize: '43',
        shoeMaterial: 'Cuero',
        pairCount: 1,
        conditionDescription: 'Talonera rota en interior derecho y cuero opaco.',
        currentStatusText: 'Entregado y cerrado con éxito.',
        clientObservations: 'Dejar pulido como para evento formal.',
        subtotal: 37.0,
        discount: 2.0,
        taxes: 0,
        total: 35.0,
        laborCost: 25.0,
        materialCost: 10.0,
        budgetStatus: 'aprobado',
        budgetApprovedAt: daysAgo(9),
        status: 'ENTREGADA',
        priority: 'NORMAL',
        generalObservations: 'Entregado satisfactoriamente al titular.',
        totalPaid: 35.0,
        balancePending: 0,
        deliveryInfo: {
          deliveredAt: daysAgo(6).toISOString(),
          deliveredBy: 'Recepción',
          receivedByName: cFernando.firstName + ' ' + cFernando.lastName,
          documentNumber: cFernando.documentId,
          observations: 'Cliente satisfecho con el brillo y comodidad.',
          signatureConfirmed: true,
        },
        services: {
          create: [
            { serviceId: services['PARC-001'].id, name: services['PARC-001'].name, description: 'Badana natural anatómica acolchada', price: 12.0, estimatedMinutes: 60, technicianName: 'Taller', status: 'terminado' },
            { serviceId: services['REST-007'].id, name: services['REST-007'].name, description: 'Lustre glacage', price: 25.0, estimatedMinutes: 90, technicianName: 'Taller', status: 'terminado' },
          ],
        },
        payments: {
          create: [{ receiptNumber: 'REC-00000104', customerId: cFernando.id, amount: 35.0, method: 'TARJETA', type: 'COMPLETO', registeredBy: 'Recepción', date: daysAgo(6) }],
        },
        timeline: {
          create: [
            { status: 'RECIBIDA', title: "Recepción Church's Oxford", description: 'Ingreso a taller.', userName: 'Recepción', date: daysAgo(9) },
            { status: 'ENTREGADA', title: 'Calzado entregado al cliente', description: 'Pago final de $35.00 completado con tarjeta.', userName: 'Recepción', date: daysAgo(6) },
          ],
        },
      },
    });

    // Order 5: budget pending, freshly received
    await prisma.serviceOrder.create({
      data: {
        orderNumber: 'OS-000105',
        date: daysAgo(1),
        promisedDate: daysFromNow(3),
        customerId: cLucia.id,
        shoeType: 'Botines',
        shoeBrand: 'Timberland',
        shoeModel: 'Premium 6-Inch Waterproof',
        shoeColor: 'Amarillo Wheat / Miel',
        shoeSize: '39',
        shoeMaterial: 'Nobuk',
        pairCount: 1,
        conditionDescription: 'Manchas de barro seco, moho incipiente en caña.',
        currentStatusText: 'En diagnóstico técnico para formulación de limpieza de nobuk.',
        clientObservations: 'No oscurecer el tono original ni apelmazar el pelo.',
        diagnosis: {
          issuesFound: ['Moho en fibra de nobuk', 'Manchas de humedad', 'Pelo apelmazado'],
          soleCondition: 'Bueno',
          heelCondition: 'Bueno',
          leatherCondition: 'Manchado',
          stitchingCondition: 'Intactas',
          liningCondition: 'Intacto',
          zippersCondition: 'N/A',
          eyeletsCondition: 'Oxidado',
          generalCondition: 'Deteriorado',
          technicalNotes: 'Requiere desinfección fúngica sin agua agresiva.',
          recommendedWork: 'Eliminación de moho + Restauración de nobuk.',
          diagnosedBy: 'Taller',
          diagnosedAt: daysAgo(1).toISOString(),
        },
        subtotal: 40.0,
        discount: 0,
        taxes: 0,
        total: 40.0,
        laborCost: 30.0,
        materialCost: 10.0,
        budgetStatus: 'pendiente',
        status: 'PRESUPUESTO_PENDIENTE',
        priority: 'NORMAL',
        generalObservations: 'Esperando respuesta del cliente al presupuesto enviado a WhatsApp.',
        totalPaid: 0,
        balancePending: 40.0,
        photos: {
          create: [{ url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80', type: 'lateral', stage: 'recepcion', caption: 'Nobuk manchado con salitre y moho', registeredBy: 'Recepción' }],
        },
        services: {
          create: [
            { serviceId: services['REST-011'].id, name: services['REST-011'].name, description: 'Peinado de fibra y reactivación de color Wheat', price: 24.0, estimatedMinutes: 80, technicianName: 'Taller', status: 'pendiente' },
          ],
        },
        timeline: {
          create: [
            { status: 'RECIBIDA', title: 'Recepción botines Timberland', description: 'Ingreso para restauración estética de nobuk.', userName: 'Recepción', date: daysAgo(1) },
            { status: 'PRESUPUESTO_PENDIENTE', title: 'Presupuesto emitido', description: 'Presupuesto por $40.00 enviado al cliente.', userName: 'Recepción', date: daysAgo(1) },
          ],
        },
      },
    });

    console.log(`✅ Órdenes de ejemplo creadas (incluye ${order1.orderNumber} próxima a vencer).`);
  } else {
    console.log('ℹ️  Ya existen órdenes en la base de datos, se omite la creación de datos de ejemplo.');
  }

  // -------------------------------------------------------------
  // CASH REGISTER
  // -------------------------------------------------------------
  const openRegister = await prisma.cashRegister.findFirst({ where: { status: 'ABIERTA' } });
  if (!openRegister) {
    await prisma.cashRegister.create({
      data: {
        openedBy: 'Recepción',
        initialAmount: 80.0,
        currentCash: 145.0,
        expectedCash: 145.0,
        status: 'ABIERTA',
        movements: {
          create: [
            { type: 'INGRESO_MANUAL', amount: 80.0, concept: 'Fondo de apertura de caja inicial', paymentMethod: 'EFECTIVO', registeredBy: 'Recepción' },
            { type: 'ANTICIPO', amount: 40.0, concept: 'Anticipo por orden OS-000101', paymentMethod: 'EFECTIVO', registeredBy: 'Recepción' },
            { type: 'PAGO_ORDEN', amount: 25.0, concept: 'Cobro por servicio rápido de lustrado y plantillas', paymentMethod: 'EFECTIVO', registeredBy: 'Recepción' },
          ],
        },
      },
    });
  }

  // -------------------------------------------------------------
  // EXPENSES
  // -------------------------------------------------------------
  const expenseCount = await prisma.expense.count();
  if (expenseCount === 0) {
    await prisma.expense.createMany({
      data: [
        { category: 'Arriendo', description: 'Arriendo mensual del local comercial', amount: 550.0, receiptNumber: 'FAC-00129', paidWith: 'TRANSFERENCIA', registeredBy: 'Administración' },
        { category: 'Servicios básicos', description: 'Factura eléctrica y agua potable', amount: 68.4, receiptNumber: 'EEQ-9982', paidWith: 'TRANSFERENCIA', registeredBy: 'Administración' },
        { category: 'Materiales', description: 'Compra de pegamentos especiales y lijas para taller', amount: 85.0, receiptNumber: 'FAC-8812', paidWith: 'EFECTIVO', registeredBy: 'Taller' },
        { category: 'Internet', description: 'Servicio de fibra óptica 300 Mbps', amount: 39.2, receiptNumber: 'FAC-NET-45', paidWith: 'TRANSFERENCIA', registeredBy: 'Administración' },
      ],
    });
  }

  console.log('✅ Seed completado.');
  console.log('');
  console.log('Acceso: credencial única de administrador (ver server/src/routes/auth.routes.ts).');
  console.log('Socios sembrados: Beatriz Vélez, Damaris Vélez, Diego Carguacungo, Juan Carguacundo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
