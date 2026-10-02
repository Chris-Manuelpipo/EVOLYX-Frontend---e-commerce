/**
 * @fileoverview Admin Variations Management
 * CRUD operations for product variations
 * @author EVOLYX Team
 */

let allVariations = [];
let allProducts = [];
let selectedVariationId = null;

// Pagination côté serveur : allVariations ne contient que la page courante.
let currentPage = 1;
let itemsPerPage = 10;
let totalVariations = 0;
let totalPages = 1;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth().then((ok) => {
    if (!ok) return;
    // Charger les produits d'abord pour les selects, même s'ils ne servent
    // plus à la jointure côté client (le backend envoie maintenant product_name).
    loadProducts().then(() => loadVariations());
  });
});

// ============================================
// LOAD PRODUCTS - CORRIGÉ
// ============================================
async function loadProducts() {
  try {
    const response = await API.getAdminProducts({ limit: 999 });
    
    // ✅ Extraction des produits (response.products)
    if (response?.products && Array.isArray(response.products)) {
      allProducts = response.products;
    } 
    // Fallback pour l'ancien format (au cas où)
    else if (response?.data?.products && Array.isArray(response.data.products)) {
      allProducts = response.data.products;
    }
    else {
      allProducts = [];
    }
    
    // ✅ Populer les selects
    populateProductSelects();
    
  } catch (error) {
    console.error('❌ Failed to load products:', error);
    Utils.showToast('Erreur lors du chargement des produits', 'error');
    allProducts = [];
  }
}

// ============================================
// POPULATE PRODUCT SELECTS
// ============================================

function populateProductSelects() {
  const filterSelect = document.getElementById('productFilter');
  const modalSelect = document.getElementById('variationProduct');
  
  if (!filterSelect || !modalSelect) return;
  
  // Garder l'option par défaut
  filterSelect.innerHTML = '<option value="">Tous les produits</option>';
  modalSelect.innerHTML = '<option value="">Sélectionnez un produit</option>';
  
  // Ajouter les produits
  allProducts.forEach(prod => {
    const option1 = document.createElement('option');
    option1.value = prod.id;
    option1.textContent = prod.name;
    filterSelect.appendChild(option1);
    
    const option2 = document.createElement('option');
    option2.value = prod.id;
    option2.textContent = prod.name;
    modalSelect.appendChild(option2);
  });
  
  // Ajouter l'écouteur d'événement
  filterSelect.addEventListener('change', filterVariations);
}

// ============================================
// LOAD VARIATIONS
// ============================================
 
function fetchVariationsPage() {
  const productId = document.getElementById('productFilter')?.value;
  return API.getAdminVariations({
    page: currentPage,
    limit: itemsPerPage,
    product_id: productId,
  });
}

async function loadVariations() {
  try {
    await Utils.withListLoading('variationsTableBody', async () => {
      let response = await fetchVariationsPage();

      // Dernière variation d'une page supprimée : on recule sur la dernière page.
      const lastPage = response?.pagination?.totalPages || 1;
      if (currentPage > lastPage) {
        currentPage = lastPage;
        response = await fetchVariationsPage();
      }

      allVariations = Array.isArray(response?.data) ? response.data : [];
      totalVariations = response?.pagination?.total ?? allVariations.length;
      totalPages = response?.pagination?.totalPages || 1;

      renderVariations(allVariations);
      updatePaginationControls();
    });
  } catch (error) {
    console.error('❌ Failed to load variations:', error);
    Utils.showToast('Erreur lors du chargement des variations', 'error');
    allVariations = [];
    totalVariations = 0;
    totalPages = 1;
    updatePaginationControls();
  }
}

// ============================================
// FILTER VARIATIONS
// ============================================

function filterVariations() {
  currentPage = 1;
  loadVariations();
}

// ============================================
// PAGINATION
// ============================================

function updatePaginationControls() {
  const infoEl = document.getElementById('paginationInfo');
  const pageEl = document.getElementById('currentPageDisplay');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');

  if (infoEl) {
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalVariations);
    infoEl.textContent = totalVariations > 0
      ? `Affichage ${start}-${end} de ${totalVariations} variations`
      : 'Aucune variation';
  }
  if (pageEl) pageEl.textContent = `Page ${currentPage} / ${totalPages}`;
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function changePage(direction) {
  if (direction === 'prev' && currentPage > 1) {
    currentPage--;
  } else if (direction === 'next' && currentPage < totalPages) {
    currentPage++;
  } else {
    return;
  }

  loadVariations();
  document.querySelector('.admin-content').scrollIntoView({ behavior: 'smooth' });
}

