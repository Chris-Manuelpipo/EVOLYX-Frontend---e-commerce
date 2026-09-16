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

function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function chartTheme() {
  return {
    gold: token('--gold'),
    goldSoft: token('--gold-soft'),
    onSurface: token('--on-surface'),
    onMuted: token('--on-muted'),
    outline: token('--outline'),
    surface: token('--surface'),
    warning: token('--warning'),
    info: token('--info'),
    success: token('--success'),
    danger: token('--danger'),
    warningSurface: token('--warning-surface'),
    infoSurface: token('--info-surface'),
    successSurface: token('--success-surface'),
    dangerSurface: token('--danger-surface'),
    variant: token('--on-variant'),
  };
}

function chartTextOptions() {
  const t = chartTheme();
  return {
    plugins: {
      legend: {
        labels: { color: t.onSurface },
      },
    },
    scales: {
      x: { ticks: { color: t.onMuted }, grid: { color: t.outline } },
      y: { ticks: { color: t.onMuted }, grid: { color: t.outline } },
    },
  };
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth();
  loadStatsData();
  window.addEventListener('evolyx-theme-change', () => {
    if (typeof updateStats === 'function') updateStats();
  });
});

// ============================================
// LOAD DATA
// ============================================

const STATS_SKELETON_IDS = [
  'totalRevenue',
  'totalExpense',
  'totalProfit',
  'profitMargin',
  'revenueTrend',
  'expenseTrend',
  'profitTrend',
  'todayOrdersCount',
  'todayRevenue',
  'todayPending',
  'stockCostValue',
  'stockSellingValue',
  'outOfStockCount',
];

function setStatsPageSkeleton(on) {
  STATS_SKELETON_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (on) {
      el.classList.add('is-skeleton');
      el.textContent = '\u00a0';
    } else {
      el.classList.remove('is-skeleton');
    }
  });

  document.querySelectorAll('.chart-canvas').forEach((el) => {
    el.classList.toggle('chart-skeleton', on);
  });

  const stockGrid = document.getElementById('outOfStockProducts');
  if (stockGrid) {
    if (on) {
      stockGrid.classList.add('is-skeleton');
      stockGrid.innerHTML = Array.from({ length: 4 }, () =>
        '<span class="skeleton-tile" aria-hidden="true"></span>'
      ).join('');
    } else {
      stockGrid.classList.remove('is-skeleton');
      if (stockGrid.querySelector('.skeleton-tile')) {
        stockGrid.innerHTML = '';
      }
    }
  }

  if (on) {
    Utils.showTableSkeleton('categorySalesTable', { rows: 5 });
    Utils.showTableSkeleton('calendarBody', { rows: 5, cols: 7 });
  }
}

async function loadStatsData() {
  setStatsPageSkeleton(true);
  try {
    const ordersResponse = await API.getAdminOrders();
    allOrders = ordersResponse.data || [];

    const productsResponse = await API.getAdminProducts({ limit: 999 });
    allProducts = productsResponse?.products || [];

    const categoriesResponse = await API.getCategories();
    allCategories = categoriesResponse.data || [];

    console.log('📦 Commandes:', allOrders.length);
    console.log('📦 Produits:', allProducts.length);
    console.log('🏷️ Catégories:', allCategories.length);

    setStatsPageSkeleton(false);
    loadOutOfStockProducts();
    updateStockValues();
    updateStats();
    generateCalendar();
  } catch (error) {
    console.error('Failed to load stats:', error);
    setStatsPageSkeleton(false);
    Utils.showToast('Erreur lors du chargement des statistiques', 'error');
  }
}

// ============================================
// UPDATE STATS
// ============================================

