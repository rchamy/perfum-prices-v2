import { supabase } from '../db/supabase'
import type { ScrapeResult } from '../connectors/scraper'
import { evaluateAlerts } from './alert-evaluator'

export async function writePrices(
  storeId: string,
  results: ScrapeResult[],
) {
  for (const result of results) {
    if (!result.product_url || result.price_normal === null) continue

    // Find or skip store_product
    const { data: sp } = await supabase
      .from('store_products')
      .select('id, product_id')
      .eq('store_id', storeId)
      .eq('product_url', result.product_url)
      .maybeSingle()

    if (!sp) continue

    await supabase.from('prices').insert({
      store_product_id: sp.id,
      price_normal: result.price_normal,
      price_discounted: result.price_discounted,
      payment_method: result.payment_method,
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

  // Refresh materialized view
  try { await supabase.rpc('refresh_product_best_prices') } catch { /* ignore */ }
}
