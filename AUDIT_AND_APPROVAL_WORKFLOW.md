# Audit Logs & Approval Workflow Implementation

## 📋 Overview

This document describes the comprehensive audit logging and approval workflow features implemented in the LMS application, including NABL ISO 15189 compliant retention policies and automated cleanup.

## 🆕 Latest Updates (2025-11-03)

### ✅ Login Audit Logging with Retention Policies
- **All login attempts are now logged** (successful and failed)
- **IP address and user agent tracking** for security monitoring
- **90-day retention for login logs** (automatically cleaned up)
- **Permanent retention for all other audit logs** (NABL compliant)
- **Automated cleanup scheduler** runs daily at 2:00 AM
- **Comprehensive security monitoring** with suspicious activity detection

## ✅ Implemented Features

### 1. Login Audit Logging with Retention Policies (NEW!)

#### Comprehensive Login Tracking
- **All login attempts logged**:
  - `LOGIN_SUCCESS` - Successful logins with user details
  - `LOGIN_FAILED` - Failed attempts with failure reason
  - `LOGOUT` - User logout events

- **Captured Information**:
  - Username and user ID
  - Timestamp (precise to millisecond)
  - IP address (for security tracking)
  - User agent (browser/device information)
  - Failure reason (user not found, wrong password, inactive account, etc.)

#### Retention Policies (NABL ISO 15189 Compliant)
- **LOGIN logs**: 90-day retention
  - Automatically expire after 90 days
  - Cleaned up by scheduled job
  - Sufficient for security monitoring and incident investigation

- **All other logs**: Permanent retention
  - Patient data changes
  - Test results and approvals
  - User management actions
  - Configuration changes
  - Required by NABL ISO 15189 for quality management

#### Automated Cleanup System
- **Scheduled Job**: Runs daily at 2:00 AM
- **Function**: Deletes expired login logs (older than 90 days)
- **Logging**: All cleanup operations logged in `audit_log_cleanup_history`
- **Manual Trigger**: Admins can trigger cleanup manually via API
- **Initial Cleanup**: Runs 5 seconds after server startup

#### Security Monitoring
- **Failed Login Tracking**: Identifies brute force attempts
- **Suspicious Activity Detection**:
  - Multiple failed attempts from same user
  - Multiple failed attempts from same IP
  - Unusual login patterns
- **Active Session Tracking**: Shows currently logged-in users
- **Login Activity Summary**: Daily statistics and trends

### 2. Enhanced Audit Logging System

#### Database Schema
- **Enhanced `audit_logs` table** with new columns:
  - `user_id` - Reference to the user who performed the action
  - `resource` - Type of resource affected (e.g., 'visit_test', 'patient', 'user')
  - `resource_id` - ID of the affected resource
  - `ip_address` - IP address of the user
  - `old_values` - JSONB field storing values before change
  - `new_values` - JSONB field storing values after change
  - Indexes on `user_id`, `resource`, `resource_id`, `timestamp` for fast queries

#### API Endpoints (`/api/audit-logs`)
- **GET** `/api/audit-logs` - Fetch audit logs with comprehensive filtering
  - Filter by: username, action, resource, resource_id, date range, search query
  - Pagination support (limit/offset)
  - Returns total count for pagination
  
- **GET** `/api/audit-logs/users` - Get list of all usernames for filter dropdown
- **GET** `/api/audit-logs/actions` - Get list of all action types for filter dropdown
- **GET** `/api/audit-logs/resources` - Get list of all resource types for filter dropdown

- **POST** `/api/audit-logs` - Create new audit log entry
  - Accepts all enhanced fields including old_values and new_values

#### Frontend Component (`components/admin/AuditLogViewer.tsx`)
- **Comprehensive Filtering UI**:
  - Username dropdown (populated from API)
  - Action type dropdown (populated from API)
  - Resource type dropdown (populated from API)
  - Search box for details
  - Start date/time picker
  - End date/time picker
  - Clear filters button

- **Enhanced Display**:
  - Color-coded action badges (green for CREATE, blue for UPDATE, red for DELETE, etc.)
  - Expandable rows to view full details
  - Shows old_values and new_values in formatted JSON
  - Shows IP address and user role
  - Pagination controls (50 logs per page)
  - Total log count display

### 2. Result Rejection Workflow

#### Database Schema
- **New `result_rejections` table**:
  - `id` - Primary key
  - `visit_test_id` - Reference to the test being rejected
  - `rejected_by_user_id` - User who rejected
  - `rejected_by_username` - Username for display
  - `rejection_reason` - Detailed reason for rejection (TEXT)
  - `old_results` - JSONB snapshot of results at rejection time
  - `status` - 'PENDING_CORRECTION', 'CORRECTED', 'RESOLVED'
  - `resolved_by_user_id` - User who resolved the rejection
  - `resolved_by_username` - Username for display
  - `resolved_at` - Timestamp of resolution
  - `created_at`, `updated_at` - Timestamps

- **Enhanced `visit_tests` table**:
  - `rejection_count` - Number of times this test has been rejected
  - `last_rejection_at` - Timestamp of most recent rejection

