<?php
declare(strict_types=1);
// Run against a NEW, isolated test database. Does not erase existing records.
$base=rtrim($argv[1]??'http://127.0.0.1:8080','/');$passed=0;
function check(bool $condition,string $label): void { global $passed;if(!$condition)throw new RuntimeException('FAIL: '.$label);$passed++;echo "PASS: $label\n"; }
function call_api(array &$client,string $route,?array $body=null,bool $csrf=true): array {
    global $base;
    $headers=['Accept: application/json'];if(isset($client['cookie']))$headers[]='Cookie: '.$client['cookie'];
    if($body!==null){$headers[]='Content-Type: application/json';if($csrf)$headers[]='X-CSRF-Token: '.($client['csrf']??'');}
    $context=stream_context_create(['http'=>['method'=>$body===null?'GET':'POST','header'=>implode("\r\n",$headers),'content'=>$body===null?'':json_encode($body),'ignore_errors'=>true,'timeout'=>10]]);
    $text=file_get_contents($base.'/api.php?r='.rawurlencode($route),false,$context);
    $status=0;foreach($http_response_header??[] as $h){if(preg_match('#^HTTP/\S+ (\d+)#',$h,$m))$status=(int)$m[1];if(preg_match('/^Set-Cookie: ([^;]+)/i',$h,$m))$client['cookie']=$m[1];}
    $data=json_decode((string)$text,true,512,JSON_THROW_ON_ERROR);if(isset($data['csrf']))$client['csrf']=$data['csrf'];
    return ['status'=>$status,'data'=>$data];
}
$admin=[];$staff=[];$anon=[];
for($i=0;$i<30;$i++){if(@file_get_contents($base.'/')!==false)break;usleep(200000);}
$state=call_api($admin,'session');check($state['status']===200,'Session endpoint');
if($state['data']['configured'])throw new RuntimeException('Use a fresh test database. Existing installation was not modified.');
check(call_api($anon,'shops')['status']===401,'Anonymous access denied');
$account=['name'=>'QA Admin','email'=>'admin@example.test','password'=>'Test-admin-12345','setupToken'=>getenv('SW_SETUP_TOKEN')?:'integration-test-setup-key-only'];
check(call_api($admin,'setup',$account,false)['status']===403,'CSRF required for setup');
check(call_api($admin,'setup',array_merge($account,['setupToken'=>'wrong']))['status']===403,'Wrong setup key rejected');
check(call_api($admin,'setup',$account)['status']===201,'Admin created');
check(call_api($admin,'setup',$account)['status']===403,'Second admin setup denied');
check(call_api($admin,'shops',['name'=>' '])['status']===400,'Empty shop rejected');
$shop=call_api($admin,'shops',['name'=>'QA Central','location'=>'Bengaluru','description'=>'Testing shop isolation']);check($shop['status']===201,'Shop created');$id=$shop['data']['id'];
$other=call_api($admin,'shops',['name'=>'QA North']);check($other['status']===201,'Second shop created');
$member=['name'=>'QA Staff','email'=>'staff@example.test','password'=>'Test-staff-12345'];
check(call_api($admin,"shops/$id/staff",array_merge($member,['password'=>'short']))['status']===400,'Short password rejected');
check(call_api($admin,"shops/$id/staff",$member)['status']===201,'Staff account created');
check(call_api($admin,"shops/$id/staff",$member)['status']===409,'Duplicate account rejected');
call_api($staff,'session');
check(call_api($staff,'login',['email'=>$member['email'],'password'=>'wrong'])['status']===401,'Wrong password rejected');
$login=call_api($staff,'login',$member);check($login['status']===200,'Staff sign-in');check(!isset($login['data']['user']['password_hash']),'Password hashes never returned');
$list=call_api($staff,'shops')['data']['shops'];check(count($list)===1&&(int)$list[0]['id']===$id,'Only assigned shop listed');
check(call_api($staff,"shops/$id")['status']===200,'Assigned shop opens');
check(call_api($staff,'shops/'.$other['data']['id'])['status']===403,'Unassigned shop denied');
check(call_api($staff,'shops',['name'=>'Forbidden'])['status']===403,'Staff cannot create shop');
check(call_api($staff,"shops/$id/staff",$member)['status']===403,'Staff cannot create accounts');
check(call_api($admin,'shops',['name'=>'CSRF'],false)['status']===403,'CSRF required for shop changes');
$old=$staff;check(call_api($staff,'logout',[])['status']===200,'Logout');check(call_api($old,'shops')['status']===401,'Old session invalidated');
$fresh=[];call_api($fresh,'session');check(call_api($fresh,'login',$account)['status']===200,'Admin sign-in from new session');check(count(call_api($fresh,'shops')['data']['shops'])===2,'Data persists across sessions');
foreach(['/config.php','/database.sql','/bootstrap.php','/.env'] as $path){@file_get_contents($base.$path);$h=$http_response_header[0]??'';check(str_contains($h,'404')||str_contains($h,'403'),'Private file blocked: '.$path);}
require dirname(__DIR__).'/hostinger-single/bootstrap.php';
$hash=sw_query('SELECT password_hash FROM sw_users WHERE email=?',[$member['email']])->fetchColumn();check($hash!==$member['password']&&password_verify($member['password'],$hash),'Passwords hashed in MySQL');
// Assert the persistent database throttle blocks attempts even across fresh sessions.
$limited=[];call_api($limited,'session');$result=[];for($i=0;$i<22;$i++)$result=call_api($limited,'login',['email'=>'nobody@example.test','password'=>'bad']);check($result['status']===429,'Login rate limit enforced');
echo "\n$passed checks passed.\n";
