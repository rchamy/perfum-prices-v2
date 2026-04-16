import { Router } from 'express'
import { supabase } from '../db/supabase'

const router = Router()

const RANGE_INTERVALS: Record<string, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  '1y': '1 year',
}

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

  const interval = RANGE_INTERVALS[range as string] ?? '30 days'

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

  const result = await Promise.all(
    (storeProducts ?? []).map(async (sp: any) => {
      const { data: priceData } = await supabase
        .from('prices')
        .select('captured_at, price_normal, price_discounted')
        .eq('store_product_id', sp.id)
        .gte('captured_at', `now() - interval '${interval}'`)
        .order('captured_at', { ascending: true })

      return {
        store_id: sp.store_id,
        store_name: sp.stores?.name,
        data: (priceData ?? []).map((p: any) => ({
          date: p.captured_at,
          price: p.price_discounted ?? p.price_normal,
        })),
      }
    }),
  )

  res.json({ data: result })
})

export default router
