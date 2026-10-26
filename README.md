# Shopspace

A standalone multi-shop workspace. Requires Node.js 24 or newer. No npm dependencies are needed.

## Start

Run `npm start` in this folder and open http://127.0.0.1:4310.
Create the first admin account on the setup screen. There are no default credentials.

1. Create as many shops as needed from the Shops panel.
2. Open a shop and select **Add staff**. Set a name, email, and password.
3. Share the credentials privately. Staff use the same login page and can only access their assigned shop.

The first release includes an admin, multiple shops, a team directory, and individual staff accounts. Each staff account belongs to one shop. Business workflows inside shops are intentionally reserved for the next phase.

## Data and authentication

SQLite data is in `data/workspace.sqlite`, excluded from source control. Keep this directory to preserve accounts and shops. Use SQLite-aware backups when the application is running. Passwords use salted scrypt hashes. Sessions are random tokens whose hashes are stored server-side; cookies are HttpOnly and SameSite=Strict, with a one-day expiration. API routes enforce admin permissions and staff shop membership. Login attempts are limited per IP.

`npm test` checks setup, sign-in, duplicate account rejection, shop creation, staff isolation, CSRF origin checks, logout, and persistence across restart using a temporary database.

## Hosting

This release runs locally and has not been deployed. A production host must support a persistent Node.js process and persistent SQLite storage. Keep the app bound to loopback behind an HTTPS reverse proxy and set `COOKIE_SECURE=1`. Complete first-admin setup locally before exposing the service. `PORT` and `DATA_DIR` are configurable environment variables. Do not store the database in an ephemeral deployment directory. For production concurrency, use a dedicated persistent data directory rather than a synced OneDrive folder.

Sites hosting uses ChatGPT sign-in, so it was not used for the requested email/password login. Staff on other devices will need the application deployed to an appropriate host. Password reset, account editing/revocation, invitations, multi-shop staff assignment, and business modules are not part of this initial release.
