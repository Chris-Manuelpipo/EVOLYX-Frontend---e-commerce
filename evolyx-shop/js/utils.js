/**
 * Utilitaires EVOLYX Shop : formatage, storage, DOM, validation.
 */

function formatPrice(price) {
  const num = parseFloat(price) || 0;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
  }).format(num);
}

function formatDate(date) {
  if (!date) return 'n.d.';
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

function formatTime(date) {
  if (!date) return 'n.d.';
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function truncateText(text, length = 100) {
  if (!text) return '';
  const str = String(text);
  return str.length > length ? str.substring(0, length) + '…' : str;
}

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** N’autorise que les liens WhatsApp https (wa.me / api.whatsapp.com). */
function safeExternalUrl(url) {
  if (url == null || url === '') return '';
  try {
    const parsed = new URL(String(url), typeof location !== 'undefined' ? location.href : undefined);
    if (parsed.protocol !== 'https:') return '';
    const host = parsed.hostname.toLowerCase();
    if (host === 'wa.me' || host === 'api.whatsapp.com') {
      return parsed.href;
    }
    return '';
  } catch (error) {
    return '';
  }
}

function debounce(fn, wait = 300) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

function categoryName(category, fallback = 'Non catégorisé') {
  if (!category) return fallback;
  if (typeof category === 'string') return category;
  if (typeof category === 'object') {
    return category.name || category.title || category.label || fallback;
  }
  return String(category);
}

function formatOrderItemLabel(item) {
  if (!item) return 'Produit';
  const name = item.product_name || item.name || 'Produit';
  const extras = [item.color, item.size, item.variation_color, item.variation_size].filter(Boolean);
  return extras.length ? `${name} (${extras.join(' / ')})` : String(name);
}

function getCartCount(cart) {
  const source = cart || Storage.getCart();
  if (!source || !Array.isArray(source.items)) return 0;
  return source.items.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
}

function updateCartBadge(selector = '#cartCount') {
  const el = document.querySelector(selector);
  if (el) el.textContent = String(getCartCount());
}

function updateWishlistBadge(selector = '#wishlistCount') {
  const el = document.querySelector(selector);
  if (!el) return;
  const count = Storage.getWishlistIds().length;
  el.textContent = String(count);
  el.hidden = count === 0;
}

function placeholderImage() {
  return (window.EVOLYX_CONFIG && window.EVOLYX_CONFIG.PLACEHOLDER_IMAGE) || '';
}

function isPlaceholderImage(url) {
  if (!url) return true;
  const value = String(url);
  const ph = placeholderImage();
  if (ph && value === ph) return true;
  return /(?:^|\/)assets\/logo\.png(?:\?|$)/i.test(value);
}

function logoPlaceholderClass(url) {
  return isPlaceholderImage(url) ? ' is-logo-placeholder' : '';
}

function placeholderOnErrorHandler() {
  const ph = placeholderImage();
  if (!ph) return 'this.onerror=null;this.classList.add(\'is-logo-placeholder\')';
  // Build safe onerror handler: URL is validated to be a same-origin path,
  // and we use DOMStringMap-safe escaping to prevent attribute injection.
  const safeUrl = String(ph).replace(/[&"'<>\s]/g, '');
  return `this.onerror=null;this.src='${safeUrl}';this.classList.add('is-logo-placeholder')`;
}

function coerceImageUrl(value, depth = 0) {
  if (value == null || depth > 3) return '';
  if (typeof value === 'string') {
    const url = value.trim();
    if (!url || url === '[object Object]') return '';
    return url;
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) return coerceImageUrl(value[0], depth + 1);
    return coerceImageUrl(
      value.url || value.image_url || value.image || value.src || value.path,
      depth + 1
    );
  }
  return '';
}

function parseImagesList(images) {
  if (!images) return [];
  if (typeof images === 'string') {
    try {
      images = JSON.parse(images);
    } catch (error) {
      return [];
    }
  }
  return Array.isArray(images) ? images : [];
}

function isMainImage(img) {
  if (!img || typeof img !== 'object') return false;
  return img.is_main === true || img.is_main === 'true' || img.is_main === 1;
}

function productImageUrl(productOrItem) {
  const fallback = placeholderImage();
  if (!productOrItem) return fallback;

  const fromFields =
    coerceImageUrl(productOrItem.image) ||
    coerceImageUrl(productOrItem.image_url) ||
    coerceImageUrl(productOrItem.thumbnail);

  const images = parseImagesList(productOrItem.images);
  let fromGallery = '';
  if (images.length) {
    const main = images.find(isMainImage) || images[0];
    fromGallery = coerceImageUrl(main);
  }

  if (fromFields && fromFields !== fallback) return fromFields;
  if (fromGallery && fromGallery !== fallback) return fromGallery;
  return fromFields || fromGallery || fallback;
}

function unwrapList(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.products)) return response.products;
  if (response.data && Array.isArray(response.data.products)) return response.data.products;
  if (Array.isArray(response.items)) return response.items;
  if (response.data && Array.isArray(response.data.items)) return response.data.items;
  if (Array.isArray(response.reviews)) return response.reviews;
  if (response.data && Array.isArray(response.data.reviews)) return response.data.reviews;
  if (Array.isArray(response.promos)) return response.promos;
  if (response.data && Array.isArray(response.data.promos)) return response.data.promos;
  if (Array.isArray(response.returns)) return response.returns;
  if (response.data && Array.isArray(response.data.returns)) return response.data.returns;
  return [];
}

function unwrapData(response) {
  if (!response) return null;
  if (response.data !== undefined) return response.data;
  return response;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

function isApiUnavailable(error) {
  return Boolean(error && error.status === 501);
}

const ORDER_STATUSES = {
  pending: {
    key: 'pending',
    label: 'En attente',
    className: 'status-pending',
    color: 'var(--warning)',
    icon: 'fa-hourglass-half',
    description: 'Commande créée, en attente de confirmation WhatsApp',
  },
  confirmed: {
    key: 'confirmed',
    label: 'Confirmée',
    className: 'status-confirmed',
    color: 'var(--info)',
    icon: 'fa-check-circle',
    description: 'Commande confirmée, préparation à venir',
  },
  preparing: {
    key: 'preparing',
    label: 'En préparation',
    className: 'status-preparing',
    color: 'var(--on-variant)',
    icon: 'fa-box',
    description: 'Les articles sont préparés pour l’expédition',
  },
  shipped: {
    key: 'shipped',
    label: 'Expédiée',
    className: 'status-shipped',
    color: 'var(--info)',
    icon: 'fa-truck',
    description: 'Colis en cours de livraison',
  },
  delivered: {
    key: 'delivered',
    label: 'Livrée',
    className: 'status-delivered',
    color: 'var(--success)',
    icon: 'fa-box-open',
    description: 'Commande remise au client',
  },
  cancelled: {
    key: 'cancelled',
    label: 'Annulée',
    className: 'status-cancelled',
    color: 'var(--danger)',
    icon: 'fa-times-circle',
    description: 'Cette commande a été annulée',
  },
};

const STATUS_SEQUENCE = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];

const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

function statusInfo(status) {
  return ORDER_STATUSES[status] || ORDER_STATUSES.pending;
}

function allowedTransitions(status) {
  const next = STATUS_TRANSITIONS[status] || [];
  return [status, ...next.filter((key) => key !== status)];
}

function statusBadge(status) {
  const extra = {
    requested: { label: 'Demandé', className: 'status-pending' },
    approved: { label: 'Approuvé', className: 'status-delivered' },
    rejected: { label: 'Refusé', className: 'status-cancelled' },
    received: { label: 'Reçu', className: 'status-confirmed' },
    refunded: { label: 'Remboursé', className: 'status-delivered' },
  };
  const known = ORDER_STATUSES[status] || extra[status];
  const info = known || { label: status || '—', className: 'status-pending' };
  return `<span class="status-badge ${escapeHtml(info.className)}">${escapeHtml(info.label)}</span>`;
}

const Storage = {
  get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      /* storage full or unavailable */
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clear() {
    localStorage.clear();
  },

  getCart() {
    return this.get('evolyx_cart') || { token: null, items: [], total: 0 };
  },

  setCart(cart) {
    this.set('evolyx_cart', cart);
  },

  getAdminToken() {
    return localStorage.getItem('adminToken');
  },

  setAdminToken(token) {
    localStorage.setItem('adminToken', token);
    // Also set as a non-httpOnly cookie for defense-in-depth.
    // The backend should preferably set an httpOnly cookie on login.
    try {
      document.cookie = `adminToken=${encodeURIComponent(token)}; path=/; SameSite=Strict; secure`;
    } catch (_) { /* private browsing may throw */ }
  },

  clearAdminToken() {
    localStorage.removeItem('adminToken');
    try {
      document.cookie = 'adminToken=; path=/; Max-Age=0; SameSite=Strict; secure';
    } catch (_) { /* ignore */ }
  },

  isAdminLoggedIn() {
    return !!localStorage.getItem('adminToken');
  },

  getLastOrderId() {
    return this.get('lastOrderId');
  },

  setLastOrderId(orderId) {
    this.set('lastOrderId', orderId);
  },

  getWishlistToken() {
    return localStorage.getItem('evolyx_wishlist_token');
  },

  setWishlistToken(token) {
    if (token) localStorage.setItem('evolyx_wishlist_token', token);
  },

  getWishlistIds() {
    const ids = this.get('evolyx_wishlist_ids');
    return Array.isArray(ids) ? ids.map(String) : [];
  },

  setWishlistIds(ids) {
    this.set('evolyx_wishlist_ids', Array.from(new Set((ids || []).map(String))));
  },

  getWishlistItemMap() {
    const map = this.get('evolyx_wishlist_item_map');
    return map && typeof map === 'object' ? map : {};
  },

  setWishlistItemMap(map) {
    this.set('evolyx_wishlist_item_map', map && typeof map === 'object' ? map : {});
  },

  getOrderSnapshot(orderId) {
    if (!orderId) return null;
    return this.get(`order_snapshot_${orderId}`) || null;
  },

  setOrderSnapshot(orderId, snapshot) {
    if (!orderId) return;
    this.set(`order_snapshot_${orderId}`, snapshot);
  },
};

const DOM = {
  $(selector, parent = document) {
    return parent.querySelector(selector);
  },

  $$(selector, parent = document) {
    return parent.querySelectorAll(selector);
  },

  create(tag, attrs = {}, html = '') {
    const el = document.createElement(tag);

    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'class') {
        el.className = value;
      } else if (key === 'data') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          el.dataset[dataKey] = dataValue;
        });
      } else {
        el.setAttribute(key, value);
      }
    });

    if (html) el.innerHTML = html;
    return el;
  },

  toggle(el, show) {
    el.style.display = show ? '' : 'none';
  },

  addClass(el, className) {
    el.classList.add(className);
  },

  removeClass(el, className) {
    el.classList.remove(className);
  },

  toggleClass(el, className) {
    el.classList.toggle(className);
  },

  remove(el) {
    el?.remove();
  },

  empty(el) {
    if (el) el.innerHTML = '';
  },
};

