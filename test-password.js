const bcrypt = require('bcryptjs');

const password = 'password';
const hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

bcrypt.compare(password, hash, (err, result) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('Password "password" matches hash:', result);
});

// Also generate a new hash to verify
bcrypt.hash(password, 10, (err, newHash) => {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }
  console.log('New hash for "password":', newHash);
});

