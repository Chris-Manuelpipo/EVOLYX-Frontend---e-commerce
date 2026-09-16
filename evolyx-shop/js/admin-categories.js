/**
 * @fileoverview Admin Categories Management
 * CRUD operations for categories
 * @author EVOLYX Team
 */

let allCategories = [];
let selectedCategoryId = null;

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth();
  loadCategories();
});

async function loadCategories() {
  try {
    await Utils.withBusy('Chargement des catégories…', async () => {
      const response = await API.getCategories();
      allCategories = response.data || [];
      renderCategories();
    });
  } catch (error) {
    console.error('Failed to load categories:', error);
    Utils.showToast('Erreur lors du chargement des catégories', 'error');
  }
}

function renderCategories() {
  const tbody = document.getElementById('categoriesTableBody');
  Utils.DOM.empty(tbody);

  if (allCategories.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;">Aucune catégorie</td></tr>';
    return;
  }

  allCategories.forEach(cat => {
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>#${cat.id}</td>
      <td>${cat.name}</td>
      <td>${cat.description || '-'}</td>
      
      <td>
        <div class="action-buttons">
          <button class="btn btn-sm btn-primary" onclick="editCategory(${cat.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm" style="background: #EF4444; color: white;" onclick="deleteCategory(${cat.id}, this)"><i class="fas fa-trash-alt"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function openCategoryModal() {
  selectedCategoryId = null;
  document.getElementById('modalTitle').textContent = 'Nouvelle Catégorie';
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryModal').classList.add('active');
}

function closeCategoryModal() {
  document.getElementById('categoryModal').classList.remove('active');
}

async function editCategory(categoryId) {
  try {
    await Utils.withBusy('Chargement…', async () => {
      const response = await API.getCategory(categoryId);
      const category = response.data;

      selectedCategoryId = categoryId;
      document.getElementById('modalTitle').textContent = 'Éditer Catégorie';
      document.getElementById('categoryName').value = category.name;
      document.getElementById('categoryDescription').value = category.description || '';
      document.getElementById('categoryModal').classList.add('active');
    });
  } catch (error) {
    console.error('Failed to edit category:', error);
    Utils.showToast('Erreur lors de la récupération de la catégorie', 'error');
  }
}

async function saveCategory(event) {
  event.preventDefault();

  const categoryData = {
    name: document.getElementById('categoryName').value,
    description: document.getElementById('categoryDescription').value,
  };

  try {
    await Utils.withBusy(event, async () => {
        if (selectedCategoryId) {
          await API.updateCategory(selectedCategoryId, categoryData);
          Utils.showToast('Catégorie mise à jour', 'success');
        } else {
          await API.createCategory(categoryData);
          Utils.showToast('Catégorie créée', 'success');
        }
        closeCategoryModal();
        await loadCategories();
    });
  } catch (error) {
    console.error('Failed to save category:', error);
    Utils.showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
  }
}

async function deleteCategory(categoryId, trigger) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie?')) return;

  try {
    await Utils.withBusy(trigger, async () => {
      await API.deleteCategory(categoryId);
      Utils.showToast('Catégorie supprimée', 'success');
      await loadCategories();
    });
  } catch (error) {
    console.error('Failed to delete category:', error);
    Utils.showToast('Erreur lors de la suppression', 'error');
  }
}

function logout() {
  Auth.logout();
}
