/**
 * Catalogue : query unifiée (q, category_id, min_price, max_price, sort, in_stock, page).
 * URL partageable via querystring.
 */

const ITEMS_PER_PAGE = 12;
let currentPage = 1;
let filteredProducts = [];
let categories = [];

const FILTER_KEYS = ['q', 'category_id', 'min_price', 'max_price', 'sort', 'in_stock', 'page'];

document.addEventListener('DOMContentLoaded', () => {
  applyUrlToForm();
  syncFilterChrome();
  loadCategories();
  loadFeaturedProducts();
  loadProductsWithFilters();
  setupEventListeners();
  if (window.Utils) {
    Utils.updateCartBadge();
    Utils.updateWishlistBadge();
  }
});

function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const resetFilter = document.getElementById('resetFilter');
  const sortFilter = document.getElementById('sortFilter');
  const minPrice = document.getElementById('minPrice');
  const maxPrice = document.getElementById('maxPrice');
  const inStock = document.getElementById('inStockFilter');

  if (searchInput) {
    searchInput.addEventListener(
      'input',
      Utils.debounce(() => {
        currentPage = 1;
        loadProductsWithFilters();
      }, 300)
    );
  }

  [categoryFilter, sortFilter, minPrice, maxPrice, inStock].forEach((el) => {
    if (!el) return;
    el.addEventListener('change', () => {
      currentPage = 1;
      loadProductsWithFilters();
    });
  });

  if (resetFilter) {
    resetFilter.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (categoryFilter) categoryFilter.value = '';
      if (sortFilter) sortFilter.value = '';
      if (minPrice) minPrice.value = '';
      if (maxPrice) maxPrice.value = '';
      if (inStock) inStock.checked = false;
      currentPage = 1;
      loadProductsWithFilters();
    });
  }
}

function readFiltersFromForm() {
  return {
    q: (document.getElementById('searchInput')?.value || '').trim(),
    category_id: document.getElementById('categoryFilter')?.value || '',
    min_price: document.getElementById('minPrice')?.value || '',
    max_price: document.getElementById('maxPrice')?.value || '',
    sort: document.getElementById('sortFilter')?.value || '',
    in_stock: document.getElementById('inStockFilter')?.checked ? 'true' : '',
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  };
}

function applyUrlToForm() {
  const params = new URLSearchParams(location.search);
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortFilter = document.getElementById('sortFilter');
  const minPrice = document.getElementById('minPrice');
  const maxPrice = document.getElementById('maxPrice');
  const inStock = document.getElementById('inStockFilter');
  if (searchInput) searchInput.value = params.get('q') || '';
  if (categoryFilter && params.get('category_id')) categoryFilter.value = params.get('category_id');
  if (sortFilter) sortFilter.value = params.get('sort') || '';
  if (minPrice) minPrice.value = params.get('min_price') || '';
  if (maxPrice) maxPrice.value = params.get('max_price') || '';
  if (inStock) inStock.checked = params.get('in_stock') === 'true' || params.get('in_stock') === '1';
  const page = parseInt(params.get('page'), 10);
  currentPage = page > 0 ? page : 1;
}

function writeFiltersToUrl(filters) {
  const url = new URL(location.href);
  FILTER_KEYS.forEach((key) => url.searchParams.delete(key));
  Object.entries(filters).forEach(([key, value]) => {
    if (key === 'limit') return;
    if (value === undefined || value === null || value === '') return;
    if (key === 'page' && String(value) === '1') return;
    url.searchParams.set(key, String(value));
  });
  const next = url.pathname + url.search + (url.hash || location.hash);
  history.replaceState(null, '', next);
}

async function loadCategories() {
  const select = document.getElementById('categoryFilter');
  if (!select) return;
  try {
    const response = await API.getCategories();
    categories = Utils.unwrapList(response);
    const selected = new URLSearchParams(location.search).get('category_id') || select.value;
    categories.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      if (String(cat.id) === String(selected)) option.selected = true;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load categories:', error);
    Utils.showToast('Impossible de charger les catégories', 'error');
  }
}

