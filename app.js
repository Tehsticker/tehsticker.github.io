const SUPABASE_URL = "https://pawvlyivpwnbvkvjiduy.supabase.co";
const SUPABASE_KEY = "sb_publishable_nEhxIj5Vdbegu8_7gSDMlw_KOX1surQ";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const state = {
  user: null, profile: null, isAdmin: false,
  products: [], images: [], cart: [],
  settings: null, currentOrder: null,
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = n => `${Number(n || 0).toLocaleString("fa-IR")} تومان`;
const fa = n => Number(n || 0).toLocaleString("fa-IR");
const uid = () => crypto.randomUUID();
const productTypeLabel = t => ({ready:"پک آماده",personal:"پک شخصی",custom:"طراحی اختصاصی"})[t] || t;
const statusLabel = s => ({
  awaiting_payment:"در انتظار پرداخت", payment_review:"در انتظار بررسی رسید", paid:"پرداخت تأیید شد",
  preparing:"در حال آماده‌سازی", shipped:"ارسال شد", completed:"تکمیل شد", cancelled:"لغو شد"
})[s] || s;
const safe = (v="") => String(v).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const slugify = v => (v || "product").trim().toLowerCase().replace(/\s+/g,"-").replace(/[^\w\u0600-\u06FF-]/g,"") + "-" + Math.random().toString(36).slice(2,7);

function toast(msg, error=false){
  const el=$("#toast"); el.textContent=msg; el.className="toast show"+(error?" error":"");
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.className="toast",3200);
}
function openModal(id){ const d=$("#"+id); if(!d.open)d.showModal(); }
function closeModal(id){ const d=$("#"+id); if(d?.open)d.close(); }
$$("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));

async function init(){
  const {data:{session}} = await sb.auth.getSession();
  state.user = session?.user || null;
  await refreshIdentity();
  await Promise.all([loadProducts(), loadSettings()]);
  bindUI();
}
async function refreshIdentity(){
  if(!state.user){ state.profile=null;state.isAdmin=false; updateAuthUI(); return; }
  const {data} = await sb.from("profiles").select("*").eq("id",state.user.id).maybeSingle();
  state.profile=data; state.isAdmin=data?.role==="admin"; updateAuthUI();
}
function updateAuthUI(){
  $("#authBtn").hidden=!!state.user; $("#logoutBtn").hidden=!state.user; $("#ordersNav").hidden=!state.user;
  $("#adminNav").hidden=!state.isAdmin;
  if(state.profile){
    $("#checkoutName").value=state.profile.full_name||"";
    $("#checkoutPhone").value=state.profile.phone||"";
  }
}
async function loadProducts(){
  const {data,error}=await sb.from("products").select("*").order("sort_order").order("created_at");
  if(error){ toast("محصولات لود نشدن",true); return; }
  state.products=data||[];
  const {data:imgs}=await sb.from("product_images").select("*").order("sort_order");
  state.images=imgs||[];
  renderProducts();
}
async function loadSettings(){
  const {data}=await sb.from("site_settings").select("*").eq("id",1).maybeSingle();
  state.settings=data||{};
}
function imageUrl(path){
  if(!path)return null;
  return sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}
function getProductImage(product){
  const img=state.images.find(i=>i.product_id===product.id);
  return imageUrl(img?.path || product.cover_image_path);
}
function renderProducts(filter="all"){
  const list=state.products.filter(p=>filter==="all"||p.product_type===filter);
  $("#productsGrid").innerHTML=list.length?list.map(p=>{
    const img=getProductImage(p);
    const stock=p.product_type==="ready" ? (p.stock_qty===null?"موجود":`${fa(p.stock_qty)} عدد موجود`) : `${fa(p.sticker_count||10)} استیکر`;
    return `<article class="product-card">
      <div class="product-image">${img?`<img src="${img}" alt="${safe(p.title)}">`:`<div class="product-placeholder">${p.product_type==="ready"?"✨":"📸"}</div>`}</div>
      <div class="product-body">
        <div class="product-meta"><span class="badge">${productTypeLabel(p.product_type)}</span><span class="price">${fmt(p.price)}</span></div>
        <h3>${safe(p.title)}</h3><p>${safe(p.description||"")}</p>
        <small>${stock}</small>
        <div class="product-actions">
          <button class="btn ghost" onclick="showProduct('${p.id}')">جزئیات</button>
          <button class="btn primary" onclick="addToCart('${p.id}')" ${p.product_type==="ready"&&p.stock_qty===0?"disabled":""}>سفارش</button>
        </div>
      </div></article>`;
  }).join(""):`<div class="empty">هنوز محصولی توی این بخش نیست.</div>`;
}
window.showProduct=id=>{
  const p=state.products.find(x=>x.id===id); if(!p)return;
  const imgs=state.images.filter(i=>i.product_id===id);
  $("#productDetail").innerHTML=`<div class="product-detail">
    <span class="badge">${productTypeLabel(p.product_type)}</span><h2>${safe(p.title)}</h2>
    <p>${safe(p.description||"")}</p><h3>${fmt(p.price)}</h3>
    ${p.sticker_count?`<p>تعداد استیکر: <b>${fa(p.sticker_count)}</b></p>`:""}
    ${p.product_type==="ready"?`<p>موجودی: <b>${fa(p.stock_qty||0)}</b></p><p><b>این پک یک محصول آماده با طرح ثابت است و امکان تغییر طرح ندارد.</b></p>`:""}
    <div class="detail-gallery">${imgs.map(i=>`<img src="${imageUrl(i.path)}" style="max-width:180px;border-radius:15px;margin:5px">`).join("")}</div>
    <button class="btn primary" onclick="addToCart('${p.id}');closeModal('productModal')">اضافه به سفارش</button>
  </div>`; openModal("productModal");
};
window.addToCart=id=>{
  const p=state.products.find(x=>x.id===id); if(!p)return;
  const existing=state.cart.find(x=>x.product_id===id);
  if(existing){
    if(p.product_type==="ready" && (p.stock_qty===null || existing.quantity<p.stock_qty)) existing.quantity++;
  } else state.cart.push({product_id:id,quantity:1});
  updateCartCount(); toast("به سبد اضافه شد 💥");
};
function updateCartCount(){ $("#cartCount").textContent=fa(state.cart.reduce((a,b)=>a+b.quantity,0)); }
function renderCart(){
  const wrap=$("#cartItems"); $("#cartEmpty").hidden=state.cart.length>0;
  wrap.innerHTML=state.cart.map(item=>{
    const p=state.products.find(x=>x.id===item.product_id); if(!p)return"";
    return `<div class="cart-row"><div><b>${safe(p.title)}</b><br><small>${fmt(p.price)} × ${fa(item.quantity)}</small></div>
    <div class="cart-controls">
      ${p.product_type==="ready"?`<button type="button" class="qty-btn" onclick="changeQty('${p.id}',-1)">−</button><b>${fa(item.quantity)}</b><button type="button" class="qty-btn" onclick="changeQty('${p.id}',1)">+</button>`:""}
      <button type="button" class="remove-btn" onclick="removeCart('${p.id}')">حذف</button>
    </div></div>`;
  }).join("");
  const needs=state.cart.some(i=>["personal","custom"].includes(state.products.find(p=>p.id===i.product_id)?.product_type));
  $("#photoUploadWrap").hidden=!needs;
  updateSummary();
}
window.changeQty=(id,d)=>{
  const i=state.cart.find(x=>x.product_id===id),p=state.products.find(x=>x.id===id); if(!i||!p)return;
  i.quantity=Math.max(1,i.quantity+d);
  if(p.stock_qty!==null)i.quantity=Math.min(i.quantity,p.stock_qty);
  renderCart();updateCartCount();
};
window.removeCart=id=>{state.cart=state.cart.filter(x=>x.product_id!==id);renderCart();updateCartCount();};
function cartSubtotal(){return state.cart.reduce((sum,i)=>sum+(state.products.find(p=>p.id===i.product_id)?.price||0)*i.quantity,0)}
function updateSummary(){
  const sub=cartSubtotal(); const shipping=$("#checkoutShipping").value==="post"?134000:0;
  $("#sumSubtotal").textContent=fmt(sub);$("#sumShipping").textContent=shipping?fmt(shipping):"پس‌کرایه";$("#sumTotal").textContent=fmt(sub+shipping);
}

async function uploadCompressed(bucket,path,file,max=1600,quality=.82){
  const blob=await compressImage(file,max,quality);
  const {error}=await sb.storage.from(bucket).upload(path,blob,{contentType:"image/webp",upsert:false});
  if(error)throw error; return path;
}
function compressImage(file,max=1600,quality=.82){
  return new Promise((resolve,reject)=>{
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{
      let w=img.width,h=img.height; const ratio=Math.min(1,max/Math.max(w,h)); w=Math.round(w*ratio);h=Math.round(h*ratio);
      const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);
      c.toBlob(b=>{URL.revokeObjectURL(url);b?resolve(b):reject(new Error("فشرده‌سازی عکس ناموفق بود"))},"image/webp",quality);
    }; img.onerror=reject;img.src=url;
  });
}

