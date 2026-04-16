import nodemailer from 'nodemailer';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  // Support both SMTP_* and EMAIL_* env variable naming
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const service = process.env.EMAIL_SERVICE;

  if (host && port) {
    // Explicit SMTP config
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    });
  } else {
    // Fallback to service-based config (e.g. gmail)
    transporter = nodemailer.createTransport({
      service: service || 'gmail',
      auth: { user, pass },
    });
  }

  return transporter;
};

/**
 * Send an OTP email for password reset
 */
export const sendOtpEmail = async (to, otp, userName) => {
  // Graceful fallback if no email configuration is provided
  if (!process.env.SMTP_USER && !process.env.EMAIL_USER && !process.env.SMTP_HOST) {
    console.warn('⚠️ SMTP/Email credentials not configured. Email not sent.');
    console.warn(`[DEV] OTP that would have been sent to ${to}: ${otp}`);
    return; // Fast-exit before even trying to initialize nodemailer
  }

  const fromName = process.env.SMTP_FROM_NAME || 'infeNevoCloud';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || process.env.EMAIL_USER;

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject: 'Password Reset OTP — infeNevoCloud',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #1f2937; margin-bottom: 8px;">Password Reset Request</h2>
        <p style="color: #6b7280; font-size: 14px;">Hi ${userName || 'there'},</p>
        <p style="color: #6b7280; font-size: 14px;">Use the OTP below to reset your infeNevoCloud password. It expires in <strong>10 minutes</strong>.</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; background: #eef2ff; padding: 16px 32px; border-radius: 8px;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 13px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">infeNevoCloud</p>
      </div>
    `,
  };

  try {
    const transporter = getTransporter();
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw new Error('Failed to send email. Check your SMTP configuration.');
  }
};
