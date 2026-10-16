// Global UI Interactivity, Navigation, Themes, and Notification Bell
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Theme (Dark / Light)
  initTheme();

  // 2. Initialize Language selector
  initLanguage();

  // 3. Initialize Navbar Auth state & Cart Badge
  if (typeof auth !== 'undefined') {
    auth.updateNavbarAuth();
  }
  if (typeof cart !== 'undefined') {
    cart.updateBadge();
  }

  // 4. Initialize Mobile Navigation Drawer
  initMobileMenu();

  // 5. Initialize Search input in navbar
  initNavbarSearch();

  // 6. Initialize In-App Notification Bell
  initNotifications();
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('kissan_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('kissan_theme', nextTheme);
      updateThemeIcon(nextTheme);
    });
  }
}

function updateThemeIcon(theme) {
  const icon = document.querySelector('#themeToggle i');
  if (icon) {
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
      icon.title = 'Switch to Light Mode';
    } else {
      icon.className = 'fa-solid fa-moon';
      icon.title = 'Switch to Dark Mode';
    }
  }
}

// Language Selector
function initLanguage() {
  const select = document.getElementById('languageSelect');
  if (select) {
    select.value = getCurrentLanguage();
    select.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }
}

// Mobile Menu Drawer
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobileMenuToggle');
  const drawer = document.getElementById('mobileNavDrawer');
  const backdrop = document.getElementById('mobileNavBackdrop');
  const closeBtn = document.getElementById('mobileMenuClose');

  if (toggleBtn && drawer && backdrop) {
    const openMenu = () => {
      drawer.classList.add('open');
      backdrop.classList.add('visible');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      drawer.classList.remove('open');
      backdrop.classList.remove('visible');
      document.body.style.overflow = '';
    };

    toggleBtn.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    backdrop.addEventListener('click', closeMenu);
  }
}

// Navbar Search
function initNavbarSearch() {
  const searchForm = document.getElementById('navbarSearchForm');
  const searchInput = document.getElementById('navbarSearchInput');

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query) {
        window.location.href = `/shop.html?search=${encodeURIComponent(query)}`;
      }
    });
  }
}

// In-app Notifications Bell
async function initNotifications() {
  const bellBtn = document.getElementById('notificationBellBtn');
  const bellBadge = document.getElementById('notificationBadge');
  const popover = document.getElementById('notificationPopover');
  const listContainer = document.getElementById('notificationList');

  if (!bellBtn || !bellBadge || !popover) return;

  if (!auth.isAuthenticated()) {
    bellBtn.style.display = 'none';
    return;
  }

  bellBtn.style.display = 'inline-flex';

  try {
    const data = await api.get('/notifications');
    if (data.unreadCount > 0) {
      bellBadge.textContent = data.unreadCount > 9 ? '9+' : data.unreadCount;
      bellBadge.style.display = 'inline-flex';
    } else {
      bellBadge.style.display = 'none';
    }

    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.classList.toggle('active');
      renderNotifications(data.notifications, listContainer);
    });

    document.addEventListener('click', () => {
      popover.classList.remove('active');
    });
  } catch (e) {
    // Graceful fallback
  }
}

function renderNotifications(notifications, container) {
  if (!container) return;

  if (!notifications || notifications.length === 0) {
    container.innerHTML = `
      <div class="empty-notifications">
        <i class="fa-regular fa-bell-slash"></i>
        <p>No new notifications</p>
      </div>
    `;
    return;
  }

  container.innerHTML = notifications
    .slice(0, 8)
    .map((n) => `
      <div class="notification-item ${n.isRead ? 'read' : 'unread'}" onclick="markNotificationRead('${n._id}', '${n.link || '#'}')">
        <div class="notification-icon">
          <i class="fa-solid ${getNotificationIcon(n.type)}"></i>
        </div>
        <div class="notification-content">
          <div class="notification-title">${n.title}</div>
          <p class="notification-msg">${n.message}</p>
          <span class="notification-time">${formatTimeAgo(n.createdAt)}</span>
        </div>
      </div>
    `)
    .join('');
}

function getNotificationIcon(type) {
  switch (type) {
    case 'order': return 'fa-box';
    case 'verification': return 'fa-shield-halved';
    case 'inventory': return 'fa-triangle-exclamation';
    case 'review': return 'fa-star';
    default: return 'fa-bell';
  }
}

async function markNotificationRead(id, link) {
  try {
    await api.patch(`/notifications/${id}/read`);
    if (link && link !== '#') {
      window.location.href = link;
    } else {
      window.location.reload();
    }
  } catch (e) {
    if (link && link !== '#') window.location.href = link;
  }
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}
