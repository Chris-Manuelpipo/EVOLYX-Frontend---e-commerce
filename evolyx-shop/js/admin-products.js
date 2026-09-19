/**
 * @fileoverview Admin Products Management
 * CRUD operations for products
 * @author EVOLYX Team
 */

let allProducts = [];
let categories = [];
let selectedProductId = null;
let selectedImages = [];
let selectedImageUrls = [];
let deletedVariationIds = [];
// ============================================
// PAGINATION VARIABLES
// ============================================

let currentPage = 1;
let itemsPerPage = 10;
let filteredProducts = []; // Pour stocker les produits après filtrage
let totalProducts = 0;
let totalPages = 1;
// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth();
  loadCategories();
  loadProducts();
  setupEventListeners();
});

// ============================================
// SETUP EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Search
  document.getElementById('searchInput').addEventListener('input', filterProducts);

  // Category filter
  document.getElementById('categoryFilter').addEventListener('change', filterProducts);

  // Image file input
  document.getElementById('productImages').addEventListener('change', handleImageSelect);
}

// ============================================
// LOAD DATA
// ============================================

async function loadCategories() {
  try {
    const response = await API.getCategories();
    categories = response.data || [];

    // Populate category selects
    const selects = [document.getElementById('productCategory'), document.getElementById('categoryFilter')];
    selects.forEach(select => {
      categories.forEach(cat => {
        if (!select.querySelector(`option[value="${cat.id}"]`)) {
          const option = document.createElement('option');
          option.value = cat.id;
          option.textContent = cat.name;
          select.appendChild(option);
        }
      });
    });
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

// ============================================
// LOAD PRODUCTS - VERSION CORRIGÉE
// ============================================
 
async function loadProducts() {
  try {
    await Utils.withListLoading('productsTableBody', async () => {
    //LIMITE POUR TOUT AFFICHER
    const response = await API.getAdminProducts({limit: 999});
    
    // ✅ Extraire les produits correctement
    let products = [];
    
    if (Array.isArray(response)) {
      products = response;
    } 
    else if (response?.data && Array.isArray(response.data)) {
      products = response.data;
    }
    else if (response?.data?.products && Array.isArray(response.data.products)) {
      products = response.data.products;
    }
    else if (response?.products && Array.isArray(response.products)) {
      products = response.products;
    }
    else {
      if (response?.data && typeof response.data === 'object') {
        products = [response.data];
      }
    }
    
    allProducts = products;
    filteredProducts = [...allProducts]; // Initialiser les produits filtrés
    currentPage = 1; // Reset à la page 1
    
    renderPaginatedProducts();
    updatePaginationControls();
    });
  } catch (error) {
    console.error('❌ Failed to load products:', error);
    Utils.showToast('Erreur lors du chargement des produits', 'error');
  }
}

// ============================================
// FILTER PRODUCTS
// ============================================

function filterProducts() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const categoryId = document.getElementById('categoryFilter').value;

  filteredProducts = allProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm);
    const matchesCategory = !categoryId || product.category_id == categoryId;
    return matchesSearch && matchesCategory;
  });

  currentPage = 1; // Revenir à la première page après filtrage
  renderPaginatedProducts();
  updatePaginationControls();
}

// ============================================
// RENDER PRODUCTS TABLE  
// ============================================

