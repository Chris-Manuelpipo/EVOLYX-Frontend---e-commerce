/**
 * @fileoverview Admin Products Management
 * CRUD operations for products
 * @author EVOLYX Team
 */

let allProducts = [];
let categories = [];
let selectedProductId = null;
let selectedImages = [];
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
    console.log('📦 Chargement des produits...');
    
    //LIMITE POUR TOUT AFFICHER
    const response = await API.getAdminProducts({limit: 999});
    console.log('📦 Réponse brute:', response);
    
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
    
    console.log('📦 Produits finaux:', allProducts.length);
    
    renderPaginatedProducts();
    updatePaginationControls();
    
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
    const statusBadge = product.is_active 
      ? '<span style="color: green;"><i class="fas fa-toggle-on" ></i> Actif</span>' 
      : '<span style="color: red;"><i class="fas fa-toggle-off" style="color: #999;"></i>Inactif</span>';
    
    // ✅ Construire l'URL de l'image
    let imageUrl = `https://res.cloudinary.com/dvnxsn73m/image/upload/v1771500491/image_placeholder_iuqezd.png`;
    
    if (product.images && product.images.length > 0) {
      const mainImage = product.images.find(img => img.is_main) || product.images[0];
      imageUrl = ` ${mainImage.url}`;
    } else if (product.image) {
      imageUrl = ` ${product.image}`;
    }
    
    // ✅ Image avec gestion d'erreur
    const imageHtml = `
      <img src="${imageUrl}" 
           alt="${product.name}" 
           style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"
           onerror="this.src='https://res.cloudinary.com/dvnxsn73m/image/upload/v1771500491/image_placeholder_iuqezd.png'; this.style.opacity='0.5';"
      >
    `;

    row.innerHTML = `
      <td>${imageHtml}</td>
      <td>#${product.id}</td>
      <td>${product.name}</td>
      <td>${categoryName}</td>
      <td>${Utils.formatPrice(product.base_price)}</td>
      <td>${product.stock}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-primary" onclick="editProduct(${product.id})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm" style="background: #EF4444; color: white;" onclick="deleteProduct(${product.id})">
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
  selectedImages = [];
  document.getElementById('modalTitle').textContent = 'Nouveau Produit';
  document.getElementById('productForm').reset();
  document.getElementById('imagePreview').innerHTML = '';
  document.getElementById('productModal').classList.add('active');
  document.getElementById('productCostPrice').value = '';
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
  selectedProductId = null;
  selectedImages = [];
}

// ============================================
// EDIT PRODUCT
// ============================================

async function editProduct(productId) {
  try {
    // Charger le produit
    const productResponse = await API.getProduct(productId);
    const product = productResponse.data;

    // Charger les variations du produit
    const variationsResponse = await API.getVariations({ product_id: productId });
    const variations = variationsResponse.data || [];

    selectedProductId = productId;
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
          <img src="${img.url}" alt="product">
          <button type="button" class="file-preview-remove" onclick="removeExistingImage(${img.id})">✕</button>
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

// ============================================
// SAVE PRODUCT
// ============================================

async function saveProduct(event) {
  event.preventDefault();

  const productData = {
    name: document.getElementById('productName').value,
    category_id: parseInt(document.getElementById('productCategory').value),
    base_price: parseFloat(document.getElementById('productPrice').value),
    cost_price: parseFloat(document.getElementById('productCostPrice').value) || 0, 
    stock: parseInt(document.getElementById('productStock').value) || 0,
    description: document.getElementById('productDescription').value,
    is_featured: document.getElementById('productFeatured').checked,
    is_active: document.getElementById('productActive').checked,
  };

  // ✅ Récupérer les variations
  const variationRows = document.querySelectorAll('.variation-row');
  const variations = [];
  
  variationRows.forEach(row => {
    const color = row.querySelector('.variation-color-input')?.value;
    const size = row.querySelector('.variation-size-input')?.value;
    const stock = parseInt(row.querySelector('.variation-stock-input')?.value) || 0;
    
    if (color || size) {
      variations.push({
        color: color || null,
        size: size || null,
        stock: stock
      });
    }
  });

  try {
    Utils.showLoading(document.getElementById('productForm'), true);

    let product;
    if (selectedProductId) {
      // Update
      const response = await API.updateProduct(selectedProductId, productData);
      product = response.data;
      Utils.showToast('Produit mis à jour', 'success');
    } else {
      // Create
      const response = await API.createProduct(productData);
      product = response.data;
      Utils.showToast('Produit créé', 'success');
    }

    // ✅ Créer les variations si le produit a été créé/modifié
    if (variations.length > 0 && product?.id) {
      for (const variation of variations) {
        await API.createVariation({
          product_id: product.id,
          ...variation
        });
      }
      console.log(`✅ ${variations.length} variations créées`);
    }

    // Upload images
    if (selectedImages.length > 0) {
      for (const file of selectedImages) {
        await API.uploadProductImage(product.id, file);
      }
    }

    Utils.showLoading(document.getElementById('productForm'), false);
    closeProductModal();
    loadProducts();
  } catch (error) {
    console.error('Failed to save product:', error);
    Utils.showToast('Erreur lors de l\'enregistrement', 'error');
    Utils.showLoading(document.getElementById('productForm'), false);
  }
}

// ============================================
// DELETE PRODUCT
// ============================================

async function deleteProduct(productId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) {
    return;
  }

  try {
    await API.deleteProduct(productId);
    Utils.showToast('Produit supprimé', 'success');
    loadProducts();
  } catch (error) {
    console.error('Failed to delete product:', error);
    Utils.showToast('Erreur lors de la suppression', 'error');
  }
}

// ============================================
// IMAGE HANDLING
// ============================================

function handleImageSelect(event) {
  const files = Array.from(event.target.files);
  selectedImages = files;

  const preview = document.getElementById('imagePreview');
  Utils.DOM.empty(preview);

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const div = document.createElement('div');
      div.className = 'file-preview-item';
      div.innerHTML = `
        <img src="${e.target.result}" alt="preview">
        <button type="button" class="file-preview-remove" onclick="removeImage(${index})">✕</button>
      `;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

function removeImage(index) {
  selectedImages.splice(index, 1);
  handleImageSelect({ target: { files: selectedImages } });
}

function removeExistingImage(imageId) {
  // TODO: Implement remove existing image
  console.log('Remove existing image:', imageId);
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
  if (confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
    Utils.Storage.remove('adminToken');
    Utils.showToast('Déconnecté', 'info');
    setTimeout(() => {
      window.location.href = '../login.html';
    }, 1000);
  }
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
  div.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center; background: #f5f5f5; padding: 10px; border-radius: 4px;';
  div.dataset.index = index;
  
  div.innerHTML = `
    <div style="position: relative; flex: 2;">
      <input type="text" 
        placeholder="Couleur" 
        value="${variation?.color || ''}" 
        class="variation-color-input" 
        readonly
        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; background: white;"
        onclick="openColorPalette(this)">
      <input type="hidden" class="variation-color-value" value="${variation?.color || ''}">
    </div>
    <input type="text" 
      placeholder="Taille" 
      value="${variation?.size || ''}" 
      class="variation-size-input"
      style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    <input type="number" 
      placeholder="Stock" 
      value="${variation?.stock || 0}" 
      min="0" 
      class="variation-stock-input"
      style="width: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
    <button type="button" onclick="removeVariationField(this)" style="background: none; border: none; color: #EF4444; font-size: 18px; cursor: pointer;">🗑️</button>
  `;
  
  container.appendChild(div);
}

function removeVariationField(btn) {
  if (confirm('Supprimer cette variation ?')) {
    btn.parentElement.remove();
  }
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
  
  document.getElementById('totalProductsCount').textContent = total;
  document.getElementById('currentPageDisplay').textContent = `Page ${currentPage}`;
  
  if (total > 0) {
    document.getElementById('paginationInfo').innerHTML = 
      `Affichage ${start}-${end} de <span id="totalProductsCount">${total}</span> produits`;
  } else {
    document.getElementById('paginationInfo').innerHTML = 'Aucun produit';
  }
  
  updatePaginationButtons();
}

function updatePaginationButtons() {
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  
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