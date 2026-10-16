// Farmer Dashboard Controller
let salesChart = null;
let currentProducts = [];
let editingProductId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!auth.checkPageAuth('farmer')) {
    return;
  }

  // Setup sidebar navigation tabs
  setupSidebarNavigation();

  // Load initial dashboard data
  await loadFarmerDashboard();
  await loadCategoriesForProductForms();

  // Handle URL hash navigation (e.g. #orders, #products, #inventory)
  handleHashNavigation();
});

function setupSidebarNavigation() {
  document.querySelectorAll('.sidebar-item-link').forEach((link) => {
    link.addEventListener('click', () => {
      const targetPane = link.getAttribute('data-pane');
      if (targetPane === 'logout') {
        auth.logout();
        return;
      }
      switchPane(targetPane);
    });
  });
}

function handleHashNavigation() {
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    switchPane(hash);
  }
}

function switchPane(paneId) {
  // Update sidebar active state
  document.querySelectorAll('.sidebar-item-link').forEach((link) => {
    link.classList.toggle('active', link.getAttribute('data-pane') === paneId);
  });

  // Update visible pane
  document.querySelectorAll('.dashboard-view-pane').forEach((pane) => {
    pane.classList.remove('active');
  });

  const target = document.getElementById(`pane-${paneId}`);
  if (target) {
    target.classList.add('active');
    window.location.hash = paneId;

    if (paneId === 'products') loadFarmerProducts();
    if (paneId === 'orders') loadFarmerOrders();
    if (paneId === 'inventory') loadInventoryTable();
  }
}

async function loadFarmerDashboard() {
  try {
    const data = await api.get('/farmer/dashboard');

    // Fill user info in sidebar
    const user = auth.getCurrentUser();
    if (user) {
      document.getElementById('sidebarUserName').textContent = user.name;
      document.getElementById('farmerFarmNameHeader').textContent = user.farmerProfile?.farmName || `${user.name}'s Farm`;
      if (user.avatar) document.getElementById('sidebarUserAvatar').src = user.avatar;
    }

    // Verification banner
    renderVerificationBanner(data);

    // KPI Cards
    document.getElementById('kpiTotalProducts').textContent = data.stats.totalProducts;
    document.getElementById('kpiActiveProducts').textContent = data.stats.activeProducts;
    document.getElementById('kpiLowStock').textContent = data.stats.lowStockProducts;
    document.getElementById('kpiPendingOrders').textContent = data.stats.pendingOrdersCount;
    document.getElementById('kpiTotalEarnings').textContent = `₹${data.stats.totalEarnings.toLocaleString('en-IN')}`;

    // Update pending order badge in sidebar
    const orderBadge = document.getElementById('sidebarOrderBadge');
    if (orderBadge) {
      orderBadge.textContent = data.stats.pendingOrdersCount;
      orderBadge.style.display = data.stats.pendingOrdersCount > 0 ? 'inline-block' : 'none';
    }

    // Chart.js Sales Graph
    initSalesChart(data.chartData);

    // Recent Orders Table
    renderRecentOrders(data.recentOrders);
  } catch (err) {
    showToast(err.message || 'Failed to load farmer dashboard metrics', 'error');
  }
}

function renderVerificationBanner(data) {
  const banner = document.getElementById('verificationBannerContainer');
  if (!banner) return;

  if (data.isVerified) {
    banner.innerHTML = `
      <div class="verification-banner approved">
        <div class="banner-content">
          <i class="fa-solid fa-circle-check banner-icon" style="color: var(--color-green-700);"></i>
          <div class="banner-text">
            <h4>Verified Farm Producer Active 🎉</h4>
            <p>Your official verification badge is visible on all your listed harvests and profile to build consumer trust.</p>
          </div>
        </div>
      </div>
    `;
  } else if (data.verificationStatus === 'pending') {
    banner.innerHTML = `
      <div class="verification-banner">
        <div class="banner-content">
          <i class="fa-solid fa-clock-rotate-left banner-icon" style="color: var(--color-yellow-600);"></i>
          <div class="banner-text">
            <h4>Verification Application Under Review</h4>
            <p>Your agricultural proof documents have been submitted to administrators. You will be notified once approved.</p>
          </div>
        </div>
      </div>
    `;
  } else {
    banner.innerHTML = `
      <div class="verification-banner">
        <div class="banner-content">
          <i class="fa-solid fa-shield-halved banner-icon" style="color: var(--color-yellow-600);"></i>
          <div class="banner-text">
            <h4>Get Your Official "Verified Farmer" Badge</h4>
            <p>Increase your sales up to 3x by verifying your farm identity with land records or Kisan Credit Card.</p>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openVerificationModal()">
          Apply for Verification
        </button>
      </div>
    `;
  }
}

