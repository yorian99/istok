// Konfigurasi
const API_BASE = 'https://script.google.com/macros/s/AKfycbySgCDmrWal_vWNoH89tMVLLWSSF7M6ISZ67gMOZFj34WQUsJq5KhfqanZ6RXXhPSQd/exec'; // ganti dengan URL web app Anda

let currentUser = null;
let authToken = null;

// Helper untuk request ke API
async function apiRequest(path, method = 'GET', data = null) {
  const url = new URL(API_BASE);
  url.searchParams.append('path', path);
  if (authToken) url.searchParams.append('token', authToken);
  
  const options = { method };
  if (data) {
    options.method = 'POST';
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  return await response.json();
}

// Login
document.getElementById('btn-login').addEventListener('click', async () => {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  const res = await apiRequest('login', 'POST', { username, password });
  if (res.success) {
    authToken = res.token;
    currentUser = res.user;
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('main-container').style.display = 'block';
    document.getElementById('user-info').innerText = `${currentUser.username} (${currentUser.role})`;
    loadPage('dashboard');
  } else {
    document.getElementById('login-error').innerText = res.message;
  }
});

// Logout
document.getElementById('logout').addEventListener('click', () => {
  authToken = null;
  currentUser = null;
  document.getElementById('login-container').style.display = 'block';
  document.getElementById('main-container').style.display = 'none';
});

// Navigasi
document.querySelectorAll('[data-page]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = link.getAttribute('data-page');
    loadPage(page);
  });
});

async function loadPage(page) {
  const content = document.getElementById('page-content');
  if (page === 'dashboard') {
    await loadDashboard(content);
  } else if (page === 'products') {
    await loadProducts(content);
  } else if (page === 'pos') {
    await loadPOS(content);
  } else if (page === 'reports') {
    await loadReports(content);
  }
}

// Dashboard
async function loadDashboard(container) {
  const data = await apiRequest('dashboard', 'GET');
  container.innerHTML = `
    <div class="row">
      <div class="col-md-4">
        <div class="card text-white bg-primary mb-3">
          <div class="card-body">
            <h5 class="card-title">Penjualan Hari Ini</h5>
            <p class="card-text fs-3">Rp ${formatRupiah(data.totalSalesToday)}</p>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card text-white bg-warning mb-3">
          <div class="card-body">
            <h5 class="card-title">Stok Menipis</h5>
            <p class="card-text fs-3">${data.lowStockCount} produk</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Halaman Produk
async function loadProducts(container) {
  const products = await apiRequest('products', 'GET');
  let html = `
    <h2>Manajemen Produk</h2>
    <button class="btn btn-success mb-3" id="btn-add-product">Tambah Produk</button>
    <table id="products-table" class="table table-striped">
      <thead>
        <tr><th>SKU</th><th>Nama</th><th>Harga Beli</th><th>Harga Jual</th><th>Stok</th><th>Foto</th><th>Aksi</th></tr>
      </thead>
      <tbody>
  `;
  products.forEach(p => {
    html += `<tr>
      <td>${p.sku}</td>
      <td>${p.name}</td>
      <td>${formatRupiah(p.price_buy)}</td>
      <td>${formatRupiah(p.price_sell)}</td>
      <td>${p.stock}</td>
      <td>${p.photo_url ? `<img src="${p.photo_url}" width="50">` : '-'}</td>
      <td><button class="btn btn-sm btn-warning edit-product" data-id="${p.id}">Edit</button>
          <button class="btn btn-sm btn-danger delete-product" data-id="${p.id}">Hapus</button></td>
    </tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
  
  $('#products-table').DataTable();
  
  document.getElementById('btn-add-product').addEventListener('click', () => showProductModal());
  document.querySelectorAll('.edit-product').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const product = products.find(p => p.id == id);
      showProductModal(product);
    });
  });
}

