'use strict';

/* Dawakhana SPA â€” vanilla JS, no build step. Talks to the Express API. */

const API = '/api';
let token = localStorage.getItem('dk_token') || '';
let currentUser = null;
let view = 'dashboard';

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const fmtPKR = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
const fmtDate = (d) => (d ? String(d).slice(0, 10) : 'â€”');

function toast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2600);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(API + path, { ...options, headers });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const msg = body?.error || 'Request failed (' + res.status + ')';
    const err = new Error(msg);
    err.status = res.status;
    if (res.status === 401 && path !== '/auth/login') {
      logout();
    }
    throw err;
  }
  return body;
}

function openModal(html) {
  $('#modal-root').innerHTML =
    `<div class="modal-backdrop" onclick="if(event.target===this)closeModal()">` +
    `<div class="modal">${html}</div></div>`;
}
function closeModal() {
  $('#modal-root').innerHTML = '';
}

// â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function switchTab(tab) {
  $('#tab-login').classList.toggle('active', tab === 'login');
  $('#tab-register').classList.toggle('active', tab === 'register');
  $('#login-form').classList.toggle('hidden', tab !== 'login');
  $('#register-form').classList.toggle('hidden', tab !== 'register');
  $('#login-error').textContent = '';
  $('#register-error').textContent = '';
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').textContent = '';
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: $('#login-email').value.trim(),
        password: $('#login-pass').value,
      }),
    });
    token = data.token;
    localStorage.setItem('dk_token', token);
    currentUser = data.user;
    enterApp();
  } catch (err) {
    $('#login-error').textContent = err.message;
  }
});

$('#register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#register-error').textContent = '';
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: $('#reg-name').value.trim(),
        email: $('#reg-email').value.trim(),
        password: $('#reg-pass').value,
      }),
    });
    token = data.token;
    localStorage.setItem('dk_token', token);
    currentUser = data.user;
    enterApp();
  } catch (err) {
    $('#register-error').textContent = err.message;
  }
});

function logout() {
  token = '';
  currentUser = null;
  localStorage.removeItem('dk_token');
  $('#app').style.display = 'none';
  $('#auth-screen').classList.remove('hidden');
  $('#auth-screen').style.display = 'flex';
}

function enterApp() {
  $('#auth-screen').style.display = 'none';
  $('#app').style.display = 'block';
  const initials = (currentUser.name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  $('#user-name').textContent = currentUser.name;
  $('#user-role').textContent = currentUser.role;
  $('#user-avatar').textContent = initials;
  showView('dashboard');
}

// â”€â”€ Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showView(name) {
  view = name;
  document.querySelectorAll('.nav button').forEach((b) => b.classList.remove('active'));
  $('#nav-' + name).classList.add('active');
  ['dashboard', 'products', 'sales', 'customers', 'reports'].forEach((v) => {
    $('#view-' + v).classList.toggle('hidden', v !== name);
  });
  if (name === 'dashboard') renderDashboard();
  if (name === 'products') renderProducts();
  if (name === 'sales') renderSales();
  if (name === 'customers') renderCustomers();
  if (name === 'reports') renderReports();
}

