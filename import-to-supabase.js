// Supabase Migration Script v3
// Migrates Firebase users, registrations, and imports to Supabase
// Uses EXISTING Supabase schema (user_id column, firebase_uid reference)
// Run with: node migrate-to-supabase.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuration
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://uhemnscjoqjrqyawmsvk.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZW1uc2Nqb3FqcnF5YXdtc3ZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU0MjEzNiwiZXhwIjoyMDc5MTE4MTM2fQ.p7jkx5IiwDvD0UUCiRKFuwf_JXTr52qBgEC_PhwkXlA';
const TEMP_PASSWORD = 'NOU_Temp_2025!'; // Users will need to reset
console.log(SUPABASE_URL)

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// File paths - adjust as needed
const FIREBASE_USERS_FILE = './firebase-users.json';
const FIREBASE_REGISTRATIONS_FILE = './firebase-registrations.json';
const FIREBASE_IMPORTS_FILE = './firebase-imports.json';
const FIREBASE_USERS_PROFILES_FILE = './firebase-users-profiles.json'; // Optional: if you have user profile data

// Track ID mappings (Firebase UID -> Supabase UUID)
const userIdMap = new Map();
const registrationIdMap = new Map();

async function loadJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

// ============================================
// STEP 1: Migrate Users
// ============================================
async function migrateUsers() {
  console.log('\n========== MIGRATING USERS ==========');
  
  const usersData = await loadJsonFile(FIREBASE_USERS_FILE);
  if (!usersData?.users) {
    console.error('No users found in export file');
    return;
  }

  const users = usersData.users;
  console.log(`Found ${users.length} users to migrate`);

  let successCount = 0;
  let errorCount = 0;

  for (const fbUser of users) {
    try {
      // Create auth user in Supabase
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: fbUser.email,
        password: TEMP_PASSWORD,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          firebase_uid: fbUser.localId,
          migrated_at: new Date().toISOString()
        }
      });

      if (authError) {
        // Check if user already exists
        if (authError.message.includes('already been registered')) {
          console.log(`  ⚠ User ${fbUser.email} already exists, fetching...`);
          
          // Get existing user by email
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(u => u.email === fbUser.email);
          
          if (existingUser) {
            userIdMap.set(fbUser.localId, existingUser.id);
            successCount++;
            continue;
          }
        }
        throw authError;
      }

      const supabaseUserId = authData.user.id;
      userIdMap.set(fbUser.localId, supabaseUserId);

      // Create user profile in users table (matching your existing schema)
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: supabaseUserId,
          firebase_uid: fbUser.localId, // Store Firebase UID for reference
          email: fbUser.email,
          role: 'importer', // Default role, will update for admins
          created_at: new Date(parseInt(fbUser.createdAt)).toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.warn(`  ⚠ Profile creation warning for ${fbUser.email}:`, profileError.message);
      }

      console.log(`  ✓ Migrated: ${fbUser.email}`);
      successCount++;

    } catch (error) {
      console.error(`  ✗ Failed: ${fbUser.email} - ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\nUsers Migration Complete: ${successCount} success, ${errorCount} errors`);
  console.log(`User ID mappings created: ${userIdMap.size}`);
}