async function createOrder(e){
  e.preventDefault();
  if(!state.user){ openAuth("login"); toast("اول وارد حسابت شو"); return; }
  if(!state.cart.length){toast("سبدت خالیه",true);return;}
  const photos=[...$("#orderPhotos").files];
  const needs=state.cart.some(i=>["personal","custom"].includes(state.products.find(p=>p.id===i.product_id)?.product_type));
  if(needs && photos.length===0){toast("برای پک شخصی/اختصاصی حداقل یک عکس انتخاب کن",true);return;}
  if(photos.length>10){toast("حداکثر ۱۰ عکس می‌تونی بفرستی",true);return;}
  const btn=$("#submitOrderBtn");btn.disabled=true;btn.textContent="در حال ثبت...";
  try{
    const {data,error}=await sb.rpc("create_order",{
      p_items:state.cart,p_shipping_method:$("#checkoutShipping").value,
      p_customer_name:$("#checkoutName").value,p_phone:$("#checkoutPhone").value,
      p_province:$("#checkoutProvince").value,p_city:$("#checkoutCity").value,p_address:$("#checkoutAddress").value,
      p_postal_code:$("#checkoutPostal").value||null,p_notes:$("#checkoutNotes").value||null,p_coupon_code:$("#checkoutCoupon").value||null
    });
    if(error)throw error;
    for(let idx=0;idx<photos.length;idx++){
      const path=`${state.user.id}/${data.order_id}/${Date.now()}-${idx}-${uid()}.webp`;
      await uploadCompressed("order-files",path,photos[idx],1800,.82);
      const {error:fe}=await sb.from("order_files").insert({order_id:data.order_id,user_id:state.user.id,kind:"customer_photo",path});
      if(fe)throw fe;
    }
    state.currentOrder=data; state.cart=[]; updateCartCount(); closeModal("cartModal");
    await loadSettings();
    $("#paymentOrderNumber").textContent=data.order_number;$("#paymentAmount").textContent=fmt(data.total_amount);
    $("#paymentCardNumber").textContent=state.settings?.card_number||"هنوز توسط مدیریت تنظیم نشده";
    $("#paymentCardHolder").textContent=state.settings?.card_holder_name||"";
    $("#receiptOrderId").value=data.order_id; openModal("paymentModal");
  }catch(err){console.error(err);toast(orderError(err.message),true)}
  finally{btn.disabled=false;btn.textContent="ثبت سفارش"}
}
function orderError(m){
  if(m.includes("FIRST_PURCHASE_ONLY"))return"کد خرید اول فقط برای اولین سفارش قابل استفاده است.";
  if(m.includes("INVALID_COUPON"))return"کد تخفیف معتبر نیست.";
  if(m.includes("TEHRAN_COURIER_ONLY"))return"پیک فقط برای شهر تهران قابل انتخاب است.";
  if(m.includes("OUT_OF_STOCK"))return"موجودی یکی از محصولات کافی نیست.";
  return"ثبت سفارش انجام نشد. دوباره امتحان کن.";
}
async function submitReceipt(e){
  e.preventDefault(); if(!state.user)return;
  const file=$("#receiptFile").files[0],orderId=$("#receiptOrderId").value;if(!file)return;
  const btn=e.submitter;btn.disabled=true;btn.textContent="در حال آپلود...";
  try{
    const path=`${state.user.id}/${orderId}/${Date.now()}-${uid()}.webp`;
    await uploadCompressed("payment-receipts",path,file,1500,.8);
    const {error}=await sb.from("payments").insert({order_id:orderId,user_id:state.user.id,amount:0,receipt_path:path});
    if(error)throw error;
    toast("رسید ارسال شد ✅"); closeModal("paymentModal"); await showMyOrders();
  }catch(err){console.error(err);toast("ارسال رسید ناموفق بود",true)}
  finally{btn.disabled=false;btn.textContent="ارسال رسید"}
}

