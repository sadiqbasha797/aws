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

// Function to escape HTML to prevent XSS attacks
const escapeHtml = (text) => {
  if (text === null || text === undefined) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
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
const sendVerificationEmail = async (teamMember, verificationToken, password) => {
  try {
    const template = await readEmailTemplate('verification-email.html');
    
    // Get the frontend URL from environment or use default
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const verificationUrl = `${frontendUrl}/verify-email/${teamMember._id}/${verificationToken}`;
    
    const placeholders = {
      name: escapeHtml(teamMember.name),
      email: escapeHtml(teamMember.email),
      password: escapeHtml(password || 'Not provided'),
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

// Function to get performance class based on productivity percentage
const getProductivityPerformanceClass = (percentage) => {
  if (percentage >= 120) return 'performance-excellent';
  if (percentage >= 100) return 'performance-good';
  if (percentage >= 80) return 'performance-average';
  return 'performance-below';
};

// Function to send productivity data notification email to team member
const sendProductivityNotificationEmail = async (teamMember, productivityDataArray) => {
  try {
    if (!teamMember || !teamMember.email) {
      console.error('Team member or email not found');
      return;
    }

    if (!productivityDataArray || productivityDataArray.length === 0) {
      console.error('No productivity data provided');
      return;
    }

    const template = await readEmailTemplate('productivity-notification.html');
    
    // Generate table rows for productivity data
    let productivityDataRows = '';
    let totalProductivity = 0;
    
    productivityDataArray.forEach((data) => {
      const performanceClass = getProductivityPerformanceClass(data.productivityPercentage || 0);
      const performanceStatus = data.productivityPercentage >= 100 ? 'Above Target' : 
                                data.productivityPercentage >= 80 ? 'On Target' : 'Below Target';
      
      productivityDataRows += `
        <tr>
          <td>${escapeHtml(data.month || 'N/A')}</td>
          <td>${escapeHtml(data.week || 'N/A')}</td>
          <td>${escapeHtml(data.year || 'N/A')}</td>
          <td class="${performanceClass}">${data.productivityPercentage || 0}%</td>
          <td>${escapeHtml(performanceStatus)}</td>
        </tr>
      `;
      totalProductivity += data.productivityPercentage || 0;
    });
    
    const averageProductivity = (totalProductivity / productivityDataArray.length).toFixed(2);
    
    const placeholders = {
      name: escapeHtml(teamMember.name),
      productivityData: productivityDataRows,
      totalRecords: productivityDataArray.length,
      averageProductivity: averageProductivity
    };
    
    const html = replaceTemplatePlaceholders(template, placeholders);
    
    const emailOptions = {
      to: teamMember.email,
      subject: 'Your Productivity Data Has Been Updated',
      html: html
    };
    
    await sendEmail(emailOptions);
    console.log(`Productivity notification email sent to ${teamMember.email}`);
  } catch (error) {
    console.error('Error sending productivity notification email:', error);
    // Don't throw error - we don't want email failures to break the upload process
  }
};

// Function to get performance class based on reliability score
const getReliabilityPerformanceClass = (score) => {
  if (score >= 95) return 'performance-excellent';
  if (score >= 85) return 'performance-good';
  if (score >= 75) return 'performance-average';
  return 'performance-below';
};

// Function to get month name from month number
const getMonthName = (monthNumber) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || 'N/A';
};

// Function to send reliability data notification email to team member
const sendReliabilityNotificationEmail = async (teamMember, reliabilityData) => {
  try {
    if (!teamMember || !teamMember.email) {
      console.error('Team member or email not found');
      return;
    }

    if (!reliabilityData) {
      console.error('No reliability data provided');
      return;
    }

    const template = await readEmailTemplate('reliability-notification.html');
    
    const performanceClass = getReliabilityPerformanceClass(reliabilityData.overallReliabilityScore || 0);
    const monthName = getMonthName(reliabilityData.month);
    
    const placeholders = {
      name: escapeHtml(teamMember.name),
      overallReliabilityScore: (reliabilityData.overallReliabilityScore || 0).toFixed(2),
      performanceClass: performanceClass,
      month: escapeHtml(monthName),
      year: reliabilityData.year || 'N/A',
      processname: escapeHtml(reliabilityData.processname || 'N/A'),
      job_id: escapeHtml(reliabilityData.job_id || 'N/A'),
      workerId: escapeHtml(reliabilityData.workerId || 'N/A'),
      daId: escapeHtml(reliabilityData.daId || 'N/A'),
      totalTasks: reliabilityData.totalTasks || 0,
      totalOpportunities: reliabilityData.totalOpportunities || 0,
      totalDefects: reliabilityData.totalDefects || 0,
      segmentAccuracy: (reliabilityData.segmentAccuracy || 0).toFixed(2),
      labelAccuracy: (reliabilityData.labelAccuracy || 0).toFixed(2),
      defectRate: (reliabilityData.defectRate || 0).toFixed(2)
    };
    
    const html = replaceTemplatePlaceholders(template, placeholders);
    
    const emailOptions = {
      to: teamMember.email,
      subject: 'Your Reliability Data Has Been Updated',
      html: html
    };
    
    await sendEmail(emailOptions);
    console.log(`Reliability notification email sent to ${teamMember.email}`);
  } catch (error) {
    console.error('Error sending reliability notification email:', error);
    // Don't throw error - we don't want email failures to break the upload process
  }
};

module.exports = {
  sendVerificationEmail,
  sendProductivityNotificationEmail,
  sendReliabilityNotificationEmail,
  readEmailTemplate,
  replaceTemplatePlaceholders
};