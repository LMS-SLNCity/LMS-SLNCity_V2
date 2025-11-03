# B2B Balance Management System

## 📋 Overview

The B2B Balance Management System automatically tracks outstanding balances for B2B clients (referral labs, hospitals, etc.) throughout the entire workflow. The system uses **database triggers** to ensure balances are always accurate and reflected everywhere.

---

## 🔄 How It Works

### **Automatic Balance Updates**

The system uses PostgreSQL triggers to automatically:
1. **Increase balance** when a B2B visit is created with outstanding amount
2. **Adjust balance** when visit payments are updated
3. **Decrease balance** when payments are received
4. **Create ledger entries** for every transaction

### **Key Principle**

> **Client Balance = Total Outstanding Amount from All Visits**

The balance represents how much the B2B client owes you. It increases when they send patients (and don't pay immediately), and decreases when they make payments.

---

## 💡 Workflow Examples

### **Example 1: B2B Visit with Outstanding Amount**

**Scenario:** City Hospital sends a patient for tests worth ₹1,500. They will pay later.

**What Happens:**
1. Reception creates visit:
   - Patient: John Doe
   - Ref Customer: City Hospital (B2B client)
   - Total Cost: ₹1,500
   - Amount Paid: ₹0
   - Due Amount: ₹1,500

2. **Automatic Actions (via trigger):**
   - ✅ City Hospital balance increases by ₹1,500
   - ✅ DEBIT ledger entry created: "Visit V001 - Outstanding amount"
   - ✅ Audit log created: "CREATE_VISIT"

**Result:**
- City Hospital balance: ₹1,500 (they owe you)
- Ledger shows: DEBIT ₹1,500

---

### **Example 2: Partial Payment on Visit**

**Scenario:** City Hospital pays ₹500 towards the ₹1,500 visit.

**What Happens:**
1. Reception updates visit payment:
   - Amount Paid: ₹500
   - Due Amount: ₹1,000 (was ₹1,500)

2. **Automatic Actions (via trigger):**
   - ✅ City Hospital balance decreases by ₹500 (from ₹1,500 to ₹1,000)
   - ✅ CREDIT ledger entry created: "Visit V001 - Payment received"
   - ✅ Audit log created: "UPDATE_VISIT"

**Result:**
- City Hospital balance: ₹1,000 (they still owe you)
- Ledger shows:
  - DEBIT ₹1,500 (original visit)
  - CREDIT ₹500 (payment)

---

### **Example 3: Direct Payment (Not Linked to Specific Visit)**

**Scenario:** City Hospital sends a check for ₹5,000 to pay off multiple visits.

**What Happens:**
1. Admin records payment via API:
   ```bash
   POST /api/clients/1/payment
   {
     "amount": 5000,
     "description": "Check #12345 - Monthly settlement"
   }
   ```

2. **Automatic Actions:**
   - ✅ City Hospital balance decreases by ₹5,000
   - ✅ CREDIT ledger entry created: "Check #12345 - Monthly settlement"
   - ✅ Audit log created: "B2B_PAYMENT_RECEIVED"

**Result:**
- City Hospital balance reduced by ₹5,000
- Ledger shows: CREDIT ₹5,000

---

### **Example 4: Full Settlement**

**Scenario:** City Hospital has ₹15,000 outstanding. They pay it all.

**What Happens:**
1. Admin settles balance via API:
   ```bash
   POST /api/clients/1/settle
   {
     "description": "Full payment received via bank transfer"
   }
   ```

2. **Automatic Actions:**
   - ✅ CREDIT ledger entry created for ₹15,000
   - ✅ City Hospital balance set to ₹0
   - ✅ Audit log created: "B2B_BALANCE_SETTLED"

**Result:**
- City Hospital balance: ₹0 (fully paid)
- Ledger shows: CREDIT ₹15,000 (settlement)

---

## 📊 Ledger Entry Types

| Type | Meaning | Effect on Balance |
|------|---------|-------------------|
| **DEBIT** | Client owes you money | Increases balance |
| **CREDIT** | Client paid you money | Decreases balance |

### **When DEBIT Entries Are Created**

1. **New B2B visit with outstanding amount**
   - Description: "Visit V001 - Outstanding amount"
   - Amount: Due amount from visit

2. **Visit cost increased or payment reduced**
   - Description: "Visit V001 - Balance adjustment (due increased)"
   - Amount: Increase in due amount

### **When CREDIT Entries Are Created**

1. **Payment received on visit**
   - Description: "Visit V001 - Payment received"
   - Amount: Payment amount

2. **Direct payment from client**
   - Description: Custom (e.g., "Check #12345")
   - Amount: Payment amount

3. **Balance settlement**
   - Description: "Full settlement of outstanding balance"
   - Amount: Entire outstanding balance

4. **Visit deleted/reversed**
   - Description: "Visit V001 - Deleted/Reversed"
   - Amount: Original due amount

---

## 🔍 Where Balance Is Reflected

The balance is automatically reflected in:

### **1. B2B Management UI**
- Client list shows current balance
- Color-coded: Red for outstanding, Green for zero

### **2. Visit List**
- Each visit shows associated B2B client and their balance
- Helps reception know client's payment status

### **3. Ledger Modal**
- Complete transaction history
- Running balance calculation
- Filter by date, type

### **4. Financial Reports**
- `/api/b2b-financial/summary` - All clients summary
- `/api/b2b-financial/client/:id/transactions` - Detailed transactions
- `/api/b2b-financial/client/:id/outstanding` - Unpaid visits

### **5. Invoices (PDF/Excel)**
- Current balance shown on invoice
- Outstanding visits listed
- Payment history included

---

## 🛠️ API Endpoints

### **Record Payment**
```bash
POST /api/clients/:id/payment
Content-Type: application/json

{
  "amount": 5000,
  "description": "Check #12345 - Monthly payment"
}
```

**Response:**
```json
{
  "ledgerEntry": {
    "id": 123,
    "client_id": 1,
    "type": "CREDIT",
    "amount": 5000,
    "description": "Check #12345 - Monthly payment",
    "created_at": "2025-11-03T20:30:00Z"
  },
  "newBalance": 10000
}
```

### **Settle Balance**
```bash
POST /api/clients/:id/settle
Content-Type: application/json

{
  "description": "Full payment via bank transfer"
}
```

**Response:**
```json
{
  "message": "Settlement completed for City Hospital",
  "previousBalance": 15000,
  "newBalance": 0,
  "settlementAmount": 15000
}
```

### **Get Ledger**
```bash
GET /api/clients/:id/ledger
```

**Response:**
```json
[
  {
    "id": 1,
    "type": "DEBIT",
    "amount": 1500,
    "description": "Visit V001 - Outstanding amount",
    "created_at": "2025-11-01T10:00:00Z",
    "visit_id": 123
  },
  {
    "id": 2,
    "type": "CREDIT",
    "amount": 500,
    "description": "Visit V001 - Payment received",
    "created_at": "2025-11-02T14:00:00Z",
    "visit_id": 123
  }
]
```

---

## 🔐 Database Triggers

### **Trigger 1: `trigger_update_client_balance_on_visit`**

**Fires on:** INSERT or UPDATE of visits table

**What it does:**
- When a B2B visit is created with `due_amount > 0`:
  - Creates DEBIT ledger entry
  - Increases client balance
- When visit payment is updated:
  - Calculates balance change
  - Creates DEBIT or CREDIT ledger entry
  - Adjusts client balance

### **Trigger 2: `trigger_reverse_client_balance_on_visit_delete`**

**Fires on:** DELETE of visits table

**What it does:**
- When a B2B visit is deleted:
  - Creates CREDIT ledger entry to reverse
  - Decreases client balance

---

## 📈 Balance Reconciliation

Use the `b2b_balance_reconciliation` view to verify balances:

```sql
SELECT * FROM b2b_balance_reconciliation;
```

**Columns:**
- `current_balance` - Balance in clients table
- `total_debits` - Sum of all DEBIT entries
- `total_credits` - Sum of all CREDIT entries
- `calculated_balance` - Debits - Credits
- `total_outstanding_from_visits` - Sum of due_amount from all visits
- `balance_discrepancy` - Difference (should be 0)

---

## ✅ Audit Trail

Every B2B transaction is logged:

| Action | Logged As | Details |
|--------|-----------|---------|
| Visit created | CREATE_VISIT | Visit code, patient, cost, due amount |
| Visit payment updated | UPDATE_VISIT | Old/new payment amounts |
| Payment received | B2B_PAYMENT_RECEIVED | Amount, description, balance change |
| Balance settled | B2B_BALANCE_SETTLED | Settlement amount, description |

**View audit logs:**
```bash
GET /api/audit-logs?resource=client&resource_id=1
```

---

## 🎯 Best Practices

### **For Reception Staff**

1. **Creating B2B Visits:**
   - Always select the correct B2B client from dropdown
   - Enter accurate payment amount
   - System will automatically track outstanding

2. **Recording Payments:**
   - Use "Record Payment" button in B2B Management
   - Add clear description (check number, transfer reference)
   - Verify balance updates immediately

### **For Admin**

1. **Monthly Reconciliation:**
   - Review B2B financial summary
   - Check outstanding visits
   - Generate invoices for clients
   - Record payments received

2. **Settlement:**
   - Use "Settle Balance" only when fully paid
   - Add description explaining payment method
   - Export invoice for records

3. **Monitoring:**
   - Check `b2b_balance_reconciliation` view regularly
   - Ensure `balance_discrepancy` is always 0
   - Review audit logs for any issues

---

## 🚨 Troubleshooting

### **Balance doesn't match ledger**

**Solution:**
```sql
-- Check reconciliation view
SELECT * FROM b2b_balance_reconciliation WHERE client_id = 1;

-- If discrepancy exists, recalculate:
UPDATE clients
SET balance = (
  SELECT COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE -amount END), 0)
  FROM ledger_entries
  WHERE client_id = 1
)
WHERE id = 1;
```

### **Trigger not firing**

**Check trigger status:**
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%client_balance%';
```

**Re-run migration:**
```bash
psql -U lms_user -d lms_slncity -f server/db/migrations/003_b2b_balance_automation.sql
```

---

## 📝 Summary

✅ **Automatic Balance Tracking** - No manual calculations needed  
✅ **Complete Audit Trail** - Every transaction logged  
✅ **Reflected Everywhere** - UI, reports, invoices all show same balance  
✅ **Ledger Entries** - Complete transaction history  
✅ **Database Triggers** - Ensures data consistency  
✅ **NABL Compliant** - Permanent audit logs  

**The system is foolproof and production-ready!** 🎉

