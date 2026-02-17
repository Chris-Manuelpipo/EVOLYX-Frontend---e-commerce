/**
 * @fileoverview Admin Orders Management
 * View and update order status
 * @author EVOLYX Team
 */

let allOrders = [];
let selectedOrderId = null;

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth();
  loadOrders();
  document.getElementById('statusFilter').addEventListener('change', filterOrders);
});

async function loadOrders() {
  try {
    const response = await API.getAdminOrders();
    allOrders = response.data || [];
    renderOrders(allOrders);
  } catch (error) {
    console.error('Failed to load orders:', error);
    Utils.showToast('Erreur lors du chargement des commandes', 'error');
  }
}

function filterOrders() {
  const status = document.getElementById('statusFilter').value;
  const filtered = status ? allOrders.filter(o => o.status === status) : allOrders;
  renderOrders(filtered);
}

function renderOrders(orders) {
  const tbody = document.getElementById('ordersTableBody');
  Utils.DOM.empty(tbody);

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;">Aucune commande</td></tr>';
    return;
  }

  orders.forEach(order => {
    const statusBadge = getStatusBadge(order.status);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>#${order.id}</td>
      <td>${order.customer_name}</td>
      <td>${order.customer_phone}</td>
      <td>${Utils.formatPrice(order.total_amount)}</td>
      <td>${statusBadge}</td>
      <td>${Utils.formatDate(order.created_at)}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="viewOrder(${order.id})">
          👁️ Voir
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

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

async function viewOrder(orderId) {
  try {
    const response = await API.getAdminOrder(orderId);
    const order = response.data || response.order;

    selectedOrderId = orderId;
    document.getElementById('orderModalTitle').textContent = `Commande #${order.id}`;
    document.getElementById('orderStatusSelect').value = order.status;

    const itemsList = order.items && Array.isArray(order.items)
      ? order.items.map(item => `
          <tr>
            <td>${item.product_name}</td>
            <td>${item.quantity}x</td>
            <td>${Utils.formatPrice(item.price)}</td>
            <td>${Utils.formatPrice(item.price * item.quantity)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4">Aucun article</td></tr>';

    const detailsHTML = `
      <div style="background: #F5F5F5; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
        <p><strong>Client:</strong> ${order.customer_name}</p>
        <p><strong>Téléphone:</strong> ${order.customer_phone}</p>
        <p><strong>Adresse:</strong> ${order.customer_address}</p>
        <p><strong>Date:</strong> ${Utils.formatDate(order.created_at)}</p>
        <p><strong>Statut actuel:</strong> ${getStatusBadge(order.status)}</p>
      </div>

      <h4>Articles</h4>
      <table class="admin-table" style="font-size: 12px;">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Qté</th>
            <th>P.U.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
      </table>

      <div style="background: #D4AF37; color: black; padding: 15px; border-radius: 8px; margin-top: 15px; font-weight: 600; text-align: right;">
        Total: ${Utils.formatPrice(order.total_amount)}
      </div>

      ${order.notes ? `
        <div style="margin-top: 15px; padding: 10px; background: #F9F9F9; border-left: 3px solid #D4AF37;">
          <strong>Notes:</strong> ${order.notes}
        </div>
      ` : ''}
    `;

    document.getElementById('orderDetails').innerHTML = detailsHTML;
    document.getElementById('orderModal').classList.add('active');
  } catch (error) {
    console.error('Failed to view order:', error);
    Utils.showToast('Erreur lors de la récupération de la commande', 'error');
  }
}

async function updateOrderStatus() {
  if (!selectedOrderId) return;

  const newStatus = document.getElementById('orderStatusSelect').value;

  try {
    await API.updateOrderStatus(selectedOrderId, newStatus);
    Utils.showToast('Statut mis à jour', 'success');
    closeOrderModal();
    loadOrders();
  } catch (error) {
    console.error('Failed to update order status:', error);
    Utils.showToast('Erreur lors de la mise à jour', 'error');
  }
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('active');
  selectedOrderId = null;
}

function logout() {
  if (confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
    Utils.Storage.remove('adminToken');
    Utils.showToast('Déconnecté', 'info');
    setTimeout(() => {
      window.location.href = '../login.html';
    }, 1000);
  }
}