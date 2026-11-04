import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { createSitemap, getSalonSlugs } from './sitemap.mjs';

const template = await readFile('dist/index.html', 'utf8');
// Keep the original SPA shell for all routes other than the marketing homepage.
await writeFile('dist/spa.html', template);

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
let markup;
let publicPaths;
let origin, structuredData, brand;
try {
  const { renderHome } = await vite.ssrLoadModule('/src/prerender.tsx');
  markup = renderHome();
  ({ PUBLIC_PATHS: publicPaths } = await vite.ssrLoadModule('/src/publicPaths.ts'));
  const metadata = await vite.ssrLoadModule('/src/homeMetadata.ts');
  origin = metadata.SITE_ORIGIN;
  structuredData = metadata.homeStructuredData();
  ({ DEFAULT_WHITE_LABEL_CONFIG: brand } = await vite.ssrLoadModule('/src/data/whiteLabelConfig.ts'));
} finally {
  await vite.close();
}

const head = `    <link rel="canonical" href="${brand.domainSeo.canonicalUrl}" />
    <meta property="og:url" content="${origin}/" />
    <meta property="og:image" content="${new URL(brand.domainSeo.ogImageUrl || brand.heroImage, origin).href}" />
    <script id="home-structured-data" type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>
`;
await writeFile('dist/index.html', template.replace('</head>', `${head}  </head>`).replace('<div id="root"></div>', `<div id="root">${markup}</div>`));

const slugs = await getSalonSlugs(origin);
await writeFile('dist/sitemap.xml', createSitemap(origin, publicPaths, slugs));
console.log(`[sitemap] Included ${slugs.length} published salon profiles.`);
