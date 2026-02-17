/**
 * @fileoverview Admin Statistics & Analytics
 * Charts, graphs, financial KPIs, and calendar
 * @author EVOLYX Team
 */

let allOrders = [];
let allProducts = [];
let chartsInstances = {};
let currentMonth = new Date();
let calendarData = {};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth();
  loadStatsData();
  generateCalendar();
});

// ============================================
// LOAD DATA
// ============================================

async function loadStatsData() {
  try {
    // Load orders
    const ordersResponse = await API.getAdminOrders();
    allOrders = ordersResponse.data || [];

    // Load products
    const productsResponse = await API.getAdminProducts();
    allProducts = productsResponse.data || [];

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

  // Calculate KPIs
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  const totalExpense = calculateExpenses(filteredOrders);
  const totalProfit = totalRevenue - totalExpense;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0;

  // Update KPI cards
  document.getElementById('totalRevenue').textContent = Utils.formatPrice(totalRevenue);
  document.getElementById('totalExpense').textContent = Utils.formatPrice(totalExpense);
  document.getElementById('totalProfit').textContent = Utils.formatPrice(totalProfit);
  document.getElementById('profitMargin').textContent = `${profitMargin}%`;

  // Update trends
  const prevOrders = filterByDateRange(allOrders, dateRange * 2).slice(
    0,
    Math.floor(filteredOrders.length / 2)
  );
  const prevRevenue = prevOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  const revenueTrend = prevRevenue > 0 ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : 0;

  document.getElementById('revenueTrend').textContent = `${revenueTrend > 0 ? '↑' : '↓'} ${Math.abs(revenueTrend)}%`;

  // Update charts
  updateRevenueChart(filteredOrders);
  updateOrdersChart(filteredOrders);
  updateProductsChart();
  updateStatusChart(filteredOrders);
  updateCategorySalesTable(filteredOrders);
}

// ============================================
// FILTER BY DATE RANGE
// ============================================

function filterByDateRange(orders, days) {
  if (days === 0) return orders; // All times

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
  // Example: 30% of revenue as expenses (adjust based on your business)
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  return totalRevenue * 0.30; // 30% expense ratio
}

// ============================================
// REVENUE CHART
// ============================================

function updateRevenueChart(orders) {
  const ctx = document.getElementById('revenueChart');
  
  // Group by date
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
      plugins: {
        legend: { display: true },
        title: { display: false },
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
// ORDERS CHART
// ============================================

function updateOrdersChart(orders) {
  const ctx = document.getElementById('ordersChart');

  // Group by date
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
      plugins: {
        legend: { display: true },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
}

// ============================================
// PRODUCTS CHART (TOP 10)
// ============================================

function updateProductsChart() {
  const ctx = document.getElementById('productsChart');

  // Count product sales
  const productSales = {};
  allOrders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const productName = item.product_name || 'Inconnu';
        productSales[productName] = (productSales[productName] || 0) + item.quantity;
      });
    }
  });

  // Sort and get top 10
  const sorted = Object.entries(productSales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const labels = sorted.map(([name]) => name.substring(0, 20));
  const data = sorted.map(([_, qty]) => qty);

  if (chartsInstances.productsChart) {
    chartsInstances.productsChart.destroy();
  }

  chartsInstances.productsChart = new Chart(ctx, {
    type: 'barH', // Horizontal bar
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
      plugins: {
        legend: { display: true },
      },
      scales: {
        x: {
          beginAtZero: true,
        },
      },
    },
  });
}

// ============================================
// STATUS CHART (PIE)
// ============================================

function updateStatusChart(orders) {
  const ctx = document.getElementById('statusChart');

  // Count by status
  const statusCounts = {};
  const statusColors = {
    pending: '#FEF3C7',
    confirmed: '#DBEAFE',
    preparing: '#EDE9FE',
    shipped: '#CFFAFE',
    delivered: '#DCFCE7',
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
        borderColor: '#FFFFFF',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
      },
    },
  });
}

// ============================================
// CATEGORY SALES TABLE
// ============================================

function updateCategorySalesTable(orders) {
  const tbody = document.getElementById('categorySalesTable');
  Utils.DOM.empty(tbody);

  const categorySales = {};
  let totalRevenue = 0;

  orders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        const product = allProducts.find(p => p.id === item.product_id);
        if (product) {
          const category = product.category || 'Autres';
          if (!categorySales[category]) {
            categorySales[category] = { items: 0, revenue: 0, expense: 0 };
          }
          categorySales[category].items += item.quantity;
          categorySales[category].revenue += item.quantity * (item.price || 0);
          totalRevenue += item.quantity * (item.price || 0);
        }
      });
    }
  });

  // Calculate expenses per category (30%)
  Object.keys(categorySales).forEach(category => {
    categorySales[category].expense = categorySales[category].revenue * 0.30;
  });

  // Render table
  Object.entries(categorySales).forEach(([category, stats]) => {
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
}

// ============================================
// CALENDAR
// ============================================

function generateCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Update header
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

  // Get first day and last day
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);

  const tbody = document.getElementById('calendarBody');
  tbody.innerHTML = '';

  let currentDate = new Date(startDate);

  for (let week = 0; week < 6; week++) {
    const row = document.createElement('tr');

    for (let day = 0; day < 7; day++) {
      const cell = document.createElement('td');
      const dateStr = currentDate.toLocaleDateString('fr-FR');

      // Get order count for this date
      const dayOrders = allOrders.filter(o => {
        const oDate = new Date(o.created_at).toLocaleDateString('fr-FR');
        return oDate === dateStr;
      });

      const dayRevenue = dayOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

      const isCurrentMonth = currentDate.getMonth() === month;
      const cellClass = isCurrentMonth ? 'calendar-current' : 'calendar-other';

      cell.className = `calendar-cell ${cellClass}`;
      cell.innerHTML = `
        <div class="calendar-day">${currentDate.getDate()}</div>
        ${dayOrders.length > 0 ? `
          <div class="calendar-orders">${dayOrders.length} cmd</div>
          <div class="calendar-revenue">${Utils.formatPrice(dayRevenue)}</div>
        ` : ''}
      `;

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
// UTILITIES
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