function showProductModal(product = null) {
  // Implementasi modal untuk tambah/edit produk
  alert('Fitur modal produk akan diimplementasikan. Gunakan data dari form untuk POST /products');
}

// Halaman Kasir
async function loadPOS(container) {
  const products = await apiRequest('products', 'GET');
  let cart = [];
  
  function renderCart() {
    let total = 0;
    let html = '<table class="table"><thead><tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th><th></th></tr></thead><tbody>';
    cart.forEach((item, idx) => {
      const subtotal = item.qty * item.price;
      total += subtotal;
      html += `<tr>
        <td>${item.name}</td>
        <td><input type="number" value="${item.qty}" class="cart-qty" data-idx="${idx}" style="width:70px"></td>
        <td>${formatRupiah(item.price)}</td>
        <td>${formatRupiah(subtotal)}</td>
        <td><button class="btn btn-sm btn-danger remove-cart" data-idx="${idx}">Hapus</button></td>
      </tr>`;
    });
    html += `</tbody><tfoot><tr><td colspan="3">Total</td><td>${formatRupiah(total)}</td></tr></tfoot></table>`;
    html += `<div class="mt-3"><input type="text" id="customer-name" placeholder="Nama Pelanggan" class="form-control mb-2">
             <select id="payment-method" class="form-select mb-2"><option>Cash</option><option>Transfer</option></select>
             <button id="process-sale" class="btn btn-primary">Proses Penjualan</button></div>`;
    document.getElementById('cart-container').innerHTML = html;
    
    document.querySelectorAll('.cart-qty').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = input.dataset.idx;
        cart[idx].qty = parseInt(input.value);
        renderCart();
      });
    });
    document.querySelectorAll('.remove-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = btn.dataset.idx;
        cart.splice(idx, 1);
        renderCart();
      });
    });
    document.getElementById('process-sale').addEventListener('click', async () => {
      const customer = document.getElementById('customer-name').value;
      const payment = document.getElementById('payment-method').value;
      const items = cart.map(i => ({ product_id: i.id, qty: i.qty, price: i.price_sell }));
      const res = await apiRequest('sales', 'POST', { customer_name: customer, payment_method: payment, total: total, items });
      if (res.success) {
        alert('Penjualan berhasil! Invoice: ' + res.invoice);
        cart = [];
        renderCart();
        loadProducts(); // refresh stok
      } else {
        alert('Gagal memproses penjualan');
      }
    });
  }
  
  let productHtml = `<div class="row"><div class="col-md-6"><h3>Daftar Produk</h3><div class="list-group">`;
  products.forEach(p => {
    productHtml += `<button class="list-group-item list-group-item-action add-to-cart" data-id="${p.id}" data-name="${p.name}" data-price="${p.price_sell}">${p.name} - ${formatRupiah(p.price_sell)} (Stok: ${p.stock})</button>`;
  });
  productHtml += `</div></div><div class="col-md-6"><h3>Keranjang</h3><div id="cart-container"></div></div></div>`;
  container.innerHTML = productHtml;
  
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      const existing = cart.find(item => item.id == id);
      if (existing) existing.qty++;
      else cart.push({ id, name, price_sell: price, qty: 1 });
      renderCart();
    });
  });
  renderCart();
}

// Laporan
async function loadReports(container) {
  const sales = await apiRequest('sales', 'GET');
  let html = `<h2>Laporan Penjualan</h2>
  <table id="reports-table" class="table">
    <thead><tr><th>Invoice</th><th>Tanggal</th><th>Pelanggan</th><th>Total</th><th>Metode</th></tr></thead>
    <tbody>`;
  sales.forEach(s => {
    html += `<tr>
      <td>${s.invoice}</td>
      <td>${new Date(s.created_at).toLocaleDateString()}</td>
      <td>${s.customer_name}</td>
      <td>${formatRupiah(s.total)}</td>
      <td>${s.payment_method}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
  $('#reports-table').DataTable();
}

function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(angka);
}
