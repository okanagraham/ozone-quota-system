// src/services/email/emailService.js
import { supabase } from '../supabase/supabaseClient';

/**
 * Email Service with Resend primary and Nodemailer fallback
 * 
 * Configuration (set in .env):
 * - REACT_APP_EMAIL_PROVIDER: 'resend' | 'nodemailer' | 'auto' (default: 'auto')
 * - REACT_APP_RESEND_API_KEY: Resend API key
 * - REACT_APP_SMTP_HOST: SMTP host for Nodemailer
 * - REACT_APP_SMTP_PORT: SMTP port (default: 465)
 * - REACT_APP_SMTP_USER: SMTP username
 * - REACT_APP_SMTP_PASS: SMTP password
 * - REACT_APP_FROM_EMAIL: From email address
 */

const EMAIL_CONFIG = {
  provider: process.env.REACT_APP_EMAIL_PROVIDER || 'auto',
  resendApiKey: process.env.REACT_APP_RESEND_API_KEY,
  smtp: {
    host: process.env.REACT_APP_SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.REACT_APP_SMTP_PORT || '465'),
    secure: true,
    user: process.env.REACT_APP_SMTP_USER,
    pass: process.env.REACT_APP_SMTP_PASS,
  },
  fromEmail: process.env.REACT_APP_FROM_EMAIL || 'National Ozone Unit <nousvg@gmail.com>',
  adminEmail: process.env.REACT_APP_ADMIN_EMAIL || 'nousvg@gmail.com',
};

