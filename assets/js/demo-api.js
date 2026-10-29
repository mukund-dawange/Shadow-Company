/* Demo only. Browser roles and data can be changed by anyone using browser tools. */
(() => {
'use strict';
const KEY='shadow-workspace-demo-v1', SESSION=KEY+'-session';
const roleOf=u=>(u.role==='admin'||u.role==='dev')&&u.account_type!=='shop'&&u.account_type!=='office_admin'?'dev':['shop','office_admin'].includes(u.account_type)?'admin':'staff';
const publicUser=u=>({id:u.id,name:u.name,email:u.email,role:roleOf(u),account_type:roleOf(u)==='admin'?'office_admin':roleOf(u),office_id:roleOf(u)==='dev'?null:u.shopId,enabled:u.enabled!==false});
const manager=u=>['dev','admin'].includes(roleOf(u));
const defaultAppearance=()=>({page_name:'',headline:'',welcome_message:'',accent:'forest',theme:'light'});
const nextId=rows=>Math.max(0,...rows.map(x=>Number(x.id)||0))+1;
function audit(db,u,officeId,action,details=''){db.activity.push({id:nextId(db.activity),office_id:officeId,actor_id:u.id,actor:u.name,action,details,created_at:new Date().toISOString()});}
function passwordValue(value){const bytes=typeof value==='string'?new TextEncoder().encode(value).length:0;if(bytes<10||bytes>72||value.includes('\0'))fail('Password must contain 10–72 bytes.');return value;}
function migrate(db){
 db.items??=[];db.events??=[];db.sales??=[];db.activity??=[];db.appearances??={};
 for(const u of db.users){u.enabled??=true;u.session_version??=1;}
 for(const s of db.shops)s.status??='active';
 return db;
}
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const fail=message=>{throw Error(message)};
const text=(v,n)=>String(v??'').trim().slice(0,n);
function shopCredentials(body){const id=String(body.login_id??'').trim().toLowerCase(),password=body.login_password;const bytes=typeof password==='string'?new TextEncoder().encode(password).length:0;if(!/^[a-z0-9][a-z0-9._-]{2,59}$/.test(id))fail('Office Admin login ID must contain 3–60 letters, numbers, dots, underscores or hyphens.');if(bytes<10||bytes>72||password.includes('\0'))fail('Office Admin password must contain 10–72 bytes.');return {id,password};}
const save=db=>localStorage.setItem(KEY,JSON.stringify(db));
async function read(){
 const raw=localStorage.getItem(KEY);
 if(raw){try{const db=JSON.parse(raw);if(db.version!==1||!Array.isArray(db.users)||!Array.isArray(db.shops))throw Error();migrate(db);save(db);return db}catch{fail('Demo data could not be read. Ask your administrator to recover this browser’s demo data.')}}
 const passwordHash=await hash('Demo-access-123');
 const db={version:1,users:[
 {id:1,name:'Demo Administrator',email:'admin@shadow.demo',role:'admin',passwordHash},
 {id:2,name:'Aarav Shah',email:'staff@shadow.demo',role:'staff',shopId:1,passwordHash},
 {id:3,name:'Priya Mehta',email:'priya@shadow.demo',role:'staff',shopId:2,passwordHash}
 ],shops:[
 {id:1,name:'Shadow Central',location:'Pune · Main Street',description:'Our flagship shop and its dedicated team.'},
 {id:2,name:'Shadow Market',location:'Mumbai · Market Road',description:'A neighborhood shop with room to grow.'},
 {id:3,name:'Shadow Studio',location:'Nashik · College Road',description:'Your next location, ready for its first team member.'}
 ],items:[
{id:1,shop_id:1,name:'Classic Notebook',sku:'NOTE-001',category:'Stationery',price:85,quantity:24,minimum_stock:5,archived:0},
{id:2,shop_id:1,name:'Blue Ballpoint Pen',sku:'PEN-001',category:'Stationery',price:15,quantity:3,minimum_stock:10,archived:0},
{id:3,shop_id:2,name:'Canvas Tote',sku:'BAG-001',category:'Accessories',price:250,quantity:12,minimum_stock:3,archived:0}
],events:[],sales:[]};migrate(db);save(db);return db;
}
async function request(path,body,scopeShop=null,portal=scopeShop===null?'dev':'admin'){
 const db=await read();let loginShop=null;
 if(!['dev','admin','office'].includes(portal)||(portal==='dev'&&scopeShop!==null)||(portal!=='dev'&&scopeShop===null))fail('This login portal is not valid.');
 if(scopeShop!==null){if(!Number.isSafeInteger(scopeShop)||scopeShop<1)fail('This office login link is not valid.');loginShop=db.shops.find(s=>s.id===scopeShop);if(!loginShop)fail('This office login link is not valid.');}
 const sessionKey=SESSION+'-roles-v2-'+portal+(scopeShop===null?'':'-'+scopeShop);
 const allowed=u=>portal==='dev'?roleOf(u)==='dev':u.shopId===scopeShop&&roleOf(u)===(portal==='admin'?'admin':'staff');
 let session=null;try{session=JSON.parse(sessionStorage.getItem(sessionKey)||'null')}catch{sessionStorage.removeItem(sessionKey)}
 let user=session&&db.users.find(u=>u.id===session.id);
 if(user&&(!allowed(user)||user.enabled===false||user.session_version!==session.version||!session.expires||session.expires<Date.now()||(loginShop&&loginShop.status!=='active'))){sessionStorage.removeItem(sessionKey);user=null;}
 const signin=u=>sessionStorage.setItem(sessionKey,JSON.stringify({id:u.id,version:u.session_version,expires:Date.now()+86400000}));
 if(path==='session'&&!body)return {configured:true,user:user?publicUser(user):null,shop:loginShop?{id:loginShop.id,name:loginShop.name,status:loginShop.status}:null,appearance:loginShop?(db.appearances[loginShop.id]||defaultAppearance()):null};
 if(path==='login'&&body){
  const account=db.users.find(u=>u.email===text(body.identifier??body.email,254).toLowerCase());
  if(!account||typeof body.password!=='string'||account.passwordHash!==await hash(body.password))fail('Login ID or password is incorrect.');
  if(!allowed(account))fail('This account cannot sign in here. Use your own DEV, ADMIN or OFFICE login page.');
  if(account.enabled===false)fail('This account is disabled. Contact your administrator.');
  if(loginShop&&loginShop.status!=='active')fail('This office is suspended. Contact the DEV team.');
  signin(account);audit(db,account,scopeShop,'account.signed_in','Signed in to '+portal+' panel');save(db);return {user:publicUser(account)};
 }
 if(!user)fail('Please sign in.');
 const isDev=roleOf(user)==='dev';
 const scopedRoute=/^shops\/(\d+)(?:\/|$)/.exec(path);
 if(scopeShop!==null&&scopedRoute&&Number(scopedRoute[1])!==scopeShop)fail('This session belongs to another office.');
 if(path==='logout'&&body){sessionStorage.removeItem(sessionKey);return {ok:true}}
 if(path==='account/password'&&body){
  if(typeof body.current_password!=='string'||await hash(body.current_password)!==user.passwordHash)fail('Current password is incorrect.');
  const password=passwordValue(body.new_password);user.passwordHash=await hash(password);user.session_version++;
  audit(db,user,user.shopId??null,'account.password_changed','Changed own password');save(db);signin(user);return {ok:true};
 }
 const control=/^shops\/(\d+)\/(status|profile|activity|owner\/password|staff\/(\d+)\/(access|password))$/.exec(path);
 if(control){
  const id=Number(control[1]),shop=db.shops.find(s=>s.id===id);if(!shop)fail('Office not found.');
  if(!manager(user)||(!isDev&&user.shopId!==id))fail('Only the office Admin or DEV team can manage this office.');
  const action=control[2];
  if(action==='activity'&&!body)return {events:db.activity.filter(e=>e.office_id===id).sort((a,b)=>b.id-a.id).slice(0,100)};
  if(!body)fail('Method not allowed.');
  if(action==='status'){
   if(!isDev)fail('Only DEV can change office status.');if(!['active','suspended'].includes(body.status))fail('Choose active or suspended.');
   if(shop.status!==body.status){shop.status=body.status;for(const member of db.users.filter(u=>u.shopId===id))member.session_version++;audit(db,user,id,'office.status_changed','Office status: '+body.status);save(db);}return {ok:true,status:shop.status};
  }
  if(action==='profile'){
   const name=text(body.name,80);if(!name)fail('Office name is required.');Object.assign(shop,{name,location:text(body.location,200),description:text(body.description,1000)});audit(db,user,id,'office.profile_updated','Updated office profile');save(db);return {ok:true};
  }
  let target;
  if(action==='owner/password'){if(!isDev)fail('Only DEV can reset an office owner password.');target=db.users.find(u=>u.shopId===id&&roleOf(u)==='admin');if(!target)fail('This office has no owner login yet.');}
  else{target=db.users.find(u=>u.id===Number(control[3])&&u.shopId===id&&roleOf(u)==='staff');if(!target)fail('Staff account not found in this office.');}
  if(control[4]==='access'){
   if(typeof body.enabled!=='boolean')fail('Choose an enabled or disabled account status.');
   target.enabled=body.enabled;target.session_version++;audit(db,user,id,'staff.access_changed',(target.enabled?'Enabled ':'Disabled ')+target.name);save(db);return {ok:true};
  }
  target.passwordHash=await hash(passwordValue(body.new_password));target.session_version++;
  audit(db,user,id,action==='owner/password'?'owner.password_reset':'staff.password_reset','Reset password for '+target.name);save(db);return {ok:true};
 }
 if(path==='admin/demo-data'){
  if(!isDev)fail('Only DEV can add demo data.');
  if(!body)fail('Method not allowed.');
  const existing=db.shops.find(s=>s.id===db.demoShopId);if(existing)return {id:existing.id,created:false};
  const id=Math.max(0,...db.shops.map(s=>s.id))+1;db.shops.push({id,name:'Demo office',location:'Sample location',description:'Sample inventory and sales for testing. No login accounts are created automatically.',status:'active'});
  const products=[['Classic Notebook','DEMO-NOTE','Stationery',85,26,5],['Blue Ballpoint Pen','DEMO-PEN','Stationery',15,6,10],['Canvas Tote','DEMO-TOTE','Accessories',250,13,3],['Steel Bottle','DEMO-BOTTLE','Accessories',450,0,3],['Desk Organiser','DEMO-DESK','Stationery',320,4,5]],ids=[];
  for(const [name,sku,category,price,quantity,minimum_stock] of products){const itemId=Math.max(0,...db.items.map(i=>i.id))+1;ids.push(itemId);db.items.push({id:itemId,shop_id:id,name,sku,category,price,quantity,minimum_stock,archived:0});db.events.push({item_id:itemId,delta:quantity,reason:'Demo opening stock',actor:user.name,created_at:new Date().toISOString()});}
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  for(const [index,qty,days] of [[0,2,0],[1,3,0],[2,1,1]]){const item=db.items.find(i=>i.id===ids[index]),saleId=Math.max(0,...db.sales.map(s=>s.id))+1,date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-days);db.sales.push({id:saleId,shop_id:id,item_id:item.id,user_id:user.id,request_key:crypto.randomUUID(),item_name:item.name,sku:item.sku,quantity:qty,unit_price:item.price.toFixed(2),total:(item.price*qty).toFixed(2),sale_date:date.toISOString().slice(0,10),note:'Demo sale',actor:user.name});item.quantity-=qty;db.events.push({item_id:item.id,delta:-qty,reason:'Demo sale',actor:user.name,created_at:new Date().toISOString()});}
  db.demoShopId=id;audit(db,user,id,'office.demo_created','Created a sample office with inventory and sales');save(db);return {id,created:true};
 }
 const appearanceRoute=/^shops\/(\d+)\/appearance$/.exec(path);
 if(appearanceRoute){
  if(!manager(user))fail('Only the office Admin or DEV team can customise login pages.');
  const id=Number(appearanceRoute[1]);if(!db.shops.some(s=>s.id===id))fail('Office not found.');
  db.appearances??={};
  if(body){const a={};for(const [field,limit] of Object.entries({page_name:80,headline:120,welcome_message:240})){const value=body[field]??'';if(typeof value!=='string'||Array.from(value.trim()).length>limit)fail('Check the length of your login-page text.');a[field]=value.trim();}a.accent=body.accent??'forest';a.theme=body.theme??'light';if(!['forest','indigo','ocean','rose','amber','graphite'].includes(a.accent)||!['light','dark'].includes(a.theme))fail('Choose a listed colour and appearance.');db.appearances[id]=a;audit(db,user,id,'office.appearance_updated','Updated login-page design');save(db);}
  return {appearance:db.appearances[id]||defaultAppearance()};
 }
 const salesRoute=/^shops\/(\d+)\/(sales|reports\/([0-9-]+)\/([0-9-]+))$/.exec(path);
 if(salesRoute){
 const shopId=Number(salesRoute[1]);if(!db.shops.some(s=>s.id===shopId))fail('Office not found.');
 if(!isDev&&user.shopId!==shopId)fail('You do not have access to this office.');
 const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>='2000-01-01'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(salesRoute[2]==='sales'&&body){
 const itemId=Number(body.item_id),qty=Number(body.quantity),date=body.sale_date,key=body.request_key;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(!Number.isSafeInteger(itemId)||itemId<1||!/^\d+$/.test(String(body.quantity))||!Number.isSafeInteger(qty)||qty<1||qty>1000000||!validDate(date)||date>today||typeof key!=='string'||!/^[a-f0-9-]{36}$/.test(key))fail('Choose an item, a positive whole quantity and a valid sale date (not in the future).');
 const existing=db.sales.find(s=>s.shop_id===shopId&&s.request_key===key);if(existing)return {id:existing.id,duplicate:true};
 const item=db.items.find(i=>i.id===itemId&&i.shop_id===shopId&&!i.archived);if(!item)fail('Item not found in this office.');
 if(Number(item.quantity)<qty)fail('Not enough stock for this sale.');
 const cents=Math.round(Number(item.price)*100)*qty;if(cents>900000000000)fail('Sale total exceeds the supported limit of ₹9,000,000,000. Split it into smaller entries.');
 const id=Math.max(0,...db.sales.map(s=>s.id))+1;
 db.sales.push({id,shop_id:shopId,item_id:itemId,user_id:user.id,request_key:key,item_name:item.name,sku:item.sku,quantity:qty,unit_price:Number(item.price).toFixed(2),total:(cents/100).toFixed(2),sale_date:date,note:text(body.note,200),actor:user.name});
 item.quantity=Number(item.quantity)-qty;db.events.push({item_id:itemId,delta:-qty,reason:'Sale #'+id,actor:user.name,created_at:new Date().toISOString()});audit(db,user,shopId,'sale.recorded','Sale #'+id+': '+qty+' × '+item.name);save(db);return {id};
 }
 if(!body&&salesRoute[3]){
 const from=salesRoute[3],to=salesRoute[4];if(!validDate(from)||!validDate(to)||from>to)fail('Choose a valid start and end date.');
 const sales=db.sales.filter(s=>s.shop_id===shopId&&s.sale_date>=from&&s.sale_date<=to).sort((a,b)=>b.sale_date.localeCompare(a.sale_date)||b.id-a.id);
 const byProduct=new Map();let units=0,totalCents=0;
 for(const sale of sales){units+=Number(sale.quantity);totalCents+=Math.round(Number(sale.total)*100);const item=db.items.find(i=>i.id===sale.item_id);const p=byProduct.get(sale.item_id)||{item_id:sale.item_id,name:item?.name||sale.item_name,sku:item?.sku||sale.sku,sale_count:0,units:0,cents:0};p.sale_count++;p.units+=Number(sale.quantity);p.cents+=Math.round(Number(sale.total)*100);byProduct.set(sale.item_id,p);}
 const products=[...byProduct.values()].sort((a,b)=>b.cents-a.cents||a.item_id-b.item_id).map(({cents,...p})=>({...p,revenue:(cents/100).toFixed(2)}));
 return {summary:{sale_count:sales.length,units,revenue:(totalCents/100).toFixed(2)},sales:sales.slice(0,500),products,from,to,limit:500};
 }fail('Method not allowed.');
 }
 const inventory=/^shops\/(\d+)\/items(?:\/(\d+)(?:\/(stock|archive|history))?)?$/.exec(path);
 if(inventory){
 const shopId=Number(inventory[1]),itemId=inventory[2]?Number(inventory[2]):null,action=inventory[3]||'';
 if(!db.shops.some(s=>s.id===shopId))fail('Office not found.');
 if(!isDev&&user.shopId!==shopId)fail('You do not have access to this office.');
 if(!body&&!itemId)return {items:db.items.filter(i=>i.shop_id===shopId&&!i.archived).sort((a,b)=>a.name.localeCompare(b.name))};
 const item=itemId?db.items.find(i=>i.id===itemId&&i.shop_id===shopId&&!i.archived):null;
 if(itemId&&!item)fail('Item not found.');
 if(!body&&action==='history')return {events:db.events.filter(e=>e.item_id===itemId).slice(-50).reverse()};
 if(!body)fail('Method not allowed.');
 const whole=v=>/^-?\d+$/.test(String(v))&&Number.isSafeInteger(Number(v));
 const event=(id,delta,reason)=>db.events.push({item_id:id,delta,reason,actor:user.name,created_at:new Date().toISOString()});
 if(action==='stock'){
 const delta=Number(body.delta),reason=text(body.reason,200);
 if(!whole(body.delta)||delta===0||Math.abs(delta)>1000000||!reason)fail('Enter a nonzero whole-number adjustment and a reason.');
 const quantity=Number(item.quantity)+delta;if(quantity<0||quantity>1000000)fail('Stock must remain between 0 and 1,000,000 units.');
 item.quantity=quantity;event(itemId,delta,reason);audit(db,user,shopId,'stock.adjusted',item.name+': '+(delta>0?'+':'')+delta+' units — '+reason);save(db);return {ok:true};
 }
 if(!manager(user)&&(itemId||action))fail('Only the office Admin or DEV team can edit or archive existing items.');
 if(action==='archive'){item.archived=1;audit(db,user,shopId,'item.archived','Archived '+item.name);save(db);return {ok:true}}
 if(action)fail('Not found.');
 const name=text(body.name,120),sku=text(body.sku,60).toUpperCase(),category=text(body.category,80),price=String(body.price??''),minimum=Number(body.minimum_stock);
 if(!name||!sku||!/^\d{1,10}(?:\.\d{1,2})?$/.test(price)||!whole(body.minimum_stock)||minimum<0||minimum>1000000)fail('Enter a name, SKU, valid price and whole-number low-stock threshold.');
 if(db.items.some(i=>i.shop_id===shopId&&i.sku.toLowerCase()===sku.toLowerCase()&&i.id!==itemId))fail('This SKU already exists in this office, including archived items.');
 if(item){Object.assign(item,{name,sku,category,price:Number(price),minimum_stock:minimum});audit(db,user,shopId,'item.updated','Updated '+name);save(db);return {ok:true}}
 const quantity=Number(body.quantity);if(!whole(body.quantity)||quantity<0||quantity>1000000)fail('Opening stock must be a whole number between 0 and 1,000,000.');
 const id=Math.max(0,...db.items.map(i=>i.id))+1;db.items.push({id,shop_id:shopId,name,sku,category,price:Number(price),minimum_stock:minimum,quantity,archived:0});event(id,quantity,'Opening stock');audit(db,user,shopId,'item.created','Added '+name+' ('+sku+')');save(db);return {id};
 }
 if(path==='shops'){
  if(!body)return {shops:db.shops.filter(s=>isDev||(user.shopId===s.id&&s.id===scopeShop)).sort((a,b)=>b.id-a.id).map(s=>({...s,is_demo:s.id===db.demoShopId,...(manager(user)?{appearance:db.appearances[s.id]||null}:{}),staffCount:db.users.filter(u=>u.shopId===s.id&&roleOf(u)==='staff').length}))};
  if(!isDev)fail('Only DEV can create offices.');
  const name=text(body.name,80);if(!name)fail('Office name is required.');const login=shopCredentials(body);if(db.users.some(u=>u.email===login.id))fail('This login ID is already in use.');
  const passwordHash=await hash(login.password),id=nextId(db.shops);
  db.shops.push({id,name,location:text(body.location,200),description:text(body.description,1000),status:'active'});
  db.users.push({id:nextId(db.users),name:(name+' owner').slice(0,80),email:login.id,passwordHash,role:'staff',account_type:'shop',shopId:id,enabled:true,session_version:1});audit(db,user,id,'office.created','Created office and owner login');save(db);return {id};
 }
 const loginRoute=/^shops\/(\d+)\/login$/.exec(path);
 if(loginRoute&&body){
  if(!isDev)fail('Only DEV can assign an office owner.');
  const shopId=Number(loginRoute[1]),shop=db.shops.find(s=>s.id===shopId);if(!shop)fail('Office not found.');const login=shopCredentials(body);
  if(db.users.some(u=>u.shopId===shopId&&roleOf(u)==='admin'))fail('This office already has owner credentials.');if(db.users.some(u=>u.email===login.id))fail('This login ID is already in use.');
  db.users.push({id:nextId(db.users),name:(shop.name+' owner').slice(0,80),email:login.id,passwordHash:await hash(login.password),role:'staff',account_type:'shop',shopId,enabled:true,session_version:1});audit(db,user,shopId,'owner.created','Assigned an office owner login');save(db);return {ok:true};
 }
 const route=/^shops\/(\d+)(\/staff)?$/.exec(path);
 if(route){
  const id=Number(route[1]),shop=db.shops.find(s=>s.id===id);if(!shop)fail('Office not found.');if(!isDev&&user.shopId!==id)fail('You do not have access to this office.');
  if(!body&&!route[2])return {shop,shopLogin:manager(user)?(()=>{const a=db.users.find(u=>u.shopId===id&&roleOf(u)==='admin');return a?{user_id:a.id,login_id:a.email,enabled:a.enabled!==false}:null})():null,staff:db.users.filter(u=>u.shopId===id&&roleOf(u)==='staff').map(u=>({id:u.id,name:u.name,email:u.email,enabled:u.enabled!==false}))};
  if(body&&route[2]){
   if(!manager(user))fail('Only the office Admin or DEV team can create staff.');
   const name=text(body.name,80),email=text(body.email,254).toLowerCase();
   if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Enter a name and valid email.');const password=passwordValue(body.password);
   if(db.users.some(u=>u.email===email))fail('This email already has an account. Use a different email.');
   const idUser=nextId(db.users);db.users.push({id:idUser,name,email,passwordHash:await hash(password),role:'staff',shopId:id,enabled:true,session_version:1});audit(db,user,id,'staff.created','Created staff account for '+name);save(db);return {ok:true,id:idUser};
  }
 }
 fail('Not found.');
}
let pending=Promise.resolve();
window.shadowDemo={request:(path,body,scopeShop=null,portal=scopeShop===null?'dev':'admin')=>{const result=pending.then(()=>request(path,body,scopeShop,portal));pending=result.catch(()=>{});return result;}};
})();
