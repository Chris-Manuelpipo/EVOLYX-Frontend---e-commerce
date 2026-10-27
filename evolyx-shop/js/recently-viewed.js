/**
 * Produits récemment consultés : historique local (localStorage), sans API.
 */

const RecentlyViewed = (() => {
  const KEY = 'evolyx_recently_viewed';
  const MAX_ITEMS = 8;

  function list() {
    const items = Utils.Storage.get(KEY);
    return Array.isArray(items) ? items.filter((item) => item && item.id != null) : [];
  }

  function add(product) {
    if (!product || product.id == null) return;
    const entry = {
      id: product.id,
      name: product.name || '',
      base_price: product.base_price,
      image: Utils.productImageUrl(product),
    };
    const rest = list().filter((item) => String(item.id) !== String(product.id));
    Utils.Storage.set(KEY, [entry, ...rest].slice(0, MAX_ITEMS));
  }

  function render(section, { excludeId = null, title = 'Récemment consultés' } = {}) {
    if (!section) return;
    const items = list().filter((item) => String(item.id) !== String(excludeId ?? ''));
    if (!items.length) {
      section.hidden = true;
      return;
    }
    const onError = Utils.placeholderOnErrorHandler();
    section.hidden = false;
    section.innerHTML = `
      <h2 class="product-extras-title">${Utils.escapeHtml(title)}</h2>
      <div class="products-grid">
        ${items
          .map((item) => {
            const heart = window.Wishlist ? Wishlist.heartButton(item.id) : '';
            return `
              <article class="product-card card">
                ${heart}
                <a href="product.html?id=${encodeURIComponent(item.id)}" class="product-card-link">
                  <div class="product-image">
                    <img src="${Utils.escapeHtml(item.image)}" alt="${Utils.escapeHtml(item.name)}"
                         class="${Utils.logoPlaceholderClass(item.image).trim()}"
                         loading="lazy" onerror="${onError}">
                  </div>
                  <div class="product-info">
                    <h3 class="product-name">${Utils.escapeHtml(Utils.truncateText(item.name, 40))}</h3>
                    <div class="product-footer">
                      <span class="product-price">${Utils.formatPrice(item.base_price)}</span>
                    </div>
                  </div>
                </a>
              </article>`;
          })
          .join('')}
      </div>`;
    if (window.Wishlist) Wishlist.bind(section);
  }

  return { list, add, render };
})();

window.RecentlyViewed = RecentlyViewed;

// Rendu automatique (accueil) : <section data-recently-viewed="auto">.
document.addEventListener('DOMContentLoaded', () => {
  const section = document.querySelector('[data-recently-viewed="auto"]');
  if (section) RecentlyViewed.render(section);
});
