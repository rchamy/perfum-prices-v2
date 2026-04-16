import { supabase } from '../db/supabase'
import { sendPriceAlert } from '../services/notification'

export async function evaluateAlerts(productId: string, storeId: string, newPrice: number) {
  const { data: alerts } = await supabase
    .from('alerts')
    .select(`*, users ( email, notification_channel, telegram_chat_id )`)
    .eq('product_id', productId)
    .eq('is_active', true)
    .or(`store_id.eq.${storeId},store_id.is.null`)

  if (!alerts?.length) return

  // Get previous price to compare
  const { data: prevPriceRow } = await supabase
    .from('prices')
    .select('price_normal, price_discounted')
    .eq('store_product_id', storeId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const prevPrice = prevPriceRow?.price_discounted ?? prevPriceRow?.price_normal
  if (!prevPrice) return

  const { data: storeRow } = await supabase.from('stores').select('name').eq('id', storeId).single()
  const { data: productRow } = await supabase.from('products').select('name').eq('id', productId).single()

  const { data: storeProduct } = await supabase
    .from('store_products')
    .select('product_url')
    .eq('product_id', productId)
    .eq('store_id', storeId)
    .single()

  for (const alert of alerts) {
    let triggered = false

    if (alert.threshold_type === 'percentage') {
      const dropPct = ((prevPrice - newPrice) / prevPrice) * 100
      triggered = dropPct >= alert.threshold_value
    } else {
      triggered = newPrice <= alert.threshold_value
    }

    if (!triggered) continue

    const user = (alert as any).users
    await sendPriceAlert({
      email: user?.email ?? null,
      telegram_chat_id: user?.telegram_chat_id ?? null,
      channel: user?.notification_channel ?? 'email',
      productName: productRow?.name ?? 'Perfume',
      storeName: storeRow?.name ?? 'Tienda',
      oldPrice: prevPrice,
      newPrice,
      productUrl: storeProduct?.product_url ?? '',
    }).catch(console.error)

    await supabase
      .from('alerts')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', alert.id)
  }
}
