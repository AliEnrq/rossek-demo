import { mkdir, writeFile } from 'node:fs/promises';

const slugs = ['remeron-oversized-big-gojo-v1-eqv97', 'remera-oversize-mahoraga-hzz01', 'gojov2', 'remeron-sukuna-v3-fvck-u-zr3v2', 'remera-oversize-mahoraga-v1-copia-copia-copia-copia-wnoor', 'remera-oversize-sukuna-v4-fool-1627q', 'remera-oversize-mahoraga-v2-fmimf', 'remera-oversize-jujutsu-kaisen-black-tr7lj'];
await mkdir('public/assets/products', { recursive: true });
const products = [];
for (const [index, slug] of slugs.entries()) {
  const url = `https://www.rossekgainz.com/productos/${slug}/`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const html = await response.text();
  const name = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)?.[1] || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim();
  const image = [...html.matchAll(/https:[^\s"<>]+\/products\/[^\s"<>]+(?:webp|jpg|png)/g)].map(m => m[0]).find(u => /-640-0\./.test(u));
  if (!name || !image) throw new Error(`No product metadata: ${slug}`);
  const file = `/assets/products/product-${index + 1}.webp`;
  const asset = await fetch(image);
  if (!asset.ok) throw new Error(`Image failed: ${image}`);
  await writeFile(`public${file}`, Buffer.from(await asset.arrayBuffer()));
  products.push({ name: name.replace(/ - Comprar.*$/, ''), url, image: file, sourceImage: image });
}
await writeFile('production/product-sources.json', JSON.stringify(products, null, 2));
console.log(products.map(p => ({ name: p.name, url: p.url })));
