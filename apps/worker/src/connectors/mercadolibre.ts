import axios from 'axios'
import type { ScrapeResult } from './scraper'

const ML_API_BASE = 'https://api.mercadolibre.com'
const ML_SITE = 'MLC' // Chile

export async function fetchMercadoLibrePerfumes(
  queryParams: Record<string, string> = {},
): Promise<ScrapeResult[]> {
  const params = {
    site_id: ML_SITE,
    q: 'perfume',
    category: 'MLC1051', // Perfumes & Fragancias
    limit: '50',
    ...queryParams,
  }

  const { data } = await axios.get(`${ML_API_BASE}/sites/${ML_SITE}/search`, {
    params,
    timeout: 15_000,
  })

  return (data.results ?? []).map((item: any): ScrapeResult => ({
    product_name: item.title ?? null,
    price_normal: item.original_price ?? item.price ?? null,
    price_discounted: item.original_price && item.price < item.original_price ? item.price : null,
    payment_method: null,
    product_url: item.permalink ?? null,
    image_url: item.thumbnail ?? null,
    brand: extractBrandFromAttributes(item.attributes),
  }))
}

function extractBrandFromAttributes(attributes: any[]): string | null {
  if (!Array.isArray(attributes)) return null
  const brandAttr = attributes.find((a: any) => a.id === 'BRAND')
  return brandAttr?.value_name ?? null
}
