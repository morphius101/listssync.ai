import type { Request, Response, NextFunction } from 'express';

function getAllowlist(): string[] {
  return (process.env.BETA_ALLOWLIST_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isBetaActive(): boolean {
  return process.env.BETA_MODE === 'true';
}

// Express middleware — add after requireAuth on protected routes
export const betaModeGuard = (req: Request, res: Response, next: NextFunction) => {
  if (!isBetaActive()) return next();

  const allowlist = getAllowlist();
  if (allowlist.length === 0) return next(); // empty list = no one blocked

  const userEmail = ((req as any).user?.email || '').toLowerCase();
  if (userEmail && allowlist.includes(userEmail)) return next();

  return res.status(403).json({ error: 'Private beta', code: 'BETA_MODE_ACTIVE' });
};