function updateStats() {
  const dateRangeEl = document.getElementById('dateRangeFilter');
  if (!dateRangeEl) return;

  try {
  const dateRange = dateRangeEl.value;
  const filteredOrders = filterByDateRange(allOrders, dateRange);

  const PAID_STATUSES = ['confirmed', 'preparing', 'shipped', 'delivered'];
  const confirmedOrders = filteredOrders.filter((o) => PAID_STATUSES.includes(o.status));

  // Revenus (CA) = total_amount des commandes confirmées
  const totalRevenue = confirmedOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

  // Dépenses = somme des coûts des produits vendus
  const totalExpense = calculateExpenses(confirmedOrders);

  // Bénéfice
  const totalProfit = totalRevenue - totalExpense;

  // Marge bénéficiaire
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0;
  const trend = calculateTrends(confirmedOrders, dateRange);

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('totalRevenue', Utils.formatPrice(totalRevenue));
  setText('totalExpense', Utils.formatPrice(totalExpense));
  setText('totalProfit', Utils.formatPrice(totalProfit));
  setText('profitMargin', `${profitMargin}%`);
  setText('revenueTrend', `${trend.revenue > 0 ? '↑' : '↓'} ${Math.abs(trend.revenue)}%`);
  setText('expenseTrend', `${trend.expense > 0 ? '↑' : '↓'} ${Math.abs(trend.expense)}%`);
  setText('profitTrend', `${trend.profit > 0 ? '↑' : '↓'} ${Math.abs(trend.profit)}%`);

  // Résumé du jour
  updateTodaySummary();

  // Graphiques
  updateRevenueChart(confirmedOrders);
  updateOrdersChart(filteredOrders);
  updateProductsChart(filteredOrders); // ← on passe les commandes filtrées
  updateStatusChart(filteredOrders);
  updateCategorySalesTable(confirmedOrders);
  } catch (error) {
    console.error('updateStats:', error);
  }
}

// ============================================
// FILTER BY DATE RANGE
// ============================================

function filterByDateRange(orders, range) {
  if (range === 'all') return orders;

  const days = parseInt(range);
  if (isNaN(days)) return orders;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return orders.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= startDate;
  });
}

// ============================================
// CALCULATE TRENDS (période précédente de même durée)
// ============================================

function calculateTrends(confirmedOrders, range) {
  if (range === 'all' || confirmedOrders.length === 0) {
    return { revenue: 0, expense: 0, profit: 0 };
  }

  const days = parseInt(range);
  const now = new Date();

  // Période actuelle : de now-days à now
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - days);

  // Période précédente : de now-2*days à now-days
  const prevStart = new Date(now);
  prevStart.setDate(prevStart.getDate() - 2 * days);
  const prevEnd = new Date(currentStart);

  const currentOrders = confirmedOrders.filter(o => {
    const d = new Date(o.created_at);
    return d >= currentStart && d <= now;
  });

  const prevOrders = confirmedOrders.filter(o => {
    const d = new Date(o.created_at);
    return d >= prevStart && d < prevEnd;
  });

  const currentRevenue = currentOrders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);
  const revenueTrend = prevRevenue ? ((currentRevenue - prevRevenue) / prevRevenue * 100).toFixed(1) : 0;

  const currentExpense = calculateExpenses(currentOrders);
  const prevExpense = calculateExpenses(prevOrders);
  const expenseTrend = prevExpense ? ((currentExpense - prevExpense) / prevExpense * 100).toFixed(1) : 0;

  const currentProfit = currentRevenue - currentExpense;
  const prevProfit = prevRevenue - prevExpense;
  const profitTrend = prevProfit ? ((currentProfit - prevProfit) / prevProfit * 100).toFixed(1) : 0;

  return {
    revenue: revenueTrend,
    expense: expenseTrend,
    profit: profitTrend
  };
}

// ============================================
// CALCULATE EXPENSES (utilise cost_price si disponible)
// ============================================

