/**
 * Page de partage produit (/p/:id) : balises Open Graph rendues côté serveur.
 * Les robots d'aperçu (WhatsApp, Facebook…) n'exécutent pas le JS de
 * product.html, ils ont donc besoin du nom et de l'image dans le HTML brut.
 * Les visiteurs sont redirigés aussitôt vers la fiche produit.
 */

const SITE_URL = 'https://shop.evolyx.cm';
const API_BASE_URL = 'https://apievolyxcm.vercel.app/api';
const DEFAULT_IMAGE = `${SITE_URL}/assets/og-image.png`;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrice(price) {
  const num = parseFloat(price) || 0;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' }).format(num);
}

function mainImageUrl(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  const main = images.find((img) => img && img.is_main) || images[0];
  if (!main) return '';
  return typeof main === 'string' ? main : main.url || main.image_url || '';
}

// WhatsApp ignore souvent le WebP et les images lourdes : on demande à
// Cloudinary un JPEG 1200×630 (format des aperçus) sur fond blanc.
function previewImageUrl(url) {
  if (!/^https:\/\//.test(url)) return DEFAULT_IMAGE;
  const marker = '/image/upload/';
  if (!url.includes(marker)) return url;
  return url
    .replace(marker, `${marker}c_pad,b_white,w_1200,h_630,q_80/`)
    .replace(/\.(webp|png|jpe?g|avif|gif)(\?.*)?$/i, '.jpg');
}

function truncate(text, length) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > length ? `${clean.slice(0, length - 1)}…` : clean;
}

module.exports = async function handler(req, res) {
  const id = String((req.query && req.query.id) || '');
  if (!/^\d+$/.test(id)) {
    res.statusCode = 302;
    res.setHeader('Location', `${SITE_URL}/catalog.html`);
    res.end();
    return;
  }

  const productUrl = `${SITE_URL}/product.html?id=${id}`;
  const shareUrl = `${SITE_URL}/p/${id}`;

  let product = null;
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`);
    if (response.ok) {
      const body = await response.json();
      product = body && (body.data || body);
    }
  } catch (error) {
    /* API indisponible : aperçu générique, la redirection suffit */
  }

  const title = product && product.name ? `${product.name} : EVOLYX Shop` : 'EVOLYX Shop';
  const description = product
    ? truncate(`${formatPrice(product.base_price)}. ${product.description || ''}`, 200)
    : 'Boutique EVOLYX à Yaoundé. Commande confirmée par WhatsApp.';
  const image = product ? previewImageUrl(mainImageUrl(product)) : DEFAULT_IMAGE;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${escapeHtml(productUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="product">
  <meta property="og:url" content="${escapeHtml(shareUrl)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="EVOLYX Shop">
  <meta property="og:locale" content="fr_FR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <meta http-equiv="refresh" content="0; url=${escapeHtml(productUrl)}">
  <script>location.replace(${JSON.stringify(productUrl)});</script>
</head>
<body>
  <p><a href="${escapeHtml(productUrl)}">${escapeHtml(product ? product.name : 'Voir le produit')}</a></p>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
  res.end(html);
};
