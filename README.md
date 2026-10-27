# Shadow Workspace — browser demo

HTML, CSS and JavaScript only. No build, PHP, SQL or package installation needed.

Use **Fill admin login**, then sign in. Create a shop, open it, and add a sample staff account. Sign out and use the **Shop portal** to test that staff account.

Sample accounts (password `Demo-access-123`):
- Admin: `admin@shadow.demo`
- Staff at Shadow Central: `staff@shadow.demo`

Data lives only in this browser's local storage. Login lasts for this tab's session. **Reset demo** restores sample accounts and shops. This is simulated authentication, not a security boundary. Do not enter real credentials, personal data or business records.

## GitHub Desktop / Pages
Review changes, commit and push to main. In GitHub repository Settings > Pages choose **Deploy from a branch**, branch **main**, folder **/ (root)**. Root index.html is the entry point; all asset paths are relative. The old PHP workflow has been removed because this repository is now static.

## Separate Hostinger application
The separate **Shadow work space** folder contains PHP/MySQL production files. Keep the visual design aligned but retain each application's API implementation. Never copy the demo adapter to Hostinger or private config/data into this repository.

Current scope: admin/shop sign-in, shop registration, search, shop details, staff accounts, team directory, sign-out. Inventory, attendance, salary and POS are future modules.
