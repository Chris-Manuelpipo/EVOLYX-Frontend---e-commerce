# Référencement — shop.evolyx.cm

Aligné sur [evolyx-digital](https://www.evolyx.cm) : métadonnées, `robots.txt`, `sitemap.xml`, `llms.txt`, JSON-LD, consentement cookies, GA4.

## Google Analytics 4

1. Dans [Google Analytics](https://analytics.google.com), créez un **flux Web** pour `https://shop.evolyx.cm` (même propriété GA4 que evolyx.cm ou propriété dédiée).
2. Copiez l’ID de mesure (`G-XXXXXXXX`).
3. **Production** : avant le chargement de `js/config.js`, vous pouvez définir `window.EVOLYX_GA_MEASUREMENT_ID = 'G-…';` ou modifier `GA_MEASUREMENT_ID` dans `js/config.js` au déploiement.
4. Le script ne se charge qu’**après acceptation** du bandeau cookies, uniquement sur `shop.evolyx.cm`.

## Google Search Console

**Recommandé (comme evolyx.cm)** : propriété **Domaine** `evolyx.cm` avec enregistrement **TXT** DNS — couvre `shop.evolyx.cm` sans meta supplémentaire.

**Alternative** : propriété **Préfixe d’URL** `https://shop.evolyx.cm/` :

1. Récupérez le jeton de vérification HTML.
2. Sur Vercel (projet shop), variable d’environnement `EVOLYX_GSC_VERIFICATION` = le jeton seul (sans `google-site-verification=`).
3. Commande de build : `node scripts/inject-gsc.mjs && node scripts/generate-sitemap.mjs`

Ensuite : Search Console → Sitemaps → `https://shop.evolyx.cm/sitemap.xml`

## Sitemap produits

```bash
cd evolyx-shop
node scripts/generate-sitemap.mjs
```

À lancer après ajout/suppression de produits (CI ou manuellement avant deploy).

## Checklist post-déploiement

- [ ] Inspecter l’URL d’accueil dans Search Console
- [ ] Tester le bandeau cookies + événement page_view dans GA4 (Temps réel)
- [ ] [Rich Results Test](https://search.google.com/test/rich-results) sur une fiche produit chargée
- [ ] Vérifier `https://shop.evolyx.cm/robots.txt` et `llms.txt`
