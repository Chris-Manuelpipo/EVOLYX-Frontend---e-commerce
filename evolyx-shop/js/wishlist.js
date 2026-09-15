/**
 * Wishlist : token localStorage `evolyx_wishlist_token`, sync API, cache d’ids local.
 * Le DELETE serveur attend l’id de ligne wishlist, pas l’id produit.
 */
const Wishlist = {
  isUuid(value) {
    return window.Utils && Utils.isUuid ? Utils.isUuid(value) : false;
  },

  async ensureToken() {
    let token = Utils.Storage.getWishlistToken();
    try {
      if (!token || !this.isUuid(token)) {
        const response = await API.createWishlist();
        const data = Utils.unwrapData(response) || {};
        token = data.token || data.wishlist_token || response.token;
      } else {
        try {
          await API.getWishlist(token);
        } catch (error) {
          if (error && error.status === 404) {
            const response = await API.createWishlist(token);
            const data = Utils.unwrapData(response) || {};
            token = data.token || token;
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      if (!Utils.isApiUnavailable(error)) console.warn('Wishlist token:', error);
    }
    if (!token) {
      token =
        (crypto.randomUUID && crypto.randomUUID()) ||
        `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    Utils.Storage.setWishlistToken(token);
    return token;
  },

  idsFromPayload(payload) {
    const list = Utils.unwrapList(payload);
    return list
      .map((item) => item.product_id || item.product?.id)
      .filter(Boolean)
      .map(String);
  },

  itemMapFromPayload(payload) {
    const list = Utils.unwrapList(payload);
    const map = {};
    list.forEach((item) => {
      const productId = item.product_id || item.product?.id;
      if (!productId || item.id == null) return;
      map[String(productId)] = item.id;
    });
    return map;
  },

  rememberPayload(payload) {
    const ids = this.idsFromPayload(payload);
    const map = this.itemMapFromPayload(payload);
    if (ids.length || Utils.unwrapList(payload).length === 0) {
      Utils.Storage.setWishlistIds(ids);
    }
    if (Object.keys(map).length) {
      Utils.Storage.setWishlistItemMap({ ...Utils.Storage.getWishlistItemMap(), ...map });
    }
    return ids;
  },

  async syncFromApi() {
    const token = Utils.Storage.getWishlistToken();
    if (!token || !window.API) return Utils.Storage.getWishlistIds();
    try {
      const response = await API.getWishlist(token);
      this.rememberPayload(response);
      const data = Utils.unwrapData(response);
      return data && data.items ? data.items : Utils.unwrapList(response);
    } catch (error) {
      return null;
    }
  },

  has(productId) {
    return Utils.Storage.getWishlistIds().includes(String(productId));
  },

  heartButton(productId) {
    const active = this.has(productId);
    return `
      <button type="button" class="wishlist-btn${active ? ' is-active' : ''}"
              data-wishlist-id="${Utils.escapeHtml(productId)}"
              aria-pressed="${active}"
              aria-label="${active ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
        <i class="${active ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i>
      </button>`;
  },

  paintButton(btn, active) {
    if (!btn) return;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
    btn.setAttribute('aria-label', active ? 'Retirer des favoris' : 'Ajouter aux favoris');
    const icon = btn.querySelector('i');
    if (icon) icon.className = `${active ? 'fas' : 'far'} fa-heart`;
  },

  async toggle(productId, btn) {
    const id = String(productId);
    const ids = Utils.Storage.getWishlistIds();
    const adding = !ids.includes(id);
    const next = adding ? [...ids, id] : ids.filter((item) => item !== id);
    Utils.Storage.setWishlistIds(next);
    this.paintButton(btn, adding);
    Utils.updateWishlistBadge();

    try {
      const token = await this.ensureToken();
      if (!this.isUuid(token)) throw Object.assign(new Error('sync'), { status: 404 });
      if (adding) {
        const response = await API.addToWishlist(token, id);
        this.rememberPayload(response);
      } else {
        const mappedId = Utils.Storage.getWishlistItemMap()[id];
        const response = await API.removeFromWishlist(token, mappedId != null ? mappedId : id);
        this.rememberPayload(response);
        const map = Utils.Storage.getWishlistItemMap();
        delete map[id];
        Utils.Storage.setWishlistItemMap(map);
      }
    } catch (error) {
      if (Utils.isApiUnavailable(error)) {
        Utils.showToast(
          adding ? 'Enregistré sur cet appareil (sync serveur bientôt)' : 'Retiré des favoris',
          'info'
        );
        return;
      }
      Utils.Storage.setWishlistIds(ids);
      this.paintButton(btn, !adding);
      Utils.updateWishlistBadge();
      Utils.showToast(error.message || 'Impossible de mettre à jour les favoris', 'error');
      return;
    }

    Utils.showToast(adding ? 'Ajouté aux favoris' : 'Retiré des favoris', 'success', 2500, {
      href: 'wishlist.html',
      label: 'Voir',
    });
  },

  bind(root = document) {
    root.querySelectorAll('[data-wishlist-id]').forEach((btn) => {
      if (btn.dataset.bound === '1') {
        this.paintButton(btn, this.has(btn.dataset.wishlistId));
        return;
      }
      btn.dataset.bound = '1';
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.toggle(btn.dataset.wishlistId, btn);
      });
    });
  },

  async renderPage() {
    const grid = document.getElementById('wishlistGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="loading-spinner" aria-hidden="true"><span></span><span></span><span></span></div>';

    await this.syncFromApi();
    const ids = Utils.Storage.getWishlistIds();
    if (!ids.length) {
      grid.innerHTML = `
        <div class="catalog-state" style="grid-column:1/-1;">
          <p>Aucun favori pour le moment. Touchez le cœur sur un produit du catalogue.</p>
          <a href="index.html#catalog" class="btn btn-primary">Voir le catalogue</a>
        </div>`;
      Utils.updateWishlistBadge();
      return;
    }

    const products = [];
    await Promise.all(
      ids.map(async (id) => {
        try {
          const response = await API.getProduct(id);
          const product = Utils.unwrapData(response) || response;
          if (product && product.id) products.push(product);
        } catch (error) {
          console.warn('Favori introuvable', id, error);
        }
      })
    );

    if (!products.length) {
      grid.innerHTML = `
        <div class="catalog-state catalog-state-error" style="grid-column:1/-1;">
          <p>Les favoris n’ont pas pu être chargés. Réessayez.</p>
          <button type="button" class="btn btn-primary" onclick="Wishlist.renderPage()">Réessayer</button>
        </div>`;
      return;
    }

    grid.innerHTML = '';
    products.forEach((product) => {
      if (typeof createProductCard === 'function') {
        grid.appendChild(createProductCard(product));
      }
    });
    this.bind(grid);
    Utils.updateWishlistBadge();
  },
};

window.Wishlist = Wishlist;

document.addEventListener('DOMContentLoaded', () => {
  Wishlist.syncFromApi().then(() => {
    Wishlist.bind(document);
    Utils.updateWishlistBadge();
  });
});
