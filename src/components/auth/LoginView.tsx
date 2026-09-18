import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, User as UserIcon, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ParticleField } from './ParticleField';
import { BRAND_NAME, BRAND_TAGLINE, BRAND_LOGO } from '../../lib/brand';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0906] relative overflow-hidden px-4 py-10">
      {/* Ambient gold glow blobs */}
      <div className="absolute -top-32 -left-24 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-24 w-96 h-96 bg-yellow-700/15 rounded-full blur-3xl" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/10 rounded-full blur-3xl" />

      {/* Interactive constellation background */}
      <ParticleField />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-stone-950/60 backdrop-blur-2xl border border-amber-500/20 rounded-3xl shadow-2xl shadow-black/60 p-8 space-y-6 ring-1 ring-white/5">
          {/* Brand */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-white/5 border border-amber-400/25 flex items-center justify-center shadow-lg shadow-amber-900/20 p-2">
              <img src={BRAND_LOGO} alt={BRAND_NAME} className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(217,180,90,0.35)]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">{BRAND_NAME}</h1>
              <p className="text-[11px] text-amber-400/90 font-mono tracking-widest uppercase mt-0.5">{BRAND_TAGLINE}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1.5">Usuario</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Usuario"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white/5 border border-white/10 text-white rounded-xl outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-stone-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-400 mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white/5 border border-white/10 text-white rounded-xl outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-stone-600"
                />
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 disabled:opacity-60 text-stone-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </motion.button>
          </form>

          <div className="pt-4 border-t border-white/10 text-center text-[11px] text-stone-500">
            Acceso restringido · Uso exclusivo de administración
          </div>
        </div>

        <p className="text-center text-[11px] text-stone-600 mt-6 font-mono tracking-wide">
          {BRAND_NAME} · Sistema de Gestión Interno
        </p>
        <p className="text-center text-[10px] text-stone-700 mt-2">
          © 2026 {BRAND_NAME} — Todos los derechos reservados. Desarrollado por MANTIS.EC.
        </p>
      </motion.div>
    </div>
  );
};
