import { MailService } from '@sendgrid/mail';

// Initialize the SendGrid mail service
const mailService = new MailService();

// Log environment variables for debugging (without revealing actual keys)
console.log('📝 Email Environment variables check:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('- SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
console.log('- SENDGRID_API_KEY value is string type:', typeof process.env.SENDGRID_API_KEY === 'string');
console.log('- SENDGRID_API_KEY length:', process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.length : 0);
console.log('- First characters of key (if exists):', process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.substring(0, 3) + '...' : 'N/A');

// SafeGetEnv - Helper to safely access env variables treating empty strings as undefined
function safeGetEnv(key: string): string | undefined {
  const value = process.env[key];
  // Check if the value is undefined or empty string
  return value && value.trim() !== '' ? value : undefined;
}

// Get the SendGrid API key safely
const sendgridApiKey = safeGetEnv('SENDGRID_API_KEY');

if (sendgridApiKey) {
  console.log('🔑 Setting up SendGrid with valid API key...');
  mailService.setApiKey(sendgridApiKey);
  console.log('✅ SendGrid mail service initialized successfully');
} else {
  console.warn('⚠️ SENDGRID_API_KEY not set properly, email delivery is disabled');
}

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
}

/**
 * Send an email using SendGrid
 * 
 * @param options Email sending options
 * @returns Promise resolving to true if email sent successfully, false otherwise
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Use the same verified sender that worked previously with greyson.gardner.m@gmail.com
  // We'll stick to that known working configuration until we can verify other sender addresses
  const { to, subject, text, html, from = 'greyson@listssync.ai' } = options;
  
  // API Key validation - fail early if not configured
  if (!sendgridApiKey) {
    console.error('❌ ERROR: SENDGRID_API_KEY not set - cannot send emails');
    throw new Error('SendGrid API key is required for email delivery');
  }
  
  try {
    console.log(`📧 Attempting to send email via SendGrid to ${to}...`);
    
    // Create the message
    const message = {
      to,
      from,
      subject,
      text,
      html,
    };
    
    console.log('📧 Sending message with payload:', {
      to,
      from,
      subject,
      textLength: text ? text.length : 0,
      htmlLength: html ? html.length : 0
    });
    
    // Send the email with additional trace logs
    console.log(`🔄 EXECUTING: mailService.send() with message to ${to}...`);
    try {
      const response = await mailService.send(message);
      console.log(`✅ SUCCESS: Email sent through SendGrid to ${to}`);
      console.log(`✅ SendGrid API Response:`, JSON.stringify(response));
      return true;
    } catch (sendGridError: any) {
      console.error(`❌ SendGrid.send() threw an error:`, sendGridError);
      throw sendGridError; // Re-throw to be caught by the outer catch block
    }
  } catch (error: any) {
    console.error('❌ Failed to send email. Error details:', error.message || 'Unknown error');
    
    if (error.response) {
      console.error('❌ SendGrid API error response:', {
        body: error.response.body,
        statusCode: error.response.statusCode,
      });
    }
    
    // Log the full error for debugging without any simulation fallback
    console.error('===================================================');
    console.error(`❌ EMAIL SENDING FAILED! DETAILS:`);
    console.error(`- To: ${to}`);
    console.error(`- Subject: ${subject}`);
    console.error(`- Error: ${error.message || 'Unknown error'}`);
    console.error('===================================================');
    
    // Throw the error to propagate it upwards - no fallbacks
    throw error;
  }
}

/**
 * Send a checklist share link via email (Option C template).
 * Subject: "Checklist: [name]" — no code, just a direct link.
 */
export async function sendVerificationEmail(email: string, token: string, checklistName?: string): Promise<boolean> {
  const name = checklistName || 'your checklist';
  const subject = `Checklist: ${name}`;

  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://www.listssync.ai'
    : 'http://localhost:5000';
  const shareUrl = `${baseUrl}/shared/${token}`;

  const text = `Here is your link to ${name}:\n\n${shareUrl}\n\nNo app download required — just tap the link.`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h2>${name}</h2>
    <p>Tap the button below to open the checklist. No app download required.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${shareUrl}" style="display:inline-block;background-color:#4f46e5;color:white;text-decoration:none;padding:12px 28px;border-radius:5px;font-weight:bold;">Open Checklist</a>
    </div>
    <p style="font-size:13px;color:#666;">Or copy this link into your browser:<br>${shareUrl}</p>
    <div class="footer"><p>&copy; ${new Date().getFullYear()} ListsSync.ai</p></div>
  </div>
</body>
</html>`;

  return sendEmail({ to: email, subject, text, html });
}
