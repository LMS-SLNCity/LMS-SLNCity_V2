# Testing Browser and HTTP Caching

## Quick Test (5 minutes)

### Step 1: Clear Everything
1. Open http://localhost:3000
2. Open **DevTools** (F12 or Cmd+Option+I)
3. Go to **Network** tab
4. Check **"Disable cache"** is **UNCHECKED** (we want to test caching!)
5. Click **Clear** button to clear network log
6. Go to **Console** tab
7. Clear console
8. Go to **Application** tab → **Local Storage** → http://localhost:3000
9. Delete `lms_app_data_cache` and `lms_app_data_cache_timestamp` if they exist

---

### Step 2: First Login (Should Load Data)
1. Go back to **Network** tab
2. Login with `admin` / `admin123`
3. **Wait 30 seconds** without clicking anything
4. Check Network tab:
   - ✅ Should see **8-12 API calls** (one-time load)
   - ✅ Should see ~2-3 MB transferred
   - ✅ Calls: test-templates, users, clients, referral-doctors, branches, antibiotics, units, visits, visit-tests

5. Check Console tab:
   - ✅ Should see: `🔄 Loading fresh data from API...`
   - ✅ Should see: `✅ Data cached successfully`

6. Check Application → Local Storage:
   - ✅ Should see `lms_app_data_cache` (large JSON object)
   - ✅ Should see `lms_app_data_cache_timestamp` (timestamp number)

---

### Step 3: Refresh Page (Should Use Cache)
1. Clear Network tab (click Clear button)
2. **Refresh page** (Cmd+R or Ctrl+R) - **NOT hard refresh!**
3. Login again with `admin` / `admin123`
4. Check Network tab:
   - ✅ Should see **0 API calls** to data endpoints
   - ✅ Only auth call should be made
   - ✅ Total data transfer < 1 KB

5. Check Console tab:
   - ✅ Should see: `✅ Using cached data (age: X seconds)`

---

### Step 4: Navigate Between Views (Should Use Cache)
1. Clear Network tab
2. Click **Create Visit**
3. Check Network tab:
   - ✅ Should see **0 API calls**

4. Click **Lab Queue**
5. Check Network tab:
   - ✅ Should see **0 API calls**

6. Click **Dashboard**
7. Check Network tab:
   - ✅ Should see **0 API calls** (except maybe dashboard stats)

---

### Step 5: Wait 5 Minutes (Cache Should Expire)
1. Wait 5 minutes (or change timestamp in Local Storage to simulate)
2. Clear Network tab
3. Refresh page
4. Login again
5. Check Network tab:
   - ✅ Should see **8-12 API calls** (cache expired, loading fresh)

6. Check Console tab:
   - ✅ Should see: `🔄 Loading fresh data from API...`
   - ✅ Should see: `✅ Data cached successfully`

---

### Step 6: Create a Visit (Should Invalidate Cache)
1. After cache is loaded, create a new visit
2. Fill in patient details and select tests
3. Click **Create Visit**
4. Check Console tab:
   - ✅ Should see: `🗑️ Cache invalidated`

5. Refresh page and login
6. Check Network tab:
   - ✅ Should see **8-12 API calls** (cache was invalidated)

---

## Expected Results Summary

| Action | API Calls | Data Transfer | Console Log |
|--------|-----------|---------------|-------------|
| **First Login** | 8-12 | 2-3 MB | 🔄 Loading fresh data |
| **Refresh (< 5 min)** | 0 | < 1 KB | ✅ Using cached data |
| **Navigation** | 0 | 0 KB | - |
| **Refresh (> 5 min)** | 8-12 | 2-3 MB | 🔄 Loading fresh data |
| **After Create Visit** | 2 | 0.5 MB | 🗑️ Cache invalidated |

---

## HTTP Caching Test

### Check Cache-Control Headers
1. Open Network tab
2. Clear cache and hard refresh (Cmd+Shift+R)
3. Login
4. Click on any API call (e.g., `test-templates`)
5. Check **Response Headers**:
   - ✅ Should see: `Cache-Control: public, max-age=3600`
   - ✅ Should see: `Expires: [future date]`

6. Click on `visits` call
7. Check Response Headers:
   - ✅ Should see: `Cache-Control: public, max-age=60`

---

## Troubleshooting

### Problem: Still seeing many API calls

**Solution 1: Check "Disable cache" is unchecked**
- DevTools → Network tab
- Make sure "Disable cache" checkbox is **UNCHECKED**

**Solution 2: Clear localStorage**
- DevTools → Application → Local Storage
- Delete `lms_app_data_cache` and `lms_app_data_cache_timestamp`
- Refresh page

**Solution 3: Check console for errors**
- DevTools → Console
- Look for any errors related to localStorage or caching

---

### Problem: Not seeing cache logs in console

**Solution: Check console filters**
- Make sure "All levels" is selected
- Make sure no filters are applied
- Look for logs with emojis: 🔄, ✅, 🗑️

---

### Problem: Cache not expiring after 5 minutes

**Solution: Manually test expiration**
1. DevTools → Application → Local Storage
2. Click on `lms_app_data_cache_timestamp`
3. Change the value to: `1000000000000` (old timestamp)
4. Refresh page
5. Should load fresh data

---

## Performance Comparison

### Before Caching (Your Screenshot)
- **30 seconds idle**: 7,176 requests, 18.9 MB transferred
- **Requests**: test-templates (multiple), users (multiple), clients (multiple), etc.
- **Problem**: Same endpoints called repeatedly

### After Caching (Expected)
- **30 seconds idle**: 0 requests, 0 MB transferred
- **First load**: 8-12 requests, 2-3 MB transferred
- **Subsequent loads**: 0 requests, 0 MB transferred
- **Improvement**: 99%+ reduction in API calls

---

## Cost Comparison

### Before Caching
- **Daily**: 37,400 API calls, 69 GB data
- **Cost**: $6.37/day, $2,325/year

### After Caching
- **Daily**: ~1,000 API calls, 0.3 GB data
- **Cost**: $0.10/day, $37/year
- **Savings**: $2,288/year (98.4% reduction)

---

## Next Steps

1. ✅ Test with the steps above
2. ✅ Verify cache is working
3. ✅ Check console logs
4. ✅ Monitor Network tab
5. 📊 Use `tests/api-monitor.html` for detailed analysis
6. 🧪 Run Playwright tests: `npx playwright test tests/api-performance.spec.ts`
7. 📈 Monitor in production with CloudWatch

---

## Production Monitoring

Once deployed to AWS, monitor:

1. **CloudWatch Metrics**:
   - API Gateway request count
   - Data transfer out
   - Average response time

2. **Set Alerts**:
   - Alert if > 10,000 requests/hour
   - Alert if > 5 GB/day data transfer
   - Alert if > $10/day cost

3. **Weekly Review**:
   - Check API call trends
   - Review cache hit rates
   - Optimize cache durations if needed

---

**Report any issues or unexpected behavior!**

