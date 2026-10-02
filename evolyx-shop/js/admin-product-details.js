/**
 * @fileoverview Fiche produit en lecture seule (admin).
 * Ouverte au clic sur une ligne de la liste produits : détails du produit
 * et variations, chargées à l'ouverture.
 * Dépend de admin-products.js (allProducts, categories, editProduct).
 */

let detailProductId = null;
// Écarte la réponse d'une ouverture précédente si l'on clique vite sur un autre produit.
let detailRequestId = 0;

function isProductActive(product) {
  return product.is_active !== false && product.is_active !== 'false' && product.is_active !== 0;
}

function productDetailGalleryHtml(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  const onError = Utils.placeholderOnErrorHandler();
  const mainUrl = Utils.productImageUrl(product);

  const thumbs = images.length > 1
    ? `<div class="product-detail-thumbs">${images.map((img) => `
        <button type="button" class="product-detail-thumb" data-src="${Utils.escapeHtml(img.url)}"
                aria-label="Voir cette image">
          <img src="${Utils.escapeHtml(img.url)}" alt="" onerror="${onError}">
        </button>`).join('')}</div>`
    : '';

  return `
    <div class="product-detail-gallery">
      <img id="productDetailMainImage" class="product-detail-image${Utils.logoPlaceholderClass(mainUrl)}"
           src="${Utils.escapeHtml(mainUrl)}" alt="${Utils.escapeHtml(product.name)}" onerror="${onError}">
      ${thumbs}
    </div>
  `;
}

function productDetailInfoHtml(product) {
  const categoryName = categories.find((c) => c.id === product.category_id)?.name || '-';
  const active = isProductActive(product);
  const hasCost = product.cost_price !== undefined && product.cost_price !== null && product.cost_price !== '';
  const description = String(product.description || '').trim();

  return `
    <dl class="product-detail-facts">
      <div><dt>Catégorie</dt><dd>${Utils.escapeHtml(categoryName)}</dd></div>
      <div><dt>Prix de vente</dt><dd>${Utils.formatPrice(product.base_price)}</dd></div>
      ${hasCost ? `<div><dt>Prix d'achat</dt><dd>${Utils.formatPrice(product.cost_price)}</dd></div>` : ''}
      <div><dt>Stock</dt><dd>${Utils.escapeHtml(product.stock ?? 0)}</dd></div>
      <div><dt>Statut</dt><dd><span class="status-badge ${active ? 'is-on' : 'is-off'}">${active ? 'Actif' : 'Inactif'}</span></dd></div>
    </dl>
    <p class="product-detail-description">${description ? Utils.escapeHtml(description) : '<span class="text-gray">Aucune description.</span>'}</p>
  `;
}

function productDetailVariationsHtml(variations, product) {
  if (variations === null) {
    return '<p class="text-gray">Chargement des variations…</p>';
  }
  if (variations === false) {
    return '<p class="text-gray">Impossible de charger les variations.</p>';
  }
  if (variations.length === 0) {
    return '<p class="text-gray">Ce produit n\'a aucune variation.</p>';
  }

  const totalStock = variations.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  const rows = variations.map((v) => `
    <tr>
      <td>${Utils.escapeHtml(v.color || '-')}</td>
      <td>${Utils.escapeHtml(v.size || '-')}</td>
      <td>${Utils.escapeHtml(v.stock ?? 0)}</td>
      <td>${Utils.formatPrice(v.price ?? product.base_price)}</td>
    </tr>`).join('');

  return `
    <table class="admin-table product-detail-variations">
      <thead><tr><th>Couleur</th><th>Taille</th><th>Stock</th><th>Prix</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="2">Stock total des variations</td><td colspan="2">${totalStock}</td></tr></tfoot>
    </table>
  `;
}

function renderAdminProductDetail(product, variations) {
  const count = Array.isArray(variations) ? ` (${variations.length})` : '';
  document.getElementById('productDetailTitle').textContent = product.name;
  document.getElementById('productDetailBody').innerHTML = `
    <div class="product-detail-layout">
      ${productDetailGalleryHtml(product)}
      <div class="product-detail-main">${productDetailInfoHtml(product)}</div>
    </div>
    <h3 class="product-detail-subtitle">Variations${count}</h3>
    ${productDetailVariationsHtml(variations, product)}
  `;
}

async function openProductDetail(productId) {
  const product = allProducts.find((p) => Number(p.id) === Number(productId));
  if (!product) return;

  detailProductId = product.id;
  const requestId = ++detailRequestId;

  renderAdminProductDetail(product, null);
  document.getElementById('productDetailModal').classList.add('active');

  let variations;
  try {
    const response = await API.getAdminVariations({ product_id: product.id });
    variations = Array.isArray(response?.data) ? response.data : [];
  } catch (error) {
    console.error('❌ Failed to load product variations:', error);
    variations = false;
  }

  if (requestId !== detailRequestId) return;
  renderAdminProductDetail(product, variations);
}

function closeProductDetail() {
  detailRequestId++;
  detailProductId = null;
  document.getElementById('productDetailModal').classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.getElementById('productsTableBody');
  const modal = document.getElementById('productDetailModal');

  // La ligne entière ouvre la fiche, sauf ses contrôles (statut, modifier, supprimer).
  tbody?.addEventListener('click', (event) => {
    if (event.target.closest('.action-buttons, .status-switch')) return;
    const row = event.target.closest('tr[data-product-id]');
    if (row) openProductDetail(row.dataset.productId);
  });

  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeProductDetail();
    const thumb = event.target.closest('.product-detail-thumb');
    if (thumb) document.getElementById('productDetailMainImage').src = thumb.dataset.src;
  });

  document.getElementById('productDetailEditBtn')?.addEventListener('click', () => {
    const productId = detailProductId;
    closeProductDetail();
    if (productId) editProduct(productId);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal?.classList.contains('active')) closeProductDetail();
  });
});
