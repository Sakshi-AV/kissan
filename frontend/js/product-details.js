// Product Details Page Logic with Leaflet Map, Reviews, and Wishlist
let currentProduct = null;
let currentQuantity = 1;
let mapInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    showToast('Product ID not found. Redirecting to shop...', 'error');
    setTimeout(() => (window.location.href = '/shop.html'), 1500);
    return;
  }

  await loadProductDetails(productId);
  await loadProductReviews(productId);
});

async function loadProductDetails(productId) {
  try {
    const data = await api.get(`/products/${productId}`);
    currentProduct = data.product;
    renderProductDetails(currentProduct);
    renderRelatedProducts(data.related || []);
    initFarmMap(currentProduct.farmLocation);
  } catch (err) {
    document.getElementById('productDetailContainer').innerHTML = `
      <div class="empty-state">
        <h3 class="empty-state-title">Harvest Not Found</h3>
        <p class="empty-state-desc">This product may have been removed or is no longer listed.</p>
        <a href="/shop.html" class="btn btn-primary">Return to Marketplace</a>
      </div>
    `;
  }
}

function renderProductDetails(p) {
  document.title = `${p.name} – Kissan Cart`;

  // Breadcrumbs
  document.getElementById('breadcrumbCategory').textContent = p.category?.name || 'Produce';
  document.getElementById('breadcrumbCategory').href = `/shop.html?category=${p.category?.slug || 'all'}`;
  document.getElementById('breadcrumbProduct').textContent = p.name;

  // Main Image & Thumbnails
  const imgEl = document.getElementById('productMainImage');
  imgEl.src = p.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';
  imgEl.alt = p.name;

  const thumbsEl = document.getElementById('productGalleryThumbs');
  if (thumbsEl) {
    if (p.images && p.images.length > 1) {
      thumbsEl.innerHTML = p.images.map((img, idx) => `
        <img src="${img}" alt="${p.name} - view ${idx + 1}" class="gallery-thumb ${idx === 0 ? 'active' : ''}" style="width: 64px; height: 64px; object-fit: cover; border-radius: var(--radius-sm); cursor: pointer; border: 2px solid ${idx === 0 ? 'var(--color-green-500)' : 'transparent'}; transition: border-color 0.2s;" onclick="document.getElementById('productMainImage').src = '${img}'; document.querySelectorAll('.gallery-thumb').forEach(t => t.style.borderColor = 'transparent'); this.style.borderColor = 'var(--color-green-500)';" />
      `).join('');
    } else {
      thumbsEl.innerHTML = '';
    }
  }

  // Title, Badges
  document.getElementById('productTitle').textContent = p.name;
  document.getElementById('productCategoryTag').textContent = p.category?.name || 'General Agricultural Produce';
  
  const badgesContainer = document.getElementById('productBadges');
  badgesContainer.innerHTML = `
    ${p.isOrganic ? '<span class="badge badge-organic"><i class="fa-solid fa-leaf"></i> 100% Organic</span>' : ''}
    ${p.farmer?.farmerProfile?.isVerified ? '<span class="badge badge-verified"><i class="fa-solid fa-shield-check"></i> Verified Farm</span>' : ''}
    <span class="badge ${p.availableQuantity > 0 ? 'badge-stock-in' : 'badge-stock-out'}">
      ${p.availableQuantity > 0 ? `In Stock (${p.availableQuantity} ${p.unit})` : 'Sold Out'}
    </span>
  `;

  // Ratings
  document.getElementById('productRatingStars').innerHTML = renderStarRating(p.ratingAverage || 5.0);
  document.getElementById('productRatingText').textContent = `${p.ratingAverage || 5.0} (${p.ratingCount || 0} reviews)`;

  // Price & Unit
  document.getElementById('productPrice').textContent = `₹${p.price}`;
  document.getElementById('productUnit').textContent = `per ${p.unit}`;

  // Description
  document.getElementById('productDescription').textContent = p.description;

  // Harvest date & Stock status
  const harvestDate = new Date(p.harvestDate || p.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  document.getElementById('productHarvestDate').textContent = harvestDate;
  document.getElementById('productStockAvailable').textContent = `${p.availableQuantity} ${p.unit} remaining`;

  // Farmer Card
  const farmer = p.farmer;
  if (farmer) {
    document.getElementById('farmerName').textContent = farmer.name;
    document.getElementById('farmerFarmName').textContent = farmer.farmerProfile?.farmName || `${farmer.name}'s Farm`;
    document.getElementById('farmerLocation').textContent = `${farmer.farmerProfile?.farmLocation?.city || 'Karnataka'}, India`;
    document.getElementById('farmerExperience').textContent = `${farmer.farmerProfile?.experienceYears || 5} Years Farming`;
    document.getElementById('farmerBio').textContent = farmer.farmerProfile?.bio || 'Committed to pesticide-free, fresh traditional agriculture.';
    
    if (farmer.avatar) {
      document.getElementById('farmerAvatar').src = farmer.avatar;
    }
    if (farmer.farmerProfile?.isVerified) {
      document.getElementById('farmerVerifiedIcon').style.display = 'inline-block';
    }
  }

  // Stock status disabled check
  const addBtn = document.getElementById('addToCartBtn');
  const buyBtn = document.getElementById('buyNowBtn');
  if (p.availableQuantity <= 0) {
    addBtn.disabled = true;
    buyBtn.disabled = true;
    addBtn.textContent = 'Out of Stock';
  }
}

function updateQuantity(change) {
  if (!currentProduct) return;
  const max = currentProduct.availableQuantity || 1;
  const newQty = currentQuantity + change;

  if (newQty >= 1 && newQty <= max) {
    currentQuantity = newQty;
    document.getElementById('productQuantityDisplay').value = currentQuantity;
  } else if (newQty > max) {
    showToast(`Only ${max} ${currentProduct.unit} available in stock`, 'warning');
  }
}

async function handleAddToCart() {
  if (!currentProduct) return;
  const success = await cart.addToCart(currentProduct._id, currentQuantity);
  if (success) {
    showToast(`Added ${currentQuantity} ${currentProduct.unit} of "${currentProduct.name}" to your cart!`, 'success');
  }
}

async function handleBuyNow() {
  if (!currentProduct) return;
  const success = await cart.addToCart(currentProduct._id, currentQuantity);
  if (success) {
    window.location.href = '/checkout.html';
  }
}

async function toggleProductWishlist() {
  if (!currentProduct) return;
  if (!auth.isAuthenticated()) {
    showToast('Please login as a customer to add to wishlist', 'info');
    return;
  }

  try {
    const res = await api.post(`/customer/wishlist/${currentProduct._id}`);
    showToast(res.message, 'success');
    const icon = document.querySelector('#wishlistBtn i');
    const text = document.querySelector('#wishlistBtn span');
    if (res.isAdded) {
      icon.className = 'fa-solid fa-heart';
      text.textContent = 'Wishlisted';
    } else {
      icon.className = 'fa-regular fa-heart';
      text.textContent = 'Wishlist';
    }
  } catch (err) {
    showToast(err.message || 'Error updating wishlist', 'error');
  }
}

// Leaflet Map Initialization
function initFarmMap(location) {
  const mapContainer = document.getElementById('farmLocationMap');
  if (!mapContainer || typeof L === 'undefined') return;

  const lat = location?.coordinates?.lat || 12.9716;
  const lng = location?.coordinates?.lng || 77.5946;
  const address = location?.address || `${location?.city || 'Karnataka'}, India`;

  try {
    if (mapInstance) {
      mapInstance.remove();
    }

    mapInstance = L.map('farmLocationMap').setView([lat, lng], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapInstance);

    const greenIcon = L.divIcon({
      html: '<div style="background-color: #16a34a; width: 32px; height: 32px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;"><i class="fa-solid fa-seedling"></i></div>',
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    L.marker([lat, lng], { icon: greenIcon })
      .addTo(mapInstance)
      .bindPopup(`<b>Farm Location</b><br>${address}`)
      .openPopup();
  } catch (e) {
    console.error('Failed to load map:', e);
  }
}

// Reviews
async function loadProductReviews(productId) {
  const listContainer = document.getElementById('reviewsListContainer');
  try {
    const data = await api.get(`/products/${productId}/reviews`);
    if (!data.reviews || data.reviews.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state" style="padding: 2rem 1rem;">
          <p class="text-muted">No reviews yet for this harvest. Be the first verified customer to share feedback!</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = data.reviews
      .map(
        (r) => `
      <div class="review-item" style="border-bottom: 1px solid var(--border-color); padding: 1.25rem 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="${r.customer?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;" />
            <div>
              <h5 style="font-size: 0.92rem; font-weight: 700; color: var(--text-primary);">${r.customer?.name || 'Verified Buyer'}</h5>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div>${renderStarRating(r.rating)}</div>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">${r.comment}</p>
      </div>
    `
      )
      .join('');
  } catch (e) {
    console.error(e);
  }
}

function openReviewModal() {
  if (!auth.isAuthenticated()) {
    showToast('Please login as a customer to submit a review', 'info');
    setTimeout(() => (window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`), 800);
    return;
  }
  document.getElementById('reviewModal').classList.add('active');
}

function closeReviewModal() {
  document.getElementById('reviewModal').classList.remove('active');
}

async function handleReviewSubmit(e) {
  e.preventDefault();
  const rating = document.getElementById('reviewRatingSelect').value;
  const comment = document.getElementById('reviewCommentInput').value.trim();

  try {
    const res = await api.post(`/products/${currentProduct._id}/reviews`, { rating, comment });
    showToast('Review submitted successfully! Thank you.', 'success');
    closeReviewModal();
    await loadProductDetails(currentProduct._id);
    await loadProductReviews(currentProduct._id);
  } catch (err) {
    showToast(err.message || 'Failed to submit review', 'error');
  }
}

// Report Product
function openReportModal() {
  if (!auth.isAuthenticated()) {
    showToast('Please login to report a listing', 'info');
    return;
  }
  document.getElementById('reportModal').classList.add('active');
}

function closeReportModal() {
  document.getElementById('reportModal').classList.remove('active');
}

async function handleReportSubmit(e) {
  e.preventDefault();
  const reason = document.getElementById('reportReasonSelect').value;
  const description = document.getElementById('reportDescInput').value.trim();

  try {
    await api.post(`/products/${currentProduct._id}/report`, { reason, description });
    showToast('Report submitted to administrators for review', 'info');
    closeReportModal();
  } catch (err) {
    showToast(err.message || 'Failed to submit report', 'error');
  }
}

function renderStarRating(rating) {
  let stars = '';
  const r = Math.round(rating);
  for (let i = 1; i <= 5; i++) {
    stars += `<i class="fa-solid fa-star" style="color: ${i <= r ? 'var(--color-yellow-500)' : 'var(--border-color)'}; font-size: 0.85rem;"></i>`;
  }
  return stars;
}

function renderRelatedProducts(products) {
  const container = document.getElementById('relatedProductsContainer');
  if (!container || products.length === 0) {
    if (container) container.parentElement.style.display = 'none';
    return;
  }

  container.innerHTML = products
    .map(
      (p) => `
    <div class="product-card" onclick="window.location.href='/product-details.html?id=${p._id}'" style="cursor: pointer;">
      <div class="product-img-wrapper">
        <img src="${p.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}" alt="${p.name}" />
      </div>
      <div class="product-content">
        <h4 class="product-title">${p.name}</h4>
        <div class="product-bottom-row">
          <div class="price-box">
            <span class="price-amount">₹${p.price}</span>
            <span class="price-unit">per ${p.unit}</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); cart.addToCart('${p._id}', 1)">Add</button>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}
