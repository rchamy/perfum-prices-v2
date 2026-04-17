import { Router } from 'express'
import { supabase } from '../db/supabase'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()

router.use(authenticate)

// GET /favorites
router.get('/', async (req: AuthRequest, res) => {
  const { data: favs, error } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  if (!favs?.length) return res.json({ data: [] })

  const ids = favs.map((f) => f.product_id)

  const { data: products, error: pErr } = await supabase
    .from('product_best_prices')
    .select('id, name, brand, image_url, best_price, best_price_discounted, best_store, max_discount_pct')
    .in('id', ids)

  if (pErr) return res.status(500).json({ error: pErr.message })

  const data = ids.map((id) => {
    const p = products?.find((p) => p.id === id) as Record<string, unknown> | undefined ?? {}
    return {
      product_id: id,
      product_name: p['name'] ?? null,
      brand_name: p['brand'] ?? null,
      image_url: p['image_url'] ?? null,
      best_price: p['best_price'] ?? null,
      best_price_discounted: p['best_price_discounted'] ?? null,
      best_store: p['best_store'] ?? null,
      max_discount_pct: p['max_discount_pct'] ?? null,
    }
  })

  res.json({ data })
})

// POST /favorites
router.post('/', async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('favorites')
    .insert({ product_id: req.body.product_id, user_id: req.userId })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json({ data })
})

// DELETE /favorites/:productId
router.delete('/:productId', async (req: AuthRequest, res) => {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('product_id', req.params.productId)
    .eq('user_id', req.userId!)

  if (error) return res.status(400).json({ error: error.message })
  res.status(204).send()
})

export default router
