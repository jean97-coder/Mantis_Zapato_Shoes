import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ShoppingBag, ShoppingCart, Plus, Minus, Trash2, Search, ImageOff, Pencil,
  Banknote, CreditCard, Landmark, MoreHorizontal, Loader2, AlertTriangle, X, Receipt,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StoreProduct, PaymentMethod } from '../../types';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ProductFormModal } from './ProductFormModal';
import { StoreSaleReceipt } from './StoreSaleReceipt';

interface CartLine {
  product: StoreProduct;
  quantity: number;
}

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'EFECTIVO', label: 'Efectivo', icon: Banknote },
  { value: 'TARJETA', label: 'Tarjeta', icon: CreditCard },
  { value: 'TRANSFERENCIA', label: 'Transferencia', icon: Landmark },
  { value: 'OTRO', label: 'Otro', icon: MoreHorizontal },
];

export const StoreView: React.FC = () => {
  const {
    storeProducts, settings, cashRegister,
    createStoreProduct, updateStoreProduct, deleteStoreProduct, uploadStoreProductImage, processStoreSale,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'pos' | 'catalog'>('pos');
  const [search, setSearch] = useState('');

  // --- POS / cart state ---
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('EFECTIVO');
  const [cashReceivedInput, setCashReceivedInput] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [processing, setProcessing] = useState(false);
  const [saleError, setSaleError] = useState('');
  const [completedSale, setCompletedSale] = useState<Awaited<ReturnType<typeof processStoreSale>> | null>(null);

  // --- Catalog management state ---
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<StoreProduct | null>(null);

  const isShiftOpen = cashRegister.status === 'ABIERTA';

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = storeProducts.filter((p) => p.active);
    if (!q) return base;
    return base.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q) ||
        p.size.toLowerCase().includes(q) ||
        p.style.toLowerCase().includes(q) ||
        (p.code ?? '').toLowerCase().includes(q)
    );
  }, [storeProducts, search]);

  const catalogProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return storeProducts;
    return storeProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q) ||
        p.size.toLowerCase().includes(q)
    );
  }, [storeProducts, search]);

  const subtotal = cart.reduce((acc, line) => acc + line.product.price * line.quantity, 0);
  const taxRatePercent = settings.taxRatePercent || 0;
  const taxAmount = subtotal * (taxRatePercent / 100);
  const total = subtotal + taxAmount;
  const cashReceived = Number(cashReceivedInput) || 0;
  const changeGiven = paymentMethod === 'EFECTIVO' ? Math.max(0, cashReceived - total) : 0;
  const canCheckout =
    isShiftOpen &&
    cart.length > 0 &&
    !processing &&
    (paymentMethod !== 'EFECTIVO' || cashReceived >= total);

  const addToCart = (product: StoreProduct) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const changeQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.product.id !== productId) return l;
          const next = Math.min(l.product.stock, Math.max(1, l.quantity + delta));
          return { ...l, quantity: next };
        })
        .filter((l) => l.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  };

  const resetPOS = () => {
    setCart([]);
    setCustomerName('');
    setCustomerDocument('');
    setCashReceivedInput('');
    setPaymentMethod('EFECTIVO');
    setSaleError('');
    setCompletedSale(null);
  };

  const handleCheckout = async () => {
    if (!canCheckout) return;
    setProcessing(true);
    setSaleError('');
    try {
      const sale = await processStoreSale({
        items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        paymentMethod,
        cashReceived: paymentMethod === 'EFECTIVO' ? cashReceived : total,
        customerName: customerName.trim() || undefined,
        customerDocument: customerDocument.trim() || undefined,
      });
      setCompletedSale(sale);
      setCart([]);
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : 'No se pudo procesar la venta.');
    } finally {
      setProcessing(false);
    }
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setIsProductFormOpen(true);
  };
  const openEditProduct = (p: StoreProduct) => {
    setEditingProduct(p);
    setIsProductFormOpen(true);
  };
  const handleProductSubmit = async (data: Parameters<typeof createStoreProduct>[0]) => {
    if (editingProduct) await updateStoreProduct(editingProduct.id, data);
    else await createStoreProduct(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-amber-600" />
            Tienda / Venta Directa
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Catálogo de calzado en venta directa, punto de cobro y nota de venta formal.
          </p>
        </div>
      </div>

      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('pos')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'pos' ? 'border-amber-600 text-amber-900 bg-amber-50/50' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Punto de Venta
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'catalog' ? 'border-amber-600 text-amber-900 bg-amber-50/50' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Catálogo de Productos ({storeProducts.length})
        </button>
      </div>

      {/* TAB: POS */}
      {activeTab === 'pos' && (
        <>
          {!isShiftOpen && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              No hay un turno de caja abierto. Abre la caja en "Caja & Cobros" antes de vender.
            </div>
          )}

          {completedSale ? (
            <StoreSaleReceipt sale={completedSale} settings={settings} onNewSale={resetPOS} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Product picker */}
              <div className="lg:col-span-2 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, talla, color o código..."
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-stone-300 rounded-xl outline-hidden bg-white shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[560px] overflow-y-auto pr-1">
                  {filteredProducts.map((p) => (
                    <motion.button
                      key={p.id}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => addToCart(p)}
                      disabled={p.stock <= 0}
                      className="text-left bg-white rounded-2xl border border-stone-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageOff className="w-6 h-6 text-stone-300" />
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-stone-900 truncate">{p.name}</div>
                        <div className="text-[10px] text-stone-500">Talla {p.size} · {p.color}</div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-sm font-mono font-extrabold text-amber-700">${p.price.toFixed(2)}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.stock <= 0 ? 'bg-red-100 text-red-700' : p.isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {p.stock <= 0 ? 'Agotado' : `${p.stock} disp.`}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="col-span-full py-12 text-center text-xs text-stone-400">
                      No hay productos disponibles que coincidan con la búsqueda.
                    </div>
                  )}
                </div>
              </div>

              {/* Cart / checkout panel */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 flex flex-col h-fit sticky top-20">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5 mb-3">
                  <ShoppingCart className="w-4 h-4 text-amber-600" />
                  Carrito ({cart.length})
                </h3>

                <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                  {cart.length === 0 && (
                    <p className="text-xs text-stone-400 py-6 text-center">Selecciona productos para agregarlos aquí.</p>
                  )}
                  {cart.map((line) => (
                    <div key={line.product.id} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-stone-900 truncate">{line.product.name}</div>
                          <div className="text-[10px] text-stone-500">Talla {line.product.size} · {line.product.color}</div>
                        </div>
                        <button onClick={() => removeFromCart(line.product.id)} className="text-stone-400 hover:text-red-600 transition-colors shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => changeQuantity(line.product.id, -1)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-stone-300 hover:bg-stone-100">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono font-bold w-6 text-center">{line.quantity}</span>
                          <button
                            onClick={() => changeQuantity(line.product.id, 1)}
                            disabled={line.quantity >= line.product.stock}
                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-white border border-stone-300 hover:bg-stone-100 disabled:opacity-40"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-xs font-mono font-bold text-stone-900">${(line.product.price * line.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 text-xs border-t border-stone-200 pt-3">
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal</span>
                    <span className="font-mono">${subtotal.toFixed(2)}</span>
                  </div>
                  {taxRatePercent > 0 && (
                    <div className="flex justify-between text-stone-500">
                      <span>IVA ({taxRatePercent}%)</span>
                      <span className="font-mono">${taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-900 font-bold text-sm pt-1.5 border-t border-stone-200">
                    <span>Total</span>
                    <span className="font-mono">${total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {PAYMENT_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const active = paymentMethod === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setPaymentMethod(opt.value)}
                          className={`flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                            active ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {paymentMethod === 'EFECTIVO' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Efectivo Recibido</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cashReceivedInput}
                          onChange={(e) => setCashReceivedInput(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg outline-hidden font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-600 mb-0.5">Vuelto / Cambio</label>
                        <div className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                          ${changeGiven.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Cliente (opcional)"
                      className="px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg outline-hidden"
                    />
                    <input
                      type="text"
                      value={customerDocument}
                      onChange={(e) => setCustomerDocument(e.target.value)}
                      placeholder="C.I./RUC (opcional)"
                      className="px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg outline-hidden"
                    />
                  </div>

                  {saleError && <div className="p-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[11px]">{saleError}</div>}

                  <button
                    onClick={handleCheckout}
                    disabled={!canCheckout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                    {processing ? 'Procesando...' : `Cobrar $${total.toFixed(2)}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB: CATALOG MANAGEMENT */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl outline-hidden bg-white shadow-xs"
              />
            </div>
            <button
              onClick={openCreateProduct}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar Nuevo Zapato / Producto
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {catalogProducts.map((p) => (
              <div
                key={p.id}
                className={`group relative bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden ${p.active ? 'border-stone-200' : 'border-stone-200 opacity-60'}`}
              >
                <div className="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden relative">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageOff className="w-8 h-8 text-stone-300" />
                  )}
                  {!p.active && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-full">Inactivo</span>
                  )}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditProduct(p)} className="p-1.5 rounded-lg bg-white/90 text-stone-600 hover:text-amber-700 shadow-xs" title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setProductToDelete(p)} className="p-1.5 rounded-lg bg-white/90 text-stone-600 hover:text-red-700 shadow-xs" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="text-xs font-bold text-stone-900 truncate">{p.name}</div>
                  {p.description && <p className="text-[10px] text-stone-500 line-clamp-2">{p.description}</p>}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 rounded-full text-stone-600">Talla {p.size}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 rounded-full text-stone-600">{p.color}</span>
                    {p.style && <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 rounded-full text-stone-600">{p.style}</span>}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-mono font-extrabold text-amber-700">${p.price.toFixed(2)}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.stock <= 0 ? 'bg-red-100 text-red-700' : p.isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      Stock: {p.stock}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {catalogProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-stone-400">
                Aún no hay productos en el catálogo de la tienda.
              </div>
            )}
          </div>
        </div>
      )}

      <ProductFormModal
        isOpen={isProductFormOpen}
        onClose={() => setIsProductFormOpen(false)}
        onSubmit={handleProductSubmit}
        onUploadImage={uploadStoreProductImage}
        product={editingProduct}
      />

      {productToDelete && (
        <ConfirmDialog
          isOpen={!!productToDelete}
          onClose={() => setProductToDelete(null)}
          onConfirm={async () => {
            const { mode } = await deleteStoreProduct(productToDelete.id);
            void mode;
          }}
          title="Eliminar Producto"
          description={`¿Seguro que deseas eliminar "${productToDelete.name}"? Si tiene ventas registradas, se desactivará en lugar de borrarse por completo.`}
        />
      )}
    </div>
  );
};
