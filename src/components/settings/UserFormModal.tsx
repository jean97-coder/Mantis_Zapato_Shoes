import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { Modal } from '../common/Modal';
import { ROLE_LABELS } from '../../lib/rbac';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
    specialty?: string;
  }) => Promise<void>;
  user?: User | null;
}

const ROLE_OPTIONS: UserRole[] = ['ADMIN', 'SOCIO_ADMIN', 'CAJERO', 'ZAPATERO'];

/**
 * Handles both creating a new user and editing an existing one. Editing
 * leaves the password blank by default (unchanged unless the admin
 * deliberately types a new one) and the email fixed (changing a login
 * identity is out of scope here — create a new account instead).
 */
export const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSubmit, user }) => {
  const isEdit = !!user;

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'CAJERO');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [specialty, setSpecialty] = useState(user?.specialty ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // The modal stays mounted across opens, so the useState initializers above
  // only run once — re-sync the form fields every time it opens for a
  // (possibly different) user, otherwise a stale previous edit lingers.
  useEffect(() => {
    if (isOpen) {
      setName(user?.name ?? '');
      setEmail(user?.email ?? '');
      setPassword('');
      setRole(user?.role ?? 'CAJERO');
      setPhone(user?.phone ?? '');
      setSpecialty(user?.specialty ?? '');
      setError('');
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isEdit && !password) {
      setError('La contraseña temporal es obligatoria para un usuario nuevo.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        phone: phone.trim() || undefined,
        specialty: specialty.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Editar Usuario — ${user!.name}` : 'Registrar Nuevo Usuario del Sistema'}
      subtitle="Define el rol RBAC para controlar el acceso a cada módulo."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">{error}</div>}

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Nombre Completo *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Correo Electrónico *</label>
          <input
            type="email"
            required
            disabled={isEdit}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden disabled:bg-stone-100 disabled:text-stone-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            {isEdit ? 'Nueva Contraseña (opcional)' : 'Contraseña Temporal *'}
          </label>
          <input
            type="password"
            required={!isEdit}
            minLength={6}
            placeholder={isEdit ? 'Dejar en blanco para no cambiarla' : ''}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Rol RBAC *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden bg-white"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Teléfono</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Especialidad (opcional)</label>
          <input
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Ej: Suelas y tacones, restauración de gamuza..."
            className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg outline-hidden"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs disabled:opacity-60"
          >
            {submitting ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
