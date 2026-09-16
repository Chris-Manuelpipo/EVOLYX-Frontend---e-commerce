/**
 * Fiche produit : variations, panier, images.
 */

let product = null;
let variations = [];
let selectedVariation = null;
let quantity = 1;
let availableColors = [];
let availableSizes = [];

document.addEventListener('DOMContentLoaded', () => {
  const productId = getProductId();
  if (!productId) {
    window.location.href = 'index.html';
    return;
  }
  loadProduct(productId);
  if (window.Utils) {
    Utils.updateCartBadge();
    Utils.updateWishlistBadge();
  }
});

function getProductId() {
  return new URLSearchParams(window.location.search).get('id');
}

function hasColors() {
  return availableColors.length > 0;
}

function hasSizes() {
  return availableSizes.length > 0;
}

async function loadProduct(productId) {
  const container = document.getElementById('productDetail');
  try {
    Utils.showLoading(container, true);

    const response = await API.getProduct(productId);
    product = response.data || response;
    if (!product) throw new Error('Produit introuvable');

    try {
      const colorsResponse = await API.getProductColors(productId);
      availableColors = Utils.unwrapList(colorsResponse);
    } catch (e) {
      availableColors = [];
    }

    try {
      const sizesResponse = await API.getProductSizes(productId);
      availableSizes = Utils.unwrapList(sizesResponse);
    } catch (e) {
      availableSizes = [];
    }

    try {
      const variationsResponse = await API.getVariations({ product_id: productId });
      variations = Utils.unwrapList(variationsResponse);
    } catch (e) {
      variations = [];
    }

    renderProductDetail();
    updateProductSeo();
    loadReviews();
    loadRelated();
    Utils.showLoading(container, false);
  } catch (error) {
    console.error('Failed to load product:', error);
    Utils.showToast('Erreur lors du chargement du produit', 'error');
    container.innerHTML = `
      <div class="catalog-state catalog-state-error">
        <p>Ce produit est introuvable ou n’est plus en ligne.</p>
        <a href="catalog.html" class="btn btn-primary">Retour au catalogue</a>
      </div>
    `;
  }
}

function galleryImageUrls() {
  const list = Array.isArray(product.images) ? product.images : [];
  return list
    .map((img) => {
      if (!img) return '';
      if (typeof img === 'string') return img;
      return img.url || img.image_url || img.src || '';
    })
    .filter(Boolean);
}