export const EmailService = {
  /**
   * Determine which email provider to use
   */
  getProvider() {
    if (EMAIL_CONFIG.provider === 'resend') return 'resend';
    if (EMAIL_CONFIG.provider === 'nodemailer') return 'nodemailer';
    // Auto mode: try Resend first if API key exists, otherwise Nodemailer
    if (EMAIL_CONFIG.resendApiKey) return 'resend';
    if (EMAIL_CONFIG.smtp.user && EMAIL_CONFIG.smtp.pass) return 'nodemailer';
    return 'supabase'; // Fallback to Supabase Edge Function
  },

  /**
   * Send email via Supabase Edge Function (supports both Resend and Nodemailer)
   */
  async sendEmail(emailData) {
    const provider = this.getProvider();
    console.log(`Sending email via ${provider}...`);

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          ...emailData,
          provider,
          config: provider === 'nodemailer' ? EMAIL_CONFIG.smtp : { apiKey: EMAIL_CONFIG.resendApiKey },
          from: EMAIL_CONFIG.fromEmail,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error sending email via ${provider}:`, error);
      
      // If using auto mode and Resend failed, try Nodemailer
      if (EMAIL_CONFIG.provider === 'auto' && provider === 'resend') {
        console.log('Resend failed, attempting Nodemailer fallback...');
        return this.sendEmailViaNodemailer(emailData);
      }
      
      throw error;
    }
  },

  /**
   * Direct Nodemailer fallback (via Supabase Edge Function)
   */
  async sendEmailViaNodemailer(emailData) {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          ...emailData,
          provider: 'nodemailer',
          config: EMAIL_CONFIG.smtp,
          from: EMAIL_CONFIG.fromEmail,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Nodemailer fallback also failed:', error);
      throw error;
    }
  },

  /**
   * Send registration approved notification
   */
  async sendRegistrationApproved(registration, user, certificateUrl) {
    const emailHtml = this.getRegistrationApprovedTemplate(registration, user, certificateUrl);

    return this.sendEmail({
      to: user.email,
      subject: `National Ozone Unit - Registration Certificate Ready ✔ (${registration.year}-${registration.cert_no})`,
      html: emailHtml,
    });
  },

  /**
   * Send import license approved notification
   */
  async sendImportLicenseApproved(importData, user, licenseUrl) {
    const emailHtml = this.getImportLicenseApprovedTemplate(importData, user, licenseUrl);

    return this.sendEmail({
      to: user.email,
      subject: `National Ozone Unit - Import License Ready ✔ (${importData.import_year}-${importData.import_number})`,
      html: emailHtml,
    });
  },

  /**
   * Send inspection scheduled notification
   */
  async sendInspectionScheduled(importData, user, inspectionDate) {
    const emailHtml = this.getInspectionScheduledTemplate(importData, user, inspectionDate);

    return this.sendEmail({
      to: user.email,
      subject: `National Ozone Unit - Inspection Scheduled for Import #${importData.import_number}`,
      html: emailHtml,
    });
  },

  /**
   * Send notification to admin about new registration
   */
  async notifyAdminNewRegistration(registration, user) {
    const emailHtml = this.getAdminNewRegistrationTemplate(registration, user);

    return this.sendEmail({
      to: EMAIL_CONFIG.adminEmail,
      subject: `New Registration Application - ${registration.name} (${registration.year})`,
      html: emailHtml,
    });
  },

  /**
   * Send notification to admin about new import request
   */
  async notifyAdminNewImport(importData, user) {
    const emailHtml = this.getAdminNewImportTemplate(importData, user);

    return this.sendEmail({
      to: EMAIL_CONFIG.adminEmail,
      subject: `New Import Request - ${importData.name} (#${importData.import_number})`,
      html: emailHtml,
    });
  },

  /**
   * Notify admin when shipment arrives
   */
  async notifyAdminShipmentArrived(importData, user) {
    const emailHtml = `
      <!doctype html>
      <html>
        <body style="background-color: #f6f6f6; font-family: sans-serif; font-size: 16px; padding: 20px;">
          <table style="background: #ffffff; border-radius: 3px; max-width: 580px; margin: 0 auto; width: 100%;">
            <tr>
              <td style="padding: 30px;">
                <h2 style="color: #333;">Shipment Arrived - Invoice Uploaded</h2>
                <p><strong>Importer:</strong> ${importData.name}</p>
                <p><strong>Import Number:</strong> ${importData.import_year}-${importData.import_number}</p>
                <p><strong>Items:</strong> ${(importData.imported_items || []).length}</p>
                <p style="color: #009E60; font-weight: bold;">
                  The importer has uploaded their invoice. Please schedule an inspection.
                </p>
                <p>
                  <a href="${importData.invoice_url}" style="color: #0072C6;">View Invoice</a>
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: EMAIL_CONFIG.adminEmail,
      subject: `Shipment Arrived - ${importData.name} (#${importData.import_number}) - Action Required`,
      html: emailHtml,
    });
  },

  // ==================== EMAIL TEMPLATES ====================

  getRegistrationApprovedTemplate(registration, user, certificateUrl) {
    return `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        </head>
        <body style="background-color: #f6f6f6; font-family: sans-serif; font-size: 16px; line-height: 1.4; margin: 0; padding: 0;">
          <table role="presentation" style="background-color: #f6f6f6; width: 100%;">
            <tr>
              <td style="padding: 20px;">
                <table role="presentation" style="background: #ffffff; border-radius: 3px; max-width: 580px; margin: 0 auto; width: 100%;">
                  <tr>
                    <td style="padding: 30px;">
                      <p style="margin: 0 0 15px;">Dear ${registration.name},</p>
                      <p style="margin: 0 0 15px; color: #009E60; font-weight: bold; font-size: 18px;">
                        ✔ Your registration application is complete!
                      </p>
                      <p style="margin: 0 0 15px; color: #34495e;">
                        Your registration for the year <strong>${registration.year}</strong> has been approved. 
                        You are now authorized to import the approved controlled substances.
                      </p>
                      <table style="background: #f8f9fa; border-radius: 5px; margin: 20px 0; width: 100%;">
                        <tr>
                          <td style="padding: 15px;">
                            <p style="margin: 0 0 5px; color: #666; font-size: 14px;">Certificate Number</p>
                            <p style="margin: 0; color: #333; font-size: 18px; font-weight: bold;">
                              ${registration.year}-${registration.cert_no}
                            </p>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 0 0 15px; color: #34495e;">
                        You can download your registration certificate by clicking the button below:
                      </p>
                      <table role="presentation" style="margin: 20px 0;">
                        <tr>
                          <td style="background-color: #009E60; border-radius: 5px;">
                            <a href="${certificateUrl}" target="_blank" style="background-color: #009E60; border-radius: 5px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: bold; padding: 12px 25px; text-decoration: none;">
                              Download Certificate
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 0 0 15px; color: #34495e;">Thank you for using our E-License system.</p>
                      <p style="margin: 0; color: #34495e;">Best regards,<br><strong>National Ozone Unit</strong></p>
                    </td>
                  </tr>
                </table>
                <table role="presentation" style="max-width: 580px; margin: 10px auto; width: 100%;">
                  <tr>
                    <td style="text-align: center; padding: 10px;">
                      <span style="color: #999999; font-size: 11px;">
                        National Ozone Unit E-Licensing System<br>
                        Ministry of Health, Wellness and the Environment<br>
                        St. Vincent and the Grenadines
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  },

  getImportLicenseApprovedTemplate(importData, user, licenseUrl) {
    const totalCO2 = (importData.imported_items || []).reduce(
      (sum, item) => sum + (parseFloat(item.co2_equivalent) || 0), 0
    );

    return `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        </head>
        <body style="background-color: #f6f6f6; font-family: sans-serif; font-size: 16px; line-height: 1.4; margin: 0; padding: 0;">
          <table role="presentation" style="background-color: #f6f6f6; width: 100%;">
            <tr>
              <td style="padding: 20px;">
                <table role="presentation" style="background: #ffffff; border-radius: 3px; max-width: 580px; margin: 0 auto; width: 100%;">
                  <tr>
                    <td style="padding: 30px;">
                      <p style="margin: 0 0 15px;">Dear ${user.display_name || user.displayName},</p>
                      <p style="margin: 0 0 15px; color: #009E60; font-weight: bold; font-size: 18px;">
                        ✔ Your import license is ready!
                      </p>
                      <p style="margin: 0 0 15px; color: #34495e;">
                        Your import license for <strong>${importData.import_year}</strong> has been approved 
                        and the document is ready for download.
                      </p>
                      <table style="background: #f8f9fa; border-radius: 5px; margin: 20px 0; width: 100%;">
                        <tr>
                          <td style="padding: 15px;">
                            <p style="margin: 0 0 10px;">
                              <span style="color: #666; font-size: 14px;">License Number:</span><br>
                              <strong style="font-size: 18px;">${importData.import_year}-${importData.import_number}</strong>
                            </p>
                            <p style="margin: 0 0 10px;">
                              <span style="color: #666; font-size: 14px;">Total CO2 Equivalent:</span><br>
                              <strong>${totalCO2.toLocaleString()} CO2eq</strong>
                            </p>
                            <p style="margin: 0;">
                              <span style="color: #666; font-size: 14px;">Items:</span><br>
                              <strong>${(importData.imported_items || []).length} controlled substances</strong>
                            </p>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 0 0 15px; color: #34495e;">
                        Please use this license for customs clearance of your imported items.
                      </p>
                      <table role="presentation" style="margin: 20px 0;">
                        <tr>
                          <td style="background-color: #009E60; border-radius: 5px;">
                            <a href="${licenseUrl}" target="_blank" style="background-color: #009E60; border-radius: 5px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: bold; padding: 12px 25px; text-decoration: none;">
                              Download Import License
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 0 0 15px; color: #34495e;">Thank you for using our E-License system.</p>
                      <p style="margin: 0; color: #34495e;">Best regards,<br><strong>National Ozone Unit</strong></p>
                    </td>
                  </tr>
                </table>
                <table role="presentation" style="max-width: 580px; margin: 10px auto; width: 100%;">
                  <tr>
                    <td style="text-align: center; padding: 10px;">
                      <span style="color: #999999; font-size: 11px;">
                        National Ozone Unit E-Licensing System<br>
                        Ministry of Health, Wellness and the Environment<br>
                        St. Vincent and the Grenadines
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  },

  getInspectionScheduledTemplate(importData, user, inspectionDate) {
    const formattedDate = new Date(inspectionDate).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        </head>
        <body style="background-color: #f6f6f6; font-family: sans-serif; font-size: 16px; line-height: 1.4; margin: 0; padding: 0;">
          <table role="presentation" style="background-color: #f6f6f6; width: 100%;">
            <tr>
              <td style="padding: 20px;">
                <table role="presentation" style="background: #ffffff; border-radius: 3px; max-width: 580px; margin: 0 auto; width: 100%;">
                  <tr>
                    <td style="padding: 30px;">
                      <p style="margin: 0 0 15px;">Dear ${importData.name},</p>
                      <p style="margin: 0 0 15px; color: #0072C6; font-weight: bold; font-size: 18px;">
                        📅 Your import inspection has been scheduled
                      </p>
                      <table style="background: #e3f2fd; border-radius: 5px; margin: 20px 0; width: 100%; border-left: 4px solid #0072C6;">
                        <tr>
                          <td style="padding: 15px;">
                            <p style="margin: 0 0 10px;">
                              <span style="color: #666; font-size: 14px;">Import Number:</span><br>
                              <strong>${importData.import_year}-${importData.import_number}</strong>
                            </p>
                            <p style="margin: 0;">
                              <span style="color: #666; font-size: 14px;">Inspection Date & Time:</span><br>
                              <strong style="font-size: 18px; color: #0072C6;">${formattedDate}</strong>
                            </p>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 0 0 15px; color: #34495e;">
                        Please ensure you or an authorized representative is present at the inspection location 
                        with all necessary documentation.
                      </p>
                      <p style="margin: 0 0 15px; color: #34495e;">Thank you for using our E-License system.</p>
                      <p style="margin: 0; color: #34495e;">Best regards,<br><strong>National Ozone Unit</strong></p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  },

  getAdminNewRegistrationTemplate(registration, user) {
    return `
      <!doctype html>
      <html>
        <body style="background-color: #f6f6f6; font-family: sans-serif; font-size: 16px; padding: 20px;">
          <table style="background: #ffffff; border-radius: 3px; max-width: 580px; margin: 0 auto; width: 100%;">
            <tr>
              <td style="padding: 30px;">
                <h2 style="color: #333; margin-top: 0;">New Registration Application</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Applicant:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${registration.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Enterprise:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${user.enterprise_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Year:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${registration.year}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Certificate No:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${registration.cert_no}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Refrigerants:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${(registration.refrigerants || []).length} requested</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>Retail:</strong></td>
                    <td style="padding: 8px 0;">${registration.retail ? 'Yes' : 'No'}</td>
                  </tr>
                </table>
                <p style="margin-top: 20px;">Please review this application in the admin portal.</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  },

  getAdminNewImportTemplate(importData, user) {
    const totalCO2 = (importData.imported_items || []).reduce(
      (sum, item) => sum + (parseFloat(item.co2_equivalent) || 0), 0
    );

    return `
      <!doctype html>
      <html>
        <body style="background-color: #f6f6f6; font-family: sans-serif; font-size: 16px; padding: 20px;">
          <table style="background: #ffffff; border-radius: 3px; max-width: 580px; margin: 0 auto; width: 100%;">
            <tr>
              <td style="padding: 30px;">
                <h2 style="color: #333; margin-top: 0;">New Import License Request</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Importer:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${importData.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Import Number:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${importData.import_number}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Year:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${importData.import_year}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Items:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${(importData.imported_items || []).length}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Total CO2:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${totalCO2.toLocaleString()} CO2eq</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>Shipment Status:</strong></td>
                    <td style="padding: 8px 0;">${importData.arrived ? '✅ Arrived' : '⏳ Awaiting Arrival'}</td>
                  </tr>
                </table>
                <p style="margin-top: 20px;">Please review this request in the admin portal.</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  },
};

export default EmailService;