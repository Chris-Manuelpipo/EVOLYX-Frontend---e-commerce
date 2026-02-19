/**
 * @fileoverview Shopping Cart Logic
 * Manage cart items and create orders via WhatsApp
 * @author EVOLYX Team
 */

const WHATSAPP_NUMBER = '237654804907';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  renderCart();
  updateCartCount();
});

// ============================================
// RENDER CART
// ============================================

function renderCart() {
  const cart = Utils.Storage.getCart();
  const container = document.getElementById('cartContent');
  Utils.DOM.empty(container);

  if (!cart.items || cart.items.length === 0) {
    container.innerHTML = `
      <div class="empty-cart">
        <p style="font-size: 18px; margin: 40px 0;">Votre panier est vide</p>
        <a href="index.html" class="btn btn-primary">Continuer vos achats</a>
      </div>
    `;
    return;
  }

  let subtotal = 0;
  const itemsHTML = cart.items.map((item, index) => {
    subtotal += item.price * item.quantity;
    return createCartItemHTML(item, index);
  }).join('');

  const html = `
    <div class="cart-grid">
      <div class="cart-items">
        <table class="cart-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Prix</th>
              <th>Quantité</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
      </div>

      <div class="cart-summary card">
        <h3>Résumé</h3>
        
        <div class="summary-row">
          <span>Sous-total:</span>
          <span>${Utils.formatPrice(subtotal)}</span>
        </div>

        <div class="summary-row">
          <span>Frais de port:</span>
          <span>Gratuit</span>
        </div>

        <div class="summary-row total">
          <span>Total:</span>
          <span class="text-gold text-2xl font-bold">${Utils.formatPrice(subtotal)}</span>
        </div>

        <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 20px;" onclick="proceedToCheckout()">
          📦 Commander
        </button>

        <a href="index.html" class="btn btn-secondary" style="width: 100%; margin-top: 10px;">
          Continuer vos achats
        </a>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function createCartItemHTML(item, index) {
  const itemTotal = item.price * item.quantity;
  const variationText = item.variation_color && item.variation_size 
    ? `<br><small class="text-gray">${item.variation_color} - ${item.variation_size}</small>` 
    : '';

  return `
    <tr class="cart-item">
      <td>${item.product_name}${variationText}</td>
      <td>${Utils.formatPrice(item.price)}</td>
      <td>
        <div class="quantity-control">
          <button onclick="updateQuantity(${index}, ${item.quantity - 1})">−</button>
          <input type="number" value="${item.quantity}" onchange="updateQuantity(${index}, this.value)">
          <button onclick="updateQuantity(${index}, ${item.quantity + 1})">+</button>
        </div>
      </td>
      <td>${Utils.formatPrice(itemTotal)}</td>
      <td>
        <button class="btn btn-sm" style="background: #EF4444; color: white;" onclick="removeItem(${index})">
          Supprimer
        </button>
      </td>
    </tr>
  `;
}

// ============================================
// CART OPERATIONS
// ============================================

function updateQuantity(index, newQuantity) {
  const cart = Utils.Storage.getCart();
  newQuantity = Math.max(1, parseInt(newQuantity));
  
  if (cart.items[index]) {
    cart.items[index].quantity = newQuantity;
    Utils.Storage.setCart(cart);
    renderCart();
    updateCartCount();
  }
}

function removeItem(index) {
  const cart = Utils.Storage.getCart();
  cart.items.splice(index, 1);
  Utils.Storage.setCart(cart);
  renderCart();
  updateCartCount();
  Utils.showToast('Article supprimé du panier', 'info');
}

function clearCart() {
  if (confirm('Êtes-vous sûr de vouloir vider votre panier?')) {
    Utils.Storage.setCart({ token: null, items: [], total: 0 });
    renderCart();
    updateCartCount();
  }
}

// ============================================
// CHECKOUT & ORDER
// ============================================

// ============================================
// CHECKOUT MODAL
// ============================================

function proceedToCheckout() {
  const cart = Utils.Storage.getCart();
  
  if (!cart.items || cart.items.length === 0) {
    Utils.showToast('Votre panier est vide', 'warning');
    return;
  }

  // Calculer le total
  const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('checkoutTotal').textContent = Utils.formatPrice(total);
  
  // Vider les champs précédents
  document.getElementById('checkoutName').value = '';
  document.getElementById('checkoutPhone').value = '';
  document.getElementById('checkoutAddress').value = '';
  
  // Afficher le modal
  document.getElementById('checkoutModal').style.display = 'flex';
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal').style.display = 'none';
}

async function submitCheckout(event) {
  event.preventDefault();
  
  // Récupérer les valeurs
  const name = document.getElementById('checkoutName').value.trim();
  const countryCode = document.getElementById('countryCode').value;
  const phoneNumber = document.getElementById('checkoutPhone').value.trim();
  const address = document.getElementById('checkoutAddress').value.trim();
  
  // Validation
  if (!name || !phoneNumber || !address) {
    Utils.showToast('Veuillez remplir tous les champs', 'warning');
    return;
  }
  
  if (phoneNumber.length < 9) {
    Utils.showToast('Numéro de téléphone invalide', 'warning');
    return;
  }

  // ✅ Formater le numéro avec l'indicatif
  const fullPhone = `+${countryCode}${phoneNumber}`;
  
  console.log('📞 Numéro complet:', fullPhone);

  // Fermer le modal
  closeCheckoutModal();
  
  // Créer la commande
  await createOrder(name, fullPhone, address);
}

async function createOrder(name, phone, address) {
  try {
    Utils.showLoading(document.getElementById('cartContent'), true);

    const cart = Utils.Storage.getCart();
    const totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const orderData = {
      customer_name: name,
      customer_phone: phone,
      customer_address: address,
      items: cart.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity, 
        variation_id: item.variation_id,
      })), 
    };

    const response = await API.createOrder(orderData);

    Utils.showLoading(document.getElementById('cartContent'), false);

    // Le backend retourne order, message, et whatsappLink
    const order = response.order;
    const whatsappLink = response.whatsappLink;

    // Clear cart
    Utils.Storage.setCart({ token: null, items: [], total: 0 });
    Utils.Storage.setLastOrderId(order.id);

    // Show order confirmation with WhatsApp link from backend
    showOrderConfirmation(order, whatsappLink, name, phone, address);

    
  } catch (error) {
    console.error('Order creation failed:', error);
    Utils.showToast('Erreur lors de la création de la commande', 'error');
    Utils.showLoading(document.getElementById('cartContent'), false);
  }
}

function showOrderConfirmation(order, whatsappLink, name, phone, address) {
  const container = document.getElementById('cartContent');
  Utils.DOM.empty(container);

  const itemsList = order.items.map(item => `
    <li>${item.product_name} x${item.quantity} = ${Utils.formatPrice(item.price * item.quantity)}</li>
  `).join('');

  const html = `
    <div class="order-confirmation card">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 class="text-gold" style="font-size: 36px; margin-bottom: 10px;">✓</h2>
        <h2>Commande créée avec succès!</h2>
        <p class="text-gold" style="font-size: 20px; margin: 10px 0;">Commande #${order.id}</p>
      </div>

      <div class="order-details">
        <h3>Détails de la commande</h3>
        <p><strong>Client:</strong> ${name}</p>
        <p><strong>Téléphone:</strong> ${phone}</p>
        <p><strong>Adresse:</strong> ${address}</p>
        <p><strong>Date:</strong> ${Utils.formatDate(order.created_at)}</p>
        <p><strong>Statut:</strong> <span class="badge badge-pending">En attente</span></p>

        <h4 style="margin-top: 20px;">Articles commandés:</h4>
        <ul style="list-style: none;">
          ${itemsList}
        </ul>

        <div class="summary-row total" style="border-top: 1px solid #ccc; padding-top: 10px; margin-top: 20px;">
          <span><strong>Total:</strong></span>
          <span class="text-gold text-2xl font-bold">${Utils.formatPrice(order.total_amount)}</span>
        </div>
      </div>

      <div class="order-actions" style="margin-top: 30px; display: flex; gap: 10px; flex-direction: column;">
        <a href="${whatsappLink}" target="_blank" class="btn btn-primary btn-lg" style="text-align: center;">
          📱 Confirmer via WhatsApp
        </a>
        <a href="order-tracking.html?id=${order.id}" class="btn btn-secondary btn-lg" style="text-align: center;">
          Suivre ma commande
        </a>
        <a href="index.html" class="btn btn-secondary btn-lg" style="text-align: center;">
          Continuer vos achats
        </a>
      </div>

      <p class="text-gray" style="text-align: center; margin-top: 20px; font-size: 14px;">
        Un message WhatsApp prérempli vous permet de confirmer votre commande directement avec notre équipe.
      </p>
    </div>
  `;

  container.innerHTML = html;
  // renderCart();
  updateCartCount();
}

// ============================================
// UTILITIES
// ============================================

function updateCartCount() {
  const cart = Utils.Storage.getCart();
  const count = cart.items ? cart.items.length : 0;
  document.getElementById('cartCount').textContent = count;
}

