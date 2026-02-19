/**
 * @fileoverview Admin Statistics & Analytics
 * Charts, graphs, financial KPIs, and calendar
 * @author EVOLYX Team
 */

let allOrders = [];
let allProducts = [];
let allCategories = [];
let chartsInstances = {};
let currentMonth = new Date();

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth();
  loadStatsData();
});

// ============================================
// LOAD DATA
// ============================================

async function loadStatsData() {
  try {
    // Load orders
    const ordersResponse = await API.getAdminOrders();
    allOrders = ordersResponse.data || [];

    // ✅ CORRIGÉ: Les produits sont dans response.products
    const productsResponse = await API.getAdminProducts();
    allProducts = productsResponse?.products || [];
    
    // Load categories
    const categoriesResponse = await API.getCategories();
    allCategories = categoriesResponse.data || [];
    
    console.log('📦 Commandes:', allOrders.length);
    console.log('📦 Produits:', allProducts.length);
    console.log('🏷️ Catégories:', allCategories.length);

    // Load out of stock products
    loadOutOfStockProducts();
    
    // Initial update
    updateStats();
    generateCalendar();
    
  } catch (error) {
    console.error('Failed to load stats:', error);
    Utils.showToast('Erreur lors du chargement des statistiques', 'error');
  }
}

// ============================================
// UPDATE STATS
// ============================================

function updateStats() {
  const dateRange = parseInt(document.getElementById('dateRangeFilter').value);
  const filteredOrders = filterByDateRange(allOrders, dateRange);
  
  // Filtrer uniquement les commandes confirmées pour les chiffres réels
  const confirmedOrders = filteredOrders.filter(o => o.status === 'confirmed');

  // Calculer les KPI sur les commandes confirmées
  const totalRevenue = confirmedOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  const totalExpense = calculateExpenses(confirmedOrders);
  const totalProfit = totalRevenue - totalExpense;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0;

  // Mettre à jour les KPI
  document.getElementById('totalRevenue').textContent = Utils.formatPrice(totalRevenue);
  document.getElementById('totalExpense').textContent = Utils.formatPrice(totalExpense);
  document.getElementById('totalProfit').textContent = Utils.formatPrice(totalProfit);
  document.getElementById('profitMargin').textContent = `${profitMargin}%`;

  // Calculer les tendances
  const prevOrders = filterByDateRange(allOrders, dateRange * 2).slice(0, Math.floor(confirmedOrders.length / 2));
  const prevRevenue = prevOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  const revenueTrend = prevRevenue > 0 ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : 0;
  
  document.getElementById('revenueTrend').textContent = `${revenueTrend > 0 ? '↑' : '↓'} ${Math.abs(revenueTrend)}%`;

  // Mettre à jour le résumé du jour
  updateTodaySummary();

  // Mettre à jour les graphiques
  updateRevenueChart(confirmedOrders);
  updateOrdersChart(filteredOrders);
  updateProductsChart();
  updateStatusChart(filteredOrders);
  updateCategorySalesTable(confirmedOrders);
}

// ============================================
// TODAY SUMMARY
// ============================================

function updateTodaySummary() {
  const today = new Date().toISOString().split('T')[0];
  
  const todayOrders = allOrders.filter(o => {
    const orderDate = new Date(o.created_at).toISOString().split('T')[0];
    return orderDate === today;
  });

  const todayConfirmed = todayOrders.filter(o => o.status === 'confirmed');
  const todayRevenue = todayConfirmed.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  const todayPending = todayOrders.filter(o => o.status === 'pending').length;

  document.getElementById('todayOrdersCount').textContent = todayOrders.length;
  document.getElementById('todayRevenue').textContent = Utils.formatPrice(todayRevenue);
  document.getElementById('todayPending').textContent = todayPending;
}

// ============================================
// OUT OF STOCK PRODUCTS - CORRIGÉ
// ============================================

