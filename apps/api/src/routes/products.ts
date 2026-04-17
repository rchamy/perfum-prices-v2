import { Router } from 'express'
import { supabase } from '../db/supabase'

const router = Router()

// GET /brands — list brands that have products
router.get('/brands', async (_req, res) => {
  const { data, error } = await supabase
    .from('product_best_prices')
    .select('brand')
    .not('brand', 'is', null)
  if (error) return res.status(500).json({ error: error.message })
  const unique = [...new Set((data ?? []).map((r: any) => r.brand as string))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'))
  res.json({ data: unique })
})

// GET /products — search + filter
router.get('/', async (req, res) => {
  const {
    q,
    gender,
    store,
    brand,
    min_price,
    max_price,
    sort = 'discount_desc',
    limit = '24',
    offset: rawOffset = '0',
    page,
  } = req.query as Record<string, string>

  // Support both `offset` and legacy `page`-based pagination
  const offsetNum = page ? (Number(page) - 1) * Number(limit) : Number(rawOffset)
  const limitNum = Number(limit)

  let query = supabase
    .from('product_best_prices')
    .select('*', { count: 'exact' })
    .range(offsetNum, offsetNum + limitNum - 1)

  if (q) {
    query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
  }

  if (gender) {
    query = query.eq('gender', gender)
  }

  if (min_price) {
    query = query.gte('best_price', Number(min_price))
  }

  if (max_price) {
    query = query.lte('best_price', Number(max_price))
  }

  if (store) {
    query = query.eq('best_store_id', store)
  }

  if (brand) {
    // Support comma-separated list of brands
    const brands = brand.split(',').map(b => b.trim()).filter(Boolean)
    if (brands.length === 1) {
      query = query.eq('brand', brands[0])
    } else if (brands.length > 1) {
      query = query.in('brand', brands)
    }
  }

  if (sort === 'discount_desc') {
    query = query.order('max_discount_pct', { ascending: false, nullsFirst: false })
  } else if (sort === 'price_asc') {
    query = query.order('best_price', { ascending: true, nullsFirst: false })
  } else if (sort === 'price_desc') {
    query = query.order('best_price', { ascending: false, nullsFirst: false })
  } else if (sort === 'name_asc') {
    query = query.order('name', { ascending: true })
  } else {
    query = query.order('max_discount_pct', { ascending: false, nullsFirst: false })
  }

  const { data, error, count } = await query

  if (error) return res.status(500).json({ error: error.message })

  res.json({ data, total: count, page: page ? Number(page) : Math.floor(offsetNum / limitNum) + 1, limit: limitNum })
})

// GET /products/:id — detail (returns ProductDetail shape)
router.get('/:id', async (req, res) => {
  const { id } = req.params

  const { data: raw, error: productError } = await supabase
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

  if (productError || !raw) return res.status(404).json({ error: 'Product not found' })

  // Get current price per store (most recent price per store_product)
  const { data: storePrices } = await supabase
    .from('store_products')
    .select(`
      store_id,
      product_url,
      stores ( id, name, logo_url ),
      prices (
        price_normal, price_discounted, payment_method, discount_label, captured_at
      )
    `)
    .eq('product_id', id)
    .eq('is_active', true)
    .order('captured_at', { foreignTable: 'prices', ascending: false })
    .limit(1, { foreignTable: 'prices' })

  // Get historical min price (RPC may not exist yet — safe fallback)
  let minHistoricalPrice: number | null = null
  try {
    const { data } = await supabase.rpc('get_min_historical_price', { p_product_id: id })
    minHistoricalPrice = data as number | null
  } catch { /* ignore if function not deployed */ }

  // Map to ProductDetail shape
  const product = {
    id: raw.id,
    name: raw.name,
    brand: (raw.brands as any)?.name ?? '',
    gender: raw.gender,
    description: raw.description ?? null,
    image_url: raw.image_url ?? null,
    notes: ((raw.product_notes as any[]) ?? []).map((pn: any) => ({
      name: pn.olfactive_notes?.name ?? '',
      family: pn.olfactive_notes?.olfactive_families?.name ?? '',
      type: pn.note_type,
    })),
    prices: ((storePrices ?? []) as any[])
      .filter((sp) => sp.prices?.[0])
      .map((sp) => {
        const pr = sp.prices[0]
        const store = sp.stores as any
        return {
          store_id: store.id,
          store_name: store.name,
          store_logo: store.logo_url ?? null,
          price_normal: pr.price_normal,
          price_discounted: pr.price_discounted ?? null,
          payment_method: pr.payment_method ?? null,
          discount_label: pr.discount_label ?? null,
          product_url: sp.product_url,
          captured_at: pr.captured_at,
        }
      }),
    min_historical_price: minHistoricalPrice,
  }

  res.json({ product })
})

export default router
