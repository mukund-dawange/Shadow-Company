<?php
// Development server: expose only the same public endpoints/assets as Apache.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if($path==='/'||$path==='/index.php'){require dirname(__DIR__).'/hostinger-single/index.php';return true;}
if($path==='/api.php'){require dirname(__DIR__).'/hostinger-single/api.php';return true;}
if(preg_match('#^/assets/(css/style\.css|js/app\.js)$#',$path))return false;
http_response_code(404);echo 'Not found';return true;
