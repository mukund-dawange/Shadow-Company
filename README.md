# Shadow Workspace — browser demo

HTML, CSS and JavaScript only. No build, PHP, SQL or package installation needed.

Use **Fill admin login**, then sign in. Create a shop, open it, and add a sample staff account. Sign out and use the **Staff portal** to test that staff account.

Sample accounts (password `Demo-access-123`):
- Admin: `admin@shadow.demo`
- Staff at Shadow Central: `staff@shadow.demo`

Data lives only in this browser's local storage. Login lasts for this tab's session. **Reset demo** restores sample accounts and shops. This is simulated authentication, not a security boundary. Do not enter real credentials, personal data or business records.

## GitHub Desktop / Pages
Review changes, commit and push to main. In GitHub repository Settings > Pages choose **Deploy from a branch**, branch **main**, folder **/ (root)**. Root index.html is the entry point; all asset paths are relative. The old PHP workflow has been removed because this repository is now static.

## Separate Hostinger application
The separate **Shadow work space** folder contains PHP/MySQL production files. Keep the visual design aligned but retain each application's API implementation. Never copy the demo adapter to Hostinger or private config/data into this repository.

Current scope: shop inventory, item creation/editing/archiving, low-stock alerts, stock adjustments with history, dedicated staff sign-in and staff dashboard, admin/shop sign-in, shop registration, search, shop details, staff accounts, team directory, sign-out. Attendance, salary, and full POS billing remain future modules.

Dedicated staff login: append `?portal=staff` to your site URL. Admins can add, edit and archive items; assigned staff can add new items, adjust stock with a reason and view history. Browser data from the earlier demo is upgraded without clearing shops or accounts.

Inventory now includes a visible Add item action on the shop header, automatic SKU generation, category/status filters, sorting, stock summaries and a receive/remove quantity preview. Creating an item clears filters so the saved item is visible. Selling-price stock value is not inventory cost or profit.


## Unique shop links and Inventory Tracker
Use Copy link in the shop list or Copy shop link in a shop. Links use `#shop/<id>/inventory` and open the assigned workspace after sign-in; each section also has its own URL. The demo link works only with shops saved in that browser. Sharing a custom demo shop URL does not share its browser-local records with another person; Hostinger uses the shared database.

The tracker includes Items, Stock updates, Sales report and Product sales. Record sale saves a single-product entry, deducts stock, and logs the adjustment. Reports filter by business date and show sales revenue, units and product totals. Historical sale prices stay unchanged when item prices change. Only assigned staff or admins can record sales. Editing/archiving items remains admin-only.

Default reporting dates use IST. Sale details show the latest 500 matching entries; aggregates cover the whole selected period. Archived products remain in reports. Revenue is not profit. Returns, cancellations, taxes, discounts and multi-item receipts are not included yet. Stock corrections are separate from sales. The static demo simulates these rules; use PHP/MySQL for real shared records.
