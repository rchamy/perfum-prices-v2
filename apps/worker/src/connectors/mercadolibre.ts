import axios from 'axios'
import type { ScrapeResult } from './scraper'

const ML_API_BASE = 'https://api.mercadolibre.com'
const ML_SITE = 'MLC' // Chile
const PAGE_SIZE = 50
const MAX_RESULTS = 500 // safety cap

export async function fetchMercadoLibrePerfumes(
  queryParams: Record<string, string> = {},
): Promise<ScrapeResult[]> {
  const baseParams = {
    site_id: ML_SITE,
    q: 'perfume',
    category: 'MLC1051', // Perfumes & Fragancias
    limit: String(PAGE_SIZE),
    ...queryParams,
  }

  const results: ScrapeResult[] = []
  let offset = 0
  let total = Infinity

  while (results.length < total && results.length < MAX_RESULTS) {
    const { data } = await axios.get(`${ML_API_BASE}/sites/${ML_SITE}/search`, {
      params: { ...baseParams, offset: String(offset) },
      timeout: 15_000,
    })

    total = data.paging?.total ?? 0

    const page: ScrapeResult[] = (data.results ?? []).map((item: any): ScrapeResult => ({
      product_name: item.title ?? null,
      price_normal: item.original_price ?? item.price ?? null,
      price_discounted: item.original_price && item.price < item.original_price ? item.price : null,
      payment_method: null,
      product_url: item.permalink ?? null,
      image_url: item.thumbnail ?? null,
      brand: extractBrandFromAttributes(item.attributes),
    }))

    if (page.length === 0) break
    results.push(...page)
    offset += PAGE_SIZE
  }

  return results
}

function extractBrandFromAttributes(attributes: any[]): string | null {
  if (!Array.isArray(attributes)) return null
  const brandAttr = attributes.find((a: any) => a.id === 'BRAND')
  return brandAttr?.value_name ?? null
}
