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

// Phase 4c: optional bypass for the Twilio review window. When set to
// "true" (case-insensitive), specific share-flow endpoints become reachable
// to authed users who are not on BETA_ALLOWLIST_EMAILS. Default unset =
// no behavioral change. Greyson sets this in Railway env immediately
// before Twilio review begins and unsets it after review concludes.
export function isTwilioReviewBypassActive(): boolean {
  return (process.env.BETA_TWILIO_REVIEW_BYPASS || '').toLowerCase() === 'true';
}

// Loud one-shot startup banner so this flag can never be left enabled
// silently. Call once from registerRoutes() so it lands in the same boot
// log block as the other env-state lines.
export function warnIfTwilioReviewBypassActive(): void {
  if (!isTwilioReviewBypassActive()) return;
  const banner = '*'.repeat(57);
  console.warn(banner);
  console.warn('[BETA_TWILIO_REVIEW_BYPASS] ENABLED — beta gate bypassed on');
  console.warn('/api/verification/generate. Disable this flag after Twilio');
  console.warn('review completes.');
  console.warn(banner);
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

// Variant of betaModeGuard that respects the Twilio-review bypass flag.
// Mounted ONLY on /api/verification/generate (per Phase 4c spec). Other
// beta-gated endpoints continue to use the strict betaModeGuard so a
// reviewer hitting /api/checklists still gets 403'd.
export const betaModeGuardWithReviewBypass = (req: Request, res: Response, next: NextFunction) => {
  if (isTwilioReviewBypassActive()) return next();
  return betaModeGuard(req, res, next);
};
