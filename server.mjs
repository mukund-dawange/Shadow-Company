import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const dir=process.env.DATA_DIR||path.join(root,'data'); mkdirSync(dir,{recursive:true});
const db=new DatabaseSync(path.join(dir,'workspace.sqlite'));
db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','staff')));
CREATE TABLE IF NOT EXISTS shops(id INTEGER PRIMARY KEY,name TEXT NOT NULL,location TEXT NOT NULL DEFAULT '',description TEXT NOT NULL DEFAULT '',created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS memberships(user_id INTEGER REFERENCES users(id),shop_id INTEGER REFERENCES shops(id),PRIMARY KEY(user_id,shop_id));
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER REFERENCES users(id),expires INTEGER NOT NULL);`);
const hash=p=>{const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(p,salt,64).toString('hex')};
const verify=(p,h)=>{const [salt,value]=h.split(':');return timingSafeEqual(scryptSync(p,salt,64),Buffer.from(value,'hex'))};
const digest=t=>createHash('sha256').update(t).digest('hex');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const clean=(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
const userFields='id,name,email,role';
const attempts=new Map();
const dummy=hash(randomBytes(32).toString('hex'));
const server=http.createServer(async(req,res)=>{
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
 res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 try {
 const url=new URL(req.url,'http://localhost');const p=url.pathname;
 if(!p.startsWith('/api/')){const files={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};const f=files[p];if(!f)return send(404,{error:'Not found'});res.writeHead(200,{'Content-Type':f[1],'Cache-Control':'no-cache'});return res.end(readFileSync(path.join(root,'public',f[0])))}
 let body={};if(!['GET','HEAD'].includes(req.method)){
 if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)fail(403,'Request origin is not allowed.');
 if(!req.headers['content-type']?.startsWith('application/json'))fail(415,'JSON is required.');
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>16000)fail(413,'Request is too large.')}try{body=JSON.parse(raw||'{}')}catch{fail(400,'Invalid request.')}
 }
 const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('session='))?.slice(8);
 const user=cookie?db.prepare(`SELECT ${userFields.split(',').map(x=>'u.'+x).join(',')} FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?`).get(digest(cookie),Date.now()):null;
 const session=u=>{const token=randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),u.id,Date.now()+86400000);res.setHeader('Set-Cookie',`session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${process.env.COOKIE_SECURE==='1'?'; Secure':''}`)};
 const configured=()=>!!db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
 const credentials=()=>{const name=clean(body.name,80),email=clean(body.email,254).toLowerCase(),password=body.password;if(!name||!/^\S+@\S+\.\S+$/.test(email)||typeof password!=='string'||password.length<10||password.length>128)fail(400,'Enter a name, valid email, and a password of 10–128 characters.');return {name,email,password}};
 if(p==='/api/session'&&req.method==='GET')return send(200,{user:user||null,configured:configured()});
 if(p==='/api/setup'&&req.method==='POST'){if(configured())fail(403,'Admin account already exists.');const c=credentials();const r=db.prepare("INSERT INTO users(name,email,password,role) VALUES(?,?,?,'admin')").run(c.name,c.email,hash(c.password));const u=db.prepare(`SELECT ${userFields} FROM users WHERE id=?`).get(r.lastInsertRowid);session(u);return send(201,{user:u})}
 if(p==='/api/login'&&req.method==='POST'){
 const key=req.socket.remoteAddress;const now=Date.now();let a=attempts.get(key);if(!a||a.until<now){a={count:0,until:now+900000};attempts.set(key,a)}if(a.count>=10)fail(429,'Too many attempts. Try again in 15 minutes.');a.count++;
 const email=clean(body.email,254).toLowerCase();const u=db.prepare('SELECT * FROM users WHERE email=?').get(email);const password=typeof body.password==='string'?body.password:'';if(password.length>128||!verify(password,u?.password||dummy)||!u)fail(401,'Email or password is incorrect.');attempts.delete(key);session(u);delete u.password;return send(200,{user:u});}
 if(!user)fail(401,'Please sign in.');
 if(p==='/api/logout'&&req.method==='POST'){db.prepare('DELETE FROM sessions WHERE token=?').run(digest(cookie));res.setHeader('Set-Cookie','session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(200,{ok:true})}
 const admin=()=>{if(user.role!=='admin')fail(403,'Only the admin can make this change.')};
 const access=id=>{if(!db.prepare('SELECT id FROM shops WHERE id=?').get(id))fail(404,'Shop not found.');if(user.role!=='admin'&&!db.prepare('SELECT 1 FROM memberships WHERE shop_id=? AND user_id=?').get(id,user.id))fail(403,'You do not have access to this shop.')};
 if(p==='/api/shops'&&req.method==='GET'){const shops=user.role==='admin'?db.prepare('SELECT * FROM shops ORDER BY id DESC').all():db.prepare('SELECT s.* FROM shops s JOIN memberships m ON m.shop_id=s.id WHERE m.user_id=? ORDER BY s.id DESC').all(user.id);return send(200,{shops:shops.map(s=>({...s,staffCount:db.prepare('SELECT COUNT(*) n FROM memberships WHERE shop_id=?').get(s.id).n}))})}
 if(p==='/api/shops'&&req.method==='POST'){admin();const name=clean(body.name,80);if(!name)fail(400,'Shop name is required.');const r=db.prepare('INSERT INTO shops(name,location,description) VALUES(?,?,?)').run(name,clean(body.location),clean(body.description,1000));return send(201,{id:Number(r.lastInsertRowid)})}
 const match=p.match(/^\/api\/shops\/(\d+)(?:\/(staff))?$/);
 if(match){const id=Number(match[1]);access(id);
 if(req.method==='GET'&&!match[2])return send(200,{shop:db.prepare('SELECT * FROM shops WHERE id=?').get(id),staff:db.prepare('SELECT u.id,u.name,u.email FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.shop_id=?').all(id)});
 if(req.method==='POST'&&match[2]){admin();const c=credentials();if(db.prepare('SELECT id FROM users WHERE email=?').get(c.email))fail(409,'This email already has an account. Use a different email.');db.exec('BEGIN');try{const r=db.prepare("INSERT INTO users(name,email,password,role) VALUES(?,?,?,'staff')").run(c.name,c.email,hash(c.password));db.prepare('INSERT INTO memberships VALUES(?,?)').run(r.lastInsertRowid,id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return send(201,{ok:true})}
 }
 fail(404,'Not found.');
 }catch(e){if(!e.status)console.error(e);send(e.status||500,{error:e.status?e.message:'Something went wrong. Please try again.'})}
});
server.listen(Number(process.env.PORT||4310),'127.0.0.1',()=>console.log(`Shop Workspace ready at http://127.0.0.1:${process.env.PORT||4310}`));
