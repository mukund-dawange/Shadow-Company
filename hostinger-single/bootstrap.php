<?php
declare(strict_types=1);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
function sw_config(): array {
    static $config;
    if ($config !== null) return $config;
    $file = getenv('SW_CONFIG_FILE') ?: (is_file(dirname(__DIR__).'/private/shadow-workspace.php') ? dirname(__DIR__).'/private/shadow-workspace.php' : __DIR__.'/config.php');
    $config = is_file($file) ? require $file : [];
    foreach (['db_host'=>'SW_DB_HOST','db_port'=>'SW_DB_PORT','db_name'=>'SW_DB_NAME','db_user'=>'SW_DB_USER','db_password'=>'SW_DB_PASSWORD','setup_token'=>'SW_SETUP_TOKEN','force_https'=>'SW_FORCE_HTTPS'] as $key=>$env) {
        if (getenv($env)!==false) $config[$key]=getenv($env);
    }
    return $config;
}
function sw_db(): PDO {
    static $db;
    if ($db) return $db;
    $c=sw_config();
    if (empty($c['db_name']) || empty($c['db_user'])) sw_fail(503,'Database setup is incomplete. Follow the installation guide.');
    $db=new PDO('mysql:host='.($c['db_host']??'localhost').';port='.(int)($c['db_port']??3306).';dbname='.$c['db_name'].';charset=utf8mb4', $c['db_user'], $c['db_password']??'', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
    $db->exec("SET time_zone = '+00:00'");
    return $db;
}
function sw_query(string $sql, array $args=[]): PDOStatement {
    $s=sw_db()->prepare($sql);$s->execute($args);return $s;
}
function sw_fail(int $status,string $message): never { throw new RuntimeException($message,$status); }
function sw_headers(): void {
    header('X-Content-Type-Options: nosniff');header('Referrer-Policy: same-origin');
    header("Content-Security-Policy: default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    header('Cache-Control: no-store');
}
function sw_https(): bool { return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off') || ($_SERVER['HTTP_X_FORWARDED_PROTO']??'')==='https'; }
function sw_session(): void {
    if (filter_var(sw_config()['force_https']??true,FILTER_VALIDATE_BOOLEAN) && !sw_https()) sw_fail(400,'HTTPS is required. Enable SSL on your hosting.');
    ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');
    session_name('shadow_session');
    session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>sw_https(),'httponly'=>true,'samesite'=>'Lax']);
    session_start();
    if (isset($_SESSION['expires']) && $_SESSION['expires']<time()) { $_SESSION=[]; session_regenerate_id(true); }
    $_SESSION['csrf']??=bin2hex(random_bytes(32));
}
function sw_public_user(array $u): array { return ['id'=>(int)$u['id'],'name'=>$u['name'],'email'=>$u['email'],'role'=>$u['role']]; }
function sw_user(): ?array {
    if (!isset($_SESSION['user_id'])) return null;
    $u=sw_query('SELECT id,name,email,role FROM sw_users WHERE id=?',[$_SESSION['user_id']])->fetch();
    return $u ? sw_public_user($u) : null;
}
function sw_signin(array $u): void {
    session_regenerate_id(true);$_SESSION=['user_id'=>(int)$u['id'],'expires'=>time()+86400,'csrf'=>bin2hex(random_bytes(32))];
}
function sw_text(mixed $value,int $max): string { return is_string($value) ? mb_substr(trim($value),0,$max) : ''; }
function sw_credentials(array $b): array {
    $name=sw_text($b['name']??'',80);$email=strtolower(sw_text($b['email']??'',254));$password=$b['password']??'';
    // PASSWORD_DEFAULT currently uses bcrypt; enforce its 72-byte input limit.
    if (!$name || !filter_var($email,FILTER_VALIDATE_EMAIL) || !is_string($password) || strlen($password)<10 || strlen($password)>72 || str_contains($password,"\0")) sw_fail(400,'Enter a name, valid email, and password of 10–72 bytes.');
    return [$name,$email,$password];
}
function sw_rate(string $scope): void {
    $key=hash('sha256',$scope.'|'.($_SERVER['REMOTE_ADDR']??'unknown'));$now=time();
    sw_query('INSERT INTO sw_login_attempts(bucket,attempts,expires) VALUES(?,1,?) ON DUPLICATE KEY UPDATE attempts=IF(expires<?,1,attempts+1), expires=IF(expires<?,?,expires)',[$key,$now+900,$now,$now,$now+900]);
    if ((int)sw_query('SELECT attempts FROM sw_login_attempts WHERE bucket=?',[$key])->fetchColumn()>20) sw_fail(429,'Too many attempts. Try again in 15 minutes.');
    sw_query('DELETE FROM sw_login_attempts WHERE expires<?',[$now]);
}
