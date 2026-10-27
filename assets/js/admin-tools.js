const loginAccents={forest:'Forest',indigo:'Indigo',ocean:'Ocean',rose:'Rose',amber:'Amber',graphite:'Graphite'};
function normaliseAppearance(value){
 const a=value||{};
 return {page_name:typeof a.page_name==='string'?a.page_name:'',headline:typeof a.headline==='string'?a.headline:'',welcome_message:typeof a.welcome_message==='string'?a.welcome_message:'',accent:Object.hasOwn(loginAccents,a.accent)?a.accent:'forest',theme:a.theme==='dark'?'dark':'light'};
}
function shopThumbnail(shop){
 const a=normaliseAppearance(shop.appearance);
 return `<div class="site-preview" data-theme="${a.theme}" data-accent="${a.accent}" aria-hidden="true"><div class="mini-story"><span class="mini-brand">S / Shadow</span><div><strong>${esc(a.page_name||shop.name)}</strong><em>${esc(a.headline||'Your day, in order.')}</em></div><span class="mini-caption">Your shop. Your space.</span></div><div class="mini-form"><span>SHOP ACCESS</span><b>Shop sign-in</b><i></i><i></i><div>Sign in →</div></div><span class="site-preview-open">Open website ↗</span></div>`;
}
function bindAdminTools(){
 if(user.role!=='admin')return;
 document.querySelectorAll('[data-customise]').forEach(b=>b.onclick=()=>customiseLogin(Number(b.dataset.customise)));
 const demo=document.querySelector('#demo-data');if(demo)demo.onclick=()=>demoDataDialog();
}
async function customiseLogin(id){
 if(user.role!=='admin')return;
 const shop=shops.find(s=>Number(s.id)===id);if(!shop)return;
 try{
  const {appearance}=await api(`shops/${id}/appearance`);let draft=normaliseAppearance(appearance);
  const d=document.createElement('dialog');d.className='appearance-dialog';
  d.innerHTML=`<div class="modal-head"><div><span class="eyebrow">${esc(shop.name)}</span><h2>Customise shop login</h2></div><button type="button" class="close" aria-label="Close dialog">×</button></div><p>Make this login page feel like your shop. Changes go live when you save.</p><div class="appearance-editor"><form id="appearance-form"><label>Page name<input name="page_name" maxlength="80" placeholder="${esc(shop.name)}" value="${esc(draft.page_name)}"></label><label>Headline<input name="headline" maxlength="120" placeholder="Your day, in order." value="${esc(draft.headline)}"></label><label>Welcome message<textarea name="welcome_message" maxlength="240" rows="3" placeholder="A dedicated space for your team, your inventory, and the work ahead.">${esc(draft.welcome_message)}</textarea></label><div class="form-grid"><label>Accent colour<select name="accent">${Object.entries(loginAccents).map(([key,label])=>`<option value="${key}" ${key===draft.accent?'selected':''}>${label}</option>`).join('')}</select></label><label>Appearance<select name="theme"><option value="light" ${draft.theme==='light'?'selected':''}>Light</option><option value="dark" ${draft.theme==='dark'?'selected':''}>Dark</option></select></label></div><small>Blank text fields use the original wording. The shop name and login credentials stay unchanged.</small><button type="button" class="text-action" id="appearance-defaults">Use default design</button><div class="error" role="alert"></div><div class="modal-actions"><button type="button" class="secondary cancel">Cancel</button><button type="submit" class="primary">Save changes</button></div></form><section class="preview-panel"><div class="preview-heading"><span>Live preview</span><span>Shop login</span></div><div class="appearance-preview" inert></div><a class="portal-link" href="${esc(shopURL(id))}" target="_blank" rel="noopener">Open saved login page ↗</a></section></div>`;
  document.body.append(d);d.showModal();const form=d.querySelector('#appearance-form'),preview=d.querySelector('.appearance-preview');
  const draw=()=>{draft=normaliseAppearance(Object.fromEntries(new FormData(form)));preview.innerHTML=loginMarkup(false,true,shop,draft);};
  form.addEventListener('input',draw);form.addEventListener('change',draw);draw();
  d.querySelector('#appearance-defaults').onclick=()=>{for(const [key,val] of Object.entries(normaliseAppearance()))form.elements.namedItem(key).value=val;draw();};
  d.querySelector('.close').onclick=d.querySelector('.cancel').onclick=()=>d.close();d.onclose=()=>d.remove();
  form.onsubmit=async e=>{e.preventDefault();const submit=form.querySelector('[type=submit]');submit.disabled=true;try{const result=await api(`shops/${id}/appearance`,draft);shop.appearance=result.appearance;d.close();render();toast('Shop login page updated.');}catch(err){form.querySelector('.error').textContent=err.message;submit.disabled=false;}};
 }catch(err){toast(err.message);}
}
function demoDataDialog(){
 if(user.role!=='admin')return;
 const existing=shops.find(s=>s.is_demo),d=document.createElement('dialog');
 d.innerHTML=`<div class="modal-head"><span class="eyebrow">ADMIN TOOLS</span><button class="close" aria-label="Close dialog">×</button></div><h2>Demo data</h2><p>${existing?'Your sample shop is ready. Open it to test inventory, stock updates and reports.':'Create a separate sample shop to try inventory and reports.'}</p><div class="demo-data-summary"><div><strong>5</strong><span>Sample products</span></div><div><strong>3</strong><span>Recorded sales</span></div><div><strong>1</strong><span>Demo shop</span></div></div><p>Existing shops and records stay untouched. Repeated clicks open the same demo shop. Login accounts are not created automatically; use Set shop login if you want to test its sign-in page.</p><div class="error" role="alert"></div><div class="modal-actions"><button class="secondary cancel">Cancel</button><button class="primary" id="create-demo-data">${existing?'Open demo shop':'Create demo shop'}</button></div>`;
 document.body.append(d);d.showModal();d.querySelector('.close').onclick=d.querySelector('.cancel').onclick=()=>d.close();d.onclose=()=>d.remove();
 d.querySelector('#create-demo-data').onclick=async()=>{const b=d.querySelector('#create-demo-data');b.disabled=true;try{const result=await api('admin/demo-data',{});shops=(await api('shops')).shops;selected=await loadShop(result.id);shopTab='overview';section='shops';reportData=null;writeShopLink(result.id,'overview');d.close();render();toast(result.created?'Demo shop created with sample inventory and sales.':'Opened your existing demo shop.');}catch(err){d.querySelector('.error').textContent=err.message;b.disabled=false;}};
}