const Validate = {
  email(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  phone(phone) {
    const cleaned = String(phone || '').replace(/[\s.-]/g, '');
    return /^\+?[0-9]{9,15}$/.test(cleaned);
  },

  required(value) {
    return value && String(value).trim().length > 0;
  },

  minLength(value, min) {
    return value && value.length >= min;
  },

  maxLength(value, max) {
    return !value || value.length <= max;
  },
};

function showToast(message, type = 'info', duration = 3000, action = null) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = DOM.create('div', { class: `toast toast-${type}`, role: 'status' });
  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);

  if (action && action.href && action.label) {
    const link = document.createElement('a');
    link.href = action.href;
    link.className = 'toast-action';
    link.textContent = action.label;
    toast.appendChild(link);
  }

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function showLoading(container, show = true) {
  if (!container) return;
  const spinner = container.querySelector('.loading-spinner');

  if (show && !spinner) {
    const el = DOM.create(
      'div',
      { class: 'loading-spinner', 'aria-hidden': 'true' },
      '<span></span><span></span><span></span>'
    );
    container.appendChild(el);
  } else if (!show && spinner) {
    spinner.remove();
  }
}

function countTableCols(tbody) {
  const table = tbody?.closest?.('table');
  if (!table) return 5;
  const heads = table.querySelectorAll('thead th');
  if (heads.length) return heads.length;
  const first = tbody.querySelector('tr');
  return first?.children?.length || 5;
}

