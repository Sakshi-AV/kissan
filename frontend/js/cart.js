// Cart Management Client Module
const cart = {
  async getCartCount() {
    if (!auth.isAuthenticated()) {
      return this.getLocalCount();
    }
    try {
      const data = await api.get('/cart');
      return data.cart ? data.cart.itemCount || 0 : 0;
    } catch (e) {
      return this.getLocalCount();
    }
  },

  getLocalCart() {
    try {
      return JSON.parse(localStorage.getItem('kissan_guest_cart') || '[]');
    } catch {
      return [];
    }
  },

  getLocalCount() {
    const items = this.getLocalCart();
    return items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  },

  async updateBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;

    const count = await this.getCartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  },

  async addToCart(productId, quantity = 1) {
    if (!auth.isAuthenticated()) {
      showToast('Please login as a customer to add items to your cart', 'info');
      setTimeout(() => {
        window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }, 1000);
      return false;
    }

    const user = auth.getCurrentUser();
    if (user && user.role !== 'customer') {
      showToast('Only customer accounts can purchase crops. Please use a customer account.', 'warning');
      return false;
    }

    try {
      const res = await api.post('/cart', { productId, quantity });
      showToast(res.message || 'Added to cart successfully!', 'success');
      await this.updateBadge();
      return true;
    } catch (error) {
      showToast(error.message || 'Failed to add item to cart', 'error');
      return false;
    }
  },

  async loadCartData() {
    if (!auth.isAuthenticated()) {
      return null;
    }
    try {
      const data = await api.get('/cart');
      return data.cart;
    } catch (error) {
      console.error('Failed to load cart:', error);
      throw error;
    }
  },

  async updateItemQuantity(productId, quantity) {
    try {
      const res = await api.put(`/cart/items/${productId}`, { quantity });
      await this.updateBadge();
      return res;
    } catch (error) {
      showToast(error.message || 'Failed to update quantity', 'error');
      throw error;
    }
  },

  async removeItem(productId) {
    try {
      const res = await api.delete(`/cart/items/${productId}`);
      showToast('Item removed from cart', 'info');
      await this.updateBadge();
      return res;
    } catch (error) {
      showToast(error.message || 'Failed to remove item', 'error');
      throw error;
    }
  },

  async clearCart() {
    try {
      await api.delete('/cart');
      await this.updateBadge();
    } catch (e) {
      console.error(e);
    }
  },
};
