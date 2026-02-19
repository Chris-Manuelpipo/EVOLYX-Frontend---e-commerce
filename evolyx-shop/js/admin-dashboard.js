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
  try {
    console.log('📊 Début chargement dashboard');
    
    // ✅ Afficher loader
    showLoading(true);
    
    // 1. CHARGER LES STATS (prioritaire)
    let stats = {};
    try {
      const statsResponse = await API.getDashboardStats();
      stats = statsResponse?.data || {};
      console.log('📊 Stats reçues:', stats);
    } catch (statsError) {
      console.warn('⚠️ Erreur stats, utilisation valeurs par défaut', statsError);
    }

    // 2. CHARGER LES COMMANDES
    let allOrders = [];
    try {
      const ordersResponse = await API.getAdminOrders();
      console.log('📦 Réponse commandes brute:', ordersResponse);
      
      // ✅ Extraction des commandes (response.data)
      if (ordersResponse?.data && Array.isArray(ordersResponse.data)) {
        allOrders = ordersResponse.data;
      } else if (Array.isArray(ordersResponse)) {
        allOrders = ordersResponse;
      }
      console.log('📦 Commandes extraites:', allOrders.length);
    } catch (ordersError) {
      console.warn('⚠️ Erreur commandes:', ordersError);
    }

    // 3. CHARGER LES PRODUITS
    let allProducts = [];
    try {
      const productsResponse = await API.getAdminProducts({limit: 999});
      console.log('📦 Réponse produits brute:', productsResponse);
      
      // ✅ CORRIGÉ: Les produits sont dans response.products
      if (productsResponse?.products && Array.isArray(productsResponse.products)) {
        allProducts = productsResponse.products;
        console.log('✅ Produits dans response.products');
      } 
      // Fallback pour ancien format
      else if (productsResponse?.data && Array.isArray(productsResponse.data)) {
        allProducts = productsResponse.data;
        console.log('⚠️ Ancien format: produits dans response.data');
      }
      // Fallback si tableau direct
      else if (Array.isArray(productsResponse)) {
        allProducts = productsResponse;
        console.log('⚠️ Format tableau direct');
      }
      
      console.log('📦 Produits extraits:', allProducts.length);
      if (allProducts.length > 0) {
        console.log('📦 Premier produit:', allProducts[0]);
      }
    } catch (productsError) {
      console.warn('⚠️ Erreur produits:', productsError);
    }

    // 4. METTRE À JOUR L'AFFICHAGE
    updateStatsCards(stats, allOrders, allProducts);
    displayRecentOrders(allOrders.slice(0, 5));
    displayTopProducts(allProducts);
    
    // ✅ Cacher loader
    showLoading(false);
    
  } catch (error) {
    console.error('❌ Erreur globale:', error);
    Utils.showToast('Erreur lors du chargement du dashboard', 'error');
    showLoading(false);
  }
}

// ============================================
// LOADER
// ============================================

function showLoading(show) {
  const content = document.querySelector('.admin-content');
  if (!content) return;

  if (show) {
    content.style.opacity = '0.5';
    content.style.pointerEvents = 'none';
  } else {
    content.style.opacity = '1';
    content.style.pointerEvents = 'auto';
  }
}

// ============================================
// UPDATE STATS CARDS
// ============================================

function updateStatsCards(stats, orders, products) {
  // Total products
  document.getElementById('totalProducts').textContent = products.length;

  // Total orders
  document.getElementById('totalOrders').textContent = orders.length;

  // Monthly revenue (stats du dashboard)
  const monthlyRevenue = stats.monthlyRevenue || 0;
  document.getElementById('monthlyRevenue').textContent = Utils.formatPrice(monthlyRevenue);

  // Pending orders
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  document.getElementById('pendingOrders').textContent = pendingCount;

  // User greeting
  updateUserGreeting();
}

function updateUserGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Bonjour';
  if (hour < 12) greeting = 'Bonjour';
  else if (hour < 18) greeting = 'Bon après-midi';
  else greeting = 'Bonsoir';
  
  document.getElementById('userGreeting').textContent = `${greeting}, Admin`;
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
      <td>#${order.id}</td>
      <td>${order.customer_name || 'N/A'}</td>
      <td>${Utils.formatPrice(order.total_amount || 0)}</td>
      <td>${getStatusBadge(order.status || 'pending')}</td>
      <td>${Utils.formatDate(order.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="viewOrder(${order.id})">
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

  if (!products || products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 30px;">
          Aucun produit
        </td>
      </tr>
    `;
    return;
  }

  products.forEach(product => {
    if (product.is_featured){
    const row = document.createElement('tr');
    const stockClass = product.stock > 10 ? 'text-success' : 
                       product.stock > 0 ? 'text-warning' : 'text-error';
    
    row.innerHTML = `
      <td>${product.name || 'N/A'}</td>
      <td>${product.sales_count || 0}</td>
      <td>
        <span class="${stockClass}">${product.stock || 0}</span>
      </td>
      <td>${Utils.formatPrice(product.base_price || 0)}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editProduct(${product.id})">
          Éditer<i class="fas fa-edit"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);}
  });
}

// ============================================
// HELPERS
// ============================================

function getStatusBadge(status) {
  const statuses = {
    pending: { label: 'En attente', class: 'status-pending' },
    confirmed: { label: 'Confirmée', class: 'status-confirmed' },
    // preparing: { label: 'En préparation', class: 'status-preparing' },
    // shipped: { label: 'Expédiée', class: 'status-shipped' },
    // delivered: { label: 'Livrée', class: 'status-delivered' },
    cancelled: { label: 'Annulée', class: 'status-cancelled' },
  };

  const info = statuses[status] || statuses.pending;
  return `<span class="status-badge ${info.class}">${info.label}</span>`;
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
  if (confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    Utils.showToast('Déconnecté', 'info');
    
    setTimeout(() => {
      window.location.href = '../login.html';
    }, 1000);
  }
}