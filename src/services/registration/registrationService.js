// src/services/registrationService.js
// src/services/registration/registrationService.js
import { db, storage } from '../firebase/firebaseConfig';
import { collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { getCurrentUser } from '../authService/authService';
import { generateRegistrationNumber } from '../utils/registrationUtils';

/**
 * Registration Service - Handles registration operations
 */
const RegistrationService = {
  /**
   * Check if registration is currently allowed (December only)
   * @returns {boolean} Whether registration is currently allowed
   */
  isRegistrationOpen: () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-indexed, 11 = December
    
    // Only allow registrations in December
    return currentMonth === 11;
  },

  /**
   * Get the year for which registration is currently open
   * @returns {string} The year for registration (next calendar year)
   */
  getRegistrationYear: () => {
    const currentDate = new Date();
    return (currentDate.getFullYear() + 1).toString();
  },

  /**
   * Submit a new registration application
   * @param {Object} registrationData - Registration form data
   * @returns {Promise<Object>} Created registration document
   */
  submitRegistration: async (registrationData) => {
    try {
      const user = getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      // Get next year for registration
      const registrationYear = RegistrationService.getRegistrationYear();
      
      // Check if user already has a registration for the upcoming year
      const existingReg = await RegistrationService.checkExistingRegistration(user.uid, registrationYear);
      if (existingReg) {
        throw new Error(`You already have a registration application for ${registrationYear}`);
      }
      
      // Generate registration ID
      const registrationId = doc(collection(db, 'registrations')).id;
      
      // Create registration document
      const registrationDoc = {
        id: registrationId,
        user: user.uid,
        name: registrationData.enterprise_name || user.enterprise_name,
        date: new Date(),
        year: registrationYear,
        refrigerants: registrationData.refrigerants || [],
        retail: registrationData.retail || false,
        receipt_uploaded: registrationData.receipt_uploaded || false,
        paid: registrationData.paid || false,
        last_modified: new Date(),
        completed: false,
        awaiting_admin_signature: false,
        status: 'Awaiting Approval',
        // Add cert_no and next_importer_number once approved
      };
      
      // Save to Firestore
      await setDoc(doc(db, 'registrations', registrationId), registrationDoc);
      
      // Update user document with registration reference
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const registrations = userData.registrations || [];
        
        // Add new registration reference
        await updateDoc(userRef, {
          registrations: [...registrations, doc(db, 'registrations', registrationId)]
        });
      }
      
      return registrationDoc;
    } catch (error) {
      console.error('Error submitting registration:', error);
      throw error;
    }
  },

  /**
   * Check if user already has a registration for specified year
   * @param {string} userId - User ID
   * @param {string} year - Registration year to check
   * @returns {Promise<Object|null>} Existing registration or null
   */
  checkExistingRegistration: async (userId, year) => {
    try {
      const registrationsRef = collection(db, 'registrations');
      const q = query(registrationsRef, where('user', '==', userId), where('year', '==', year));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error checking existing registration:', error);
      throw error;
    }
  },

  /**
   * Get user's current active registration
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Active registration or null
   */
  getCurrentActiveRegistration: async (userId) => {
    try {
      const currentYear = new Date().getFullYear().toString();
      
      // First check for a completed registration for the current year
      const registrationsRef = collection(db, 'registrations');
      const q = query(
        registrationsRef, 
        where('user', '==', userId), 
        where('year', '==', currentYear),
        where('completed', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting active registration:', error);
      throw error;
    }
  },

  /**
   * Upload signature for registration
   * @param {string} registrationId - Registration ID
   * @param {string} signatureDataUrl - Base64 signature data
   * @returns {Promise<string>} Signature URL
   */
  uploadRegistrationSignature: async (registrationId, signatureDataUrl) => {
    try {
      const signatureRef = ref(storage, `registration_signatures/${registrationId}.png`);
      await uploadString(signatureRef, signatureDataUrl, 'data_url');
      const signatureUrl = await getDownloadURL(signatureRef);
      
      // Update registration with signature URL
      await updateDoc(doc(db, 'registrations', registrationId), {
        signature_url: signatureUrl
      });
      
      return signatureUrl;
    } catch (error) {
      console.error('Error uploading signature:', error);
      throw error;
    }
  },

  /**
   * Admin approves registration
   * @param {string} registrationId - Registration ID
   * @param {Object} approvalData - Admin signature and approval data
   * @returns {Promise<void>}
   */
  approveRegistration: async (registrationId, approvalData) => {
    try {
      const registrationRef = doc(db, 'registrations', registrationId);
      const registrationSnap = await getDoc(registrationRef);
      
      if (!registrationSnap.exists()) {
        throw new Error('Registration not found');
      }
      
      const registrationData = registrationSnap.data();
      
      // Get next certificate number
      const settingsRef = doc(db, 'settings', '8ZCOe8dQhGajk4fog90q');
      const settingsSnap = await getDoc(settingsRef);
      const settings = settingsSnap.data();
      const certNo = settings.registration_cert_no_counter + 1;
      
      // Upload admin signature if provided
      let adminSignatureUrl = null;
      if (approvalData.signatureDataUrl) {
        const signatureRef = ref(storage, `registration_signatures/${registrationId}_admin.png`);
        await uploadString(signatureRef, approvalData.signatureDataUrl, 'data_url');
        adminSignatureUrl = await getDownloadURL(signatureRef);
      }
      
      // Update registration
      await updateDoc(registrationRef, {
        completed: true,
        admin_signature: adminSignatureUrl,
        admin_role: approvalData.admin_role || 'NOU Admin',
        admin_name: approvalData.admin_name,
        admin_signature_date: new Date(),
        cert_no: certNo,
        next_importer_number: 0,
        status: 'complete',
        can_generate: true
      });
      
      // Update settings with new counter
      await updateDoc(settingsRef, {
        registration_cert_no_counter: certNo
      });
      
      // Update user document to set this as current registration
      const userRef = doc(db, 'users', registrationData.user);
      await updateDoc(userRef, {
        current_registration: registrationRef
      });
      
      return { certNo };
    } catch (error) {
      console.error('Error approving registration:', error);
      throw error;
    }
  },

  /**
   * Get all registrations for the upcoming year
   * @returns {Promise<Array>} List of registrations
   */
  getUpcomingRegistrations: async () => {
    try {
      const upcomingYear = RegistrationService.getRegistrationYear();
      const registrationsRef = collection(db, 'registrations');
      const q = query(registrationsRef, where('year', '==', upcomingYear));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting upcoming registrations:', error);
      throw error;
    }
  }

  
};

//export default RegistrationService;

// Named exports for individual functions
export const { 
  isRegistrationOpen, 
  getRegistrationYear, 
  submitRegistration, 
  checkExistingRegistration, 
  getCurrentActiveRegistration, 
  uploadRegistrationSignature, 
  approveRegistration, 
  getUpcomingRegistrations 
} = RegistrationService;
