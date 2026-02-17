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
});

// ============================================
// SETUP NAVIGATION
// ============================================

function setupNavigation() {
  // Set active nav item
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href').split('/').pop();
    if (href === currentPage) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// ============================================
// LOAD DASHBOARD DATA
// ============================================


// ============================================
// LOAD DASHBOARD DATA - CORRECTION EXTRACTION
// ============================================

async function loadDashboardData() {
  try {
    console.log('📊 Début chargement dashboard');
    
    // 1. CHARGER LES PRODUITS
    const productsResponse = await API.getAdminProducts();
    console.log('📦 Réponse produits brute:', productsResponse);
    
    // ✅ Extraire correctement les produits
    let allProducts = [];
    
    // Si la réponse a une propriété data qui est un tableau
    if (productsResponse?.data && Array.isArray(productsResponse.data)) {
      allProducts = productsResponse.data;
    }
    // Si la réponse a une propriété data qui est un objet avec des produits
    else if (productsResponse?.data && typeof productsResponse.data === 'object') {
      // Peut-être que les produits sont dans data.products ?
      allProducts = productsResponse.data.products || [];
    }
    // Si la réponse est directement un tableau
    else if (Array.isArray(productsResponse)) {
      allProducts = productsResponse;
    }
    
    console.log('📦 Produits extraits:', allProducts.length);
    if (allProducts.length > 0) {
      console.log('📦 Premier produit:', allProducts[0]);
    }

    // 2. CHARGER LES COMMANDES
    const ordersResponse = await API.getAdminOrders();
    console.log('📦 Réponse commandes brute:', ordersResponse);
    
    let allOrders = [];
    if (ordersResponse?.data && Array.isArray(ordersResponse.data)) {
      allOrders = ordersResponse.data;
    } else if (Array.isArray(ordersResponse)) {
      allOrders = ordersResponse;
    }
    console.log('📦 Commandes extraites:', allOrders.length);

    // 3. CHARGER LES STATS
    const statsResponse = await API.getDashboardStats();
    const stats = statsResponse?.data || {};
    console.log('📊 Stats:', stats);

    // 4. METTRE À JOUR L'AFFICHAGE
    updateStatsCards(stats, allOrders, allProducts);
    displayRecentOrders(allOrders.slice(0, 5));
    displayTopProducts(allProducts);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
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

  // Monthly revenue
  const monthlyRevenue = stats.monthlyRevenue || 0;
  document.getElementById('monthlyRevenue').textContent = Utils.formatPrice(monthlyRevenue);

  // Pending orders
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  document.getElementById('pendingOrders').textContent = pendingCount;

  // User greeting
  const hour = new Date().getHours();
  let greeting = 'Connecté';
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
  Utils.DOM.empty(tbody);

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 30px;">
          Aucune commande
        </td>
      </tr>
    `;
    return;
  }

  orders.forEach(order => {
    const statusBadge = getStatusBadge(order.status);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>#${order.id}</td>
      <td>${order.customer_name}</td>
      <td>${Utils.formatPrice(order.total_amount)}</td>
      <td>${statusBadge}</td>
      <td>${Utils.formatDate(order.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="window.location.href='orders.html?id=${order.id}'">
          Voir
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
  Utils.DOM.empty(tbody);

  console.log('🎨 Affichage de', products.length, 'produits');
  
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
    console.log('📦 Produit à afficher:', product);
    
    const row = document.createElement('tr');
    
    // Sécuriser les données
    const stock = product.stock || 0;
    const stockClass = stock > 10 ? 'text-success' : 
                       stock > 0 ? 'text-warning' : 'text-error';
    
    row.innerHTML = `
      <td>${product.name || 'Sans nom'}</td>
      <td>${product.sales || product.sales_count || 0}</td>
      <td>
        <span class="${stockClass}">${stock}</span>
      </td>
      <td>${Utils.formatPrice(product.base_price || 0)}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editProduct(${product.id})">
          Éditer
        </button>
      </td>
    `;
    tbody.appendChild(row);}
  });
  
  console.log('✅', products.length, 'produits affichés');
}

// ============================================
// HELPERS
// ============================================

function getStatusBadge(status) {
  const statuses = {
    pending: { label: 'En attente', class: 'status-pending' },
    confirmed: { label: 'Confirmée', class: 'status-confirmed' },
    preparing: { label: 'En préparation', class: 'status-preparing' },
    shipped: { label: 'Expédiée', class: 'status-shipped' },
    delivered: { label: 'Livrée', class: 'status-delivered' },
    cancelled: { label: 'Annulée', class: 'status-cancelled' },
  };

  const info = statuses[status] || statuses.pending;
  return `<span class="status-badge ${info.class}">${info.label}</span>`;
}

// ============================================
// LOGOUT
// ============================================

function logout() {
  if (confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
    Utils.Storage.remove('adminToken');
    Utils.showToast('Déconnecté', 'info');
    setTimeout(() => {
      window.location.href = '../login.html';
    }, 1000);
  }
}

