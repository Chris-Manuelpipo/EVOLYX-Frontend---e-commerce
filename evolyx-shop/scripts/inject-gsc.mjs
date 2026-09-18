#!/usr/bin/env node
/**
 * Injecte la meta Google Search Console dans les pages publiques (build Vercel).
 * Env : EVOLYX_GSC_VERIFICATION = jeton sans le préfixe google-site-verification=
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const token = (process.env.EVOLYX_GSC_VERIFICATION || '').trim();
const placeholder = '<!-- gsc -->';

const meta =
  token && /^[A-Za-z0-9_-]+$/.test(token)
    ? `<meta name="google-site-verification" content="${token}" />`
    : '';

const htmlFiles = readdirSync(root).filter((name) => name.endsWith('.html'));

for (const file of htmlFiles) {
  const path = join(root, file);
  let html = readFileSync(path, 'utf8');
  if (!html.includes(placeholder)) continue;
  html = html.replace(placeholder, meta);
  writeFileSync(path, html, 'utf8');
  console.log(`${file}: GSC ${meta ? 'injecté' : 'retiré'}`);
}
