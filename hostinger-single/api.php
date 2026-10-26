<?php
declare(strict_types=1);
require __DIR__.'/bootstrap.php';
sw_headers();header('Content-Type: application/json; charset=utf-8');
function reply(array $data,int $status=200): never { http_response_code($status);echo json_encode($data,JSON_THROW_ON_ERROR);exit; }
try {
    sw_session();$db=sw_db();$route=trim((string)($_GET['r']??''),'/');$method=$_SERVER['REQUEST_METHOD'];$body=[];
    if (!in_array($method,['GET','POST'],true)) sw_fail(405,'Method not allowed.');
    if ($method==='POST') {
        if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json')) sw_fail(415,'JSON is required.');
        if (!hash_equals($_SESSION['csrf'],(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''))) sw_fail(403,'Your session has changed. Refresh the page and try again.');
        $raw=file_get_contents('php://input',false,null,0,16385);if(strlen($raw)>16384)sw_fail(413,'Request too large.');
        $body=json_decode($raw,true);if(!is_array($body))sw_fail(400,'Invalid request.');
    }
    $user=sw_user();
    if ($route==='session' && $method==='GET') reply(['user'=>$user,'csrf'=>$_SESSION['csrf'],'configured'=>(bool)sw_query("SELECT id FROM sw_users WHERE role='admin' LIMIT 1")->fetchColumn()]);
    if ($route==='setup' && $method==='POST') {
        sw_rate('setup');$expected=(string)(sw_config()['setup_token']??'');
        if (strlen($expected)<24 || $expected==='REPLACE_WITH_RANDOM_SETUP_KEY' || !hash_equals($expected,(string)($body['setupToken']??''))) sw_fail(403,'Enter the private setup key from your configuration.');
        [$name,$email,$password]=sw_credentials($body);$db=sw_db();$db->beginTransaction();
        sw_query("SELECT setting_value FROM sw_settings WHERE setting_key='admin_setup' FOR UPDATE");
        if(sw_query("SELECT id FROM sw_users WHERE role='admin' LIMIT 1")->fetchColumn())sw_fail(403,'Admin account already exists.');
        sw_query("INSERT INTO sw_users(name,email,password_hash,role) VALUES(?,?,?,'admin')",[$name,$email,password_hash($password,PASSWORD_DEFAULT)]);
        $u=sw_query('SELECT id,name,email,role FROM sw_users WHERE id=?',[$db->lastInsertId()])->fetch();
        sw_query("UPDATE sw_settings SET setting_value='complete' WHERE setting_key='admin_setup'");$db->commit();sw_signin($u);reply(['user'=>sw_public_user($u),'csrf'=>$_SESSION['csrf']],201);
    }
    if ($route==='login' && $method==='POST') {
        sw_rate('login');$email=strtolower(sw_text($body['email']??'',254));$password=$body['password']??'';
        $u=sw_query('SELECT * FROM sw_users WHERE email=?',[$email])->fetch();
        $dummy='$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
        if (!is_string($password) || strlen($password)>72 || str_contains($password,"\0") || !password_verify($password,$u['password_hash']??$dummy) || !$u)sw_fail(401,'Email or password is incorrect.');
        if(password_needs_rehash($u['password_hash'],PASSWORD_DEFAULT))sw_query('UPDATE sw_users SET password_hash=? WHERE id=?',[password_hash($password,PASSWORD_DEFAULT),$u['id']]);
        sw_signin($u);reply(['user'=>sw_public_user($u),'csrf'=>$_SESSION['csrf']]);
    }
    if (!$user)sw_fail(401,'Please sign in.');
    if ($route==='logout' && $method==='POST') { $_SESSION=[];session_regenerate_id(true);$_SESSION['csrf']=bin2hex(random_bytes(32));reply(['ok'=>true,'csrf'=>$_SESSION['csrf']]); }
    if ($route==='shops' && $method==='GET') {
        $sql='SELECT s.*, (SELECT COUNT(*) FROM sw_memberships m WHERE m.shop_id=s.id) AS staffCount FROM sw_shops s';
        $rows=$user['role']==='admin'?sw_query($sql.' ORDER BY s.id DESC')->fetchAll():sw_query($sql.' WHERE EXISTS(SELECT 1 FROM sw_memberships a WHERE a.shop_id=s.id AND a.user_id=?) ORDER BY s.id DESC',[$user['id']])->fetchAll();
        foreach($rows as &$s){$s['id']=(int)$s['id'];$s['staffCount']=(int)$s['staffCount'];}unset($s);reply(['shops'=>$rows]);
    }
    if($method==='POST' && $user['role']!=='admin')sw_fail(403,'Only the admin can make this change.');
    if($route==='shops' && $method==='POST') {
        $name=sw_text($body['name']??'',80);if(!$name)sw_fail(400,'Shop name is required.');
        sw_query('INSERT INTO sw_shops(name,location,description) VALUES(?,?,?)',[$name,sw_text($body['location']??'',200),sw_text($body['description']??'',1000)]);reply(['id'=>(int)sw_db()->lastInsertId()],201);
    }
    if(preg_match('#^shops/(\d+)(/staff)?$#',$route,$m)) {
        $id=(int)$m[1];$shop=sw_query('SELECT * FROM sw_shops WHERE id=?',[$id])->fetch();if(!$shop)sw_fail(404,'Shop not found.');
        if($user['role']!=='admin' && !sw_query('SELECT 1 FROM sw_memberships WHERE shop_id=? AND user_id=?',[$id,$user['id']])->fetchColumn())sw_fail(403,'You do not have access to this shop.');
        if($method==='GET' && !isset($m[2])) reply(['shop'=>$shop,'staff'=>sw_query('SELECT u.id,u.name,u.email FROM sw_users u JOIN sw_memberships m ON m.user_id=u.id WHERE m.shop_id=?',[$id])->fetchAll()]);
        if($method==='POST' && isset($m[2])) {
            [$name,$email,$password]=sw_credentials($body);
            if(sw_query('SELECT id FROM sw_users WHERE email=?',[$email])->fetchColumn())sw_fail(409,'This email already has an account. Use a different email.');
            sw_db()->beginTransaction();sw_query("INSERT INTO sw_users(name,email,password_hash,role) VALUES(?,?,?,'staff')",[$name,$email,password_hash($password,PASSWORD_DEFAULT)]);
            sw_query('INSERT INTO sw_memberships(user_id,shop_id) VALUES(?,?)',[sw_db()->lastInsertId(),$id]);sw_db()->commit();reply(['ok'=>true],201);
        }
    }
    sw_fail(404,'Not found.');
} catch(Throwable $e) {
    try{if(isset($db) && $db->inTransaction())$db->rollBack();}catch(Throwable){}
    if($e instanceof PDOException){error_log($e->getMessage());reply(['error'=>'Database is unavailable or not initialized. Follow the installation guide.'],503);}
    $status=$e->getCode();if(!is_int($status)||$status<400||$status>503){error_log($e->getMessage());$status=500;}
    reply(['error'=>$status===500?'Something went wrong. Please try again.':$e->getMessage()],$status);
}
