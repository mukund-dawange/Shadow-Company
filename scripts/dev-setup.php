<?php
if(PHP_SAPI!=='cli')exit;
$root=dirname(__DIR__);$dir=$root.'/private';if(!is_dir($dir))mkdir($dir,0700,true);
$file=$dir.'/shadow-workspace.php';
if(!is_file($file)) {
    $config=['db_host'=>getenv('SW_DB_HOST')?:'db','db_name'=>getenv('SW_DB_NAME')?:'shadow_workspace','db_user'=>getenv('SW_DB_USER')?:'shadow_dev','db_password'=>getenv('SW_DB_PASSWORD')?:'local-development-only','force_https'=>false,'setup_token'=>bin2hex(random_bytes(24))];
    $config['db_port']=(int)(getenv('SW_DB_PORT')?:3306);
    file_put_contents($file,"<?php\nreturn ".var_export($config,true).";\n");chmod($file,0600);
}
echo "Private configuration ready. Open private/shadow-workspace.php to find your first-admin setup key. Never commit this file.\n";
