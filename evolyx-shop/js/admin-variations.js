/**
 * @fileoverview Admin Variations Management
 * CRUD operations for product variations
 * @author EVOLYX Team
 */

let allVariations = [];
let allProducts = [];
let selectedVariationId = null;

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth();
  loadProducts();
  loadVariations();
});

async function loadProducts() {
  try {
    const response = await API.getAdminProducts();
    allProducts = response.data || [];

    // Populate product selects
    const selects = [
      document.getElementById('variationProduct'),
      document.getElementById('productFilter')
    ];

    selects.forEach(select => {
      allProducts.forEach(prod => {
        if (!select.querySelector(`option[value="${prod.id}"]`)) {
          const option = document.createElement('option');
          option.value = prod.id;
          option.textContent = prod.name;
          select.appendChild(option);
        }
      });
    });

    document.getElementById('productFilter').addEventListener('change', filterVariations);
  } catch (error) {
    console.error('Failed to load products:', error);
  }
}

async function loadVariations() {
  try {
    const response = await API.getAdminVariations();
    allVariations = response.data || [];
    renderVariations(allVariations);
  } catch (error) {
    console.error('Failed to load variations:', error);
    Utils.showToast('Erreur lors du chargement des variations', 'error');
  }
}

function filterVariations() {
  const productId = document.getElementById('productFilter').value;
  const filtered = productId ? allVariations.filter(v => v.product_id == productId) : allVariations;
  renderVariations(filtered);
}

function renderVariations(variations) {
  const tbody = document.getElementById('variationsTableBody');
  Utils.DOM.empty(tbody);

  if (variations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;">Aucune variation</td></tr>';
    return;
  }

  variations.forEach(variation => {
    const product = allProducts.find(p => p.id === variation.product_id);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>#${variation.id}</td>
      <td>${product?.name || 'N/A'}</td>
      <td>${variation.color}</td>
      <td>${variation.size}</td>
      <td>${variation.stock}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-primary" onclick="editVariation(${variation.id})">
            ✎ Éditer
          </button>
          <button class="btn btn-sm" style="background: #EF4444; color: white;" onclick="deleteVariation(${variation.id})">
            ✕ Supprimer
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function openVariationModal() {
  selectedVariationId = null;
  document.getElementById('modalTitle').textContent = 'Nouvelle Variation';
  document.getElementById('variationForm').reset();
  document.getElementById('variationModal').classList.add('active');
}

function closeVariationModal() {
  document.getElementById('variationModal').classList.remove('active');
}

async function editVariation(variationId) {
  try {
    const response = await API.getVariation(variationId);
    const variation = response.data;

    selectedVariationId = variationId;
    document.getElementById('modalTitle').textContent = 'Éditer Variation';
    document.getElementById('variationProduct').value = variation.product_id;
    document.getElementById('variationColor').value = variation.color;
    document.getElementById('variationSize').value = variation.size;
    document.getElementById('variationStock').value = variation.stock;

    document.getElementById('variationModal').classList.add('active');
  } catch (error) {
    console.error('Failed to edit variation:', error);
    Utils.showToast('Erreur lors de la récupération de la variation', 'error');
  }
}

async function saveVariation(event) {
  event.preventDefault();

  const variationData = {
    product_id: parseInt(document.getElementById('variationProduct').value),
    color: document.getElementById('variationColor').value,
    size: document.getElementById('variationSize').value,
    stock: parseInt(document.getElementById('variationStock').value),
  };

  try {
    if (selectedVariationId) {
      await API.updateVariation(selectedVariationId, variationData);
      Utils.showToast('Variation mise à jour', 'success');
    } else {
      await API.createVariation(variationData);
      Utils.showToast('Variation créée', 'success');
    }
    closeVariationModal();
    loadVariations();
  } catch (error) {
    console.error('Failed to save variation:', error);
    Utils.showToast('Erreur lors de l\'enregistrement', 'error');
  }
}

async function deleteVariation(variationId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette variation?')) return;

  try {
    await API.deleteVariation(variationId);
    Utils.showToast('Variation supprimée', 'success');
    loadVariations();
  } catch (error) {
    console.error('Failed to delete variation:', error);
    Utils.showToast('Erreur lors de la suppression', 'error');
  }
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