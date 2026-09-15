/**
 * Configuration front EVOLYX Shop
 * Surcharge API : window.EVOLYX_API_BASE = 'https://…/api' avant ce script.
 * Prod HTTPS : laisser le défaut Render, ou définir EVOLYX_API_BASE sur le HTML hébergé (Vercel).
 */
(function initEvolyxConfig(global) {
  function resolveApiBase() {
    if (global.EVOLYX_API_BASE) return String(global.EVOLYX_API_BASE).replace(/\/$/, '');

    const host = global.location ? global.location.hostname : '';
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
    return 'https://evolyx-api.onrender.com/api';
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
    PLACEHOLDER_IMAGE:
      'https://res.cloudinary.com/dvnxsn73m/image/upload/v1771500491/image_placeholder_iuqezd.png',
  };
})(window);