// â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderDashboard() {
  const el = $('#view-dashboard');
  el.innerHTML = '<div class="empty">Loadingâ€¦</div>';
  try {
    const [alerts, report] = await Promise.all([api('/products/alerts'), api('/reports/daily')]);
    const expiringList = alerts.expiring;
    const low = alerts.lowStock.length;
    const exp = expiringList.length;
    const critical = expiringList.filter(
      (p) => p.expiry_date < new Date().toISOString().slice(0, 10)
    ).length;

    const banners = [];
    if (critical > 0)
      banners.push(
        `<div class="alert-banner crit">âš ï¸ ${critical} product(s) already EXPIRED â€” remove from shelf!</div>`
      );
    if (exp - critical > 0)
      banners.push(
        `<div class="alert-banner warn">â³ ${exp - critical} product(s) expiring within 30 days</div>`
      );
    if (low > 0)
      banners.push(`<div class="alert-banner warn">ğŸ“¦ ${low} product(s) low on stock</div>`);

    el.innerHTML =
      banners.join('') +
      `<div class="stats">
        <div class="stat gold"><div class="label">Today's Revenue</div><div class="value">${fmtPKR(report.summary.revenue)}</div><div class="sub">${report.summary.salesCount} sales</div></div>
        <div class="stat"><div class="label">Cash Collected</div><div class="value">${fmtPKR(report.summary.collected)}</div><div class="sub">${fmtPKR(report.summary.cashRevenue)} cash</div></div>
        <div class="stat amber"><div class="label">Credit Sales</div><div class="value">${fmtPKR(report.summary.creditRevenue)}</div><div class="sub">on khata</div></div>
        <div class="stat"><div class="label">Items Sold</div><div class="value">${report.summary.itemsSoldQty}</div><div class="sub">${fmtPKR(report.summary.itemsSoldValue)} value</div></div>
        <div class="stat red"><div class="label">Expiring â‰¤30d</div><div class="value">${exp}</div><div class="sub">${critical} already expired</div></div>
        <div class="stat amber"><div class="label">Low Stock</div><div class="value">${low}</div><div class="sub">items need reorder</div></div>
      </div>
      <div class="panel"><h2>ğŸ”¥ Top Products Today</h2>
        ${
          report.topProducts.length
            ? `<div class="table-wrap"><table><thead><tr><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead><tbody>` +
              report.topProducts
                .map(
                  (p) =>
                    `<tr><td>${esc(p.name)}</td><td>${p.qty_sold}</td><td class="price">${fmtPKR(p.revenue)}</td></tr>`
                )
                .join('') +
              `</tbody></table></div>`
            : `<div class="empty">No sales yet today</div>`
        }
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty">${esc(err.message)}</div>`;
  }
}

// â”€â”€ Products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let productsCache = [];
async function renderProducts() {
  const el = $('#view-products');
  const filters =
    '<div class="toolbar">' +
    '<input class="grow" id="prod-q" placeholder="ğŸ” Search name or categoryâ€¦" oninput="loadProducts()" />' +
    '<select id="prod-filter" onchange="loadProducts()">' +
    '<option value="">All products</option><option value="low">Low stock</option>' +
    '<option value="expiring">Expiring â‰¤30d</option><option value="expired">Expired</option></select>' +
    '<button class="btn small" onclick="openProductModal()">+ Add product</button></div>';
  el.innerHTML = filters + '<div id="prod-table"><div class="empty">Loadingâ€¦</div></div>';
  loadProducts();
}