// ============================================
// STEP 2: Migrate Registrations
// ============================================
async function migrateRegistrations() {
  console.log('\n========== MIGRATING REGISTRATIONS ==========');
  
  const regData = await loadJsonFile(FIREBASE_REGISTRATIONS_FILE);
  if (!regData?.registrations) {
    console.error('No registrations found in export file');
    return;
  }

  const registrations = regData.registrations;
  console.log(`Found ${registrations.length} registrations to migrate`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const fbReg of registrations) {
    try {
      // Get the Supabase user ID from our mapping
      const supabaseUserId = userIdMap.get(fbReg.user);
      
      if (!supabaseUserId) {
        console.warn(`  ⚠ Skipping registration ${fbReg.id} - no user mapping for ${fbReg.user}`);
        skippedCount++;
        continue;
      }

      // Transform registration data for Supabase
      const registrationData = {
        user_id: supabaseUserId,
        firebase_id: fbReg.id, // Keep for reference
        name: fbReg.name,
        year: fbReg.year,
        cert_no: fbReg.cert_no || null,
        status: fbReg.status || 'pending',
        completed: fbReg.completed || false,
        retail: fbReg.retail || false,
        paid: fbReg.paid || false,
        receipt_uploaded: fbReg.receipt_uploaded || false,
        awaiting_admin_signature: fbReg.awaiting_admin_signature || false,
        can_generate: fbReg.can_generate || false,
        generated: fbReg.generated || false,
        download_ready: fbReg.download_ready || false,
        next_importer_number: fbReg.next_importer_number || 0,
        admin_name: fbReg.admin_name || null,
        admin_role: fbReg.admin_role || null,
        admin_signature: fbReg.admin_signature || null,
        admin_signature_date: fbReg.admin_signature_date ? new Date(fbReg.admin_signature_date).toISOString() : null,
        refrigerants: fbReg.refrigerants || [],
        created_at: fbReg.date ? new Date(fbReg.date).toISOString() : new Date().toISOString(),
        updated_at: fbReg.last_modified ? new Date(fbReg.last_modified).toISOString() : new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('registrations')
        .insert(registrationData)
        .select()
        .single();

      if (error) throw error;

      // Store mapping for imports
      registrationIdMap.set(fbReg.id, data.id);

      console.log(`  ✓ Migrated: ${fbReg.name} (${fbReg.year}) - Cert #${fbReg.cert_no || 'N/A'}`);
      successCount++;

    } catch (error) {
      console.error(`  ✗ Failed: ${fbReg.id} - ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\nRegistrations Migration Complete: ${successCount} success, ${errorCount} errors, ${skippedCount} skipped`);
}

// ============================================
// STEP 3: Migrate Imports
// ============================================
async function migrateImports() {
  console.log('\n========== MIGRATING IMPORTS ==========');
  
  const importsData = await loadJsonFile(FIREBASE_IMPORTS_FILE);
  if (!importsData?.imports) {
    console.error('No imports found in export file');
    return;
  }

  const imports = importsData.imports;
  console.log(`Found ${imports.length} imports to migrate`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const fbImport of imports) {
    try {
      // Get the Supabase user ID from our mapping
      const supabaseUserId = userIdMap.get(fbImport.user);
      
      if (!supabaseUserId) {
        console.warn(`  ⚠ Skipping import ${fbImport.id} - no user mapping for ${fbImport.user}`);
        skippedCount++;
        continue;
      }

      // Get registration ID if it exists (handle document reference format)
      let supabaseRegId = null;
      if (fbImport.registration) {
        let firebaseRegId = null;
        
        // Handle Firebase reference format: { __type__: "reference", path: "registrations/ABC123" }
        if (typeof fbImport.registration === 'object' && fbImport.registration.path) {
          firebaseRegId = fbImport.registration.path.split('/').pop();
        }
        // Handle alternative format: { __datatype__: "documentReference", value: "registrations/ABC123" }
        else if (typeof fbImport.registration === 'object' && fbImport.registration.value) {
          firebaseRegId = fbImport.registration.value.split('/').pop();
        }
        // Handle direct string ID
        else if (typeof fbImport.registration === 'string') {
          firebaseRegId = fbImport.registration;
        }
        
        if (firebaseRegId) {
          supabaseRegId = registrationIdMap.get(firebaseRegId);
          if (!supabaseRegId) {
            console.warn(`    ⚠ Registration ${firebaseRegId} not found in mapping`);
          }
        }
      }

      // Transform import data for Supabase (matching your existing schema)
      const importData = {
        user_id: supabaseUserId,
        registration_id: supabaseRegId,
        name: fbImport.name,
        import_year: fbImport.import_year,
        import_number: fbImport.import_number || null,
        status: fbImport.status || 'pending',
        pending: fbImport.pending ?? true,
        approved: fbImport.approved || false,
        arrived: fbImport.arrived || false,
        inspected: fbImport.inspected || false,
        paid: fbImport.paid || false,
        invoice_uploaded: fbImport.invoice_uploaded || false,
        invoice_url: fbImport.invoice_url || null,
        download_ready: fbImport.download_ready || false,
        can_generate: fbImport.can_generate || false,
        admin_name: fbImport.admin_name || null,
        admin_role: fbImport.admin_role || null,
        admin_signature: fbImport.admin_signature || null,
        admin_signature_date: fbImport.admin_signature_date ? new Date(fbImport.admin_signature_date).toISOString() : null,
        inspection_date: fbImport.inspection_date ? new Date(fbImport.inspection_date).toISOString() : null,
        imported_items: fbImport.imported_items || [],
        // Voucher fields
        voucher_can_generate: fbImport.voucher_can_generate || false,
        voucher_download_ready: fbImport.voucher_download_ready || false,
        voucher_generated: fbImport.voucher_generated || false,
        submission_date: fbImport.submission_date ? new Date(fbImport.submission_date).toISOString() : new Date().toISOString(),
        created_at: fbImport.submission_date ? new Date(fbImport.submission_date).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('imports')
        .insert(importData);

      if (error) throw error;

      console.log(`  ✓ Migrated: Import #${fbImport.import_number || 'N/A'} - ${fbImport.name} (${fbImport.import_year})`);
      successCount++;

    } catch (error) {
      console.error(`  ✗ Failed: ${fbImport.id} - ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\nImports Migration Complete: ${successCount} success, ${errorCount} errors, ${skippedCount} skipped`);
}

// ============================================
// STEP 4: Update User Profiles from Registrations
// ============================================
async function updateUserProfiles() {
  console.log('\n========== UPDATING USER PROFILES ==========');
  
  // Get all registrations with user info
  const { data: registrations, error } = await supabase
    .from('registrations')
    .select('user_id, name, retail')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching registrations:', error.message);
    return;
  }

  // Group by user_id and take the most recent
  const userUpdates = new Map();
  for (const reg of registrations) {
    if (!userUpdates.has(reg.user_id)) {
      userUpdates.set(reg.user_id, {
        enterprise_name: reg.name,
        retail: reg.retail
      });
    }
  }

  let successCount = 0;
  for (const [userId, updates] of userUpdates) {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (!error) successCount++;
  }

  console.log(`Updated ${successCount} user profiles with enterprise info`);
}

// ============================================
// STEP 5: Set Admin Users
// ============================================
async function setAdminUsers() {
  console.log('\n========== SETTING ADMIN USERS ==========');
  
  // Known admin emails from your system
  const adminEmails = [
    'nousvg@gmail.com',
    'bquammie@gov.vc',
    'okanagraham@gmail.com', // Add your admin emails here
    'okana@connex.digital'
  ];

  const customsEmails = [
    'customs@sustainabledevelopment.com'
  ];

  for (const email of adminEmails) {
    const { error } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('email', email);

    if (!error) {
      console.log(`  ✓ Set admin role: ${email}`);
    }
  }

  for (const email of customsEmails) {
    const { error } = await supabase
      .from('users')
      .update({ role: 'customs' })
      .eq('email', email);

    if (!error) {
      console.log(`  ✓ Set customs role: ${email}`);
    }
  }
}

// ============================================
// MAIN MIGRATION FUNCTION
// ============================================
async function runMigration() {
  console.log('====================================================');
  console.log('  NOU Firebase to Supabase Migration');
  console.log('  Started at:', new Date().toISOString());
  console.log('====================================================');

  // Validate configuration
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY') {
    console.error('\n❌ Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables');
    console.log('\nUsage:');
    console.log('  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=xxx node migrate-to-supabase.js');
    process.exit(1);
  }

  try {
    // Run migration steps in order
    await migrateUsers();
    await migrateRegistrations();
    await migrateImports();
    await updateUserProfiles();
    await setAdminUsers();

    console.log('\n====================================================');
    console.log('  Migration Complete!');
    console.log('  Finished at:', new Date().toISOString());
    console.log('====================================================');
    
    console.log('\n📋 NEXT STEPS:');
    console.log(`1. All users have temporary password: ${TEMP_PASSWORD}`);
    console.log('2. Users should use "Forgot Password" to set their own passwords');
    console.log('3. Review any skipped records in the logs above');
    console.log('4. Test login with a few accounts before going live');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();