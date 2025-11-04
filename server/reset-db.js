#!/usr/bin/env node

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetAndSeed() {
  console.log('============================================');
  console.log('🔄 RESETTING DATABASE WITH CLEAN SEED DATA');
  console.log('============================================\n');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lms_slncity',
  });

  try {
    // Connect to database
    console.log('Step 1: Connecting to database...');
    await client.connect();
    console.log('✅ Database connection successful\n');

    // Read the SQL file
    console.log('Step 2: Reading seed SQL file...');
    const sqlFilePath = path.join(__dirname, 'db/clean-seed.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✅ SQL file loaded\n');

    // Execute the SQL
    console.log('Step 3: Executing seed script...');
    console.log('⚠️  This will DELETE ALL DATA!\n');

    await client.query(sqlContent);

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

  } catch (error) {
    console.error('\n❌ Error occurred during seeding:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

resetAndSeed();

