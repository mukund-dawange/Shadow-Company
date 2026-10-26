# Shadow Workspace — PHP + MySQL

Admin login, multiple shops, shop workspaces, staff logins assigned to one shop, and a team directory. This is the PHP/MySQL successor to the Node prototype. No Node.js server, npm build, or framework is needed in production.

The structure follows Pocket Finance's Hostinger layout: `hostinger-single/` contains PHP entry points, a shared `bootstrap.php`, `database.sql`, a private configuration example, and browser assets. Pocket Finance's financial features and data are not included.

## Test and debug on GitHub

**Use Codespaces, not GitHub Pages.** Codespaces runs PHP and MariaDB and provides a working browser preview. Pages cannot run PHP or a database.

1. Extract the release ZIP. Upload its CONTENTS to the root of your repository. Include `.devcontainer`, `.github`, and `.gitignore`; these may be hidden in your file manager. The root should contain this README and `hostinger-single`, not another enclosing folder.
2. In the repository select **Code → Codespaces → Create codespace on main**. Codespaces usage depends on your GitHub allowance/billing. No Codespace has been created by this package.
3. Wait for container setup. It provisions PHP 8.3, MariaDB 11.4, initializes the schema without deleting existing records, and starts the website.
4. Open the **Ports** tab, find **8080 / Shadow Workspace**, and choose **Open in Browser**. Keep port visibility **Private**. The preview URL ends in `app.github.dev`, not `github.io`.
5. In the Codespaces editor open the ignored `private/shadow-workspace.php` file. Copy its `setup_token` into the website's **Private setup key** field and create your own admin account. There are no preconfigured admin passwords.
6. Create a shop, open it, and add a staff account. Sign out and test the staff login. Staff see only their assigned shop.

The same application files run in Codespaces and Hostinger. Codespaces keeps its development database in a Docker volume. Stop/start preserves it; deleting the Codespace can delete its database. Export anything you need to keep before deleting a Codespace. The preview is available while the Codespace runs.

### Debugging

- Application log: `.runtime/php.log` (never committed).
- Restart preview: stop the PHP process and run `bash scripts/start-preview.sh`.
- Reapply schema safely: `php scripts/migrate.php` (initial tables only; future schema changes require migrations).
- PHP syntax: `find hostinger-single scripts tests -name '*.php' -print0 | xargs -0 -n1 php -l`.
- GitHub **Actions → PHP and database checks** runs API/security tests against an isolated MySQL 8 database on pushes and pull requests. Tests never use the Codespaces working database.
- If Actions are disabled in your account, enable workflows in the repository. The workflow needs the `.github/workflows/php-tests.yml` file in the repository root.
- For integration tests locally, point the `SW_DB_*` environment variables at a fresh isolated database, set `SW_SETUP_TOKEN`, migrate it, start PHP, then run `php tests/integration.php http://127.0.0.1:8080`. Tests refuse an installation that already has an admin. Do not run against real records.

## Move to Hostinger when ready

Use a PHP hosting plan with MySQL/MariaDB and PHP 8.3+ (PDO MySQL and mbstring enabled).

1. Create a new database and database user in hPanel. Import `hostinger-single/database.sql` via phpMyAdmin for a fresh installation. For a transfer of test data, export your Codespaces database and import that SQL instead. Never upload SQL dumps containing user records to a public repository or web directory.
2. Upload the CONTENTS of `hostinger-single/` to `public_html/`, including `.htaccess` and `.user.ini`. Do not upload the development scripts, tests, `.devcontainer`, or private database backups.
3. Copy `config.example.php` to a private file named `private/shadow-workspace.php` next to `public_html/`. Fill in Hostinger's database name/user/password and host. If that location is unavailable, use `public_html/config.php`; the included `.htaccess` denies HTTP access to it. Do not commit either config file.
4. Set a random private `setup_token` of at least 24 characters. Generate one with `php -r "echo bin2hex(random_bytes(24));"`. Keep `force_https` enabled and enable your SSL certificate.
5. Visit the domain and create your first admin account using that key. If you imported an existing database, sign in with its existing account instead. Setup is locked once an admin exists.
6. Check admin login, create/open shop, staff login, denied access to other shops, and logout on the live domain. This hosting verification is still required even though no language conversion is needed.

Only configuration, files, and the SQL database move; business logic does not need rewriting. Relative asset and API paths also support installation under a subfolder.

## Security and data

PHP password hashing, prepared PDO queries, regenerated server-side sessions, CSRF tokens for writes, HTTPS cookies, a persistent login throttle, and server-side admin/shop authorization are included. Only the web port is forwarded from Codespaces; the database has no published port. Development-only database passwords in Compose and CI are not production credentials.

Keep configuration, backups, and real account data out of GitHub even if your repository is private. Data is stored in MySQL/MariaDB, not browser storage or source files.

The previous local Node/SQLite application and its records are preserved separately. This PHP version starts with a new database; its existing users/shops have not been automatically migrated. Old scrypt passwords need a planned migration or password resets before retiring the prototype.

## Current scope

One administrator, multiple shops, and staff assigned to one shop each. Further shop workflows, account editing, password recovery, and multi-shop staff assignment can be added later. This package prepares Codespaces and Hostinger deployment; it does not claim either remote deployment has already been run.
