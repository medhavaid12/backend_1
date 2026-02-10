const nodemailer = require('nodemailer');

// Create a test account (for demo purposes)
// In production, use Gmail, SendGrid, or other services
const createTransporter = async () => {
  // For demo: Using Ethereal (free test emails)
  // In production, replace with your email service credentials
  
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  
  // Default: Ethereal test service (works without configuration)
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
};

const sendNoteCreatedEmail = async (userEmail, noteText, noteId) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: '"LeadNotes" <noreply@leadnotes.com>',
      to: userEmail,
      subject: '✅ Your Note Has Been Created!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px;">
          <h2 style="color: #667eea;">📌 LeadNotes - Note Created Successfully</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="margin-top: 0; color: #333;">Your Note:</h3>
            <p style="font-size: 16px; color: #555; line-height: 1.6;">
              <strong>${noteText}</strong>
            </p>
            <p style="font-size: 12px; color: #999;">
              Note ID: ${noteId}<br/>
              Created at: ${new Date().toLocaleString()}
            </p>
          </div>

          <p style="color: #666; margin: 20px 0;">
            Great! Your note has been saved successfully to LeadNotes. You can access it anytime by logging into your account.
          </p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />

          <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #667eea; margin-top: 0;">💡 Tips:</h4>
            <ul style="color: #666; padding-left: 20px;">
              <li>Keep your notes organized and accessible</li>
              <li>Create as many notes as you need</li>
              <li>Share notes with your team members</li>
            </ul>
          </div>

          <p style="text-align: center; color: #999; font-size: 12px;">
            © 2026 LeadNotes. All rights reserved.<br/>
            <a href="http://localhost:3000" style="color: #667eea; text-decoration: none;">Open LeadNotes</a>
          </p>
        </div>
      `,
      text: `Your note has been created:\n\n${noteText}\n\nNote ID: ${noteId}\nCreated at: ${new Date().toLocaleString()}`
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✓ Email sent successfully');
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };
  } catch (error) {
    console.error('✗ Error sending email:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = { sendNoteCreatedEmail, createTransporter };
