// Authentication and Authorization Module
const auth = {
  isAuthenticated() {
    return !!api.getToken();
  },

  getCurrentUser() {
    return api.getUser();
  },

  async login(email, password) {
    try {
      const data = await api.post('/auth/login', { email, password });
      api.setToken(data.token);
      api.setUser(data.user);
      return data;
    } catch (error) {
      throw error;
    }
  },

  async register(formData) {
    try {
      const data = await api.post('/auth/register', formData);
      api.setToken(data.token);
      api.setUser(data.user);
      return data;
    } catch (error) {
      throw error;
    }
  },

  logout() {
    api.setToken(null);
    api.setUser(null);
    showToast('You have been logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 500);
  },

  getDashboardUrl(role) {
    switch (role) {
      case 'farmer':
        return '/farmer-dashboard.html';
      case 'admin':
        return '/admin-dashboard.html';
      case 'customer':
      default:
        return '/customer-dashboard.html';
    }
  },

  // Guard dashboard pages: redirect if unauthorized
  checkPageAuth(requiredRole = null) {
    const token = api.getToken();
    const user = api.getUser();

    if (!token || !user) {
      const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login.html?redirect=${redirectUrl}`;
      return false;
    }

    if (requiredRole && user.role !== requiredRole) {
      showToast(`Access restricted: ${requiredRole} credentials required.`, 'error');
      setTimeout(() => {
        window.location.href = this.getDashboardUrl(user.role);
      }, 1000);
      return false;
    }

    return true;
  },

  // Update navbar items dynamically based on login state
  updateNavbarAuth() {
    const authContainer = document.getElementById('navbarAuth');
    if (!authContainer) return;

    const user = this.getCurrentUser();

    if (user && this.isAuthenticated()) {
      const dashboardLink = this.getDashboardUrl(user.role);
      const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
      const avatar = user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';

      authContainer.innerHTML = `
        <div class="user-dropdown-container">
          <button class="user-nav-btn" id="userMenuToggle" aria-haspopup="true">
            <img src="${avatar}" alt="${user.name}" class="nav-avatar" />
            <div class="user-meta">
              <span class="user-name">${user.name.split(' ')[0]}</span>
              <span class="user-role-badge ${user.role}-badge">${roleLabel}</span>
            </div>
            <i class="fa-solid fa-chevron-down nav-chevron"></i>
          </button>
          <div class="dropdown-menu" id="userDropdownMenu">
            <div class="dropdown-header">
              <p class="dropdown-name">${user.name}</p>
              <p class="dropdown-email">${user.email}</p>
            </div>
            <hr class="dropdown-divider" />
            <a href="${dashboardLink}" class="dropdown-item">
              <i class="fa-solid fa-gauge-high"></i>
              <span>${roleLabel} Dashboard</span>
            </a>
            ${user.role === 'customer' ? `
            <a href="/customer-dashboard.html#orders" class="dropdown-item">
              <i class="fa-solid fa-box"></i>
              <span>My Orders</span>
            </a>
            <a href="/customer-dashboard.html#wishlist" class="dropdown-item">
              <i class="fa-solid fa-heart"></i>
              <span>My Wishlist</span>
            </a>` : ''}
            ${user.role === 'farmer' ? `
            <a href="/farmer-dashboard.html#products" class="dropdown-item">
              <i class="fa-solid fa-seedling"></i>
              <span>My Crop Listings</span>
            </a>
            <a href="/farmer-dashboard.html#orders" class="dropdown-item">
              <i class="fa-solid fa-truck-ramp-box"></i>
              <span>Incoming Orders</span>
            </a>` : ''}
            <hr class="dropdown-divider" />
            <button class="dropdown-item text-danger" onclick="auth.logout()">
              <i class="fa-solid fa-right-from-bracket"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      `;

      // Wire dropdown toggle
      const toggleBtn = document.getElementById('userMenuToggle');
      const menu = document.getElementById('userDropdownMenu');
      if (toggleBtn && menu) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          menu.classList.toggle('active');
        });
        document.addEventListener('click', () => {
          menu.classList.remove('active');
        });
      }
    } else {
      authContainer.innerHTML = `
        <div class="nav-auth-buttons">
          <a href="/login.html" class="btn btn-outline-primary btn-sm">
            <i class="fa-solid fa-arrow-right-to-bracket"></i>
            <span data-i18n="nav_login">Login</span>
          </a>
          <a href="/register.html" class="btn btn-primary btn-sm">
            <i class="fa-solid fa-user-plus"></i>
            <span data-i18n="nav_register">Register</span>
          </a>
        </div>
      `;
      if (typeof applyTranslations === 'function') {
        applyTranslations();
      }
    }
  },
};
