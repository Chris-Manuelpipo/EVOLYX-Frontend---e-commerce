/**
 * Thème clair / sombre / système.
 * Clé localStorage : evolyx-theme (même que evolyx.cm, pour un futur domaine partagé).
 * Valeurs : 'light' | 'dark' ; absence = système (prefers-color-scheme).
 */
(function evolyxTheme() {
  const KEY = 'evolyx-theme';
  const OPTIONS = [
    { value: 'system', icon: 'fa-desktop', label: 'Système' },
    { value: 'light', icon: 'fa-sun', label: 'Clair' },
    { value: 'dark', icon: 'fa-moon', label: 'Sombre' },
  ];

  function readStored() {
    try {
      const value = localStorage.getItem(KEY);
      return value === 'light' || value === 'dark' ? value : 'system';
    } catch {
      return 'system';
    }
  }

  function resolve(preference) {
    if (preference === 'light' || preference === 'dark') return preference;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function syncThemeColor(resolved) {
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    const color = resolved === 'dark' ? 'oklch(0.18 0.012 85)' : 'oklch(0.968 0.01 91)';
    if (meta) meta.setAttribute('content', color);
  }

  function apply(preference) {
    const root = document.documentElement;
    root.classList.add('theme-switching');

    if (preference === 'light' || preference === 'dark') {
      root.setAttribute('data-theme', preference);
    } else {
      root.removeAttribute('data-theme');
    }

    try {
      if (preference === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, preference);
    } catch {
      /* mode privé */
    }

    syncThemeColor(resolve(preference));
    document.querySelectorAll('.theme-toggle').forEach(syncToggle);
    window.setTimeout(() => root.classList.remove('theme-switching'), 90);
    window.dispatchEvent(new CustomEvent('evolyx-theme-change', { detail: { preference, resolved: resolve(preference) } }));
  }

  function markup() {
    return `
      <div class="theme-toggle" role="radiogroup" aria-label="Thème d’affichage">
        ${OPTIONS.map(
          (opt) => `
          <button type="button" class="theme-toggle-btn" role="radio"
                  data-theme-value="${opt.value}"
                  aria-label="${opt.label}" title="${opt.label}">
            <i class="fas ${opt.icon}" aria-hidden="true"></i>
          </button>`
        ).join('')}
      </div>`;
  }

  function syncToggle(group) {
    const current = readStored();
    group.querySelectorAll('[data-theme-value]').forEach((btn) => {
      const on = btn.getAttribute('data-theme-value') === current;
      btn.setAttribute('aria-checked', String(on));
      btn.classList.toggle('is-active', on);
    });
  }

  function bind(scope) {
    const root = scope || document;
    root.querySelectorAll('.theme-toggle').forEach((group) => {
      if (group.dataset.bound === '1') {
        syncToggle(group);
        return;
      }
      group.dataset.bound = '1';
      group.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-theme-value]');
        if (!btn) return;
        apply(btn.getAttribute('data-theme-value'));
      });
      syncToggle(group);
    });
  }

  function mount(container) {
    if (!container) return;
    container.insertAdjacentHTML('beforeend', markup());
    bind(container);
  }

  window.EvolyxTheme = { KEY, readStored, resolve, apply, markup, bind, mount };

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', () => {
    if (readStored() === 'system') apply('system');
  });

  document.addEventListener('DOMContentLoaded', () => {
    const slot = document.getElementById('theme-slot');
    if (slot) mount(slot);
  });
})();
