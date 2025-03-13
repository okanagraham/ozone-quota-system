// src/services/registration/registrationService.js
import { db } from '../firebase/firebaseConfig';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp,
  limit 
} from 'firebase/firestore';

/**
 * Service for managing registrations
 */
export const RegistrationService = {
  /**
   * Check registration period status
   * @returns {Object} - Registration period information
   */
  checkRegistrationPeriodStatus() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    
    // Registration period is December 1-31
    const isDecember = currentMonth === 11;
    const isRegistrationOpen = isDecember;
    
    // Calculate days until registration opens/closes
    let daysUntilOpen = 0;
    let daysUntilClose = 0;
    
    if (!isDecember) {
      // Calculate days until December 1
      const decFirst = new Date(currentYear, 11, 1);
      daysUntilOpen = Math.ceil((decFirst - now) / (1000 * 60 * 60 * 24));
    } else {
      // Calculate days until December 31
      const decLast = new Date(currentYear, 11, 31);
      daysUntilClose = Math.ceil((decLast - now) / (1000 * 60 * 60 * 24)) + 1;
    }
    
    // Determine if we should show notification (November or December)
    const showNotification = currentMonth >= 10;
    
    // Set upcoming year for registration
    const registrationYear = isDecember ? currentYear + 1 : currentYear;
    
    return {
      isOpen: isRegistrationOpen,
      registrationYear,
      daysUntilOpen,
      daysUntilClose,
      showNotification
    };
  },
  
  /**
   * Get registration status
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Registration status
   */
  async getRegistrationStatus(userId) {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // Check for current year registration
      const registrationsRef = collection(db, 'registrations');
      const q = query(
        registrationsRef,
        where('user', '==', userId),
        where('year', '==', currentYear.toString()),
        where('completed', '==', true),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return {
          isRegistered: false,
          expiryDays: 0,
          registration: null
        };
      }
      
      // Get registration data
      const registrationDoc = querySnapshot.docs[0];
      const registration = {
        id: registrationDoc.id,
        ...registrationDoc.data()
      };
      
      // Calculate days until expiry
      const yearEnd = new Date(currentYear, 11, 31);
      const daysUntilExpiry = Math.ceil((yearEnd - now) / (1000 * 60 * 60 * 24));
      
      return {
        isRegistered: true,
        expiryDays: daysUntilExpiry,
        registration
      };
    } catch (error) {
      console.error('Error getting registration status:', error);
      throw error;
    }
  },
  
  /**
   * Get approved refrigerants for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - List of approved refrigerants
   */
  async getApprovedRefrigerants(userId) {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      
      // Get current registration
      const registrationsRef = collection(db, 'registrations');
      const q = query(
        registrationsRef,
        where('user', '==', userId),
        where('year', '==', currentYear.toString()),
        where('completed', '==', true),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return [];
      }
      
      // Get registration data
      const registration = querySnapshot.docs[0].data();
      
      // Return approved refrigerants
      return registration.refrigerants || [];
    } catch (error) {
      console.error('Error getting approved refrigerants:', error);
      throw error;
    }
  },
  
  /**
   * Submit new registration
   * @param {string} userId - User ID
   * @param {Object} registrationData - Registration data
   * @returns {Promise<string>} - New registration ID
   */
  async submitRegistration(userId, registrationData) {
    try {
      // Check if registration period is open
      const periodStatus = this.checkRegistrationPeriodStatus();
      
      if (!periodStatus.isOpen) {
        throw new Error('Registration period is not currently open.');
      }
      
      // Get user data
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      
      // Check for existing registration for upcoming year
      const existingRegistrationsQuery = query(
        collection(db, 'registrations'),
        where('user', '==', userId),
        where('year', '==', periodStatus.registrationYear.toString())
      );
      
      const existingRegistrations = await getDocs(existingRegistrationsQuery);
      
      if (!existingRegistrations.empty) {
        throw new Error('You already have a registration for the upcoming year.');
      }
      
      // Create registration document
      const newRegistration = {
        user: userId,
        name: userData.enterprise_name || '',
        business_address: userData.business_address || '',
        business_location: userData.business_location || '',
        refrigerants: registrationData.refrigerants || [],
        retail: registrationData.retail || false,
        year: periodStatus.registrationYear.toString(),
        date: serverTimestamp(),
        last_modified: serverTimestamp(),
        completed: false,
        paid: false,
        receipt_uploaded: false,
        status: 'Awaiting Approval',
        imports_under_license: [],
        cert_no: userData.importer_number || 0,
        next_importer_number: 0
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'registrations'), newRegistration);
      
      return docRef.id;
    } catch (error) {
      console.error('Error submitting registration:', error);
      throw error;
    }
  },
  
  /**
   * Get all refrigerants
   * @returns {Promise<Array>} - List of all refrigerants
   */
  async getAllRefrigerants() {
    try {
      const refrigerantsRef = collection(db, 'refrigerants');
      const querySnapshot = await getDocs(refrigerantsRef);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting refrigerants:', error);
      throw error;
    }
  },
  
  /**
   * Get active registration for user
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - Active registration or null
   */
  async getActiveRegistration(userId) {
    try {
      const { isRegistered, registration } = await this.getRegistrationStatus(userId);
      
      if (!isRegistered) {
        return null;
      }
      
      return registration;
    } catch (error) {
      console.error('Error getting active registration:', error);
      throw error;
    }
  }
};

export default RegistrationService;