#### API Endpoints (`/api/result-rejections`)
- **GET** `/api/result-rejections` - Get all rejections with filtering
  - Filter by: status, visit_test_id
  - Joins with visit_tests, test_templates, visits, patients for full context
  
- **GET** `/api/result-rejections/by-test/:visitTestId` - Get rejection history for a specific test

- **POST** `/api/result-rejections` - Create new rejection
  - Creates rejection record
  - Updates visit_test status back to 'IN_PROGRESS'
  - Increments rejection_count
  - Clears approved_by and approved_at
  - Creates audit log entry
  - Uses database transaction for atomicity

- **PATCH** `/api/result-rejections/:id/resolve` - Mark rejection as resolved
  - Updates rejection status to 'RESOLVED'
  - Records resolver information
  - Creates audit log entry

#### Frontend Components

**Enhanced `components/ApprovalModal.tsx`**:
- **Rejection Warning**: Shows alert if test has been rejected before
  - Displays rejection count
  - Shows last rejection timestamp
  
- **Two-Step Rejection Process**:
  1. Click "Reject" button
  2. Enter detailed rejection reason in textarea
  3. Confirm rejection
  
- **UI States**:
  - Normal state: Shows "Approve" and "Reject" buttons
  - Rejection state: Shows textarea and "Confirm Rejection" button
  - Loading state: Disables buttons during API calls
  
- **Validation**:
  - Rejection reason is required
  - Only AWAITING_APPROVAL tests can be rejected
  - User session validation

**Context Integration (`context/AppContext.tsx`)**:
- New `rejectTestResult` function:
  - Accepts visitTestId, rejectionReason, and actor
  - Calls rejection API endpoint
  - Reloads data to get updated test status
  - Shows success/error alerts
  - Returns Promise for async handling

### 3. Patient Edit Request/Approval Workflow

#### Database Schema
- **New `patient_edit_requests` table**:
  - `id` - Primary key
  - `patient_id` - Reference to patient being edited
  - `requested_by_user_id` - User requesting the edit
  - `requested_by_username` - Username for display
  - `request_type` - 'NAME_CHANGE', 'CRITICAL_INFO_CHANGE', 'GENERAL_EDIT'
  - `old_values` - JSONB snapshot of patient data before change
  - `new_values` - JSONB proposed new values
  - `reason` - Reason for the change request
  - `status` - 'PENDING', 'APPROVED', 'REJECTED'
  - `reviewed_by_user_id` - Admin who reviewed
  - `reviewed_by_username` - Username for display
  - `review_comment` - Admin's comment on approval/rejection
  - `reviewed_at` - Timestamp of review
  - `created_at`, `updated_at` - Timestamps

#### API Endpoints (`/api/patient-edit-requests`)
- **GET** `/api/patient-edit-requests` - Get all edit requests
  - Filter by: status, patient_id
  - Joins with patients table for context
  
- **POST** `/api/patient-edit-requests` - Create new edit request
  - Validates required fields
  - Creates request record
  - Creates audit log entry

- **PATCH** `/api/patient-edit-requests/:id/approve` - Approve and apply changes
  - Uses database transaction
  - Updates request status to 'APPROVED'
  - Applies changes to patient record
  - Creates audit log with old_values and new_values
  - Records reviewer information

- **PATCH** `/api/patient-edit-requests/:id/reject` - Reject request
  - Updates request status to 'REJECTED'
  - Records rejection comment
  - Creates audit log entry

### 4. TypeScript Types

**New Types Added to `types.ts`**:

```typescript
export interface AuditLog {
    id: number;
    timestamp: string;
    username: string;
    action: string;
    details: string;
    user_id?: number;
    resource?: string;
    resource_id?: number;
    ip_address?: string;
    old_values?: any;
    new_values?: any;
    user_role?: string;
}

export interface PatientEditRequest {
    id: number;
    patient_id: number;
    requested_by_user_id: number;
    requested_by_username: string;
    request_type: 'NAME_CHANGE' | 'CRITICAL_INFO_CHANGE' | 'GENERAL_EDIT';
    old_values: any;
    new_values: any;
    reason?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewed_by_user_id?: number;
    reviewed_by_username?: string;
    review_comment?: string;
    reviewed_at?: string;
    created_at: string;
    updated_at: string;
}

export interface ResultRejection {
    id: number;
    visit_test_id: number;
    rejected_by_user_id: number;
    rejected_by_username: string;
    rejection_reason: string;
    old_results?: any;
    status: 'PENDING_CORRECTION' | 'CORRECTED' | 'RESOLVED';
    resolved_by_user_id?: number;
    resolved_by_username?: string;
    resolved_at?: string;
    created_at: string;
    updated_at: string;
}

export interface VisitTest {
    // ... existing fields ...
    rejection_count?: number;
    last_rejection_at?: string;
}
```

## 🔄 Workflow Diagrams

### Result Approval/Rejection Flow

