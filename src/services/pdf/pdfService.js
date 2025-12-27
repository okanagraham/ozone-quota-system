// src/services/pdf/pdfService.js
import { pdf } from '@react-pdf/renderer';
import { supabase } from '../supabase/supabaseClient';
import RegistrationCertificatePDF from '../../components/pdf/RegistrationCertificatePDF';
import ImportLicensePDF from '../../components/pdf/ImportLicensePDF';

/**
 * PDF Generation Service
 * Handles generation and downloading of registration certificates and import licenses
 */
export const PDFService = {
  /**
   * Generate Registration Certificate PDF
   * @param {string} registrationId - The registration ID
   * @returns {Promise<Blob>} - The PDF blob
   */
  async generateRegistrationCertificate(registrationId) {
    try {
      // Fetch registration data
      const { data: registration, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('id', registrationId)
        .single();

      if (regError) throw regError;

      // Fetch user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', registration.user_id)
        .single();

      if (userError) throw userError;

      // Parse refrigerants from registration
      const refrigerants = registration.refrigerants || [];

      // Generate PDF
      const pdfDocument = (
        <RegistrationCertificatePDF
          registration={registration}
          user={user}
          refrigerants={refrigerants}
        />
      );

      const blob = await pdf(pdfDocument).toBlob();
      return blob;
    } catch (error) {
      console.error('Error generating registration certificate:', error);
      throw error;
    }
  },

  /**
   * Generate Import License PDF
   * @param {string} importId - The import ID
   * @returns {Promise<Blob>} - The PDF blob
   */
  async generateImportLicense(importId) {
    try {
      // Fetch import data
      const { data: importData, error: importError } = await supabase
        .from('imports')
        .select('*')
        .eq('id', importId)
        .single();

      if (importError) throw importError;

      // Fetch user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', importData.user_id)
        .single();

      if (userError) throw userError;

      // Generate PDF
      const pdfDocument = (
        <ImportLicensePDF
          importData={importData}
          user={user}
        />
      );

      const blob = await pdf(pdfDocument).toBlob();
      return blob;
    } catch (error) {
      console.error('Error generating import license:', error);
      throw error;
    }
  },

  /**
   * Download PDF
   * @param {Blob} blob - The PDF blob
   * @param {string} filename - The filename for download
   */
  downloadPDF(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Generate and download Registration Certificate
   * @param {string} registrationId - The registration ID
   * @param {string} certNo - Certificate number for filename
   * @param {string} year - Year for filename
   */
  async downloadRegistrationCertificate(registrationId, certNo, year) {
    try {
      const blob = await this.generateRegistrationCertificate(registrationId);
      const filename = `Registration_Certificate_${year}_${certNo}.pdf`;
      this.downloadPDF(blob, filename);
      return true;
    } catch (error) {
      console.error('Error downloading registration certificate:', error);
      throw error;
    }
  },

  /**
   * Generate and download Import License
   * @param {string} importId - The import ID
   * @param {string} importNumber - Import number for filename
   * @param {string} year - Year for filename
   */
  async downloadImportLicense(importId, importNumber, year) {
    try {
      const blob = await this.generateImportLicense(importId);
      const filename = `Import_License_${year}_${importNumber}.pdf`;
      this.downloadPDF(blob, filename);
      return true;
    } catch (error) {
      console.error('Error downloading import license:', error);
      throw error;
    }
  },

  /**
   * Upload PDF to Supabase Storage
   * @param {Blob} blob - The PDF blob
   * @param {string} path - Storage path
   * @returns {Promise<string>} - Public URL of uploaded file
   */
  async uploadToStorage(blob, path) {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(path, blob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading PDF to storage:', error);
      throw error;
    }
  },

  /**
   * Generate, upload, and mark registration as download ready
   * @param {string} registrationId - The registration ID
   */
  async processRegistrationCertificate(registrationId) {
    try {
      // Generate PDF
      const blob = await this.generateRegistrationCertificate(registrationId);

      // Upload to storage
      const path = `registrations/${registrationId}/certificate.pdf`;
      const publicUrl = await this.uploadToStorage(blob, path);

      // Update registration with download URL
      const { error } = await supabase
        .from('registrations')
        .update({
          download_ready: true,
          certificate_url: publicUrl,
          generated: true,
          can_generate: false,
        })
        .eq('id', registrationId);

      if (error) throw error;

      return publicUrl;
    } catch (error) {
      console.error('Error processing registration certificate:', error);
      throw error;
    }
  },

  /**
   * Generate, upload, and mark import license as download ready
   * @param {string} importId - The import ID
   */
  async processImportLicense(importId) {
    try {
      // Fetch import to get user_id and import_number
      const { data: importData, error: fetchError } = await supabase
        .from('imports')
        .select('user_id, import_number')
        .eq('id', importId)
        .single();

      if (fetchError) throw fetchError;

      // Generate PDF
      const blob = await this.generateImportLicense(importId);

      // Upload to storage
      const path = `imports/${importData.user_id}/${importData.import_number}.pdf`;
      const publicUrl = await this.uploadToStorage(blob, path);

      // Update import with download URL
      const { error } = await supabase
        .from('imports')
        .update({
          download_ready: true,
          license_url: publicUrl,
          status: 'Document Ready',
        })
        .eq('id', importId);

      if (error) throw error;

      return publicUrl;
    } catch (error) {
      console.error('Error processing import license:', error);
      throw error;
    }
  },
};

export default PDFService;