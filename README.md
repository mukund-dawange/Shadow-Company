# Shadow Workspace — browser demo

HTML, CSS and JavaScript only. No PHP or SQL runs in this repository. The separate Shadow work space folder contains the Hostinger PHP/MySQL application.

## Sign-in and shops
The main index.html page is for administrators only. Each shop has a separate shop.html?shop=<id> login page showing its own name and a distinct green design. Only its shop account and assigned staff can sign in there; admin accounts and accounts from other shops are rejected. Existing credentials remain unchanged. No passwords or quick-fill credentials appear on either page.

The administrator must enter a unique shop login ID and password when creating a shop. Its login link becomes available automatically: open the shop and select **Copy shop login link**. Admin and individual shop sessions are separate, so signing out of one leaves the others signed in. Existing shops without credentials have a **Set shop login** action. Shop credentials open only that shop. Staff accounts remain separate. Only the administrator can create shops/accounts and edit/archive item details. Password reset is not included yet.

Shop IDs accept 3–60 letters, numbers, dots, underscores and hyphens. Passwords use 10–72 bytes. Passwords are not shown after saving. Shop accounts are excluded from staff counts.

Previously shared links to index.html#shop/<id>/... now open the admin entry. Copy a new shop login link for staff. Invalid shop links show an error instead of the admin page.

Shop and staff accounts see only their own shop menu. The workspace shop list and global Team directory are admin-only. Empty, invalid or other-shop hash links return shop users to their assigned shop overview.

## Inventory Tracker
Each shop has a unique login link such as `shop.html?shop=1#shop/1/inventory`, plus a scrollable left menu for Overview, Items, Stock updates, Sales report, Product sales, Team and My account.

Add items, generate SKU codes, filter/sort inventory, record stock adjustments, inspect history, and record single-product sales that reduce stock. Date-filtered reports show units and revenue by product. Sale prices are preserved when catalog prices change. Sale details are limited to the latest 500 entries; totals include all matching entries. Default dates use IST. Revenue is not profit. Returns, tax invoices, discounts, cancellations and multi-item receipts are future work.

## Demo limitations
Data is stored only in this browser. A link does not share custom demo shop records with another browser. Reset demo clears local records and restores sample data. This is simulated authentication; source code and local data can be inspected and changed. Use sample data only. Hiding credentials from the login screen does not turn a public static website into a secure backend. Hostinger PHP/MySQL is the real shared-data version.

## Publishing
Review changes in GitHub Desktop, commit, then push. GitHub Pages should publish main / root with index.html as its entry point. All asset paths are relative. No build or ZIP is needed.