function renderProducts(products) {
  const tbody = document.getElementById('productsTableBody');
  Utils.DOM.empty(tbody);

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 30px;">
          Aucun produit trouvé
        </td>
      </tr>
    `;
    return;
  }

  products.forEach(product => {
    const row = document.createElement('tr');
    const categoryName = categories.find(c => c.id === product.category_id)?.name || '-';
    const isActive = product.is_active !== false && product.is_active !== 'false' && product.is_active !== 0;
    const statusToggle = `
      <label class="status-switch">
        <input type="checkbox"
               ${isActive ? 'checked' : ''}
               aria-label="${isActive ? 'Désactiver' : 'Activer'} ${Utils.escapeHtml(product.name)}"
               onchange="toggleProductActive(${product.id}, this)">
        <span class="status-switch-ui" aria-hidden="true"></span>
        <span class="status-switch-text">${isActive ? 'Actif' : 'Inactif'}</span>
      </label>
    `;
    
    const imageUrl = Utils.productImageUrl(product);
    const onError = Utils.placeholderOnErrorHandler();
    const imageHtml = `
      <img src="${Utils.escapeHtml(imageUrl)}" 
           alt="${Utils.escapeHtml(product.name)}" 
           class="admin-product-thumb${Utils.logoPlaceholderClass(imageUrl)}"
           style="width: 50px; height: 50px; border-radius: 4px;"
           onerror="${onError}"
      >
    `;

    row.innerHTML = `
      <td>${imageHtml}</td>
      <td>#${Utils.escapeHtml(product.id)}</td>
      <td>${Utils.escapeHtml(product.name)}</td>
      <td>${Utils.escapeHtml(categoryName)}</td>
      <td>${Utils.formatPrice(product.base_price)}</td>
      <td>${Utils.escapeHtml(product.stock)}</td>
      <td>${statusToggle}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-primary" onclick="editProduct(${Number(product.id) || 0})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm" style="background: #EF4444; color: white;" onclick="deleteProduct(${Number(product.id) || 0}, this)">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}
// ============================================
// MODAL FUNCTIONS
// ============================================

function openProductModal() {
  selectedProductId = null;
  clearSelectedImages();
  deletedVariationIds = [];
  document.getElementById('modalTitle').textContent = 'Nouveau Produit';
  document.getElementById('productForm').reset();
  document.getElementById('imagePreview').innerHTML = '';
  document.getElementById('productModal').classList.add('active');
  document.getElementById('productCostPrice').value = '';
  updateImagesLabel();
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
  selectedProductId = null;
  clearSelectedImages();
  deletedVariationIds = [];
}

// ============================================
// EDIT PRODUCT
// ============================================

async function editProduct(productId) {
  try {
    // Charger le produit
    const productResponse = await API.getAdminProduct(productId);
    const product = productResponse.data;

    // Charger les variations du produit
    const variationsResponse = await API.getVariations({ product_id: productId });
    const variations = variationsResponse.data || [];

    selectedProductId = productId;
    clearSelectedImages();
    deletedVariationIds = [];
    document.getElementById('modalTitle').textContent = 'Éditer Produit';

    // Remplir le formulaire
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category_id;
    document.getElementById('productPrice').value = product.base_price;
    document.getElementById('productCostPrice').value = product.cost_price || '';
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productFeatured').checked = product.is_featured;
    document.getElementById('productActive').checked = product.is_active;

    // Afficher les variations existantes
    const container = document.getElementById('variationsContainer');
    Utils.DOM.empty(container);
    variationCount = 0;
    
    variations.forEach(v => addVariationField(v));

    // Afficher les images existantes
    const preview = document.getElementById('imagePreview');
    Utils.DOM.empty(preview);
    if (product.images && product.images.length > 0) {
      product.images.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = 'file-preview-item';
        div.innerHTML = `
          <img src="${Utils.escapeHtml(img.url)}" alt="product">
          <button type="button" class="file-preview-remove" onclick="removeExistingImage(${Number(img.id) || 0})">✕</button>
        `;
        preview.appendChild(div);
      });
    }

    document.getElementById('productModal').classList.add('active');
  } catch (error) {
    console.error('Failed to edit product:', error);
    Utils.showToast('Erreur lors de la récupération du produit', 'error');
  }
}

async function toggleProductActive(productId, input) {
  const nextActive = Boolean(input?.checked);
  const previous = !nextActive;
  if (input) input.disabled = true;

  try {
    await API.updateProduct(productId, { is_active: nextActive });

    const sync = (list) => {
      const item = list.find((p) => Number(p.id) === Number(productId));
      if (item) item.is_active = nextActive;
    };
    sync(allProducts);
    sync(filteredProducts);

    const label = input?.closest('.status-switch')?.querySelector('.status-switch-text');
    if (label) label.textContent = nextActive ? 'Actif' : 'Inactif';
    if (input) {
      input.setAttribute(
        'aria-label',
        `${nextActive ? 'Désactiver' : 'Activer'} le produit`
      );
    }
    Utils.showToast(nextActive ? 'Produit activé' : 'Produit désactivé', 'success');
  } catch (error) {
    if (input) input.checked = previous;
    console.error('Failed to toggle product status:', error);
    Utils.showToast(error.message || 'Impossible de modifier le statut', 'error');
  } finally {
    if (input) input.disabled = false;
  }
}

