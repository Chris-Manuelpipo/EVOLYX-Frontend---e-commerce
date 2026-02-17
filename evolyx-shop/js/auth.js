/**
 * @fileoverview Admin Authentication
 * Login and session management
 * @author EVOLYX Team
 */

/**
 * Handle login form submission
 * @param {Event} event - Form submit event
 */
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (!email || !password) {
    Utils.showToast('Veuillez entrer email et mot de passe', 'warning');
    return;
  }

  try {
    Utils.showLoading(document.querySelector('form'), true);

    const response = await API.adminLogin(email, password);

    if (response.success && response.data?.token) {
      // ✅ Stocker le token depuis response.data.token
      Utils.Storage.setAdminToken(response.data.token);
      
      // ✅ Stocker aussi le rôle si présent
      if (response.data.role) {
        localStorage.setItem('userRole', response.data.role);
      }
      
      Utils.showToast('Connecté avec succès!', 'success');

      // Rediriger vers le dashboard
      setTimeout(() => {
        window.location.href = 'admin/dashboard.html';
      }, 1500);
    } else {
      throw new Error('Token non reçu');
    }
  } catch (error) {
    console.error('Login failed:', error);
    Utils.showToast('Email ou mot de passe incorrect', 'error');
    Utils.showLoading(document.querySelector('form'), false);
  }
}

/**
 * Logout
 */
function logout() {
  if (confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
    Utils.Storage.remove('adminToken');
    Utils.showToast('Déconnecté avec succès', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
  }
}

/**
 * Check if user is logged in
 * @returns {boolean}
 */
function isLoggedIn() {
  return Utils.Storage.isAdminLoggedIn();
}

/**
 * Require authentication (for admin pages)
 * Redirect to login if not authenticated
 */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '../login.html';
  }
}

/**
 * Get authentication header
 * @returns {Object} Headers object with auth token
 */
function getAuthHeaders() {
  const token = Utils.Storage.getAdminToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// Export
window.Auth = {
  isLoggedIn,
  logout,
  requireAuth,
  getAuthHeaders,
};