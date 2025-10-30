const fs = require('fs').promises;
const path = require('path');
const { sendEmail } = require('../config/mail');

// Function to read email template
const readEmailTemplate = async (templateName) => {
  try {
    const templatePath = path.join(__dirname, '../templates', templateName);
    const template = await fs.readFile(templatePath, 'utf8');
    return template;
  } catch (error) {
    console.error('Error reading email template:', error);
    throw error;
  }
};

// Function to replace placeholders in email template
const replaceTemplatePlaceholders = (template, placeholders) => {
  let processedTemplate = template;
 for (const [key, value] of Object.entries(placeholders)) {
    processedTemplate = processedTemplate.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return processedTemplate;
};

// Function to send verification email to team member
const sendVerificationEmail = async (teamMember, verificationToken) => {
  try {
    const template = await readEmailTemplate('verification-email.html');
    
    // Get the frontend URL from environment or use default
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const verificationUrl = `${frontendUrl}/verify-email/${teamMember._id}/${verificationToken}`;
    
    const placeholders = {
      name: teamMember.name,
      verificationUrl: verificationUrl
    };
    
    const html = replaceTemplatePlaceholders(template, placeholders);
    
    const emailOptions = {
      to: teamMember.email,
      subject: 'Verify Your Email Address - Team Member Registration',
      html: html
    };
    
    await sendEmail(emailOptions);
    console.log(`Verification email sent to ${teamMember.email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
 }
};

module.exports = {
  sendVerificationEmail,
  readEmailTemplate,
  replaceTemplatePlaceholders
};