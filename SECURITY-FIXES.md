# 🔧 LMS SLNCity - Security Fixes Implementation Plan

## PHASE 1: IMMEDIATE CRITICAL FIXES (DO FIRST - Within 24 Hours)

### Fix 1: Remove Exposed Credentials from Repository

**Priority**: 🔴 CRITICAL - DO IMMEDIATELY

**Steps**:
```bash
# 1. Backup current repository
git clone <repo-url> lms-backup

# 2. Remove sensitive files from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch CREDENTIALS.md server/.env .env.aws .env.production server/.env.aws" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Add to .gitignore (already done, but verify)
echo "CREDENTIALS.md" >> .gitignore
echo "server/.env" >> .gitignore
echo ".env.aws" >> .gitignore
echo ".env.production" >> .gitignore

# 4. Commit changes
git add .gitignore
git commit -m "security: Remove sensitive files from tracking"

# 5. Force push (COORDINATE WITH TEAM FIRST!)
git push origin --force --all
git push origin --force --tags
```

**Then Rotate ALL Credentials**:
```bash
# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update server/.env with new secret
# Change all user passwords via admin panel
# Change database password
# Update all deployment configurations
```

---

### Fix 2: Add Authentication Middleware to All Protected Routes

**File**: `server/src/index.ts`

**Change**:
```typescript
// BEFORE (INSECURE):
app.use('/api/users', usersRoutes);
app.use('/api/patients', patientsRoutes);

// AFTER (SECURE):
app.use('/api/users', authMiddleware, usersRoutes);
app.use('/api/patients', authMiddleware, patientsRoutes);
app.use('/api/test-templates', authMiddleware, testTemplatesRoutes);
app.use('/api/antibiotics', authMiddleware, antibioticsRoutes);
app.use('/api/clients', authMiddleware, clientsRoutes);
app.use('/api/visits', authMiddleware, visitsRoutes);
app.use('/api/visit-tests', authMiddleware, visitTestsRoutes);
app.use('/api/signatories', authMiddleware, signatariesRoutes);
app.use('/api/referral-doctors', authMiddleware, referralDoctorsRoutes);
app.use('/api/audit-logs', authMiddleware, auditLogsRoutes);
app.use('/api/branches', authMiddleware, branchesRoutes);
app.use('/api/signatures', authMiddleware, signaturesRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/role-permissions', authMiddleware, rolePermissionsRoutes);
app.use('/api/approvers', authMiddleware, approversRoutes);
app.use('/api/patient-edit-requests', authMiddleware, patientEditRequestsRoutes);
app.use('/api/result-rejections', authMiddleware, resultRejectionsRoutes);
app.use('/api/audit-log-management', authMiddleware, auditLogManagementRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);
app.use('/api/b2b-financial', authMiddleware, b2bFinancialRoutes);
app.use('/api/waivers', authMiddleware, waiversRoutes);
app.use('/api/units', authMiddleware, unitsRoutes);
```

---

### Fix 3: Fix SQL Injection Vulnerability

**File**: `server/src/routes/auditLogManagement.ts`

**Line 123**: Replace string interpolation with parameterized query

**Change**:
```typescript
// BEFORE (VULNERABLE):
AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '${parseInt(hours as string)} hours'

// AFTER (SECURE):
AND timestamp >= CURRENT_TIMESTAMP - INTERVAL $1 || ' hours'
// Add to params array: params.push(parseInt(hours as string))
```

---

### Fix 4: Strengthen Rate Limiting

**File**: `server/src/index.ts`

**Change**:
```typescript
// Auth rate limiting - STRICTER
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window (reduced from 10)
  message: { error: 'Too many authentication attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// API rate limiting - MORE REASONABLE
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute (reduced from 1000)
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
});
```

---

### Fix 5: Add File Upload Security

**File**: `server/src/routes/signatures.ts`

**Add**:
```typescript
import { authMiddleware } from '../middleware/auth.js';

// Add authentication
router.post('/upload/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { imageData } = req.body;
    
    // Verify user can only upload their own signature (or is admin)
    const requestUser = (req as any).user;
    if (requestUser.id !== parseInt(userId) && !['SUDO', 'ADMIN'].includes(requestUser.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Validate base64 data
    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    // Extract and validate
    const matches = imageData.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Only PNG and JPEG images allowed' });
    }

    const [, fileType, base64Data] = matches;
    
    // Validate file size (2MB limit)
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size must be less than 2MB' });
    }
    
    // Rest of upload logic...
  }
});
```

---

## PHASE 2: HIGH PRIORITY FIXES (Within 1 Week)

### Fix 6: Add Input Validation

Install and use express-validator:
```typescript
import { body, validationResult } from 'express-validator';

// Example for patient creation
router.post('/patients',
  authMiddleware,
  [
    body('name').trim().isLength({ min: 1, max: 100 }).escape(),
    body('phone').trim().matches(/^[0-9]{10}$/),
    body('email').optional().isEmail().normalizeEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process request...
  }
);
```

### Fix 7: Implement Account Lockout

Add to auth route after failed login:
```typescript
// Track failed attempts
const failedAttempts = await pool.query(
  `SELECT COUNT(*) FROM audit_logs 
   WHERE username = $1 
   AND action = 'LOGIN_FAILED' 
   AND timestamp > NOW() - INTERVAL '1 hour'`,
  [username]
);

if (parseInt(failedAttempts.rows[0].count) >= 5) {
  return res.status(429).json({ 
    error: 'Account temporarily locked due to multiple failed login attempts. Try again in 1 hour.' 
  });
}
```

### Fix 8: Move Tokens to HTTP-Only Cookies

**Backend** (`server/src/routes/auth.ts`):
```typescript
res.cookie('authToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
});
```

**Frontend**: Remove localStorage usage, rely on cookies

---

## PHASE 3: MEDIUM PRIORITY (Within 2 Weeks)

- Add password complexity requirements
- Implement HTTPS enforcement
- Add security headers (X-Frame-Options, etc.)
- Encrypt sensitive audit log data
- Add database connection limits
- Implement proper error handling without information disclosure

---

## VERIFICATION CHECKLIST

After implementing fixes:
- [ ] Run security scan tools (npm audit, Snyk)
- [ ] Test authentication on all endpoints
- [ ] Verify rate limiting works
- [ ] Test file upload restrictions
- [ ] Confirm no credentials in git history
- [ ] Verify all new credentials are rotated
- [ ] Test account lockout mechanism
- [ ] Penetration testing

---

**CRITICAL**: Do not deploy to production until Phase 1 fixes are complete!