async function loadFeaturedProducts() {
  const section = document.getElementById('featuredSection');
  const grid = document.getElementById('featuredGrid');
  if (!section || !grid) return;

  const HOME_LIMIT = 8;
  const title = document.getElementById('homeGridTitle');
  section.hidden = false;
  showCatalogSkeleton(grid);

  let list = [];
  let featuredCount = 0;
  try {
    list = Utils.unwrapList(await API.getFeaturedProducts());
    featuredCount = list.length;
  } catch (error) {
    /* featured products unavailable — fallback to full catalog */
  }

  if (list.length < HOME_LIMIT) {
    try {
      const extra = Utils.unwrapList(await API.getProducts({ limit: 12, sort: 'newest' }));
      const seen = new Set(list.map((product) => String(product.id)));
      extra.forEach((product) => {
        if (!seen.has(String(product.id))) {
          seen.add(String(product.id));
          list.push(product);
        }
      });
    } catch (error) {
      /* catalog fallback unavailable */
    }
  }

  list = list.slice(0, HOME_LIMIT);

  if (!list.length) {
    grid.innerHTML = `
      <div class="catalog-state" style="grid-column:1/-1;">
        <p>Aucun produit pour le moment. Le catalogue se met à jour bientôt.</p>
        <a href="catalog.html" class="btn btn-primary">Voir le catalogue</a>
      </div>`;
    return;
  }

  if (title) {
    title.textContent = featuredCount > 0 && featuredCount === list.length ? 'En vedette' : 'Nouveautés';
  }
  grid.innerHTML = '';
  list.forEach((product) => grid.appendChild(createProductCard(product)));
  if (window.Wishlist) Wishlist.bind(grid);

  let cta = section.querySelector('.featured-cta');
  if (!cta) {
    cta = document.createElement('div');
    cta.className = 'featured-cta';
    cta.innerHTML = '<a href="catalog.html" class="btn btn-outline">Tout voir</a>';
    section.querySelector('.container').appendChild(cta);
  }
}

async function loadProductsWithFilters() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  const filters = readFiltersFromForm();
  writeFiltersToUrl(filters);

  try {
    showCatalogSkeleton(grid);
    const response = await API.getProducts(filters);
    filteredProducts = Utils.unwrapList(response);
    const total = response.total || response.data?.total || filteredProducts.length;
    renderProducts(filteredProducts);
    renderPagination(total);
    syncFilterChrome(total);
  } catch (error) {
    console.error('Failed to filter products:', error);
    showCatalogError(error);
    Utils.showToast('Erreur lors du chargement du catalogue', 'error');
  }
}

function loadProducts() {
  return loadProductsWithFilters();
}

function syncFilterChrome(total) {
  const count = document.getElementById('catalogCount');
  if (count && Number.isFinite(total)) {
    count.hidden = false;
    count.textContent = `${total} produit${total > 1 ? 's' : ''}`;
  }

  const filters = readFiltersFromForm();
  const dirty = Boolean(
    filters.q ||
      filters.category_id ||
      filters.min_price ||
      filters.max_price ||
      filters.sort ||
      filters.in_stock
  );
  const reset = document.getElementById('resetFilter');
  if (reset) reset.hidden = !dirty;

  const categoryChip = document.getElementById('categoryFilter')?.closest('.catalog-chip');
  if (categoryChip) categoryChip.classList.toggle('is-on', Boolean(filters.category_id));

  const sortChip = document.getElementById('sortFilter')?.closest('.catalog-chip');
  if (sortChip) sortChip.classList.toggle('is-on', Boolean(filters.sort));

  const stockChip = document.querySelector('.catalog-check');
  if (stockChip) stockChip.classList.toggle('is-on', Boolean(filters.in_stock));

  const priceChip = document.querySelector('.catalog-price');
  if (priceChip) priceChip.classList.toggle('is-on', Boolean(filters.min_price || filters.max_price));
}