```
LAB TECHNICIAN                    APPROVER                      SYSTEM
     |                                |                             |
     | 1. Enter results               |                             |
     |------------------------------>|                             |
     |                                |                             |
     | 2. Submit for approval         |                             |
     |--------------------------------|--------------------------->|
     |                                |                             |
     |                                | 3. Review results           |
     |                                |<----------------------------|
     |                                |                             |
     |                                | 4a. APPROVE                 |
     |                                |---------------------------->|
     |                                |    (Status: APPROVED)       |
     |                                |                             |
     |                                | 4b. REJECT with reason      |
     |                                |---------------------------->|
     |                                |    (Status: IN_PROGRESS)    |
     |                                |    (rejection_count++)      |
     |                                |                             |
     | 5. Notification of rejection   |                             |
     |<---------------------------------------------------------------|
     |    (Shows rejection reason)    |                             |
     |                                |                             |
     | 6. Correct results             |                             |
     |------------------------------>|                             |
     |                                |                             |
     | 7. Resubmit for approval       |                             |
     |--------------------------------|--------------------------->|
     |                                |                             |
     |                                | 8. Review again             |
     |                                |    (Shows rejection history)|
```

### Patient Edit Approval Flow

```
STAFF                             ADMIN                         SYSTEM
  |                                 |                              |
  | 1. Request patient edit         |                              |
  |    (Name or critical info)      |                              |
  |---------------------------------|----------------------------->|
  |                                 |                              |
  |                                 | 2. Review request            |
  |                                 |    (See old vs new values)   |
  |                                 |<-----------------------------|
  |                                 |                              |
  |                                 | 3a. APPROVE                  |
  |                                 |----------------------------->|
  |                                 |    (Apply changes)           |
  |                                 |    (Create audit log)        |
  |                                 |                              |
  |                                 | 3b. REJECT with comment      |
  |                                 |----------------------------->|
  |                                 |    (No changes applied)      |
  |                                 |                              |
  | 4. Notification of decision     |                              |
  |<-----------------------------------------------------------------|
```

## 🧪 Testing Checklist

### Audit Log Filtering
- [ ] Filter by username
- [ ] Filter by action type
- [ ] Filter by resource type
- [ ] Filter by date range
- [ ] Search in details
- [ ] Combine multiple filters
- [ ] Clear all filters
- [ ] Pagination works correctly
- [ ] Expand row to see old_values and new_values
- [ ] Color-coded action badges display correctly

### Result Rejection Workflow
- [ ] Approver can reject test with reason
- [ ] Test status changes to IN_PROGRESS after rejection
- [ ] Rejection count increments
- [ ] Lab technician sees rejection notification
- [ ] Lab can edit and resubmit
- [ ] Rejection history shows in approval modal
- [ ] Audit log created for rejection
- [ ] Cannot reject non-AWAITING_APPROVAL tests

### Patient Edit Approval
- [ ] Create edit request for name change
- [ ] Create edit request for critical info change
- [ ] Admin sees pending requests
- [ ] Admin can view old vs new values
- [ ] Admin can approve with comment
- [ ] Admin can reject with comment
- [ ] Changes applied only on approval
- [ ] Audit log created with old_values and new_values
- [ ] Requester notified of decision

## 📝 Next Steps (Not Yet Implemented)

### 1. Frontend Components Needed
- [ ] **Patient Edit Request Form** - Component for staff to request patient edits
- [ ] **Admin Review Panel** - Component for admins to review and approve/reject patient edit requests
- [ ] **Rejection Notifications** - Show rejection alerts to lab technicians in LabQueue
- [ ] **Rejection History Viewer** - Component to view full rejection history for a test

### 2. Patient PATCH Endpoint Enhancement
- [ ] Update `server/src/routes/patients.ts` PATCH endpoint to:
  - Detect if name or critical fields changed
  - Create patient_edit_request instead of direct update for critical changes
  - Allow direct update for non-critical fields with audit trail
  - Return appropriate message indicating approval required

### 3. Approver Edit Capability
- [ ] Add "Edit Results" button in ApprovalModal
- [ ] Allow approvers to directly edit results
- [ ] Create audit log with action 'APPROVER_EDIT_RESULT'
- [ ] Store old_values and new_values in audit log

### 4. Notification System
- [ ] Real-time notifications for rejections
- [ ] Email notifications for patient edit requests
- [ ] Dashboard alerts for pending approvals

## 🔐 Security Considerations

- All endpoints require authentication (JWT token)
- User ID and username captured for accountability
- IP address logging for security auditing
- Database transactions ensure data consistency
- Old values preserved before any changes
- Audit trail cannot be deleted (only created)
- Role-based access control for approvals

## 📊 Database Migration

Run the migration to apply all schema changes:

```bash
cd server
psql -U lms_user -d lms_slncity -f db/migrations/001_enhance_audit_logs.sql
```

## 🚀 Deployment Notes

1. **Database Migration**: Run migration before deploying new code
2. **Backward Compatibility**: New columns have defaults, existing data unaffected
3. **Performance**: Indexes added for fast filtering queries
4. **Storage**: JSONB fields for old_values/new_values are efficient and queryable

## 📖 API Documentation

See individual route files for detailed API documentation:
- `server/src/routes/auditLogs.ts`
- `server/src/routes/resultRejections.ts`
- `server/src/routes/patientEditRequests.ts`

