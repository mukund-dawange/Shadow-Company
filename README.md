# Shadow Workspace — browser demo

HTML, CSS and JavaScript only. No PHP or SQL runs in this repository. The separate Shadow work space folder contains the Hostinger PHP/MySQL application.

## Admin shop websites and tools
The admin directory shows a website card for every shop. Click its preview to open that shop website in a new tab. **Manage** opens its inventory, reports and staff inside the admin panel. **Copy link** copies the shop-specific login URL.

**Customise login** opens an editor with a live preview. Edit the page name, headline, welcome message, one of six accent colours, and light/dark appearance. Changes apply after saving and update the card preview too. The shop name, login credentials and admin login page stay unchanged. Shop/staff accounts cannot use the editor.

**Demo data** is an admin-only tool that creates one labelled sample shop with five products, stock history and three sales. Repeating the action opens the same sample shop; existing shops and records are never reset. It creates no login accounts: use **Set shop login** when you want to test that sample shop's website. The old public Reset demo button has been removed.

## Interface
The minimal interface uses warm white surfaces, charcoal text, muted green accents and inline line icons. Login pages, admin and shop navigation, inventory, reports, account pages and dialogs share the same design. It adapts to narrow screens; data tables scroll within their own containers. There are no external fonts or icon dependencies.

## Sign-in and shops
The main index.html page is for administrators only. Each shop has a separate shop.html?shop=<id> login page showing its own name and its dedicated sign-in screen. Only its shop account and assigned staff can sign in there; admin accounts and accounts from other shops are rejected. Existing credentials remain unchanged. No passwords or quick-fill credentials appear on either page.

The administrator must enter a unique shop login ID and password when creating a shop. Its login link becomes available automatically: open the shop and select **Copy shop login link**. Admin and individual shop sessions are separate, so signing out of one leaves the others signed in. Existing shops without credentials have a **Set shop login** action. Shop credentials open only that shop. Staff accounts remain separate. Only the administrator can create shops/accounts and edit/archive item details. Password reset is not included yet.

Shop IDs accept 3–60 letters, numbers, dots, underscores and hyphens. Passwords use 10–72 bytes. Passwords are not shown after saving. Shop accounts are excluded from staff counts.

Previously shared links to index.html#shop/<id>/... now open the admin entry. Copy a new shop login link for staff. Invalid shop links show an error instead of the admin page.

Shop and staff accounts see only their own shop menu. The workspace shop list and global Team directory are admin-only. Empty, invalid or other-shop hash links return shop users to their assigned shop overview.

## Inventory Tracker
Each shop has a unique login link such as `shop.html?shop=1#shop/1/inventory`, plus a scrollable left menu for Overview, Items, Stock updates, Sales report, Product sales, Team and My account.

Add items, generate SKU codes, filter/sort inventory, record stock adjustments, inspect history, and record single-product sales that reduce stock. Date-filtered reports show units and revenue by product. Sale prices are preserved when catalog prices change. Sale details are limited to the latest 500 entries; totals include all matching entries. Default dates use IST. Revenue is not profit. Returns, tax invoices, discounts, cancellations and multi-item receipts are future work.

## Demo limitations
Data is stored only in this browser. A link does not share custom demo shop records with another browser. This is simulated authentication; source code and local data can be inspected and changed. Use sample data only. Hiding credentials from the login screen does not turn a public static website into a secure backend. Hostinger PHP/MySQL is the real shared-data version.

## Publishing
Review changes in GitHub Desktop, commit, then push. GitHub Pages should publish main / root with index.html as its entry point. All asset paths are relative. No build or ZIP is needed.
