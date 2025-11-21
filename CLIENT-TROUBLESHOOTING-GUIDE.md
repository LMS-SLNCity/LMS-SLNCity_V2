# Client-Side Troubleshooting Guide (LMS-SLNCity)

Audience: **Junior frontend devs** working on the LMS React/Vite client.

Goal: Help you quickly debug and fix the most common client-side issues when something “suddenly breaks”, especially after security hardening.

---

## 1. First Checks for Any Client Issue

Before diving deep, always confirm these basics:

1. **Is the backend running and reachable?**
   - Open the browser dev tools → Network tab.
   - Reload the app.
   - Check if requests to `/api/...` are:
     - Actually going out (no `ERR_CONNECTION_REFUSED` / `CORS error`).
     - Returning expected HTTP codes (e.g. `200`, not `500` or `404`).

2. **Is the API base URL correct?**
   - The client uses `VITE_API_URL` to build the API URL.
   - In `api/client.ts`:
     - `API_BASE_URL = ${VITE_API_URL}/api` (or `http://localhost:5002/api` fallback).
   - If you see requests going to the wrong host/port:
     - Check `.env` (local) or deployment config and fix `VITE_API_URL`.

3. **Any obvious console errors?**
   - Open dev tools → Console.
   - Note: type errors, CORS errors, `Failed to fetch`, and `Token verification failed` are common.

If these three look wrong, fix them first; they cause most “nothing works” situations.

---

## 2. Login / Session Issues

### 2.1 Symptoms

- Login form submits but you stay on the login page.
- You get redirected back to login after refresh.
- API requests return `401 Unauthorized`.

### 2.2 How login is supposed to work

- `AuthContext` calls `apiClient.login(username, password)`.
- Backend returns `{ token, user }` on success.
- `AuthContext` stores `token` in **`sessionStorage.authToken`** only (not `localStorage`).
- On app load, `AuthContext`:
  - Reads `authToken` from `sessionStorage`.
  - Decodes the JWT and decides which verify endpoint to call.
  - Calls `POST /auth/verify` (staff) or `/auth/verify-client` (B2B).
  - If verify passes, sets `user` in context and keeps you logged in.

### 2.3 Steps to debug

1. **Check the Network tab on login**
   - Look for `POST /auth/login`.
   - Confirm:
     - Status is `200`.
     - Response body has `token` and `user`.
   - If status is `4xx` or `5xx`, the problem is **backend/auth**, not the client.

2. **Check token storage**
   - After successful login, open dev tools → Application → Storage → Session Storage.
   - Confirm key `authToken` exists and looks like `xxxxx.yyyyy.zzzzz` (JWT format).
   - If it doesn’t exist:
     - Put a breakpoint or `console.log` in `AuthContext.login` where it calls `sessionStorage.setItem('authToken', ...)`.
     - Confirm `response.token` is defined and is a string.

3. **Check session restore on page refresh**
   - After logging in, refresh the page.
   - Watch the Network tab:
     - You should see `POST /auth/verify` or `/auth/verify-client`.
   - If you see `401` there:
     - Token is invalid/expired or backend secret changed.
     - Clear `sessionStorage.authToken` manually and try logging in again.

4. **Common mistakes**
   - `VITE_API_URL` points to an instance that uses a different `JWT_SECRET` → tokens become invalid after deployment.
   - Manual changes in `AuthContext` that skip calling `sessionStorage.setItem` or change the key name.

---

## 3. 401 / 403 Errors on API Calls

### 3.1 Where auth headers come from

- All authenticated calls go through `api/client.ts`.
- Function `getAuthHeaders()` builds headers:
  - Uses `sessionStorage.getItem('authToken')` (and currently also `localStorage` – this may be tightened later).
  - Adds `Authorization: Bearer <token>` if present.

### 3.2 Debug steps

1. **Check the actual request headers**
   - Network tab → click the failing request → Headers.
   - Confirm `Authorization: Bearer ...` is present.
   - If missing:
     - Check that `authToken` exists in `sessionStorage`.
     - Check that you are using `apiClient` and not bypassing it with a raw `fetch`.

2. **Check the response**
   - `401 Unauthorized`:
     - Usually means token invalid/expired or not sent.
   - `403 Forbidden`:
     - Means you are authenticated but don’t have the right role/permission.
     - Check the logged-in user’s `role` and `permissions` from `AuthContext`.