async function loadOutOfStockProducts() {
  try {
    // ✅ CORRIGÉ: stock_min=0, stock_max=0 pour les produits en rupture
    const response = await API.getAdminProducts({ 
      stock_min: 0, 
      stock_max: 0 
    });
    
    // ✅ CORRIGÉ: response.products
    const outOfStock = response?.products || [];
    const container = document.getElementById('outOfStockProducts');
    const countEl = document.getElementById('outOfStockCount');
    
    if (countEl) countEl.textContent = outOfStock.length;
    
    if (outOfStock.length === 0) {
      container.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">Aucun produit en rupture</p>';
      return;
    }
    
    container.innerHTML = outOfStock.map(product => `
      <div class="out-of-stock-item">
        <img src="${LINK}/${product.images?.[0]?.url || 'default.png'}" 
             alt="${product.name}"
             onerror="this.src='${LINK}/default.png'">
        <div class="item-info">
          <strong>${product.name}</strong>
          <small>Stock: ${product.stock}</small>
        </div>
        <a href="products.html?edit=${product.id}" class="btn btn-sm btn-primary"><i class="fas fa-sync-alt"></i> </a>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Erreur chargement ruptures:', error);
    const container = document.getElementById('outOfStockProducts');
    if (container) {
      container.innerHTML = '<p style="padding: 20px; text-align: center; color: red;">Erreur de chargement</p>';
    }
  }
}

// ============================================
// FILTER BY DATE RANGE
// ============================================

function filterByDateRange(orders, days) {
  if (days === 0) return orders;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return orders.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= startDate;
  });
}

// ============================================
// CALCULATE EXPENSES
// ============================================

function calculateExpenses(orders) {
  return orders.reduce((sum, order) => {
    if (order.items && Array.isArray(order.items)) {
      return sum + order.items.reduce((itemSum, item) => {
        const product = allProducts.find(p => p.id === item.product_id);
        const itemCost = product ? parseFloat(product.base_price) * item.quantity : 0;
        return itemSum + itemCost;
      }, 0);
    }
    return sum;
  }, 0);
}

// ============================================
// REVENUE CHART - CORRIGÉ (dimensions)
// ============================================

function updateRevenueChart(orders) {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  
  // ✅ Forcer une taille fixe pour éviter l'explosion
  canvas.style.height = '300px';
  canvas.style.width = '100%';
  
  const ctx = canvas.getContext('2d');
  
  const dateRevenue = {};
  orders.forEach(order => {
    const date = new Date(order.created_at).toLocaleDateString('fr-FR');
    dateRevenue[date] = (dateRevenue[date] || 0) + parseFloat(order.total_amount || 0);
  });

  const labels = Object.keys(dateRevenue).sort();
  const data = labels.map(date => dateRevenue[date]);

  if (chartsInstances.revenueChart) {
    chartsInstances.revenueChart.destroy();
  }

  chartsInstances.revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Chiffre d\'affaires (FCFA)',
        data: data,
        borderColor: '#D4AF37',
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true, // ✅ Changé à true
      plugins: {
        legend: { display: true, position: 'top' },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value.toLocaleString('fr-FR') + ' FCFA';
            },
          },
        },
      },
    },
  });
}

// ============================================
// ORDERS CHART - CORRIGÉ
// ============================================

function updateOrdersChart(orders) {
  const canvas = document.getElementById('ordersChart');
  if (!canvas) return;
  
  canvas.style.height = '300px';
  canvas.style.width = '100%';
  
  const ctx = canvas.getContext('2d');

  const dateOrders = {};
  orders.forEach(order => {
    const date = new Date(order.created_at).toLocaleDateString('fr-FR');
    dateOrders[date] = (dateOrders[date] || 0) + 1;
  });

  const labels = Object.keys(dateOrders).sort();
  const data = labels.map(date => dateOrders[date]);

  if (chartsInstances.ordersChart) {
    chartsInstances.ordersChart.destroy();
  }

  chartsInstances.ordersChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Nombre de commandes',
        data: data,
        backgroundColor: '#3B82F6',
        borderColor: '#1E40AF',
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: true, position: 'top' },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
        },
      },
    },
  });
}

// ============================================
// PRODUCTS CHART - CORRIGÉ
// ============================================

function updateProductsChart() {
  const canvas = document.getElementById('productsChart');
  if (!canvas) return;
  
  canvas.style.height = '300px';
  canvas.style.width = '100%';
  
  const ctx = canvas.getContext('2d');

  const productSales = {};
  allOrders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const product = allProducts.find(p => p.id === item.product_id);
        const productName = product?.name || `Produit #${item.product_id}`;
        productSales[productName] = (productSales[productName] || 0) + item.quantity;
      });
    }
  });

  const sorted = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const labels = sorted.map(([name]) => name.substring(0, 20));
  const data = sorted.map(([_, qty]) => qty);

  if (chartsInstances.productsChart) {
    chartsInstances.productsChart.destroy();
  }

  chartsInstances.productsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Quantités vendues',
        data: data,
        backgroundColor: '#8B5CF6',
        borderColor: '#5B21B6',
        borderWidth: 1,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: true, position: 'top' },
      },
      scales: {
        x: { beginAtZero: true },
      },
    },
  });
}

// ============================================
// STATUS CHART - CORRIGÉ
// ============================================