window.toggleProductActive = toggleProductActive;

// ============================================
// SAVE PRODUCT
// ============================================

async function saveProduct(event) {
  event.preventDefault();

  const categoryRaw = document.getElementById('productCategory').value;
  const productData = {
    name: document.getElementById('productName').value.trim(),
    category_id: categoryRaw ? parseInt(categoryRaw, 10) : null,
    base_price: parseFloat(document.getElementById('productPrice').value),
    cost_price: parseFloat(document.getElementById('productCostPrice').value) || 0,
    stock: parseInt(document.getElementById('productStock').value, 10) || 0,
    description: document.getElementById('productDescription').value,
    is_featured: document.getElementById('productFeatured').checked,
    is_active: document.getElementById('productActive').checked,
  };

  if (!productData.name) {
    Utils.showToast('Indiquez un nom de produit', 'warning');
    return;
  }
  if (!productData.category_id) {
    Utils.showToast('Choisissez une catégorie', 'warning');
    return;
  }
  if (!(productData.base_price > 0)) {
    Utils.showToast('Indiquez un prix valide', 'warning');
    return;
  }

  // ✅ Récupérer les variations
  const variationRows = document.querySelectorAll('.variation-row');
  const variations = [];
  
  variationRows.forEach(row => {
    const color = row.querySelector('.variation-color-input')?.value;
    const size = row.querySelector('.variation-size-input')?.value;
    const stock = parseInt(row.querySelector('.variation-stock-input')?.value) || 0;
    
    if (color || size) {
      variations.push({
        id: row.dataset.variationId || null,
        color: color || null,
        size: size || null,
        stock: stock
      });
    }
  });

  try {
    const wasUpdate = Boolean(selectedProductId);
    await Utils.withBusy(event, async () => {
      const files = selectedImages.slice();
      let product;
      if (wasUpdate) {
        const response = await API.updateProduct(selectedProductId, productData, files);
        product = response.data || response;
      } else {
        const response = await API.createProduct(productData, files);
        product = response.data || response;
      }

      const productId = product?.id || selectedProductId;

      for (const id of deletedVariationIds) {
        try {
          await API.deleteVariation(id);
        } catch (err) {
          /* variation deletion failed — non-critical */
        }
      }
      deletedVariationIds = [];

      if (productId) {
        for (const variation of variations) {
          const payload = {
            product_id: productId,
            color: variation.color,
            size: variation.size,
            stock: variation.stock,
          };
          if (variation.id) {
            await API.updateVariation(variation.id, payload);
          } else {
            await API.createVariation(payload);
          }
        }
      }
    });

    Utils.showToast(wasUpdate ? 'Produit mis à jour' : 'Produit créé', 'success');
    closeProductModal();
    await loadProducts();
  } catch (error) {
    console.error('Failed to save product:', error);
    Utils.showToast(error.message || 'Erreur lors de l\'enregistrement', error.partial ? 'warning' : 'error');
    if (error.partial) {
      closeProductModal();
      loadProducts();
    }
  }
}

// ============================================
// DELETE PRODUCT
// ============================================

async function deleteProduct(productId, trigger) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) {
    return;
  }

  try {
    await Utils.withBusy(trigger, async () => {
      await API.deleteProduct(productId);
      Utils.showToast('Produit supprimé', 'success');
      await loadProducts();
    });
  } catch (error) {
    console.error('Failed to delete product:', error);
    Utils.showToast(error.message || 'Erreur lors de la suppression', 'error');
  }
}

// ============================================
// IMAGE HANDLING
// ============================================

