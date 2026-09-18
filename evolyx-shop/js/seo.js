/**
 * SEO / mesure d’audience EVOLYX Shop (aligné sur evolyx-digital).
 * GA4 uniquement après consentement, domaine prod shop.evolyx.cm.
 */
(function seoModule(global) {
  const STORAGE_KEY = 'evolyx-analytics-consent';
  const CONSENT_EVENT = 'evolyx-consent-change';

  function getConfig() {
    return global.EVOLYX_CONFIG || {};
  }

  function getGaId() {
    const cfg = getConfig();
    return (global.EVOLYX_GA_MEASUREMENT_ID || cfg.GA_MEASUREMENT_ID || '').trim();
  }

  function getAnalyticsConsent() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      if (value === 'granted' || value === 'denied') return value;
    } catch (e) {
      /* stockage indisponible */
    }
    return 'unset';
  }

  function setAnalyticsConsent(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      /* ignore */
    }
    global.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  }

  function isLiveSiteHost() {
    const host = global.location && global.location.hostname;
    return host === 'shop.evolyx.cm';
  }

  let gaLoadPromise = null;

  function loadGoogleAnalytics() {
    const gaId = getGaId();
    if (!gaId || !isLiveSiteHost() || getAnalyticsConsent() !== 'granted') {
      return Promise.resolve(false);
    }
    if (typeof global.gtag === 'function') return Promise.resolve(true);
    if (gaLoadPromise) return gaLoadPromise;

    gaLoadPromise = new Promise((resolve) => {
      global.dataLayer = global.dataLayer || [];
      global.gtag = function gtag() {
        global.dataLayer.push(arguments);
      };
      global.gtag('js', new Date());
      global.gtag('config', gaId, { anonymize_ip: true, send_page_view: false });

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });

    return gaLoadPromise;
  }

  function trackPageView() {
    if (getAnalyticsConsent() !== 'granted' || typeof global.gtag !== 'function') return;
    global.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: global.location.href,
      page_path: `${global.location.pathname}${global.location.search}`,
    });
  }

  function cookieBannerHTML() {
    return `
      <div class="cookie-banner" id="cookieBanner" role="dialog" aria-labelledby="cookieBannerTitle" aria-describedby="cookieBannerDesc" hidden>
        <div class="cookie-banner-inner container">
          <div class="cookie-banner-text">
            <p id="cookieBannerTitle" class="cookie-banner-title">Cookies et mesure d’audience</p>
            <p id="cookieBannerDesc" class="cookie-banner-desc">
              Nous utilisons des cookies strictement nécessaires au fonctionnement de la boutique et, avec votre accord,
              Google Analytics pour comprendre l’usage du site. Vous pouvez refuser la mesure d’audience.
              <a href="confidentialite.html">Politique de confidentialité</a>
            </p>
          </div>
          <div class="cookie-banner-actions">
            <button type="button" class="btn btn-secondary" id="cookieRefuse">Refuser</button>
            <button type="button" class="btn btn-primary" id="cookieAccept">Accepter</button>
          </div>
        </div>
      </div>`;
  }

  function mountCookieBanner() {
    if (!isLiveSiteHost()) return;
    if (document.getElementById('cookieBanner')) return;

    document.body.insertAdjacentHTML('beforeend', cookieBannerHTML());
    const banner = document.getElementById('cookieBanner');
    const acceptBtn = document.getElementById('cookieAccept');
    const refuseBtn = document.getElementById('cookieRefuse');

    function hideBanner() {
      if (banner) banner.hidden = true;
    }

    function showBanner() {
      if (banner) {
        banner.hidden = false;
        acceptBtn && acceptBtn.focus();
      }
    }

    if (getAnalyticsConsent() === 'unset') showBanner();
    else hideBanner();

    global.addEventListener(CONSENT_EVENT, () => {
      if (getAnalyticsConsent() !== 'unset') hideBanner();
    });

    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        setAnalyticsConsent('granted');
        loadGoogleAnalytics().then(() => trackPageView());
        hideBanner();
      });
    }
    if (refuseBtn) {
      refuseBtn.addEventListener('click', () => {
        setAnalyticsConsent('denied');
        hideBanner();
      });
    }
  }

  function initPublicSite() {
    if (/(\/admin(?:\/|$)|login\.html)/.test(global.location.pathname)) return;

    mountCookieBanner();

    if (getAnalyticsConsent() === 'granted') {
      loadGoogleAnalytics().then(() => trackPageView());
    }

    global.addEventListener(CONSENT_EVENT, (event) => {
      if (event.detail === 'granted') loadGoogleAnalytics().then(() => trackPageView());
    });
  }

  global.EvolyxSeo = {
    getAnalyticsConsent,
    setAnalyticsConsent,
    loadGoogleAnalytics,
    trackPageView,
    initPublicSite,
  };
})(window);
