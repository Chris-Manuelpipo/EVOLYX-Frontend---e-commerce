/**
 * @fileoverview Product Detail Page Logic
 * Display product with variations and add to cart
 * @author EVOLYX Team
 */

let product = null;
let variations = [];
let selectedVariation = null;
let quantity = 1;
let availableColors = [];
let availableSizes = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const productId = getProductId();
  
  if (!productId) {
    window.location.href = 'index.html';
    return;
  }

  loadProduct(productId);
  updateCartCount();
});

// ============================================
// GET PRODUCT ID
// ============================================

function getProductId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// ============================================
// LOAD DATA
// ============================================

async function loadProduct(productId) {
  try {
    Utils.showLoading(document.getElementById('productDetail'), true);

    // Charger le produit
    const response = await API.getProduct(productId);
    product = response.data;

    if (product) {
      // ✅ Charger les couleurs disponibles
      const colorsResponse = await API.getProductColors(productId);
      availableColors = colorsResponse.data || [];
      
      // ✅ Charger les tailles disponibles
      const sizesResponse = await API.getProductSizes(productId);
      availableSizes = sizesResponse.data || [];
      
      // ✅ Charger les variations complètes (optionnel)
      const variationsResponse = await API.getVariations({ product_id: productId });
      variations = variationsResponse.data || [];
      
      console.log('✅ Produit chargé:', product);
      console.log('🎨 Couleurs:', availableColors);
      console.log('📏 Tailles:', availableSizes);
      console.log('🔄 Variations:', variations);
    }

    renderProductDetail();
    Utils.showLoading(document.getElementById('productDetail'), false);
  } catch (error) {
    console.error('❌ Failed to load product:', error);
    Utils.showToast('Erreur lors du chargement du produit', 'error');
    document.getElementById('productDetail').innerHTML = `
      <div style="padding: 60px 20px; text-align: center;">
        <p>Produit non trouvé</p>
        <a href="index.html" class="btn btn-primary">Retour au catalogue</a>
      </div>
    `;
    Utils.showLoading(document.getElementById('productDetail'), false);
  }
}

// ============================================
// RENDER PRODUCT DETAIL
// ============================================

