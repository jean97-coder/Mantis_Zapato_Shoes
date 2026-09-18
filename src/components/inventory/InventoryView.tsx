import React, { useState, useMemo } from 'react';
import { Material, InventoryMovement } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Package,
  AlertTriangle,
  Plus,
  Search,
  Truck,
  ShoppingCart,
  ShoppingBag,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { MaterialFormModal } from './MaterialFormModal';
import { SuppliersTab } from './SuppliersTab';
import { PurchasesTab } from './PurchasesTab';

type MainTab = 'catalog' | 'suppliers' | 'purchases';

export const InventoryView: React.FC = () => {
  const { materials, suppliers, storeProducts, createMaterial, updateMaterial, deleteMaterial, adjustInventoryStock } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('TODOS');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>('catalog');

  const categories = useMemo(
    () => Array.from(new Set<string>(materials.map((m) => m.category))).sort((a, b) => a.localeCompare(b)),
    [materials]
  );

  // Modal: Create / Edit Material
  const [isMaterialFormOpen, setIsMaterialFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  // Modal: Delete confirmation
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  // Modal: Quick Stock Adjustment
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedMatForAdjust, setSelectedMatForAdjust] = useState<Material | null>(null);
  const [adjustType, setAdjustType] = useState<InventoryMovement['type']>('AJUSTE');
  const [adjustNewStock, setAdjustNewStock] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState('Ajuste de conteo físico');

  const activeMaterials = materials.filter((m) => m.status === 'activo');

  const filteredMaterials = useMemo(() => {
    return activeMaterials.filter((m) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        (m.location && m.location.toLowerCase().includes(q));

      const matchCategory = categoryFilter === 'TODOS' || m.category === categoryFilter;
      const isLowStock = m.currentStock <= m.minStock;
      const matchLowStock = !lowStockOnly || isLowStock;

      return matchSearch && matchCategory && matchLowStock;
    });
  }, [activeMaterials, searchTerm, categoryFilter, lowStockOnly]);

  const lowStockCount = activeMaterials.filter((m) => m.currentStock <= m.minStock).length;
  const totalValuation = activeMaterials.reduce((acc, m) => acc + m.currentStock * m.costPrice, 0);

  const lowStockStoreProducts = useMemo(
    () => storeProducts.filter((p) => p.active && p.stock <= p.minStock).sort((a, b) => a.stock - b.stock),
    [storeProducts]
  );

  const openCreateMaterial = () => {
    setEditingMaterial(null);
    setIsMaterialFormOpen(true);
  };

  const openEditMaterial = (m: Material) => {
    setEditingMaterial(m);
    setIsMaterialFormOpen(true);
  };

  const handleMaterialSubmit = async (data: Omit<Material, 'id' | 'status'> & { status?: Material['status'] }) => {
    if (editingMaterial) {
      await updateMaterial(editingMaterial.id, data);
    } else {
      await createMaterial({ ...data, status: 'activo' });
    }
  };

  const handleAdjustStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatForAdjust) return;

    adjustInventoryStock(selectedMatForAdjust.id, Number(adjustNewStock), adjustReason, adjustType);

    setIsAdjustOpen(false);
    setSelectedMatForAdjust(null);
  };

  const tabs: { id: MainTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'catalog', label: 'Catálogo y Existencias', icon: <Package className="w-4 h-4" />, count: activeMaterials.length },
    { id: 'suppliers', label: 'Proveedores', icon: <Truck className="w-4 h-4" />, count: suppliers.length },
    { id: 'purchases', label: 'Entradas / Kárdex de Compras', icon: <ShoppingCart className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Inventario & Bodega de Insumos
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Control de materiales, proveedores y compras del taller, con descuento automático por orden de servicio.
          </p>
        </div>

        {activeTab === 'catalog' && (
          <button
            onClick={openCreateMaterial}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nuevo Insumo
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[11px] text-stone-500 font-medium block">Total Insumos Catálogo</span>
          <span className="text-xl font-bold font-mono text-stone-900">{activeMaterials.length}</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[11px] text-red-600 font-medium block flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Bajo Stock Mínimo
          </span>
          <span className="text-xl font-bold font-mono text-red-700">{lowStockCount}</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[11px] text-stone-500 font-medium block">Proveedores Registrados</span>
          <span className="text-xl font-bold font-mono text-stone-900">{suppliers.length}</span>
        </div>

        <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
          <span className="text-[11px] text-emerald-700 font-medium block">Valorización en Bodega</span>
          <span className="text-xl font-bold font-mono text-emerald-800">${totalValuation.toFixed(2)}</span>
        </div>
      </div>

      {/* ALERTS: Store (Tienda / Venta Directa) low stock — synced automatically on each POS sale */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
            Alertas de Stock — Tienda / Venta Directa
          </span>
          {lowStockStoreProducts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
              {lowStockStoreProducts.length}
            </span>
          )}
        </div>

        {lowStockStoreProducts.length === 0 ? (
          <p className="text-xs text-stone-400">
            Sin alertas: todo el calzado de la Tienda está por encima de su stock mínimo.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStockStoreProducts.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-xs ${
                  p.stock <= 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-bold text-stone-900 truncate">{p.name}</div>
                  <div className="text-[10px] text-stone-500">Talla {p.size} · {p.color}</div>
                </div>
                <span className={`shrink-0 font-mono font-bold px-2 py-0.5 rounded-full ${
                  p.stock <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {p.stock <= 0 ? 'Agotado' : `${p.stock}/${p.minStock}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-stone-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === 'number' && ` (${tab.count})`}
          </button>
        ))}
      </div>

      {/* TAB: CATALOG */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por código, nombre o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div className="w-52">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
              >
                <option value="TODOS">Todas las Categorías</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                lowStockOnly
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Bajo Stock ({lowStockCount})
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Material / Descripción</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3 text-center">Stock Actual</th>
                    <th className="py-2.5 px-3 text-center">Mínimo</th>
                    <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                    <th className="py-2.5 px-3 text-right">Valor Total</th>
                    <th className="py-2.5 px-3">Ubicación</th>
                    <th className="py-2.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-stone-400">
                        No se encontraron insumos con los filtros indicados.
                      </td>
                    </tr>
                  ) : (
                    filteredMaterials.map((mat) => {
                      const isLowStock = mat.currentStock <= mat.minStock;
                      return (
                        <tr key={mat.id} className={`hover:bg-stone-50 ${isLowStock ? 'bg-red-50/20' : ''}`}>
                          <td className="py-2.5 px-3 font-mono font-bold text-stone-800">{mat.code}</td>
                          <td className="py-2.5 px-3 font-semibold text-stone-900">{mat.name}</td>
                          <td className="py-2.5 px-3 text-stone-600">
                            <span className="px-2 py-0.5 bg-stone-100 rounded-sm text-[10px] uppercase font-bold text-stone-600">
                              {mat.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <span className={`px-2 py-0.5 rounded-full font-bold ${
                              isLowStock ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse' : 'bg-stone-100 text-stone-900'
                            }`}>
                              {mat.currentStock} {mat.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-stone-400">
                            {mat.minStock} {mat.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-stone-600">${mat.costPrice.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                            ${(mat.currentStock * mat.costPrice).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-stone-500 font-mono text-[11px]">
                            {mat.location || 'Bodega General'}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedMatForAdjust(mat);
                                  setAdjustNewStock(mat.currentStock);
                                  setIsAdjustOpen(true);
                                }}
                                className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg text-[11px] transition-colors"
                                title="Ajustar stock manualmente"
                              >
                                Ajustar
                              </button>
                              <button
                                onClick={() => openEditMaterial(mat)}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                                title="Editar insumo"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setMaterialToDelete(mat)}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                title="Eliminar insumo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SUPPLIERS */}
      {activeTab === 'suppliers' && <SuppliersTab />}

      {/* TAB: PURCHASES / KARDEX */}
      {activeTab === 'purchases' && <PurchasesTab />}

      {/* MODAL: CREATE / EDIT MATERIAL */}
      <MaterialFormModal
        isOpen={isMaterialFormOpen}
        onClose={() => setIsMaterialFormOpen(false)}
        onSubmit={handleMaterialSubmit}
        suppliers={suppliers}
        categories={categories}
        material={editingMaterial}
      />

      {/* MODAL: DELETE CONFIRM */}
      {materialToDelete && (
        <ConfirmDialog
          isOpen={!!materialToDelete}
          onClose={() => setMaterialToDelete(null)}
          onConfirm={async () => {
            const { mode } = await deleteMaterial(materialToDelete.id);
            if (mode === 'deactivated') {
              // The material had purchase/consumption history, so it was kept
              // as an inactive record instead of a hard delete — no separate
              // action needed here, the list already stops showing it.
            }
          }}
          title="Eliminar Insumo"
          description={`¿Seguro que deseas eliminar "${materialToDelete.name}"? Si tiene historial de compras o consumo, se desactivará en lugar de borrarse por completo.`}
        />
      )}

      {/* MODAL: ADJUST STOCK */}
      {selectedMatForAdjust && (
        <Modal
          isOpen={isAdjustOpen}
          onClose={() => setIsAdjustOpen(false)}
          title={`Ajuste Manual de Stock — ${selectedMatForAdjust.name}`}
          subtitle={`Stock actual: ${selectedMatForAdjust.currentStock} ${selectedMatForAdjust.unit} • Ubicación: ${selectedMatForAdjust.location || 'General'}`}
          maxWidth="md"
        >
          <form onSubmit={handleAdjustStockSubmit} className="space-y-4">
            <p className="text-[11px] text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
              Para reabastecer stock comprado a un proveedor, usa "Registrar Compra" en la pestaña de Proveedores/Compras —
              así también se registra el gasto en caja. Este ajuste es solo para correcciones de conteo, pérdidas o daños.
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Tipo de Operación *</label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as InventoryMovement['type'])}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden bg-white"
              >
                <option value="AJUSTE">Ajuste de Conteo Físico</option>
                <option value="PERDIDA">Pérdida o Desperdicio (-)</option>
                <option value="DANO">Baja por Daño (-)</option>
                <option value="ENTRADA">Entrada Manual (+)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nuevo Stock Físico Total ({selectedMatForAdjust.unit}) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={adjustNewStock}
                onChange={(e) => setAdjustNewStock(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs font-bold font-mono border border-stone-300 rounded-lg outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Motivo o Documento *</label>
              <input
                type="text"
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Ej: Inventario mensual, merma por rotura..."
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setIsAdjustOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-xs"
              >
                Guardar Movimiento
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
