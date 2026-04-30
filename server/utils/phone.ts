import { parsePhoneNumberWithError } from 'libphonenumber-js';

export type NormalizeResult =
  | { ok: true; e164: string; country: string }
  | { ok: false; reason: 'invalid' | 'non_us' };

// Owner-input boundary: validate, must be a valid US number, return E.164.
// Used by the share-flow gate (Phase 4) to reject non-US numbers from the SMS
// path. Non-US owners are routed to email instead.
export function normalizeUSPhone(input: string): NormalizeResult {
  try {
    const parsed = parsePhoneNumberWithError(input, 'US');
    if (!parsed.isValid()) return { ok: false, reason: 'invalid' };
    if (parsed.country !== 'US') return { ok: false, reason: 'non_us' };
    return { ok: true, e164: parsed.number, country: parsed.country };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

// Inbound-webhook boundary: accept any country and normalize defensively.
// STOP/HELP must be honored from any number that ever received an SMS from us
// (e.g., a non-US recipient who got a message before US-only was enforced).
// Twilio always sends E.164 in `From`, but we re-parse to guard against bugs.
export function normalizeInboundPhone(input: string): { ok: true; e164: string } | { ok: false } {
  try {
    const parsed = parsePhoneNumberWithError(input, 'US');
    if (!parsed.isValid()) return { ok: false };
    return { ok: true, e164: parsed.number };
  } catch {
    return { ok: false };
  }
}