async function loadProducts() {
  const q = ($('#prod-q')?.value || '').trim();
  const filter = $('#prod-filter')?.value || '';
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (filter === 'low') params.set('low', '1');
  if (filter === 'expiring') params.set('expiring', '30');
  let data;
  try {
    data = await api('/products?' + params.toString());
  } catch (err) {
    $('#prod-table').innerHTML = `<div class="empty">${esc(err.message)}</div>`;
    return;
  }
  productsCache = data.products;
  const today = new Date().toISOString().slice(0, 10);
  let rows = productsCache;
  if (filter === 'expired') rows = rows.filter((p) => p.expiry_date && p.expiry_date < today);

  $('#prod-table').innerHTML = rows.length
    ? `<div class="table-wrap"><table><thead><tr>
        <th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Expiry</th><th>Status</th><th></th>
      </tr></thead><tbody>` +
      rows
        .map((p) => {
          const lowStock = p.stock_qty <= p.min_stock;
          let status = '<span class="badge green">OK</span>';
          if (p.expiry_date && p.expiry_date < today)
            status = '<span class="badge red">EXPIRED</span>';
          else if (p.expiry_date && p.expiry_date <= addDays(30))
            status = '<span class="badge amber">Expiring</span>';
          else if (lowStock) status = '<span class="badge amber">Low stock</span>';
          return `<tr>
            <td><b>${esc(p.name)}</b></td><td class="muted">${esc(p.category)}</td>
            <td class="price">${fmtPKR(p.price_pkr)}</td>
            <td>${p.stock_qty} <span class="muted">/ min ${p.min_stock}</span></td>
            <td class="muted">${fmtDate(p.expiry_date)}</td><td>${status}</td>
            <td><div class="row-actions">
              <button class="icon-btn" onclick='openProductModal(${JSON.stringify(p).replace(/'/g, '&#39;')})'>Edit</button>
              <button class="icon-btn danger" onclick="deleteProduct(${p.id})">âœ•</button>
            </div></td></tr>`
        })
        .join(''') +
      `</tbody></table></div>`
    : '<div class="empty">No products found</div>';
}

const addDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

function openProductModal(product = null) {
  const p = product || {};
  openModal(
    `<h3>${product ? 'Edit product' : 'Add product'}</h3>
    <div class="field"><label>Name *</label><input id="m-name" value="${esc(p.name || '')}" /></div>
    <div class="row">
      <div class="field"><label>Category</label><input id="m-category" value="${esc(p.category || 'General')}" /></div>
      <div class="field"><label>Expiry date</label><input id="m-expiry" type="date" value="${esc(p.expiry_date || '')}" /></div>
    </div>
    <div class="row">
      <div class="field"><label>Price (PKR) *</label><input id="m-price" type="number" min="0" step="0.01" value="${p.price_pkr ?? ''}" /></div>
      <div class="field"><label>Cost (PKR)</label><input id="m-cost" type="number" min="0" step="0.01" value="${p.cost_pkr ?? 0}" /></div>
    </div>
    <div class="row">
      <div class="field"><label>Stock qty *</label><input id="m-stock" type="number" min="0" step="1" value="${p.stock_qty ?? 0}" /></div>
      <div class="field"><label>Min stock alert</label><input id="m-min" type="number" min="0" step="1" value="${p.min_stock ?? 5}" /></div>
    </div>
    <div class="actions">
      <button class="btn secondary" onclick="closeModal()">Cancel</button>
      <button class="btn" onclick="saveProduct(${p.id ? p.id : 'null'})">${product ? 'Save changes' : 'Add product'}</button>
    </div>`
  );
}

async function saveProduct(id) {
  const payload = {
    name: $('#m-name').value.trim(),
    category: $('#m-category').value.trim() || 'General',
    price_pkr: parseFloat($('#m-price').value),
    cost_pkr: parseFloat($('#m-cost').value) || 0,
    stock_qty: parseInt($('#m-stock').value, 10) || 0,
    min_stock: parseInt($('#m-min').value, 10) || 0,
    expiry_date: $('#m-expiry').value || null,
  };
  try {
    if (id) {
      await api('/products/' + id, { method: 'PUT', body: JSON.stringify(payload) });
      toast('Product updated');
    } else {
      await api('/products', { method: 'POST', body: JSON.stringify(payload) });
      toast('Product added');
    }
    closeModal();
    loadProducts();
  } catch (err) {
    toast(err.message, true);
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try {
    await api('/products/' + id, { method: 'DELETE' });
    toast('Product deleted');
    loadProducts();
  } catch (err) {
    toast(err.message, true);
  }
}

// â”€â”€ Sales â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let salesCache = [];
async function renderSales() {
  const el = $('#view-sales');
  el.innerHTML = `<div class="toolbar">
      <button class="btn" onclick="openSaleModal()">+ New sale</button>
      <input type="date" id="sale-date" onchange="loadSales()" />
      <button class="btn secondary small" onclick="document.getElementById('sale-date').value='';loadSales()">All</button>
    </div>
    <div id="sale-table"><div class="empty">Loadingâ€¦</div></div>`;
  loadSales();
}

async function loadSales() {
  const date = $('#sale-date')?.value || '';
  try {
    const data = await api('/sales' + (date ? '?date=' + date : ''));
    salesCache = data.sales;
  } catch (err) {
    $('#sale-table').innerHTML = `<div class="empty">${esc(err.message)}</div>`;
    return;
  }
  $('#sale-table').innerHTML = salesCache.length
    ? `<div class="table-wrap"><table><thead><tr>
        <th>#</th><th>Time</th><th>Customer</th><th>Method</th><th>Total</th><th>Paid</th><th></th>
      </tr></thead><tbody>` +
      salesCache
        .map(
          (s) =>
            `<tr>
              <td class="muted">#${s.id}</td>
              <td class="muted">${esc(s.created_at)}</td>
              <td>${esc(s.customer_name || 'Walk-in')}</td>
              <td>${s.method === 'credit' ? '<span class="badge amber">Khata</span>' : '<span class="badge teal">Cash</span>'}</td>
              <td class="price">${fmtPKR(s.total)}</td>
              <td class="price">${fmtPKR(s.paid)}</td>
              <td><button class="icon-btn" onclick="viewSale(${s.id})">View</button></td>
            </tr>`
        )
        .join(''') +
      ``</tbody></table></div>`
    : '<div class="empty">No sales' + (date ? ' on this date' : ' yet') + '</div>';
}

async function openSaleModal() {
  let products = [];
  let customers = [];
  try {
    [products, customers] = await Promise.all([api('/products'), api('/customers')]);
  } catch (err) {
    toast(err.message, true);
    return;
  }
  const inStock = products.products.filter((p) => p.stock_qty > 0);
  openModal(
    `<h3>New sale</h3>
    <div class="field"><label>Customer (required for khata)</label>
      <select id="s-customer"><option value="">Walk-in customer</option>`
      customers.customers
        .map(
          (c) =>
            `<option value="${c.id}">${esc(c.name)}${c.outstanding > 0 ? ' â€” owes ' + fmtPKR(c.outstanding) : ''}</option>`
        )
        .join(''') +
      ``</select></div>
    <div class="field"><label>Payment method</label>
      <select id="s-method" onchange="document.getElementById('s-paid-wrap').style.display=this.value==='cash'?'block':'none'">
        <option value="cash">Cash</option><option value="credit">Khata (credit)</option>
      </select></div>
    <div class="field"><label>Add items</label>
      <select id="s-product"><option value="">â€” choose product â€”</option>`
      inStock
        .map(
          (p) =>
            `<option value="${p.id}" data-price="${p.price_pkr}">${esc(p.name)} â€” ${fmtPKR(p.price_pkr)} (${p.stock_qty})</option>`
        )
        .join('') +
      `</select>
      <div class="flex" style="margin-top:8px">
        <input id="s-qty" type="number" min="1" value="1" style="width:80px" />
        <button class="btn secondary small" onclick="addSaleItem()">+ Add</button>
      </div></div>
    <div id="s-items"></div>
    <div class="field" id="s-paid-wrap"><label>Amount paid</label><input id="s-paid" type="number" min="0" step="0.01" value="0" /></div>
    <div class="flex"><b id="s-total">Total: Rs 0</b></div>
    <div class="actions">
      <button class="btn secondary" onclick="closeModal()">Cancel</button>
      <button class="btn" onclick="submitSale()">Complete sale</button>
    </div>`
  );
  window._saleItems = [];
  window._saleProducts = inStock;
  updateSaleUI();
}