function openAuth(tab="login"){
  openModal("authModal"); setAuthTab(tab);
}
function setAuthTab(tab){
  $$("[data-auth-tab]").forEach(b=>b.classList.toggle("active",b.dataset.authTab===tab));
  $("#loginForm").hidden=tab!=="login";$("#signupForm").hidden=tab!=="signup";
}
async function signup(e){
  e.preventDefault();
  const email=$("#signupEmail").value.trim(),password=$("#signupPassword").value,name=$("#signupName").value.trim(),phone=$("#signupPhone").value.trim();
  const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:name,phone}}});
  if(error){toast(error.message,true);return;}
  if(data.session){state.user=data.user;await refreshIdentity();closeModal("authModal");toast("ثبت‌نام شد! کد TEHFIRST10 برای خرید اولت 🎉")}
  else toast("ثبت‌نام انجام شد؛ ایمیلت رو برای تأیید چک کن.");
}
async function login(e){
  e.preventDefault();const {data,error}=await sb.auth.signInWithPassword({email:$("#loginEmail").value.trim(),password:$("#loginPassword").value});
  if(error){toast("ایمیل یا رمز عبور درست نیست",true);return;}state.user=data.user;await refreshIdentity();closeModal("authModal");toast("وارد شدی ⚡️");
}
async function logout(){await sb.auth.signOut();state.user=null;state.profile=null;state.isAdmin=false;updateAuthUI();toast("خارج شدی");}

