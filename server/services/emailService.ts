import { MailService } from '@sendgrid/mail';

// Initialize the SendGrid mail service
const mailService = new MailService();

if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY not set, email delivery is disabled');
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
  const { to, subject, text, html, from = 'notifications@listssync.ai' } = options;
  
  if (!process.env.SENDGRID_API_KEY) {
    console.log('Email sending disabled - would have sent:', { to, subject, text });
    return false;
  }
  
  try {
    console.log(`Attempting to send email via SendGrid to ${to}...`);
    await mailService.send({
      to,
      from,
      subject,
      text,
      html,
    });
    
    console.log(`✅ SUCCESS: Email sent through SendGrid to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send a verification code email
 * 
 * @param email Recipient email address
 * @param code Verification code
 * @returns Promise resolving to true if email sent successfully
 */
export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const subject = 'Your ListsSync.ai Verification Code';
  
  const text = `
Your verification code for ListsSync.ai is: ${code}

This code will expire in 10 minutes.

Thank you,
The ListsSync.ai Team
  `.trim();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .code {
      font-size: 24px;
      font-weight: bold;
      color: #4f46e5;
      padding: 10px;
      margin: 20px 0;
      text-align: center;
      letter-spacing: 5px;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Your Verification Code</h2>
    <p>Please use the following code to verify your identity on ListsSync.ai:</p>
    <div class="code">${code}</div>
    <p>This code will expire in 10 minutes.</p>
    <p>If you didn't request this code, you can safely ignore this email.</p>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ListsSync.ai | www.listssync.ai</p>
    </div>
  </div>
</body>
</html>
  `.trim();
  
  return sendEmail({
    to: email,
    subject,
    text,
    html
  });
}