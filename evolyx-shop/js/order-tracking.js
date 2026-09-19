/**
 * Suivi de commande : pending → confirmed → preparing → shipped → delivered.
 * cancelled hors séquence. Retour possible si livrée. Pas de facture côté client.
 * Accès protégé par ?token= (invoice_token).
 */

let currentOrder = null;
let currentInvoiceToken = null;

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('id');
  const token = params.get('token');
  if (orderId) {
    document.getElementById('orderId').value = orderId;
  }
  if (orderId && token) {
    currentInvoiceToken = token;
    searchOrder(new Event('submit'));
  } else if (orderId && !token) {
    // Try sessionStorage (set by cart.js to avoid Referer leakage)
    const stored = sessionStorage.getItem('evolyx_track_' + orderId);
    if (stored) {
      currentInvoiceToken = stored;
      sessionStorage.removeItem('evolyx_track_' + orderId);
      searchOrder(new Event('submit'));
    } else {
      Utils.showToast('Lien de suivi incomplet : le jeton (?token=) est requis', 'warning');
    }
  }
  if (window.Utils) {
    Utils.updateCartBadge();
    Utils.updateWishlistBadge();
  }
});

function getTrackingToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token') || currentInvoiceToken || '';
}

async function searchOrder(event) {
  event.preventDefault();
  const orderId = document.getElementById('orderId').value.trim().replace(/^#/, '');
  if (!orderId) {
    Utils.showToast('Entrez un numéro de commande', 'warning');
    return;
  }

  const token = getTrackingToken();
  if (!token) {
    Utils.showToast(
      'Utilisez le lien de suivi reçu (avec ?token=) après validation de la commande',
      'warning'
    );
    return;
  }

  currentInvoiceToken = token;
  const result = document.getElementById('trackingResult');
  const url = new URL(location.href);
  url.searchParams.set('id', orderId);
  // Remove token from URL after reading to prevent Referer/history leakage
  url.searchParams.delete('token');
  history.replaceState(null, '', url);

  try {
    Utils.showLoading(result, true);
    const response = await API.trackOrder(orderId, token);
    const payload = response.data || response;
    const order = payload.order || payload;
    renderOrderStatus(order);
  } catch (error) {
    console.error('Order tracking failed:', error);
    Utils.showToast('Commande non trouvée', 'error');
    result.innerHTML = `
      <div class="card catalog-state catalog-state-error">
        <p>Aucune commande pour ce numéro. Vérifiez le lien de suivi reçu après validation.</p>
      </div>
    `;
  }
}

function renderOrderStatus(order) {
  currentOrder = order;
  const container = document.getElementById('trackingResult');
  Utils.DOM.empty(container);
  const statusInfo = Utils.statusInfo(order.status);
  const waRaw = (window.EVOLYX_CONFIG && window.EVOLYX_CONFIG.WHATSAPP_URL) || 'https://wa.me/237654804907';
  const wa = Utils.safeExternalUrl(waRaw) || '#';
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
                return `<li>${Utils.escapeHtml(Utils.formatOrderItemLabel(item))} ×${Utils.escapeHtml(item.quantity)}${line}</li>`;
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
              <i class="fas ${statusInfo.icon}" aria-hidden="true"></i> ${Utils.escapeHtml(statusInfo.label)}
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
        <button type="button" class="btn btn-secondary" id="requestReturnBtn"
                data-order-id="${Utils.escapeHtml(order.id)}">Demander un retour</button>
      </div>`
          : ''
      }
      <div id="returnBox"></div>
      <div class="help-box">
        <p><strong>Besoin d’aide ?</strong></p>
        <p>
          WhatsApp :
          <a href="${Utils.escapeHtml(wa)}" target="_blank" rel="noopener noreferrer">${Utils.escapeHtml(phone)}</a>
        </p>
      </div>
      <a href="catalog.html" class="btn btn-secondary btn-lg" style="width:100%;margin-top:16px;">Retour au catalogue</a>
    </div>
  `;

  const returnBtn = document.getElementById('requestReturnBtn');
  if (returnBtn) {
    returnBtn.addEventListener('click', () => {
      showReturnForm(returnBtn.dataset.orderId);
    });
  }
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
        <p class="timeline-label">${Utils.escapeHtml(info.label)}</p>
        <p class="text-gray text-sm">${Utils.escapeHtml(info.description)}</p>
        ${at ? `<p class="text-gray text-sm">${Utils.escapeHtml(at)}</p>` : ''}
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
    <form class="review-form card" style="margin-top:1rem;" id="returnForm">
      <h3>Demande de retour</h3>
      <input type="hidden" id="returnOrderId" value="${Utils.escapeHtml(orderId)}">
      <div class="form-group">
        <label for="returnReason">Motif</label>
        <textarea id="returnReason" rows="3" required maxlength="500" placeholder="Produit endommagé, erreur de taille…"></textarea>
      </div>
      <p class="text-sm text-gray" id="returnHint"></p>
      <button type="submit" class="btn btn-primary">Envoyer la demande</button>
    </form>
  `;
  const form = document.getElementById('returnForm');
  if (form) {
    form.addEventListener('submit', (event) => {
      const id = document.getElementById('returnOrderId')?.value || orderId;
      submitReturn(event, id);
    });
  }
}

async function submitReturn(event, orderId) {
  event.preventDefault();
  const reason = document.getElementById('returnReason').value.trim();
  const hint = document.getElementById('returnHint');
  if (!reason) return;

  const invoiceToken =
    getTrackingToken() ||
    (orderId ? Utils.Storage.getOrderSnapshot(orderId)?.invoice_token : null) ||
    '';

  if (!invoiceToken) {
    const text = 'Jeton de suivi manquant : rouvrez le lien reçu après commande';
    if (hint) hint.textContent = text;
    Utils.showToast(text, 'error');
    return;
  }

  const items = returnItemsForOrder(
    currentOrder && String(currentOrder.id) === String(orderId)
      ? currentOrder
      : { id: orderId, items: [] }
  );
  const payload = { reason, invoice_token: invoiceToken };
  if (items.length) payload.items = items;

  try {
    const createFn = API.createReturn || API.requestReturn;
    await createFn(orderId, payload);
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