async function showMyOrders(){
  if(!state.user){openAuth();return;}
  const {data,error}=await sb.from("orders").select("*,order_items(*)").order("created_at",{ascending:false});
  if(error){toast("سفارش‌ها لود نشدن",true);return;}
  $("#myOrders").innerHTML=(data||[]).length?(data||[]).map(o=>`<article class="order-card">
    <div class="order-top"><div><b>${safe(o.order_number)}</b><br><small>${new Date(o.created_at).toLocaleString("fa-IR")}</small></div><span class="status ${o.status}">${statusLabel(o.status)}</span></div>
    <p>${o.order_items.map(i=>`${safe(i.title_snapshot)} × ${fa(i.quantity)}`).join("، ")}</p>
    <b>${fmt(o.total_amount)}</b>
    ${o.status==="awaiting_payment"?`<button class="btn primary" onclick='continuePayment(${JSON.stringify({order_id:o.id,order_number:o.order_number,total_amount:o.total_amount}).replace(/'/g,"&#39;")})'>ارسال رسید پرداخت</button>`:""}
  </article>`).join(""):`<div class="empty">هنوز سفارشی نداری.</div>`;
  openModal("ordersModal");
}
window.continuePayment=async o=>{await loadSettings();$("#paymentOrderNumber").textContent=o.order_number;$("#paymentAmount").textContent=fmt(o.total_amount);$("#paymentCardNumber").textContent=state.settings?.card_number||"هنوز تنظیم نشده";$("#paymentCardHolder").textContent=state.settings?.card_holder_name||"";$("#receiptOrderId").value=o.order_id;closeModal("ordersModal");openModal("paymentModal")};

async function openAdmin(){
  if(!state.isAdmin){toast("دسترسی مدیریت نداری",true);return;}openModal("adminModal");await loadAdminOrders();
}
async function loadAdminOrders(){
  const {data,error}=await sb.from("orders").select("*,order_items(*),payments(*)").order("created_at",{ascending:false});
  if(error){toast("سفارش‌ها لود نشدن",true);return;}
  $("#adminOrders").innerHTML=(data||[]).map(o=>`<article class="admin-order-card">
    <div class="admin-card-top"><div><b>${safe(o.order_number)}</b> — ${safe(o.customer_name)}<br><small>${safe(o.phone)} · ${safe(o.city)}</small></div><span class="status ${o.status}">${statusLabel(o.status)}</span></div>
    <p>${o.order_items.map(i=>`${safe(i.title_snapshot)} × ${fa(i.quantity)}`).join("، ")}</p>
    <p><b>${fmt(o.total_amount)}</b> · ارسال: ${o.shipping_method_id==="post"?"پست":"پیک تهران / پس‌کرایه"}</p>
    <details><summary>آدرس و جزئیات</summary><p>${safe(o.province||"")} ${safe(o.city)} — ${safe(o.address)}</p><p>کد پستی: ${safe(o.postal_code||"-")}</p><p>توضیحات: ${safe(o.notes||"-")}</p></details>
    <div class="admin-actions">
      ${o.payments?.[0]?.status==="pending"?`<button class="btn primary" onclick="reviewPayment('${o.payments[0].id}','approved')">تأیید پرداخت</button><button class="btn danger" onclick="reviewPayment('${o.payments[0].id}','rejected')">رد رسید</button><button class="btn ghost" onclick="viewReceipt('${o.payments[0].receipt_path}')">دیدن رسید</button>`:""}
      ${["paid","preparing","shipped"].includes(o.status)?`<select onchange="setOrderStatus('${o.id}',this.value)"><option value="">تغییر وضعیت...</option><option value="preparing">در حال آماده‌سازی</option><option value="shipped">ارسال شد</option><option value="completed">تکمیل شد</option><option value="cancelled">لغو</option></select>`:""}
      <button class="btn ghost" onclick="viewOrderFiles('${o.id}')">عکس‌های مشتری</button>
    </div>
  </article>`).join("") || `<div class="empty">سفارشی نیست.</div>`;
}
window.reviewPayment=async(id,status)=>{const {error}=await sb.from("payments").update({status}).eq("id",id);if(error)return toast(error.message,true);toast(status==="approved"?"پرداخت تأیید شد":"رسید رد شد");await loadAdminOrders();await loadProducts()};
window.setOrderStatus=async(id,status)=>{if(!status)return;const {error}=await sb.from("orders").update({status}).eq("id",id);if(error)return toast(error.message,true);await sb.from("order_status_history").insert({order_id:id,status,changed_by:state.user.id,note:"تغییر وضعیت توسط مدیریت"});toast("وضعیت تغییر کرد");await loadAdminOrders()};
window.viewReceipt=async path=>{const {data,error}=await sb.storage.from("payment-receipts").createSignedUrl(path,120);if(error)return toast("رسید باز نشد",true);window.open(data.signedUrl,"_blank")};
window.viewOrderFiles=async orderId=>{
  const {data}=await sb.from("order_files").select("*").eq("order_id",orderId);if(!data?.length)return toast("عکسی برای این سفارش نیست");
  for(const f of data){const {data:s}=await sb.storage.from("order-files").createSignedUrl(f.path,120);if(s?.signedUrl)window.open(s.signedUrl,"_blank")}
};

async function loadAdminProducts(){
  await loadProducts();
  $("#adminProducts").innerHTML=state.products.map(p=>`<article class="admin-product-card">
    ${getProductImage(p)?`<img class="admin-product-thumb" src="${getProductImage(p)}">`:`<div class="admin-product-thumb"></div>`}
    <div><b>${safe(p.title)}</b><br><small>${productTypeLabel(p.product_type)} · ${fmt(p.price)} ${p.product_type==="ready"?`· موجودی ${fa(p.stock_qty||0)}`:""}</small></div>
    <div class="admin-actions"><button class="btn ghost" onclick="editProduct('${p.id}')">ویرایش</button><button class="btn danger" onclick="deleteProduct('${p.id}')">حذف</button></div>
  </article>`).join("");
}
window.editProduct=id=>{
  const p=state.products.find(x=>x.id===id);if(!p)return;$("#peId").value=p.id;$("#peTitle").textContent="ویرایش محصول";$("#peName").value=p.title;$("#peType").value=p.product_type;$("#peDescription").value=p.description||"";$("#pePrice").value=p.price;$("#peStickerCount").value=p.sticker_count||"";$("#peStock").value=p.stock_qty??"";$("#peActive").checked=p.is_active;openModal("productEditorModal")
};
window.deleteProduct=async id=>{if(!confirm("این محصول حذف شود؟"))return;const {error}=await sb.from("products").delete().eq("id",id);if(error)return toast(error.message,true);toast("محصول حذف شد");await loadAdminProducts()};
function newProduct(){$("#productEditorForm").reset();$("#peId").value="";$("#peTitle").textContent="محصول جدید";$("#peType").value="ready";$("#pePrice").value=95000;$("#peActive").checked=true;openModal("productEditorModal")}
async function saveProduct(e){
  e.preventDefault();const id=$("#peId").value||null;
  const payload={title:$("#peName").value.trim(),slug:id?state.products.find(p=>p.id===id).slug:slugify($("#peName").value),description:$("#peDescription").value,product_type:$("#peType").value,price:Number($("#pePrice").value),sticker_count:$("#peStickerCount").value?Number($("#peStickerCount").value):null,stock_qty:$("#peStock").value!==""?Number($("#peStock").value):null,is_active:$("#peActive").checked};
  let productId=id;
  if(id){const {error}=await sb.from("products").update(payload).eq("id",id);if(error)return toast(error.message,true)}
  else{const {data,error}=await sb.from("products").insert(payload).select().single();if(error)return toast(error.message,true);productId=data.id}
  const files=[...$("#peImages").files];
  for(let i=0;i<files.length;i++){const path=`products/${productId}/${Date.now()}-${i}-${uid()}.webp`;await uploadCompressed("product-images",path,files[i],1600,.85);await sb.from("product_images").insert({product_id:productId,path,sort_order:i})}
  closeModal("productEditorModal");toast("محصول ذخیره شد ✅");await loadAdminProducts();
}
async function loadAdminSettings(){
  await loadSettings();$("#settingsCard").value=state.settings?.card_number||"";$("#settingsCardHolder").value=state.settings?.card_holder_name||"";$("#settingsPhone").value=state.settings?.support_phone||"";$("#settingsCoupon").value=state.settings?.first_order_coupon_code||"TEHFIRST10";
}
async function saveSettings(e){
  e.preventDefault();const {error}=await sb.from("site_settings").update({card_number:$("#settingsCard").value,card_holder_name:$("#settingsCardHolder").value,support_phone:$("#settingsPhone").value,first_order_coupon_code:$("#settingsCoupon").value}).eq("id",1);
  if(error)return toast(error.message,true);toast("تنظیمات ذخیره شد");await loadSettings();
}

function bindUI(){
  $("#authBtn").onclick=()=>openAuth("login");$("#heroSignup").onclick=()=>openAuth("signup");$("#bannerSignup").onclick=()=>openAuth("signup");$("#logoutBtn").onclick=logout;
  $("#cartBtn").onclick=()=>{renderCart();openModal("cartModal")};$("#ordersNav").onclick=showMyOrders;$("#adminNav").onclick=openAdmin;
  $("#checkoutShipping").onchange=updateSummary;$("#checkoutForm").onsubmit=createOrder;$("#receiptForm").onsubmit=submitReceipt;
  $("#signupForm").onsubmit=signup;$("#loginForm").onsubmit=login;
  $$("[data-auth-tab]").forEach(b=>b.onclick=()=>setAuthTab(b.dataset.authTab));
  $$(".filter").forEach(b=>b.onclick=()=>{$$(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderProducts(b.dataset.filter)});
  $("#refreshOrders").onclick=loadAdminOrders;$("#newProductBtn").onclick=newProduct;$("#productEditorForm").onsubmit=saveProduct;$("#settingsForm").onsubmit=saveSettings;
  $$(".admin-tab").forEach(b=>b.onclick=async()=>{$$(".admin-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");const t=b.dataset.adminTab;$("#adminOrdersPanel").hidden=t!=="orders";$("#adminProductsPanel").hidden=t!=="products";$("#adminSettingsPanel").hidden=t!=="settings";if(t==="orders")await loadAdminOrders();if(t==="products")await loadAdminProducts();if(t==="settings")await loadAdminSettings()});
  sb.auth.onAuthStateChange(async(_,session)=>{state.user=session?.user||null;await refreshIdentity()});
}
init();