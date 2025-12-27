// src/services/documents/documentProcessor.js
import { pdf } from '@react-pdf/renderer';
import { supabase } from '../supabase/supabaseClient';
import { EmailService } from '../email/emailService';
import RegistrationCertificatePDF from '../../components/pdf/RegistrationCertificatePDF';
import ImportLicensePDF from '../../components/pdf/ImportLicensePDF';

/**
 * Document Processor Service
 * Handles automatic PDF generation, storage upload, and email notifications
 * when documents are approved
 */
export const DocumentProcessor = {
  /**
   * Process registration approval - generates PDF, uploads, sends email
   * Called when admin approves a registration
   * @param {string} registrationId - Registration ID
   * @param {Object} adminData - Admin signature data
   */
  async processRegistrationApproval(registrationId, adminData) {
    try {
      console.log('Processing registration approval:', registrationId);

      // 1. Update registration with admin signature and approval
      const { data: registration, error: updateError } = await supabase
        .from('registrations')
        .update({
          completed: true,
          status: 'complete',
          admin_name: adminData.adminName,
          admin_role: adminData.adminRole || 'NOU Administrator',
          admin_signature_date: new Date().toISOString(),
          admin_signature_url: adminData.signatureUrl,
          can_generate: false, // We'll generate immediately
        })
        .eq('id', registrationId)
        .select()
        .single();

      if (updateError) throw updateError;

      // 2. Fetch user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', registration.user_id)
        .single();

      if (userError) throw userError;

      // 3. Set this as the user's current registration for the year
      await supabase
        .from('users')
        .update({ current_registration_id: registrationId })
        .eq('id', registration.user_id);

      // 4. Generate PDF
      const pdfBlob = await this.generateRegistrationPDF(registration, user);

      // 5. Upload to Supabase Storage
      const filePath = `registrations/${registrationId}/certificate.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 6. Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const certificateUrl = urlData.publicUrl;

      // 7. Update registration with download URL
      await supabase
        .from('registrations')
        .update({
          download_ready: true,
          certificate_url: certificateUrl,
          generated: true,
        })
        .eq('id', registrationId);

      // 8. Send email notification to user
      try {
        await EmailService.sendRegistrationApproved(registration, user, certificateUrl);
        console.log('Registration approval email sent to:', user.email);
      } catch (emailError) {
        console.error('Failed to send email, but document is ready:', emailError);
        // Don't throw - document is still generated successfully
      }

      return {
        success: true,
        certificateUrl,
        registration,
      };
    } catch (error) {
      console.error('Error processing registration approval:', error);
      throw error;
    }
  },

  /**
   * Process import license approval - generates PDF, uploads, sends email
   * Called when admin approves an import after inspection
   * @param {string} importId - Import ID
   * @param {Object} adminData - Admin signature data
   */
  async processImportApproval(importId, adminData) {
    try {
      console.log('Processing import approval:', importId);

      // 1. Update import with admin signature and approval
      const { data: importData, error: updateError } = await supabase
        .from('imports')
        .update({
          approved: true,
          inspected: true,
          status: 'Approved',
          admin_name: adminData.adminName,
          admin_role: adminData.adminRole || 'NOU Administrator',
          admin_signature_date: new Date().toISOString(),
          admin_signature_url: adminData.signatureUrl,
        })
        .eq('id', importId)
        .select()
        .single();

      if (updateError) throw updateError;

      // 2. Fetch user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', importData.user_id)
        .single();

      if (userError) throw userError;

      // 3. Update user quota
      await this.updateUserQuota(user.id, importData);

      // 4. Generate PDF
      const pdfBlob = await this.generateImportLicensePDF(importData, user);

      // 5. Upload to Supabase Storage
      const filePath = `imports/${user.id}/${importData.import_number}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 6. Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const licenseUrl = urlData.publicUrl;

      // 7. Update import with download URL
      await supabase
        .from('imports')
        .update({
          download_ready: true,
          license_url: licenseUrl,
          status: 'Document Ready',
        })
        .eq('id', importId);

      // 8. Send email notification to user
      try {
        await EmailService.sendImportLicenseApproved(importData, user, licenseUrl);
        console.log('Import license email sent to:', user.email);
      } catch (emailError) {
        console.error('Failed to send email, but document is ready:', emailError);
      }

      return {
        success: true,
        licenseUrl,
        importData,
      };
    } catch (error) {
      console.error('Error processing import approval:', error);
      throw error;
    }
  },

  /**
   * Generate Registration Certificate PDF blob
   */
  async generateRegistrationPDF(registration, user) {
    const pdfDocument = (
      <RegistrationCertificatePDF
        registration={registration}
        user={user}
        refrigerants={registration.refrigerants || []}
      />
    );
    return await pdf(pdfDocument).toBlob();
  },

  /**
   * Generate Import License PDF blob
   */
  async generateImportLicensePDF(importData, user) {
    const pdfDocument = (
      <ImportLicensePDF
        importData={importData}
        user={user}
      />
    );
    return await pdf(pdfDocument).toBlob();
  },

  /**
   * Update user quota after import approval
   */
  async updateUserQuota(userId, importData) {
    try {
      // Calculate total CO2 equivalent for this import
      const totalCO2 = (importData.imported_items || []).reduce(
        (sum, item) => sum + (parseFloat(item.co2_equivalent) || 0),
        0
      );

      // Fetch current user quota
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('import_quota, cumulative_imports, balance_imports')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Update quota usage
      const newCumulative = (user.cumulative_imports || 0) + totalCO2;
      const newBalance = (user.import_quota || 0) - newCumulative;

      await supabase
        .from('users')
        .update({
          cumulative_imports: newCumulative,
          balance_imports: Math.max(0, newBalance),
        })
        .eq('id', userId);

      console.log(`Updated quota for user ${userId}: cumulative=${newCumulative}, balance=${newBalance}`);
    } catch (error) {
      console.error('Error updating user quota:', error);
      // Don't throw - quota update failure shouldn't block approval
    }
  },

  /**
   * Schedule inspection and send notification
   * @param {string} importId - Import ID
   * @param {Date} inspectionDate - Scheduled date
   */
  async scheduleInspection(importId, inspectionDate) {
    try {
      // Update import with inspection date
      const { data: importData, error: updateError } = await supabase
        .from('imports')
        .update({
          inspection_date: inspectionDate,
          status: 'Inspection Scheduled',
        })
        .eq('id', importId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Fetch user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', importData.user_id)
        .single();

      if (userError) throw userError;

      // Send notification
      await EmailService.sendInspectionScheduled(importData, user, inspectionDate);

      return { success: true, importData };
    } catch (error) {
      console.error('Error scheduling inspection:', error);
      throw error;
    }
  },

  /**
   * Process new registration submission
   * @param {Object} registrationData - Registration form data
   * @param {string} userId - User ID
   */
  async processNewRegistration(registrationData, userId) {
    try {
      // Fetch user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Get next certificate number from settings
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('registration_cert_no_counter')
        .single();

      if (settingsError) throw settingsError;

      const certNo = (settings.registration_cert_no_counter || 0) + 1;

      // Create registration
      const registrationYear = new Date().getMonth() === 11 
        ? (new Date().getFullYear() + 1).toString()
        : new Date().getFullYear().toString();

      const { data: registration, error: regError } = await supabase
        .from('registrations')
        .insert({
          user_id: userId,
          name: user.enterprise_name || user.display_name,
          year: registrationYear,
          cert_no: certNo,
          refrigerants: registrationData.refrigerants,
          retail: registrationData.retail || false,
          status: 'Awaiting Approval',
          completed: false,
          paid: false,
          can_generate: false,
          next_importer_number: 0,
        })
        .select()
        .single();

      if (regError) throw regError;

      // Update settings counter
      await supabase
        .from('settings')
        .update({ registration_cert_no_counter: certNo })
        .eq('id', settings.id);

      // Notify admin
      try {
        await EmailService.notifyAdminNewRegistration(registration, user);
      } catch (emailError) {
        console.error('Failed to notify admin:', emailError);
      }

      return { success: true, registration };
    } catch (error) {
      console.error('Error processing new registration:', error);
      throw error;
    }
  },

  /**
   * Process new import request
   * @param {Object} importData - Import form data
   * @param {string} userId - User ID
   */
  async processNewImport(importData, userId) {
    try {
      // Fetch user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Get next import number from settings
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('imports')
        .single();

      if (settingsError) throw settingsError;

      const importNumber = (settings.imports || 0) + 1;

      // Create import record
      const { data: newImport, error: importError } = await supabase
        .from('imports')
        .insert({
          user_id: userId,
          name: user.enterprise_name || user.display_name,
          import_year: new Date().getFullYear().toString(),
          import_number: importNumber,
          imported_items: importData.importedItems,
          registration_id: importData.registrationId,
          arrived: importData.arrived || false,
          invoice_uploaded: !!importData.invoiceUrl,
          invoice_url: importData.invoiceUrl,
          pending: true,
          approved: false,
          inspected: false,
          status: importData.arrived ? 'Awaiting Inspection Schedule' : 'Awaiting Arrival',
        })
        .select()
        .single();

      if (importError) throw importError;

      // Update settings counter
      await supabase
        .from('settings')
        .update({ imports: importNumber })
        .eq('id', settings.id);

      // Notify admin
      try {
        await EmailService.notifyAdminNewImport(newImport, user);
      } catch (emailError) {
        console.error('Failed to notify admin:', emailError);
      }

      return { success: true, import: newImport };
    } catch (error) {
      console.error('Error processing new import:', error);
      throw error;
    }
  },
};

export default DocumentProcessor;