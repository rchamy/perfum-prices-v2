import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const SAIRAM_URL = 'https://sairam.cl/perfume-azzaro-wanted-varon-edt-100-ml';
const SELECTORS = [
  { field: 'product_name', selector: 'h1' },
  // Using attribute^= to avoid colon parsing issues in CSS selectors
  { field: 'price_normal', selector: 'meta[name^="product:original_price:amount"]' },
  { field: 'price_normal_alt', selector: 'meta[property^="product:original_price:amount"]' },
  // Try with escaped colon using CSS.escape workaround - use XPath instead
  { field: 'image_url', selector: 'meta[property="og:image"]' },
];

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  console.log('Loading:', SAIRAM_URL);
  await page.goto(SAIRAM_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Check ALL meta price tags
  const allMeta = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('meta')).filter(m => {
      const n = m.getAttribute('name') || m.getAttribute('property') || '';
      return n.includes('price') || n.includes('amount');
    }).map(m => ({ name: m.getAttribute('name') || m.getAttribute('property'), content: m.getAttribute('content') }));
  });
  console.log('All price meta tags:', JSON.stringify(allMeta));
  
  for (const sel of SELECTORS) {
    try {
      const val = await page.$eval(
        sel.selector,
        (el) => el.textContent?.trim() || el.getAttribute('content') || el.getAttribute('src') || el.getAttribute('href') || null
      );
      console.log(`[${sel.field}] "${sel.selector}" => "${val}"`);
    } catch(e) {
      console.log(`[${sel.field}] "${sel.selector}" => ERROR: ${e.message}`);
    }
  }
  
  await browser.close();
  process.exit(0);
})();