function renderProductDetail() {
  const container = document.getElementById('productDetail');
  Utils.DOM.empty(container);

  const onError = Utils.placeholderOnErrorHandler();
  const mainSrc = Utils.productImageUrl(product);
  const mainClass = Utils.logoPlaceholderClass(mainSrc);
  const catLabel = Utils.categoryName(product.category);
  const thumbs = galleryImageUrls();
  const descText = String(product.description || '').trim();
  const variationsBlock = hasColors() || hasSizes();
  const inStock = product.stock > 0;

  const activeThumb = Math.max(0, thumbs.findIndex((url) => url === mainSrc));
  const thumbsHtml =
    thumbs.length > 1
      ? `<div class="thumbnail-images">
            ${thumbs
              .map((url, index) => `
              <img src="${Utils.escapeHtml(url)}" alt=""
                   class="thumbnail${index === activeThumb ? ' active' : ''}${Utils.logoPlaceholderClass(url)}"
                   onerror="${onError}"
                   onclick="changeMainImage(this)">`)
              .join('')}
          </div>`
      : '';

  const html = `
    <div class="product-detail-wrapper">
      <div class="product-detail-grid">
        <div class="product-gallery">
          <figure class="product-gallery-stage">
            <img id="mainImage" src="${Utils.escapeHtml(mainSrc)}" alt="${Utils.escapeHtml(product.name)}"
                 class="${mainClass.trim()}"
                 onerror="${onError}">
          </figure>
          ${thumbsHtml}
        </div>

        <div class="product-details-info">
          <nav class="breadcrumb" aria-label="Fil d’Ariane">
            <a href="index.html">Accueil</a>
            <span aria-hidden="true">/</span>
            <a href="catalog.html">Catalogue</a>
            <span aria-hidden="true">/</span>
            <span>${Utils.escapeHtml(product.name)}</span>
          </nav>

          <h1 class="product-detail-title">${Utils.escapeHtml(product.name)}</h1>

          <div class="product-detail-status">
            <span class="product-detail-cat">${Utils.escapeHtml(catLabel)}</span>
            <span class="stock ${inStock ? 'in-stock' : 'out-stock'}">
              ${inStock ? `${product.stock} en stock` : 'Rupture de stock'}
            </span>
          </div>

          <p class="product-detail-price">${Utils.formatPrice(product.base_price)}</p>

          ${
            descText
              ? `<p class="product-detail-kicker">Description</p>
          <p class="product-detail-desc">${Utils.escapeHtml(descText)}</p>`
              : ''
          }

          ${
            variationsBlock
              ? `
            <div class="variations-section">
              ${
                hasColors()
                  ? `
                <div class="variation-group">
                  <span class="variation-label">Couleur</span>
                  <div class="variation-options" id="colorsContainer">${renderColorOptions()}</div>
                </div>`
                  : ''
              }
              ${
                hasSizes()
                  ? `
                <div class="variation-group">
                  <span class="variation-label">Taille</span>
                  <div class="variation-options" id="sizesContainer">${renderSizeOptions()}</div>
                </div>`
                  : ''
              }
              <div id="variationInfo" class="variation-info" hidden>
                <p class="text-sm">
                  Variante : <span id="variationName"></span>
                  · stock : <span id="variationStock"></span>
                </p>
              </div>
            </div>`
              : ''
          }

          <div class="purchase-section">
            <div class="quantity-selector" role="group" aria-label="Quantité">
              <div class="quantity-input">
                <button type="button" onclick="decreaseQuantity()" aria-label="Diminuer">−</button>
                <input type="text" inputmode="numeric" id="quantityInput" value="1" readonly aria-live="polite" aria-label="Quantité">
                <button type="button" onclick="increaseQuantity()" aria-label="Augmenter">+</button>
              </div>
            </div>
            <button type="button" class="btn btn-primary ${inStock ? '' : 'disabled'}"
                    id="addToCartBtn" onclick="addToCart()" ${inStock ? '' : 'disabled'}>
              ${inStock ? 'Ajouter au panier' : 'Rupture de stock'}
            </button>
            ${window.Wishlist ? Wishlist.heartButton(product.id) : ''}
          </div>

          <p class="product-meta">
            <span>Réf. ${Utils.escapeHtml(product.id)}</span>
            <span>${Utils.formatDate(product.updated_at || product.created_at)}</span>
          </p>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  if (window.Wishlist) Wishlist.bind(container);
}

function setMeta(selector, attr, value) {
  const el = document.querySelector(selector);
  if (el && value) el.setAttribute(attr, value);
}

function updateProductSeo() {
  if (!product) return;
  const title = `${product.name} : EVOLYX Shop`;
  const description = Utils.truncateText(product.description || `Achetez ${product.name} chez EVOLYX Shop à Yaoundé.`, 160);
  const url = `https://shop.evolyx.cm/product.html?id=${product.id}`;
  const image = Utils.productImageUrl(product);
  document.title = title;
  setMeta('meta[name="description"]', 'content', description);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:url"]', 'content', url);
  setMeta('meta[property="og:image"]', 'content', image);
  setMeta('link[rel="canonical"]', 'href', url);
}

async function loadRelated() {
  const section = document.getElementById('relatedSection');
  if (!section || !product) return;
  try {
    const response = await API.getRelatedProducts(product.id);
    const related = Utils.unwrapList(response).filter((item) => String(item.id) !== String(product.id));
    if (!related.length) {
      section.hidden = true;
      return;
    }
    const onError = Utils.placeholderOnErrorHandler();
    section.hidden = false;
    section.innerHTML = `
      <h2 class="product-extras-title">Vous aimerez aussi</h2>
      <div class="products-grid" id="relatedGrid">
        ${related
          .map((item) => {
            const image = Utils.productImageUrl(item);
            const heart = window.Wishlist ? Wishlist.heartButton(item.id) : '';
            return `
              <article class="product-card card">
                ${heart}
                <a href="product.html?id=${item.id}" class="product-card-link">
                  <div class="product-image">
                    <img src="${Utils.escapeHtml(image)}" alt="${Utils.escapeHtml(item.name || '')}"
                         class="${Utils.logoPlaceholderClass(image).trim()}"
                         loading="lazy" onerror="${onError}">
                  </div>
                  <div class="product-info">
                    <h3 class="product-name">${Utils.escapeHtml(Utils.truncateText(item.name, 40))}</h3>
                    <div class="product-footer">
                      <span class="product-price">${Utils.formatPrice(item.base_price)}</span>
                    </div>
                  </div>
                </a>
              </article>`;
          })
          .join('')}
      </div>`;
    if (window.Wishlist) Wishlist.bind(section);
  } catch (error) {
    section.hidden = false;
    section.innerHTML = `
      <h2 class="product-extras-title">Vous aimerez aussi</h2>
      <div class="catalog-state catalog-state-error">
        <p>Impossible de charger les produits similaires.</p>
      </div>`;
  }
}

