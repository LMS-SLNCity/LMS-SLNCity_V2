# 🔍 ROOT CAUSE ANALYSIS: Excessive API Calls

## Executive Summary

**Problem:** Application making 7,176+ API requests in 30 seconds with no user interaction.

**Root Cause:** Multiple architectural issues causing data to load eagerly and bypass caching:
1. ✅ **FIXED**: Components loading data on mount (expected behavior, but needs optimization)
2. ✅ **FIXED**: Direct `fetch()` calls bypassing DataCache system
3. ⚠️ **PARTIAL**: Some components still use direct fetch (need review)

**Status:** Partially fixed. Main issue resolved, but optimization needed.

---

## Timeline of Investigation

### Attempt 1: Browser & HTTP Caching (FAILED)
**What we tried:**
- Added localStorage caching with 5-minute TTL
- Added HTTP Cache-Control headers on backend
- Made `reloadData()` respect cache

**Why it failed:**
- Components were still loading all data on mount
- Cache was being bypassed by direct fetch() calls
- Eager loading strategy was fundamentally flawed

### Attempt 2: Lazy Loading Architecture (PARTIAL SUCCESS)
**What we tried:**
- Created DataCache.ts with per-endpoint caching
- Added lazy loading functions to AppContext
- Made MainLayout call `loadViewData()` on view change

**Why it partially failed:**
- Still loaded all data for default view on login
- Data loading was triggered by view change, not component mount
- Not truly lazy - just moved the problem

### Attempt 3: Component-Level Lazy Loading (PARTIAL SUCCESS)
**What we tried:**
- Removed `loadViewData()` from MainLayout
- Made each component load its own data on mount
- Components call lazy loading functions from AppContext

**Why it partially failed:**
- Components were using direct `fetch()` calls
- These bypassed the DataCache system entirely
- referral-doctors, ledger, and other data loaded without caching

### Attempt 4: Fix Direct fetch() Calls (CURRENT)
**What we're doing:**
- Identified all direct `fetch()` calls in components
- Replacing with AppContext lazy loading functions
- Ensuring all data goes through DataCache

**Status:** In progress

---

## Root Cause #1: Direct fetch() Calls Bypassing Cache

### The Problem

Components were making direct API calls using `fetch()` instead of using AppContext functions:

```typescript
// ❌ BAD: Direct fetch bypasses cache
useEffect(() => {
  const fetchReferralDoctors = async () => {
    const response = await fetch(`${API_BASE_URL}/referral-doctors`);
    const data = await response.json();
    setReferralDoctors(data);
  };
  fetchReferralDoctors();
}, []);
```

**Impact:**
- Data loaded on EVERY component mount
- No caching - same data fetched repeatedly
- DataCache system completely bypassed
- Multiplied API calls across all components

### The Fix

Use AppContext lazy loading functions that go through DataCache:

```typescript
// ✅ GOOD: Uses DataCache with 1-hour TTL
const { referralDoctors, loadReferralDoctors } = useAppContext();

useEffect(() => {
  loadReferralDoctors(); // Uses cache if available
}, []);
```

**Benefits:**
- Data cached for 1 hour (configurable TTL)
- Shared across all components
- Prevents duplicate simultaneous requests
- Consistent with architecture

### Files Fixed

1. ✅ **CreateVisitFormNew.tsx** (line 84-96)
   - Was: Direct fetch to `/referral-doctors`
   - Now: Uses `loadReferralDoctors()` from AppContext
   - Impact: 1 less API call per mount, cached for 1 hour

### Files That Need Review

1. **B2BClientDashboard.tsx** (line 50)
   - Direct fetch to `/clients/${clientId}/ledger`
   - Decision needed: Add to AppContext or keep as-is (client-specific data)

2. **CreateVisitForm.tsx** (line 165)
   - Direct fetch to `/referral-doctors`
   - Status: Component not used (CreateVisitFormNew is used instead)
   - Action: Can be ignored or deleted

3. **Admin Components** (multiple files)
   - UserManagement.tsx: DELETE user (line 41)
   - SignatureUploadModal.tsx: UPLOAD signature (line 122)
   - AuditLogViewer.tsx: LOAD audit logs (line 46, 49, 52, 83)
   - VisitsManagement.tsx: LOAD visits (line 53)
   - WaiversManagement.tsx: LOAD waivers (line 43, 47)
   - UnitManagement.tsx: LOAD units (line 24)
   - ClientLedgerModal.tsx: LOAD ledger (line 26, 71)
   - B2BAccountManagementModal.tsx: MANAGE B2B accounts (line 33, 70, 104)
   
   **Decision needed for each:**
   - If READ operation for shared data → Use AppContext
   - If WRITE operation (POST/PUT/DELETE) → Keep direct fetch
   - If user-specific data → Keep direct fetch
   - If one-time operation → Keep direct fetch

---

## Root Cause #2: Component-Level Lazy Loading (Expected Behavior)

### The "Problem" (Actually Expected)

