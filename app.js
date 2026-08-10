const PACKS = {
  ready: { label: 'پک آماده', price: 95000 },
  personal: { label: 'پک شخصی', price: 129000 },
  custom: { label: 'طراحی اختصاصی', price: 179000 }
};
const FIRST_COUPON = 'TEHFIRST10';
const FIRST_DISCOUNT = 0.10;
const POST_SHIPPING = 134000;
const SHIPPING = {
  post: { label: 'پست', price: POST_SHIPPING, note: '۱۳۴ هزار تومان' },
  'tehran-courier': { label: 'تهران — پیک', price: 0, note: 'پس‌کرایه' }
};
const DEFAULT_PRODUCTS = [
  { id: 'drop-cherry', name: 'Cherry Drop', count: 12, tag: 'READY DROP', emoji: '🍒', bg: '#ff9fc9', image: '' },
  { id: 'oops-pack', name: 'Oops! Pack', count: 16, tag: 'TEH ORIGINAL', emoji: '💥', bg: '#ffd84a', image: '' },
  { id: 'daily-chaos', name: 'Daily Chaos', count: 10, tag: 'NEW', emoji: '⚡', bg: '#91c9ff', image: '' }
];

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const toFa = (n) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const faMoney = (n) => `${toFa(Math.round(n / 1000))} هزار تومان`;
const cleanPhone = (value) => value.replace(/[\s-]/g, '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
const validPhone = (value) => /^09\d{9}$/.test(cleanPhone(value));
const uid = () => `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });
$$('.reveal').forEach((el) => revealObserver.observe(el));

function getProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem('tehsticker-ready-products') || 'null');
    return Array.isArray(saved) && saved.length ? saved : DEFAULT_PRODUCTS;
  } catch { return DEFAULT_PRODUCTS; }
}
function saveProducts(products) { localStorage.setItem('tehsticker-ready-products', JSON.stringify(products)); }
let products = getProducts();
let selectedReadyProductId = '';
let selectedFiles = [];
let couponApplied = false;
let selectedShipping = '';

const productGrid = $('#productGrid');
const readyProductSelect = $('#readyProduct');
function renderProducts() {
  productGrid.innerHTML = '';
  readyProductSelect.innerHTML = '<option value="">یک طرح رو انتخاب کن</option>';
  products.forEach((p, index) => {
    const card = document.createElement('article');
    card.className = 'product-card reveal visible';
    const visual = p.image
      ? `<img src="${p.image}" alt="${escapeHtml(p.name)}">`
      : `<div class="placeholder-art">${p.emoji || ['🍒','💥','⚡','🎧'][index % 4]}</div>`;
    card.innerHTML = `
      <div class="product-visual" style="background:${p.bg || '#f1e9dc'}">${visual}<span class="product-tag">${escapeHtml(p.tag || 'READY PACK')}</span></div>
      <div class="product-body">
        <h3>${escapeHtml(p.name)}</h3>
        <div class="product-meta"><span class="product-count">${toFa(p.count)} عدد استیکر</span><span class="product-price">۹۵ هزار تومان</span></div>
        <button type="button" data-buy-ready="${p.id}">سفارش همین پک 💥</button>
      </div>`;
    productGrid.appendChild(card);
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = `${p.name} — ${toFa(p.count)} استیکر`;
    readyProductSelect.appendChild(option);
  });
  $$('[data-buy-ready]').forEach(btn => btn.addEventListener('click', () => chooseReadyProduct(btn.dataset.buyReady, true)));
  renderAdminProducts();
}

function escapeHtml(str='') {
  return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}

const packInput = $('#pack');
const summaryPack = $('#summaryPack');
const summaryPrice = $('#summaryPrice');
const summaryShipping = $('#summaryShipping');
const summaryTotal = $('#summaryTotal');
const shippingInput = $('#shipping');
const shippingButtons = $$('#shippingChoices button');
const packButtons = $$('#packChoices button');
const readyProductField = $('#readyProductField');
const photosField = $('#photosField');
const notesField = $('#notesField');
const notesLabel = $('#notesLabel');
const orderTip = $('#orderTip');
const consentText = $('#consentText');

function choosePack(value, scroll = false) {
  if (!PACKS[value]) return;
  packInput.value = value;
  packButtons.forEach((b) => b.classList.toggle('active', b.dataset.value === value));
  readyProductField.hidden = value !== 'ready';
  photosField.hidden = value === 'ready';
  notesField.hidden = false;
  notesLabel.textContent = value === 'ready' ? 'یادداشت سفارش' : value === 'custom' ? 'تم / توضیحات طراحی' : 'توضیحات';
  $('#notes').placeholder = value === 'ready' ? 'مثلاً توضیح درباره ارسال یا هماهنگی...' : value === 'custom' ? 'مثلاً: قرمز و مشکی، کارتونی، بدون متن...' : 'مثلاً: عکس شماره ۳ حتماً باشه...';
  orderTip.textContent = value === 'ready' ? '🔒 طرح پک آماده ثابت است و سفارش دقیقاً مطابق محصول انتخاب‌شده ثبت می‌شود.' : '💡 عکس‌هایی که سوژه واضح‌تر و نور بهتری دارن، خروجی تمیزتری می‌دن.';
  consentText.textContent = value === 'ready' ? 'تأیید می‌کنم محصول آماده انتخاب‌شده بدون تغییر طرح سفارش داده می‌شود.' : 'تأیید می‌کنم اطلاعات و عکس‌ها برای ساخت سفارش TehSticker ارسال می‌شن.';
  updateSummary();
  persistDraft();
  if (scroll) $('#order').scrollIntoView({ behavior: 'smooth' });
}

function chooseReadyProduct(id, scroll = false) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  selectedReadyProductId = id;
  readyProductSelect.value = id;
  choosePack('ready', scroll);
  updateSummary();
}

function updateSummary() {
  const pack = PACKS[packInput.value];
  const shipping = SHIPPING[selectedShipping];
  if (!pack) {
    summaryPack.textContent = 'هنوز انتخاب نکردی';
    summaryPrice.textContent = '—';
    summaryShipping.textContent = shipping ? shipping.note : 'انتخاب نشده';
    summaryTotal.textContent = '—';
    return;
  }
  if (packInput.value === 'ready') {
    const product = products.find(p => p.id === selectedReadyProductId);
    summaryPack.textContent = product ? `پک آماده — ${product.name}` : 'پک آماده';
  } else summaryPack.textContent = pack.label;
  const productPrice = couponApplied ? pack.price * (1 - FIRST_DISCOUNT) : pack.price;
  summaryPrice.textContent = couponApplied ? `${faMoney(productPrice)} (با تخفیف)` : faMoney(pack.price);
  summaryShipping.textContent = shipping ? shipping.note : 'انتخاب نشده';
  if (!shipping) {
    summaryTotal.textContent = '—';
  } else if (selectedShipping === 'post') {
    summaryTotal.textContent = faMoney(productPrice + POST_SHIPPING);
  } else {
    summaryTotal.textContent = `${faMoney(productPrice)} + پیک پس‌کرایه`;
  }
}

function chooseShipping(value) {
  if (!SHIPPING[value]) return;
  selectedShipping = value;
  shippingInput.value = value;
  shippingButtons.forEach((b) => b.classList.toggle('active', b.dataset.shipping === value));
  updateSummary();
  persistDraft();
}
shippingButtons.forEach((b) => b.addEventListener('click', () => chooseShipping(b.dataset.shipping)));

packButtons.forEach((b) => b.addEventListener('click', () => choosePack(b.dataset.value)));
$$('.choose-pack').forEach((b) => b.addEventListener('click', () => choosePack(b.dataset.pack, true)));
readyProductSelect.addEventListener('change', () => { selectedReadyProductId = readyProductSelect.value; updateSummary(); persistDraft(); });

const photoInput = $('#photos');
const preview = $('#preview');
const counter = $('#photoCounter');
const status = $('#formStatus');
const dropzone = $('#dropzone');
function renderFiles() {
  preview.innerHTML = '';
  selectedFiles.forEach((file, index) => {
    const wrap = document.createElement('div'); wrap.className = 'preview-item';
    const img = document.createElement('img'); img.alt = `عکس انتخاب‌شده ${index + 1}`;
    const url = URL.createObjectURL(file); img.src = url; img.onload = () => URL.revokeObjectURL(url);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-photo'; remove.textContent = '×'; remove.setAttribute('aria-label','حذف عکس');
    remove.addEventListener('click', () => { selectedFiles.splice(index, 1); renderFiles(); });
    wrap.append(img, remove); preview.appendChild(wrap);
  });
  counter.textContent = `${toFa(selectedFiles.length)} / ۱۰`;
}
function addFiles(files) {
  const incoming = [...files].filter((f) => f.type.startsWith('image/'));
  const openSlots = Math.max(0, 10 - selectedFiles.length);
  selectedFiles = selectedFiles.concat(incoming.slice(0, openSlots));
  renderFiles();
  status.textContent = incoming.length > openSlots ? 'حداکثر ۱۰ عکس می‌تونی انتخاب کنی.' : `${toFa(selectedFiles.length)} عکس انتخاب شد.`;
}
photoInput.addEventListener('change', () => addFiles(photoInput.files));
['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.add('drag'); }));
['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, e => { e.preventDefault(); dropzone.classList.remove('drag'); }));
dropzone.addEventListener('drop', e => addFiles(e.dataTransfer.files));

function getRegisteredUser() {
  try { return JSON.parse(localStorage.getItem('tehsticker-user') || 'null'); } catch { return null; }
}
function refreshAccountUI() {
  const user = getRegisteredUser();
  const accountButton = $('#accountButton');
  const discountBox = $('#discountBox');
  if (user) {
    accountButton.textContent = `سلام ${user.name || ''} ✦`;
    discountBox.classList.add('registered');
    discountBox.innerHTML = `<b>✓ عضو TehSticker</b><span>کد خرید اولت: <strong>${FIRST_COUPON}</strong></span>`;
  }
}

const signupModal = $('#signupModal');
function openSignup() {
  signupModal.hidden = false; document.body.style.overflow = 'hidden';
  const user = getRegisteredUser();
  if (user) {
    $('#signupName').value = user.name || ''; $('#signupPhone').value = user.phone || ''; $('#signupEmail').value = user.email || '';
    $('#couponSuccess').hidden = false;
  }
}
function closeSignup() { signupModal.hidden = true; document.body.style.overflow = ''; }
$$('[data-open-signup]').forEach(btn => btn.addEventListener('click', openSignup));
$$('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeSignup));
$('#signupForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#signupName').value.trim(); const phone = $('#signupPhone').value.trim(); const email = $('#signupEmail').value.trim();
  if (!name) { $('#signupStatus').textContent = 'اسمت رو وارد کن.'; return; }
  if (!validPhone(phone)) { $('#signupStatus').textContent = 'شماره موبایل رو به شکل 09xxxxxxxxx وارد کن.'; return; }
  localStorage.setItem('tehsticker-user', JSON.stringify({ name, phone, email, coupon: FIRST_COUPON, registeredAt: new Date().toISOString() }));
  $('#signupStatus').textContent = 'ثبت‌نام انجام شد ✓'; $('#couponSuccess').hidden = false;
  $('#name').value = name; $('#phone').value = phone; refreshAccountUI(); persistDraft();
});
$('#copySignupCoupon').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(FIRST_COUPON); $('#copySignupCoupon').textContent = 'کپی شد ✓'; } catch {}
});

$('#applyCoupon').addEventListener('click', () => {
  const value = $('#coupon').value.trim().toUpperCase();
  const user = getRegisteredUser();
  if (value === FIRST_COUPON && user) {
    couponApplied = true; $('#couponStatus').textContent = '۱۰٪ تخفیف خرید اول اعمال شد ✓'; $('#couponStatus').style.color = '#237a2c'; updateSummary(); persistDraft();
  } else if (value === FIRST_COUPON && !user) {
    couponApplied = false; $('#couponStatus').textContent = 'برای استفاده از این کد اول ثبت‌نام کن.'; openSignup();
  } else { couponApplied = false; $('#couponStatus').textContent = 'این کد معتبر نیست.'; updateSummary(); }
});

function validateForm() {
  if (!packInput.value) return 'اول نوع سفارش رو انتخاب کن.';
  if (packInput.value === 'ready' && !selectedReadyProductId) return 'یکی از طرح‌های آماده رو انتخاب کن.';
  if (!$('#name').value.trim()) return 'اسمت رو وارد کن.';
  if (!validPhone($('#phone').value)) return 'شماره تماس رو به شکل 09xxxxxxxxx وارد کن.';
  if (!selectedShipping) return 'نحوه ارسال رو انتخاب کن.';
  if (packInput.value !== 'ready' && selectedFiles.length === 0) return 'حداقل یک عکس انتخاب کن.';
  if (!$('#consent').checked) return 'تأیید سفارش رو فعال کن.';
  return '';
}

function buildOrderText() {
  const pack = PACKS[packInput.value];
  const product = products.find(p => p.id === selectedReadyProductId);
  const base = pack ? pack.price : 0; const finalPrice = couponApplied ? base * (1 - FIRST_DISCOUNT) : base;
  const shipping = SHIPPING[selectedShipping];
  const lines = ['💥 سفارش جدید TehSticker','',`اسم: ${$('#name').value.trim()}`,`شماره تماس: ${$('#phone').value.trim()}`,`نوع سفارش: ${pack ? pack.label : '—'}`];
  if (packInput.value === 'ready' && product) { lines.push(`طرح آماده: ${product.name}`, `تعداد استیکر داخل پک: ${toFa(product.count)}`); }
  if (packInput.value !== 'ready') lines.push(`تعداد عکس: ${toFa(selectedFiles.length)}`);
  lines.push(`مبلغ محصول: ${faMoney(finalPrice)}`);
  if (selectedShipping === 'post') {
    lines.push(`نحوه ارسال: پست`, `هزینه ارسال: ${faMoney(POST_SHIPPING)}`, `جمع پرداختی: ${faMoney(finalPrice + POST_SHIPPING)}`);
  } else if (selectedShipping === 'tehran-courier') {
    lines.push(`نحوه ارسال: تهران — پیک`, `هزینه ارسال: پس‌کرایه`, `مبلغ فعلی: ${faMoney(finalPrice)} + هزینه پیک هنگام تحویل`);
  }
  if (couponApplied) lines.push(`کد تخفیف: ${FIRST_COUPON} (۱۰٪)`);
  lines.push(`توضیحات: ${$('#notes').value.trim() || 'ندارد'}`);
  return lines.join('\n');
}

const sharePanel = $('#sharePanel'); const shareSummary = $('#shareSummary');
$('#orderForm').addEventListener('submit', (e) => {
  e.preventDefault(); const error = validateForm(); if (error) { status.textContent = error; return; }
  status.textContent = ''; persistDraft(); const pack = PACKS[packInput.value]; const product = products.find(p => p.id === selectedReadyProductId);
  const detail = packInput.value === 'ready' && product ? `${product.name} (${toFa(product.count)} استیکر)` : `${toFa(selectedFiles.length)} عکس`;
  shareSummary.textContent = `${$('#name').value.trim()}، ${pack.label} — ${detail} آماده ارساله.`; sharePanel.hidden = false;
});
$('#closeShare').addEventListener('click', () => { sharePanel.hidden = true; });
$('#shareOrder').addEventListener('click', async () => {
  const text = buildOrderText();
  try {
    const data = { title: 'TehSticker Order', text };
    if (packInput.value !== 'ready' && selectedFiles.length && navigator.canShare && navigator.canShare({ files: selectedFiles })) data.files = selectedFiles;
    if (navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(text); status.textContent = 'متن سفارش کپی شد؛ توی پیام‌رسان دلخواهت Paste کن.'; sharePanel.hidden = true; }
  } catch (err) { if (err?.name !== 'AbortError') status.textContent = 'ارسال مستقیم پشتیبانی نشد؛ از دکمه کپی استفاده کن.'; }
});
$('#copyOrder').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(buildOrderText()); $('#copyOrder').textContent = 'کپی شد ✓'; setTimeout(() => $('#copyOrder').textContent = 'کپی متن سفارش', 1400); }
  catch { status.textContent = 'مرورگر اجازه Clipboard نداده.'; }
});

function persistDraft() {
  const draft = { pack: packInput.value, readyProductId: selectedReadyProductId, shipping: selectedShipping, name: $('#name').value, phone: $('#phone').value, notes: $('#notes').value, coupon: $('#coupon').value, couponApplied };
  localStorage.setItem('tehsticker-draft', JSON.stringify(draft));
}
$('#saveDraft').addEventListener('click', () => { persistDraft(); status.textContent = 'پیش‌نویس روی همین دستگاه ذخیره شد ✓ (عکس‌ها ذخیره نمی‌شن.)'; });
['name','phone','notes','coupon'].forEach(id => $(`#${id}`).addEventListener('change', persistDraft));

// Lightweight product manager for the static MVP. Open from footer or add ?admin=1 to the URL.
const adminModal = $('#adminModal');
function openAdmin() { adminModal.hidden = false; document.body.style.overflow = 'hidden'; renderAdminProducts(); }
function closeAdmin() { adminModal.hidden = true; document.body.style.overflow = ''; }
$('#adminAccess').addEventListener('click', openAdmin);
$$('[data-close-admin]').forEach(btn => btn.addEventListener('click', closeAdmin));
if (new URLSearchParams(location.search).get('admin') === '1') setTimeout(openAdmin, 200);

function fileToDataURL(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); }); }
$('#productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#productName').value.trim(); const count = Number($('#productCount').value); const tag = $('#productTag').value.trim() || 'READY PACK'; const imageFile = $('#productImage').files[0];
  if (!name || !count) return;
  let image = ''; if (imageFile) { try { image = await fileToDataURL(imageFile); } catch {} }
  products.push({ id: uid(), name, count, tag, image, bg: '#f1e9dc', emoji: '💥' }); saveProducts(products); renderProducts(); e.target.reset();
});
function renderAdminProducts() {
  const box = $('#adminProducts'); if (!box) return; box.innerHTML = '';
  products.forEach(p => {
    const row = document.createElement('div'); row.className = 'admin-item';
    row.innerHTML = `<div><b>${escapeHtml(p.name)}</b><small>${toFa(p.count)} استیکر · ۹۵ هزار تومان</small></div><button type="button" data-remove-product="${p.id}">حذف</button>`;
    box.appendChild(row);
  });
  $$('[data-remove-product]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('این محصول حذف شود؟')) return;
    products = products.filter(p => p.id !== btn.dataset.removeProduct); saveProducts(products); if (selectedReadyProductId === btn.dataset.removeProduct) selectedReadyProductId = ''; renderProducts(); updateSummary();
  }));
}

renderProducts(); refreshAccountUI();
try {
  const user = getRegisteredUser(); if (user) { $('#name').value = user.name || ''; $('#phone').value = user.phone || ''; }
  const draft = JSON.parse(localStorage.getItem('tehsticker-draft') || '{}');
  if (draft.pack) choosePack(draft.pack);
  if (draft.shipping && SHIPPING[draft.shipping]) chooseShipping(draft.shipping);
  if (draft.readyProductId && products.some(p => p.id === draft.readyProductId)) { selectedReadyProductId = draft.readyProductId; readyProductSelect.value = draft.readyProductId; }
  if (draft.name) $('#name').value = draft.name; if (draft.phone) $('#phone').value = draft.phone; if (draft.notes) $('#notes').value = draft.notes; if (draft.coupon) $('#coupon').value = draft.coupon;
  couponApplied = Boolean(draft.couponApplied && getRegisteredUser() && draft.coupon?.toUpperCase() === FIRST_COUPON); updateSummary();
} catch {}
