// In a production environment, you'd use a service like Twilio for SMS
// or SendGrid for email. For now, we'll implement a simulated verification system.

import { v4 as uuidv4 } from 'uuid';

// Keep verification codes in memory (would be in database in production)
interface VerificationRecord {
  code: string;
  createdAt: Date;
  expires: Date;
  verified: boolean;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  checklistId?: string;
}

// Store verification records by token
const verifications = new Map<string, VerificationRecord>();

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate a verification token
function generateToken(): string {
  return uuidv4();
}

/**
 * Generate a verification code and token for a recipient
 */
export function createVerification(
  recipientId: string,
  email?: string,
  phone?: string,
  checklistId?: string
): { token: string; code: string } {
  const code = generateVerificationCode();
  const token = generateToken();
  
  // Set expiration time (30 minutes from now)
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 60 * 1000);
  
  // Store verification record
  verifications.set(token, {
    code,
    createdAt: now,
    expires,
    verified: false,
    recipientId,
    recipientEmail: email,
    recipientPhone: phone,
    checklistId
  });
  
  return { token, code };
}

/**
 * Verify a code against a token
 */
export function verifyCode(token: string, code: string): boolean {
  const record = verifications.get(token);
  
  // Check if token exists and hasn't expired
  if (!record || record.expires < new Date()) {
    return false;
  }
  
  // Check if the code matches
  if (record.code === code) {
    // Mark as verified
    record.verified = true;
    verifications.set(token, record);
    return true;
  }
  
  return false;
}

/**
 * Check if a verification is valid and verified
 */
export function isVerified(token: string): boolean {
  const record = verifications.get(token);
  return !!record && record.verified && record.expires > new Date();
}

/**
 * Get verification record by token
 */
export function getVerification(token: string): VerificationRecord | undefined {
  return verifications.get(token);
}

/**
 * Format a phone number for display (show only last 4 digits)
 */
export function formatPhoneForDisplay(phone: string): string {
  // Remove non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Get the last 4 digits
  const lastFour = digits.slice(-4);
  
  return `****-****-${lastFour}`;
}

/**
 * Format an email for display (show only username initial and domain)
 */
export function formatEmailForDisplay(email: string): string {
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;
  
  return `${username.charAt(0)}*****@${domain}`;
}

// In production, these would integrate with actual SMS and email services

/**
 * Send verification code via SMS
 * In production, this would integrate with a service like Twilio
 */
export async function sendVerificationSMS(phone: string, code: string): Promise<boolean> {
  try {
    // For now we're simulating the SMS sending
    console.log(`[SIMULATION] Sending verification code ${code} to ${phone}`);
    
    // Here you would integrate with an SMS service
    // Example with Twilio would be:
    // await twilioClient.messages.create({
    //   body: `Your ListsSync.ai verification code is: ${code}`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phone
    // });
    
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}

/**
 * Send verification code via email
 * In production, this would integrate with a service like SendGrid
 */
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    // For now we're simulating the email sending
    console.log(`[SIMULATION] Sending verification code ${code} to ${email}`);
    
    // Here you would integrate with an email service
    // Example with SendGrid would be:
    // await sendgrid.send({
    //   to: email,
    //   from: 'notifications@listssync.ai',
    //   subject: 'Your verification code for ListsSync.ai',
    //   text: `Your verification code is: ${code}`,
    //   html: `<p>Your verification code is: <strong>${code}</strong></p>`
    // });
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}