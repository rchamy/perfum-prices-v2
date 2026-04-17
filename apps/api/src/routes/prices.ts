import { Router } from 'express'
import { supabase } from '../db/supabase'

const router = Router()

// GET /prices/:productId/current
router.get('/:productId/current', async (req, res) => {
  const { productId } = req.params

  const { data, error } = await supabase
    .from('store_products')
    .select(`
      product_url,
      stores ( id, name, logo_url ),
      prices (
        price_normal, price_discounted, payment_method, discount_label, captured_at
      )
    `)
    .eq('product_id', productId)
    .eq('is_active', true)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ data })
})

// GET /prices/:productId/history?range=30d&stores=id1,id2
router.get('/:productId/history', async (req, res) => {
  const { productId } = req.params
  const { range = '30d', stores } = req.query

  const INTERVAL_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
  const days = INTERVAL_DAYS[range as string] ?? 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let spQuery = supabase
    .from('store_products')
    .select('id, store_id, stores ( name )')
    .eq('product_id', productId)
    .eq('is_active', true)

  if (stores) {
    spQuery = spQuery.in('store_id', (stores as string).split(','))
  }

  const { data: storeProducts, error: spError } = await spQuery
  if (spError) return res.status(500).json({ error: spError.message })
  if (!storeProducts?.length) return res.json({ data: [] })

  const ids = storeProducts.map((sp: any) => sp.id)

  const { data: allPrices, error: pricesError } = await supabase
    .from('prices')
    .select('store_product_id, captured_at, price_normal, price_discounted')
    .in('store_product_id', ids)
    .gte('captured_at', since)
    .order('captured_at', { ascending: true })

  if (pricesError) return res.status(500).json({ error: pricesError.message })

  const pricesByStore = new Map<string, any[]>()
  for (const p of allPrices ?? []) {
    const list = pricesByStore.get(p.store_product_id) ?? []
    list.push({ date: p.captured_at, price: p.price_discounted ?? p.price_normal })
    pricesByStore.set(p.store_product_id, list)
  }

  const result = storeProducts.map((sp: any) => ({
    store_id: sp.store_id,
    store_name: sp.stores?.name,
    data: pricesByStore.get(sp.id) ?? [],
  }))

  res.json({ data: result })
})

export default router
