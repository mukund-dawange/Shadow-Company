let reportData=null,reportError='',reportBusy=false;
const businessToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let reportTo=businessToday(),reportFrom=reportTo.slice(0,8)+'01';
const shopTabs=new Set(['overview','inventory','stock','sales','products','staff','account']);
function shopURL(id,tab='inventory'){const url=new URL(window.shadowDemo?'shop.html':'shop.php',location.href);url.search='?shop='+id;url.hash=`shop/${id}/${tab}`;return url.href;}
function writeShopLink(id,tab){const url=new URL(location.href);url.hash=`shop/${id}/${tab}`;history.pushState(null,'',url.href);}
async function followShopLink(){
 const match=/^#shop\/(\d+)\/(overview|inventory|stock|sales|products|staff|account)$/.exec(location.hash);
 const shopOnly=user.role!=='admin';
 if(!match&&!shopOnly){selected=null;section='shops';render();if(location.hash)toast('This shop link is not valid.');return;}
 try{
  const ownId=shopOnly?entryShopId():null;
  if(shopOnly&&!ownId)throw Error('Open your assigned shop login link.');
  const valid=match&&(!shopOnly||Number(match[1])===ownId);
  const id=shopOnly?ownId:Number(match[1]),tab=valid?match[2]:'overview';
  const notice=shopOnly&&!valid&&location.hash?'This login can only open your assigned shop.':'';
  const next=await loadShop(id);selected=next;section='shops';shopTab=tab;resetInventoryFilters();reportData=null;reportError='';
  if(shopOnly&&!valid){const url=new URL(location.href);url.hash=`shop/${id}/${tab}`;history.replaceState(null,'',url.href);}
  if(['sales','products'].includes(shopTab))await fetchReport();render();if(notice)toast(notice);
 }catch(e){selected=null;reportData=null;section='shops';render();toast(e.message);}
}
async function setShopTab(tab){if(!shopTabs.has(tab))return;shopTab=tab;writeShopLink(selected.shop.id,tab);if(['sales','products'].includes(tab)){reportData=null;await fetchReport();}render();}
async function fetchReport(){
 if(!selected)return;const id=selected.shop.id;reportBusy=true;reportError='';
 try{const data=await api(`shops/${id}/reports/${reportFrom}/${reportTo}`);if(selected&&selected.shop.id===id)reportData=data;}
 catch(e){reportData=null;reportError=e.message;}finally{reportBusy=false;}
}
function salesView(){
 const products=shopTab==='products',data=reportData;
 return `<div class="toolbar"><div><span class="eyebrow">INVENTORY TRACKER</span><h2>${products?'Product-wise sales report':'Sales report'}</h2><p>Sales recorded for this shop. Amounts are revenue, not profit.</p></div><button class="primary" id="record-sale">＋ Record sale</button></div><form id="report-filters" class="report-filters"><label>From<input type="date" name="from" min="2000-01-01" value="${esc(reportFrom)}" required></label><label>To<input type="date" name="to" min="2000-01-01" value="${esc(reportTo)}" required></label><button class="secondary" ${reportBusy?'disabled':''}>Apply dates</button><button type="button" class="text-action" id="report-today">Today</button><button type="button" class="text-action" id="report-month">This month</button></form><p class="results-note">Sale dates use your selected business date. Today follows India time (IST). Each sale entry records one product.</p>${reportError?`<div class="error" role="alert">${esc(reportError)}</div>`:!data?'<p role="status">Loading report…</p>':`<div class="inventory-summary"><div><small>SALE ENTRIES</small><strong>${data.summary.sale_count}</strong></div><div><small>UNITS SOLD</small><strong>${data.summary.units}</strong></div><div><small>SALES REVENUE</small><strong>${money(data.summary.revenue)}</strong></div><div><small>PRODUCTS SOLD</small><strong>${data.products.length}</strong></div></div>${products?productReport(data):saleReport(data)}`}`;
}
function productReport(data){return data.products.length?`<div class="table-wrap"><table><thead><tr><th>PRODUCT / SKU</th><th>SALE ENTRIES</th><th>UNITS SOLD</th><th>REVENUE</th><th>AVG. SELLING PRICE</th></tr></thead><tbody>${data.products.map(p=>`<tr><td><b>${esc(p.name)}</b><small class="item-sku">${esc(p.sku)}</small></td><td>${p.sale_count}</td><td>${p.units}</td><td>${money(p.revenue)}</td><td>${money(Number(p.revenue)/Number(p.units))}</td></tr>`).join('')}</tbody></table></div><p class="results-note">Includes sales of archived items. Product labels show the current name; sale entries keep the original name and price.</p>`:'<div class="empty"><h2>No product sales in this period</h2><p>Record a sale or choose another date range.</p></div>';}
function saleReport(data){return data.sales.length?`<p class="results-note">Showing ${data.sales.length} of ${data.summary.sale_count} entries (latest ${data.limit} maximum). Totals and product reports include every sale in the selected period.</p><div class="table-wrap"><table><thead><tr><th>SALE / DATE</th><th>PRODUCT</th><th>QTY</th><th>UNIT PRICE</th><th>TOTAL</th><th>RECORDED BY / NOTE</th></tr></thead><tbody>${data.sales.map(s=>`<tr><td><b>#${s.id}</b><small class="item-sku">${esc(s.sale_date)}</small></td><td>${esc(s.item_name)}<small class="item-sku">${esc(s.sku)}</small></td><td>${s.quantity}</td><td>${money(s.unit_price)}</td><td>${money(s.total)}</td><td>${esc(s.actor)}<small class="item-sku">${esc(s.note)}</small></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><h2>No sales recorded in this period</h2><p>Select Record sale to record a purchase and reduce stock automatically.</p></div>';}
function saleDialog(){
 const items=selected.items.filter(i=>Number(i.quantity)>0);if(!items.length){toast('Add an item with available stock before recording a sale.');return;}
 const d=document.createElement('dialog'),key=crypto.randomUUID();
 d.innerHTML=`<form><div class="modal-head"><span class="eyebrow">${esc(selected.shop.name)}</span><button class="close" type="button" aria-label="Close dialog">×</button></div><h2>Record a sale</h2><p>Saving reduces available stock and adds a stock-history entry. Review the quantity and amount before saving.</p><label>Product<select name="item_id" required>${items.map(i=>`<option value="${i.id}">${esc(i.name)} · ${esc(i.sku)} · ${i.quantity} available</option>`).join('')}</select></label><label>Quantity<input type="number" name="quantity" min="1" max="1000000" step="1" value="1" required></label><label>Sale date<input type="date" name="sale_date" min="2000-01-01" max="${businessToday()}" value="${businessToday()}" required></label><label>Reference / note <span>optional</span><input name="note" maxlength="200" placeholder="e.g. Receipt number"></label><div class="stock-preview" role="status"></div><div class="error" role="alert"></div><div class="modal-actions"><button class="secondary cancel" type="button">Cancel</button><button class="primary" type="submit">Confirm sale</button></div></form>`;
 document.body.append(d);d.showModal();d.querySelector('.close').onclick=d.querySelector('.cancel').onclick=()=>d.close();d.onclose=()=>d.remove();
 const update=()=>{const item=items.find(i=>String(i.id)===d.querySelector('[name=item_id]').value),qty=Number(d.querySelector('[name=quantity]').value);d.querySelector('.stock-preview').textContent=`${money(item.price)} × ${qty} = ${money(Math.round(Number(item.price)*100)*qty/100)} · Stock after sale: ${Number(item.quantity)-qty}`;};
 d.querySelector('[name=item_id]').onchange=update;d.querySelector('[name=quantity]').oninput=update;update();
 d.querySelector('form').onsubmit=async e=>{e.preventDefault();const submit=d.querySelector('[type=submit]');submit.disabled=true;try{const values=Object.fromEntries(new FormData(e.target));await api(`shops/${selected.shop.id}/sales`,{...values,request_key:key});d.close();selected=await loadShop(selected.shop.id);reportFrom=values.sale_date;reportTo=values.sale_date;await setShopTab('sales');toast('Sale recorded and stock updated.');}catch(err){if(d.isConnected){d.querySelector('.error').textContent=err.message;submit.disabled=false;}else toast('Sale saved. Refresh the workspace to load updated data.');}};
}
function bindTracker(){
 document.querySelectorAll('[data-copy-shop]').forEach(b=>b.onclick=async()=>{const url=shopURL(b.dataset.copyShop);try{await navigator.clipboard.writeText(url);toast('Shop login link copied.');}catch{const d=document.createElement('dialog');d.innerHTML=`<h2>Shop login link</h2><p>Copy this link. This separate login page accepts only accounts assigned to this shop.</p><input class="share-link" aria-label="Shop login link" readonly value="${esc(url)}"><button class="secondary">Close</button>`;document.body.append(d);d.showModal();d.querySelector('input').select();d.querySelector('button').onclick=()=>d.close();d.onclose=()=>d.remove();}});
 const sale=document.querySelector('#record-sale');if(sale)sale.onclick=()=>saleDialog();
 const form=document.querySelector('#report-filters');if(form)form.onsubmit=async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(form));if(values.from>values.to){toast('Start date must be on or before end date.');return;}reportFrom=values.from;reportTo=values.to;reportData=null;await fetchReport();render();};
 for(const id of ['report-today','report-month']){const b=document.getElementById(id);if(b)b.onclick=async()=>{reportTo=businessToday();reportFrom=id==='report-today'?reportTo:reportTo.slice(0,8)+'01';reportData=null;await fetchReport();render();};}
}
