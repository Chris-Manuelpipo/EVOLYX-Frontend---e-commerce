/**
 * Création d'administrateurs (super_admin).
 * Le contrôle d'accès est vérifié via l'API (/admin/me),
 * pas seulement via localStorage (bypassable).
 */

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth().then((ok) => {
    if (ok) verifySuperAdmin();
  });
});

async function verifySuperAdmin() {
  const gate = document.getElementById('superadminGate');
  const formWrap = document.getElementById('superadminFormWrap');

  // Hide form by default until API confirms super_admin role
  if (formWrap) formWrap.hidden = true;

  try {
    const response = await API.adminMe();
    const me = response?.data || response;
    const role = me?.role;

    // Update localStorage with server-confirmed role
    if (role) localStorage.setItem('userRole', role);

    if (role !== 'super_admin') {
      showAccessDenied();
      return;
    }

    // Role confirmed by backend — show form
    if (gate) gate.hidden = true;
    if (formWrap) formWrap.hidden = false;

    const form = document.getElementById('adminCreateForm');
    if (form) form.addEventListener('submit', createAdmin);
  } catch (error) {
    showAccessDenied();
  }
}

function showAccessDenied() {
  const gate = document.getElementById('superadminGate');
  const formWrap = document.getElementById('superadminFormWrap');
  if (formWrap) formWrap.hidden = true;
  if (gate) {
    gate.hidden = false;
    gate.innerHTML = `
      <div class="card catalog-state">
        <p>Cette page est réservée au super administrateur.</p>
        <a href="dashboard.html" class="btn btn-secondary">Retour au dashboard</a>
      </div>
    `;
  }
}

async function createAdmin(event) {
  event.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const role = document.getElementById('adminRole').value;

  if (!Utils.Validate.email(email) || password.length < 8) {
    Utils.showToast('E-mail valide et mot de passe (8 caractères min.) requis', 'warning');
    return;
  }

  try {
    await Utils.withBusy(event, async () => {
      await API.createAdmin({ email, password, role });
      Utils.showToast('Administrateur créé', 'success');
      event.target.reset();
    });
  } catch (error) {
    console.error(error);
    Utils.showToast(error.message || 'Création impossible', 'error');
  }
}

function logout() {
  Auth.logout();
}
