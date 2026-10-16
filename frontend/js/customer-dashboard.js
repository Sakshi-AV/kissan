// Customer Dashboard Controller
let customerOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!auth.checkPageAuth('customer')) {
    return;
  }

  setupSidebarNavigation();
  await loadCustomerDashboard();

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

    if (paneId === 'orders') loadCustomerOrders();
    if (paneId === 'wishlist') loadCustomerWishlist();
    if (paneId === 'reviews') loadCustomerReviews();
    if (paneId === 'notifications') loadCustomerNotifications();
  }
}

async function loadCustomerDashboard() {
  try {
    const data = await api.get('/customer/dashboard');
    const user = auth.getCurrentUser();

    if (user) {
      document.getElementById('sidebarCustomerName').textContent = user.name;
      document.getElementById('customerGreetingName').textContent = user.name.split(' ')[0];
      if (user.avatar) document.getElementById('sidebarCustomerAvatar').src = user.avatar;
    }

    document.getElementById('kpiCustomerOrders').textContent = data.stats.totalOrders;
    document.getElementById('kpiCustomerSpent').textContent = `₹${data.stats.totalSpent.toLocaleString('en-IN')}`;
    document.getElementById('kpiCustomerWishlist').textContent = data.stats.wishlistCount;
    document.getElementById('kpiCustomerReviews').textContent = data.stats.reviewsCount;

    renderRecentOrders(data.recentOrders);
  } catch (err) {
    showToast(err.message || 'Failed to load customer summary', 'error');
  }
}

function renderRecentOrders(recent) {
  const container = document.getElementById('recentCustomerOrdersTable');
  if (!container) return;

  if (!recent || recent.length === 0) {
    container.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding: 2rem;">No orders placed yet.</td></tr>';
    return;
  }

  container.innerHTML = recent
    .map(
      (order) => `
    <tr>
      <td><strong>${order.orderNumber}</strong></td>
      <td>${new Date(order.createdAt).toLocaleDateString()}</td>
      <td><strong>₹${order.totalAmount}</strong></td>
      <td><span class="status-pill status-${order.status}">${order.status.replace('_', ' ')}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openOrderTrackingModal('${order._id}')">
          <i class="fa-solid fa-truck"></i> Track
        </button>
      </td>
    </tr>
  `
    )
    .join('');
}

