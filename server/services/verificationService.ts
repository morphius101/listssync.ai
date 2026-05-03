import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import twilio from 'twilio';
import { storage } from '../storage';
import { db } from '../db';
import {
  VerificationDTO,
  verifications,
  recipientSmsConsent,
  pendingShareSms,
  consentAuditLog,
} from '@shared/schema';
import { sendVerificationEmail as sendEmailWithSendGrid } from './emailService';
import { normalizeUSPhone } from '../utils/phone';

const SHARE_TOKEN_TTL_HOURS = 72;

// Phase 4b placeholder for the double-opt-in SMS body. Phase 4e replaces this
// with the carrier-approved text and removes the production guard inside
// sendOptInSMS(). Keep the [OPT_IN_PLACEHOLDER prefix — sendOptInSMS uses it
// to detect the unshipped state and refuse to send in production.
const OPT_IN_BODY_PLACEHOLDER =
  '[OPT_IN_PLACEHOLDER — Phase 4e ships approved body. Reply YES to confirm.]';

function generateToken(): string {
  return uuidv4();
}

export function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const lastFour = digits.slice(-4);
  return `****-****-${lastFour}`;
}

export function formatEmailForDisplay(email: string): string {
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;
  return `${username.charAt(0)}*****@${domain}`;
}

// ─── Share-create result shape (Phase 4b) ────────────────────────────────────
// Phone-bearing requests run through the consent gate and resolve to one of
// five smsStatus values. Email-only requests skip the gate entirely and
// return { token } with no smsStatus.
//
//   sent                  — opted_in recipient; share-link SMS dispatched.
//   pending_consent       — recipient is new or pending; share-link queued
//                           in pending_share_sms, drained by the Phase 3
//                           webhook on YES.
//   opted_out             — recipient previously opted out; nothing sent,
//                           no verification row created.
//   invalid_phone         — phone not parseable as US E.164.
//   missing_business_name — Owner has not set users.business_name yet.
export type ShareCreateResult =
  | { token: string; smsStatus?: 'sent' | 'pending_consent' }
  | { smsStatus: 'opted_out' }
  | { smsStatus: 'invalid_phone'; reason: 'invalid' | 'non_us' }
  | { smsStatus: 'missing_business_name' };

/**
 * Create a pre-verified share token and, if the recipient has a phone, run
 * the A2P 10DLC double-opt-in consent state machine before any SMS is sent.
 *
 * Token is valid for SHARE_TOKEN_TTL_HOURS and marked verified immediately.
 * Email path is unchanged — providing email without phone bypasses the gate.
 */
export async function createVerification(
  recipientId: string,
  ownerId: string,
  email?: string,
  phone?: string,
  checklistId?: string,
  targetLanguage?: string,
  checklistName?: string,
  ownerName?: string,
): Promise<ShareCreateResult> {
  const token = generateToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SHARE_TOKEN_TTL_HOURS * 60 * 60 * 1000);
  const lang = targetLanguage || 'en';

  // ─── Email-only path: original behavior, no consent gate ─────────────
  if (!phone) {
    const verificationData: VerificationDTO = {
      token, createdAt: now, expiresAt: expires, verified: true,
      recipientId, recipientEmail: email,
      checklistId, targetLanguage: lang,
    };
    await storage.createVerification(verificationData);
    if (email) {
      await sendEmailWithSendGrid(email, token, checklistName);
    }
    return { token };
  }

  // ─── Step 1: normalize to E.164, US-only ─────────────────────────────
  const normalized = normalizeUSPhone(phone);
  if (!normalized.ok) {
    return { smsStatus: 'invalid_phone', reason: normalized.reason };
  }
  const phoneE164 = normalized.e164;

  // ─── Step 2: Owner business_name required ────────────────────────────
  // The opt-in SMS interpolates business_name so the recipient can identify
  // who is asking for consent. Without it, we cannot send a compliant message.
  const owner = await storage.getUser(ownerId);
  const businessName = owner?.businessName?.trim() || '';
  if (!businessName) {
    return { smsStatus: 'missing_business_name' };
  }

  // ─── Step 3: look up recipient consent state ─────────────────────────
  const existing = await db
    .select()
    .from(recipientSmsConsent)
    .where(eq(recipientSmsConsent.phoneE164, phoneE164))
    .limit(1);
  const consent = existing[0];

  // ─── Step 4a: opted_out — block, no row created ──────────────────────
  if (consent?.status === 'opted_out') {
    await db.insert(consentAuditLog).values({
      phoneE164,
      eventType: 'share_blocked_opted_out',
      ownerId,
    });
    return { smsStatus: 'opted_out' };
  }

  // ─── Step 4b: opted_in — existing path, share-link SMS now ───────────
  if (consent?.status === 'opted_in') {
    const verificationData: VerificationDTO = {
      token, createdAt: now, expiresAt: expires, verified: true,
      recipientId, recipientEmail: email, recipientPhone: phoneE164,
      checklistId, targetLanguage: lang,
    };
    await storage.createVerification(verificationData);
    if (email) {
      await sendEmailWithSendGrid(email, token, checklistName);
    }
    await sendShareSMS(phoneE164, token, ownerName);
    return { token, smsStatus: 'sent' };
  }

  // ─── Step 4c: pending — queue link, do NOT send second opt-in ────────
  // One double-opt-in attempt per phone, ever. The recipient already received
  // an opt-in SMS from a prior share attempt; we don't re-prompt.
  if (consent?.status === 'pending') {
    await db.transaction(async (tx) => {
      await tx.insert(verifications).values({
        token, expiresAt: expires, verified: true,
        recipientId, recipientEmail: email, recipientPhone: phoneE164,
        checklistId, targetLanguage: lang,
      });
      await tx.insert(pendingShareSms).values({
        phoneE164, shareToken: token, ownerId,
      });
      await tx.insert(consentAuditLog).values({
        phoneE164, eventType: 'opt_in_blocked_pending', ownerId,
      });
    });
    if (email) {
      await sendEmailWithSendGrid(email, token, checklistName);
    }
    return { token, smsStatus: 'pending_consent' };
  }

  // ─── Step 4d: no record — first contact, send opt-in SMS ─────────────
  // Atomic: verifications row, pending consent row, queued share-link, audit.
  // The opt-in SMS itself is post-commit (side effect outside the tx).
  await db.transaction(async (tx) => {
    await tx.insert(verifications).values({
      token, expiresAt: expires, verified: true,
      recipientId, recipientEmail: email, recipientPhone: phoneE164,
      checklistId, targetLanguage: lang,
    });
    await tx.insert(recipientSmsConsent).values({
      phoneE164, status: 'pending', firstOwnerId: ownerId,
    });
    await tx.insert(pendingShareSms).values({
      phoneE164, shareToken: token, ownerId,
    });
    await tx.insert(consentAuditLog).values({
      phoneE164, eventType: 'opt_in_sent', ownerId,
    });
  });
  if (email) {
    await sendEmailWithSendGrid(email, token, checklistName);
  }
  await sendOptInSMS(phoneE164, businessName);
  return { token, smsStatus: 'pending_consent' };
}

