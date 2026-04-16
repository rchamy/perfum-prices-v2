import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
export interface StoreSelector {
  field: string
  selector: string
  selector_type: 'css' | 'xpath'
}

puppeteer.use(StealthPlugin())

export interface ScrapeResult {
  product_name: string | null
  price_normal: number | null
  price_discounted: number | null
  payment_method: string | null
  product_url: string | null
  image_url: string | null
  brand: string | null
}

function parsePrice(raw: string | null): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[^0-9,\.]/g, '').replace(',', '.')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : parsed
}

async function extractWithSelector(
  page: any,
  selector: string,
  selectorType: 'css' | 'xpath',
): Promise<string | null> {
  try {
    if (selectorType === 'css') {
      return await page.$eval(selector, (el: any) => el.textContent?.trim() ?? el.getAttribute('src') ?? el.getAttribute('href') ?? null)
    } else {
      const [el] = await page.$x(selector)
      if (!el) return null
      return await page.evaluate((e: any) => e.textContent?.trim() ?? null, el)
    }
  } catch {
    return null
  }
}

export async function scrapeProduct(
  productUrl: string,
  selectors: StoreSelector[],
): Promise<ScrapeResult> {
  const browser = await (puppeteer as any).launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    )
    await page.setViewport({ width: 1280, height: 800 })

    // Random delay to simulate human behavior
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000))

    await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30_000 })

    const result: ScrapeResult = {
      product_name: null,
      price_normal: null,
      price_discounted: null,
      payment_method: null,
      product_url: productUrl,
      image_url: null,
      brand: null,
    }

    for (const sel of selectors) {
      const raw = await extractWithSelector(page, sel.selector, sel.selector_type)
      switch (sel.field) {
        case 'product_name': result.product_name = raw; break
        case 'price_normal': result.price_normal = parsePrice(raw); break
        case 'price_discount': result.price_discounted = parsePrice(raw); break
        case 'payment_method': result.payment_method = raw; break
        case 'image_url': result.image_url = raw; break
        case 'brand': result.brand = raw; break
      }
    }

    return result
  } finally {
    await browser.close()
  }
}

export async function testSelectors(
  url: string,
  selectors: Array<{ field: string; selector: string; selector_type: 'css' | 'xpath' }>,
): Promise<Array<{ field: string; value: string | null; error: string | null }>> {
  const browser = await (puppeteer as any).launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 })

    return await Promise.all(
      selectors.map(async (s) => {
        try {
          const value = await extractWithSelector(page, s.selector, s.selector_type as any)
          return { field: s.field, value, error: null }
        } catch (err: any) {
          return { field: s.field, value: null, error: err.message }
        }
      }),
    )
  } finally {
    await browser.close()
  }
}