function showTableSkeleton(tbodyOrId, options = {}) {
  const tbody = typeof tbodyOrId === 'string'
    ? document.getElementById(tbodyOrId)
    : tbodyOrId;
  if (!tbody) return null;

  const cols = options.cols || countTableCols(tbody);
  const rows = options.rows || 6;
  const widths = [72, 48, 64, 40, 56, 36, 60, 44];

  tbody.setAttribute('aria-busy', 'true');
  tbody.innerHTML = Array.from({ length: rows }, (_, r) => {
    const cells = Array.from({ length: cols }, (_, c) => {
      const w = widths[(r + c) % widths.length];
      return `<td><span class="skeleton-bar" style="--skeleton-w:${w}%"></span></td>`;
    }).join('');
    return `<tr class="skeleton-row">${cells}</tr>`;
  }).join('');
  return tbody;
}

/** Skeleton dans le tbody pendant le chargement d’une liste. */
async function withListLoading(tbodyOrId, fn, options) {
  showTableSkeleton(tbodyOrId, options);
  try {
    return await fn();
  } finally {
    const tbody = typeof tbodyOrId === 'string'
      ? document.getElementById(tbodyOrId)
      : tbodyOrId;
    tbody?.removeAttribute('aria-busy');
  }
}

function resolveBusyButton(target) {
  if (!target) return null;
  if (target instanceof HTMLButtonElement) return target;
  if (target instanceof HTMLInputElement && target.type === 'submit') return target;
  if (typeof Event !== 'undefined' && target instanceof Event) {
    if (target.submitter instanceof HTMLElement) return target.submitter;
    const form = target.currentTarget instanceof HTMLFormElement
      ? target.currentTarget
      : target.target?.closest?.('form');
    if (form) {
      return form.querySelector('button[type="submit"], input[type="submit"], .btn-primary');
    }
    return target.currentTarget instanceof HTMLButtonElement
      ? target.currentTarget
      : target.target?.closest?.('button');
  }
  if (target instanceof HTMLFormElement) {
    return target.querySelector('button[type="submit"], input[type="submit"], .btn-primary');
  }
  if (target instanceof HTMLElement) {
    return target.closest('button') || target.querySelector('button[type="submit"], .btn-primary');
  }
  return null;
}