3. **Quick resets to try**
   - Logout from the app (which will call `/auth/logout` and clear `sessionStorage`).
   - Manually clear `sessionStorage.authToken` if logout is broken.
   - Login again and re-test the failing API.

---

## 4. CORS or Network Errors

### Symptoms

- Console shows `CORS error`.
- Network tab shows `OPTIONS` request failing or `ERR_CONNECTION_REFUSED`.

### Checklist

1. **Host & port**
   - Confirm backend is listening on the host/port you set in `VITE_API_URL`.
   - From the browser, open the API URL directly (e.g. `http://localhost:5002/health`).

2. **CORS configuration (backend)**
   - In development, backend usually allows `http://localhost:5173` (Vite).
   - In production, it must allow the actual frontend origin (e.g. `https://lab.yourdomain.in`).
   - If you changed frontend URL, you must update backend CORS origins as well.

3. **Mixed content / HTTPS**
   - In production, if frontend is `https://` and backend is `http://`, the browser may block requests.
   - Use HTTPS for backend too, or terminate TLS at a reverse proxy (nginx/ALB) and use that URL in `VITE_API_URL`.

---

## 5. State / UI Not Updating After API Calls

### Symptoms

- API call succeeds (status 200), but UI doesn’t change.
- Lists (patients, visits, audit logs, etc.) don’t refresh after create/update.

### Checklist

1. **Check the API client call**
   - Confirm you are using the correct `apiClient` method (e.g. `apiClient.createPatient`).
   - Confirm you `await` the promise and handle the returned data.

2. **Check state updates**
   - After a successful call, the component must:
     - Either refetch the list (e.g. call `apiClient.getPatients()` again), or
     - Optimistically update local state (e.g. append the new record).
   - If you only call the API but never update state, UI will appear “stuck”.

3. **Look for swallowed errors**
   - Many `apiClient` methods throw `new Error('Failed to ...')` when response is not `ok`.
   - If your component doesn’t catch this, the promise rejection may show only in console.
   - Add `try/catch` around `await apiClient...` and show a toast or error message.

---

## 6. AuthContext-Specific Pitfalls

The `AuthContext` is central to login/session behavior. Common mistakes:

1. **Changing the storage key**
   - Must remain `authToken` unless you update both:
     - `AuthContext` (where it reads/writes the token).
     - `api/client.ts` (where it reads the token for headers).

2. **Breaking the initial `useEffect`**
   - The session restore logic runs once on mount and handles:
     - Decoding JWT.
     - Choosing `/auth/verify` vs `/auth/verify-client`.
     - Setting `user` and `isLoading`.
   - If you remove or change this effect, you can get stuck on a blank page or be constantly redirected.

3. **Forgetting to handle `isLoading`**
   - Components that assume `user` is immediately available on first render can crash.
   - Use `isLoading` to show a spinner or guard routes until auth state is known.

---

## 7. When Only One Feature is Broken

If a single area (e.g. patients, visits, reports) is failing while others work:

1. **Check the corresponding `apiClient` method**
   - Confirm the URL matches the backend route.
   - Ensure it passes the right HTTP method (`GET`, `POST`, `PATCH`, `DELETE`).

2. **Compare with a working feature**
   - For example, if `getPatients` works but `createPatient` fails, compare their headers and payloads.

3. **Check backend route security changes**
   - Some routes may now require extra permissions (e.g. SUDO/ADMIN).
   - Confirm the logged-in user’s role has the right permissions.

---

## 8. General Debugging Tips

- **Log the minimal necessary**
  - Use `console.log` for values and branches while debugging.
  - Remove or reduce logs before committing, especially ones that log tokens or passwords (never log those).

- **Use the browser network inspector heavily**
  - It’s your best tool to see exactly what was sent and received.

- **Reproduce with a fresh session**
  - Clear `sessionStorage`.
  - Hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`).
  - Login again and reproduce.

---

## 9. When to Escalate to a Senior Dev

Escalate when:

- You see repeated `CORS` or mixed-content errors even after checking origins and URLs.
- Tokens are valid on backend (tested via Postman) but frontend still can’t stay logged in.
- A change in security (new middleware, stricter roles) breaks multiple features and you’re not sure how they map to permissions.

When escalating, include:

- Screenshot or copy of the **Network** tab for the failing request.
- Response status code, response body, and request headers (especially `Authorization`).
- Any relevant logs from `AuthContext` or the component.
- The current value of `VITE_API_URL` in your environment.

