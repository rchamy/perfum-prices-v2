import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin())

export interface StoreSelector {
  field: string
  selector: string
  selector_type: 'css' | 'xpath'
}

export interface ScrapeResult {
  product_name: string | null
  price_normal: number | null
  price_discounted: number | null
  payment_method: string | null
  product_url: string | null
  image_url: string | null
  brand: string | null
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function randomDelay() {
  return new Promise((r) => setTimeout(r, 1000 + Math.random() * 2000))
}

function parsePrice(raw: string | null): number | null {
  if (!raw) return null
  const trimmed = raw.trim()
  // Plain decimal from meta tags: "29900.0" or "29900"
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Math.round(parseFloat(trimmed))
  }
  // Chilean format: $39.990 uses . as thousands separator and , as decimal.
  // Remove everything except digits and comma, then treat comma as decimal point.
  const cleaned = trimmed.replace(/[^0-9,]/g, '').replace(',', '.')
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
      return await page.$eval(
        selector,
        (el: any) =>
          el.textContent?.trim() || el.getAttribute('content') || el.getAttribute('src') || el.getAttribute('href') || null,
      )
    } else {
      const [el] = await page.$x(selector)
      if (!el) return null
      return await page.evaluate((e: any) => e.textContent?.trim() || e.getAttribute('content') || null, el)
    }
  } catch {
    return null
  }
}

function launchBrowser() {
  return (puppeteer as any).launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
}

// ─── Scrape a single product page ────────────────────────────────────────────

export async function scrapeProduct(
  productUrl: string,
  selectors: StoreSelector[],
): Promise<ScrapeResult> {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setUserAgent(USER_AGENT)
    await page.setViewport({ width: 1280, height: 800 })
    await randomDelay()

    // Try networkidle2 first, fall back to domcontentloaded if frame detaches
    try {
      await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30_000 })
    } catch (navErr: any) {
      if (navErr.message?.includes('frame was detached') || navErr.message?.includes('Navigating frame')) {
        console.log(`[Scraper] Frame detached on ${productUrl}, retrying with domcontentloaded`)
        const page2 = await browser.newPage()
        await page2.setUserAgent(USER_AGENT)
        await page2.setViewport({ width: 1280, height: 800 })
        await page2.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
        await new Promise((r) => setTimeout(r, 3000))
        return await extractProductData(page2, productUrl, selectors)
      }
      throw navErr
    }

    return await extractProductData(page, productUrl, selectors)
  } finally {
    await browser.close()
  }
}

async function extractProductData(
  page: any,
  productUrl: string,
  selectors: StoreSelector[],
): Promise<ScrapeResult> {
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
      case 'product_name':  result.product_name = raw; break
      case 'price_normal':  result.price_normal = parsePrice(raw); break
      case 'price_discount': result.price_discounted = parsePrice(raw); break
      case 'payment_method': result.payment_method = raw; break
      case 'image_url':     result.image_url = raw; break
      case 'brand':         result.brand = raw; break
    }
  }

  return result
}

// ─── Discover product URLs from a listing/category page ──────────────────────

export async function discoverProductUrls(
  listingUrl: string,
  selectors: StoreSelector[],
  maxPages = 20,
): Promise<string[]> {
  const listItemSel     = selectors.find((s) => s.field === 'list_item')?.selector
  const listUrlSel      = selectors.find((s) => s.field === 'list_product_url')?.selector
  const nextPageSel     = selectors.find((s) => s.field === 'list_next_page')?.selector

  if (!listItemSel || !listUrlSel) {
    console.log('[Discovery] Missing list_item or list_product_url selectors — skipping')
    return []
  }

  const allUrls: string[] = []
  let currentUrl: string | null = listingUrl
  let pageCount = 0

  const browser = await launchBrowser()
  try {
    while (currentUrl && pageCount < maxPages) {
      const page = await browser.newPage()
      await page.setUserAgent(USER_AGENT)
      await page.setViewport({ width: 1280, height: 800 })

      try {
        await randomDelay()
        try {
          await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 60_000 })
        } catch (navErr: any) {
          if (navErr.message?.includes('frame was detached') || navErr.message?.includes('Navigating frame')) {
            console.log(`[Discovery] Frame detached on ${currentUrl}, retrying with domcontentloaded`)
            await page.close()
            const retryPage = await browser.newPage()
            await retryPage.setUserAgent(USER_AGENT)
            await retryPage.setViewport({ width: 1280, height: 800 })
            await retryPage.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 })
            await new Promise((r) => setTimeout(r, 5000))
            // Continue with retryPage instead — extract and move on
            const urls: string[] = await retryPage.evaluate(
              (itemSel: string, urlSel: string) => {
                return Array.from(document.querySelectorAll(itemSel))
                  .map((item) => {
                    const a = item.querySelector(urlSel) as HTMLAnchorElement | null
                    if (!a) return null
                    return a.href || a.getAttribute('href') || null
                  })
                  .filter((u): u is string => !!u)
              },
              listItemSel,
              listUrlSel,
            )
            allUrls.push(...urls)
            console.log(`[Discovery] Retry page ${pageCount + 1}: ${urls.length} products found`)
            await retryPage.close()
            currentUrl = null
            pageCount++
            continue
          }
          throw navErr
        }

        // Scroll to bottom to trigger lazy-loaded product grids
        await page.evaluate(async () => {
          await new Promise<void>((resolve) => {
            let totalHeight = 0
            const distance = 400
            const timer = setInterval(() => {
              window.scrollBy(0, distance)
              totalHeight += distance
              if (totalHeight >= document.body.scrollHeight - window.innerHeight) {
                clearInterval(timer)
                resolve()
              }
            }, 100)
          })
        })
        await new Promise((r) => setTimeout(r, 1500))

        // Extract all product URLs from this listing page
        const urls: string[] = await page.evaluate(
          (itemSel: string, urlSel: string) => {
            return Array.from(document.querySelectorAll(itemSel))
              .map((item) => {
                const a = item.querySelector(urlSel) as HTMLAnchorElement | null
                if (!a) return null
                return a.href || a.getAttribute('href') || null
              })
              .filter((u): u is string => !!u)
          },
          listItemSel,
          listUrlSel,
        )

        console.log(`[Discovery] Page ${pageCount + 1} of ${currentUrl}: ${urls.length} products found`)
        allUrls.push(...urls)

        // Find next page URL
        if (nextPageSel) {
          currentUrl = await page.evaluate((sel: string) => {
            const a = document.querySelector(sel) as HTMLAnchorElement | null
            return a?.href ?? null
          }, nextPageSel)
        } else {
          currentUrl = null
        }
      } catch (err) {
        console.error(`[Discovery] Error on page ${currentUrl}:`, err)
        currentUrl = null
      } finally {
        await page.close()
      }

      pageCount++
    }
  } finally {
    await browser.close()
  }

  // Deduplicate and filter same-origin URLs (normalize www. prefix)
  const listingHostname = new URL(listingUrl).hostname.replace(/^www\./, '')
  const unique = [...new Set(allUrls)].filter((u) => {
    try {
      return new URL(u).hostname.replace(/^www\./, '') === listingHostname
    } catch { return false }
  })

  console.log(`[Discovery] Total unique product URLs found: ${unique.length}`)
  return unique
}

// ─── Test selectors (used by Admin UI) ───────────────────────────────────────

export async function testSelectors(
  url: string,
  selectors: Array<{ field: string; selector: string; selector_type: 'css' | 'xpath' }>,
): Promise<Array<{ field: string; value: string | null; error: string | null }>> {
  const browser = await launchBrowser()
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
