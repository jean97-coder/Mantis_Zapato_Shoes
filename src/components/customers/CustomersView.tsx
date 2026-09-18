import React, { useState, useMemo } from 'react';
import { Customer, ServiceOrder } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  Search, 
  Plus, 
  MessageCircle, 
  Phone, 
  Mail, 
  MapPin, 
  Footprints, 
  DollarSign, 
  Eye, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/Badge';
import { buildWhatsAppUrl } from '../../lib/whatsapp';

interface CustomersViewProps {
  onSelectOrder: (order: ServiceOrder) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ onSelectOrder }) => {
  const { customers, orders, createCustomer, updateCustomer, settings } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // New Customer Modal
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newDoc, setNewDoc] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newWhatsApp, setNewWhatsApp] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Customer order history & metrics
  const getCustomerStats = (customerId: string) => {
    const custOrders = orders.filter(o => o.customerId === customerId);
    const totalSpent = custOrders.reduce((acc, o) => acc + o.budget.total, 0);
    const activeOrders = custOrders.filter(o => !['ENTREGADA', 'CERRADA', 'CANCELADA'].includes(o.status));
    
    // Most common shoe brand
    const brands = custOrders.map(o => o.shoe.brand);
    const brandCounts: { [key: string]: number } = {};
    brands.forEach(b => { brandCounts[b] = (brandCounts[b] || 0) + 1; });
    const favoriteBrand = Object.keys(brandCounts).sort((a, b) => brandCounts[b] - brandCounts[a])[0] || 'Varios';

    return {
      ordersCount: custOrders.length,
      activeOrdersCount: activeOrders.length,
      totalSpent,
      favoriteBrand,
      orders: custOrders,
    };
  };

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return customers.filter(c => 
      !q ||
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.documentId && c.documentId.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  }, [customers, searchTerm]);

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newPhone.trim()) return;

    createCustomer({
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      documentId: newDoc.trim() || undefined,
      phone: newPhone.trim(),
      whatsapp: newWhatsApp.trim() || newPhone.trim(),
      email: newEmail.trim() || undefined,
      address: newAddress.trim() || undefined,
      notes: newNotes.trim() || undefined,
    });

    setIsNewCustomerOpen(false);
    setNewFirstName('');
    setNewLastName('');
    setNewPhone('');
    setNewWhatsApp('');
  };

  const buildCustomerWhatsAppUrl = (phone: string, name: string) =>
    buildWhatsAppUrl(phone, `Hola ${name}, te saludamos cordialmente de ${settings.businessName}. ¿En qué podemos ayudarte el día de hoy?`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Directorio de Clientes & Fidelización
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Historial de calzados entregados, volumen de gasto, WhatsApp directo y preferencias del cliente.
          </p>
        </div>

        <button
          onClick={() => setIsNewCustomerOpen(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Registrar Cliente
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre, apellido, teléfono, celular o cédula/RUC..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
          />
        </div>
        <span className="text-xs text-stone-500 font-mono">
          {filteredCustomers.length} cliente(s)
        </span>
      </div>

      {/* Grid of Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(cust => {
          const stats = getCustomerStats(cust.id);
          return (
            <div
              key={cust.id}
              className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-sm text-stone-900 leading-tight">
                      {cust.firstName} {cust.lastName}
                    </h3>
                    <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                      C.I./RUC: {cust.documentId || 'No registrado'}
                    </div>
                  </div>

                  <a
                    href={buildCustomerWhatsAppUrl(cust.whatsapp || cust.phone, cust.firstName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
                    title="Enviar WhatsApp directo"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </div>

                {/* Contact items */}
                <div className="text-xs text-stone-600 space-y-1 my-3 bg-stone-50/60 p-2.5 rounded-lg border border-stone-100">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>{cust.phone}</span>
                  </div>
                  {cust.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{cust.email}</span>
                    </div>
                  )}
                  {cust.address && (
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{cust.address}</span>
                    </div>
                  )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 border-t border-stone-100">
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase">Órdenes</span>
                    <span className="font-bold font-mono text-stone-900">{stats.ordersCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase">Activas</span>
                    <span className="font-bold font-mono text-amber-800">{stats.activeOrdersCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase">Total Gasto</span>
                    <span className="font-bold font-mono text-emerald-700">${stats.totalSpent.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 mt-2 flex items-center justify-between">
                <span className="text-[11px] text-stone-500 truncate max-w-[170px]">
                  Marca fav: <strong>{stats.favoriteBrand}</strong>
                </span>
                <button
                  onClick={() => setSelectedCustomer(cust)}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver Historial
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: CUSTOMER ORDER HISTORY */}
      {selectedCustomer && (
        <Modal
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={`Historial del Cliente: ${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
          subtitle={`Tel: ${selectedCustomer.phone} | WA: ${selectedCustomer.whatsapp} | ${selectedCustomer.address || 'Quito, Ecuador'}`}
          maxWidth="2xl"
        >
          {(() => {
            const stats = getCustomerStats(selectedCustomer.id);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200 text-center text-xs">
                  <div>
                    <span className="text-stone-500 block">Total Órdenes</span>
                    <span className="font-bold text-base font-mono">{stats.ordersCount}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Gasto Histórico</span>
                    <span className="font-bold text-base font-mono text-emerald-700">${stats.totalSpent.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Marca Frecuente</span>
                    <span className="font-bold text-base text-stone-800">{stats.favoriteBrand}</span>
                  </div>
                </div>

                <div className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Órdenes Registradas ({stats.orders.length})
                </div>

                {stats.orders.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-400 border border-dashed border-stone-200 rounded-xl">
                    Este cliente aún no tiene órdenes de servicio registradas.
                  </div>
                ) : (
                  <div className="border border-stone-200 rounded-xl divide-y divide-stone-200 max-h-80 overflow-y-auto">
                    {stats.orders.map(o => (
                      <div
                        key={o.id}
                        className="p-3 hover:bg-stone-50 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-stone-900">{o.orderNumber}</span>
                            <StatusBadge status={o.status} />
                          </div>
                          <div className="text-stone-600 mt-1 font-medium">
                            {o.shoe.type} {o.shoe.brand} {o.shoe.model} ({o.shoe.color})
                          </div>
                          <div className="text-[11px] text-stone-400">
                            Ingreso: {o.date} • Prometida: {o.promisedDate}
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <div>
                            <div className="font-mono font-bold text-stone-900">${o.budget.total.toFixed(2)}</div>
                            <div className="text-[10px] text-stone-500">Saldo: ${o.balancePending.toFixed(2)}</div>
                          </div>
                          <button
                            onClick={() => {
                              onSelectOrder(o);
                              setSelectedCustomer(null);
                            }}
                            className="px-2.5 py-1 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800"
                          >
                            Abrir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </Modal>
      )}

      {/* MODAL: NEW CUSTOMER */}
      <Modal
        isOpen={isNewCustomerOpen}
        onClose={() => setIsNewCustomerOpen(false)}
        title="Registrar Nuevo Cliente"
        subtitle="Agregue los datos de contacto y facturación del cliente."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCustomerSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={newFirstName}
                onChange={e => setNewFirstName(e.target.value)}
                placeholder="Ej: Marcelo"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Apellido *</label>
              <input
                type="text"
                required
                value={newLastName}
                onChange={e => setNewLastName(e.target.value)}
                placeholder="Ej: Andrade"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Teléfono Móvil *</label>
              <input
                type="tel"
                required
                value={newPhone}
                onChange={e => {
                  setNewPhone(e.target.value);
                  if (!newWhatsApp) setNewWhatsApp(e.target.value);
                }}
                placeholder="+593 98 123 4567"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">WhatsApp Notificaciones</label>
              <input
                type="tel"
                value={newWhatsApp}
                onChange={e => setNewWhatsApp(e.target.value)}
                placeholder="+593981234567"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Cédula / RUC (Opcional)</label>
              <input
                type="text"
                value={newDoc}
                onChange={e => setNewDoc(e.target.value)}
                placeholder="17..."
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="cliente@correo.com"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Dirección</label>
              <input
                type="text"
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                placeholder="Sector, calle y número..."
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Observaciones / Preferencias</label>
            <input
              type="text"
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              placeholder="Ej: Calzado de alta gama, cliente muy exigente con tintes..."
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsNewCustomerOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
            >
              Guardar Cliente
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
