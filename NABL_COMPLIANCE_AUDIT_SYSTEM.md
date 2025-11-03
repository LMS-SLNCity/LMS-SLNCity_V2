# NABL ISO 15189 Compliance - Audit Logging System

## 📋 Overview

This document describes how the LMS audit logging system meets NABL (National Accreditation Board for Testing and Calibration Laboratories) ISO 15189:2012 requirements for medical laboratory quality and competence.

## 🎯 NABL ISO 15189 Requirements

### Clause 4.13 - Control of Records

**Requirement**: The laboratory shall establish and maintain procedures for identification, collection, indexing, access, filing, storage, maintenance and disposal of quality and technical records.

**Our Implementation**: ✅ COMPLIANT
- All system actions are automatically logged to the `audit_logs` table
- Records include: timestamp, user, action type, details, IP address, user agent
- Indexed for fast retrieval and searching
- Retention policies implemented (permanent for critical records, 90 days for login logs)

### Clause 4.14 - Evaluation and Audits

**Requirement**: The laboratory shall periodically conduct internal audits of its activities to verify that its operations continue to comply with the requirements of the quality management system.

**Our Implementation**: ✅ COMPLIANT
- Comprehensive audit trail of all system activities
- Audit log viewer with filtering and search capabilities
- Compliance reports available via `/api/audit-log-management/compliance-report`
- Login activity monitoring and suspicious activity detection

### Clause 5.10 - Reporting Results

**Requirement**: Results shall be reported accurately, clearly, unambiguously and objectively, and in accordance with any specific instructions in the examination procedures.

**Our Implementation**: ✅ COMPLIANT
- All result entries, edits, and approvals are logged
- Rejection workflow with detailed reasons
- Approver signatures and timestamps recorded
- Complete audit trail from result entry to approval

## 📊 Audit Log Categories

### 1. Permanent Records (Retained Indefinitely)

These records are retained permanently as per NABL requirements:

- **Patient Management**
  - `CREATE_PATIENT` - New patient registration
  - `UPDATE_PATIENT` - Patient information updates
  - `PATIENT_EDIT_REQUEST` - Requests for critical patient data changes
  - `APPROVE_PATIENT_EDIT` - Admin approval of patient edits
  - `REJECT_PATIENT_EDIT` - Admin rejection of patient edits

- **Visit & Test Management**
  - `CREATE_VISIT` - New visit/registration
  - `UPDATE_VISIT_STATUS` - Visit status changes
  - `COLLECT_SAMPLE` - Sample collection events
  - `ENTER_RESULTS` - Test result entry
  - `EDIT_RESULTS` - Result modifications (with reason)
  - `APPROVE_RESULTS` - Result approval by authorized personnel
  - `REJECT_RESULT` - Result rejection with comments
  - `RESOLVE_REJECTION` - Resolution of rejected results

- **User & Role Management**
  - `CREATE_USER` - New user account creation
  - `UPDATE_USER` - User account modifications
  - `UPDATE_PERMISSIONS` - Permission changes
  - `UPDATE_ROLE_PERMISSIONS` - Role-based permission updates
  - `ACTIVATE_USER` - User account activation
  - `DEACTIVATE_USER` - User account deactivation

- **Test Template Management**
  - `CREATE_TEST_TEMPLATE` - New test template creation
  - `UPDATE_TEST_TEMPLATE` - Test template modifications
  - `DELETE_TEST_TEMPLATE` - Test template deletion
  - `UPDATE_TEST_PRICES` - Price modifications

- **B2B Client Management**
  - `CREATE_CLIENT` - New B2B client creation
  - `UPDATE_CLIENT` - Client information updates
  - `DELETE_CLIENT` - Client deletion
  - `CLIENT_PAYMENT` - Payment transactions
  - `SETTLE_CLIENT_BALANCE` - Balance settlements

- **Financial Transactions**
  - `COLLECT_DUE_PAYMENT` - Payment collection
  - `UPDATE_PAYMENT` - Payment modifications

### 2. Temporary Records (90-Day Retention)

These records are retained for 90 days for security monitoring:

- **Authentication Events**
  - `LOGIN_SUCCESS` - Successful login attempts
  - `LOGIN_FAILED` - Failed login attempts
  - `LOGOUT` - User logout events

**Rationale**: Login logs are kept for security monitoring and incident investigation. After 90 days, they are automatically purged to manage database size while maintaining security oversight.

## 🔒 Security & Compliance Features

### 1. Comprehensive Login Logging

**Implementation**:
- All login attempts (successful and failed) are logged
- Captures: username, timestamp, IP address, user agent, outcome
- Separate logging for staff and B2B client logins
- Failed login tracking for security monitoring

**NABL Compliance**: Meets requirements for access control and security monitoring

### 2. Immutable Audit Trail

**Implementation**:
- Audit logs cannot be modified or deleted by users
- Only automated cleanup removes expired login logs
- All cleanup operations are logged in `audit_log_cleanup_history`
- Database-level constraints prevent unauthorized modifications

**NABL Compliance**: Ensures integrity of quality records

### 3. Change Tracking with Before/After Values

**Implementation**:
- `old_values` and `new_values` JSONB fields capture complete change history
- Used for patient edits, result modifications, and configuration changes
- Enables complete reconstruction of data history

**NABL Compliance**: Meets requirements for traceability and change control

### 4. Automated Retention Policy Enforcement