window.addSaleItem = function () {
  const sel = $('#s-product');
  const qty = parseInt($('#s-qty').value, 10) || 1;
  if (!sel.value) return toast('Choose a product', true);
  const p = window._saleProducts.find((x) => x.id === parseInt(sel.value, 10));
  if (!p) return;
  window._saleItems.push({ product_id: p.id, name: p.name, price: p.price_pkr, qty });
  updateSaleUI();
};

function updateSaleUI() {
  const total = window._saleItems.reduce((t, i) => t + i.price * i.qty, 0);
  $('#s-items').innerHTML =
    window._saleItems.length === 0
      ? '<p class="muted">No items added yet</p>'
      : '<table><thead><tr><th>Item</th><th>Qty</th><th>Line</th><th></th></tr></thead><tbody>' +
        window._saleItems
          .map(
            (i, idx) =>
              `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td class="price">${fmtPKR(i.price * i.qty)}</td>
               <td><button class="icon-btn danger" onclick="window._saleItems.splice(${idx},1);updateSaleUI()">âœ•</button></td></tr>`
          )
          .join('') +
        '</tbody></table>';
  $('#s-total').textContent = 'Total: ' + fmtPKR(total);
}

async function submitSale() {
  if (window._saleItems.length === 0) return toast('Add at least one item', true);
  const method = $('#s-method').value;
  const customer_id = parseInt($('#s-customer').value, 10) || null;
  const paid = parseFloat($('#s-paid').value) || 0;
  if (method === 'credit' && !customer_id) return toast('Khata sale needs a customer', true);
  try {
    const data = await api('/sales', {
      method: 'POST',
      body: JSON.stringify({
        items: window._saleItems.map((i) => ({ product_id: i.product_id, qty: i.qty })),
        method,
        customer_id,
        paid,
      }),
    });
    toast('Sale #' + data.sale.id + ' completed');
    closeModal();
    loadSales();
  } catch (err) {
    toast(err.message, true);
  }
}

