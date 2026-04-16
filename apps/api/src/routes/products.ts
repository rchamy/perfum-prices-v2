import { Router } from 'express'
import { supabase } from '../db/supabase'

const router = Router()

// GET /products — search + filter
router.get('/', async (req, res) => {
  const { q, brand, family, gender, minPrice, maxPrice, store, sort = 'name', page = '1', limit = '20' } = req.query

  const offset = (Number(page) - 1) * Number(limit)

  let query = supabase
    .from('product_best_prices')
    .select('*', { count: 'exact' })
    .range(offset, offset + Number(limit) - 1)

  if (q) {
    query = query.ilike('product_name', `%${q}%`)
  }

  if (gender) {
    query = query.eq('gender', gender)
  }

  if (sort === 'discount_desc') {
    query = query.order('max_discount_pct', { ascending: false })
  } else {
    query = query.order('product_name', { ascending: true })
  }

  const { data, error, count } = await query

  if (error) return res.status(500).json({ error: error.message })

  res.json({ data, total: count, page: Number(page), limit: Number(limit) })
})

// GET /products/:id — detail
router.get('/:id', async (req, res) => {
  const { id } = req.params

  const { data: product, error: productError } = await supabase
    .from('products')
    .select(`
      id, name, gender, description, image_url,
      brands ( name ),
      product_notes (
        note_type,
        olfactive_notes ( name, olfactive_families ( name ) )
      )
    `)
    .eq('id', id)
    .single()

  if (productError || !product) return res.status(404).json({ error: 'Product not found' })

  // Get current prices
  const { data: prices } = await supabase
    .from('store_products')
    .select(`
      product_url,
      stores ( id, name, logo_url ),
      prices (
        price_normal, price_discounted, payment_method, discount_label, captured_at
      )
    `)
    .eq('product_id', id)
    .eq('is_active', true)
    .limit(1, { foreignTable: 'prices' })
    .order('captured_at', { foreignTable: 'prices', ascending: false })

  // Get historical min price
  const { data: minPrice } = await supabase.rpc('get_min_historical_price', { p_product_id: id })

  res.json({ product, prices, min_historical_price: minPrice })
})

export default router
