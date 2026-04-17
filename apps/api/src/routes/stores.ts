import { Router } from 'express'
import { supabase } from '../db/supabase'
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth'

const router = Router()

// GET /stores — public list (active only) or all for admin (?all=true)
router.get('/', async (req, res) => {
  const showAll = req.query['all'] === 'true'

  let query = supabase
    .from('stores')
    .select('id, name, url, logo_url, method, scrape_frequency_minutes, country, is_active')
    .order('name')

  if (!showAll) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

// POST /stores — admin only
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { selectors, ...storeData } = req.body

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .insert(storeData)
    .select()
    .single()

  if (storeError) return res.status(400).json({ error: storeError.message })

  if (selectors?.length) {
    const selectorRows = selectors.map((s: any) => ({ ...s, store_id: store.id, updated_by: req.userId }))
    await supabase.from('store_selectors').insert(selectorRows)
  }

  res.status(201).json({ data: store })
})

// PUT /stores/:id — admin only
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { id } = req.params
  const { selectors, ...storeData } = req.body

  const { data: store, error } = await supabase
    .from('stores')
    .update({ ...storeData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })

  if (selectors?.length) {
    for (const s of selectors) {
      await supabase
        .from('store_selectors')
        .upsert({ ...s, store_id: id, updated_by: req.userId, updated_at: new Date().toISOString() }, { onConflict: 'store_id,field' })
    }
  }

  res.json({ data: store })
})

// GET /stores/:id/products — list tracked product URLs for a store (admin)
router.get('/:id/products', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabase
    .from('store_products')
    .select('id, product_url, is_active, last_scraped_at, products(name, brands(name))')
    .eq('store_id', id)
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ data })
})

// POST /stores/:id/products — add a product URL to track (admin)
router.post('/:id/products', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const { id } = req.params
  const { product_url } = req.body
  if (!product_url) return res.status(400).json({ error: 'product_url is required' })

  // Check if URL already tracked
  const { data: existing } = await supabase
    .from('store_products')
    .select('id')
    .eq('store_id', id)
    .eq('product_url', product_url)
    .maybeSingle()
  if (existing) return res.status(409).json({ error: 'Esta URL ya está registrada para esta tienda' })

  // Create a placeholder product to be filled by the worker on first scrape
  const { data: placeholderBrand } = await supabase
    .from('brands')
    .upsert({ name: 'Sin marca' }, { onConflict: 'name' })
    .select('id')
    .single()

  const { data: placeholderProduct } = await supabase
    .from('products')
    .insert({ name: `Producto (${new URL(product_url).hostname})`, brand_id: placeholderBrand!.id, gender: 'unisex' })
    .select('id')
    .single()

  const { data: sp, error: spError } = await supabase
    .from('store_products')
    .insert({ store_id: id, product_id: placeholderProduct!.id, product_url, is_active: true })
    .select('id')
    .single()

  if (spError) return res.status(400).json({ error: spError.message })
  res.status(201).json({ data: sp })
})

// DELETE /stores/:storeId/products/:spId — remove tracked URL (admin)
router.delete('/:storeId/products/:spId', authenticate, requireAdmin, async (_req, res) => {
  const { spId } = _req.params
  const { error } = await supabase.from('store_products').delete().eq('id', spId)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ ok: true })
})

// PATCH /stores/:id/toggle — admin only
router.patch('/:id/toggle', authenticate, requireAdmin, async (_req, res) => {
  const { id } = _req.params

  const { data: current } = await supabase.from('stores').select('is_active').eq('id', id).single()
  const { data, error } = await supabase
    .from('stores')
    .update({ is_active: !current?.is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ data })
})

// POST /stores/test-scrape — admin only
router.post('/test-scrape', authenticate, requireAdmin, async (req, res) => {
  const workerUrl = process.env.WORKER_INTERNAL_URL
  if (!workerUrl) return res.status(503).json({ error: 'Worker URL not configured' })

  try {
    const response = await fetch(`${workerUrl}/internal/test-scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(35_000),
    })
    const result = await response.json()
    res.json(result)
  } catch (err: any) {
    res.status(504).json({ error: 'Worker timeout or unavailable', detail: err.message })
  }
})

export default router