function initSalesChart(chartData) {
  const ctx = document.getElementById('farmerSalesChart');
  if (!ctx || typeof Chart === 'undefined') return;

  if (salesChart) {
    salesChart.destroy();
  }

  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Net Fulfilled Earnings (₹)',
          data: chartData.data,
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.1)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointBackgroundColor: '#15803d',
          pointRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => `₹${item.raw.toLocaleString('en-IN')}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => `₹${val}`,
          },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        x: {
          grid: { display: false },
        },
      },
    },
  });
}

function renderRecentOrders(recent) {
  const container = document.getElementById('recentOrdersTableBody');
  if (!container) return;

  if (!recent || recent.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted" style="padding: 2rem;">No customer orders placed yet.</td>
      </tr>
    `;
    return;
  }

  container.innerHTML = recent
    .map((order) => {
      const itemsDesc = order.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(', ');
      return `
      <tr>
        <td><strong>${order.orderNumber}</strong></td>
        <td>
          <div>${order.customerName}</div>
          <small class="text-muted">${order.customerPhone}</small>
        </td>
        <td style="max-width: 250px;">${itemsDesc}</td>
        <td><strong>₹${order.farmerTotal}</strong></td>
        <td><span class="status-pill status-${order.status}">${order.status.replace('_', ' ')}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="switchPane('orders')">Manage</button>
        </td>
      </tr>
    `;
    })
    .join('');
}

