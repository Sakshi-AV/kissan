// Checkout Process Module
let checkoutCart = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  if (!auth.checkPageAuth('customer')) {
    return;
  }

  await loadCheckoutData();
  fillSavedAddress();
});

async function loadCheckoutData() {
  const summaryContainer = document.getElementById('checkoutItemsSummary');
  const subtotalEl = document.getElementById('checkoutSubtotal');
  const shippingEl = document.getElementById('checkoutShipping');
  const totalEl = document.getElementById('checkoutTotal');

  try {
    checkoutCart = await cart.loadCartData();

    if (!checkoutCart || !checkoutCart.items || checkoutCart.items.length === 0) {
      showToast('Your cart is empty. Please add products first.', 'warning');
      setTimeout(() => (window.location.href = '/shop.html'), 1000);
      return;
    }

    if (checkoutCart.hasOutOfStock) {
      showToast('Some items in your cart exceed available stock. Please adjust quantities.', 'error');
      setTimeout(() => (window.location.href = '/cart.html'), 1500);
      return;
    }

    summaryContainer.innerHTML = checkoutCart.items
      .map(
        (i) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="${i.product?.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'}" style="width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover;" />
          <div>
            <h5 style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">${i.product?.name}</h5>
            <span style="font-size: 0.78rem; color: var(--text-muted);">${i.quantity} x ₹${i.product?.price} / ${i.product?.unit}</span>
          </div>
        </div>
        <span style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary);">₹${i.itemTotal}</span>
      </div>
    `
      )
      .join('');

    subtotalEl.textContent = `₹${checkoutCart.subtotal}`;
    shippingEl.textContent = checkoutCart.shippingFee === 0 ? 'FREE' : `₹${checkoutCart.shippingFee}`;
    totalEl.textContent = `₹${checkoutCart.totalAmount}`;
  } catch (err) {
    showToast(err.message || 'Error loading checkout data', 'error');
  }
}

function fillSavedAddress() {
  const user = auth.getCurrentUser();
  if (user) {
    document.getElementById('shippingFullName').value = user.name || '';
    document.getElementById('shippingPhone').value = user.phone || '';
    if (user.address) {
      document.getElementById('shippingAddressLine').value = user.address.street || '';
      document.getElementById('shippingCity').value = user.address.city || '';
      document.getElementById('shippingState').value = user.address.state || '';
      document.getElementById('shippingPincode').value = user.address.pincode || '';
    }
  }
}

async function handlePlaceOrder(e) {
  e.preventDefault();

  if (!checkoutCart || !checkoutCart.items || checkoutCart.items.length === 0) {
    showToast('Your cart is empty', 'error');
    return;
  }

  const placeBtn = document.getElementById('placeOrderBtn');
  placeBtn.disabled = true;
  placeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Order...';

  const shippingAddress = {
    fullName: document.getElementById('shippingFullName').value.trim(),
    phone: document.getElementById('shippingPhone').value.trim(),
    addressLine: document.getElementById('shippingAddressLine').value.trim(),
    city: document.getElementById('shippingCity').value.trim(),
    state: document.getElementById('shippingState').value.trim(),
    pincode: document.getElementById('shippingPincode').value.trim(),
    landmark: document.getElementById('shippingLandmark').value.trim(),
  };

  const payload = {
    items: checkoutCart.items.map((i) => ({
      product: i.product._id,
      name: i.product.name,
      price: i.product.price,
      unit: i.product.unit,
      quantity: i.quantity,
    })),
    shippingAddress,
    paymentMethod: 'cod',
  };

  try {
    const res = await api.post('/orders', payload);
    await cart.updateBadge();

    // Show Confirmation Modal
    const numEl = document.getElementById('confirmedOrderNumber');
    if (numEl) numEl.textContent = res.order.orderNumber;

    const amountEl = document.getElementById('confirmedOrderAmount');
    if (amountEl) amountEl.textContent = `₹${res.order.totalAmount}`;

    const phoneEl = document.getElementById('confirmedOrderPhone');
    if (phoneEl) phoneEl.textContent = res.order.shippingAddress.phone;

    const modal = document.getElementById('orderSuccessModal');
    if (modal) modal.classList.add('active');
  } catch (err) {
    showToast(err.message || 'Failed to place order', 'error');
    placeBtn.disabled = false;
    placeBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Confirm & Place Order';
  }
}