function updateImagesLabel() {
  const label = document.getElementById('productImagesLabel');
  const hint = document.getElementById('productImagesHint');
  const n = selectedImages.length;
  if (label) {
    label.textContent = n
      ? `📸 Ajouter une autre image (${n} sélectionnée${n > 1 ? 's' : ''})`
      : '📸 Ajouter une image';
  }
  if (hint) {
    hint.textContent = n
      ? `${n} image${n > 1 ? 's' : ''} prête${n > 1 ? 's' : ''} — rouvrez le sélecteur pour en ajouter.`
      : 'Ajoutez les images une par une : rouvrez le sélecteur pour chaque photo. Elles s’accumulent ci-dessous.';
  }
}

function fileKey(file) {
  return `${file.name}|${file.size}|${file.lastModified || 0}`;
}

function clearSelectedImages() {
  selectedImageUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch (_) {
      /* ignore */
    }
  });
  selectedImages = [];
  selectedImageUrls = [];
}

function appendSelectedImagePreview(file, index) {
  const preview = document.getElementById('imagePreview');
  if (!preview) return;

  const url = URL.createObjectURL(file);
  selectedImageUrls[index] = url;

  const div = document.createElement('div');
  div.className = 'file-preview-item';
  div.dataset.selectedIndex = String(index);
  div.innerHTML = `
    <img src="${url}" alt="preview">
    <button type="button" class="file-preview-remove" onclick="removeImage(${index})" aria-label="Retirer l'image">✕</button>
  `;
  preview.appendChild(div);
}

function reindexSelectedImagePreviews() {
  const preview = document.getElementById('imagePreview');
  if (!preview) return;
  preview.querySelectorAll('[data-selected-index]').forEach((el, index) => {
    el.dataset.selectedIndex = String(index);
    const btn = el.querySelector('.file-preview-remove');
    if (btn) btn.setAttribute('onclick', `removeImage(${index})`);
  });
}

function handleImageSelect(event) {
  const incoming = Array.from(event.target.files || []);
  if (!incoming.length) return;

  const seen = new Set(selectedImages.map(fileKey));
  let added = 0;
  incoming.forEach((file) => {
    if (!file.type || !file.type.startsWith('image/')) {
      Utils.showToast(`Fichier ignoré (pas une image) : ${file.name}`, 'warning');
      return;
    }
    const key = fileKey(file);
    if (seen.has(key)) return;
    seen.add(key);
    selectedImages.push(file);
    appendSelectedImagePreview(file, selectedImages.length - 1);
    added += 1;
  });

  event.target.value = '';
  updateImagesLabel();
  if (added) {
    Utils.showToast(
      added === 1 ? 'Image ajoutée' : `${added} images ajoutées`,
      'success'
    );
  }
}

function removeImage(index) {
  const url = selectedImageUrls[index];
  if (url) {
    try {
      URL.revokeObjectURL(url);
    } catch (_) {
      /* ignore */
    }
  }
  selectedImages.splice(index, 1);
  selectedImageUrls.splice(index, 1);

  const preview = document.getElementById('imagePreview');
  preview?.querySelector(`[data-selected-index="${index}"]`)?.remove();
  reindexSelectedImagePreviews();

  const input = document.getElementById('productImages');
  if (input) input.value = '';
  updateImagesLabel();
}

function removeExistingImage(imageId) {
  // TODO: Implement remove existing image
}

// ============================================
// UTILITIES
// ============================================

function resetFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('categoryFilter').value = '';
  filteredProducts = [...allProducts];
  currentPage = 1;
  renderPaginatedProducts();
  updatePaginationControls();
}

function logout() {
  Auth.logout();
}


// ============================================
// VARIATIONS MANAGEMENT
// ============================================

let variationCount = 0;
let currentColorInput = null;