function calculateExpenses(orders) {
  return orders.reduce((sum, order) => {
    if (order.items && Array.isArray(order.items)) {
      return sum + order.items.reduce((itemSum, item) => {
        const product = allProducts.find(p => p.id === item.product_id);
        if (!product) return itemSum;

        // Utiliser cost_price s'il existe, sinon estimer à 70% du base_price
        const unitCost = product.cost_price
          ? parseFloat(product.cost_price)
          : parseFloat(product.base_price) * 0.7;

        return itemSum + unitCost * item.quantity;
      }, 0);
    }
    return sum;
  }, 0);
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

  const todayPaid = todayOrders.filter((o) =>
    ['confirmed', 'preparing', 'shipped', 'delivered'].includes(o.status)
  );
  const todayRevenue = todayPaid.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  const todayPending = todayOrders.filter(o => o.status === 'pending').length;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText('todayOrdersCount', todayOrders.length);
  setText('todayRevenue', Utils.formatPrice(todayRevenue));
  setText('todayPending', todayPending);
}

// ============================================
// OUT OF STOCK PRODUCTS
// ============================================

async function loadOutOfStockProducts() {
  try {
    const response = await API.getAdminProducts({
      stock_min: 0,
      stock_max: 0
    });

    const outOfStock = response?.products || [];
    const container = document.getElementById('outOfStockProducts');
    const countEl = document.getElementById('outOfStockCount');

    if (countEl) countEl.textContent = outOfStock.length;

    if (outOfStock.length === 0) {
      container.innerHTML = '<p class="admin-empty">Aucun produit en rupture.</p>';
      return;
    }

    const onError = Utils.placeholderOnErrorHandler();
    container.innerHTML = outOfStock.map(product => {
      const imageUrl = Utils.productImageUrl(product);
      return `
      <div class="out-of-stock-item">
        <img src="${Utils.escapeHtml(imageUrl)}"
             alt="${Utils.escapeHtml(product.name)}"
             class="admin-product-thumb${Utils.logoPlaceholderClass(imageUrl)}"
             onerror="${onError}">
        <div class="item-info">
          <strong>${Utils.escapeHtml(product.name)}</strong>
          <small>Stock: ${product.stock}</small>
        </div>
        <a href="products.html?edit=${product.id}" class="btn btn-sm btn-primary"><i class="fas fa-sync-alt"></i></a>
      </div>
    `;
    }).join('');

  } catch (error) {
    console.error('Erreur chargement ruptures:', error);
    const container = document.getElementById('outOfStockProducts');
    if (container) {
      container.innerHTML = '<p class="admin-empty text-error">Impossible de charger les ruptures.</p>';
    }
  }
}

// ============================================
// REVENUE CHART
// ============================================

function updateRevenueChart(orders) {
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;

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

  const t = chartTheme();
  chartsInstances.revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Chiffre d\'affaires (FCFA)',
        data: data,
        borderColor: t.gold,
        backgroundColor: t.goldSoft,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: chartTextOptions().plugins,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: t.onMuted,
            callback: function(value) {
              return value.toLocaleString('fr-FR') + ' FCFA';
            },
          },
          grid: { color: t.outline },
        },
        x: {
          ticks: { color: t.onMuted },
          grid: { color: t.outline },
        },
      },
    },
  });
}

// ============================================
// ORDERS CHART
// ============================================

function updateOrdersChart(orders) {
  const canvas = document.getElementById('ordersChart');
  if (!canvas) return;

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

  const t = chartTheme();
  chartsInstances.ordersChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Nombre de commandes',
        data: data,
        backgroundColor: t.info,
        borderColor: t.info,
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: chartTextOptions().plugins,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: t.onMuted },
          grid: { color: t.outline },
        },
        x: {
          ticks: { color: t.onMuted },
          grid: { color: t.outline },
        },
      },
    },
  });
}

// ============================================
// PRODUCTS CHART (TOP 10) - utilise les commandes filtrées
// ============================================