function changeItemsPerPage() {
  itemsPerPage = parseInt(document.getElementById('itemsPerPage').value, 10);
  currentPage = 1;
  loadVariations();
}

// ============================================
// RENDER VARIATIONS
// ============================================

function renderVariations(variations) {
  const tbody = document.getElementById('variationsTableBody');
  if (!tbody) return;
  
  Utils.DOM.empty(tbody);

  if (!variations || variations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;">Aucune variation</td></tr>';
    return;
  }

  variations.forEach(variation => {
    // Le nom du produit vient du backend (JOIN dans getVariations)
    const productName = variation.product_name || 'Produit inconnu';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>#${Utils.escapeHtml(variation.id || '?')}</td>
      <td>${Utils.escapeHtml(productName)}</td>
      <td>${Utils.escapeHtml(variation.color || '-')}</td>
      <td>${Utils.escapeHtml(variation.size || '-')}</td>
      <td>${Utils.escapeHtml(variation.stock || 0)}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-primary" onclick="editVariation(${Number(variation.id) || 0})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm" style="background: #EF4444; color: white;" onclick="deleteVariation(${Number(variation.id) || 0}, this)">
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

function openVariationModal() {
  selectedVariationId = null;
  const title = document.getElementById('modalTitle');
  const form = document.getElementById('variationForm');
  
  if (title) title.textContent = 'Nouvelle Variation';
  if (form) form.reset();
  
  const modal = document.getElementById('variationModal');
  if (modal) modal.classList.add('active');
}

function closeVariationModal() {
  const modal = document.getElementById('variationModal');
  if (modal) modal.classList.remove('active');
}

// ============================================
// EDIT VARIATION
// ============================================

async function editVariation(variationId) {
  try {
    const response = await API.getVariation(variationId);
    
    // Extraire les données
    const variation = response.data || response;
    
    if (!variation) {
      throw new Error('Variation non trouvée');
    }

    selectedVariationId = variationId;
    
    const title = document.getElementById('modalTitle');
    const productSelect = document.getElementById('variationProduct');
    const colorInput = document.getElementById('variationColor');
    const sizeInput = document.getElementById('variationSize');
    const stockInput = document.getElementById('variationStock');
    
    if (title) title.textContent = 'Éditer Variation';
    if (productSelect) productSelect.value = variation.product_id || '';
    if (colorInput) colorInput.value = variation.color || '';
    if (sizeInput) sizeInput.value = variation.size || '';
    if (stockInput) stockInput.value = variation.stock || 0;
    
    // Mettre à jour l'aperçu couleur
    if (variation.color) {
      const colorMap = {
        'or': '#D4AF37',
        'argent': '#C0C0C0',
        'or rose': '#B76E79',
        'noir': '#000000',
        'blanc': '#FFFFFF',
        'rouge': '#FF0000',
        'bleu': '#0000FF',
        'vert': '#00FF00',
        'jaune': '#FFFF00',
        'rose': '#FFC0CB',
        'violet': '#800080',
        'orange': '#FFA500',
        'marron': '#A52A2A',
        'gris': '#808080'
      };
      
      const colorName = variation.color.toLowerCase();
      if (colorMap[colorName]) {
        updateColorPreview(colorMap[colorName]);
      }
    }

    const modal = document.getElementById('variationModal');
    if (modal) modal.classList.add('active');
    
  } catch (error) {
    console.error('❌ Failed to edit variation:', error);
    Utils.showToast('Erreur lors de la récupération de la variation', 'error');
  }
}

// ============================================
// SAVE VARIATION
// ============================================

async function saveVariation(event) {
  event.preventDefault();

  // Récupérer les valeurs
  const productId = parseInt(document.getElementById('variationProduct')?.value);
  const color = document.getElementById('variationColor')?.value;
  const size = document.getElementById('variationSize')?.value;
  const stock = parseInt(document.getElementById('variationStock')?.value) || 0;

  // Validation
  if (!productId || !color || !size) {
    Utils.showToast('Veuillez remplir tous les champs', 'warning');
    return;
  }

  const variationData = {
    product_id: productId,
    color: color,
    size: size,
    stock: stock,
  };

  try {
    await Utils.withBusy(event, async () => {
        if (selectedVariationId) {
          await API.updateVariation(selectedVariationId, variationData);
          Utils.showToast('Variation mise à jour', 'success');
        } else {
          await API.createVariation(variationData);
          Utils.showToast('Variation créée', 'success');
        }
        closeVariationModal();
        if (!selectedVariationId) currentPage = 1;
        await loadVariations();
    });
  } catch (error) {
    console.error('❌ Failed to save variation:', error);
    Utils.showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
  }
}

// ============================================
// DELETE VARIATION
// ============================================

async function deleteVariation(variationId, trigger) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette variation?')) return;

  try {
    await Utils.withBusy(trigger, async () => {
      await API.deleteVariation(variationId);
      Utils.showToast('Variation supprimée', 'success');
      await loadVariations();
    });
  } catch (error) {
    console.error('❌ Failed to delete variation:', error);
    Utils.showToast(error.message || 'Erreur lors de la suppression', 'error');
  }
}

// ============================================
// LOGOUT
// ============================================

function logout() {
  Auth.logout();
}


// ============================================
// COLOR PALETTE FUNCTIONS
// ============================================

let currentColorInput = null;

function openColorPalette(input) {
  currentColorInput = input;
  const palette = document.getElementById('colorPalette');
  if (!palette) return;
  
  // Mettre à jour l'aperçu de la couleur actuelle
  const currentColor = input.value;
  if (currentColor) {
    updateColorPreview(currentColor);
  }
  
  // Positionner la palette près de l'input
  const rect = input.getBoundingClientRect();
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  
  palette.style.display = 'block';
  palette.style.position = 'absolute';
  palette.style.top = (rect.bottom + scrollTop + 5) + 'px';
  palette.style.left = rect.left + 'px';
  palette.style.zIndex = '1000';
}

function closeColorPalette() {
  const palette = document.getElementById('colorPalette');
  if (palette) palette.style.display = 'none';
}

function selectColor(colorName, colorHex) {
  if (currentColorInput) {
    currentColorInput.value = colorName;
    updateColorPreview(colorHex);
  }
  closeColorPalette();
}

function applyCustomColor() {
  const customInput = document.getElementById('customColorInput');
  const colorHex = customInput.value.trim();
  
  // Valider le format hex (#RRGGBB ou #RGB)
  const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorHex);
  
  if (isValidHex && currentColorInput) {
    // Pour les couleurs personnalisées, on stocke le nom comme "Personnalisé" + le code
    currentColorInput.value = `Personnalisé (${colorHex})`;
    updateColorPreview(colorHex);
    customInput.value = '';
    closeColorPalette();
  } else {
    alert('Format de couleur invalide. Utilisez #RRGGBB ou #RGB');
  }
}

function updateColorPreview(colorHex) {
  const preview = document.getElementById('colorPreview');
  if (preview) {
    preview.style.background = colorHex;
  }
}

// Fermer la palette en cliquant ailleurs
document.addEventListener('click', function(e) {
  if (!e.target.closest('.color-option') && 
      !e.target.closest('#colorPalette') && 
      !e.target.closest('#variationColor')) {
    closeColorPalette();
  }
});

// Mettre à jour l'aperçu quand on change manuellement la couleur
document.addEventListener('DOMContentLoaded', () => {
  const colorInput = document.getElementById('variationColor');
  if (colorInput) {
    colorInput.addEventListener('input', function() {
      // Essayer de trouver une couleur correspondante
      const colorMap = {
        'or': '#D4AF37',
        'argent': '#C0C0C0',
        'or rose': '#B76E79',
        'noir': '#000000',
        'blanc': '#FFFFFF',
        'rouge': '#FF0000',
        'bleu': '#0000FF',
        'vert': '#00FF00',
        'jaune': '#FFFF00',
        'rose': '#FFC0CB',
        'violet': '#800080',
        'orange': '#FFA500',
        'marron': '#A52A2A',
        'gris': '#808080',
        'cyan': '#00FFFF',
        'magenta': '#FF00FF'
      };
      
      const colorName = this.value.toLowerCase();
      if (colorMap[colorName]) {
        updateColorPreview(colorMap[colorName]);
      } else {
        updateColorPreview('#ccc');
      }
    });
  }
});

// Ajoutez cette fonction pour suggérer des couleurs basées sur le texte
function suggestColors(input) {
  const suggestions = [
    'Or', 'Argent', 'Or Rose', 'Noir', 'Blanc', 
    'Rouge', 'Bleu', 'Vert', 'Jaune', 'Rose', 
    'Violet', 'Orange', 'Marron', 'Gris'
  ];
  
  const value = input.value.toLowerCase();
  if (value.length < 2) return [];
  
  return suggestions.filter(s => s.toLowerCase().includes(value));
}