import React, { useState, useEffect } from 'react';
import {
  Customer,
  ShoeType,
  ShoeMaterial,
  PhotoType,
  Diagnosis,
  OrderPriority,
  ServiceOrder,
  PaymentMethod,
  DiscountType,
} from '../../types';
import { useApp } from '../../context/AppContext';
import {
  User,
  Footprints,
  Camera,
  Stethoscope,
  Wrench,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  ImagePlus,
  Percent,
  DollarSign,
  Banknote,
  X,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface NewOrderWizardProps {
  onSuccess: (createdOrder: ServiceOrder) => void;
  onCancel: () => void;
}

interface PendingPhoto {
  localId: string;
  url: string;
  type: PhotoType;
  stage: 'recepcion' | 'diagnostico' | 'taller' | 'final';
  caption?: string;
  file?: File;
}

interface DraftService {
  serviceId?: string;
  name: string;
  description: string;
  price: number;
  estimatedMinutes: number;
}

/** One pair of shoes within the order — its own shoe attributes, evidence
 * photos, technical diagnosis and assigned services, independent of every
 * other pair added to this same reception. */
interface PairDraft {
  localId: string;
  shoeType: ShoeType | '';
  brand: string;
  model: string;
  color: string;
  size: string;
  material: ShoeMaterial | '';
  pairCount: number | '';
  conditionDescription: string;
  clientObservations: string;

  photos: PendingPhoto[];
  newPhotoType: PhotoType;
  newPhotoCaption: string;

  soleCondition: Diagnosis['soleCondition'] | '';
  heelCondition: Diagnosis['heelCondition'] | '';
  leatherCondition: Diagnosis['leatherCondition'] | '';
  stitchingCondition: Diagnosis['stitchingCondition'] | '';
  liningCondition: Diagnosis['liningCondition'] | '';
  zippersCondition: Diagnosis['zippersCondition'] | '';
  eyeletsCondition: Diagnosis['eyeletsCondition'] | '';
  generalCondition: Diagnosis['generalCondition'] | '';
  recommendedWork: string;

  services: DraftService[];
  customServiceName: string;
  customServicePrice: number;
}

let pairSeq = 0;
const createEmptyPair = (): PairDraft => ({
  localId: `pair-${++pairSeq}`,
  shoeType: '',
  brand: '',
  model: '',
  color: '',
  size: '',
  material: '',
  pairCount: '',
  conditionDescription: '',
  clientObservations: '',
  photos: [],
  newPhotoType: 'frontal',
  newPhotoCaption: '',
  soleCondition: '',
  heelCondition: '',
  leatherCondition: '',
  stitchingCondition: '',
  liningCondition: '',
  zippersCondition: '',
  eyeletsCondition: '',
  generalCondition: '',
  recommendedWork: '',
  services: [],
  customServiceName: '',
  customServicePrice: 0,
});

const pairLabel = (p: PairDraft, idx: number) => {
  const bits = [p.shoeType, p.brand].filter(Boolean).join(' ');
  return bits ? `Par ${idx + 1} — ${bits}` : `Par ${idx + 1}`;
};

// --- Per-pair completion, shared by validation and the progress UI ---
const isShoeInfoComplete = (p: PairDraft) =>
  !!p.shoeType && !!p.brand.trim() && !!p.color.trim() && !!p.size.trim() && !!p.material && !!p.pairCount && !!p.conditionDescription.trim();

const isDiagnosisComplete = (p: PairDraft) =>
  !!p.soleCondition && !!p.heelCondition && !!p.leatherCondition && !!p.stitchingCondition &&
  !!p.liningCondition && !!p.zippersCondition && !!p.eyeletsCondition && !!p.generalCondition &&
  !!p.recommendedWork.trim();

const isServicesComplete = (p: PairDraft) => p.services.length > 0;

/** How many of the 3 sub-steps (calzado, diagnóstico, servicios) are done for this pair, 0-3. */
const pairProgress = (p: PairDraft) =>
  [isShoeInfoComplete(p), isDiagnosisComplete(p), isServicesComplete(p)].filter(Boolean).length;

export const NewOrderWizard: React.FC<NewOrderWizardProps> = ({ onSuccess, onCancel }) => {
  const {
    customers,
    createCustomer,
    servicesCatalog,
    users,
    createOrder,
    uploadOrderPhoto,
    currentUser,
    settings,
    registerPayment
  } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(1);

  // STEP 1: CLIENT SELECTION OR CREATION
  const [clientSearch, setClientSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);
  const [newClientFirstName, setNewClientFirstName] = useState('');
  const [newClientLastName, setNewClientLastName] = useState('');
  const [newClientDoc, setNewClientDoc] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientWhatsApp, setNewClientWhatsApp] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');

  // STEP 2/3/4: ONE OR MORE PAIRS OF SHOES, EACH WITH OWN PHOTOS/DIAGNOSIS/SERVICES
  const [pairs, setPairs] = useState<PairDraft[]>([createEmptyPair()]);
  const [activePairIndex, setActivePairIndex] = useState(0);
  const activePair = pairs[activePairIndex];

  const updatePair = (index: number, patch: Partial<PairDraft>) => {
    setPairs(prev => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const addPair = () => {
    setPairs(prev => [...prev, createEmptyPair()]);
    setActivePairIndex(pairs.length);
  };

  const removePair = (index: number) => {
    if (pairs.length <= 1) return;
    setPairs(prev => prev.filter((_, i) => i !== index));
    setActivePairIndex(prev => (prev >= index ? Math.max(0, prev - 1) : prev));
  };

  // Order-level fields (shared across every pair in this single order/ticket)
  const defaultPromised = new Date();
  defaultPromised.setDate(defaultPromised.getDate() + (settings.standardServiceDays || 4));
  const [promisedDate, setPromisedDate] = useState(defaultPromised.toISOString().split('T')[0]);
  const [priority, setPriority] = useState<OrderPriority>('NORMAL');
  const [assignedTechId, setAssignedTechId] = useState('');

  const handleAddPhotoFile = (pairIndex: number, file: File) => {
    const localUrl = URL.createObjectURL(file);
    setPairs(prev => prev.map((p, i) => {
      if (i !== pairIndex) return p;
      return {
        ...p,
        photos: [
          ...p.photos,
          {
            localId: `file-${Date.now()}`,
            url: localUrl,
            type: p.newPhotoType,
            stage: 'recepcion',
            caption: p.newPhotoCaption.trim() || undefined,
            file,
          },
        ],
        newPhotoCaption: '',
      };
    }));
  };

  const removePhoto = (pairIndex: number, localId: string) => {
    setPairs(prev => prev.map((p, i) => (i === pairIndex ? { ...p, photos: p.photos.filter(ph => ph.localId !== localId) } : p)));
  };

  // STEP 4: SERVICES & BUDGET (per pair, totaled across the whole order)
  const [discountType, setDiscountType] = useState<DiscountType>('FIXED');
  const [discountValue, setDiscountValue] = useState<number>(0);

  const handleToggleCatalogService = (pairIndex: number, srv: typeof servicesCatalog[0]) => {
    setPairs(prev => prev.map((p, i) => {
      if (i !== pairIndex) return p;
      const exists = p.services.find(s => s.serviceId === srv.id);
      return {
        ...p,
        services: exists
          ? p.services.filter(s => s.serviceId !== srv.id)
          : [...p.services, { serviceId: srv.id, name: srv.name, description: srv.description, price: srv.standardPrice, estimatedMinutes: srv.estimatedMinutes }],
      };
    }));
  };

  const handleAddCustomService = (pairIndex: number) => {
    setPairs(prev => prev.map((p, i) => {
      if (i !== pairIndex || !p.customServiceName.trim() || p.customServicePrice <= 0) return p;
      return {
        ...p,
        services: [...p.services, { name: p.customServiceName.trim(), description: 'Servicio personalizado agregado en recepción', price: p.customServicePrice, estimatedMinutes: 0 }],
        customServiceName: '',
        customServicePrice: 0,
      };
    }));
  };

  const handleUpdateServicePrice = (pairIndex: number, serviceIdx: number, price: number) => {
    setPairs(prev => prev.map((p, i) => (i === pairIndex ? { ...p, services: p.services.map((s, si) => (si === serviceIdx ? { ...s, price } : s)) } : p)));
  };

  const handleRemoveService = (pairIndex: number, serviceIdx: number) => {
    setPairs(prev => prev.map((p, i) => (i === pairIndex ? { ...p, services: p.services.filter((_, si) => si !== serviceIdx) } : p)));
  };

  // STEP 5: ADVANCE PAYMENT & CONFIRMATION
  const [advanceAmount, setAdvanceAmount] = useState<number>(15.0);
  const [advanceMethod, setAdvanceMethod] = useState<PaymentMethod>('EFECTIVO');
  const [cashReceived, setCashReceived] = useState<number>(15.0);

  useEffect(() => {
    setCashReceived(advanceAmount);
  }, [advanceAmount]);

  const allServices = pairs.flatMap(p => p.services);
  const allPhotosCount = pairs.reduce((acc, p) => acc + p.photos.length, 0);
  const subtotal = allServices.reduce((acc, s) => acc + s.price, 0);
  const discountAmount = Math.min(
    subtotal,
    discountType === 'PERCENT' ? subtotal * (Math.max(0, discountValue) / 100) : Math.max(0, discountValue)
  );
  const total = Math.max(0, subtotal - discountAmount);
  const balancePending = Math.max(0, total - advanceAmount);

  // Filter clients
  const filteredCustomers = customers.filter(c => {
    const q = clientSearch.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.documentId && c.documentId.includes(q))
    );
  });

  const technicians = users.filter(u => u.role === 'ZAPATERO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleCreateClientQuick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientFirstName.trim() || !newClientPhone.trim()) return;

    const created = await createCustomer({
      firstName: newClientFirstName.trim(),
      lastName: newClientLastName.trim(),
      documentId: newClientDoc.trim() || undefined,
      phone: newClientPhone.trim(),
      whatsapp: newClientWhatsApp.trim() || newClientPhone.trim(),
      email: newClientEmail.trim() || undefined,
      address: newClientAddress.trim() || undefined,
      notes: newClientNotes.trim() || undefined,
    });

    setSelectedCustomer(created);
    setIsCreatingNewClient(false);
  };

  // --- Cross-pair validation helpers ---
  const findIncompleteShoeStepPair = () => pairs.findIndex(p => !isShoeInfoComplete(p));
  const findIncompleteDiagnosisStepPair = () => pairs.findIndex(p => !isDiagnosisComplete(p));
  const findPairWithoutServices = () => pairs.findIndex(p => !isServicesComplete(p));

  const handleFinalSubmit = async () => {
    if (!selectedCustomer) {
      alert('Debe seleccionar o registrar un cliente.');
      setCurrentStep(1);
      return;
    }

    const shoeStepFail = findIncompleteShoeStepPair();
    if (shoeStepFail !== -1) {
      alert(`Complete los datos obligatorios del calzado del Par ${shoeStepFail + 1} (tipo, marca, color, talla, material, cantidad y estado físico).`);
      setActivePairIndex(shoeStepFail);
      setCurrentStep(2);
      return;
    }

    const diagnosisStepFail = findIncompleteDiagnosisStepPair();
    if (diagnosisStepFail !== -1) {
      alert(`Complete el diagnóstico técnico del Par ${diagnosisStepFail + 1} (seleccione N/A si algún componente no aplica) y su trabajo recomendado.`);
      setActivePairIndex(diagnosisStepFail);
      setCurrentStep(3);
      return;
    }

    const noServicesPair = findPairWithoutServices();
    if (noServicesPair !== -1) {
      alert(`Debe seleccionar o agregar al menos un servicio para el Par ${noServicesPair + 1}.`);
      setActivePairIndex(noServicesPair);
      setCurrentStep(4);
      return;
    }

    if (advanceAmount > 0 && advanceMethod === 'EFECTIVO' && cashReceived < advanceAmount) {
      alert('El efectivo recibido es menor al anticipo. Verifique el monto entregado por el cliente.');
      return;
    }

    const techObj = users.find(u => u.id === assignedTechId);

    setSubmitError('');
    setIsSubmitting(true);
    try {
      const items = pairs.map(p => {
        const diagnosis: Diagnosis = {
          issuesFound: [p.soleCondition !== 'Bueno' ? `Suela: ${p.soleCondition}` : '', p.heelCondition !== 'Bueno' ? `Tacón: ${p.heelCondition}` : ''].filter(Boolean),
          soleCondition: p.soleCondition as Diagnosis['soleCondition'],
          heelCondition: p.heelCondition as Diagnosis['heelCondition'],
          leatherCondition: p.leatherCondition as Diagnosis['leatherCondition'],
          stitchingCondition: p.stitchingCondition as Diagnosis['stitchingCondition'],
          liningCondition: p.liningCondition as Diagnosis['liningCondition'],
          zippersCondition: p.zippersCondition as Diagnosis['zippersCondition'],
          eyeletsCondition: p.eyeletsCondition as Diagnosis['eyeletsCondition'],
          generalCondition: p.generalCondition as Diagnosis['generalCondition'],
          technicalNotes: '',
          recommendedWork: p.recommendedWork,
          diagnosedBy: currentUser.name,
          diagnosedAt: new Date().toLocaleString('es-EC', { hour12: false }),
        };

        return {
          type: p.shoeType as ShoeType,
          brand: p.brand,
          model: p.model,
          color: p.color,
          size: p.size,
          material: p.material as ShoeMaterial,
          pairCount: p.pairCount as number,
          conditionDescription: p.conditionDescription,
          clientObservations: p.clientObservations,
          diagnosis,
          photos: p.photos.filter(ph => !ph.file).map(ph => ({ url: ph.url, type: ph.type, stage: ph.stage, caption: ph.caption })),
          services: p.services,
        };
      });

      let newOrder = await createOrder({
        customerId: selectedCustomer.id,
        promisedDate,
        currentStatusText: 'Recepción completada. Esperando ingreso a taller.',
        priority,
        assignedTechnicianId: assignedTechId || undefined,
        assignedTechnicianName: techObj?.name,
        items,
        discountType,
        discountValue,
        status: advanceAmount > 0 ? 'APROBADA' : 'RECIBIDA',
        budgetStatus: 'aprobado',
        generalObservations: pairs.map(p => p.clientObservations).filter(Boolean).join(' | '),
        serviceConditionsAgreed: true,
      });

      // Upload any real device photos now that the order (and its per-pair
      // ShoeItem rows) exist, tagging each upload to its owning pair.
      const sortedItems = [...newOrder.items].sort((a, b) => a.position - b.position);
      for (let idx = 0; idx < pairs.length; idx++) {
        const shoeItemId = sortedItems[idx]?.id;
        for (const p of pairs[idx].photos) {
          if (p.file) {
            await uploadOrderPhoto(newOrder.id, p.file, { type: p.type, stage: p.stage, caption: p.caption, shoeItemId });
          }
        }
      }

      // If advance payment was made, register it
      if (advanceAmount > 0) {
        newOrder = await registerPayment(
          newOrder.id,
          advanceAmount,
          advanceMethod,
          'ANTICIPO',
          undefined,
          'Anticipo recibido al registrar la orden',
          advanceMethod === 'EFECTIVO' ? cashReceived : undefined
        );
      }

      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}

      onSuccess(newOrder);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo registrar la orden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'Cliente', icon: User },
    { num: 2, title: 'Calzado & Fotos', icon: Footprints },
    { num: 3, title: 'Diagnóstico', icon: Stethoscope },
    { num: 4, title: 'Servicios', icon: Wrench },
    { num: 5, title: 'Anticipo & Ticket', icon: CheckCircle2 },
  ];
  const LAST_STEP = steps.length;
  const showsPairTabs = currentStep === 2 || currentStep === 3 || currentStep === 4;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col min-h-[680px]">
      {/* Step Header */}
      <div className="bg-stone-50 border-b border-stone-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              Recepción y Apertura de Orden de Servicio
            </h2>
            <p className="text-xs text-stone-500">
              Flujo guiado para recepción de calzado, diagnóstico, fotos y presupuesto.
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {steps.map(s => {
              const Icon = s.icon;
              const isActive = s.num === currentStep;
              const isPast = s.num < currentStep;
              return (
                <button
                  key={s.num}
                  onClick={() => setCurrentStep(s.num)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-xs'
                      : isPast
                      ? 'bg-amber-100/70 text-amber-900 hover:bg-amber-100'
                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{s.num}. {s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pair tabs — shared across steps 2/3/4 so switching pairs keeps context.
            Each pill carries its own live progress dot so a recepcionista can
            tell, without clicking in, which pairs still need attention. */}
        {showsPairTabs && (
          <>
            <div className="flex items-center gap-1.5 overflow-x-auto mt-3 pt-3 border-t border-stone-200">
              <Layers className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider shrink-0">
                {pairs.length} par{pairs.length > 1 ? 'es' : ''} en esta orden
              </span>
              <span className="w-px h-4 bg-stone-300 shrink-0 mx-0.5" />
              {pairs.map((p, idx) => {
                const progress = pairProgress(p);
                const isComplete = progress === 3;
                return (
                  <button
                    key={p.localId}
                    type="button"
                    onClick={() => setActivePairIndex(idx)}
                    title={`${pairLabel(p, idx)} — ${progress}/3 secciones completas`}
                    className={`group flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      idx === activePairIndex
                        ? 'bg-stone-900 text-white shadow-xs scale-[1.03]'
                        : 'bg-white text-stone-600 border border-stone-300 hover:border-stone-400 hover:bg-stone-50'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${idx === activePairIndex ? 'text-emerald-400' : 'text-emerald-500'}`} />
                    ) : (
                      <span className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
                        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 -rotate-90">
                          <circle cx="8" cy="8" r="6.5" fill="none" strokeWidth="3" className={idx === activePairIndex ? 'stroke-white/25' : 'stroke-stone-200'} />
                          <circle
                            cx="8" cy="8" r="6.5" fill="none" strokeWidth="3" strokeLinecap="round"
                            strokeDasharray={`${(progress / 3) * 40.8} 40.8`}
                            className={progress === 0 ? 'stroke-transparent' : idx === activePairIndex ? 'stroke-amber-400' : 'stroke-amber-500'}
                          />
                        </svg>
                      </span>
                    )}
                    {pairLabel(p, idx)}
                    {pairs.length > 1 && (
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); removePair(idx); }}
                        className={`p-0.5 rounded-full ${idx === activePairIndex ? 'hover:bg-white/20' : 'hover:bg-stone-200'}`}
                        title="Quitar este par"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={addPair}
                className="flex items-center gap-1.5 pl-2.5 pr-3.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-xs hover:shadow-md transition-all hover:scale-[1.03]"
              >
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white/25">
                  <Plus className="w-3 h-3" />
                </span>
                Añadir otro par a esta orden
              </button>
            </div>

            {/* Floating mini-summary — at-a-glance fill status for every pair,
                so nothing is missed before moving on to Anticipo & Ticket. */}
            <div className="flex items-center gap-2 overflow-x-auto mt-2.5 pb-0.5">
              {pairs.map((p, idx) => {
                const shoeDone = isShoeInfoComplete(p);
                const diagDone = isDiagnosisComplete(p);
                const servDone = isServicesComplete(p);
                return (
                  <button
                    key={p.localId}
                    type="button"
                    onClick={() => setActivePairIndex(idx)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-left shrink-0 transition-colors ${
                      idx === activePairIndex ? 'bg-amber-50 border-amber-300' : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Par {idx + 1}</span>
                    <span className="flex items-center gap-1">
                      <span title="Calzado y fotos"><Footprints className={`w-3.5 h-3.5 ${shoeDone ? 'text-emerald-600' : 'text-stone-300'}`} /></span>
                      <span title="Diagnóstico"><Stethoscope className={`w-3.5 h-3.5 ${diagDone ? 'text-emerald-600' : 'text-stone-300'}`} /></span>
                      <span title="Servicios"><Wrench className={`w-3.5 h-3.5 ${servDone ? 'text-emerald-600' : 'text-stone-300'}`} /></span>
                    </span>
                    {p.photos.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-stone-400">
                        <Camera className="w-3 h-3" />
                        {p.photos.length}
                      </span>
                    )}
                  </button>
                );
              })}
              <span className="text-[10px] text-stone-400 shrink-0 pl-1">
                {pairs.filter(p => pairProgress(p) === 3).length}/{pairs.length} pares listos
              </span>
            </div>
          </>
        )}
      </div>

      {/* Main Wizard Step Content */}
      <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
        {/* STEP 1: CLIENT */}
        {currentStep === 1 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">
                  Paso 1: Identificación del Cliente
                </h3>
                <p className="text-xs text-stone-500">
                  Busque un cliente frecuente por nombre o teléfono, o registre uno nuevo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreatingNewClient(!isCreatingNewClient)}
                className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                {isCreatingNewClient ? 'Buscar Existente' : 'Nuevo Cliente'}
              </button>
            </div>

            {/* Selected Client Card */}
            {selectedCustomer && !isCreatingNewClient && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                    Cliente Seleccionado
                  </span>
                  <div className="text-base font-bold text-stone-900">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </div>
                  <div className="text-xs text-stone-600">
                    Tel: {selectedCustomer.phone} | WA: {selectedCustomer.whatsapp} | C.I.: {selectedCustomer.documentId || 'N/D'}
                  </div>
                  {selectedCustomer.notes && (
                    <div className="text-[11px] text-stone-500 mt-1 italic">
                      Nota: {selectedCustomer.notes}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="px-2.5 py-1 text-xs text-stone-500 hover:text-stone-800 font-semibold border border-stone-300 rounded-lg bg-white"
                >
                  Cambiar
                </button>
              </div>
            )}

            {/* Form: New Client */}
            {isCreatingNewClient ? (
              <form onSubmit={handleCreateClientQuick} className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Registrar Nuevo Cliente
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={newClientFirstName}
                      onChange={e => setNewClientFirstName(e.target.value)}
                      placeholder="Ej: Marcelo"
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Apellido *</label>
                    <input
                      type="text"
                      required
                      value={newClientLastName}
                      onChange={e => setNewClientLastName(e.target.value)}
                      placeholder="Ej: Carrera"
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Teléfono Móvil *</label>
                    <input
                      type="tel"
                      required
                      value={newClientPhone}
                      onChange={e => {
                        setNewClientPhone(e.target.value);
                        if (!newClientWhatsApp) setNewClientWhatsApp(e.target.value);
                      }}
                      placeholder="Ej: +593 98 123 4567"
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">WhatsApp para Notificaciones *</label>
                    <input
                      type="tel"
                      required
                      value={newClientWhatsApp}
                      onChange={e => setNewClientWhatsApp(e.target.value)}
                      placeholder="Ej: +593981234567"
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Cédula / RUC (Opcional)</label>
                    <input
                      type="text"
                      value={newClientDoc}
                      onChange={e => setNewClientDoc(e.target.value)}
                      placeholder="17..."
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={newClientEmail}
                      onChange={e => setNewClientEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={newClientAddress}
                    onChange={e => setNewClientAddress(e.target.value)}
                    placeholder="Calle, Número y Sector..."
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Observaciones del Cliente</label>
                  <input
                    type="text"
                    value={newClientNotes}
                    onChange={e => setNewClientNotes(e.target.value)}
                    placeholder="Preferencias, tipo de calzado que suele traer..."
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewClient(false)}
                    className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-200 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
                  >
                    Guardar y Seleccionar
                  </button>
                </div>
              </form>
            ) : !selectedCustomer && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar cliente por nombre, teléfono o cédula..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>

                <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 max-h-60 overflow-y-auto bg-white shadow-xs">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-stone-400">
                      No se encontraron clientes. Haga clic en "Nuevo Cliente" para registrarlo.
                    </div>
                  ) : (
                    filteredCustomers.map(c => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className="p-3 hover:bg-stone-50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="text-xs font-bold text-stone-900">
                            {c.firstName} {c.lastName}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {c.phone} • {c.email || 'Sin correo'} • C.I.: {c.documentId || 'N/A'}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-amber-700">Seleccionar →</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SHOE DETAILS + PHOTOS (per pair) */}
        {currentStep === 2 && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">
                Paso 2: Calzado y Evidencia Fotográfica
              </h3>
              <p className="text-xs text-stone-500">
                Detalle las especificaciones técnicas y registre las fotos de recepción de {pairLabel(activePair, activePairIndex)}. Use "Añadir otro par" arriba si el cliente trae más de un par distinto.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Tipo de Calzado *</label>
                <select
                  required
                  value={activePair.shoeType}
                  onChange={e => updatePair(activePairIndex, { shoeType: e.target.value as ShoeType })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                >
                  <option value="" disabled>-- Selecciona el tipo --</option>
                  <option value="Zapatos">Zapatos formales</option>
                  <option value="Zapatillas">Zapatillas / Sneakers</option>
                  <option value="Botas">Botas</option>
                  <option value="Botines">Botines</option>
                  <option value="Tacones">Tacones / Stilettos</option>
                  <option value="Sandalias">Sandalias</option>
                  <option value="Mocasines">Mocasines / Loafers</option>
                  <option value="Calzado deportivo">Calzado deportivo</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Marca *</label>
                <input
                  type="text"
                  required
                  value={activePair.brand}
                  onChange={e => updatePair(activePairIndex, { brand: e.target.value })}
                  placeholder="Ej: Nike, Timberland, Church's, Louboutin..."
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Modelo</label>
                <input
                  type="text"
                  value={activePair.model}
                  onChange={e => updatePair(activePairIndex, { model: e.target.value })}
                  placeholder="Ej: Air Jordan 1, 6-Inch..."
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Color *</label>
                <input
                  type="text"
                  required
                  value={activePair.color}
                  onChange={e => updatePair(activePairIndex, { color: e.target.value })}
                  placeholder="Ej: Negro, Café, Miel..."
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Talla *</label>
                <input
                  type="text"
                  required
                  value={activePair.size}
                  onChange={e => updatePair(activePairIndex, { size: e.target.value })}
                  placeholder="Ej: 41, 42, 8.5 US..."
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Material Predominante *</label>
                <select
                  required
                  value={activePair.material}
                  onChange={e => updatePair(activePairIndex, { material: e.target.value as ShoeMaterial })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                >
                  <option value="" disabled>-- Selecciona el material --</option>
                  <option value="Cuero">Cuero vacuno / flor</option>
                  <option value="Gamuza / ante">Gamuza / Ante</option>
                  <option value="Nobuk">Nobuk</option>
                  <option value="Sintético">Sintético / PU</option>
                  <option value="Tela">Tela / Malla</option>
                  <option value="Lona">Lona</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Cant. de Pares Idénticos *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={activePair.pairCount}
                  placeholder="Ej: 1"
                  onChange={e => {
                    const raw = e.target.value;
                    updatePair(activePairIndex, { pairCount: raw === '' ? '' : Math.max(1, parseInt(raw) || 1) });
                  }}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Descripción del Estado Físico de Recepción *</label>
                <textarea
                  rows={2}
                  required
                  value={activePair.conditionDescription}
                  onChange={e => updatePair(activePairIndex, { conditionDescription: e.target.value })}
                  placeholder="Desgaste de suela, raspaduras en puntera, suciedad, manchas visibles..."
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Observaciones / Peticiones Especiales del Cliente</label>
                <textarea
                  rows={2}
                  value={activePair.clientObservations}
                  onChange={e => updatePair(activePairIndex, { clientObservations: e.target.value })}
                  placeholder="Ej: Mantener el logo original, usar ceras naturales, no oscurecer el tono..."
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
              </div>
            </div>

            {/* Order-level fields — apply once to the whole order, not per pair */}
            <div className="pt-4 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Fecha Prometida de Entrega *</label>
                <input
                  type="date"
                  required
                  value={promisedDate}
                  onChange={e => setPromisedDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Prioridad de la Orden</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as OrderPriority)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="URGENTE">Urgente (+48 hrs)</option>
                  <option value="MUY_URGENTE">Muy Urgente (Express 24 hrs)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Técnico Asignado (Opcional)</label>
                <select
                  value={assignedTechId}
                  onChange={e => setAssignedTechId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                >
                  <option value="">-- Asignar en taller después --</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.specialty || 'General'})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Integrated photo evidence section — scoped to the active pair */}
            <div className="pt-2 border-t border-stone-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-stone-800">
                    Evidencia Fotográfica de {pairLabel(activePair, activePairIndex)} ({activePair.photos.length})
                  </span>
                </div>
                <span className="text-[11px] text-stone-400">Frontal, lateral, suela, tacón o daños específicos</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {activePair.photos.map(p => (
                  <div key={p.localId} className="group relative border border-stone-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <div className="aspect-square bg-stone-100">
                      <img src={p.url} alt={p.type} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="px-2 py-1.5">
                      <span className="text-[10px] font-semibold text-stone-700 capitalize block truncate">{p.type}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(activePairIndex, p.localId)}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Modern add-photo tile */}
                <label className="aspect-square border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center gap-1.5 text-stone-400 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50/40 cursor-pointer transition-colors">
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-[10px] font-semibold text-center px-1">Subir foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleAddPhotoFile(activePairIndex, file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-3">
                <select
                  value={activePair.newPhotoType}
                  onChange={e => updatePair(activePairIndex, { newPhotoType: e.target.value as PhotoType })}
                  className="px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                  title="Ángulo de la próxima foto a subir"
                >
                  <option value="frontal">Vista Frontal</option>
                  <option value="lateral">Vista Lateral</option>
                  <option value="trasera">Vista Trasera</option>
                  <option value="suela">Suela</option>
                  <option value="tacon">Tacón</option>
                  <option value="dano">Daño Específico</option>
                  <option value="interior">Interior</option>
                  <option value="otra">Otra</option>
                </select>
                <input
                  type="text"
                  placeholder="Nota breve para la próxima foto (opcional)..."
                  value={activePair.newPhotoCaption}
                  onChange={e => updatePair(activePairIndex, { newPhotoCaption: e.target.value })}
                  className="flex-1 min-w-[180px] px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: DIAGNOSIS (per pair) */}
        {currentStep === 3 && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">
                Paso 3: Diagnóstico Técnico del Calzado
              </h3>
              <p className="text-xs text-stone-500">
                Inspección estructural de {pairLabel(activePair, activePairIndex)} por parte del técnico o recepcionista capacitado.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Estado de Suela *</label>
                <select
                  required
                  value={activePair.soleCondition}
                  onChange={e => updatePair(activePairIndex, { soleCondition: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white"
                >
                  <option value="" disabled>-- Selecciona --</option>
                  <option value="Bueno">Bueno</option>
                  <option value="Desgastado">Desgastado</option>
                  <option value="Perforado">Perforado</option>
                  <option value="Despegado">Despegado</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Estado de Tacón *</label>
                <select
                  required
                  value={activePair.heelCondition}
                  onChange={e => updatePair(activePairIndex, { heelCondition: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white"
                >
                  <option value="" disabled>-- Selecciona --</option>
                  <option value="Bueno">Bueno</option>
                  <option value="Desgastado">Desgastado</option>
                  <option value="Tapa destruida">Tapa destruida</option>
                  <option value="Desalineado">Desalineado</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Estado del Cuero *</label>
                <select
                  required
                  value={activePair.leatherCondition}
                  onChange={e => updatePair(activePairIndex, { leatherCondition: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white"
                >
                  <option value="" disabled>-- Selecciona --</option>
                  <option value="Óptimo">Óptimo</option>
                  <option value="Seco">Seco / Deshidratado</option>
                  <option value="Cuarteado">Cuarteado</option>
                  <option value="Manchado">Manchado</option>
                  <option value="Descolorido">Descolorido</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Costuras *</label>
                <select
                  required
                  value={activePair.stitchingCondition}
                  onChange={e => updatePair(activePairIndex, { stitchingCondition: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white"
                >
                  <option value="" disabled>-- Selecciona --</option>
                  <option value="Intactas">Intactas</option>
                  <option value="Rotas en puntera">Rotas en puntera</option>
                  <option value="Descosido lateral">Descosido lateral</option>
                  <option value="Falta hilo">Falta hilo</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Forro Interno *</label>
                <select
                  required
                  value={activePair.liningCondition}
                  onChange={e => updatePair(activePairIndex, { liningCondition: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white"
                >
                  <option value="" disabled>-- Selecciona --</option>
                  <option value="Intacto">Intacto</option>
                  <option value="Talonera rota">Talonera rota</option>
                  <option value="Desgastado">Desgastado</option>
                  <option value="Rasgado">Rasgado</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Cremalleras *</label>
                <select
                  required
                  value={activePair.zippersCondition}
                  onChange={e => updatePair(activePairIndex, { zippersCondition: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white"
                >
                  <option value="" disabled>-- Selecciona --</option>
                  <option value="N/A">N/A (Sin cierre)</option>
                  <option value="Bueno">Bueno</option>
                  <option value="Atascado">Atascado</option>
                  <option value="Dientes rotos">Dientes rotos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Ojales / Herrajes *</label>
                <select
                  required
                  value={activePair.eyeletsCondition}
                  onChange={e => updatePair(activePairIndex, { eyeletsCondition: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white"
                >
                  <option value="" disabled>-- Selecciona --</option>
                  <option value="Bueno">Bueno</option>
                  <option value="Oxidado">Oxidado</option>
                  <option value="Faltante">Faltante</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Estado General *</label>
                <select
                  required
                  value={activePair.generalCondition}
                  onChange={e => updatePair(activePairIndex, { generalCondition: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white font-bold text-amber-900"
                >
                  <option value="" disabled>-- Selecciona --</option>
                  <option value="Excelente">Excelente</option>
                  <option value="Aceptable">Aceptable</option>
                  <option value="Deteriorado">Deteriorado</option>
                  <option value="Crítico">Crítico</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Trabajo Recomendado para {pairLabel(activePair, activePairIndex)} *</label>
              <input
                type="text"
                value={activePair.recommendedWork}
                onChange={e => updatePair(activePairIndex, { recommendedWork: e.target.value })}
                placeholder="Plan de acción sugerido..."
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white font-medium text-amber-900"
              />
            </div>
          </div>
        )}

        {/* STEP 4: SERVICES SELECTION & BUDGET (per pair, totaled for the order) */}
        {currentStep === 4 && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">
                  Paso 4: Selección de Trabajos & Presupuesto
                </h3>
                <p className="text-xs text-stone-500">
                  Marque servicios del catálogo o agregue uno personalizado para {pairLabel(activePair, activePairIndex)}.
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-stone-500">Total de la Orden (todos los pares):</span>
                <div className="text-xl font-mono font-black text-amber-900">
                  ${total.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Catalog Grid by Categories */}
            <div className="space-y-4">
              {[
                'REPARACIÓN Y CAMBIO DE SUELAS Y TACONES',
                'RESTAURACIÓN ESTÉTICA',
                'AJUSTES Y COMODIDAD',
                'COSTURAS Y ESTRUCTURA',
                'CIERRES Y ACCESORIOS',
                'PARCHES INTERNOS',
              ].map(category => {
                const categoryServices = servicesCatalog.filter(s => s.category === category);
                if (categoryServices.length === 0) return null;

                return (
                  <div key={category} className="border border-stone-200 rounded-xl p-4 bg-stone-50/50">
                    <div className="text-xs font-bold text-stone-800 tracking-wider uppercase mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-600" />
                      {category}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {categoryServices.map(srv => {
                        const isSelected = activePair.services.some(s => s.serviceId === srv.id);
                        return (
                          <div
                            key={srv.id}
                            onClick={() => handleToggleCatalogService(activePairIndex, srv)}
                            className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'bg-amber-50 border-amber-500 shadow-xs'
                                : 'bg-white border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1">
                                <span className="text-xs font-bold text-stone-900 leading-tight">
                                  {srv.name}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 text-amber-600 rounded-xs mt-0.5 pointer-events-none"
                                />
                              </div>
                              <p className="text-[10px] text-stone-500 mt-1 line-clamp-2">
                                {srv.description}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-stone-100 text-xs">
                              <span className="text-[10px] text-stone-400 font-mono">
                                ~{srv.estimatedMinutes} min
                              </span>
                              <span className="font-mono font-bold text-stone-900">
                                ${srv.standardPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected services editable list + custom add — scoped to the active pair */}
            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <div className="bg-stone-100 px-4 py-2 text-xs font-bold text-stone-700 uppercase tracking-wider">
                Servicios de {pairLabel(activePair, activePairIndex)} ({activePair.services.length})
              </div>
              {activePair.services.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-400">
                  Aún no hay servicios seleccionados para este par.
                </div>
              ) : (
                <div className="divide-y divide-stone-100 bg-white">
                  {activePair.services.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-4 py-2">
                      <span className="flex-1 text-xs font-semibold text-stone-800 truncate">{s.name}</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1.5 text-[10px] text-stone-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={s.price}
                          onChange={e => handleUpdateServicePrice(activePairIndex, idx, parseFloat(e.target.value) || 0)}
                          className="w-24 pl-5 pr-2 py-1 text-xs font-mono font-bold border border-stone-300 rounded-lg"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(activePairIndex, idx)}
                        className="p-1.5 text-stone-400 hover:text-red-600 transition-colors"
                        title="Quitar servicio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add custom service on the fly */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-stone-50 border-t border-stone-200">
                <input
                  type="text"
                  placeholder="Nombre de servicio personalizado..."
                  value={activePair.customServiceName}
                  onChange={e => updatePair(activePairIndex, { customServiceName: e.target.value })}
                  className="flex-1 min-w-[160px] px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
                />
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-[10px] text-stone-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={activePair.customServicePrice || ''}
                    onChange={e => updatePair(activePairIndex, { customServicePrice: parseFloat(e.target.value) || 0 })}
                    className="w-24 pl-5 pr-2 py-1.5 text-xs font-mono border border-stone-300 rounded-lg bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddCustomService(activePairIndex)}
                  disabled={!activePair.customServiceName.trim() || activePair.customServicePrice <= 0}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar
                </button>
              </div>
            </div>

            {/* Discount & Totals footer (order-level, across every pair) */}
            <div className="p-4 bg-white border border-stone-200 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-stone-700">Descuento (orden completa):</span>
                <div className="flex border border-stone-300 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setDiscountType('FIXED')}
                    className={`px-2 py-1.5 flex items-center gap-1 ${discountType === 'FIXED' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600'}`}
                    title="Descuento en monto fijo"
                  >
                    <DollarSign className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('PERCENT')}
                    className={`px-2 py-1.5 flex items-center gap-1 border-l border-stone-300 ${discountType === 'PERCENT' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600'}`}
                    title="Descuento en porcentaje"
                  >
                    <Percent className="w-3 h-3" />
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  max={discountType === 'PERCENT' ? 100 : subtotal}
                  value={discountValue}
                  onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1.5 text-xs border border-stone-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-6 text-xs font-mono">
                <div>Subtotal: <strong>${subtotal.toFixed(2)}</strong></div>
                {discountAmount > 0 && <div className="text-emerald-700">Descuento: <strong>-${discountAmount.toFixed(2)}</strong></div>}
                <div className="text-base font-bold text-stone-900">Total: ${total.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: ADVANCE PAYMENT & CONFIRMATION */}
        {currentStep === LAST_STEP && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center pb-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-stone-900">
                Confirmación de Orden y Anticipo
              </h3>
              <p className="text-xs text-stone-500">
                Revise los datos finales antes de registrar formalmente la orden — una sola orden, un solo ticket y un solo anticipo para todos los pares — y generar el ticket.
              </p>
            </div>

            {/* Review Summary */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3 text-xs">
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">Cliente:</span>
                <span className="font-bold text-stone-900">
                  {selectedCustomer?.firstName} {selectedCustomer?.lastName} ({selectedCustomer?.phone})
                </span>
              </div>
              <div className="border-b border-stone-200 pb-2">
                <span className="text-stone-500 block mb-1.5">Calzado ({pairs.length} par{pairs.length > 1 ? 'es' : ''}):</span>
                <div className="space-y-1">
                  {pairs.map((p, idx) => (
                    <div key={p.localId} className="flex justify-between items-center bg-white rounded-lg border border-stone-200 px-2.5 py-1.5">
                      <span className="font-bold text-stone-900">
                        Par {idx + 1}: {p.shoeType} {p.brand} {p.model} (Talla {p.size} • {p.color})
                      </span>
                      <span className="text-stone-500 font-mono">{p.services.length} servicio(s)</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">Fecha Prometida:</span>
                <span className="font-bold text-amber-800">{promisedDate} ({priority})</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">Servicios Seleccionados:</span>
                <span className="font-bold text-stone-900">{allServices.length} trabajo(s) en total</span>
              </div>
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">Fotografías:</span>
                <span className="font-bold text-stone-900">{allPhotosCount} imagen(es)</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-stone-900 pt-1">
                <span>Total a Pagar:</span>
                <span className="font-mono text-base">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Advance payment input */}
            <div className="border border-stone-200 rounded-xl p-4 bg-white space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-800 block">
                Cobro de Anticipo en Recepción
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Monto de Anticipo ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={total}
                    step="0.01"
                    value={advanceAmount}
                    onChange={e => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-bold font-mono border border-stone-300 rounded-lg bg-white"
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setAdvanceAmount(Math.round(total / 2))}
                      className="text-[10px] text-amber-700 hover:underline"
                    >
                      Sugerir 50% (${(total / 2).toFixed(2)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdvanceAmount(total)}
                      className="text-[10px] text-stone-600 hover:underline"
                    >
                      Pago Total (${total.toFixed(2)})
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={advanceMethod}
                    onChange={e => setAdvanceMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="TRANSFERENCIA">Transferencia / Deuna</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              {advanceMethod === 'EFECTIVO' && advanceAmount > 0 && (
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4" />
                    Cobro Rápido en Efectivo
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Efectivo Recibido del Cliente ($)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-stone-400 font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={cashReceived}
                          onChange={e => setCashReceived(parseFloat(e.target.value) || 0)}
                          className="w-full pl-8 pr-3 py-2 text-sm font-bold font-mono border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-hidden bg-white"
                        />
                      </div>
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {[5, 10, 20, 50].map(bill => (
                          <button
                            key={bill}
                            type="button"
                            onClick={() => setCashReceived(Math.max(bill, Math.ceil(advanceAmount / bill) * bill))}
                            className="text-[10px] px-1.5 py-0.5 bg-white border border-emerald-300 rounded-md text-emerald-800 hover:bg-emerald-100"
                          >
                            ${bill}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setCashReceived(advanceAmount)}
                          className="text-[10px] px-1.5 py-0.5 text-stone-500 hover:underline"
                        >
                          Exacto
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center">
                      <span className="text-[11px] text-emerald-800 font-semibold uppercase tracking-wider">Vuelto a Entregar</span>
                      <span className={`text-2xl font-mono font-black ${cashReceived < advanceAmount ? 'text-red-600' : 'text-emerald-700'}`}>
                        ${Math.max(0, cashReceived - advanceAmount).toFixed(2)}
                      </span>
                      {cashReceived < advanceAmount && (
                        <span className="text-[11px] text-red-600 font-semibold">
                          El efectivo recibido es menor al anticipo.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex justify-between items-center text-xs">
                <span className="text-amber-900">Saldo pendiente de retiro:</span>
                <span className="font-mono font-bold text-amber-900 text-sm">
                  ${balancePending.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Toolbar */}
      <div className="bg-stone-50 border-t border-stone-200 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (currentStep > 1) setCurrentStep(currentStep - 1);
            else onCancel();
          }}
          className="px-4 py-2.5 sm:py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {currentStep === 1 ? 'Cancelar' : 'Anterior'}
        </button>

        <div className="flex flex-wrap items-center gap-3">
          {submitError && (
            <span className="text-xs text-red-600 font-semibold max-w-xs truncate">{submitError}</span>
          )}
          <span className="text-xs text-stone-400">
            Paso {currentStep} de {LAST_STEP}
          </span>

          {currentStep < LAST_STEP ? (
            <button
              type="button"
              onClick={() => {
                if (currentStep === 1 && !selectedCustomer) {
                  alert('Debe seleccionar o registrar un cliente.');
                  return;
                }
                if (currentStep === 2) {
                  const failIdx = findIncompleteShoeStepPair();
                  if (failIdx !== -1) {
                    alert(`Complete los datos obligatorios del calzado del Par ${failIdx + 1} (tipo, marca, color, talla, material, cantidad y estado físico).`);
                    setActivePairIndex(failIdx);
                    return;
                  }
                }
                if (currentStep === 3) {
                  const failIdx = findIncompleteDiagnosisStepPair();
                  if (failIdx !== -1) {
                    alert(`Complete el diagnóstico técnico del Par ${failIdx + 1} (seleccione N/A si algún componente no aplica) y su trabajo recomendado.`);
                    setActivePairIndex(failIdx);
                    return;
                  }
                }
                setCurrentStep(currentStep + 1);
              }}
              className="px-5 py-2.5 sm:py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              Siguiente
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-1.5 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {isSubmitting ? 'Guardando orden...' : 'Confirmar y Generar Orden'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
