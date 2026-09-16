/**
 * Panier, code promo, merge serveur, commande WhatsApp.
 */

let appliedPromo = null;

document.addEventListener('DOMContentLoaded', async () => {
  appliedPromo = Utils.Storage.getCart().promo || null;
  renderCart();
  if (window.Utils) {
    Utils.updateCartBadge();
    Utils.updateWishlistBadge();
  }
  await mergeCartToServer({ hydrateIfEmpty: true });
  renderCart();
  const updated = await backfillCartImages();
  if (updated) renderCart();
  Utils.updateCartBadge();
});

function cartItemHasPhoto(item) {
  const url = Utils.productImageUrl(item);
  const placeholder = window.EVOLYX_CONFIG && window.EVOLYX_CONFIG.PLACEHOLDER_IMAGE;
  return Boolean(url) && url !== placeholder;
}

async function backfillCartImages() {
  const cart = Utils.Storage.getCart();
  if (!cart.items || !cart.items.length || !window.API) return;

  let changed = false;
  await Promise.all(
    cart.items.map(async (item) => {
      if (cartItemHasPhoto(item) || !item.product_id) return;
      try {
        const response = await API.getProduct(item.product_id);
        const product = response.data || response;
        const url = Utils.productImageUrl(product);
        if (url) {
          item.image = url;
          item.image_url = url;
          changed = true;
        }
      } catch (error) {
        console.warn('Image panier indisponible:', error);
      }
    })
  );

  if (changed) Utils.Storage.setCart(cart);
  return changed;
}