export async function isVerified(token: string): Promise<boolean> {
  try {
    const record = await storage.getVerificationByToken(token);
    return !!record && record.verified && record.expiresAt > new Date();
  } catch (error) {
    console.error('Error checking verification status:', error);
    return false;
  }
}

export async function getVerification(token: string): Promise<VerificationDTO | undefined> {
  try {
    return await storage.getVerificationByToken(token);
  } catch (error) {
    console.error('Error getting verification:', error);
    return undefined;
  }
}

/**
 * Send a share link via SMS (Option A — owner-attributed, no code).
 */
export async function sendShareSMS(phone: string, token: string, ownerName?: string): Promise<boolean> {
  // Dev-only test seam: lets diag-phase4-warm-send-failed.mjs exercise the
  // webhook's send_failed disposition path. Real share tokens are
  // server-generated UUIDs — no collision possible. Strict NODE_ENV check
  // (not !== 'production') ensures this never fires outside local dev.
  if (process.env.NODE_ENV === 'development' && token.startsWith('TEST_FAIL_')) {
    return false;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken) {
    if (process.env.NODE_ENV === 'development') return true;
    return false;
  }

  let formattedPhone = phone;
  if (!phone.startsWith('+')) {
    formattedPhone = phone.length === 10 ? `+1${phone}` : `+${phone}`;
  }

  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://www.listssync.ai'
    : 'http://localhost:5000';
  const shareUrl = `${baseUrl}/shared/${token}`;

  const senderLabel = ownerName ? ownerName : 'Your manager';
  const body = `${senderLabel} shared a cleaning checklist with you. Open it here (no app needed): ${shareUrl}`;

  try {
    const client = twilio(accountSid, authToken);
    const params: any = { body, to: formattedPhone };
    if (messagingServiceSid) {
      params.messagingServiceSid = messagingServiceSid;
    } else if (twilioPhone) {
      params.from = twilioPhone;
    } else {
      console.error('No Twilio from address configured');
      return false;
    }
    const message = await client.messages.create(params);
    console.log(`📱 Share SMS sent: ${message.sid}`);
    return true;
  } catch (err: any) {
    console.error('Error sending share SMS:', err.message);
    if (process.env.NODE_ENV === 'development') return true;
    return false;
  }
}

// Re-export for backwards compat with any remaining callers
export const sendVerificationSMS = sendShareSMS;

/**
 * Send the double-opt-in SMS to a brand-new recipient phone.
 *
 * Phase 4b: this function uses OPT_IN_BODY_PLACEHOLDER and refuses to send
 * in production until Phase 4e replaces the body with carrier-approved text.
 * In dev (no Twilio creds) it short-circuits to true via the standard path,
 * so the consent state machine and the diag exercise the full flow without
 * ever hitting Twilio.
 */
export async function sendOptInSMS(phone: string, ownerBusinessName: string): Promise<boolean> {
  // Phase 4b safety: refuse to send the placeholder body in production.
  // Phase 4e replaces OPT_IN_BODY_PLACEHOLDER with the carrier-approved
  // body and removes this guard. Until then, the state machine writes its
  // rows but no SMS actually leaves the server in production.
  if (process.env.NODE_ENV === 'production'
      && OPT_IN_BODY_PLACEHOLDER.startsWith('[OPT_IN_PLACEHOLDER')) {
    console.warn(
      'sendOptInSMS: refusing to send placeholder body in production '
      + '(Phase 4e not yet shipped). phone=' + phone.slice(-4)
    );
    return false;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken) {
    if (process.env.NODE_ENV === 'development') return true;
    return false;
  }

  // Body interpolation — Phase 4e wires ownerBusinessName into the real body.
  const body = OPT_IN_BODY_PLACEHOLDER;

  try {
    const client = twilio(accountSid, authToken);
    const params: any = { body, to: phone };
    if (messagingServiceSid) {
      params.messagingServiceSid = messagingServiceSid;
    } else if (twilioPhone) {
      params.from = twilioPhone;
    } else {
      console.error('sendOptInSMS: no Twilio from address configured');
      return false;
    }
    const message = await client.messages.create(params);
    console.log(`📱 Opt-in SMS sent: ${message.sid}`);
    return true;
  } catch (err: any) {
    console.error('Error sending opt-in SMS:', err.message);
    if (process.env.NODE_ENV === 'development') return true;
    return false;
  }
}
