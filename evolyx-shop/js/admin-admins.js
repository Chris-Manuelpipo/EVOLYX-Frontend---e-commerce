/**
 * Création d’administrateurs (super_admin).
 */

document.addEventListener('DOMContentLoaded', () => {
  Auth.requireAuth();
  const role = localStorage.getItem('userRole');
  const gate = document.getElementById('superadminGate');
  const formWrap = document.getElementById('superadminFormWrap');

  if (role !== 'super_admin') {
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
    return;
  }

  if (gate) gate.hidden = true;
  if (formWrap) formWrap.hidden = false;

  const form = document.getElementById('adminCreateForm');
  if (form) form.addEventListener('submit', createAdmin);
});

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
    await Utils.withBusy('Création de l\'administrateur…', async () => {
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
