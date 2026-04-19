import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { VerificationDTO } from '@shared/schema';
import { sendVerificationEmail as sendEmailWithSendGrid } from './emailService';
import twilio from 'twilio';

const SHARE_TOKEN_TTL_HOURS = 72;

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

/**
 * Create a pre-verified share token. No code is generated or required.
 * Token is valid for SHARE_TOKEN_TTL_HOURS and marked verified immediately.
 */
export async function createVerification(
  recipientId: string,
  email?: string,
  phone?: string,
  checklistId?: string,
  targetLanguage?: string,
  checklistName?: string,
  ownerName?: string,
): Promise<{ token: string }> {
  const token = generateToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SHARE_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  const verificationData: VerificationDTO = {
    token,
    createdAt: now,
    expiresAt: expires,
    verified: true,
    recipientId,
    recipientEmail: email,
    recipientPhone: phone,
    checklistId,
    targetLanguage: targetLanguage || 'en',
  };

  await storage.createVerification(verificationData);

  if (phone) {
    await sendShareSMS(phone, token, ownerName);
  }

  if (email) {
    await sendEmailWithSendGrid(email, token, checklistName);
  }

  return { token };
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