// All Orders
async function loadCustomerOrders() {
  const container = document.getElementById('allCustomerOrdersList');
  if (!container) return;

  container.innerHTML = '<div class="text-center" style="padding: 3rem;"><i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--color-green-600);"></i></div>';

  try {
    const data = await api.get('/orders/my-orders');
    customerOrders = data.orders || [];

    if (customerOrders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-box-open"></i></div>
          <h3 class="empty-state-title">No orders yet</h3>
          <p class="empty-state-desc">You haven't ordered any farm-fresh produce yet.</p>
          <a href="/shop.html" class="btn btn-primary">Shop Fresh Produce</a>
        </div>
      `;
      return;
    }

    container.innerHTML = customerOrders
      .map(
        (order) => `
      <div class="dashboard-table-card" style="margin-bottom: 1.5rem;">
        <div class="table-card-header" style="background-color: var(--bg-secondary);">
          <div>
            <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Order Placed: ${new Date(order.createdAt).toLocaleDateString()}</span>
            <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin-top: 0.15rem;">${order.orderNumber}</h4>
          </div>
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <span class="status-pill status-${order.status}">${order.status.replace('_', ' ')}</span>
            <button class="btn btn-secondary btn-sm" onclick="openOrderTrackingModal('${order._id}')">
              <i class="fa-solid fa-truck"></i> Track
            </button>
            ${['pending', 'processing'].includes(order.status) ? `
              <button class="btn btn-danger btn-sm" onclick="cancelOrder('${order._id}')">Cancel</button>
            ` : ''}
          </div>
        </div>

        <div style="padding: 1.25rem 1.75rem;">
          ${order.items.map(i => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
              <div style="display: flex; align-items: center; gap: 1rem;">
                <img src="${i.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'}" style="width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover;" />
                <div>
                  <h5 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">${i.name}</h5>
                  <span style="font-size: 0.8rem; color: var(--text-muted);">Qty: ${i.quantity} ${i.unit} • ₹${i.price} / ${i.unit}</span>
                </div>
              </div>
              <div style="text-align: right;">
                <strong style="color: var(--text-primary); font-size: 1rem;">₹${i.price * i.quantity}</strong>
                <span class="status-pill status-${i.farmerStatus}" style="font-size: 0.68rem; display: block; margin-top: 0.25rem;">${i.farmerStatus}</span>
              </div>
            </div>
          `).join('')}

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.5rem;">
            <span style="font-size: 0.85rem; color: var(--text-muted);">
              Delivery to: ${order.shippingAddress.addressLine}, ${order.shippingAddress.city} (${order.shippingAddress.phone})
            </span>
            <div style="font-size: 1.15rem; font-weight: 800; color: var(--color-green-700);">
              Total: ₹${order.totalAmount} (COD)
            </div>
          </div>
        </div>
      </div>
    `
      )
      .join('');
  } catch (err) {
    container.innerHTML = `<p class="text-danger">${err.message}</p>`;
  }
}

// Order Tracking Timeline Modal
async function openOrderTrackingModal(orderId) {
  let order = customerOrders.find((o) => o._id === orderId);
  if (!order) {
    try {
      const data = await api.get(`/orders/${orderId}`);
      order = data.order;
    } catch (e) {
      showToast('Could not load order tracking details', 'error');
      return;
    }
  }

  document.getElementById('trackingOrderNumber').textContent = order.orderNumber;
  document.getElementById('trackingOrderDate').textContent = new Date(order.createdAt).toLocaleString();
  document.getElementById('trackingTotalAmount').textContent = `₹${order.totalAmount}`;

  // Configure timeline stages:
  // 1. Order Placed (pending)
  // 2. Farmer Accepted (accepted)
  // 3. Harvesting & Packing (processing)
  // 4. Out for Delivery (out_for_delivery / in_transit)
  // 5. Delivered (delivered)
  const steps = ['pending', 'accepted', 'processing', 'in_transit', 'delivered'];
  let currentIdx = steps.indexOf(order.status);
  if (currentIdx === -1) {
    if (order.status === 'out_for_delivery') currentIdx = 3;
    else if (order.status === 'cancelled') currentIdx = -1;
    else currentIdx = 0;
  }

  const stepElements = document.querySelectorAll('.tracking-step-item');
  stepElements.forEach((el, index) => {
    el.classList.remove('completed', 'active');
    if (order.status === 'cancelled') {
      // Cancelled state
    } else if (index < currentIdx) {
      el.classList.add('completed');
    } else if (index === currentIdx) {
      el.classList.add('active');
    }
  });

  document.getElementById('orderTrackingModal').classList.add('active');
}

function closeOrderTrackingModal() {
  document.getElementById('orderTrackingModal').classList.remove('active');
}

async function cancelOrder(orderId) {
  const reason = prompt('Please specify reason for cancellation:');
  if (reason === null) return;

  try {
    await api.patch(`/orders/${orderId}/cancel`, { reason });
    showToast('Order cancelled successfully. Restored inventory.', 'info');
    await loadCustomerOrders();
    await loadCustomerDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to cancel order', 'error');
  }
}

// Wishlist
async function loadCustomerWishlist() {
  const container = document.getElementById('wishlistProductsGrid');
  if (!container) return;

  container.innerHTML = '<div class="text-center" style="grid-column: 1 / -1; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

  try {
    const data = await api.get('/customer/wishlist');
    if (!data.products || data.products.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon"><i class="fa-regular fa-heart"></i></div>
          <h3 class="empty-state-title">Your wishlist is empty</h3>
          <p class="empty-state-desc">Save your favorite seasonal fruits, vegetables, and farm staples for later.</p>
          <a href="/shop.html" class="btn btn-primary">Browse Marketplace</a>
        </div>
      `;
      return;
    }

    container.innerHTML = data.products
      .map(
        (p) => `
      <div class="product-card">
        <div class="product-img-wrapper" onclick="window.location.href='/product-details.html?id=${p._id}'">
          <img src="${p.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}" />
        </div>
        <div class="product-content">
          <h4 class="product-title">${p.name}</h4>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">Farmer: ${p.farmer?.name || 'Local Farm'}</p>
          <div class="product-bottom-row">
            <div class="price-box">
              <span class="price-amount">₹${p.price}</span>
              <span class="price-unit">per ${p.unit}</span>
            </div>
            <button class="btn btn-primary btn-sm" onclick="cart.addToCart('${p._id}', 1)">
              <i class="fa-solid fa-cart-plus"></i> Move to Cart
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join('');
  } catch (err) {
    container.innerHTML = `<p class="text-danger">${err.message}</p>`;
  }
}

// Reviews
async function loadCustomerReviews() {
  const container = document.getElementById('customerReviewsList');
  if (!container) return;

  try {
    const data = await api.get('/customer/reviews');
    if (!data.reviews || data.reviews.length === 0) {
      container.innerHTML = '<div class="empty-state"><p class="text-muted">You have not submitted any reviews yet.</p></div>';
      return;
    }

    container.innerHTML = data.reviews
      .map(
        (r) => `
      <div style="border-bottom: 1px solid var(--border-color); padding: 1.25rem 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
          <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-primary);">${r.product?.name || 'Farm Product'}</h4>
          <div>${renderStarRating(r.rating)}</div>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">${r.comment}</p>
        <small style="color: var(--text-muted);">${new Date(r.createdAt).toLocaleDateString()}</small>
      </div>
    `
      )
      .join('');
  } catch (e) {}
}

function renderStarRating(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += `<i class="fa-solid fa-star" style="color: ${i <= rating ? 'var(--color-yellow-500)' : 'var(--border-color)'}; font-size: 0.85rem;"></i>`;
  }
  return stars;
}

// Notifications
async function loadCustomerNotifications() {
  const container = document.getElementById('customerNotificationsList');
  if (!container) return;

  try {
    const data = await api.get('/notifications');
    if (!data.notifications || data.notifications.length === 0) {
      container.innerHTML = '<div class="empty-state"><p class="text-muted">No notifications right now.</p></div>';
      return;
    }

    container.innerHTML = data.notifications
      .map(
        (n) => `
      <div class="notification-item ${n.isRead ? 'read' : 'unread'}" style="border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 0.75rem;">
        <div class="notification-icon"><i class="fa-solid fa-bell"></i></div>
        <div class="notification-content">
          <div class="notification-title">${n.title}</div>
          <p class="notification-msg">${n.message}</p>
          <span class="notification-time">${new Date(n.createdAt).toLocaleString()}</span>
        </div>
      </div>
    `
      )
      .join('');
  } catch (e) {}
}

async function markAllNotificationsRead(e) {
  if (e) e.preventDefault();
  try {
    await api.patch('/notifications/read-all');
    showToast('All notifications marked as read', 'info');
    await loadCustomerNotifications();
  } catch (e) {}
}

// Profile update
async function handleProfileSave(e) {
  e.preventDefault();
  const name = document.getElementById('profileNameInput').value.trim();
  const phone = document.getElementById('profilePhoneInput').value.trim();
  const address = {
    street: document.getElementById('profileStreetInput').value.trim(),
    city: document.getElementById('profileCityInput').value.trim(),
    state: document.getElementById('profileStateInput').value.trim(),
    pincode: document.getElementById('profilePincodeInput').value.trim(),
  };

  try {
    const res = await api.put('/auth/profile', { name, phone, address });
    api.setUser(res.user);
    showToast('Profile and saved delivery address updated!', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update profile', 'error');
  }
}