// Full Orders List
async function loadFarmerOrders() {
  const container = document.getElementById('allOrdersTableBody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="7" class="text-center">Loading orders...</td></tr>';

  try {
    const data = await api.get('/farmer/orders');
    if (!data.orders || data.orders.length === 0) {
      container.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding: 3rem;">No orders found.</td></tr>';
      return;
    }

    container.innerHTML = data.orders
      .map((order) => {
        return order.items
          .map(
            (item) => `
          <tr>
            <td><strong>${order.orderNumber}</strong></td>
            <td>
              <div>${order.customer ? order.customer.name : 'Customer'}</div>
              <small class="text-muted">${order.customer ? order.customer.phone : ''}</small>
            </td>
            <td>
              <div><strong>${item.name}</strong></div>
              <small class="text-muted">${item.quantity} ${item.unit} @ ₹${item.price}/${item.unit}</small>
            </td>
            <td><strong>₹${item.price * item.quantity}</strong></td>
            <td>
              <small>${order.shippingAddress.addressLine}, ${order.shippingAddress.city} - ${order.shippingAddress.pincode}</small>
            </td>
            <td>
              <span class="status-pill status-${item.farmerStatus}">${item.farmerStatus.replace('_', ' ')}</span>
            </td>
            <td>
              <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                ${item.farmerStatus === 'pending' ? `
                  <button class="btn btn-primary btn-sm" onclick="updateOrderItemStatus('${order._id}', '${item._id}', 'accepted')">
                    <i class="fa-solid fa-check"></i> Accept
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="updateOrderItemStatus('${order._id}', '${item._id}', 'rejected')">
                    Reject
                  </button>
                ` : ''}

                ${item.farmerStatus === 'accepted' ? `
                  <button class="btn btn-accent btn-sm" onclick="updateOrderItemStatus('${order._id}', '${item._id}', 'in_transit')">
                    <i class="fa-solid fa-truck"></i> Dispatched
                  </button>
                ` : ''}

                ${item.farmerStatus === 'in_transit' ? `
                  <button class="btn btn-primary btn-sm" onclick="updateOrderItemStatus('${order._id}', '${item._id}', 'delivered')">
                    <i class="fa-solid fa-box-check"></i> Delivered
                  </button>
                ` : ''}

                ${item.farmerStatus === 'delivered' ? `
                  <span style="color: var(--color-green-600); font-size: 0.85rem; font-weight: 700;">Fulfilled</span>
                ` : ''}
              </div>
            </td>
          </tr>
        `
          )
          .join('');
      })
      .join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${err.message}</td></tr>`;
  }
}

async function updateOrderItemStatus(orderId, itemId, newStatus) {
  try {
    await api.patch(`/farmer/orders/${orderId}/items/${itemId}/status`, { status: newStatus });
    showToast(`Order item updated to ${newStatus}`, 'success');
    await loadFarmerOrders();
    await loadFarmerDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to update order status', 'error');
  }
}

// Products CRUD
async function loadFarmerProducts() {
  const container = document.getElementById('farmerProductsTableBody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="7" class="text-center">Loading crop listings...</td></tr>';

  try {
    const data = await api.get('/farmer/products');
    currentProducts = data.products || [];

    if (currentProducts.length === 0) {
      container.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding: 3rem;">You have not listed any crops yet. Click "Add Product" to create your first listing!</td></tr>';
      return;
    }

    container.innerHTML = currentProducts
      .map(
        (p) => `
      <tr>
        <td>
          <img src="${p.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'}" style="width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover;" />
        </td>
        <td>
          <strong>${p.name}</strong>
          ${p.isOrganic ? '<span class="badge badge-organic" style="font-size: 0.65rem; margin-left: 0.35rem;">Organic</span>' : ''}
        </td>
        <td>${p.category?.name || 'Produce'}</td>
        <td><strong>₹${p.price}</strong> / ${p.unit}</td>
        <td>
          <span style="font-weight: 700; color: ${p.availableQuantity <= 5 ? 'var(--color-red-600)' : 'inherit'};">
            ${p.availableQuantity} ${p.unit}
          </span>
          ${p.availableQuantity <= 5 ? '<span class="badge badge-stock-low" style="font-size: 0.65rem; display: block; width: fit-content;">Low</span>' : ''}
        </td>
        <td>
          <span class="status-pill status-${p.availableQuantity > 0 && p.isAvailable ? 'delivered' : 'cancelled'}">
            ${p.availableQuantity > 0 && p.isAvailable ? 'Active' : 'Out of Stock'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="openEditProductModal('${p._id}')" title="Edit Product">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p._id}', '${p.name}')" title="Delete Product">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${err.message}</td></tr>`;
  }
}

// Fast Inventory Table
async function loadInventoryTable() {
  const container = document.getElementById('inventoryTableBody');
  if (!container) return;

  if (currentProducts.length === 0) {
    const data = await api.get('/farmer/products');
    currentProducts = data.products || [];
  }

  container.innerHTML = currentProducts
    .map(
      (p) => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td>₹${p.price} / ${p.unit}</td>
      <td>
        <input type="number" id="fastStockInput_${p._id}" value="${p.availableQuantity}" min="0" style="width: 100px; padding: 0.35rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);" />
        <span style="font-size: 0.85rem; color: var(--text-muted);">${p.unit}</span>
      </td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="quickUpdateStock('${p._id}')">
          <i class="fa-solid fa-floppy-disk"></i> Save Stock
        </button>
      </td>
    </tr>
  `
    )
    .join('');
}

async function quickUpdateStock(productId) {
  const input = document.getElementById(`fastStockInput_${productId}`);
  if (!input) return;

  const newQty = parseInt(input.value, 10);
  try {
    await api.put(`/products/${productId}`, { availableQuantity: newQty });
    showToast('Inventory updated successfully', 'success');
    await loadFarmerProducts();
    await loadFarmerDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to update stock', 'error');
  }
}

// Categories loader for Product forms
async function loadCategoriesForProductForms() {
  try {
    const data = await api.get('/categories');
    const addSelect = document.getElementById('addProdCategory');
    const editSelect = document.getElementById('editProdCategory');

    if (data.categories) {
      data.categories.forEach((cat) => {
        const opt1 = document.createElement('option');
        opt1.value = cat._id;
        opt1.textContent = cat.name;
        if (addSelect) addSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = cat._id;
        opt2.textContent = cat.name;
        if (editSelect) editSelect.appendChild(opt2);
      });
    }
  } catch (e) {}
}

// Add Product Modal & Submission
function openAddProductModal() {
  document.getElementById('addProductModal').classList.add('active');
}

function closeAddProductModal() {
  document.getElementById('addProductModal').classList.remove('active');
}

async function handleAddProductSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submitAddProdBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Listing...';

  // Check if image file was selected
  const fileInput = document.getElementById('addProdImageFile');
  let imageUrl = document.getElementById('addProdImageUrl').value.trim();

  if (fileInput.files.length > 0) {
    try {
      const formData = new FormData();
      formData.append('image', fileInput.files[0]);
      const uploadRes = await api.post('/upload', formData);
      imageUrl = uploadRes.imageUrl;
    } catch (err) {
      showToast('Image upload failed, falling back to default image', 'warning');
    }
  }

  const payload = {
    name: document.getElementById('addProdName').value.trim(),
    description: document.getElementById('addProdDescription').value.trim(),
    category: document.getElementById('addProdCategory').value,
    price: Number(document.getElementById('addProdPrice').value),
    unit: document.getElementById('addProdUnit').value,
    availableQuantity: Number(document.getElementById('addProdQuantity').value),
    images: imageUrl ? [imageUrl] : ['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'],
    isOrganic: document.getElementById('addProdOrganicCheck').checked,
  };

  try {
    await api.post('/products', payload);
    showToast('Product added successfully to marketplace!', 'success');
    closeAddProductModal();
    document.getElementById('addProductForm').reset();
    await loadFarmerProducts();
    await loadFarmerDashboard();
    switchPane('products');
  } catch (err) {
    showToast(err.message || 'Failed to list product', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Save & Publish Crop Listing';
  }
}

// Edit Product Modal
function openEditProductModal(productId) {
  const product = currentProducts.find((p) => p._id === productId);
  if (!product) return;

  editingProductId = productId;
  document.getElementById('editProdName').value = product.name;
  document.getElementById('editProdDescription').value = product.description;
  document.getElementById('editProdCategory').value = product.category?._id || product.category;
  document.getElementById('editProdPrice').value = product.price;
  document.getElementById('editProdUnit').value = product.unit;
  document.getElementById('editProdQuantity').value = product.availableQuantity;
  document.getElementById('editProdImageUrl').value = product.images?.[0] || '';
  document.getElementById('editProdOrganicCheck').checked = product.isOrganic;

  document.getElementById('editProductModal').classList.add('active');
}

function closeEditProductModal() {
  document.getElementById('editProductModal').classList.remove('active');
  editingProductId = null;
}

async function handleEditProductSubmit(e) {
  e.preventDefault();
  if (!editingProductId) return;

  const btn = document.getElementById('submitEditProdBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating Listing...';

  const payload = {
    name: document.getElementById('editProdName').value.trim(),
    description: document.getElementById('editProdDescription').value.trim(),
    category: document.getElementById('editProdCategory').value,
    price: Number(document.getElementById('editProdPrice').value),
    unit: document.getElementById('editProdUnit').value,
    availableQuantity: Number(document.getElementById('editProdQuantity').value),
    images: [document.getElementById('editProdImageUrl').value.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'],
    isOrganic: document.getElementById('editProdOrganicCheck').checked,
  };

  try {
    await api.put(`/products/${editingProductId}`, payload);
    showToast('Product updated successfully', 'success');
    closeEditProductModal();
    await loadFarmerProducts();
    await loadFarmerDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to update product', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Save Changes';
  }
}

async function deleteProduct(productId, name) {
  if (!confirm(`Are you sure you want to remove "${name}" from the marketplace?`)) {
    return;
  }

  try {
    await api.delete(`/products/${productId}`);
    showToast('Product deleted from your catalog', 'success');
    await loadFarmerProducts();
    await loadFarmerDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to delete product', 'error');
  }
}

// Verification Application Modal
function openVerificationModal() {
  document.getElementById('verificationModal').classList.add('active');
}

function closeVerificationModal() {
  document.getElementById('verificationModal').classList.remove('active');
}

async function handleVerificationSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submitVerificationBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

  const payload = {
    farmName: document.getElementById('verifFarmName').value.trim(),
    farmAddress: document.getElementById('verifFarmAddress').value.trim(),
    idProofType: document.getElementById('verifIdType').value,
    idProofNumber: document.getElementById('verifIdNumber').value.trim(),
    farmSizeAcres: Number(document.getElementById('verifFarmSize').value) || 1,
    organicCertified: document.getElementById('verifOrganicCheck').checked,
  };

  try {
    await api.post('/farmer/verification', payload);
    showToast('Verification application submitted! Administrator will review shortly.', 'success');
    closeVerificationModal();
    await loadFarmerDashboard();
  } catch (err) {
    showToast(err.message || 'Verification submission failed', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Submit for Admin Verification';
  }
}
