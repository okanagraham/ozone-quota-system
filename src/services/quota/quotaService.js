// src/services/quota/quotaService.js
import { db } from '../firebase/firebaseConfig';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  runTransaction 
} from 'firebase/firestore';

/**
 * Service for managing importer quotas
 */
export const QuotaService = {
  /**
   * Get quota information for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - Quota information
   */
  async getQuotaInfo(userId) {
    try {
      // Get user document
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      
      // Calculate quota percentages
      const total = userData.import_quota || 0;
      const used = userData.cumulative_imports || 0;
      const remaining = userData.balance_imports || 0;
      const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
      
      return {
        total,
        used,
        remaining,
        percentage
      };
    } catch (error) {
      console.error('Error getting quota info:', error);
      throw error;
    }
  },
  
  /**
   * Calculate CO2 equivalent for an import item
   * @param {string} refrigerantId - Refrigerant ID or ASHRAE number
   * @param {number} volume - Volume amount
   * @param {string} designation - Unit designation (g, kg, lb, etc)
   * @param {number} quantity - Number of containers
   * @returns {Promise<number>} - CO2 equivalent value
   */
  async calculateCO2Equivalent(refrigerantId, volume, designation, quantity) {
    try {
      // Query for the refrigerant by ID or ASHRAE number
      const refrigerantsRef = collection(db, 'refrigerants');
      const q = query(refrigerantsRef, where('ashrae', '==', refrigerantId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error(`Refrigerant ${refrigerantId} not found`);
      }
      
      const refrigerantData = querySnapshot.docs[0].data();
      const gwpValue = refrigerantData.gwp_value || 0;
      
      // Convert volume to standardized unit (kg)
      const standardizedVolume = this.convertToStandardUnit(volume, designation);
      
      // Calculate CO2 equivalent
      const co2Equivalent = standardizedVolume * gwpValue * quantity;
      
      return parseFloat(co2Equivalent.toFixed(2));
    } catch (error) {
      console.error('Error calculating CO2 equivalent:', error);
      throw error;
    }
  },
  
  /**
   * Convert volume to standard unit (kg)
   * @param {number} volume - Original volume
   * @param {string} unit - Original unit
   * @returns {number} - Standardized volume in kg
   */
  convertToStandardUnit(volume, unit) {
    const numericVolume = parseFloat(volume);
    if (isNaN(numericVolume)) return 0;
    
    switch (unit.toLowerCase()) {
      case 'g':
        return numericVolume / 1000;
      case 'kg':
        return numericVolume;
      case 'lb':
        return numericVolume * 0.453592;
      case 'oz':
        return numericVolume * 0.0283495;
      case 'ton':
        return numericVolume * 1000;
      default:
        return numericVolume;
    }
  },
  
  /**
   * Check if an import will exceed quota
   * @param {string} userId - User ID
   * @param {Array} importItems - Array of import items
   * @returns {Promise<Object>} - Quota check result
   */
  async checkImportQuota(userId, importItems) {
    try {
      // Get user quota info
      const quotaInfo = await this.getQuotaInfo(userId);
      
      // Calculate total CO2 equivalent for this import
      let totalRequired = 0;
      
      for (const item of importItems) {
        if (item.ashrae && item.volume && item.designation && item.quantity) {
          const co2eq = await this.calculateCO2Equivalent(
            item.ashrae,
            item.volume,
            item.designation,
            item.quantity
          );
          
          totalRequired += co2eq;
        }
      }
      
      return {
        willExceedQuota: totalRequired > quotaInfo.remaining,
        importCO2: totalRequired,
        quotaRemaining: quotaInfo.remaining,
        deficit: totalRequired > quotaInfo.remaining ? (totalRequired - quotaInfo.remaining) : 0
      };
    } catch (error) {
      console.error('Error checking import quota:', error);
      throw error;
    }
  },
  
  /**
   * Update user quota after import approval
   * @param {string} userId - User ID
   * @param {string} importId - Import ID
   * @returns {Promise<void>}
   */
  async updateQuotaAfterApproval(userId, importId) {
    try {
      await runTransaction(db, async (transaction) => {
        // Get user and import docs
        const userRef = doc(db, 'users', userId);
        const importRef = doc(db, 'imports', importId);
        
        const userDoc = await transaction.get(userRef);
        const importDoc = await transaction.get(importRef);
        
        if (!userDoc.exists() || !importDoc.exists()) {
          throw new Error('User or import not found');
        }
        
        const userData = userDoc.data();
        const importData = importDoc.data();
        
        // Calculate total CO2 equivalent
        let totalCO2 = 0;
        
        for (const item of importData.imported_items || []) {
          totalCO2 += parseFloat(item.co2_equivalent) || 0;
        }
        
        // Update user's quota usage
        const currentUsed = userData.cumulative_imports || 0;
        const currentRemaining = userData.balance_imports || 0;
        
        // Update user document
        transaction.update(userRef, {
          cumulative_imports: currentUsed + totalCO2,
          balance_imports: currentRemaining - totalCO2
        });
        
        // Update import status
        transaction.update(importRef, {
          approved: true,
          status: 'Approved',
          can_generate: true
        });
      });
    } catch (error) {
      console.error('Error updating quota after approval:', error);
      throw error;
    }
  }
};

export default QuotaService;