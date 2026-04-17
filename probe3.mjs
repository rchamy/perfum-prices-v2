import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  // Probe Multimarcas product page
  console.log('\n=== Multimarcas product page ===');
  await page.goto('https://multimarcasperfumes.cl/products/hawas-verde-edp-100-ml-for-men-rasasi', { waitUntil: 'networkidle2', timeout: 30000 });
  const info = await page.evaluate(() => {
    const h1 = document.querySelector('h1')?.textContent?.trim().substring(0,80);
    // All meta tags
    const allMeta = Array.from(document.querySelectorAll('meta')).map(m => ({
      name: m.getAttribute('name')||m.getAttribute('property')||'', content: m.getAttribute('content')||''
    })).filter(m => m.content && m.name);
    // Look for price in JSON-LD
    const jsonLDs = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => s.textContent?.substring(0,400));
    // Find any element with "price" class
    const priceEls = Array.from(document.querySelectorAll('[class*="price"],[data-price],[data-product-price]')).slice(0,10).map(el => ({
      tag: el.tagName, cls: el.className.substring(0,70), 
      dataPrice: el.getAttribute('data-price'),
      text: el.textContent.trim().substring(0,60)
    }));
    const brand = document.querySelector('.product__vendor, .product-vendor, [class*="vendor"]')?.textContent?.trim();
    const img = document.querySelector('meta[property="og:image"]')?.getAttribute('content')?.substring(0,90);
    return { h1, allMeta, jsonLDs, priceEls, brand, img };
  });
  console.log('H1:', info.h1);
  console.log('Brand:', info.brand);
  console.log('Price meta:', JSON.stringify(info.allMeta.filter(m => m.name.includes('price')||m.name.includes('amount'))));
  console.log('Price class els:'); info.priceEls.forEach(p => console.log(`  [${p.tag}.${p.cls.split(' ')[0]}] data-price:${p.dataPrice} text:"${p.text}"`));
  console.log('JSON-LD snippets:'); info.jsonLDs.forEach(j => console.log(' ', j?.substring(0,300)));
  console.log('Img:', info.img);
  
  await browser.close();
  process.exit(0);
})();
