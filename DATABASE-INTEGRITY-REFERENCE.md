# 🛡️ Database Integrity Reference - LMS SLNCity

**Purpose**: Document all data integrity measures to prevent data loss and corruption  
**Last Updated**: 2025-11-23

---

## 📋 Table of Contents

1. [Foreign Key Constraints](#foreign-key-constraints)
2. [Data Validation Constraints](#data-validation-constraints)
3. [Triggers and Automation](#triggers-and-automation)
4. [Transaction Safety](#transaction-safety)
5. [Audit Trail](#audit-trail)

---

## 🔗 Foreign Key Constraints

### **Purpose**: Maintain referential integrity and prevent orphaned records

### **CASCADE Deletions** (Child records deleted automatically)

| Parent Table | Child Table | Relationship | Behavior |
|--------------|-------------|--------------|----------|
| `clients` | `client_prices` | Client → Prices | ON DELETE CASCADE |
| `clients` | `ledger_entries` | Client → Ledger | ON DELETE CASCADE |
| `clients` | `b2b_client_logins` | Client → Login | ON DELETE CASCADE |
| `patients` | `visits` | Patient → Visits | ON DELETE CASCADE |
| `visits` | `visit_tests` | Visit → Tests | ON DELETE CASCADE |
| `visits` | `patient_report_access_logs` | Visit → Access Logs | ON DELETE CASCADE |
| `visits` | `patient_edit_requests` | Visit → Edit Requests | ON DELETE CASCADE |
| `visits` | `waivers` | Visit → Waivers | ON DELETE CASCADE |
| `visit_tests` | `result_rejections` | Test → Rejections | ON DELETE CASCADE |
| `users` | `user_permissions` | User → Permissions | ON DELETE CASCADE |
| `users` | `approvers` | User → Approver Role | ON DELETE CASCADE |
| `test_templates` | `client_prices` | Template → Prices | ON DELETE CASCADE |

**Impact**: Deleting a parent record automatically deletes all related child records

### **SET NULL Deletions** (Child records preserved, reference nullified)

| Parent Table | Child Table | Column | Behavior |
|--------------|-------------|--------|----------|
| `visits` | `ledger_entries` | `visit_id` | ON DELETE SET NULL |

**Impact**: Deleting a visit preserves ledger entries but sets `visit_id` to NULL

### **RESTRICT Deletions** (Implicit - deletion blocked if children exist)

| Parent Table | Child Table | Relationship |
|--------------|-------------|--------------|
| `test_templates` | `visit_tests` | Template → Tests |
| `referral_doctors` | `visits` | Doctor → Visits |
| `branches` | `visits` | Branch → Visits |
| `branches` | `users` | Branch → Users |

**Impact**: Cannot delete parent if child records exist (prevents accidental data loss)

---

## ✅ Data Validation Constraints

### **NOT NULL Constraints** (Required fields)

#### **Users Table**
- `username` - Must be unique and not null
- `password_hash` - Must not be null
- `role` - Must not be null

#### **Patients Table**
- `salutation`, `name`, `age_years`, `sex` - Must not be null
- `patient_code` - Auto-generated, unique

#### **Visits Table**
- `patient_id` - Must reference valid patient
- `registration_datetime` - Must not be null
- `visit_code` - Auto-generated, unique
- `total_cost`, `amount_paid`, `due_amount` - Must not be null

#### **Visit Tests Table**
- `visit_id`, `test_template_id` - Must not be null
- `status` - Must not be null, defaults to 'PENDING'

### **CHECK Constraints** (Value validation)

```sql
-- Users: Role validation
role CHECK (role IN ('SUDO', 'ADMIN', 'RECEPTION', 'PHLEBOTOMY', 'LAB', 'APPROVER'))

-- Test Templates: Report type validation
report_type CHECK (report_type IN ('standard', 'culture'))

-- Clients: Type validation
type CHECK (type IN ('PATIENT', 'REFERRAL_LAB', 'INTERNAL'))

-- Visit Tests: Status validation
status CHECK (status IN (
  'PENDING', 'SAMPLE_COLLECTED', 'REJECTED', 'CANCELLED', 
  'IN_PROGRESS', 'AWAITING_APPROVAL', 'APPROVED', 'PRINTED', 'COMPLETED'
))

-- Ledger Entries: Type validation
type CHECK (type IN ('DEBIT', 'CREDIT'))

-- Patient Edit Requests: Status validation
status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))

-- Result Rejections: Status validation
status CHECK (status IN ('PENDING_CORRECTION', 'CORRECTED', 'RESOLVED'))
```

### **UNIQUE Constraints** (Prevent duplicates)

```sql
-- Users
username UNIQUE

-- Test Templates
code UNIQUE

-- Patients
patient_code UNIQUE

-- Visits
visit_code UNIQUE

-- Client Prices
UNIQUE(client_id, test_template_id)  -- One price per client per test

-- User Permissions
UNIQUE(user_id, permission)  -- No duplicate permissions
```

---

## ⚙️ Triggers and Automation

### **Auto-Generated Codes**

#### **1. Patient Code Generation**
```sql
-- Trigger: patient_code_trigger
-- Format: P20251123001, P20251123002, etc.
-- Fires: BEFORE INSERT on patients table
```

#### **2. Visit Code Generation**
```sql
-- Trigger: visit_code_trigger
-- Format: V20251123001, V20251123002, etc.
-- Fires: BEFORE INSERT on visits table
```

### **Balance Management**

#### **3. Client Balance Update**
```sql
-- Trigger: update_client_balance_trigger
-- Purpose: Automatically update B2B client balance when visit is created/updated
-- Fires: AFTER INSERT OR UPDATE OF due_amount, amount_paid ON visits
-- Creates: Ledger entries (DEBIT/CREDIT)
```

**Example Flow**:
1. B2B visit created with `due_amount = 1000`
2. Trigger creates DEBIT ledger entry for 1000
3. Client balance increases by 1000
4. Payment received: `amount_paid = 500`, `due_amount = 500`
5. Trigger creates CREDIT ledger entry for 500
6. Client balance decreases by 500

#### **4. Balance Reversal on Deletion**
```sql
-- Trigger: reverse_client_balance_trigger
-- Purpose: Reverse balance when visit is deleted
-- Fires: BEFORE DELETE ON visits
-- Reverses: All ledger entries for the visit
```

### **Timestamp Management**

#### **5. Updated At Timestamp**
```sql
-- All tables have: updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- Automatically updated on record modification
```

---

## 🔒 Transaction Safety

### **Current Implementation**

All critical multi-step operations are wrapped in transactions:

```typescript
// Example: Visit creation with tests
const client = await pool.connect();
try {
  await client.query('BEGIN');
  
  // Step 1: Create visit
  const visitResult = await client.query(
    'INSERT INTO visits (...) VALUES (...) RETURNING id'
  );
  
  // Step 2: Create visit tests
  for (const test of tests) {
    await client.query(
      'INSERT INTO visit_tests (...) VALUES (...)',
      [visitResult.rows[0].id, ...]
    );
  }
  
  // Step 3: Update client balance (via trigger)
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

### **ACID Properties Guaranteed**

- **Atomicity**: All operations succeed or all fail
- **Consistency**: Database always in valid state
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed data persists even after crashes

---

## 📝 Audit Trail

### **Comprehensive Logging**

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,  -- CREATE, UPDATE, DELETE, LOGIN, etc.
    entity VARCHAR(100) NOT NULL,  -- users, visits, patients, etc.
    details TEXT NOT NULL,
    resource VARCHAR(255),
    resource_id INTEGER,
    old_value TEXT,  -- Before change
    new_value TEXT,  -- After change
    severity VARCHAR(20),  -- INFO, WARNING, ERROR, CRITICAL
    user_id INTEGER REFERENCES users(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **What Gets Logged**

✅ All user logins and logouts  
✅ All data creation (visits, patients, tests)  
✅ All data modifications (with old/new values)  
✅ All data deletions  
✅ Failed login attempts  
✅ Permission changes  
✅ Result approvals and rejections  
✅ Payment transactions  
✅ Report access (QR code, phone OTP)

### **Retention Policy**

- **Critical operations**: Permanent retention
- **Regular operations**: 1 year retention
- **Access logs**: 90 days retention

---

## 🚨 Data Loss Prevention Checklist

- [x] Foreign key constraints prevent orphaned records
- [x] CHECK constraints validate data before insertion
- [x] UNIQUE constraints prevent duplicates
- [x] NOT NULL constraints ensure required data
- [x] Triggers auto-generate codes (no manual errors)
- [x] Triggers maintain balance integrity
- [x] Transactions ensure atomic operations
- [x] Audit logs track all changes
- [x] Automated daily backups (see AUTOMATED-BACKUP-SETUP.md)
- [x] Backup verification scripts
- [x] Disaster recovery procedures documented

---

## 📚 Related Documentation

- [DATA-INTEGRITY-BACKUP-STRATEGY.md](./DATA-INTEGRITY-BACKUP-STRATEGY.md) - Overall strategy
- [AUTOMATED-BACKUP-SETUP.md](./AUTOMATED-BACKUP-SETUP.md) - Implementation guide
- [server/db/init.sql](./server/db/init.sql) - Complete schema definition

---

**🎯 Result**: Multi-layered protection against data loss and corruption

