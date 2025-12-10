// Migration Fix Script
// Re-runs registrations migration and re-links imports
// Run with: node fix-migration.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://uhemnscjoqjrqyawmsvk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZW1uc2Nqb3FqcnF5YXdtc3ZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU0MjEzNiwiZXhwIjoyMDc5MTE4MTM2fQ.p7jkx5IiwDvD0UUCiRKFuwf_JXTr52qBgEC_PhwkXlA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const FIREBASE_REGISTRATIONS_FILE = './firebase-registrations.json';
const FIREBASE_IMPORTS_FILE = './firebase-imports.json';

// Maps
const firebaseToSupabaseUser = new Map(); // firebase_uid -> supabase user id
const firebaseToSupabaseReg = new Map();  // firebase reg id -> supabase reg id

async function loadJsonFile(filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data);
}

// Step 1: Build user mapping from existing Supabase users
async function buildUserMapping() {
  console.log('\n========== BUILDING USER MAPPING ==========');
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, firebase_uid, email');
  
  if (error) throw error;
  
  for (const user of users) {
    if (user.firebase_uid) {
      firebaseToSupabaseUser.set(user.firebase_uid, user.id);
    }
  }
  
  console.log(`Mapped ${firebaseToSupabaseUser.size} users`);
}

// Step 2: Clear and re-migrate registrations
async function migrateRegistrations() {
  console.log('\n========== MIGRATING REGISTRATIONS ==========');
  
  // First, clear existing registrations (imports will have null registration_id)
  const { error: deleteError } = await supabase
    .from('registrations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (deleteError) {
    console.warn('Warning clearing registrations:', deleteError.message);
  }
  
  const regData = await loadJsonFile(FIREBASE_REGISTRATIONS_FILE);
  const registrations = regData.registrations || regData;
  
  console.log(`Found ${registrations.length} registrations to migrate`);
  
  let success = 0, failed = 0;
  
  for (const fbReg of registrations) {
    try {
      const supabaseUserId = firebaseToSupabaseUser.get(fbReg.user);
      
      if (!supabaseUserId) {
        console.warn(`  ⚠ No user mapping for: ${fbReg.user} (${fbReg.name})`);
        failed++;
        continue;
      }
      
      const registrationData = {
        user_id: supabaseUserId,
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
        date: fbReg.date ? new Date(fbReg.date).toISOString() : new Date().toISOString(),
        last_modified: fbReg.last_modified ? new Date(fbReg.last_modified).toISOString() : new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('registrations')
        .insert(registrationData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Store mapping
      firebaseToSupabaseReg.set(fbReg.id, data.id);
      console.log(`  ✓ ${fbReg.name} (${fbReg.year}) [${fbReg.id} -> ${data.id}]`);
      success++;
      
    } catch (err) {
      console.error(`  ✗ ${fbReg.id}: ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\nRegistrations: ${success} success, ${failed} failed`);
}

// Step 3: Re-link imports to users and registrations
async function relinkImports() {
  console.log('\n========== RE-LINKING IMPORTS ==========');
  
  const importsData = await loadJsonFile(FIREBASE_IMPORTS_FILE);
  const imports = importsData.imports || importsData;
  
  console.log(`Found ${imports.length} imports to re-link`);
  
  let success = 0, failed = 0;
  
  for (const fbImport of imports) {
    try {
      const supabaseUserId = firebaseToSupabaseUser.get(fbImport.user);
      
      if (!supabaseUserId) {
        console.warn(`  ⚠ No user mapping for import: ${fbImport.user}`);
        failed++;
        continue;
      }
      
      // Get registration ID
      let supabaseRegId = null;
      if (fbImport.registration?.path) {
        const firebaseRegId = fbImport.registration.path.split('/').pop();
        supabaseRegId = firebaseToSupabaseReg.get(firebaseRegId);
      }
      
      // Find existing import by import_number and year, or insert new
      const { data: existingImport } = await supabase
        .from('imports')
        .select('id')
        .eq('import_number', fbImport.import_number)
        .eq('import_year', fbImport.import_year)
        .single();
      
      if (existingImport) {
        // Update existing
        const { error } = await supabase
          .from('imports')
          .update({
            user_id: supabaseUserId,
            registration_id: supabaseRegId
          })
          .eq('id', existingImport.id);
        
        if (error) throw error;
        console.log(`  ✓ Updated Import #${fbImport.import_number} -> user:${supabaseUserId.slice(0,8)}... reg:${supabaseRegId?.slice(0,8) || 'null'}...`);
      } else {
        // Insert new (shouldn't happen if imports already migrated)
        console.log(`  ⚠ Import #${fbImport.import_number} not found, skipping`);
      }
      
      success++;
    } catch (err) {
      console.error(`  ✗ Import #${fbImport.import_number}: ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\nImports re-linked: ${success} success, ${failed} failed`);
}

// Step 4: Verify data integrity
async function verifyData() {
  console.log('\n========== VERIFICATION ==========');
  
  // Count records
  const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const { count: regCount } = await supabase.from('registrations').select('*', { count: 'exact', head: true });
  const { count: importCount } = await supabase.from('imports').select('*', { count: 'exact', head: true });
  
  console.log(`Users: ${userCount}`);
  console.log(`Registrations: ${regCount}`);
  console.log(`Imports: ${importCount}`);
  
  // Check for unlinked imports
  const { data: unlinkedImports } = await supabase
    .from('imports')
    .select('id, import_number, name')
    .is('user_id', null);
  
  if (unlinkedImports?.length > 0) {
    console.log(`\n⚠ ${unlinkedImports.length} imports have no user_id!`);
  }
  
  // Check for imports without registration
  const { data: noRegImports } = await supabase
    .from('imports')
    .select('id, import_number, name')
    .is('registration_id', null);
  
  console.log(`\nImports without registration_id: ${noRegImports?.length || 0}`);
  
  // Sample linked data
  const { data: sample } = await supabase
    .from('imports')
    .select(`
      import_number,
      name,
      user_id,
      users!inner(email, enterprise_name),
      registration_id
    `)
    .not('user_id', 'is', null)
    .limit(3);
  
  console.log('\nSample linked imports:');
  sample?.forEach(imp => {
    console.log(`  #${imp.import_number}: ${imp.users?.email} - Reg: ${imp.registration_id ? 'Yes' : 'No'}`);
  });
}

async function run() {
  console.log('====== MIGRATION FIX SCRIPT ======\n');
  
  await buildUserMapping();
  await migrateRegistrations();
  await relinkImports();
  await verifyData();
  
  console.log('\n====== COMPLETE ======');
}

run().catch(console.error);