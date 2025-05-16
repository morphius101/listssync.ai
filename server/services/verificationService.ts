import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { VerificationDTO } from '@shared/schema';
import { sendVerificationEmail as sendEmailWithSendGrid } from './emailService';

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
 * Now uses database storage for scalability
 */
export async function createVerification(
  recipientId: string,
  email?: string,
  phone?: string,
  checklistId?: string
): Promise<{ token: string; code: string }> {
  try {
    const code = generateVerificationCode();
    const token = generateToken();
    
    // Set expiration time (30 minutes from now)
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 60 * 1000);
    
    // Create verification record in database
    const verificationData: VerificationDTO = {
      token,
      code,
      createdAt: now,
      expiresAt: expires,
      verified: false,
      recipientId,
      recipientEmail: email,
      recipientPhone: phone,
      checklistId
    };
    
    // Store in database
    await storage.createVerification(verificationData);
    
    console.log(`Created verification with token ${token} and code ${code}`);
    return { token, code };
  } catch (error) {
    console.error("Error creating verification:", error);
    // Fallback to prevent blocking the user flow
    const fallbackToken = uuidv4();
    const fallbackCode = generateVerificationCode();
    return { token: fallbackToken, code: fallbackCode };
  }
}

/**
 * Verify a code against a token
 * Now uses database storage
 */
export async function verifyCode(token: string, code: string): Promise<boolean> {
  try {
    const record = await storage.getVerificationByToken(token);
    
    // Check if token exists and hasn't expired
    if (!record || record.expiresAt < new Date()) {
      console.log("Verification token expired or not found");
      return false;
    }
    
    // Check if the code matches
    if (record.code === code) {
      // Mark as verified in database
      const success = await storage.markVerificationAsVerified(token);
      return success;
    }
    
    return false;
  } catch (error) {
    console.error("Error verifying code:", error);
    return false;
  }
}

/**
 * Check if a verification is valid and verified
 * Now uses database storage
 */
export async function isVerified(token: string): Promise<boolean> {
  try {
    const record = await storage.getVerificationByToken(token);
    return !!record && record.verified && record.expiresAt > new Date();
  } catch (error) {
    console.error("Error checking verification status:", error);
    return false;
  }
}

/**
 * Get verification record by token
 * Now uses database storage
 */
export async function getVerification(token: string): Promise<VerificationDTO | undefined> {
  try {
    return await storage.getVerificationByToken(token);
  } catch (error) {
    console.error("Error getting verification:", error);
    return undefined;
  }
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

// External service imports
import twilio from 'twilio';
import { sendEmail } from './emailService';

// Initialize Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

/**
 * Send verification code via SMS using Twilio
 */
export async function sendVerificationSMS(phone: string, code: string): Promise<boolean> {
  try {
    console.log('===================================================');
    console.log(`📱 Attempting to send SMS verification to: ${formatPhoneForDisplay(phone)}`);
    console.log(`📱 Code: ${code}`);
    console.log(`📱 TWILIO_ACCOUNT_SID status: ${process.env.TWILIO_ACCOUNT_SID ? 'Present' : 'Missing'}`);
    console.log(`📱 TWILIO_AUTH_TOKEN status: ${process.env.TWILIO_AUTH_TOKEN ? 'Present' : 'Missing'}`);
    console.log(`📱 TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || 'Missing'}`);
    console.log('===================================================');

    if (!twilioClient) {
      console.error('Cannot send SMS: Twilio client is not initialized due to missing credentials');
      return false;
    }

    if (!process.env.TWILIO_PHONE_NUMBER) {
      console.error('Cannot send SMS: Missing Twilio phone number');
      return false;
    }
    
    // Only display formatted phone in logs for privacy
    console.log(`📱 Sending verification code to: ${formatPhoneForDisplay(phone)}`);
    console.log(`📱 Code: ${code}`);
    
    // Real SMS sending with Twilio
    const message = await twilioClient.messages.create({
      body: `Your ListsSync.ai verification code is: ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    
    console.log(`📱 Verification SMS sent successfully to: ${formatPhoneForDisplay(phone)} ✅`);
    console.log(`📱 Twilio message SID: ${message.sid}`);
    
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}

/**
 * Send verification code via email
 * Uses SendGrid for email delivery with improved error handling
 */
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  try {
    // Log redacted version of the email for debugging
    const maskedEmail = formatEmailForDisplay(email);
    console.log('===================================================');
    console.log(`📧 Sending verification code to: ${maskedEmail}`);
    console.log(`📧 Code: ${code}`);
    console.log('===================================================');
    
    // Send verification email through SendGrid - no fallbacks
    await sendEmailWithSendGrid(email, code);
    
    console.log(`📧 Verification email sent successfully to: ${maskedEmail} ✅`);
    return true;
  } catch (error: any) {
    console.error('❌ Error sending verification email:', error.message || 'Unknown error');
    
    if (error.response) {
      console.error('SendGrid API error details:', error.response.body || 'No response body');
    }
    
    console.error('===================================================');
    console.error(`❌ VERIFICATION EMAIL FAILED TO: ${formatEmailForDisplay(email)}`);
    console.error(`❌ Error: ${error.message || 'Unknown error'}`);
    console.error('===================================================');
    
    // Propagate the failure to the calling code
    return false;
  }
}