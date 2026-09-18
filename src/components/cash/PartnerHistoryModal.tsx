import React, { useEffect, useState } from 'react';
import { PartnerMovementHistory } from '../../types';
import { Modal } from '../common/Modal';
import { Loader2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface PartnerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerId: string | null;
  partnerName: string;
  fetchHistory: (partnerId: string) => Promise<PartnerMovementHistory>;
}

/**
 * Full chronological breakdown of one partner's capital contributions and
 * returns — every partial repayment with its exact date/time, method, and
 * the running balance still owed after it, until it reaches $0.00.
 */
export const PartnerHistoryModal: React.FC<PartnerHistoryModalProps> = ({
  isOpen,
  onClose,
  partnerId,
  partnerName,
  fetchHistory,
}) => {
  const [history, setHistory] = useState<PartnerMovementHistory | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && partnerId) {
      setLoading(true);
      setHistory(null);
      fetchHistory(partnerId)
        .then(setHistory)
        .finally(() => setLoading(false));
    }
  }, [isOpen, partnerId, fetchHistory]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial de Capital — ${partnerName}`}
      subtitle="Cronología completa de aportes y devoluciones, con saldo pendiente después de cada movimiento."
      maxWidth="lg"
    >
      {loading ? (
        <div className="py-10 text-center text-stone-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Cargando historial...
        </div>
      ) : !history || history.history.length === 0 ? (
        <div className="py-10 text-center text-stone-400 text-sm">Este socio aún no tiene aportes ni devoluciones registradas.</div>
      ) : (
        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
              <tr>
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Hora</th>
                <th className="py-2.5 px-3">Movimiento</th>
                <th className="py-2.5 px-3 text-right">Monto</th>
                <th className="py-2.5 px-3 text-right">Saldo Después</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {history.history.map((h) => {
                const isAporte = h.type === 'APORTE_CAPITAL';
                return (
                  <tr key={h.id} className="hover:bg-stone-50">
                    <td className="py-2 px-3 font-mono text-stone-500">{h.date}</td>
                    <td className="py-2 px-3 font-mono text-stone-500">{h.time}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isAporte ? 'bg-sky-100 text-sky-800' : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {isAporte ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {isAporte ? 'Aporte' : 'Devolución'}
                      </span>
                      <div className="text-[11px] text-stone-500 mt-0.5">{h.concept}</div>
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${isAporte ? 'text-emerald-700' : 'text-red-700'}`}>
                      {isAporte ? '+' : '-'}${h.amount.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">${h.runningBalance.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </Modal>
  );
};
