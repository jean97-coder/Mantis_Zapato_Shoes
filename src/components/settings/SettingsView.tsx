import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Store,
  MessageSquare,
  Wrench,
  Users,
  Check,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  Ban,
  Landmark,
  Mail,
  Phone,
  RotateCcw,
  Send,
  Bot,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { AppSettings, ServiceCatalogItem, SERVICE_CATEGORY_SUGGESTIONS, User, Partner } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ServiceCatalogFormModal } from './ServiceCatalogFormModal';
import { UserFormModal } from './UserFormModal';
import { PartnerFormModal } from './PartnerFormModal';
import { isAdminRole, ROLE_LABELS } from '../../lib/rbac';
import { BRAND_NAME } from '../../lib/brand';

const PARTNER_AVATAR_TONES = [
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
];

function partnerAvatarTone(index: number): string {
  return PARTNER_AVATAR_TONES[index % PARTNER_AVATAR_TONES.length];
}

function partnerInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    servicesCatalog,
    createServiceCatalogItem,
    updateServiceCatalogItem,
    users,
    createUser,
    updateUser,
    deleteUser,
    toggleUserActive,
    currentUser,
    partners,
    createPartner,
    updatePartner,
    deletePartner,
    sendTelegramTest,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'business' | 'whatsapp' | 'alerts' | 'catalog' | 'users'>('business');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [telegramTestState, setTelegramTestState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [telegramTestError, setTelegramTestError] = useState('');

  const handleTestTelegram = async () => {
    setTelegramTestState('sending');
    setTelegramTestError('');
    try {
      await sendTelegramTest();
      setTelegramTestState('success');
    } catch (err) {
      setTelegramTestState('error');
      setTelegramTestError(err instanceof Error ? err.message : 'No se pudo enviar la alerta de prueba.');
    }
  };

  // Business form state
  const [businessForm, setBusinessForm] = useState<AppSettings>({ ...settings });

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(businessForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleUpdateTemplate = (templateKey: string, newText: string) => {
    setBusinessForm((prev) => ({
      ...prev,
      whatsappTemplates: { ...prev.whatsappTemplates, [templateKey]: newText },
    }));
  };

  // Service catalog create/edit modal state
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceCatalogItem | null>(null);
  const serviceCategories = useMemo(
    () =>
      Array.from(new Set<string>([...SERVICE_CATEGORY_SUGGESTIONS, ...servicesCatalog.map((s) => s.category)])).sort(
        (a, b) => a.localeCompare(b)
      ),
    [servicesCatalog]
  );

  const openCreateService = () => {
    setEditingService(null);
    setIsServiceFormOpen(true);
  };
  const openEditService = (item: ServiceCatalogItem) => {
    setEditingService(item);
    setIsServiceFormOpen(true);
  };
  const handleServiceSubmit = async (data: Omit<ServiceCatalogItem, 'id'>) => {
    if (editingService) {
      await updateServiceCatalogItem(editingService.id, data);
    } else {
      await createServiceCatalogItem(data);
    }
  };

  // User create/edit/delete modal state
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const openCreateUser = () => {
    setEditingUser(null);
    setIsUserFormOpen(true);
  };
  const openEditUser = (u: User) => {
    setEditingUser(u);
    setIsUserFormOpen(true);
  };
  const handleUserSubmit = async (data: {
    name: string;
    email: string;
    password: string;
    role: User['role'];
    phone?: string;
    specialty?: string;
  }) => {
    if (editingUser) {
      await updateUser(editingUser.id, {
        name: data.name,
        role: data.role,
        phone: data.phone,
        specialty: data.specialty,
        ...(data.password ? { password: data.password } : {}),
      });
    } else {
      await createUser(data);
    }
  };

  // Partner (Socio) create/edit/delete modal state
  const [isPartnerFormOpen, setIsPartnerFormOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);

  const openCreatePartner = () => {
    setEditingPartner(null);
    setIsPartnerFormOpen(true);
  };
  const openEditPartner = (p: Partner) => {
    setEditingPartner(p);
    setIsPartnerFormOpen(true);
  };
  const handlePartnerSubmit = async (data: { name: string; email?: string; phone?: string; notes?: string }) => {
    if (editingPartner) {
      await updatePartner(editingPartner.id, data);
    } else {
      await createPartner(data);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Configuración del Sistema
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Personalice los datos fiscales de {BRAND_NAME}, condiciones de garantía, plantillas de WhatsApp y el acceso RBAC del personal.
          </p>
        </div>

        {saveSuccess && (
          <div className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs">
            <Check className="w-4 h-4 text-emerald-600" />
            Configuración guardada exitosamente
          </div>
        )}
      </div>

      {/* Tabs bar */}
      <div className="flex border-b border-stone-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('business')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'business'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Store className="w-4 h-4" />
          Datos del Negocio & Tickets
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'whatsapp'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Plantillas de WhatsApp
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'alerts'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Send className="w-4 h-4" />
          Alertas por Telegram
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Catálogo de Servicios ({servicesCatalog.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Personal & Roles (RBAC) ({users.length})
        </button>
      </div>

      {/* TAB: BUSINESS & CONDITIONS */}
      {activeTab === 'business' && (
        <form onSubmit={handleSaveBusiness} className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-1">
              Información Fiscal y Comercial
            </h3>
            <p className="text-xs text-stone-500">
              Estos datos aparecen encabezando los tickets térmicos y las notas de venta comerciales.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Razón Social *</label>
              <input
                type="text"
                required
                value={businessForm.businessName}
                onChange={e => setBusinessForm({ ...businessForm, businessName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre Comercial *</label>
              <input
                type="text"
                required
                value={businessForm.commercialName}
                onChange={e => setBusinessForm({ ...businessForm, commercialName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">RUC / Identificación Fiscal *</label>
              <input
                type="text"
                required
                value={businessForm.ruc}
                onChange={e => setBusinessForm({ ...businessForm, ruc: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Teléfono Fijo / Matriz</label>
              <input
                type="text"
                value={businessForm.phone}
                onChange={e => setBusinessForm({ ...businessForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">WhatsApp de Atención al Cliente *</label>
              <input
                type="text"
                required
                value={businessForm.whatsapp}
                onChange={e => setBusinessForm({ ...businessForm, whatsapp: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={businessForm.email}
                onChange={e => setBusinessForm({ ...businessForm, email: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Días Estándar de Servicio</label>
              <input
                type="number"
                min={1}
                value={businessForm.standardServiceDays}
                onChange={e => setBusinessForm({ ...businessForm, standardServiceDays: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Dirección del Local Principal</label>
            <input
              type="text"
              value={businessForm.address}
              onChange={e => setBusinessForm({ ...businessForm, address: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
            />
          </div>

          <div className="pt-4 border-t border-stone-200">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Condiciones del Servicio (Impresas al pie de cada ticket) *
            </label>
            <textarea
              rows={4}
              required
              value={businessForm.defaultConditions}
              onChange={e => setBusinessForm({ ...businessForm, defaultConditions: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Protección legal y política de abandono (máx. 60 o 90 días para retiro).
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      )}

      {/* TAB: WHATSAPP TEMPLATES */}
      {activeTab === 'whatsapp' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-1">
              Plantillas de Mensajería WhatsApp
            </h3>
            <p className="text-xs text-stone-500">
              Variables dinámicas disponibles:{' '}
              <code className="text-amber-800 font-mono bg-amber-50 px-1 py-0.5 rounded-xs">
                {'{NOMBRE}'}, {'{ORDEN}'}, {'{TIPO}'}, {'{MARCA}'}, {'{MODELO}'}, {'{SERVICIOS}'}, {'{DIAGNOSTICO}'}, {'{FECHA_ENTREGA}'}, {'{TOTAL}'}, {'{ANTICIPO}'}, {'{SALDO}'}, {'{NEGOCIO}'}, {'{DIRECCION}'}
              </code>
            </p>
          </div>

          <div className="space-y-5">
            {Object.entries(businessForm.whatsappTemplates || {}).map(([key, template]) => (
              <div key={key} className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900">{key.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] font-mono uppercase bg-white px-2 py-0.5 rounded-sm border border-stone-200 text-stone-600">
                    Evento: {key}
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={template}
                  onChange={e => handleUpdateTemplate(key, e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white outline-hidden font-mono"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={handleSaveBusiness}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Guardar Plantillas
            </button>
          </div>
        </div>
      )}

      {/* TAB: TELEGRAM DELIVERY ALERTS */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-1">
                Alertas Automáticas Internas por Telegram
              </h3>
              <p className="text-xs text-stone-500 max-w-2xl">
                El sistema revisa automáticamente la base de datos dos veces al día — a las{' '}
                <strong className="text-stone-700">08:00</strong> y a las <strong className="text-stone-700">14:00</strong> —
                y envía al chat interno de Telegram un reporte de toda orden de servicio cuya fecha prometida de entrega
                esté vencida o a 3 días o menos — con número de orden, cliente, calzado, trabajo pendiente y días
                restantes — para que nadie en el taller pierda de vista una entrega crítica.
              </p>
            </div>
          </div>

          <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/60 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-xs font-bold text-stone-800 block">Conexión del Bot</span>
                <span className="text-[11px] text-stone-500">
                  Credenciales cargadas desde <code className="font-mono bg-white px-1 py-0.5 rounded-sm border border-stone-200">server/.env</code> (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).
                </span>
              </div>
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={telegramTestState === 'sending'}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                {telegramTestState === 'sending' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Probar Alerta de Telegram
              </button>
            </div>

            {telegramTestState === 'success' && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <Check className="w-3.5 h-3.5" />
                Mensaje de prueba enviado correctamente al chat de Telegram configurado.
              </div>
            )}
            {telegramTestState === 'error' && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {telegramTestError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: SERVICES CATALOG */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex flex-wrap justify-between items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Catálogo de Servicios de Restauración de Calzado ({servicesCatalog.length})
            </span>
            <button
              onClick={openCreateService}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Servicio
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Servicio</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-center">Tiempo Estimado</th>
                  <th className="py-2.5 px-3 text-right">Precio Estándar</th>
                  <th className="py-2.5 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {servicesCatalog.map(srv => (
                  <tr key={srv.id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-stone-900">{srv.name}</div>
                      <div className="text-[11px] text-stone-500">{srv.description}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 bg-stone-100 rounded-sm text-[10px] font-bold text-stone-600">
                        {srv.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-stone-600">
                      ~{srv.estimatedMinutes} min
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                      ${srv.standardPrice.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => openEditService(srv)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                        title="Editar servicio"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: USERS & ROLES (RBAC) */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Socios de la Empresa */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <Landmark className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Socios de la Empresa ({partners.length})
                  </div>
                  <p className="text-[11px] text-stone-500 max-w-xl">
                    Catálogo de socios para el seguimiento de aportes y devoluciones de capital en Caja & Cobros.
                  </p>
                </div>
              </div>
              <button
                onClick={openCreatePartner}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Nuevo Socio
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {partners.map((p, idx) => (
                <div
                  key={p.id}
                  className={`group relative p-4 bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow ${
                    p.isActive ? 'border-stone-200' : 'border-stone-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm shrink-0 ring-4 ring-white shadow-xs ${partnerAvatarTone(idx)}`}
                      >
                        {partnerInitials(p.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-stone-900 truncate">{p.name}</div>
                        {!p.isActive && (
                          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Inactivo</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditPartner(p)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                        title="Editar socio"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {p.isActive ? (
                        <button
                          onClick={() => setPartnerToDelete(p)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                          title="Eliminar socio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => updatePartner(p.id, { isActive: true })}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          title="Reactivar socio"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5 text-[11px] text-stone-500">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                      {p.phone || <span className="italic text-stone-300">Sin teléfono</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                      {p.email || <span className="italic text-stone-300">Sin correo</span>}
                    </div>
                  </div>

                  {p.pendingBalance > 0 && (
                    <div className="mt-2.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Saldo pendiente: ${p.pendingBalance.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}

              {partners.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-stone-400">
                  Aún no hay socios registrados.
                </div>
              )}
            </div>
          </div>

        <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex flex-wrap justify-between items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Usuarios y Roles de Acceso ({users.length})
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 hidden sm:inline">
                Admin · Socio-Admin · Cajero · Zapatero
              </span>
              {isAdminRole(currentUser.role) && (
                <button
                  onClick={openCreateUser}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nuevo Usuario
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Usuario</th>
                  <th className="py-2.5 px-3">Rol RBAC</th>
                  <th className="py-2.5 px-3">Especialidad</th>
                  <th className="py-2.5 px-3">Contacto</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  {isAdminRole(currentUser.role) && <th className="py-2.5 px-3 text-center">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-stone-900">{u.name}</div>
                      <div className="text-[11px] text-stone-400">{u.email}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-sm text-[10px] font-bold">
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-stone-600">
                      {u.specialty || 'Administración general'}
                    </td>
                    <td className="py-2.5 px-3 text-stone-500 font-mono text-[11px]">
                      {u.phone || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {u.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {isAdminRole(currentUser.role) && (
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditUser(u)}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                            title="Editar usuario"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {u.id !== currentUser.id && (
                            <>
                              <button
                                onClick={() => toggleUserActive(u.id, !u.active)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                  u.active
                                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                              >
                                {u.active ? <Ban className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                                {u.active ? 'Desactivar' : 'Activar'}
                              </button>
                              <button
                                onClick={() => setUserToDelete(u)}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}
      {/* MODAL: CREATE / EDIT USER */}
      <UserFormModal
        isOpen={isUserFormOpen}
        onClose={() => setIsUserFormOpen(false)}
        onSubmit={handleUserSubmit}
        user={editingUser}
      />

      {/* MODAL: DELETE USER CONFIRM */}
      {userToDelete && (
        <ConfirmDialog
          isOpen={!!userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={async () => {
            const { mode } = await deleteUser(userToDelete.id);
            void mode;
          }}
          title="Eliminar Usuario"
          description={`¿Seguro que deseas eliminar a "${userToDelete.name}"? Si tiene órdenes asignadas, se desactivará en lugar de borrarse por completo.`}
        />
      )}

      {/* MODAL: CREATE / EDIT PARTNER */}
      <PartnerFormModal
        isOpen={isPartnerFormOpen}
        onClose={() => setIsPartnerFormOpen(false)}
        onSubmit={handlePartnerSubmit}
        partner={editingPartner}
      />

      {/* MODAL: DELETE PARTNER CONFIRM */}
      {partnerToDelete && (
        <ConfirmDialog
          isOpen={!!partnerToDelete}
          onClose={() => setPartnerToDelete(null)}
          onConfirm={async () => {
            const { mode } = await deletePartner(partnerToDelete.id);
            void mode;
          }}
          title="Eliminar Socio"
          description={`¿Seguro que deseas eliminar a "${partnerToDelete.name}"? Si tiene aportes o devoluciones registrados, se desactivará en lugar de borrarse por completo.`}
        />
      )}

      {/* MODAL: CREATE / EDIT SERVICE */}
      <ServiceCatalogFormModal
        isOpen={isServiceFormOpen}
        onClose={() => setIsServiceFormOpen(false)}
        onSubmit={handleServiceSubmit}
        categories={serviceCategories}
        item={editingService}
      />
    </div>
  );
};
