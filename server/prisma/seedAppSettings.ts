import { PrismaClient } from '@prisma/client';

// Crea unicamente la fila singleton de AppSettings si no existe todavia.
// A diferencia de seed.ts (que siembra un dataset completo de demostracion:
// clientes, proveedores, ordenes de ejemplo, caja, gastos), este script es
// seguro para correr en produccion: no toca ninguna otra tabla, y el
// upsert no sobreescribe la configuracion si la fila ya existe.

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.appSettings.upsert({
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
      standardServiceDays: 3,
      defaultConditions:
        '1. El calzado no retirado después de 60 días de la fecha de aviso será donado o rematado para cubrir costos de almacenaje.\n' +
        '2. Los materiales utilizados son de primera calidad certificada para zapatería de lujo.\n' +
        '3. Garantía de 30 días en costuras, pegados de suela y colocación de tapas.\n' +
        '4. Todo reclamo debe presentarse con la presente orden de servicio o nota de venta.',
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

  console.log(`✅ AppSettings singleton listo (businessName: "${settings.businessName}").`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