function cartSubtotal(cart) {
  return (cart.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function cartTotals(cart) {
  const subtotal = cartSubtotal(cart);
  const discount = appliedPromo ? Number(appliedPromo.discount) || 0 : 0;
  const total = Math.max(0, appliedPromo && appliedPromo.total != null ? Number(appliedPromo.total) : subtotal - discount);
  return { subtotal, discount, total };
}

function isCartToken(value) {
  return window.Utils && Utils.isUuid ? Utils.isUuid(value) : false;
}

async function ensureCartToken() {
  const cart = Utils.Storage.getCart();
  if (isCartToken(cart.token)) return cart.token;
  cart.token = null;
  try {
    const response = await API.createCart();
    const token = response.data?.cart_token || response.data?.token || response.cart_token;
    if (token) {
      cart.token = token;
      Utils.Storage.setCart(cart);
      return token;
    }
  } catch (error) {
    console.warn('Création panier serveur indisponible:', error);
  }
  return null;
}

function mapServerCartItems(items) {
  return (items || []).map((item) => ({
    product_id: item.product_id,
    product_name: item.name || item.product_name,
    price: Number(item.unit_price ?? item.price ?? item.base_price),
    quantity: Number(item.quantity),
    image: item.image || item.image_url,
    image_url: item.image || item.image_url,
    variation_id: item.variation_id || null,
    variation_color: item.color || item.variation_color || null,
    variation_size: item.size || item.variation_size || null,
  }));
}

function hydrateLocalFromServer(response) {
  const data = Utils.unwrapData(response) || {};
  const cart = Utils.Storage.getCart();
  const token = data.cart_token || data.token;
  if (token) cart.token = token;
  const items = Array.isArray(data.items) ? data.items : Utils.unwrapList(response);
  if (Array.isArray(items)) {
    cart.items = mapServerCartItems(items);
    cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
  Utils.Storage.setCart(cart);
  return cart;
}

function localCartLines(cart) {
  return (cart.items || [])
    .map((item) => ({
      product_id: Number(item.product_id),
      variation_id:
        item.variation_id == null || item.variation_id === ''
          ? null
          : Number(item.variation_id),
      quantity: Math.max(1, Number(item.quantity) || 1),
    }))
    .filter((item) => item.product_id);
}

async function mergeCartToServer(options = {}) {
  const hydrateIfEmpty = options.hydrateIfEmpty !== false;
  try {
    const token = await ensureCartToken();
    if (!token) return;
    const cart = Utils.Storage.getCart();
    if (!cart.items || !cart.items.length) {
      if (hydrateIfEmpty) {
        const response = await API.getCart(token);
        hydrateLocalFromServer(response);
      } else {
        const response = await API.mergeCart(token, []);
        hydrateLocalFromServer(response);
      }
      return;
    }
    const response = await API.mergeCart(token, localCartLines(cart));
    hydrateLocalFromServer(response);
  } catch (error) {
    console.warn('Merge panier indisponible:', error);
  }
}

function renderCart() {
  const cart = Utils.Storage.getCart();
  const container = document.getElementById('cartContent');
  Utils.DOM.empty(container);

  if (!cart.items || cart.items.length === 0) {
    container.innerHTML = `
      <div class="empty-cart catalog-state">
        <p>Votre panier est vide. Ajoutez un article depuis le catalogue, puis confirmez par WhatsApp.</p>
        <a href="catalog.html" class="btn btn-primary">Voir le catalogue</a>
      </div>
    `;
    Utils.updateCartBadge();
    return;
  }

  const itemsHTML = cart.items.map((item, index) => createCartItemHTML(item, index)).join('');
  const { subtotal, discount, total } = cartTotals(cart);
  const promoCode = appliedPromo?.code || cart.promo_code || '';
  const promoMessage = appliedPromo
    ? `Code ${appliedPromo.code} appliqué`
    : '';

  container.innerHTML = `
    <div class="cart-grid">
      <div class="cart-list">${itemsHTML}</div>
      <aside class="cart-summary card">
        <h2>Résumé</h2>
        <div class="summary-row">
          <span>Sous-total</span>
          <span>${Utils.formatPrice(subtotal)}</span>
        </div>
        <div class="promo-box">
          <label for="promoCode">Code promo</label>
          <div class="promo-input">
            <input type="text" id="promoCode" value="${Utils.escapeHtml(promoCode)}" placeholder="EX. EVOLYX10" autocomplete="off">
            <button type="button" class="btn btn-secondary" onclick="applyPromo()">Appliquer</button>
          </div>
          <p class="text-sm" id="promoMessage">${Utils.escapeHtml(promoMessage)}</p>
        </div>
        ${
          discount > 0
            ? `<div class="summary-row">
                <span>Remise</span>
                <span class="text-success">− ${Utils.formatPrice(discount)}</span>
              </div>`
            : ''
        }
        <div class="summary-row">
          <span>Livraison</span>
          <span>Confirmée par WhatsApp</span>
        </div>
        <div class="summary-row total">
          <span>Total</span>
          <span class="product-price">${Utils.formatPrice(total)}</span>
        </div>
        <button type="button" class="btn btn-primary btn-lg" style="width:100%;margin-top:16px;" onclick="proceedToCheckout()">
          Commander
        </button>
        <a href="catalog.html" class="btn btn-secondary" style="width:100%;margin-top:10px;">
          Continuer vos achats
        </a>
      </aside>
    </div>
  `;
}

function createCartItemHTML(item, index) {
  const itemTotal = item.price * item.quantity;
  const variationParts = [item.variation_color, item.variation_size].filter(Boolean);
  const variationText = variationParts.length
    ? `<p class="text-gray text-sm">${Utils.escapeHtml(variationParts.join(' · '))}</p>`
    : '';
  const placeholder = window.EVOLYX_CONFIG.PLACEHOLDER_IMAGE || '';
  const image = Utils.productImageUrl(item) || placeholder;
  const name = item.product_name || 'Produit';

  return `
    <article class="cart-card card">
      <div class="cart-thumb-wrap">
        <img src="${Utils.escapeHtml(image)}" alt="${Utils.escapeHtml(name)}" class="cart-thumb"
             onerror="this.onerror=null;this.src='${Utils.escapeHtml(placeholder)}'">
      </div>
      <div class="cart-card-body">
        <h2>${Utils.escapeHtml(name)}</h2>
        ${variationText}
        <p class="cart-line-price product-price">${Utils.formatPrice(item.price)} × ${item.quantity} = ${Utils.formatPrice(itemTotal)}</p>
        <div class="cart-card-meta">
          <div class="quantity-control" role="group" aria-label="Quantité">
            <button type="button" onclick="updateQuantity(${index}, ${item.quantity - 1})" aria-label="Diminuer">−</button>
            <input type="text" inputmode="numeric" value="${item.quantity}" readonly aria-live="polite" aria-label="Quantité">
            <button type="button" onclick="updateQuantity(${index}, ${item.quantity + 1})" aria-label="Augmenter">+</button>
          </div>
          <button type="button" class="btn btn-sm btn-danger" onclick="removeItem(${index})">Supprimer</button>
        </div>
      </div>
    </article>
  `;
}

function persistPromo(promo) {
  appliedPromo = promo;
  const cart = Utils.Storage.getCart();
  cart.promo_code = promo ? promo.code : null;
  cart.promo = promo;
  Utils.Storage.setCart(cart);
}

async function applyPromo() {
  const input = document.getElementById('promoCode');
  const message = document.getElementById('promoMessage');
  const code = (input?.value || '').trim().toUpperCase();
  if (!code) {
    persistPromo(null);
    renderCart();
    return;
  }

  const cart = Utils.Storage.getCart();
  const subtotal = cartSubtotal(cart);
  try {
    const response = await API.validatePromo(code, subtotal);
    const data = Utils.unwrapData(response) || response;
    if (data.valid === false) {
      persistPromo(null);
      renderCart();
      const hint = document.getElementById('promoMessage');
      if (hint) hint.textContent = data.message || 'Code invalide';
      Utils.showToast(data.message || 'Code invalide', 'warning');
      return;
    }
    const discount = Number(data.discount ?? data.discount_amount ?? data.amount ?? 0);
    const percent = Number(data.percent || data.value || 0);
    const computedDiscount =
      discount || (data.type === 'percent' || data.discount_type === 'percent' ? (subtotal * percent) / 100 : 0);
    const total = Number(
      data.new_total ?? data.cart_total ?? data.total ?? subtotal - computedDiscount
    );
    persistPromo({
      code: (data.code || code).toUpperCase(),
      discount: computedDiscount,
      total,
    });
    renderCart();
    Utils.showToast('Code promo appliqué', 'success');
  } catch (error) {
    persistPromo(null);
    renderCart();
    const hint = document.getElementById('promoMessage');
    const text = error.message || 'Code invalide';
    if (hint) hint.textContent = text;
    if (input) input.value = code;
    Utils.showToast(text, 'error');
  }
}

async function persistCartChange() {
  await mergeCartToServer({ hydrateIfEmpty: false });
  renderCart();
  Utils.updateCartBadge();
  if (appliedPromo?.code) applyPromo();
}

function updateQuantity(index, newQuantity) {
  const cart = Utils.Storage.getCart();
  newQuantity = Math.max(1, parseInt(newQuantity, 10) || 1);
  if (cart.items[index]) {
    cart.items[index].quantity = newQuantity;
    cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    Utils.Storage.setCart(cart);
    renderCart();
    Utils.updateCartBadge();
    persistCartChange();
  }
}

function removeItem(index) {
  const cart = Utils.Storage.getCart();
  cart.items.splice(index, 1);
  cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  Utils.Storage.setCart(cart);
  renderCart();
  Utils.updateCartBadge();
  Utils.showToast('Article retiré du panier', 'info');
  persistCartChange();
}

function proceedToCheckout() {
  const cart = Utils.Storage.getCart();
  if (!cart.items || cart.items.length === 0) {
    Utils.showToast('Votre panier est vide', 'warning');
    return;
  }
  const { total } = cartTotals(cart);
  document.getElementById('checkoutTotal').textContent = Utils.formatPrice(total);
  document.getElementById('checkoutName').value = '';
  document.getElementById('checkoutPhone').value = '';
  document.getElementById('checkoutAddress').value = '';
  document.getElementById('checkoutModal').style.display = 'flex';
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal').style.display = 'none';
}

async function submitCheckout(event) {
  event.preventDefault();
  const name = document.getElementById('checkoutName').value.trim();
  const countryCode = document.getElementById('countryCode').value;
  const phoneNumber = document.getElementById('checkoutPhone').value.replace(/[\s.-]/g, '');
  const address = document.getElementById('checkoutAddress').value.trim();

  if (!name || !phoneNumber || !address) {
    Utils.showToast('Veuillez remplir tous les champs', 'warning');
    return;
  }

  const fullPhone = `+${countryCode}${phoneNumber}`;
  if (!Utils.Validate.phone(fullPhone)) {
    Utils.showToast('Numéro de téléphone invalide', 'warning');
    return;
  }

  closeCheckoutModal();
  await createOrder(name, fullPhone, address);
}

function extractOrderPayload(response, fallbackItems, totalAmount) {
  const order =
    response.order ||
    response.data?.order ||
    (response.data && response.data.id ? response.data : null) ||
    response;

  const whatsappLink =
    response.whatsappLink ||
    response.data?.whatsappLink ||
    order?.whatsappLink ||
    null;

  const normalized = {
    id: order?.id,
    created_at: order?.created_at || new Date().toISOString(),
    status: order?.status || 'pending',
    total_amount: order?.total_amount ?? totalAmount,
    items: Array.isArray(order?.items) && order.items.length ? order.items : fallbackItems,
  };

  return { order: normalized, whatsappLink };
}

function buildWhatsAppLink(order, name, phone, address) {
  const number = (window.EVOLYX_CONFIG && window.EVOLYX_CONFIG.WHATSAPP_NUMBER) || '237654804907';
  let message = `Commande EVOLYX #${order.id}\nClient: ${name}\nTél: ${phone}\nAdresse: ${address}\n\n`;
  (order.items || []).forEach((item, i) => {
    message += `${i + 1}. ${item.product_name || 'Produit'} x${item.quantity}\n`;
  });
  message += `\nTotal: ${order.total_amount} FCFA`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

async function createOrder(name, phone, address) {
  const container = document.getElementById('cartContent');
  try {
    Utils.showLoading(container, true);
    await mergeCartToServer({ hydrateIfEmpty: false });
    const cart = Utils.Storage.getCart();
    const { subtotal, total } = cartTotals(cart);
    const fallbackItems = cart.items.map((item) => ({
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      color: item.variation_color || item.color,
      size: item.variation_size || item.size,
    }));

    const orderData = {
      customer_name: name,
      customer_phone: phone,
      customer_address: address,
      cart_token: isCartToken(cart.token) ? cart.token : undefined,
      promo_code: appliedPromo?.code || cart.promo_code || undefined,
      items: localCartLines(cart),
    };

    const response = await API.createOrder(orderData);
    const { order, whatsappLink } = extractOrderPayload(response, fallbackItems, total || subtotal);
    const link = whatsappLink || buildWhatsAppLink(order, name, phone, address);
    if (order.id) {
      Utils.Storage.setLastOrderId(order.id);
      Utils.Storage.setOrderSnapshot(order.id, {
        items: cart.items.map((item) => ({
          product_id: Number(item.product_id),
          variation_id: item.variation_id != null ? Number(item.variation_id) : null,
          quantity: Number(item.quantity) || 1,
        })),
      });
    }

    Utils.Storage.setCart({ token: null, items: [], total: 0, promo_code: null, promo: null });
    appliedPromo = null;

    Utils.showLoading(container, false);
    showOrderConfirmation(order, link, name, phone, address);
  } catch (error) {
    console.error('Order creation failed:', error);
    Utils.showToast('Erreur lors de la création de la commande', 'error');
    Utils.showLoading(container, false);
    renderCart();
  }
}

function showOrderConfirmation(order, whatsappLink, name, phone, address) {
  const container = document.getElementById('cartContent');
  const itemsList = (order.items || [])
    .map(
      (item) =>
        `<li>${Utils.escapeHtml(Utils.formatOrderItemLabel(item))} ×${item.quantity} = ${Utils.formatPrice(
          (item.price || 0) * item.quantity
        )}</li>`
    )
    .join('');

  container.innerHTML = `
    <div class="order-confirmation card">
      <div class="text-center">
        <h1>Commande enregistrée</h1>
        <p class="product-price">Commande #${Utils.escapeHtml(order.id)}</p>
      </div>
      <div class="order-details">
        <h2>Détails</h2>
        <p><strong>Client :</strong> ${Utils.escapeHtml(name)}</p>
        <p><strong>Téléphone :</strong> ${Utils.escapeHtml(phone)}</p>
        <p><strong>Adresse :</strong> ${Utils.escapeHtml(address)}</p>
        <p><strong>Date :</strong> ${Utils.formatDate(order.created_at)}</p>
        <p><strong>Statut :</strong> ${Utils.statusBadge(order.status || 'pending')}</p>
        <h3>Articles</h3>
        <ul>${itemsList}</ul>
        <div class="summary-row total">
          <span>Total</span>
          <span class="product-price">${Utils.formatPrice(order.total_amount)}</span>
        </div>
      </div>
      <div class="order-actions">
        <a href="${Utils.escapeHtml(whatsappLink)}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-lg">
          Confirmer via WhatsApp
        </a>
        <a href="order-tracking.html?id=${Utils.escapeHtml(order.id)}" class="btn btn-secondary btn-lg">Suivre ma commande</a>
        <a href="index.html" class="btn btn-secondary btn-lg">Continuer vos achats</a>
      </div>
    </div>
  `;
  Utils.updateCartBadge();
}

function updateCartCount() {
  if (window.Utils) Utils.updateCartBadge();
}

window.renderCart = renderCart;
window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
window.proceedToCheckout = proceedToCheckout;
window.closeCheckoutModal = closeCheckoutModal;
window.submitCheckout = submitCheckout;
window.applyPromo = applyPromo;
window.updateCartCount = updateCartCount;
