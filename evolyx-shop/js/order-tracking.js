/**
 * @fileoverview Order Tracking Logic
 * Track order status by ID
 * @author EVOLYX Team
 */

const ORDER_STATUSES = {
  pending: { label: 'En attente', color: '#F59E0B', icon: '⏳' },
  confirmed: { label: 'Confirmée', color: '#3B82F6', icon: '✓' },
  preparing: { label: 'En préparation', color: '#8B5CF6', icon: '📦' },
  shipped: { label: 'Expédiée', color: '#06B6D4', icon: '🚚' },
  delivered: { label: 'Livrée', color: '#22C55E', icon: '🎉' },
  cancelled: { label: 'Annulée', color: '#EF4444', icon: '❌' },
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Check if order ID in URL
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('id');

  if (orderId) {
    document.getElementById('orderId').value = orderId;
    searchOrder(new Event('submit'));
  }

  updateCartCount();
});

// ============================================
// SEARCH ORDER
// ============================================

async function searchOrder(event) {
  event.preventDefault();

  const orderId = document.getElementById('orderId').value;

  if (!orderId) {
    Utils.showToast('Veuillez entrer un numéro de commande', 'warning');
    return;
  }

  try {
    Utils.showLoading(document.getElementById('trackingResult'), true);

    const response = await API.trackOrder(orderId);
    const order = response.data;

    renderOrderStatus(order);
    Utils.showLoading(document.getElementById('trackingResult'), false);
  } catch (error) {
    console.error('Order tracking failed:', error);
    Utils.showToast('Commande non trouvée', 'error');

    document.getElementById('trackingResult').innerHTML = `
      <div class="card" style="max-width: 500px; margin: 30px auto; text-align: center; padding: 40px;">
        <p style="color: #EF4444; font-size: 18px; margin: 20px 0;">
          Aucune commande trouvée pour ce numéro
        </p>
        <p class="text-gray" style="margin-bottom: 20px;">
          Veuillez vérifier le numéro de commande et réessayer
        </p>
      </div>
    `;

    Utils.showLoading(document.getElementById('trackingResult'), false);
  }
}

// ============================================
// RENDER ORDER STATUS
// ============================================

function renderOrderStatus(order) {
  const container = document.getElementById('trackingResult');
  Utils.DOM.empty(container);

  const statusInfo = ORDER_STATUSES[order.status] || ORDER_STATUSES.pending;
  const statusIndex = getStatusIndex(order.status);

  const html = `
    <div class="order-status-card card" style="max-width: 600px; margin: 30px auto;">
      <div style="text-align: center; margin-bottom: 40px;">
        <h2 style="color: #D4AF37; margin-bottom: 10px;">Commande #${order.id}</h2>
        <p class="text-gray">${Utils.formatDate(order.created_at)}</p>
      </div>

      <!-- Status Timeline -->
      <div class="status-timeline">
        ${renderTimeline(statusIndex, order.status)}
      </div>

      <!-- Order Info -->
      <div class="order-info" style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin-top: 30px;">
        <h3 style="margin-bottom: 15px;">Détails de la commande</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
          <div>
            <p class="text-gray">Statut</p>
            <p style="font-weight: 600; color: ${statusInfo.color};">
              ${statusInfo.icon} ${statusInfo.label}
            </p>
          </div>
          <div>
            <p class="text-gray">Montant</p>
            <p style="font-weight: 600; color: #D4AF37;">${Utils.formatPrice(order.total_amount)}</p>
          </div>
          <div>
            <p class="text-gray">Créée le</p>
            <p>${Utils.formatDate(order.created_at)}</p>
          </div>
          <div>
            <p class="text-gray">À ${Utils.formatTime(order.created_at)}</p>
          </div>
        </div>
      </div>

      <!-- Help -->
      <div style="background-color: #EFF6FF; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px;">
        <p style="margin-bottom: 10px;">
          <strong>Besoin d'aide?</strong>
        </p>
        <p>
          Contactez-nous via WhatsApp: 
          <a href="https://wa.me/237654804907" target="_blank" style="color: #D4AF37;">+237 654 804 907</a>
        </p>
      </div>

      <a href="index.html" class="btn btn-secondary btn-lg" style="width: 100%; margin-top: 20px;">
        Retour au catalogue
      </a>
    </div>
  `;

  container.innerHTML = html;
}

// ============================================
// TIMELINE RENDERING
// ============================================

const STATUS_SEQUENCE = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

function getStatusIndex(status) {
  return STATUS_SEQUENCE.indexOf(status);
}

function renderTimeline(currentIndex, currentStatus) {
  return STATUS_SEQUENCE.map((status, index) => {
    const info = ORDER_STATUSES[status];
    const isActive = index <= currentIndex;
    const isCurrent = status === currentStatus;

    return `
      <div class="timeline-item" style="
        display: flex;
        gap: 15px;
        margin-bottom: 20px;
        opacity: ${isActive ? 1 : 0.3};
      ">
        <!-- Timeline dot -->
        <div style="
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: ${isActive ? info.color : '#CCCCCC'};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          border: ${isCurrent ? '3px solid ' + info.color : 'none'};
          ${isCurrent ? 'box-shadow: 0 0 10px rgba(' + hexToRgb(info.color).join(', ') + ', 0.5);' : ''}
        ">
          ${info.icon}
        </div>

        <!-- Timeline content -->
        <div style="flex: 1;">
          <p style="font-weight: 600; font-size: 15px;">
            ${info.label}
          </p>
          <p class="text-gray" style="font-size: 13px;">
            ${getStatusDescription(status)}
          </p>
          ${isCurrent ? '<p style="color: #D4AF37; font-weight: 600; margin-top: 5px;">Statut actuel</p>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

function getStatusDescription(status) {
  const descriptions = {
    pending: 'Votre commande a été créée et attend confirmation',
    confirmed: 'Votre commande a été confirmée',
    preparing: 'Votre commande est en cours de préparation',
    shipped: 'Votre commande a été expédiée',
    delivered: 'Votre commande a été livrée',
    cancelled: 'Votre commande a été annulée',
  };
  return descriptions[status] || '';
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ] : [0, 0, 0];
}

// ============================================
// UTILITIES
// ============================================

function updateCartCount() {
  const cart = Utils.Storage.getCart();
  const count = cart.items ? cart.items.length : 0;
  document.getElementById('cartCount').textContent = count;
}