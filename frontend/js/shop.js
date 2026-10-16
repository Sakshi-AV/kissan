// Marketplace Shop Logic with Filters, Search, and Pagination
let currentPage = 1;
let totalPages = 1;
let currentFilters = {
  keyword: '',
  category: 'all',
  minPrice: '',
  maxPrice: '',
  isOrganic: false,
  isAvailable: false,
  location: '',
  sortBy: 'newest',
};

document.addEventListener('DOMContentLoaded', async () => {
  // Parse query params (e.g. ?category=fruits or ?search=tomato)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('category')) currentFilters.category = urlParams.get('category');
  if (urlParams.get('search')) currentFilters.keyword = urlParams.get('search');
  if (urlParams.get('location')) currentFilters.location = urlParams.get('location');

  await loadCategoryFilters();
  syncFilterInputsWithState();
  await fetchProducts();

  // Wire up filter event listeners
  setupFilterListeners();
});

async function loadCategoryFilters() {
  const categorySelect = document.getElementById('filterCategorySelect');
  const categoryPillsContainer = document.getElementById('categoryPillsContainer');

  try {
    const data = await api.get('/categories');
    if (data.categories) {
      // Dropdown
      if (categorySelect) {
        data.categories.forEach((cat) => {
          const opt = document.createElement('option');
          opt.value = cat.slug;
          opt.textContent = `${cat.name} (${cat.productCount})`;
          categorySelect.appendChild(opt);
        });
      }

      // Quick filter pill badges
      if (categoryPillsContainer) {
        categoryPillsContainer.innerHTML = `
          <button class="filter-pill ${currentFilters.category === 'all' ? 'active' : ''}" data-cat="all">
            All Products
          </button>
          ${data.categories
            .map(
              (c) => `
            <button class="filter-pill ${currentFilters.category === c.slug ? 'active' : ''}" data-cat="${c.slug}">
              ${c.name}
            </button>
          `
            )
            .join('')}
        `;

        categoryPillsContainer.querySelectorAll('.filter-pill').forEach((btn) => {
          btn.addEventListener('click', () => {
            categoryPillsContainer.querySelectorAll('.filter-pill').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilters.category = btn.getAttribute('data-cat');
            if (categorySelect) categorySelect.value = currentFilters.category;
            currentPage = 1;
            fetchProducts();
          });
        });
      }
    }
  } catch (err) {
    console.error('Failed to load categories in shop:', err);
  }
}

function syncFilterInputsWithState() {
  const searchInput = document.getElementById('shopKeywordInput');
  const categorySelect = document.getElementById('filterCategorySelect');
  const minPriceInput = document.getElementById('minPriceInput');
  const maxPriceInput = document.getElementById('maxPriceInput');
  const organicCheck = document.getElementById('organicCheck');
  const inStockCheck = document.getElementById('inStockCheck');
  const locationInput = document.getElementById('locationFilterInput');
  const sortBySelect = document.getElementById('sortBySelect');

  if (searchInput) searchInput.value = currentFilters.keyword;
  if (categorySelect) categorySelect.value = currentFilters.category;
  if (minPriceInput) minPriceInput.value = currentFilters.minPrice;
  if (maxPriceInput) maxPriceInput.value = currentFilters.maxPrice;
  if (organicCheck) organicCheck.checked = currentFilters.isOrganic;
  if (inStockCheck) inStockCheck.checked = currentFilters.isAvailable;
  if (locationInput) locationInput.value = currentFilters.location;
  if (sortBySelect) sortBySelect.value = currentFilters.sortBy;
}

function setupFilterListeners() {
  const filterForm = document.getElementById('shopFilterForm');
  const sortBySelect = document.getElementById('sortBySelect');
  const resetBtn = document.getElementById('resetFiltersBtn');

  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      applyFormFilters();
    });
  }

  if (sortBySelect) {
    sortBySelect.addEventListener('change', (e) => {
      currentFilters.sortBy = e.target.value;
      currentPage = 1;
      fetchProducts();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      currentFilters = {
        keyword: '',
        category: 'all',
        minPrice: '',
        maxPrice: '',
        isOrganic: false,
        isAvailable: false,
        location: '',
        sortBy: 'newest',
      };
      syncFilterInputsWithState();
      document.querySelectorAll('.filter-pill').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-cat') === 'all');
      });
      currentPage = 1;
      fetchProducts();
    });
  }
}

function applyFormFilters() {
  currentFilters.keyword = document.getElementById('shopKeywordInput')?.value.trim() || '';
  currentFilters.category = document.getElementById('filterCategorySelect')?.value || 'all';
  currentFilters.minPrice = document.getElementById('minPriceInput')?.value || '';
  currentFilters.maxPrice = document.getElementById('maxPriceInput')?.value || '';
  currentFilters.isOrganic = document.getElementById('organicCheck')?.checked || false;
  currentFilters.isAvailable = document.getElementById('inStockCheck')?.checked || false;
  currentFilters.location = document.getElementById('locationFilterInput')?.value.trim() || '';

  currentPage = 1;
  fetchProducts();
}

