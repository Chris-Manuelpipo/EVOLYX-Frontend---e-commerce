/**
 * Suivi de commande : pending → confirmed → preparing → shipped → delivered.
 * cancelled hors séquence. Retour possible si livrée. Pas de facture côté client.
 */

let currentOrder = null;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('id');
  if (orderId) {
    document.getElementById('orderId').value = orderId;
    searchOrder(new Event('submit'));
  }
  if (window.Utils) {
    Utils.updateCartBadge();
    Utils.updateWishlistBadge();
  }
});

async function searchOrder(event) {
  event.preventDefault();
  const orderId = document.getElementById('orderId').value.trim().replace(/^#/, '');
  if (!orderId) {
    Utils.showToast('Entrez un numéro de commande', 'warning');
    return;
  }

  const result = document.getElementById('trackingResult');
  const url = new URL(location.href);
  url.searchParams.set('id', orderId);
  url.searchParams.delete('token');
  history.replaceState(null, '', url);

  try {
    Utils.showLoading(result, true);
    const response = await API.trackOrder(orderId);
    const payload = response.data || response;
    const order = payload.order || payload;
    renderOrderStatus(order);
  } catch (error) {
    console.error('Order tracking failed:', error);
    Utils.showToast('Commande non trouvée', 'error');
    result.innerHTML = `
      <div class="card catalog-state catalog-state-error">
        <p>Aucune commande pour ce numéro. Vérifiez le numéro reçu après validation.</p>
      </div>
    `;
  }
}

function renderOrderStatus(order) {
  currentOrder = order;
  const container = document.getElementById('trackingResult');
  Utils.DOM.empty(container);
  const statusInfo = Utils.statusInfo(order.status);
  const wa = (window.EVOLYX_CONFIG && window.EVOLYX_CONFIG.WHATSAPP_URL) || 'https://wa.me/237654804907';
  const phone = (window.EVOLYX_CONFIG && window.EVOLYX_CONFIG.PHONE_DISPLAY) || '+237 6 54 80 49 07';
  const items = Array.isArray(order.items) ? order.items : [];
  const delivered = order.status === 'delivered';

  const itemsBlock =
    items.length > 0
      ? `
        <div class="order-items">
          <h3>Articles</h3>
          <ul>
            ${items
              .map((item) => {
                const line =
                  item.price != null && item.price !== ''
                    ? ' · ' + Utils.formatPrice(Number(item.price) * Number(item.quantity || 0))
                    : '';
                return `<li>${Utils.escapeHtml(Utils.formatOrderItemLabel(item))} ×${item.quantity}${line}</li>`;
              })
              .join('')}
          </ul>
        </div>`
      : '';

  container.innerHTML = `
    <div class="order-status-card card">
      <div class="text-center">
        <h2>Commande #${Utils.escapeHtml(order.id)}</h2>
        <p class="text-gray">${Utils.formatDate(order.created_at)}</p>
      </div>
      <div class="status-timeline">${renderTimeline(order)}</div>
      <div class="order-info">
        <h3>Détails</h3>
        <div class="order-info-grid">
          <div>
            <p class="text-gray">Statut</p>
            <p style="font-weight:600;color:${statusInfo.color};">
              <i class="fas ${statusInfo.icon}" aria-hidden="true"></i> ${statusInfo.label}
            </p>
          </div>
          <div>
            <p class="text-gray">Montant</p>
            <p class="product-price">${Utils.formatPrice(order.total_amount)}</p>
          </div>
          <div>
            <p class="text-gray">Créée le</p>
            <p>${Utils.formatDate(order.created_at)}</p>
          </div>
          <div>
            <p class="text-gray">Heure</p>
            <p>${Utils.formatTime(order.created_at)}</p>
          </div>
        </div>
        ${itemsBlock}
      </div>
      ${
        delivered
          ? `<div class="order-actions" style="margin-top:1rem;">
        <button type="button" class="btn btn-secondary" onclick="showReturnForm('${Utils.escapeHtml(order.id)}')">Demander un retour</button>
      </div>`
          : ''
      }
      <div id="returnBox"></div>
      <div class="help-box">
        <p><strong>Besoin d’aide ?</strong></p>
        <p>
          WhatsApp :
          <a href="${wa}" target="_blank" rel="noopener noreferrer">${phone}</a>
        </p>
      </div>
      <a href="index.html" class="btn btn-secondary btn-lg" style="width:100%;margin-top:16px;">Retour au catalogue</a>
    </div>
  `;
}

function eventAt(order, status) {
  const events = Array.isArray(order && order.timeline) ? order.timeline : [];
  const match = [...events].reverse().find((event) => event.status === status);
  if (!match || !match.at) return '';
  return `${Utils.formatDate(match.at)} · ${Utils.formatTime(match.at)}`;
}

function renderTimeline(order) {
  const currentStatus = typeof order === 'string' ? order : order.status;
  const source = typeof order === 'object' && order ? order : { status: currentStatus, timeline: [] };

  if (currentStatus === 'cancelled') {
    const cancelled = Utils.statusInfo('cancelled');
    const pending = Utils.statusInfo('pending');
    return `${timelineItem(pending, true, false, eventAt(source, 'pending'))}${timelineItem(
      cancelled,
      true,
      true,
      eventAt(source, 'cancelled')
    )}`;
  }

  const currentIndex = Utils.STATUS_SEQUENCE.indexOf(currentStatus);
  return Utils.STATUS_SEQUENCE.map((status, index) => {
    const info = Utils.statusInfo(status);
    const isActive = currentIndex >= 0 && index <= currentIndex;
    const isCurrent = status === currentStatus;
    return timelineItem(info, isActive, isCurrent, eventAt(source, status));
  }).join('');
}

function timelineItem(info, isActive, isCurrent, at) {
  return `
    <div class="timeline-item${isActive ? ' is-active' : ''}${isCurrent ? ' is-current' : ''}">
      <div class="timeline-dot" style="background:${isActive ? info.color : 'var(--outline-strong)'}">
        <i class="fas ${info.icon}" aria-hidden="true"></i>
      </div>
      <div>
        <p class="timeline-label">${info.label}</p>
        <p class="text-gray text-sm">${info.description}</p>
        ${at ? `<p class="text-gray text-sm">${at}</p>` : ''}
        ${isCurrent ? '<p class="timeline-now">Statut actuel</p>' : ''}
      </div>
    </div>
  `;
}

function mapReturnLine(item) {
  if (!item || item.product_id == null) return null;
  return {
    product_id: Number(item.product_id),
    variation_id: item.variation_id != null ? Number(item.variation_id) : null,
    quantity: Number(item.quantity) || 1,
  };
}

function returnItemsForOrder(order) {
  const fromOrder = (order.items || []).map(mapReturnLine).filter(Boolean);
  if (fromOrder.length) return fromOrder;
  const snapshot = order && order.id ? Utils.Storage.getOrderSnapshot(order.id) : null;
  const fromSnap = Array.isArray(snapshot?.items) ? snapshot.items : [];
  return fromSnap.map(mapReturnLine).filter(Boolean);
}

function showReturnForm(orderId) {
  const box = document.getElementById('returnBox');
  if (!box) return;
  box.innerHTML = `
    <form class="review-form card" style="margin-top:1rem;" onsubmit="submitReturn(event, '${Utils.escapeHtml(orderId)}')">
      <h3>Demande de retour</h3>
      <div class="form-group">
        <label for="returnReason">Motif</label>
        <textarea id="returnReason" rows="3" required maxlength="500" placeholder="Produit endommagé, erreur de taille…"></textarea>
      </div>
      <p class="text-sm text-gray" id="returnHint"></p>
      <button type="submit" class="btn btn-primary">Envoyer la demande</button>
    </form>
  `;
}

async function submitReturn(event, orderId) {
  event.preventDefault();
  const reason = document.getElementById('returnReason').value.trim();
  const hint = document.getElementById('returnHint');
  if (!reason) return;
  const items = returnItemsForOrder(currentOrder && String(currentOrder.id) === String(orderId) ? currentOrder : { id: orderId, items: [] });
  const payload = { reason };
  if (items.length) payload.items = items;
  try {
    await API.requestReturn(orderId, payload);
    Utils.showToast('Demande de retour envoyée', 'success');
    if (hint) hint.textContent = 'Demande enregistrée. Nous vous contactons sur WhatsApp.';
    event.target.querySelector('button[type="submit"]').disabled = true;
  } catch (error) {
    const text = error.message || 'Impossible d’envoyer la demande';
    if (hint) hint.textContent = text;
    Utils.showToast(text, 'error');
  }
}

function updateCartCount() {
  if (window.Utils) {
    Utils.updateCartBadge();
    Utils.updateWishlistBadge();
  }
}

window.searchOrder = searchOrder;
window.showReturnForm = showReturnForm;
window.submitReturn = submitReturn;
window.updateCartCount = updateCartCount;
