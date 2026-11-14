# Web Vulnerability Detection and Fixing

A university cybersecurity project in which our team detects, demonstrates, fixes and re-tests 12 web application vulnerabilities in a deliberately vulnerable Node.js application, running locally in Docker.

> ⚠️ **For education only.** This application contains intentional security vulnerabilities. Run it only on your own machine or in an isolated VM. Never deploy it to a public server.

## Team

| Name | Student ID | Focus area |
|---|---|---|
| Amr Hosni | 200064 | Injection |
| Momen Amin | 241492 | Access Control |
| Bashar Zain | 249625 | Data Exposure |
| Ahmed Ramadan | 245882 | Authentication and Client-Side |

## Project Goal

For each vulnerability in our scope, we:

1. **Detect** the vulnerability and locate the vulnerable code.
2. **Demonstrate** that it exists, with evidence (screenshots or logs).
3. **Fix** it with an appropriate security control.
4. **Re-test** with the same method to prove the fix works.

Every vulnerability in our scope leads to unauthorized access to, or exposure of, user data, so the project also looks at each one from a **data privacy** angle.

## Scope: 12 Vulnerabilities

Numbers refer to the sections in [`CHALLENGES.md`](CHALLENGES.md).

| # | Vulnerability | Owner | Status |
|---|---|---|---|
| 1 | SQL Injection | Amr Hosni | ⬜ To do |
| 2 | NoSQL Injection | Amr Hosni | ⬜ To do |
| 3 | OS Command Injection | Amr Hosni | ⬜ To do |
| 15 | IDOR (Insecure Direct Object Reference) | Momen Amin | ⬜ To do |
| 18 | Vertical Access Control (Privilege Escalation) | Momen Amin | ⬜ To do |
| 19 | Horizontal Access Control | Momen Amin | ⬜ To do |
| 26 | Information Disclosure | Bashar Zain | ⬜ To do |
| 27 | Sensitive Data Exposure (Password Hashes) | Bashar Zain | ⬜ To do |
| 51 | Missing Security Headers | Bashar Zain | ⬜ To do |
| 16 | JWT "none" Algorithm | Ahmed Ramadan | ⬜ To do |
| 17 | Weak JWT Secret | Ahmed Ramadan | ⬜ To do |
| 21 | Cross-Site Scripting (XSS) | Ahmed Ramadan | ⬜ To do |

Update the status to ✅ **Fixed** when your fix is merged.

## Tech Stack

- **Backend:** Node.js, Express
- **Frontend:** Svelte
- **Databases:** MongoDB, MySQL
- **Environment:** Docker, Docker Compose

## Getting Started

### Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop) (running, with "Engine running" shown)
- [Git](https://git-scm.com/downloads)

### Run the application

```bash
git clone https://github.com/basharzin/dvws-node.git
cd dvws-node
docker compose up --build
```

Wait for `All services listening at http://127.0.0.1`, then open:

| URL | What it is |
|---|---|
| http://localhost | The web application (login: `test` / `test`) |
| http://localhost/api-docs | API documentation (Swagger) |

Stop the app with `Ctrl + C`, or `docker compose down`.
Use `--build` again after any code change so the fix is included.

## Team Workflow

1. Create a branch for your vulnerability:
   ```bash
   git checkout -b fix/<vulnerability-name>
   ```
2. Confirm the vulnerability and take a **"before"** screenshot.
3. Find the vulnerable code in `src/`.
4. Apply the fix and rebuild with `docker compose up --build`.
5. Repeat the same test and take an **"after"** screenshot.
6. Fill in your section in `docs/fixes/` using the template below.
7. Commit, push and open a Pull Request:
   ```bash
   git add .
   git commit -m "Fix <vulnerability> (#<number>)"
   git push origin fix/<vulnerability-name>
   ```

## Fix Report Template

Copy this for each vulnerability:

```markdown
## #<number> <Vulnerability name>

- **Owner:**
- **Location:** endpoint and file (e.g. `GET /api/v1/info`, `src/controllers/notes.js`)
- **Severity:** Low / Medium / High / Critical
- **Data privacy impact:** what user data is exposed and to whom

### Evidence (before)
<screenshot>

### Root cause
<what is wrong in the code>

### Fix
<code before and after>

### Verification (after)
<screenshot showing the same test now fails>
```

## Credits and License

This project is built on [DVWS-node](https://github.com/snoopysecurity/dvws-node) by snoopysecurity, an intentionally vulnerable application for security training. The original application and our modifications are distributed under the [GNU GPL v3.0](LICENSE).
