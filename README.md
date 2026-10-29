# Shadow Workspace — browser demo

HTML, CSS and JavaScript only. This repository is the GitHub Pages demo. The separate Shadow work space folder contains the PHP/MySQL version for Hostinger.

## Three panels

| Panel | Entry | Responsibilities |
| --- | --- | --- |
| DEV | `index.html` or `dev.html` | Create offices and owner logins, manage all offices, suspend/reactivate access, reset owner passwords and generate demo data. |
| ADMIN | `admin.html?office=1` | One owner per office. Manage that office's staff, products, stock, sales, reports, profile and login design. Cannot create offices. |
| OFFICE | `office.html?office=1` | Assigned staff. Add products, update stock, record sales, view reports/team and manage their own password. |

Replace `1` with the office ID. The DEV directory shows a website card for each office. Click its preview to open the owner ADMIN login; choose **Manage** to work in that office from DEV. **Admin link** and **Office link** provide the separate owner and staff URLs.

Existing browser data is preserved. The previous main administrator becomes DEV, each shop becomes an office, and its shop account becomes the office ADMIN. Existing staff, credentials, inventory, stock history, sales and branding are kept. Older sessions are signed out once, so sign in again with the same credentials. Legacy `shop.html?shop=1` links now open the owner ADMIN page, with a link to the staff sign-in screen.

## Office controls

- Office creation is DEV-only and requires a unique owner login ID and password. Older offices without credentials have **Set owner login**.
- Owners create staff with email/password, disable/re-enable their access, and reset staff passwords. Owner password resets and office suspension are DEV-only.
- **My account** lets each user change their password with the current password. Other sessions for the account are revoked. Manager resets revoke all sessions for the target account.
- **Office settings** includes name, location, description, owner login information and both portal links.
- **Customise login** edits the page name, headline, welcome message, accent colour and light/dark design with a live preview. The design applies to that office's ADMIN and OFFICE login pages. DEV retains its fixed design.
- **Activity log** gives DEV and the owner the latest 100 events for the office. It includes product, stock, sale, profile and access changes, without logging credentials.
- **Demo data** is visible only in DEV. It creates one separate labelled sample office with five products, stock history and three sales. Repeating the action opens the same sample office and leaves other offices untouched. Set its owner login separately if required.

Accounts are restricted to their assigned panel and office. DEV, owners and staff have separate sessions. Invalid or foreign office links cannot reveal other offices through the demo API. Owners cannot create offices or access platform controls; staff cannot manage users, branding, office settings or activity logs. DEV and owners may edit/archive products; staff may add products and update stock.

## Inventory and reports

Whole-unit inventory supports SKU generation, search/filter/sort, low-stock alerts, adjustments and history. Recording a single-product sale reduces stock and keeps the original sale price. Reports show date-filtered units and revenue by product, including archived products. Sale lists show up to 500 records; totals include all matching sales. Default dates follow India time. Revenue is not profit. Returns, cancellations, tax invoices, discounts and multi-item receipts are not included yet.

## Demo limitations

Data is saved only in this browser. Sharing a link does not transfer custom demo offices to another browser or to Hostinger. This is simulated authentication: source code and local browser records can be inspected or changed. Use sample data only. The PHP/MySQL application provides the real server-enforced permissions and shared database.

## Publish and preview

Review the direct file changes in GitHub Desktop, commit, then push. Publish GitHub Pages from main / root, with `index.html` as the entry. All assets use relative paths; no build or ZIP is required. For local testing, serve this folder over HTTP rather than opening HTML through file://.