function renderProducts(products = filteredProducts) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  Utils.DOM.empty(grid);

  const list = Array.isArray(products) ? products : filteredProducts;

  if (!list || list.length === 0) {
    grid.innerHTML = `
      <div class="catalog-state" style="grid-column: 1/-1;">
        <p>Aucun produit ne correspond. Changez le mot-clé ou réinitialisez les filtres.</p>
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('resetFilter')?.click()">
          Réinitialiser les filtres
        </button>
      </div>
    `;
    return;
  }

  list.forEach((product) => grid.appendChild(createProductCard(product)));
  if (window.Wishlist) Wishlist.bind(grid);
}

function showCatalogError(error) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  const unavailable = Utils.isApiUnavailable(error);
  grid.innerHTML = `
    <div class="catalog-state catalog-state-error" style="grid-column: 1/-1;">
      <p>${
        unavailable
          ? 'Cette ressource catalogue n’est pas proposée par le serveur.'
          : 'Le catalogue n’a pas pu se charger. Vérifiez la connexion, puis réessayez.'
      }</p>
      <button type="button" class="btn btn-primary" onclick="loadProductsWithFilters()">Réessayer</button>
    </div>
  `;
}

function createProductCard(product) {
  const card = Utils.DOM.create('article', { class: 'product-card card' });
  const image = Utils.productImageUrl(product);
  const placeholderClass = Utils.logoPlaceholderClass(image);
  const onError = Utils.placeholderOnErrorHandler();
  const cat =
    Utils.categoryName(product.category, '') ||
    categories.find((c) => String(c.id) === String(product.category_id))?.name ||
    'Catégorie';
  const heart = window.Wishlist ? Wishlist.heartButton(product.id) : '';

  card.innerHTML = `
    ${heart}
    <a href="product.html?id=${product.id}" class="product-card-link">
      <div class="product-image">
        <img src="${Utils.escapeHtml(image)}" alt="${Utils.escapeHtml(product.name)}"
             class="${placeholderClass.trim()}"
             loading="lazy" onerror="${onError}">
        ${product.is_featured ? '<span class="badge badge-featured">Vedette</span>' : ''}
      </div>
      <div class="product-info">
        <p class="product-category text-sm">${Utils.escapeHtml(cat)}</p>
        <h3 class="product-name">${Utils.escapeHtml(Utils.truncateText(product.name, 40))}</h3>
        <p class="product-description text-sm">${Utils.escapeHtml(Utils.truncateText(product.description, 80))}</p>
        <div class="product-footer">
          <span class="product-price">${Utils.formatPrice(product.base_price)}</span>
          <span class="btn btn-sm btn-primary">Détails</span>
        </div>
      </div>
    </a>
  `;
  return card;
}

function renderPagination(totalProducts = 0) {
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);
  const paginationContainer = document.getElementById('pagination');
  if (!paginationContainer) return;
  Utils.DOM.empty(paginationContainer);
  if (totalPages <= 1) return;

  paginationContainer.innerHTML = `
    <div class="pagination-controls">
      ${currentPage > 1 ? `<button type="button" class="btn btn-secondary btn-sm" onclick="goToPage(${currentPage - 1})">Précédent</button>` : ''}
      <span class="pagination-info">Page ${currentPage} sur ${totalPages}</span>
      ${currentPage < totalPages ? `<button type="button" class="btn btn-secondary btn-sm" onclick="goToPage(${currentPage + 1})">Suivant</button>` : ''}
    </div>
  `;
}

function showCatalogSkeleton(grid) {
  grid.innerHTML = Array.from({ length: 8 }, () => `
    <article class="product-card card is-skeleton" aria-hidden="true">
      <span class="skel skel-img"></span>
      <span class="skel skel-line w-60"></span>
      <span class="skel skel-line w-80"></span>
    </article>
  `).join('');
}

function goToPage(page) {
  currentPage = page;
  loadProductsWithFilters();
  const catalog = document.getElementById('catalog');
  if (catalog) catalog.scrollIntoView({ behavior: 'smooth' });
}

function updateCartCount() {
  if (window.Utils) {
    Utils.updateCartBadge();
    Utils.updateWishlistBadge();
  }
}

window.goToPage = goToPage;
window.loadProductsWithFilters = loadProductsWithFilters;
window.updateCartCount = updateCartCount;
window.createProductCard = createProductCard;
