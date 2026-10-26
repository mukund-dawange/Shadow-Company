<?php
if(PHP_SAPI!=='cli')exit;
require dirname(__DIR__).'/hostinger-single/bootstrap.php';
$db=sw_db();
foreach(explode(';',file_get_contents(dirname(__DIR__).'/hostinger-single/database.sql')) as $sql)if(trim($sql)!=='')$db->exec($sql);
echo "Database schema ready. Existing records preserved.\n";
