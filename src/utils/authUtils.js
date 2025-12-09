// src/utils/authUtils.js

/**
 * Get user ID from Supabase user object
 * Supabase auth uses: user.id
 */
 export const getUserId = (user) => {
    if (!user) return null;
    return user.id || null;
  };
  
  /**
   * Check if user object is valid
   */
  export const isValidUser = (user) => {
    return user && user.id;
  };
  
  /**
   * Get user email
   */
  export const getUserEmail = (user) => {
    if (!user) return null;
    return user.email || null;
  };
  
  export default {
    getUserId,
    isValidUser,
    getUserEmail,
  };