// ============================================
// VARIABLES GLOBALES
// ============================================
let allOrders = [];
let selectedOrderId = null;
let filteredOrders = [];

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth();
  loadOrders();
  
  // Écouteurs pour les filtres
  document.getElementById('statusFilter').addEventListener('change', filterOrders);
  document.getElementById('dateFrom').addEventListener('change', filterOrders);
  document.getElementById('dateTo').addEventListener('change', filterOrders);
});

// ============================================
// LOAD ORDERS
// ============================================
async function loadOrders() {
  try {
    await Utils.withBusy('Chargement des commandes…', async () => {
      const response = await API.getAdminOrders();
      allOrders = Utils.unwrapList(response);
      filteredOrders = [...allOrders];
      renderOrders(filteredOrders);
      updateFilterStats();
      const openId = new URLSearchParams(location.search).get('id');
      if (openId) viewOrder(openId);
    });
  } catch (error) {
    console.error('Failed to load orders:', error);
    Utils.showToast('Erreur lors du chargement des commandes', 'error');
  }
}

// ============================================
// FILTER ORDERS
// ============================================
function filterOrders() {
  const status = document.getElementById('statusFilter').value;
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo = document.getElementById('dateTo').value;

  filteredOrders = allOrders.filter(order => {
    // Filtre par statut
    if (status && order.status !== status) return false;

    // Filtre par date
    if (dateFrom || dateTo) {
      const orderDate = new Date(order.created_at);
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (orderDate < fromDate) return false;
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (orderDate > toDate) return false;
      }
    }

    return true;
  });

  renderOrders(filteredOrders);
  updateFilterStats();
}

// ============================================
// RESET FILTERS
// ============================================
function resetFilters() {
  document.getElementById('statusFilter').value = '';
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  
  filteredOrders = [...allOrders];
  renderOrders(filteredOrders);
  updateFilterStats();
  Utils.showToast('Filtres réinitialisés', 'info');
}

// ============================================
// UPDATE FILTER STATS
// ============================================
function updateFilterStats() {
  const statsElement = document.getElementById('filterStats');
  if (!statsElement) return;
  
  const total = allOrders.length;
  const filtered = filteredOrders.length;
  
  if (total !== filtered) {
    statsElement.textContent = `${filtered} commandes sur ${total}`;
  } else {
    statsElement.textContent = `${total} commandes`;
  }
}

