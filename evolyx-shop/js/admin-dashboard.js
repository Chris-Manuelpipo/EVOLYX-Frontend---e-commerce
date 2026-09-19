/**
 * @fileoverview Admin Dashboard Logic
 * Load and display dashboard statistics
 * @author EVOLYX Team
 */

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  Auth.requireAuth();

  // Load dashboard data
  loadDashboardData();
  setupNavigation();
  updateUserGreeting();
});

// ============================================
// SETUP NAVIGATION
// ============================================

function setupNavigation() {
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href').split('/').pop();
    item.classList.toggle('active', href === currentPage);
  });
}

// ============================================
// LOAD DASHBOARD DATA - CORRIGÉ
// ============================================

async function loadDashboardData() {
  const statEls = ['totalProducts', 'totalOrders', 'monthlyRevenue', 'pendingOrders']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  try {
    Utils.showTableSkeleton('recentOrdersTable', { rows: 5 });
    Utils.showTableSkeleton('topProductsTable', { rows: 5 });
    statEls.forEach((el) => {
      el.dataset.skeletonPrev = el.textContent;
      el.classList.add('is-skeleton');
      el.textContent = '\u00a0';
    });

    // 1. CHARGER LES STATS (prioritaire)
    let stats = {};
    try {
      const statsResponse = await API.getDashboardStats();
      stats = statsResponse?.data || {};
    } catch (statsError) {
      /* stats unavailable — using defaults */
    }

    // 2. CHARGER LES COMMANDES
    let allOrders = [];
    try {
      const ordersResponse = await API.getAdminOrders();
      
      // ✅ Extraction des commandes (response.data)
      if (ordersResponse?.data && Array.isArray(ordersResponse.data)) {
        allOrders = ordersResponse.data;
      } else if (Array.isArray(ordersResponse)) {
        allOrders = ordersResponse;
      }
    } catch (ordersError) {
      /* orders unavailable */
    }

    // 3. CHARGER LES PRODUITS
    let allProducts = [];
    try {
      const productsResponse = await API.getAdminProducts({limit: 999});
      
      // ✅ CORRIGÉ: Les produits sont dans response.products
      if (productsResponse?.products && Array.isArray(productsResponse.products)) {
        allProducts = productsResponse.products;
      } 
      // Fallback pour ancien format
      else if (productsResponse?.data && Array.isArray(productsResponse.data)) {
        allProducts = productsResponse.data;
      }
      // Fallback si tableau direct
      else if (Array.isArray(productsResponse)) {
        allProducts = productsResponse;
      }
    } catch (productsError) {
      /* products unavailable */
    }

    // 4. METTRE À JOUR L'AFFICHAGE
    updateStatsCards(stats, allOrders, allProducts);
    displayRecentOrders(allOrders.slice(0, 5));
    displayTopProducts(allProducts);
  } catch (error) {
    console.error('❌ Erreur globale:', error);
    Utils.showToast('Erreur lors du chargement du dashboard', 'error');
  } finally {
    statEls.forEach((el) => el.classList.remove('is-skeleton'));
  }
}

// ============================================
// UPDATE STATS CARDS
// ============================================

function updateStatsCards(stats, orders, products) {
  stats = stats || {};
  orders = Array.isArray(orders) ? orders : [];
  products = Array.isArray(products) ? products : [];

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('totalProducts', products.length);
  setText('totalOrders', orders.length);
  setText('monthlyRevenue', Utils.formatPrice(stats.monthlyRevenue || stats.revenue || 0));
  setText('pendingOrders', orders.filter((o) => o.status === 'pending').length);
  updateUserGreeting();
}

function updateUserGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Bonjour';
  if (hour >= 18) greeting = 'Bonsoir';
  else if (hour >= 12) greeting = 'Bon après-midi';
  const el = document.getElementById('userGreeting');
  if (el) el.textContent = `${greeting}, Admin`;
}

// ============================================
// DISPLAY RECENT ORDERS
// ============================================

function displayRecentOrders(orders) {
  const tbody = document.getElementById('recentOrdersTable');
  if (!tbody) return;
  
  Utils.DOM.empty(tbody);

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 30px;">
          Aucune commande récente
        </td>
      </tr>
    `;
    return;
  }

  orders.forEach(order => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>#${Utils.escapeHtml(order.id)}</td>
      <td>${Utils.escapeHtml(order.customer_name || 'N/A')}</td>
      <td>${Utils.formatPrice(order.total_amount || 0)}</td>
      <td>${getStatusBadge(order.status || 'pending')}</td>
      <td>${Utils.formatDate(order.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="viewOrder(${Number(order.id) || 0})">
          <i class="fa-solid fa-eye"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ============================================
// DISPLAY TOP PRODUCTS
// ============================================

function displayTopProducts(products) {
  const tbody = document.getElementById('topProductsTable');
  if (!tbody) return;
  
  Utils.DOM.empty(tbody);

  const featured = (products || []).filter((p) => p.is_featured);
  const list = featured.length ? featured : (products || []).slice(0, 5);

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 30px;">
          Aucun produit
        </td>
      </tr>
    `;
    return;
  }

  list.forEach(product => {
    const row = document.createElement('tr');
    const stockClass = product.stock > 10 ? 'text-success' :
                       product.stock > 0 ? 'text-warning' : 'text-error';

    row.innerHTML = `
      <td>${Utils.escapeHtml(product.name || 'N/A')}</td>
      <td>${Utils.escapeHtml(product.sales_count || 0)}</td>
      <td>
        <span class="${stockClass}">${Utils.escapeHtml(product.stock || 0)}</span>
      </td>
      <td>${Utils.formatPrice(product.base_price || 0)}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editProduct(${Number(product.id) || 0})">
          Éditer <i class="fas fa-edit"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ============================================
// HELPERS
// ============================================

function getStatusBadge(status) {
  return Utils.statusBadge(status);
}

// ============================================
// ACTIONS
// ============================================

function viewOrder(id) {
  window.location.href = `orders.html?id=${id}`;
}

function editProduct(id) {
  window.location.href = `products.html?edit=${id}`;
}

// ============================================
// LOGOUT
// ============================================

function logout() {
  Auth.logout();
}