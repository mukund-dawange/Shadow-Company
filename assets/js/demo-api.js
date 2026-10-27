/* Demo only. Browser roles and data can be changed by anyone using browser tools. */
(() => {
'use strict';
const KEY='shadow-workspace-demo-v1', SESSION=KEY+'-session';
const publicUser=({id,name,email,role})=>({id,name,email,role});
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const fail=message=>{throw Error(message)};
const text=(v,n)=>String(v??'').trim().slice(0,n);
const save=db=>localStorage.setItem(KEY,JSON.stringify(db));
async function read(){
 const raw=localStorage.getItem(KEY);
 if(raw){try{const db=JSON.parse(raw);if(db.version!==1||!Array.isArray(db.users)||!Array.isArray(db.shops))throw Error();return db}catch{fail('Demo data could not be read. Use Reset demo to start again.')}}
 const passwordHash=await hash('Demo-access-123');
 const db={version:1,users:[
 {id:1,name:'Demo Administrator',email:'admin@shadow.demo',role:'admin',passwordHash},
 {id:2,name:'Aarav Shah',email:'staff@shadow.demo',role:'staff',shopId:1,passwordHash},
 {id:3,name:'Priya Mehta',email:'priya@shadow.demo',role:'staff',shopId:2,passwordHash}
 ],shops:[
 {id:1,name:'Shadow Central',location:'Pune · Main Street',description:'Our flagship shop and its dedicated team.'},
 {id:2,name:'Shadow Market',location:'Mumbai · Market Road',description:'A neighborhood shop with room to grow.'},
 {id:3,name:'Shadow Studio',location:'Nashik · College Road',description:'Your next location, ready for its first team member.'}
 ]};save(db);return db;
}
async function request(path,body){
 const db=await read(),user=db.users.find(u=>u.id===Number(sessionStorage.getItem(SESSION)));
 if(path==='session')return {configured:true,user:user?publicUser(user):null};
 if(path==='login'&&body){const account=db.users.find(u=>u.email===text(body.email,254).toLowerCase());if(!account||account.passwordHash!==await hash(String(body.password||'')))fail('Email or password is incorrect.');if(body.portal&&account.role!==body.portal)fail('Choose the correct portal for your account.');sessionStorage.setItem(SESSION,String(account.id));return {user:publicUser(account)}}
 if(!user)fail('Please sign in.');
 if(path==='logout'){sessionStorage.removeItem(SESSION);return {ok:true}}
 if(body&&user.role!=='admin')fail('Only the admin can make this change.');
 if(path==='shops'){
 if(!body)return {shops:db.shops.filter(s=>user.role==='admin'||user.shopId===s.id).map(s=>({...s,staffCount:db.users.filter(u=>u.shopId===s.id).length}))};
 const name=text(body.name,80);if(!name)fail('Shop name is required.');const id=Math.max(0,...db.shops.map(s=>s.id))+1;db.shops.push({id,name,location:text(body.location,200),description:text(body.description,1000)});save(db);return {id};
 }
 const route=/^shops\/(\d+)(\/staff)?$/.exec(path);
 if(route){const id=Number(route[1]),shop=db.shops.find(s=>s.id===id);if(!shop)fail('Shop not found.');if(user.role!=='admin'&&user.shopId!==id)fail('You do not have access to this shop.');
 if(!body&&!route[2])return {shop,staff:db.users.filter(u=>u.shopId===id).map(publicUser)};
 if(body&&route[2]){const name=text(body.name,80),email=text(body.email,254).toLowerCase(),password=String(body.password||''),length=new TextEncoder().encode(password).length;
 if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||length<10||length>72||password.includes('\0'))fail('Enter a name, valid email, and password of 10–72 bytes.');if(db.users.some(u=>u.email===email))fail('This email already has an account. Use a different email.');
 db.users.push({id:Math.max(...db.users.map(u=>u.id))+1,name,email,passwordHash:await hash(password),role:'staff',shopId:id});save(db);return {ok:true};}
 }fail('Not found.');
}
function reset(){localStorage.removeItem(KEY);sessionStorage.removeItem(SESSION)}
window.shadowDemo={request,reset};
document.addEventListener('DOMContentLoaded',()=>document.querySelector('#reset-demo')?.addEventListener('click',()=>{if(confirm('Reset this browser’s demo shops and staff accounts?')){reset();location.reload()}}));
})();
