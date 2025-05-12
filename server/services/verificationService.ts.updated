import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { VerificationDTO } from '@shared/schema';

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

// Simulated SMS/Email sending - logs the code for testing

/**
 * Send verification code via SMS
 * In production, this would integrate with a service like Twilio
 */
export async function sendVerificationSMS(phone: string, code: string): Promise<boolean> {
  try {
    // For now we're simulating the SMS sending with clear logging
    console.log('===================================================');
    console.log(`📱 SIMULATION: SMS VERIFICATION CODE: ${code}`);
    console.log(`📱 For phone number: ${formatPhoneForDisplay(phone)}`);
    console.log('===================================================');
    
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
    // For now we're simulating the email sending with clear logging
    console.log('===================================================');
    console.log(`📧 SIMULATION: EMAIL VERIFICATION CODE: ${code}`);
    console.log(`📧 For email: ${formatEmailForDisplay(email)}`);
    console.log('===================================================');
    
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