function updateStatusChart(orders) {
  const canvas = document.getElementById('statusChart');
  if (!canvas) return;
  
  canvas.style.height = '300px';
  canvas.style.width = '100%';
  
  const ctx = canvas.getContext('2d');

  const statusCounts = {};
  const statusColors = {
    pending: '#FEF3C7',
    confirmed: '#DBEAFE', 
    cancelled: '#FEE2E2',
  };

  orders.forEach(order => {
    const status = order.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const labels = Object.keys(statusCounts);
  const data = Object.values(statusCounts);
  const colors = labels.map(status => statusColors[status] || '#CCCCCC');

  if (chartsInstances.statusChart) {
    chartsInstances.statusChart.destroy();
  }

  chartsInstances.statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.map(s => {
        const names = {
          pending: 'En attente',
          confirmed: 'Confirmée',
          cancelled: 'Annulée',
        };
        return names[s] || s;
      }),
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: '#FFFFFF',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom' },
      },
    },
  });
}

// ============================================
// CATEGORY SALES TABLE - CORRIGÉ
// ============================================

function updateCategorySalesTable(orders) {
  const tbody = document.getElementById('categorySalesTable');
  if (!tbody) return;
  
  Utils.DOM.empty(tbody);

  const categorySales = {};
  let totalRevenue = 0;

  orders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const product = allProducts.find(p => p.id === item.product_id);
        
        if (product) {
          const cat = allCategories.find(c => c.id === product.category_id);
          const category = cat?.name || `Catégorie ${product.category_id}`;
          
          if (!categorySales[category]) {
            categorySales[category] = { items: 0, revenue: 0, expense: 0 };
          }
          
          const itemRevenue = item.quantity * (parseFloat(item.price) || 0);
          categorySales[category].items += item.quantity;
          categorySales[category].revenue += itemRevenue;
          totalRevenue += itemRevenue;
        }
      });
    }
  });

  Object.keys(categorySales).forEach(category => {
    categorySales[category].expense = categorySales[category].revenue * 0.3;
  });

  const sorted = Object.entries(categorySales).sort((a, b) => b[1].revenue - a[1].revenue);

  sorted.forEach(([category, stats]) => {
    const percentage = totalRevenue > 0 ? ((stats.revenue / totalRevenue) * 100).toFixed(1) : 0;
    const profit = stats.revenue - stats.expense;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${category}</td>
      <td>${stats.items}</td>
      <td>${Utils.formatPrice(stats.revenue)}</td>
      <td>${percentage}%</td>
      <td class="text-gold">${Utils.formatPrice(profit)}</td>
    `;
    tbody.appendChild(row);
  });

  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Aucune vente</td></tr>';
  }
}

// ============================================
// CALENDAR - CORRIGÉ
// ============================================

function generateCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);

  const tbody = document.getElementById('calendarBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';

  let currentDate = new Date(startDate);

  for (let week = 0; week < 6; week++) {
    const row = document.createElement('tr');

    for (let day = 0; day < 7; day++) {
      const cell = document.createElement('td');
      const dateStr = currentDate.toLocaleDateString('fr-FR');

      const dayOrders = allOrders.filter(o => {
        const oDate = new Date(o.created_at).toLocaleDateString('fr-FR');
        return oDate === dateStr;
      });

      const dayRevenue = dayOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

      const isCurrentMonth = currentDate.getMonth() === month;
      const cellClass = isCurrentMonth ? 'calendar-current' : 'calendar-other';

      cell.className = `calendar-cell ${cellClass}`;
      
      if (dayOrders.length > 0) {
        cell.innerHTML = `
          <div class="calendar-day">${currentDate.getDate()}</div>
          <div class="calendar-orders">${dayOrders.length} · ${Utils.formatPrice(dayRevenue)}</div>
        `;
      } else {
        cell.innerHTML = `<div class="calendar-day">${currentDate.getDate()}</div>`;
      }

      cell.onclick = () => showDayStats(dateStr, dayOrders);
      row.appendChild(cell);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    tbody.appendChild(row);
  }
}

function showDayStats(dateStr, dayOrders) {
  const dayRevenue = dayOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  const dayItems = dayOrders.reduce((sum, o) => {
    return sum + (o.items ? o.items.reduce((s, i) => s + (i.quantity || 0), 0) : 0);
  }, 0);

  document.getElementById('selectedDate').textContent = `Statistiques du ${dateStr}`;
  document.getElementById('dayOrders').textContent = dayOrders.length;
  document.getElementById('dayRevenue').textContent = Utils.formatPrice(dayRevenue);
  document.getElementById('dayItems').textContent = dayItems;
  document.getElementById('dayStats').style.display = 'block';
}

function previousMonth() {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  generateCalendar();
}

function nextMonth() {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  generateCalendar();
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