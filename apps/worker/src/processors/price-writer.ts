import { supabase } from '../db/supabase'
import type { ScrapeResult } from '../connectors/scraper'
import { evaluateAlerts } from './alert-evaluator'

export async function writePrices(
  storeId: string,
  results: ScrapeResult[],
  storeMethod: 'scraper' | 'api' = 'scraper',
) {
  for (const result of results) {
    if (!result.product_url) continue

    // If price_normal is missing but a discounted price was captured (e.g. Shopify
    // only shows the sale price element), treat it as the normal price.
    if (result.price_normal === null && result.price_discounted !== null) {
      result.price_normal = result.price_discounted
      result.price_discounted = null
    }

    if (result.price_normal === null) continue

    let sp = await findStoreProduct(storeId, result.product_url)

    if (!sp) {
      if (storeMethod === 'api' && result.product_name) {
        // MercadoLibre: auto-create full product hierarchy
        sp = await createProductHierarchy(storeId, result)
      } else {
        // Scraper: URL was discovered but store_product doesn't exist yet — skip
        continue
      }
    }

    if (!sp) continue

    // If product is still a placeholder, fill in real data from scrape
    await enrichProductIfPlaceholder(sp.product_id, result)

    // Write price
    await supabase.from('prices').insert({
      store_product_id: sp.id,
      price_normal: result.price_normal,
      price_discounted: result.price_discounted ?? null,
      payment_method: result.payment_method ?? null,
      currency: 'CLP',
      captured_at: new Date().toISOString(),
    })

    await supabase
      .from('store_products')
      .update({ last_scraped_at: new Date().toISOString() })
      .eq('id', sp.id)

    const effectivePrice = result.price_discounted ?? result.price_normal
    await evaluateAlerts(sp.product_id, storeId, effectivePrice)
  }

  try { await supabase.rpc('refresh_product_best_prices') } catch { /* ignore */ }
}

// ─── Upsert a discovered URL into store_products (called from scheduler) ─────

export async function upsertDiscoveredUrl(storeId: string, productUrl: string): Promise<void> {
  const { data: existing } = await supabase
    .from('store_products')
    .select('id')
    .eq('store_id', storeId)
    .eq('product_url', productUrl)
    .maybeSingle()

  if (existing) return // already tracked

  try {
    // Placeholder brand + product (will be enriched on first scrape)
    const { data: brand } = await supabase
      .from('brands')
      .upsert({ name: 'Sin marca' }, { onConflict: 'name' })
      .select('id')
      .single()

    if (!brand) return

    // Use URL path slug as placeholder name so each product has a unique name
    const parsedUrl = new URL(productUrl)
    const slug = parsedUrl.pathname.replace(/^\/+|\/+$/g, '').split('/').pop() ?? parsedUrl.hostname
    const placeholderName = `Pendiente (${slug})`
    const { data: product } = await supabase
      .from('products')
      .upsert({ name: placeholderName, brand_id: brand.id, gender: 'unisex' }, { onConflict: 'name,brand_id' })
      .select('id')
      .single()

    if (!product) return

    await supabase.from('store_products').insert({
      store_id: storeId,
      product_id: product.id,
      product_url: productUrl,
      is_active: true,
    })
  } catch (err) {
    console.error('[PriceWriter] upsertDiscoveredUrl error:', err)
  }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function findStoreProduct(storeId: string, productUrl: string) {
  const { data } = await supabase
    .from('store_products')
    .select('id, product_id')
    .eq('store_id', storeId)
    .eq('product_url', productUrl)
    .maybeSingle()
  return data ?? null
}

async function enrichProductIfPlaceholder(productId: string, result: ScrapeResult) {
  if (!result.product_name) return

  const { data: existing } = await supabase
    .from('products')
    .select('id, name, image_url')
    .eq('id', productId)
    .single()

  if (!existing) return

  // Always update if still a placeholder; otherwise only update missing image_url
  const isPlaceholder = existing.name.startsWith('Pendiente (')
  if (!isPlaceholder && existing.image_url) return

  let brandId: string | null = null
  if (result.brand && isPlaceholder) {
    const { data: brand } = await supabase
      .from('brands')
      .upsert({ name: result.brand }, { onConflict: 'name' })
      .select('id')
      .single()
    brandId = brand?.id ?? null
  }

  const update: any = { updated_at: new Date().toISOString() }
  if (isPlaceholder) { update.name = result.product_name; if (brandId) update.brand_id = brandId }
  if (result.image_url && !existing.image_url) update.image_url = result.image_url

  await supabase.from('products').update(update).eq('id', productId)
}

async function createProductHierarchy(storeId: string, result: ScrapeResult) {
  try {
    const { data: brand } = await supabase
      .from('brands')
      .upsert({ name: result.brand ?? 'Sin marca' }, { onConflict: 'name' })
      .select('id')
      .single()

    if (!brand) return null

    const { data: product } = await supabase
      .from('products')
      .upsert(
        { name: result.product_name!, brand_id: brand.id, image_url: result.image_url ?? null, gender: 'unisex' },
        { onConflict: 'name,brand_id' },
      )
      .select('id')
      .single()

    if (!product) return null

    const { data: sp } = await supabase
      .from('store_products')
      .insert({ store_id: storeId, product_id: product.id, product_url: result.product_url!, is_active: true })
      .select('id, product_id')
      .single()

    return sp ?? null
  } catch (err) {
    console.error('[PriceWriter] createProductHierarchy error:', err)
    return null
  }
}
