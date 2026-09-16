let selectedPromoId = null;

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth();
  loadPromos();
});

async function loadPromos() {
  const tbody = document.getElementById('promosTableBody');
  const notice = document.getElementById('promosNotice');
  try {
    await Utils.withBusy('Chargement des promos…', async () => {
      const response = await API.getAdminPromos();
      const promos = Utils.unwrapList(response);
      if (notice) notice.innerHTML = '';
      renderPromos(promos);
    });
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;">Aucune promo chargée</td></tr>';
    if (notice) {
      notice.innerHTML = `<div class="catalog-state catalog-state-error"><p>${
        Utils.escapeHtml(error.message || 'Erreur de chargement')
      }</p></div>`;
    }
  }
}

function renderPromos(promos) {
  const tbody = document.getElementById('promosTableBody');
  Utils.DOM.empty(tbody);
  if (!promos.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;">Aucun code promo</td></tr>';
    return;
  }
  promos.forEach((promo) => {
    const type = promo.type || promo.discount_type || '';
    const value = promo.value ?? promo.percent ?? promo.amount ?? '';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${Utils.escapeHtml(promo.code)}</strong></td>
      <td>${type === 'percent' ? '%' : type === 'fixed' || type === 'amount' ? 'FCFA' : Utils.escapeHtml(type)}</td>
      <td>${Utils.escapeHtml(value)}</td>
      <td>${Utils.formatPrice(promo.min_amount ?? promo.min_order ?? 0)}</td>
      <td>${Utils.formatDate(promo.starts_at)} → ${Utils.formatDate(promo.ends_at)}</td>
      <td>${promo.uses_count || 0}${promo.max_uses ? ' / ' + promo.max_uses : ''}</td>
      <td>${promo.is_active ? 'Oui' : 'Non'}</td>
      <td>
        <button class="btn btn-sm btn-primary" type="button" onclick="editPromo(${promo.id})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger" type="button" onclick="deletePromo(${promo.id}, this)"><i class="fas fa-trash-alt"></i></button>
      </td>`;
    tbody.appendChild(row);
  });
}

function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function openPromoModal(promo) {
  selectedPromoId = promo ? promo.id : null;
  document.getElementById('promoModalTitle').textContent = promo ? 'Modifier le code' : 'Nouveau code';
  document.getElementById('promoForm').reset();
  if (promo) {
    document.getElementById('promoCodeField').value = promo.code || '';
    document.getElementById('promoType').value =
      promo.type === 'amount' ? 'fixed' : promo.type || promo.discount_type || 'percent';
    document.getElementById('promoValue').value = promo.value ?? promo.percent ?? promo.amount ?? '';
    document.getElementById('promoMin').value = promo.min_amount ?? promo.min_order ?? 0;
    document.getElementById('promoStart').value = toLocalInput(promo.starts_at);
    document.getElementById('promoEnd').value = toLocalInput(promo.ends_at);
    document.getElementById('promoMaxUses').value = promo.max_uses || '';
    document.getElementById('promoActive').checked = promo.is_active !== false;
  }
  document.getElementById('promoModal').classList.add('active');
}

function closePromoModal() {
  document.getElementById('promoModal').classList.remove('active');
  selectedPromoId = null;
}

async function editPromo(id) {
  try {
    const response = await API.getAdminPromo(id);
    const promo = Utils.unwrapData(response);
    if (!promo || !promo.id) throw new Error('Promo introuvable');
    openPromoModal(promo);
  } catch (error) {
    Utils.showToast(error.message || 'Impossible de charger la promo', 'error');
  }
}

function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function readPromoForm() {
  const maxUsesRaw = document.getElementById('promoMaxUses').value;
  const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null;
  return {
    code: document.getElementById('promoCodeField').value.trim().toUpperCase(),
    type: document.getElementById('promoType').value === 'amount' ? 'fixed' : document.getElementById('promoType').value,
    value: Number(document.getElementById('promoValue').value),
    min_amount: Number(document.getElementById('promoMin').value) || 0,
    min_order: Number(document.getElementById('promoMin').value) || 0,
    starts_at: toIsoDate(document.getElementById('promoStart').value),
    ends_at: toIsoDate(document.getElementById('promoEnd').value),
    max_uses: maxUses && maxUses > 0 ? maxUses : null,
    is_active: document.getElementById('promoActive').checked,
  };
}

async function savePromo(event) {
  event.preventDefault();
  const data = readPromoForm();
  try {
    await Utils.withBusy(event, async () => {
      if (selectedPromoId) await API.updatePromo(selectedPromoId, data);
      else await API.createPromo(data);
      Utils.showToast('Promo enregistrée', 'success');
      closePromoModal();
      await loadPromos();
    });
  } catch (error) {
    Utils.showToast(error.message || 'Enregistrement impossible', 'error');
  }
}

async function deletePromo(id, trigger) {
  if (!confirm('Supprimer ce code promo ?')) return;
  try {
    await Utils.withBusy(trigger, async () => {
      await API.deletePromo(id);
      Utils.showToast('Promo supprimée', 'success');
      await loadPromos();
    });
  } catch (error) {
    Utils.showToast(error.message || 'Suppression impossible', 'error');
  }
}

window.openPromoModal = openPromoModal;
window.closePromoModal = closePromoModal;
window.savePromo = savePromo;
window.editPromo = editPromo;
window.deletePromo = deletePromo;