// ============================================
// RENDER ORDERS
// ============================================
function renderOrders(orders) {
  const tbody = document.getElementById('ordersTableBody');
  Utils.DOM.empty(tbody);

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px;">Aucune commande</td></tr>';
    return;
  }

  orders.forEach(order => {
    const statusBadge = getStatusBadge(order.status);
    const row = document.createElement('tr');
    
    // Nettoyer le numéro de téléphone
    const cleanPhone = order.customer_phone?.replace(/\s+/g, '').replace(/[^0-9+]/g, '') || '';
    
    row.innerHTML = `
      <td>#${order.id}</td>
      <td>${order.customer_name || 'N/A'}</td>
      <td>${order.customer_phone || 'N/A'}</td>
      <td>${Utils.formatPrice(order.total_amount || 0)}</td>
      <td>${statusBadge}</td>
      <td>${Utils.formatDate(order.created_at)}</td>
      <td>
        <div style="display: flex; gap: 5px;">
          <button class="btn btn-sm btn-primary" onclick="viewOrder(${order.id})" title="Voir détails">
            <i class="fas fa-eye"></i>
          </button>
          ${
            order.status === 'delivered'
              ? `<button class="btn btn-sm btn-secondary" onclick="openAdminInvoice(${order.id})" title="Facture PDF">
            <i class="fas fa-file-invoice"></i>
          </button>`
              : ''
          }
          <button class="btn btn-sm" style="background: #25D366; color: white;" 
                  onclick="contactCustomer('${cleanPhone}', '${order.customer_name || 'Client'}', ${order.id})"
                  title="Contacter sur WhatsApp"
                  ${!cleanPhone ? 'disabled' : ''}>
            <i class="fab fa-whatsapp"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ============================================
// GET STATUS BADGE
// ============================================
function getStatusBadge(status) {
  return Utils.statusBadge(status);
}

function fillStatusSelect(current) {
  const select = document.getElementById('orderStatusSelect');
  if (!select) return;
  const options = Utils.allowedTransitions(current);
  select.innerHTML = options
    .map((key) => {
      const info = Utils.statusInfo(key);
      return `<option value="${key}"${key === current ? ' selected' : ''}>${info.label}</option>`;
    })
    .join('');
}

// ============================================
// VIEW ORDER DETAILS
// ============================================
async function viewOrder(orderId) {
  try {
    const response = await API.getAdminOrder(orderId);
    const order = response.data || response.order;

    selectedOrderId = orderId;
    document.getElementById('orderModalTitle').textContent = `Commande #${order.id}`;
    fillStatusSelect(order.status);

    const itemsList = order.items && Array.isArray(order.items)
      ? order.items.map(item => `
          <tr>
            <td>${Utils.escapeHtml(Utils.formatOrderItemLabel(item))}</td>
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

      <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
        ${
          order.status === 'delivered'
            ? `<button class="btn btn-sm btn-secondary" type="button" onclick="openAdminInvoice(${order.id})">
          Facture PDF
        </button>`
            : ''
        }
        <button class="btn btn-sm" style="background: #25D366; color: white;"
                onclick="contactCustomer('${order.customer_phone}', '${order.customer_name}', ${order.id})">
          Contacter client
        </button>
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

// ============================================
// UPDATE ORDER STATUS
// ============================================
async function updateOrderStatus() {
  if (!selectedOrderId) return;

  const newStatus = document.getElementById('orderStatusSelect').value;

  try {
    await Utils.withBusy('Mise à jour du statut…', async () => {
      await API.updateOrderStatus(selectedOrderId, newStatus);
      Utils.showToast('Statut mis à jour', 'success');
      closeOrderModal();
      await loadOrders();
    });
  } catch (error) {
    console.error('Failed to update order status:', error);
    Utils.showToast(error.message || 'Erreur lors de la mise à jour', 'error');
  }
}

// ============================================
// CONTACT CUSTOMER ON WHATSAPP
// ============================================
function contactCustomer(phone, customerName, orderId) {
  if (!phone) {
    Utils.showToast('Numéro de téléphone non disponible', 'warning');
    return;
  }

  if (!confirm(`Ouvrir WhatsApp pour contacter ${customerName} ?`)) {
    return;
  }

  // Nettoyer et formater le numéro
  let cleanPhone = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  
  if (!cleanPhone.startsWith('+')) {
    // Numéros camerounais
    if (cleanPhone.startsWith('237')) {
      cleanPhone = '+' + cleanPhone;
    } else if (cleanPhone.length === 9) {
      // Format local: 6XXXXXXXX
      cleanPhone = '+237' + cleanPhone;
    } else if (cleanPhone.length === 8) {
      // Format avec 6 au début? Ex: 70000000
      cleanPhone = '+2376' + cleanPhone;
    } else {
      // Par défaut, on garde tel quel
      cleanPhone = '+' + cleanPhone;
    }
  }


  const message = encodeURIComponent(
    `Bonjour ${customerName} 👋\n\n` +
    `Je vous contacte concernant votre commande #${orderId} sur EVOLYX.\n` +
    `Puis-je vous aider ?`
  );

  window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  Utils.showToast(`WhatsApp ouvert pour ${customerName}`, 'success');
}

// ============================================
// CLOSE MODAL
// ============================================
async function openAdminInvoice(orderId) {
  try {
    const blob = await API.fetchInvoice(orderId);
    if (!(blob instanceof Blob)) throw new Error('Facture indisponible');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
  } catch (error) {
    Utils.showToast(
      error.status === 401
        ? 'Reconnectez-vous pour ouvrir la facture'
        : error.status === 403
          ? 'Facture disponible uniquement après livraison'
          : error.message || 'Facture indisponible',
      'error'
    );
  }
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('active');
  selectedOrderId = null;
}

// ============================================
// LOGOUT
// ============================================
function logout() {
  Auth.logout();
}

window.viewOrder = viewOrder;
window.updateOrderStatus = updateOrderStatus;
window.resetFilters = resetFilters;
window.contactCustomer = contactCustomer;
window.closeOrderModal = closeOrderModal;
window.openAdminInvoice = openAdminInvoice;
window.logout = logout;