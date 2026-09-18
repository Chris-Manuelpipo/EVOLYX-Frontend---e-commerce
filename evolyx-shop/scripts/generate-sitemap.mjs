#!/usr/bin/env node
/**
 * Régénère sitemap.xml (pages statiques + fiches produit publiques).
 * Usage : node scripts/generate-sitemap.mjs
 * Env : EVOLYX_API_BASE (défaut https://apievolyxcm.vercel.app/api)
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHOP_ORIGIN = 'https://shop.evolyx.cm';
const API_BASE = (process.env.EVOLYX_API_BASE || 'https://apievolyxcm.vercel.app/api').replace(
  /\/$/,
  '',
);
const today = new Date().toISOString().slice(0, 10);

const staticPages = [
  { loc: `${SHOP_ORIGIN}/`, priority: '1.0', changefreq: 'weekly' },
  { loc: `${SHOP_ORIGIN}/catalog.html`, priority: '0.9', changefreq: 'weekly' },
  { loc: `${SHOP_ORIGIN}/order-tracking.html`, priority: '0.7', changefreq: 'monthly' },
  { loc: `${SHOP_ORIGIN}/cgv.html`, priority: '0.4', changefreq: 'yearly' },
  { loc: `${SHOP_ORIGIN}/mentions-legales.html`, priority: '0.4', changefreq: 'yearly' },
  { loc: `${SHOP_ORIGIN}/confidentialite.html`, priority: '0.4', changefreq: 'yearly' },
];

async function fetchAllProducts() {
  const products = [];
  let page = 1;
  let totalPages = 1;
  const limit = 100;

  while (page <= totalPages) {
    const url = `${API_BASE}/products?page=${page}&limit=${limit}&in_stock=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API ${res.status} ${url}`);
    const body = await res.json();
    const batch = Array.isArray(body.data) ? body.data : [];
    products.push(...batch);
    totalPages = body.totalPages || 1;
    page += 1;
  }

  return products;
}

function urlEntry({ loc, priority, changefreq, lastmod = today }) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function main() {
  let productUrls = [];
  try {
    const products = await fetchAllProducts();
    productUrls = products.map((p) => {
      const lastmod = (p.updated_at || p.created_at || today).slice(0, 10);
      return {
        loc: `${SHOP_ORIGIN}/product.html?id=${encodeURIComponent(p.id)}`,
        priority: '0.8',
        changefreq: 'weekly',
        lastmod,
      };
    });
    console.log(`Produits indexés : ${productUrls.length}`);
  } catch (err) {
    console.warn('Impossible de charger les produits (sitemap statique seulement):', err.message);
  }

  const entries = [...staticPages, ...productUrls].map(urlEntry).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;

  const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'sitemap.xml');
  writeFileSync(out, xml, 'utf8');
  console.log(`Écrit ${out}`);
}

main();
