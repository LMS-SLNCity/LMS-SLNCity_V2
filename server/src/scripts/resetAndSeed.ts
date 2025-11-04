import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetAndSeed() {
  console.log('============================================');
  console.log('🔄 RESETTING DATABASE WITH CLEAN SEED DATA');
  console.log('============================================\n');

  try {
    // Test database connection
    console.log('Step 1: Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Read the SQL file
    console.log('Step 2: Reading seed SQL file...');
    const sqlFilePath = path.join(__dirname, '../../db/clean-seed.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✅ SQL file loaded\n');

    // Execute the SQL
    console.log('Step 3: Executing seed script...');
    console.log('⚠️  This will DELETE ALL DATA!\n');

    await pool.query(sqlContent);

    console.log('\n============================================');
    console.log('✅ DATABASE RESET AND SEEDED SUCCESSFULLY!');
    console.log('============================================\n');

    console.log('📋 Login Credentials:');
    console.log('   Staff Users:');
    console.log('   - sudo / Password123');
    console.log('   - admin / Password123');
    console.log('   - reception / Password123\n');

    console.log('   B2B Clients:');
    console.log('   - City Diagnostic Center / Client123');
    console.log('   - Apollo Diagnostics / Client123');
    console.log('   - Max Healthcare / Client123\n');

    console.log('💰 Client Balances:');
    console.log('   - City Diagnostic Center: ₹625.00 (pending)');
    console.log('   - Apollo Diagnostics: ₹0.00 (fully paid)');
    console.log('   - Max Healthcare: ₹240.00 (pending)\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error occurred during seeding:', error);
    process.exit(1);
  }
}

resetAndSeed();

