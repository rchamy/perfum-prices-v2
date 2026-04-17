import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

async function probeListing(browser, url, label, productPattern) {
  console.log(`\n=== ${label} LISTING: ${url} ===`);
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const info = await page.evaluate((pattern) => {
      const re = new RegExp(pattern);
      const cards = Array.from(document.querySelectorAll('li,article,[class*="product"],[class*="card"]'))
        .filter(el => {
          const cls = el.className || '';
          return (cls.includes('product') || cls.includes('card')) && el.querySelector('a,img') && el.children.length < 15;
        }).slice(0,4).map(el => ({ tag: el.tagName, classes: el.className.substring(0,80) }));
      const links = Array.from(document.querySelectorAll('a[href]')).filter(a => re.test(a.href)).slice(0,5).map(a => ({
        href: a.href.substring(0,90), cls: a.className.substring(0,50), parentCls: a.parentElement?.className?.substring(0,60)||''
      }));
      const next = document.querySelector('a[rel="next"]')?.href;
      return { cards, links, next };
    }, productPattern);
    console.log('Cards:'); info.cards.forEach(c => console.log(`  [${c.tag}] "${c.classes}"`));
    console.log('Links:'); info.links.forEach(l => console.log(`  ${l.href} | cls:"${l.cls}" parent:"${l.parentCls}"`));
    console.log('Next:', info.next||'none');
  } catch(e) { console.log('ERROR:', e.message); } finally { await page.close(); }
}

async function probeProductPage(browser, url, label) {
  console.log(`\n=== ${label} PRODUCT PAGE: ${url} ===`);
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const info = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.textContent?.trim().substring(0,80);
      const priceEls = Array.from(document.querySelectorAll('*')).filter(el => {
        const t = el.textContent||'';
        return /\$[\d.,]{3,}/.test(t) && el.children.length < 3 && t.length < 80;
      }).slice(0,8).map(el => ({ tag: el.tagName, cls: el.className.substring(0,70), id: el.id, text: el.textContent.trim().substring(0,60) }));
      const metaPrices = Array.from(document.querySelectorAll('meta')).filter(m => {
        const n = m.getAttribute('name')||m.getAttribute('property')||'';
        return n.includes('price')||n.includes('amount');
      }).map(m => ({ name: m.getAttribute('name')||m.getAttribute('property'), content: m.getAttribute('content') }));
      const brand = document.querySelector('.product-vendor,.product__vendor,[class*="brand"],[class*="vendor"]')?.textContent?.trim().substring(0,60);
      const img = document.querySelector('img.product-image, .product__media img, .product img')?.getAttribute('src')?.substring(0,90);
      const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content')?.substring(0,90);
      return { h1, priceEls, metaPrices, brand, img, ogImg };
    });
    console.log('H1:', info.h1);
    console.log('Price els:'); info.priceEls.forEach(p => console.log(`  [${p.tag}#${p.id||''}.${p.cls.split(' ')[0]}] "${p.text}"`));
    console.log('Meta prices:', JSON.stringify(info.metaPrices));
    console.log('Brand:', info.brand);
    console.log('Img:', info.img||info.ogImg);
  } catch(e) { console.log('ERROR:', e.message); } finally { await page.close(); }
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  
  // SAIRAM listing
  await probeListing(browser, 'https://sairam.cl/perfume', 'SAIRAM', 'sairam\\.cl/perfume-');
  await probeProductPage(browser, 'https://sairam.cl/perfume-boss-femme-dama-edp-30-ml', 'SAIRAM');
  
  // Multimarcas (Shopify)
  await probeListing(browser, 'https://www.multimarcasperfumes.cl/perfumes', 'Multimarcas', '/products/');
  await probeProductPage(browser, 'https://multimarcasperfumes.cl/collections/all/products/1-million-edt-100-ml-pac', 'Multimarcas');
  
  // Alisha (try PrestaShop category URLs)
  await probeListing(browser, 'https://www.alishaperfumes.cl/17-perfumes', 'Alisha cat17', 'alishaperfumes\\.cl/perfumes/');
  await probeListing(browser, 'https://www.alishaperfumes.cl/3-perfumes', 'Alisha cat3', 'alishaperfumes\\.cl/perfumes/');
  
  await browser.close();
  process.exit(0);
})();
