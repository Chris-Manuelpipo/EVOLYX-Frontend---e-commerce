/**
 * @fileoverview Utility Functions
 * Formatting, localStorage, DOM helpers
 * @author EVOLYX Team
 */

// ============================================
// FORMATTING UTILITIES
// ============================================

/**
 * Format price to FCFA currency
 * @param {number|string} price - Price amount
 * @returns {string} Formatted price (e.g., "25 000 FCFA")
 */
function formatPrice(price) {
  const num = parseFloat(price) || 0;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
  }).format(num);
}

/**
 * Format date to readable format
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date (e.g., "17 février 2026")
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Format time to readable format
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted time (e.g., "10:35")
 */
function formatTime(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} length - Max length
 * @returns {string} Truncated text
 */
function truncateText(text, length = 100) {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
}

// ======================= 
// LOCALSTORAGE UTILITIES  
// ======================= 

const Storage = {
  // Méthodes génériques (avec JSON)
  get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn(`Storage get error [${key}]:`, error);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Storage set error [${key}]:`, error);
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  clear() {
    localStorage.clear();
  },

  // Cart (utilise JSON)
  getCart() {
    return this.get('evolyx_cart') || { token: null, items: [], total: 0 };
  },

  setCart(cart) {
    this.set('evolyx_cart', cart);
  },

  // ✅ AUTH - SANS JSON (stockage direct)
  getAdminToken() {
    return localStorage.getItem('adminToken');  // ← direct
  },

  setAdminToken(token) {
    localStorage.setItem('adminToken', token);  // ← direct
    console.log('✅ Token stocké (direct):', token ? token.substring(0, 20) + '...' : 'null');
  },

  isAdminLoggedIn() {
    const token = localStorage.getItem('adminToken');
    return !!token;
  },

  // Order tracking (utilise JSON)
  getLastOrderId() {
    return this.get('lastOrderId');
  },

  setLastOrderId(orderId) {
    this.set('lastOrderId', orderId);
  },
};
// ============================================
// DOM UTILITIES
// ============================================

/**
 * DOM Helper Functions
 */
const DOM = {
  /**
   * Query single element
   * @param {string} selector - CSS selector
   * @param {Element} parent - Parent element (optional)
   * @returns {Element|null}
   */
  $(selector, parent = document) {
    return parent.querySelector(selector);
  },

  /**
   * Query multiple elements
   * @param {string} selector - CSS selector
   * @param {Element} parent - Parent element (optional)
   * @returns {NodeList}
   */
  $$(selector, parent = document) {
    return parent.querySelectorAll(selector);
  },

  /**
   * Create element
   * @param {string} tag - HTML tag
   * @param {Object} attrs - Attributes
   * @param {string} html - Inner HTML (optional)
   * @returns {Element}
   */
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

  /**
   * Show/hide element
   * @param {Element} el - Element
   * @param {boolean} show - Show or hide
   */
  toggle(el, show) {
    el.style.display = show ? '' : 'none';
  },

  /**
   * Add class
   * @param {Element} el - Element
   * @param {string} className - Class name
   */
  addClass(el, className) {
    el.classList.add(className);
  },

  /**
   * Remove class
   * @param {Element} el - Element
   * @param {string} className - Class name
   */
  removeClass(el, className) {
    el.classList.remove(className);
  },

  /**
   * Toggle class
   * @param {Element} el - Element
   * @param {string} className - Class name
   */
  toggleClass(el, className) {
    el.classList.toggle(className);
  },

  /**
   * Remove element
   * @param {Element} el - Element
   */
  remove(el) {
    el?.remove();
  },

  /**
   * Clear element children
   * @param {Element} el - Element
   */
  empty(el) {
    el.innerHTML = '';
  },
};

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validation Helper
 */
const Validate = {
  /**
   * Validate email
   * @param {string} email - Email to validate
   * @returns {boolean}
   */
  email(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  /**
   * Validate phone
   * @param {string} phone - Phone to validate
   * @returns {boolean}
   */
  phone(phone) {
    const regex = /^\+?[0-9]{9,15}$/;
    return regex.test(phone);
  },

  /**
   * Validate required field
   * @param {string} value - Value to validate
   * @returns {boolean}
   */
  required(value) {
    return value && value.trim().length > 0;
  },

  /**
   * Validate minimum length
   * @param {string} value - Value to validate
   * @param {number} min - Minimum length
   * @returns {boolean}
   */
  minLength(value, min) {
    return value && value.length >= min;
  },

  /**
   * Validate maximum length
   * @param {string} value - Value to validate
   * @param {number} max - Maximum length
   * @returns {boolean}
   */
  maxLength(value, max) {
    return !value || value.length <= max;
  },
};

// ============================================
// UI UTILITIES
// ============================================

/**
 * Show toast notification
 * @param {string} message - Message to show
 * @param {string} type - Type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in ms
 */
function showToast(message, type = 'info', duration = 3000) {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = DOM.create('div', {
    class: `toast toast-${type}`,
  }, message);

  document.body.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Show loading spinner
 * @param {Element} container - Container element
 * @param {boolean} show - Show or hide
 */
function showLoading(container, show = true) {
  const spinner = container.querySelector('.loading-spinner');
  
  if (show && !spinner) {
    const el = DOM.create('div', {
      class: 'loading-spinner',
    }, '<span></span><span></span><span></span>');
    container.appendChild(el);
  } else if (!show && spinner) {
    spinner.remove();
  }
}

// ============================================
// EXPORT
// ============================================

window.Utils = {
  formatPrice,
  formatDate,
  formatTime,
  truncateText,
  Storage,
  DOM,
  Validate,
  showToast,
  showLoading,
};