/**
 * Authentification admin.
 */

function initPasswordToggles(root = document) {
  root.querySelectorAll('[data-password-toggle]').forEach((btn) => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.getAttribute('data-password-toggle'));
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      btn.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
      const icon = btn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-eye', !show);
        icon.classList.toggle('fa-eye-slash', show);
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initPasswordToggles());
} else {
  initPasswordToggles();
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (!email || !password) {
    Utils.showToast('Entrez e-mail et mot de passe', 'warning');
    return;
  }

  try {
    await Utils.withBusy(event, async () => {
      const response = await API.adminLogin(email, password);

      if (response.success && response.data?.token) {
        Utils.Storage.setAdminToken(response.data.token);
        const role = response.data.role || response.data.user?.role;
        if (role) {
          localStorage.setItem('userRole', role);
        }
        Utils.showToast('Connecté', 'success');
        setTimeout(() => {
          window.location.href = 'admin/dashboard.html';
        }, 800);
      } else {
        throw new Error('Token non reçu');
      }
    });
  } catch (error) {
    console.error('Login failed:', error);
    Utils.showToast('E-mail ou mot de passe incorrect', 'error');
  }
}

async function logout() {
  if (!confirm('Vous déconnecter ?')) return;
  try {
    if (window.API && API.adminLogout) await API.adminLogout();
  } catch (e) {
    /* logout local même si l’API n’a pas la route */
  }
  localStorage.removeItem('adminToken');
  localStorage.removeItem('userRole');
  if (window.Utils) Utils.Storage.remove('adminToken');
  if (window.Utils) Utils.showToast('Déconnecté', 'info');
  setTimeout(() => {
    window.location.href = window.location.pathname.includes('/admin/')
      ? '../login.html'
      : 'login.html';
  }, 400);
}

function isLoggedIn() {
  return Utils.Storage.isAdminLoggedIn();
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '../login.html';
  }
}

function getAuthHeaders() {
  const token = Utils.Storage.getAdminToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

window.Auth = {
  isLoggedIn,
  logout,
  requireAuth,
  getAuthHeaders,
};
window.handleLogin = handleLogin;
