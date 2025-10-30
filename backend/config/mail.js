const nodemailer = require('nodemailer');

// Create mail transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // You can change this to your email service
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });
};

// Verify mail transporter connection
const verifyConnection = async (transporter) => {
  try {
    await transporter.verify();
    console.log('Mail server is ready to send emails');
  } catch (error) {
    console.error('Mail server connection failed:', error);
    throw error;
 }
};

// Function to send email
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    // Verify connection
    await verifyConnection(transporter);
    
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
  createTransporter
};