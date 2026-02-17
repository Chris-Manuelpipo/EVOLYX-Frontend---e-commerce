/**
 * @fileoverview Catalog Page Logic
 * Load and display products with filtering and pagination
 * @author EVOLYX Team
 */

const ITEMS_PER_PAGE = 12;
let currentPage = 1;
let allProducts = [];
let filteredProducts = [];
let categories = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadProducts();
  setupEventListeners();
  updateCartCount();
});

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    filterProducts();
  });

  // Category filter
  document.getElementById('categoryFilter').addEventListener('change', (e) => {
    currentPage = 1;
    filterProducts();
  });

  // Reset filter
  document.getElementById('resetFilter').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    currentPage = 1;
    filterProducts();
  });

  // Admin link
  const adminLink = document.getElementById('adminLink');
  if (Utils.Storage.isAdminLoggedIn()) {
    adminLink.href = 'admin/dashboard.html';
    adminLink.textContent = 'Admin Panel';
  } else {
    adminLink.href = 'login.html';
    adminLink.textContent = 'Admin';
  }
}

// ============================================
// LOAD DATA
// ============================================

/**
 * Load categories from API
 */
async function loadCategories() {
  try {
    const response = await API.getCategories();
    categories = response.data || [];
    
    // Populate category select
    const select = document.getElementById('categoryFilter');
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load categories:', error);
    Utils.showToast('Erreur lors du chargement des catégories', 'error');
  }
}

/**
 * Load products from API with pagination
 */
async function loadProducts() {
  try {
    Utils.showLoading(document.getElementById('productsGrid'), true);
    
    // Charge les produits paginés du backend
    const response = await API.getProducts({
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    });

    // Le backend renvoie déjà les produits paginés
    const products = response.data || [];
    
    // Pour la recherche/filtrage: charger tous les produits une seule fois
    if (currentPage === 1 && !window.allProductsLoaded) {
      allProducts = products;
      window.allProductsLoaded = true;
    }
    
    filteredProducts = products;
    
    renderProducts();
    renderPagination(response.total || 0);
    
    Utils.showLoading(document.getElementById('productsGrid'), false);
  } catch (error) {
    console.error('Failed to load products:', error);
    Utils.showToast('Erreur lors du chargement des produits', 'error');
  }
}

// ============================================
// FILTERING
// ============================================

/**
 * Filter products based on search and category
 * Appelle le backend avec les paramètres de filtrage
 */
function filterProducts() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const selectedCategory = document.getElementById('categoryFilter').value;

  // Réinitialise la pagination
  currentPage = 1;

  // Appelle le backend avec les paramètres
  loadProductsWithFilters(searchTerm, selectedCategory);
}

/**
 * Load products with filters from backend
 */
async function loadProductsWithFilters(search = '', categoryId = '') {
  try {
    Utils.showLoading(document.getElementById('productsGrid'), true);

    // Construit les paramètres
    const params = {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
    };

    if (search) params.search = search;
    if (categoryId) params.category_id = categoryId;

    // Appelle l'API avec les filtres
    const response = await API.getProducts(params);
    
    filteredProducts = response.data || [];
    renderProducts();
    renderPagination(response.total || 0);

    Utils.showLoading(document.getElementById('productsGrid'), false);
  } catch (error) {
    console.error('Failed to filter products:', error);
    Utils.showToast('Erreur lors du filtrage', 'error');
  }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

/**
 * Render products grid - Les produits sont déjà paginés par le backend
 */
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  Utils.DOM.empty(grid);

  if (!filteredProducts || filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="no-products" style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
        <p style="font-size: 18px; color: #666;">Aucun produit trouvé</p>
      </div>
    `;
    return;
  }

  // Afficher directement les produits (déjà paginés par le backend)
  filteredProducts.forEach(product => {
    const productCard = createProductCard(product);
    grid.appendChild(productCard);
  });
}

/**
 * Create product card element
 * @param {Object} product - Product data
 * @returns {Element} Product card element
 */
function createProductCard(product) {
  const card = Utils.DOM.create('div', {
    class: 'product-card card',
  });

  const image = product.images && product.images.length > 0 
    ? `${LINK}/${product.images[0].url}`
    : `${LINK}/default.png`;

  const categoryName = categories.find(c => c.id === product.category_id)?.name || 'Catégorie';

  card.innerHTML = `
    <div class="product-image">
      <img src="${image}" alt="${product.name}" onerror="this.src='${LINK}/default.png'">
      ${product.is_featured ? '<span class="badge badge-featured">Vedette</span>' : ''}
    </div>
    <div class="product-info">
      <p class="product-category text-gray text-sm">${categoryName}</p>
      <h3 class="product-name">${Utils.truncateText(product.name, 40)}</h3>
      <p class="product-description text-gray text-sm">${Utils.truncateText(product.description, 60)}</p>
      <div class="product-footer">
        <span class="product-price text-gold font-bold">${Utils.formatPrice(product.base_price)}</span>
        <a href="product.html?id=${product.id}" class="btn btn-sm btn-primary">Détails</a>
      </div>
    </div>
  `;

  return card;
}

/**
 * Render pagination - Utilise le total du backend
 */
function renderPagination(totalProducts = 0) {
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
  const paginationContainer = document.getElementById('pagination');
  Utils.DOM.empty(paginationContainer);

  if (totalPages <= 1) return;

  const paginationHTML = `
    <div class="pagination-controls">
      ${currentPage > 1 ? `<button class="btn btn-secondary btn-sm" onclick="goToPage(${currentPage - 1})">Précédent</button>` : ''}
      <span class="pagination-info">Page ${currentPage} sur ${totalPages}</span>
      ${currentPage < totalPages ? `<button class="btn btn-secondary btn-sm" onclick="goToPage(${currentPage + 1})">Suivant</button>` : ''}
    </div>
  `;

  paginationContainer.innerHTML = paginationHTML;
}

/**
 * Go to specific page
 * @param {number} page - Page number
 */
function goToPage(page) {
  currentPage = page;
  loadProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// CART UTILITIES
// ============================================

/**
 * Update cart count badge
 */
function updateCartCount() {
  const cart = Utils.Storage.getCart();
  const count = cart.items ? cart.items.length : 0;
  document.getElementById('cartCount').textContent = count;
}

// Update cart count when page regains focus
window.addEventListener('focus', updateCartCount);