async function viewSale(id) {
  try {
    const data = await api('/sales/' + id);
    const s = data.sale;
    openModal(
      `<h3>Sale #${s.id} â€” ${fmtDate(s.created_at)}</h3>
      <p class="muted">${esc(s.created_at)} Â· ${esc(s.customer_name || 'Walk-in')} Â· ${s.method.toUpperCase()}</p>
      <div class="table-wrap"><table><thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Line</th></tr></thead><tbody>` +
        s.items
          .map(
            (i) =>
              `<tr><td>${esc(i.product_name)}</td><td>${i.qty}</td><td>${fmtPKR(i.unit_price)}</td><td class="price">${fmtPKR(i.line_total)}</td></tr>`
          )
          .join('') +
        `</tbody></table></div>
      <div class="flex" style="justify-content:flex-end;margin-top:12px"><b>Total: ${fmtPKR(s.total)}</b></div>
      <div class="actions"><button class="btn" onclick="closeModal()">Close</button></div>`
    );
  } catch (err) {
    toast(err.message, true);
  }
}

// â”€â”€ Customers (Khata) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function renderCustomers() {
  const el = $('#view-customers');
  try {
    const data = await api('/customers');
    const customers = data.customers;
    const totalOutstanding = customers.reduce((t, c) => t + c.outstanding, 0);
    el.innerHTML =
      `<div class="stats">
        <div class="stat gold"><div class="label">Total Outstanding</div><div class="value">${fmtPKR(totalOutstanding)}</div><div class="sub">across ${customers.length} customers</div></div>
        <div class="stat red"><div class="label">Customers Owing</div><div class="value">${customers.filter((c) => c.outstanding > 0).length}</div><div class="sub">active khata</div></div>
      </div>
      <div class="panel"><h2>ğŸ‘¥ Customer Khata <span class="count">${customers.length} customers</span></h2>
        <div class="toolbar"><button class="btn small" onclick="openCustomerModal()">+ Add customer</button></div>
        <div class="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Outstanding</th><th></th></tr></thead><tbody>` +
      customers
        .map(
          (c) =>
            `<tr>
              <td><b>${esc(c.name)}</b><div class="muted">${esc(c.address || '')}</div></td>
              <td class="muted">${esc(c.phone || 'â€”')}</td>
              <td class="price ${c.outstanding > 0 ? '' : 'muted'}">${fmtPKR(c.outstanding)}</td>
              <td><div class="row-actions">
                <button class="icon-btn" onclick="openLedger(${c.id})">Ledger</button>
                <button class="icon-btn" onclick="recordPayment(${c.id})">+ Payment</button>
              </div></td>
            </tr>`
        )
        .join('') +
      `</tbody></table></div></div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty">${esc(err.message)}</div>`;
  }
}

function openCustomerModal() {
  openModal(
    `<h3>Add customer</h3>
    <div class="field"><label>Name *</label><input id="c-name" /></div>
    <div class="field"><label>Phone</label><input id="c-phone" /></div>
    <div class="field"><label>Address</label><input id="c-address" /></div>
    <div class="actions">
      <button class="btn secondary" onclick="closeModal()">Cancel</button>
      <button class="btn" onclick="saveCustomer()">Add</button>
    </div>`
  );
}

async function saveCustomer() {
  try {
    await api('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: $('#c-name').value.trim(),
        phone: $('#c-phone').value.trim() || null,
        address: $('#c-address').value.trim() || null,
      }),
    });
    toast('Customer added');
    closeModal();
    renderCustomers();
  } catch (err) {
    toast(err.message, true);
  }
}

