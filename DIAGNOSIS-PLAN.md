# 🔍 DIAGNOSIS & FIX PLAN FOR EXCESSIVE API CALLS

## Current Situation
- **Problem**: Still seeing excessive API calls (all endpoints being called on login)
- **Expected**: 1 API call on login (auth only), then lazy load per component
- **Actual**: All endpoints loading immediately

---

## Phase 1: DIAGNOSIS (Find Root Cause)

### Step 1.1: Check What's Actually Happening
**Actions:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Clear network log
4. Login with admin/admin123
5. **IMMEDIATELY** check what's being called

**Questions to Answer:**
- Are API calls happening during login or after?
- Which endpoints are being called?
- Are they being called once or multiple times?
- What's the timing between calls?

### Step 1.2: Check Console Logs
**Look for:**
- `🚀 AppContext initialized` - Should appear once
- `📦 [Component]: Loading required data...` - Should appear when component mounts
- `🔄 Cache MISS` or `✅ Cache HIT` - Shows if caching is working
- Any errors or warnings

### Step 1.3: Identify the Culprit
**Possible causes:**
1. **AppContext useEffect still loading data** - Check if removed properly
2. **Default view component mounting immediately** - Expected, but should be controlled
3. **Multiple components mounting at once** - Check component tree
4. **reloadData() being called somewhere** - Search for calls
5. **useEffect dependencies causing re-renders** - Check dependency arrays

---

## Phase 2: ROOT CAUSE ANALYSIS

### Hypothesis 1: Default View Loads Immediately
**Problem:** When user logs in, MainLayout sets a default view, which immediately mounts that component, which loads its data.

**Evidence to check:**
- Does the default view component mount immediately after login?
- Is this causing the data load?

**If TRUE:**
- This is actually EXPECTED behavior
- The issue is that we're seeing ALL endpoints, not just the default view's endpoints
- Need to verify which component is the default and what data it needs

### Hypothesis 2: Multiple Components Mounting
**Problem:** Multiple components might be mounting at the same time.

**Evidence to check:**
- Are multiple `📦 [Component]: Loading required data...` logs appearing?
- Are different components' data being loaded simultaneously?

**If TRUE:**
- Check why multiple components are mounting
- Check component tree structure
- May need to prevent pre-rendering of hidden components

### Hypothesis 3: Old Code Still Running
**Problem:** Old eager loading code might still be present somewhere.

**Evidence to check:**
- Search codebase for `reloadData()` calls
- Check if AppContext useEffect is truly empty
- Check for any polling or intervals

**If TRUE:**
- Remove all old loading code
- Ensure only component-level loading exists

---

## Phase 3: SOLUTION STRATEGIES

### Strategy A: Delay Component Data Loading
**Approach:** Don't load data immediately when component mounts. Wait for user interaction.

**Implementation:**
```typescript
// Instead of loading on mount:
useEffect(() => {
  loadData();
}, []);

// Load on first interaction or after a delay:
const [dataLoaded, setDataLoaded] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => {
    if (!dataLoaded) {
      loadData();
      setDataLoaded(true);
    }
  }, 500); // 500ms delay
  
  return () => clearTimeout(timer);
}, []);
```

**Pros:**
- Gives user time to see the UI before data loads
- Reduces perceived load time

**Cons:**
- Data might not be ready when user needs it
- More complex code

### Strategy B: Load Data on User Interaction
**Approach:** Only load data when user actually interacts with the component.

**Implementation:**
```typescript
const [dataLoaded, setDataLoaded] = useState(false);

const handleFirstInteraction = () => {
  if (!dataLoaded) {
    loadData();
    setDataLoaded(true);
  }
};

// Attach to first input focus, button click, etc.
```

**Pros:**
- Truly lazy - only loads when needed
- Minimal API calls

**Cons:**
- User might experience delay on first interaction
- More complex UX

### Strategy C: Conditional Rendering
**Approach:** Don't render components until they're actually needed.

**Implementation:**
```typescript
// In MainLayout:
{currentView === 'reception' && <CreateVisitFormNew />}
{currentView === 'lab' && <LabQueue />}
// etc.
```

**Pros:**
- Components only mount when view is active
- Clean separation

**Cons:**
- Might already be implemented
- Need to verify

### Strategy D: Single Global Data Loader
**Approach:** Load ALL data once, but ONLY when explicitly requested.

**Implementation:**
```typescript
// In AppContext:
const [dataLoaded, setDataLoaded] = useState(false);

const loadAllData = async () => {
  if (dataLoaded) return;
  
  // Load all data
  await Promise.all([
    loadTestTemplates(),
    loadClients(),
    // ... etc
  ]);
  
  setDataLoaded(true);
};

// Expose to components:
return { ...state, loadAllData, dataLoaded };

// In MainLayout or first component:
useEffect(() => {
  // Only load when user is ready
  const timer = setTimeout(() => {
    loadAllData();
  }, 1000);
  
  return () => clearTimeout(timer);
}, []);
```

**Pros:**
- Simple to implement
- One-time load
- All data available after load

**Cons:**
- Still loads all data (but controlled)
- Not truly lazy

---

## Phase 4: RECOMMENDED SOLUTION

Based on the problem description, I recommend **Strategy C + Strategy A**:

### Step 4.1: Verify Conditional Rendering
Ensure components are only rendered when their view is active.

### Step 4.2: Add Loading Delay
Add a small delay before components load their data to prevent immediate API calls.

### Step 4.3: Add Loading State
Show loading indicators while data is being fetched.

### Step 4.4: Implement Request Debouncing
Ensure multiple rapid view changes don't trigger multiple loads.

---

## Phase 5: IMPLEMENTATION CHECKLIST

- [ ] **Diagnosis Complete**: Identified exact cause of excessive API calls
- [ ] **Solution Selected**: Chose appropriate strategy based on diagnosis
- [ ] **Code Changes**: Implemented solution
- [ ] **Testing**: Verified API calls are reduced
- [ ] **Documentation**: Updated test guide
- [ ] **Commit**: Pushed changes to git

---

## Phase 6: TESTING PROTOCOL

### Test 1: Login Only
1. Clear browser cache
2. Open DevTools Network tab
3. Login
4. **Wait 5 seconds without moving mouse**
5. Count API calls

**Expected:** 1 call (auth only)
**If more:** Diagnosis failed, need to investigate further

### Test 2: First View Load
1. After login, wait for default view to appear
2. Count API calls

**Expected:** 4-6 calls (only for that view's data)
**If more:** Multiple components loading, need to fix

### Test 3: View Navigation
1. Click to different view
2. Count new API calls

**Expected:** 4-6 calls (only for new view's data)
**If more:** Old view still loading, need to fix

### Test 4: Return to Previous View
1. Click back to first view
2. Count new API calls

**Expected:** 0 calls (cached)
**If more:** Caching not working, need to fix

---

## Next Steps

1. **Run Diagnosis** (Phase 1)
2. **Analyze Results** (Phase 2)
3. **Choose Solution** (Phase 3)
4. **Implement** (Phase 4)
5. **Test** (Phase 6)
6. **Iterate** if needed

**Let's start with Phase 1 - I need you to:**
1. Open http://localhost:3000 in incognito
2. Open DevTools (F12)
3. Go to Network tab
4. Clear network log
5. Login with admin/admin123
6. Take a screenshot of Network tab showing all requests
7. Take a screenshot of Console tab showing all logs
8. Share both screenshots

This will help me identify the exact root cause and implement the correct fix.