async function loadReviews() {
  const section = document.getElementById('reviewsSection');
  if (!section || !product) return;
  section.hidden = false;

  let reviews = [];
  let average = null;
  let unavailable = false;
  try {
    const response = await API.getReviews(product.id);
    const data = Utils.unwrapData(response) || {};
    reviews = Utils.unwrapList(response);
    average = data.average || data.avg_rating || data.rating;
    if (average == null && reviews.length) {
      const sum = reviews.reduce((total, review) => total + (Number(review.rating) || 0), 0);
      average = sum / reviews.length;
    }
  } catch (error) {
    unavailable = Utils.isApiUnavailable(error);
    if (!unavailable) {
      section.innerHTML = `
        <h2 class="product-extras-title">Avis</h2>
        <div class="catalog-state catalog-state-error">
          <p>Impossible de charger les avis. ${Utils.escapeHtml(error.message || '')}</p>
          <button type="button" class="btn btn-secondary" onclick="loadReviews()">Réessayer</button>
        </div>`;
      return;
    }
  }

  const listHtml = reviews.length
    ? reviews
        .map((review) => {
          const name = review.name || review.author_name || 'Client';
          const rating = Number(review.rating) || 0;
          const comment = review.comment || review.body || '';
          const date = review.created_at ? Utils.formatDate(review.created_at) : '';
          return `
            <article class="review-card">
              <p class="review-meta">
                <strong>${Utils.escapeHtml(name)}</strong>
                <span class="review-stars" aria-label="${rating} sur 5">${'★'.repeat(rating)}${'☆'.repeat(Math.max(0, 5 - rating))}</span>
                ${date ? `<span class="text-gray text-sm">${date}</span>` : ''}
              </p>
              <p>${Utils.escapeHtml(comment)}</p>
            </article>`;
        })
        .join('')
    : `<p class="text-gray">${unavailable ? 'Les avis n’ont pas pu être chargés.' : 'Aucun avis pour ce produit. Soyez le premier.'}</p>`;

  section.innerHTML = `
    <h2 class="product-extras-title">Avis${average ? ` ${Number(average).toFixed(1)}/5` : ''}</h2>
    <div class="reviews-list">${listHtml}</div>
    <form class="review-form card" id="reviewForm">
      <h3>Laisser un avis</h3>
      <div class="form-group">
        <label for="reviewName">Nom</label>
        <input type="text" id="reviewName" name="name" autocomplete="name" required maxlength="80">
      </div>
      <div class="form-group">
        <label for="reviewRating">Note</label>
        <select id="reviewRating" name="rating" required>
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Bien</option>
          <option value="3">3 - Correct</option>
          <option value="2">2 - Décevant</option>
          <option value="1">1 - Mauvais</option>
        </select>
      </div>
      <div class="form-group">
        <label for="reviewComment">Commentaire</label>
        <textarea id="reviewComment" name="comment" rows="3" required maxlength="800"></textarea>
      </div>
      <p class="text-sm text-gray" id="reviewHint"></p>
      <button type="submit" class="btn btn-primary">Publier</button>
    </form>`;

  document.getElementById('reviewForm').addEventListener('submit', submitReview);
}

