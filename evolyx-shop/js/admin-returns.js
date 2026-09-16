document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth();
  loadReturns();
});

async function loadReturns() {
  const tbody = document.getElementById('returnsTableBody');
  const notice = document.getElementById('returnsNotice');
  try {
    await Utils.withBusy('Chargement des retours…', async () => {
      const response = await API.getAdminReturns();
      const returns = Utils.unwrapList(response);
      if (notice) notice.innerHTML = '';
      renderReturns(returns);
    });
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;">Aucun retour chargé</td></tr>';
    if (notice) {
      notice.innerHTML = `<div class="catalog-state catalog-state-error"><p>${
        Utils.escapeHtml(error.message || 'Erreur de chargement')
      }</p></div>`;
    }
  }
}

function renderReturns(returns) {
  const tbody = document.getElementById('returnsTableBody');
  Utils.DOM.empty(tbody);
  if (!returns.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;">Aucun retour</td></tr>';
    return;
  }
  returns.forEach((item) => {
    const status = item.status === 'pending' ? 'requested' : item.status || 'requested';
    const orderId = item.order_id || item.order?.id || '';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>#${item.id}</td>
      <td>#${Utils.escapeHtml(orderId)}</td>
      <td>${Utils.escapeHtml(Utils.truncateText(item.reason || '', 80))}</td>
      <td>${Utils.statusBadge(status)}</td>
      <td>${Utils.formatDate(item.created_at)}</td>
      <td>
        <select onchange="changeReturnStatus(${item.id}, this.value, this)" aria-label="Statut du retour">
          ${['requested', 'approved', 'rejected', 'refunded']
            .map(
              (key) =>
                `<option value="${key}"${key === status ? ' selected' : ''}>${returnLabel(key)}</option>`
            )
            .join('')}
        </select>
        ${
          orderId
            ? `<button class="btn btn-sm btn-secondary" type="button" onclick="openAdminInvoice(${orderId})">Facture</button>`
            : ''
        }
      </td>`;
    tbody.appendChild(row);
  });
}

function returnLabel(status) {
  const map = {
    requested: 'Demandé',
    pending: 'Demandé',
    approved: 'Approuvé',
    rejected: 'Refusé',
    received: 'Reçu',
    refunded: 'Remboursé',
    cancelled: 'Annulé',
  };
  return map[status] || status;
}

async function changeReturnStatus(id, status, trigger) {
  try {
    await Utils.withBusy(trigger, async () => {
      await API.updateReturnStatus(id, status);
      Utils.showToast('Statut mis à jour', 'success');
      await loadReturns();
    });
  } catch (error) {
    Utils.showToast(error.message || 'Mise à jour impossible', 'error');
    loadReturns();
  }
}

async function openAdminInvoice(orderId) {
  try {
    const blob = await API.fetchInvoice(orderId);
    if (!(blob instanceof Blob)) throw new Error('Facture indisponible');
    window.open(URL.createObjectURL(blob), '_blank', 'noopener');
  } catch (error) {
    Utils.showToast(error.message || 'Facture indisponible', 'error');
  }
}

window.changeReturnStatus = changeReturnStatus;
window.openAdminInvoice = openAdminInvoice;
