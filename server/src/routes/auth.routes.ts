import { Router } from 'express';
import { z } from 'zod';
import { timingSafeEqual } from 'crypto';
import rateLimit from 'express-rate-limit';
import { signToken } from '../lib/auth.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { logAudit } from '../lib/audit.js';

export const authRouter = Router();

// The system's only entry point is a single static credential — that makes
// it a prime brute-force target, so failed attempts are throttled per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.' },
});

// Constant-time string compare so a failed login can't be used to learn the
// credential one byte at a time via response-timing side channels.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison of equal length to keep timing uniform.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// The system now has exactly one way in: a single, permanent master
// credential with full administrator access. It is intentionally NOT backed
// by any database row, so it can never be edited, deactivated, or deleted
// from Settings > Usuarios or by a direct change to the database — the only
// place it exists is right here in the server source.
const MASTER_USERNAME = 'shoesjc2026';
const MASTER_PASSWORD = 'shoes2026';
const MASTER_SUB = 'master-admin';

function masterPublicUser() {
  return {
    id: MASTER_SUB,
    name: "JC SHOE'S Administrador",
    email: MASTER_USERNAME,
    role: 'ADMIN' as const,
    phone: undefined,
    specialty: undefined,
    avatar: undefined,
    active: true,
  };
}

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);

    const validUsername = safeEqual(username, MASTER_USERNAME);
    const validPassword = safeEqual(password, MASTER_PASSWORD);
    if (!validUsername || !validPassword) {
      throw new HttpError(401, 'Credenciales inválidas.');
    }

    const token = signToken({ sub: MASTER_SUB, role: 'ADMIN', name: "JC SHOE'S Administrador" });
    await logAudit({ sub: MASTER_SUB, role: 'ADMIN', name: "JC SHOE'S Administrador" }, 'INICIO_SESION', 'SISTEMA', 'Administrador inició sesión.');

    res.json({ token, user: masterPublicUser() });
  })
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user!.sub !== MASTER_SUB) throw new HttpError(404, 'Usuario no encontrado.');
    res.json({ user: masterPublicUser() });
  })
);
