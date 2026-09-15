/**
 * Sidebar admin unifiée, thème, menu mobile.
 */
(function adminLayout() {
  const ITEMS = [
    { href: 'dashboard.html', icon: 'fa-regular fa-chart-bar', label: 'Dashboard' },
    { href: 'products.html', icon: 'fas fa-box', label: 'Produits' },
    { href: 'categories.html', icon: 'fas fa-tags', label: 'Catégories' },
    { href: 'orders.html', icon: 'fas fa-shopping-cart', label: 'Commandes' },
    { href: 'promos.html', icon: 'fas fa-percent', label: 'Promos' },
    { href: 'returns.html', icon: 'fas fa-rotate-left', label: 'Retours' },
    { href: 'variations.html', icon: 'fas fa-palette', label: 'Variations' },
    { href: 'stats.html', icon: 'fas fa-chart-simple', label: 'Statistiques' },
    { href: 'superadmin.html', icon: 'fas fa-user-shield', label: 'Admins', superOnly: true },
  ];

  function currentFile() {
    return (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();
  }

  function closeNav() {
    document.body.classList.remove('admin-nav-open');
    const toggle = document.getElementById('adminMenuToggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Ouvrir le menu');
    }
  }

  function renderSidebar() {
    const mount = document.getElementById('admin-sidebar');
    if (!mount) return;

    const current = currentFile();
    const role = localStorage.getItem('userRole');
    const nav = ITEMS.filter((item) => !item.superOnly || role === 'super_admin')
      .map((item) => {
        const active = item.href === current ? ' active' : '';
        return `
          <a href="${item.href}" class="nav-item${active}">
            <span class="icon"><i class="${item.icon}" aria-hidden="true"></i></span>
            <span>${item.label}</span>
          </a>`;
      })
      .join('');

    mount.innerHTML = `
      <div class="sidebar-header">
        <a class="admin-brand" href="../index.html">
          <img src="../assets/logo.png" alt="" width="28" height="28">
          <span>EVOLYX</span>
        </a>
        <p>Administration</p>
      </div>
      <nav class="sidebar-nav" aria-label="Admin">${nav}</nav>
      <div class="sidebar-footer">
        <button type="button" class="btn btn-secondary btn-sm" onclick="Auth.logout()">
          <i class="fas fa-sign-out-alt" aria-hidden="true"></i> Déconnexion
        </button>
      </div>
    `;
  }

  function enhanceTopbar() {
    const content = document.querySelector('.topbar-content');
    if (!content || content.dataset.chrome === '1') return;
    content.dataset.chrome = '1';

    const burger = document.createElement('button');
    burger.type = 'button';
    burger.className = 'admin-menu-toggle';
    burger.id = 'adminMenuToggle';
    burger.setAttribute('aria-controls', 'admin-sidebar');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Ouvrir le menu');
    burger.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
    content.prepend(burger);

    const tools = document.createElement('div');
    tools.className = 'topbar-tools';
    tools.id = 'adminThemeSlot';
    content.appendChild(tools);
    if (window.EvolyxTheme) EvolyxTheme.mount(tools);

    burger.addEventListener('click', () => {
      const open = document.body.classList.toggle('admin-nav-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    });
  }

  function renderBackdrop() {
    if (document.getElementById('adminNavBackdrop')) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'admin-nav-backdrop';
    backdrop.id = 'adminNavBackdrop';
    backdrop.addEventListener('click', closeNav);
    document.body.appendChild(backdrop);
  }

  function boot() {
    renderBackdrop();
    renderSidebar();
    enhanceTopbar();
    document.querySelectorAll('.admin-sidebar .nav-item').forEach((link) => {
      link.addEventListener('click', closeNav);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
