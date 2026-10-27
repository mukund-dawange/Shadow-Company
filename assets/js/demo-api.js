/* Demo only. Browser roles and data can be changed by anyone using browser tools. */
(() => {
'use strict';
const KEY='shadow-workspace-demo-v1', SESSION=KEY+'-session';
const publicUser=({id,name,email,role,account_type})=>({id,name,email,role,account_type:account_type||role});
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const fail=message=>{throw Error(message)};
const text=(v,n)=>String(v??'').trim().slice(0,n);
function shopCredentials(body){const id=String(body.login_id??'').trim().toLowerCase(),password=body.login_password;const bytes=typeof password==='string'?new TextEncoder().encode(password).length:0;if(!/^[a-z0-9][a-z0-9._-]{2,59}$/.test(id))fail('Shop login ID must contain 3–60 letters, numbers, dots, underscores or hyphens.');if(bytes<10||bytes>72||password.includes('\0'))fail('Shop password must contain 10–72 bytes.');return {id,password};}
const save=db=>localStorage.setItem(KEY,JSON.stringify(db));
async function read(){
 const raw=localStorage.getItem(KEY);
 if(raw){try{const db=JSON.parse(raw);if(db.version!==1||!Array.isArray(db.users)||!Array.isArray(db.shops))throw Error();if(!db.items){db.items=[];db.events=[];}if(!db.sales)db.sales=[];save(db);return db}catch{fail('Demo data could not be read. Use Reset demo to start again.')}}
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
],events:[],sales:[]};save(db);return db;
}
async function request(path,body,scopeShop=null){
 const db=await read();let loginShop=null;
 if(scopeShop!==null){if(!Number.isSafeInteger(scopeShop)||scopeShop<1)fail('This shop login link is not valid.');loginShop=db.shops.find(s=>s.id===scopeShop);if(!loginShop)fail('This shop login link is not valid.');}
 const sessionKey=SESSION+(scopeShop===null?'-admin':'-shop-'+scopeShop);
 let user=db.users.find(u=>u.id===Number(sessionStorage.getItem(sessionKey)));
 if(user&&(scopeShop===null?user.role!=='admin':user.role==='admin'||user.shopId!==scopeShop)){sessionStorage.removeItem(sessionKey);user=null;}
 if(path==='session')return {configured:true,user:user?publicUser(user):null,shop:loginShop?{id:loginShop.id,name:loginShop.name}:null};
 if(path==='login'&&body){const account=db.users.find(u=>u.email===text(body.identifier??body.email,254).toLowerCase());if(!account||account.passwordHash!==await hash(String(body.password||'')))fail('Login ID or password is incorrect.');if(scopeShop!==null){if(account.role==='admin'||account.shopId!==scopeShop)fail('This account cannot sign in to this shop. Use your own login page.');}else if(account.role!=='admin')fail('This page is for administrators. Open your shop login link.');sessionStorage.setItem(sessionKey,String(account.id));return {user:publicUser(account)}}
 if(!user)fail('Please sign in.');
 const scopedRoute=/^shops\/(\d+)(?:\/|$)/.exec(path);if(scopeShop!==null&&scopedRoute&&Number(scopedRoute[1])!==scopeShop)fail('This session belongs to another shop.');
 if(path==='logout'){sessionStorage.removeItem(sessionKey);return {ok:true}}
 const salesRoute=/^shops\/(\d+)\/(sales|reports\/([0-9-]+)\/([0-9-]+))$/.exec(path);
 if(salesRoute){
 const shopId=Number(salesRoute[1]);if(!db.shops.some(s=>s.id===shopId))fail('Shop not found.');
 if(user.role!=='admin'&&user.shopId!==shopId)fail('You do not have access to this shop.');
 const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>='2000-01-01'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(salesRoute[2]==='sales'&&body){
 const itemId=Number(body.item_id),qty=Number(body.quantity),date=body.sale_date,key=body.request_key;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(!Number.isSafeInteger(itemId)||itemId<1||!/^\d+$/.test(String(body.quantity))||!Number.isSafeInteger(qty)||qty<1||qty>1000000||!validDate(date)||date>today||typeof key!=='string'||!/^[a-f0-9-]{36}$/.test(key))fail('Choose an item, a positive whole quantity and a valid sale date (not in the future).');
 const existing=db.sales.find(s=>s.shop_id===shopId&&s.request_key===key);if(existing)return {id:existing.id,duplicate:true};
 const item=db.items.find(i=>i.id===itemId&&i.shop_id===shopId&&!i.archived);if(!item)fail('Item not found in this shop.');
 if(Number(item.quantity)<qty)fail('Not enough stock for this sale.');
 const cents=Math.round(Number(item.price)*100)*qty;if(cents>900000000000)fail('Sale total exceeds the supported limit of ₹9,000,000,000. Split it into smaller entries.');
 const id=Math.max(0,...db.sales.map(s=>s.id))+1;
 db.sales.push({id,shop_id:shopId,item_id:itemId,user_id:user.id,request_key:key,item_name:item.name,sku:item.sku,quantity:qty,unit_price:Number(item.price).toFixed(2),total:(cents/100).toFixed(2),sale_date:date,note:text(body.note,200),actor:user.name});
 item.quantity=Number(item.quantity)-qty;db.events.push({item_id:itemId,delta:-qty,reason:'Sale #'+id,actor:user.name,created_at:new Date().toISOString()});save(db);return {id};
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
 if(!db.shops.some(s=>s.id===shopId))fail('Shop not found.');
 if(user.role!=='admin'&&user.shopId!==shopId)fail('You do not have access to this shop.');
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
 item.quantity=quantity;event(itemId,delta,reason);save(db);return {ok:true};
 }
 if(user.role!=='admin'&&(itemId||action))fail('Only the admin can edit or archive existing items.');
 if(action==='archive'){item.archived=1;save(db);return {ok:true}}
 if(action)fail('Not found.');
 const name=text(body.name,120),sku=text(body.sku,60).toUpperCase(),category=text(body.category,80),price=String(body.price??''),minimum=Number(body.minimum_stock);
 if(!name||!sku||!/^\d{1,10}(?:\.\d{1,2})?$/.test(price)||!whole(body.minimum_stock)||minimum<0||minimum>1000000)fail('Enter a name, SKU, valid price and whole-number low-stock threshold.');
 if(db.items.some(i=>i.shop_id===shopId&&i.sku.toLowerCase()===sku.toLowerCase()&&i.id!==itemId))fail('This SKU already exists in this shop, including archived items.');
 if(item){Object.assign(item,{name,sku,category,price:Number(price),minimum_stock:minimum});save(db);return {ok:true}}
 const quantity=Number(body.quantity);if(!whole(body.quantity)||quantity<0||quantity>1000000)fail('Opening stock must be a whole number between 0 and 1,000,000.');
 const id=Math.max(0,...db.items.map(i=>i.id))+1;db.items.push({id,shop_id:shopId,name,sku,category,price:Number(price),minimum_stock:minimum,quantity,archived:0});event(id,quantity,'Opening stock');save(db);return {id};
 }
 if(body&&user.role!=='admin')fail('Only the admin can make this change.');
 if(path==='shops'){
 if(!body)return {shops:db.shops.filter(s=>user.role==='admin'||(user.shopId===s.id&&s.id===scopeShop)).map(s=>({...s,staffCount:db.users.filter(u=>u.shopId===s.id&&u.account_type!=='shop').length}))};
 const name=text(body.name,80);if(!name)fail('Shop name is required.');const login=shopCredentials(body);if(db.users.some(u=>u.email===login.id))fail('This login ID is already in use.');const passwordHash=await hash(login.password);const id=Math.max(0,...db.shops.map(s=>s.id))+1;db.shops.push({id,name,location:text(body.location,200),description:text(body.description,1000)});db.users.push({id:Math.max(0,...db.users.map(u=>u.id))+1,name:(name+' shop').slice(0,80),email:login.id,passwordHash,role:'staff',account_type:'shop',shopId:id});save(db);return {id};
 }
 const loginRoute=/^shops\/(\d+)\/login$/.exec(path);
 if(loginRoute&&body){const shopId=Number(loginRoute[1]),shop=db.shops.find(s=>s.id===shopId);if(!shop)fail('Shop not found.');const login=shopCredentials(body);if(db.users.some(u=>u.shopId===shopId&&u.account_type==='shop'))fail('This shop already has login credentials.');if(db.users.some(u=>u.email===login.id))fail('This login ID is already in use.');db.users.push({id:Math.max(0,...db.users.map(u=>u.id))+1,name:(shop.name+' shop').slice(0,80),email:login.id,passwordHash:await hash(login.password),role:'staff',account_type:'shop',shopId});save(db);return {ok:true};}
 const route=/^shops\/(\d+)(\/staff)?$/.exec(path);
 if(route){const id=Number(route[1]),shop=db.shops.find(s=>s.id===id);if(!shop)fail('Shop not found.');if(user.role!=='admin'&&user.shopId!==id)fail('You do not have access to this shop.');
 if(!body&&!route[2])return {shop,shopLogin:user.role==='admin'?(()=>{const a=db.users.find(u=>u.shopId===id&&u.account_type==='shop');return a?{login_id:a.email}:null})():null,staff:db.users.filter(u=>u.shopId===id&&u.account_type!=='shop').map(publicUser)};
 if(body&&route[2]){const name=text(body.name,80),email=text(body.email,254).toLowerCase(),password=String(body.password||''),length=new TextEncoder().encode(password).length;
 if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||length<10||length>72||password.includes('\0'))fail('Enter a name, valid email, and password of 10–72 bytes.');if(db.users.some(u=>u.email===email))fail('This email already has an account. Use a different email.');
 db.users.push({id:Math.max(...db.users.map(u=>u.id))+1,name,email,passwordHash:await hash(password),role:'staff',shopId:id});save(db);return {ok:true};}
 }fail('Not found.');
}
function reset(){localStorage.removeItem(KEY);for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key&&key.startsWith(SESSION))sessionStorage.removeItem(key);}}
let pending=Promise.resolve();
window.shadowDemo={request:(path,body,scopeShop=null)=>{const result=pending.then(()=>request(path,body,scopeShop));pending=result.catch(()=>{});return result;},reset};
document.addEventListener('DOMContentLoaded',()=>document.querySelector('#reset-demo')?.addEventListener('click',()=>{if(confirm('Reset this browser’s demo shops and staff accounts?')){reset();location.reload()}}));
})();
