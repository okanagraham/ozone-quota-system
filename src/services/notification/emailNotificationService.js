// src/services/notification/emailNotificationService.js
// Email notifications using Supabase Edge Functions or external service
import { supabase } from '../supabase/supabaseClient';

/**
 * Email Notification Service
 * Sends professional HTML emails for important events
 */
export const EmailNotificationService = {
  
  /**
   * Base email template with NOU branding
   */
  getBaseTemplate(content, preheader = '') {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>National Ozone Unit</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .button { padding: 12px 24px !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Preheader text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
  </div>
  
  <!-- Email Container -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Content Card -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px 40px; border-radius: 8px 8px 0 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background-color: #ffffff; width: 50px; height: 50px; border-radius: 50%; text-align: center; vertical-align: middle;">
                          <span style="color: #1e3a5f; font-size: 18px; font-weight: bold;">NOU</span>
                        </td>
                        <td style="padding-left: 15px;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">National Ozone Unit</h1>
                          <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">Quota Management System</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Body Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px;">
                      National Ozone Unit<br>
                      Ministry of Health, Wellness and the Environment<br>
                      St. Vincent & The Grenadines
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                      This is an automated message. Please do not reply directly to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
        <!-- Footer Links -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                <a href="#" style="color: #64748b; text-decoration: none;">Privacy Policy</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="#" style="color: #64748b; text-decoration: none;">Terms of Service</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="#" style="color: #64748b; text-decoration: none;">Contact Support</a>
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>`;
  },
  
  /**
   * Send email via Supabase Edge Function or external service
   */
  async sendEmail(to, subject, htmlContent) {
    try {
      // Option 1: Use Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { to, subject, html: htmlContent }
      });
      
      if (error) throw error;
      return { success: true, data };
      
    } catch (error) {
      console.error('Error sending email:', error);
      
      // Log failed email for retry
      await supabase.from('email_queue').insert({
        to_email: to,
        subject,
        html_content: htmlContent,
        status: 'failed',
        error_message: error.message,
        retry_count: 0
      });
      
      return { success: false, error };
    }
  },
  
  /**
   * Email Templates
   */
  templates: {
    
    // New Registration Submitted (to Admin)
    newRegistration(registration, user) {
      const content = `
        <h2 style="margin: 0 0 20px 0; color: #1e3a5f; font-size: 24px; font-weight: 600;">
          New Registration Application
        </h2>
        
        <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
          A new importer registration application has been submitted and requires your review.
        </p>
        
        <!-- Info Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 13px;">Enterprise Name</span><br>
                    <span style="color: #1e293b; font-size: 15px; font-weight: 500;">${user?.enterprise_name || registration?.name}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 13px;">Registration Year</span><br>
                    <span style="color: #1e293b; font-size: 15px; font-weight: 500;">${registration?.year}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 13px;">Substances Requested</span><br>
                    <span style="color: #1e293b; font-size: 15px; font-weight: 500;">${registration?.refrigerants?.length || 0} controlled substances</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #64748b; font-size: 13px;">Submitted</span><br>
                    <span style="color: #1e293b; font-size: 15px; font-weight: 500;">${new Date(registration?.created_at).toLocaleString()}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
          <tr>
            <td style="background-color: #1e3a5f; border-radius: 6px;">
              <a href="${process.env.REACT_APP_BASE_URL || 'https://nou.gov.vc'}/admin/registrations" 
                 style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500;">
                Review Application
              </a>
            </td>
          </tr>
        </table>
      `;
      
      return EmailNotificationService.getBaseTemplate(content, 'New registration application requires your review');
    },
    
    // Registration Approved (to Importer)
    registrationApproved(registration, user) {
      const content = `
        <h2 style="margin: 0 0 20px 0; color: #1e3a5f; font-size: 24px; font-weight: 600;">
          Registration Approved! 🎉
        </h2>
        
        <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
          Congratulations! Your registration as an importer of controlled substances has been approved for ${registration?.year}.
        </p>
        
        <!-- Success Banner -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ecfdf5; border-left: 4px solid #10b981; border-radius: 4px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 15px 20px;">
              <p style="margin: 0; color: #065f46; font-size: 14px;">
                <strong>Certificate Number:</strong> ${registration?.cert_no}
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Info Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 10px 0; color: #1e293b; font-size: 14px; font-weight: 600;">Approved Substances:</p>
              ${registration?.refrigerants?.map(r => `
                <span style="display: inline-block; background-color: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 4px; font-size: 13px; margin: 3px 3px 3px 0;">
                  ${r.ashrae}
                </span>
              `).join('') || 'N/A'}
            </td>
          </tr>
        </table>
        
        <p style="margin: 0 0 25px 0; color: #475569; font-size: 15px; line-height: 1.6;">
          You can now apply for import licenses. Your registration certificate is available for download from your dashboard.
        </p>
        
        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
          <tr>
            <td style="background-color: #10b981; border-radius: 6px;">
              <a href="${process.env.REACT_APP_BASE_URL || 'https://nou.gov.vc'}/dashboard" 
                 style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500;">
                View Dashboard
              </a>
            </td>
          </tr>
        </table>
      `;
      
      return EmailNotificationService.getBaseTemplate(content, `Your registration for ${registration?.year} has been approved`);
    },
    
    // New Import Request (to Admin)
    newImportRequest(importData, user) {
      const totalCO2 = importData?.imported_items?.reduce((sum, item) => 
        sum + parseFloat(item.co2_equivalent || 0), 0
      ).toLocaleString() || '0';
      
      const content = `
        <h2 style="margin: 0 0 20px 0; color: #1e3a5f; font-size: 24px; font-weight: 600;">
          New Import License Request
        </h2>
        
        <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
          A new import license request has been submitted.
        </p>
        
        <!-- Info Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 13px;">Import Number</span><br>
                    <span style="color: #1e293b; font-size: 15px; font-weight: 500;">#${importData?.import_number}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 13px;">Importer</span><br>
                    <span style="color: #1e293b; font-size: 15px; font-weight: 500;">${user?.enterprise_name || importData?.name}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 13px;">Items</span><br>
                    <span style="color: #1e293b; font-size: 15px; font-weight: 500;">${importData?.imported_items?.length || 0} substances</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #64748b; font-size: 13px;">Total CO2 Equivalent</span><br>
                    <span style="color: #1e293b; font-size: 15px; font-weight: 500;">${totalCO2} kg CO2eq</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
          <tr>
            <td style="background-color: #1e3a5f; border-radius: 6px;">
              <a href="${process.env.REACT_APP_BASE_URL || 'https://nou.gov.vc'}/admin/imports" 
                 style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500;">
                View Import Request
              </a>
            </td>
          </tr>
        </table>
      `;
      
      return EmailNotificationService.getBaseTemplate(content, `New import license request #${importData?.import_number}`);
    },
    
    // Shipment Arrived (to Admin)
    shipmentArrived(importData, user) {
      const content = `
        <h2 style="margin: 0 0 20px 0; color: #1e3a5f; font-size: 24px; font-weight: 600;">
          📦 Shipment Arrived - Action Required
        </h2>
        
        <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
          An importer has marked their shipment as arrived and uploaded inspection documents. Please schedule an inspection.
        </p>
        
        <!-- Alert Banner -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff7ed; border-left: 4px solid #f97316; border-radius: 4px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 15px 20px;">
              <p style="margin: 0; color: #9a3412; font-size: 14px;">
                <strong>Import #${importData?.import_number}</strong> is ready for inspection scheduling
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Info Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 13px;">Importer</span><br>
                    <span style="color: #1e293b; font-size: 15px; font-weight: 500;">${user?.enterprise_name || importData?.name}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #64748b; font-size: 13px;">Documents Uploaded</span><br>
                    <span style="color: #1e293b; font-size: 15px; font-weight: 500;">${importData?.documents?.length || 0} file(s)</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
          <tr>
            <td style="background-color: #f97316; border-radius: 6px;">
              <a href="${process.env.REACT_APP_BASE_URL || 'https://nou.gov.vc'}/admin/imports" 
                 style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500;">
                Schedule Inspection
              </a>
            </td>
          </tr>
        </table>
      `;
      
      return EmailNotificationService.getBaseTemplate(content, `Shipment arrived for import #${importData?.import_number} - Schedule inspection`);
    },
    
    // Inspection Scheduled (to Importer)
    inspectionScheduled(importData, inspectionDate) {
      const formattedDate = new Date(inspectionDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = new Date(inspectionDate).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const content = `
        <h2 style="margin: 0 0 20px 0; color: #1e3a5f; font-size: 24px; font-weight: 600;">
          📅 Inspection Scheduled
        </h2>
        
        <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
          Your import inspection has been scheduled. Please ensure the shipment is accessible at the scheduled time.
        </p>
        
        <!-- Date Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ede9fe; border-radius: 8px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 25px; text-align: center;">
              <p style="margin: 0 0 5px 0; color: #6d28d9; font-size: 14px; font-weight: 500;">Inspection Date & Time</p>
              <p style="margin: 0; color: #4c1d95; font-size: 24px; font-weight: 700;">${formattedDate}</p>
              <p style="margin: 5px 0 0 0; color: #6d28d9; font-size: 18px;">${formattedTime}</p>
            </td>
          </tr>
        </table>
        
        <!-- Info Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 8px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 10px 0; color: #1e293b; font-size: 14px; font-weight: 600;">Import Details:</p>
              <p style="margin: 0; color: #475569; font-size: 14px;">
                Import Number: <strong>#${importData?.import_number}</strong><br>
                Items: ${importData?.imported_items?.length || 0} substances
              </p>
            </td>
          </tr>
        </table>
        
        <p style="margin: 0 0 25px 0; color: #475569; font-size: 14px; line-height: 1.6;">
          <strong>Important:</strong> Please have the following ready for inspection:
        </p>
        <ul style="margin: 0 0 25px 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
          <li>Original invoice documents</li>
          <li>Bill of lading</li>
          <li>Access to the shipment location</li>
          <li>Photo ID of authorized representative</li>
        </ul>
        
        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
          <tr>
            <td style="background-color: #7c3aed; border-radius: 6px;">
              <a href="${process.env.REACT_APP_BASE_URL || 'https://nou.gov.vc'}/imports/${importData?.id}" 
                 style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500;">
                View Import Details
              </a>
            </td>
          </tr>
        </table>
      `;
      
      return EmailNotificationService.getBaseTemplate(content, `Inspection scheduled for ${formattedDate} at ${formattedTime}`);
    },
    
    // Import Approved (to Importer)
    importApproved(importData) {
      const content = `
        <h2 style="margin: 0 0 20px 0; color: #1e3a5f; font-size: 24px; font-weight: 600;">
          Import License Approved! ✅
        </h2>
        
        <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
          Great news! Your import license has been approved. You can now download your import license document.
        </p>
        
        <!-- Success Banner -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ecfdf5; border-left: 4px solid #10b981; border-radius: 4px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 15px 20px;">
              <p style="margin: 0; color: #065f46; font-size: 14px;">
                <strong>License Number:</strong> IL-${importData?.import_year}-${importData?.import_number}
              </p>
            </td>
          </tr>
        </table>
        
        <p style="margin: 0 0 25px 0; color: #475569; font-size: 14px; line-height: 1.6;">
          Your import license document is now available for download. Please present this document to Customs when clearing your shipment.
        </p>
        
        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
          <tr>
            <td style="background-color: #10b981; border-radius: 6px;">
              <a href="${process.env.REACT_APP_BASE_URL || 'https://nou.gov.vc'}/imports/${importData?.id}" 
                 style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500;">
                Download Import License
              </a>
            </td>
          </tr>
        </table>
      `;
      
      return EmailNotificationService.getBaseTemplate(content, `Your import license #${importData?.import_number} has been approved`);
    }
  },
  
  /**
   * High-level notification methods
   */
  async notifyNewRegistration(registration, user, adminEmails) {
    const html = this.templates.newRegistration(registration, user);
    for (const email of adminEmails) {
      await this.sendEmail(email, 'New Registration Application Submitted', html);
    }
  },
  
  async notifyRegistrationApproved(registration, user) {
    const html = this.templates.registrationApproved(registration, user);
    await this.sendEmail(user.email, `Registration Approved - Certificate ${registration.cert_no}`, html);
  },
  
  async notifyNewImportRequest(importData, user, adminEmails) {
    const html = this.templates.newImportRequest(importData, user);
    for (const email of adminEmails) {
      await this.sendEmail(email, `New Import License Request #${importData.import_number}`, html);
    }
  },
  
  async notifyShipmentArrived(importData, user, adminEmails) {
    const html = this.templates.shipmentArrived(importData, user);
    for (const email of adminEmails) {
      await this.sendEmail(email, `Shipment Arrived - Import #${importData.import_number}`, html);
    }
  },
  
  async notifyInspectionScheduled(importData, user, inspectionDate) {
    const html = this.templates.inspectionScheduled(importData, inspectionDate);
    await this.sendEmail(user.email, `Inspection Scheduled - Import #${importData.import_number}`, html);
  },
  
  async notifyImportApproved(importData, user) {
    const html = this.templates.importApproved(importData);
    await this.sendEmail(user.email, `Import License Approved - #${importData.import_number}`, html);
  },
  
  /**
   * Get admin emails from database
   */
  async getAdminEmails() {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('role', 'admin');
    
    if (error) {
      console.error('Error fetching admin emails:', error);
      return [];
    }
    
    return data.map(u => u.email);
  }
};

export default EmailNotificationService;