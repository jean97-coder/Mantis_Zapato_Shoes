import React, { useState } from 'react';
import { ServiceOrder, PhotoType, ShoePhoto } from '../../types';
import { Modal } from '../common/Modal';
import { Camera, Plus, CheckCircle, Eye, Trash2, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface BeforeAfterPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ServiceOrder;
}

export const BeforeAfterPhotoModal: React.FC<BeforeAfterPhotoModalProps> = ({ isOpen, onClose, order }) => {
  const { addPhotoToOrder, uploadOrderPhoto } = useApp();
  const [activeTab, setActiveTab] = useState<'compare' | 'gallery' | 'add'>('compare');
  const [newPhotoType, setNewPhotoType] = useState<PhotoType>('frontal');
  const [newPhotoStage, setNewPhotoStage] = useState<'recepcion' | 'diagnostico' | 'taller' | 'final'>('recepcion');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const beforePhotos = order.photos.filter(p => p.stage === 'recepcion' || p.stage === 'diagnostico' || p.type !== 'despues');
  const afterPhotos = order.photos.filter(p => p.stage === 'final' || p.type === 'despues');

  // Quick preset sample photos of shoe repair
  const presets = [
    {
      title: 'Suela nueva instalada',
      url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=80',
      type: 'suela' as PhotoType,
      stage: 'final' as const,
    },
    {
      title: 'Zapatillas restauradas y limpias',
      url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80',
      type: 'despues' as PhotoType,
      stage: 'final' as const,
    },
    {
      title: 'Brillo y nutrición espejo',
      url: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&auto=format&fit=crop&q=80',
      type: 'despues' as PhotoType,
      stage: 'final' as const,
    },
    {
      title: 'Tacón reconstruido y nivelado',
      url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&auto=format&fit=crop&q=80',
      type: 'tacon' as PhotoType,
      stage: 'final' as const,
    }
  ];

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !newPhotoUrl.trim()) return;

    setUploadError('');
    setIsUploading(true);
    try {
      if (selectedFile) {
        await uploadOrderPhoto(order.id, selectedFile, {
          type: newPhotoType,
          stage: newPhotoStage,
          caption: newCaption.trim() || undefined,
        });
      } else {
        await addPhotoToOrder(order.id, {
          url: newPhotoUrl.trim(),
          type: newPhotoType,
          stage: newPhotoStage,
          caption: newCaption.trim() || undefined,
        });
      }

      setNewPhotoUrl('');
      setNewCaption('');
      setSelectedFile(null);
      setActiveTab('gallery');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'No se pudo guardar la fotografía.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectPreset = (p: typeof presets[0]) => {
    setNewPhotoUrl(p.url);
    setSelectedFile(null);
    setNewPhotoType(p.type);
    setNewPhotoStage(p.stage);
    setNewCaption(p.title);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Fotografías y Comparativa - ${order.orderNumber}`}
      subtitle={`${order.shoe.type} ${order.shoe.brand} ${order.shoe.model || ''} (${order.customer.firstName} ${order.customer.lastName})`}
      maxWidth="4xl"
    >
      {/* Tab switch */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('compare')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'compare'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <ArrowRight className="w-4 h-4" />
          Comparativa Antes vs Después
        </button>
        <button
          onClick={() => setActiveTab('gallery')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'gallery'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <Eye className="w-4 h-4" />
          Galería Completa ({order.photos.length})
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'add'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-stone-600 hover:text-stone-900'
          }`}
        >
          <Plus className="w-4 h-4" />
          Agregar Evidencia Fotográfica
        </button>
      </div>

      {/* View: Comparative Before vs After */}
      {activeTab === 'compare' && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before Box */}
            <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/60 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Estado de Recepción (ANTES)
                </span>
                <span className="text-[11px] text-stone-500 font-mono">
                  {beforePhotos.length} foto(s)
                </span>
              </div>

              {beforePhotos.length > 0 ? (
                <div className="space-y-3 flex-1">
                  <div className="aspect-4/3 rounded-lg overflow-hidden bg-stone-900 border border-stone-200">
                    <img
                      src={beforePhotos[0].url}
                      alt="Antes"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200 text-xs">
                    <div className="font-semibold text-stone-900 capitalize">
                      Ángulo: {beforePhotos[0].type}
                    </div>
                    {beforePhotos[0].caption && (
                      <p className="text-stone-600 mt-0.5">{beforePhotos[0].caption}</p>
                    )}
                    <div className="text-[10px] text-stone-400 mt-1">
                      {beforePhotos[0].date} • Registrado por: {beforePhotos[0].registeredBy}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400 text-xs border border-dashed border-stone-300 rounded-lg">
                  <Camera className="w-8 h-8 mb-2 stroke-1 text-stone-300" />
                  No se registraron fotos iniciales durante la recepción.
                </div>
              )}
            </div>

            {/* After Box */}
            <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/60 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Restauración Final (DESPUÉS)
                </span>
                <span className="text-[11px] text-stone-500 font-mono">
                  {afterPhotos.length} foto(s)
                </span>
              </div>

              {afterPhotos.length > 0 ? (
                <div className="space-y-3 flex-1">
                  <div className="aspect-4/3 rounded-lg overflow-hidden bg-stone-900 border border-stone-200">
                    <img
                      src={afterPhotos[0].url}
                      alt="Después"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200 text-xs">
                    <div className="font-semibold text-stone-900 capitalize flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Ángulo: {afterPhotos[0].type}
                    </div>
                    {afterPhotos[0].caption && (
                      <p className="text-stone-600 mt-0.5">{afterPhotos[0].caption}</p>
                    )}
                    <div className="text-[10px] text-stone-400 mt-1">
                      {afterPhotos[0].date} • Por: {afterPhotos[0].registeredBy}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-500 text-xs border border-dashed border-emerald-300/80 bg-emerald-50/30 rounded-lg">
                  <Camera className="w-8 h-8 mb-2 text-emerald-600" />
                  <p className="font-semibold text-stone-700">Aún no se ha registrado fotografía final.</p>
                  <p className="text-stone-500 text-[11px] mt-1">
                    El técnico puede capturar la foto final durante el control de calidad o al finalizar el trabajo.
                  </p>
                  <button
                    onClick={() => {
                      setNewPhotoStage('final');
                      setNewPhotoType('despues');
                      setActiveTab('add');
                    }}
                    className="mt-3 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Tomar foto de resultado ahora
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <span className="font-bold">Demostración al Cliente:</span>
            <span>
              Esta comparativa visual protege al taller garantizando la transparencia del estado en que ingresó el zapato y el valor artesanal del acabado entregado.
            </span>
          </div>
        </div>
      )}

      {/* View: Full Gallery */}
      {activeTab === 'gallery' && (
        <div className="space-y-4 pt-2">
          {order.photos.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs">
              No hay fotografías registradas aún en esta orden.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {order.photos.map((photo, i) => (
                <div key={photo.id || i} className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="aspect-4/3 bg-stone-100 relative group overflow-hidden">
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.type}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-stone-900/80 text-white text-[10px] font-semibold rounded-full uppercase">
                      {photo.stage} • {photo.type}
                    </div>
                  </div>
                  <div className="p-2.5 text-xs">
                    <p className="font-semibold text-stone-800 truncate">{photo.caption || `Vista ${photo.type}`}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">{photo.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View: Add Photo Form */}
      {activeTab === 'add' && (
        <form onSubmit={handleAddPhoto} className="space-y-4 pt-2">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
            <span className="font-bold text-stone-700">Presets rápidos de prueba de taller:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="p-2 text-left bg-white border border-stone-300 rounded-lg hover:border-amber-500 hover:bg-amber-50/40 text-[11px] transition-colors"
                >
                  <div className="font-medium text-stone-900 truncate">{p.title}</div>
                  <div className="text-stone-400 text-[10px] capitalize">{p.stage}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Etapa de la Fotografía *
              </label>
              <select
                value={newPhotoStage}
                onChange={e => setNewPhotoStage(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
              >
                <option value="recepcion">Recepción (Evidencia inicial)</option>
                <option value="diagnostico">Diagnóstico Técnico</option>
                <option value="taller">Proceso en Taller</option>
                <option value="final">Final (Resultado / Después)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ángulo / Enfoque *
              </label>
              <select
                value={newPhotoType}
                onChange={e => setNewPhotoType(e.target.value as PhotoType)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden capitalize"
              >
                <option value="frontal">Vista Frontal</option>
                <option value="lateral">Vista Lateral</option>
                <option value="trasera">Vista Trasera</option>
                <option value="suela">Suela</option>
                <option value="tacon">Tacón</option>
                <option value="dano">Daño Específico</option>
                <option value="interior">Interior / Forro</option>
                <option value="despues">Resultado Final (Después)</option>
                <option value="otra">Otra</option>
              </select>
            </div>
          </div>

          {uploadError && (
            <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {uploadError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Subir Fotografía desde el Dispositivo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setSelectedFile(file);
                if (file) setNewPhotoUrl('');
              }}
              className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 border border-stone-300 rounded-lg bg-white"
            />
            {selectedFile && (
              <p className="text-[11px] text-emerald-700 mt-1 font-medium">Archivo seleccionado: {selectedFile.name}</p>
            )}
          </div>

          <div className="relative flex items-center gap-3 text-[10px] text-stone-400 uppercase font-bold">
            <div className="h-px bg-stone-200 flex-1" />
            O usar una URL
            <div className="h-px bg-stone-200 flex-1" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              URL de la Imagen o Fotografía
            </label>
            <input
              type="url"
              value={newPhotoUrl}
              onChange={e => {
                setNewPhotoUrl(e.target.value);
                if (e.target.value) setSelectedFile(null);
              }}
              placeholder="https://... o selecciona un preset de arriba"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Descripción o Hallazgo (Opcional)
            </label>
            <input
              type="text"
              value={newCaption}
              onChange={e => setNewCaption(e.target.value)}
              placeholder="Ej: Suela despegada en lado interno derecho, desgaste 80%"
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('compare')}
              className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading || (!selectedFile && !newPhotoUrl.trim())}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {isUploading ? 'Guardando...' : 'Guardar Fotografía'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
