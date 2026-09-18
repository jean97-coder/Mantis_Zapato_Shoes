import { prisma } from './prisma.js';
import { AuthTokenPayload } from './auth.js';

export function logAudit(
  user: AuthTokenPayload | undefined,
  action: string,
  module: string,
  details: string,
  recordId?: string
) {
  return prisma.auditLog.create({
    data: {
      userId: user?.sub,
      userName: user?.name || 'Sistema',
      action,
      module,
      details,
      recordId,
    },
  });
}
