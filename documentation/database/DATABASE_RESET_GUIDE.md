# Database Reset and Seed Guide

## Overview

This guide explains how to reset the database with clean, consistent seed data that ensures:
- ✅ Ledger entries always tally correctly
- ✅ B2B clients only see their own transactions
- ✅ Proper data isolation and security
- ✅ Realistic test data for development

## Why Reset the Database?

The current database has inconsistent data from testing that causes:
- ❌ B2B clients seeing ALL transactions (security issue)
- ❌ Ledger balances not matching calculated balances
- ❌ Orphaned ledger entries
- ❌ Visits without corresponding ledger entries

## What the Clean Seed Data Includes

### Users (Staff)
- `sudo` / `Password123` - Full system access
- `admin` / `Password123` - Administrative access
- `reception` / `Password123` - Reception desk
- `phlebo` / `Password123` - Phlebotomy
- `labtech` / `Password123` - Lab technician
- `approver` / `Password123` - Report approver

### B2B Clients
1. **Walk-in Patients** (ID: 1)
   - Type: PATIENT
   - Balance: ₹0.00
   - No login (used for direct patients)

2. **City Diagnostic Center** (ID: 2)
   - Type: REFERRAL_LAB
   - Login: `City Diagnostic Center` / `Client123`
   - Balance: ₹625.00 (pending)
   - 3 visits, 1 partial payment of ₹500

3. **Apollo Diagnostics** (ID: 3)
   - Type: REFERRAL_LAB
   - Login: `Apollo Diagnostics` / `Client123`
   - Balance: ₹0.00 (fully paid)
   - 2 visits, fully paid ₹680

4. **Max Healthcare** (ID: 4)
   - Type: REFERRAL_LAB
   - Login: `Max Healthcare` / `Client123`
   - Balance: ₹240.00 (pending)
   - 1 visit, no payment yet

### Test Data
- 8 test templates (CBC, LFT, KFT, Lipid Profile, etc.)
- 5 antibiotics
- 8 patients with realistic data
- 8 visits (2 walk-in, 6 B2B credit visits)
- All visit tests are APPROVED with results
- Ledger entries that perfectly tally with balances

## How to Reset the Database

### Method 1: Using Node.js Script (Recommended)

```bash
cd server
node reset-db.js
```

This script:
- Reads credentials from `server/.env`
- Connects to PostgreSQL
- Executes `server/db/clean-seed.sql`
- Shows success message with login credentials

### Method 2: Using psql Command Line

```bash
cd server/db
psql -h localhost -U lms_user -d lms_slncity -f clean-seed.sql
```

When prompted, enter password: `lms_password` (or check `server/.env`)

### Method 3: Using Bash Script

```bash
cd server/db
./reset-and-seed.sh
```

## Verifying the Reset

### 1. Check Backend Connection

```bash
curl http://localhost:5001/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### 2. Login as B2B Client

1. Go to: http://localhost:3000
2. Click "B2B Client Login"
3. Username: `City Diagnostic Center`
4. Password: `Client123`

### 3. Verify Transaction History

In the B2B Client Dashboard:
- You should see ONLY 3 transactions (all for City Diagnostic Center)
- Client ID column should show only ID `2` (in GREEN)
- Balance should show ₹625.00

### 4. Check Browser Console

Look for these logs:
```
📊 Fetching ledger for client: 2
✅ Ledger data received: 4 entries
✅ All entries verified for client: 2
```

### 5. Check Backend Console

Look for these logs:
```
📊 Fetching ledger for client_id: 2 (type: string)
✅ Found 4 ledger entries for client 2
📋 First entry: client_id=2, amount=270
```

## Ledger Validation API

### Validate Single Client

```bash
# Get auth token first
TOKEN="your_jwt_token_here"

# Validate client ledger
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5001/api/clients/2/validate-ledger
```

Response:
```json
{
  "isValid": true,
  "clientId": 2,
  "clientName": "City Diagnostic Center",
  "storedBalance": 625.00,
  "calculatedBalance": 625.00,
  "difference": 0.00,
  "totalDebits": 1125.00,
  "totalCredits": 500.00,
  "entryCount": 4,
  "warnings": []
}
```

### Validate All Clients (Admin Only)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5001/api/clients/validate-all-ledgers
```

## Ledger Calculation Logic

For each B2B client:

```
Balance = Total Debits - Total Credits

Where:
- DEBIT = Money owed by client (visit charges)
- CREDIT = Money received from client (payments)
```

### Example: City Diagnostic Center

```
Debits:
  Visit 1: ₹270.00
  Visit 2: ₹450.00
  Visit 3: ₹405.00
  Total Debits: ₹1,125.00

Credits:
  Payment 1: ₹500.00
  Total Credits: ₹500.00

Balance = ₹1,125.00 - ₹500.00 = ₹625.00 ✅
```

## Troubleshooting

### Error: "Cannot connect to database"

1. Check if PostgreSQL is running:
   ```bash
   ps aux | grep postgres
   ```

2. Check database credentials in `server/.env`:
   ```bash
   cat server/.env | grep DB_
   ```

3. Test connection manually:
   ```bash
   psql -h localhost -U lms_user -d lms_slncity -c "SELECT 1"
   ```

### Error: "Password authentication failed"

The password in `server/.env` might be different. Check:
```bash
cat server/.env | grep DB_PASSWORD
```

### Backend Not Starting

1. Check for syntax errors:
   ```bash
   cd server
   npm run dev
   ```

2. Look for import errors in the console

3. Make sure all dependencies are installed:
   ```bash
   cd server
   npm install
   ```

### Still Seeing All Transactions

1. **Clear browser cache and localStorage**:
   - Open DevTools (F12)
   - Application tab → Storage → Clear site data

2. **Restart backend server**:
   ```bash
   # Kill existing process
   ps aux | grep "node.*server" | grep -v grep | awk '{print $2}' | xargs kill
   
   # Start fresh
   cd server
   npm run dev
   ```

3. **Verify authentication middleware is applied**:
   - Check `server/src/routes/clients.ts` line 88
   - Should have: `router.get('/:id/ledger', authMiddleware, async ...`

## Security Features

After reset, the following security measures are in place:

1. ✅ **Authentication Required**: All ledger endpoints require valid JWT token
2. ✅ **Authorization Check**: B2B clients can only access their own data
3. ✅ **Data Isolation**: SQL queries filter by `client_id`
4. ✅ **Client-side Verification**: Frontend checks for unauthorized data
5. ✅ **Audit Logging**: All access attempts are logged
6. ✅ **Visual Indicators**: Color-coded Client IDs (green=own, red=other)

## Next Steps After Reset

1. ✅ Test B2B client login and verify data isolation
2. ✅ Test staff login and verify full access
3. ✅ Create new visits and verify ledger updates
4. ✅ Test payment recording and balance updates
5. ✅ Run ledger validation to ensure consistency
6. ✅ Test report printing for B2B clients

## Files Modified/Created

- `server/db/clean-seed.sql` - Clean seed data with validation
- `server/db/reset-and-seed.sh` - Bash script for reset
- `server/reset-db.js` - Node.js script for reset
- `server/src/utils/ledgerValidator.ts` - Ledger validation utility
- `server/src/routes/clients.ts` - Added validation endpoints
- `server/src/scripts/resetAndSeed.ts` - TypeScript reset script

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review backend console logs
3. Review browser console logs
4. Check database connection settings in `server/.env`

