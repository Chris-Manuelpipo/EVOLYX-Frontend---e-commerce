/**
 * Configuration front EVOLYX Shop
 * Surcharge API : window.EVOLYX_API_BASE = 'https://…/api' avant ce script.
 * Prod HTTPS : défaut Vercel (apievolyxcm). En local : localhost:5000.
 */
(function initEvolyxConfig(global) {
  function resolveApiBase() {
    if (global.EVOLYX_API_BASE) return String(global.EVOLYX_API_BASE).replace(/\/$/, '');

    const host = global.location ? global.location.hostname : '';
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return 'https://apievolyxcm.vercel.app/api';
  }

  function resolveAsset(relativePath) {
    const path = (global.location && global.location.pathname) || '';
    const inAdmin = /\/admin(?:\/|$)/.test(path);
    return (inAdmin ? '../' : '') + String(relativePath).replace(/^\//, '');
  }

  const WHATSAPP_NUMBER = '237654804907';

  global.EVOLYX_CONFIG = {
    API_BASE_URL: resolveApiBase(),
    WHATSAPP_NUMBER,
    WHATSAPP_URL: 'https://wa.me/' + WHATSAPP_NUMBER,
    EMAIL: 'evolyxcmr@gmail.com',
    PHONE_DISPLAY: '+237 6 54 80 49 07',
    PHONE_TEL: '+237654804907',
    GROUP_URL: 'https://evolyx.cm',
    SHOP_URL: 'https://shop.evolyx.cm',
    CANONICAL: 'https://shop.evolyx.cm',
    CITY: 'Yaoundé, Cameroun',
    /** Flux GA4 shop (surcharge : window.EVOLYX_GA_MEASUREMENT_ID avant config.js) */
    GA_MEASUREMENT_ID: global.EVOLYX_GA_MEASUREMENT_ID || 'G-XGF4RPVJHR',
    /* Même emblème que evolyx-digital (ProjectCover sans illustration) */
    PLACEHOLDER_IMAGE: resolveAsset('assets/logo.png'),
  };
})(window);
