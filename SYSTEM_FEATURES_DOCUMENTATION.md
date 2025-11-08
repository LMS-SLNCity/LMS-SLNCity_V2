# 🏥 LMS SLNCity - Complete System Features Documentation

**Sri Lakshmi Narasimha City Diagnostic Center**  
**Laboratory Management System - Full Feature Set**

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Database Models](#database-models)
4. [Core Features](#core-features)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Workflow Modules](#workflow-modules)
7. [Security Features](#security-features)
8. [Reporting & Analytics](#reporting--analytics)
9. [API Endpoints](#api-endpoints)

---

## 🎯 System Overview

**LMS SLNCity** is a comprehensive Laboratory Management System designed for diagnostic centers to manage the complete workflow from patient registration to report generation and delivery.

### Key Highlights
- ✅ **Complete Patient Workflow** - Registration → Sample Collection → Testing → Approval → Report Delivery
- ✅ **B2B Client Management** - Corporate clients, credit management, invoicing
- ✅ **NABL-Compliant Audit Logging** - 90-day login logs, permanent action logs
- ✅ **Role-Based Access Control** - 6 roles with customizable permissions
- ✅ **Digital Signatures** - Approver signatures on reports
- ✅ **QR Code Reports** - Secure patient report access
- ✅ **Multi-Department Support** - Biochemistry, Hematology, Microbiology, etc.
- ✅ **Real-time Dashboard** - Analytics and performance metrics

---

## 💻 Technology Stack

### Frontend
- **Framework**: React 19.2.0
- **Language**: TypeScript 5.8.2
- **Build Tool**: Vite 6.4.1
- **Styling**: Tailwind CSS 3.4.17
- **State Management**: React Context API
- **UI Components**: Custom components with Headless UI
- **Icons**: Lucide React
- **PDF Generation**: jsPDF, html2canvas
- **QR Codes**: qrcode.react

### Backend
- **Runtime**: Node.js 18.20.8
- **Framework**: Express.js
- **Language**: TypeScript
- **Process Manager**: tsx (for running TS files)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Security**: helmet, express-rate-limit
- **CORS**: cors middleware

### Database
- **Database**: PostgreSQL 17 (local) / 16-alpine (Docker)
- **Connection**: node-postgres (pg)
- **Migrations**: SQL migration files
- **Triggers**: Automatic balance tracking, permission assignment

### DevOps
- **Containerization**: Podman / Docker
- **Version Control**: Git + GitHub
- **Testing**: Jest, Playwright, Supertest
- **Node Version Management**: nvm

---

## 🗄️ Database Models

### 1. **Users**
Stores system users (staff members).

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('SUDO', 'ADMIN', 'RECEPTION', 'PHLEBOTOMY', 'LAB', 'APPROVER')),
    is_active BOOLEAN DEFAULT true,
    signature_image_url VARCHAR(500),
    branch_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Fields**:
- `role`: User's primary role (SUDO, ADMIN, RECEPTION, PHLEBOTOMY, LAB, APPROVER)
- `signature_image_url`: Path to digital signature image for approvers
- `is_active`: Account status (active/disabled)

---

### 2. **User Permissions**
Stores custom permissions for individual users.

```sql
CREATE TABLE user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, permission)
);
```

**Available Permissions**:
- `VIEW_RECEPTION`, `CREATE_VISIT`, `COLLECT_DUE_PAYMENT`
- `VIEW_PHLEBOTOMY`, `COLLECT_SAMPLE`
- `VIEW_LAB`, `ENTER_RESULTS`
- `VIEW_APPROVER`, `APPROVE_RESULTS`
- `VIEW_ADMIN_PANEL`, `MANAGE_USERS`, `MANAGE_ROLES`
- `MANAGE_TESTS`, `MANAGE_PRICES`, `MANAGE_B2B`, `MANAGE_ANTIBIOTICS`
- `EDIT_APPROVED_REPORT`, `VIEW_AUDIT_LOG`

---

### 3. **Patients**
Stores patient demographic information.

```sql
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    salutation VARCHAR(10),
    name VARCHAR(255) NOT NULL,
    age_years INTEGER,
    age_months INTEGER,
    age_days INTEGER,
    sex VARCHAR(10) CHECK (sex IN ('Male', 'Female', 'Other')),
    phone VARCHAR(20),
    address TEXT,
    email VARCHAR(255),
    clinical_history TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Features**:
- Flexible age input (years, months, days)
- Optional phone and email (not all patients provide)
- Clinical history for context

---

### 4. **Visits**
Represents a patient visit/registration.

```sql
CREATE TABLE visits (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    referred_doctor_id INTEGER REFERENCES referral_doctors(id),
    ref_customer_id INTEGER REFERENCES clients(id),
    other_ref_doctor VARCHAR(255),
    other_ref_customer VARCHAR(255),
    registration_datetime TIMESTAMP,
    visit_code VARCHAR(50) UNIQUE NOT NULL,
    total_cost DECIMAL(12, 2) NOT NULL,
    amount_paid DECIMAL(12, 2) NOT NULL,
    payment_mode VARCHAR(50),
    due_amount DECIMAL(12, 2) NOT NULL,
    branch_id INTEGER REFERENCES branches(id),
    qr_code_token VARCHAR(500),
    qr_code_generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features**:
- Unique `visit_code` for tracking
- Referral tracking (doctor or B2B client)
- Payment tracking (total, paid, due)
- QR code for secure report access

---

### 5. **Test Templates**
Defines available tests and their parameters.

```sql
CREATE TABLE test_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100),
    sample_type VARCHAR(100),
    test_type VARCHAR(50) CHECK (test_type IN ('SINGLE_VALUE', 'MULTI_PARAMETER', 'CULTURE')),
    parameters JSONB,
    normal_ranges JSONB,
    units JSONB,
    method VARCHAR(255),
    tat_hours INTEGER,
    price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Test Types**:
1. **SINGLE_VALUE**: Single result (e.g., Hemoglobin)
2. **MULTI_PARAMETER**: Multiple parameters (e.g., Lipid Profile)
3. **CULTURE**: Microbiology culture tests with antibiotic sensitivity

**Example Parameters**:
```json
{
  "parameters": ["Hemoglobin", "RBC Count", "WBC Count"],
  "normal_ranges": {
    "Hemoglobin": "13-17 g/dL (Male), 12-15 g/dL (Female)",
    "RBC Count": "4.5-5.5 million/μL"
  },
  "units": {
    "Hemoglobin": "g/dL",
    "RBC Count": "million/μL"
  }
}
```

---

### 6. **Visit Tests**
Links tests to visits and tracks their status.

```sql
CREATE TABLE visit_tests (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    test_template_id INTEGER NOT NULL REFERENCES test_templates(id),
    status VARCHAR(50) CHECK (status IN ('PENDING', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED')),
    specimen_type VARCHAR(100),
    collected_by VARCHAR(255),
    collected_at TIMESTAMP,
    results JSONB,
    culture_result JSONB,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,
    rejection_count INTEGER DEFAULT 0,
    last_rejection_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Status Flow**:
```
PENDING → IN_PROGRESS → AWAITING_APPROVAL → APPROVED
                              ↓
                          REJECTED → IN_PROGRESS (correction)
```

**Results Storage** (JSONB):
```json
{
  "Hemoglobin": "14.5",
  "RBC Count": "4.8",
  "WBC Count": "7200"
}
```

**Culture Results** (JSONB):
```json
{
  "organism": "E. coli",
  "colony_count": "10^5 CFU/mL",
  "sensitivity": {
    "Amoxicillin": "Resistant",
    "Ciprofloxacin": "Sensitive",
    "Ceftriaxone": "Intermediate"
  }
}
```

---

### 7. **Clients (B2B)**
Corporate clients with credit facilities.

```sql
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('HOSPITAL', 'CLINIC', 'CORPORATE', 'INSURANCE', 'GOVERNMENT', 'OTHER')),
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    credit_limit DECIMAL(12, 2) DEFAULT 0,
    credit_period_days INTEGER DEFAULT 30,
    balance DECIMAL(12, 2) DEFAULT 0,
    username VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Features**:
- Credit limit and period management
- Automatic balance tracking via triggers
- Client portal login credentials
- Multiple client types

---

### 8. **Client Ledger**
Tracks all financial transactions with B2B clients.

```sql
CREATE TABLE client_ledger (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'OPENING_BALANCE')),
    amount DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    reference_number VARCHAR(100),
    visit_id INTEGER REFERENCES visits(id),
    payment_mode VARCHAR(50),
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Automatic Balance Tracking**:
- Database triggers update `clients.balance` automatically
- Every transaction records `balance_after` for audit trail

---

### 9. **Result Rejections**
Tracks rejected test results for quality control.

```sql
CREATE TABLE result_rejections (
    id SERIAL PRIMARY KEY,
    visit_test_id INTEGER NOT NULL REFERENCES visit_tests(id) ON DELETE CASCADE,
    rejected_by_user_id INTEGER REFERENCES users(id),
    rejected_by_username VARCHAR(255) NOT NULL,
    rejection_reason TEXT NOT NULL,
    old_results JSONB,
    status VARCHAR(50) DEFAULT 'PENDING_CORRECTION' CHECK (status IN ('PENDING_CORRECTION', 'CORRECTED', 'RESOLVED')),
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Workflow**:
1. Approver rejects result with reason
2. Lab technician corrected and resubmits
3. Approver reviews and approves/rejects again

---

### 10. **Audit Logs**
NABL-compliant audit trail of all system actions.

```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    username VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Retention Policy**:
- **Login logs**: 90 days (automatic cleanup)
- **Action logs**: Permanent retention
- **Automated cleanup**: Daily scheduler removes old login logs

**Logged Actions**:
- User login/logout
- Patient registration
- Test result entry
- Result approval/rejection
- Payment collection
- User management
- Permission changes
- Report printing

---

## 🚀 Core Features

### 1. **Patient Registration & Visit Management**

#### Features:
- ✅ **Quick Patient Search** - Search by phone number or name
- ✅ **New Patient Registration** - Capture demographics, clinical history
- ✅ **Visit Creation** - Select tests, calculate costs, collect payment
- ✅ **Referral Tracking** - Track referring doctors or B2B clients
- ✅ **Payment Modes** - Cash, Card, UPI, Online, Credit (B2B)
- ✅ **Partial Payments** - Track due amounts
- ✅ **Visit Code Generation** - Unique identifier for each visit

#### Workflow:
```
1. Search/Register Patient
2. Select Tests (from test catalog)
3. Calculate Total Cost (with B2B pricing if applicable)
4. Collect Payment (full or partial)
5. Generate Visit Code
6. Print Receipt/Barcode Labels
```

#### UI Features:
- Single-page layout (no scrolling)
- Split-panel test selection (Available → Selected)
- Real-time cost calculation
- Payment summary display
- Responsive design (11"+ screens)

---

### 2. **Sample Collection (Phlebotomy)**

#### Features:
- ✅ **Pending Samples List** - View all tests awaiting collection
- ✅ **Sample Type Specification** - Blood, Urine, Stool, etc.
- ✅ **Collection Confirmation** - Mark sample as collected with timestamp
- ✅ **Collector Tracking** - Record who collected the sample
- ✅ **Barcode Scanning** - Quick sample identification

#### Workflow:
```
1. View pending samples
2. Verify patient identity
3. Collect sample
4. Specify sample type (if not pre-defined)
5. Mark as collected
6. Status changes: PENDING → IN_PROGRESS
```

---

### 3. **Laboratory Testing**

#### Features:
- ✅ **Test Queue** - View all tests in progress
- ✅ **Result Entry Forms** - Dynamic forms based on test type
- ✅ **Multi-Parameter Tests** - Enter multiple values with units
- ✅ **Culture Tests** - Organism identification + antibiotic sensitivity
- ✅ **Normal Range Display** - Reference ranges shown during entry
- ✅ **Auto-save** - Prevent data loss
- ✅ **Result Validation** - Check for out-of-range values

#### Test Types:

**A. Single Value Tests**
- Example: Hemoglobin, Blood Sugar
- Single result field with unit

**B. Multi-Parameter Tests**
- Example: Lipid Profile, Liver Function Test
- Multiple parameters with individual units and ranges
- Tabular result entry

**C. Culture Tests**
- Organism identification
- Colony count
- Antibiotic sensitivity testing
- Interpretation notes

#### Workflow:
```
1. Select test from queue
2. Enter results (based on test type)
3. Review normal ranges
4. Save results
5. Submit for approval
6. Status changes: IN_PROGRESS → AWAITING_APPROVAL
```

---

### 4. **Result Approval**

#### Features:
- ✅ **Approval Queue** - View all tests awaiting approval
- ✅ **Result Review** - Compare with normal ranges
- ✅ **Approve/Reject** - Quality control checkpoint
- ✅ **Rejection Reasons** - Mandatory reason for rejection
- ✅ **Rejection Tracking** - Count rejections per test
- ✅ **Digital Signatures** - Approver signature on reports
- ✅ **Multi-Approver Support** - Different approvers for different tests

#### Workflow:
```
1. Review test results
2. Check against normal ranges
3. Verify sample quality
4. Decision:
   - APPROVE → Status: APPROVED (ready for printing)
   - REJECT → Status: IN_PROGRESS (back to lab with reason)
5. Digital signature applied to approved results
```

#### Rejection Workflow:
```
1. Approver rejects with reason
2. Lab technician receives notification
3. Lab corrects and resubmits
4. Approver reviews again
5. Rejection count tracked for quality metrics
```

---

### 5. **Report Generation & Printing**

#### Features:
- ✅ **Multi-Page Reports** - Automatic pagination for large test panels
- ✅ **Department Grouping** - Tests grouped by department
- ✅ **Professional Layout** - NABL-compliant format
- ✅ **Digital Signatures** - Approver signatures with name and title
- ✅ **QR Code** - Secure online report access
- ✅ **Watermark** - "PARTIAL REPRODUCTION NOT PERMITTED"
- ✅ **Header/Footer** - Lab branding, contact info
- ✅ **Normal Range Display** - Reference ranges for each parameter
- ✅ **Abnormal Value Highlighting** - Out-of-range values marked
- ✅ **PDF Export** - Print or save as PDF

#### Report Sections:
1. **Header**: Lab name, logo, contact info
2. **Patient Details**: Name, age, sex, visit code, date
3. **Test Results**: Grouped by department
4. **Signatures**: Approver signatures with titles
5. **Footer**: Disclaimer, QR code, page numbers

#### Department Grouping:
- Biochemistry
- Hematology
- Microbiology
- Serology
- Immunology
- Histopathology
- Cytology
- Molecular Biology

---

### 6. **B2B Client Management**

#### Features:
- ✅ **Client Registration** - Corporate clients with credit facilities
- ✅ **Credit Limit Management** - Set and monitor credit limits
- ✅ **Credit Period** - Define payment terms (e.g., 30 days)
- ✅ **Custom Pricing** - Test-wise pricing for each client
- ✅ **Automatic Invoicing** - Generate invoices for visits
- ✅ **Payment Tracking** - Record payments against invoices
- ✅ **Balance Tracking** - Real-time outstanding balance
- ✅ **Ledger Management** - Complete transaction history
- ✅ **Client Portal** - Separate login for B2B clients
- ✅ **Performance Dashboard** - Client-wise analytics

#### Transaction Types:
- **INVOICE**: New visit charges
- **PAYMENT**: Payment received
- **CREDIT_NOTE**: Refunds, discounts
- **DEBIT_NOTE**: Additional charges
- **OPENING_BALANCE**: Initial balance

#### Client Portal Features:
- View outstanding balance
- View transaction history
- Request new visits
- Download reports
- View invoices
- Make payment requests

#### Financial Management:
- **Automatic Balance Calculation**: Database triggers update balance
- **Credit Limit Alerts**: Warning when approaching limit
- **Aging Analysis**: Track overdue payments
- **Settlement Management**: Partial/full payment recording
- **Waiver Tracking**: Discount/waiver management

---

### 7. **User Management & Permissions**

#### User Roles:

**1. SUDO (Super Admin)**
- Full system access
- Cannot be deleted or edited
- All permissions by default

**2. ADMIN**
- Administrative functions
- User management (except SUDO)
- Test and price management
- B2B management

**3. RECEPTION**
- Patient registration
- Visit creation
- Payment collection

**4. PHLEBOTOMY**
- Sample collection
- Sample tracking

**5. LAB (Lab Technician)**
- Result entry
- Test processing

**6. APPROVER (Pathologist/Biochemist)**
- Result approval/rejection
- Digital signature on reports

#### Permission System:
- **Role-Based**: Default permissions based on role
- **User-Specific**: Override role permissions for individual users
- **Granular Control**: 18 different permissions
- **Dynamic Signature**: Signature upload appears when APPROVE_RESULTS permission is added

#### User Management Features:
- ✅ Create/Edit/Delete users
- ✅ Assign roles
- ✅ Customize permissions
- ✅ Upload digital signatures
- ✅ Enable/Disable accounts
- ✅ View permission summary
- ✅ Audit trail of changes

---

### 8. **Security Features**

#### Authentication:
- ✅ **JWT-Based Authentication** - Secure token-based auth
- ✅ **Password Hashing** - bcrypt with salt rounds
- ✅ **Session Management** - Persistent sessions with token refresh
- ✅ **Role-Based Access Control** - Permission checks on every action
- ✅ **Separate B2B Login** - Isolated client portal

#### Security Middleware:
- ✅ **Helmet.js** - Security headers (CSP, HSTS, etc.)
- ✅ **Rate Limiting** - Prevent brute force attacks
- ✅ **CORS Protection** - Whitelist allowed origins
- ✅ **SQL Injection Prevention** - Parameterized queries
- ✅ **XSS Protection** - Input sanitization
- ✅ **CSRF Protection** - Token validation

#### Audit & Compliance:
- ✅ **NABL-Compliant Logging** - Complete audit trail
- ✅ **Login Tracking** - IP address, user agent, timestamp
- ✅ **Action Logging** - All CRUD operations logged
- ✅ **Data Retention** - 90-day login logs, permanent action logs
- ✅ **Automatic Cleanup** - Scheduled cleanup of old logs

#### Data Protection:
- ✅ **Encrypted Passwords** - Never stored in plain text
- ✅ **Secure File Storage** - Signatures stored securely
- ✅ **Database Backups** - Regular automated backups
- ✅ **Access Control** - Row-level security for B2B clients

---

### 9. **Reporting & Analytics**

#### Dashboard Metrics:
- ✅ **Today's Statistics**:
  - Total visits
  - Revenue collected
  - Pending samples
  - Pending approvals
  - Due payments

- ✅ **Trend Analysis**:
  - Daily/Weekly/Monthly revenue
  - Test volume trends
  - Department-wise distribution
  - Referral source analysis

- ✅ **B2B Performance**:
  - Client-wise revenue
  - Outstanding balances
  - Payment trends
  - Credit utilization

#### Reports:
- ✅ **Financial Reports**:
  - Daily collection report
  - Outstanding dues report
  - B2B ledger report
  - Payment mode analysis

- ✅ **Operational Reports**:
  - Test volume report
  - TAT (Turnaround Time) analysis
  - Rejection rate report
  - Department productivity

- ✅ **Quality Reports**:
  - Rejection analysis
  - Repeat test tracking
  - Critical value alerts

#### Export Options:
- ✅ PDF export
- ✅ Excel export
- ✅ Print-friendly formats
- ✅ Date range filtering

---

### 10. **Patient Report Access**

#### QR Code System:
- ✅ **Unique QR Code** - Generated for each visit
- ✅ **Secure Token** - Encrypted token in QR code
- ✅ **Mobile-Friendly** - Scan and view on mobile
- ✅ **No Login Required** - Direct access via QR
- ✅ **Access Logging** - Track who accessed reports

#### Access Methods:
1. **QR Code Scan** - Scan QR on printed receipt
2. **Phone OTP** - Enter phone number + OTP verification
3. **Visit Code** - Enter visit code + patient details

#### Security:
- ✅ Token expiry (configurable)
- ✅ Access logging (IP, timestamp, method)
- ✅ Rate limiting on access attempts
- ✅ No sensitive data in QR code

---

## 🔐 User Roles & Permissions

### Complete Permission Matrix

| Permission | SUDO | ADMIN | RECEPTION | PHLEBOTOMY | LAB | APPROVER |
|-----------|------|-------|-----------|------------|-----|----------|
| **VIEW_RECEPTION** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **CREATE_VISIT** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **COLLECT_DUE_PAYMENT** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **VIEW_PHLEBOTOMY** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **COLLECT_SAMPLE** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **VIEW_LAB** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **ENTER_RESULTS** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **VIEW_APPROVER** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **APPROVE_RESULTS** | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **VIEW_ADMIN_PANEL** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **MANAGE_USERS** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **MANAGE_ROLES** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **MANAGE_TESTS** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **MANAGE_PRICES** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **MANAGE_B2B** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **MANAGE_ANTIBIOTICS** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **EDIT_APPROVED_REPORT** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **VIEW_AUDIT_LOG** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Permission Customization

**Individual User Permissions**:
- Admins can override role-based permissions for specific users
- Example: Give a senior lab technician APPROVE_RESULTS permission
- Signature upload automatically appears when APPROVE_RESULTS is granted
- SUDO permissions cannot be modified

**Permission Inheritance**:
- New users automatically receive role-based permissions
- Database trigger assigns permissions on user creation
- Permissions stored in `user_permissions` table

---

## 📊 Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PATIENT VISIT WORKFLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. RECEPTION (Patient Registration)
   ├─ Search existing patient (by phone/name)
   ├─ OR Register new patient
   ├─ Select tests from catalog
   ├─ Apply B2B pricing (if applicable)
   ├─ Calculate total cost
   ├─ Collect payment (full/partial)
   ├─ Generate visit code
   └─ Print receipt with QR code
        │
        ↓
2. PHLEBOTOMY (Sample Collection)
   ├─ View pending samples
   ├─ Verify patient identity
   ├─ Collect sample (Blood/Urine/etc.)
   ├─ Specify sample type
   ├─ Mark as collected
   └─ Status: PENDING → IN_PROGRESS
        │
        ↓
3. LABORATORY (Result Entry)
   ├─ View test queue
   ├─ Select test
   ├─ Enter results (based on test type)
   │  ├─ Single Value: One result
   │  ├─ Multi-Parameter: Multiple values
   │  └─ Culture: Organism + Sensitivity
   ├─ Review normal ranges
   ├─ Save results
   └─ Status: IN_PROGRESS → AWAITING_APPROVAL
        │
        ↓
4. APPROVER (Quality Control)
   ├─ View approval queue
   ├─ Review results vs normal ranges
   ├─ Decision:
   │  ├─ APPROVE → Status: APPROVED
   │  │   ├─ Apply digital signature
   │  │   └─ Ready for printing
   │  └─ REJECT → Status: IN_PROGRESS
   │      ├─ Provide rejection reason
   │      ├─ Increment rejection count
   │      └─ Back to lab for correction
   └─ Audit log created
        │
        ↓
5. REPORT GENERATION
   ├─ Generate PDF report
   ├─ Multi-page with department grouping
   ├─ Include digital signatures
   ├─ Add QR code for online access
   ├─ Print report
   └─ Deliver to patient

┌─────────────────────────────────────────────────────────────────┐
│                    B2B CLIENT WORKFLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. CLIENT REGISTRATION (Admin)
   ├─ Register corporate client
   ├─ Set credit limit
   ├─ Define credit period
   ├─ Configure custom pricing
   └─ Create client portal login

2. VISIT WITH B2B CLIENT
   ├─ Reception selects B2B client
   ├─ System applies custom pricing
   ├─ Payment mode: CREDIT
   ├─ Invoice generated automatically
   ├─ Ledger entry: INVOICE
   └─ Client balance updated (trigger)

3. PAYMENT COLLECTION
   ├─ Admin records payment
   ├─ Ledger entry: PAYMENT
   ├─ Client balance updated (trigger)
   └─ Payment confirmation sent

4. CLIENT PORTAL
   ├─ Client logs in
   ├─ View outstanding balance
   ├─ View transaction history
   ├─ Request new visits
   └─ Download reports
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/login              - Staff login
POST   /api/auth/client-login       - B2B client login
POST   /api/auth/logout             - Logout
GET    /api/auth/verify             - Verify JWT token
```

### Users
```
GET    /api/users                   - Get all users (with permissions)
GET    /api/users/:id               - Get user by ID (with permissions)
POST   /api/users                   - Create new user
PATCH  /api/users/:id               - Update user role/status
PATCH  /api/users/:id/permissions   - Update user permissions
DELETE /api/users/:id               - Delete user (hard delete)
POST   /api/users/:id/enable        - Enable disabled user
```

### Patients
```
GET    /api/patients                - Get all patients
GET    /api/patients/:id            - Get patient by ID
GET    /api/patients/search/:query  - Search by phone or name
POST   /api/patients                - Create new patient
PATCH  /api/patients/:id            - Update patient
```

### Visits
```
GET    /api/visits                  - Get all visits
GET    /api/visits/:id              - Get visit by ID
GET    /api/visits/code/:code       - Get visit by visit code
POST   /api/visits                  - Create new visit
PATCH  /api/visits/:id              - Update visit
GET    /api/visits/:id/report       - Get visit report data
```

### Test Templates
```
GET    /api/test-templates          - Get all test templates
GET    /api/test-templates/:id      - Get test template by ID
POST   /api/test-templates          - Create test template
PATCH  /api/test-templates/:id      - Update test template
DELETE /api/test-templates/:id      - Delete test template
```

### Visit Tests
```
GET    /api/visit-tests             - Get all visit tests
GET    /api/visit-tests/:id         - Get visit test by ID
GET    /api/visit-tests/visit/:id   - Get tests for a visit
PATCH  /api/visit-tests/:id         - Update test (results, status)
POST   /api/visit-tests/:id/approve - Approve test results
POST   /api/visit-tests/:id/reject  - Reject test results
```

### B2B Clients
```
GET    /api/clients                 - Get all B2B clients
GET    /api/clients/:id             - Get client by ID
POST   /api/clients                 - Create new client
PATCH  /api/clients/:id             - Update client
DELETE /api/clients/:id             - Delete client
GET    /api/clients/:id/ledger      - Get client ledger
POST   /api/clients/:id/payment     - Record payment
GET    /api/clients/:id/prices      - Get client-specific prices
POST   /api/clients/:id/prices      - Update client prices
```

### Client Ledger
```
GET    /api/client-ledger           - Get all ledger entries
GET    /api/client-ledger/:id       - Get ledger entry by ID
POST   /api/client-ledger           - Create ledger entry
GET    /api/client-ledger/client/:id - Get ledger for client
```

### Referral Doctors
```
GET    /api/referral-doctors        - Get all referral doctors
GET    /api/referral-doctors/:id    - Get doctor by ID
POST   /api/referral-doctors        - Create referral doctor
PATCH  /api/referral-doctors/:id    - Update referral doctor
DELETE /api/referral-doctors/:id    - Delete referral doctor
```

### Signatures
```
POST   /api/signatures/upload/:userId - Upload signature image
GET    /signatures/:filename        - Serve signature image (static)
```

### Role Permissions
```
GET    /api/role-permissions        - Get all role permissions
GET    /api/role-permissions/:role  - Get permissions for role
PATCH  /api/role-permissions/:role  - Update role permissions
```

### Audit Logs
```
GET    /api/audit-logs              - Get all audit logs
GET    /api/audit-logs/:id          - Get audit log by ID
GET    /api/audit-logs/user/:id     - Get logs for user
POST   /api/audit-logs              - Create audit log entry
```

### Antibiotics (for Culture Tests)
```
GET    /api/antibiotics             - Get all antibiotics
POST   /api/antibiotics             - Create antibiotic
PATCH  /api/antibiotics/:id         - Update antibiotic
DELETE /api/antibiotics/:id         - Delete antibiotic
```

---

## 🎨 UI Components & Features

### Responsive Design
- **Mobile-First Approach**: Tailwind CSS breakpoints
- **Breakpoints**:
  - `sm`: 640px (small tablets)
  - `md`: 768px (tablets)
  - `lg`: 1024px (laptops)
  - `xl`: 1280px (desktops)
  - `2xl`: 1536px (large desktops)

### Key UI Components

**1. Dashboard Cards**
- Real-time statistics
- Color-coded metrics
- Click-through navigation
- Responsive grid layout

**2. Data Tables**
- Sortable columns
- Search/filter functionality
- Pagination
- Row actions (edit, delete, view)
- Export options (PDF, Excel)

**3. Forms**
- Client-side validation
- Real-time error messages
- Auto-save functionality
- Multi-step forms
- File upload support

**4. Modals**
- Confirmation dialogs
- Form modals
- Image preview
- Signature canvas
- Responsive sizing

**5. Navigation**
- Role-based menu items
- Breadcrumb navigation
- Active state indicators
- Mobile hamburger menu

**6. Notifications**
- Success/Error alerts
- Toast notifications
- In-app notifications
- Badge counters

---

## 📈 Performance & Scalability

### Database Optimization
- **Indexes**: Strategic indexes on frequently queried columns
  - `patients.phone`, `patients.name`
  - `visits.visit_code`, `visits.patient_id`
  - `visit_tests.visit_id`, `visit_tests.status`
  - `user_permissions.user_id`
  - `client_ledger.client_id`

- **Triggers**: Automatic calculations
  - Client balance updates
  - User permission assignment
  - Timestamp updates

- **Views**: Pre-computed queries
  - `users_with_permissions` - Users with aggregated permissions

### Backend Performance
- **Connection Pooling**: PostgreSQL connection pool
- **Rate Limiting**: Prevent abuse (100 requests/15 min)
- **Caching**: JWT token caching
- **Async Operations**: Non-blocking I/O

### Frontend Performance
- **Code Splitting**: Vite lazy loading
- **Tree Shaking**: Remove unused code
- **Minification**: Production builds
- **Image Optimization**: Compressed signatures

### Scalability Considerations
- **Horizontal Scaling**: Stateless backend (JWT)
- **Database Replication**: Read replicas for reports
- **CDN**: Static asset delivery
- **Load Balancing**: Multiple backend instances

---

## 🚀 Deployment Options

### 1. **Cloud Deployment (Recommended)**

**Oracle Cloud Free Tier** (Best for startups):
- 4 vCPU, 24 GB RAM, 200 GB storage
- **Cost**: $0/month FOREVER
- Suitable for: 200-500 patients/day

**AWS/Google Cloud/Azure**:
- Small: 2 vCPU, 4 GB RAM - $20-40/month
- Medium: 4 vCPU, 8 GB RAM - $50-80/month
- Large: 8 vCPU, 16 GB RAM - $100-150/month

### 2. **On-Premise Deployment**

**Requirements**:
- Ubuntu 22.04 LTS or Windows Server
- 4 GB RAM minimum (8 GB recommended)
- 50 GB storage minimum
- Static IP or DDNS
- UPS for power backup

**Components**:
- PostgreSQL 16+
- Node.js 18+
- Nginx (reverse proxy)
- SSL certificate (Let's Encrypt)

### 3. **Docker Deployment**

```bash
# Using Docker Compose
docker-compose up -d

# Services:
# - PostgreSQL (port 5432)
# - Backend API (port 5001)
# - Frontend (port 5173)
```

### 4. **Windows Deployment**

- Batch script: `deploy-windows.bat`
- PowerShell script: `deploy-windows.ps1`
- One-click deployment
- Automatic dependency installation

---

## 🔧 Configuration

### Environment Variables

**Backend (.env)**:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lms_slncity
DB_HOST=localhost
DB_PORT=5432
DB_USER=lms_user
DB_PASSWORD=your_password
DB_NAME=lms_slncity

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Server
PORT=5001
NODE_ENV=production

# CORS
CORS_ORIGIN=http://localhost:5173

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./public/signatures
```

**Frontend (.env)**:
```env
VITE_API_URL=http://localhost:5001/api
VITE_APP_NAME=LMS SLNCity
```

---

## 📚 Testing

### Backend Tests (Jest)
- **Unit Tests**: 44 tests
- **Coverage**: API endpoints, authentication, database operations
- **Run**: `npm test` in `/server`

### Frontend Tests (Playwright)
- **E2E Tests**: 13 tests
- **Coverage**: User workflows, form submissions, navigation
- **Run**: `npx playwright test` in root

### Test Repository
- Separate repository: `LMS-SLNCITY-V1-TEST`
- GitHub: https://github.com/LMS-SLNCity/LMS-SLNCITY-V1-TEST
- Automated CI/CD testing

---

## 📖 Documentation Files

1. **SYSTEM_FEATURES_DOCUMENTATION.md** (this file) - Complete feature set
2. **SECURITY_DOCUMENTATION.md** - Security implementation details
3. **DATABASE_SCHEMA_REVIEW.md** - Database design and analysis
4. **CLOUD_DEPLOYMENT_SPECS.md** - Cloud deployment specifications
5. **BUDGET_DEPLOYMENT_OPTIONS.md** - Cost-effective deployment options
6. **WINDOWS-DEPLOYMENT.md** - Windows deployment guide
7. **README.md** - Quick start guide

---

## 🎯 Future Enhancements (Roadmap)

### Phase 1 (Q2 2025)
- [ ] SMS notifications for report ready
- [ ] Email report delivery
- [ ] WhatsApp integration
- [ ] Mobile app (React Native)

### Phase 2 (Q3 2025)
- [ ] Inventory management (reagents, consumables)
- [ ] Equipment maintenance tracking
- [ ] Quality control module
- [ ] External QC program integration

### Phase 3 (Q4 2025)
- [ ] AI-powered result validation
- [ ] Predictive analytics
- [ ] Voice-to-text result entry
- [ ] Blockchain-based report verification

### Phase 4 (2026)
- [ ] Multi-branch support
- [ ] Franchise management
- [ ] Telemedicine integration
- [ ] Insurance claim processing

---

## 📞 Support & Maintenance

### System Requirements
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Screen**: 11" minimum (1366x768)
- **Internet**: 2 Mbps minimum

### Backup Strategy
- **Database**: Daily automated backups
- **Retention**: 30 days rolling
- **Storage**: Local + cloud backup
- **Recovery**: Point-in-time recovery

### Monitoring
- **Uptime Monitoring**: 99.9% target
- **Error Logging**: Centralized logging
- **Performance Metrics**: Response time tracking
- **Audit Logs**: NABL-compliant retention

---

## 📄 License & Credits

**Developed For**: Sri Lakshmi Narasimha City Diagnostic Center
**Technology Stack**: React, TypeScript, Node.js, PostgreSQL
**Version**: 1.0.0
**Last Updated**: January 2025

---

## 🎉 Summary

**LMS SLNCity** is a production-ready, NABL-compliant Laboratory Management System with:

✅ **Complete Workflow** - Registration to Report Delivery
✅ **B2B Management** - Corporate clients with credit facilities
✅ **Security** - JWT auth, RBAC, audit logging
✅ **Scalability** - Cloud-ready, horizontal scaling
✅ **Compliance** - NABL audit requirements
✅ **Modern Tech** - React 19, TypeScript, PostgreSQL
✅ **Cost-Effective** - Free tier deployment options
✅ **Well-Documented** - Comprehensive documentation
✅ **Tested** - 57 automated tests
✅ **Responsive** - Works on all screen sizes

**Ready for production deployment! 🚀**

---

*End of Documentation*


