// src/services/import/importLicenseService.js
// ALL DATABASE OPERATIONS USE SUPABASE - NOT FIREBASE
import { supabase } from '../supabase/supabaseClient';

// Base64 decode helper for signature upload
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Import License Service - Handles all import operations with Supabase
 */
export const ImportLicenseService = {
  
  /**
   * Create a new import license request
   */
  async createImport(userId, importData, userProfile) {
    try {
      // Get user's active registration
      const { data: registration, error: regError } = await supabase
        .from('registrations')
        .select('id, cert_no, next_importer_number')
        .eq('user_id', userId)
        .eq('year', new Date().getFullYear().toString())
        .eq('completed', true)
        .single();
      
      if (regError && regError.code !== 'PGRST116') throw regError;
      
      if (!registration) {
        throw new Error('No active registration found for this year');
      }
      
      // Get next import number
      const nextImportNumber = (registration.next_importer_number || 1000) + 1;
      
      // Create import record
      const { data: newImport, error: createError } = await supabase
        .from('imports')
        .insert({
          user_id: userId,
          registration_id: registration.id,
          name: userProfile?.enterprise_name || '',
          import_year: new Date().getFullYear().toString(),
          import_number: nextImportNumber,
          imported_items: importData.items,
          arrived: false,
          invoice_uploaded: false,
          pending: true,
          approved: false,
          inspected: false,
          status: 'Awaiting Shipment Arrival',
          documents: []
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Update registration's next importer number
      await supabase
        .from('registrations')
        .update({ next_importer_number: nextImportNumber })
        .eq('id', registration.id);
      
      // Send notification to admin
      await this.sendNotification({
        type: 'NEW_IMPORT_REQUEST',
        title: 'New Import License Request',
        message: `${userProfile?.enterprise_name || 'An importer'} submitted import request #${nextImportNumber}`,
        related_id: newImport.id,
        related_type: 'import',
        target_user_id: null,
        target_role: 'admin'
      });
      
      return newImport;
    } catch (error) {
      console.error('Error creating import:', error);
      throw error;
    }
  },
  
  /**
   * Get imports for a user
   */
  async getImportsForUser(userId, year = null) {
    try {
      let query = supabase
        .from('imports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (year) {
        query = query.eq('import_year', year);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching imports:', error);
      throw error;
    }
  },
  
  /**
   * Get all imports (admin)
   */
  async getAllImports(filters = {}) {
    try {
      let query = supabase
        .from('imports')
        .select(`
          *,
          users:user_id (
            id,
            email,
            display_name,
            enterprise_name
          )
        `)
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (filters.year) {
        query = query.eq('import_year', filters.year);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.arrived !== undefined) {
        query = query.eq('arrived', filters.arrived);
      }
      if (filters.approved !== undefined) {
        query = query.eq('approved', filters.approved);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all imports:', error);
      throw error;
    }
  },
  
  /**
   * Get single import by ID
   */
  async getImportById(importId) {
    try {
      const { data, error } = await supabase
        .from('imports')
        .select(`
          *,
          users:user_id (
            id,
            email,
            display_name,
            enterprise_name,
            business_address,
            telephone
          ),
          registrations:registration_id (
            id,
            cert_no,
            year,
            refrigerants
          )
        `)
        .eq('id', importId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching import:', error);
      throw error;
    }
  },
  
  /**
   * Mark shipment as arrived with document uploads
   */
  async markShipmentArrived(importId, documents = []) {
    try {
      // Get current import data
      const { data: importData, error: fetchError } = await supabase
        .from('imports')
        .select('*')
        .eq('id', importId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update import
      const { error: updateError } = await supabase
        .from('imports')
        .update({
          arrived: true,
          arrival_date: new Date().toISOString(),
          invoice_uploaded: documents.length > 0,
          documents: documents,
          status: 'Awaiting Inspection Schedule'
        })
        .eq('id', importId);
      
      if (updateError) throw updateError;
      
      // Send notification to admin
      await this.sendNotification({
        type: 'SHIPMENT_ARRIVED',
        title: 'Shipment Arrived - Ready for Inspection',
        message: `Import #${importData.import_number} shipment has arrived. ${documents.length} document(s) uploaded.`,
        related_id: importId,
        related_type: 'import',
        target_user_id: null,
        target_role: 'admin'
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error marking shipment arrived:', error);
      throw error;
    }
  },
  
  /**
   * Upload document(s) to import
   */
  async uploadDocuments(importId, files) {
    try {
      const uploadedDocs = [];
      
      for (const file of files) {
        const fileName = `${importId}/${Date.now()}_${file.name}`;
        
        const { data, error } = await supabase.storage
          .from('imports')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) throw error;
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('imports')
          .getPublicUrl(fileName);
        
        uploadedDocs.push({
          name: file.name,
          url: urlData.publicUrl,
          path: fileName,
          uploadedAt: new Date().toISOString(),
          type: file.type
        });
      }
      
      // Get existing documents and merge
      const { data: importData } = await supabase
        .from('imports')
        .select('documents')
        .eq('id', importId)
        .single();
      
      const existingDocs = importData?.documents || [];
      const allDocs = [...existingDocs, ...uploadedDocs];
      
      // Update import with new documents
      const { error: updateError } = await supabase
        .from('imports')
        .update({
          documents: allDocs,
          invoice_uploaded: true
        })
        .eq('id', importId);
      
      if (updateError) throw updateError;
      
      return uploadedDocs;
    } catch (error) {
      console.error('Error uploading documents:', error);
      throw error;
    }
  },
  
  /**
   * Remove a document from import
   */
  async removeDocument(importId, documentPath) {
    try {
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('imports')
        .remove([documentPath]);
      
      if (deleteError) throw deleteError;
      
      // Update import documents array
      const { data: importData } = await supabase
        .from('imports')
        .select('documents')
        .eq('id', importId)
        .single();
      
      const updatedDocs = (importData?.documents || []).filter(
        doc => doc.path !== documentPath
      );
      
      const { error: updateError } = await supabase
        .from('imports')
        .update({
          documents: updatedDocs,
          invoice_uploaded: updatedDocs.length > 0
        })
        .eq('id', importId);
      
      if (updateError) throw updateError;
      
      return { success: true, documents: updatedDocs };
    } catch (error) {
      console.error('Error removing document:', error);
      throw error;
    }
  },
  
  /**
   * Admin: Schedule inspection for an import
   */
  async scheduleInspection(importId, inspectionDate, adminInfo) {
    try {
      // Get import data
      const { data: importData, error: fetchError } = await supabase
        .from('imports')
        .select('*')
        .eq('id', importId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update import
      const { error: updateError } = await supabase
        .from('imports')
        .update({
          inspection_date: inspectionDate,
          inspection_scheduled_by: adminInfo.name,
          status: 'Inspection Scheduled'
        })
        .eq('id', importId);
      
      if (updateError) throw updateError;
      
      // Send notification to importer
      await this.sendNotification({
        type: 'INSPECTION_SCHEDULED',
        title: 'Inspection Scheduled',
        message: `Your import #${importData.import_number} inspection scheduled for ${new Date(inspectionDate).toLocaleDateString()} at ${new Date(inspectionDate).toLocaleTimeString()}`,
        related_id: importId,
        related_type: 'import',
        target_user_id: importData.user_id,
        target_role: null
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error scheduling inspection:', error);
      throw error;
    }
  },
  
  /**
   * Admin: Approve import after inspection
   */
  async approveImport(importId, adminInfo, signatureDataUrl) {
    try {
      // Get import data
      const { data: importData, error: fetchError } = await supabase
        .from('imports')
        .select('*')
        .eq('id', importId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Upload signature to storage
      let signatureUrl = null;
      if (signatureDataUrl) {
        const base64Data = signatureDataUrl.split(',')[1];
        const arrayBuffer = base64ToArrayBuffer(base64Data);
        
        const fileName = `imports/${importId}_admin_${Date.now()}.png`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(fileName, arrayBuffer, {
            contentType: 'image/png',
            upsert: true
          });
        
        if (uploadError) {
          console.error('Signature upload error:', uploadError);
          // Continue without signature URL if upload fails
        } else {
          const { data: urlData } = supabase.storage
            .from('signatures')
            .getPublicUrl(fileName);
          signatureUrl = urlData.publicUrl;
        }
      }
      
      // Calculate total CO2 for quota update
      const totalCO2 = (importData.imported_items || []).reduce((sum, item) => {
        return sum + parseFloat(item.co2_equivalent || 0);
      }, 0);
      
      // Update user's quota
      const { data: userData, error: userFetchError } = await supabase
        .from('users')
        .select('cumulative_imports, balance_imports')
        .eq('id', importData.user_id)
        .single();
      
      if (!userFetchError && userData) {
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            cumulative_imports: (userData.cumulative_imports || 0) + totalCO2,
            balance_imports: (userData.balance_imports || 0) - totalCO2
          })
          .eq('id', importData.user_id);
        
        if (userUpdateError) {
          console.error('Error updating user quota:', userUpdateError);
        }
      }
      
      // Update import status
      const { error: updateError } = await supabase
        .from('imports')
        .update({
          approved: true,
          inspected: true,
          pending: false,
          status: 'Approved',
          admin_name: adminInfo.name,
          admin_role: adminInfo.role || 'Administrator',
          admin_signature: signatureUrl,
          admin_signature_date: new Date().toISOString(),
          can_generate: true,
          download_ready: true
        })
        .eq('id', importId);
      
      if (updateError) throw updateError;
      
      // Send notification to importer
      await this.sendNotification({
        type: 'IMPORT_APPROVED',
        title: 'Import License Approved',
        message: `Your import #${importData.import_number} has been approved. License is ready for download.`,
        related_id: importId,
        related_type: 'import',
        target_user_id: importData.user_id,
        target_role: null
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error approving import:', error);
      throw error;
    }
  },
  
  /**
   * Admin: Reject import
   */
  async rejectImport(importId, adminInfo, reason) {
    try {
      const { data: importData, error: fetchError } = await supabase
        .from('imports')
        .select('*')
        .eq('id', importId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { error: updateError } = await supabase
        .from('imports')
        .update({
          approved: false,
          pending: false,
          status: 'Rejected',
          rejection_reason: reason,
          rejected_by: adminInfo.name,
          rejected_at: new Date().toISOString()
        })
        .eq('id', importId);
      
      if (updateError) throw updateError;
      
      // Send notification to importer
      await this.sendNotification({
        type: 'IMPORT_REJECTED',
        title: 'Import License Rejected',
        message: `Your import #${importData.import_number} has been rejected. Reason: ${reason}`,
        related_id: importId,
        related_type: 'import',
        target_user_id: importData.user_id,
        target_role: null
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error rejecting import:', error);
      throw error;
    }
  },
  
  /**
   * Helper: Send notification
   */
  async sendNotification(notification) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          type: notification.type,
          title: notification.title,
          message: notification.message,
          target_user_id: notification.target_user_id,
          target_role: notification.target_role,
          related_id: notification.related_id,
          related_type: notification.related_type,
          read: false,
          metadata: notification.metadata || {}
        });
      
      if (error) {
        console.error('Error sending notification:', error);
        // Don't throw - notification failure shouldn't break the main operation
      }
      
      return { success: !error };
    } catch (error) {
      console.error('Error in sendNotification:', error);
      return { success: false };
    }
  },
  
  /**
   * Calculate CO2 equivalent for import items
   */
  async calculateCO2Equivalent(items) {
    try {
      let totalCO2 = 0;
      
      for (const item of items) {
        // Get refrigerant GWP value
        const { data: refrigerant } = await supabase
          .from('refrigerants')
          .select('gwp_value')
          .eq('ashrae', item.ashrae)
          .single();
        
        if (refrigerant) {
          const gwp = refrigerant.gwp_value || 0;
          const volume = parseFloat(item.volume) || 0;
          const quantity = parseInt(item.quantity) || 1;
          
          // Convert to kg if needed
          let volumeInKg = volume;
          switch (item.designation?.toLowerCase()) {
            case 'g':
              volumeInKg = volume / 1000;
              break;
            case 'lb':
              volumeInKg = volume * 0.453592;
              break;
            case 'oz':
              volumeInKg = volume * 0.0283495;
              break;
            case 'ton':
              volumeInKg = volume * 1000;
              break;
            default:
              volumeInKg = volume; // assume kg
          }
          
          const itemCO2 = volumeInKg * gwp * quantity;
          totalCO2 += itemCO2;
          
          // Set CO2 equivalent on item
          item.co2_equivalent = itemCO2.toFixed(2);
        }
      }
      
      return {
        items,
        totalCO2: totalCO2.toFixed(2)
      };
    } catch (error) {
      console.error('Error calculating CO2:', error);
      throw error;
    }
  }
};

export default ImportLicenseService;