async function submitReview(event) {
  event.preventDefault();
  const hint = document.getElementById('reviewHint');
  const payload = {
    author_name: document.getElementById('reviewName').value.trim(),
    rating: Number(document.getElementById('reviewRating').value),
    comment: document.getElementById('reviewComment').value.trim(),
  };
  if (!payload.author_name || !payload.comment) {
    Utils.showToast('Remplissez nom et commentaire', 'warning');
    return;
  }
  try {
    await API.postReview(product.id, payload);
    Utils.showToast('Avis envoyé', 'success');
    event.target.reset();
    loadReviews();
  } catch (error) {
    const message = error.message || 'Impossible d’envoyer l’avis';
    if (hint) hint.textContent = message;
    Utils.showToast(message, 'error');
  }
}

function renderColorOptions() {
  return availableColors
    .map(
      (color) => `
    <button type="button" class="color-option"
            data-color="${Utils.escapeHtml(color.color)}"
            style="background-color: ${getColorCode(color.color)};"
            title="${Utils.escapeHtml(color.color)} (${color.total_stock} en stock)"
            onclick="selectColor(this)"
            aria-label="${Utils.escapeHtml(color.color)}">
    </button>`
    )
    .join('');
}

function renderSizeOptions() {
  const lockUntilColor = hasColors();
  return availableSizes
    .map((size) => {
      const inStock = (size.total_stock || 0) > 0;
      const disabled = lockUntilColor || !inStock;
      return `
        <button type="button" class="size-option${disabled ? ' disabled' : ''}"
                data-size="${Utils.escapeHtml(size.size)}"
                data-stock="${size.total_stock || 0}"
                onclick="selectSize(this)"
                ${disabled ? 'disabled' : ''}>
          ${Utils.escapeHtml(size.size)}
        </button>`;
    })
    .join('');
}

function getColorCode(color) {
  const colorMap = {
    Or: '#D4AF37',
    'Or Rose': '#B76E79',
    Argent: '#C0C0C0',
    Noir: '#000000',
    Blanc: '#FFFFFF',
    Rouge: '#FF0000',
    Bleu: '#0000FF',
    Vert: '#00FF00',
    Jaune: '#FFFF00',
    Violet: '#800080',
    Rose: '#FFC0CB',
    Marron: '#8B4513',
  };
  return colorMap[color] || '#CCCCCC';
}

async function selectColor(button) {
  document.querySelectorAll('.color-option').forEach((btn) => btn.classList.remove('selected'));
  button.classList.add('selected');
  document.querySelectorAll('.size-option').forEach((btn) => btn.classList.remove('selected'));
  selectedVariation = null;
  const info = document.getElementById('variationInfo');
  if (info) info.hidden = true;

  if (hasSizes()) {
    await enableSizesForColor(button.dataset.color);
  } else {
    updateSelectedVariation();
  }
}