**Implementation**:
- Database triggers automatically set expiry dates based on retention category
- Scheduled cleanup job runs daily at 2:00 AM
- Manual cleanup available for administrators
- Cleanup history maintained for audit purposes

**NABL Compliance**: Ensures consistent application of retention policies

### 5. Role-Based Access Control

**Implementation**:
- All audit log actions record user ID and role
- Sensitive operations restricted to authorized roles
- Permission changes are logged

**NABL Compliance**: Meets requirements for personnel competence and authorization

## 📈 Compliance Reporting

### Available Reports

1. **NABL Audit Compliance Report**
   - Endpoint: `/api/audit-log-management/compliance-report`
   - Shows: Total logs by category, retention status, oldest/newest logs
   - Use: Demonstrate compliance during NABL audits

2. **Login Activity Summary**
   - Endpoint: `/api/audit-log-management/login-activity`
   - Shows: Daily login statistics, success/failure rates
   - Use: Security monitoring and access control verification

3. **Failed Login Report**
   - Endpoint: `/api/audit-log-management/failed-logins`
   - Shows: Recent failed login attempts with details
   - Use: Security incident investigation

4. **Suspicious Activity Detection**
   - Endpoint: `/api/audit-log-management/suspicious-activity`
   - Shows: Multiple failed attempts, suspicious IP patterns
   - Use: Proactive security monitoring

5. **User Session Tracking**
   - Endpoint: `/api/audit-log-management/user-sessions`
   - Shows: Active sessions, login/logout times
   - Use: Access control verification

6. **Cleanup History**
   - Endpoint: `/api/audit-log-management/cleanup-history`
   - Shows: All cleanup operations with counts
   - Use: Demonstrate retention policy enforcement

## 🔧 Technical Implementation

### Database Schema

```sql
-- Enhanced audit_logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    user_id INTEGER REFERENCES users(id),
    resource VARCHAR(100),
    resource_id INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    retention_category VARCHAR(50) DEFAULT 'PERMANENT',
    expires_at TIMESTAMP
);

-- Retention policies
CREATE TABLE audit_log_retention_policies (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) UNIQUE NOT NULL,
    retention_days INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Cleanup history
CREATE TABLE audit_log_cleanup_history (
    id SERIAL PRIMARY KEY,
    cleanup_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logs_deleted INTEGER NOT NULL,
    retention_category VARCHAR(50),
    executed_by VARCHAR(255),
    notes TEXT
);
```

### Automated Cleanup

```typescript
// Scheduled cleanup runs daily at 2:00 AM
cron.schedule('0 2 * * *', async () => {
    await cleanupExpiredAuditLogs();
});

// Cleanup function
const cleanupExpiredAuditLogs = async () => {
    // Delete only expired login logs
    DELETE FROM audit_logs
    WHERE expires_at IS NOT NULL
      AND expires_at < CURRENT_TIMESTAMP;
    
    // Log the cleanup operation
    INSERT INTO audit_log_cleanup_history ...
};
```

## 📋 NABL Audit Checklist

Use this checklist during NABL audits:

- [ ] **Audit Log Completeness**
  - [ ] All user actions are logged
  - [ ] All result entries/edits/approvals are logged
  - [ ] All patient data changes are logged
  - [ ] All configuration changes are logged

- [ ] **Retention Policy Compliance**
  - [ ] Permanent records are retained indefinitely
  - [ ] Login logs are retained for 90 days
  - [ ] Cleanup operations are logged
  - [ ] No unauthorized deletions

- [ ] **Access Control**
  - [ ] All logins are logged with IP and timestamp
  - [ ] Failed login attempts are tracked
  - [ ] User roles and permissions are logged
  - [ ] Suspicious activity is detected

- [ ] **Data Integrity**
  - [ ] Audit logs are immutable
  - [ ] Change history includes before/after values
  - [ ] All approvals have timestamps and signatures
  - [ ] Rejection reasons are documented

- [ ] **Reporting Capability**
  - [ ] Compliance reports are available
  - [ ] Login activity can be reviewed
  - [ ] Failed logins can be investigated
  - [ ] Cleanup history is maintained

## 🎓 Training Requirements

Staff should be trained on:

1. **Understanding Audit Logs**
   - What actions are logged
   - Why audit trails are important
   - NABL compliance requirements

2. **Proper Documentation**
   - Providing clear reasons for edits
   - Documenting rejection reasons
   - Proper approval procedures

3. **Security Awareness**
   - Protecting login credentials
   - Recognizing suspicious activity
   - Reporting security incidents

## 📞 Support & Maintenance

### Regular Maintenance Tasks

1. **Daily** (Automated)
   - Cleanup of expired login logs
   - Monitoring of failed login attempts

2. **Weekly**
   - Review suspicious activity reports
   - Check audit log statistics

3. **Monthly**
   - Generate compliance reports
   - Review cleanup history
   - Verify retention policies

4. **Annually** (Before NABL Audit)
   - Generate comprehensive compliance report
   - Review all audit log categories
   - Verify data integrity
   - Document any incidents or issues

## ✅ Conclusion

This audit logging system is designed to meet and exceed NABL ISO 15189:2012 requirements for medical laboratory quality management. The system provides:

- ✅ Complete audit trail of all system activities
- ✅ Permanent retention of critical quality records
- ✅ Automated retention policy enforcement
- ✅ Comprehensive security monitoring
- ✅ Detailed compliance reporting
- ✅ Immutable and traceable records

The system is production-ready and NABL audit-ready.