function addVariationField(variation = null) {
  const container = document.getElementById('variationsContainer');
  const index = variationCount++;
  
  const div = document.createElement('div');
  div.className = 'variation-row';
  div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center; background: var(--surface-container); padding: 10px; border-radius: 8px;';
  div.dataset.index = index;
  if (variation?.id) div.dataset.variationId = variation.id;
  
  div.innerHTML = `
    <div style="position: relative; flex: 2;">
      <input type="text" 
        placeholder="Couleur" 
        value="${Utils.escapeHtml(variation?.color || '')}" 
        class="variation-color-input" 
        readonly
        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; background: white;"
        onclick="openColorPalette(this)">
      <input type="hidden" class="variation-color-value" value="${Utils.escapeHtml(variation?.color || '')}">
    </div>
    <input type="text" 
      placeholder="Taille" 
      value="${Utils.escapeHtml(variation?.size || '')}" 
      class="variation-size-input"
      style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    <input type="number" 
      placeholder="Stock" 
      value="${Utils.escapeHtml(variation?.stock ?? 0)}" 
      min="0" 
      class="variation-stock-input"
      style="width: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    <button type="button" onclick="removeVariationField(this)" aria-label="Supprimer la variation" style="background: none; border: none; color: var(--danger); font-size: 18px; cursor: pointer;"><i class="fas fa-trash-alt"></i></button>
  `;
  
  container.appendChild(div);
}

function removeVariationField(btn) {
  if (!confirm('Supprimer cette variation ?')) return;
  const row = btn.closest('.variation-row');
  if (row?.dataset.variationId) {
    deletedVariationIds.push(row.dataset.variationId);
  }
  row.remove();
}

function openColorPalette(input) {
  currentColorInput = input;
  const palette = document.getElementById('colorPalette');
  const rect = input.getBoundingClientRect();
  
  palette.style.display = 'block';
  palette.style.position = 'absolute';
  palette.style.top = (rect.bottom + window.scrollY) + 'px';
  palette.style.left = rect.left + 'px';
  palette.style.zIndex = '1000';
}

function selectColor(colorName, colorHex) {
  if (currentColorInput) {
    currentColorInput.value = colorName;
    currentColorInput.nextElementSibling.value = colorHex;
  }
  document.getElementById('colorPalette').style.display = 'none';
}

// Fermer la palette en cliquant ailleurs
document.addEventListener('click', function(e) {
  if (!e.target.classList.contains('color-option') && !e.target.classList.contains('variation-color-input')) {
    document.getElementById('colorPalette').style.display = 'none';
  }
});
 
// ============================================
// PAGINATION FUNCTIONS
// ============================================

function renderPaginatedProducts() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  
  renderProducts(paginatedProducts);
  updatePaginationInfo();
}

function updatePaginationInfo() {
  const start = ((currentPage - 1) * itemsPerPage) + 1;
  const end = Math.min(currentPage * itemsPerPage, filteredProducts.length);
  const total = filteredProducts.length;
  const infoEl = document.getElementById('paginationInfo');
  const pageEl = document.getElementById('currentPageDisplay');

  if (infoEl) {
    infoEl.textContent = total > 0
      ? `Affichage ${start}-${end} de ${total} produits`
      : 'Aucun produit';
  }
  if (pageEl) pageEl.textContent = `Page ${currentPage}`;

  updatePaginationButtons();
}

function updatePaginationButtons() {
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  if (!prevBtn || !nextBtn) return;

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage * itemsPerPage >= filteredProducts.length;
}

function changePage(direction) {
  if (direction === 'prev' && currentPage > 1) {
    currentPage--;
  } else if (direction === 'next' && (currentPage * itemsPerPage) < filteredProducts.length) {
    currentPage++;
  } else {
    return;
  }
  
  renderPaginatedProducts();
  updatePaginationControls();
  
  // Optionnel: scroll en haut du tableau
  document.querySelector('.admin-content').scrollIntoView({ behavior: 'smooth' });
}

// Alias pour updatePaginationInfo + updatePaginationButtons
function updatePaginationControls() {
  updatePaginationInfo();
  updatePaginationButtons();
}

function changeItemsPerPage() {
  itemsPerPage = parseInt(document.getElementById('itemsPerPage').value);
  currentPage = 1;
  renderPaginatedProducts();
  updatePaginationControls();
}