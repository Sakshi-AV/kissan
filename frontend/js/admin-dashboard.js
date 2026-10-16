// Admin Dashboard Controller
let adminChart = null;
let allUsers = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!auth.checkPageAuth('admin')) {
    return;
  }

  setupSidebarNavigation();
  await loadAdminDashboard();

  // Hash navigation
  handleHashNavigation();
});

function setupSidebarNavigation() {
  document.querySelectorAll('.sidebar-item-link').forEach((link) => {
    link.addEventListener('click', () => {
      const pane = link.getAttribute('data-pane');
      if (pane === 'logout') {
        auth.logout();
        return;
      }
      switchPane(pane);
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
  document.querySelectorAll('.sidebar-item-link').forEach((link) => {
    link.classList.toggle('active', link.getAttribute('data-pane') === paneId);
  });

  document.querySelectorAll('.dashboard-view-pane').forEach((pane) => {
    pane.classList.remove('active');
  });

  const target = document.getElementById(`pane-${paneId}`);
  if (target) {
    target.classList.add('active');
    window.location.hash = paneId;

    if (paneId === 'verifications') loadVerifications();
    if (paneId === 'users') loadUsers();
    if (paneId === 'products') loadProductsModeration();
    if (paneId === 'orders') loadPlatformOrders();
    if (paneId === 'reports') loadReports();
    if (paneId === 'logs') loadAuditLogs();
  }
}

async function loadAdminDashboard() {
  try {
    const data = await api.get('/admin/dashboard');

    // Fill metrics
    document.getElementById('statTotalUsers').textContent = data.stats.totalUsers;
    document.getElementById('statTotalFarmers').textContent = data.stats.totalFarmers;
    document.getElementById('statTotalCustomers').textContent = data.stats.totalCustomers;
    document.getElementById('statTotalProducts').textContent = data.stats.totalProducts;
    document.getElementById('statTotalOrders').textContent = data.stats.totalOrders;
    document.getElementById('statTotalRevenue').textContent = `₹${data.stats.totalRevenue.toLocaleString('en-IN')}`;
    document.getElementById('statPendingVerifications').textContent = data.stats.pendingVerifications;
    document.getElementById('statPendingReports').textContent = data.stats.pendingReports;

    // Badges in sidebar
    if (data.stats.pendingVerifications > 0) {
      const b = document.getElementById('sidebarVerifBadge');
      if (b) {
        b.textContent = data.stats.pendingVerifications;
        b.style.display = 'inline-block';
      }
    }

    // Chart.js initialization
    initAdminChart(data.chartData);

    // Recent Logs
    renderRecentLogs(data.recentLogs);
  } catch (err) {
    showToast(err.message || 'Failed to load admin overview', 'error');
  }
}

function initAdminChart(chartData) {
  const ctx = document.getElementById('adminRevenueChart');
  if (!ctx || typeof Chart === 'undefined') return;

  if (adminChart) adminChart.destroy();

  adminChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Platform Gross Volume (₹)',
          data: chartData.revenue,
          backgroundColor: '#16a34a',
          borderRadius: 6,
          yAxisID: 'y',
        },
        {
          label: 'Order Volume',
          data: chartData.orderCounts,
          type: 'line',
          borderColor: '#0284c7',
          backgroundColor: '#0284c7',
          yAxisID: 'y1',
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          ticks: { callback: (v) => `₹${v}` },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

function renderRecentLogs(logs) {
  const container = document.getElementById('recentLogsTableBody');
  if (!container) return;

  if (!logs || logs.length === 0) {
    container.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No recent activity logged.</td></tr>';
    return;
  }

  container.innerHTML = logs
    .map(
      (l) => `
    <tr>
      <td><strong>${l.action}</strong></td>
      <td>${l.user ? `${l.user.name} (${l.user.role})` : 'System'}</td>
      <td>${l.details}</td>
      <td><small class="text-muted">${new Date(l.createdAt).toLocaleTimeString()}, ${new Date(l.createdAt).toLocaleDateString()}</small></td>
    </tr>
  `
    )
    .join('');
}

// 1. Farmer Verifications Management
async function loadVerifications() {
  const container = document.getElementById('verificationsTableBody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="7" class="text-center">Loading applications...</td></tr>';

  try {
    const data = await api.get('/admin/verifications');
    if (!data.verifications || data.verifications.length === 0) {
      container.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding: 3rem;">No farmer verification applications received yet.</td></tr>';
      return;
    }

    container.innerHTML = data.verifications
      .map(
        (v) => `
      <tr>
        <td>
          <strong>${v.farmer ? v.farmer.name : 'Farmer'}</strong><br />
          <small class="text-muted">${v.farmer ? v.farmer.email : ''}</small>
        </td>
        <td>
          <strong>${v.farmName}</strong><br />
          <small class="text-muted">${v.farmAddress}</small>
        </td>
        <td>
          <span style="font-size: 0.82rem; font-weight: 700;">${v.idProofType.toUpperCase()}</span><br />
          <small>${v.idProofNumberMasked}</small>
        </td>
        <td>${v.farmSizeAcres || 1} Acres ${v.organicCertified ? '• <span class="badge badge-organic">Organic</span>' : ''}</td>
        <td>
          <span class="status-pill status-${v.status === 'approved' ? 'delivered' : v.status === 'pending' ? 'pending' : 'cancelled'}">
            ${v.status}
          </span>
        </td>
        <td>
          ${v.status === 'pending' ? `
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-primary btn-sm" onclick="handleVerificationDecision('${v._id}', 'approved')">
                <i class="fa-solid fa-check"></i> Approve
              </button>
              <button class="btn btn-danger btn-sm" onclick="handleVerificationDecision('${v._id}', 'rejected')">
                Reject
              </button>
            </div>
          ` : `
            <small class="text-muted">${v.adminNotes || 'Processed'}</small>
          `}
        </td>
      </tr>
    `
      )
      .join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${err.message}</td></tr>`;
  }
}

async function handleVerificationDecision(id, decision) {
  const note = prompt(`Enter optional review notes for ${decision}:`) || '';
  try {
    await api.patch(`/admin/verifications/${id}`, { status: decision, adminNotes: note });
    showToast(`Farmer verification application ${decision}!`, 'success');
    await loadVerifications();
    await loadAdminDashboard();
  } catch (err) {
    showToast(err.message || 'Error processing verification', 'error');
  }
}

// 2. User Management
async function loadUsers() {
  const container = document.getElementById('usersTableBody');
  if (!container) return;

  const roleFilter = document.getElementById('userRoleFilter')?.value || 'all';
  const search = document.getElementById('userSearchInput')?.value.trim() || '';

  container.innerHTML = '<tr><td colspan="6" class="text-center">Loading users...</td></tr>';

  try {
    const params = {};
    if (roleFilter !== 'all') params.role = roleFilter;
    if (search) params.search = search;

    const data = await api.get('/admin/users', params);
    allUsers = data.users || [];

    if (allUsers.length === 0) {
      container.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No users found matching query.</td></tr>';
      return;
    }

    container.innerHTML = allUsers
      .map(
        (u) => `
      <tr>
        <td>
          <strong>${u.name}</strong><br />
          <small class="text-muted">${u.email}</small>
        </td>
        <td>
          <span class="user-role-badge ${u.role}-badge">${u.role.toUpperCase()}</span>
        </td>
        <td>${u.phone || 'N/A'}</td>
        <td>${u.address?.city || u.farmerProfile?.farmLocation?.city || 'Karnataka'}</td>
        <td>
          <span class="status-pill status-${u.status === 'active' ? 'delivered' : 'cancelled'}">
            ${u.status}
          </span>
        </td>
        <td>
          <button class="btn ${u.status === 'active' ? 'btn-danger' : 'btn-primary'} btn-sm" onclick="toggleUserStatus('${u._id}', '${u.status === 'active' ? 'restricted' : 'active'}')">
            ${u.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
        </td>
      </tr>
    `
      )
      .join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${err.message}</td></tr>`;
  }
}

async function toggleUserStatus(userId, newStatus) {
  if (!confirm(`Are you sure you want to change user status to ${newStatus}?`)) return;

  try {
    await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
    showToast(`User status updated to ${newStatus}`, 'info');
    await loadUsers();
    await loadAdminDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to update user status', 'error');
  }
}

// 3. Product Moderation
async function loadProductsModeration() {
  const container = document.getElementById('adminProductsTableBody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="7" class="text-center">Loading products...</td></tr>';

  try {
    const data = await api.get('/admin/products');
    if (!data.products || data.products.length === 0) {
      container.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No products in catalog.</td></tr>';
      return;
    }

    container.innerHTML = data.products
      .map(
        (p) => `
      <tr>
        <td><img src="${p.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'}" style="width: 44px; height: 44px; border-radius: var(--radius-sm); object-fit: cover;" /></td>
        <td><strong>${p.name}</strong></td>
        <td>${p.farmer?.name || 'Farmer'}</td>
        <td>₹${p.price} / ${p.unit}</td>
        <td>${p.availableQuantity} ${p.unit}</td>
        <td>
          <span class="status-pill status-${p.status === 'active' ? 'delivered' : 'cancelled'}">
            ${p.status}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            ${p.status === 'active' ? `
              <button class="btn btn-secondary btn-sm" onclick="moderateProduct('${p._id}', 'hidden')">Hide</button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="moderateProduct('${p._id}', 'active')">Approve</button>
            `}
            <button class="btn btn-danger btn-sm" onclick="deleteProductAdmin('${p._id}', '${p.name}')"><i class="fa-solid fa-trash-can"></i></button>
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

async function moderateProduct(productId, status) {
  try {
    await api.patch(`/admin/products/${productId}/moderation`, { status });
    showToast(`Product set to ${status}`, 'info');
    await loadProductsModeration();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteProductAdmin(productId, name) {
  if (!confirm(`Permanently remove "${name}" from platform?`)) return;
  try {
    await api.delete(`/products/${productId}`);
    showToast('Listing removed permanently', 'info');
    await loadProductsModeration();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 4. Platform Orders
async function loadPlatformOrders() {
  const container = document.getElementById('adminOrdersTableBody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="6" class="text-center">Loading platform orders...</td></tr>';

  try {
    const data = await api.get('/admin/orders');
    if (!data.orders || data.orders.length === 0) {
      container.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No orders found.</td></tr>';
      return;
    }

    container.innerHTML = data.orders
      .map(
        (o) => `
      <tr>
        <td><strong>${o.orderNumber}</strong></td>
        <td>${o.customer ? o.customer.name : 'Customer'} (${o.shippingAddress?.phone})</td>
        <td>${o.items.length} items (${o.items.map((i) => i.name).join(', ')})</td>
        <td><strong>₹${o.totalAmount}</strong></td>
        <td><span class="status-pill status-${o.status}">${o.status.replace('_', ' ')}</span></td>
        <td><small class="text-muted">${new Date(o.createdAt).toLocaleDateString()}</small></td>
      </tr>
    `
      )
      .join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${err.message}</td></tr>`;
  }
}

// 5. Reports & Complaints
async function loadReports() {
  const container = document.getElementById('adminReportsTableBody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="6" class="text-center">Loading reports...</td></tr>';

  try {
    const data = await api.get('/admin/reports');
    if (!data.reports || data.reports.length === 0) {
      container.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No grievance reports filed.</td></tr>';
      return;
    }

    container.innerHTML = data.reports
      .map(
        (r) => `
      <tr>
        <td><strong>${r.reason.replace('_', ' ').toUpperCase()}</strong></td>
        <td>${r.reporter?.name || 'User'} (${r.reporter?.email})</td>
        <td>${r.reportedProduct?.name || 'General Seller'}</td>
        <td style="max-width: 250px;">${r.description}</td>
        <td><span class="status-pill status-${r.status === 'resolved' ? 'delivered' : 'pending'}">${r.status}</span></td>
        <td>
          ${r.status === 'pending' ? `
            <button class="btn btn-primary btn-sm" onclick="handleReportDecision('${r._id}', 'resolved')">Resolve</button>
            <button class="btn btn-secondary btn-sm" onclick="handleReportDecision('${r._id}', 'dismissed')">Dismiss</button>
          ` : `
            <small class="text-muted">${r.actionTaken || 'Completed'}</small>
          `}
        </td>
      </tr>
    `
      )
      .join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${err.message}</td></tr>`;
  }
}

async function handleReportDecision(id, status) {
  const actionTaken = prompt(`Describe action taken for ${status}:`) || 'Moderator reviewed';
  try {
    await api.patch(`/admin/reports/${id}`, { status, actionTaken });
    showToast(`Report marked as ${status}`, 'success');
    await loadReports();
    await loadAdminDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 6. Audit Logs
async function loadAuditLogs() {
  const container = document.getElementById('auditLogsTableBody');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="5" class="text-center">Loading security audit trails...</td></tr>';

  try {
    const data = await api.get('/admin/logs');
    if (!data.logs || data.logs.length === 0) {
      container.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No logs recorded.</td></tr>';
      return;
    }

    container.innerHTML = data.logs
      .map(
        (l) => `
      <tr>
        <td><span class="badge" style="background-color: var(--bg-tertiary); color: var(--text-primary);">${l.action}</span></td>
        <td>${l.user ? `${l.user.name} (${l.user.role})` : 'System'}</td>
        <td>${l.details}</td>
        <td><small class="text-muted">${l.ipAddress || '127.0.0.1'}</small></td>
        <td><small class="text-muted">${new Date(l.createdAt).toLocaleString()}</small></td>
      </tr>
    `
      )
      .join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${err.message}</td></tr>`;
  }
}
