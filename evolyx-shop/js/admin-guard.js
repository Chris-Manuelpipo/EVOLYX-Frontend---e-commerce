/**
 * Garde d'accès admin, exécutée avant la première peinture.
 *
 * Chargée de façon bloquante dans le <head>, avant que le squelette admin ne
 * soit peint. Les scripts admin sont en bas du <body> : sans cette garde, un
 * visiteur sans jeton voit clignoter la mise en page admin pendant quelques
 * centaines de millisecondes avant d'être redirigé.
 *
 * Ce n'est qu'un confort d'affichage. Le contrôle d'accès réel est côté
 * serveur (src/middleware/auth.js vérifie le JWT et renvoie 401), et la
 * session est validée ensuite via /admin/me dans Auth.requireAuth().
 *
 * L'attribut est posé uniquement dans le cas « pas de jeton », pour que la
 * page reste visible si ce fichier ne se charge pas : on retombe alors sur
 * l'ancien comportement plutôt que sur une page blanche définitive.
 */
(function () {
  var hasToken = false;

  try {
    hasToken = !!localStorage.getItem('adminToken');
  } catch (e) {
    /* Stockage indisponible : on traite le visiteur comme non connecté. */
  }

  if (hasToken) return;

  document.documentElement.setAttribute('data-admin-auth', 'anonymous');
  window.location.replace('../login.html');
})();