async function fetchProducts() {
  const container = document.getElementById('shopProductsGrid');
  const resultCount = document.getElementById('resultsCount');
  const paginationControls = document.getElementById('paginationControls');

  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
      <i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--color-green-600);"></i>
      <p style="margin-top: 1rem; color: var(--text-muted);">Fetching fresh harvests from local farms...</p>
    </div>
  `;

  try {
    const params = {
      page: currentPage,
      limit: 9,
      sortBy: currentFilters.sortBy,
    };

    if (currentFilters.keyword) params.keyword = currentFilters.keyword;
    if (currentFilters.category && currentFilters.category !== 'all') params.category = currentFilters.category;
    if (currentFilters.minPrice) params.minPrice = currentFilters.minPrice;
    if (currentFilters.maxPrice) params.maxPrice = currentFilters.maxPrice;
    if (currentFilters.isOrganic) params.isOrganic = 'true';
    if (currentFilters.isAvailable) params.isAvailable = 'true';
    if (currentFilters.location) params.location = currentFilters.location;

    const data = await api.get('/products', params);
    totalPages = data.pages || 1;

    if (resultCount) {
      resultCount.textContent = `Showing ${data.count} of ${data.total} products`;
    }

    if (!data.products || data.products.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">
            <i class="fa-solid fa-seedling"></i>
          </div>
          <h3 class="empty-state-title" data-i18n="no_products_found">No products match your criteria</h3>
          <p class="empty-state-desc">Try clearing your price range or category filters to explore other freshly harvested crops.</p>
          <button class="btn btn-primary" onclick="document.getElementById('resetFiltersBtn').click()">
            <i class="fa-solid fa-arrows-rotate"></i>
            <span>Reset All Filters</span>
          </button>
        </div>
      `;
      if (paginationControls) paginationControls.style.display = 'none';
      return;
    }

    container.innerHTML = data.products.map((p) => renderProductCard(p)).join('');

    renderPagination(data.page, data.pages);
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3 class="empty-state-title">Error Loading Marketplace</h3>
        <p class="empty-state-desc">${err.message}</p>
      </div>
    `;
  }
}

function renderProductCard(product) {
  const isVerified = product.farmer?.farmerProfile?.isVerified;
  const farmCity = product.farmLocation?.city || 'Karnataka';
  const image = product.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';

  return `
    <div class="product-card">
      <div class="product-img-wrapper" onclick="window.location.href='/product-details.html?id=${product._id}'">
        <img src="${image}" alt="${product.name}" loading="lazy" />
        <div class="product-badges">
          ${product.isOrganic ? '<span class="badge badge-organic"><i class="fa-solid fa-leaf"></i> Organic</span>' : ''}
          ${isVerified ? '<span class="badge badge-verified"><i class="fa-solid fa-shield-check"></i> Verified</span>' : ''}
        </div>
        <button class="btn-wishlist-toggle" onclick="event.stopPropagation(); toggleWishlist('${product._id}', this)" title="Add to Wishlist">
          <i class="fa-regular fa-heart"></i>
        </button>
      </div>
      
      <div class="product-content">
        <div class="product-category-row">
          <span class="product-category-tag">${product.category?.name || 'Produce'}</span>
          <div class="product-rating">
            <i class="fa-solid fa-star"></i>
            <span>${product.ratingAverage || 5.0} (${product.ratingCount || 0})</span>
          </div>
        </div>

        <a href="/product-details.html?id=${product._id}" class="product-title">${product.name}</a>

        <div class="farmer-info-tag">
          <i class="fa-solid fa-user-check"></i>
          <span>${product.farmer?.name || 'Local Farmer'} • ${farmCity}</span>
        </div>

        <div class="product-bottom-row">
          <div class="price-box">
            <span class="price-amount">₹${product.price}</span>
            <span class="price-unit">per ${product.unit}</span>
          </div>

          ${product.availableQuantity > 0 ? `
            <button class="btn btn-primary btn-sm" onclick="cart.addToCart('${product._id}', 1)">
              <i class="fa-solid fa-cart-plus"></i>
              <span>Add</span>
            </button>
          ` : `
            <button class="btn btn-secondary btn-sm" disabled>
              <span>Out of Stock</span>
            </button>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderPagination(page, pages) {
  const container = document.getElementById('paginationControls');
  if (!container || pages <= 1) {
    if (container) container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  let html = `
    <button class="btn btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} onclick="changePage(${page - 1})">
      <i class="fa-solid fa-chevron-left"></i> Prev
    </button>
  `;

  for (let i = 1; i <= pages; i++) {
    html += `
      <button class="btn ${i === page ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="changePage(${i})">
        ${i}
      </button>
    `;
  }

  html += `
    <button class="btn btn-secondary btn-sm" ${page >= pages ? 'disabled' : ''} onclick="changePage(${page + 1})">
      Next <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;

  container.innerHTML = html;
}

function changePage(p) {
  currentPage = p;
  fetchProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function toggleWishlist(productId, btn) {
  if (!auth.isAuthenticated()) {
    showToast('Please login as a customer to add to wishlist', 'info');
    return;
  }
  try {
    const res = await api.post(`/customer/wishlist/${productId}`);
    showToast(res.message, 'success');
    const icon = btn.querySelector('i');
    if (res.isAdded) {
      icon.className = 'fa-solid fa-heart';
      btn.classList.add('active');
    } else {
      icon.className = 'fa-regular fa-heart';
      btn.classList.remove('active');
    }
  } catch (err) {
    showToast(err.message || 'Failed to update wishlist', 'error');
  }
}
