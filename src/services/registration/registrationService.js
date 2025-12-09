// src/services/registration/registrationService.js
// ALL DATABASE OPERATIONS USE SUPABASE - NOT FIREBASE
import { supabase } from '../supabase/supabaseClient';
import { NotificationService } from '../notification/notificationService';

/**
 * Registration Service - Handles all registration operations
 * Uses Supabase for all database operations
 */
export const RegistrationService = {
  
  /**
   * Check registration period status
   * Registration is open in December for the following year
   */
  checkRegistrationPeriodStatus: () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Registration is open in December (month 11)
    const isOpen = currentMonth === 11;
    
    // Registration year is always the next calendar year when in December
    const registrationYear = (currentYear + (currentMonth === 11 ? 1 : 0)).toString();
    
    let daysUntilOpen = 0;
    let daysUntilClose = 0;
    
    if (isOpen) {
      const closeDate = new Date(currentYear, 11, 31);
      daysUntilClose = Math.ceil((closeDate - now) / (1000 * 60 * 60 * 24));
    } else {
      const openDate = new Date(currentYear, 11, 1);
      if (openDate < now) {
        daysUntilOpen = Math.ceil((new Date(currentYear + 1, 11, 1) - now) / (1000 * 60 * 60 * 24));
      } else {
        daysUntilOpen = Math.ceil((openDate - now) / (1000 * 60 * 60 * 24));
      }
    }
    
    return {
      isOpen,
      registrationYear,
      daysUntilOpen,
      daysUntilClose,
      showNotification: currentMonth >= 10 || currentMonth === 0
    };
  },
  
  /**
   * Get registration status for a user
   */
  async getRegistrationStatus(userId) {
    try {
      const currentYear = new Date().getFullYear().toString();
      
      // Query for completed registration for current year
      const { data: completedReg, error: completedError } = await supabase
        .from('registrations')
        .select('*')
        .eq('user_id', userId)
        .eq('year', currentYear)
        .eq('completed', true)
        .single();
      
      if (completedReg && !completedError) {
        const yearEnd = new Date(parseInt(currentYear), 11, 31);
        const now = new Date();
        const expiryDays = Math.max(0, Math.ceil((yearEnd - now) / (1000 * 60 * 60 * 24)));
        
        return {
          isRegistered: true,
          registration: completedReg,
          expiryDays
        };
      }
      
      // Check for pending registration
      const { data: pendingReg, error: pendingError } = await supabase
        .from('registrations')
        .select('*')
        .eq('user_id', userId)
        .eq('year', currentYear)
        .eq('completed', false)
        .single();
      
      if (pendingReg && !pendingError) {
        return {
          isRegistered: false,
          hasPending: true,
          pendingRegistration: pendingReg
        };
      }
      
      return {
        isRegistered: false,
        hasPending: false
      };
    } catch (error) {
      console.error('Error getting registration status:', error);
      throw error;
    }
  },
  
  /**
   * Get approved refrigerants for a user
   */
  async getApprovedRefrigerants(userId) {
    try {
      const currentYear = new Date().getFullYear().toString();
      
      const { data: registration, error } = await supabase
        .from('registrations')
        .select('refrigerants')
        .eq('user_id', userId)
        .eq('year', currentYear)
        .eq('completed', true)
        .single();
      
      if (error || !registration) {
        return [];
      }
      
      return registration.refrigerants || [];
    } catch (error) {
      console.error('Error getting approved refrigerants:', error);
      throw error;
    }
  },
  
  /**
   * Get all refrigerants from the database
   */
  async getAllRefrigerants() {
    try {
      const { data, error } = await supabase
        .from('refrigerants')
        .select('*')
        .order('ashrae');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting refrigerants:', error);
      throw error;
    }
  },
  
  /**
   * Submit a new registration
   */
  async submitRegistration(userId, registrationData) {
    try {
      const periodStatus = RegistrationService.checkRegistrationPeriodStatus();
      
      // Check for existing registration
      const existing = await RegistrationService.checkExistingRegistration(userId, periodStatus.registrationYear);
      if (existing) {
        throw new Error(`You already have a registration for ${periodStatus.registrationYear}`);
      }
      
      // Get user profile
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (userError) throw userError;
      
      // Create registration document
      const { data: newRegistration, error: insertError } = await supabase
        .from('registrations')
        .insert({
          user_id: userId,
          name: userProfile?.enterprise_name || userProfile?.display_name || '',
          year: periodStatus.registrationYear,
          refrigerants: registrationData.refrigerants || [],
          retail: registrationData.retail || false,
          completed: false,
          awaiting_admin_signature: true,
          status: 'Awaiting Approval',
          pending: true,
          cert_no: null,
          next_importer_number: 0
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Send notification to admin
      await NotificationService.notifyAdminNewRegistration(newRegistration, userProfile);
      
      return newRegistration;
    } catch (error) {
      console.error('Error submitting registration:', error);
      throw error;
    }
  },
  
  /**
   * Check for existing registration
   */
  async checkExistingRegistration(userId, year) {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('user_id', userId)
        .eq('year', year)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }
      
      return data || null;
    } catch (error) {
      console.error('Error checking existing registration:', error);
      throw error;
    }
  },
  
  /**
   * Admin: Approve registration
   */
  async approveRegistration(registrationId, adminInfo, signatureDataUrl, quotaAmount) {
    try {
      // Get registration
      const { data: registration, error: fetchError } = await supabase
        .from('registrations')
        .select('*')
        .eq('id', registrationId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Get next certificate number from settings
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('registration_cert_no_counter')
        .eq('id', 'global')
        .single();
      
      let certNo = 1001;
      if (!settingsError && settings) {
        certNo = (settings.registration_cert_no_counter || 1000) + 1;
        await supabase
          .from('settings')
          .update({ registration_cert_no_counter: certNo })
          .eq('id', 'global');
      } else {
        // Create settings if doesn't exist
        await supabase
          .from('settings')
          .insert({ id: 'global', registration_cert_no_counter: certNo });
      }
      
      // Upload admin signature
      let signatureUrl = null;
      if (signatureDataUrl) {
        const base64Data = signatureDataUrl.split(',')[1];
        const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const { error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(`registrations/${registrationId}_admin.png`, bytes, {
            contentType: 'image/png',
            upsert: true
          });
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('signatures')
            .getPublicUrl(`registrations/${registrationId}_admin.png`);
          signatureUrl = urlData.publicUrl;
        }
      }
      
      // Update registration
      const { error: updateRegError } = await supabase
        .from('registrations')
        .update({
          completed: true,
          awaiting_admin_signature: false,
          pending: false,
          status: 'complete',
          cert_no: certNo,
          admin_name: adminInfo.name,
          admin_role: adminInfo.role,
          admin_signature: signatureUrl,
          admin_signature_date: new Date().toISOString(),
          can_generate: true,
          download_ready: false
        })
        .eq('id', registrationId);
      
      if (updateRegError) throw updateRegError;
      
      // Update user with quota
      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          import_quota: quotaAmount || 0,
          balance_imports: quotaAmount || 0,
          cumulative_imports: 0,
          current_registration_id: registrationId
        })
        .eq('id', registration.user_id);
      
      if (updateUserError) throw updateUserError;
      
      // Send notification to importer
      await NotificationService.notifyImporterApproval({
        ...registration,
        cert_no: certNo
      }, 'registration');
      
      return { certNo, success: true };
    } catch (error) {
      console.error('Error approving registration:', error);
      throw error;
    }
  },
  
  /**
   * Get all registrations (for admin)
   */
  async getAllRegistrations(year = null) {
    try {
      let query = supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (year) {
        query = query.eq('year', year);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all registrations:', error);
      throw error;
    }
  }
};

// Named exports for backwards compatibility
export const { 
  checkRegistrationPeriodStatus,
  getRegistrationStatus,
  getApprovedRefrigerants,
  getAllRefrigerants,
  submitRegistration,
  checkExistingRegistration,
  approveRegistration,
  getAllRegistrations
} = RegistrationService;

export default RegistrationService;