async function enableSizesForColor(color) {
  const productId = getProductId();
  try {
    const response = await API.getVariations({ product_id: productId });
    const allVariations = Utils.unwrapList(response);
    const colorVariations = allVariations.filter((v) => v.color === color);

    document.querySelectorAll('.size-option').forEach((btn) => {
      const size = btn.dataset.size;
      const variation = colorVariations.find((v) => v.size === size);
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
  document.querySelectorAll('.size-option').forEach((btn) => btn.classList.remove('selected'));
  button.classList.add('selected');
  updateSelectedVariation();
}

function updateSelectedVariation() {
  const selectedColor = document.querySelector('.color-option.selected')?.dataset.color;
  const selectedSize = document.querySelector('.size-option.selected')?.dataset.size;
  const info = document.getElementById('variationInfo');

  if (hasColors() && hasSizes()) {
    if (!selectedColor || !selectedSize) {
      selectedVariation = null;
      if (info) info.hidden = true;
      return;
    }
    selectedVariation = variations.find((v) => v.color === selectedColor && v.size === selectedSize);
  } else if (hasColors() && !hasSizes()) {
    if (!selectedColor) {
      selectedVariation = null;
      if (info) info.hidden = true;
      return;
    }
    selectedVariation = variations.find((v) => v.color === selectedColor) || null;
  } else if (hasSizes() && !hasColors()) {
    if (!selectedSize) {
      selectedVariation = null;
      if (info) info.hidden = true;
      return;
    }
    selectedVariation = variations.find((v) => v.size === selectedSize) || null;
  } else {
    selectedVariation = null;
    if (info) info.hidden = true;
    return;
  }

  if (selectedVariation && info) {
    info.hidden = false;
    const nameEl = document.getElementById('variationName');
    const stockEl = document.getElementById('variationStock');
    const parts = [selectedVariation.color, selectedVariation.size].filter(Boolean);
    if (nameEl) nameEl.textContent = parts.join(' · ');
    if (stockEl) stockEl.textContent = selectedVariation.stock;
    const quantityInput = document.getElementById('quantityInput');
    if (quantityInput) {
      quantityInput.max = selectedVariation.stock;
      if (quantity > selectedVariation.stock) {
        quantity = 1;
        quantityInput.value = 1;
      }
    }
  }
}

function increaseQuantity() {
  const input = document.getElementById('quantityInput');
  const max = selectedVariation ? selectedVariation.stock : product.stock;
  if (quantity < max) {
    quantity += 1;
    input.value = quantity;
  }
}

function decreaseQuantity() {
  const input = document.getElementById('quantityInput');
  if (quantity > 1) {
    quantity -= 1;
    input.value = quantity;
  }
}

async function addToCart() {
  const qty = parseInt(document.getElementById('quantityInput').value, 10) || 1;

  if (!product) {
    Utils.showToast('Erreur : produit non trouvé', 'error');
    return;
  }

  if (hasColors() && hasSizes() && !selectedVariation) {
    Utils.showToast('Choisissez une couleur et une taille', 'warning');
    return;
  }
  if (hasColors() && !hasSizes() && !selectedVariation) {
    Utils.showToast('Choisissez une couleur', 'warning');
    return;
  }
  if (hasSizes() && !hasColors() && !selectedVariation) {
    Utils.showToast('Choisissez une taille', 'warning');
    return;
  }

  const maxStock = selectedVariation ? selectedVariation.stock : product.stock;
  if (qty > maxStock) {
    Utils.showToast('Quantité supérieure au stock disponible', 'warning');
    return;
  }

  let cart = Utils.Storage.getCart();
  if (!cart.token) {
    try {
      const response = await API.createCart();
      cart.token = response.data?.cart_token || response.data?.token || response.cart_token || null;
      Utils.Storage.setCart(cart);
    } catch (error) {
      console.warn('Panier API indisponible, conservation locale:', error);
    }
  }

  addItemToCart(qty);

  cart = Utils.Storage.getCart();
  if (cart.token) {
    try {
      await API.addToCart(cart.token, {
        product_id: product.id,
        variation_id: selectedVariation?.id ?? null,
        quantity: qty,
      });
    } catch (error) {
      console.warn('Ajout panier serveur reporté au merge:', error);
    }
  }
}

function addItemToCart(qty) {
  const cart = Utils.Storage.getCart();
  const imageUrl = Utils.productImageUrl(product);
  const cartItem = {
    product_id: product.id,
    product_name: product.name,
    price: product.base_price,
    quantity: qty,
    image: imageUrl,
    image_url: imageUrl,
    variation_id: selectedVariation?.id || null,
    variation_color: selectedVariation?.color || null,
    variation_size: selectedVariation?.size || null,
  };

  if (!cart.items) cart.items = [];

  const existing = cart.items.find(
    (item) =>
      String(item.product_id) === String(cartItem.product_id) &&
      String(item.variation_id || '') === String(cartItem.variation_id || '')
  );

  if (existing) {
    existing.quantity += qty;
    existing.image = imageUrl;
    existing.image_url = imageUrl;
  } else {
    cart.items.push(cartItem);
  }

  cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  Utils.Storage.setCart(cart);
  Utils.updateCartBadge();
  Utils.showToast(`${product.name} ajouté au panier`, 'success', 4000, {
    href: 'cart.html',
    label: 'Voir le panier',
  });
}

function changeMainImage(element) {
  const src = typeof element === 'string' ? element : element.src;
  const main = document.getElementById('mainImage');
  if (main) {
    main.src = src;
    main.classList.toggle('is-logo-placeholder', Utils.isPlaceholderImage(src));
  }
  document.querySelectorAll('.thumbnail').forEach((thumb) => thumb.classList.remove('active'));
  if (element && element.classList) element.classList.add('active');
}

function updateCartCount() {
  if (window.Utils) Utils.updateCartBadge();
}

window.changeMainImage = changeMainImage;
window.selectColor = selectColor;
window.selectSize = selectSize;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.addToCart = addToCart;
window.updateCartCount = updateCartCount;
window.loadReviews = loadReviews;
