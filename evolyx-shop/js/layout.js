/**
 * Header / footer injectés sur les pages boutique.
 */
(function siteLayout() {
  const cfg = window.EVOLYX_CONFIG || {};
  const year = new Date().getFullYear();

  function currentPage() {
    const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (file === '' || file === 'index.html') return 'home';
    if (file === 'catalog.html' || file === 'product.html') return 'catalog';
    if (file === 'order-tracking.html') return 'tracking';
    if (file === 'cart.html') return 'cart';
    if (file === 'wishlist.html') return 'wishlist';
    return file;
  }

  function headerHTML() {
    const page = currentPage();
    const theme = window.EvolyxTheme ? EvolyxTheme.markup() : '';
    return `
      <header class="site-header" id="site-header">
        <div class="container header-bar">
          <div class="brand">
            <button type="button" class="brand-logo-btn" id="adminAccess" title="EVOLYX">
              <img src="assets/logo.png" alt="" class="brand-logo" width="32" height="32">
            </button>
            <a class="brand-wordmark" href="${cfg.GROUP_URL || 'https://evolyx.cm'}" rel="noopener noreferrer">
              EVOLYX <span class="brand-accent">Shop</span>
            </a>
          </div>

          <nav class="site-nav" id="site-nav" aria-label="Navigation principale">
            <a href="index.html" class="nav-link${page === 'home' ? ' is-active' : ''}">Accueil</a>
            <a href="catalog.html" class="nav-link${page === 'catalog' ? ' is-active' : ''}">Catalogue</a>
            <a href="order-tracking.html" class="nav-link${page === 'tracking' ? ' is-active' : ''}">Suivi</a>
          </nav>

          <div class="header-actions">
            ${theme}
            <a href="wishlist.html" class="cart-link" aria-label="Favoris">
              <i class="far fa-heart" aria-hidden="true"></i>
              <span class="cart-count" id="wishlistCount" hidden>0</span>
            </a>
            <a href="cart.html" class="cart-link" aria-label="Panier">
              <i class="fas fa-shopping-bag" aria-hidden="true"></i>
              <span class="cart-count" id="cartCount">0</span>
            </a>
            <button type="button" class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="mobileNav" aria-label="Ouvrir le menu">
              <i class="fas fa-bars" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <button type="button" class="mobile-nav-backdrop" id="mobileNavBackdrop" hidden tabindex="-1" aria-label="Fermer le menu"></button>
        <nav class="mobile-nav" id="mobileNav" hidden aria-label="Navigation mobile">
          <div class="mobile-nav-panel">
            <a href="index.html"${page === 'home' ? ' class="is-active"' : ''}>Accueil</a>
            <a href="catalog.html"${page === 'catalog' ? ' class="is-active"' : ''}>Catalogue</a>
            <a href="wishlist.html"${page === 'wishlist' ? ' class="is-active"' : ''}>Favoris</a>
            <a href="order-tracking.html"${page === 'tracking' ? ' class="is-active"' : ''}>Suivi</a>
            <a href="cart.html"${page === 'cart' ? ' class="is-active"' : ''}>Panier</a>
          </div>
        </nav>
      </header>
    `;
  }

  function footerHTML() {
    const wa = cfg.WHATSAPP_URL || 'https://wa.me/237654804907';
    const email = cfg.EMAIL || 'evolyxcmr@gmail.com';
    const phone = cfg.PHONE_DISPLAY || '+237 6 54 80 49 07';
    const group = cfg.GROUP_URL || 'https://evolyx.cm';

    return `
      <footer class="site-footer" id="site-footer">
        <div class="container footer-grid">
          <div>
            <div class="brand brand-footer">
              <img src="assets/logo.png" alt="" class="brand-logo" width="32" height="32">
              <span class="brand-wordmark">EVOLYX <span class="brand-accent">Shop</span></span>
            </div>
            <p class="footer-tagline">Articles en stock. Confirmation avant expédition.</p>
          </div>
          <nav aria-label="Liens boutique">
            <h2>Boutique</h2>
            <ul>
              <li><a href="index.html">Accueil</a></li>
              <li><a href="catalog.html">Catalogue</a></li>
              <li><a href="wishlist.html">Favoris</a></li>
              <li><a href="order-tracking.html">Suivi de commande</a></li>
              <li><a href="${group}" rel="noopener noreferrer">evolyx.cm</a></li>
            </ul>
          </nav>
          <div>
            <h2>Contact</h2>
            <ul class="footer-contact">
              <li>
                <a href="${wa}" target="_blank" rel="noopener noreferrer">
                  <i class="fab fa-whatsapp" aria-hidden="true"></i> ${phone}
                </a>
              </li>
              <li>
                <a href="mailto:${email}">
                  <i class="fas fa-envelope" aria-hidden="true"></i> ${email}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div class="container footer-bottom">
          <p>© ${year} EVOLYX. Tous droits réservés.</p>
          <div class="footer-legal">
            <a href="cgv.html">CGV</a>
            <a href="mentions-legales.html">Mentions légales</a>
            <a href="confidentialite.html">Confidentialité</a>
          </div>
        </div>
      </footer>
    `;
  }

  function bindHeader() {
    const header = document.getElementById('site-header');
    const toggle = document.getElementById('navToggle');
    const mobileNav = document.getElementById('mobileNav');
    if (!header) return;

    if (window.EvolyxTheme) EvolyxTheme.bind(header);

    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toggle && mobileNav) {
      const backdrop = document.getElementById('mobileNavBackdrop');
      const icon = toggle.querySelector('i');
      const desktopMq = window.matchMedia('(min-width: 900px)');

      const setMenuOpen = (open) => {
        if (desktopMq.matches) open = false;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
        if (icon) icon.className = open ? 'fas fa-times' : 'fas fa-bars';
        mobileNav.hidden = !open;
        if (backdrop) backdrop.hidden = !open;
        header.classList.toggle('menu-open', open);
        document.body.classList.toggle('nav-locked', open);
      };

      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true');
      });

      if (backdrop) {
        backdrop.addEventListener('click', () => setMenuOpen(false));
      }

      mobileNav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setMenuOpen(false));
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setMenuOpen(false);
      });

      const closeOnDesktop = () => setMenuOpen(false);
      if (typeof desktopMq.addEventListener === 'function') {
        desktopMq.addEventListener('change', closeOnDesktop);
      } else if (typeof desktopMq.addListener === 'function') {
        desktopMq.addListener(closeOnDesktop);
      }
    }

    const adminAccess = document.getElementById('adminAccess');
    if (adminAccess) {
      let clickCount = 0;
      let clickTimer;
      adminAccess.addEventListener('click', (event) => {
        clickCount += 1;
        if (clickCount === 1) {
          clickTimer = setTimeout(() => {
            clickCount = 0;
          }, 1200);
        } else if (clickCount === 5) {
          event.preventDefault();
          clearTimeout(clickTimer);
          clickCount = 0;
          if (window.Utils && Utils.Storage.isAdminLoggedIn()) {
            window.location.href = 'admin/dashboard.html';
          } else {
            window.location.href = 'login.html';
          }
        }
      });
    }

    if (window.Utils) {
      Utils.updateCartBadge();
      Utils.updateWishlistBadge();
    }
    window.addEventListener('focus', () => {
      if (!window.Utils) return;
      Utils.updateCartBadge();
      Utils.updateWishlistBadge();
    });
  }

  function hydrateLegal() {
    if (!document.querySelector('.legal-page') || !window.API || !API.getLegal) return;
    API.getLegal()
      .then((response) => {
        const data = window.Utils ? Utils.unwrapData(response) : response && response.data;
        if (!data) return;
        if (data.email) {
          document.querySelectorAll('.legal-page a[href^="mailto:"]').forEach((link) => {
            link.href = `mailto:${data.email}`;
            if (link.textContent.includes('@')) link.textContent = data.email;
          });
        }
      })
      .catch(() => {});
  }

  function boot() {
    const headerSlot = document.getElementById('site-header');
    const footerSlot = document.getElementById('site-footer');
    if (headerSlot) headerSlot.outerHTML = headerHTML();
    if (footerSlot) footerSlot.outerHTML = footerHTML();
    bindHeader();
    hydrateLegal();
    if (window.EvolyxSeo && typeof EvolyxSeo.initPublicSite === 'function') {
      EvolyxSeo.initPublicSite();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
