// Test bcrypt performance on VM
const bcrypt = require('bcryptjs');

console.log('=== Testing bcryptjs on VM ===');
console.log('');

const password = 'admin123';
const testHash = '$2a$10$K7L1OJ45/4Y2nX6K7L1OJ.N8oqHZXvtqjMxdv7EQcZvXvwX9tZ9S2';

console.log('1. Testing hash generation...');
const startHash = Date.now();
const newHash = bcrypt.hashSync(password, 10);
const hashTime = Date.now() - startHash;
console.log(`   Generated hash in ${hashTime}ms`);
console.log(`   Hash: ${newHash}`);
console.log('');

console.log('2. Testing password comparison (sync)...');
const startCompareSync = Date.now();
const resultSync = bcrypt.compareSync(password, newHash);
const compareSyncTime = Date.now() - startCompareSync;
console.log(`   Compare result: ${resultSync}`);
console.log(`   Compare time: ${compareSyncTime}ms`);
console.log('');

console.log('3. Testing password comparison (async)...');
const startCompareAsync = Date.now();
bcrypt.compare(password, newHash)
  .then(result => {
    const compareAsyncTime = Date.now() - startCompareAsync;
    console.log(`   Compare result: ${result}`);
    console.log(`   Compare time: ${compareAsyncTime}ms`);
    console.log('');
    
    console.log('4. Testing with database hash...');
    const { Pool } = require('pg');
    const pool = new Pool({
      host: 'postgres',
      port: 5432,
      user: 'lms_user',
      password: 'lms_password',
      database: 'lms_slncity'
    });
    
    pool.query('SELECT password_hash FROM users WHERE username = $1', ['sudo'])
      .then(res => {
        if (res.rows.length === 0) {
          console.log('   ❌ User not found');
          process.exit(1);
        }
        
        const dbHash = res.rows[0].password_hash;
        console.log(`   Hash from DB: ${dbHash.substring(0, 30)}...`);
        console.log(`   Hash length: ${dbHash.length}`);
        console.log('');
        
        console.log('5. Comparing with DB hash...');
        const startDbCompare = Date.now();
        return bcrypt.compare(password, dbHash)
          .then(match => {
            const dbCompareTime = Date.now() - startDbCompare;
            console.log(`   Match result: ${match}`);
            console.log(`   Compare time: ${dbCompareTime}ms`);
            console.log('');
            
            if (match) {
              console.log('✅ SUCCESS! Password comparison works!');
            } else {
              console.log('❌ FAILED! Password does not match!');
            }
            
            pool.end();
            process.exit(match ? 0 : 1);
          });
      })
      .catch(err => {
        console.error('   ❌ Database error:', err.message);
        pool.end();
        process.exit(1);
      });
  })
  .catch(err => {
    console.error('   ❌ Async compare error:', err.message);
    process.exit(1);
  });

// Timeout after 30 seconds
setTimeout(() => {
  console.error('');
  console.error('❌ TIMEOUT! bcrypt.compare() took more than 30 seconds');
  console.error('This indicates a performance issue on the VM');
  process.exit(1);
}, 30000);