function setButtonBusy(btn, busy) {
  if (!btn) return;
  if (btn.tagName === 'SELECT') {
    btn.disabled = !!busy;
    if (busy) btn.setAttribute('aria-busy', 'true');
    else btn.removeAttribute('aria-busy');
    return;
  }
  if (busy) {
    if (btn.dataset.busyDepth) {
      btn.dataset.busyDepth = String(Number(btn.dataset.busyDepth) + 1);
      return;
    }
    btn.dataset.busyDepth = '1';
    btn.dataset.busyHtml = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span>';
  } else {
    const depth = Math.max(0, Number(btn.dataset.busyDepth || '1') - 1);
    if (depth > 0) {
      btn.dataset.busyDepth = String(depth);
      return;
    }
    btn.disabled = false;
    btn.classList.remove('is-loading');
    btn.removeAttribute('aria-busy');
    if (btn.dataset.busyHtml != null) {
      btn.innerHTML = btn.dataset.busyHtml;
    }
    delete btn.dataset.busyHtml;
    delete btn.dataset.busyDepth;
  }
}

/** Spinner sur le bouton (event / bouton / form). Sans cible : exécute fn sans overlay. */
async function withBusy(targetOrFn, maybeFn) {
  let btn = null;
  let fn = maybeFn;
  if (typeof targetOrFn === 'function') {
    fn = targetOrFn;
  } else if (typeof targetOrFn === 'string') {
    fn = maybeFn;
  } else {
    btn = resolveBusyButton(targetOrFn);
  }
  setButtonBusy(btn, true);
  try {
    return await fn();
  } finally {
    setButtonBusy(btn, false);
  }
}

function setBusy() {
  /* legacy no-op : préférer withBusy(event|button, fn) */
}

window.Utils = {
  formatPrice,
  formatDate,
  formatTime,
  truncateText,
  escapeHtml,
  safeExternalUrl,
  debounce,
  categoryName,
  formatOrderItemLabel,
  getCartCount,
  updateCartBadge,
  updateWishlistBadge,
  productImageUrl,
  productImage: productImageUrl,
  isPlaceholderImage,
  logoPlaceholderClass,
  placeholderOnErrorHandler,
  placeholderImage,
  unwrapList,
  unwrapData,
  isUuid,
  isApiUnavailable,
  ORDER_STATUSES,
  STATUS_SEQUENCE,
  STATUS_TRANSITIONS,
  statusInfo,
  allowedTransitions,
  statusBadge,
  Storage,
  DOM,
  Validate,
  showToast,
  showLoading,
  showTableSkeleton,
  withListLoading,
  setBusy,
  withBusy,
};