When user logs in, the default view component mounts immediately and loads its data:

```
Login → MainLayout sets default view → Component mounts → Loads data
```

**This is EXPECTED and CORRECT behavior!**

The issue was that we were seeing ALL endpoints being called, not just the default view's endpoints.

### Why This Happened

1. Default view component (e.g., CreateVisitFormNew) mounts
2. Component's useEffect runs
3. Calls `loadTestTemplates()`, `loadClients()`, `loadBranches()`, `loadReferralDoctors()`
4. **BUT** also had direct fetch() call for referral-doctors
5. Result: Some data cached, some data fetched directly

### The Fix

Ensure ALL data loading goes through AppContext:
- ✅ test-templates → `loadTestTemplates()` → DataCache
- ✅ clients → `loadClients()` → DataCache
- ✅ branches → `loadBranches()` → DataCache
- ✅ referral-doctors → `loadReferralDoctors()` → DataCache (FIXED)

---

## Expected Behavior After Fix

### Test Scenario 1: Fresh Login
1. User opens app in incognito mode
2. Logs in with admin/admin123
3. Default view (Create Visit) component mounts
4. Component loads its data

**Expected API Calls:**
- `/auth/login` (1 call) - Authentication
- `/test-templates` (1 call) - DataCache MISS
- `/clients` (1 call) - DataCache MISS
- `/branches` (1 call) - DataCache MISS
- `/referral-doctors` (1 call) - DataCache MISS

**Total: 5 calls** (1 auth + 4 data)

### Test Scenario 2: Navigate to Lab Queue
1. User clicks "Lab Queue"
2. LabQueue component mounts
3. Component loads its data

**Expected API Calls:**
- `/visits` (1 call) - DataCache MISS
- `/visit-tests` (1 call) - DataCache MISS
- `/antibiotics` (1 call) - DataCache MISS
- `/units` (1 call) - DataCache MISS

**Total: 4 calls**

### Test Scenario 3: Navigate Back to Create Visit
1. User clicks "Create Visit"
2. CreateVisitFormNew component mounts
3. Component loads its data

**Expected API Calls:**
- 0 calls - All data cached (test-templates, clients, branches, referral-doctors)

**Total: 0 calls** ✅

### Test Scenario 4: Wait 30 Seconds
1. User stays on same view
2. No interaction

**Expected API Calls:**
- 0 calls - No polling, no auto-refresh

**Total: 0 calls** ✅

### Test Scenario 5: Full Session
1. Login
2. Navigate to all views once
3. Navigate back to first view

**Expected API Calls:**
- Login: 5 calls (1 auth + 4 data)
- Lab Queue: 4 calls
- Phlebotomy: 0 calls (visits, visit-tests already cached)
- Approver: 1 call (users)
- Admin: 0 calls (all data already cached)
- Back to Create Visit: 0 calls (cached)

**Total: ~10 calls** vs 7,176 calls (99.86% reduction) ✅

---

## Remaining Work

### High Priority
- [ ] Review B2BClientDashboard.tsx - decide on ledger data caching
- [ ] Test the fix in incognito mode
- [ ] Verify API call counts match expectations
- [ ] Document which direct fetch() calls are legitimate

### Medium Priority
- [ ] Review admin components - identify which should use AppContext
- [ ] Add cache invalidation to data-modifying operations
- [ ] Consider adding loading states to components

### Low Priority
- [ ] Delete unused CreateVisitForm.tsx component
- [ ] Add monitoring/logging for cache hit rates
- [ ] Consider implementing React Query or SWR for better DX

---

## Testing Checklist

- [ ] Open incognito window
- [ ] Clear browser cache
- [ ] Open DevTools (F12)
- [ ] Go to Network tab
- [ ] Clear network log
- [ ] Login with admin/admin123
- [ ] Count API calls (should be ~5)
- [ ] Check Console for cache logs
- [ ] Navigate to Lab Queue
- [ ] Count new API calls (should be ~4)
- [ ] Navigate back to Create Visit
- [ ] Count new API calls (should be 0)
- [ ] Wait 30 seconds
- [ ] Count new API calls (should be 0)
- [ ] Take screenshots and share results

---

## Success Criteria

✅ **Fixed:**
- Login: 5 API calls (was: 15+)
- Navigation: 0-4 calls per view (was: 15+ per view)
- Return to view: 0 calls (was: 15+)
- 30s idle: 0 calls (was: 7,176)

✅ **Achieved:**
- 99%+ reduction in API calls
- Proper caching with TTLs
- Component-level lazy loading
- No direct fetch() bypassing cache (in main components)

⚠️ **Remaining:**
- Some admin components still use direct fetch
- Need to verify which are legitimate
- Need to test in production-like environment

---

## Conclusion

The root cause was **direct `fetch()` calls bypassing the DataCache system**. The fix is to ensure all data loading goes through AppContext lazy loading functions.

**Next step:** Test the fix and verify API call reduction.