function updateProductsChart(orders) {
  const canvas = document.getElementById('productsChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const productSales = {};
  orders.forEach(order => {
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

  const t = chartTheme();
  chartsInstances.productsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Quantités vendues',
        data: data,
        backgroundColor: t.gold,
        borderColor: t.gold,
        borderWidth: 1,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: chartTextOptions().plugins,
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: t.onMuted },
          grid: { color: t.outline },
        },
        y: {
          ticks: { color: t.onMuted },
          grid: { color: t.outline },
        },
      },
    },
  });
}

// ============================================
// STATUS CHART
// ============================================

function updateStatusChart(orders) {
  const canvas = document.getElementById('statusChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const statusCounts = {};
  const t = chartTheme();
  const statusColors = {
    pending: t.warning,
    confirmed: t.info,
    preparing: t.variant,
    shipped: t.info,
    delivered: t.success,
    cancelled: t.danger,
  };

  orders.forEach(order => {
    const status = order.status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const labels = Object.keys(statusCounts);
  const data = Object.values(statusCounts);
  const colors = labels.map(status => statusColors[status] || t.variant);

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
          preparing: 'En préparation',
          shipped: 'Expédiée',
          delivered: 'Livrée',
          cancelled: 'Annulée',
        };
        return names[s] || s;
      }),
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: t.surface,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: t.onSurface } },
      },
    },
  });
}

// ============================================
// CATEGORY SALES TABLE (avec bénéfice réel)
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
        if (!product) return;

        const cat = allCategories.find(c => c.id === product.category_id);
        const category = cat?.name || `Catégorie ${product.category_id}`;

        if (!categorySales[category]) {
          categorySales[category] = { items: 0, revenue: 0, cost: 0 };
        }

        const itemRevenue = item.quantity * (parseFloat(item.price) || 0);
        const unitCost = product.cost_price
          ? parseFloat(product.cost_price)
          : parseFloat(product.base_price) * 0.7;
        const itemCost = unitCost * item.quantity;

        categorySales[category].items += item.quantity;
        categorySales[category].revenue += itemRevenue;
        categorySales[category].cost += itemCost;
        totalRevenue += itemRevenue;
      });
    }
  });

  const sorted = Object.entries(categorySales).sort((a, b) => b[1].revenue - a[1].revenue);

  sorted.forEach(([category, stats]) => {
    const percentage = totalRevenue > 0 ? ((stats.revenue / totalRevenue) * 100).toFixed(1) : 0;
    const profit = stats.revenue - stats.cost;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${Utils.escapeHtml(category)}</td>
      <td>${Utils.escapeHtml(stats.items)}</td>
      <td>${Utils.formatPrice(stats.revenue)}</td>
      <td>${Utils.escapeHtml(percentage)}%</td>
      <td class="text-gold">${Utils.formatPrice(profit)}</td>
    `;
    tbody.appendChild(row);
  });

  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="admin-empty">Aucune vente sur cette période.</td></tr>';
  }
}
// ============================================
// STOCK VALUE
// ============================================
function updateStockValues() {
  let totalCost = 0;
  let totalSelling = 0;

  allProducts.forEach(product => {
     console.log('Produit:', product.name, 'cost_price:', product.cost_price, 'type:', typeof product.cost_price);
    const stock = product.stock || 0;
    // Valeur au prix de vente
    totalSelling += (parseFloat(product.base_price) || 0) * stock;
    // Valeur au coût d'achat (si cost_price existe, sinon 0)
    if (product.cost_price) {
      totalCost += parseFloat(product.cost_price) * stock;
    }
  });
  console.log(totalCost)
  const costEl = document.getElementById('stockCostValue');
  const sellEl = document.getElementById('stockSellingValue');
  if (costEl) costEl.textContent = Utils.formatPrice(totalCost);
  if (sellEl) sellEl.textContent = Utils.formatPrice(totalSelling);
}
// ============================================
// CALENDAR
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
  Auth.logout();
}