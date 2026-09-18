import { Request, Response, NextFunction } from 'express';
import { verifyToken, AuthTokenPayload } from '../lib/auth.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado. Token faltante.' });
  }

  const token = header.slice('Bearer '.length);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

export function requireRole(...roles: Array<'ADMIN' | 'CAJERO' | 'ZAPATERO' | 'SOCIO_ADMIN'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    // SOCIO_ADMIN is the shared partners' login and carries the exact same
    // privileges as ADMIN — normalize it here, once, instead of listing both
    // roles at every requireRole('ADMIN', ...) call site across the app.
    const effectiveRole = req.user.role === 'SOCIO_ADMIN' ? 'ADMIN' : req.user.role;
    if (!roles.includes(effectiveRole) && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción.' });
    }
    next();
  };
}
