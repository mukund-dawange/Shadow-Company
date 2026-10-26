<?php
// Copy to ../private/shadow-workspace.php (preferred), or config.php.
return [
    'db_host' => 'localhost',
    'db_port' => 3306,
    'db_name' => 'YOUR_DATABASE_NAME',
    'db_user' => 'YOUR_DATABASE_USER',
    'db_password' => 'YOUR_DATABASE_PASSWORD',
    'force_https' => true,
    // Run: php -r "echo bin2hex(random_bytes(24));"
    // Keep this private. Required only when creating the first administrator.
    'setup_token' => 'REPLACE_WITH_RANDOM_SETUP_KEY',
];