async function openLedger(id) {
  try {
    const data = await api('/customers/' + id + '/ledger');
    openModal(
      `<h3>${esc(data.customer.name)} â€” Khata</h3>
      <p class="muted">Phone: ${esc(data.customer.phone || 'â€”')} Â· Address: ${esc(data.customer.address || 'â€”')}</p>
      <div class="stats" style="grid-template-columns:1fr">
        <div class="stat ${data.balance > 0 ? 'red' : 'green'}"><div class="label">Outstanding Balance</div><div class="value">${fmtPKR(data.balance)}</div></div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Note</th><th>Amount</th></tr></thead><tbody>` +
        (data.entries.length
          ? data.entries
              .map(
                (e) =>
                  `<tr><td class="muted">${fmtDate(e.created_at)}</td>
                   <td>${e.kind === 'sale' ? '<span class="badge amber">Sale</span>' : '<span class="badge green">Payment</span>'}</td>
                   <td class="muted">${esc(e.note || e.product_name || 'â€”')}</td>
                   <td class="price ${e.kind === 'payment' ? 'green' : ''}">${e.kind === 'payment' ? 'âˆ’' : '+'}${fmtPKR(e.amount)}</td></tr>`
              )
              .join(''')
          : '<tr><td colspan="4" class="empty">No ledger entries</td></tr>') +
        `</tbody></table></div>
      <div class="actions"><button class="btn" onclick="closeModal()">Close</button></div>`(€€€€¤ì(€ô…Ñ €¡•ÉÈ¤ì(€€€Ñ½…ÍĞ¡•ÉÈ¹µ•ÍÍ…”°ÑÉÕ”¤ì(€ô)ô()™Õ¹Ñ¥½¸É•½É‘A…åµ•¹Ğ¡¥¤ì(€½Á•¹5½‘…° (€€€€ñ ÌùI•½ÉÁ…åµ•¹Ğğ½ Ìø(€€€€ñ‘¥Ø±…ÍÌô‰™¥•±ˆøñ±…‰•°ùµ½Õ¹Ğ€¡A-H¤€¨ğ½±…‰•°øñ¥¹ÁÕĞ¥ô‰Àµ…µ½Õ¹ĞˆÑåÁ”ô‰¹Õµ‰•Èˆµ¥¸ôˆÄˆÍÑ•ÀôˆÀ¸ÀÄˆ€¼øğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰™¥•±ˆøñ±…‰•°ù9½Ñ”ğ½±…‰•°øñ¥¹ÁÕĞ¥ô‰Àµ¹½Ñ”ˆÁ±…•¡½±‘•Èô‰”¹œ¸…Í É••¥Ù•ˆ€¼øğ½‘¥Øø(€€€€ñ‘¥Ø±…ÍÌô‰…Ñ¥½¹Ìˆø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸Í•½¹‘…Éäˆ½¹±¥¬ô‰±½Í•5½‘…° ¤ˆù…¹•°ğ½‰ÕÑÑ½¸ø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÌô‰‰Ñ¸ˆ½¹±¥¬ô‰ÍÕ‰µ¥ÑA…åµ•¹Ğ ‘í¥‘ô¤ˆùI•½Éğ½‰ÕÑÑ½¸ø(€€€€ğ½‘¥Øù€(€€¤ì)ô()…Íå¹Œ™Õ¹Ñ¥½¸ÍÕ‰µ¥ÑA…åµ•¹Ğ¡¥¤ì(€½¹ÍĞ…µ½Õ¹Ğ€ôÁ…ÉÍ•±½…Ğ  œÀµ…µ½Õ¹Ğœ¤¹Ù…±Õ”¤ì(€¥˜€ ……µ½Õ¹Ğñğ…µ½Õ¹Ğ€ğô€À¤É•ÑÕÉ¸Ñ½…ÍĞ ¹Ñ•È„Ù…±¥…µ½Õ¹Ğœ°ÑÉÕ”¤ì(€ÑÉäì(€€€…İ…¥Ğ…Á¤ œ½ÕÍÑ½µ•ÉÌ¼œ€¬¥€¬€œ½Á…åµ•¹ÑÌœ°ì(€€€€€µ•Ñ¡½è€A=MPœ°(€€€€€‰½‘äè)M=8¹ÍÑÉ¥¹¥™ä¡ì…µ½Õ¹Ğ°¹½Ñ”è€ œÀµ¹½Ñ”œ¤¹Ù…±Õ”¹ÑÉ¥´ ¤ñğ¹Õ±°ô¤°(€€€ô¤ì(€€€Ñ½…ÍĞ A…åµ•¹ĞÉ•½É‘•œ¤ì(€€€±½Í•5½‘…° ¤ì(€€€É•¹‘•ÉÕÍÑ½µ•ÉÌ ¤ì(€ô…Ñ €¡•ÉÈ¤ì(€€€Ñ½…ÍĞ¡•ÉÈ¹µ•ÍÍ…”°ÑÉÕ”¤ì(€ô)ô((¼¼ƒŠRŠR I•Á½ÉÑÌƒŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠR )…Íå¹Œ™Õ¹Ñ¥½¸É•¹‘•ÉI•Á½ÉÑÌ ¤ì(€½¹ÍĞ•°€ô€ œÙ¥•ÜµÉ•Á½ÉÑÌœ¤ì(€•°¹¥¹¹•É!Q50€ô€ñ‘¥Ø±…ÍÌô‰Ñ½½±‰…Èˆø(€€€€€€ñ±…‰•°±…ÍÌô‰µÕÑ•ˆù…¥±äÉ•Á½ÉĞèğ½±…‰•°ø(€€€€€€ñ¥¹ÁÕĞÑåÁ”ô‰‘…Ñ”ˆ¥ô‰É•Á½ÉĞµ‘…Ñ”ˆ½¹¡…¹”ô‰±½…‘I•Á½ÉĞ ¤ˆ€¼ø(€€€€ğ½‘¥Øø(€€€€ñ‘¥Ø¥ô‰É•Á½ÉĞµ‰½‘äˆøñ‘¥Ø±…ÍÌô‰•µÁÑäˆù1½…‘¥¹ŸŠ˜ğ½‘¥Øøğ½‘¥Øù€ì(€±½…‘I•Á½ÉĞ ¤ì)ô()…Íå¹Œ™Õ¹Ñ¥½¸±½…‘I•Á½ÉĞ ¤ì(€½¹ÍĞ‘…Ñ”€ô€ œÉ•Á½ÉĞµ‘…Ñ”œ¤ü¹Ù…±Õ”ñğ€œœì(€ÑÉäì(€€€½¹ÍĞ‘…Ñ„€ô…İ…¥Ğ…Á¤ œ½É•Á½ÉÑÌ½‘…¥±äœ€¬€¡‘…Ñ”€ü€œı‘…Ñ”ôœ€¬‘…Ñ”€è€œœ¤¤ì(€€€½¹ÍĞÌ€ô‘…Ñ„¹ÍÕµµ…Éäì(€€€€ œÉ•Á½ÉĞµ‰½‘äœ¤¹¥¹¹•É!Q50€ô€ñ‘¥Ø±…ÍÌô‰ÍÑ…ÑÌˆø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÍÑ…Ğ½±ˆøñ‘¥Ø±…ÍÌô‰±…‰•°ˆùI•Ù•¹Õ”ğ½‘¥Øøñ‘¥Ø±…ÍÌô‰Ù…±Õ”ˆø‘í™µÑA-H¡Ì¹É•Ù•¹Õ”¥ôğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÍÕˆˆø‘íÌ¹Í…±•Í½Õ¹ÑôÍ…±•Ìƒ
Ü€‘í‘…Ñ„¹‘…Ñ•ôğ½‘¥Øøğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÍÑ…Ğˆøñ‘¥Ø±…ÍÌô‰±…‰•°ˆù…Í ğ½‘¥Øøñ‘¥Ø±…ÍÌô‰Ù…±Õ”ˆø‘í™µÑA-H¡Ì¹…Í¡I•Ù•¹Õ”¥ôğ½‘¥Øøğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÍÑ…Ğ…µ‰•Èˆøñ‘¥Ø±…ÍÌô‰±…‰•°ˆù-¡…Ñ„€¡É•‘¥Ğ¤ğ½‘¥Øøñ‘¥Ø±…ÍÌô‰Ù…±Õ”ˆø‘í™µÑA-H¡Ì¹É•‘¥ÑI•Ù•¹Õ”¥ôğ½‘¥Øøğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÍÑ…Ğˆøñ‘¥Ø±…ÍÌô‰±…‰•°ˆù½±±•Ñ•ğ½‘¥Øøñ‘¥Ø±…ÍÌô‰Ù…±Õ”ˆø‘í™µÑA-H¡Ì¹½±±•Ñ•¥ôğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÍÕˆˆù½˜€‘í™µÑA-H¡Ì¹É•Ù•¹Õ”¥ôğ½‘¥Øøğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰ÍÑ…Ğˆøñ‘¥Ø±…ÍÌô‰±…‰•°ˆù%Ñ•µÌM½±ğ½‘¥Øøñ‘¥Ø±…ÍÌô‰Ù…±Õ”ˆø‘íÌ¹¥Ñ•µÍM½±‘EÑåôğ½‘¥Øøñ‘¥Ø±…ÍÌô‰ÍÕˆˆø‘í™µÑA-H¡Ì¹¥Ñ•µÍM½±‘Y…±Õ”¥ôğ½‘¥Øøğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰Á…¹•°ˆøñ ÈûÂ~R”Q½ÀAÉ½‘ÕÑÌğ½ Èø(€€€€€€€€‘ì(€€€€€€€€€‘…Ñ„¹Ñ½ÁAÉ½‘ÕÑÌ¹±•¹Ñ (€€€€€€€€€€€€ü€ñ‘¥Ø±…ÍÌô‰Ñ…‰±”µİÉ…ÀˆøñÑ…‰±”øñÑ¡•…øñÑÈøñÑ øŒğ½Ñ øñÑ ùAÉ½‘ÕĞğ½Ñ øñÑ ùEÑäğ½Ñ øñÑ ùI•Ù•¹Õ”ğ½Ñ øğ½ÑÈøğ½Ñ¡•…øñÑ‰½‘äù€€¬(€€€€€€€€€€€€€‘…Ñ„¹Ñ½ÁAÉ½‘ÕÑÌ(€€€€€€€€€€€€€€€€¹µ…À (€€€€€€€€€€€€€€€€€€¡À°¤¤€ôø(€€€€€€€€€€€€€€€€€€€€ñÑÈøñÑ±…ÍÌô‰µÕÑ•ˆø‘í¤€¬€Åôğ½ÑøñÑø‘í•ÍŒ¡À¹¹…µ”¥ôğ½ÑøñÑø‘íÀ¹ÅÑå}Í½±‘ôğ½ÑøñÑ±…ÍÌô‰ÁÉ¥”ˆø‘í™µÑA-H¡À¹É•Ù•¹Õ”¥ôğ½Ñøğ½ÑÈù€(€€€€€€€€€€€€€€€€¤(€€€€€€€€€€€€€€€€¹©½¥¸ œœ¤€¬(€€€€€€€€€€€€€€ğ½Ñ‰½‘äøğ½Ñ…‰±”øğ½‘¥Øù€(€€€€€€€€€€€€è€œñ‘¥Ø±…ÍÌô‰•µÁÑäˆù9¼Í…±•Ì½¸Ñ¡¥Ì‘…äğ½‘¥Øøœ(€€€€€€€ô(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÌô‰Á…¹•°ˆøñ ÈûŠjƒ¾â<%¹Ù•¹Ñ½Éä±•ÉÑÌğ½ Èø(€€€€€€€€ñ‘¥Ø±…ÍÌô‰™±•àˆø(€€€€€€€€€€ñÍÁ…¸±…ÍÌô‰‰…‘”…µ‰•Èˆø‘íÌ€ü€œœ€è€œô‘í‘…Ñ„¹…±•ÉÑÌ¹±½İMÑ½­½Õ¹Ñô±½ÜÍÑ½¬ğ½ÍÁ…¸ø(€€€€€€€€€€ñÍÁ…¸±…ÍÌô‰‰…‘”É•ˆø‘í‘…Ñ„¹…±•ÉÑÌ¹•áÁ¥É¥¹½Õ¹Ñô•áÁ¥É¥¹œƒŠ&ÌÁğ½ÍÁ…¸ø(€€€€€€€€ğ½‘¥Øøğ½‘¥Øù€ì(€ô…Ñ €¡•ÉÈ¤ì(€€€€ œÉ•Á½ÉĞµ‰½‘äœ¤¹¥¹¹•É!Q50€ô€ñ‘¥Ø±…ÍÌô‰•µÁÑäˆø‘í•ÍŒ¡•ÉÈ¹µ•ÍÍ…”¥ôğ½‘¥Øù€ì(€ô)ô((¼¼ƒŠRŠR 	½½ĞƒŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠRŠR (¡…Íå¹Œ™Õ¹Ñ¥½¸‰½½Ğ ¤ì(€¥˜€ …Ñ½­•¸¤É•ÑÕÉ¸ì(€ÑÉäì(€€€½¹ÍĞ‘…Ñ„€ô…İ…¥Ğ…Á¤ œ½…ÕÑ ½µ”œ¤ì(€€€ÕÉÉ•¹ÑUÍ•È€ô‘…Ñ„¹ÕÍ•Èì(€€€•¹Ñ•ÉÁÀ ¤ì(€ô…Ñ ì(€€€±½½ÕĞ ¤ì(€ô)ô¤ ¤ì