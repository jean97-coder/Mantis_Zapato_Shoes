import React, { useState, useEffect, useRef } from 'react';
import { StoreProduct } from '../../types';
import { Modal } from '../common/Modal';
import { Upload, Loader2, ImageOff } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
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
    code?: string;
  }) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
  product?: StoreProduct | null;
}

/**
 * Create/edit modal for a store product. The modal stays mounted across
 * opens, so fields are re-synced from `product` every time it opens rather
 * than only on first mount (same pattern as the other CRUD form modals).
 */
export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, onSubmit, onUploadImage, product }) => {
  const isEdit = !!product;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [size, setSize] = useState(product?.size ?? '');
  const [color, setColor] = useState(product?.color ?? '');
  const [style, setStyle] = useState(product?.style ?? '');
  const [price, setPrice] = useState(String(product?.price ?? ''));
  const [costPrice, setCostPrice] = useState(String(product?.costPrice ?? '0'));
  const [stock, setStock] = useState(String(product?.stock ?? '0'));
  const [minStock, setMinStock] = useState(String(product?.minStock ?? '0'));
  const [code, setCode] = useState(product?.code ?? '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(product?.name ?? '');
      setDescription(product?.description ?? '');
      setSize(product?.size ?? '');
      setColor(product?.color ?? '');
      setStyle(product?.style ?? '');
      setPrice(String(product?.price ?? ''));
      setCostPrice(String(product?.costPrice ?? '0'));
      setStock(String(product?.stock ?? '0'));
      setMinStock(String(product?.minStock ?? '0'));
      setCode(product?.code ?? '');
      setImageUrl(product?.imageUrl ?? '');
      setError('');
    }
  }, [isOpen, product]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await onUploadImage(file);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError('El precio debe ser un número mayor a cero.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        size: size.trim(),
        color: color.trim(),
        style: style.trim(),
        price: priceNum,
        costPrice: Number(costPrice) || 0,
        stock: Math.max(0, Math.round(Number(stock) || 0)),
        minStock: Math.max(0, Math.round(Number(minStock) || 0)),
        imageUrl: imageUrl.trim() || undefined,
        code: code.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el producto.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Editar Producto — ${product!.name}` : 'Agregar Nuevo Zapato / Producto'}
      subtitle="Catálogo de la Tienda / Venta Directa."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">{error}</div>}

        <div className="flex gap-4 items-start">
          <div className="w-28 h-28 rounded-xl border border-stone-300 bg-stone-50 flex items-center justify-center overflow-hidden shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt={name || 'Producto'} className="w-full h-full object-cover" />
            ) : (
              <ImageOff className="w-6 h-6 text-stone-300" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <label className="block text-xs font-semibold text-stone-700">Fotografía del Producto</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Pega una URL de imagen o sube un archivo"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors disabled:opacity-60"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? 'Subiendo...' : 'Subir Imagen'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre del Modelo *</label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Zapatilla Urbana Classic"
            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Detalles del producto, material, ocasión de uso..."
            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden resize-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Talla *</label>
            <input type="text" required value={size} onChange={(e) => setSize(e.target.value)} placeholder="40" className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Color *</label>
            <input type="text" required value={color} onChange={(e) => setColor(e.target.value)} placeholder="Negro" className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Diseño / Estilo</label>
            <input type="text" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Casual" className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Precio de Venta ($) *</label>
            <input type="number" required min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Costo ($)</label>
            <input type="number" min="0" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Stock Disponible *</label>
            <input type="number" required min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Stock Mínimo</label>
            <input type="number" min="0" step="1" value={minStock} onChange={(e) => setMinStock(e.target.value)} className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Código (opcional)</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SKU-001" className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs disabled:opacity-60">
            {submitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Agregar Producto'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