function renderProductDetail() {
  const container = document.getElementById('productDetail');
  Utils.DOM.empty(container);

  const hasColors = availableColors.length > 0;
  const hasSizes = availableSizes.length > 0;
  const hasVariations = hasColors || hasSizes;

  const html = `
    <div class="product-detail-wrapper" style="padding: 60px 0;">
      <div class="product-detail-grid">
        <!-- Images -->
        <div class="product-images">
          <div class="main-image">
            <img 
              id="mainImage"
              src="${product.images?.[0] ? LINK + '/' + product.images[0].url : LINK + 'default.png'}" 
              alt="${product.name}"
              onerror="this.src='${LINK}/default.png'"
            >
          </div>
          <div class="thumbnail-images">
            ${product.images ? product.images.map((img, index) => `
              <img 
                src="${LINK}/${img.url}" 
                alt="thumbnail"
                onclick="changeMainImage('${LINK}/${img.url}')"
                class="thumbnail ${index === 0 ? 'active' : ''}"
              >
            `).join('') : ''}
          </div>
        </div>

        <!-- Info -->
        <div class="product-details-info">
          <p class="breadcrumb">
            <a href="index.html">Accueil</a> / 
            <a href="index.html#catalog">Catalogue</a> / 
            <span>${product.name}</span>
          </p>

          <h1>${product.name}</h1>
          <p class="product-category text-gold text-lg font-bold">${product.category || 'Non catégorisé'}</p>

          <div class="product-price-section">
            <span class="price text-3xl text-gold font-bold">${Utils.formatPrice(product.base_price)}</span>
            <span class="stock ${product.stock > 0 ? 'in-stock' : 'out-stock'}">
              ${product.stock > 0 ? `${product.stock} en stock` : 'Rupture de stock'}
            </span>
          </div>

          <div class="product-description-section">
            <h3>Description</h3>
            <p>${product.description || 'Aucune description disponible'}</p>
          </div>

          <!-- Variations -->
          ${hasVariations ? `
            <div class="variations-section">
              <h3>Sélectionnez une variante</h3>
              
              <!-- Colors -->
              ${hasColors ? `
                <div class="variation-group">
                  <label>Couleur:</label>
                  <div class="variation-options" id="colorsContainer">
                    ${renderColorOptions()}
                  </div>
                </div>
              ` : ''}

              <!-- Sizes -->
              ${hasSizes ? `
                <div class="variation-group">
                  <label>Taille:</label>
                  <div class="variation-options" id="sizesContainer">
                    ${renderSizeOptions()}
                  </div>
                </div>
              ` : ''}

              <!-- Selected variation info -->
              <div id="variationInfo" style="display: none;" class="variation-info">
                <p class="text-sm text-gray">
                  Variante: <span id="variationName"></span> - 
                  Stock: <span id="variationStock"></span>
                </p>
              </div>
            </div>
          ` : ''}

          <!-- Quantity & Add to Cart -->
          <div class="purchase-section">
            <div class="quantity-selector">
              <label>Quantité:</label>
              <div class="quantity-input">
                <button type="button" onclick="decreaseQuantity()">−</button>
                <input type="number" id="quantityInput" value="1" min="1" max="${product.stock}" readonly>
                <button type="button" onclick="increaseQuantity()">+</button>
              </div>
             <span id="quantityDisplay" style="font-size: 14px; color: #666; margin-top: 5px;">Quantité: 1</span>

            </div>
            </div>

            <button class="btn btn-primary btn-lg ${product.stock === 0 ? 'disabled' : ''}" id="addToCartBtn" onclick="addToCart()">
              ${product.stock > 0 ? '🛒 Ajouter au panier' : 'Rupture de stock'}
            </button>
          </div>

          <!-- Product Info -->
          <div class="product-meta">
            <p><strong>Référence:</strong> ${product.id}</p>
            <p><strong>Catégorie:</strong> ${product.category || 'Non catégorisé'}</p>
            <p><strong>Mis à jour:</strong> ${Utils.formatDate(product.updated_at || product.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// ============================================
// COLOR & SIZE RENDERING
// ============================================

function renderColorOptions() {
  if (!availableColors || availableColors.length === 0) {
    return '';
  }
  
  return availableColors.map(color => `
    <button class="color-option" 
            data-color="${color.color}" 
            style="background-color: ${getColorCode(color.color)};" 
            title="${color.color} (${color.total_stock} en stock)"
            onclick="selectColor(this)">
    </button>
  `).join('');
}

function renderSizeOptions() {
  if (!availableSizes || availableSizes.length === 0) {
    return '';
  }
  
  // Initialement, toutes les tailles sont désactivées
  return availableSizes.map(size => `
    <button class="size-option disabled" 
            data-size="${size.size}"
            data-stock="${size.total_stock}"
            onclick="selectSize(this)"
            disabled>
      ${size.size}
    </button>
  `).join('');
}

function getColorCode(color) {
  const colorMap = {
    'Or': '#D4AF37',
    'Or Rose': '#B76E79',
    'Argent': '#C0C0C0',
    'Noir': '#000000',
    'Blanc': '#FFFFFF',
    'Rouge': '#FF0000',
    'Bleu': '#0000FF',
    'Vert': '#00FF00',
    'Jaune': '#FFFF00',
    'Violet': '#800080',
    'Rose': '#FFC0CB',
    'Marron': '#8B4513',
  };
  return colorMap[color] || '#CCCCCC';
}

// ============================================
// VARIATION SELECTION
// ============================================

async function selectColor(button) {
  // Désélectionner tous les autres
  document.querySelectorAll('.color-option').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  // Sélectionner celui-ci
  button.classList.add('selected');
  
  // Réinitialiser la taille sélectionnée
  document.querySelectorAll('.size-option').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  // Désélectionner la variation
  selectedVariation = null;
  document.getElementById('variationInfo').style.display = 'none';
  
  // Activer les tailles pour cette couleur
  await enableSizesForColor(button.dataset.color);
}

async function enableSizesForColor(color) {
  const productId = getProductId();
  
  try {
    // Récupérer les variations pour ce produit
    const response = await API.getVariations({ product_id: productId });
    const allVariations = response.data || [];
    
    // Filtrer les variations pour cette couleur
    const colorVariations = allVariations.filter(v => v.color === color);
    const availableSizeNames = colorVariations.map(v => v.size);
    
    // Activer/désactiver les boutons de taille
    document.querySelectorAll('.size-option').forEach(btn => {
      const size = btn.dataset.size;
      const variation = colorVariations.find(v => v.size === size);
      
      if (variation && variation.stock > 0) {
        btn.classList.remove('disabled');
        btn.disabled = false;
        btn.title = `${variation.stock} en stock`;
      } else {
        btn.classList.add('disabled');
        btn.disabled = true;
        btn.title = 'Rupture de stock';
      }
    });
    
  } catch (error) {
    console.error('Erreur chargement variations:', error);
  }
}

function selectSize(button) {
  if (button.disabled) return;
  
  // Désélectionner tous les autres
  document.querySelectorAll('.size-option').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  // Sélectionner celui-ci
  button.classList.add('selected');
  
  updateSelectedVariation();
}

function updateSelectedVariation() {
  const selectedColor = document.querySelector('.color-option.selected')?.dataset.color;
  const selectedSize = document.querySelector('.size-option.selected')?.dataset.size;

  if (!selectedColor || !selectedSize) {
    selectedVariation = null;
    document.getElementById('variationInfo').style.display = 'none';
    return;
  }

  // Chercher la variation complète
  selectedVariation = variations.find(v => 
    v.color === selectedColor && v.size === selectedSize
  );

  if (selectedVariation) {
    document.getElementById('variationInfo').style.display = 'block';
    document.getElementById('variationName').textContent = `${selectedColor} - ${selectedSize}`;
    document.getElementById('variationStock').textContent = selectedVariation.stock;
    
    // Mettre à jour la quantité max
    const quantityInput = document.getElementById('quantityInput');
    quantityInput.max = selectedVariation.stock;
    if (quantity > selectedVariation.stock) {
      quantity = 1;
      quantityInput.value = 1;
    }
  }
}

// ============================================
// QUANTITY CONTROLS
// ============================================

function increaseQuantity() {
  const input = document.getElementById('quantityInput');
  const max = selectedVariation ? selectedVariation.stock : product.stock;
  
  if (quantity < max) {
    quantity++;
    input.value = quantity;
  }
  updateQuantityDisplay()
}

function decreaseQuantity() {
  const input = document.getElementById('quantityInput');
  if (quantity > 1) {
    quantity--;
    input.value = quantity;
  }
  updateQuantityDisplay()
}

function updateQuantityDisplay() {
  const display = document.getElementById('quantityDisplay');
  if (display) {
    display.textContent = `Quantité: ${quantity}`;
  }
}


// ============================================
// ADD TO CART
// ============================================

function addToCart() {
  const quantity = parseInt(document.getElementById('quantityInput').value);

  if (!product) {
    Utils.showToast('Erreur: Produit non trouvé', 'error');
    return;
  }

  // Vérifier si des variations existent et sont sélectionnées
  const hasVariations = availableColors.length > 0 || availableSizes.length > 0;
  
  if (hasVariations && !selectedVariation) {
    Utils.showToast('Veuillez sélectionner une variante', 'warning');
    return;
  }

  // Vérifier le stock
  const maxStock = selectedVariation ? selectedVariation.stock : product.stock;
  if (quantity > maxStock) {
    Utils.showToast('Quantité supérieure au stock disponible', 'warning');
    return;
  }

  // Get or create cart
  let cart = Utils.Storage.getCart();
  if (!cart.token) {
    // Create new cart in API
    API.createCart().then(response => {
      cart.token = response.data.cart_token;
      Utils.Storage.setCart(cart);
      addItemToCart(quantity);
    }).catch(error => {
      console.error('Erreur création panier:', error);
      Utils.showToast('Erreur lors de la création du panier', 'error');
    });
  } else {
    addItemToCart(quantity);
  }
}

function addItemToCart(qty) {
  const cart = Utils.Storage.getCart();
  
  const cartItem = {
    product_id: product.id,
    product_name: product.name,
    price: product.base_price,
    quantity: qty,
    variation_id: selectedVariation?.id || null,
    variation_color: selectedVariation?.color || null,
    variation_size: selectedVariation?.size || null,
  };

  if (!cart.items) cart.items = [];
  cart.items.push(cartItem);
  
  // Recalculer le total
  cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  Utils.Storage.setCart(cart);
  updateCartCount();

  Utils.showToast(`${product.name} ajouté au panier!`, 'success');
  
  // Option: rediriger vers le panier après 1.5s
  setTimeout(() => {
    window.location.href = 'cart.html';
  }, 1500);
}

// ============================================
// IMAGE CHANGE
// ============================================

function changeMainImage(src, element) {
  document.getElementById('mainImage').src = src;
  
  // Mettre à jour la classe active des miniatures
  document.querySelectorAll('.thumbnail').forEach(thumb => {
    thumb.classList.remove('active');
  });
  element.classList.add('active');
}

// ============================================
// UTILITIES
// ============================================

function updateCartCount() {
  const cart = Utils.Storage.getCart();
  const count = cart.items ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  document.getElementById('cartCount').textContent = count;
}

// Update admin link
window.addEventListener('load', () => {
  const adminLink = document.getElementById('adminLink');
  if (Utils.Storage.isAdminLoggedIn()) {
    adminLink.href = 'admin/dashboard.html';
    adminLink.textContent = 'Admin Panel';
  }
});